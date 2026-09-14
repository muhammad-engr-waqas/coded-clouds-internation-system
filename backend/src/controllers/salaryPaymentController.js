import Payroll from '../models/Payroll.js';
import SalaryPayment from '../models/SalaryPayment.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { logAudit } from '../utils/audit.js';
import { notifyUser } from '../utils/notify.js';

// ─── Helper: build enriched payroll row ──────────────────────────────────────
async function enrichRow(row) {
  const payments = await SalaryPayment.find({ payrollId: row._id })
    .sort({ paidAt: -1, createdAt: -1 }); // latest first

  const totalAmountPaid    = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalDeductions    = payments.reduce((s, p) => s + (p.deductionAmount || 0), 0);
  const remainingBalance   = Math.max(0, row.netSalary - totalAmountPaid);

  // Auto-determine payroll status from payments
  let payrollStatus = 'Pending';
  if (totalAmountPaid >= row.netSalary - 0.01) {
    payrollStatus = 'Paid';
  } else if (totalAmountPaid > 0) {
    payrollStatus = 'Processing'; // maps to "Partial" in the UI
  }

  return {
    ...row.toObject(),
    payments,
    totalPaid:       totalAmountPaid,
    totalDeductions,
    remainingBalance,
    computedStatus:  payrollStatus,  // use this in UI for accurate badge
  };
}

// ─── POST /api/payroll/:id/payments ──────────────────────────────────────────
// Add a partial or full salary payment (with optional deduction).
export const addSalaryPayment = async (req, res) => {
  const {
    amount,
    method,
    note,
    deductionAmount,
    deductionReason,
    paidAt,
  } = req.body;

  const payrollId = req.params.id;

  // Validation
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'amount must be a positive number' });
  }
  if (deductionAmount !== undefined && (typeof deductionAmount !== 'number' || deductionAmount < 0)) {
    return res.status(400).json({ message: 'deductionAmount must be a non-negative number' });
  }

  const row = await Payroll.findById(payrollId).populate('userId', 'fullName role department designation email');
  if (!row) return res.status(404).json({ message: 'Payroll record not found' });

  // Current totals before this payment
  const existingPayments = await SalaryPayment.find({ payrollId: row._id });
  const alreadyPaid = existingPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const remaining   = row.netSalary - alreadyPaid;

  if (amount > remaining + 0.01) {
    return res.status(400).json({
      message: `Payment amount (PKR ${amount.toLocaleString()}) exceeds remaining salary (PKR ${remaining.toFixed(2)})`,
    });
  }

  // Remaining balance AFTER this payment
  const newRemaining = Math.max(0, remaining - amount);

  // Per-payment status
  const paymentStatus = newRemaining <= 0.01 ? 'Paid' : amount < remaining ? 'Partial' : 'Paid';

  const payment = await SalaryPayment.create({
    payrollId:        row._id,
    userId:           row.userId._id,
    amount,
    method:           method || 'Bank Transfer',
    note:             note || '',
    deductionAmount:  deductionAmount || 0,
    deductionReason:  deductionReason || '',
    remainingBalance: newRemaining,
    status:           paymentStatus,
    paidAt:           paidAt ? new Date(paidAt) : new Date(),
    recordedBy:       req.user._id,
  });

  // Auto-update Payroll row status
  const newTotal = alreadyPaid + amount;
  if (newTotal >= row.netSalary - 0.01) {
    row.status = 'Paid';
    row.paidAt = payment.paidAt;
    row.paidBy = req.user._id;
  } else if (newTotal > 0) {
    row.status = 'Processing';
  }
  await row.save();

  await logAudit({
    actor:    req.user._id,
    action:   'SALARY_PAYMENT_ADDED',
    module:   'Payroll',
    targetId: row._id,
    details:  { amount, method, deductionAmount, deductionReason },
  });

  // Notify employee
  if (newTotal >= row.netSalary - 0.01) {
    const io = req.app.get('io');
    await notifyUser(io, row.userId._id, {
      type:    'PAYROLL_PAID',
      title:   'Your salary has been fully paid',
      message: `Net salary: PKR ${row.netSalary.toLocaleString()} for ${row.month}`,
      link:    '/payroll',
    });
  }

  // Return enriched row
  const enriched = await enrichRow(row);
  req.app.get('io')?.emit('payroll:updated', enriched);
  res.status(201).json(enriched);
};

// ─── GET /api/payroll/:id/payments ───────────────────────────────────────────
export const getSalaryPayments = async (req, res) => {
  const payments = await SalaryPayment.find({ payrollId: req.params.id })
    .populate('recordedBy', 'fullName')
    .sort({ paidAt: -1, createdAt: -1 });

  const totalPaid       = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalDeductions = payments.reduce((s, p) => s + (p.deductionAmount || 0), 0);

  res.json({ payments, totalPaid, totalDeductions });
};

// ─── GET /api/payroll/employee/:userId?month=YYYY-MM ─────────────────────────
// Full payment history for a single employee — used on employee-wise detail page.
export const getEmployeePayrollDetail = async (req, res) => {
  const { userId } = req.params;
  const { month }  = req.query;

  // Auth check: Admin/HR can view any employee; employees only their own
  if (req.user.role !== 'Admin' && req.user.role !== 'HR') {
    const reqUserId = req.user._id?.toString() ?? req.user.id;
    if (reqUserId !== userId) {
      return res.status(403).json({ message: 'Not authorized to view another employee\'s payroll' });
    }
  }

  const query = { userId };
  if (month) query.month = month;

  const rows = await Payroll.find(query)
    .populate('userId', 'fullName role department designation email avatarUrl')
    .sort({ month: -1 });

  const enrichedRows = await Promise.all(rows.map(enrichRow));
  res.json(enrichedRows);
};
