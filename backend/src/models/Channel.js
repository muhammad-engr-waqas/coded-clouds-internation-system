import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['Channel', 'DirectMessage'], default: 'Channel' },
    memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isAnnouncements: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Channel', channelSchema);
