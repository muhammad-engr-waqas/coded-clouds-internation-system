import express from 'express';
import {
  getEmployees,
  createEmployee,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  updateEmployeeStatus,
  uploadEmployeeDocument,
  deleteEmployeeDocument,
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { isAdminOrHR } from '../middleware/rbac.js';
import { upload, setUploadFolder } from '../middleware/upload.js';
import { cache, invalidate } from '../middleware/cache.js';

const router = express.Router();

router.use(protect);

// Cache employee list — key includes page + search so different pages don't collide.
// TTL 2 min — short enough that newly added employees appear quickly.
const employeeListKey = (req) =>
  `employees:list:p${req.query.page || 1}:s${req.query.search || ''}:r${req.query.role || ''}:d${req.query.department || ''}:st${req.query.status || ''}`;

router.get('/',    isAdminOrHR, cache(employeeListKey, 120), getEmployees);
router.post('/',   isAdminOrHR, createEmployee,
  invalidate(['employees:list:*', 'report:workforce'])
);

// Per-employee profile — cache 5 min
router.get('/:id',       isAdminOrHR, cache((req) => `employees:${req.params.id}`, 300), getEmployeeById);
router.patch('/:id',     isAdminOrHR, updateEmployee,
  invalidate([(req) => `employees:${req.params.id}`, 'employees:list:*', 'report:workforce'])
);
router.delete('/:id',    isAdminOrHR, deleteEmployee,
  invalidate([(req) => `employees:${req.params.id}`, 'employees:list:*', 'report:workforce'])
);
router.patch('/:id/status', isAdminOrHR, updateEmployeeStatus,
  invalidate([(req) => `employees:${req.params.id}`, 'employees:list:*', 'report:workforce'])
);

// Document upload — Admin/HR or the employee themselves
router.post(
  '/:id/documents',
  (req, res, next) => {
    if (req.user.role === 'Admin' || req.user.role === 'HR' || req.user._id?.toString() === req.params.id || req.user.id === req.params.id) {
      return next();
    }
    return res.status(403).json({ message: 'You can only upload documents to your own profile' });
  },
  setUploadFolder('documents'),
  upload.single('file'),
  uploadEmployeeDocument,
  invalidate([(req) => `employees:${req.params.id}`])
);
router.delete('/:id/documents/:docId', isAdminOrHR, deleteEmployeeDocument,
  invalidate([(req) => `employees:${req.params.id}`])
);

export default router;
