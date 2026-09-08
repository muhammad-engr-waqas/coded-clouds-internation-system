import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import TaskReport from '../models/TaskReport.js';
import Attendance from '../models/Attendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Payroll from '../models/Payroll.js';
import Channel from '../models/Channel.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import Settings from '../models/Settings.js';

// ─── Helpers ────────────────────────────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const dateStr = (d) => d.toISOString().split('T')[0];
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function subDays(d, n) { return addDays(d, -n); }
const TODAY = new Date('2026-08-08');

// ─── Employee Data ───────────────────────────────────────────────────────────
const EMPLOYEES = [
  { fullName: 'Waqas Ahmed',      username: 'admin',      email: 'admin@codedclouds.com',        role: 'Admin',          dept: 'Management',    designation: 'CEO / Super Admin',     salary: 250000 },
  { fullName: 'Sara Khan',        username: 'sara.hr',    email: 'sara@codedclouds.com',         role: 'HR',             dept: 'Human Resources', designation: 'HR Manager',           salary: 120000 },
  { fullName: 'Ali Hassan',       username: 'ali.be',     email: 'ali@codedclouds.com',          role: 'Backend Dev',    dept: 'Engineering',   designation: 'Senior Backend Dev',    salary: 150000 },
  { fullName: 'Fatima Noor',      username: 'fatima.fe',  email: 'fatima@codedclouds.com',       role: 'Frontend Dev',   dept: 'Engineering',   designation: 'Frontend Developer',    salary: 130000 },
  { fullName: 'Usman Tariq',      username: 'usman.ui',   email: 'usman@codedclouds.com',        role: 'UI/UX Designer', dept: 'Design',        designation: 'Lead Designer',         salary: 110000 },
  { fullName: 'Zainab Malik',     username: 'zainab.pm',  email: 'zainab@codedclouds.com',       role: 'Project Manager', dept: 'Management',  designation: 'Project Manager',       salary: 140000 },
  { fullName: 'Bilal Raza',       username: 'bilal.be',   email: 'bilal@codedclouds.com',        role: 'Backend Dev',    dept: 'Engineering',   designation: 'Backend Developer',     salary: 120000 },
  { fullName: 'Hira Shahid',      username: 'hira.fe',    email: 'hira@codedclouds.com',         role: 'Frontend Dev',   dept: 'Engineering',   designation: 'Junior Frontend Dev',   salary: 90000  },
  { fullName: 'Kamran Iqbal',     username: 'kamran.mkt', email: 'kamran@codedclouds.com',       role: 'Marketing',      dept: 'Marketing',     designation: 'Marketing Manager',     salary: 100000 },
  { fullName: 'Nadia Hussain',    username: 'nadia.sales', email: 'nadia@codedclouds.com',       role: 'Sales',          dept: 'Sales',         designation: 'Sales Executive',       salary: 95000  },
  { fullName: 'Hamza Sheikh',     username: 'hamza.sm',   email: 'hamza@codedclouds.com',        role: 'Social Media',   dept: 'Marketing',     designation: 'Social Media Manager',  salary: 85000  },
  { fullName: 'Ayesha Butt',      username: 'ayesha.ui',  email: 'ayesha@codedclouds.com',       role: 'UI/UX Designer', dept: 'Design',        designation: 'UI/UX Designer',        salary: 100000 },
];

// ─── Projects Data ───────────────────────────────────────────────────────────
const PROJECTS_DATA = [
  { name: 'CCIMS Platform v2',        client: 'Coded Clouds Internal', status: 'In Progress', budget: 500000, desc: 'Complete rebuild of internal management system with new features.' },
  { name: 'E-Commerce Portal',         client: 'AlphaRetail Ltd',       status: 'In Progress', budget: 350000, desc: 'Full-stack e-commerce solution with payment gateway integration.' },
  { name: 'HR Automation Suite',       client: 'TechCorp Pakistan',     status: 'Completed',   budget: 200000, desc: 'Automated HR workflows including onboarding, payroll and leave.' },
  { name: 'Mobile Banking App',        client: 'First Digital Bank',    status: 'Pending',     budget: 750000, desc: 'Cross-platform mobile banking app for iOS and Android.' },
  { name: 'Healthcare Dashboard',      client: 'MedCare Clinics',       status: 'Completed',   budget: 280000, desc: 'Patient management and analytics dashboard for clinic chains.' },
  { name: 'Logistics Tracker',         client: 'FastMove Logistics',    status: 'In Progress', budget: 320000, desc: 'Real-time shipment tracking and fleet management system.' },
];

