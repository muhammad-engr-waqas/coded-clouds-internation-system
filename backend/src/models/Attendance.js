import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true }, // 'YYYY-MM-DD' for easy per-day uniqueness/queries
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    totalHours: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Present', 'Late', 'Absent', 'Leave', 'Weekend'],
      default: 'Present',
    },
    notes: { type: String, default: '' },
    adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    adjustmentReason: { type: String, default: '' },
  },
  { timestamps: true }
);

// One attendance record per user per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
