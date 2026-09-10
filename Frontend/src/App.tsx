/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { StrictMode, useEffect, useState } from 'react';
import { useAppStore } from './store';
import { api, getToken } from './lib/api';
import { connectSocket, disconnectSocket } from './lib/socket';
import { Shell } from './components/layout/Shell';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { EmployeeDirectory } from './pages/EmployeeDirectory';
import { TaskManagement } from './pages/TaskManagement';
import { PayrollManagement } from './pages/PayrollManagement';
import { AttendanceManagement } from './pages/AttendanceManagement';
import { ChatModule } from './pages/ChatModule';
import { ProjectManagement } from './pages/ProjectManagement';
import { LeaveManagement } from './pages/LeaveManagement';
import AdminSettings from './pages/AdminSettings';
import ReportsDashboard from './pages/ReportsDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

// ── Hash-based routing helper ──────────────────────────────────────────────
// We use window.location.hash (#/admin/employees) instead of pathname so that
// page refresh always sends GET / to the server — no server-side SPA config needed.
function getHashPath(): string {
  const hash = window.location.hash; // e.g. "#/admin/employees"
  return hash.startsWith('#') ? hash.slice(1) || '/' : '/';
}

export function navigate(path: string) {
  window.location.hash = path;
}

export default function App() {
  const { user, setUser } = useAppStore();
  const [currentPath, setCurrentPath] = useState(getHashPath);
  const [checkingSession, setCheckingSession] = useState(true);

  // Listen for hash changes (back/forward + navigate() calls)
  useEffect(() => {
    const onHashChange = () => setCurrentPath(getHashPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Re-validate JWT on every load/refresh
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setCheckingSession(false);
      return;
    }
    api.auth
      .me()
      .then((freshUser) => {
        setUser(freshUser);
        connectSocket(token);
      })
      .catch(() => {
        setUser(null);
        disconnectSocket();
      })
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm font-bold opacity-50">
        Loading your session…
      </div>
    );
  }

  if (!user) return <Login />;

  const renderDashboard = () => {
    const p = currentPath;

    if (user.role === 'Admin') {
      if (p === '/admin/employees') return <EmployeeDirectory />;
      if (p === '/admin/tasks')     return <TaskManagement />;
      if (p === '/admin/payroll')   return <PayrollManagement />;
      if (p === '/admin/attendance')return <AttendanceManagement />;
      if (p === '/admin/chat')      return <ChatModule />;
      if (p === '/admin/projects')  return <ProjectManagement />;
      if (p === '/admin/leave')     return <LeaveManagement />;
      if (p === '/admin/settings')  return <AdminSettings />;
      if (p === '/admin/reports')   return <ReportsDashboard />;
      return <AdminDashboard />;
    }

    if (user.role === 'HR') {
      if (p === '/hr/employees')  return <EmployeeDirectory />;
      if (p === '/hr/payroll')    return <PayrollManagement />;
      if (p === '/hr/attendance') return <AttendanceManagement />;
      if (p === '/hr/chat')       return <ChatModule />;
      if (p === '/hr/leave')      return <LeaveManagement />;
      return <EmployeeDashboard />;
    }

    if (p === '/employee/tasks')      return <TaskManagement />;
    if (p === '/employee/attendance') return <AttendanceManagement />;
    if (p === '/employee/chat')       return <ChatModule />;
    if (p === '/employee/leave')      return <LeaveManagement />;
    return <EmployeeDashboard />;
  };

  return (
    <Shell>
      <ErrorBoundary label={currentPath}>
        {renderDashboard()}
      </ErrorBoundary>
    </Shell>
  );
}
