import React from 'react';
import { 
  Clock, 
  MessageSquare, 
  MoreVertical,
  AlertCircle,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Task } from '@/src/types';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  key?: React.Key;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const priorityColors = {
    Low: 'bg-green-100 text-green-700',
    Medium: 'bg-blue-100 text-blue-700',
    High: 'bg-orange-100 text-orange-700',
    Critical: 'bg-red-100 text-red-700'
  };

  return (
    <div 
      onClick={onClick}
      className="bg-[var(--surface)] border border-[var(--border-light)] p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-accent/20 transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <div className="flex items-start justify-between mb-3">
        <span className={cn(
          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
          priorityColors[task.priority]
        )}>
          {task.priority}
        </span>
        <button className="text-[var(--text)]/20 hover:text-[var(--text)] transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      <h4 className="text-sm font-black tracking-tight mb-1 group-hover:text-accent transition-colors">
        {task.title}
      </h4>

      {task.project && (
        <div className="mb-3">
          <span className="text-[8px] font-black uppercase tracking-[0.15em] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md border border-slate-200">
            Project: {task.project}
          </span>
        </div>
      )}
      
      <div className="flex items-center gap-3 mb-4">
        <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-[9px] font-black">
          {task.assignedToName.charAt(0)}
        </div>
        <div>
          <p className="text-[10px] font-black leading-tight">{task.assignedToName}</p>
          <p className="text-[8px] font-bold opacity-30 uppercase tracking-widest">{task.assignedToRole}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-light)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[var(--text)]/40">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">{new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-1 text-[var(--text)]/40">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">{task.reportCount}</span>
          </div>
        </div>
        {task.status === 'Completed' && (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        )}
      </div>
    </div>
  );
}
