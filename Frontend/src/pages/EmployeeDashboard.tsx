import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Calendar,
  MessageSquare,
  ChevronRight,
  Plus,
  Loader2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { AttendanceCheckInOutWidget } from '../components/attendance/AttendanceCheckInOutWidget';
import { useAppStore } from '@/src/store';
import { api } from '@/src/lib/api';

export function EmployeeDashboard() {
  const { user } = useAppStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const [myTasks, channels] = await Promise.all([
          api.tasks.listMine(),
          api.chat.channels(),
        ]);
        if (cancelled) return;

        // "Urgent" = not yet completed, soonest deadline first
        const urgent = myTasks
          .filter((t: any) => t.status !== 'Completed')
          .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
          .slice(0, 4);
        setTasks(urgent);

        const announcementsChannel = channels.find((c: any) => c.name === 'announcements');
        if (announcementsChannel) {
          const messages = await api.chat.messages(announcementsChannel.id);
          if (!cancelled) setAnnouncements(messages.slice(-3).reverse());
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Widget */}
      <div className="bg-accent text-white p-6 rounded-2xl shadow-lg shadow-accent/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Calendar className="w-24 h-24" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tighter">{greeting}, {user?.fullName?.split(' ')[0]}!</h1>
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mt-0.5">{today}</p>
          </div>
        </div>
      </div>

      <AttendanceCheckInOutWidget />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks Summary */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              My Urgent Tasks
            </h2>
            <a href="/employee/tasks" className="text-[10px] font-black uppercase tracking-tighter text-accent hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </a>
          </div>

          {isLoading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
          ) : tasks.length === 0 ? (
            <div className="bg-[var(--surface)] p-6 rounded-xl border border-[var(--border-light)] text-center opacity-40 text-xs font-bold">
              No open tasks right now — nice work!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((task) => (
                <div key={task.id} className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border-light)] shadow-sm hover:border-accent/30 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-2">
                    <span className={cn(
                      "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                      task.priority === 'Critical' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {task.priority}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold group-hover:text-accent transition-colors leading-tight">{task.title}</h3>
                  <p className="text-[var(--text)]/40 text-[10px] mt-1 font-bold uppercase tracking-tight">{task.project?.name || 'No Project'}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-[9px] font-black text-[var(--text)]/30 uppercase">
                    <Clock className="w-3 h-3" />
                    Due {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements (the #announcements channel, posted by Admin/HR) */}
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-accent" />
            Announcements
          </h2>
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border-light)] shadow-sm overflow-hidden">
            <div className="p-3 space-y-3">
              {isLoading ? (
                <div className="py-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-accent" /></div>
              ) : announcements.length === 0 ? (
                <p className="text-[10px] font-bold opacity-40 text-center py-4">No announcements yet.</p>
              ) : (
                announcements.map((note: any) => (
                  <div key={note.id} className="flex gap-3 group cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-[var(--background)] flex items-center justify-center text-accent shrink-0 group-hover:bg-accent group-hover:text-white transition-all">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[11px] font-bold truncate group-hover:text-accent transition-colors leading-tight">{note.text}</h4>
                      <p className="text-[9px] text-[var(--text)]/40 font-black uppercase tracking-tighter mt-0.5">
                        {note.senderId?.fullName} • {new Date(note.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <a href="/employee/chat" className="block text-center w-full p-2.5 bg-[var(--background)]/50 text-[var(--text)]/40 text-[10px] font-black uppercase tracking-tighter hover:text-accent transition-colors border-t border-[var(--border-light)]">
              Read all
            </a>
          </div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="flex flex-wrap gap-3 pt-2">
        {[
          { icon: Plus, label: 'Apply Leave', href: '/employee/leave' },
          { icon: MessageSquare, label: 'Start Chat', href: '/employee/chat' },
          { icon: CheckSquare, label: 'Update Task', href: '/employee/tasks' },
        ].map((action) => (
          <a
            key={action.label}
            href={action.href}
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', action.href);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border-light)] rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm hover:border-accent/30 hover:bg-[var(--background)] transition-all"
          >
            <action.icon className="w-3.5 h-3.5 text-accent" />
            {action.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function CheckSquare({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 11 3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
