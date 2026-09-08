import express from 'express';
import {
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Auth-specific rate limit (10 req / 15 min) on the two endpoints most
// vulnerable to brute-force: login and forgot-password.
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);

router.post('/logout', protect, logout);       // NEW — blacklists token in Redis
router.get('/me', protect, getMe);
router.post('/reset-password', resetPassword);
router.post('/change-password', protect, changePassword);

export default router;
