# CCIMS Backend — Coded Clouds Internal Management System

Node.js + Express + MongoDB (Mongoose) REST + Socket.io real-time API for the CCIMS frontend.

## 1. Setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env — set MONGO_URI, JWT_SECRET, CLIENT_URL to match your setup
```

Make sure MongoDB is running locally, or set `MONGO_URI` to an Atlas connection string.

## 2. Seed initial data (default Admin + roles + #announcements channel)

```bash
npm run seed
```

This creates:
- Default Admin login → **username: `admin`  /  password: `Admin@123`** (change immediately after first login via the Change Password screen)
- The 9 default roles (Backend Dev, Frontend Dev, UI/UX Designer, HR, Marketing, Sales, Social Media, Project Manager, Admin)
- The `#announcements` channel

## 3. Run the server

```bash
npm run dev     # development, auto-restart via nodemon
npm start       # production
```

Server runs at `http://localhost:5000` by default. Health check: `GET /api/health`.

## 4. Connecting the Frontend

In your **frontend** project (the `Coded-clouds-ims-main` folder), create a `.env` with:

```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Then build an API client (see `frontend-api-client/api.ts` provided alongside this backend) that:
1. Sends `POST /api/auth/login` with `{ username, password }`, stores the returned `token` + `user`.
2. Attaches `Authorization: Bearer <token>` to every subsequent request.
3. Connects Socket.io with `io(VITE_SOCKET_URL, { auth: { token } })` for real-time task/chat/attendance/leave updates.
4. Replace all `mockData.ts` reads/writes in your pages/store with calls to this API.

Uploaded files (documents, avatars, chat attachments, logo, project assets) are served statically from
`http://localhost:5000/uploads/...` — the `url` field saved on each document/message/etc. in MongoDB is a relative
path like `/uploads/documents/cv-16899999.pdf`; prefix it with your API host on the frontend to render/download it.

## 5. Folder Structure

```
backend/
  src/
    config/db.js          → MongoDB connection
    models/                → Mongoose schemas (User, Task, TaskReport, Project, Attendance,
                              LeaveRequest, Payroll, Channel, Message, Notification, AuditLog, Settings, Role)
    middleware/
      auth.js              → JWT verification (protect)
      rbac.js               → role guards (isAdmin, isAdminOrHR, allowRoles)
      upload.js             → Multer config (documents/avatars/chat/tasks/projects/leave/logo subfolders)
      errorHandler.js
    controllers/            → business logic per module
    routes/                 → Express routers per module
    sockets/index.js        → Socket.io auth + event wiring
    utils/                  → token, notifications, audit logging, date helpers, seed script
    server.js                → app entry point
  uploads/                    → uploaded files saved here, served at /uploads/*
  .env.example
```

## 6. Role-based Access Summary

| Module | Admin | HR | Employee (own data) |
|---|---|---|---|
| Employees (Add/Edit/Delete/Documents/Salary) | ✅ | ✅ | View/edit own profile only |
| Tasks — create/assign | ✅ only | ❌ | ❌ |
| Tasks — view | ✅ all | ❌ | ✅ own only |
| Tasks — progress reports | ✅ (comment) | ❌ | ✅ own tasks |
| Attendance — check-in/out | own | own | ✅ own |
| Attendance — company view/adjust | ✅ | ✅ | ❌ |
| Leave — apply | ✅ (self) | ✅ (self) | ✅ |
| Leave — approve/reject | ✅ | ✅ | ❌ |
| Payroll | ✅ | ✅ | View own payslip only |
| Projects | ✅ only | ❌ | ❌ (project name shown only as a tag on their task) |
| Chat — create channel / add-remove members | ✅ only | ❌ | ❌ |
| Chat — send messages | ✅ | ✅ | ✅ (in their channels) |
| Chat — post in #announcements | ✅ | ✅ | ❌ (read-only) |
| Settings / Roles / Reports / Audit Trail | ✅ only | ❌ | ❌ |

## 7. Key API Endpoints (full list)

