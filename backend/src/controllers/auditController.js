import AuditLog from '../models/AuditLog.js';

// @route GET /api/audit?module=&actor=&from=&to=
// Access: Admin ONLY
export const getAuditLogs = async (req, res) => {
  const { module, actor, from, to, page = 1, limit = 50 } = req.query;
  const query = {};
  if (module) query.module = module;
  if (actor) query.actor = actor;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    AuditLog.find(query).populate('actor', 'fullName role').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    AuditLog.countDocuments(query),
  ]);

  res.json({ logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
};
