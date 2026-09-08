import Task from '../models/Task.js';
import TaskReport from '../models/TaskReport.js';
import { notifyUser } from '../utils/notify.js';
import { logAudit } from '../utils/audit.js';

// @route GET /api/tasks
// Access: Admin only — full company-wide board. Supports filters.
export const getAllTasks = async (req, res) => {
  const { assignedTo, role, project, priority, status } = req.query;
  const query = {};
  if (assignedTo) query.assignedTo = assignedTo;
  if (project) query.project = project;
  if (priority) query.priority = priority;
  if (status) query.status = status;

  let tasks = await Task.find(query)
    .populate('assignedTo', 'fullName role avatarUrl')
    .populate('project', 'name')
    .sort({ createdAt: -1 });

  if (role) {
    tasks = tasks.filter((t) => t.assignedTo?.role === role);
  }

  // attach report counts
  const counts = await TaskReport.aggregate([
    { $group: { _id: '$taskId', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));

  res.json(
    tasks.map((t) => ({
      ...t.toObject(),
      reportCount: countMap[t._id.toString()] || 0,
    }))
  );
};

// @route GET /api/tasks/me
// Access: any employee — STRICTLY scoped to their own assigned tasks only (visibility Rule 1)
export const getMyTasks = async (req, res) => {
  const tasks = await Task.find({ assignedTo: req.user._id })
    .populate('project', 'name')
    .sort({ createdAt: -1 });

  const counts = await TaskReport.aggregate([
    { $match: { taskId: { $in: tasks.map((t) => t._id) } } },
    { $group: { _id: '$taskId', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));

  res.json(
    tasks.map((t) => ({
      ...t.toObject(),
      reportCount: countMap[t._id.toString()] || 0,
    }))
  );
};

// @route POST /api/tasks
// Access: Admin ONLY — the only role that can create/assign a task
export const createTask = async (req, res) => {
  const { title, description, assignedTo, priority, deadline, project, attachments } = req.body;

  if (!title || !assignedTo) {
    return res.status(400).json({ message: 'Title and Assigned To are required' });
  }

  const task = await Task.create({
    title,
    description,
    assignedTo,
    priority,
    deadline,
    project: project || null,
    attachments: attachments || [],
    createdBy: req.user._id,
  });

  await logAudit({
    actor: req.user._id,
    action: 'CREATED_TASK',
    module: 'Task',
    targetId: task._id,
    details: { title, assignedTo },
  });

  const io = req.app.get('io');
  io.to(`user:${assignedTo}`).emit('task:assigned', task);
  await notifyUser(io, assignedTo, {
    type: 'TASK_ASSIGNED',
    title: 'New task assigned to you',
    message: title,
    link: `/tasks/${task._id}`,
  });

  res.status(201).json(task);
};

// @route GET /api/tasks/:id
// Access: Admin (any task) OR the assigned employee (only their own — enforced below)
export const getTaskById = async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('assignedTo', 'fullName role avatarUrl')
    .populate('project', 'name')
    .populate('createdBy', 'fullName');

  if (!task) return res.status(404).json({ message: 'Task not found' });

  const isOwner = task.assignedTo._id.toString() === req.user._id.toString();
  if (req.user.role !== 'Admin' && !isOwner) {
    return res.status(403).json({ message: 'You can only view your own tasks' });
  }

  const reports = await TaskReport.find({ taskId: task._id }).populate('userId', 'fullName avatarUrl').sort({ createdAt: 1 });

  res.json({ ...task.toObject(), reports });
};

// @route PATCH /api/tasks/:id/status
// Access: Admin (any override) OR assigned employee (next-step only, linear progression)
export const updateTaskStatus = async (req, res) => {
  const { status } = req.body;
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const isOwner = task.assignedTo.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'Admin';

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: 'Not authorized to update this task' });
  }

  if (!isAdmin) {
    // Employees can only move to the immediate next status
    if (!Task.isValidNextStatus(task.status, status)) {
      return res.status(400).json({
        message: `Invalid status change. Task must progress: ${Task.STATUS_ORDER.join(' → ')}`,
      });
    }
  }

  task.status = status;
  await task.save();

  const io = req.app.get('io');
  io.to(`user:${task.assignedTo}`).emit('task:status:changed', task);
  io.to(`user:${task.createdBy}`).emit('task:status:changed', task);

  if (status === 'Completed') {
    await notifyUser(io, task.createdBy, {
      type: 'TASK_STATUS',
      title: 'Task marked Completed',
      message: task.title,
      link: `/tasks/${task._id}`,
    });
  }

  res.json(task);
};

// @route PATCH /api/tasks/:id/reassign
// Access: Admin ONLY
export const reassignTask = async (req, res) => {
  const { assignedTo } = req.body;
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const previousAssignee = task.assignedTo;
  task.assignedTo = assignedTo;
  await task.save();

  await logAudit({
    actor: req.user._id,
    action: 'REASSIGNED_TASK',
    module: 'Task',
    targetId: task._id,
    details: { from: previousAssignee, to: assignedTo },
  });

  const io = req.app.get('io');
  io.to(`user:${assignedTo}`).emit('task:assigned', task);
  await notifyUser(io, assignedTo, {
    type: 'TASK_ASSIGNED',
    title: 'A task has been reassigned to you',
    message: task.title,
    link: `/tasks/${task._id}`,
  });

  res.json(task);
};

// @route DELETE /api/tasks/:id
// Access: Admin ONLY
export const deleteTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  await TaskReport.deleteMany({ taskId: task._id });
  await task.deleteOne();

  await logAudit({
    actor: req.user._id,
    action: 'DELETED_TASK',
    module: 'Task',
    targetId: req.params.id,
  });

  res.json({ message: 'Task deleted' });
};

// ---------- Task Progress Reports (the thread under each task) ----------

// @route POST /api/tasks/:id/reports
// Access: the assigned employee (posting progress) OR Admin (commenting back)
export const addTaskReport = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const isOwner = task.assignedTo.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'Admin';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'Not authorized to report on this task' });
  }

  const { text, attachments } = req.body;
  if (!text) return res.status(400).json({ message: 'Report text is required' });

  const report = await TaskReport.create({
    taskId: task._id,
    userId: req.user._id,
    text,
    attachments: attachments || [],
  });
  const populated = await report.populate('userId', 'fullName avatarUrl');

  const io = req.app.get('io');
  // Push to both the task creator (Admin) and the assignee, so it live-syncs on both panels
  io.to(`user:${task.createdBy}`).emit('task:report:new', { taskId: task._id, report: populated });
  io.to(`user:${task.assignedTo}`).emit('task:report:new', { taskId: task._id, report: populated });

  if (isOwner) {
    await notifyUser(io, task.createdBy, {
      type: 'TASK_REPORT',
      title: 'New update on a task',
      message: `${req.user.fullName} posted an update on "${task.title}"`,
      link: `/tasks/${task._id}`,
    });
  }

  res.status(201).json(populated);
};

// @route GET /api/tasks/:id/reports
export const getTaskReports = async (req, res) => {
  const reports = await TaskReport.find({ taskId: req.params.id })
    .populate('userId', 'fullName avatarUrl')
    .sort({ createdAt: 1 });
  res.json(reports);
};
