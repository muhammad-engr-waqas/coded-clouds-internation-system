import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Loader2,
  LayoutGrid,
  List,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppStore } from '@/src/store';
import { Task, TaskStatus } from '@/src/types';
import { TaskKanbanBoard } from '../components/tasks/TaskKanbanBoard';
import { AssignTaskModal } from '../components/tasks/AssignTaskModal';
import { TaskDetailView } from '../components/tasks/TaskDetailView';
import { api } from '@/src/lib/api';
import { getSocket } from '@/src/lib/socket';

export function TaskManagement() {
  const { user } = useAppStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    fetchTasks();
  }, []);

  // Normalize backend response: assignedTo can be a populated object { fullName, role }
  // or a plain userId string. Map to the flat fields TaskCard expects.
  const normalizeTask = (t: any): Task => ({
    ...t,
    assignedToName: t.assignedToName ?? t.assignedTo?.fullName ?? 'Unknown',
    assignedToRole: t.assignedToRole ?? t.assignedTo?.role ?? '',
    project: t.project?.name ?? t.project ?? undefined,
    reportCount: t.reportCount ?? 0,
  });

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const data = isAdmin ? await api.tasks.listAll() : (await api.tasks.listMine());
      setTasks(Array.isArray(data) ? data.map(normalizeTask) : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time: assignment, status changes, and reassignments all push straight to the
  // affected user's socket room server-side — merge them in instead of polling.
  useEffect(() => {
    const socket = getSocket();
    const upsert = (task: any) => {
      const t = normalizeTask(task);
      setTasks((prev) => (prev.some((p) => p.id === t.id) ? prev.map((p) => (p.id === t.id ? t : p)) : [t, ...prev]));
    };
    const onAssigned = (task: Task) => upsert(task);
    const onStatusChanged = (task: Task) => {
      upsert(task);
      setSelectedTask((prev) => (prev?.id === task.id ? { ...prev, ...task } : prev));
    };
    socket?.on('task:assigned', onAssigned);
    socket?.on('task:status:changed', onStatusChanged);
    return () => {
      socket?.off('task:assigned', onAssigned);
      socket?.off('task:status:changed', onStatusChanged);
    };
  }, []);

  const handleUpdateStatus = async (id: string, status: TaskStatus) => {
    const prev = tasks;
    setTasks(p => p.map(t => t.id === id ? { ...t, status } : t));
    if (selectedTask?.id === id) setSelectedTask(sel => sel ? { ...sel, status } : null);
    try {
      const updated = await api.tasks.updateStatus(id, status);
      setTasks(p => p.map(t => t.id === id ? { ...t, ...updated } : t));
    } catch (err: any) {
      alert(err?.message || 'Failed to update task status');
      setTasks(prev);
    }
  };

  const handleDeleteTask = async (id: string) => {
    const prev = tasks;
    setTasks(p => p.filter(t => t.id !== id));
    setSelectedTask(null);
    try {
      await api.tasks.remove(id);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete task');
      setTasks(prev);
    }
  };

  const filteredTasks = tasks.filter(t => 
    (t.title ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.assignedToName ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tighter">Task Management</h1>
          <p className="text-[var(--text)]/50 text-[11px] font-bold uppercase tracking-widest mt-0.5">
            {isAdmin ? 'Manage team workflow and assignments' : 'Your active tasks and progress reports'}
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsAssignModalOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-accent text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Assign New Task
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-[var(--surface)] p-4 rounded-3xl border border-[var(--border-light)] shadow-sm flex flex-wrap items-center gap-4 shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, employees, roles..."
            className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-2xl py-2.5 pl-12 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 p-1.5 bg-[var(--background)] rounded-2xl border border-[var(--border-light)]">
          <button className="p-2 bg-[var(--surface)] text-accent rounded-xl shadow-sm">
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button className="p-2 text-[var(--text)]/30 hover:text-accent transition-colors">
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <TaskKanbanBoard 
          tasks={filteredTasks}
          isAdmin={isAdmin}
          onTaskClick={setSelectedTask}
          onAddTask={() => setIsAssignModalOpen(true)}
        />
      </div>

      {/* Modals */}
      {isAssignModalOpen && (
        <AssignTaskModal 
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={(newTask) => {
            setTasks([newTask, ...tasks]);
            setIsAssignModalOpen(false);
          }}
        />
      )}

      {selectedTask && user && (
        <TaskDetailView 
          task={selectedTask}
          user={user}
          onClose={() => setSelectedTask(null)}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}

