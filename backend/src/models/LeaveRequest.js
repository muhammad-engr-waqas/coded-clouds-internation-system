import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    leaveType: {
      type: String,
      enum: ['Sick', 'Casual', 'Annual', 'Emergency', 'Unpaid'],
      required: true,
    },
    fromDate: { type: String, required: true }, // 'YYYY-MM-DD'
    toDate: { type: String, required: true },
    totalDays: { type: Number, required: true },
    reason: { type: String, required: true },
    attachment: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    rejectionReason: { type: String, default: '' },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('LeaveRequest', leaveRequestSchema);
