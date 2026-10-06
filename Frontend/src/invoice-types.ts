/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ServiceItem {
  id: string;
  description: string;
  amount: number;
}

export type Currency = "SAR" | "PKR" | "USD" | "EUR";

export type InvoiceTemplate = "classic" | "modern";

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  currency: Currency;
  clientName: string;
  clientContact: string;
  billNumber: string;
  services: ServiceItem[];
  notes: string;
  templateStyle?: InvoiceTemplate;
  customBankName?: string;
  customBankTitle?: string;
  customBankNumber?: string;
  customBankIBAN?: string;
}

export const CURRENCIES: Record<Currency, { symbol: string; label: string }> = {
  SAR: { symbol: "SAR", label: "🇸🇦 SAR" },
  PKR: { symbol: "Rs", label: "🇵🇰 PKR" },
  USD: { symbol: "$", label: "🇺🇸 USD" },
  EUR: { symbol: "€", label: "🇪🇺 EUR" },
};

// Indicative rates relative to 1 USD
export const EXCHANGE_RATES = {
  USD: 1,
  SAR: 3.75,
  EUR: 0.92,
  PKR: 278,
};

export const convertCurrency = (amount: number, from: Currency) => {
  const amountInUsd = amount / EXCHANGE_RATES[from];
  return {
    USD: amountInUsd,
    SAR: amountInUsd * EXCHANGE_RATES.SAR,
    EUR: amountInUsd * EXCHANGE_RATES.EUR,
    PKR: amountInUsd * EXCHANGE_RATES.PKR,
  };
};
