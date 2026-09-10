import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar as CalendarIcon,
  User as UserIcon,
  ChevronRight,
  Loader2,
  AlertCircle,
  FileText,
  Info,
  Download
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { LeaveRequest, LeaveStatus, User } from '@/src/types';
import { exportToCSV } from '@/src/lib/exportUtils';
import { useAppStore } from '../store';
import { ApplyLeaveModal } from '../components/leave/ApplyLeaveModal';
import { api } from '@/src/lib/api';
import { getSocket } from '@/src/lib/socket';

export function LeaveManagement() {
  const { user } = useAppStore();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectionModalId, setRejectionModalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR';

  useEffect(() => {
    fetchRequests();
  }, [user?.id, user?.role]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      if (isAdminOrHR) {
        const leaves = await api.leave.all();
        setRequests((leaves ?? []).map((l: any) => ({
          ...l,
          userName: l.userId?.fullName ?? l.userName ?? 'Unknown',
          userRole: l.userId?.role     ?? l.userRole ?? '',
          userId:   l.userId?.id       ?? l.userId   ?? '',
        })));
      } else {
        const res = await api.leave.mine();
        const leaves = res?.leaves ?? res ?? [];
        setRequests((Array.isArray(leaves) ? leaves : []).map((l: any) => ({
          ...l,
          userName: user?.fullName ?? 'Unknown',
          userRole: user?.role     ?? '',
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time: new applications ('leave:new') land in the Admin/HR queue instantly, and
  // status changes ('leave:statusChanged', targeted at the applicant) update their own view.
  useEffect(() => {
    const socket = getSocket();
    const onNew = () => isAdminOrHR && fetchRequests();
    const onStatusChanged = () => fetchRequests();
    socket?.on('leave:new', onNew);
    socket?.on('leave:statusChanged', onStatusChanged);
    return () => {
      socket?.off('leave:new', onNew);
      socket?.off('leave:statusChanged', onStatusChanged);
    };
  }, [isAdminOrHR]);

  const updateStatus = async (id: string, status: LeaveStatus, reason?: string) => {
    const prev = requests;
    setRequests(r => r.map(req => req.id === id ? { ...req, status, rejectionReason: reason } : req));
    setRejectionModalId(null);
    setRejectionReason('');
    try {
      const updated = status === 'Approved' ? await api.leave.approve(id) : await api.leave.reject(id, reason);
      setRequests(r => r.map(req => req.id === id ? { ...req, ...updated } : req));
    } catch (err: any) {
      alert(err?.message || 'Failed to update leave status');
      setRequests(prev);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesFilter = activeFilter ? r.status === activeFilter : true;
    const name = (r.userName ?? '').toLowerCase();
    const type = (r.leaveType ?? '').toLowerCase();
    const q    = searchQuery.toLowerCase();
    const matchesSearch = name.includes(q) || type.includes(q);
    return matchesFilter && matchesSearch;
  });

  const summary = {
    pending: requests.filter(r => r.status === 'Pending').length,
    approved: requests.filter(r => r.status === 'Approved').length,
    rejected: requests.filter(r => r.status === 'Rejected').length,
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Leave Management</h1>
          <p className="text-[var(--text)]/50 text-[11px] font-bold uppercase tracking-widest mt-1">
            {isAdminOrHR ? 'Manage team leave requests and balances' : 'Your personal leave history and balances'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdminOrHR && (
            <button 
              onClick={() => exportToCSV(requests, 'Leave_Requests')}
              className="flex items-center gap-3 px-6 py-4 bg-[var(--surface)] border border-[var(--border-light)] rounded-2xl font-black text-xs uppercase shadow-sm hover:border-accent/30 transition-all"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          )}
          {!isAdminOrHR && (
            <button 
              onClick={() => setIsApplyModalOpen(true)}
              className="flex items-center gap-3 px-6 py-4 bg-accent text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" />
              Apply for Leave
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--surface)] p-6 rounded-[2rem] border border-[var(--border-light)] shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Pending</p>
              <p className="text-2xl font-black tracking-tighter">{summary.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--surface)] p-6 rounded-[2rem] border border-[var(--border-light)] shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-50 text-green-500 rounded-2xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Approved</p>
              <p className="text-2xl font-black tracking-tighter">{summary.approved}</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--surface)] p-6 rounded-[2rem] border border-[var(--border-light)] shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Rejected</p>
              <p className="text-2xl font-black tracking-tighter">{summary.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[var(--surface)] p-4 rounded-3xl border border-[var(--border-light)] shadow-sm flex flex-wrap items-center gap-4 shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee or leave type..."
            className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-2xl py-3 pl-12 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['Pending', 'Approved', 'Rejected'] as LeaveStatus[]).map(status => (
            <button
              key={status}
              onClick={() => setActiveFilter(activeFilter === status ? null : status)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                activeFilter === status 
                  ? "bg-accent text-white border-accent shadow-lg shadow-accent/20" 
                  : "bg-[var(--background)] border-[var(--border-light)] text-slate-400 hover:border-accent/30"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table (Desktop Table / Mobile Cards) */}
      <div className="flex-1 min-h-0 bg-[var(--surface)] rounded-[2.5rem] border border-[var(--border-light)] shadow-sm overflow-hidden flex flex-col">
        {/* Mobile List View */}
        <div className="lg:hidden divide-y divide-[var(--border-light)] overflow-y-auto custom-scrollbar">
          {filteredRequests.map((req) => (
            <div key={req.id} className="p-5 active:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/5 flex items-center justify-center text-accent text-xs font-black">
                    {(req.userName ?? '?').charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-black tracking-tight">{req.userName ?? 'Unknown'}</p>
                    <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">{req.userRole}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest",
                    req.status === 'Approved' ? "bg-green-100 text-green-700" :
                    req.status === 'Rejected' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {req.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-accent">{req.leaveType}</span>
                  <p className="text-[10px] font-black">
                    {new Date(req.fromDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} - {new Date(req.toDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <p className="text-[11px] font-medium opacity-60 line-clamp-2">{req.reason}</p>
                
                <div className="flex items-center justify-between pt-2">
                  <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">{req.totalDays} {req.totalDays === 1 ? 'Day' : 'Days'}</p>
                  
                  {isAdminOrHR && req.status === 'Pending' ? (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateStatus(req.id, 'Approved')}
                        className="px-3 py-2 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => setRejectionModalId(req.id)}
                        className="px-3 py-2 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-[9px] font-bold opacity-20 uppercase tracking-widest">
                      Applied {new Date(req.appliedOn).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredRequests.length === 0 && (
            <div className="p-20 text-center opacity-30">
              <CalendarIcon className="w-12 h-12 mx-auto mb-4" />
              <p className="text-sm font-black uppercase tracking-widest">No leave requests found</p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-light)] bg-slate-50/50">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Employee</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Type</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Duration</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Reason</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-accent/5 flex items-center justify-center text-accent text-xs font-black">
                        {req.userName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-black tracking-tight">{req.userName}</p>
                        <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">{req.userRole}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-accent">{req.leaveType}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black">
                        {new Date(req.fromDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} - {new Date(req.toDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">{req.totalDays} {req.totalDays === 1 ? 'Day' : 'Days'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-[200px]">
                    <p className="text-[10px] font-medium opacity-60 truncate" title={req.reason}>{req.reason}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest",
                        req.status === 'Approved' ? "bg-green-100 text-green-700" :
                        req.status === 'Rejected' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {req.status}
                      </span>
                      {req.status === 'Rejected' && req.rejectionReason && (
                        <div className="group/reason relative">
                          <Info className="w-3.5 h-3.5 text-red-400 cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-[9px] p-2 rounded-xl hidden group-hover/reason:block z-50">
                            {req.rejectionReason}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isAdminOrHR && req.status === 'Pending' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => updateStatus(req.id, 'Approved')}
                          className="px-3 py-1.5 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-green-200 hover:scale-105 active:scale-95 transition-all"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => setRejectionModalId(req.id)}
                          className="px-3 py-1.5 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-red-200 hover:scale-105 active:scale-95 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold opacity-20 uppercase tracking-widest">
                        {new Date(req.appliedOn).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rejection Reason Modal */}
      {rejectionModalId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-lg font-black tracking-tight mb-2">Reject Request</h3>
            <p className="text-xs font-bold opacity-40 mb-6 uppercase tracking-widest">Provide a reason for rejection (optional)</p>
            <textarea 
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-medium focus:outline-none min-h-[100px] mb-6"
              placeholder="e.g. Project deadline approaching..."
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setRejectionModalId(null)}
                className="flex-1 py-3 bg-slate-50 text-[10px] font-black uppercase tracking-widest rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={() => updateStatus(rejectionModalId, 'Rejected', rejectionReason)}
                className="flex-1 py-3 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-200"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {isApplyModalOpen && user && (
        <ApplyLeaveModal 
          user={user}
          onClose={() => setIsApplyModalOpen(false)}
          onSuccess={() => {
            setIsApplyModalOpen(false);
            fetchRequests();
          }}
        />
      )}
    </div>
  );
}
