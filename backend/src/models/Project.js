import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    dueDate: { type: Date },
    isDone: { type: Boolean, default: false },
  },
  { _id: true }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    client: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending',
    },
    team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String, default: '' },
    budget: { type: Number, default: 0 },
    milestones: [milestoneSchema],
    attachments: [{ type: String }],
    clientNotes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Progress % auto-derived from milestones (falls back to 0 if none)
projectSchema.virtual('progress').get(function () {
  if (!this.milestones || this.milestones.length === 0) return this.status === 'Completed' ? 100 : 0;
  const done = this.milestones.filter((m) => m.isDone).length;
  return Math.round((done / this.milestones.length) * 100);
});
projectSchema.set('toJSON', { virtuals: true });
projectSchema.set('toObject', { virtuals: true });

export default mongoose.model('Project', projectSchema);
