import React, { useState, useEffect } from 'react';
import { 
  X, 
  Loader2,
  Calendar,
  FileText,
  AlertCircle,
  Paperclip,
  Clock
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { User, LeaveType } from '@/src/types';
import { api } from '@/src/lib/api';

interface ApplyLeaveModalProps {
  user: User;
  onClose: () => void;
  onSuccess: (request: any) => void;
}

export function ApplyLeaveModal({ user, onClose, onSuccess }: ApplyLeaveModalProps) {
  const [leaveType, setLeaveType] = useState<LeaveType>('Sick');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const calculateDays = () => {
    if (!fromDate || !toDate) return 0;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const totalDays = calculateDays();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate || !reason.trim()) return;

    setIsLoading(true);
    setError('');
    try {
      // totalDays is sent for the optimistic UI number, but the backend recomputes it
      // authoritatively from Settings (weekend-exclusion policy) rather than trusting the client.
      const newRequest = await api.leave.apply({ leaveType, fromDate, toDate, reason });
      onSuccess(newRequest);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit leave request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[var(--surface)] w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-[var(--border)] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-[var(--border-light)] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-200">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Apply for Leave</h2>
              <p className="text-[11px] font-bold opacity-40 uppercase tracking-widest">Submit a new request</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Leave Type *</label>
              <select 
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold focus:outline-none"
              >
                <option value="Sick">Sick Leave</option>
                <option value="Casual">Casual Leave</option>
                <option value="Annual">Annual Leave</option>
                <option value="Emergency">Emergency Leave</option>
                <option value="Unpaid">Unpaid Leave</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Total Days</label>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-black flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                {totalDays} {totalDays === 1 ? 'Day' : 'Days'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50">From Date *</label>
              <input 
                required
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50">To Date *</label>
              <input 
                required
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Reason for Leave *</label>
            <textarea 
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-sm font-medium focus:outline-none min-h-[100px]"
              placeholder="Please provide a brief reason..."
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-50 border border-slate-100 text-[12px] font-black uppercase tracking-widest rounded-2xl"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isLoading || !fromDate || !toDate || !reason.trim()}
              className="flex-2 py-4 bg-accent text-white text-[12px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-accent/20 transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
