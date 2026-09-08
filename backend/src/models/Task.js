import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Under Review', 'Completed'],
      default: 'Pending',
    },
    deadline: { type: Date },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    attachments: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Admin only
  },
  { timestamps: true }
);

// Enforce linear status progression at the model layer as a safety net
const STATUS_ORDER = ['Pending', 'In Progress', 'Under Review', 'Completed'];
taskSchema.statics.isValidNextStatus = function (current, next) {
  const c = STATUS_ORDER.indexOf(current);
  const n = STATUS_ORDER.indexOf(next);
  return n === c + 1;
};
taskSchema.statics.STATUS_ORDER = STATUS_ORDER;

export default mongoose.model('Task', taskSchema);
