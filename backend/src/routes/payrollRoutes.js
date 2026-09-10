import express from 'express';
import {
  generatePayroll,
  getPayroll,
  updatePayrollRow,
  updatePayrollStatus,
  getPayslip,
} from '../controllers/payrollController.js';
import { addSalaryPayment, getSalaryPayments } from '../controllers/salaryPaymentController.js';
import { protect } from '../middleware/auth.js';
import { isAdminOrHR } from '../middleware/rbac.js';
import { cache, invalidate } from '../middleware/cache.js';
import { strictLimiter } from '../middleware/rateLimiter.js';

const payrollInvalidate = [
  (req) => `payroll:month:${req.query.month || req.body?.month || 'all'}`,
  'report:payroll:*',
];

const router = express.Router();
router.use(protect);

router.post('/generate', isAdminOrHR, strictLimiter, generatePayroll,
  invalidate(['payroll:month:*', 'report:payroll:*'])
);
router.get('/', isAdminOrHR,
  cache((req) => `payroll:month:${req.query.month || 'all'}`, 60),
  getPayroll
);
router.patch('/:id',        isAdminOrHR, updatePayrollRow,    invalidate(payrollInvalidate));
router.patch('/:id/status', isAdminOrHR, updatePayrollStatus, invalidate(payrollInvalidate));
router.get('/:id/payslip',  getPayslip);

// Partial salary payments
router.post('/:id/payments', isAdminOrHR, addSalaryPayment, invalidate(payrollInvalidate));
router.get('/:id/payments',  isAdminOrHR, getSalaryPayments);

export default router;
