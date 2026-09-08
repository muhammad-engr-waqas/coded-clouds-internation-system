import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Loader2,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { PayrollStatus } from '@/src/types';
import { api } from '@/src/lib/api';
import { getSocket } from '@/src/lib/socket';

interface PayrollRow {
  id: string;
  userId: { id: string; fullName: string; role: string; department: string; avatarUrl?: string };
  month: string;
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  status: PayrollStatus;
  paidAt?: string;
}

// Debounce helper (kept for potential future use)
function useDebouncedCallback<A extends any[]>(fn: (...args: A) => void, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (...args: A) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  };
}

export function PayrollManagement() {
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('08');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const month = `${selectedYear}-${selectedMonth}`;

  const fetchPayroll = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.payroll.list({ month });
      setRows(data.rows);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payroll');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [month]);

  // Real-time: any Admin/HR editing a row (including this tab, since io.emit reaches the
  // sender too) pushes the backend-recalculated row to everyone viewing this month.
  useEffect(() => {
    const socket = getSocket();
    const onUpdated = (row: PayrollRow) => {
      if (row.month !== month) return;
      setRows((prev) => (prev.some((r) => r.id === row.id) ? prev.map((r) => (r.id === row.id ? row : r)) : [...prev, row]));
    };
    const onGenerated = (payload: { month: string }) => {
      if (payload.month === month) fetchPayroll();
    };
    socket?.on('payroll:updated', onUpdated);
    socket?.on('payroll:generated', onGenerated);
    return () => {
      socket?.off('payroll:updated', onUpdated);
      socket?.off('payroll:generated', onGenerated);
    };
  }, [month]);

  // Save to DB immediately — called on input blur (when user leaves the field)
  const saveRow = async (id: string, patch: Partial<PayrollRow>) => {
    try {
      const updated = await api.payroll.update(id, patch);
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err: any) {
      setError(err?.message || 'Failed to save changes');
      fetchPayroll(); // roll back to DB truth on failure
    }
  };

  // Track pending edits per row — stored locally while typing, committed on blur
  const pendingEdits = useRef<Record<string, Partial<PayrollRow>>>({});

  // On every keystroke: update local UI only (instant feedback), record pending edit
  const handleFieldChange = (id: string, field: 'allowances' | 'bonus' | 'deductions', raw: string) => {
    const value = raw === '' ? 0 : Number(raw);
    if (Number.isNaN(value) || value < 0) return;
    // Accumulate pending edits for this row
    pendingEdits.current[id] = { ...(pendingEdits.current[id] || {}), [field]: value };
    // Update UI immediately
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, [field]: value };
        next.netSalary = next.basicSalary + next.allowances + next.bonus - next.deductions;
        return next;
      })
    );
  };

  // On blur: flush pending edits for this row to the database
  const handleFieldBlur = (id: string) => {
    const patch = pendingEdits.current[id];
    if (!patch || Object.keys(patch).length === 0) return;
    delete pendingEdits.current[id];
    saveRow(id, patch);
  };

  const handleUpdateStatus = async (id: string, status: PayrollStatus) => {
    const prev = rows;
    setRows((r) => r.map((row) => (row.id === id ? { ...row, status } : row)));
    try {
      const updated = await api.payroll.setStatus(id, status);
      setRows((r) => r.map((row) => (row.id === id ? updated : row)));
    } catch (err: any) {
      setError(err?.message || 'Failed to update status');
      setRows(prev);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      await api.payroll.generate(month);
      await fetchPayroll();
    } catch (err: any) {
      setError(err?.message || 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCsv = () => {
    const header = ['Employee', 'Department', 'Basic Salary', 'Allowances', 'Bonus', 'Deductions', 'Net Salary', 'Status'];
    const lines = filteredRows.map((p) =>
      [p.userId?.fullName, p.userId?.department, p.basicSalary, p.allowances, p.bonus, p.deductions, p.netSalary, p.status]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRows = useMemo(
    () => rows.filter((p) => p.userId?.fullName?.toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );

  const totals = filteredRows.reduce(
    (acc, curr) => ({
      net: acc.net + curr.netSalary,
      paid: acc.paid + (curr.status === 'Paid' ? curr.netSalary : 0),
      pending: acc.pending + (curr.status !== 'Paid' ? curr.netSalary : 0),
    }),
    { net: 0, paid: 0, pending: 0 }
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payroll Management</h1>
          <p className="text-sm text-[var(--text)]/50 mt-1">Manage employee salaries and payments</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={filteredRows.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-bold shadow-sm hover:border-accent/30 transition-all disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:scale-105 transition-all disabled:opacity-60"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            Generate Payroll
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100">{error}</div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-accent/10 text-accent rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase text-accent bg-accent/5 px-2 py-0.5 rounded">Total Payroll</span>
          </div>
          <p className="text-[var(--text)]/50 text-[10px] font-black uppercase tracking-widest">Total Net Salary</p>
          <p className="text-2xl font-black mt-1">PKR {totals.net.toLocaleString()}</p>
        </div>
        <div className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 text-green-500 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase text-green-600 bg-green-50 px-2 py-0.5 rounded">Paid</span>
          </div>
          <p className="text-[var(--text)]/50 text-[10px] font-black uppercase tracking-widest">Successfully Disbursed</p>
          <p className="text-2xl font-black mt-1">PKR {totals.paid.toLocaleString()}</p>
        </div>
        <div className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-50 text-orange-500 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded">Pending</span>
          </div>
          <p className="text-[var(--text)]/50 text-[10px] font-black uppercase tracking-widest">Remaining to Pay</p>
          <p className="text-2xl font-black mt-1">PKR {totals.pending.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase opacity-40">Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none"
          >
            {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((m, i) => (
              <option key={m} value={m}>
                {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
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
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-2 pl-10 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all"
            placeholder="Search employee by name..."
          />
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--background)]/50 text-[9px] font-black uppercase tracking-widest text-[var(--text)]/40 border-b border-[var(--border-light)]">
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Basic Salary</th>
                <th className="px-5 py-4">Allowances</th>
                <th className="px-5 py-4">Bonus</th>
                <th className="px-5 py-4">Deductions</th>
                <th className="px-5 py-4">Net Salary</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent mb-2" />
                    <p className="text-xs font-bold opacity-40">Loading payroll data...</p>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-20 text-center">
                    <AlertCircle className="w-8 h-8 mx-auto text-[var(--text)]/20 mb-2" />
                    <p className="text-xs font-bold opacity-40">
                      No payroll records for this month yet — click "Generate Payroll" to create them.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--background)]/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-black text-[11px]">
                          {p.userId?.fullName?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{p.userId?.fullName ?? 'Unknown'}</p>
                          <p className="text-[10px] opacity-40">{p.userId?.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-bold">PKR {p.basicSalary.toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <input
                        type="number"
                        min={0}
                        value={p.allowances}
                        onChange={(e) => handleFieldChange(p.id, 'allowances', e.target.value)}
                        onBlur={() => handleFieldBlur(p.id)}
                        className="w-20 bg-[var(--background)] border border-[var(--border-light)] rounded-lg px-2 py-1 text-xs font-bold focus:outline-none"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="number"
                        min={0}
                        value={p.bonus}
                        onChange={(e) => handleFieldChange(p.id, 'bonus', e.target.value)}
                        onBlur={() => handleFieldBlur(p.id)}
                        className="w-20 bg-[var(--background)] border border-[var(--border-light)] rounded-lg px-2 py-1 text-xs font-bold focus:outline-none"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="number"
                        min={0}
                        value={p.deductions}
                        onChange={(e) => handleFieldChange(p.id, 'deductions', e.target.value)}
                        onBlur={() => handleFieldBlur(p.id)}
                        className="w-20 bg-[var(--background)] border border-[var(--border-light)] rounded-lg px-2 py-1 text-xs font-bold focus:outline-none"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-black text-accent">PKR {p.netSalary.toLocaleString()}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter',
                          p.status === 'Paid'
                            ? 'bg-green-100 text-green-600'
                            : p.status === 'Processing'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-orange-100 text-orange-600'
                        )}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.status !== 'Paid' && (
                          <button
                            onClick={() => handleUpdateStatus(p.id, 'Paid')}
                            className="px-3 py-1 bg-accent text-white text-[9px] font-black rounded uppercase shadow-sm"
                          >
                            Mark Paid
                          </button>
                        )}
                        <a
                          href={`${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api')}/payroll/${p.id}/payslip`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 hover:bg-[var(--background)] rounded-lg transition-colors"
                          title="View payslip JSON (auth required)"
                        >
                          <FileText className="w-4 h-4 text-[var(--text)]/30" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
