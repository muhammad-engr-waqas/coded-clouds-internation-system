import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Loader2,
  Calendar,
  AlertTriangle,
  Link,
  Paperclip
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { User, TaskPriority } from '@/src/types';
import { api } from '@/src/lib/api';

interface AssignTaskModalProps {
  onClose: () => void;
  onSuccess: (task: any) => void;
}

export function AssignTaskModal({ onClose, onSuccess }: AssignTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [deadline, setDeadline] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmployees();
    fetchProjects();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await api.employees.list({ limit: '200' });
      const list = Array.isArray(data) ? data : (data.employees ?? []);
      setEmployees(list);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await api.projects.list();
      // api.projects.list() returns { projects: [...] } OR plain array depending on backend
      const list = Array.isArray(data) ? data : (data.projects ?? []);
      setProjects(list);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assignedTo || !deadline) return;

    setIsLoading(true);
    setError('');
    try {
      // createdBy, assignedToName, assignedToRole, and status are all set authoritatively by
      // the backend (from req.user / the User doc) — never trust a client-supplied identity.
      const newTask = await api.tasks.create({
        title,
        description,
        assignedTo,
        priority,
        deadline,
        project: projectId || null,
      });
      onSuccess(newTask);
    } catch (err: any) {
      setError(err?.message || 'Failed to assign task');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[var(--surface)] w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-[var(--border)] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-[var(--border-light)] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent text-white rounded-2xl shadow-lg shadow-accent/20">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Assign New Task</h2>
              <p className="text-[11px] font-bold opacity-40 uppercase tracking-widest">Create and delegate tasks to your team</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {error && (
            <div className="md:col-span-2 bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100">{error}</div>
          )}
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Task Title *</label>
              <input 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all"
                placeholder="What needs to be done?"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Description *</label>
              <textarea 
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all min-h-[140px]"
                placeholder="Add more details about the task..."
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Project</label>
                <select 
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold focus:outline-none transition-all"
                >
                  <option value="">Select Project (Optional)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Priority</label>
                <select 
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold focus:outline-none transition-all"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Deadline *</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input 
                  required
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-11 pr-5 text-xs font-bold focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5 h-full flex flex-col">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Assign To *</label>
              <div className="relative mb-3">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-11 pr-5 text-xs font-bold focus:outline-none"
                  placeholder="Search employees..."
                />
              </div>
              <div className="flex-1 bg-slate-50 border border-slate-100 rounded-3xl overflow-y-auto p-2 space-y-1 max-h-[300px] custom-scrollbar">
                {filteredEmployees.map(emp => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setAssignedTo(emp.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left group",
                      assignedTo === emp.id ? "bg-accent text-white shadow-lg shadow-accent/20" : "hover:bg-white hover:shadow-sm"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0",
                      assignedTo === emp.id ? "bg-white/20" : "bg-accent/10 text-accent"
                    )}>
                      {emp.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black truncate">{emp.fullName}</p>
                      <p className={cn(
                        "text-[9px] font-bold uppercase tracking-widest",
                        assignedTo === emp.id ? "text-white/60" : "opacity-30"
                      )}>{emp.role}</p>
                    </div>
                    {assignedTo === emp.id && (
                      <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 pt-4 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-50 border border-slate-100 text-[12px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isLoading || !title.trim() || !assignedTo || !deadline}
              className="flex-2 py-4 bg-accent text-white text-[12px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Assign Task Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
