import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Timer,
  User as UserIcon,
  Briefcase,
  History,
  FileText,
  Loader2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppStore } from '@/src/store';
import { exportToCSV } from '@/src/lib/exportUtils';
import { AttendanceCheckInOutWidget } from '../components/attendance/AttendanceCheckInOutWidget';
import { AttendanceHeatmapCalendar } from '../components/attendance/AttendanceHeatmapCalendar';
import { AttendanceStatus } from '../types';
import { api } from '@/src/lib/api';
import { getSocket } from '@/src/lib/socket';

// Backend getAllAttendance() returns one row per day per employee. The company table wants
// one row per employee with monthly totals + today's punch — aggregate client-side.
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
      });
    }
    const agg = byUser.get(uid);
    if (r.status === 'Present' || r.status === 'Late') agg.presentDays++;
    if (r.status === 'Absent') agg.absentDays++;
    if (r.status === 'Leave') agg.leaveDays++;
    agg.totalHours += r.totalHours || 0;
    if (r.date === todayStr) {
      agg.checkIn = r.checkIn ? new Date(r.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined;
      agg.checkOut = r.checkOut ? new Date(r.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined;
      agg.status = r.status;
      agg.todaysRecordId = r.id;
    }
  }

  return Array.from(byUser.values()).map((a) => ({ ...a, totalHours: Number(a.totalHours.toFixed(1)) }));
}

