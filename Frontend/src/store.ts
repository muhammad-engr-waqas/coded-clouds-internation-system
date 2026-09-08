import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'sky';

import type { User } from './types';
import { setToken } from './lib/api';
import { disconnectSocket } from './lib/socket';

interface AppState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  unreadNotifications: number;
  setUnreadNotifications: (n: number | ((c: number) => number)) => void;
}

// NOTE: only UI preferences (theme, sidebar) and the last-known user profile are persisted
// here for a smoother reload. The actual session is authoritative via the JWT in localStorage
// ('ccims_token', see lib/api.ts) — App.tsx re-validates it against GET /api/auth/me on boot
// and clears `user` if the token is missing/invalid. Business data itself is never persisted
// here; it's always fetched fresh from the database.
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      user: null,
      setUser: (user) => set({ user }),
      logout: () => {
        setToken(null);
        disconnectSocket();
        set({ user: null, unreadNotifications: 0 });
      },
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      mobileSidebarOpen: false,
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
      unreadNotifications: 0,
      setUnreadNotifications: (n) =>
        set((state) => ({ unreadNotifications: typeof n === 'function' ? (n as any)(state.unreadNotifications) : n })),
    }),
    {
      name: 'ccims-storage',
      partialize: (state) => ({ theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);
