import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search, Download, CheckCircle2, Clock, AlertCircle, FileText,
  Loader2, TrendingUp, DollarSign, Plus, X, History, ChevronDown,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { PayrollStatus } from '@/src/types';
import { api } from '@/src/lib/api';
import { getSocket } from '@/src/lib/socket';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SalaryPayment {
  id?: string;
  payrollId: string;
  amount: number;
  method: string;
  note: string;
  paidAt: string;
}

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
  payments?: SalaryPayment[];   // partial payment history
  totalPaid?: number;           // sum of payments
}

// ─── Inline number input — fully controlled, no value-disappear bug ───────────
// Problem was: handleFieldChange set value=0 immediately when user typed '' (empty).
// Fix: keep raw string in local state, only parse on blur.
function PayrollInput({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (v: number) => void;
}) {
  const [raw, setRaw] = useState(String(value));

  // Sync when the row is updated from outside (e.g. socket push)
  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  return (
    <input
      type="number"
      min={0}
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => {
        const n = parseFloat(raw);
        const safe = Number.isFinite(n) && n >= 0 ? n : value;
        setRaw(String(safe));
        if (safe !== value) onCommit(safe);
      }}
      className="w-24 bg-[var(--background)] border border-[var(--border-light)] rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/10"
    />
  );
}

