import React from 'react';
import { useAppStore } from '@/src/store';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from '@/src/lib/utils';

export function Shell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, theme } = useAppStore();

  return (
    <div className="min-h-screen flex bg-[var(--background)]" data-theme={theme}>
      <Sidebar />
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 min-w-0",
        // Desktop margins
        sidebarCollapsed ? "lg:ml-20" : "lg:ml-56",
        // Mobile margins (none)
        "ml-0"
      )}>
        <Topbar />
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden overflow-y-auto">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
