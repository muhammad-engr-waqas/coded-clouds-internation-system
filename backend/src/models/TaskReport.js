import mongoose from 'mongoose';

const taskReportSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    attachments: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model('TaskReport', taskReportSchema);