// ─── Add Payment Modal ────────────────────────────────────────────────────────
function AddPaymentModal({
  row,
  onClose,
  onAdded,
}: {
  row: PayrollRow;
  onClose: () => void;
  onAdded: (updated: PayrollRow) => void;
}) {
  const remaining = row.netSalary - (row.totalPaid ?? 0);
  const [amount, setAmount]   = useState(String(remaining > 0 ? remaining : ''));
  const [method, setMethod]   = useState('Bank Transfer');
  const [note, setNote]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setErr('Enter a valid amount'); return; }
    if (amt > remaining + 0.01) { setErr(`Amount exceeds remaining salary (PKR ${remaining.toLocaleString()})`); return; }

    setSaving(true);
    setErr('');
    try {
      // POST partial payment to backend
      const updated = await api.payroll.addPayment(row.id, { amount: amt, method, note });
      onAdded(updated);
      onClose();
    } catch (e: any) {
      setErr(e?.message || 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black tracking-tight">Add Salary Payment</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-4 h-4" /></button>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-3 gap-3 text-center text-xs">
          <div>
            <p className="opacity-40 uppercase tracking-widest text-[9px] font-black mb-1">Net Salary</p>
            <p className="font-black">PKR {row.netSalary.toLocaleString()}</p>
          </div>
          <div>
            <p className="opacity-40 uppercase tracking-widest text-[9px] font-black mb-1">Paid</p>
            <p className="font-black text-green-600">PKR {(row.totalPaid ?? 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="opacity-40 uppercase tracking-widest text-[9px] font-black mb-1">Remaining</p>
            <p className="font-black text-orange-600">PKR {remaining.toLocaleString()}</p>
          </div>
        </div>

        {err && <p className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded-xl">{err}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Amount (PKR) *</label>
            <input type="number" min={1} max={remaining} value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent/20" required />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none">
              {['Bank Transfer','Cash','Cheque','Online Transfer'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Note / Reference</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. First installment"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/20" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 text-sm font-black uppercase tracking-widest rounded-xl">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 bg-accent text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-lg shadow-accent/20 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Add Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Employee Ledger Download ─────────────────────────────────────────────────
function downloadLedger(row: PayrollRow) {
  const emp = row.userId;
  const payments = row.payments ?? [];
  const totalPaid = row.totalPaid ?? 0;
  const remaining = Math.max(0, row.netSalary - totalPaid);

  const lines: string[] = [
    '='.repeat(60),
    'CODED CLOUDS — EMPLOYEE SALARY LEDGER',
    '='.repeat(60),
    '',
    `Employee Name   : ${emp?.fullName ?? 'N/A'}`,
    `Employee ID     : ${emp?.id ?? 'N/A'}`,
    `Department      : ${emp?.department ?? 'N/A'}`,
    `Role            : ${emp?.role ?? 'N/A'}`,
    `Month           : ${row.month}`,
    '',
    '-'.repeat(60),
    'SALARY BREAKDOWN',
    '-'.repeat(60),
    `Basic Salary    : PKR ${row.basicSalary.toLocaleString()}`,
    `Allowances      : PKR ${row.allowances.toLocaleString()}`,
    `Bonus           : PKR ${row.bonus.toLocaleString()}`,
    `Deductions      : PKR ${row.deductions.toLocaleString()}`,
    `Net Salary      : PKR ${row.netSalary.toLocaleString()}`,
    '',
    '-'.repeat(60),
    'PAYMENT HISTORY',
    '-'.repeat(60),
  ];

  if (payments.length === 0) {
    lines.push('  No payments recorded yet.');
  } else {
    payments.forEach((p, i) => {
      lines.push(`  #${i + 1}  Date   : ${p.paidAt ? new Date(p.paidAt).toLocaleDateString() : 'N/A'}`);
      lines.push(`       Amount : PKR ${Number(p.amount).toLocaleString()}`);
      lines.push(`       Method : ${p.method ?? 'N/A'}`);
      if (p.note) lines.push(`       Note   : ${p.note}`);
      lines.push('');
    });
  }

  lines.push('-'.repeat(60));
  lines.push(`Total Paid      : PKR ${totalPaid.toLocaleString()}`);
  lines.push(`Remaining       : PKR ${remaining.toLocaleString()}`);
  lines.push(`Status          : ${row.status}`);
  lines.push('');
  lines.push('='.repeat(60));
  lines.push(`Generated on    : ${new Date().toLocaleString()}`);
  lines.push('='.repeat(60));

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `ledger-${emp?.fullName?.replace(/\s+/g, '_') ?? 'employee'}-${row.month}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function PayrollManagement() {
  const [rows, setRows]           = useState<PayrollRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [generating, setGenerating] = useState(false);
  const [paymentModal, setPaymentModal] = useState<PayrollRow | null>(null);
  const [expandedId, setExpandedId]    = useState<string | null>(null);

  // Default to current month/year
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear,  setSelectedYear]  = useState(String(now.getFullYear()));

  const month = `${selectedYear}-${selectedMonth}`;

  const fetchPayroll = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.payroll.list({ month });
      // Backend returns { month, rows, summary }
      const rawRows: any[] = Array.isArray(data) ? data : (data.rows ?? []);
      // Attach totalPaid from payments array if present
      setRows(rawRows.map(r => ({
        ...r,
        payments:  r.payments  ?? [],
        totalPaid: r.totalPaid ?? (r.payments ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0),
      })));
    } catch (err: any) {
      setError(err?.message || 'Failed to load payroll');
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  // Real-time socket updates
  useEffect(() => {
    const socket = getSocket();
    const onUpdated = (row: any) => {
      if (row.month !== month) return;
      setRows(prev => prev.map(r => r.id === row.id ? {
        ...row,
        payments:  row.payments  ?? r.payments  ?? [],
        totalPaid: row.totalPaid ?? r.totalPaid ?? 0,
      } : r));
    };
    const onGenerated = (p: { month: string }) => { if (p.month === month) fetchPayroll(); };
    socket?.on('payroll:updated',   onUpdated);
    socket?.on('payroll:generated', onGenerated);
    return () => { socket?.off('payroll:updated', onUpdated); socket?.off('payroll:generated', onGenerated); };
  }, [month, fetchPayroll]);

  const saveField = async (id: string, field: 'allowances' | 'bonus' | 'deductions', value: number) => {
    try {
      const updated = await api.payroll.update(id, { [field]: value });
      setRows(prev => prev.map(r => r.id === id ? { ...r, ...updated, payments: r.payments, totalPaid: r.totalPaid } : r));
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
      fetchPayroll();
    }
  };

  const handleUpdateStatus = async (id: string, status: PayrollStatus) => {
    const prev = rows;
    setRows(r => r.map(row => row.id === id ? { ...row, status } : row));
    try {
      const updated = await api.payroll.setStatus(id, status);
      setRows(r => r.map(row => row.id === id ? { ...row, ...updated, payments: row.payments, totalPaid: row.totalPaid } : row));
    } catch (err: any) {
      setError(err?.message || 'Failed to update status');
      setRows(prev);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true); setError('');
    try { await api.payroll.generate(month); await fetchPayroll(); }
    catch (err: any) { setError(err?.message || 'Failed to generate payroll'); }
    finally { setGenerating(false); }
  };

  const handleExportCsv = () => {
    const header = ['Employee', 'Department', 'Basic', 'Allowances', 'Bonus', 'Deductions', 'Net', 'Paid', 'Remaining', 'Status'];
    const lines  = filteredRows.map(p => [
      p.userId?.fullName, p.userId?.department,
      p.basicSalary, p.allowances, p.bonus, p.deductions, p.netSalary,
      p.totalPaid ?? 0, Math.max(0, p.netSalary - (p.totalPaid ?? 0)), p.status,
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv  = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `payroll-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRows = useMemo(
    () => rows.filter(p => (p.userId?.fullName ?? '').toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );

  const totals = filteredRows.reduce((acc, r) => ({
    net:     acc.net     + r.netSalary,
    paid:    acc.paid    + (r.totalPaid ?? 0),
    pending: acc.pending + Math.max(0, r.netSalary - (r.totalPaid ?? 0)),
  }), { net: 0, paid: 0, pending: 0 });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Payment modal */}
      {paymentModal && (
        <AddPaymentModal
          row={paymentModal}
          onClose={() => setPaymentModal(null)}
          onAdded={(updated) => {
            setRows(prev => prev.map(r => r.id === updated.id ? {
              ...updated,
              payments:  updated.payments  ?? r.payments,
              totalPaid: updated.totalPaid ?? r.totalPaid,
            } : r));
            setPaymentModal(null);
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payroll Management</h1>
          <p className="text-sm text-[var(--text)]/50 mt-1">Manage employee salaries and payment history</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCsv} disabled={filteredRows.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-bold shadow-sm hover:border-accent/30 transition-all disabled:opacity-40">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:scale-105 transition-all disabled:opacity-60">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            Generate Payroll
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100">{error}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Net Salary',    value: totals.net,     icon: DollarSign,  color: 'accent',  badge: 'Total Payroll' },
          { label: 'Successfully Disbursed', value: totals.paid, icon: CheckCircle2, color: 'green',  badge: 'Paid' },
          { label: 'Remaining to Pay',    value: totals.pending, icon: Clock,        color: 'orange', badge: 'Pending' },
        ].map(({ label, value, icon: Icon, color, badge }) => (
          <div key={label} className="bg-[var(--surface)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={cn('p-2 rounded-xl', color === 'accent' ? 'bg-accent/10 text-accent' : color === 'green' ? 'bg-green-50 text-green-500' : 'bg-orange-50 text-orange-500')}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded', color === 'accent' ? 'text-accent bg-accent/5' : color === 'green' ? 'text-green-600 bg-green-50' : 'text-orange-600 bg-orange-50')}>{badge}</span>
            </div>
            <p className="text-[var(--text)]/50 text-[10px] font-black uppercase tracking-widest">{label}</p>
            <p className="text-2xl font-black mt-1">PKR {value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase opacity-40">Month:</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none">
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
              <option key={m} value={m}>{new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase opacity-40">Year:</label>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
            className="bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none">
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-2 pl-10 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all"
            placeholder="Search employee..." />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--background)]/50 text-[9px] font-black uppercase tracking-widest text-[var(--text)]/40 border-b border-[var(--border-light)]">
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Basic</th>
                <th className="px-5 py-4">Allowances</th>
                <th className="px-5 py-4">Bonus</th>
                <th className="px-5 py-4">Deductions</th>
                <th className="px-5 py-4">Net</th>
                <th className="px-5 py-4">Paid / Remaining</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {isLoading ? (
                <tr><td colSpan={9} className="px-5 py-20 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent mb-2" />
                  <p className="text-xs font-bold opacity-40">Loading payroll...</p>
                </td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-20 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto text-[var(--text)]/20 mb-2" />
                  <p className="text-xs font-bold opacity-40">No payroll records — click "Generate Payroll"</p>
                </td></tr>
              ) : filteredRows.map((p) => {
                const totalPaid = p.totalPaid ?? 0;
                const remaining = Math.max(0, p.netSalary - totalPaid);
                const isExpanded = expandedId === p.id;

                return (
                  <React.Fragment key={p.id}>
                    <tr className="hover:bg-[var(--background)]/30 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-black text-[11px]">
                            {(p.userId?.fullName ?? '?').charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{p.userId?.fullName ?? 'Unknown'}</p>
                            <p className="text-[10px] opacity-40">{p.userId?.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-bold">PKR {p.basicSalary.toLocaleString()}</td>
                      <td className="px-5 py-4">
                        <PayrollInput value={p.allowances} onCommit={v => saveField(p.id, 'allowances', v)} />
                      </td>
                      <td className="px-5 py-4">
                        <PayrollInput value={p.bonus} onCommit={v => saveField(p.id, 'bonus', v)} />
                      </td>
                      <td className="px-5 py-4">
                        <PayrollInput value={p.deductions} onCommit={v => saveField(p.id, 'deductions', v)} />
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-black text-accent">PKR {p.netSalary.toLocaleString()}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black text-green-600">Paid: PKR {totalPaid.toLocaleString()}</p>
                          {remaining > 0 && <p className="text-[10px] font-black text-orange-500">Due: PKR {remaining.toLocaleString()}</p>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn('text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter',
                          p.status === 'Paid' ? 'bg-green-100 text-green-600' :
                          p.status === 'Processing' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                        )}>{p.status}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Add Payment */}
                          {remaining > 0 && (
                            <button onClick={() => setPaymentModal(p)}
                              className="px-2 py-1 bg-accent/10 text-accent text-[9px] font-black rounded uppercase"
                              title="Add partial payment">
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                          {/* Mark Full Paid */}
                          {p.status !== 'Paid' && (
                            <button onClick={() => handleUpdateStatus(p.id, 'Paid')}
                              className="px-3 py-1 bg-accent text-white text-[9px] font-black rounded uppercase shadow-sm">
                              Mark Paid
                            </button>
                          )}
                          {/* History toggle */}
                          <button onClick={() => setExpandedId(isExpanded ? null : p.id)}
                            className="p-1.5 hover:bg-[var(--background)] rounded-lg transition-colors text-[var(--text)]/30 hover:text-accent"
                            title="Payment history">
                            <History className="w-4 h-4" />
                          </button>
                          {/* Download ledger */}
                          <button onClick={() => downloadLedger(p)}
                            className="p-1.5 hover:bg-[var(--background)] rounded-lg transition-colors text-[var(--text)]/30 hover:text-accent"
                            title="Download ledger">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable payment history */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="px-8 py-4 bg-slate-50/60 border-b border-[var(--border-light)]">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">Payment History</p>
                          {(p.payments ?? []).length === 0 ? (
                            <p className="text-xs font-bold opacity-30">No payments recorded yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {(p.payments ?? []).map((pay, i) => (
                                <div key={pay.id ?? i} className="flex items-center gap-6 text-xs">
                                  <span className="font-black text-accent w-6">#{i + 1}</span>
                                  <span className="font-black">PKR {Number(pay.amount).toLocaleString()}</span>
                                  <span className="opacity-40">{pay.method}</span>
                                  <span className="opacity-40">{pay.paidAt ? new Date(pay.paidAt).toLocaleDateString() : '—'}</span>
                                  {pay.note && <span className="opacity-40 italic">{pay.note}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
