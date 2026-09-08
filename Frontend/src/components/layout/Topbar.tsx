import React, { useState } from 'react';
import { Search, Sun, Moon, Cloud, User as UserIcon, Menu, LogOut } from 'lucide-react';
import { useAppStore } from '@/src/store';
import { cn } from '@/src/lib/utils';
import { NotificationBell } from './NotificationBell';

export function Topbar() {
  const { theme, setTheme, user, setMobileSidebarOpen, logout } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 h-16 bg-[var(--surface)]/80 backdrop-blur-md border-b border-[var(--border)] z-40 px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={() => setMobileSidebarOpen(true)}
          className="p-2 hover:bg-slate-100 rounded-xl lg:hidden text-slate-600 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        <h2 className="text-lg font-black tracking-tighter truncate hidden sm:block">
          {window.location.pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
        </h2>

        <div className="relative max-w-xs w-full hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/40" />
          <input
            type="text"
            placeholder="Global search..."
            className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-xl py-2 pl-11 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Theme Toggles - Simplified for mobile if needed, but keeping for now */}
        <div className="hidden sm:flex bg-[var(--background)] p-0.5 rounded-full border border-[var(--border)]">
          <button
            onClick={() => setTheme('light')}
            className={cn("w-7 h-7 flex items-center justify-center rounded-full transition-all text-[10px] font-black", theme === 'light' ? "bg-white shadow-sm text-accent" : "text-[var(--text)]/40")}
          >
            L
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={cn("w-7 h-7 flex items-center justify-center rounded-full transition-all text-[10px] font-black", theme === 'dark' ? "bg-[#1e293b] shadow-sm text-accent" : "text-[var(--text)]/40")}
          >
            D
          </button>
          <button
            onClick={() => setTheme('sky')}
            className={cn("w-7 h-7 flex items-center justify-center rounded-full transition-all text-[10px] font-black", theme === 'sky' ? "bg-accent text-white shadow-inner" : "text-[var(--text)]/40")}
          >
            S
          </button>
        </div>

        <NotificationBell />

        <div className="h-8 w-[1px] bg-[var(--border-light)] mx-1 hidden sm:block"></div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-3 p-1 hover:bg-slate-50 rounded-xl transition-all group text-left"
          >
            <div className="text-right hidden sm:block">
              <p className="text-[11px] font-black leading-none">{user?.fullName || 'Guest'}</p>
              <p className="text-[9px] font-bold opacity-40 leading-tight mt-1 uppercase tracking-widest">{user?.role || 'Visitor'}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-accent/10 overflow-hidden ring-1 ring-accent/20">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.fullName || 'Felix'}`} alt="avatar" />
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
