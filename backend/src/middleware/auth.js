import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getCache, setCache, isTokenBlacklisted } from '../config/redis.js';

// User profile cache TTL — 60 seconds per user
// Reduces User.findById() on every single request under concurrent load.
const USER_CACHE_TTL = 60;

export const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    // ── 1. Token blacklist check (Redis) ───────────────────────────────────
    // If the user has logged out, their token sits in Redis until it expires.
    // isTokenBlacklisted() returns false when Redis is down — fail open so
    // a Redis outage never locks out valid users.
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({ message: 'Token has been revoked. Please log in again.' });
    }

    // ── 2. Verify JWT ──────────────────────────────────────────────────────
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ── 3. User lookup — Redis first, MongoDB fallback ─────────────────────
    const cacheKey = `user:${decoded.id}`;
    let userData = await getCache(cacheKey);

    if (!userData) {
      // Cache miss — hit MongoDB and store the result
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      // Store plain object (not Mongoose doc) — only the fields we need
      userData = {
        _id: user._id.toString(),
        id:  user._id.toString(),
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
        status: user.status,
        basicSalary: user.basicSalary,
        avatarUrl: user.avatarUrl,
      };
      await setCache(cacheKey, userData, USER_CACHE_TTL);
    }

    // ── 4. Active check ────────────────────────────────────────────────────
    if (userData.status !== 'Active') {
      return res.status(403).json({ message: 'Your account is not active. Contact Admin/HR.' });
    }

    // Attach to request — controllers use req.user._id / req.user.role
    req.user = userData;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
  }
};
