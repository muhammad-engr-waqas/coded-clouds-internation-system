# CCIMS — Backend + Frontend Integration Guide

This delivery contains **two separate folders**, exactly as requested:

```
backend/                  ← new Node.js + Express + Mongoose backend
Coded-clouds-ims-main/    ← your existing frontend, with the API client already added in
```

## 1. Start the Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env: set MONGO_URI (local MongoDB or Atlas), JWT_SECRET, CLIENT_URL=http://localhost:5173
npm run seed     # creates default Admin (username: admin / password: Admin@123) + roles + #announcements channel
npm run dev      # starts on http://localhost:5000
```

Full API reference, folder structure, and role-permission table are in `backend/README.md`.

## 2. Start the Frontend

Two new files have already been added to your frontend at `src/lib/`:
- **`src/lib/api.ts`** — a typed client with a function for every backend endpoint (`api.employees.create(...)`, `api.tasks.listMine()`, `api.attendance.checkIn()`, etc.)
- **`src/lib/socket.ts`** — Socket.io connection helper for real-time updates (task assignment, chat, attendance, leave status)

```bash
cd Coded-clouds-ims-main
cp .env.example .env
# .env already points to http://localhost:5000 by default — adjust if your backend runs elsewhere
npm install
npm run dev
```

## 3. Wiring Your Pages to the Real API

Your frontend currently reads/writes through `src/lib/mockData.ts` and the `useAppStore` (zustand). To go live:

1. **Login page (`Login.tsx`):** replace the mock-login call with:
   ```ts
   import { api, setToken } from '../lib/api';
   import { connectSocket } from '../lib/socket';

   const { token, user } = await api.auth.login(username, password);
   setToken(token);
   connectSocket(token);
   useAppStore.getState().setUser(user);
   // redirect based on user.role, same logic you already have
   ```

2. **Every page that currently imports from `mockData.ts`** — swap that import for the matching `api.*` call. For example:
   - `EmployeeDirectory.tsx` → `api.employees.list()` instead of the mock array
   - `TaskManagement.tsx` (Admin) → `api.tasks.listAll()`; `EmployeeDashboard.tsx`'s task board → `api.tasks.listMine()`
   - `AttendanceManagement.tsx` → `api.attendance.all()`; the check-in button → `api.attendance.checkIn()` / `checkOut()`
   - `LeaveManagement.tsx` → `api.leave.all()` (HR/Admin) or `api.leave.mine()` (employee)
   - `PayrollManagement.tsx` → `api.payroll.list()`
   - `ProjectManagement.tsx` / `ProjectDetail.tsx` → `api.projects.*` (Admin-only, matches your visibility rule)
   - `ChatModule.tsx` → `api.chat.channels()`, `api.chat.messages()`, `api.chat.sendMessage()`
   - `AdminSettings.tsx` → `api.settings.*`
   - `ReportsDashboard.tsx` → `api.reports.*`

3. **File uploads** (documents, avatars, chat attachments, logo, project assets): use the relevant `api.*.upload*()` function, which sends `multipart/form-data` to Multer on the backend. The response includes a `url` — display/download it by wrapping with `fileUrl(url)` from `api.ts`.

4. **Real-time events:** call `connectSocket(token)` once after login, then subscribe to events as shown in the usage example at the bottom of `socket.ts` (e.g. `socket.on('task:assigned', ...)` to live-refresh the employee's task board the instant Admin assigns something).

5. React Query is already in your `package.json` — wrapping each `api.*` call in a `useQuery`/`useMutation` hook is the recommended pattern for caching + automatic refetch, but calling `api.*` directly in a `useEffect` also works if you'd rather move incrementally.

## 4. Default Login

After running `npm run seed` on the backend:
- **Username:** `admin`
- **Password:** `Admin@123`

Change this password immediately via Settings → Profile → Change Password once you're in.

## 5. What's Already Enforced Server-Side

All the access rules from our earlier planning are enforced in the backend itself (not just hidden in the UI), so the app stays secure even if someone calls the API directly:
- Only Admin can create/assign tasks; employees only ever receive their own tasks in `GET /api/tasks/me`.
- Only Admin can access `/api/projects/*` at all.
- Only Admin can add/remove chat channel members; everyone with membership can send messages.
- Only Admin/HR can add/edit/delete employees, set Basic Salary, manage payroll, and approve/reject leave.
- Employees can only advance a task to the *next* status in the fixed order — never skip steps (Admin can override).
