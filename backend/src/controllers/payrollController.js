import Payroll from '../models/Payroll.js';
import SalaryPayment from '../models/SalaryPayment.js';
import User from '../models/User.js';
import { currentMonthStr } from '../utils/dateHelpers.js';
import { notifyUser } from '../utils/notify.js';
import { logAudit } from '../utils/audit.js';

// Helper — attach payments + calculated totals to any payroll row object
async function enrichRow(row) {
  const payments = await SalaryPayment.find({ payrollId: row._id })
    .sort({ paidAt: -1, createdAt: -1 });
  const totalPaid       = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalDeductions = payments.reduce((s, p) => s + (p.deductionAmount || 0), 0);
  const remainingBalance = Math.max(0, (row.netSalary || 0) - totalPaid);
  const computedStatus = totalPaid >= (row.netSalary || 0) - 0.01
    ? 'Paid' : totalPaid > 0 ? 'Processing' : 'Pending';
  return {
    ...row.toObject(),
    payments,
    totalPaid,
    totalDeductions,
    remainingBalance,
    computedStatus,
  };
}

// @route POST /api/payroll/generate?month=YYYY-MM
// Access: Admin, HR — creates payroll rows for all active employees using their current basicSalary.
// If a Pending row already exists for an employee, basicSalary is re-synced from User (so salary
// changes made after the first generate are reflected when you click Generate again).
export const generatePayroll = async (req, res) => {
  const month = req.query.month || req.body.month || currentMonthStr();
  const employees = await User.find({ status: 'Active' });

  const created = [];
  const synced  = [];

  for (const emp of employees) {
    const exists = await Payroll.findOne({ userId: emp._id, month });

    if (!exists) {
      // New row — create with current salary
      const row = await Payroll.create({
        userId: emp._id,
        month,
        basicSalary: emp.basicSalary || 0,
      });
      created.push(row);
    } else if (exists.status === 'Pending' && exists.basicSalary !== (emp.basicSalary || 0)) {
      // Existing Pending row with stale salary — re-sync basicSalary so netSalary updates too
      exists.basicSalary = emp.basicSalary || 0;
      await exists.save(); // pre-save hook recalculates netSalary
      synced.push(exists);
    }
    // Rows in Processing / Paid status are left untouched — salary already partially/fully paid
  }

  const io = req.app.get('io');
  // Emit generated event (triggers full table refresh on the frontend)
  io?.emit('payroll:generated', { month, count: created.length + synced.length });
  // Also broadcast individual updates for synced rows so real-time stays accurate
  for (const row of synced) {
    const enriched = await enrichRow(row);
    io?.emit('payroll:updated', enriched);
  }

  res.json({
    message: `Payroll processed: ${created.length} created, ${synced.length} salary-synced`,
    month,
    created,
    synced,
  });
};

// @route GET /api/payroll?month=&department=&status=
// Access: Admin, HR
export const getPayroll = async (req, res) => {
  const month = req.query.month || currentMonthStr();
  const { status } = req.query;

  const query = { month };
  if (status) query.status = status;

  const rows = await Payroll.find(query).populate('userId', 'fullName role department avatarUrl designation email');

  // Fetch ALL payments for these rows in a single query (efficient batch load)
  const rowIds = rows.map(r => r._id);
  const allPayments = await SalaryPayment.find({ payrollId: { $in: rowIds } }).sort({ createdAt: 1 });

  // Group payments by payrollId
  const paymentsByRow = {};
  for (const p of allPayments) {
    const key = p.payrollId.toString();
    if (!paymentsByRow[key]) paymentsByRow[key] = [];
    paymentsByRow[key].push(p);
  }

  // Build fully-enriched rows (same fields as enrichRow helper — consistent across all endpoints)
  // Filter out orphan rows where the linked User has been deleted (userId becomes null after populate)
  const enrichedRows = rows
    .filter(r => r.userId != null)
    .map(r => {
    const pmts          = paymentsByRow[r._id.toString()] || [];
    const totalPaid       = pmts.reduce((s, p) => s + (p.amount || 0), 0);
    const totalDeductions = pmts.reduce((s, p) => s + (p.deductionAmount || 0), 0);
    const remainingBalance = Math.max(0, (r.netSalary || 0) - totalPaid);
    const computedStatus  = totalPaid >= (r.netSalary || 0) - 0.01
      ? 'Paid' : totalPaid > 0 ? 'Processing' : 'Pending';
    return {
      ...r.toObject(),
      payments:        pmts,
      totalPaid,
      totalDeductions,
      remainingBalance,
      computedStatus,
    };
  });

  const totalNet        = enrichedRows.reduce((s, r) => s + (r.netSalary || 0), 0);
  const totalPaidSum    = enrichedRows.reduce((s, r) => s + (r.totalPaid || 0), 0);
  const totalPending    = enrichedRows.reduce((s, r) => s + (r.remainingBalance || 0), 0);
  const totalBonus      = enrichedRows.reduce((s, r) => s + (r.bonus || 0), 0);
  const totalDeductionsSum = enrichedRows.reduce((s, r) => s + (r.deductions || 0), 0);

  res.json({
    month,
    rows: enrichedRows,
    summary: {
      totalPayroll:  totalNet,
      totalPaid:     totalPaidSum,
      totalPending,
      paidCount:     enrichedRows.filter(r => r.computedStatus === 'Paid').length,
      pendingCount:  enrichedRows.filter(r => r.computedStatus !== 'Paid').length,
      totalBonus,
      totalDeductions: totalDeductionsSum,
    },
  });
};

