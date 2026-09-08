import AuditLog from '../models/AuditLog.js';

export const logAudit = async ({ actor, action, module, targetId = null, details = {} }) => {
  try {
    await AuditLog.create({ actor, action, module, targetId, details });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};
