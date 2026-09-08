import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    month: { type: String, required: true }, // 'YYYY-MM'
    basicSalary: { type: Number, required: true },
    allowances: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Paid'],
      default: 'Pending',
    },
    paidAt: { type: Date, default: null },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

payrollSchema.index({ userId: 1, month: 1 }, { unique: true });

payrollSchema.pre('save', function (next) {
  this.netSalary = (this.basicSalary || 0) + (this.allowances || 0) + (this.bonus || 0) - (this.deductions || 0);
  next();
});

export default mongoose.model('Payroll', payrollSchema);
