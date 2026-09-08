import express from 'express';
import {
  workforceReport,
  taskReport,
  attendanceReport,
  leaveReport,
  projectReport,
  payrollReport,
} from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/rbac.js';
import { cache } from '../middleware/cache.js';
import { strictLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect, isAdmin);

// Reports are heavy multi-collection aggregations — cache for 3 minutes.
// The invalidate() calls on write routes (tasks, payroll, attendance etc.)
// will bust these keys whenever underlying data changes.
router.get('/workforce',  cache('report:workforce',  180), workforceReport);
router.get('/tasks',      cache('report:tasks',       180), taskReport);
router.get('/leave',      cache('report:leave',       180), leaveReport);
router.get('/projects',   cache('report:projects',    180), projectReport);

// Attendance & payroll reports are month-scoped — key includes the month param
router.get('/attendance', cache((req) => `report:attendance:${req.query.month || 'all'}`, 180), attendanceReport);
router.get('/payroll',    strictLimiter, cache((req) => `report:payroll:${req.query.month || 'all'}`, 180), payrollReport);

export default router;
