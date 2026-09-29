import express from 'express';
import {
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  bulkUpsert,
  importLeads,
  duplicateLead,
  getStats,
  getActivity,
  getSalespeople,
  getIndustries,
} from '../controllers/salesLeadController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin, allowRoles } from '../middleware/rbac.js';
import { invalidate } from '../middleware/cache.js';

const isSalesOrAdmin = allowRoles('Admin', 'Sales');
const leadsInvalidate = invalidate(['leads:*']);

const router = express.Router();
router.use(protect);

// ── Stats & helpers (before /:id so they don't get caught by param route) ────
router.get('/stats',       isSalesOrAdmin, getStats);
router.get('/activity',    isSalesOrAdmin, getActivity);
router.get('/salespeople', isAdmin,        getSalespeople);
router.get('/industries',  isSalesOrAdmin, getIndustries);

// ── Collection routes ─────────────────────────────────────────────────────────
router.get('/',    isSalesOrAdmin, getLeads);
router.post('/',   isSalesOrAdmin, createLead,   leadsInvalidate);

// ── Bulk / Import ─────────────────────────────────────────────────────────────
router.post('/bulk',   isSalesOrAdmin, bulkUpsert, leadsInvalidate);
router.post('/import', isSalesOrAdmin, importLeads, leadsInvalidate);

// ── Single-lead routes ────────────────────────────────────────────────────────
router.patch('/:id',           isSalesOrAdmin, updateLead,    leadsInvalidate);
router.delete('/:id',          isAdmin,        deleteLead,    leadsInvalidate);
router.post('/:id/duplicate',  isSalesOrAdmin, duplicateLead, leadsInvalidate);

export default router;