// @route PATCH /api/payroll/:id
// Access: Admin, HR — edit allowances/bonus/deductions for one employee's monthly record
export const updatePayrollRow = async (req, res) => {
  const { allowances, bonus, deductions, notes } = req.body;

  for (const [field, value] of Object.entries({ allowances, bonus, deductions })) {
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      return res.status(400).json({ message: `${field} must be a non-negative number` });
    }
  }

  const row = await Payroll.findById(req.params.id);
  if (!row) return res.status(404).json({ message: 'Payroll record not found' });

  if (allowances !== undefined) row.allowances = allowances;
  if (bonus !== undefined) row.bonus = bonus;
  if (deductions !== undefined) row.deductions = deductions;
  if (notes !== undefined) row.notes = notes;

  await row.save(); // pre-save hook recalculates netSalary

  // Enrich with payment history before broadcasting — so UI never loses totalPaid/payments
  const enriched = await enrichRow(row);
  req.app.get('io')?.emit('payroll:updated', enriched);

  res.json(enriched);
};

// @route PATCH /api/payroll/:id/status
// Access: Admin, HR — mark Paid / Processing / revert to Pending
export const updatePayrollStatus = async (req, res) => {
  const { status } = req.body; // 'Pending' | 'Processing' | 'Paid'
  const row = await Payroll.findById(req.params.id);
  if (!row) return res.status(404).json({ message: 'Payroll record not found' });

  row.status = status;
  if (status === 'Paid') {
    row.paidAt = new Date();
    row.paidBy = req.user._id;
  } else {
    row.paidAt = null;
    row.paidBy = null;
  }
  await row.save();

  await logAudit({
    actor: req.user._id,
    action: `PAYROLL_${status.toUpperCase()}`,
    module: 'Payroll',
    targetId: row._id,
  });

  const enriched = await enrichRow(row);
  req.app.get('io')?.emit('payroll:updated', enriched);

  if (status === 'Paid') {
    const io = req.app.get('io');
    await notifyUser(io, row.userId, {
      type: 'PAYROLL_PAID',
      title: 'Your salary has been paid',
      message: `Net salary: ${row.netSalary} for ${row.month}`,
      link: '/payroll',
    });
  }

  res.json(enriched);
};

// @route GET /api/payroll/:id/payslip
// Access: Admin, HR, or the employee themselves (their own payslip)
export const getPayslip = async (req, res) => {
  const row = await Payroll.findById(req.params.id).populate('userId', 'fullName role department email');
  if (!row) return res.status(404).json({ message: 'Payroll record not found' });

  const isOwner = row.userId._id.toString() === req.user._id.toString();
  if (req.user.role !== 'Admin' && req.user.role !== 'HR' && !isOwner) {
    return res.status(403).json({ message: 'Not authorized to view this payslip' });
  }

  // Payment history for this employee
  const history = await Payroll.find({ userId: row.userId._id }).sort({ month: -1 });

  res.json({ payslip: row, history });
};

// @route DELETE /api/payroll/orphans
// Access: Admin only — permanently deletes Payroll rows whose linked User no longer exists
export const deleteOrphanPayroll = async (req, res) => {
  // Fetch all payroll rows with userId populated; null after populate = user deleted
  const allRows = await Payroll.find({}).populate('userId', '_id');
  const orphanIds = allRows.filter(r => r.userId == null).map(r => r._id);

  if (orphanIds.length === 0) {
    return res.json({ message: 'No orphan payroll records found', deleted: 0 });
  }

  await Payroll.deleteMany({ _id: { $in: orphanIds } });

  await logAudit({
    actor: req.user._id,
    action: 'DELETED_ORPHAN_PAYROLL',
    module: 'Payroll',
    details: { count: orphanIds.length, ids: orphanIds },
  });

  res.json({ message: `Deleted ${orphanIds.length} orphan payroll record(s)`, deleted: orphanIds.length });
};
