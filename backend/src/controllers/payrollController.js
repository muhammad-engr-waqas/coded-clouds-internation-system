import Payroll from '../models/Payroll.js';
import SalaryPayment from '../models/SalaryPayment.js';
import User from '../models/User.js';
import { currentMonthStr } from '../utils/dateHelpers.js';
import { notifyUser } from '../utils/notify.js';
import { logAudit } from '../utils/audit.js';

// @route POST /api/payroll/generate?month=YYYY-MM
// Access: Admin, HR — creates payroll rows for all active employees using their current basicSalary
export const generatePayroll = async (req, res) => {
  const month = req.query.month || req.body.month || currentMonthStr();
  const employees = await User.find({ status: 'Active' });

  const created = [];
  for (const emp of employees) {
    const exists = await Payroll.findOne({ userId: emp._id, month });
    if (exists) continue;
    const row = await Payroll.create({
      userId: emp._id,
      month,
      basicSalary: emp.basicSalary || 0,
    });
    created.push(row);
  }

  // Real-time: let every connected Admin/HR table refresh without a manual reload.
  req.app.get('io')?.emit('payroll:generated', { month, count: created.length });

  res.json({ message: `Payroll generated for ${created.length} employee(s)`, month, created });
};

// @route GET /api/payroll?month=&department=&status=
// Access: Admin, HR
export const getPayroll = async (req, res) => {
  const month = req.query.month || currentMonthStr();
  const { status } = req.query;

  const query = { month };
  if (status) query.status = status;

  const rows = await Payroll.find(query).populate('userId', 'fullName role department avatarUrl');

  // Attach payment history + totalPaid to each row
  const rowIds = rows.map(r => r._id);
  const allPayments = await SalaryPayment.find({ payrollId: { $in: rowIds } }).sort({ createdAt: 1 });
  const paymentsByRow = {};
  for (const p of allPayments) {
    const key = p.payrollId.toString();
    if (!paymentsByRow[key]) paymentsByRow[key] = [];
    paymentsByRow[key].push(p);
  }

  const enrichedRows = rows.map(r => {
    const pmts = paymentsByRow[r._id.toString()] || [];
    return { ...r.toObject(), payments: pmts, totalPaid: pmts.reduce((s, p) => s + p.amount, 0) };
  });

  const totalNet = enrichedRows.reduce((s, r) => s + r.netSalary, 0);
  const totalPaid = enrichedRows.reduce((s, r) => s + (r.totalPaid || 0), 0);
  const totalPending = enrichedRows.reduce((s, r) => s + Math.max(0, r.netSalary - (r.totalPaid || 0)), 0);
  const totalBonus = enrichedRows.reduce((s, r) => s + r.bonus, 0);
  const totalDeductions = enrichedRows.reduce((s, r) => s + r.deductions, 0);

  res.json({
    month,
    rows: enrichedRows,
    summary: {
      totalPayroll: totalNet,
      totalPaid,
      totalPending,
      paidCount: enrichedRows.filter(r => r.status === 'Paid').length,
      pendingCount: enrichedRows.filter(r => r.status !== 'Paid').length,
      totalBonus,
      totalDeductions,
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

  // Real-time: push the authoritative, backend-calculated row to every connected Admin/HR
  // client so gross/net numbers update live without a page refresh (see spec section 6).
  req.app.get('io')?.emit('payroll:updated', row);

  res.json(row);
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

  req.app.get('io')?.emit('payroll:updated', row);

  if (status === 'Paid') {
    const io = req.app.get('io');
    await notifyUser(io, row.userId, {
      type: 'PAYROLL_PAID',
      title: 'Your salary has been paid',
      message: `Net salary: ${row.netSalary} for ${row.month}`,
      link: '/payroll',
    });
  }

  res.json(row);
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
