import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // e.g. "UPDATED_EMPLOYEE", "DELETED_TASK"
    module: { type: String, required: true }, // e.g. "Employee", "Task", "Payroll"
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('AuditLog', auditLogSchema);
