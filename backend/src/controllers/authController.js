import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { blacklistToken, delCache } from '../config/redis.js';

// @route POST /api/auth/login
// Frontend login page only sends { username, password } — role is resolved here and returned in the response
export const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const user = await User.findOne({ username: username.toLowerCase() }).select('+password');
  if (!user) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }
  if (user.status !== 'Active') {
    return res.status(403).json({ message: 'Your account is suspended/inactive. Contact Admin/HR.' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const token = generateToken(user._id);
  res.json({
    token,
    user: user.toSafeObject(), // includes `role` — frontend redirects based on this
  });
};

// @route POST /api/auth/logout
// Blacklists the current JWT in Redis so it can't be reused after logout.
// The token is stored with TTL = remaining seconds until its natural expiry.
export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      // Decode without verify (we already verified in protect middleware)
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await blacklistToken(token, ttl);
        }
      }

      // Also bust the cached user profile so stale data isn't served
      if (decoded && decoded.id) {
        await delCache(`user:${decoded.id}`);
      }
    }
  } catch (err) {
    // Non-fatal — log and continue so the frontend always gets a clean 200
    console.error('Logout Redis error (non-fatal):', err.message);
  }

  res.json({ message: 'Logged out successfully' });
};

// @route GET /api/auth/me
export const getMe = async (req, res) => {
  // req.user is already set by protect middleware (from Redis cache or DB)
  // Re-fetch from DB to ensure we return a fresh, complete profile
  const user = await User.findById(req.user._id ?? req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user.toSafeObject());
};

// @route POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });

  // Always respond generically (don't leak which emails exist)
  if (!user) {
    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  // NOTE: plug in real SMTP/email service here. Logging for now so the flow is testable.
  console.log(`Password reset link for ${user.email}: ${resetUrl}`);

  res.json({ message: 'If that email exists, a reset link has been sent.' });
};

// @route POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpires');

  if (!user) {
    return res.status(400).json({ message: 'Reset link is invalid or has expired' });
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  // Bust cached profile so the next login picks up fresh data
  await delCache(`user:${user._id}`);

  res.json({ message: 'Password has been reset successfully. Please log in.' });
};

// @route POST /api/auth/change-password  (logged-in user changes their own password)
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id ?? req.user.id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  await user.save();

  // Bust cached profile
  await delCache(`user:${user._id}`);

  res.json({ message: 'Password changed successfully' });
};
