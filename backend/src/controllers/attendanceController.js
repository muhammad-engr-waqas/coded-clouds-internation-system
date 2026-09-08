import Attendance from '../models/Attendance.js';
import Settings from '../models/Settings.js';
import { toDateOnly } from '../utils/dateHelpers.js';
import { logAudit } from '../utils/audit.js';

// @route POST /api/attendance/checkin
// Access: any employee, for themselves only
export const checkIn = async (req, res) => {
  const today = toDateOnly(new Date());
  const existing = await Attendance.findOne({ userId: req.user._id, date: today });

  if (existing && existing.checkIn) {
    return res.status(400).json({ message: 'You have already checked in today' });
  }

  const now = new Date();
  const settings = await Settings.getSingleton();
  const [cutH, cutM] = settings.lateCutoffTime.split(':').map(Number);
  const cutoff = new Date(now);
  cutoff.setHours(cutH, cutM, 0, 0);
  const status = now > cutoff ? 'Late' : 'Present';

  let record = existing;
  if (!record) {
    record = new Attendance({ userId: req.user._id, date: today });
  }
  record.checkIn = now;
  record.status = status;
  await record.save();

  const io = req.app.get('io');
  io.emit('attendance:update', { userId: req.user._id, date: today, checkIn: now, status });

  res.json(record);
};

// @route POST /api/attendance/checkout
// Access: any employee, for themselves only
export const checkOut = async (req, res) => {
  const today = toDateOnly(new Date());
  const record = await Attendance.findOne({ userId: req.user._id, date: today });

  if (!record || !record.checkIn) {
    return res.status(400).json({ message: 'You have not checked in today' });
  }
  if (record.checkOut) {
    return res.status(400).json({ message: 'You have already checked out today' });
  }

  const now = new Date();
  record.checkOut = now;
  record.totalHours = Number(((now - record.checkIn) / (1000 * 60 * 60)).toFixed(2));
  await record.save();

  const io = req.app.get('io');
  io.emit('attendance:update', { userId: req.user._id, date: today, checkOut: now, totalHours: record.totalHours });

  res.json(record);
};

// @route GET /api/attendance/me?month=YYYY-MM
export const getMyAttendance = async (req, res) => {
  const { month } = req.query; // 'YYYY-MM'
  const filter = { userId: req.user._id };
  if (month) filter.date = { $regex: `^${month}` };

  const records = await Attendance.find(filter).sort({ date: -1 });

  const totalPresent = records.filter((r) => r.status === 'Present').length;
  const totalLate = records.filter((r) => r.status === 'Late').length;
  const totalAbsent = records.filter((r) => r.status === 'Absent').length;
  const totalLeave = records.filter((r) => r.status === 'Leave').length;
  const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);

  res.json({
    records,
    summary: {
      totalPresent,
      totalLate,
      totalAbsent,
      totalLeave,
      totalHours: Number(totalHours.toFixed(2)),
      avgCheckIn: null, // frontend can compute from records if needed
    },
  });
};

// @route GET /api/attendance?month=&department=&status=
// Access: Admin, HR — company-wide table with monthly per-employee totals
export const getAllAttendance = async (req, res) => {
  const { month, status } = req.query;
  const filter = {};
  if (month) filter.date = { $regex: `^${month}` };
  if (status) filter.status = status;

  const records = await Attendance.find(filter)
    .populate('userId', 'fullName department role avatarUrl')
    .sort({ date: -1 });

  res.json(records);
};

// @route GET /api/attendance/:employeeId?month=
// Access: Admin, HR — individual employee detail
export const getEmployeeAttendance = async (req, res) => {
  const { month } = req.query;
  const filter = { userId: req.params.employeeId };
  if (month) filter.date = { $regex: `^${month}` };

  const records = await Attendance.find(filter).sort({ date: -1 });
  res.json(records);
};

// @route PATCH /api/attendance/:id/adjust
// Access: Admin, HR — manual correction, requires reason (audit-logged)
export const adjustAttendance = async (req, res) => {
  const { checkIn, checkOut, status, reason } = req.body;
  if (!reason) return res.status(400).json({ message: 'A reason is required for manual adjustments' });

  const record = await Attendance.findById(req.params.id);
  if (!record) return res.status(404).json({ message: 'Attendance record not found' });

  if (checkIn) record.checkIn = new Date(checkIn);
  if (checkOut) record.checkOut = new Date(checkOut);
  if (status) record.status = status;
  if (record.checkIn && record.checkOut) {
    record.totalHours = Number(((record.checkOut - record.checkIn) / (1000 * 60 * 60)).toFixed(2));
  }
  record.adjustedBy = req.user._id;
  record.adjustmentReason = reason;
  await record.save();

  await logAudit({
    actor: req.user._id,
    action: 'ADJUSTED_ATTENDANCE',
    module: 'Attendance',
    targetId: record._id,
    details: { reason },
  });

  res.json(record);
};
