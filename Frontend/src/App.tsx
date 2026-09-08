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

export default function App() {
  const { user, setUser } = useAppStore();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [checkingSession, setCheckingSession] = useState(true);

  // Simple routing hack for demo
  React.useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // On every load/refresh, the JWT (not any cached "user" object) is the source of truth for
  // whether we're logged in. Re-validate it against the database via GET /api/auth/me — this
  // is what makes refresh/close-and-reopen safe: if the token is missing/expired/invalid, the
  // user is bounced back to a real login instead of resuming a stale or fabricated session.
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

  if (!user) {
    return <Login />;
  }

  const renderDashboard = () => {
    const path = currentPath;

    // Admin Routes
    if (user.role === 'Admin') {
      if (path === '/admin/employees') return <EmployeeDirectory />;
      if (path === '/admin/tasks') return <TaskManagement />;
      if (path === '/admin/payroll') return <PayrollManagement />;
      if (path === '/admin/attendance') return <AttendanceManagement />;
      if (path === '/admin/chat') return <ChatModule />;
      if (path === '/admin/projects') return <ProjectManagement />;
      if (path === '/admin/leave') return <LeaveManagement />;
      if (path === '/admin/settings') return <AdminSettings />;
      if (path === '/admin/reports') return <ReportsDashboard />;
      return <AdminDashboard />;
    }

    // HR Routes
    if (user.role === 'HR') {
      if (path === '/hr/employees') return <EmployeeDirectory />;
      if (path === '/hr/payroll') return <PayrollManagement />;
      if (path === '/hr/attendance') return <AttendanceManagement />;
      if (path === '/hr/chat') return <ChatModule />;
      if (path === '/hr/leave') return <LeaveManagement />;
      return <EmployeeDashboard />;
    }

    // Default to Employee
    if (path === '/employee/tasks') return <TaskManagement />;
    if (path === '/employee/attendance') return <AttendanceManagement />;
    if (path === '/employee/chat') return <ChatModule />;
    if (path === '/employee/leave') return <LeaveManagement />;
    return <EmployeeDashboard />;
  };

  return (
    <Shell>
      {renderDashboard()}
    </Shell>
  );
}
