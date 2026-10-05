# CCIMS — Coded Clouds Internal Management System

> A full-stack company management platform built with **React 19**, **Node.js/Express**, **MongoDB**, **Socket.io** and **Redis**.  
> Covers HR, Payroll, Attendance, Tasks, Projects, Leave, Chat, CRM Sales Leads, Reports and Audit.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Folder Structure](#4-folder-structure)
5. [Environment Variables](#5-environment-variables)
6. [Setup & Installation](#6-setup--installation)
7. [User Roles & Access Control](#7-user-roles--access-control)
8. [Backend — API Reference](#8-backend--api-reference)
   - [Auth](#81-auth)
   - [Employees](#82-employees)
   - [Attendance](#83-attendance)
   - [Leave](#84-leave)
   - [Tasks](#85-tasks)
   - [Payroll](#86-payroll)
   - [Projects](#87-projects)
   - [Chat](#88-chat)
   - [Sales Leads (CRM)](#89-sales-leads-crm)
   - [Reports](#810-reports)
   - [Notifications](#811-notifications)
   - [Audit Log](#812-audit-log)
   - [Settings](#813-settings)
9. [Database Schema](#9-database-schema)
10. [Frontend — Pages & Components](#10-frontend--pages--components)
11. [Real-time (Socket.io)](#11-real-time-socketio)
12. [Caching (Redis)](#12-caching-redis)
13. [File Uploads](#13-file-uploads)
14. [Deployment (Render.com)](#14-deployment-rendercom)
15. [Scripts & Utilities](#15-scripts--utilities)

---

## 1. Project Overview

CCIMS is an internal management system for **Coded Clouds** company. It provides:

| Module | Description |
|---|---|
| **HR / Employee Directory** | Create, manage, suspend employees; upload documents |
| **Attendance** | Daily check-in/out, late marking, admin adjustments |
| **Leave Management** | Apply, approve/reject leave with balance tracking |
| **Task Management** | Assign tasks, track progress, attach reports |
| **Payroll** | Monthly payroll generation, salary payments, payslip PDF |
| **Projects** | Project board with milestones and team assignment |
| **Chat** | Real-time channels and direct messages with file sharing |
| **Sales CRM** | Excel-style lead grid, mini dashboard, admin analytics |
| **Reports** | Aggregated analytics across all modules |
| **Audit Log** | Who changed what and when across the entire system |
| **Settings** | Company settings, branding, custom roles |

---

## 2. Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | ≥ 18 | Runtime |
| Express | 4.21 | HTTP framework |
| Mongoose | 8.9 | MongoDB ODM |
| Socket.io | 4.8 | Real-time events |
| ioredis | 5.3 | Redis client (caching, rate-limiting) |
| jsonwebtoken | 9.0 | JWT authentication |
| bcryptjs | 2.4 | Password hashing |
| multer | 2.0 | File uploads |
| express-rate-limit | 7.4 | API rate limiting |
| morgan | 1.10 | HTTP request logging |
| dotenv | 16.4 | Environment variables |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.0 | UI framework |
| TypeScript | 5.8 | Type safety |
| Vite | 6.2 | Build tool |
| Tailwind CSS | 4.1 | Styling |
| Zustand | 5.0 | Global state management |
| Recharts | 3.10 | Charts and graphs |
| lucide-react | 0.546 | Icons |
| react-hook-form | 7.84 | Form handling |
| Zod | 4.4 | Schema validation |
| socket.io-client | 4.8 | Real-time events |
| date-fns | 4.4 | Date utilities |
| jsPDF | 2.5 | PDF payslip generation |

### Database & Infrastructure
| Service | Purpose |
|---|---|
| MongoDB Atlas | Primary database |
| Redis (Render) | Caching, rate-limit store |
| Render.com | Hosting (Backend + Frontend + Redis) |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                        │
│  React SPA — Hash-based routing (#/admin/employees)         │
│  Zustand state · Vite build · Tailwind CSS                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS + WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                  BACKEND (Express)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Routes  │  │  Auth    │  │  RBAC    │  │  Cache    │  │
│  │ /api/... │  │  JWT     │  │  Roles   │  │  Redis    │  │
│  └────┬─────┘  └──────────┘  └──────────┘  └───────────┘  │
│       │                                                      │
│  ┌────▼──────────────────────────────────────┐              │
│  │           Controllers (15 total)          │              │
│  └────┬──────────────────────────────────────┘              │
│       │                                                      │
│  ┌────▼──────────┐    ┌─────────────────────┐              │
│  │  Mongoose     │    │    Socket.io         │              │
│  │  Models (16)  │    │    Real-time events  │              │
│  └────┬──────────┘    └─────────────────────┘              │
└───────┼─────────────────────────────────────────────────────┘
        │
┌───────▼─────────────────┐    ┌──────────────────────┐
│   MongoDB Atlas          │    │   Redis               │
│   (16 collections)       │    │   Cache + Rate Limit  │
└─────────────────────────┘    └──────────────────────┘
```

**Request flow:**
1. Frontend calls `fetch(API_URL + path)` with `Authorization: Bearer <token>`
2. `protect` middleware validates JWT → sets `req.user`
3. RBAC middleware checks role
4. Controller handles logic → queries MongoDB
5. Response normalized (`_id → id`) by frontend `normalizeDoc()`
6. Socket.io emits real-time events to affected users

---

## 4. Folder Structure

```
CCIMS-Backend-and-Frontend-FIXED/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js              # MongoDB connection
│   │   │   └── redis.js           # Redis client + helpers
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   ├── attendanceController.js
│   │   │   ├── leaveController.js
│   │   │   ├── taskController.js
│   │   │   ├── payrollController.js
│   │   │   ├── salaryPaymentController.js
│   │   │   ├── projectController.js
│   │   │   ├── chatController.js
│   │   │   ├── salesLeadController.js
│   │   │   ├── reportController.js
│   │   │   ├── notificationController.js
│   │   │   ├── auditController.js
│   │   │   ├── settingsController.js
│   │   │   └── roleController.js
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT protect middleware
│   │   │   ├── rbac.js            # Role-based access control
│   │   │   ├── cache.js           # Redis cache + invalidate helpers
│   │   │   ├── errorHandler.js    # Global error handler
│   │   │   ├── rateLimiter.js     # express-rate-limit config
│   │   │   └── upload.js          # Multer file upload config
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Attendance.js
│   │   │   ├── LeaveRequest.js
│   │   │   ├── Task.js
│   │   │   ├── TaskReport.js
│   │   │   ├── Payroll.js
│   │   │   ├── SalaryPayment.js
│   │   │   ├── Project.js
│   │   │   ├── Channel.js
│   │   │   ├── Message.js
│   │   │   ├── SalesLead.js
│   │   │   ├── LeadActivity.js
│   │   │   ├── Notification.js
│   │   │   ├── AuditLog.js
│   │   │   ├── Settings.js
│   │   │   └── Role.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   ├── attendanceRoutes.js
│   │   │   ├── leaveRoutes.js
│   │   │   ├── taskRoutes.js
│   │   │   ├── payrollRoutes.js
│   │   │   ├── projectRoutes.js
│   │   │   ├── chatRoutes.js
│   │   │   ├── salesLeadRoutes.js
│   │   │   ├── reportRoutes.js
│   │   │   ├── notificationRoutes.js
│   │   │   ├── auditRoutes.js
│   │   │   ├── settingsRoutes.js
│   │   │   └── userRoutes.js
│   │   ├── sockets/
│   │   │   └── index.js           # Socket.io auth + room management
│   │   ├── utils/
│   │   │   ├── audit.js           # logAudit() helper
│   │   │   ├── notify.js          # notifyUser() helper
│   │   │   └── dateHelpers.js     # toDateOnly, currentMonthStr, etc.
│   │   └── server.js              # Express app entry point
│   ├── .env                       # Local environment variables (git-ignored)
│   ├── .env.example               # Template for environment variables
│   └── package.json
│
├── Frontend/
│   ├── src/
│   │   ├── App.tsx                # Root component + hash router
│   │   ├── main.tsx               # React entry point
│   │   ├── store.ts               # Zustand global state
│   │   ├── types.ts               # TypeScript interfaces
│   │   ├── index.css              # Tailwind + CSS variables
│   │   ├── lib/
│   │   │   ├── api.ts             # API client (all fetch calls)
│   │   │   ├── socket.ts          # Socket.io client
│   │   │   ├── normalize.ts       # _id → id normalization
│   │   │   ├── utils.ts           # cn() helper
│   │   │   ├── formatDate.ts      # Date formatting
│   │   │   └── exportUtils.ts     # CSV export helpers
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── EmployeeDashboard.tsx
│   │   │   ├── EmployeeDirectory.tsx
│   │   │   ├── AttendanceManagement.tsx
│   │   │   ├── LeaveManagement.tsx
│   │   │   ├── TaskManagement.tsx
│   │   │   ├── PayrollManagement.tsx
│   │   │   ├── ProjectManagement.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   ├── ChatModule.tsx
│   │   │   ├── SalesLeadPage.tsx
│   │   │   ├── AdminSalesLeadPage.tsx
│   │   │   ├── ReportsDashboard.tsx
│   │   │   └── AdminSettings.tsx
│   │   └── components/
│   │       ├── layout/
│   │       │   ├── Shell.tsx      # Root layout wrapper
│   │       │   ├── Sidebar.tsx    # Navigation sidebar
│   │       │   ├── Topbar.tsx     # Top navigation bar
│   │       │   └── NotificationBell.tsx
│   │       ├── employees/
│   │       │   ├── AddEmployeeForm.tsx
│   │       │   └── EmployeeProfileDetail.tsx
│   │       ├── attendance/
│   │       ├── chat/
│   │       ├── leave/
│   │       ├── projects/
│   │       ├── tasks/
│   │       └── ui/                # Shared UI primitives
│   ├── server.ts                  # Express dev/prod server (Vite middleware)
│   └── package.json
│
├── render.yaml                    # Render.com deployment config
└── README.md                      # This file
```

---

## 5. Environment Variables

All variables go in `backend/.env` (copy from `backend/.env.example`).

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Backend server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `MONGO_URI` | **Yes** | — | MongoDB Atlas connection string |
| `JWT_SECRET` | **Yes** | — | Long random string for JWT signing |
| `JWT_EXPIRES_IN` | No | `7d` | JWT token expiry |
| `REDIS_URL` | No | — | Redis connection URL. Leave blank to disable caching |
| `CLIENT_URL` | No | `http://localhost:3000` | Frontend URL (used for CORS) |
| `UPLOAD_DIR` | No | `uploads` | Directory for uploaded files |
| `MAX_FILE_SIZE_MB` | No | `10` | Max upload file size in MB |
| `LATE_CUTOFF_TIME` | No | `09:15` | Time after which check-in is marked Late |

Frontend environment (`Frontend/.env`):

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL e.g. `http://localhost:5000/api` |
| `VITE_SOCKET_URL` | Backend socket URL e.g. `http://localhost:5000` |

---

## 6. Setup & Installation

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas account (or local MongoDB)
- Redis (optional — app works without it)

### Step 1 — Clone the repository
```bash
git clone https://github.com/muhammad-engr-waqas/coded-clouds-internation-system.git
cd CCIMS-Backend-and-Frontend-FIXED
```

### Step 2 — Backend setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env — fill in MONGO_URI and JWT_SECRET
npm run dev
# Server starts at http://localhost:5000
```

### Step 3 — Frontend setup
```bash
cd Frontend
npm install
# Create Frontend/.env
echo "VITE_API_URL=http://localhost:5000/api" > .env
echo "VITE_SOCKET_URL=http://localhost:5000" >> .env
npm run dev
# Frontend starts at http://localhost:3000
```

### Step 4 — Create the first Admin user

The system has no seed data. Create the first Admin via MongoDB Atlas or run:

```bash
cd backend
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

Login with `username: admin` / `password: Admin@1234`, then change the password from Settings.

---

## 7. User Roles & Access Control

The system uses **Role-Based Access Control (RBAC)**. Every API route is protected by the `protect` middleware (JWT verification) followed by a role guard.

### Available Roles

| Role | Dashboard | Description |
|---|---|---|
| `Admin` | Admin Dashboard | Full access to everything |
| `HR` | Employee Dashboard | Employee, Payroll, Attendance, Leave management |
| `Sales` | Sales Lead Page | Own leads, Chat, Tasks, Attendance, Leave |
| `Backend Dev` | Employee Dashboard | Tasks, Chat, Attendance, Leave |
| `Frontend Dev` | Employee Dashboard | Tasks, Chat, Attendance, Leave |
| `UI/UX Designer` | Employee Dashboard | Tasks, Chat, Attendance, Leave |
| `Marketing` | Employee Dashboard | Tasks, Chat, Attendance, Leave |
| `Social Media` | Employee Dashboard | Tasks, Chat, Attendance, Leave |
| `Project Manager` | Employee Dashboard | Tasks, Projects, Chat, Attendance, Leave |

### RBAC Middleware

```js
// Defined in backend/src/middleware/rbac.js
allowRoles('Admin', 'HR')   // Only Admin and HR
isAdmin                      // Only Admin
isAdminOrHR                  // Admin or HR
allowRoles('Admin', 'Sales') // Admin or Sales
```

### Visibility Rules
- **Employees** see only their own tasks, attendance, leave, payslip
- **Sales users** see only leads assigned to them
- **HR** can manage employees, payroll, leave — cannot access tasks or projects
- **Admin** sees everything across the system

---

## 8. Backend — API Reference

**Base URL:** `http://localhost:5000/api`  
**Authentication:** All routes (except `/auth/login`) require `Authorization: Bearer <token>` header.

---

### 8.1 Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login with username + password. Returns JWT token + user object |
| GET | `/auth/me` | Any | Get current logged-in user profile |
| POST | `/auth/logout` | Any | Blacklist current token (Redis) |
| POST | `/auth/forgot-password` | Public | Send password reset email |
| POST | `/auth/reset-password` | Public | Reset password with token |
| POST | `/auth/change-password` | Any | Change own password |

**Login request:**
```json
{ "username": "admin", "password": "Admin@1234" }
```
**Login response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "...", "fullName": "Admin", "role": "Admin",
    "email": "...", "status": "Active"
  }
}
```

---

### 8.2 Employees

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/employees` | Admin, HR | List all employees (search, filter, paginate) |
| POST | `/employees` | Admin, HR | Create new employee |
| GET | `/employees/:id` | Admin, HR | Get employee by ID |
| PATCH | `/employees/:id` | Admin, HR | Update employee details (including basicSalary) |
| DELETE | `/employees/:id` | Admin, HR | Delete employee |
| PATCH | `/employees/:id/status` | Admin, HR | Activate / Suspend / Separate |
| POST | `/employees/:id/documents` | Admin, HR, Self | Upload document (CV, CNIC, etc.) |
| DELETE | `/employees/:id/documents/:docId` | Admin, HR | Delete document |

**Query params for GET `/employees`:**
- `search` — fullName, email, username
- `role`, `department`, `status`
- `page`, `limit` (default 20)

**Salary sync:** When `basicSalary` is updated via PATCH, all `Pending` Payroll rows for that employee are automatically updated.

---

### 8.3 Attendance

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/attendance/checkin` | Any | Mark today's check-in (once per day) |
| POST | `/attendance/checkout` | Any | Mark today's check-out |
| GET | `/attendance/me` | Any | Get own attendance (optional `?month=YYYY-MM`) |
| GET | `/attendance` | Admin, HR | Get all employees attendance |
| GET | `/attendance/:employeeId` | Admin, HR | Get specific employee attendance |
| PATCH | `/attendance/:id/adjust` | Admin, HR | Adjust attendance record |

**Check-in logic:**
- First check-in of the day creates a new record
- If check-in time > `LATE_CUTOFF_TIME` env var → status = `Late`, else `Present`
- Weekend check-ins are allowed but marked accordingly

---

### 8.4 Leave

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/leave` | Any | Apply for leave |
| GET | `/leave` | Admin, HR | Get all leave requests |
| GET | `/leave/me` | Any | Get own leave requests |
| PATCH | `/leave/:id/status` | Admin, HR | Approve / Reject |
| DELETE | `/leave/:id` | Any | Cancel own pending request |

**Leave types:** Annual, Sick, Casual, Unpaid, Other

---

### 8.5 Tasks

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/tasks` | Admin | All tasks (filter by assignedTo, priority, status) |
| GET | `/tasks/me` | Any | Own assigned tasks only |
| POST | `/tasks` | Admin | Create and assign task |
| GET | `/tasks/:id` | Admin, Assignee | Get task detail |
| PATCH | `/tasks/:id/status` | Admin, Assignee | Update task status |
| PATCH | `/tasks/:id/reassign` | Admin | Reassign to another employee |
| DELETE | `/tasks/:id` | Admin | Delete task |
| POST | `/tasks/:id/reports` | Assignee | Add progress report |
| GET | `/tasks/:id/reports` | Admin, Assignee | Get task reports |

**Task statuses:** `Pending` → `In Progress` → `Under Review` → `Completed`  
**Priorities:** `Low`, `Medium`, `High`, `Critical`

---

### 8.6 Payroll

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/payroll/generate` | Admin, HR | Generate payroll rows for all Active employees for a month |
| GET | `/payroll` | Admin, HR | Get all payroll rows (`?month=YYYY-MM`) |
| PATCH | `/payroll/:id` | Admin, HR | Update allowances / bonus / deductions |
| PATCH | `/payroll/:id/status` | Admin, HR | Mark Paid / Processing / Pending |
| GET | `/payroll/:id/payslip` | Admin, HR, Self | Get payslip data (for PDF) |
| POST | `/payroll/:id/payments` | Admin, HR | Record a salary payment (partial or full) |
| GET | `/payroll/:id/payments` | Admin, HR | Get payment history for a payroll row |
| GET | `/payroll/employee/:userId` | Any | Get employee's full payroll + payment history |
| DELETE | `/payroll/orphans` | Admin, HR | Delete payroll rows whose User was deleted |

**Net Salary formula (auto-calculated on save):**
```
netSalary = basicSalary + allowances + bonus - deductions
```

**Generate Payroll logic:**
- Creates one row per Active employee per month
- If row already exists with `Pending` status and salary changed → re-syncs `basicSalary`
- `Processing` / `Paid` rows are never touched by generate

---

### 8.7 Projects

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/projects` | Admin | List all projects |
| POST | `/projects` | Admin | Create project |
| GET | `/projects/:id` | Admin | Get project detail |
| PATCH | `/projects/:id` | Admin | Update project |
| DELETE | `/projects/:id` | Admin | Delete project |
| PATCH | `/projects/:id/team` | Admin | Update team members |
| PATCH | `/projects/:id/milestones/:milestoneId` | Admin | Update milestone |

---

### 8.8 Chat

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/chat/channels` | Any | Get channels user is a member of |
| POST | `/chat/channels` | Any | Create new channel |
| POST | `/chat/dms` | Any | Get or create DM with another user |
| PATCH | `/chat/channels/:id` | Channel Admin | Update channel settings |
| DELETE | `/chat/channels/:id` | Admin | Delete channel |
| POST | `/chat/channels/:id/members` | Channel Admin | Add members |
| DELETE | `/chat/channels/:id/members/:userId` | Channel Admin | Remove member |
| GET | `/chat/channels/:channelId/messages` | Member | Get message history |
| POST | `/chat/channels/:channelId/messages` | Member | Send message |
| POST | `/chat/upload` | Any | Upload file attachment |

---

### 8.9 Sales Leads (CRM)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/sales-leads` | Admin (all), Sales (own) | List leads with filters |
| POST | `/sales-leads` | Admin, Sales | Create single lead |
| PATCH | `/sales-leads/:id` | Admin (any), Sales (own) | Update lead |
| DELETE | `/sales-leads/:id` | Admin | Delete lead |
| POST | `/sales-leads/bulk` | Admin, Sales | Bulk upsert (Excel grid auto-save) |
| POST | `/sales-leads/import` | Admin, Sales | Import from CSV/Excel |
| POST | `/sales-leads/:id/duplicate` | Admin, Sales (own) | Duplicate a lead row |
| GET | `/sales-leads/stats` | Admin, Sales | Dashboard stats + leaderboard |
| GET | `/sales-leads/activity` | Admin, Sales | Activity log |
| GET | `/sales-leads/salespeople` | Admin | List all Sales role users |
| GET | `/sales-leads/industries` | Admin, Sales | Distinct industry list for dropdown |

**Lead columns (14 total):**

| Field | Type | Notes |
|---|---|---|
| `leadId` | String | Auto-generated `LD-0001` |
| `date` | Date | Defaults to today |
| `companyName` | String | |
| `contactPerson` | String | |
| `phone` | String | |
| `email` | String | |
| `city` | String | |
| `industry` | String | Free text, saved to distinct list |
| `source` | Enum | Website, Facebook, Instagram, LinkedIn, WhatsApp, Referral, Cold Call, Walk-in, Other |
| `requirement` | String | |
| `leadStatus` | Enum | New, Contacted, Follow-up, Interested, Meeting Scheduled, Proposal Sent, Negotiation, Won, Lost, Not Interested |
| `followUpDate` | Date | Rows turn yellow (today) or red (overdue) in the grid |
| `assignedTo` | ObjectId → User | Sales users auto-assigned to themselves |
| `remarks` | String | |

**Query params for GET `/sales-leads`:**
- `assignedTo` — userId or `all`
- `status`, `source`, `city`, `industry`
- `dateFrom`, `dateTo` — YYYY-MM-DD
- `search` — searches companyName, contactPerson, phone, email, leadId
- `page`, `limit` (default 500)

---

### 8.10 Reports

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/reports/workforce` | Admin, HR | Employee counts by role, department, status |
| GET | `/reports/tasks` | Admin | Task counts by status and priority |
| GET | `/reports/attendance` | Admin, HR | Attendance summary by month |
| GET | `/reports/leave` | Admin, HR | Leave request statistics |
| GET | `/reports/projects` | Admin | Project milestone completion rates |
| GET | `/reports/payroll` | Admin, HR | Monthly payroll totals |

---

### 8.11 Notifications

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/notifications` | Any | Get own unread + recent notifications |
| PATCH | `/notifications/:id/read` | Any | Mark single notification as read |
| PATCH | `/notifications/read-all` | Any | Mark all notifications as read |

**Notification types:** `TASK_ASSIGNED`, `TASK_REPORT`, `TASK_STATUS`, `LEAVE_NEW`, `LEAVE_STATUS`, `CHAT_MESSAGE`, `PAYROLL_PAID`, `EMPLOYEE_ADDED`, `LEAD_ASSIGNED`, `SYSTEM`

---

### 8.12 Audit Log

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/audit` | Admin | Get audit log (filter by module, actor, date) |

Every create / update / delete action across all modules is recorded with: `actor`, `action`, `module`, `targetId`, `details`, `createdAt`.

---

### 8.13 Settings

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/settings` | Any | Get company settings |
| PATCH | `/settings` | Admin | Update settings |
| POST | `/settings/logo` | Admin | Upload company logo |
| GET | `/settings/roles/all` | Admin, HR | List custom roles |
| POST | `/settings/roles` | Admin | Add custom role |
| PATCH | `/settings/roles/:id` | Admin | Update role name |
| DELETE | `/settings/roles/:id` | Admin | Delete custom role |

---

## 9. Database Schema

### User
```
fullName, username (unique), email (unique), password (hashed),
phone, role (enum), department, designation, joiningDate,
reportingManagerId (→User), status (Active/Suspended/Separated),
avatarUrl, documents[], basicSalary, resetPasswordToken, timestamps
```

### Attendance
```
userId (→User), date (YYYY-MM-DD), checkIn, checkOut,
totalHours, status (Present/Late/Absent/Leave/Weekend),
notes, adjustedBy (→User), adjustmentReason, timestamps
```

### LeaveRequest
```
userId (→User), type (Annual/Sick/Casual/Unpaid/Other),
startDate, endDate, days, reason,
status (Pending/Approved/Rejected), reviewedBy (→User),
reviewedAt, timestamps
```

### Task
```
title, description, assignedTo (→User), priority (Low/Medium/High/Critical),
status (Pending/In Progress/Under Review/Completed),
deadline, project (→Project), attachments[], createdBy (→User), timestamps
```

### Payroll
```
userId (→User), month (YYYY-MM), basicSalary, allowances, bonus,
deductions, netSalary (auto-calc), status (Pending/Processing/Paid),
paidAt, paidBy (→User), notes, timestamps
Unique index: { userId, month }
```

### SalaryPayment
```
payrollId (→Payroll), amount, method, note,
deductionAmount, deductionReason, remainingBalance,
status (Paid/Partial/Pending), paidAt, recordedBy (→User), timestamps
```

### SalesLead
```
leadId (auto LD-0001), date, companyName, contactPerson, phone, email,
city, industry, source (enum), requirement, leadStatus (enum),
followUpDate, assignedTo (→User), remarks,
createdBy (→User), lastEditedBy (→User), timestamps
```

### LeadActivity
```
leadId (→SalesLead), leadRefId (LD-XXXX), actor (→User), actorName,
action (CREATED/UPDATED/STATUS_CHANGED/ASSIGNED/DELETED/IMPORTED/ROW_DUPLICATED),
changes [{ field, from, to }], note, timestamps
```

### Channel (Chat)
```
name, description, type (Channel/DirectMessage),
isAnnouncements, memberIds [→User], adminIds [→User], createdBy (→User), timestamps
```

### Message
```
channelId (→Channel), senderId (→User), senderName,
text, attachments[], readBy [→User], timestamps
```

### Project
```
name, description, status (Planning/Active/On Hold/Completed/Cancelled),
priority, startDate, deadline, team [→User], createdBy (→User),
milestones [{ title, dueDate, completed }], timestamps
```

### Notification
```
userId (→User), type (enum), title, message, link, isRead, timestamps
```

### AuditLog
```
actor (→User), action, module, targetId, details (Mixed), timestamps
```

### Settings
```
companyName, logoUrl, timezone, currency, fiscalYearStart,
workingDays [], offDays [], defaultLeaveBalance, timestamps
```

---

## 10. Frontend — Pages & Components

### Routing

The frontend uses **hash-based routing** — no React Router. Navigation works via `window.location.hash`:

```ts
navigate('/admin/employees')  // sets window.location.hash = '/admin/employees'
```

### Pages by Role

**Admin** (`/admin/*`):
| Path | Component | Description |
|---|---|---|
| `/admin` | `AdminDashboard` | Overview cards + charts |
| `/admin/employees` | `EmployeeDirectory` | Employee list, add/edit/delete |
| `/admin/payroll` | `PayrollManagement` | Monthly payroll grid + payments |
| `/admin/tasks` | `TaskManagement` | Task board (Kanban + list) |
| `/admin/attendance` | `AttendanceManagement` | Attendance grid + adjustments |
| `/admin/chat` | `ChatModule` | Real-time channels + DMs |
| `/admin/projects` | `ProjectManagement` | Project cards + detail |
| `/admin/leave` | `LeaveManagement` | Leave request approvals |
| `/admin/sales-leads` | `AdminSalesLeadPage` | CRM admin panel |
| `/admin/reports` | `ReportsDashboard` | Analytics charts |
| `/admin/audit` | _(inline)_ | Audit log table |
| `/admin/settings` | `AdminSettings` | Company + profile settings |

**HR** (`/hr/*`): Employees, Leave, Payroll, Attendance, Chat

**Sales** (`/sales/*`):
| Path | Component | Description |
|---|---|---|
| `/sales` | `EmployeeDashboard` | Personal dashboard |
| `/sales/leads` | `SalesLeadPage` | Excel-style lead grid |
| `/sales/tasks` | `TaskManagement` | Own tasks |
| `/sales/attendance` | `AttendanceManagement` | Own attendance |
| `/sales/chat` | `ChatModule` | Chat |
| `/sales/leave` | `LeaveManagement` | Own leave |

**Employee** (`/employee/*`): Dashboard, Tasks, Attendance, Chat, Leave

### Global State (Zustand)

```ts
// Frontend/src/store.ts
{
  user: User | null,          // Logged-in user
  setUser(user),
  logout(),
  theme: 'light' | 'dark',   // Persisted in localStorage
  setTheme(theme),
  sidebarCollapsed: boolean,
  setSidebarCollapsed(v),
  unreadNotifications: number,
  setUnreadNotifications(n),
  mobileSidebarOpen: boolean,
  setMobileSidebarOpen(v),
}
```

`theme` and `sidebarCollapsed` are persisted. `user` is re-validated from `/api/auth/me` on every page load.

### API Client

All API calls go through `Frontend/src/lib/api.ts`:

```ts
import { api } from '@/src/lib/api';

// Examples
await api.auth.login(username, password);
await api.employees.list({ search: 'Ali', role: 'Sales' });
await api.payroll.generate('2026-09');
await api.salesLeads.bulk(rows);
await api.salesLeads.stats({ assignedTo: userId });
```

All responses are normalized: `_id` is mirrored to `id` recursively via `normalizeDoc()`.

### Key Components

| Component | Location | Description |
|---|---|---|
| `Shell` | `layout/Shell.tsx` | Root layout: Sidebar + Topbar + main content area |
| `Sidebar` | `layout/Sidebar.tsx` | Role-aware navigation. Nav items defined per role |
| `Topbar` | `layout/Topbar.tsx` | Search, notifications, profile |
| `AddEmployeeForm` | `employees/` | Create/edit employee modal with document upload |
| `EmployeeProfileDetail` | `employees/` | Employee profile tabs (Overview, Documents, Attendance, Tasks, Payroll, Audit) |
| `SalesLeadPage` | `pages/` | 14-column Excel-style grid with inline editing, auto-save, import/export |
| `AdminSalesLeadPage` | `pages/` | CRM admin panel: charts, filter bar, per-salesperson tabs |
| `PayrollManagement` | `pages/` | Monthly payroll grid, payments, PDF payslip |

---

## 11. Real-time (Socket.io)

The backend emits events via Socket.io. The frontend listens using `getSocket()` from `Frontend/src/lib/socket.ts`.

**Connection:** JWT token is passed as `auth: { token }` on connect. Each user auto-joins room `user:<userId>`.

### Events Reference

| Event | Emitter | Listeners | Payload |
|---|---|---|---|
| `task:assigned` | Server | Assignee | Task object |
| `task:status` | Server | All | `{ taskId, status }` |
| `payroll:generated` | Server | Admin/HR page | `{ month, count }` |
| `payroll:updated` | Server | Admin/HR page | Enriched payroll row |
| `payroll:salary_synced` | Server | Payroll page | `{ userId, newBasicSalary, updatedMonths }` |
| `notification:new` | Server | User's bell | Notification object |
| `chat:message` | Server | Channel members | Message object |
| `lead:created` | Server | Admin CRM page | Lead object |

---

## 12. Caching (Redis)

Redis is used for:
1. **Response caching** — GET endpoints cached for 60–300 seconds
2. **Rate limiting** — 100 req/min per IP globally; stricter on auth routes
3. **Token blacklist** — logged-out tokens stored until expiry
4. **User profile cache** — `user:<id>` cached for 60s to reduce DB reads

**If Redis is unavailable** — the app falls back gracefully. Cache middleware becomes a no-op. Only rate limiting is disabled.

Cache keys follow the pattern `module:variant:params`. Mutations call `invalidate(['pattern:*'])` to bust related keys.

---

## 13. File Uploads

Handled by **Multer** (`backend/src/middleware/upload.js`).

- Files are stored in `backend/uploads/` (configurable via `UPLOAD_DIR`)
- Served statically at `/uploads/path/to/file`
- `MAX_FILE_SIZE_MB` env var controls the limit (default 10 MB)
- `buildFileUrl(relativePath)` helper prefixes the API host for frontend display

**Upload endpoints:**
- `POST /employees/:id/documents` — employee documents (CV, CNIC, etc.)
- `POST /chat/upload` — chat file attachments
- `POST /settings/logo` — company logo

---

## 14. Deployment (Render.com)

The project deploys to Render using `render.yaml` in the root.

### Services defined in render.yaml

| Service | Type | Build command | Start command |
|---|---|---|---|
| `ccims-backend` | Web Service | `npm install` | `node src/server.js` |
| `ccims-frontend` | Static Site | `npm install && npm run build` | _(static)_ |
| Redis | Redis | — | — |

### Environment Variables (Render Dashboard)

Set these in the backend service's Environment tab:

```
MONGO_URI        = <MongoDB Atlas connection string>
JWT_SECRET       = <long random secret>
REDIS_URL        = <auto-filled by Render Redis>
CLIENT_URL       = https://your-frontend-domain.onrender.com
NODE_ENV         = production
```

### Production URLs

| Service | URL |
|---|---|
| Backend API | `https://coded-clouds.com/api` |
| Frontend | `https://coded-clouds.com` |

---

## 15. Scripts & Utilities

### Backend scripts

```bash
# Start development server (nodemon auto-reload)
npm run dev

# Start production server
npm start
```

### Utility helpers

| File | Function | Description |
|---|---|---|
| `utils/audit.js` | `logAudit({ actor, action, module, targetId, details })` | Write to AuditLog collection |
| `utils/notify.js` | `notifyUser(io, userId, { type, title, message, link })` | Create notification + emit socket event |
| `utils/dateHelpers.js` | `toDateOnly(date)` | Convert to `YYYY-MM-DD` string |
| `utils/dateHelpers.js` | `currentMonthStr()` | Returns current `YYYY-MM` |
| `utils/dateHelpers.js` | `daysBetween(from, to)` | Count days between two dates |

### Frontend scripts

```bash
# Development (Vite + Express dev server)
npm run dev

# Production build
npm run build

# Type check
npm run lint
```

---

## License

Internal use only — © Coded Clouds 2024–2026. All rights reserved.
