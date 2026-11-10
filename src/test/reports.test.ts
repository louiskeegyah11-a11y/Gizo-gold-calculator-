import { describe, expect, it } from "vitest";

import type { Invoice } from "@/lib/invoices";
import { calculateGold, DEFAULT_DISCOUNT_PERCENT, type GoldType } from "@/lib/gold";
import { allPeriods, breakdown, invoicesInRange, periodRange, shiftPeriod, summarize } from "@/lib/reports";
import { customerRowCells, invoiceRowCells } from "@/lib/report-excel";

function inv(when: Date, goldType: GoldType, top: number, down: number, price = 11000): Invoice {
  const input = { topWeight: top, downWeight: down, price, goldType, discountPercent: DEFAULT_DISCOUNT_PERCENT };
  return {
    id: when.toISOString() + top,
    number: `GZ-${top}`,
    createdAt: when.toISOString(),
    customerName: "Kofi",
    customerPhone: "0240000000",
    notes: "",
    input,
    result: calculateGold(input),
  };
}

// Wed 4 Nov 2026, local time
const NOW = new Date(2026, 10, 4, 12, 0);

describe("report periods", () => {
  it("weeks run Monday to Sunday", () => {
    const r = periodRange("week", NOW);
    expect(r.start).toEqual(new Date(2026, 10, 2));
    expect(r.end).toEqual(new Date(2026, 10, 9));
  });

  it("months and quarters start on the 1st", () => {
    expect(periodRange("month", NOW).start).toEqual(new Date(2026, 10, 1));
    expect(periodRange("quarter", NOW).start).toEqual(new Date(2026, 9, 1));
    expect(periodRange("quarter", NOW).end).toEqual(new Date(2027, 0, 1));
    expect(periodRange("quarter", NOW).label).toBe("Q4 2026 (Oct–Dec)");
  });

  it("steps back one period", () => {
    expect(periodRange("month", shiftPeriod("month", NOW, -1)).label).toBe("October 2026");
  });

  it("a week report breaks down into 7 days, a quarter into 3 months", () => {
    expect(breakdown(periodRange("week", NOW), [])).toHaveLength(7);
    expect(breakdown(periodRange("quarter", NOW), [])).toHaveLength(3);
  });
});

describe("report totals", () => {
  const list = [
    inv(new Date(2026, 10, 2, 9), "refined", 47.68, 2.56), // 67,179
    inv(new Date(2026, 10, 4, 10), "ball", 12.2, 0), // 1.57 × 11,000 = 17,270
    inv(new Date(2026, 10, 9, 8), "refined", 100.2, 5.5), // next week: 137,053
    inv(new Date(2026, 9, 31, 23), "refined", 12.2, 0.67), // previous week & month
  ];

  it("only counts invoices inside the week", () => {
    const s = summarize(invoicesInRange(list, periodRange("week", NOW)));
    expect(s.count).toBe(2);
    expect(s.refinedCount).toBe(1);
    expect(s.ballCount).toBe(1);
    expect(s.totalAmount).toBe(67179 + 17270);
    expect(s.totalPounds).toBe(7.72); // 6.15 + 1.57
    expect(s.averageKarat).toBe(22.84);
  });

  it("month total adds every invoice in November", () => {
    const s = summarize(invoicesInRange(list, periodRange("month", NOW)));
    expect(s.count).toBe(3);
    expect(s.totalAmount).toBe(67179 + 17270 + 137053);
  });

  it("export groups every invoice into a period", () => {
    const weeks = allPeriods("week", list);
    expect(weeks.reduce((n, w) => n + w.summary.count, 0)).toBe(4);
    expect(allPeriods("quarter", list)).toHaveLength(1);
  });

  it("Excel row carries the invoice's exact figures", () => {
    const cells = invoiceRowCells(list[0]!).map((c) =>
      c && typeof c === "object" && "value" in c ? c.value : c,
    );
    expect(cells.slice(8, 15)).toEqual([6.15, 18.62, 22.84, 95.17, 11000, 10923.47, 67179]);
  });

  it("customer list row carries name, number, address, weights and amount", () => {
    const invoice = { ...list[0]!, customerAddress: "Accra, Osu" };
    const cells = customerRowCells(invoice).map((c) =>
      c && typeof c === "object" && "value" in c ? c.value : c,
    );
    expect(cells).toEqual(["Kofi", "0240000000", "Accra, Osu", "Refined", 47.68, 2.56, 6.15, 67179]);
  });

  it("customer list row leaves water blank for ball gold", () => {
    const cells = customerRowCells(list[1]!).map((c) =>
      c && typeof c === "object" && "value" in c ? c.value : c,
    );
    expect(cells).toEqual(["Kofi", "0240000000", "", "Ball", 12.2, null, 1.57, 17270]);
  });
});
