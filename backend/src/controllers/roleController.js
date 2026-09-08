import Role from '../models/Role.js';
import User from '../models/User.js';

// @route GET /api/roles
export const getRoles = async (req, res) => {
  const roles = await Role.find().sort({ name: 1 });
  res.json(roles);
};

// @route POST /api/roles
// Access: Admin ONLY
export const createRole = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Role name is required' });

  const exists = await Role.findOne({ name });
  if (exists) return res.status(409).json({ message: 'Role already exists' });

  const role = await Role.create({ name });
  res.status(201).json(role);
};

// @route PATCH /api/roles/:id
// Access: Admin ONLY
export const updateRole = async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) return res.status(404).json({ message: 'Role not found' });
  if (role.isSystem) return res.status(400).json({ message: 'System roles cannot be renamed' });

  role.name = req.body.name || role.name;
  await role.save();
  res.json(role);
};

// @route DELETE /api/roles/:id
// Access: Admin ONLY — blocked if employees currently use this role
export const deleteRole = async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) return res.status(404).json({ message: 'Role not found' });
  if (role.isSystem) return res.status(400).json({ message: 'System roles cannot be deleted' });

  const inUse = await User.countDocuments({ role: role.name });
  if (inUse > 0) {
    return res.status(400).json({ message: `Cannot delete — ${inUse} employee(s) currently have this role` });
  }

  await role.deleteOne();
  res.json({ message: 'Role deleted' });
};
