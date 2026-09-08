import React from 'react';
import { cn } from '@/src/lib/utils';
import { AttendanceStatus } from '@/src/types';

interface AttendanceHeatmapCalendarProps {
  month: string;
  year: string;
  history: any[];
}

export function AttendanceHeatmapCalendar({ month, year, history }: AttendanceHeatmapCalendarProps) {
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  const firstDayOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getStatus = (day: number) => {
    const dateStr = `${year}-${month}-${day.toString().padStart(2, '0')}`;
    const record = history.find(h => h.date === dateStr);
    return record?.status || (new Date(parseInt(year), parseInt(month) - 1, day).getDay() % 6 === 0 ? 'Weekend' : 'Absent');
  };

  const statusColors: Record<AttendanceStatus, string> = {
    Present: 'bg-green-500 text-white shadow-lg shadow-green-200',
    Late: 'bg-orange-500 text-white shadow-lg shadow-orange-200',
    Absent: 'bg-red-500 text-white shadow-lg shadow-red-200',
    Leave: 'bg-blue-500 text-white shadow-lg shadow-blue-200',
    Weekend: 'bg-slate-100 text-slate-400',
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-[var(--surface)] p-6 rounded-3xl border border-[var(--border)] shadow-sm">
      <div className="grid grid-cols-7 gap-2 mb-4">
        {dayNames.map(day => (
          <div key={day} className="text-[10px] font-black uppercase tracking-widest text-center opacity-30">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {blanks.map(b => (
          <div key={`blank-${b}`} className="aspect-square"></div>
        ))}
        {days.map(day => {
          const status = getStatus(day);
          return (
            <div 
              key={day} 
              className={cn(
                "aspect-square rounded-xl flex flex-col items-center justify-center relative group transition-all cursor-default",
                statusColors[status as AttendanceStatus]
              )}
            >
              <span className="text-xs font-black">{day}</span>
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
              
              {/* Tooltip hint */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-10 shadow-xl">
                {status}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-[var(--border-light)] flex flex-wrap gap-4 items-center justify-center">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-md", color.split(' ')[0])}></div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
