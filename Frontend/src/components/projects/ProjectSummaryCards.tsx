import React from 'react';
import { CheckCircle2, Clock, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ProjectSummaryCardsProps {
  completed: number;
  inProgress: number;
  pending: number;
  activeFilter: string | null;
  onFilterChange: (status: string | null) => void;
}

export function ProjectSummaryCards({ 
  completed, 
  inProgress, 
  pending, 
  activeFilter,
  onFilterChange 
}: ProjectSummaryCardsProps) {
  const cards = [
    { 
      label: 'Completed', 
      count: completed, 
      icon: CheckCircle2, 
      color: 'text-green-500', 
      bg: 'bg-green-50', 
      status: 'Completed' 
    },
    { 
      label: 'In Progress', 
      count: inProgress, 
      icon: Clock, 
      color: 'text-blue-500', 
      bg: 'bg-blue-50', 
      status: 'In Progress' 
    },
    { 
      label: 'Pending', 
      count: pending, 
      icon: AlertCircle, 
      color: 'text-amber-500', 
      bg: 'bg-amber-50', 
      status: 'Pending' 
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card) => (
        <button
          key={card.label}
          onClick={() => onFilterChange(activeFilter === card.status ? null : card.status)}
          className={cn(
            "flex items-center gap-6 p-6 rounded-[2rem] border transition-all text-left",
            activeFilter === card.status 
              ? "bg-[var(--surface)] border-accent shadow-xl shadow-accent/5 ring-2 ring-accent/10" 
              : "bg-[var(--surface)] border-[var(--border-light)] hover:border-accent/30 shadow-sm"
          )}
        >
          <div className={cn("p-4 rounded-2xl shrink-0", card.bg, card.color)}>
            <card.icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">{card.label}</p>
            <p className="text-3xl font-black tracking-tighter">{card.count}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