export function AttendanceManagement() {
  const { user } = useAppStore();
  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR';
  
  const [activeTab, setActiveTab] = useState<'MyAttendance' | 'CompanyAttendance'>(isAdminOrHR ? 'CompanyAttendance' : 'MyAttendance');
  // Default to current month/year — not hardcoded
  const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear,  setSelectedYear]  = useState(() => String(new Date().getFullYear()));
  const [history, setHistory] = useState<any[]>([]);
  const [companyAttendance, setCompanyAttendance] = useState<any[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const months = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];

  const month = `${selectedYear}-${selectedMonth}`;

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear, activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'MyAttendance') {
        const { records } = await api.attendance.mine(month);
        setHistory(records);
      } else {
        const records = await api.attendance.all({ month });
        setCompanyAttendance(aggregateCompanyAttendance(records));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time: any check-in/check-out anywhere broadcasts 'attendance:update' — refresh
  // whichever table is currently open instead of requiring a manual reload.
  useEffect(() => {
    const socket = getSocket();
    const handler = () => fetchData();
    socket?.on('attendance:update', handler);
    return () => {
      socket?.off('attendance:update', handler);
    };
  }, [selectedMonth, selectedYear, activeTab]);

  const handleManualAdjust = async (id: string) => {
    const reason = window.prompt('Reason for this manual attendance adjustment (required):');
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
              <button 
                onClick={() => setActiveTab('CompanyAttendance')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'CompanyAttendance' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-[var(--text)]/40 hover:text-[var(--text)]"
                )}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('MyAttendance')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'MyAttendance' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-[var(--text)]/40 hover:text-[var(--text)]"
                )}
              >
                My Logs
              </button>
            </div>
          )}
          <button 
            onClick={() => exportToCSV(activeTab === 'MyAttendance' ? history : companyAttendance, `Attendance_Logs_${activeTab}`)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-bold shadow-sm hover:border-accent/30 transition-all"
          >
            <Download className="w-4 h-4" />
            Export Logs
          </button>
        </div>
      </div>

      {!isAdminOrHR && <AttendanceCheckInOutWidget onChange={fetchData} />}

      {/* Monthly Summary Cards */}
      {activeTab === 'MyAttendance' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard icon={CheckCircle2} label="Present Days" value={myTotals.present} color="green" />
          <SummaryCard icon={AlertCircle} label="Absent Days" value={myTotals.absent} color="red" />
          <SummaryCard icon={Briefcase} label="Leave Days" value={myTotals.leave} color="blue" />
          <SummaryCard icon={Timer} label="Total Hours" value={`${myTotals.hours.toFixed(1)}h`} color="accent" />
        </div>
      ) : (() => {
          const todayStr = new Date().toISOString().slice(0, 10);
          const totalEmployees = companyAttendance.length;
          const presentToday = companyAttendance.filter(e => e.status === 'Present' || e.status === 'Late').length;
          const absentToday = companyAttendance.filter(e => e.status === 'Absent').length;
          const onLeaveToday = companyAttendance.filter(e => e.status === 'Leave').length;
          const attendancePct = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;
          const avgHours = totalEmployees > 0
            ? (companyAttendance.reduce((s, e) => s + (e.totalHours || 0), 0) / totalEmployees).toFixed(1)
            : '0.0';
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
              <SummaryCard icon={AlertCircle} label="Total Absentees" value={absentToday} color="red" />
              <SummaryCard icon={Briefcase} label="On Leave" value={onLeaveToday} color="blue" />
              <SummaryCard icon={Timer} label="Avg. Work Hours" value={`${avgHours}h`} color="orange" />
            </div>
          );
        })()
      }

      {/* View Switcher Controls */}
      <div className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase opacity-40">Month:</label>
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none"
          >
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase opacity-40">Year:</label>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
        {activeTab === 'CompanyAttendance' && (
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/30" />
            <input 
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-2 pl-10 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all"
              placeholder="Search employee..."
            />
          </div>
        )}
      </div>

      {activeTab === 'MyAttendance' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
             <h2 className="text-sm font-black uppercase tracking-tight">Calendar Heatmap</h2>
             <AttendanceHeatmapCalendar month={selectedMonth} year={selectedYear} history={history} />
          </div>
          <div className="lg:col-span-2 space-y-6">
             <h2 className="text-sm font-black uppercase tracking-tight">Daily Detailed Logs</h2>
             <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
                {/* Mobile Daily Logs */}
                <div className="sm:hidden divide-y divide-[var(--border-light)]">
                  {history.map((log) => (
                    <div key={log.id} className="p-4 active:bg-slate-50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black">{log.date}</span>
                        <StatusBadge status={log.status} />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold opacity-60">
                        <span>{log.checkIn || '--'} → {log.checkOut || '--'}</span>
                        <span className="text-accent">{log.totalHours ? `${log.totalHours}h` : '--'}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Daily Logs */}
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
                      {history.map((log) => (
                        <tr key={log.id} className="hover:bg-[var(--background)]/30 transition-colors">
                          <td className="px-5 py-4 font-black">{log.date}</td>
                          <td className="px-5 py-4 opacity-60">{log.checkIn || '--'}</td>
                          <td className="px-5 py-4 opacity-60">{log.checkOut || '--'}</td>
                          <td className="px-5 py-4 text-accent">{log.totalHours ? `${log.totalHours}h` : '--'}</td>
                          <td className="px-5 py-4">
                            <StatusBadge status={log.status} />
                          </td>
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
           {/* Mobile Company View */}
           <div className="sm:hidden divide-y divide-[var(--border-light)]">
             {companyAttendance.filter(e => e.fullName.toLowerCase().includes(companySearch.toLowerCase())).map((emp) => (
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
                    <div className="opacity-40 uppercase tracking-widest text-[8px]">Monthly stats</div>
                    <div className="text-right flex justify-end gap-2">
                       <span className="text-green-600">{emp.presentDays}P</span>
                       <span className="text-red-600">{emp.absentDays}A</span>
                       <span className="text-accent">{emp.totalHours}h</span>
                    </div>
                 </div>
               </div>
             ))}
           </div>

           {/* Desktop Company View */}
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
                  {companyAttendance.filter(e => e.fullName.toLowerCase().includes(companySearch.toLowerCase())).map((emp) => (
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
                      <td className="px-5 py-4">{emp.checkIn || 'Not in yet'}</td>
                      <td className="px-5 py-4">{emp.checkOut || '--'}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={emp.status} />
                      </td>
                      <td className="px-5 py-4 text-green-600 font-black">{emp.presentDays}</td>
                      <td className="px-5 py-4 text-red-600 font-black">{emp.absentDays}</td>
                      <td className="px-5 py-4 text-blue-600 font-black">{emp.leaveDays}</td>
                      <td className="px-5 py-4 text-accent font-black">{emp.totalHours}h</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                           <button
                             onClick={() => setSelectedMonth(selectedMonth)}
                             className="p-1.5 hover:bg-accent/10 text-[var(--text)]/30 hover:text-accent rounded-lg transition-colors"
                             title="Viewing this month's history — use the Month/Year filters above to browse other periods"
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

function SummaryCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-50 text-green-500',
    red: 'bg-red-50 text-red-500',
    blue: 'bg-blue-50 text-blue-500',
    orange: 'bg-orange-50 text-orange-500',
    accent: 'bg-accent/10 text-accent',
  };

  return (
    <div className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2 rounded-xl", colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-[var(--text)]/50 text-[10px] font-black uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black mt-1">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const styles: Record<AttendanceStatus, string> = {
    Present: 'bg-green-100 text-green-600',
    Late: 'bg-orange-100 text-orange-600',
    Absent: 'bg-red-100 text-red-600',
    Leave: 'bg-blue-100 text-blue-600',
    Weekend: 'bg-slate-100 text-slate-400',
  };

  return (
    <span className={cn(
      "text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter",
      styles[status]
    )}>
      {status}
    </span>
  );
}