// ─── Tasks Data ──────────────────────────────────────────────────────────────
const TASKS_DATA = [
  { title: 'Design database schema for v2',       priority: 'Critical', status: 'Completed',   daysAgo: 30, deadlineDays: 20 },
  { title: 'Implement JWT authentication',         priority: 'High',     status: 'Completed',   daysAgo: 25, deadlineDays: 15 },
  { title: 'Build payroll calculation engine',     priority: 'High',     status: 'In Progress', daysAgo: 10, deadlineDays: 10 },
  { title: 'Create attendance heatmap UI',         priority: 'Medium',   status: 'In Progress', daysAgo: 8,  deadlineDays: 5  },
  { title: 'Integrate Socket.io for real-time chat', priority: 'High',   status: 'Under Review', daysAgo: 5, deadlineDays: 3 },
  { title: 'Write API documentation',              priority: 'Low',      status: 'Pending',     daysAgo: 2,  deadlineDays: 14 },
  { title: 'Setup CI/CD pipeline',                 priority: 'Medium',   status: 'Pending',     daysAgo: 1,  deadlineDays: 20 },
  { title: 'Design landing page mockups',          priority: 'Medium',   status: 'Completed',   daysAgo: 20, deadlineDays: 10 },
  { title: 'Fix mobile responsiveness issues',     priority: 'High',     status: 'In Progress', daysAgo: 6,  deadlineDays: 4  },
  { title: 'Optimize MongoDB queries',             priority: 'Medium',   status: 'Under Review', daysAgo: 4, deadlineDays: 2  },
  { title: 'Develop sales pitch deck',             priority: 'Low',      status: 'Completed',   daysAgo: 15, deadlineDays: 7  },
  { title: 'Social media campaign Q3',             priority: 'Medium',   status: 'In Progress', daysAgo: 7,  deadlineDays: 15 },
];

// ─── Chat Messages ───────────────────────────────────────────────────────────
const ANNOUNCEMENT_MSGS = [
  'Welcome to Coded Clouds Internal Management System! 🎉',
  'Q3 performance reviews start next week. Please prepare your self-assessment.',
  'Office will be closed on Independence Day (August 14). Enjoy the holiday!',
  'New payroll policy is now live. Check the settings page for details.',
  'Reminder: All timesheets must be submitted by Friday 5pm.',
];
const GENERAL_MSGS = [
  'Good morning team! 👋',
  'Anyone available for a quick standup at 11am?',
  'The new CI/CD pipeline is live! Push to main and it deploys automatically.',
  'Great work on the v2 release everyone! Client loved it. 🚀',
  'Who wants to grab lunch today?',
  'Pro tip: use Ctrl+K to open the command palette in VS Code',
  'Reminder to update your task statuses on the board.',
  'Sprint planning is at 3pm in the main conference room.',
];
const ENGINEERING_MSGS = [
  'New PR up for the auth middleware — please review by EOD.',
  'Found a bug in the attendance checkout logic, fixing now.',
  'MongoDB indexes added — query time dropped by 80%! 💪',
  'Node.js updated to v22 LTS — all tests passing.',
  'Using Zod for runtime validation on all API inputs now.',
];

