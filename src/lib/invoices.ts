import type { GoldInput, GoldResult } from "./gold";

export interface Invoice {
  id: string;
  number: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  /** Missing on invoices saved before the address field existed. */
  customerAddress?: string;
  notes: string;
  input: GoldInput;
  result: GoldResult;
}

const KEY = "gizo-gold-invoices";

export function loadInvoices(): Invoice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Invoice[]) : [];
  } catch {
    return [];
  }
}

function persist(list: Invoice[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function saveInvoice(data: Omit<Invoice, "id" | "number" | "createdAt">): Invoice {
  const list = loadInvoices();
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = String(list.length + 1).padStart(4, "0");
  const invoice: Invoice = {
    ...data,
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    number: `GZ-${ymd}-${seq}`,
    createdAt: now.toISOString(),
  };
  persist([invoice, ...list]);
  return invoice;
}

export function getInvoice(id: string): Invoice | undefined {
  return loadInvoices().find((i) => i.id === id);
}

export function deleteInvoice(id: string) {
  persist(loadInvoices().filter((i) => i.id !== id));
}
