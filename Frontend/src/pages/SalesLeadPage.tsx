/**
 * SalesLeadPage.tsx
 * Excel-style editable grid for Sales users + mini dashboard cards.
 * Each salesperson sees ONLY their own leads.
 * Admin also lands here when viewing a single salesperson's page (via AdminSalesLeadPage tabs).
 */
import React, {
  useState, useEffect, useRef, useCallback, useMemo, KeyboardEvent, ClipboardEvent,
} from 'react';
import {
  Plus, Download, Upload, Trash2, Copy, Save, RefreshCw,
  AlertCircle, Loader2, CheckCircle2, Clock, TrendingUp, Users,
  ChevronDown, X, Activity,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';
import { useAppStore } from '@/src/store';
import { SalesLead, LeadStatus, LeadSource, LeadStats } from '@/src/types';

// ─── Constants ─────────────────────────────────────────────────────────────────
const LEAD_STATUSES: LeadStatus[] = [
  'New', 'Contacted', 'Follow-up', 'Interested', 'Meeting Scheduled',
  'Proposal Sent', 'Negotiation', 'Won', 'Lost', 'Not Interested',
];

const LEAD_SOURCES: LeadSource[] = [
  'Website', 'Facebook', 'Instagram', 'LinkedIn', 'WhatsApp',
  'Referral', 'Cold Call', 'Walk-in', 'Other',
];

const STATUS_COLORS: Record<string, string> = {
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

// Column definitions — order matches spec exactly
const COLUMNS = [
  { key: 'leadId',        label: 'Lead ID',       width: 100, readOnly: true },
  { key: 'date',          label: 'Date',           width: 110 },
  { key: 'companyName',   label: 'Company Name',   width: 160 },
  { key: 'contactPerson', label: 'Contact Person', width: 150 },
  { key: 'phone',         label: 'Phone',          width: 130 },
  { key: 'email',         label: 'Email',          width: 180 },
  { key: 'city',          label: 'City',           width: 110 },
  { key: 'industry',      label: 'Industry',       width: 130 },
  { key: 'source',        label: 'Source',         width: 120, dropdown: 'source' },
  { key: 'requirement',   label: 'Requirement',    width: 200 },
  { key: 'leadStatus',    label: 'Lead Status',    width: 150, dropdown: 'status' },
  { key: 'followUpDate',  label: 'Follow-up Date', width: 130, isDate: true },
  { key: 'assignedTo',    label: 'Assigned To',    width: 140, readOnly: true },
  { key: 'remarks',       label: 'Remarks',        width: 220 },
];

// ─── Empty row factory ─────────────────────────────────────────────────────────
function emptyRow(assignedToName: string): Partial<SalesLead> {
  return {
    id: '',
    leadId: '—',
    date: new Date().toISOString().slice(0, 10),
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    city: '',
    industry: '',
    source: '',
    requirement: '',
    leadStatus: 'New',
    followUpDate: null,
    assignedTo: assignedToName as any,
    remarks: '',
  } as any;
}

// ─── Row-status helpers ────────────────────────────────────────────────────────
function rowBg(lead: Partial<SalesLead>): string {
  if (!lead.followUpDate) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fu    = new Date(lead.followUpDate); fu.setHours(0, 0, 0, 0);
  const done  = ['Won', 'Lost', 'Not Interested'].includes(lead.leadStatus ?? '');
  if (done) return '';
  if (fu < today)                              return 'bg-red-50   border-l-4 border-red-400';
  if (fu.getTime() === today.getTime())        return 'bg-yellow-50 border-l-4 border-yellow-400';
  return '';
}

// ─── Mini stat card ────────────────────────────────────────────────────────────
function StatCard({ label, value, color = 'blue', icon: Icon }: {
  label: string; value: number; color?: string; icon?: React.ElementType;
}) {
  const bg  = color === 'green'  ? 'bg-green-50  border-green-100'
            : color === 'red'    ? 'bg-red-50    border-red-100'
            : color === 'yellow' ? 'bg-yellow-50 border-yellow-100'
            : color === 'purple' ? 'bg-purple-50 border-purple-100'
            : color === 'orange' ? 'bg-orange-50 border-orange-100'
            : 'bg-blue-50 border-blue-100';
  const ic  = color === 'green'  ? 'bg-green-100  text-green-600'
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
      <p className="text-2xl font-black">{value.toLocaleString()}</p>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
interface SalesLeadPageProps {
  /** If provided, page is in "admin-view" mode for a specific salesperson */
  viewUserId?: string;
  viewUserName?: string;
}

export function SalesLeadPage({ viewUserId, viewUserName }: SalesLeadPageProps = {}) {
  const { user } = useAppStore();

  const [rows,        setRows]        = useState<Partial<SalesLead>[]>([]);
  const [stats,       setStats]       = useState<LeadStats | null>(null);
  const [industries,  setIndustries]  = useState<string[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [successMsg,  setSuccessMsg]  = useState('');
  const [dirtyIds,    setDirtyIds]    = useState<Set<number>>(new Set()); // row indices pending save
  const [colWidths,   setColWidths]   = useState<number[]>(COLUMNS.map(c => c.width));
  const [activeCell,  setActiveCell]  = useState<{ row: number; col: number } | null>(null);
  const [editValue,   setEditValue]   = useState('');
  const [showActivity,setShowActivity]= useState(false);
  const [activity,    setActivity]    = useState<any[]>([]);

  const saveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef     = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Assigned name for new rows
  const assignedName = viewUserName ?? user?.fullName ?? '';
  const scopeUserId  = viewUserId   ?? (user?.role === 'Sales' ? user?.id : undefined);
  const isAdminView  = !!viewUserId || user?.role === 'Admin';

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true); setError('');
    try {
      const params: Record<string, string> = { limit: '2000' };
      if (scopeUserId) params.assignedTo = scopeUserId;

      const [leadsData, statsData, inds] = await Promise.all([
        api.salesLeads.list(params),
        api.salesLeads.stats(scopeUserId ? { assignedTo: scopeUserId } : {}),
        api.salesLeads.industries(),
      ]);

      const loaded = (leadsData.leads ?? leadsData) as SalesLead[];
      // Map backend populated assignedTo to a display name
      const mapped = loaded.map((l: any) => ({
        ...l,
        assignedTo: typeof l.assignedTo === 'object' ? l.assignedTo.fullName : l.assignedTo,
        date: l.date ? l.date.slice(0, 10) : '',
        followUpDate: l.followUpDate ? l.followUpDate.slice(0, 10) : '',
      }));
      // Ensure at least one empty row
      if (mapped.length === 0) mapped.push(emptyRow(assignedName) as any);
      setRows(mapped);
      setStats(statsData);
      setIndustries(Array.isArray(inds) ? inds : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  }, [scopeUserId, assignedName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Auto-add row when last row has content ─────────────────────────────────
  useEffect(() => {
    if (rows.length === 0) return;
    const last = rows[rows.length - 1];
    const hasContent = last.companyName || last.contactPerson || last.phone || last.email;
    if (hasContent) {
      setRows(prev => [...prev, emptyRow(assignedName) as any]);
    }
  }, [rows, assignedName]);

  // ── Dirty tracking → debounced auto-save ──────────────────────────────────
  const markDirty = (idx: number) => {
    setDirtyIds(prev => new Set(prev).add(idx));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => autoSave(), 1200);
  };

  const autoSave = useCallback(async () => {
    setDirtyIds(prev => {
      if (prev.size === 0) return prev;
      triggerSave(Array.from(prev));
      return new Set();
    });
  }, [rows]); // eslint-disable-line

  const triggerSave = async (indices?: number[]) => {
    const toSave = (indices ?? rows.map((_, i) => i))
      .map(i => rows[i])
      .filter(r => r && (r.companyName || r.contactPerson || r.phone || r.email));

    if (toSave.length === 0) return;
    setSaving(true);
    try {
      const result = await api.salesLeads.bulk(toSave.map(r => ({
        ...(r.id && r.id !== '' ? { _id: r.id } : {}),
        date:          r.date          || new Date().toISOString().slice(0, 10),
        companyName:   r.companyName   || '',
        contactPerson: r.contactPerson || '',
        phone:         r.phone         || '',
        email:         r.email         || '',
        city:          r.city          || '',
        industry:      r.industry      || '',
        source:        r.source        || '',
        requirement:   r.requirement   || '',
        leadStatus:    r.leadStatus    || 'New',
        followUpDate:  r.followUpDate  || null,
        remarks:       r.remarks       || '',
      })));

      // Merge returned rows (with real IDs and leadIds) back into state
      const savedMap = new Map((result.rows as any[]).map((r: any) => [r.companyName + r.phone, r]));
      setRows(prev => prev.map(row => {
        if (row.id) return row; // already persisted
        const key = (row.companyName || '') + (row.phone || '');
        const saved: any = savedMap.get(key);
        if (saved) return {
          ...row,
          id: saved.id || saved._id,
          leadId: saved.leadId,
          assignedTo: typeof saved.assignedTo === 'object' ? saved.assignedTo.fullName : saved.assignedTo,
        };
        return row;
      }));

      setSuccessMsg('Saved ✓');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (e: any) {
      setError(e?.message || 'Auto-save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Cell editing ───────────────────────────────────────────────────────────
  const startEdit = (rowIdx: number, colIdx: number) => {
    const col = COLUMNS[colIdx];
    if (col.readOnly) return;
    const row = rows[rowIdx];
    const val = (row as any)[col.key] ?? '';
    setActiveCell({ row: rowIdx, col: colIdx });
    setEditValue(String(val));
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitEdit = (rowIdx: number, colIdx: number, value: string) => {
    const col = COLUMNS[colIdx];
    setRows(prev => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [col.key]: value };
      return next;
    });
    markDirty(rowIdx);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>, rowIdx: number, colIdx: number) => {
    const key = e.key;
    if (key === 'Escape') { setActiveCell(null); return; }
    if (key === 'Tab') {
      e.preventDefault();
      commitEdit(rowIdx, colIdx, editValue);
      const nextCol = e.shiftKey ? colIdx - 1 : colIdx + 1;
      if (nextCol >= 0 && nextCol < COLUMNS.length) startEdit(rowIdx, nextCol);
      else if (!e.shiftKey && rowIdx + 1 < rows.length) startEdit(rowIdx + 1, 0);
      return;
    }
    if (key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitEdit(rowIdx, colIdx, editValue);
      if (rowIdx + 1 < rows.length) startEdit(rowIdx + 1, colIdx);
      return;
    }
    if (key === 'ArrowDown' && activeCell) {
      e.preventDefault();
      commitEdit(rowIdx, colIdx, editValue);
      if (rowIdx + 1 < rows.length) startEdit(rowIdx + 1, colIdx);
      return;
    }
    if (key === 'ArrowUp' && activeCell) {
      e.preventDefault();
      commitEdit(rowIdx, colIdx, editValue);
      if (rowIdx > 0) startEdit(rowIdx - 1, colIdx);
    }
  };

  // ── Excel paste ────────────────────────────────────────────────────────────
  const handleGridPaste = useCallback((e: ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text');
    if (!text || !activeCell) return;
    e.preventDefault();

    const pastedRows = text.split(/\r?\n/).filter(r => r.trim());
    const startRow   = activeCell.row;
    const startCol   = activeCell.col;
    const colKeys    = COLUMNS.map(c => c.key);

    setRows(prev => {
      const next = [...prev];
      pastedRows.forEach((rowText, ri) => {
        const cells = rowText.split('\t');
        const targetRow = startRow + ri;
        if (targetRow >= next.length) {
          next.push(emptyRow(assignedName) as any);
        }
        const updated = { ...next[targetRow] };
        cells.forEach((cell, ci) => {
          const colIdx = startCol + ci;
          if (colIdx < colKeys.length && !COLUMNS[colIdx].readOnly) {
            (updated as any)[colKeys[colIdx]] = cell.trim();
          }
        });
        next[targetRow] = updated;
        markDirty(targetRow);
      });
      return next;
    });
  }, [activeCell, assignedName]);

  // ── Row actions ────────────────────────────────────────────────────────────
  const addRow = () => {
    setRows(prev => [...prev, emptyRow(assignedName) as any]);
  };

  const deleteRow = async (idx: number) => {
    const row = rows[idx];
    if (row.id && row.id !== '') {
      if (!confirm(`Delete lead ${row.leadId ?? ''}?`)) return;
      try {
        await api.salesLeads.remove(row.id);
      } catch (e: any) {
        setError(e?.message || 'Delete failed');
        return;
      }
    }
    setRows(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) next.push(emptyRow(assignedName) as any);
      return next;
    });
  };

  const duplicateRow = async (idx: number) => {
    const row = rows[idx];
    if (!row.id || row.id === '') {
      setRows(prev => {
        const copy = { ...row, id: '', leadId: '—', date: new Date().toISOString().slice(0, 10), leadStatus: 'New' as LeadStatus };
        const next = [...prev];
        next.splice(idx + 1, 0, copy as any);
        return next;
      });
      return;
    }
    try {
      const result: any = await api.salesLeads.duplicate(row.id);
      const newRow = {
        ...result,
        assignedTo: typeof result.assignedTo === 'object' ? result.assignedTo.fullName : result.assignedTo,
        date: result.date?.slice(0, 10) || '',
        followUpDate: result.followUpDate?.slice(0, 10) || '',
      };
      setRows(prev => {
        const next = [...prev];
        next.splice(idx + 1, 0, newRow);
        return next;
      });
    } catch (e: any) {
      setError(e?.message || 'Duplicate failed');
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const header = COLUMNS.map(c => c.label).join(',');
    const lines = rows
      .filter(r => r.companyName || r.contactPerson)
      .map(r =>
        COLUMNS.map(c => {
          const val = (r as any)[c.key] ?? '';
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',')
      );
    const csv  = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Import CSV ─────────────────────────────────────────────────────────────
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
    const keyMap: Record<string, string> = {
      'company name': 'companyName', 'contact person': 'contactPerson',
      'phone': 'phone', 'email': 'email', 'city': 'city', 'industry': 'industry',
      'source': 'source', 'requirement': 'requirement', 'lead status': 'leadStatus',
      'follow-up date': 'followUpDate', 'assigned to': 'assignedTo', 'remarks': 'remarks',
      'date': 'date',
    };

    const imported = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
      const row: any = {};
      headers.forEach((h, i) => {
        const k = keyMap[h];
        if (k) row[k] = vals[i] || '';
      });
      return row;
    });

    try {
      setSaving(true);
      const result = await api.salesLeads.import(imported);
      await fetchData();
      setSuccessMsg(`Imported ${result.imported} lead(s) ✓`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'Import failed');
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Activity log ───────────────────────────────────────────────────────────
  const fetchActivity = async () => {
    try {
      const result = await api.salesLeads.activity({ limit: '100' });
      setActivity(result.items ?? []);
    } catch { /* ignore */ }
  };

  const toggleActivity = () => {
    if (!showActivity) fetchActivity();
    setShowActivity(v => !v);
  };

  // ── Column resize ─────────────────────────────────────────────────────────
  const onResizeStart = (colIdx: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startX   = e.clientX;
    const startW   = colWidths[colIdx];
    const onMove   = (ev: MouseEvent) => {
      const diff = ev.clientX - startX;
      setColWidths(prev => {
        const next = [...prev];
        next[colIdx] = Math.max(60, startW + diff);
        return next;
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Stats summary ─────────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLeads     = useMemo(() => rows.filter(r => r.date === todayStr && r.id).length, [rows, todayStr]);
  const wonCount       = useMemo(() => rows.filter(r => r.leadStatus === 'Won').length, [rows]);
  const lostCount      = useMemo(() => rows.filter(r => r.leadStatus === 'Lost').length, [rows]);
  const followUpToday  = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return rows.filter(r => {
      if (!r.followUpDate) return false;
      const fu = new Date(r.followUpDate); fu.setHours(0,0,0,0);
      const done = ['Won', 'Lost', 'Not Interested'].includes(r.leadStatus ?? '');
      return !done && fu <= today;
    }).length;
  }, [rows]);

  // ─── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">
            {viewUserName ? `${viewUserName}'s Leads` : 'My Leads'}
          </h1>
          <p className="text-sm text-[var(--text)]/50 mt-1">
            Excel-style lead tracker — edits auto-save every 1.2 s
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {saving && <span className="text-xs text-blue-500 font-bold flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/>Saving…</span>}
          {successMsg && <span className="text-xs text-green-600 font-bold">{successMsg}</span>}
          <button onClick={toggleActivity}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs font-bold hover:border-blue-300 transition-all">
            <Activity className="w-3.5 h-3.5" /> Activity
          </button>
          <label className="flex items-center gap-1.5 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs font-bold hover:border-blue-300 transition-all cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Import CSV
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
          </label>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs font-bold hover:border-blue-300 transition-all">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={() => triggerSave()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
            <Save className="w-3.5 h-3.5" /> Save All
          </button>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── Mini dashboard cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Leads Today" value={stats?.total.today ?? todayLeads} icon={TrendingUp} />
        <StatCard label="Follow-ups Pending" value={stats?.followUpPending ?? followUpToday} color="yellow" icon={Clock} />
        <StatCard label="Updated Today" value={stats?.updatedToday ?? 0} color="purple" icon={RefreshCw} />
        <StatCard label="Won" value={stats?.byStatus['Won'] ?? wonCount} color="green" icon={CheckCircle2} />
        <StatCard label="Lost" value={stats?.byStatus['Lost'] ?? lostCount} color="red" icon={X} />
        <StatCard label="Total All Time" value={stats?.total.all ?? rows.filter(r => r.id).length} color="orange" icon={Users} />
      </div>

      {/* ── Status breakdown mini-bar ────────────────────────────────── */}
      {stats && (
        <div className="flex flex-wrap gap-2">
          {LEAD_STATUSES.map(s => {
            const count = stats.byStatus[s] ?? 0;
            if (count === 0) return null;
            return (
              <span key={s} className={cn('text-[10px] font-black px-2.5 py-1 rounded-full', STATUS_COLORS[s] || 'bg-gray-100 text-gray-600')}>
                {s}: {count}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Activity log panel ───────────────────────────────────────── */}
      {showActivity && (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest">Activity Log</h3>
            <button onClick={() => setShowActivity(false)}><X className="w-4 h-4 opacity-40" /></button>
          </div>
          {activity.length === 0 ? (
            <p className="text-xs opacity-30 text-center py-6">No activity yet</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {activity.map((a: any) => (
                <div key={a.id ?? a._id} className="flex items-start gap-3 text-xs">
                  <span className="font-black text-blue-500 shrink-0">{a.leadRefId}</span>
                  <span className="font-bold opacity-60">{a.actorName}</span>
                  <span className={cn('font-black px-1.5 py-0.5 rounded text-[9px] uppercase',
                    a.action === 'CREATED' ? 'bg-green-100 text-green-700' :
                    a.action === 'DELETED' ? 'bg-red-100 text-red-700' :
                    a.action === 'STATUS_CHANGED' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
                  )}>{a.action}</span>
                  {a.changes?.map((c: any, i: number) => (
                    <span key={i} className="opacity-50">{c.field}: {c.from}→{c.to}</span>
                  ))}
                  <span className="ml-auto opacity-30 shrink-0">
                    {new Date(a.createdAt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Excel grid ───────────────────────────────────────────────── */}
      <div
        className="overflow-auto rounded-2xl border border-[var(--border)] shadow-sm"
        style={{ maxHeight: 'calc(100vh - 340px)', minHeight: 300 }}
        onPaste={handleGridPaste}
      >
        <table className="border-collapse text-xs" style={{ tableLayout: 'fixed', minWidth: colWidths.reduce((s, w) => s + w, 50) + 80 }}>
          {/* Sticky header */}
          <thead className="sticky top-0 z-10 bg-slate-100">
            <tr>
              <th className="w-10 px-2 py-3 text-center text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-r border-slate-200">#</th>
              {COLUMNS.map((col, ci) => (
                <th
                  key={col.key}
                  className="relative px-3 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-r border-slate-200 select-none"
                  style={{ width: colWidths[ci], minWidth: colWidths[ci] }}
                >
                  {col.label}
                  {/* Resize handle */}
                  <div
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-300 transition-colors"
                    onMouseDown={e => onResizeStart(ci, e)}
                  />
                </th>
              ))}
              <th className="w-20 px-2 py-3 text-center text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">Actions</th>
            </tr>
          </thead>

          <tbody className="bg-[var(--surface)]">
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className={cn(
                  'group transition-colors hover:bg-blue-50/30',
                  rowBg(row)
                )}
              >
                {/* Row number */}
                <td className="px-2 py-1.5 text-center text-[10px] text-slate-400 border-b border-r border-slate-100 font-bold">
                  {ri + 1}
                </td>

                {COLUMNS.map((col, ci) => {
                  const isActive = activeCell?.row === ri && activeCell?.col === ci;
                  const rawVal   = (row as any)[col.key] ?? '';
                  const display  = String(rawVal);

                  return (
                    <td
                      key={col.key}
                      className={cn(
                        'border-b border-r border-slate-100 p-0 relative',
                        isActive ? 'ring-2 ring-inset ring-blue-500 bg-white z-10' : '',
                        col.readOnly ? 'bg-slate-50/60' : 'cursor-cell',
                      )}
                      style={{ width: colWidths[ci], minWidth: colWidths[ci] }}
                      onClick={() => !col.readOnly && startEdit(ri, ci)}
                    >
                      {isActive && !col.readOnly ? (
                        // ── Edit mode ─────────────────────────────────
                        col.dropdown === 'status' ? (
                          <select
                            ref={inputRef as any}
                            value={editValue}
                            onChange={e => { setEditValue(e.target.value); commitEdit(ri, ci, e.target.value); setActiveCell(null); }}
                            onBlur={() => { commitEdit(ri, ci, editValue); setActiveCell(null); }}
                            onKeyDown={e => handleKeyDown(e as any, ri, ci)}
                            className="w-full h-full px-2 py-1.5 bg-white border-0 outline-none text-xs font-bold"
                            autoFocus
                          >
                            <option value="">—</option>
                            {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : col.dropdown === 'source' ? (
                          <select
                            ref={inputRef as any}
                            value={editValue}
                            onChange={e => { setEditValue(e.target.value); commitEdit(ri, ci, e.target.value); setActiveCell(null); }}
                            onBlur={() => { commitEdit(ri, ci, editValue); setActiveCell(null); }}
                            onKeyDown={e => handleKeyDown(e as any, ri, ci)}
                            className="w-full h-full px-2 py-1.5 bg-white border-0 outline-none text-xs font-bold"
                            autoFocus
                          >
                            <option value="">—</option>
                            {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : col.isDate ? (
                          <input
                            ref={inputRef as any}
                            type="date"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => { commitEdit(ri, ci, editValue); setActiveCell(null); }}
                            onKeyDown={e => handleKeyDown(e as any, ri, ci)}
                            className="w-full h-full px-2 py-1.5 bg-white border-0 outline-none text-xs font-bold"
                            autoFocus
                          />
                        ) : col.key === 'requirement' || col.key === 'remarks' ? (
                          <textarea
                            ref={inputRef as any}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => { commitEdit(ri, ci, editValue); setActiveCell(null); }}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(ri, ci, editValue); setActiveCell(null); } }}
                            rows={2}
                            className="w-full px-2 py-1.5 bg-white border-0 outline-none text-xs font-bold resize-none"
                            autoFocus
                          />
                        ) : (
                          <input
                            ref={inputRef as any}
                            type="text"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => { commitEdit(ri, ci, editValue); setActiveCell(null); }}
                            onKeyDown={e => handleKeyDown(e as any, ri, ci)}
                            className="w-full h-full px-2 py-1.5 bg-white border-0 outline-none text-xs font-bold"
                            autoFocus
                          />
                        )
                      ) : (
                        // ── Display mode ──────────────────────────────
                        <div className="px-2 py-1.5 truncate min-h-[32px]">
                          {col.key === 'leadStatus' && display ? (
                            <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full', STATUS_COLORS[display] || 'bg-gray-100')}>
                              {display}
                            </span>
                          ) : col.key === 'leadId' ? (
                            <span className="text-blue-600 font-black">{display}</span>
                          ) : display}
                        </div>
                      )}
                    </td>
                  );
                })}

                {/* Row action buttons */}
                <td className="border-b border-slate-100 px-1 py-1">
                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => duplicateRow(ri)} title="Duplicate"
                      className="p-1 text-blue-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteRow(ri)} title="Delete"
                      className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add row button ────────────────────────────────────────────── */}
      <button
        onClick={addRow}
        className="flex items-center gap-2 px-4 py-2.5 text-xs font-black text-blue-600 border-2 border-dashed border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
      >
        <Plus className="w-4 h-4" /> Add Row
      </button>

    </div>
  );
}
