import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const run = async () => {
  await connectDB();

  // Delete existing admin if any (to reset password)
  await User.deleteOne({ username: 'admin' });

  const admin = await User.create({
    fullName: 'Coded Clouds Admin',
    username: 'admin',
    email: 'admin@codedclouds.com',
    password: 'Admin@123',
    role: 'Admin',
    department: 'Management',
    designation: 'CEO / Super Admin',
    status: 'Active',
  });

  console.log('✅ Admin user created successfully!');
  console.log('   Username:', admin.username);
  console.log('   Password: Admin@123');
  console.log('   Email:', admin.email);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
