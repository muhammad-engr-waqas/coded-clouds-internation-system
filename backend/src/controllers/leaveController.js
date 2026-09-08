import LeaveRequest from '../models/LeaveRequest.js';
import Attendance from '../models/Attendance.js';
import Settings from '../models/Settings.js';
import { daysBetween } from '../utils/dateHelpers.js';
import { notifyUser } from '../utils/notify.js';

// @route POST /api/leave
// Access: any employee, applies for themselves
export const applyLeave = async (req, res) => {
  const { leaveType, fromDate, toDate, reason, attachment } = req.body;
  if (!leaveType || !fromDate || !toDate || !reason) {
    return res.status(400).json({ message: 'Leave type, dates, and reason are required' });
  }

  const settings = await Settings.getSingleton();
  const totalDays = daysBetween(fromDate, toDate, settings.excludeWeekendsFromLeaveCount);

  const leave = await LeaveRequest.create({
    userId: req.user._id,
    leaveType,
    fromDate,
    toDate,
    totalDays,
    reason,
    attachment: attachment || '',
  });

  const io = req.app.get('io');
  io.emit('leave:new', leave); // visible to HR/Admin panels live

  res.status(201).json(leave);
};

// @route GET /api/leave/me
// Access: employee — own requests + summary (total taken, last leave date)
export const getMyLeaves = async (req, res) => {
  const leaves = await LeaveRequest.find({ userId: req.user._id }).sort({ createdAt: -1 });

  const approved = leaves.filter((l) => l.status === 'Approved');
  const totalTaken = approved.reduce((sum, l) => sum + l.totalDays, 0);
  const lastLeave = approved.sort((a, b) => new Date(b.toDate) - new Date(a.toDate))[0];

  const settings = await Settings.getSingleton();

  res.json({
    leaves,
    summary: {
      totalLeavesTaken: totalTaken,
      lastLeaveDate: lastLeave ? { from: lastLeave.fromDate, to: lastLeave.toDate } : null,
      leaveBalance: settings.annualLeaveQuota - totalTaken,
    },
  });
};

// @route GET /api/leave?status=&role=&department=&search=
// Access: Admin, HR — full queue
export const getAllLeaves = async (req, res) => {
  const { status, search } = req.query;
  const query = {};
  if (status) query.status = status;

  let leaves = await LeaveRequest.find(query)
    .populate('userId', 'fullName role department')
    .sort({ createdAt: -1 });

  if (search) {
    const s = search.toLowerCase();
    leaves = leaves.filter((l) => l.userId?.fullName?.toLowerCase().includes(s));
  }

  res.json(leaves);
};

// @route PATCH /api/leave/:id/approve
// Access: Admin, HR
export const approveLeave = async (req, res) => {
  const leave = await LeaveRequest.findById(req.params.id);
  if (!leave) return res.status(404).json({ message: 'Leave request not found' });

  leave.status = 'Approved';
  leave.decidedBy = req.user._id;
  leave.decidedAt = new Date();
  await leave.save();

  // Auto-reflect approved leave days in Attendance
  const cur = new Date(leave.fromDate);
  const end = new Date(leave.toDate);
  while (cur <= end) {
    const dateStr = cur.toISOString().slice(0, 10);
    await Attendance.findOneAndUpdate(
      { userId: leave.userId, date: dateStr },
      { userId: leave.userId, date: dateStr, status: 'Leave' },
      { upsert: true, new: true }
    );
    cur.setDate(cur.getDate() + 1);
  }

  const io = req.app.get('io');
  io.to(`user:${leave.userId}`).emit('leave:statusChanged', leave);
  await notifyUser(io, leave.userId, {
    type: 'LEAVE_STATUS',
    title: 'Leave request approved',
    message: `${leave.fromDate} to ${leave.toDate}`,
    link: '/leave',
  });

  res.json(leave);
};

// @route PATCH /api/leave/:id/reject
// Access: Admin, HR
export const rejectLeave = async (req, res) => {
  const { reason } = req.body;
  const leave = await LeaveRequest.findById(req.params.id);
  if (!leave) return res.status(404).json({ message: 'Leave request not found' });

  leave.status = 'Rejected';
  leave.rejectionReason = reason || '';
  leave.decidedBy = req.user._id;
  leave.decidedAt = new Date();
  await leave.save();

  const io = req.app.get('io');
  io.to(`user:${leave.userId}`).emit('leave:statusChanged', leave);
  await notifyUser(io, leave.userId, {
    type: 'LEAVE_STATUS',
    title: 'Leave request rejected',
    message: reason || `${leave.fromDate} to ${leave.toDate}`,
    link: '/leave',
  });

  res.json(leave);
};
