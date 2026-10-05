# CCIMS — Coded Clouds Internal Management System
### Product Documentation · Version 1.0

---

**Prepared by:** Coded Clouds Development Team  
**Date:** September 2026  
**Status:** Delivered ✓

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Modules](#2-system-modules)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Module Details](#4-module-details)
   - [4.1 Authentication & Security](#41-authentication--security)
   - [4.2 Employee Management](#42-employee-management)
   - [4.3 Attendance Management](#43-attendance-management)
   - [4.4 Leave Management](#44-leave-management)
   - [4.5 Task Management](#45-task-management)
   - [4.6 Payroll Management](#46-payroll-management)
   - [4.7 Project Management](#47-project-management)
   - [4.8 Real-time Chat](#48-real-time-chat)
   - [4.9 Sales CRM — Lead Management](#49-sales-crm--lead-management)
   - [4.10 Reports & Analytics](#410-reports--analytics)
   - [4.11 Audit Log](#411-audit-log)
   - [4.12 System Settings](#412-system-settings)
5. [Technology Overview](#5-technology-overview)
6. [System Features Summary](#6-system-features-summary)
7. [Access & Login](#7-access--login)

---

## 1. Product Overview

**CCIMS (Coded Clouds Internal Management System)** is a comprehensive, web-based company management platform designed to centralise all internal operations in one place.

The system covers the complete employee lifecycle — from onboarding and daily attendance to payroll, task tracking, and sales lead management. It is accessible from any modern web browser, works in real time, and is role-controlled so every user sees only what they need to.

**Key Highlights:**
- ✅ Single platform for HR, Operations, Sales and Management
- ✅ Real-time updates — no manual page refresh needed
- ✅ Role-based access — employees see only their own data
- ✅ Excel-style Sales CRM with auto-save
- ✅ PDF payslip generation
- ✅ Full audit trail — every action is logged
- ✅ Works on desktop and mobile (responsive)
- ✅ Dark mode and light mode

---

## 2. System Modules

| # | Module | Who Can Use It |
|---|---|---|
| 1 | **Authentication & Security** | All users |
| 2 | **Employee Management** | Admin, HR |
| 3 | **Attendance Management** | All users |
| 4 | **Leave Management** | All users |
| 5 | **Task Management** | Admin, All employees |
| 6 | **Payroll Management** | Admin, HR |
| 7 | **Project Management** | Admin |
| 8 | **Real-time Chat** | All users |
| 9 | **Sales CRM — Lead Management** | Admin, Sales team |
| 10 | **Reports & Analytics** | Admin, HR |
| 11 | **Audit Log** | Admin |
| 12 | **System Settings** | Admin |

---

## 3. User Roles & Permissions

The system has a built-in role-based access control system. Each user is assigned one role, which determines exactly what they can see and do.

### Role Overview

| Role | Dashboard | Key Access |
|---|---|---|
| **Admin** | Admin Dashboard | Full access to all modules |
| **HR** | HR Dashboard | Employees, Payroll, Attendance, Leave |
| **Sales** | Sales Dashboard | Own leads, Chat, Tasks, Attendance, Leave |
| **Backend Dev** | Employee Dashboard | Tasks, Chat, Attendance, Leave |
| **Frontend Dev** | Employee Dashboard | Tasks, Chat, Attendance, Leave |
| **UI/UX Designer** | Employee Dashboard | Tasks, Chat, Attendance, Leave |
| **Marketing** | Employee Dashboard | Tasks, Chat, Attendance, Leave |
| **Social Media** | Employee Dashboard | Tasks, Chat, Attendance, Leave |
| **Project Manager** | Employee Dashboard | Tasks, Projects, Chat, Attendance, Leave |

### Permission Rules

- Every employee can only see **their own** tasks, attendance records, payslip and leave history
- Sales team members can only view and edit **their own leads** — they cannot see other salespeople's leads
- HR can manage employees and payroll but **cannot** access tasks or projects
- Admin has **full visibility** across all modules and all employees
- All sensitive actions (creating users, approving leave, editing payroll) are tracked in the Audit Log

---

## 4. Module Details

---

### 4.1 Authentication & Security

Every user logs into the system with a unique username and password. Access is protected with:

- **Secure sessions** — automatically expire after 7 days
- **Password hashing** — passwords are never stored in plain text
- **Account status control** — Admin can Activate, Suspend or Separate an account at any time
- **Forgot password** — email-based password reset flow
- **Instant logout** — logging out immediately invalidates the session
- **Brute-force protection** — rate limiting on login attempts

**Login screen** accepts `Username` and `Password`. After successful login, the user is taken directly to their role-specific dashboard.

---

### 4.2 Employee Management

A complete employee directory with full profile management.

**Features:**
- Add new employees with: Full Name, Username, Password, Email, Phone, Role, Department, Designation, Joining Date, Reporting Manager, Base Salary
- View a detailed employee profile with multiple tabs:
  - **Overview** — contact info, employment details
  - **Documents** — upload and manage CV, CNIC (front/back), Experience Letter, Offer Letter, Contract, Certificates
  - **Attendance** — full attendance history
  - **Tasks** — assigned tasks
  - **Payroll** — salary and payment history
  - **Audit Log** — all changes made to this employee
- Edit any employee detail at any time
- Change employee status: **Active → Suspended → Separated**
- Delete employee (with confirmation)
- Search by name, email or username
- Filter by Role, Department, Status
- Paginated list (20 per page)

---

### 4.3 Attendance Management

Daily attendance tracking for all employees.

**Employee side:**
- **Check-in** with one click at the start of the day
- **Check-out** at the end of the day
- System automatically marks attendance as:
  - **Present** — checked in on time
  - **Late** — checked in after the configured cutoff time (e.g. 09:15 AM)
  - **Absent** — no check-in recorded for a working day
  - **Leave** — approved leave was in place for that day
  - **Weekend** — non-working day
- View own attendance history, filtered by month
- Total hours worked calculated automatically

**Admin / HR side:**
- View all employees' attendance in one grid
- Filter by employee, date range, status
- Manually **adjust** any attendance record (missing check-in/out, change status, add notes)
- All manual adjustments are recorded in the audit log

---

### 4.4 Leave Management

A structured leave request and approval workflow.

**Leave types:** Annual · Sick · Casual · Unpaid · Other

**Employee flow:**
1. Click **Apply for Leave**
2. Select leave type, start date, end date and reason
3. System calculates number of days automatically
4. Request submitted with **Pending** status
5. Employee receives a real-time notification when reviewed

**Admin / HR flow:**
1. View all pending leave requests
2. **Approve** or **Reject** with one click
3. Employee is notified instantly

**History:** Both employees and HR can view full leave history with status badges. Employees can cancel their own pending requests before a decision is made.

---

### 4.5 Task Management

A full task assignment and tracking system.

**Admin capabilities:**
- Create a task with: Title, Description, Assigned Employee, Priority, Deadline, Project (optional), File Attachments
- View all company tasks on one board
- Filter by employee, role, priority, status
- Reassign a task to another employee at any time
- Delete tasks

**Employee capabilities:**
- View only their own assigned tasks
- Update task status as work progresses
- Add progress reports (text + file attachments)

**Task statuses:**
```
Pending  →  In Progress  →  Under Review  →  Completed
```

**Priority levels:** Low · Medium · High · Critical *(colour-coded)*

When a task is assigned, the employee receives an instant **push notification** in the app.

---

### 4.6 Payroll Management

A complete monthly payroll system with partial payment support.

**How it works:**
1. Admin/HR clicks **Generate Payroll** for a selected month
2. System creates a payroll row for every Active employee using their current base salary
3. HR adjusts each row: Allowances, Bonus, Fixed Deductions
4. Net Salary auto-calculated: `Base Salary + Allowances + Bonus − Deductions`
5. Payments recorded — full or partial/instalment basis
6. Once fully paid, row is marked **Paid**

**Features:**
- Filter by month and payment status
- Record multiple partial payments per employee per month
- Each payment stores: Amount, Payment Method, Date, Deduction amount + reason, Notes
- Summary cards: Total Monthly Salary · Total Paid · Total Deductions · Remaining Due
- **Export to CSV**
- **PDF Payslip** — professional payslip with full salary breakdown and payment history, downloadable with one click
- Base salary changes automatically update all Pending payroll rows for that employee

**Status flow:**
```
Pending  →  Processing  →  Paid
```

---

### 4.7 Project Management

A project tracking board for company initiatives.

**Features:**
- Create projects with: Name, Description, Status, Priority, Start Date, Deadline, Team members
- View all projects as cards with status badges
- Open a project to see: team, milestones, linked tasks
- Add and track **milestones** with individual due dates and completion toggles
- Assign team members from the employee directory

**Project statuses:** Planning · Active · On Hold · Completed · Cancelled  
**Priorities:** Low · Medium · High · Critical

---

### 4.8 Real-time Chat

A built-in team messaging system — no external tool needed.

**Features:**
- **Channels** — group conversations (e.g. #announcements, #development, #marketing)
- **Direct Messages** — one-on-one private conversations
- Real-time message delivery — no page refresh needed
- File and image sharing
- Channel management: create, rename, add/remove members
- New employees are automatically added to the #announcements channel on account creation
- Unread message count badge shown on the sidebar

---

### 4.9 Sales CRM — Lead Management

A purpose-built CRM module for the sales team, designed to feel exactly like working in Excel or Google Sheets.

---

#### Sales Team View

Each salesperson has their own dedicated page.

**Mini Dashboard (top of page):**

| Card | Shows |
|---|---|
| Total Leads Today | Leads entered today |
| Follow-ups Pending | Follow-up date = today or overdue |
| Updated Today | Leads edited today |
| Won | Total leads marked Won |
| Lost | Total leads marked Lost |
| Total All Time | Lifetime lead count |

Status breakdown badges are shown below the cards (e.g. New: 12 · Contacted: 5 · Won: 3).

---

**Excel-style Lead Grid — 14 Columns:**

| Column | Type | Notes |
|---|---|---|
| Lead ID | Auto-generated | LD-0001, LD-0002… |
| Date | Date | Defaults to today |
| Company Name | Text | |
| Contact Person | Text | |
| Phone | Text | |
| Email | Text | |
| City | Text | |
| Industry | Text | Saved to reusable dropdown |
| Source | Dropdown | Website, Facebook, Instagram, LinkedIn, WhatsApp, Referral, Cold Call, Walk-in, Other |
| Requirement | Text | |
| Lead Status | Dropdown | New, Contacted, Follow-up, Interested, Meeting Scheduled, Proposal Sent, Negotiation, Won, Lost, Not Interested |
| Follow-up Date | Date picker | Row turns **red** if overdue, **yellow** if today |
| Assigned To | Auto-filled | Logged-in salesperson's name |
| Remarks | Text | |

**Grid behaviour:**
- Click any cell to edit it directly (no popups, no modals)
- **Tab** → next cell · **Enter** → row below · **Arrow keys** → navigate
- Edits **auto-save every 1.2 seconds** — no Save button needed
- Drag column borders to resize width
- **Paste from Excel / Google Sheets** — copy rows and paste directly into the grid
- **+ Add Row** button to add a new empty row
- New row added automatically when the last row is filled
- **Duplicate row** — clone any row with one click
- **Delete row** — remove a lead permanently
- **Import CSV** — bulk import leads from a spreadsheet file
- **Export CSV** — download all leads as a spreadsheet

**Activity Log panel:**
- Track every change: who changed which field, from what value to what, and exactly when
- Visible per salesperson or across all leads for Admin

---

#### Admin CRM Panel

**Dashboard Cards:**
- Total leads: Today · This Week · This Month · All Time
- Follow-ups Due · Updated Today · Won · Lost

**Charts:**
- Bar chart — lead count by each status
- Pie chart — status distribution across all leads

**Leaderboard:**
- Ranked list of all salespeople by lead count
- Visual progress bar per person

**Filter Bar (updates dashboard cards live):**

| Filter | Options |
|---|---|
| Salesperson | All · individual name |
| Date Range | Today · Yesterday · This Week · This Month · Custom |
| Lead Status | All statuses or specific one |
| Source | All sources or specific one |
| Industry | All or specific industry |
| City | Free-text search |
| Search | Company, contact person, phone, email |
| Clear Filters | Resets all filters |

**Per-Salesperson Tabs:**
- Clickable tab for each salesperson at the top of the page
- Opens their individual dashboard + their lead grid
- Admin can view, edit and reassign leads from this view

**All-Leads Grid:**
- Full 14-column grid showing every lead from every salesperson
- Sortable by any column (click column header)
- Paginated — 100 rows per page for fast performance with large datasets
- Resizable columns
- Same colour-coded row highlighting (red/yellow for follow-up dates)

**Export:**
- Export the currently filtered data to CSV with one click

---

### 4.10 Reports & Analytics

A dedicated reports dashboard with charts and summaries.

| Report | What it Shows |
|---|---|
| **Workforce** | Employee count by role, department and status |
| **Tasks** | Breakdown by status (Pending / In Progress / Completed) and priority |
| **Attendance** | Monthly summary — present, late, absent percentages per employee |
| **Leave** | Leave request counts by type and approval status |
| **Projects** | Milestone completion rates and project status overview |
| **Payroll** | Monthly totals — total salary, total paid, total outstanding |

All reports use visual bar, pie and line charts for easy reading.

---

### 4.11 Audit Log

A complete, read-only activity record of every significant action taken in the system.

**What is recorded for every action:**
- Who did it (name + role)
- What they did (e.g. Updated Employee, Approved Leave, Generated Payroll)
- Which module it was in
- The exact details of the change
- Date and time (precise timestamp)

**Examples of tracked actions:**
- Employee created, edited or deleted
- Salary changed
- Payroll generated or marked paid
- Leave approved or rejected
- Task assigned or reassigned
- Lead created, updated, status changed or deleted
- Company settings changed

Admin can filter by module, actor name and date range.

---

### 4.12 System Settings

The Admin can configure the following company-wide settings:

| Setting | Description |
|---|---|
| Company Name | Displayed across the system |
| Company Logo | Uploaded and shown in the header |
| Timezone | Used for date/time display |
| Currency | Used in payroll amounts |
| Fiscal Year Start | Month the financial year begins |
| Working Days | Which days of the week are working days |
| Default Leave Balance | Leave days assigned to new employees |
| Attendance Cutoff Time | Time after which check-in is marked "Late" |
| Custom Roles | Add, rename or delete job roles |
| Admin Profile | Update own name, email and password |

---

## 5. Technology Overview

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + TypeScript | Fast, type-safe user interface |
| **Styling** | Tailwind CSS | Clean, responsive design |
| **Charts** | Recharts | Analytics visualisations |
| **Backend** | Node.js + Express | REST API server |
| **Database** | MongoDB Atlas | Cloud database — scalable and reliable |
| **Real-time** | Socket.io | Instant notifications and live updates |
| **Caching** | Redis | Fast response times under load |
| **Hosting** | Render.com | Managed cloud hosting |
| **PDF** | jsPDF | In-browser payslip generation |

**Performance:**
- Redis caching ensures fast page loads even with large employee or lead datasets
- The system handles 10,000+ sales leads with pagination and efficient queries
- Real-time Socket.io means zero polling — updates arrive instantly

**Security:**
- All passwords are hashed with bcrypt — never stored in plain text
- Sessions expire automatically after 7 days
- All API endpoints are authenticated — unauthenticated requests are rejected with an error
- File uploads are validated for type and size
- Rate limiting on all endpoints prevents brute-force attacks

---

## 6. System Features Summary

| Feature | Status |
|---|---|
| Web-based — no installation required | ✅ |
| Works on mobile, tablet and desktop | ✅ |
| Dark mode / Light mode | ✅ |
| Real-time push notifications | ✅ |
| PDF payslip download | ✅ |
| Excel / CSV import and export | ✅ |
| File and document uploads | ✅ |
| Role-based access control (9 roles) | ✅ |
| Full audit trail for all actions | ✅ |
| Paste from Excel into CRM grid | ✅ |
| Auto-save on every cell edit (CRM) | ✅ |
| Follow-up date colour alerts (red/yellow) | ✅ |
| Sales leaderboard with progress bars | ✅ |
| Password reset via email | ✅ |
| Partial / instalment salary payments | ✅ |
| Multi-milestone project tracking | ✅ |
| Group channels + direct messages | ✅ |
| Activity log per lead (CRM) | ✅ |

---

## 7. Access & Login

**Live URL:** https://coded-clouds.com

**How to log in:**
1. Open the URL in any modern web browser
2. Enter your `Username` and `Password`
3. You will be taken directly to your role-specific dashboard

> First-time Admin login credentials are provided separately by the development team.

**Supported browsers:** Google Chrome · Microsoft Edge · Mozilla Firefox · Safari (latest versions)

**Support:** For any issues or feature requests, please contact the development team at Coded Clouds.

---

*© Coded Clouds 2026. All rights reserved. This document is confidential and intended solely for the named client.*
