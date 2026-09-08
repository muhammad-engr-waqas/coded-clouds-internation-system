import React from 'react';
import { Task, TaskStatus } from '@/src/types';
import { TaskCard } from './TaskCard';
import { Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface TaskKanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask?: () => void;
  isAdmin: boolean;
}

export function TaskKanbanBoard({ tasks, onTaskClick, onAddTask, isAdmin }: TaskKanbanBoardProps) {
  const columns: TaskStatus[] = ['Pending', 'In Progress', 'Under Review', 'Completed'];

  const getTasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 h-full custom-scrollbar">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column);
        return (
          <div key={column} className="flex-none w-80 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-widest opacity-40">{column}</h3>
                <span className="bg-[var(--border-light)] text-[var(--text)]/40 text-[9px] font-black px-2 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
              </div>
              <button className="p-1.5 hover:bg-[var(--border-light)] rounded-lg transition-colors text-[var(--text)]/30">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 bg-slate-50/50 rounded-3xl p-3 space-y-4 min-h-[500px]">
              {column === 'Pending' && isAdmin && (
                <button 
                  onClick={onAddTask}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:border-accent/40 hover:text-accent transition-all group"
                >
                  <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-black uppercase tracking-widest">Assign New Task</span>
                </button>
              )}
              
              {columnTasks.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onClick={() => onTaskClick(task)} 
                />
              ))}

              {columnTasks.length === 0 && !(column === 'Pending' && isAdmin) && (
                <div className="h-32 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-[9px] font-black uppercase tracking-widest">No Tasks</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
