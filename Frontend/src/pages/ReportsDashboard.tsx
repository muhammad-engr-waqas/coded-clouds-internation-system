import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
} from 'recharts';
import { 
  Users, 
  CheckSquare, 
  Calendar, 
  Briefcase, 
  CreditCard, 
  Download,
  Filter,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { exportToCSV } from '@/src/lib/exportUtils';
import { api } from '@/src/lib/api';

// NOTE: this dashboard shows only numbers the backend actually computes from the database
// (GET /api/reports/*). Earlier drafts of this page rendered a fabricated "leaderboard" and
// invented trend lines that had no corresponding aggregation on the backend — per the
// project's own "no fake dashboard data" requirement, those were removed rather than wired
// to fake data. If month-over-month trends or an engagement leaderboard are wanted, that
// needs a real aggregation added to reportController.js first.

export default function ReportsDashboard() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [workforce, setWorkforce] = useState<any>(null);
  const [tasks, setTasks] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [leave, setLeave] = useState<any>(null);
  const [projects, setProjects] = useState<any>(null);
  const [payroll, setPayroll] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReportData();
  }, [month]);

  const fetchReportData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [w, t, a, l, p, pr] = await Promise.all([
        api.reports.workforce(),
        api.reports.tasks(),
        api.reports.attendance(month),
        api.reports.leave(),
        api.reports.projects(),
        api.reports.payroll(month),
      ]);
      setWorkforce(w);
      setTasks(t);
      setAttendance(a);
      setLeave(l);
      setProjects(p);
      setPayroll(pr);
    } catch (err: any) {
      setError(err?.message || 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

  const Card = ({ title, icon: Icon, children, onExport }: any) => (
    <div className="bg-[var(--surface)] rounded-[2.5rem] border border-[var(--border-light)] shadow-sm overflow-hidden flex flex-col p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight">{title}</h3>
            <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Live from the database</p>
          </div>
        </div>
        {onExport && (
          <button 
            onClick={onExport}
            className="p-3 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-accent"
          >
            <Download className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-20 text-center opacity-40">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
        <p className="font-black uppercase tracking-widest text-sm">Compiling analytics from the database…</p>
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-50 text-red-600 text-sm font-bold p-6 rounded-2xl border border-red-100">{error}</div>;
  }

  const deptData = (workforce?.byDepartment || []).map((d: any) => ({ name: d._id || 'Unassigned', count: d.count }));
  const taskStatusData = (tasks?.byStatus || []).map((t: any) => ({ name: t._id, count: t.count }));
  const attendanceStatusData = (attendance?.byStatus || []).map((a: any) => ({ name: a._id, count: a.count }));
  const projectStatusData = (projects?.byStatus || []).map((p: any) => ({ name: p._id, count: p.count }));

  return (
    <div className="space-y-8 pb-10">
      {/* Top Filter Bar */}
      <div className="bg-[var(--surface)] rounded-[2.5rem] border border-[var(--border-light)] shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="hidden sm:block">
          <h1 className="text-xl font-black tracking-tighter">Business Intelligence</h1>
          <p className="text-xs font-bold opacity-30 mt-0.5">Live analytics computed from the database.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-2xl pl-10 pr-4 py-2.5 text-xs font-black uppercase tracking-widest focus:outline-none"
            />
          </div>
          <button 
            onClick={() => exportToCSV(
              [
                ...deptData.map((d: any) => ({ report: 'Workforce', ...d })),
                ...taskStatusData.map((d: any) => ({ report: 'Tasks', ...d })),
                ...attendanceStatusData.map((d: any) => ({ report: 'Attendance', ...d })),
              ],
              'CCIMS_Full_Report'
            )}
            className="px-6 py-2.5 bg-accent text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/20 hover:scale-105 transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Workforce Report */}
        <Card 
          title="Workforce Composition" 
          icon={Users}
          onExport={() => exportToCSV(deptData, 'Workforce_By_Dept')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
            <div className="h-64">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-4 text-center">Headcount by Dept</p>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deptData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="count" nameKey="name">
                    {deptData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-3xl border border-[var(--border-light)]">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">Total Workforce</p>
                <h4 className="text-3xl font-black tracking-tighter">{workforce?.total ?? 0}</h4>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Active</p>
                  <p className="text-xl font-black">{workforce?.active ?? 0}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Suspended</p>
                  <p className="text-xl font-black">{workforce?.suspended ?? 0}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Separated</p>
                  <p className="text-xl font-black">{workforce?.separated ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Task Report */}
        <Card 
          title="Productivity & Tasks" 
          icon={CheckSquare}
          onExport={() => exportToCSV(taskStatusData, 'Tasks_By_Status')}
        >
          <div className="h-64 mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskStatusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, opacity: 0.4 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, opacity: 0.4 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between bg-slate-50 p-6 rounded-3xl border border-[var(--border-light)]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Overdue Tasks</p>
              <h4 className="text-2xl font-black text-red-500">{tasks?.overdueCount ?? 0}</h4>
            </div>
          </div>
        </Card>

        {/* Payroll */}
        <Card 
          title="Payroll — This Month" 
          icon={CreditCard}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-slate-900 rounded-3xl text-white shadow-xl shadow-slate-200 col-span-2">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Total Net Payroll Cost</p>
              <h4 className="text-4xl font-black tracking-tighter">PKR {(payroll?.totalCost ?? 0).toLocaleString()}</h4>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-[var(--border-light)]">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Paid</p>
              <p className="text-lg font-black text-green-600">PKR {(payroll?.paid ?? 0).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-[var(--border-light)]">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Pending</p>
              <p className="text-lg font-black text-orange-500">PKR {(payroll?.pending ?? 0).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-[var(--border-light)]">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Total Bonuses</p>
              <p className="text-lg font-black">PKR {(payroll?.totalBonus ?? 0).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-[var(--border-light)]">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Total Deductions</p>
              <p className="text-lg font-black">PKR {(payroll?.totalDeductions ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </Card>

        {/* Attendance & Leave */}
        <Card 
          title="Attendance & Leave" 
          icon={Calendar}
          onExport={() => exportToCSV(attendanceStatusData, 'Attendance_By_Status')}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {attendanceStatusData.map((s: any, i: number) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-[var(--border-light)] text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1">{s.name}</p>
                  <h4 className="text-xl font-black">{s.count}</h4>
                </div>
              ))}
              {attendanceStatusData.length === 0 && (
                <p className="col-span-3 text-center text-xs opacity-40 py-6">No attendance records for this month yet.</p>
              )}
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-[var(--border-light)] flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Total Hours Logged</p>
              <p className="text-lg font-black">{(attendance?.totalHours ?? 0).toFixed?.(1) ?? attendance?.totalHours ?? 0}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(leave?.byStatus || []).map((s: any, i: number) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-[var(--border-light)] flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Leave: {s._id}</p>
                  <p className="text-lg font-black">{s.count}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Projects */}
        <Card 
          title="Project Status" 
          icon={Briefcase}
          onExport={() => exportToCSV(projectStatusData, 'Projects_By_Status')}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={projectStatusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="count" nameKey="name">
                  {projectStatusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
