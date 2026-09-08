import User from '../models/User.js';
import Task from '../models/Task.js';
import Attendance from '../models/Attendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Project from '../models/Project.js';
import Payroll from '../models/Payroll.js';

// All report endpoints: Access = Admin ONLY

// @route GET /api/reports/workforce
export const workforceReport = async (req, res) => {
  const total = await User.countDocuments();
  const active = await User.countDocuments({ status: 'Active' });
  const suspended = await User.countDocuments({ status: 'Suspended' });
  const separated = await User.countDocuments({ status: 'Separated' });

  const byDepartment = await User.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }]);
  const byRole = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);

  res.json({ total, active, suspended, separated, byDepartment, byRole });
};

// @route GET /api/reports/tasks
export const taskReport = async (req, res) => {
  const byStatus = await Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const overdue = await Task.countDocuments({ deadline: { $lt: new Date() }, status: { $ne: 'Completed' } });

  res.json({ byStatus, overdueCount: overdue });
};

// @route GET /api/reports/attendance
export const attendanceReport = async (req, res) => {
  const { month } = req.query;
  const filter = month ? { date: { $regex: `^${month}` } } : {};

  const byStatus = await Attendance.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const totalHours = await Attendance.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$totalHours' } } },
  ]);

  res.json({ byStatus, totalHours: totalHours[0]?.total || 0 });
};

// @route GET /api/reports/leave
export const leaveReport = async (req, res) => {
  const byStatus = await LeaveRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const byType = await LeaveRequest.aggregate([{ $group: { _id: '$leaveType', count: { $sum: 1 } } }]);

  res.json({ byStatus, byType });
};

// @route GET /api/reports/projects
export const projectReport = async (req, res) => {
  const byStatus = await Project.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  res.json({ byStatus });
};

// @route GET /api/reports/payroll
export const payrollReport = async (req, res) => {
  const { month } = req.query;
  const filter = month ? { month } : {};

  const rows = await Payroll.find(filter);
  const totalCost = rows.reduce((s, r) => s + r.netSalary, 0);
  const totalBasic = rows.reduce((s, r) => s + r.basicSalary, 0);
  const totalBonus = rows.reduce((s, r) => s + r.bonus, 0);
  const totalAllowances = rows.reduce((s, r) => s + r.allowances, 0);
  const totalDeductions = rows.reduce((s, r) => s + r.deductions, 0);
  const paid = rows.filter((r) => r.status === 'Paid').reduce((s, r) => s + r.netSalary, 0);
  const pending = totalCost - paid;

  res.json({ totalCost, totalBasic, totalBonus, totalAllowances, totalDeductions, paid, pending });
};
