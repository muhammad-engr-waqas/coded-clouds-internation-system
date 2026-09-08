import express from 'express';
import {
  generatePayroll,
  getPayroll,
  updatePayrollRow,
  updatePayrollStatus,
  getPayslip,
} from '../controllers/payrollController.js';
import { protect } from '../middleware/auth.js';
import { isAdminOrHR } from '../middleware/rbac.js';
import { cache, invalidate } from '../middleware/cache.js';
import { strictLimiter } from '../middleware/rateLimiter.js';

// Payroll invalidation keys — bust both the payroll list AND payroll report for that month
const payrollInvalidate = [
  (req) => `payroll:month:${req.query.month || req.body?.month || 'all'}`,
  'report:payroll:*',
];

const router = express.Router();

router.use(protect);

// Generate is expensive — apply strict rate limit (20/min) + bust cache after
router.post('/generate', isAdminOrHR, strictLimiter, generatePayroll,
  invalidate(['payroll:month:*', 'report:payroll:*'])
);

// Cache payroll list per month — 2 min TTL (payroll data can be edited inline)
router.get('/',     isAdminOrHR,
  cache((req) => `payroll:month:${req.query.month || 'all'}`, 120),
  getPayroll
);

router.patch('/:id',        isAdminOrHR, updatePayrollRow,    invalidate(payrollInvalidate));
router.patch('/:id/status', isAdminOrHR, updatePayrollStatus, invalidate(payrollInvalidate));

// Payslips are per-row, not cached (they are generated PDFs / unique per call)
router.get('/:id/payslip', getPayslip);

export default router;
