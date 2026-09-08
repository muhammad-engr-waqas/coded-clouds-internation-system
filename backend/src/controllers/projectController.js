import Project from '../models/Project.js';
import { logAudit } from '../utils/audit.js';

// @route GET /api/projects?status=&search=
// Access: Admin ONLY (Visibility Rule 2 — Projects module is Admin-only)
export const getProjects = async (req, res) => {
  const { status, search } = req.query;
  const query = {};
  if (status) query.status = status;
  if (search) query.name = { $regex: search, $options: 'i' };

  const projects = await Project.find(query).populate('team', 'fullName avatarUrl role').sort({ createdAt: -1 });

  const counts = {
    completed: await Project.countDocuments({ status: 'Completed' }),
    inProgress: await Project.countDocuments({ status: 'In Progress' }),
    pending: await Project.countDocuments({ status: 'Pending' }),
  };

  res.json({ projects, counts });
};

// @route POST /api/projects
// Access: Admin ONLY — can add new OR already-completed past projects for record-keeping
export const createProject = async (req, res) => {
  const { name, client, status, startDate, endDate, team, description, budget, milestones } = req.body;
  if (!name || !client) {
    return res.status(400).json({ message: 'Project name and client are required' });
  }

  const project = await Project.create({
    name,
    client,
    status: status || 'Pending',
    startDate,
    endDate,
    team: team || [],
    description,
    budget,
    milestones: milestones || [],
    createdBy: req.user._id,
  });

  await logAudit({
    actor: req.user._id,
    action: 'CREATED_PROJECT',
    module: 'Project',
    targetId: project._id,
    details: { name, status: project.status },
  });

  res.status(201).json(project);
};

// @route GET /api/projects/:id
// Access: Admin ONLY
export const getProjectById = async (req, res) => {
  const project = await Project.findById(req.params.id).populate('team', 'fullName avatarUrl role');
  if (!project) return res.status(404).json({ message: 'Project not found' });
  res.json(project);
};

// @route PATCH /api/projects/:id
// Access: Admin ONLY — includes status changes (Pending/In Progress/Completed)
export const updateProject = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const editable = ['name', 'client', 'status', 'startDate', 'endDate', 'description', 'budget', 'clientNotes'];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) project[field] = req.body[field];
  });

  await project.save();

  await logAudit({
    actor: req.user._id,
    action: 'UPDATED_PROJECT',
    module: 'Project',
    targetId: project._id,
    details: { changedFields: Object.keys(req.body) },
  });

  res.json(project);
};

// @route DELETE /api/projects/:id
// Access: Admin ONLY
export const deleteProject = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  await project.deleteOne();
  await logAudit({ actor: req.user._id, action: 'DELETED_PROJECT', module: 'Project', targetId: req.params.id });

  res.json({ message: 'Project deleted' });
};

// @route PATCH /api/projects/:id/team
// Access: Admin ONLY — add/remove team members
export const updateProjectTeam = async (req, res) => {
  const { team } = req.body; // full replacement array of userIds
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  project.team = team;
  await project.save();
  res.json(project);
};

// @route PATCH /api/projects/:id/milestones/:milestoneId
// Access: Admin ONLY — toggle milestone done, recalculates progress virtual
export const updateMilestone = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const milestone = project.milestones.id(req.params.milestoneId);
  if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

  if (req.body.isDone !== undefined) milestone.isDone = req.body.isDone;
  if (req.body.title !== undefined) milestone.title = req.body.title;
  if (req.body.dueDate !== undefined) milestone.dueDate = req.body.dueDate;

  await project.save();
  res.json(project);
};
