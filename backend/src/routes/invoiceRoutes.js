import express from 'express';
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  deleteInvoice,
} from '../controllers/invoiceController.js';
import { protect } from '../middleware/auth.js';
import { isAdminOrHR } from '../middleware/rbac.js';
import { cache, invalidate } from '../middleware/cache.js';

const router = express.Router();
router.use(protect);
router.use(isAdminOrHR);

router.get(  '/',    cache((req) => `invoices:list:p${req.query.page||1}:s${req.query.search||''}:c${req.query.currency||''}`, 60), getInvoices);
router.post( '/',    createInvoice,  invalidate(['invoices:list:*']));
router.get(  '/:id', getInvoiceById);
router.delete('/:id', deleteInvoice, invalidate(['invoices:list:*']));

export default router;
