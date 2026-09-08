import express from 'express';
import {
  getAllTasks,
  getMyTasks,
  createTask,
  getTaskById,
  updateTaskStatus,
  reassignTask,
  deleteTask,
  addTaskReport,
  getTaskReports,
} from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/rbac.js';
import { invalidate } from '../middleware/cache.js';

// Task mutations always bust the reports dashboard task report
const taskInvalidate = invalidate(['report:tasks']);

const router = express.Router();

router.use(protect);

// Task lists are per-user or real-time-updated — not cached to avoid stale boards
router.get('/',    isAdmin, getAllTasks);
router.get('/me',  getMyTasks);
router.post('/',   isAdmin, createTask, taskInvalidate);

router.get('/:id',              getTaskById);
router.patch('/:id/status',     updateTaskStatus,  taskInvalidate);
router.patch('/:id/reassign',   isAdmin, reassignTask, taskInvalidate);
router.delete('/:id',           isAdmin, deleteTask,   taskInvalidate);

router.post('/:id/reports',  addTaskReport);
router.get('/:id/reports',   getTaskReports);

export default router;
