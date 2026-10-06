/**
 * InvoicePage.tsx
 * Coded Clouds Invoice Generator — embedded inside CCIMS for Admin and HR roles.
 * Identical to the standalone invoice app; no design or functionality changes.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { InvoiceData, ServiceItem, EXCHANGE_RATES } from "@/src/invoice-types";
import { InvoiceForm } from "@/src/components/invoice/InvoiceForm";
import { InvoicePreview } from "@/src/components/invoice/InvoicePreview";
import { generateInvoicePDF } from "@/src/lib/invoice-pdf-utils";
import { Sparkles, History, Layout } from "lucide-react";

const STORAGE_KEY = "coded_clouds_invoice_counter";

const createDefaultData = (): InvoiceData => ({
  invoiceNumber: "CC-001",
  date: new Date().toISOString().slice(0, 10),
  currency: "SAR",
  clientName: "",
  clientContact: "",
  billNumber: "",
  services: [{ id: crypto.randomUUID(), description: "", amount: 0 }],
  notes: "",
  templateStyle: "classic",
});

export function InvoicePage() {
  const [data, setData] = useState<InvoiceData>(createDefaultData);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  const handleDataChange = (newData: InvoiceData) => {
    if (newData.currency !== data.currency) {
      const fromRate = EXCHANGE_RATES[data.currency];
      const toRate   = EXCHANGE_RATES[newData.currency];
      const convertedServices = newData.services.map(s => ({
        ...s,
        amount: parseFloat(((s.amount / fromRate) * toRate).toFixed(2)),
      }));
      setData({ ...newData, services: convertedServices });
    } else {
      setData(newData);
    }
  };

  // Always start from CC-001 on first mount for a fresh session
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const num   = saved ? parseInt(saved) : 1;
    setData(prev => ({
      ...prev,
      invoiceNumber: `CC-${num.toString().padStart(3, "0")}`,
    }));
  }, []);

  const handleAddRow = () => {
    setData(prev => ({
      ...prev,
      services: [...prev.services, { id: crypto.randomUUID(), description: "", amount: 0 }],
    }));
  };

  const handleDeleteRow = (id: string) => {
    setData(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id),
    }));
  };

  const handleRowChange = (id: string, field: keyof ServiceItem, value: any) => {
    setData(prev => ({
      ...prev,
      services: prev.services.map(s => s.id === id ? { ...s, [field]: value } : s),
    }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await generateInvoicePDF(data);
      const current = parseInt(data.invoiceNumber.split("-")[1]);
      const nextNum = current + 1;
      localStorage.setItem(STORAGE_KEY, nextNum.toString());
      setData(prev => ({
        ...prev,
        invoiceNumber: `CC-${nextNum.toString().padStart(3, "0")}`,
        services: [{ id: crypto.randomUUID(), description: "", amount: 0 }],
      }));
    } catch (error) {
      console.error("PDF Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    // invoice-module class scopes the invoice CSS variables/fonts
    <div className="invoice-module min-h-screen bg-slate-50 flex flex-col -m-6">

      {/* ── Background decoration (same as original) ─────────────── */}
      <div
        className="fixed top-0 inset-x-0 h-48 md:h-80 overflow-hidden pointer-events-none z-0"
        style={{ background: "#0A1628" }}
      >
        <div className="absolute top-0 right-0 w-[200px] md:w-[600px] h-[200px] md:h-[600px] blur-[60px] md:blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3"
          style={{ background: "rgba(79,142,247,0.10)" }} />
        <div className="absolute bottom-0 left-0 w-[150px] md:w-[400px] h-[150px] md:h-[400px] blur-[50px] md:blur-[100px] rounded-full translate-y-1/2 -translate-x-1/4"
          style={{ background: "rgba(0,212,170,0.05)" }} />
      </div>

      <div className="relative flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3 md:py-12 z-10">

        {/* ── Header ────────────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-12 gap-2">
          <div className="space-y-0.5 md:space-y-1">
            <div className="flex items-center gap-3">
              <h1
                className="text-xl md:text-3xl font-bold tracking-tighter text-white"
                style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
              >
                CODED <span style={{ color: "#00D4AA" }}>CLOUDS</span>
              </h1>
              <div className="hidden sm:block text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest"
                style={{ background: "rgba(79,142,247,0.2)", color: "#4F8EF7", borderColor: "rgba(79,142,247,0.3)" }}>
                Service Engine
              </div>
            </div>
            <p className="text-slate-400 text-[9px] md:text-sm font-medium">Infrastructure & Cloud Excellence Portal</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-sm text-white"
              style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }}>
              <Sparkles size={12} style={{ color: "#00D4AA" }} className="animate-pulse" />
              <span className="text-[9px] md:text-xs font-bold uppercase tracking-wider"
                style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}>
                Cloud Analytics Active
              </span>
            </div>
          </div>
        </header>

        {/* ── Mobile Tab Switcher ────────────────────────────────── */}
        <div className="lg:hidden flex p-1 rounded-xl mb-4 border backdrop-blur-sm relative z-10 w-full max-w-[280px] mx-auto"
          style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }}>
          <button
            onClick={() => setActiveTab("edit")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              activeTab === "edit"
                ? "text-white shadow-lg"
                : "text-slate-400 hover:text-white"
            }`}
            style={activeTab === "edit" ? { background: "#4F8EF7" } : {}}
          >
            <Layout size={12} /> BUILD
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              activeTab === "preview"
                ? "text-white shadow-lg"
                : "text-slate-400 hover:text-white"
            }`}
            style={activeTab === "preview" ? { background: "#4F8EF7" } : {}}
          >
            <Sparkles size={12} /> VIEW
          </button>
        </div>

        {/* ── Main Work Area ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-12 items-start relative z-10">
          <motion.div
            initial={false}
            animate={{
              opacity: (activeTab === "edit" || window.innerWidth >= 1024) ? 1 : 0,
              display: (activeTab === "edit" || window.innerWidth >= 1024) ? "block" : "none",
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
              opacity: (activeTab === "preview" || window.innerWidth >= 1024) ? 1 : 0,
              display: (activeTab === "preview" || window.innerWidth >= 1024) ? "block" : "none",
            }}
            className="lg:col-span-5"
          >
            <InvoicePreview data={data} />

            {/* System State panel */}
            <div className="mt-5 p-4 md:p-6 rounded-2xl border text-white/80 space-y-3"
              style={{ background: "#0A1628", borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2" style={{ color: "#00D4AA" }}>
                <History size={16} />
                <h4 className="font-bold text-[10px] md:text-sm uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}>
                  System State
                </h4>
              </div>
              <p className="text-[10px] md:text-xs leading-relaxed">
                Sequence Protocol: Next Identifier is{" "}
                <span className="text-white font-bold">
                  CC-{(parseInt(data.invoiceNumber.split("-")[1]) + 1).toString().padStart(3, "0")}
                </span>.
              </p>
              <div className="flex items-center gap-4 pt-1">
                <button
                  onClick={() => {
                    if (window.confirm("Reset invoice counter to CC-001?")) {
                      localStorage.setItem(STORAGE_KEY, "1");
                      setData(prev => ({ ...prev, invoiceNumber: "CC-001" }));
                    }
                  }}
                  className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
                >
                  <History size={10} /> Reset ID
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <footer className="mt-12 md:mt-24 pt-6 md:pt-12 border-t border-slate-200 text-center space-y-2 md:space-y-4">
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
          <p className="text-[9px] text-slate-300 pb-8">© 2026 Coded Clouds Infrastructure. All Rights Reserved.</p>
        </footer>
      </div>

      {/* ── PDF Export Overlay ─────────────────────────────────── */}
      <AnimatePresence>
        {isExporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 text-white"
            style={{ background: "rgba(10,22,40,0.80)" }}
          >
            <div className="text-center space-y-6">
              <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto"
                style={{ borderColor: "#00D4AA", borderTopColor: "transparent" }} />
              <div className="space-y-2">
                <h3 className="font-bold text-2xl tracking-tight"
                  style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}>
                  Generating PDF...
                </h3>
                <p className="text-slate-400 text-sm">Organizing services and formatting terms.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
