import Payroll from '../models/Payroll.js';
import SalaryPayment from '../models/SalaryPayment.js';
import { logAudit } from '../utils/audit.js';
import { notifyUser } from '../utils/notify.js';

/**
 * POST /api/payroll/:id/payments
 * Add a partial (or full) salary payment for a payroll row.
 * Returns the updated payroll row with payments array + totalPaid attached.
 */
export const addSalaryPayment = async (req, res) => {
  const { amount, method, note } = req.body;
  const payrollId = req.params.id;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  const row = await Payroll.findById(payrollId).populate('userId', 'fullName role department');
  if (!row) return res.status(404).json({ message: 'Payroll record not found' });

  // Fetch already-paid total
  const existing = await SalaryPayment.find({ payrollId });
  const alreadyPaid = existing.reduce((s, p) => s + p.amount, 0);
  const remaining   = row.netSalary - alreadyPaid;

  if (amount > remaining + 0.01) {
    return res.status(400).json({
      message: `Payment amount (${amount}) exceeds remaining salary (${remaining.toFixed(2)})`
    });
  }

  const payment = await SalaryPayment.create({
    payrollId:  row._id,
    userId:     row.userId._id,
    amount,
    method:     method || 'Bank Transfer',
    note:       note   || '',
    recordedBy: req.user._id,
  });

  // If fully paid after this payment → auto-mark payroll as Paid
  const newTotal = alreadyPaid + amount;
  if (newTotal >= row.netSalary - 0.01 && row.status !== 'Paid') {
    row.status = 'Paid';
    row.paidAt = new Date();
    row.paidBy = req.user._id;
    await row.save();

    const io = req.app.get('io');
    await notifyUser(io, row.userId._id, {
      type:    'PAYROLL_PAID',
      title:   'Your salary has been fully paid',
      message: `Net salary: PKR ${row.netSalary} for ${row.month}`,
      link:    '/payroll',
    });
  }

  await logAudit({
    actor:    req.user._id,
    action:   'SALARY_PAYMENT_ADDED',
    module:   'Payroll',
    targetId: row._id,
    details:  { amount, method, note },
  });

  // Return enriched payroll row
  const allPayments = await SalaryPayment.find({ payrollId: row._id }).sort({ createdAt: 1 });
  const totalPaid   = allPayments.reduce((s, p) => s + p.amount, 0);

  const enriched = {
    ...row.toObject(),
    payments:  allPayments,
    totalPaid,
  };

  req.app.get('io')?.emit('payroll:updated', enriched);
  res.status(201).json(enriched);
};

/**
 * GET /api/payroll/:id/payments
 * List all payments for a payroll row.
 */
export const getSalaryPayments = async (req, res) => {
  const payments = await SalaryPayment.find({ payrollId: req.params.id }).sort({ createdAt: 1 });
  const total    = payments.reduce((s, p) => s + p.amount, 0);
  res.json({ payments, totalPaid: total });
};
