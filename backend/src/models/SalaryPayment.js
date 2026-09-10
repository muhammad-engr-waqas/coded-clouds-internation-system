import mongoose from 'mongoose';

/**
 * SalaryPayment — records each partial or full salary disbursement.
 * Multiple payments can exist for the same payroll row (partial salary releases).
 */
const salaryPaymentSchema = new mongoose.Schema(
  {
    payrollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll', required: true, index: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
    amount:    { type: Number, required: true, min: 0 },
    method:    { type: String, default: 'Bank Transfer', trim: true },
    note:      { type: String, default: '', trim: true },
    paidAt:    { type: Date,   default: Date.now },
    recordedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('SalaryPayment', salaryPaymentSchema);
