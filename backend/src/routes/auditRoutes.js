import express from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect, isAdmin);
router.get('/', getAuditLogs);

export default router;
