import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';

const run = async () => {
  await connectDB();

  const db = mongoose.connection.db;
  const users = db.collection('users');

  // Check if admin exists
  const existing = await users.findOne({ username: 'admin' });
  console.log('Admin exists:', !!existing);
  if (existing) {
    console.log('Admin status:', existing.status);
    console.log('Admin role:', existing.role);
  }

  // Force update password directly with bcrypt hash (bypass mongoose)
  const hash = await bcrypt.hash('Admin@123', 10);

  const result = await users.updateOne(
    { username: 'admin' },
    {
      $set: {
        password: hash,
        status: 'Active',
        role: 'Admin',
      },
    },
    { upsert: false }
  );

  if (result.matchedCount === 0) {
    // Admin not found — create fresh
    await users.insertOne({
      fullName: 'Coded Clouds Admin',
      username: 'admin',
      email: 'admin@codedclouds.com',
      password: hash,
      role: 'Admin',
      department: 'Management',
      designation: 'CEO / Super Admin',
      status: 'Active',
      basicSalary: 250000,
      joiningDate: new Date(),
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      documents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Admin created fresh');
  } else {
    console.log('✅ Admin password reset to Admin@123');
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
