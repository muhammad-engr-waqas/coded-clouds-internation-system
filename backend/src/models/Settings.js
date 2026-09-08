import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: 'Coded Clouds' },
    companyLogoUrl: { type: String, default: '' },
    companyAddress: { type: String, default: '' },
    companyContactEmail: { type: String, default: '' },
    defaultTheme: { type: String, enum: ['light', 'dark', 'sky'], default: 'light' },

    // Attendance rules
    lateCutoffTime: { type: String, default: '09:15' }, // 'HH:mm'
    workingDays: {
      type: [String],
      default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    },
    standardWorkHours: { type: Number, default: 8 },

    // Leave policy
    leaveTypes: {
      type: [String],
      default: ['Sick', 'Casual', 'Annual', 'Emergency', 'Unpaid'],
    },
    annualLeaveQuota: { type: Number, default: 14 },
    excludeWeekendsFromLeaveCount: { type: Boolean, default: true },

    // Notification preferences (event -> channels)
    notificationPrefs: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        EMPLOYEE_ADDED: { inApp: true, email: false },
        TASK_ASSIGNED: { inApp: true, email: false },
        TASK_REPORT: { inApp: true, email: false },
        LEAVE_NEW: { inApp: true, email: false },
        LEAVE_STATUS: { inApp: true, email: false },
        PAYROLL_PAID: { inApp: true, email: false },
        CHAT_MESSAGE: { inApp: true, email: false },
      },
    },
  },
  { timestamps: true }
);

// Ensure a single settings document exists
settingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

export default mongoose.model('Settings', settingsSchema);
