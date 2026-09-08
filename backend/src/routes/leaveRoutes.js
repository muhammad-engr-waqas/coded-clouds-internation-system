import express from 'express';
import {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  approveLeave,
  rejectLeave,
} from '../controllers/leaveController.js';
import { protect } from '../middleware/auth.js';
import { isAdminOrHR } from '../middleware/rbac.js';
import { invalidate } from '../middleware/cache.js';

// Leave mutations bust leave + attendance reports (approve creates attendance records)
const leaveWriteInvalidate = invalidate(['report:leave', 'report:attendance:*']);

const router = express.Router();

router.use(protect);

router.post('/',  applyLeave,  invalidate(['report:leave']));
router.get('/me', getMyLeaves);

router.get('/',             isAdminOrHR, getAllLeaves);
router.patch('/:id/approve', isAdminOrHR, approveLeave, leaveWriteInvalidate);
router.patch('/:id/reject',  isAdminOrHR, rejectLeave,  invalidate(['report:leave']));

export default router;
