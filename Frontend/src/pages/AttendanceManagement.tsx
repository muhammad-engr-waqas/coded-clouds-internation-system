import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowUpRight,
  Timer,
  Briefcase,
  History,
  FileText,
  Loader2,
  X,
  LogIn,
  LogOut,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppStore } from '@/src/store';
import { exportToCSV } from '@/src/lib/exportUtils';
import { formatDate } from '@/src/lib/formatDate';
import { AttendanceCheckInOutWidget } from '../components/attendance/AttendanceCheckInOutWidget';
import { AttendanceHeatmapCalendar } from '../components/attendance/AttendanceHeatmapCalendar';
import { AttendanceStatus } from '../types';
import { api } from '@/src/lib/api';
import { getSocket } from '@/src/lib/socket';

// ─── Aggregate company records into per-employee summary ──────────────────────
function aggregateCompanyAttendance(records: any[]) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const byUser = new Map<string, any>();

  for (const r of records) {
    const uid = r.userId?.id;
    if (!uid) continue;
    if (!byUser.has(uid)) {
      byUser.set(uid, {
        id: uid,
        fullName: r.userId.fullName,
        department: r.userId.department,
        presentDays: 0,
        absentDays: 0,
        leaveDays: 0,
        totalHours: 0,
        checkIn: undefined,
        checkOut: undefined,
        status: 'Absent',
        todaysRecordId: undefined,
        records: [],   // keep all raw records for history modal
      });
    }
    const agg = byUser.get(uid);
    if (r.status === 'Present' || r.status === 'Late') agg.presentDays++;
    if (r.status === 'Absent') agg.absentDays++;
    if (r.status === 'Leave') agg.leaveDays++;
    agg.totalHours += r.totalHours || 0;
    agg.records.push(r);
    if (r.date === todayStr) {
      agg.checkIn = r.checkIn ? formatDate(r.checkIn, 'time') : undefined;
      agg.checkOut = r.checkOut ? formatDate(r.checkOut, 'time') : undefined;
      agg.status = r.status;
      agg.todaysRecordId = r.id;
    }
  }

  return Array.from(byUser.values()).map(a => ({
    ...a,
    totalHours: Number(a.totalHours.toFixed(1)),
    // Sort records latest first
    records: a.records.sort((x: any, y: any) => new Date(y.date).getTime() - new Date(x.date).getTime()),
  }));
}

