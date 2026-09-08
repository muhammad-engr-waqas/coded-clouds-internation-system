import express from 'express';
import {
  checkIn,
  checkOut,
  getMyAttendance,
  getAllAttendance,
  getEmployeeAttendance,
  adjustAttendance,
} from '../controllers/attendanceController.js';
import { protect } from '../middleware/auth.js';
import { isAdminOrHR } from '../middleware/rbac.js';
import { invalidate } from '../middleware/cache.js';

// Attendance writes bust the attendance report for all months
const attendanceInvalidate = invalidate(['report:attendance:*']);

const router = express.Router();

router.use(protect);

router.post('/checkin',  checkIn,  attendanceInvalidate);
router.post('/checkout', checkOut, attendanceInvalidate);
router.get('/me',        getMyAttendance);

router.get('/',                  isAdminOrHR, getAllAttendance);
router.get('/:employeeId',       isAdminOrHR, getEmployeeAttendance);
router.patch('/:id/adjust',      isAdminOrHR, adjustAttendance, attendanceInvalidate);

export default router;
