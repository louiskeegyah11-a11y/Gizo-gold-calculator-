import { format } from "date-fns";
import type { Invoice } from "./invoices";
import { invoicesInRange, type PeriodRange } from "./reports";

export const CUSTOMER_HEADERS = [
  "Customer name",
  "Phone number",
  "Address",
  "Gold type",
  "Top weight (g)",
  "Down / water (g)",
  "Pounds",
  "Total amount (GH₵)",
];

export function customerReportInvoices(all: Invoice[], range?: PeriodRange): Invoice[] {
  return range
    ? invoicesInRange(all, range)
    : [...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function customerReportRow(inv: Invoice): (string | number | null)[] {
  return [
    inv.customerName || "",
    inv.customerPhone || "",
    inv.customerAddress || "",
    inv.input.goldType === "ball" ? "Ball" : "Refined",
    inv.input.topWeight,
    inv.input.goldType === "ball" ? null : inv.input.downWeight,
    inv.result.pounds,
    inv.result.amount,
  ];
}

export function customerReportName(range: PeriodRange | undefined, now: Date): string {
  return `GIZO-Gold-Customers-${range ? `${range.kind}-${format(range.start, "yyyy-MM-dd")}` : format(now, "yyyy-MM-dd")}`;
}

export function customerReportPages(list: Invoice[]): Invoice[][] {
  return Array.from({ length: Math.ceil(list.length / 6) }, (_, i) => list.slice(i * 6, i * 6 + 6));
}
