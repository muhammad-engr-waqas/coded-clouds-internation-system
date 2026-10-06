/**
 * InvoicePage.tsx
 * Two tabs:
 *   1. Create Invoice  — identical to the original standalone invoice app
 *   2. History         — list of saved invoices from MongoDB (search, delete, re-download PDF)
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { InvoiceData, ServiceItem, EXCHANGE_RATES, CURRENCIES } from '@/src/invoice-types';import { InvoiceForm }         from '@/src/components/invoice/InvoiceForm';
import { InvoicePreview }      from '@/src/components/invoice/InvoicePreview';
import { generateInvoicePDF }  from '@/src/lib/invoice-pdf-utils';
import { api }                 from '@/src/lib/api';
import {
  Sparkles, History, Layout, FileText, Trash2,
  Search, Loader2, AlertCircle, X, Download, RefreshCw,
  Calendar, Phone, CreditCard, User2,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const STORAGE_KEY = 'coded_clouds_invoice_counter';

// ─── helpers ─────────────────────────────────────────────────────────────────
const createDefaultData = (): InvoiceData => ({
  invoiceNumber: 'CC-001',
  date:          new Date().toISOString().slice(0, 10),
  currency:      'SAR',
  clientName:    '',
  clientContact: '',
  billNumber:    '',
  services:      [{ id: crypto.randomUUID(), description: '', amount: 0 }],
  notes:         '',
  templateStyle: 'classic',
});

// ─── InvoiceHistoryTab ────────────────────────────────────────────────────────
function InvoiceHistoryTab() {
  const [invoices,   setInvoices]   = useState<any[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [regenId,    setRegenId]    = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true); setError('');
    try {
      const params: Record<string, string> = { limit: '200' };
      if (search) params.search = search;
      const data = await api.invoices.list(params);
      setInvoices(data.invoices ?? data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchInvoices(), search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchInvoices]);

  const handleDelete = async (id: string, invoiceNumber: string) => {
    if (!confirm(`Delete invoice ${invoiceNumber}? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await api.invoices.remove(id);
      setInvoices(prev => prev.filter(inv => inv.id !== id && inv._id !== id));
    } catch (e: any) {
      setError(e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRedownload = async (inv: any) => {
    setRegenId(inv.id ?? inv._id);
    try {
      const invoiceData: InvoiceData = {
        invoiceNumber: inv.invoiceNumber,
        date:          inv.date,
        currency:      inv.currency,
        clientName:    inv.clientName,
        clientContact: inv.clientContact,
        billNumber:    inv.billNumber,
        services:      (inv.services || []).map((s: any) => ({
          id: crypto.randomUUID(),
          description: s.description,
          amount: s.amount,
        })),
        notes:         inv.notes,
        templateStyle: inv.templateStyle || 'classic',
      };
      await generateInvoicePDF(invoiceData);
    } catch (e: any) {
      setError(e?.message || 'PDF regeneration failed');
    } finally {
      setRegenId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search + refresh row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client, invoice no., bill no.…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
        <button
          onClick={fetchInvoices}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:border-blue-300 transition-all disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20 opacity-30">
          <FileText className="w-12 h-12 mx-auto mb-3" />
          <p className="text-sm font-black uppercase tracking-widest">No invoices saved yet</p>
          <p className="text-xs mt-1">Generate your first invoice from the Create tab</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} found
          </p>
          {invoices.map(inv => {
            const id = inv.id ?? inv._id;
            const isDeleting  = deletingId === id;
            const isRegening  = regenId    === id;
            const total = inv.grandTotal ?? 0;
            const sym   = CURRENCIES[inv.currency]?.symbol ?? inv.currency;
            const date  = inv.date ? inv.date.slice(0, 10) : '—';
            const createdBy = typeof inv.createdBy === 'object'
              ? inv.createdBy?.fullName ?? '—'
              : '—';

            return (
              <div
                key={id}
                className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  {/* Left info */}
                  <div className="flex items-start gap-4 min-w-0">
                    {/* Currency badge */}
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-black text-blue-600 uppercase">{inv.currency}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-blue-600">{inv.invoiceNumber}</span>
                        <span className={cn(
                          'text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest',
                          inv.templateStyle === 'modern'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        )}>
                          {inv.templateStyle || 'classic'}
                        </span>
                      </div>
                      <p className="text-sm font-bold mt-0.5 truncate">
                        {inv.clientName || <span className="italic opacity-40">No client</span>}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Calendar className="w-3 h-3 shrink-0" /> {date}
                        </span>
                        {inv.clientContact && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Phone className="w-3 h-3 shrink-0" /> {inv.clientContact}
                          </span>
                        )}
                        {inv.billNumber && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <CreditCard className="w-3 h-3 shrink-0" /> {inv.billNumber}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <User2 className="w-3 h-3 shrink-0" /> {createdBy}
                        </span>
                      </div>
                      {/* Services preview */}
                      {inv.services?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {inv.services.slice(0, 3).map((s: any, i: number) => (
                            <span key={i} className="text-[9px] bg-slate-50 border border-slate-100 rounded px-2 py-0.5 text-slate-500 font-medium truncate max-w-[140px]">
                              {s.description || '—'}
                            </span>
                          ))}
                          {inv.services.length > 3 && (
                            <span className="text-[9px] text-slate-400 font-bold">+{inv.services.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: total + actions */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                      <p className="text-lg font-black text-slate-800">
                        {sym} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRedownload(inv)}
                        disabled={isRegening}
                        title="Re-download PDF"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold border border-slate-200 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-all disabled:opacity-50"
                      >
                        {isRegening
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Download className="w-3 h-3" />}
                        PDF
                      </button>
                      <button
                        onClick={() => handleDelete(id, inv.invoiceNumber)}
                        disabled={isDeleting}
                        title="Delete invoice"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold border border-red-100 text-red-400 rounded-lg hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                      >
                        {isDeleting
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3 h-3" />}
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CreateInvoiceTab ─────────────────────────────────────────────────────────
interface CreateInvoiceTabProps {
  onSaved: () => void; // called after save so History tab can refresh
}

function CreateInvoiceTab({ onSaved }: CreateInvoiceTabProps) {
  const [data,        setData]        = useState<InvoiceData>(createDefaultData);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving,    setIsSaving]    = useState(false);
  const [saveError,   setSaveError]   = useState('');
  const [activeTab,   setActiveTab]   = useState<'edit' | 'preview'>('edit');

  // Load counter from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const num   = saved ? parseInt(saved) : 1;
    setData(prev => ({
      ...prev,
      invoiceNumber: `CC-${num.toString().padStart(3, '0')}`,
    }));
  }, []);

  const handleDataChange = (newData: InvoiceData) => {
    if (newData.currency !== data.currency) {
      const fromRate = EXCHANGE_RATES[data.currency];
      const toRate   = EXCHANGE_RATES[newData.currency];
      setData({
        ...newData,
        services: newData.services.map(s => ({
          ...s,
          amount: parseFloat(((s.amount / fromRate) * toRate).toFixed(2)),
        })),
      });
    } else {
      setData(newData);
    }
  };

  const handleAddRow    = () =>
    setData(prev => ({ ...prev, services: [...prev.services, { id: crypto.randomUUID(), description: '', amount: 0 }] }));

  const handleDeleteRow = (id: string) =>
    setData(prev => ({ ...prev, services: prev.services.filter(s => s.id !== id) }));

  const handleRowChange = (id: string, field: keyof ServiceItem, value: any) =>
    setData(prev => ({ ...prev, services: prev.services.map(s => s.id === id ? { ...s, [field]: value } : s) }));

  const bumpCounter = () => {
    const current = parseInt(data.invoiceNumber.split('-')[1]);
    const next    = current + 1;
    localStorage.setItem(STORAGE_KEY, next.toString());
    setData(prev => ({
      ...prev,
      invoiceNumber: `CC-${next.toString().padStart(3, '0')}`,
      services: [{ id: crypto.randomUUID(), description: '', amount: 0 }],
    }));
  };

  const handleExport = async () => {
    setIsExporting(true); setSaveError('');
    try {
      // 1. Generate PDF (download)
      await generateInvoicePDF(data);

      // 2. Save to database
      setIsSaving(true);
      await api.invoices.create({
        invoiceNumber: data.invoiceNumber,
        date:          data.date,
        currency:      data.currency,
        clientName:    data.clientName,
        clientContact: data.clientContact,
        billNumber:    data.billNumber,
        services:      data.services.map(s => ({ description: s.description, amount: s.amount })),
        notes:         data.notes,
        templateStyle: data.templateStyle || 'classic',
      });

      // 3. Bump counter + notify History tab
      bumpCounter();
      onSaved();
    } catch (e: any) {
      setSaveError(e?.message || 'Failed to save invoice');
    } finally {
      setIsExporting(false);
      setIsSaving(false);
    }
  };

  return (
    <div>
      {saveError && (
        <div className="mb-4 bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{saveError}
          <button onClick={() => setSaveError('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Mobile Edit/Preview toggle */}
      <div className="lg:hidden flex p-1 rounded-xl mb-4 border backdrop-blur-sm w-full max-w-[280px] mx-auto"
        style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)' }}>
        <button
          onClick={() => setActiveTab('edit')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
            activeTab === 'edit' ? 'text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
          style={activeTab === 'edit' ? { background: '#4F8EF7' } : {}}
        >
          <Layout size={12} /> BUILD
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
            activeTab === 'preview' ? 'text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
          style={activeTab === 'preview' ? { background: '#4F8EF7' } : {}}
        >
          <Sparkles size={12} /> VIEW
        </button>
      </div>

      {/* Form + Preview grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-12 items-start">
        <motion.div
          initial={false}
          animate={{
            opacity: (activeTab === 'edit' || window.innerWidth >= 1024) ? 1 : 0,
            display: (activeTab === 'edit' || window.innerWidth >= 1024) ? 'block' : 'none',
          }}
          className="lg:col-span-7"
        >
          <InvoiceForm
            data={data}
            onChange={handleDataChange}
            onAddRow={handleAddRow}
            onDeleteRow={handleDeleteRow}
            onRowChange={handleRowChange}
            onExport={handleExport}
          />
        </motion.div>

        <motion.div
          initial={false}
          animate={{
            opacity: (activeTab === 'preview' || window.innerWidth >= 1024) ? 1 : 0,
            display: (activeTab === 'preview' || window.innerWidth >= 1024) ? 'block' : 'none',
          }}
          className="lg:col-span-5"
        >
          <InvoicePreview data={data} />

          {/* System State panel */}
          <div className="mt-5 p-4 md:p-6 rounded-2xl border text-white/80 space-y-3"
            style={{ background: '#0A1628', borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2" style={{ color: '#00D4AA' }}>
              <History size={16} />
              <h4 className="font-bold text-[10px] md:text-sm uppercase tracking-wider">System State</h4>
            </div>
            <p className="text-[10px] md:text-xs leading-relaxed">
              Next Identifier:{' '}
              <span className="text-white font-bold">
                CC-{(parseInt(data.invoiceNumber.split('-')[1]) + 1).toString().padStart(3, '0')}
              </span>
            </p>
            {(isExporting || isSaving) && (
              <p className="text-[10px] text-yellow-300 flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                {isExporting ? 'Generating PDF…' : 'Saving to history…'}
              </p>
            )}
            <button
              onClick={() => {
                if (window.confirm('Reset invoice counter to CC-001?')) {
                  localStorage.setItem(STORAGE_KEY, '1');
                  setData(prev => ({ ...prev, invoiceNumber: 'CC-001' }));
                }
              }}
              className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
            >
              <History size={10} /> Reset ID
            </button>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="mt-12 md:mt-20 pt-6 border-t border-slate-200 text-center space-y-2">
        <div className="flex flex-col md:flex-row flex-wrap justify-center gap-1.5 md:gap-6 text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>Coded Clouds</span>
          <span className="hidden md:inline text-slate-200">|</span>
          <span>codedclouds.org</span>
          <span className="hidden md:inline text-slate-200">|</span>
          <span>info@codedclouds.org</span>
          <span className="hidden md:inline text-slate-200">|</span>
          <span>PK: +92 3199737649</span>
          <span className="hidden md:inline text-slate-200">|</span>
          <span>KSA: +966 557385262</span>
        </div>
        <p className="text-[9px] text-slate-300 pb-6">© 2026 Coded Clouds Infrastructure. All Rights Reserved.</p>
      </footer>

      {/* PDF export overlay */}
      <AnimatePresence>
        {isExporting && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 text-white"
            style={{ background: 'rgba(10,22,40,0.80)' }}
          >
            <div className="text-center space-y-6">
              <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto"
                style={{ borderColor: '#00D4AA', borderTopColor: 'transparent' }} />
              <div className="space-y-2">
                <h3 className="font-bold text-2xl tracking-tight">Generating PDF…</h3>
                <p className="text-slate-400 text-sm">Organizing services and formatting terms.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main InvoicePage ─────────────────────────────────────────────────────────
export function InvoicePage() {
  const [activeTab,       setActiveTab]       = useState<'create' | 'history'>('create');
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const handleInvoiceSaved = () => {
    // Bump key so History tab re-fetches when user switches to it
    setHistoryRefreshKey(k => k + 1);
  };

  return (
    <div className="invoice-module min-h-screen bg-slate-50 -m-6">
      {/* Dark navy header banner */}
      <div
        className="relative overflow-hidden"
        style={{ background: '#0A1628' }}
      >
        {/* Glow blobs */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"
          style={{ background: 'rgba(79,142,247,0.10)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none"
          style={{ background: 'rgba(0,212,170,0.05)', filter: 'blur(70px)' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Brand header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="space-y-0.5">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-white"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  CODED <span style={{ color: '#00D4AA' }}>CLOUDS</span>
                </h1>
                <span className="hidden sm:block text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest"
                  style={{ background: 'rgba(79,142,247,0.2)', color: '#4F8EF7', borderColor: 'rgba(79,142,247,0.3)' }}>
                  Service Engine
                </span>
              </div>
              <p className="text-slate-400 text-xs font-medium">Infrastructure & Cloud Excellence Portal</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-white"
              style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
              <Sparkles size={12} style={{ color: '#00D4AA' }} className="animate-pulse" />
              <span className="text-[9px] md:text-xs font-bold uppercase tracking-wider">Cloud Analytics Active</span>
            </div>
          </div>

          {/* Tab switcher — inside the banner */}
          <div className="flex items-center gap-1 w-fit">
            {([
              { key: 'create',  label: 'Create Invoice', icon: FileText },
              { key: 'history', label: 'History',        icon: History  },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-widest transition-all',
                  activeTab === key
                    ? 'bg-slate-50 text-slate-800 shadow'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                )}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content area — white/light background */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'create' ? (
          <CreateInvoiceTab onSaved={handleInvoiceSaved} />
        ) : (
          <InvoiceHistoryTab key={historyRefreshKey} />
        )}
      </div>
    </div>
  );
}
