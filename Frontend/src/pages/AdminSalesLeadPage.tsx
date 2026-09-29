/**
 * AdminSalesLeadPage.tsx
 * Admin CRM panel:
 *  - Top dashboard cards + bar/pie charts (Recharts)
 *  - Filter bar: Salesperson, Date range, Status, Source, City, Industry, Search
 *  - Per-salesperson sidebar tabs
 *  - Full Excel-style grid (all leads) — reuses SalesLeadPage component
 *  - Export filtered data to CSV
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  XAxis, YAxis, Legend,
} from 'recharts';
import {
  Users, TrendingUp, Clock, CheckCircle2, X as XIcon,
  Download, RefreshCw, AlertCircle, Loader2, Filter,
  ChevronDown, Trophy,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';
import { LeadStats, User } from '@/src/types';
import { SalesLeadPage } from './SalesLeadPage';

// ─── Constants ─────────────────────────────────────────────────────────────────
const LEAD_STATUSES = [
  'New', 'Contacted', 'Follow-up', 'Interested', 'Meeting Scheduled',
  'Proposal Sent', 'Negotiation', 'Won', 'Lost', 'Not Interested',
];

const LEAD_SOURCES = [
  'Website', 'Facebook', 'Instagram', 'LinkedIn', 'WhatsApp',
  'Referral', 'Cold Call', 'Walk-in', 'Other',
];

const STATUS_COLORS: Record<string, string> = {
  'New':               '#3b82f6',
  'Contacted':         '#6366f1',
  'Follow-up':         '#eab308',
  'Interested':        '#06b6d4',
  'Meeting Scheduled': '#a855f7',
  'Proposal Sent':     '#f97316',
  'Negotiation':       '#f59e0b',
  'Won':               '#22c55e',
  'Lost':              '#ef4444',
  'Not Interested':    '#9ca3af',
};

const DATE_RANGES = [
  { label: 'Today',      value: 'today' },
  { label: 'Yesterday',  value: 'yesterday' },
  { label: 'This Week',  value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Custom',     value: 'custom' },
  { label: 'All Time',   value: 'all' },
];

function dateRangeToParams(range: string, customFrom: string, customTo: string) {
  const today = new Date();
  const pad   = (n: number) => String(n).padStart(2, '0');
  const fmt   = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  if (range === 'today') {
    const s = fmt(today);
    return { dateFrom: s, dateTo: s };
  }
  if (range === 'yesterday') {
    const y = new Date(today); y.setDate(today.getDate() - 1);
    const s = fmt(y);
    return { dateFrom: s, dateTo: s };
  }
  if (range === 'week') {
    const start = new Date(today); start.setDate(today.getDate() - today.getDay());
    return { dateFrom: fmt(start), dateTo: fmt(today) };
  }
  if (range === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { dateFrom: fmt(start), dateTo: fmt(today) };
  }
  if (range === 'custom') {
    return { dateFrom: customFrom, dateTo: customTo };
  }
  return {}; // all time
}

// ─── Small stat card ───────────────────────────────────────────────────────────
function Card({ label, value, sub, color = 'blue', icon: Icon }: {
  label: string; value: string | number; sub?: string;
  color?: string; icon?: React.ElementType;
}) {
  const bg = color === 'green'  ? 'bg-green-50  border-green-100'
           : color === 'red'    ? 'bg-red-50    border-red-100'
           : color === 'yellow' ? 'bg-yellow-50 border-yellow-100'
           : color === 'purple' ? 'bg-purple-50 border-purple-100'
           : color === 'orange' ? 'bg-orange-50 border-orange-100'
           : 'bg-blue-50 border-blue-100';
  const ic = color === 'green'  ? 'bg-green-100  text-green-600'
           : color === 'red'    ? 'bg-red-100    text-red-500'
           : color === 'yellow' ? 'bg-yellow-100 text-yellow-600'
           : color === 'purple' ? 'bg-purple-100 text-purple-600'
           : color === 'orange' ? 'bg-orange-100 text-orange-600'
           : 'bg-blue-100 text-blue-600';
  return (
    <div className={cn('p-4 rounded-2xl border shadow-sm', bg)}>
      {Icon && (
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-3', ic)}>
          <Icon className="w-4 h-4" />
        </div>
      )}
      <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">{label}</p>
      <p className="text-2xl font-black">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-[10px] opacity-40 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Dropdown helper ──────────────────────────────────────────────────────────
function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[9px] font-black uppercase tracking-widest opacity-50">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-bold px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function AdminSalesLeadPage() {
  // ── Salesperson tab state ────────────────────────────────────────────────
  const [salespeople, setSalespeople]   = useState<User[]>([]);
  const [activeTab,   setActiveTab]     = useState<'all' | string>('all');

  // ── Filter state ─────────────────────────────────────────────────────────
  const [filterSalesperson, setFilterSalesperson] = useState('all');
  const [dateRange,          setDateRange]         = useState('all');
  const [customFrom,         setCustomFrom]        = useState('');
  const [customTo,           setCustomTo]          = useState('');
  const [filterStatus,       setFilterStatus]      = useState('');
  const [filterSource,       setFilterSource]      = useState('');
  const [filterCity,         setFilterCity]        = useState('');
  const [filterIndustry,     setFilterIndustry]    = useState('');
  const [searchText,         setSearchText]        = useState('');
  const [industries,         setIndustries]        = useState<string[]>([]);

  // ── Data state ────────────────────────────────────────────────────────────
  const [stats,   setStats]   = useState<LeadStats | null>(null);
  const [leads,   setLeads]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // Build query params from filters
  const buildParams = useCallback((): Record<string, string> => {
    const dateParams = dateRangeToParams(dateRange, customFrom, customTo);
    const params: Record<string, string> = { limit: '5000', ...dateParams };

    const sp = activeTab !== 'all' ? activeTab : (filterSalesperson !== 'all' ? filterSalesperson : '');
    if (sp)             params.assignedTo = sp;
    if (filterStatus)   params.status     = filterStatus;
    if (filterSource)   params.source     = filterSource;
    if (filterCity)     params.city       = filterCity;
    if (filterIndustry) params.industry   = filterIndustry;
    if (searchText)     params.search     = searchText;
    return params;
  }, [activeTab, filterSalesperson, dateRange, customFrom, customTo,
      filterStatus, filterSource, filterCity, filterIndustry, searchText]);

  // ── Fetch salespeople list once ────────────────────────────────────────
  useEffect(() => {
    api.salesLeads.salespeople().then((data: any) => setSalespeople(data));
    api.salesLeads.industries().then((data: any) => setIndustries(Array.isArray(data) ? data : []));
  }, []);

  // ── Fetch leads + stats when filters change ────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = buildParams();
      const [leadsRes, statsRes] = await Promise.all([
        api.salesLeads.list(params),
        api.salesLeads.stats(params),
      ]);
      setLeads(leadsRes.leads ?? leadsRes);
      setStats(statsRes);
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived chart data ─────────────────────────────────────────────────
  const statusChartData = useMemo(() => {
    if (!stats) return [];
    return LEAD_STATUSES
      .filter(s => (stats.byStatus[s] ?? 0) > 0)
      .map(s => ({ name: s, value: stats.byStatus[s] ?? 0, color: STATUS_COLORS[s] }));
  }, [stats]);

  const leaderboardData = useMemo(() => {
    if (!stats?.leaderboard) return [];
    return stats.leaderboard.slice(0, 10);
  }, [stats]);

  // ── Export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = [
      'Lead ID','Date','Company Name','Contact Person','Phone','Email',
      'City','Industry','Source','Requirement','Lead Status',
      'Follow-up Date','Assigned To','Remarks',
    ];
    const lines = leads.map((l: any) => [
      l.leadId, l.date?.slice(0,10), l.companyName, l.contactPerson,
      l.phone, l.email, l.city, l.industry, l.source, l.requirement,
      l.leadStatus, l.followUpDate?.slice(0,10) ?? '',
      typeof l.assignedTo === 'object' ? l.assignedTo.fullName : l.assignedTo,
      l.remarks,
    ].map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(','));

    const csv  = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `all-leads-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilterSalesperson('all'); setDateRange('all');
    setCustomFrom(''); setCustomTo('');
    setFilterStatus(''); setFilterSource('');
    setFilterCity(''); setFilterIndustry('');
    setSearchText('');
  };

  // ── Salesperson for current tab ────────────────────────────────────────
  const tabPerson = activeTab !== 'all'
    ? salespeople.find(s => s.id === activeTab)
    : null;

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Page title */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black">Sales CRM — Admin Panel</h1>
          <p className="text-sm text-[var(--text)]/50 mt-1">All salespeople · All leads · Full analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs font-bold hover:border-blue-300 transition-all disabled:opacity-50">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto"><XIcon className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── Salesperson sidebar tabs ──────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => { setActiveTab('all'); setFilterSalesperson('all'); }}
          className={cn(
            'px-4 py-2 text-xs font-black rounded-xl whitespace-nowrap transition-all',
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
              : 'bg-[var(--surface)] border border-[var(--border)] hover:border-blue-300'
          )}
        >
          All Salespeople
        </button>
        {salespeople.map(sp => (
          <button
            key={sp.id}
            onClick={() => { setActiveTab(sp.id); setFilterSalesperson(sp.id); }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl whitespace-nowrap transition-all',
              activeTab === sp.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-[var(--surface)] border border-[var(--border)] hover:border-blue-300'
            )}
          >
            <div className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-[9px] font-black">
              {sp.fullName.charAt(0)}
            </div>
            {sp.fullName}
          </button>
        ))}
      </div>

      {/* ── Dashboard Cards ───────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card label="Total All Time"  value={stats.total.all}   icon={Users}         />
          <Card label="Today"           value={stats.total.today} icon={TrendingUp}     />
          <Card label="This Week"       value={stats.total.week}  color="purple"        />
          <Card label="This Month"      value={stats.total.month} color="orange"        />
          <Card label="Follow-ups Due"  value={stats.followUpPending} color="yellow" icon={Clock} />
          <Card label="Updated Today"   value={stats.updatedToday}    color="purple"    />
          <Card label="Won"  value={stats.byStatus['Won']  ?? 0} color="green" icon={CheckCircle2} />
          <Card label="Lost" value={stats.byStatus['Lost'] ?? 0} color="red"           />
        </div>
      )}

      {/* ── Charts row ────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar chart — status breakdown */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
            <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-4">Leads by Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusChartData} margin={{ top: 0, right: 10, left: -20, bottom: 40 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, fontWeight: 700, borderRadius: 8 }}
                  formatter={(v: any) => [v, 'Leads']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {statusChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart — status distribution */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
            <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-4">Status Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 11, fontWeight: 700, borderRadius: 8 }}
                  formatter={(v: any, name: any) => [v, name]}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Leaderboard ───────────────────────────────────────────────── */}
      {leaderboardData.length > 0 && activeTab === 'all' && (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
          <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" /> Leaderboard
          </h3>
          <div className="space-y-2">
            {leaderboardData.map((person: any, i) => (
              <div key={person._id} className="flex items-center gap-3">
                <span className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0',
                  i === 0 ? 'bg-yellow-100 text-yellow-600' :
                  i === 1 ? 'bg-gray-100 text-gray-500' :
                  i === 2 ? 'bg-orange-100 text-orange-600' :
                  'bg-blue-50 text-blue-400'
                )}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-black truncate">{person.fullName}</span>
                    <span className="text-xs font-black text-blue-600 shrink-0 ml-2">{person.count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.round((person.count / (leaderboardData[0]?.count || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filter bar ───────────────────────────────────────────────── */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 opacity-40" />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Filters</span>
          <button onClick={clearFilters}
            className="ml-auto text-[10px] font-black text-blue-500 hover:text-blue-700 transition-colors">
            Clear All
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          {/* Salesperson — FIRST per spec */}
          <FilterSelect
            label="Salesperson"
            value={filterSalesperson}
            onChange={v => { setFilterSalesperson(v); setActiveTab(v === 'all' ? 'all' : v); }}
            options={[
              { label: 'All', value: 'all' },
              ...salespeople.map(s => ({ label: s.fullName, value: s.id })),
            ]}
          />

          {/* Date range */}
          <FilterSelect
            label="Date Range"
            value={dateRange}
            onChange={setDateRange}
            options={DATE_RANGES}
          />

          {/* Custom date inputs */}
          {dateRange === 'custom' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-50">From</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-bold px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-50">To</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-bold px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </>
          )}

          {/* Status */}
          <FilterSelect
            label="Lead Status"
            value={filterStatus}
            onChange={setFilterStatus}
            options={[{ label: 'All Statuses', value: '' }, ...LEAD_STATUSES.map(s => ({ label: s, value: s }))]}
          />

          {/* Source */}
          <FilterSelect
            label="Source"
            value={filterSource}
            onChange={setFilterSource}
            options={[{ label: 'All Sources', value: '' }, ...LEAD_SOURCES.map(s => ({ label: s, value: s }))]}
          />

          {/* Industry */}
          <FilterSelect
            label="Industry"
            value={filterIndustry}
            onChange={setFilterIndustry}
            options={[{ label: 'All Industries', value: '' }, ...industries.map(s => ({ label: s, value: s }))]}
          />

          {/* City */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black uppercase tracking-widest opacity-50">City</label>
            <input
              type="text"
              placeholder="Filter city…"
              value={filterCity}
              onChange={e => setFilterCity(e.target.value)}
              className="bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-bold px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 w-28"
            />
          </div>

          {/* Search */}
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-[9px] font-black uppercase tracking-widest opacity-50">Search</label>
            <input
              type="text"
              placeholder="Company, contact, phone, email…"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-bold px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
      </div>

      {/* ── Per-salesperson grid or all-leads grid ─────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : activeTab !== 'all' && tabPerson ? (
        /* Single salesperson view — reuse SalesLeadPage */
        <SalesLeadPage
          viewUserId={tabPerson.id}
          viewUserName={tabPerson.fullName}
        />
      ) : (
        /* All-leads grid */
        <AllLeadsGrid leads={leads} onRefresh={fetchAll} />
      )}
    </div>
  );
}

// ─── All-leads read grid (Admin view, with inline edit + reassign) ──────────────
const ALL_COLS = [
  { key: 'leadId',        label: 'Lead ID',       width: 100 },
  { key: 'date',          label: 'Date',           width: 110 },
  { key: 'companyName',   label: 'Company',        width: 160 },
  { key: 'contactPerson', label: 'Contact',        width: 140 },
  { key: 'phone',         label: 'Phone',          width: 120 },
  { key: 'email',         label: 'Email',          width: 170 },
  { key: 'city',          label: 'City',           width: 100 },
  { key: 'industry',      label: 'Industry',       width: 120 },
  { key: 'source',        label: 'Source',         width: 110 },
  { key: 'requirement',   label: 'Requirement',    width: 180 },
  { key: 'leadStatus',    label: 'Status',         width: 140 },
  { key: 'followUpDate',  label: 'Follow-up',      width: 110 },
  { key: 'assignedTo',    label: 'Assigned To',    width: 140 },
  { key: 'remarks',       label: 'Remarks',        width: 180 },
];

const LEAD_STATUS_COLORS: Record<string, string> = {
  'New':               'bg-blue-100 text-blue-700',
  'Contacted':         'bg-indigo-100 text-indigo-700',
  'Follow-up':         'bg-yellow-100 text-yellow-700',
  'Interested':        'bg-cyan-100 text-cyan-700',
  'Meeting Scheduled': 'bg-purple-100 text-purple-700',
  'Proposal Sent':     'bg-orange-100 text-orange-700',
  'Negotiation':       'bg-amber-100 text-amber-700',
  'Won':               'bg-green-100 text-green-700',
  'Lost':              'bg-red-100 text-red-700',
  'Not Interested':    'bg-gray-100 text-gray-500',
};

function AllLeadsGrid({ leads, onRefresh }: { leads: any[]; onRefresh: () => void }) {
  const [sortCol, setSortCol]   = useState<string>('');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc');
  const [colWidths, setColWidths] = useState<number[]>(ALL_COLS.map(c => c.width));
  const [page,    setPage]      = useState(1);
  const PAGE_SIZE = 100;

  const toggleSort = (key: string) => {
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(key); setSortDir('asc'); }
    setPage(1);
  };

  const sorted = useMemo(() => {
    if (!sortCol) return leads;
    return [...leads].sort((a, b) => {
      const av = String((a as any)[sortCol] ?? '').toLowerCase();
      const bv = String((b as any)[sortCol] ?? '').toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [leads, sortCol, sortDir]);

  const paged      = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  const onResizeStart = (ci: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX; const startW = colWidths[ci];
    const onMove = (ev: MouseEvent) => setColWidths(prev => {
      const n = [...prev]; n[ci] = Math.max(60, startW + ev.clientX - startX); return n;
    });
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  };

  const rowBg = (lead: any) => {
    if (!lead.followUpDate) return '';
    const today = new Date(); today.setHours(0,0,0,0);
    const fu    = new Date(lead.followUpDate); fu.setHours(0,0,0,0);
    const done  = ['Won','Lost','Not Interested'].includes(lead.leadStatus ?? '');
    if (done) return '';
    if (fu < today)                       return 'bg-red-50';
    if (fu.getTime() === today.getTime()) return 'bg-yellow-50';
    return '';
  };

  if (leads.length === 0) {
    return (
      <div className="text-center py-20 opacity-30">
        <TrendingUp className="w-10 h-10 mx-auto mb-3" />
        <p className="text-xs font-black uppercase tracking-widest">No leads match the current filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold opacity-50">{sorted.length.toLocaleString()} leads</p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-xs font-bold">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2 py-1 border border-[var(--border)] rounded-lg disabled:opacity-40">←</button>
            <span>{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-2 py-1 border border-[var(--border)] rounded-lg disabled:opacity-40">→</button>
          </div>
        )}
      </div>

      <div className="overflow-auto rounded-2xl border border-[var(--border)] shadow-sm" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        <table className="border-collapse text-xs" style={{ tableLayout: 'fixed', minWidth: colWidths.reduce((s, w) => s + w, 40) }}>
          <thead className="sticky top-0 z-10 bg-slate-100">
            <tr>
              <th className="w-10 px-2 py-3 border-b border-r border-slate-200 text-[9px] font-black text-slate-400">#</th>
              {ALL_COLS.map((col, ci) => (
                <th
                  key={col.key}
                  className="relative px-3 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-r border-slate-200 select-none cursor-pointer hover:bg-slate-200 transition-colors"
                  style={{ width: colWidths[ci], minWidth: colWidths[ci] }}
                  onClick={() => toggleSort(col.key)}
                >
                  {col.label}
                  {sortCol === col.key && <span className="ml-1 opacity-60">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  <div className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-300"
                    onMouseDown={e => { e.stopPropagation(); onResizeStart(ci, e); }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-[var(--surface)]">
            {paged.map((lead: any, ri) => (
              <tr key={lead.id ?? lead._id ?? ri} className={cn('hover:bg-blue-50/20 transition-colors', rowBg(lead))}>
                <td className="px-2 py-1.5 text-center text-[10px] text-slate-400 border-b border-r border-slate-100 font-bold">
                  {(page - 1) * PAGE_SIZE + ri + 1}
                </td>
                {ALL_COLS.map((col, ci) => {
                  let display: React.ReactNode = '';
                  const val = col.key === 'assignedTo'
                    ? (typeof lead.assignedTo === 'object' ? lead.assignedTo?.fullName : lead.assignedTo)
                    : (lead as any)[col.key] ?? '';

                  if (col.key === 'leadStatus' && val) {
                    display = (
                      <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full', LEAD_STATUS_COLORS[val] || 'bg-gray-100')}>
                        {val}
                      </span>
                    );
                  } else if (col.key === 'leadId') {
                    display = <span className="text-blue-600 font-black">{String(val)}</span>;
                  } else if ((col.key === 'date' || col.key === 'followUpDate') && val) {
                    display = String(val).slice(0, 10);
                  } else {
                    display = String(val ?? '');
                  }

                  return (
                    <td
                      key={col.key}
                      className="border-b border-r border-slate-100 px-2 py-1.5"
                      style={{ width: colWidths[ci], minWidth: colWidths[ci] }}
                    >
                      <div className="truncate">{display}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