// ─── Main Seed Function ──────────────────────────────────────────────────────
const run = async () => {
  await connectDB();
  console.log('\n🗑️  Clearing all collections...');

  await Promise.all([
    User.deleteMany({}), Project.deleteMany({}), Task.deleteMany({}),
    TaskReport.deleteMany({}), Attendance.deleteMany({}), LeaveRequest.deleteMany({}),
    Payroll.deleteMany({}), Channel.deleteMany({}), Message.deleteMany({}),
    Notification.deleteMany({}), Role.deleteMany({}),
  ]);
  console.log('✅ All collections cleared\n');

  // 1. Roles
  const ROLE_NAMES = ['Backend Dev','Frontend Dev','UI/UX Designer','HR','Marketing','Sales','Social Media','Project Manager','Admin'];
  for (const name of ROLE_NAMES) {
    await Role.updateOne({ name }, { name, isSystem: name === 'Admin' || name === 'HR' }, { upsert: true });
  }
  console.log('✅ Roles seeded');

  // 2. Settings
  await Settings.getSingleton();
  console.log('✅ Settings created');

  // 3. Users
  console.log('👥 Creating employees...');
  const users = [];
  for (const emp of EMPLOYEES) {
    const joiningDate = subDays(TODAY, randInt(30, 365));
    const user = await User.create({
      fullName: emp.fullName,
      username: emp.username,
      email: emp.email,
      password: emp.username === 'admin' ? 'Admin@123' : 'Pass@1234',
      role: emp.role,
      department: emp.dept,
      designation: emp.designation,
      basicSalary: emp.salary,
      status: 'Active',
      joiningDate,
      phone: `+92 3${randInt(10,49)}${randInt(1000000,9999999)}`,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.username}`,
    });
    users.push(user);
  }
  console.log(`✅ ${users.length} employees created`);

  const admin = users.find(u => u.username === 'admin');
  const hr = users.find(u => u.role === 'HR');
  const devs = users.filter(u => ['Backend Dev','Frontend Dev'].includes(u.role));
  const pm = users.find(u => u.role === 'Project Manager');
  const nonAdmin = users.filter(u => u.username !== 'admin');

  // 4. Projects
  console.log('📁 Creating projects...');
  const projects = [];
  for (const p of PROJECTS_DATA) {
    const startDate = subDays(TODAY, randInt(30, 120));
    const endDate = addDays(startDate, randInt(60, 180));
    const teamSize = randInt(3, 6);
    const team = [admin._id];
    const shuffled = [...nonAdmin].sort(() => 0.5 - Math.random());
    shuffled.slice(0, teamSize - 1).forEach(u => team.push(u._id));

    const milestones = [
      { title: 'Kickoff & Planning',      dueDate: addDays(startDate, 7),  isDone: true  },
      { title: 'Design & Architecture',   dueDate: addDays(startDate, 21), isDone: p.status !== 'Pending' },
      { title: 'Core Development',        dueDate: addDays(startDate, 60), isDone: p.status === 'Completed' },
      { title: 'Testing & QA',            dueDate: addDays(startDate, 80), isDone: p.status === 'Completed' },
      { title: 'Deployment & Handover',   dueDate: endDate,                isDone: p.status === 'Completed' },
    ];

    const proj = await Project.create({
      name: p.name, client: p.client, status: p.status,
      description: p.desc, budget: p.budget,
      team, startDate, endDate, milestones, createdBy: admin._id,
    });
    projects.push(proj);
  }
  console.log(`✅ ${projects.length} projects created`);

  // 5. Tasks
  console.log('📋 Creating tasks...');
  const tasks = [];
  const assignableUsers = [...devs, pm, users.find(u => u.role === 'UI/UX Designer'), users.find(u => u.role === 'Marketing'), users.find(u => u.role === 'Social Media')].filter(Boolean);
  for (let i = 0; i < TASKS_DATA.length; i++) {
    const t = TASKS_DATA[i];
    const assignee = assignableUsers[i % assignableUsers.length];
    const project = i < 6 ? projects[0] : projects[1];
    const task = await Task.create({
      title: t.title, description: `Detailed work for: ${t.title}. Ensure all edge cases are handled and code is reviewed.`,
      assignedTo: assignee._id, priority: t.priority, status: t.status,
      deadline: addDays(subDays(TODAY, t.daysAgo), t.deadlineDays),
      project: project._id, createdBy: admin._id,
    });
    tasks.push(task);
    // Task report for in-progress/completed tasks
    if (['In Progress','Under Review','Completed'].includes(t.status)) {
      await TaskReport.create({
        taskId: task._id, userId: assignee._id,
        text: pick([
          'Made significant progress today. Core logic is implemented.',
          'Completed the initial implementation. Ready for review.',
          'Resolved all blocking issues. Testing in progress.',
          'Feature is complete and unit tested. PR raised.',
          'Found and fixed a critical bug during implementation.',
        ]),
      });
    }
  }
  console.log(`✅ ${tasks.length} tasks created`);

  // 6. Attendance — last 30 days for all employees
  console.log('📅 Creating attendance records...');
  let attCount = 0;
  for (const user of nonAdmin) {
    for (let d = 29; d >= 0; d--) {
      const day = subDays(TODAY, d);
      const dow = day.getDay(); // 0=Sun, 6=Sat
      const ds = dateStr(day);
      let status, checkIn = null, checkOut = null, totalHours = 0;

      if (dow === 0 || dow === 6) {
        status = 'Weekend';
      } else {
        const rand = Math.random();
        if (rand < 0.05) {
          status = 'Absent';
        } else if (rand < 0.12) {
          status = 'Leave';
        } else {
          const lateMinutes = rand < 0.75 ? randInt(0, 10) : randInt(15, 60);
          status = lateMinutes > 15 ? 'Late' : 'Present';
          const ciHour = 9, ciMin = lateMinutes;
          const coHour = ciHour + 9, coMin = ciMin;
          checkIn = new Date(day); checkIn.setHours(ciHour, ciMin, 0, 0);
          checkOut = new Date(day); checkOut.setHours(coHour, coMin, 0, 0);
          totalHours = 9;
        }
      }
      try {
        await Attendance.create({ userId: user._id, date: ds, checkIn, checkOut, totalHours, status });
        attCount++;
      } catch (_) {}
    }
  }
  console.log(`✅ ${attCount} attendance records created`);

  // 7. Leave Requests
  console.log('🏖️  Creating leave requests...');
  const leaveTypes = ['Sick','Casual','Annual','Emergency'];
  const leaveReasons = ['Fever and flu','Family emergency','Annual trip','Doctor appointment','Personal work'];
  let leaveCount = 0;
  for (const user of nonAdmin) {
    const numLeaves = randInt(1, 3);
    for (let i = 0; i < numLeaves; i++) {
      const fromDate = subDays(TODAY, randInt(5, 60));
      const days = randInt(1, 4);
      const toDate = addDays(fromDate, days - 1);
      const status = pick(['Approved','Approved','Approved','Pending','Rejected']);
      await LeaveRequest.create({
        userId: user._id, leaveType: pick(leaveTypes),
        fromDate: dateStr(fromDate), toDate: dateStr(toDate), totalDays: days,
        reason: pick(leaveReasons), status,
        decidedBy: status !== 'Pending' ? hr._id : null,
        decidedAt: status !== 'Pending' ? new Date() : null,
        rejectionReason: status === 'Rejected' ? 'Insufficient leave balance' : '',
      });
      leaveCount++;
    }
  }
  console.log(`✅ ${leaveCount} leave requests created`);

  // 8. Payroll — last 3 months
  console.log('💰 Creating payroll records...');
  const months = ['2026-05','2026-06','2026-07'];
  let payCount = 0;
  for (const user of users) {
    for (const month of months) {
      const allowances = Math.round(user.basicSalary * 0.1);
      const bonus     = month === '2026-07' && Math.random() > 0.6 ? randInt(5000, 20000) : 0;
      const deductions = Math.round(user.basicSalary * 0.02);
      const status = month === '2026-07' ? pick(['Pending','Paid']) : 'Paid';
      await Payroll.create({
        userId: user._id, month,
        basicSalary: user.basicSalary, allowances, bonus, deductions,
        status, paidAt: status === 'Paid' ? new Date() : null,
        paidBy: status === 'Paid' ? admin._id : null,
      });
      payCount++;
    }
  }
  console.log(`✅ ${payCount} payroll records created`);

  // 9. Channels & Messages
  console.log('💬 Creating chat channels and messages...');
  const allUserIds = users.map(u => u._id);
  const devUserIds = devs.map(u => u._id);

  const annCh = await Channel.create({ name: 'announcements', description: 'Company-wide announcements', type: 'Channel', memberIds: allUserIds, isAnnouncements: true, createdBy: admin._id });
  const genCh = await Channel.create({ name: 'general', description: 'General discussion for the whole team', type: 'Channel', memberIds: allUserIds, createdBy: admin._id });
  const engCh = await Channel.create({ name: 'engineering', description: 'Tech discussions and code reviews', type: 'Channel', memberIds: [...devUserIds, admin._id, pm._id], createdBy: admin._id });
  const mktCh = await Channel.create({ name: 'marketing', description: 'Marketing campaigns and content', type: 'Channel', memberIds: users.filter(u => ['Marketing','Sales','Social Media','Admin'].includes(u.role)).map(u => u._id), createdBy: admin._id });

  // DM between admin and hr
  await Channel.create({ name: `${admin.fullName} & ${hr.fullName}`, type: 'DirectMessage', memberIds: [admin._id, hr._id], createdBy: admin._id });

  let msgCount = 0;
  for (let i = 0; i < ANNOUNCEMENT_MSGS.length; i++) {
    await Message.create({ channelId: annCh._id, senderId: admin._id, text: ANNOUNCEMENT_MSGS[i], readBy: allUserIds });
    msgCount++;
  }
  for (let i = 0; i < GENERAL_MSGS.length; i++) {
    const sender = pick(users);
    await Message.create({ channelId: genCh._id, senderId: sender._id, text: GENERAL_MSGS[i], readBy: allUserIds });
    msgCount++;
  }
  for (let i = 0; i < ENGINEERING_MSGS.length; i++) {
    const sender = pick(devs);
    await Message.create({ channelId: engCh._id, senderId: sender._id, text: ENGINEERING_MSGS[i], readBy: devUserIds });
    msgCount++;
  }
  console.log(`✅ 5 channels + ${msgCount} messages created`);

  // 10. Notifications
  console.log('🔔 Creating notifications...');
  const notifTypes = [
    { type: 'TASK_ASSIGNED',  title: 'New task assigned to you',      message: 'You have been assigned a new task. Check your task board.' },
    { type: 'LEAVE_STATUS',   title: 'Leave request approved',         message: 'Your leave request has been approved by HR.' },
    { type: 'PAYROLL_PAID',   title: 'Salary credited for July 2026',  message: 'Your salary for July 2026 has been processed and paid.' },
    { type: 'TASK_STATUS',    title: 'Task status updated',            message: 'A task you created has been moved to Under Review.' },
    { type: 'SYSTEM',         title: 'Welcome to CCIMS!',              message: 'Your account has been set up. Explore the dashboard.' },
  ];
  let notifCount = 0;
  for (const user of nonAdmin) {
    const numNotifs = randInt(2, 4);
    for (let i = 0; i < numNotifs; i++) {
      const n = notifTypes[i % notifTypes.length];
      await Notification.create({ userId: user._id, type: n.type, title: n.title, message: n.message, isRead: Math.random() > 0.4 });
      notifCount++;
    }
  }
  // Admin notifications
  await Notification.create({ userId: admin._id, type: 'LEAVE_NEW',     title: 'New leave request',       message: 'An employee has submitted a leave request for your review.', isRead: false });
  await Notification.create({ userId: admin._id, type: 'EMPLOYEE_ADDED', title: 'New employee onboarded', message: '12 employees have been added to the system.',                isRead: true  });
  notifCount += 2;
  console.log(`✅ ${notifCount} notifications created`);

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('\n🎉 ═══════════════════════════════════════════');
  console.log('   CCIMS Fake Data Seeding Complete!');
  console.log('═══════════════════════════════════════════');
  console.log(`   👥 Employees  : ${users.length}`);
  console.log(`   📁 Projects   : ${projects.length}`);
  console.log(`   📋 Tasks      : ${tasks.length}`);
  console.log(`   📅 Attendance : ${attCount} records`);
  console.log(`   🏖️  Leaves     : ${leaveCount} requests`);
  console.log(`   💰 Payroll    : ${payCount} records`);
  console.log(`   💬 Messages   : ${msgCount}`);
  console.log(`   🔔 Notifs     : ${notifCount}`);
  console.log('───────────────────────────────────────────');
  console.log('   🔑 Admin Login: admin / Admin@123');
  console.log('   🔑 Staff Login: (username) / Pass@1234');
  console.log('═══════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
