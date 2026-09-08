import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Channel from '../models/Channel.js';
import Settings from '../models/Settings.js';

const DEFAULT_ROLES = [
  'Backend Dev',
  'Frontend Dev',
  'UI/UX Designer',
  'HR',
  'Marketing',
  'Sales',
  'Social Media',
  'Project Manager',
  'Admin',
];

const run = async () => {
  await connectDB();

  // 1. Roles
  for (const name of DEFAULT_ROLES) {
    const isSystem = name === 'Admin' || name === 'HR';
    await Role.updateOne({ name }, { name, isSystem }, { upsert: true });
  }
  console.log('✅ Default roles seeded');

  // 2. Settings singleton
  await Settings.getSingleton();
  console.log('✅ Default settings created');

  // 3. Default Admin account
  let admin = await User.findOne({ username: 'admin' });
  if (!admin) {
    admin = await User.create({
      fullName: 'Coded Clouds Admin',
      username: 'admin',
      email: 'admin@codedclouds.com',
      password: 'Admin@123', // ⚠️ change this immediately after first login
      role: 'Admin',
      department: 'Management',
      designation: 'CEO / Super Admin',
      status: 'Active',
    });
    console.log('✅ Default Admin created — username: admin / password: Admin@123 (CHANGE THIS)');
  } else {
    console.log('ℹ️  Admin already exists, skipping');
  }

  // 4. #announcements channel
  let announcements = await Channel.findOne({ isAnnouncements: true });
  if (!announcements) {
    announcements = await Channel.create({
      name: 'announcements',
      description: 'Company-wide announcements — posting restricted to Admin/HR',
      type: 'Channel',
      memberIds: [admin._id],
      isAnnouncements: true,
      createdBy: admin._id,
    });
    console.log('✅ #announcements channel created');
  } else {
    console.log('ℹ️  #announcements channel already exists, skipping');
  }

  console.log('\n🎉 Seeding complete.');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
