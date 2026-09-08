import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Paperclip, 
  Clock, 
  User as UserIcon,
  Calendar,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  MoreVertical,
  Loader2,
  Trash2,
  Edit2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Task, TaskReport, TaskStatus, User } from '@/src/types';
import { api } from '@/src/lib/api';
import { getSocket } from '@/src/lib/socket';

interface TaskDetailViewProps {
  task: Task;
  user: User;
  onClose: () => void;
  onUpdateStatus: (id: string, status: TaskStatus) => void;
  onDelete?: (id: string) => void;
}

export function TaskDetailView({ task, user, onClose, onUpdateStatus, onDelete }: TaskDetailViewProps) {
  const [reports, setReports] = useState<TaskReport[]>([]);
  const [newReport, setNewReport] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAdmin = user.role === 'Admin';
  const isAssignedToMe = task.assignedTo === user.id;

  const statusFlow: TaskStatus[] = ['Pending', 'In Progress', 'Under Review', 'Completed'];
  const nextStatus = statusFlow[statusFlow.indexOf(task.status) + 1];

  useEffect(() => {
    fetchReports();

    // Reuse the single app-wide authenticated socket instead of opening a second, unauthenticated
    // connection — the backend's socket middleware requires a JWT on the handshake to identify
    // the user and route room-targeted events like this one.
    const socket = getSocket();
    const handler = ({ taskId, report }: { taskId: string; report: any }) => {
      if (taskId === task.id) {
        const normalized = normalizeReport(report);
        setReports(prev => (prev.some(r => r.id === normalized.id) ? prev : [...prev, normalized]));
      }
    };
    socket?.on('task:report:new', handler);

    return () => {
      socket?.off('task:report:new', handler);
    };
  }, [task.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [reports]);

  // Backend returns reports with `userId` as a populated object { id, fullName, avatarUrl }
  // and `createdAt` for the timestamp. Normalize to the flat shape TaskReport type expects.
  const normalizeReport = (r: any): TaskReport => ({
    ...r,
    userId: r.userId?.id ?? r.userId,
    userName: r.userName ?? r.userId?.fullName ?? 'Unknown',
    timestamp: r.timestamp ?? r.createdAt,
  });

  const fetchReports = async () => {
    try {
      const data = await api.tasks.getReports(task.id);
      setReports(Array.isArray(data) ? data.map(normalizeReport) : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReport.trim()) return;

    setIsPosting(true);
    try {
      // userId/userName are derived server-side from the JWT, never trusted from the client.
      await api.tasks.addReport(task.id, newReport);
      setNewReport('');
      // The backend also broadcasts this back over the socket to both the assignee and the
      // task creator, so it will additionally arrive via the 'task:report:new' listener above.
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Failed to post report');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch md:items-center justify-end md:justify-center md:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[var(--surface)] w-full max-w-4xl h-full md:h-[90vh] md:rounded-[2.5rem] shadow-2xl border border-[var(--border)] flex flex-col overflow-hidden animate-in slide-in-from-right-10 md:slide-in-from-bottom-10 duration-500">
        {/* Header */}
        <div className="px-8 py-6 border-b border-[var(--border-light)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black tracking-tight">{task.title}</h2>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                  task.status === 'Completed' ? "bg-green-100 text-green-700" : "bg-accent/10 text-accent"
                )}>
                  {task.status}
                </span>
              </div>
              <p className="text-[11px] font-bold opacity-40 uppercase tracking-widest mt-1">Task Details & Reports</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button 
                onClick={() => onDelete?.(task.id)}
                className="p-3 hover:bg-red-50 text-red-400 rounded-2xl transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Info */}
          <div className="flex-1 overflow-y-auto p-8 border-r border-[var(--border-light)] custom-scrollbar">
            <div className="space-y-8">
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30">Description</h3>
                <p className="text-sm font-medium leading-relaxed opacity-70 whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30">Assigned To</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent text-sm font-black">
                      {(task.assignedToName ?? '?').charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-black">{task.assignedToName ?? 'Unknown'}</p>
                      <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{task.assignedToRole ?? ''}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 text-right">
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30">Deadline</h3>
                  <div className="flex items-center gap-2 justify-end">
                    <Calendar className="w-4 h-4 text-accent" />
                    <p className="text-sm font-black">{new Date(task.deadline).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-[var(--border-light)]">
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-6">Status Management</h3>
                <div className="flex items-center gap-4">
                   {nextStatus && (isAssignedToMe || isAdmin) && (
                    <button 
                      onClick={() => onUpdateStatus(task.id, nextStatus)}
                      className="flex-1 py-4 bg-accent text-white rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Move to {nextStatus}
                    </button>
                  )}
                  {isAdmin && (
                    <div className="flex gap-2">
                       {statusFlow.map(s => (
                         <button
                          key={s}
                          onClick={() => onUpdateStatus(task.id, s)}
                          className={cn(
                            "w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center transition-all",
                            task.status === s ? "bg-accent text-white shadow-lg shadow-accent/20" : "bg-slate-50 hover:bg-slate-100 text-slate-400"
                          )}
                          title={`Set as ${s}`}
                         >
                           <Clock className="w-4 h-4" />
                         </button>
                       ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Report Thread */}
          <div className="w-[380px] bg-slate-50 flex flex-col shrink-0">
            <div className="p-6 border-b border-[var(--border-light)] bg-[var(--surface)]">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30">Progress Reports • {reports.length}</h3>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
            >
              {reports.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                  <Clock className="w-10 h-10 mb-4" />
                  <p className="text-[11px] font-black uppercase tracking-widest">No reports yet</p>
                </div>
              ) : (
                reports.map((report) => {
                  const isSenderMe = report.userId === user.id;
                  return (
                    <div key={report.id} className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center text-accent text-[8px] font-black">
                          {(report.userName ?? '?').charAt(0)}
                        </div>
                        <p className="text-[9px] font-black opacity-30 uppercase tracking-widest">{report.userName ?? 'Unknown'}</p>
                        <span className="text-[8px] font-bold opacity-20 ml-auto">
                          {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className={cn(
                        "p-4 rounded-2xl text-xs font-medium",
                        isSenderMe ? "bg-accent text-white rounded-tr-none shadow-lg shadow-accent/10" : "bg-white border border-slate-100 rounded-tl-none shadow-sm"
                      )}>
                        {report.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-6 bg-[var(--surface)] border-t border-[var(--border-light)]">
              <form onSubmit={handlePostReport} className="relative">
                <textarea 
                  value={newReport}
                  onChange={(e) => setNewReport(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-4 pr-12 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all min-h-[60px] max-h-32"
                  placeholder="Post an update..."
                />
                <button 
                  type="submit"
                  disabled={isPosting || !newReport.trim()}
                  className="absolute right-2 bottom-2 p-2.5 bg-accent text-white rounded-xl shadow-lg shadow-accent/20 hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
                >
                  {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
