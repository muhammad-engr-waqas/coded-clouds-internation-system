/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Plus, Trash2, Download, Building2, User, Hash, CreditCard, Notebook, Palette } from "lucide-react";
import { ServiceItem, Currency, CURRENCIES, InvoiceData, convertCurrency, InvoiceTemplate } from "../../invoice-types";

interface Props {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
  onAddRow: () => void;
  onDeleteRow: (id: string) => void;
  onRowChange: (id: string, field: keyof ServiceItem, value: any) => void;
  onExport: () => void;
}

export const InvoiceForm = ({ data, onChange, onAddRow, onDeleteRow, onRowChange, onExport }: Props) => {
  const grandTotal = data.services.reduce((acc, s) => acc + s.amount, 0);
  const totalConv = convertCurrency(grandTotal, data.currency);

  return (
    <div className="space-y-4 md:space-y-8 pb-12">
      {/* Header Info */}
      <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3 md:space-y-6">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="text-accent-blue" size={18} />
          <h2 className="font-display font-bold text-sm md:text-lg">Invoice Reference</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
          <div className="space-y-1">
            <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reference ID</label>
            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-mono text-[11px] md:text-sm">
              <Hash size={12} />
              {data.invoiceNumber}
            </div>
          </div>
          
          <div className="space-y-1 sm:text-right">
            <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Issuance Date</label>
            <input
              type="date"
              value={data.date}
              onChange={(e) => onChange({ ...data, date: e.target.value })}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue outline-none transition-all text-xs md:text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Base Currency</label>
          <div className="grid grid-cols-2 xs:flex xs:flex-wrap gap-1.5">
            {(Object.keys(CURRENCIES) as Currency[]).map((cur) => (
              <button
                key={cur}
                onClick={() => onChange({ ...data, currency: cur })}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[10px] md:text-sm font-medium transition-all border ${
                  data.currency === cur
                    ? "bg-navy text-white border-navy shadow-md"
                    : "bg-white text-slate-600 border-slate-200 hover:border-accent-blue/50"
                }`}
              >
                {CURRENCIES[cur].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice Style */}
      <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="text-accent-blue" size={18} />
          <h2 className="font-display font-bold text-sm md:text-lg">PDF Style</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: "classic", label: "Classic" },
            { value: "modern", label: "Modern" },
          ] as { value: InvoiceTemplate; label: string }[]).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ ...data, templateStyle: option.value })}
              className={`px-3 py-2 rounded-xl text-[10px] md:text-sm font-bold transition-all border ${
                (data.templateStyle || "classic") === option.value
                  ? "bg-navy text-white border-navy shadow-md"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:border-accent-blue/50"
              }`}
            >
              {option.label} PDF
            </button>
          ))}
        </div>
      </div>

      {/* Client Info */}
      <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3 md:space-y-6">
        <div className="flex items-center gap-2 mb-1">
          <User className="text-accent-teal" size={18} />
          <h2 className="font-display font-bold text-sm md:text-lg">Client Profile</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
          <div className="space-y-1 min-w-0">
            <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Identity</label>
            <input
              type="text"
              placeholder="Name or Organization"
              value={data.clientName}
              onChange={(e) => onChange({ ...data, clientName: e.target.value })}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue outline-none transition-all text-xs md:text-sm"
            />
          </div>
          <div className="space-y-1 min-w-0">
            <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Detail</label>
            <input
              type="text"
              placeholder="Phone or Email"
              value={data.clientContact}
              onChange={(e) => onChange({ ...data, clientContact: e.target.value })}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue outline-none transition-all text-xs md:text-sm"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bill Number / IBAN</label>
            <input
              type="text"
              placeholder="Enter Bill Number or IBAN"
              value={data.billNumber}
              onChange={(e) => onChange({ ...data, billNumber: e.target.value })}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue outline-none transition-all text-xs md:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <CreditCard className="text-accent-blue" size={18} />
            <h2 className="font-display font-bold text-sm md:text-lg">Fee Schedule</h2>
          </div>
          <button
            onClick={onAddRow}
            className="flex items-center gap-1 text-[9px] font-bold text-accent-blue bg-accent-blue/5 px-3 py-1 rounded-full hover:bg-accent-blue/10 transition-all uppercase tracking-wider"
          >
            <Plus size={12} /> Add Item
          </button>
        </div>

        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Description</th>
                <th className="text-right py-2 w-32 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Amount ({data.currency})</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.services.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      placeholder="Service detail..."
                      value={row.description}
                      onChange={(e) => onRowChange(row.id, "description", e.target.value)}
                      className="w-full bg-transparent outline-none text-[11px] md:text-sm placeholder:text-slate-300"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      value={row.amount}
                      onChange={(e) => onRowChange(row.id, "amount", parseFloat(e.target.value) || 0)}
                      className="w-full text-right bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 text-[11px] md:text-sm outline-none font-bold"
                    />
                  </td>
                  <td className="py-2 text-right pl-2">
                    <button
                      onClick={() => onDeleteRow(row.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.services.length === 0 && (
            <div className="py-6 text-center text-slate-400 text-xs italic">
              No line items.
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="text-left text-[8px] md:text-[10px] font-mono text-slate-400 space-y-0.5">
            {data.currency !== 'USD' && <p>USD Target: ${totalConv.USD.toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>}
            {data.currency !== 'PKR' && <p>PKR Target: Rs {totalConv.PKR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>}
          </div>
          <div className="text-right space-y-0.5 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-50">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Total Payable</p>
            <p className="text-xl md:text-3xl font-display font-bold text-navy">
              {CURRENCIES[data.currency].symbol} {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-2">
        <div className="flex items-center gap-2">
          <Notebook className="text-slate-400" size={18} />
          <h2 className="font-display font-bold text-sm md:text-lg">Terms & Conditions</h2>
        </div>
        <textarea
          rows={2}
          placeholder="Specify payment deadlines or conditions..."
          value={data.notes}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue outline-none transition-all text-[11px] resize-none"
        />
      </div>

      {/* Export Action */}
      <button
        onClick={onExport}
        className="w-full bg-navy hover:bg-navy/90 text-white py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold font-display flex items-center justify-center gap-2 md:gap-3 shadow-xl shadow-navy/10 transition-all active:scale-[0.98] text-sm md:text-base"
      >
        <Download size={18} />
        Finalize & Download PDF
      </button>
    </div>
  );
};
