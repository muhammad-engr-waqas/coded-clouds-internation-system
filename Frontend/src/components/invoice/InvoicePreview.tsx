/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Notebook } from "lucide-react";
import { InvoiceData, convertCurrency, CURRENCIES } from "../../invoice-types";

// Navy / accent colours defined as constants — avoids relying on Tailwind CSS variables
// that are not registered globally in CCIMS.
const NAVY  = '#0A1628';
const BLUE  = '#4F8EF7';
const TEAL  = '#00D4AA';
const FONT  = "'Space Grotesk', sans-serif";

interface Props {
  data: InvoiceData;
}

export const InvoicePreview = ({ data }: Props) => {
  const grandTotal = data.services.reduce((acc, s) => acc + s.amount, 0);
  const totalConv  = convertCurrency(grandTotal, data.currency);
  const isModern   = (data.templateStyle || "classic") === "modern";

  return (
    <div className="sticky top-8 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden overflow-y-auto lg:max-h-[calc(100vh-4rem)]">

      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <div
        className="py-4 px-4 md:px-8 flex items-center justify-between"
        style={{ background: isModern ? `linear-gradient(to right, ${BLUE}, ${NAVY})` : NAVY }}
      >
        <div className="space-y-0.5">
          <h3 className="text-white font-bold tracking-tighter text-lg md:text-xl leading-none"
            style={{ fontFamily: FONT }}>
            CODED CLOUDS
          </h3>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-80"
            style={{ color: TEAL }}>
            Your Cloud, Our Code
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm text-white px-3 py-1 text-[9px] font-bold rounded border border-white/10">
          {isModern ? "MODERN PDF" : "CLASSIC PDF"}
        </div>
      </div>
      {/* accent line */}
      <div className="h-1 w-full" style={{ background: isModern ? TEAL : BLUE }} />

      <div className="p-4 md:p-8 space-y-5 md:space-y-8">

        {/* ── Info cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {[
            {
              title: 'Invoice Details',
              rows: [
                ['Invoice Number', data.invoiceNumber],
                ['Date',           data.date],
                ['Basic Currency', data.currency],
              ],
            },
            {
              title: 'Client Information',
              rows: [
                ['Name',    data.clientName    || '—'],
                ['Contact', data.clientContact || '—'],
                ['Bill No', data.billNumber    || '—'],
              ],
            },
          ].map(card => (
            <div key={card.title} className="bg-slate-50/60 rounded-xl border border-slate-100 p-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{card.title}</p>
              <div className="space-y-1">
                {card.rows.map(([label, value]) => (
                  <p key={label} className="text-[10px] font-medium text-slate-600">
                    {label}:{' '}
                    <span className="font-bold" style={{ color: NAVY }}>{value}</span>
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Services table preview ───────────────────────────────────── */}
        <div className="space-y-0">
          <div className="bg-slate-50 px-3 py-1.5 border-x border-t border-slate-100 rounded-t text-[8px] font-bold uppercase tracking-widest"
            style={{ color: NAVY }}>
            SECTION A: ONE-TIME SERVICES
          </div>
          <div className="bg-white grid grid-cols-12 gap-2 px-3 py-1.5 border border-slate-100 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            <div className="col-span-8">Description</div>
            <div className="col-span-4 text-right">Amount</div>
          </div>
          <div className="divide-y divide-slate-100 border-x border-b border-slate-100 rounded-b">
            {data.services.map(item => {
              const conv = convertCurrency(item.amount, data.currency);
              return (
                <div key={item.id} className="grid grid-cols-12 gap-2 px-3 py-3 text-[10px] items-center">
                  <div className="col-span-8">
                    <p className="font-medium truncate pr-2" style={{ color: NAVY }}>
                      {item.description || '—'}
                    </p>
                  </div>
                  <div className="col-span-4 text-right">
                    <div className="font-bold leading-none mb-1" style={{ color: NAVY }}>
                      {CURRENCIES[data.currency].symbol}
                      {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      {data.currency !== 'USD' && <p className="text-[8px] text-slate-400 font-medium">(${conv.USD.toFixed(2)})</p>}
                      {data.currency !== 'EUR' && <p className="text-[8px] text-slate-400 font-medium">(€{conv.EUR.toFixed(2)})</p>}
                      {data.currency !== 'PKR' && <p className="text-[8px] text-slate-400 font-medium">(Rs{conv.PKR.toFixed(2)})</p>}
                      {data.currency !== 'SAR' && <p className="text-[8px] text-slate-400 font-medium">(SAR{conv.SAR.toFixed(2)})</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Total ───────────────────────────────────────────────────── */}
        <div className="border-t border-slate-100 pt-3 flex justify-between items-end bg-slate-50/50 -mx-4 px-4 py-3 rounded-b-xl">
          <div className="text-left space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: NAVY }}>
              Total Amount
            </p>
            <div className="flex flex-wrap gap-2 text-[9px] text-slate-500 font-medium">
              {data.currency !== 'USD' && <span>(USD {totalConv.USD.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>}
              {data.currency !== 'EUR' && <span>(EUR {totalConv.EUR.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>}
              {data.currency !== 'PKR' && <span>(PKR {totalConv.PKR.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>}
              {data.currency !== 'SAR' && <span>(SAR {totalConv.SAR.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl md:text-3xl font-bold leading-none" style={{ color: NAVY, fontFamily: FONT }}>
              {CURRENCIES[data.currency].symbol}
              {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* ── Bank payment boxes ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
          {[
            {
              bank: 'UBL Bank',
              rows: [
                ['Account Title',  'Tasneem Ahsan'],
                ['Account Number', '0208301848233'],
                ['IBAN',           'PK36UNIL0109000301848233'],
              ],
            },
            {
              bank: 'STC Bank',
              rows: [
                ['Account Title', 'Muhammad Ali'],
                ['IBAN',          'SA1378000000001252725888'],
                ['Currency',      'USD / Riyal / Euro'],
              ],
            },
          ].map(b => (
            <div key={b.bank} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <h4 className="text-[8px] font-bold uppercase mb-1.5 tracking-tighter border-b border-slate-200 pb-1"
                style={{ color: NAVY }}>
                Bank Transfer – {b.bank}
              </h4>
              <div className="space-y-0.5 text-[8px] text-slate-500 leading-tight">
                {b.rows.map(([label, value]) => (
                  <p key={label} className="font-mono">
                    <span className="font-medium text-slate-400">{label}:</span> {value}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Terms note ───────────────────────────────────────────────── */}
        <div className="mt-4 pt-6 border-t border-dashed border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1 rounded text-white" style={{ background: NAVY }}>
              <Notebook size={10} />
            </div>
            <h4 className="text-[9px] font-bold uppercase tracking-widest" style={{ color: NAVY }}>
              Full Terms &amp; Conditions Included
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[7px] text-slate-400">
            <p>• Service Scope &amp; Nature</p>
            <p>• Currency &amp; Exchange Rates</p>
            <p>• Payment Advance Policy</p>
            <p>• Performance Disclaimers</p>
            <p>• Ad Spend Separations</p>
            <p>• IP &amp; Portfolio Usage</p>
          </div>
          <p className="mt-4 text-[7px] italic text-slate-300 text-center uppercase tracking-widest">
            Page 2 contains complete 20-point protocol
          </p>
        </div>
      </div>
    </div>
  );
};
