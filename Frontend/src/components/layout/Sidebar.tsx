import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Calendar, 
  MessageSquare, 
  Briefcase, 
  BarChart3, 
  ShieldCheck, 
  Settings,
  ChevronLeft,
  ChevronRight,
  FileText,
  CreditCard,
  LogOut,
  X
} from 'lucide-react';
import { useAppStore } from '@/src/store';
import { cn } from '@/src/lib/utils';
import { BrandLogo } from '@/src/components/ui/BrandLogo';

const navItems = {
  Admin: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: Users, label: 'Employees', path: '/admin/employees' },
    { icon: CreditCard, label: 'Payroll', path: '/admin/payroll' },
    { icon: CheckSquare, label: 'Tasks', path: '/admin/tasks' },
    { icon: Calendar, label: 'Attendance', path: '/admin/attendance' },
    { icon: MessageSquare, label: 'Chat', path: '/admin/chat' },
    { icon: Briefcase, label: 'Projects', path: '/admin/projects' },
    { icon: FileText, label: 'Leave', path: '/admin/leave' },
    { icon: BarChart3, label: 'Reports', path: '/admin/reports' },
    { icon: ShieldCheck, label: 'Audit', path: '/admin/audit' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ],
  HR: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/hr' },
    { icon: Users, label: 'Employees', path: '/hr/employees' },
    { icon: FileText, label: 'Leave Requests', path: '/hr/leave' },
    { icon: CreditCard, label: 'Payroll', path: '/hr/payroll' },
    { icon: Calendar, label: 'Attendance', path: '/hr/attendance' },
    { icon: MessageSquare, label: 'Chat', path: '/hr/chat' },
  ],
  Employee: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/employee' },
    { icon: CheckSquare, label: 'My Tasks', path: '/employee/tasks' },
    { icon: Calendar, label: 'Attendance', path: '/employee/attendance' },
    { icon: MessageSquare, label: 'Chat', path: '/employee/chat' },
    { icon: FileText, label: 'Leave', path: '/employee/leave' },
  ],
};

export function Sidebar() {
  const { 
    sidebarCollapsed, 
    setSidebarCollapsed, 
    user, 
    logout,
    mobileSidebarOpen,
    setMobileSidebarOpen
  } = useAppStore();
  
  // Default to Employee if no role is found
  const role = (user?.role === 'Admin' || user?.role === 'HR') ? user.role : 'Employee';
  const items = navItems[role as keyof typeof navItems];

  const handleNavClick = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    setMobileSidebarOpen(false); // Close on mobile navigation
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-200"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-0 h-full bg-[var(--surface)] border-r border-[var(--border)] z-[70] transition-all duration-300 flex flex-col shadow-2xl lg:shadow-none",
        // Desktop sizing
        sidebarCollapsed ? "lg:w-20" : "lg:w-56",
        // Mobile sizing and positioning
        mobileSidebarOpen ? "w-[280px] translate-x-0" : "w-[280px] -translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="p-4 flex items-center justify-between border-b border-[var(--border-light)]">
          <div className="flex items-center gap-2 min-w-0">
            {(!sidebarCollapsed || mobileSidebarOpen) ? (
              /* Expanded sidebar → show full logo */
              <BrandLogo size="sm" />
            ) : (
              /* Collapsed sidebar → show just the cloud icon mark */
              <img
                src="/logo.png"
                alt="Coded Clouds"
                className="w-9 h-9 object-contain"
                draggable={false}
              />
            )}
          </div>
          <button 
            onClick={() => setMobileSidebarOpen(false)}
            className="p-2 hover:bg-slate-100 rounded-lg lg:hidden shrink-0"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 mt-2 overflow-y-auto custom-scrollbar">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group text-left",
                window.location.pathname === item.path 
                  ? "bg-accent/5 text-accent font-black text-xs" 
                  : "text-[var(--text)]/70 hover:bg-[var(--background)]/50 text-xs font-bold",
                sidebarCollapsed && !mobileSidebarOpen && "lg:justify-center"
              )}
            >
              <item.icon className={cn("w-4 h-4 shrink-0", window.location.pathname === item.path ? "text-accent" : "text-slate-400 group-hover:text-accent transition-colors")} />
              {(!sidebarCollapsed || mobileSidebarOpen) && (
                <span>{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={() => logout()}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 font-black text-xs transition-all",
              sidebarCollapsed && !mobileSidebarOpen && "lg:justify-center"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {(!sidebarCollapsed || mobileSidebarOpen) && <span>Logout</span>}
          </button>
          
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="mt-4 w-full hidden lg:flex items-center justify-center p-2 rounded-xl hover:bg-[var(--background)] transition-all border border-[var(--border-light)]"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
}
