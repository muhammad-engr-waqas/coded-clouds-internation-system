import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Play,
  Square,
  CheckCircle2,
  AlertCircle,
  Timer,
  Calendar
} from 'lucide-react';
import { api } from '@/src/lib/api';

function parseTimeOnToday(iso: string) {
  return new Date(iso);
}

export function AttendanceCheckInOutWidget({ onChange }: { onChange?: () => void }) {
  const [status, setStatus] = useState<'idle' | 'checked-in' | 'checked-out'>('idle');
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('00h 00m 00s');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const calculateElapsed = useCallback(() => {
    if (!checkInTime) return '00h 00m 00s';
    const now = status === 'checked-out' && checkOutTime ? checkOutTime : new Date();
    const diff = now.getTime() - checkInTime.getTime();

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  }, [checkInTime, status, checkOutTime]);

  // On mount, load *today's* real attendance record from the database so a page refresh
  // doesn't reset an already-checked-in employee back to "idle".
  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    api.attendance
      .mine()
      .then(({ records }: any) => {
        const todays = records.find((r: any) => r.date === todayStr);
        if (!todays?.checkIn) return;
        setCheckInTime(parseTimeOnToday(todays.checkIn));
        if (todays.checkOut) {
          setCheckOutTime(parseTimeOnToday(todays.checkOut));
          setStatus('checked-out');
        } else {
          setStatus('checked-in');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === 'checked-in') {
      interval = setInterval(() => {
        setElapsedTime(calculateElapsed());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, calculateElapsed]);

  const handleCheckIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      const record = await api.attendance.checkIn();
      setCheckInTime(parseTimeOnToday(record.checkIn));
      setStatus('checked-in');
      onChange?.();
    } catch (err: any) {
      setError(err?.message || 'Check-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsLoading(true);
    setError('');
    try {
      const record = await api.attendance.checkOut();
      setCheckOutTime(parseTimeOnToday(record.checkOut));
      setStatus('checked-out');
      setElapsedTime(calculateElapsed());
      onChange?.();
    } catch (err: any) {
      setError(err?.message || 'Check-out failed');
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="bg-[var(--surface)] p-6 rounded-3xl border border-[var(--border)] shadow-xl shadow-slate-200/50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-accent/10 text-accent rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight">Daily Attendance</h3>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="w-3.5 h-3.5 opacity-30" />
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{today}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center justify-end gap-4">
          {status === 'idle' ? (
            <button
              onClick={handleCheckIn}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-accent text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Play className="w-5 h-5 fill-current" />
              Check In Now
            </button>
          ) : status === 'checked-in' ? (
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
              <div className="px-6 py-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-200">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Checked In</p>
                  <p className="text-lg font-black text-green-700">
                    {checkInTime?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="w-px h-8 bg-green-200 mx-2 hidden md:block"></div>
                <div className="flex flex-col">
                  <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Working Time</p>
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-green-500 animate-pulse" />
                    <p className="text-lg font-mono font-black text-green-700">{elapsedTime}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCheckOut}
                disabled={isLoading}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-red-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-red-200 hover:bg-red-600 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Square className="w-4 h-4 fill-current" />
                Check Out
              </button>
            </div>
          ) : (
            <div className="px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col md:flex-row items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-200 rounded-xl text-slate-500">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today's Session Completed</p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="text-center">
                      <p className="text-[8px] font-black opacity-40 uppercase">In</p>
                      <p className="text-sm font-black">{checkInTime?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                    <div className="text-center">
                      <p className="text-[8px] font-black opacity-40 uppercase">Out</p>
                      <p className="text-sm font-black">{checkOutTime?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-px h-10 bg-slate-200 hidden md:block"></div>
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Worked</p>
                <p className="text-xl font-black text-slate-700">{elapsedTime}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-xs font-bold text-red-700">{error}</p>
        </div>
      )}

      {!error && status === 'idle' && (
        <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          <p className="text-xs font-bold text-orange-700">
            You haven't checked in yet. Please record your attendance to start the day.
          </p>
        </div>
      )}
    </div>
  );
}
