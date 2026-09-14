/**
 * PayrollManagement.tsx
 * Professional Payroll Module — supports:
 *  - Multiple / partial payments per employee per month
 *  - Deduction amount + reason per payment
 *  - Summary cards: Total Salary, Total Paid, Total Deductions, Remaining/Due
 *  - Payment history table (latest first) with status badges
 *  - PDF payslip download (jsPDF)
 *  - Filter by month, year, employee name, status
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Download, CheckCircle2, Clock, AlertCircle, FileText,
  Loader2, TrendingUp, DollarSign, Plus, X, History, ChevronDown,
  ChevronUp, ArrowLeft, User as UserIcon, CreditCard, Minus,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { PayrollStatus } from '@/src/types';
import { api } from '@/src/lib/api';
import { getSocket } from '@/src/lib/socket';
import { jsPDF } from 'jspdf';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SalaryPayment {
  id?: string;
  _id?: string;
  payrollId: string;
  amount: number;
  method: string;
  note: string;
  deductionAmount: number;
  deductionReason: string;
  remainingBalance: number;
  status: 'Paid' | 'Partial' | 'Pending';
  paidAt: string;
  createdAt?: string;
}

interface PayrollEmployee {
  id: string;
  fullName: string;
  role: string;
  department: string;
  designation?: string;
  email?: string;
  avatarUrl?: string;
}

interface PayrollRow {
  id: string;
  _id?: string;
  userId: PayrollEmployee;
  month: string;
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;   // fixed deductions in payroll row
  netSalary: number;
  status: PayrollStatus;
  paidAt?: string;
  notes?: string;
  // enriched from payments
  payments?: SalaryPayment[];
  totalPaid?: number;
  totalDeductions?: number;
  remainingBalance?: number;
  computedStatus?: string;
}

// ─── PDF Payslip Generator ────────────────────────────────────────────────────
function generatePayslipPDF(row: PayrollRow, companyName = 'Coded Clouds') {
  const doc      = new jsPDF({ unit: 'mm', format: 'a4' });
  const emp      = row.userId;
  const payments = row.payments ?? [];
  const totalPaid       = row.totalPaid ?? 0;
  const totalDeductions = row.totalDeductions ?? 0;
  const remaining       = Math.max(0, row.netSalary - totalPaid);

  const W = 210; // A4 width
  let y   = 20;

  // ── Header band ──
  doc.setFillColor(30, 80, 180);
  doc.rect(0, 0, W, 38, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, 15, 16);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('EMPLOYEE PAYSLIP', 15, 24);
  doc.text(`Month: ${row.month}`, 15, 31);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, W - 15, 31, { align: 'right' });

  y = 48;
  doc.setTextColor(30, 30, 30);

  // ── Employee info box ──
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(10, y, W - 20, 36, 3, 3, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(emp?.fullName ?? 'N/A', 18, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`ID: ${emp?.id ?? 'N/A'}`, 18, y + 18);
  doc.text(`Designation: ${emp?.designation ?? emp?.role ?? 'N/A'}`, 18, y + 26);
  doc.text(`Department: ${emp?.department ?? 'N/A'}`, 110, y + 18);
  if (emp?.email) doc.text(`Email: ${emp.email}`, 110, y + 26);

  y += 44;

  // ── Salary breakdown table ──
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SALARY BREAKDOWN', 15, y);
  y += 6;

  doc.setFillColor(30, 80, 180);
  doc.rect(10, y, W - 20, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Component', 15, y + 5);
  doc.text('Amount (PKR)', W - 15, y + 5, { align: 'right' });
  y += 10;

  const salaryRows = [
    ['Basic Salary',  row.basicSalary],
    ['Allowances',    row.allowances],
    ['Bonus',         row.bonus],
    ['Fixed Deductions', -row.deductions],
    ['NET SALARY',    row.netSalary],
  ];

  salaryRows.forEach(([label, val], i) => {
    const isNet = label === 'NET SALARY';
    if (isNet) {
      doc.setFillColor(230, 240, 255);
      doc.rect(10, y - 4, W - 20, 9, 'F');
    } else {
      doc.setFillColor(i % 2 === 0 ? 250 : 245, i % 2 === 0 ? 250 : 247, i % 2 === 0 ? 250 : 250);
      doc.rect(10, y - 4, W - 20, 8, 'F');
    }
    doc.setTextColor(isNet ? 30 : 50, isNet ? 80 : 50, isNet ? 180 : 50);
    doc.setFont('helvetica', isNet ? 'bold' : 'normal');
    doc.setFontSize(isNet ? 9 : 8);
    doc.text(String(label), 15, y + 1);
    const valNum = Number(val);
    const formatted = valNum < 0 ? `- ${Math.abs(valNum).toLocaleString()}` : valNum.toLocaleString();
    doc.text(formatted, W - 15, y + 1, { align: 'right' });
    y += isNet ? 10 : 8;
  });

  y += 6;

  // ── Payment history table ──
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT HISTORY', 15, y);
  y += 6;

  doc.setFillColor(30, 80, 180);
  doc.rect(10, y, W - 20, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('#',       15,      y + 5);
  doc.text('Date',    25,      y + 5);
  doc.text('Amount',  70,      y + 5);
  doc.text('Deduction', 100,   y + 5);
  doc.text('Method',  130,     y + 5);
  doc.text('Status',  162,     y + 5);
  doc.text('Notes',   W - 15,  y + 5, { align: 'right' });
  y += 10;

  if (payments.length === 0) {
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('No payments recorded.', 15, y + 4);
    y += 10;
  } else {
    payments.forEach((p, i) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFillColor(i % 2 === 0 ? 250 : 245, i % 2 === 0 ? 250 : 247, 250);
      doc.rect(10, y - 4, W - 20, 9, 'F');
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(String(i + 1),            15,      y + 1);
      doc.text(p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-GB') : '—', 25, y + 1);
      doc.text(`PKR ${Number(p.amount).toLocaleString()}`,          70,      y + 1);
      doc.text(p.deductionAmount ? `PKR ${p.deductionAmount.toLocaleString()}` : '—', 100, y + 1);
      doc.text(p.method ?? '—',          130,     y + 1);
      const sc = p.status === 'Paid' ? [22, 163, 74] : p.status === 'Partial' ? [234, 88, 12] : [239, 68, 68];
      doc.setTextColor(sc[0], sc[1], sc[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(p.status,                 162,     y + 1);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      const noteText = (p.deductionReason || p.note || '—').substring(0, 20);
      doc.text(noteText,                 W - 15,  y + 1, { align: 'right' });
      y += 9;
    });
  }

  y += 4;

  // ── Summary footer ──
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(10, y, W - 20, 28, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 80, 180);

  const col1 = 20, col2 = 80, col3 = 140;
  doc.text('Total Paid:',       col1,  y + 10);
  doc.text(`PKR ${totalPaid.toLocaleString()}`, col1 + 35, y + 10);
  doc.text('Total Deductions:', col2,  y + 10);
  doc.text(`PKR ${totalDeductions.toLocaleString()}`, col2 + 45, y + 10);
  doc.text('Remaining Due:',    col3,  y + 10);
  doc.setTextColor(remaining > 0 ? 220 : 22, remaining > 0 ? 38 : 163, remaining > 0 ? 38 : 74);
  doc.text(`PKR ${remaining.toLocaleString()}`, col3 + 38, y + 10);

  doc.setTextColor(30, 80, 180);
  doc.text('Net Salary:',       col1,  y + 20);
  doc.text(`PKR ${row.netSalary.toLocaleString()}`, col1 + 35, y + 20);
  doc.text('Status:',           col2,  y + 20);
  const st = row.computedStatus ?? row.status;
  doc.setTextColor(st === 'Paid' ? 22 : st === 'Processing' ? 234 : 220,
                   st === 'Paid' ? 163 : st === 'Processing' ? 88  : 38,
                   st === 'Paid' ? 74  : st === 'Processing' ? 12  : 38);
  doc.text(st === 'Processing' ? 'Partial' : st, col2 + 20, y + 20);

  // ── Footer ──
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a system-generated payslip and does not require a physical signature.', W / 2, 285, { align: 'center' });

  doc.save(`Payslip_${emp?.fullName?.replace(/\s+/g, '_') ?? 'Employee'}_${row.month}.pdf`);
}

// ─── Inline number input (no value-disappear bug) ─────────────────────────────
function PayrollInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [raw, setRaw] = useState(String(value));
  useEffect(() => { setRaw(String(value)); }, [value]);
  return (
    <input type="number" min={0} value={raw}
      onChange={e => setRaw(e.target.value)}
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
function AddPaymentModal({ row, onClose, onAdded }: {
  row: PayrollRow;
  onClose: () => void;
  onAdded: (updated: PayrollRow) => void;
}) {
  const remaining = Math.max(0, row.netSalary - (row.totalPaid ?? 0));

  const [amount,          setAmount]          = useState(String(remaining > 0 ? remaining : ''));
  const [method,          setMethod]          = useState('Bank Transfer');
  const [note,            setNote]            = useState('');
  const [deductionAmount, setDeductionAmount] = useState('0');
  const [deductionReason, setDeductionReason] = useState('');
  const [paidAt,          setPaidAt]          = useState(new Date().toISOString().slice(0, 10));
  const [saving,          setSaving]          = useState(false);
  const [err,             setErr]             = useState('');
  const [showDeduction,   setShowDeduction]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt  = parseFloat(amount);
    const ded  = parseFloat(deductionAmount) || 0;
    if (!Number.isFinite(amt) || amt <= 0)   { setErr('Enter a valid amount'); return; }
    if (amt > remaining + 0.01)               { setErr(`Exceeds remaining (PKR ${remaining.toLocaleString()})`); return; }
    if (ded < 0)                              { setErr('Deduction cannot be negative'); return; }

    setSaving(true); setErr('');
    try {
      const updated = await api.payroll.addPayment(row.id, {
        amount: amt, method, note,
        deductionAmount: ded,
        deductionReason,
        paidAt,
      });
      onAdded(updated);
    } catch (e: any) {
      setErr(e?.message || 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between">
          <div>
            <h3 className="text-white font-black text-lg tracking-tight">Add Salary Payment</h3>
            <p className="text-blue-200 text-xs mt-0.5">{row.userId?.fullName} — {row.month}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50 border-b border-slate-100">
          {[
            { label: 'Net Salary',   value: row.netSalary,         color: 'text-slate-700' },
            { label: 'Paid So Far',  value: row.totalPaid ?? 0,    color: 'text-green-600' },
            { label: 'Remaining',    value: remaining,              color: remaining > 0 ? 'text-orange-600' : 'text-green-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-4 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">{label}</p>
              <p className={cn('text-sm font-black', color)}>PKR {Number(value).toLocaleString()}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {err && <p className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded-xl border border-red-100">{err}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Amount Paid (PKR) *</label>
              <input type="number" min={1} max={remaining} value={amount} onChange={e => setAmount(e.target.value)} required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Payment Date *</label>
              <input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none">
              {['Bank Transfer', 'Cash', 'Cheque', 'Online Transfer'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Note / Reference</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. First installment, Advance payment..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>

          {/* Deduction section — collapsible */}
          <div className="border border-orange-100 rounded-2xl overflow-hidden">
            <button type="button" onClick={() => setShowDeduction(!showDeduction)}
              className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 hover:bg-orange-100 transition-colors text-left">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">
                {showDeduction ? '− Hide' : '+ Add'} Deduction (Optional)
              </span>
              {showDeduction ? <ChevronUp className="w-4 h-4 text-orange-400" /> : <ChevronDown className="w-4 h-4 text-orange-400" />}
            </button>
            {showDeduction && (
              <div className="p-4 space-y-3 bg-white">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Deduction Amount (PKR)</label>
                    <input type="number" min={0} value={deductionAmount} onChange={e => setDeductionAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Deduction Reason</label>
                    <input type="text" value={deductionReason} onChange={e => setDeductionReason(e.target.value)}
                      placeholder="e.g. Late arrival, Absent"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-700 text-sm font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 bg-blue-600 text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-200 disabled:opacity-60 flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Add Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Employee Detail Panel ────────────────────────────────────────────────────
function EmployeePayrollDetail({ row, onClose, onUpdate }: {
  row: PayrollRow;
  onClose: () => void;
  onUpdate: (updated: PayrollRow) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const totalPaid       = row.totalPaid       ?? 0;
  const totalDeductions = row.totalDeductions  ?? 0;
  const remaining       = Math.max(0, row.netSalary - totalPaid);
  const payments        = [...(row.payments ?? [])].sort(
    (a, b) => new Date(b.paidAt ?? b.createdAt ?? 0).getTime() - new Date(a.paidAt ?? a.createdAt ?? 0).getTime()
  );

  const computedStatus = row.computedStatus ?? (
    totalPaid >= row.netSalary - 0.01 ? 'Paid' :
    totalPaid > 0 ? 'Partial' : 'Pending'
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--background)] w-full max-w-4xl max-h-[95vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">

        {/* Detail Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-xl">
                {(row.userId?.fullName ?? '?').charAt(0)}
              </div>
              <div>
                <h2 className="text-white font-black text-xl tracking-tight">{row.userId?.fullName}</h2>
                <p className="text-blue-200 text-xs mt-0.5">{row.userId?.designation ?? row.userId?.role} · {row.userId?.department}</p>
                <p className="text-blue-300 text-[10px] mt-1 uppercase tracking-widest">{row.month}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => generatePayslipPDF(row)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors">
                <FileText className="w-4 h-4" /> PDF Payslip
              </button>
              <button onClick={onClose}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Monthly Salary',   value: row.netSalary,   color: 'blue',   icon: DollarSign },
              { label: 'Total Paid',        value: totalPaid,       color: 'green',  icon: CheckCircle2 },
              { label: 'Total Deductions',  value: totalDeductions, color: 'orange', icon: Minus },
              { label: 'Remaining / Due',   value: remaining,       color: remaining > 0 ? 'red' : 'green', icon: Clock },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className={cn(
                'p-4 rounded-2xl border shadow-sm',
                color === 'blue'   ? 'bg-blue-50   border-blue-100'   :
                color === 'green'  ? 'bg-green-50  border-green-100'  :
                color === 'orange' ? 'bg-orange-50 border-orange-100' :
                'bg-red-50 border-red-100'
              )}>
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3',
                  color === 'blue'   ? 'bg-blue-100   text-blue-600'   :
                  color === 'green'  ? 'bg-green-100  text-green-600'  :
                  color === 'orange' ? 'bg-orange-100 text-orange-600' :
                  'bg-red-100 text-red-500'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">{label}</p>
                <p className="text-lg font-black">PKR {Number(value).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Salary Breakdown */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-light)] flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest">Salary Breakdown</h3>
              <span className={cn(
                'text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest',
                computedStatus === 'Paid'    ? 'bg-green-100 text-green-700' :
                computedStatus === 'Partial' ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-600'
              )}>{computedStatus}</span>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Basic Salary',       row.basicSalary,  false],
                  ['Allowances',         row.allowances,   false],
                  ['Bonus',              row.bonus,        false],
                  ['Fixed Deductions',   row.deductions,   true],
                ].map(([label, val, isDeduction]) => (
                  <div key={String(label)} className="flex items-center justify-between py-2 border-b border-[var(--border-light)]">
                    <span className="text-[11px] font-bold opacity-60">{String(label)}</span>
                    <span className={cn('text-[11px] font-black', isDeduction ? 'text-red-500' : 'text-[var(--text)]')}>
                      {isDeduction ? '- ' : ''}PKR {Number(val).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="col-span-2 flex items-center justify-between pt-3">
                  <span className="text-sm font-black">Net Salary</span>
                  <span className="text-sm font-black text-blue-600">PKR {row.netSalary.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History Table */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-light)] flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest">Payment History</h3>
              {remaining > 0 && (
                <button onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Payment
                </button>
              )}
            </div>

            {payments.length === 0 ? (
              <div className="py-12 text-center opacity-30">
                <CreditCard className="w-10 h-10 mx-auto mb-3" />
                <p className="text-xs font-black uppercase tracking-widest">No payments yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                      <th className="px-5 py-3">#</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Amount Paid</th>
                      <th className="px-5 py-3">Deduction</th>
                      <th className="px-5 py-3">Method</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Remaining After</th>
                      <th className="px-5 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {payments.map((p, i) => (
                      <tr key={p.id ?? p._id ?? i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3 text-xs font-black text-blue-500">#{payments.length - i}</td>
                        <td className="px-5 py-3 text-xs font-bold">
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs font-black text-green-600">PKR {Number(p.amount).toLocaleString()}</span>
                        </td>
                        <td className="px-5 py-3">
                          {p.deductionAmount > 0 ? (
                            <div>
                              <span className="text-xs font-black text-red-500">- PKR {p.deductionAmount.toLocaleString()}</span>
                              {p.deductionReason && (
                                <p className="text-[9px] font-bold text-red-400 opacity-70">{p.deductionReason}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs opacity-30">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs font-bold opacity-60">{p.method}</td>
                        <td className="px-5 py-3">
                          <span className={cn(
                            'text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest',
                            p.status === 'Paid'    ? 'bg-green-100 text-green-700' :
                            p.status === 'Partial' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-600'
                          )}>{p.status}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn(
                            'text-xs font-bold',
                            p.remainingBalance > 0 ? 'text-orange-500' : 'text-green-600'
                          )}>
                            PKR {Number(p.remainingBalance).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[10px] text-slate-400 max-w-[120px] truncate" title={p.note}>
                          {p.note || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <AddPaymentModal
          row={row}
          onClose={() => setShowModal(false)}
          onAdded={(updated) => { onUpdate(updated); setShowModal(false); }}
        />
      )}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest',
      status === 'Paid'       ? 'bg-green-100 text-green-700' :
      status === 'Processing' ? 'bg-orange-100 text-orange-700' :
      status === 'Partial'    ? 'bg-orange-100 text-orange-700' :
      'bg-red-100 text-red-600'
    )}>
      {status === 'Processing' ? 'Partial' : status}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function PayrollManagement() {
  const [rows,       setRows]       = useState<PayrollRow[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [generating, setGenerating] = useState(false);
  const [detailRow,  setDetailRow]  = useState<PayrollRow | null>(null);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear,  setSelectedYear]  = useState(String(now.getFullYear()));
  const month = `${selectedYear}-${selectedMonth}`;

  const fetchPayroll = useCallback(async () => {
    setIsLoading(true); setError('');
    try {
      const data    = await api.payroll.list({ month });
      const rawRows = Array.isArray(data) ? data : (data.rows ?? []);
      setRows(rawRows.map((r: any) => ({
        ...r,
        payments:       r.payments       ?? [],
        totalPaid:      r.totalPaid      ?? 0,
        totalDeductions:r.totalDeductions ?? 0,
        remainingBalance: r.remainingBalance ?? Math.max(0, (r.netSalary ?? 0) - (r.totalPaid ?? 0)),
      })));
    } catch (e: any) {
      setError(e?.message || 'Failed to load payroll');
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  useEffect(() => {
    const socket = getSocket();
    const onUpdated = (row: any) => {
      if (row.month !== month) return;
      const enriched = {
        ...row,
        payments:        row.payments        ?? [],
        totalPaid:       row.totalPaid       ?? 0,
        totalDeductions: row.totalDeductions ?? 0,
        remainingBalance:row.remainingBalance ?? 0,
      };
      setRows(prev => prev.map(r => r.id === enriched.id ? enriched : r));
      setDetailRow(prev => prev?.id === enriched.id ? enriched : prev);
    };
    const onGenerated = (p: { month: string }) => { if (p.month === month) fetchPayroll(); };
    socket?.on('payroll:updated',   onUpdated);
    socket?.on('payroll:generated', onGenerated);
    return () => { socket?.off('payroll:updated', onUpdated); socket?.off('payroll:generated', onGenerated); };
  }, [month, fetchPayroll]);

  const saveField = async (id: string, field: 'allowances' | 'bonus' | 'deductions', value: number) => {
    try {
      const updated = await api.payroll.update(id, { [field]: value });
      setRows(prev => prev.map(r => r.id === id ? { ...r, ...updated, payments: r.payments, totalPaid: r.totalPaid, totalDeductions: r.totalDeductions } : r));
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
      fetchPayroll();
    }
  };

  const handleGenerate = async () => {
    setGenerating(true); setError('');
    try { await api.payroll.generate(month); await fetchPayroll(); }
    catch (e: any) { setError(e?.message || 'Failed to generate'); }
    finally { setGenerating(false); }
  };

  const handleExportCsv = () => {
    const header = ['Employee', 'Department', 'Basic', 'Allowances', 'Bonus', 'Deductions', 'Net Salary', 'Total Paid', 'Total Deductions', 'Remaining', 'Status'];
    const lines  = filteredRows.map(p => [
      p.userId?.fullName, p.userId?.department,
      p.basicSalary, p.allowances, p.bonus, p.deductions, p.netSalary,
      p.totalPaid ?? 0, p.totalDeductions ?? 0,
      Math.max(0, p.netSalary - (p.totalPaid ?? 0)),
      p.computedStatus ?? p.status,
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv  = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `payroll-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRows = useMemo(() => rows.filter(p => {
    const nameMatch   = (p.userId?.fullName ?? '').toLowerCase().includes(search.toLowerCase());
    const st          = p.computedStatus ?? (p.totalPaid ?? 0) >= p.netSalary - 0.01 ? 'Paid' : (p.totalPaid ?? 0) > 0 ? 'Partial' : 'Pending';
    const statusMatch = statusFilter ? (st === statusFilter || (statusFilter === 'Partial' && p.status === 'Processing')) : true;
    return nameMatch && statusMatch;
  }), [rows, search, statusFilter]);

  const totals = filteredRows.reduce((acc, r) => ({
    net:        acc.net        + r.netSalary,
    paid:       acc.paid       + (r.totalPaid ?? 0),
    deductions: acc.deductions + (r.totalDeductions ?? 0),
    remaining:  acc.remaining  + Math.max(0, r.netSalary - (r.totalPaid ?? 0)),
  }), { net: 0, paid: 0, deductions: 0, remaining: 0 });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Employee detail panel */}
      {detailRow && (
        <EmployeePayrollDetail
          row={detailRow}
          onClose={() => setDetailRow(null)}
          onUpdate={(updated) => {
            setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
            setDetailRow(updated);
          }}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payroll Management</h1>
          <p className="text-sm text-[var(--text)]/50 mt-1">Manage salary disbursements, deductions and payment history</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleExportCsv} disabled={filteredRows.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-bold shadow-sm hover:border-blue-300 transition-all disabled:opacity-40">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-60">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            Generate Payroll
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Summary Cards — 4 cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Monthly Salary', value: totals.net,        icon: DollarSign,  color: 'blue'   },
          { label: 'Total Paid Amount',     value: totals.paid,       icon: CheckCircle2, color: 'green' },
          { label: 'Total Deductions',      value: totals.deductions, icon: Minus,        color: 'orange'},
          { label: 'Remaining / Due',       value: totals.remaining,  icon: Clock,        color: totals.remaining > 0 ? 'red' : 'green' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={cn(
            'p-5 rounded-2xl border shadow-sm',
            color === 'blue'   ? 'bg-blue-50   border-blue-100'   :
            color === 'green'  ? 'bg-green-50  border-green-100'  :
            color === 'orange' ? 'bg-orange-50 border-orange-100' :
            'bg-red-50 border-red-100'
          )}>
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center mb-4',
              color === 'blue'   ? 'bg-blue-100   text-blue-600'   :
              color === 'green'  ? 'bg-green-100  text-green-600'  :
              color === 'orange' ? 'bg-orange-100 text-orange-600' :
              'bg-red-100 text-red-500'
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">{label}</p>
            <p className="text-xl font-black">PKR {value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex flex-wrap items-center gap-4">
        {/* Month */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase opacity-40">Month:</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none">
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
              <option key={m} value={m}>{new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        {/* Year */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase opacity-40">Year:</label>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
            className="bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none">
            <option value="2027">2027</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
        {/* Status filter */}
        <div className="flex items-center gap-1">
          {['', 'Paid', 'Partial', 'Pending'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
                statusFilter === s
                  ? s === 'Paid'    ? 'bg-green-500 text-white'  :
                    s === 'Partial' ? 'bg-orange-500 text-white' :
                    s === 'Pending' ? 'bg-red-500 text-white'    : 'bg-blue-600 text-white'
                  : 'bg-[var(--background)] border border-[var(--border)] text-[var(--text)]/40 hover:border-blue-300'
              )}>
              {s || 'All'}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-2 pl-10 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
            placeholder="Search by employee name..." />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--background)]/50 text-[9px] font-black uppercase tracking-widest text-[var(--text)]/40 border-b border-[var(--border-light)]">
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Net Salary</th>
                <th className="px-5 py-4">Allowances</th>
                <th className="px-5 py-4">Bonus</th>
                <th className="px-5 py-4">Deductions</th>
                <th className="px-5 py-4">Paid</th>
                <th className="px-5 py-4">Remaining</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {isLoading ? (
                <tr><td colSpan={9} className="py-20 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
                  <p className="text-xs font-bold opacity-40">Loading payroll data...</p>
                </td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={9} className="py-20 text-center opacity-30">
                  <DollarSign className="w-10 h-10 mx-auto mb-3" />
                  <p className="text-xs font-black uppercase tracking-widest">No records — click "Generate Payroll"</p>
                </td></tr>
              ) : filteredRows.map(p => {
                const totalPaid  = p.totalPaid ?? 0;
                const remaining  = Math.max(0, p.netSalary - totalPaid);
                const dispStatus = p.computedStatus ?? (totalPaid >= p.netSalary - 0.01 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Pending');

                return (
                  <tr key={p.id} className="hover:bg-[var(--background)]/30 transition-colors group cursor-pointer"
                    onClick={() => setDetailRow(p)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-sm">
                          {(p.userId?.fullName ?? '?').charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold group-hover:text-blue-600 transition-colors">{p.userId?.fullName ?? 'Unknown'}</p>
                          <p className="text-[10px] opacity-40">{p.userId?.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-black text-blue-600">PKR {p.netSalary.toLocaleString()}</td>
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <PayrollInput value={p.allowances} onCommit={v => saveField(p.id, 'allowances', v)} />
                    </td>
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <PayrollInput value={p.bonus} onCommit={v => saveField(p.id, 'bonus', v)} />
                    </td>
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <PayrollInput value={p.deductions} onCommit={v => saveField(p.id, 'deductions', v)} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-black text-green-600">PKR {totalPaid.toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('text-xs font-black', remaining > 0 ? 'text-orange-500' : 'text-green-600')}>
                        PKR {remaining.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={dispStatus} />
                    </td>
                    <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setDetailRow(p)}
                          className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors text-[var(--text)]/30"
                          title="View details & payment history">
                          <History className="w-4 h-4" />
                        </button>
                        <button onClick={() => generatePayslipPDF(p)}
                          className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors text-[var(--text)]/30"
                          title="Download PDF payslip">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleExportCsv()}
                          className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors text-[var(--text)]/30"
                          title="Export CSV">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
