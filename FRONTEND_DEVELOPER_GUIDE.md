# CCIMS — Frontend Developer Guide

> **Audience:** New developer joining the project.  
> **Goal:** After reading this, you should understand how the frontend is structured, how routing, state, API calls, real-time events and UI patterns all work — and be able to add new pages and components confidently.

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Folder Structure](#3-folder-structure)
4. [How the App Boots — main.tsx → App.tsx](#4-how-the-app-boots--maintsx--apptsx)
5. [Routing System — Hash-based Navigation](#5-routing-system--hash-based-navigation)
6. [Global State — Zustand Store](#6-global-state--zustand-store)
7. [API Client — lib/api.ts](#7-api-client--libapits)
8. [Real-time Events — Socket.io Client](#8-real-time-events--socketio-client)
9. [TypeScript Types — types.ts](#9-typescript-types--typests)
10. [Data Normalization — normalizeDoc](#10-data-normalization--normalizedoc)
11. [Layout System — Shell, Sidebar, Topbar](#11-layout-system--shell-sidebar-topbar)
12. [Styling System — Tailwind CSS](#12-styling-system--tailwind-css)
13. [Pages — Role-based Routing Map](#13-pages--role-based-routing-map)
14. [Component Patterns](#14-component-patterns)
15. [Payroll Module — Deep Dive](#15-payroll-module--deep-dive)
16. [Sales CRM Module — Deep Dive](#16-sales-crm-module--deep-dive)
17. [Adding a New Page — Step-by-Step](#17-adding-a-new-page--step-by-step)
18. [Environment Variables](#18-environment-variables)
19. [Build & Dev Commands](#19-build--dev-commands)
20. [Common Pitfalls](#20-common-pitfalls)

---

## 1. Project Setup

```bash
cd Frontend

# Install dependencies
npm install

# Create environment file
# Create a file named .env in the Frontend/ folder with:
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

# Start development server
npm run dev
# Opens at http://localhost:3000

# Production build
npm run build

# TypeScript type check (no emit)
npm run lint
```

The development server is powered by a custom `server.ts` (Express + Vite middleware) — not Vite's built-in dev server. This means you can run `npm run dev` and it handles both the static SPA and any development proxying.

---

## 2. Tech Stack & Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | 19.0 | UI framework |
| `react-dom` | 19.0 | DOM rendering |
| `typescript` | 5.8 | Type safety |
| `vite` | 6.2 | Build tool and dev server bundler |
| `@tailwindcss/vite` | 4.1 | Tailwind CSS v4 Vite plugin |
| `zustand` | 5.0 | Global state management |
| `recharts` | 3.10 | Charts and graphs (bar, pie, line) |
| `lucide-react` | 0.546 | Icon library |
| `react-hook-form` | 7.84 | Form management |
| `zod` | 4.4 | Schema validation (used with react-hook-form) |
| `socket.io-client` | 4.8 | WebSocket real-time connection |
| `date-fns` | 4.4 | Date formatting and manipulation |
| `jspdf` | 2.5 | PDF payslip generation (client-side) |
| `motion` | 12.23 | Animations (used in some components) |
| `clsx` | 2.1 | Conditional class names |

**No React Router.** The project implements its own hash-based router — see Section 5.

---

## 3. Folder Structure

```
Frontend/
├── src/
│   ├── main.tsx              ← React entry point (renders <App />)
│   ├── App.tsx               ← Root component: session check, routing, role control
│   ├── store.ts              ← Zustand global state (user, theme, sidebar, notifications)
│   ├── types.ts              ← ALL TypeScript interfaces and type unions
│   ├── index.css             ← Tailwind directives + CSS custom properties (design tokens)
│   │
│   ├── lib/
│   │   ├── api.ts            ← API client: request() + all api.module.method() calls
│   │   ├── socket.ts         ← Socket.io singleton: connectSocket, getSocket, disconnectSocket
│   │   ├── normalize.ts      ← normalizeDoc(): recursively maps _id → id in API responses
│   │   ├── utils.ts          ← cn() helper (clsx + tailwind merge)
│   │   ├── formatDate.ts     ← Date formatting helpers
│   │   └── exportUtils.ts    ← CSV/Excel export helpers
│   │
│   ├── pages/                ← One file per full page view
│   │   ├── Login.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── EmployeeDashboard.tsx
│   │   ├── EmployeeDirectory.tsx
│   │   ├── AttendanceManagement.tsx
│   │   ├── LeaveManagement.tsx
│   │   ├── TaskManagement.tsx
│   │   ├── PayrollManagement.tsx
│   │   ├── ProjectManagement.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── ChatModule.tsx
│   │   ├── SalesLeadPage.tsx
│   │   ├── AdminSalesLeadPage.tsx
│   │   ├── ReportsDashboard.tsx
│   │   └── AdminSettings.tsx
│   │
│   └── components/           ← Reusable components, organized by domain
│       ├── layout/
│       │   ├── Shell.tsx     ← Root layout wrapper (Sidebar + Topbar + main)
│       │   ├── Sidebar.tsx   ← Navigation sidebar with role-aware nav items
│       │   ├── Topbar.tsx    ← Top bar: search, notifications bell, user avatar
│       │   └── NotificationBell.tsx
│       ├── employees/
│       │   ├── AddEmployeeForm.tsx        ← Create/edit employee modal
│       │   └── EmployeeProfileDetail.tsx  ← Employee profile tabs modal
│       ├── attendance/
│       ├── chat/
│       ├── leave/
│       ├── projects/
│       ├── tasks/
│       ├── ui/               ← Shared primitives (BrandLogo, etc.)
│       └── ErrorBoundary.tsx ← Catches render errors per page
│
├── server.ts                 ← Dev/prod Express server (Vite middleware in dev)
├── vite.config.ts            ← Vite config (@/src alias, React plugin)
├── tsconfig.json             ← TypeScript config
└── package.json
```

---

## 4. How the App Boots — main.tsx → App.tsx

### `main.tsx`
Renders `<App />` inside `React.StrictMode` into `#root`.

### `App.tsx` — Boot sequence

Every time the page loads (or refreshes), `App.tsx` runs this sequence:

```
1. Read JWT from localStorage ('ccims_token')
2. If no token → show <Login /> immediately

3. If token exists:
   → Call GET /api/auth/me (with the token)
   
   On SUCCESS:
   → setUser(freshUser) — store user in Zustand
   → connectSocket(token) — open WebSocket connection
   → setCheckingSession(false) → render the app
   
   On FAILURE (token expired, user deleted, etc.):
   → setUser(null)
   → disconnectSocket()
   → setCheckingSession(false) → show <Login />

4. While checking: show "Loading your session…" spinner
```

**Why re-validate on every load?**
The user object in Zustand is NOT persisted to localStorage (only `theme` and `sidebarCollapsed` are). This means the server is always the source of truth — a suspended or deleted user is automatically logged out on the next page load.

---

## 5. Routing System — Hash-based Navigation

**No React Router.** The app uses `window.location.hash` for routing.

### How it works

```typescript
// App.tsx — reading current path
function getHashPath(): string {
  const hash = window.location.hash; // e.g. "#/admin/employees"
  return hash.startsWith('#') ? hash.slice(1) || '/' : '/';
}

// App.tsx — navigate function (exported, used everywhere)
export function navigate(path: string) {
  window.location.hash = path;
}
```

When `navigate('/admin/employees')` is called:
1. `window.location.hash` changes to `#/admin/employees`
2. The `hashchange` event fires
3. `setCurrentPath(getHashPath())` updates state in `App`
4. `renderDashboard()` re-runs and returns the correct component

### Why hash routing?

- Page refreshes always send `GET /` to the server — no 404 on refresh
- No server-side routing config needed
- Works the same on every hosting platform

### Route map by role

```typescript
// Admin routes
'/admin'              → <AdminDashboard />
'/admin/employees'    → <EmployeeDirectory />
'/admin/payroll'      → <PayrollManagement />
'/admin/tasks'        → <TaskManagement />
'/admin/attendance'   → <AttendanceManagement />
'/admin/chat'         → <ChatModule />
'/admin/projects'     → <ProjectManagement />
'/admin/leave'        → <LeaveManagement />
'/admin/sales-leads'  → <AdminSalesLeadPage />
'/admin/reports'      → <ReportsDashboard />
'/admin/settings'     → <AdminSettings />

// HR routes
'/hr'                 → <EmployeeDashboard />
'/hr/employees'       → <EmployeeDirectory />
'/hr/payroll'         → <PayrollManagement />
'/hr/attendance'      → <AttendanceManagement />
'/hr/chat'            → <ChatModule />
'/hr/leave'           → <LeaveManagement />

// Sales role routes
'/sales'              → <EmployeeDashboard />
'/sales/leads'        → <SalesLeadPage />
'/sales/tasks'        → <TaskManagement />
'/sales/attendance'   → <AttendanceManagement />
'/sales/chat'         → <ChatModule />
'/sales/leave'        → <LeaveManagement />

// Employee routes (all other roles)
'/employee'           → <EmployeeDashboard />
'/employee/tasks'     → <TaskManagement />
'/employee/attendance'→ <AttendanceManagement />
'/employee/chat'      → <ChatModule />
'/employee/leave'     → <LeaveManagement />
```

### Navigating programmatically

```typescript
import { navigate } from '@/src/App';

// In any component or event handler:
navigate('/admin/employees');
navigate('/sales/leads');
```

---

## 6. Global State — Zustand Store

**File:** `src/store.ts`

```typescript
import { useAppStore } from '@/src/store';

// In any component:
const { user, setUser, logout, theme, setTheme,
        sidebarCollapsed, setSidebarCollapsed,
        mobileSidebarOpen, setMobileSidebarOpen,
        unreadNotifications, setUnreadNotifications } = useAppStore();
```

### State shape

| Field | Type | Persisted | Description |
|---|---|---|---|
| `user` | `User \| null` | ❌ No | Current user (re-validated from server on every load) |
| `theme` | `'light' \| 'dark' \| 'sky'` | ✅ Yes | UI theme |
| `sidebarCollapsed` | `boolean` | ✅ Yes | Sidebar collapse state |
| `mobileSidebarOpen` | `boolean` | ❌ No | Mobile overlay sidebar |
| `unreadNotifications` | `number` | ❌ No | Badge count for notification bell |

### Persistence

Only `theme` and `sidebarCollapsed` are stored in `localStorage` under the key `ccims-storage`. Everything else resets on page refresh.

**This is intentional:** The server always validates the user — stale UI state can never grant access.

### `logout()` function

```typescript
logout: () => {
  setToken(null);         // removes 'ccims_token' from localStorage
  disconnectSocket();     // closes Socket.io connection
  set({ user: null, unreadNotifications: 0 });
  // → App re-renders → user === null → shows <Login />
}
```

---

## 7. API Client — `lib/api.ts`

**File:** `src/lib/api.ts`

All API calls go through one central `request<T>()` function and are organized into namespaces on the `api` object.

### The `request()` function

```typescript
async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T>
```

What it does:
1. Reads JWT from `localStorage.getItem('ccims_token')` via `getToken()`
2. Adds `Authorization: Bearer <token>` header
3. Adds `Content-Type: application/json` for non-FormData bodies
4. Fetches `${VITE_API_URL}${path}`
5. On non-2xx: extracts `data.message` and throws `Error` with `err.status` attached
6. On success: calls `normalizeDoc(data)` to map `_id → id` recursively

### Token management

```typescript
import { getToken, setToken, fileUrl } from '@/src/lib/api';

getToken()                    // → string | null — reads from localStorage
setToken('eyJhbGci...')       // stores in localStorage['ccims_token']
setToken(null)                // removes from localStorage (called on logout)
fileUrl('/uploads/cv.pdf')    // → 'http://localhost:5000/uploads/cv.pdf'
```

### API namespace reference

```typescript
import { api } from '@/src/lib/api';

// Auth
api.auth.login(username, password)
api.auth.me()
api.auth.logout()
api.auth.forgotPassword(email)
api.auth.changePassword(currentPassword, newPassword)

// Employees
api.employees.list({ search: 'Ali', role: 'Sales', page: '1', limit: '20' })
api.employees.create(payload)
api.employees.get(id)
api.employees.update(id, payload)
api.employees.remove(id)
api.employees.setStatus(id, 'Suspended')
api.employees.uploadDocument(id, file, 'cv')
api.employees.deleteDocument(id, docId)

// Tasks
api.tasks.listAll({ status: 'Pending', role: 'Sales' })  // Admin only
api.tasks.listMine()
api.tasks.create(payload)
api.tasks.updateStatus(id, 'In Progress')
api.tasks.reassign(id, newUserId)
api.tasks.addReport(id, 'Progress update text', [attachmentUrl])

// Attendance
api.attendance.checkIn()
api.attendance.checkOut()
api.attendance.mine('2026-09')
api.attendance.all({ month: '2026-09', status: 'Late' })
api.attendance.adjust(id, { checkIn: '09:30:00', notes: 'Manual adjustment' })

// Leave
api.leave.apply({ leaveType: 'Sick', fromDate: '2026-09-28', toDate: '2026-09-28', reason: '...' })
api.leave.mine()
api.leave.all({ status: 'Pending' })
api.leave.approve(id)
api.leave.reject(id, 'Insufficient leave balance')

// Payroll
api.payroll.generate('2026-09')
api.payroll.list({ month: '2026-09', status: 'Pending' })
api.payroll.update(id, { allowances: 5000, bonus: 2000, deductions: 1000 })
api.payroll.setStatus(id, 'Paid')
api.payroll.payslip(id)
api.payroll.addPayment(id, { amount: 50000, method: 'Bank Transfer', note: '', paidAt: '2026-09-28' })
api.payroll.deleteOrphans()

// Projects
api.projects.list()
api.projects.create(payload)
api.projects.update(id, payload)
api.projects.setTeam(id, [userId1, userId2])
api.projects.updateMilestone(projectId, milestoneId, { completed: true })

// Chat
api.chat.channels()
api.chat.createChannel('general', 'General discussion', [userId1, userId2])
api.chat.createOrGetDM(userId)
api.chat.messages(channelId)
api.chat.sendMessage(channelId, 'Hello world', [attachmentUrl])
api.chat.uploadFile(file)

// Settings
api.settings.get()
api.settings.update({ companyName: 'Coded Clouds' })
api.settings.uploadLogo(file)

// Reports
api.reports.workforce()
api.reports.tasks()
api.reports.payroll('2026-09')

// Notifications
api.notifications.list()
api.notifications.markRead(id)
api.notifications.markAllRead()

// Sales Leads (CRM)
api.salesLeads.list({ assignedTo: userId, status: 'New', search: 'ABC Corp' })
api.salesLeads.create(payload)
api.salesLeads.update(id, { leadStatus: 'Won', remarks: 'Deal closed' })
api.salesLeads.remove(id)
api.salesLeads.duplicate(id)
api.salesLeads.bulk(rowsArray)           // Excel grid auto-save
api.salesLeads.import(rowsArray)         // CSV import
api.salesLeads.stats({ assignedTo: userId })
api.salesLeads.activity({ limit: '50' })
api.salesLeads.salespeople()
api.salesLeads.industries()
```

### Handling errors

```typescript
try {
  const data = await api.employees.list({ page: '1' });
  setEmployees(data.employees ?? []);
} catch (err: any) {
  console.error(err.message);  // server error message
  console.error(err.status);   // HTTP status code: 401, 403, 404, 500, etc.
  setError(err.message || 'Failed to load employees');
}
```

---

## 8. Real-time Events — Socket.io Client

**File:** `src/lib/socket.ts`

### Connection lifecycle

```typescript
import { connectSocket, getSocket, disconnectSocket } from '@/src/lib/socket';

// Called once after login (in App.tsx):
connectSocket(token);   // opens ws connection with JWT auth

// Get the socket instance in any component:
const socket = getSocket();  // returns null if not connected

// Called on logout (in store.ts logout()):
disconnectSocket();     // closes connection, sets socket to null
```

### Listening for events in a component

```typescript
useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  const onPayrollUpdated = (row: any) => {
    if (row.month !== month) return;
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, ...row } : r));
  };

  const onGenerated = (p: { month: string }) => {
    if (p.month === month) fetchPayroll();
  };

  socket.on('payroll:updated',   onPayrollUpdated);
  socket.on('payroll:generated', onGenerated);

  // IMPORTANT: always remove listeners on cleanup to avoid memory leaks
  return () => {
    socket.off('payroll:updated',   onPayrollUpdated);
    socket.off('payroll:generated', onGenerated);
  };
}, [month, fetchPayroll]);
```

### Events to listen for (by module)

| Event | When fired | Payload |
|---|---|---|
| `task:assigned` | New task created or reassigned | Task object |
| `payroll:generated` | Payroll generated for a month | `{ month, count }` |
| `payroll:updated` | Payroll row updated (allowances, payment, status) | Enriched payroll row |
| `payroll:salary_synced` | Employee salary updated → Pending rows re-synced | `{ userId, newBasicSalary, updatedMonths }` |
| `notification:new` | Any notification sent to the user | Notification object |
| `message:new` | New chat message in a channel | Message object |
| `presence:update` | User comes online or goes offline | `{ userId, online: boolean }` |
| `typing:start` | Someone is typing in a channel | `{ userId, channelId }` |
| `typing:stop` | Typing stopped | `{ userId, channelId }` |

### Joining a chat channel room

```typescript
const socket = getSocket();
socket?.emit('chat:join',  channelId);  // start receiving messages
socket?.emit('chat:leave', channelId);  // stop receiving messages

// Typing indicators
socket?.emit('chat:typing:start', channelId);
socket?.emit('chat:typing:stop',  channelId);
```

---

## 9. TypeScript Types — `types.ts`

**File:** `src/types.ts`

All TypeScript interfaces and type unions are defined here. Import from here — never define types inline in component files.

### Key types

```typescript
// User roles — matches backend User.role enum exactly
type UserRole = 'Backend Dev' | 'Frontend Dev' | 'UI/UX Designer' | 'HR' |
                'Marketing' | 'Sales' | 'Social Media' | 'Project Manager' | 'Admin';

// User (uses 'id' — normalized from MongoDB '_id')
interface User {
  id: string;         // normalized from _id
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  department: string;
  designation: string;
  joiningDate: string;
  status: UserStatus;
  avatarUrl?: string;
  documents?: UserDocument[];
  basicSalary?: number;
}

// SalesLead — assignedTo can be populated object OR raw ID string
interface SalesLead {
  id: string;
  leadId: string;   // 'LD-0001'
  assignedTo: { id: string; fullName: string; role: string; avatarUrl?: string } | string;
  // ...
}

// Lead stats response
interface LeadStats {
  total: { all: number; today: number; week: number; month: number };
  byStatus: Record<string, number>;
  updatedToday: number;
  followUpPending: number;
  leaderboard: { _id: string; count: number; fullName: string; avatarUrl?: string; role: string }[];
}
```

### Adding a new type

Add it to `src/types.ts`. Follow the existing conventions:
- Use `id: string` (not `_id`)
- Dates are strings (`string` type, ISO format)
- Optional fields use `?:`
- Enums are string union types, not TypeScript `enum`

---

## 10. Data Normalization — `normalizeDoc`

**File:** `src/lib/normalize.ts`

MongoDB returns documents with `_id` (a string like `"507f1f77bcf86cd799439011"`). The frontend types use `id`. Every API response is normalized by `normalizeDoc()` before it reaches your component.

```typescript
// Input (from MongoDB):
{ _id: "507f...", name: "Ali", assignedTo: { _id: "abc...", fullName: "Bob" } }

// After normalizeDoc():
{ _id: "507f...", id: "507f...", name: "Ali",
  assignedTo: { _id: "abc...", id: "abc...", fullName: "Bob" } }
```

Both `_id` and `id` are present. In your components, always use `item.id`.

**You never call `normalizeDoc()` yourself** — `request()` in `api.ts` calls it automatically on every response.

---

## 11. Layout System — Shell, Sidebar, Topbar

### `Shell.tsx`

The root layout wrapper. Wraps everything:
```
<Shell>
  <Sidebar />
  <Topbar />
  <main>{children}</main>
</Shell>
```

Pages rendered inside `<Shell>` don't need to worry about the nav layout — they just render their own content.

### `Sidebar.tsx`

Role-aware navigation. Nav items are defined as a static `navItems` object keyed by role:

```typescript
const navItems = {
  Admin:    [ { icon, label, path }, ... ],
  HR:       [ { icon, label, path }, ... ],
  Sales:    [ { icon, label, path }, ... ],
  Employee: [ { icon, label, path }, ... ],  // fallback for all other roles
};
```

**Role mapping logic:**
```typescript
const role = (['Admin', 'HR', 'Sales'].includes(user?.role))
  ? user.role
  : 'Employee';   // Backend Dev, Frontend Dev, etc. all use Employee nav
```

**Active route detection:**
```typescript
// Checks against current hash — NOT React state
window.location.hash === `#${item.path}`
```

**Mobile behavior:**
- `mobileSidebarOpen` from Zustand controls a slide-in drawer
- Dark backdrop overlay on mobile when open
- Desktop: `sidebarCollapsed` toggles between full (`w-56`) and icon-only (`w-20`) mode

**Adding a nav item:**
```typescript
// In Sidebar.tsx navItems:
Admin: [
  ...existing,
  { icon: MyIcon, label: 'My New Page', path: '/admin/my-page' },
],
```

### `Topbar.tsx`

Contains: hamburger (mobile), search box, notification bell, user avatar + name + role badge. Reads `user` from Zustand store.

---

## 12. Styling System — Tailwind CSS

The project uses **Tailwind CSS v4** via the `@tailwindcss/vite` plugin.

### CSS Custom Properties (Design Tokens)

Defined in `src/index.css`:

```css
:root {
  --background: #f8fafc;   /* Page background */
  --surface:    #ffffff;   /* Card / panel background */
  --border:     #e2e8f0;   /* Main border color */
  --border-light: #f1f5f9; /* Subtle border */
  --text:       #0f172a;   /* Primary text */
  --accent:     #2563eb;   /* Brand accent (blue) */
}

/* Dark mode overrides are toggled by adding .dark class to <html> */
```

### `cn()` utility

```typescript
import { cn } from '@/src/lib/utils';

// Merges Tailwind classes conditionally (clsx + tailwind-merge)
<div className={cn(
  'p-4 rounded-2xl border',
  isActive ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100',
  isDisabled && 'opacity-50 pointer-events-none'
)} />
```

### Import alias

`@/src/` maps to `Frontend/src/`. Use this everywhere:
```typescript
import { cn }        from '@/src/lib/utils';
import { api }       from '@/src/lib/api';
import { useAppStore } from '@/src/store';
```

---

## 13. Pages — Role-based Routing Map

Every page component is a named export from `src/pages/`. They follow this pattern:

```typescript
export function MyPage() {
  // 1. State
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAppStore();

  // 2. Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await api.something.list();
      setData(result);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 3. Socket.io listeners
  useEffect(() => {
    const socket = getSocket();
    const onUpdate = (item: any) => { /* update state */ };
    socket?.on('item:updated', onUpdate);
    return () => { socket?.off('item:updated', onUpdate); };
  }, [fetchData]);

  // 4. Render
  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {error && <ErrorBanner message={error} onClose={() => setError('')} />}
      {/* ... */}
    </div>
  );
}
```

### Pages by Role (current routing)

| URL | Page Component | Role Access |
|---|---|---|
| `/admin` | `AdminDashboard` | Admin |
| `/admin/employees` | `EmployeeDirectory` | Admin, HR |
| `/admin/payroll` | `PayrollManagement` | Admin, HR |
| `/admin/tasks` | `TaskManagement` | Admin |
| `/admin/attendance` | `AttendanceManagement` | Admin, HR |
| `/admin/chat` | `ChatModule` | Admin |
| `/admin/projects` | `ProjectManagement` | Admin |
| `/admin/leave` | `LeaveManagement` | Admin, HR |
| `/admin/sales-leads` | `AdminSalesLeadPage` | Admin |
| `/admin/reports` | `ReportsDashboard` | Admin |
| `/admin/settings` | `AdminSettings` | Admin |
| `/sales/leads` | `SalesLeadPage` | Sales |
| `/sales/tasks` | `TaskManagement` | Sales |
| `/employee/tasks` | `TaskManagement` | All employees |

---

## 14. Component Patterns

### Loading states

```tsx
// Full page loader
if (isLoading) return (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
  </div>
);

// Inline loader on a button
<button disabled={saving}>
  {saving
    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
    : <><Save className="w-4 h-4" /> Save</>
  }
</button>
```

### Error display

```tsx
{error && (
  <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center gap-2">
    <AlertCircle className="w-4 h-4 shrink-0" />
    {error}
    <button onClick={() => setError('')} className="ml-auto">
      <X className="w-3.5 h-3.5" />
    </button>
  </div>
)}
```

### Summary cards

```tsx
// Standard card (used across multiple pages)
<div className="p-5 rounded-2xl border shadow-sm bg-blue-50 border-blue-100">
  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-blue-100 text-blue-600">
    <DollarSign className="w-5 h-5" />
  </div>
  <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Total Payroll</p>
  <p className="text-xl font-black">PKR {value.toLocaleString()}</p>
</div>
```

### Status badges

```tsx
// Colour-coded status badge
const STATUS_COLORS = {
  'Pending':   'bg-yellow-100 text-yellow-700',
  'Active':    'bg-green-100  text-green-700',
  'Rejected':  'bg-red-100    text-red-700',
};

<span className={cn('text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest',
  STATUS_COLORS[status] || 'bg-gray-100 text-gray-500'
)}>
  {status}
</span>
```

### Modal / overlay pattern

```tsx
// Always use fixed positioning with high z-index + backdrop
<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
  <div className="bg-[var(--surface)] w-full max-w-lg rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden animate-in zoom-in-95 duration-300">
    {/* Modal content */}
  </div>
</div>
```

### Form with react-hook-form + zod

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  email:    z.string().email('Invalid email'),
});
type FormData = z.infer<typeof schema>;

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await api.employees.create(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('fullName')} />
      {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName.message}</p>}
    </form>
  );
}
```

### Recharts (charts)

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
  { name: 'Won', value: 12, color: '#22c55e' },
  { name: 'Lost', value: 3, color: '#ef4444' },
];

<ResponsiveContainer width="100%" height={220}>
  <BarChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 30 }}>
    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
      {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
    </Bar>
  </BarChart>
</ResponsiveContainer>
```

---

## 15. Payroll Module — Deep Dive

**File:** `src/pages/PayrollManagement.tsx`

### Component architecture

```
PayrollManagement (main)
  └── EmployeePayrollDetail  ← detail panel, opened by clicking a row
        └── AddPaymentModal  ← modal for recording a salary payment
```

### Local types

`PayrollRow` is an extension of the base `Payroll` type, enriched with payment data from the backend:

```typescript
interface PayrollRow {
  id: string;
  userId: { id, fullName, role, department, designation, email, avatarUrl };
  month: string;
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  netSalary: number;       // = basicSalary + allowances + bonus - deductions
  status: PayrollStatus;   // stored status in DB
  payments?: SalaryPayment[];
  totalPaid?: number;
  totalDeductions?: number;
  remainingBalance?: number;
  computedStatus?: string; // derived: 'Paid' | 'Processing' | 'Pending'
}
```

### Data flow

1. Select a month → `fetchPayroll()` → `api.payroll.list({ month })`
2. Backend returns `{ month, rows: PayrollRow[], summary }` — already enriched
3. `setRows(rawRows.map(...))` maps defaults for optional enriched fields

### Socket.io listeners

```typescript
socket?.on('payroll:updated',       onUpdated);    // single row updated
socket?.on('payroll:generated',     onGenerated);  // month generated → refetch
socket?.on('payroll:salary_synced', onSalarySynced); // salary changed → refetch
```

### PDF payslip generation

`generatePayslipPDF(row, companyName)` is a function at the top of the file. It uses `jsPDF` to build a full A4 payslip entirely in the browser — no server call needed.

---

## 16. Sales CRM Module — Deep Dive

### Two components

- **`SalesLeadPage`** — Excel-style grid. Used by Sales users for their own leads. Also used by Admin when clicking a salesperson tab in `AdminSalesLeadPage`.
- **`AdminSalesLeadPage`** — Admin analytics panel with charts, leaderboard, filter bar, and a salesperson-tabs navigation that renders `<SalesLeadPage viewUserId={...} viewUserName={...} />`.

### SalesLeadPage — Key patterns

#### COLUMNS definition

```typescript
const COLUMNS = [
  { key: 'leadId',       label: 'Lead ID',       width: 100, readOnly: true },
  { key: 'leadStatus',   label: 'Lead Status',    width: 150, dropdown: 'status' },
  { key: 'source',       label: 'Source',         width: 120, dropdown: 'source' },
  { key: 'followUpDate', label: 'Follow-up Date', width: 130, isDate: true },
  { key: 'remarks',      label: 'Remarks',        width: 220 },
  // ...
];
```

The `dropdown`, `readOnly`, and `isDate` flags control how each cell renders in edit mode.

#### Auto-save (stale closure fix)

```typescript
// rowsRef always points to the latest rows — avoids stale closure in setTimeout
const rowsRef   = useRef<Partial<SalesLead>[]>([]);
const dirtyRef  = useRef<Set<number>>(new Set());
rowsRef.current = rows;  // sync on every render

const markDirty = (idx: number) => {
  dirtyRef.current.add(idx);
  if (saveTimer.current) clearTimeout(saveTimer.current);
  saveTimer.current = setTimeout(() => autoSave(), 1200);
};

const autoSave = useCallback(async () => {
  const indices = Array.from(dirtyRef.current);
  if (indices.length === 0) return;
  dirtyRef.current = new Set();
  await triggerSave(indices);
}, []);
```

Key insight: `dirtyRef` (not state) tracks which rows are dirty so the `setTimeout` callback can always see the latest value without re-creating the timer.

#### Index-based ID merge after save

```typescript
// After bulkUpsert returns, map new IDs back by position:
setRows(prev => {
  const next = [...prev];
  toSave.forEach(({ idx }, i) => {
    const saved: any = result.rows?.[i];
    if (!saved) return;
    next[idx] = {
      ...next[idx],
      id:     saved.id || saved._id || next[idx].id,
      leadId: saved.leadId || next[idx].leadId,
    };
  });
  return next;
});
```

Using index position (not companyName+phone) is reliable because `bulkUpsert` returns rows in the same order they were submitted.

#### Row highlighting

```typescript
function rowBg(lead: Partial<SalesLead>): string {
  if (!lead.followUpDate) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fu    = new Date(lead.followUpDate); fu.setHours(0, 0, 0, 0);
  const done  = ['Won', 'Lost', 'Not Interested'].includes(lead.leadStatus ?? '');
  if (done) return '';
  if (fu < today)                       return 'bg-red-50 border-l-4 border-red-400';   // overdue
  if (fu.getTime() === today.getTime()) return 'bg-yellow-50 border-l-4 border-yellow-400'; // today
  return '';
}
```

---

## 17. Adding a New Page — Step-by-Step

### Example: Add a "Feedback" page for the Sales role

#### Step 1: Create the page component

```typescript
// src/pages/FeedbackPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, X } from 'lucide-react';
import { api } from '@/src/lib/api';
import { useAppStore } from '@/src/store';
import { cn } from '@/src/lib/utils';

export function FeedbackPage() {
  const { user } = useAppStore();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.feedback.list(); // you'll add this to api.ts
      setItems(Array.isArray(data) ? data : (data.items ?? []));
    } catch (e: any) {
      setError(e?.message || 'Failed to load feedback');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-black">Feedback</h1>
        <p className="text-sm text-[var(--text)]/50 mt-1">Feedback received and given</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="grid gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
            <p className="text-sm font-bold">{item.message}</p>
            <p className="text-xs opacity-40 mt-1">{item.fromUser?.fullName}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Step 2: Add the API method

```typescript
// src/lib/api.ts — add to the api object:
feedback: {
  list: () => request('/feedback'),
  create: (payload: any) => request('/feedback', { method: 'POST', body: payload }),
},
```

#### Step 3: Add TypeScript types

```typescript
// src/types.ts
export interface FeedbackItem {
  id: string;
  fromUser: { id: string; fullName: string; role: string };
  toUser:   { id: string; fullName: string; role: string };
  message: string;
  rating?: number;
  createdAt: string;
}
```

#### Step 4: Add the route in App.tsx

```typescript
// src/App.tsx — import the component
import { FeedbackPage } from './pages/FeedbackPage';

// In the Sales role block:
if (user.role === 'Sales') {
  if (p === '/sales/feedback') return <FeedbackPage />;
  // ...existing routes
}
```

#### Step 5: Add the nav item in Sidebar.tsx

```typescript
// src/components/layout/Sidebar.tsx
import { MessageCircle } from 'lucide-react'; // add to imports

// In navItems.Sales:
Sales: [
  { icon: LayoutDashboard, label: 'Dashboard',  path: '/sales' },
  { icon: TrendingUp,      label: 'My Leads',   path: '/sales/leads' },
  { icon: MessageCircle,   label: 'Feedback',   path: '/sales/feedback' }, // ← ADD
  // ...
],
```

---

## 18. Environment Variables

Create `Frontend/.env` (git-ignored):

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

For production:
```env
VITE_API_URL=https://coded-clouds.com/api
VITE_SOCKET_URL=https://coded-clouds.com
```

**Accessing in code:**
```typescript
const url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
```

---

## 19. Build & Dev Commands

```bash
# Development server (Vite + Express)
npm run dev          # starts at http://localhost:3000

# Production build (outputs to dist/)
npm run build

# Type check only (no build output)
npm run lint         # runs: tsc --noEmit

# Preview production build locally
npm run preview
```

### Import alias

`@/src/` is configured in `vite.config.ts` and `tsconfig.json`. Use it for all imports:

```typescript
// ✅ Good — works everywhere, doesn't break on folder changes
import { api } from '@/src/lib/api';

// ❌ Fragile — relative paths break if you move the file
import { api } from '../../lib/api';
```

---

## 20. Common Pitfalls

### ❌ Not cleaning up socket listeners

```typescript
// Wrong — each render adds another listener
useEffect(() => {
  getSocket()?.on('payroll:updated', handler);
}, []);

// Correct — remove on cleanup
useEffect(() => {
  const socket = getSocket();
  socket?.on('payroll:updated', handler);
  return () => { socket?.off('payroll:updated', handler); };
}, [handler]);  // include handler in deps if it uses state
```

### ❌ Stale closures in debounced functions

If a `setTimeout` callback reads state, it captures the state value at the time the timer was created — not when it fires. Use `useRef` to always have the latest value:

```typescript
const rowsRef = useRef(rows);
rowsRef.current = rows;  // sync on every render

const timer = setTimeout(() => {
  // Use rowsRef.current, not rows
  doSomethingWith(rowsRef.current);
}, 1200);
```

### ❌ Calling `navigate()` before `App.tsx` mounts

The `navigate` function sets `window.location.hash`. It can be called from anywhere, but `App.tsx` must be mounted and listening for `hashchange` events for the routing to respond.

### ❌ Using `user.role` directly for route guards

The frontend routing in `App.tsx` handles role gating. Don't add role checks inside page components — if a user lands on the wrong URL, the routing in `App.tsx` handles it by showing the wrong page (they won't have the correct API access anyway due to backend RBAC).

### ❌ Not handling `data.rows` vs direct array

Some API endpoints return `{ rows: [...] }` (payroll, leads), others return a plain array (tasks, employees, etc.). Always handle both:

```typescript
const rawRows = Array.isArray(data) ? data : (data.rows ?? data.leads ?? data.items ?? []);
```

### ❌ Missing `key` prop on list items

```tsx
// Wrong — will cause React reconciliation bugs
{rows.map(row => <RowComponent row={row} />)}

// Correct
{rows.map(row => <RowComponent key={row.id} row={row} />)}
```

### ❌ Importing types that don't exist yet

When the backend adds a new notification type or enum value, update `src/types.ts` to match. The TypeScript compiler will flag mismatches on `npm run lint`.

---

*Frontend Developer Guide — CCIMS v1.0 — Coded Clouds 2026*