### Auth
- `POST /api/auth/login` `{ username, password }` → `{ token, user }`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password` `{ email }`
- `POST /api/auth/reset-password` `{ token, newPassword }`
- `POST /api/auth/change-password` `{ currentPassword, newPassword }`

### Employees
- `GET /api/employees` (Admin/HR, filters: search, role, department, status)
- `POST /api/employees` (Admin/HR) — Name/Username/Password/Email/Role required, rest optional
- `GET /api/employees/:id`
- `PATCH /api/employees/:id` (includes `basicSalary`)
- `DELETE /api/employees/:id`
- `PATCH /api/employees/:id/status`
- `POST /api/employees/:id/documents` (multipart, field `file`, body `type`)
- `DELETE /api/employees/:id/documents/:docId`

### Tasks
- `GET /api/tasks` (Admin only, full board)
- `GET /api/tasks/me` (own tasks only)
- `POST /api/tasks` (Admin only — assigns)
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id/status`
- `PATCH /api/tasks/:id/reassign` (Admin only)
- `DELETE /api/tasks/:id` (Admin only)
- `POST /api/tasks/:id/reports` (post progress update)
- `GET /api/tasks/:id/reports`

### Attendance
- `POST /api/attendance/checkin`
- `POST /api/attendance/checkout`
- `GET /api/attendance/me?month=YYYY-MM`
- `GET /api/attendance?month=&status=` (Admin/HR)
- `GET /api/attendance/:employeeId?month=` (Admin/HR)
- `PATCH /api/attendance/:id/adjust` (Admin/HR, requires `reason`)

### Leave
- `POST /api/leave`
- `GET /api/leave/me`
- `GET /api/leave?status=&search=` (Admin/HR)
- `PATCH /api/leave/:id/approve` (Admin/HR)
- `PATCH /api/leave/:id/reject` (Admin/HR)

### Payroll
- `POST /api/payroll/generate?month=YYYY-MM` (Admin/HR)
- `GET /api/payroll?month=&status=` (Admin/HR)
- `PATCH /api/payroll/:id` (edit allowances/bonus/deductions)
- `PATCH /api/payroll/:id/status` (mark Paid/Processing/Pending)
- `GET /api/payroll/:id/payslip`

### Projects (Admin only, all routes)
- `GET/POST /api/projects`
- `GET/PATCH/DELETE /api/projects/:id`
- `PATCH /api/projects/:id/team`
- `PATCH /api/projects/:id/milestones/:milestoneId`
- `POST /api/projects/:id/assets` (multipart)

### Chat
- `GET /api/chat/channels`
- `POST /api/chat/channels` (Admin only)
- `POST /api/chat/dms`
- `PATCH/DELETE /api/chat/channels/:id` (Admin only)
- `POST /api/chat/channels/:id/members` (Admin only)
- `DELETE /api/chat/channels/:id/members/:userId` (Admin only)
- `GET/POST /api/chat/channels/:id/messages`
- `POST /api/chat/upload` (multipart file for chat attachments)

### Settings / Roles (Admin only for writes)
- `GET/PATCH /api/settings`
- `POST /api/settings/logo` (multipart)
- `GET /api/settings/roles/all`
- `POST/PATCH/DELETE /api/settings/roles/:id`

### Reports (Admin only)
- `GET /api/reports/workforce`
- `GET /api/reports/tasks`
- `GET /api/reports/attendance?month=`
- `GET /api/reports/leave`
- `GET /api/reports/projects`
- `GET /api/reports/payroll?month=`

### Audit (Admin only)
- `GET /api/audit?module=&actor=&from=&to=`

### Notifications
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

## 8. Socket.io Events

Connect: `io(SOCKET_URL, { auth: { token: <jwt> } })`

**Emitted by server → client:**
- `task:assigned`, `task:report:new`, `task:status:changed`
- `attendance:update`
- `leave:new`, `leave:statusChanged`
- `message:new`, `chat:channelCreated`, `chat:addedToChannel`, `chat:removedFromChannel`
- `notification:new`
- `presence:update`, `typing:start`, `typing:stop`

**Emitted by client → server:**
- `chat:join` / `chat:leave` (channelId) — join a channel's room to receive its live messages
- `chat:typing:start` / `chat:typing:stop` (channelId)

## 9. Notes / Next Steps

- Password reset currently logs the reset link to the console instead of sending an email — plug in a real SMTP/email provider (e.g. Nodemailer + SendGrid) in `authController.js → forgotPassword`.
- File uploads are stored on local disk under `/uploads`. For production, consider swapping Multer's disk storage for an S3-compatible bucket (update `middleware/upload.js` + `buildFileUrl`).
- Add rate-limiting (e.g. `express-rate-limit`) on `/api/auth/login` before production deployment.
- MFA (mentioned in the original SRS) is not yet implemented — TOTP setup would be added as an extra step in the login flow.
