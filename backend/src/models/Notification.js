import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'TASK_ASSIGNED',
        'TASK_REPORT',
        'TASK_STATUS',
        'LEAVE_NEW',
        'LEAVE_STATUS',
        'CHAT_MESSAGE',
        'PAYROLL_PAID',
        'EMPLOYEE_ADDED',
        'SYSTEM',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    link: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
