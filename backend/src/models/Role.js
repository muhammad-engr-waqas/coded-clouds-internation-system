import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    isSystem: { type: Boolean, default: false }, // system roles (Admin, HR) cannot be deleted
  },
  { timestamps: true }
);

export default mongoose.model('Role', roleSchema);
