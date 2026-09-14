import express from 'express';
import {
  generatePayroll,
  getPayroll,
  updatePayrollRow,
  updatePayrollStatus,
  getPayslip,
} from '../controllers/payrollController.js';
import {
  addSalaryPayment,
  getSalaryPayments,
  getEmployeePayrollDetail,
} from '../controllers/salaryPaymentController.js';
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

// Generate payroll for a month
router.post('/generate', isAdminOrHR, strictLimiter, generatePayroll,
  invalidate(['payroll:month:*', 'report:payroll:*'])
);

// List all payroll rows for a month (with payments attached)
router.get('/', isAdminOrHR,
  cache((req) => `payroll:month:${req.query.month || 'all'}`, 60),
  getPayroll
);

// Employee-wise full payroll + payment history
router.get('/employee/:userId', getEmployeePayrollDetail);

// Update allowances / bonus / deductions
router.patch('/:id',        isAdminOrHR, updatePayrollRow,    invalidate(payrollInvalidate));
router.patch('/:id/status', isAdminOrHR, updatePayrollStatus, invalidate(payrollInvalidate));

// Payslip JSON (for PDF generation on frontend)
router.get('/:id/payslip', getPayslip);

// Partial / full salary payments
router.post('/:id/payments', isAdminOrHR, addSalaryPayment,   invalidate(payrollInvalidate));
router.get('/:id/payments',  isAdminOrHR, getSalaryPayments);

export default router;
