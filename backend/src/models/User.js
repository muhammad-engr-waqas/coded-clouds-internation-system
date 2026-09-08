import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const documentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['cv', 'experienceLetter', 'cnicFront', 'cnicBack', 'offerLetter', 'contract', 'certificate', 'other'],
      required: true,
    },
    name: { type: String, required: true },
    url: { type: String, required: true }, // saved file path/URL (multer)
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String },
    password: { type: String, required: true, select: false },

    role: {
      type: String,
      enum: [
        'Backend Dev',
        'Frontend Dev',
        'UI/UX Designer',
        'HR',
        'Marketing',
        'Sales',
        'Social Media',
        'Project Manager',
        'Admin',
      ],
      required: true,
    },

    department: { type: String, default: '' },
    designation: { type: String, default: '' },
    joiningDate: { type: Date, default: Date.now },
    reportingManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    status: {
      type: String,
      enum: ['Active', 'Suspended', 'Separated'],
      default: 'Active',
    },

    avatarUrl: { type: String, default: '' },
    documents: [documentSchema],

    // Payroll base value (Part B of Payroll module) — editable by Admin/HR only
    basicSalary: { type: Number, default: 0 },

    // Password reset
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

export default mongoose.model('User', userSchema);
