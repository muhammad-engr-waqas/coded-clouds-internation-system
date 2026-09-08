import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '@/src/lib/api';
import { getSocket } from '@/src/lib/socket';
import { useAppStore } from '@/src/store';
import { cn } from '@/src/lib/utils';

interface Notif {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { unreadNotifications, setUnreadNotifications } = useAppStore();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { notifications, unreadCount } = await api.notifications.list();
      setItems(notifications);
      setUnreadNotifications(unreadCount);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Real-time: any backend action that calls notifyUser() pushes 'notification:new' to
    // this user's socket room — bump the badge and prepend it without waiting for a refresh.
    const socket = getSocket();
    const handler = (notif: Notif) => {
      setItems((prev) => [notif, ...prev]);
      setUnreadNotifications((c) => c + 1);
    };
    socket?.on('notification:new', handler);
    return () => {
      socket?.off('notification:new', handler);
    };
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadNotifications((c) => Math.max(0, c - 1));
    try {
      await api.notifications.markRead(id);
    } catch {
      load(); // resync with DB on failure
    }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadNotifications(0);
    try {
      await api.notifications.markAllRead();
    } catch {
      load();
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors"
      >
        <Bell className="w-5 h-5 text-[var(--text)]/70" />
        {unreadNotifications > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-red-500 border-2 border-[var(--surface)] rounded-full text-[9px] leading-tight text-white font-black flex items-center justify-center">
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-light)]">
            <span className="text-xs font-black uppercase tracking-wide">Notifications</span>
            {unreadNotifications > 0 && (
              <button onClick={markAllRead} className="text-[10px] font-bold text-accent hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {loading && <p className="p-4 text-xs opacity-50">Loading…</p>}
          {!loading && items.length === 0 && <p className="p-4 text-xs opacity-50">No notifications yet.</p>}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.isRead && markRead(n.id)}
              className={cn(
                'w-full text-left px-4 py-3 border-b border-[var(--border-light)] last:border-0 hover:bg-[var(--background)] transition-colors',
                !n.isRead && 'bg-accent/5'
              )}
            >
              <p className="text-xs font-bold flex items-center gap-1.5">
                {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                {n.title}
              </p>
              {n.message && <p className="text-[11px] opacity-60 mt-0.5">{n.message}</p>}
              <p className="text-[9px] opacity-40 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
