import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckSquare, 
  Briefcase, 
  Clock, 
  ArrowRight,
  Loader2
} from 'lucide-react';
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
  Cell
} from 'recharts';
import { useAppStore } from '@/src/store';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

export function AdminDashboard() {
  const { user } = useAppStore();
  const [workforce, setWorkforce] = useState<any>(null);
  const [taskReport, setTaskReport] = useState<any>(null);
  const [projects, setProjects] = useState<any>(null);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const [w, t, p, leaves] = await Promise.all([
          api.reports.workforce(),
          api.reports.tasks(),
          api.projects.list(),
          api.leave.all(),
        ]);
        if (cancelled) return;
        setWorkforce(w);
        setTaskReport(t);
        setProjects(p);
        setPendingLeaves(leaves.filter((l: any) => l.status === 'Pending').slice(0, 3));
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleGoToReports = () => {
    window.history.pushState({}, '', '/admin/reports');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (isLoading) {
    return (
      <div className="p-20 text-center opacity-40">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
        <p className="font-black uppercase tracking-widest text-sm">Loading dashboard…</p>
      </div>
    );
  }

  const completedTasks = (taskReport?.byStatus || []).find((s: any) => s._id === 'Completed')?.count || 0;
  const totalTasks = (taskReport?.byStatus || []).reduce((sum: number, s: any) => sum + s.count, 0);
  const taskEfficiency = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const kpiData = [
    { label: 'Total Employees', value: String(workforce?.total ?? 0), icon: Users },
    { label: 'Active Projects', value: String(projects?.counts?.inProgress ?? 0), icon: Briefcase },
    { label: 'Task Completion', value: `${taskEfficiency}%`, icon: CheckSquare },
    { label: 'Overdue Tasks', value: String(taskReport?.overdueCount ?? 0), icon: Clock },
  ];

  const taskStatusData = (taskReport?.byStatus || []).map((s: any) => ({ name: s._id, count: s.count }));
  const deptData = (workforce?.byDepartment || []).map((d: any) => ({ name: d._id || 'Unassigned', value: d.count }));
  const topProjects = (projects?.projects || []).slice(0, 3);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Executive Overview</h1>
          <p className="text-[var(--text)]/40 text-xs font-bold uppercase tracking-widest mt-1">Welcome back, {user?.fullName || 'Administrator'}.</p>
        </div>
        <button 
          onClick={handleGoToReports}
          className="w-full sm:w-auto bg-accent text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          View Full Intelligence <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi) => (
          <div key={kpi.label} className="bg-[var(--surface)] p-6 rounded-[2rem] border border-[var(--border-light)] shadow-sm group hover:border-accent/30 transition-all hover:shadow-xl hover:shadow-slate-200/50">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent">
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-accent tracking-tighter mb-1">{kpi.value}</p>
            <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Task Status Card */}
        <div className="lg:col-span-2 bg-[var(--surface)] p-8 rounded-[2.5rem] border border-[var(--border-light)] shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight">Company-Wide Task Status</h3>
                <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Live counts by status</p>
              </div>
           </div>
           <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskStatusData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, opacity: 0.4 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, opacity: 0.4 }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                  <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Headcount Card */}
        <div className="bg-[var(--surface)] p-8 rounded-[2.5rem] border border-[var(--border-light)] shadow-sm flex flex-col">
           <div className="mb-8 text-center">
              <h3 className="text-sm font-black uppercase tracking-tight">Workforce</h3>
              <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Headcount by department</p>
           </div>
           <div className="flex-1 h-64 relative mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deptData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value">
                    {deptData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-black tracking-tighter">{workforce?.total ?? 0}</span>
                <span className="text-[9px] font-black opacity-30 uppercase tracking-widest">Total</span>
              </div>
           </div>
           <div className="space-y-2">
              {deptData.map((dept, index) => (
                <div key={dept.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">{dept.name}</span>
                  </div>
                  <span className="text-[10px] font-black">{dept.value}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Action Board — real pending leave requests awaiting approval */}
        <div className="bg-[var(--surface)] rounded-[2.5rem] border border-[var(--border-light)] shadow-sm overflow-hidden flex flex-col">
           <div className="p-8 border-b border-[var(--border-light)] flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-tight">Action Board</h3>
              <span className="bg-red-50 text-red-500 text-[10px] font-black px-3 py-1 rounded-xl uppercase tracking-widest">{pendingLeaves.length} Pending</span>
           </div>
           <div className="divide-y divide-[var(--border-light)]">
              {pendingLeaves.length === 0 ? (
                <p className="p-8 text-center text-xs font-bold opacity-40">No pending leave requests.</p>
              ) : (
                pendingLeaves.map((leave) => (
                  <div key={leave.id} className="p-6 hover:bg-slate-50 transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-2">
                       <span className="text-[9px] font-black uppercase tracking-widest text-accent">Leave</span>
                       <span className="text-[9px] font-bold opacity-30">{new Date(leave.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <h4 className="text-sm font-black tracking-tight group-hover:text-accent transition-colors">Approve Leave: {leave.userId?.fullName}</h4>
                    <p className="text-[10px] font-medium opacity-40 mt-1">{leave.leaveType} • {leave.totalDays} day(s)</p>
                  </div>
                ))
              )}
           </div>
        </div>

        {/* Project Health Board — real projects */}
        <div className="bg-[var(--surface)] p-8 rounded-[2.5rem] border border-[var(--border-light)] shadow-sm">
           <div className="mb-8">
              <h3 className="text-sm font-black uppercase tracking-tight">Portfolio Health</h3>
              <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Active projects status monitoring</p>
           </div>
           {topProjects.length === 0 ? (
             <p className="text-center text-xs font-bold opacity-40 py-8">No projects yet.</p>
           ) : (
           <div className="space-y-8">
              {topProjects.map((project: any) => {
                const color = project.status === 'Completed' ? '#10b981' : project.status === 'In Progress' ? '#0ea5e9' : '#f59e0b';
                return (
                <div key={project.id} className="space-y-3">
                   <div className="flex items-center justify-between">
                      <span className="text-xs font-black tracking-tight">{project.name}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>{project.status}</span>
                   </div>
                   <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${project.progress}%`, backgroundColor: color }} />
                   </div>
                   <div className="flex justify-between text-[9px] font-black opacity-30 uppercase tracking-widest">
                      <span>{project.client}</span>
                      <span>{project.progress}%</span>
                   </div>
                </div>
              );})}
           </div>
           )}
        </div>
      </div>
    </div>
  );
}
