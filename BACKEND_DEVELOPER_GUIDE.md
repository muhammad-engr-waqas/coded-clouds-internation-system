# CCIMS — Backend Developer Guide

> **Audience:** New developer joining the project.  
> **Goal:** After reading this document, you should understand exactly how the backend works, how every layer connects, and how to add new features following the existing patterns.

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Folder Structure](#3-folder-structure)
4. [Entry Point — server.js](#4-entry-point--serverjs)
5. [Request Lifecycle — How Every API Call Works](#5-request-lifecycle--how-every-api-call-works)
6. [Configuration](#6-configuration)
   - [MongoDB — config/db.js](#61-mongodb--configdbjs)
   - [Redis — config/redis.js](#62-redis--configredisjs)
7. [Middleware Stack](#7-middleware-stack)
   - [auth.js — JWT Protection](#71-authjs--jwt-protection)
   - [rbac.js — Role-Based Access Control](#72-rbacjs--role-based-access-control)
   - [cache.js — Redis Caching](#73-cachejs--redis-caching)
   - [errorHandler.js — Global Error Handling](#74-errorhandlerjs--global-error-handling)
   - [rateLimiter.js — Rate Limiting](#75-ratelimiterjs--rate-limiting)
   - [upload.js — File Uploads](#76-uploadjs--file-uploads)
8. [Socket.io — Real-time Events](#8-socketio--real-time-events)
9. [Database Models](#9-database-models)
   - [User](#91-user)
   - [Attendance](#92-attendance)
   - [LeaveRequest](#93-leaverequest)
   - [Task & TaskReport](#94-task--taskreport)
   - [Payroll & SalaryPayment](#95-payroll--salarypayment)
   - [Project](#96-project)
   - [Channel & Message (Chat)](#97-channel--message-chat)
   - [SalesLead & LeadActivity](#98-saleslead--leadactivity)
   - [Notification & AuditLog](#99-notification--auditlog)
   - [Settings & Role](#910-settings--role)
10. [Routes — Full API Map](#10-routes--full-api-map)
11. [Controllers — Patterns & Examples](#11-controllers--patterns--examples)
12. [Utility Helpers](#12-utility-helpers)
13. [End-to-End Request Flow](#13-end-to-end-request-flow)
14. [Adding a New Module — Step-by-Step](#14-adding-a-new-module--step-by-step)
15. [Environment Variables Reference](#15-environment-variables-reference)
16. [Common Pitfalls](#16-common-pitfalls)

---

## 1. Project Setup

```bash
# Clone the repo
git clone https://github.com/muhammad-engr-waqas/coded-clouds-internation-system.git
cd CCIMS-Backend-and-Frontend-FIXED/backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env — minimum required: MONGO_URI and JWT_SECRET

# Start development server (nodemon auto-restarts on file change)
npm run dev

# Production start
npm start
```

**First-time Admin creation** (run once, then delete):
```bash
node -e "
import('dotenv/config').then(async () => {
  const { default: mongoose } = await import('mongoose');
  const { default: User } = await import('./src/models/User.js');
  await mongoose.connect(process.env.MONGO_URI);
  await User.create({
    fullName: 'Admin',
    username: 'admin',
    email: 'admin@codedclouds.com',
    password: 'Admin@1234',
    role: 'Admin',
    status: 'Active',
  });
  console.log('Admin created');
  await mongoose.disconnect();
});
"
```

---

## 2. Tech Stack & Dependencies

| Package | Version | Purpose |
|---|---|---|
| `express` | 4.21 | HTTP framework |
| `mongoose` | 8.9 | MongoDB ODM |
| `socket.io` | 4.8 | Real-time WebSocket events |
| `ioredis` | 5.3 | Redis client for caching + rate-limit store |
| `jsonwebtoken` | 9.0 | JWT creation and verification |
| `bcryptjs` | 2.4 | Password hashing (10 salt rounds) |
| `multer` | 2.0 | Multipart file upload handling |
| `express-rate-limit` | 7.4 | Request rate limiting |
| `rate-limit-redis` | 4.2 | Redis store adapter for rate limiter |
| `express-async-errors` | 3.1 | Auto-forwards async throws to error handler |
| `morgan` | 1.10 | HTTP request logging |
| `cors` | 2.8 | Cross-origin resource sharing |
| `dotenv` | 16.4 | Environment variable loading |
| `nodemon` | 3.1 | Dev-only auto-restart on file change |

**Important:** The project uses **ES Modules** (`"type": "module"` in `package.json`). Every import must use `.js` file extensions, even for local files:
```js
// ✅ Correct
import User from '../models/User.js';

// ❌ Wrong — will throw ERR_MODULE_NOT_FOUND
import User from '../models/User';
```

---

## 3. Folder Structure

```
backend/
├── src/
│   ├── server.js              ← Entry point. App starts here.
│   │
│   ├── config/
│   │   ├── db.js              ← MongoDB connection (connectDB function)
│   │   └── redis.js           ← ioredis singleton + all helper functions
│   │
│   ├── middleware/
│   │   ├── auth.js            ← JWT protect middleware (sets req.user)
│   │   ├── rbac.js            ← Role guards (allowRoles, isAdmin, isAdminOrHR)
│   │   ├── cache.js           ← Redis cache() and invalidate() factories
│   │   ├── errorHandler.js    ← Global 404 + error handler (must be last in server.js)
│   │   ├── rateLimiter.js     ← Three rate limiter tiers
│   │   └── upload.js          ← Multer config + setUploadFolder helper
│   │
│   ├── models/                ← Mongoose schemas — one file per collection
│   │   ├── User.js
│   │   ├── Attendance.js
│   │   ├── LeaveRequest.js
│   │   ├── Task.js
│   │   ├── TaskReport.js
│   │   ├── Payroll.js
│   │   ├── SalaryPayment.js
│   │   ├── Project.js
│   │   ├── Channel.js
│   │   ├── Message.js
│   │   ├── SalesLead.js
│   │   ├── LeadActivity.js
│   │   ├── Notification.js
│   │   ├── AuditLog.js
│   │   ├── Settings.js
│   │   └── Role.js
│   │
│   ├── routes/                ← Express routers — one file per domain
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── leaveRoutes.js
│   │   ├── taskRoutes.js
│   │   ├── payrollRoutes.js
│   │   ├── projectRoutes.js
│   │   ├── chatRoutes.js
│   │   ├── salesLeadRoutes.js
│   │   ├── reportRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── auditRoutes.js
│   │   ├── settingsRoutes.js
│   │   └── userRoutes.js
│   │
│   ├── controllers/           ← Business logic — one file per domain
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── attendanceController.js
│   │   ├── leaveController.js
│   │   ├── taskController.js
│   │   ├── payrollController.js
│   │   ├── salaryPaymentController.js
│   │   ├── projectController.js
│   │   ├── chatController.js
│   │   ├── salesLeadController.js
│   │   ├── reportController.js
│   │   ├── notificationController.js
│   │   ├── auditController.js
│   │   ├── settingsController.js
│   │   └── roleController.js
│   │
│   ├── sockets/
│   │   └── index.js           ← Socket.io auth + room management + event reference
│   │
│   └── utils/
│       ├── audit.js           ← logAudit() helper
│       ├── notify.js          ← notifyUser() helper
│       └── dateHelpers.js     ← toDateOnly, currentMonthStr, daysBetween
│
├── uploads/                   ← Uploaded files (git-ignored)
├── .env                       ← Local env vars (git-ignored)
├── .env.example               ← Template — copy this to .env
└── package.json
```

---

## 4. Entry Point — server.js

```
src/server.js
```

This is where everything starts. It does the following in order:

```
1.  Load env vars (dotenv/config)
2.  Import express-async-errors (must be before any route/controller imports)
3.  Create Express app + http.createServer
4.  Create Socket.io server on the same http server
5.  Call initSockets(io) — registers Socket.io auth + event handlers
6.  app.set('io', io) — makes io accessible in controllers via req.app.get('io')
7.  Register middleware (cors, json, urlencoded, morgan)
8.  Serve /uploads as static files
9.  Apply apiLimiter to all /api/* routes
10. Register /api/health (no auth, for deployment health checks)
11. Register all route files
12. Register error handlers (must be LAST)
13. Call connectDB() — starts server.listen() in the .then() callback
```

**Why the order matters:**
- `express-async-errors` must load before any controller — it patches Express so thrown errors in `async` handlers automatically call `next(err)`.
- `notFound` and `errorHandler` must be registered after all routes — they are catch-all handlers.
- `apiLimiter` is applied before routes so it runs on every `/api` request before any auth or business logic.

**Route → Module mapping:**
```js
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
app.use('/api/sales-leads',   salesLeadRoutes);
```

---

## 5. Request Lifecycle — How Every API Call Works

Every private API request goes through these layers in order:

```
Client Request
     │
     ▼
[1] apiLimiter          ← 100 req/min per IP (Redis-backed, falls back to memory)
     │
     ▼
[2] Route match         ← Express router finds the matching handler
     │
     ▼
[3] protect middleware  ← auth.js
     │   a. Extract Bearer token from Authorization header
     │   b. Check Redis blacklist (bl:<token>) — 401 if found
     │   c. jwt.verify(token, JWT_SECRET) — 401 if invalid/expired
     │   d. Redis getCache('user:<id>') — cache hit returns cached user object
     │      OR MongoDB User.findById() — cache miss populates Redis (TTL 60s)
     │   e. Check user.status === 'Active' — 403 if Suspended/Separated
     │   f. Set req.user = { _id, id, fullName, username, email, role, ... }
     │
     ▼
[4] RBAC middleware     ← rbac.js (isAdmin, isAdminOrHR, allowRoles)
     │   Check req.user.role is in the allowed roles — 403 if not
     │
     ▼
[5] cache middleware    ← cache.js (GET routes only)
     │   Check Redis for cached response — return immediately on cache hit
     │   On cache miss: intercept res.json() to store response after controller
     │
     ▼
[6] Controller          ← Business logic
     │   Reads from MongoDB, validates, writes, calls utils
     │   Calls req.app.get('io').emit() for real-time events
     │   Calls res.json(data) to respond
     │
     ▼
[7] invalidate          ← cache.js (mutation routes only)
     │   After res.json() fires, deletes stale cache keys from Redis
     │
     ▼
Response sent to client
```

**If the controller throws** (any error, any reason):
- `express-async-errors` catches it
- Passes to `errorHandler` middleware
- Maps Mongoose errors, Multer errors, etc. to proper HTTP status codes

---

## 6. Configuration

### 6.1 MongoDB — `config/db.js`

Simple wrapper around `mongoose.connect()`. Called once in `server.js`:

```js
connectDB().then(() => {
  server.listen(PORT, ...);
});
```

If connection fails → `process.exit(1)`. No pooling config needed — Mongoose defaults work well.

Default URI: `mongodb://127.0.0.1:27017/ccims` if `MONGO_URI` is not set.

### 6.2 Redis — `config/redis.js`

**Critical design principle: Redis is optional.** If `REDIS_URL` is not set, or Redis is unreachable, `redisClient` is `null` and every helper function silently returns `null`/`false`/`undefined`. The app continues running — it just loses caching, Redis-backed rate limiting, and token blacklisting.

**ioredis connection options:**
```js
{
  connectTimeout: 5000,
  maxRetriesPerRequest: null,  // don't throw on retry exhaustion
  enableReadyCheck: false,     // don't block commands waiting for READY
  lazyConnect: true,           // connect on first command, not at startup
  tls: ...,                    // auto-enabled for rediss:// URLs
}
```

**Exported helpers — use these everywhere, never use `redisClient` directly:**

```js
import { getCache, setCache, delCache, delCachePattern,
         blacklistToken, isTokenBlacklisted } from '../config/redis.js';

// Cache a value for 5 minutes
await setCache('my:key', { data: 'value' }, 300);

// Retrieve it
const cached = await getCache('my:key'); // → null if not found

// Delete one key
await delCache('my:key');

// Delete all keys matching a pattern (uses SCAN — non-blocking)
await delCachePattern('employees:*');

// Logout token management
await blacklistToken(token, ttlSeconds);
const blocked = await isTokenBlacklisted(token); // → false if Redis is down (fail-open)
```

**Cache key conventions used in this project:**
```
user:<userId>              ← User profile (TTL 60s) — set by auth middleware
employees:list:p1:s:r:d:st ← Employee list (TTL 120s)
employees:<id>             ← Single employee (TTL 300s)
payroll:month:<YYYY-MM>    ← Payroll list for a month (TTL 60s)
settings:singleton         ← Company settings (TTL 300s)
report:tasks               ← Task report (TTL 120s)
report:payroll:*           ← Payroll reports
bl:<token>                 ← Blacklisted JWT tokens
```

---

## 7. Middleware Stack

### 7.1 `auth.js` — JWT Protection

```js
import { protect } from '../middleware/auth.js';

// Usage in route file:
router.get('/my-route', protect, myController);
```

After `protect` runs successfully, `req.user` contains:
```js
{
  _id:       "507f1f77bcf86cd799439011",  // string, not ObjectId
  id:        "507f1f77bcf86cd799439011",  // same as _id
  fullName:  "Muhammad Ali",
  username:  "ali",
  email:     "ali@codedclouds.com",
  role:      "Sales",
  department: "Sales",
  designation: "Sales Executive",
  status:    "Active",
  basicSalary: 50000,
  avatarUrl: "",
}
```

⚠️ **`req.user._id` is a string** — use `req.user._id` everywhere. Do NOT call `.toString()` on it again. When comparing with a MongoDB ObjectId in a query, Mongoose auto-coerces strings, so `{ userId: req.user._id }` works fine.

### 7.2 `rbac.js` — Role-Based Access Control

```js
import { allowRoles, isAdmin, isAdminOrHR } from '../middleware/rbac.js';

// In route file — always put protect first, then RBAC:
router.get('/',    protect, isAdminOrHR, listController);
router.delete('/', protect, isAdmin,     deleteController);
router.post('/',   protect, allowRoles('Admin', 'Sales'), createController);
```

**Available roles (from User model):**
```
'Admin', 'HR', 'Sales', 'Backend Dev', 'Frontend Dev',
'UI/UX Designer', 'Marketing', 'Social Media', 'Project Manager'
```

### 7.3 `cache.js` — Redis Caching

Two factory functions. Put them directly in the route chain:

```js
import { cache, invalidate } from '../middleware/cache.js';

// Cache a GET response for 2 minutes (static key)
router.get('/settings', protect, cache('settings:singleton', 120), getSettings);

// Cache with dynamic key based on query params
router.get('/', protect, cache((req) => `employees:list:p${req.query.page || 1}`, 120), getList);

// Invalidate after mutation — put AFTER the controller
router.post('/',     protect, createEmployee, invalidate(['employees:list:*', 'report:workforce']));
router.patch('/:id', protect, updateEmployee, invalidate([(req) => `employees:${req.params.id}`, 'employees:list:*']));
```

**How `invalidate` works:** It wraps `res.json()`. After the controller calls `res.json(data)`, the invalidate middleware deletes the specified cache keys from Redis, then calls the original `res.json()`. Keys ending in `*` use SCAN (pattern-based); exact strings use DEL.

### 7.4 `errorHandler.js` — Global Error Handling

**You do NOT need try/catch in controllers.** `express-async-errors` is imported in `server.js` and automatically forwards any thrown error to `errorHandler`.

```js
// ✅ Correct — let errors propagate
export const getEmployee = async (req, res) => {
  const emp = await User.findById(req.params.id); // throws on bad ObjectId → handled
  if (!emp) return res.status(404).json({ message: 'Not found' });
  res.json(emp.toSafeObject());
};

// ❌ Unnecessary
export const getEmployee = async (req, res) => {
  try {
    // ...
  } catch (err) {
    next(err); // express-async-errors does this for you
  }
};
```

**Errors automatically handled:**
- `code === 11000` (Mongoose duplicate key) → 409 `{ message: "fieldName already exists" }`
- `name === 'ValidationError'` → 400 with joined validation messages
- `MulterError` or file type rejection → 400

### 7.5 `rateLimiter.js` — Rate Limiting

Three tiers, all falling back to in-memory store if Redis is unavailable:

| Exporter | Limit | Used Where |
|---|---|---|
| `authLimiter` | 10 req / 15 min | Applied inside `authRoutes.js` to login route |
| `apiLimiter` | 100 req / 1 min | Applied globally in `server.js` to all `/api/*` |
| `strictLimiter` | 20 req / 1 min | Heavy endpoints: payroll generate, report routes |

```js
import { strictLimiter } from '../middleware/rateLimiter.js';

// Usage in route file
router.post('/generate', isAdminOrHR, strictLimiter, generatePayroll, invalidate([...]));
```

### 7.6 `upload.js` — File Uploads

```js
import { upload, setUploadFolder } from '../middleware/upload.js';

// Single file upload — must call setUploadFolder first
router.post(
  '/:id/documents',
  setUploadFolder('documents'),   // sets the subdirectory: uploads/documents/
  upload.single('file'),          // multer processes the 'file' form field
  uploadController
);
```

Uploaded files are saved to `UPLOAD_DIR/<subfolder>/` (defaults to `uploads/`). The file URL saved in the database is relative (e.g. `/uploads/documents/cv-123.pdf`) and is prefixed with the API host on the frontend using `fileUrl()` from `api.ts`.

---

## 8. Socket.io — Real-time Events

### Connection flow

The frontend connects with the JWT token:
```js
const socket = io('http://localhost:5000', { auth: { token: jwtToken } });
```

The backend (`sockets/index.js`) verifies this token with `jwt.verify()` and stores `socket.userId`. Every connected user automatically joins `user:<userId>`.

### Emitting from a controller

```js
// In any controller:
const io = req.app.get('io');

// Send to a specific user
io.to(`user:${someUserId}`).emit('task:assigned', taskObject);

// Broadcast to all connected clients
io.emit('payroll:generated', { month, count });

// Send to all members of a chat channel
io.to(`channel:${channelId}`).emit('message:new', messageObject);
```

### Chat rooms

Chat channels use room-based delivery. Clients must manually join/leave channel rooms:
- Client emits `chat:join channelId` → server verifies membership → joins `channel:<id>` room
- Client emits `chat:leave channelId` → leaves the room

The membership check is server-side — a non-member's join request is silently ignored.

### Complete event reference

| Event | Direction | Target | Trigger |
|---|---|---|---|
| `task:assigned` | Server → Client | `user:<assignedTo>` | Task created/reassigned |
| `payroll:generated` | Server → All | broadcast | Payroll generated for a month |
| `payroll:updated` | Server → All | broadcast | Payroll row updated |
| `payroll:salary_synced` | Server → All | broadcast | Employee salary changed → Pending rows re-synced |
| `notification:new` | Server → Client | `user:<id>` | Any notification created via `notifyUser()` |
| `message:new` | Server → Channel | `channel:<id>` | Chat message sent |
| `presence:update` | Server → All | broadcast | User connects/disconnects |
| `typing:start` | Server → Channel | `channel:<id>` | Forwarded from client |
| `typing:stop` | Server → Channel | `channel:<id>` | Forwarded from client |

---

## 9. Database Models

### 9.1 User

**File:** `models/User.js`  
**Collection:** `users`

```js
{
  fullName:           String (required, trimmed)
  username:           String (required, unique, lowercase)
  email:              String (required, unique, lowercase)
  phone:              String
  password:           String (select: false — never returned in queries)
  role:               enum ['Admin','HR','Sales','Backend Dev','Frontend Dev',
                            'UI/UX Designer','Marketing','Social Media','Project Manager']
  department:         String (default: '')
  designation:        String (default: '')
  joiningDate:        Date (default: now)
  reportingManagerId: ObjectId → User (self-reference)
  status:             enum ['Active','Suspended','Separated'] (default: 'Active')
  avatarUrl:          String (default: '')
  documents:          [{ type: enum, name, url, uploadedAt }]
  basicSalary:        Number (default: 0) — synced to Payroll on generate
  resetPasswordToken: String (select: false)
  resetPasswordExpires: Date (select: false)
  timestamps:         true (createdAt, updatedAt)
}
```

**Hooks & Methods:**
- `pre('save')` — hashes `password` with bcrypt (10 rounds) if `isModified('password')`
- `comparePassword(candidate)` — instance method: `bcrypt.compare()`
- `toSafeObject()` — instance method: strips `password`, `resetPasswordToken`, `resetPasswordExpires`

### 9.2 Attendance

**File:** `models/Attendance.js`  
**Collection:** `attendances`

```js
{
  userId:    ObjectId → User (required, indexed)
  date:      String 'YYYY-MM-DD' (required)
  checkIn:   String 'HH:mm:ss'
  checkOut:  String 'HH:mm:ss'
  totalHours: Number
  status:    enum ['Present','Late','Absent','Leave','Weekend']
  notes:     String
  adjustedBy: ObjectId → User
  adjustmentReason: String
  timestamps: true
}
```

Unique index on `{ userId, date }` — one record per employee per day.

### 9.3 LeaveRequest

**File:** `models/LeaveRequest.js`  
**Collection:** `leaverequests`

```js
{
  userId:    ObjectId → User
  leaveType: enum ['Annual','Sick','Casual','Unpaid','Other']
  fromDate:  Date
  toDate:    Date
  totalDays: Number (calculated)
  reason:    String
  status:    enum ['Pending','Approved','Rejected'] (default: 'Pending')
  reviewedBy: ObjectId → User
  reviewedAt: Date
  timestamps: true
}
```

### 9.4 Task & TaskReport

**File:** `models/Task.js`, `models/TaskReport.js`

```js
// Task
{
  title:       String (required)
  description: String
  assignedTo:  ObjectId → User (required, indexed)
  priority:    enum ['Low','Medium','High','Critical']
  status:      enum ['Pending','In Progress','Under Review','Completed']
  deadline:    Date
  project:     ObjectId → Project
  attachments: [String]
  createdBy:   ObjectId → User
  timestamps:  true
}

// TaskReport (progress updates submitted by assignee)
{
  taskId:  ObjectId → Task (required, indexed)
  userId:  ObjectId → User
  text:    String
  attachments: [String]
  timestamps: true
}
```

### 9.5 Payroll & SalaryPayment

**File:** `models/Payroll.js`, `models/SalaryPayment.js`

```js
// Payroll
{
  userId:      ObjectId → User (required, indexed)
  month:       String 'YYYY-MM' (required)
  basicSalary: Number (required — snapshot from User at generate time)
  allowances:  Number (default: 0)
  bonus:       Number (default: 0)
  deductions:  Number (default: 0)
  netSalary:   Number (auto-calculated by pre('save') hook)
  status:      enum ['Pending','Processing','Paid'] (default: 'Pending')
  paidAt:      Date
  paidBy:      ObjectId → User
  notes:       String
  timestamps:  true
}
```

**Key constraint:** `{ userId, month }` compound unique index — prevents duplicate monthly rows.

**Pre-save hook:**
```js
this.netSalary = basicSalary + allowances + bonus - deductions;
```

**`computedStatus`** (not stored in DB — derived dynamically in `enrichRow()`):
- `'Paid'` if `totalPaid >= netSalary - 0.01`
- `'Processing'` if `totalPaid > 0`
- `'Pending'` otherwise

```js
// SalaryPayment (supports partial / instalment payments)
{
  payrollId:       ObjectId → Payroll (required, indexed)
  amount:          Number (required)
  method:          String (e.g. 'Bank Transfer')
  note:            String
  deductionAmount: Number (default: 0)
  deductionReason: String
  remainingBalance: Number
  status:          enum ['Paid','Partial','Pending']
  paidAt:          Date
  timestamps:      true
}
```

### 9.6 Project

**File:** `models/Project.js`

```js
{
  name:        String
  description: String
  status:      enum ['Planning','Active','On Hold','Completed','Cancelled']
  priority:    enum ['Low','Medium','High','Critical']
  startDate:   Date
  deadline:    Date
  team:        [ObjectId → User]
  milestones:  [{ title, dueDate, completed: Boolean }]
  createdBy:   ObjectId → User
  timestamps:  true
}
```

### 9.7 Channel & Message (Chat)

**File:** `models/Channel.js`, `models/Message.js`

```js
// Channel
{
  name:            String (unique)
  description:     String
  type:            enum ['Channel','DirectMessage']
  isAnnouncements: Boolean (default: false)
  memberIds:       [ObjectId → User]
  adminIds:        [ObjectId → User]
  createdBy:       ObjectId → User
  timestamps:      true
}

// Message
{
  channelId:  ObjectId → Channel (indexed)
  senderId:   ObjectId → User
  senderName: String (denormalized snapshot)
  text:       String
  attachments:[String]
  readBy:     [ObjectId → User]
  timestamps: true
}
```

### 9.8 SalesLead & LeadActivity

**File:** `models/SalesLead.js`, `models/LeadActivity.js`

```js
// SalesLead
{
  leadId:        String (auto-generated: 'LD-0001', unique, indexed)
  date:          Date (default: now)
  companyName:   String (trimmed)
  contactPerson: String (trimmed)
  phone:         String
  email:         String (lowercase)
  city:          String
  industry:      String
  source:        enum ['Website','Facebook','Instagram','LinkedIn','WhatsApp',
                       'Referral','Cold Call','Walk-in','Other','']
  requirement:   String
  leadStatus:    enum ['New','Contacted','Follow-up','Interested','Meeting Scheduled',
                       'Proposal Sent','Negotiation','Won','Lost','Not Interested','']
  followUpDate:  Date
  assignedTo:    ObjectId → User (required, indexed)
  remarks:       String
  createdBy:     ObjectId → User (required)
  lastEditedBy:  ObjectId → User
  timestamps:    true
}
```

**Lead ID auto-increment:**
Uses a separate `LeadCounter` collection with `_id: 'lead_seq'`. On pre-save (new document):
```js
const counter = await Counter.findByIdAndUpdate(
  'lead_seq',
  { $inc: { seq: 1 } },
  { upsert: true, new: true }
);
this.leadId = `LD-${String(counter.seq).padStart(4, '0')}`;
```
This is atomic — no race conditions.

```js
// LeadActivity (per-change audit trail)
{
  leadId:    ObjectId → SalesLead (indexed)
  leadRefId: String ('LD-0042' — denormalized)
  actor:     ObjectId → User
  actorName: String (denormalized)
  action:    enum ['CREATED','UPDATED','STATUS_CHANGED','ASSIGNED',
                   'DELETED','IMPORTED','ROW_DUPLICATED']
  changes:   [{ field: String, from: Mixed, to: Mixed }]
  note:      String
  timestamps: true
}
```

### 9.9 Notification & AuditLog

```js
// Notification
{
  userId:  ObjectId → User (required, indexed)
  type:    enum ['TASK_ASSIGNED','TASK_REPORT','TASK_STATUS','LEAVE_NEW','LEAVE_STATUS',
                 'CHAT_MESSAGE','PAYROLL_PAID','EMPLOYEE_ADDED','LEAD_ASSIGNED','SYSTEM']
  title:   String (required)
  message: String
  link:    String (frontend hash path, e.g. '/tasks')
  isRead:  Boolean (default: false)
  timestamps: true
}

// AuditLog
{
  actor:    ObjectId → User (required)
  action:   String (e.g. 'CREATED_TASK', 'UPDATED_EMPLOYEE')
  module:   String (e.g. 'Task', 'Employee', 'Payroll')
  targetId: ObjectId (nullable)
  details:  Mixed (any JSON)
  timestamps: true
}
```

### 9.10 Settings & Role

```js
// Settings (singleton — only one document exists)
{
  companyName:         String
  logoUrl:             String
  timezone:            String
  currency:            String
  fiscalYearStart:     Number (1-12)
  workingDays:         [String]
  defaultLeaveBalance: Number
  lateCutoffTime:      String ('HH:MM')
  timestamps: true
}

// Role (custom job roles — extends the hardcoded enum)
{
  name: String (required, unique)
  timestamps: true
}
```

---

## 10. Routes — Full API Map

### Route File Pattern

Every route file follows this structure:

```js
import express from 'express';
import { controller1, controller2 } from '../controllers/myController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin, allowRoles } from '../middleware/rbac.js';
import { cache, invalidate } from '../middleware/cache.js';

const router = express.Router();
router.use(protect);  // apply protect to ALL routes in this file

router.get('/',    isAdminOrHR, cache(keyFn, 120), listController);
router.post('/',   isAdminOrHR, createController, invalidate(['key:*']));
router.get('/:id', isAdminOrHR, cache(keyFn, 300), getController);
router.patch('/:id', isAdminOrHR, updateController, invalidate([keyFn, 'key:*']));
router.delete('/:id', isAdmin, deleteController, invalidate([keyFn, 'key:*']));

export default router;
```

### Full Endpoint Listing

#### `POST /api/auth/login` — Public
Returns `{ token, user }`. Token stored in localStorage by frontend.

#### `GET /api/auth/me` — `protect`
Returns current user. Used on every page load to re-validate the session.

#### `POST /api/auth/logout` — `protect`
Blacklists the JWT in Redis. Returns 200 regardless.

#### `GET /api/employees` — `protect`, `isAdminOrHR`
Query: `search`, `role`, `department`, `status`, `page`, `limit` (default 20).  
Cached: `employees:list:p{page}:s{search}:r{role}:d{dept}:st{status}` TTL 120s.

#### `POST /api/employees` — `protect`, `isAdminOrHR`
Creates employee. Invalidates employee list and `report:workforce`.

#### `PATCH /api/employees/:id` — `protect`, `isAdminOrHR`
Updates employee. When `basicSalary` changes, controller syncs it to all Pending Payroll rows.  
Invalidates: employee profile, list, workforce report, `payroll:month:*`.

#### `POST /api/payroll/generate` — `protect`, `isAdminOrHR`, `strictLimiter`
Creates Payroll rows for all Active employees. Re-syncs salary on existing Pending rows.

#### `GET /api/payroll` — `protect`, `isAdminOrHR`
Query: `month` (default current), `status`.  
Returns fully enriched rows with payments + `computedStatus`. Cached 60s.

#### `PATCH /api/payroll/:id` — `protect`, `isAdminOrHR`
Updates allowances, bonus, deductions. Pre-save hook recalculates netSalary.

#### `POST /api/payroll/:id/payments` — `protect`, `isAdminOrHR`
Records partial or full salary payment.

#### `GET /api/sales-leads` — `protect`, `allowRoles('Admin','Sales')`
Admin sees all. Sales sees only `assignedTo === req.user._id`. Supports rich query params.

#### `POST /api/sales-leads/bulk` — `protect`, `allowRoles('Admin','Sales')`
Upsert multiple rows. Key dedup logic: if same `companyName + phone` exists for the assignee, updates instead of creating duplicate. Used by the Excel grid auto-save.

#### `GET /api/sales-leads/stats` — `protect`, `allowRoles('Admin','Sales')`
Returns summary stats + leaderboard. Query params apply same scoping as lead list.

---

## 11. Controllers — Patterns & Examples

### Basic CRUD pattern

```js
import MyModel from '../models/MyModel.js';
import { logAudit } from '../utils/audit.js';
import { notifyUser } from '../utils/notify.js';

// List — with filters
export const getAll = async (req, res) => {
  const { search, status } = req.query;
  const query = {};
  if (status) query.status = status;
  if (search) query.name = { $regex: search, $options: 'i' };

  const items = await MyModel.find(query).sort({ createdAt: -1 });
  res.json(items);
};

// Get one — with ownership check
export const getOne = async (req, res) => {
  const item = await MyModel.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });

  const isOwner = item.createdBy.toString() === req.user._id;
  if (req.user.role !== 'Admin' && !isOwner) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json(item);
};

// Create — with audit + notification
export const createOne = async (req, res) => {
  const { title, assignedTo } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });

  const item = await MyModel.create({ title, assignedTo, createdBy: req.user._id });

  await logAudit({
    actor: req.user._id,
    action: 'CREATED_ITEM',
    module: 'MyModule',
    targetId: item._id,
    details: { title },
  });

  const io = req.app.get('io');
  io.to(`user:${assignedTo}`).emit('item:assigned', item);

  await notifyUser(io, assignedTo, {
    type: 'SYSTEM',
    title: 'New item assigned',
    message: title,
    link: `/items/${item._id}`,
  });

  res.status(201).json(item);
};

// Update
export const updateOne = async (req, res) => {
  const item = await MyModel.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });

  const { title, status } = req.body;
  if (title !== undefined) item.title  = title;
  if (status !== undefined) item.status = status;
  await item.save();

  await logAudit({ actor: req.user._id, action: 'UPDATED_ITEM', module: 'MyModule', targetId: item._id });

  res.json(item);
};

// Delete
export const deleteOne = async (req, res) => {
  const item = await MyModel.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });

  await item.deleteOne();

  await logAudit({ actor: req.user._id, action: 'DELETED_ITEM', module: 'MyModule', targetId: req.params.id });

  res.json({ message: 'Deleted', id: req.params.id });
};
```

### Important controller rules

1. **No try/catch needed** — `express-async-errors` handles all thrown errors.
2. **`req.user._id` is a string** — don't call `.toString()` again.
3. **`req.app.get('io')`** — always check if `io` exists with `?.` since tests may not set it.
4. **Emit BEFORE res.json** or use `io?.emit()` — the response is sent as soon as `res.json()` is called.
5. **Use `item.save()`** for updates (triggers pre-save hooks) unless you need `findByIdAndUpdate`.
6. **Populate before responding** if the frontend expects nested objects:
   ```js
   const populated = await item.populate('assignedTo', 'fullName role');
   res.json(populated);
   ```
7. **`logAudit` is fire-and-forget** — it never throws, safe to `await` or not.

---

## 12. Utility Helpers

### `utils/audit.js`

```js
import { logAudit } from '../utils/audit.js';

await logAudit({
  actor:    req.user._id,      // ObjectId string of the user who did the action
  action:   'UPDATED_PAYROLL', // string identifier — use ALL_CAPS snake_case
  module:   'Payroll',         // module name for filtering in admin audit view
  targetId: payroll._id,       // optional — the document that was affected
  details:  { month, changes } // optional — any extra JSON for context
});
```

Silently catches and logs errors — never throws.

### `utils/notify.js`

```js
import { notifyUser } from '../utils/notify.js';

const io = req.app.get('io');
await notifyUser(io, targetUserId, {
  type:    'TASK_ASSIGNED',        // must match Notification.type enum
  title:   'New task assigned',
  message: 'Fix the login bug',
  link:    '/tasks',               // frontend hash path
});
```

Creates a `Notification` document in DB + emits `notification:new` to `user:<targetUserId>` room.

### `utils/dateHelpers.js`

```js
import { toDateOnly, currentMonthStr, daysBetween } from '../utils/dateHelpers.js';

toDateOnly(new Date())         // → '2026-09-28'
currentMonthStr()              // → '2026-09'
daysBetween('2026-09-01', '2026-09-30', true)  // → 22 (excluding weekends)
```

---

## 13. End-to-End Request Flow

### Example: GET Employee List

```
Browser: navigate to #/admin/employees
Frontend: api.employees.list({ page: '1' })
→ fetch GET http://localhost:5000/api/employees?page=1
  Headers: { Authorization: 'Bearer <jwt>' }

Backend:
  [apiLimiter]    → 100 req/min check (pass)
  [router match]  → GET /api/employees → userRoutes.js
  [protect]       → extract token
                  → Redis: bl:<token> → not blacklisted
                  → jwt.verify → decoded.id = '507f...'
                  → Redis: getCache('user:507f...') → CACHE HIT → req.user set
                  → status check: 'Active' → pass
  [isAdminOrHR]   → req.user.role = 'Admin' → pass
  [cache]         → getCache('employees:list:p1:s:r:d:st')
                  → CACHE MISS → intercept res.json()
  [getEmployees]  → build query (no filters in this request)
                  → User.find({}).sort({ createdAt: -1 }).skip(0).limit(20)
                  → total = User.countDocuments({})
                  → res.json({ employees: [...], total, page, pages })
  [cache intercept] → setCache('employees:list:p1:s:r:d:st', response, 120)
  
Response sent:
  normalizeDoc() → _id mirrored to id on every document
  React state updated → EmployeeDirectory renders the list
```

---

## 14. Adding a New Module — Step-by-Step

Let's say you want to add a **Feedback** module.

### Step 1: Create the Model

```js
// src/models/Feedback.js
import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  fromUser:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUser:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message:   { type: String, required: true },
  rating:    { type: Number, min: 1, max: 5 },
  isRead:    { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Feedback', feedbackSchema);
```

### Step 2: Create the Controller

```js
// src/controllers/feedbackController.js
import Feedback from '../models/Feedback.js';
import { logAudit } from '../utils/audit.js';
import { notifyUser } from '../utils/notify.js';

export const createFeedback = async (req, res) => {
  const { toUser, message, rating } = req.body;
  if (!toUser || !message) return res.status(400).json({ message: 'toUser and message required' });

  const feedback = await Feedback.create({
    fromUser: req.user._id,
    toUser,
    message,
    rating,
  });

  await logAudit({ actor: req.user._id, action: 'CREATED_FEEDBACK', module: 'Feedback', targetId: feedback._id });

  const io = req.app.get('io');
  await notifyUser(io, toUser, {
    type: 'SYSTEM',
    title: 'New feedback received',
    message: message.slice(0, 80),
    link: '/feedback',
  });

  res.status(201).json(feedback);
};

export const getFeedback = async (req, res) => {
  const query = req.user.role === 'Admin'
    ? {}
    : { $or: [{ fromUser: req.user._id }, { toUser: req.user._id }] };

  const items = await Feedback.find(query)
    .populate('fromUser', 'fullName role')
    .populate('toUser',   'fullName role')
    .sort({ createdAt: -1 });
  res.json(items);
};
```

### Step 3: Create the Route File

```js
// src/routes/feedbackRoutes.js
import express from 'express';
import { createFeedback, getFeedback } from '../controllers/feedbackController.js';
import { protect } from '../middleware/auth.js';
import { invalidate } from '../middleware/cache.js';

const router = express.Router();
router.use(protect);

router.get('/',  getFeedback);
router.post('/', createFeedback, invalidate(['feedback:*']));

export default router;
```

### Step 4: Mount in server.js

```js
// src/server.js — add these two lines
import feedbackRoutes from './routes/feedbackRoutes.js';

// After the other route registrations:
app.use('/api/feedback', feedbackRoutes);
```

### Step 5: Verify syntax

```bash
node -e "import('./src/routes/feedbackRoutes.js').then(() => console.log('OK')).catch(e => console.error(e.message))"
```

---

## 15. Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGO_URI` | **Yes** | `mongodb://127.0.0.1:27017/ccims` | MongoDB connection string |
| `JWT_SECRET` | **Yes** | — | Long random string (min 32 chars) for JWT signing |
| `JWT_EXPIRES_IN` | No | `7d` | JWT token expiry |
| `REDIS_URL` | No | — | Redis connection URL. Leave blank to disable. Use `rediss://` for TLS |
| `PORT` | No | `5000` | Express listen port |
| `NODE_ENV` | No | `development` | Set to `test` to skip rate limiters |
| `CLIENT_URL` | No | `*` | CORS allowed origin (set to your frontend URL in production) |
| `UPLOAD_DIR` | No | `uploads` | Relative path for file uploads |
| `MAX_FILE_SIZE_MB` | No | `10` | Max upload file size |
| `LATE_CUTOFF_TIME` | No | `09:15` | Time (HH:MM) after which check-in = Late |

---

## 16. Common Pitfalls

### ❌ Forgetting `.js` in imports
```js
// Wrong — will crash with ERR_MODULE_NOT_FOUND
import User from '../models/User';

// Correct
import User from '../models/User.js';
```

### ❌ Static route defined after dynamic `/:id`
```js
// Wrong — '/stats' gets captured by '/:id' with id = 'stats'
router.get('/:id',  getById);
router.get('/stats', getStats);  // ← never reached

// Correct — static routes first
router.get('/stats', getStats);
router.get('/:id',  getById);
```

### ❌ Using `req.user._id.toString()`
`req.user._id` is already a string (set that way in `protect` middleware). Calling `.toString()` again is harmless but unnecessary.

### ❌ Not calling pre-save hooks
```js
// Wrong — findByIdAndUpdate skips pre('save') hooks
await Payroll.findByIdAndUpdate(id, { allowances: 500 });

// Correct — load, modify, save to trigger pre('save')
const row = await Payroll.findById(id);
row.allowances = 500;
await row.save(); // triggers netSalary recalculation
```

### ❌ Emitting socket events after res.json()
```js
// Wrong — res.json() sends and closes the response; io.emit may fail in some contexts
res.json(item);
io.emit('item:created', item);  // ← might not fire

// Correct — emit before responding
io.to(`user:${userId}`).emit('item:created', item);
res.json(item);
```

### ❌ Using `req.user.role` before `protect` runs
RBAC middleware depends on `req.user` being set. Always put `protect` before any role guard:
```js
// Wrong
router.get('/', isAdmin, myController);

// Correct
router.get('/', protect, isAdmin, myController);
```

### ❌ Forgetting to invalidate cache after mutations
After any create/update/delete, invalidate the related cache keys, or the GET endpoints will serve stale data for up to the TTL:
```js
router.patch('/:id', protect, updateEmployee,
  invalidate([(req) => `employees:${req.params.id}`, 'employees:list:*'])
);
```

---

*Backend Developer Guide — CCIMS v1.0 — Coded Clouds 2026*
