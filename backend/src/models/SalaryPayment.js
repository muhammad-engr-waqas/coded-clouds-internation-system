import mongoose from 'mongoose';

/**
 * SalaryPayment — one row per disbursement event.
 * Multiple rows can exist for the same (payrollId, month) — supports partial payments.
 *
 * Fields per requirement spec:
 *   employee_id       → userId
 *   payment_date      → paidAt
 *   amount_paid       → amount
 *   payment_method    → method
 *   deduction_amount  → deductionAmount
 *   deduction_reason  → deductionReason
 *   remaining_balance → remainingBalance  (snapshot at time of payment)
 *   status            → status  (Paid | Partial | Pending)
 *   notes             → note
 */
const salaryPaymentSchema = new mongoose.Schema(
  {
    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payroll',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Core payment fields
    amount:          { type: Number, required: true, min: 0 },
    method:          {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'Cheque', 'Online Transfer'],
      default: 'Bank Transfer',
    },
    paidAt:          { type: Date, default: Date.now },

    // Deduction sub-fields (optional — only present when a deduction accompanies payment)
    deductionAmount: { type: Number, default: 0, min: 0 },
    deductionReason: { type: String, default: '', trim: true },
    // e.g. 'Late arrival', 'Absent 2 days', 'Advance recovery', etc.

    // Snapshot: remaining balance AFTER this payment (calculated server-side)
    remainingBalance: { type: Number, default: 0 },

    // Per-payment status
    status: {
      type: String,
      enum: ['Paid', 'Partial', 'Pending'],
      default: 'Paid',
    },

    note:        { type: String, default: '', trim: true },
    recordedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('SalaryPayment', salaryPaymentSchema);
