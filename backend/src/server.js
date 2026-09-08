import 'dotenv/config';
import express from 'express';
import 'express-async-errors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import morgan from 'morgan';
import { Server } from 'socket.io';

import { connectDB } from './config/db.js';
// Redis client is imported here so it connects at startup and its logs appear early.
// The import is side-effectful — the client is used internally by middleware.
import './config/redis.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { initSockets } from './sockets/index.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Routes
import authRoutes        from './routes/authRoutes.js';
import userRoutes        from './routes/userRoutes.js';
import taskRoutes        from './routes/taskRoutes.js';
import attendanceRoutes  from './routes/attendanceRoutes.js';
import leaveRoutes       from './routes/leaveRoutes.js';
import payrollRoutes     from './routes/payrollRoutes.js';
import projectRoutes     from './routes/projectRoutes.js';
import chatRoutes        from './routes/chatRoutes.js';
import settingsRoutes    from './routes/settingsRoutes.js';
import reportRoutes      from './routes/reportRoutes.js';
import auditRoutes       from './routes/auditRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  },
});
initSockets(io);
app.set('io', io);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

// ── Global API rate limit (100 req/min per IP) ────────────────────────────────
// Applied before all /api routes. Auth routes get their own stricter limit
// (authLimiter) applied inside authRoutes.js.
app.use('/api', apiLimiter);

// ── Health check (no auth, no rate limit) ─────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'CCIMS Backend' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/employees',     userRoutes);
app.use('/api/tasks',         taskRoutes);
app.use('/api/attendance',    attendanceRoutes);
app.use('/api/leave',         leaveRoutes);
app.use('/api/payroll',       payrollRoutes);
app.use('/api/projects',      projectRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/settings',      settingsRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/audit',         auditRoutes);
app.use('/api/notifications', notificationRoutes);

// ── Error handling (must be last) ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 CCIMS Backend running on http://localhost:${PORT}`);
    console.log(`🔌 Socket.io ready for real-time connections`);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
