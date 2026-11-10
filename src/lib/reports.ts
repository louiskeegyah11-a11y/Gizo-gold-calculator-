import {
  addMonths,
  addQuarters,
  addWeeks,
  format,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from "date-fns";

import type { Invoice } from "./invoices";

export type PeriodKind = "week" | "month" | "quarter";

export interface PeriodRange {
  kind: PeriodKind;
  /** Inclusive start (local time). */
  start: Date;
  /** Exclusive end (local time). */
  end: Date;
  label: string;
}

export interface ReportSummary {
  count: number;
  refinedCount: number;
  ballCount: number;
  /** Sum of top weights, grams. */
  totalWeight: number;
  /** Sum of the pounds printed on each invoice. */
  totalPounds: number;
  /** Sum of amounts paid to sellers, whole cedis. */
  totalAmount: number;
  /** Average Karat Used across refined invoices (0 when none). */
  averageKarat: number;
}

/** Weeks run Monday to Sunday. */
const WEEK = { weekStartsOn: 1 } as const;

// Sums of 2-decimal figures pick up float noise (0.1 + 0.2); snap back to 2 decimals.
const clean2 = (n: number) => Math.round(n * 100) / 100;

export function periodStart(kind: PeriodKind, date: Date): Date {
  if (kind === "week") return startOfWeek(date, WEEK);
  if (kind === "month") return startOfMonth(date);
  return startOfQuarter(date);
}

function step(kind: PeriodKind, date: Date, n: number): Date {
  if (kind === "week") return addWeeks(date, n);
  if (kind === "month") return addMonths(date, n);
  return addQuarters(date, n);
}

export function periodLabel(kind: PeriodKind, start: Date): string {
  if (kind === "week") {
    const last = new Date(step("week", start, 1).getTime() - 1);
    return `${format(start, "d MMM")} – ${format(last, "d MMM yyyy")}`;
  }
  if (kind === "month") return format(start, "MMMM yyyy");
  const last = addMonths(start, 2);
  return `Q${Math.floor(start.getMonth() / 3) + 1} ${format(start, "yyyy")} (${format(start, "MMM")}–${format(last, "MMM")})`;
}

export function periodRange(kind: PeriodKind, date: Date): PeriodRange {
  const start = periodStart(kind, date);
  return { kind, start, end: step(kind, start, 1), label: periodLabel(kind, start) };
}

/** The period `delta` steps before (negative) or after (positive) the one containing `date`. */
export function shiftPeriod(kind: PeriodKind, date: Date, delta: number): Date {
  return step(kind, periodStart(kind, date), delta);
}

export function invoicesInRange(list: Invoice[], range: { start: Date; end: Date }): Invoice[] {
  const s = range.start.getTime();
  const e = range.end.getTime();
  return list
    .filter((inv) => {
      const t = new Date(inv.createdAt).getTime();
      return t >= s && t < e;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function summarize(list: Invoice[]): ReportSummary {
  const refined = list.filter((i) => i.input.goldType !== "ball");
  const karatSum = refined.reduce((sum, i) => sum + i.result.karat, 0);
  return {
    count: list.length,
    refinedCount: refined.length,
    ballCount: list.length - refined.length,
    totalWeight: clean2(list.reduce((sum, i) => sum + i.input.topWeight, 0)),
    totalPounds: clean2(list.reduce((sum, i) => sum + i.result.pounds, 0)),
    totalAmount: list.reduce((sum, i) => sum + i.result.amount, 0),
    // Average is cut to 2 decimals like every other figure in the app.
    averageKarat: refined.length ? Math.floor((karatSum / refined.length) * 100 + 1e-9) / 100 : 0,
  };
}

export interface BreakdownRow {
  label: string;
  start: Date;
  end: Date;
  summary: ReportSummary;
}

/** Splits a report: a week by day, a month by week, a quarter by month. */
export function breakdown(range: PeriodRange, list: Invoice[]): BreakdownRow[] {
  const rows: BreakdownRow[] = [];
  if (range.kind === "week") {
    for (let i = 0; i < 7; i++) {
      const start = new Date(range.start);
      start.setDate(start.getDate() + i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      rows.push({ label: format(start, "EEE d MMM"), start, end, summary: summarize(invoicesInRange(list, { start, end })) });
    }
    return rows;
  }
  if (range.kind === "quarter") {
    for (let i = 0; i < 3; i++) {
      const start = addMonths(range.start, i);
      const end = addMonths(start, 1);
      rows.push({ label: format(start, "MMMM yyyy"), start, end, summary: summarize(invoicesInRange(list, { start, end })) });
    }
    return rows;
  }
  // Month: Monday–Sunday weeks, clipped to the month.
  let cursor = range.start;
  while (cursor < range.end) {
    const weekEnd = addWeeks(startOfWeek(cursor, WEEK), 1);
    const end = weekEnd < range.end ? weekEnd : range.end;
    const last = new Date(end.getTime() - 1);
    rows.push({
      label: `${format(cursor, "d MMM")} – ${format(last, "d MMM")}`,
      start: cursor,
      end,
      summary: summarize(invoicesInRange(list, { start: cursor, end })),
    });
    cursor = end;
  }
  return rows;
}

/** Every period of this kind that has at least one invoice, newest first. */
export function allPeriods(kind: PeriodKind, list: Invoice[]): BreakdownRow[] {
  const starts = new Map<number, Date>();
  for (const inv of list) {
    const s = periodStart(kind, new Date(inv.createdAt));
    starts.set(s.getTime(), s);
  }
  return [...starts.values()]
    .sort((a, b) => b.getTime() - a.getTime())
    .map((start) => {
      const range = periodRange(kind, start);
      return { label: range.label, start, end: range.end, summary: summarize(invoicesInRange(list, range)) };
    });
}