// ─── Employee History Modal ───────────────────────────────────────────────────
function EmployeeHistoryModal({
  emp,
  month,
  onClose,
}: {
  emp: any;
  month: string;
  onClose: () => void;
}) {
  const [logs, setLogs]       = useState<any[]>(emp.records ?? []);
  const [loading, setLoading] = useState(false);

  // If records weren't attached (e.g. opened from different context), fetch fresh
  useEffect(() => {
    if (logs.length === 0) {
      setLoading(true);
      api.attendance.forEmployee(emp.id, month)
        .then((data: any) => {
          const arr = Array.isArray(data) ? data : (data.records ?? []);
          setLogs(arr.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, []);

  const presentDays = logs.filter(l => l.status === 'Present' || l.status === 'Late').length;
  const absentDays  = logs.filter(l => l.status === 'Absent').length;
  const leaveDays   = logs.filter(l => l.status === 'Leave').length;
  const totalHours  = logs.reduce((s, l) => s + (l.totalHours || 0), 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="bg-gradient-to-r from-accent to-blue-600 p-6 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-lg">
                {(emp.fullName ?? '?').charAt(0)}
              </div>
              <div>
                <h2 className="text-white font-black text-lg tracking-tight">{emp.fullName}</h2>
                <p className="text-blue-100 text-xs mt-0.5">{emp.department} · Attendance History · {month}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-4 gap-3 mt-5">
            {[
              { label: 'Present',  value: presentDays,            color: 'bg-green-400/30 text-white' },
              { label: 'Absent',   value: absentDays,             color: 'bg-red-400/30 text-white'   },
              { label: 'Leave',    value: leaveDays,              color: 'bg-blue-300/30 text-white'  },
              { label: 'Hrs',      value: `${totalHours.toFixed(1)}h`, color: 'bg-white/20 text-white' },
            ].map(({ label, value, color }) => (
              <div key={label} className={cn('rounded-2xl p-3 text-center', color)}>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-0.5">{label}</p>
                <p className="text-xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-accent" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center opacity-30">
              <Clock className="w-10 h-10 mx-auto mb-3" />
              <p className="text-xs font-black uppercase tracking-widest">No attendance records for this month</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-bold">
              <thead className="bg-[var(--background)]/60 text-[9px] font-black uppercase tracking-widest text-[var(--text)]/40 border-b border-[var(--border-light)] sticky top-0">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">
                    <span className="flex items-center gap-1"><LogIn className="w-3 h-3" /> Check In</span>
                  </th>
                  <th className="px-5 py-3">
                    <span className="flex items-center gap-1"><LogOut className="w-3 h-3" /> Check Out</span>
                  </th>
                  <th className="px-5 py-3">Hours</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)]">
                {logs.map((log, i) => (
                  <tr key={log.id ?? i} className="hover:bg-[var(--background)]/40 transition-colors">
                    <td className="px-5 py-3 font-black">{formatDate(log.date, 'short')}</td>
                    <td className="px-5 py-3">
                      {log.checkIn ? (
                        <span className="text-green-600 font-black">{formatDate(log.checkIn, 'time')}</span>
                      ) : (
                        <span className="opacity-30">--</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {log.checkOut ? (
                        <span className="text-orange-500 font-black">{formatDate(log.checkOut, 'time')}</span>
                      ) : (
                        <span className="opacity-30">--</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-accent font-black">
                      {log.totalHours ? `${log.totalHours}h` : '--'}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={log.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-light)] shrink-0 flex justify-end">
          <button onClick={onClose}
            className="px-5 py-2 bg-accent text-white text-xs font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AttendanceManagement() {
  const { user } = useAppStore();
  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR';

  const [activeTab, setActiveTab]   = useState<'MyAttendance' | 'CompanyAttendance'>(isAdminOrHR ? 'CompanyAttendance' : 'MyAttendance');
  const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear,  setSelectedYear]  = useState(() => String(new Date().getFullYear()));
  const [history, setHistory]             = useState<any[]>([]);
  const [companyAttendance, setCompanyAttendance] = useState<any[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [isLoading, setIsLoading]         = useState(true);
  const [historyEmp, setHistoryEmp]       = useState<any | null>(null); // employee for history modal

  const months = [
    { value: '01', label: 'January'  }, { value: '02', label: 'February' },
    { value: '03', label: 'March'    }, { value: '04', label: 'April'    },
    { value: '05', label: 'May'      }, { value: '06', label: 'June'     },
    { value: '07', label: 'July'     }, { value: '08', label: 'August'   },
    { value: '09', label: 'September'}, { value: '10', label: 'October'  },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ];

  const month = `${selectedYear}-${selectedMonth}`;

  useEffect(() => { fetchData(); }, [selectedMonth, selectedYear, activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'MyAttendance') {
        const res = await api.attendance.mine(month);
        setHistory(Array.isArray(res) ? res : (res.records ?? []));
      } else {
        const records = await api.attendance.all({ month });
        setCompanyAttendance(aggregateCompanyAttendance(Array.isArray(records) ? records : []));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const socket = getSocket();
    const handler = () => fetchData();
    socket?.on('attendance:update', handler);
    return () => { socket?.off('attendance:update', handler); };
  }, [selectedMonth, selectedYear, activeTab]);

  const handleManualAdjust = async (id: string) => {
    const reason = window.prompt('Reason for adjustment (required):');
    if (!reason) return;
    const status = window.prompt('New status (Present / Late / Absent / Leave):', 'Present');
    if (!status) return;
    try {
      await api.attendance.adjust(id, { status, reason });
      fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to adjust attendance');
    }
  };

  const myTotals = history.reduce((acc, curr) => {
    if (curr.status === 'Present' || curr.status === 'Late') acc.present++;
    if (curr.status === 'Absent') acc.absent++;
    if (curr.status === 'Leave') acc.leave++;
    acc.hours += curr.totalHours || 0;
    return acc;
  }, { present: 0, absent: 0, leave: 0, hours: 0 });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* History Modal */}
      {historyEmp && (
        <EmployeeHistoryModal
          emp={historyEmp}
          month={month}
          onClose={() => setHistoryEmp(null)}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance System</h1>
          <p className="text-sm text-[var(--text)]/50 mt-1">
            {isAdminOrHR ? 'Monitor and manage employee attendance' : 'Track your daily check-ins and monthly reports'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdminOrHR && (
            <div className="flex bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] shadow-sm">
              <button onClick={() => setActiveTab('CompanyAttendance')}
                className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'CompanyAttendance' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-[var(--text)]/40 hover:text-[var(--text)]"
                )}>Overview</button>
              <button onClick={() => setActiveTab('MyAttendance')}
                className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'MyAttendance' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-[var(--text)]/40 hover:text-[var(--text)]"
                )}>My Logs</button>
            </div>
          )}
          <button onClick={() => exportToCSV(activeTab === 'MyAttendance' ? history : companyAttendance, `Attendance_Logs_${activeTab}`)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-bold shadow-sm hover:border-accent/30 transition-all">
            <Download className="w-4 h-4" /> Export Logs
          </button>
        </div>
      </div>

      {!isAdminOrHR && <AttendanceCheckInOutWidget onChange={fetchData} />}

      {/* Summary Cards */}
      {activeTab === 'MyAttendance' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard icon={CheckCircle2} label="Present Days" value={myTotals.present} color="green" />
          <SummaryCard icon={AlertCircle}  label="Absent Days"  value={myTotals.absent}  color="red"   />
          <SummaryCard icon={Briefcase}    label="Leave Days"   value={myTotals.leave}   color="blue"  />
          <SummaryCard icon={Timer}        label="Total Hours"  value={`${myTotals.hours.toFixed(1)}h`} color="accent" />
        </div>
      ) : (() => {
        const totalEmployees = companyAttendance.length;
        const presentToday   = companyAttendance.filter(e => e.status === 'Present' || e.status === 'Late').length;
        const absentToday    = companyAttendance.filter(e => e.status === 'Absent').length;
        const onLeaveToday   = companyAttendance.filter(e => e.status === 'Leave').length;
        const attendancePct  = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;
        const avgHours = totalEmployees > 0
          ? (companyAttendance.reduce((s, e) => s + (e.totalHours || 0), 0) / totalEmployees).toFixed(1) : '0.0';
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[var(--text)]/50 text-[10px] font-black uppercase tracking-widest">Attendance %</p>
                <span className="p-1.5 bg-green-50 text-green-500 rounded-lg"><ArrowUpRight className="w-3.5 h-3.5" /></span>
              </div>
              <p className="text-2xl font-black">{attendancePct}%</p>
              <p className="text-[9px] font-bold opacity-30 mt-1 uppercase">Today • {presentToday}/{totalEmployees} Present</p>
            </div>
            <SummaryCard icon={AlertCircle} label="Total Absentees" value={absentToday}  color="red"    />
            <SummaryCard icon={Briefcase}   label="On Leave"        value={onLeaveToday} color="blue"   />
            <SummaryCard icon={Timer}       label="Avg. Work Hours" value={`${avgHours}h`} color="orange" />
          </div>
        );
      })()}

      {/* Filters */}
      <div className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase opacity-40">Month:</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none">
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase opacity-40">Year:</label>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
            className="bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none">
            <option value="2027">2027</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
        {activeTab === 'CompanyAttendance' && (
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/30" />
            <input value={companySearch} onChange={e => setCompanySearch(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-2 pl-10 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all"
              placeholder="Search employee..." />
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'MyAttendance' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <h2 className="text-sm font-black uppercase tracking-tight">Calendar Heatmap</h2>
            <AttendanceHeatmapCalendar month={selectedMonth} year={selectedYear} history={history} />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-sm font-black uppercase tracking-tight">Daily Detailed Logs</h2>
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-[var(--border-light)]">
                {history.map(log => (
                  <div key={log.id} className="p-4 active:bg-slate-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black">{formatDate(log.date, 'short')}</span>
                      <StatusBadge status={log.status} />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold opacity-60">
                      <span>{log.checkIn ? formatDate(log.checkIn, 'time') : '--'} → {log.checkOut ? formatDate(log.checkOut, 'time') : '--'}</span>
                      <span className="text-accent">{log.totalHours ? `${log.totalHours}h` : '--'}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs font-bold">
                  <thead className="bg-[var(--background)]/50 text-[9px] font-black uppercase tracking-widest text-[var(--text)]/40 border-b border-[var(--border-light)]">
                    <tr>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4">Check In</th>
                      <th className="px-5 py-4">Check Out</th>
                      <th className="px-5 py-4">Hours</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-light)]">
                    {history.map(log => (
                      <tr key={log.id} className="hover:bg-[var(--background)]/30 transition-colors">
                        <td className="px-5 py-4 font-black">{formatDate(log.date, 'short')}</td>
                        <td className="px-5 py-4 text-green-600 font-black">{log.checkIn ? formatDate(log.checkIn, 'time') : '--'}</td>
                        <td className="px-5 py-4 text-orange-500 font-black">{log.checkOut ? formatDate(log.checkOut, 'time') : '--'}</td>
                        <td className="px-5 py-4 text-accent">{log.totalHours ? `${log.totalHours}h` : '--'}</td>
                        <td className="px-5 py-4"><StatusBadge status={log.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
          {/* Mobile */}
          <div className="sm:hidden divide-y divide-[var(--border-light)]">
            {companyAttendance.filter(e => e.fullName.toLowerCase().includes(companySearch.toLowerCase())).map(emp => (
              <div key={emp.id} className="p-4 active:bg-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-[10px] font-black">
                      {emp.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-black">{emp.fullName}</p>
                      <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">{emp.department}</p>
                    </div>
                  </div>
                  <StatusBadge status={emp.status} />
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-[10px] font-bold">
                  <div className="opacity-40 uppercase tracking-widest text-[8px]">Today</div>
                  <div className="text-right">{emp.checkIn || 'Not in'} - {emp.checkOut || '--'}</div>
                  <div className="opacity-40 uppercase tracking-widest text-[8px]">Monthly</div>
                  <div className="text-right flex justify-end gap-2">
                    <span className="text-green-600">{emp.presentDays}P</span>
                    <span className="text-red-600">{emp.absentDays}A</span>
                    <span className="text-accent">{emp.totalHours}h</span>
                  </div>
                </div>
                <button onClick={() => setHistoryEmp(emp)}
                  className="mt-3 w-full py-1.5 bg-accent/10 text-accent text-[9px] font-black uppercase tracking-widest rounded-xl">
                  View History
                </button>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs font-bold">
              <thead className="bg-[var(--background)]/50 text-[9px] font-black uppercase tracking-widest text-[var(--text)]/40 border-b border-[var(--border-light)]">
                <tr>
                  <th className="px-5 py-4">Employee</th>
                  <th className="px-5 py-4">Department</th>
                  <th className="px-5 py-4">In Today</th>
                  <th className="px-5 py-4">Out Today</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Present</th>
                  <th className="px-5 py-4">Absent</th>
                  <th className="px-5 py-4">Leave</th>
                  <th className="px-5 py-4">Monthly Hours</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)]">
                {companyAttendance.filter(e => e.fullName.toLowerCase().includes(companySearch.toLowerCase())).map(emp => (
                  <tr key={emp.id} className="hover:bg-[var(--background)]/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-[10px] font-black">
                          {emp.fullName.charAt(0)}
                        </div>
                        <p>{emp.fullName}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 opacity-50">{emp.department}</td>
                    <td className="px-5 py-4 text-green-600 font-black">{emp.checkIn || <span className="opacity-30 text-[var(--text)]">--</span>}</td>
                    <td className="px-5 py-4 text-orange-500 font-black">{emp.checkOut || <span className="opacity-30 text-[var(--text)]">--</span>}</td>
                    <td className="px-5 py-4"><StatusBadge status={emp.status} /></td>
                    <td className="px-5 py-4 text-green-600 font-black">{emp.presentDays}</td>
                    <td className="px-5 py-4 text-red-600 font-black">{emp.absentDays}</td>
                    <td className="px-5 py-4 text-blue-600 font-black">{emp.leaveDays}</td>
                    <td className="px-5 py-4 text-accent font-black">{emp.totalHours}h</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* History button — NOW WORKS */}
                        <button
                          onClick={() => setHistoryEmp(emp)}
                          className="p-1.5 hover:bg-accent/10 text-[var(--text)]/30 hover:text-accent rounded-lg transition-colors"
                          title="View attendance history"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => emp.todaysRecordId ? handleManualAdjust(emp.todaysRecordId) : alert('No attendance record for today to adjust yet.')}
                          className="p-1.5 hover:bg-orange-50 text-[var(--text)]/30 hover:text-orange-600 rounded-lg transition-colors"
                          title="Manual Adjustment"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-50 text-green-500',
    red:   'bg-red-50 text-red-500',
    blue:  'bg-blue-50 text-blue-500',
    orange:'bg-orange-50 text-orange-500',
    accent:'bg-accent/10 text-accent',
  };
  return (
    <div className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={cn('p-2 rounded-xl', colorMap[color])}><Icon className="w-5 h-5" /></div>
      </div>
      <p className="text-[var(--text)]/50 text-[10px] font-black uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black mt-1">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const styles: Record<AttendanceStatus, string> = {
    Present: 'bg-green-100 text-green-600',
    Late:    'bg-orange-100 text-orange-600',
    Absent:  'bg-red-100 text-red-600',
    Leave:   'bg-blue-100 text-blue-600',
    Weekend: 'bg-slate-100 text-slate-400',
  };
  return (
    <span className={cn('text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter', styles[status])}>
      {status}
    </span>
  );
}
