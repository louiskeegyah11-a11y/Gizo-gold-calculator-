import { describe, expect, it } from "vitest";
import {
  customerReportInvoices,
  customerReportPages,
  customerReportRow,
} from "@/lib/customer-report";
import { periodRange } from "@/lib/reports";
import type { Invoice } from "@/lib/invoices";

function invoice(date: string): Invoice {
  return {
    id: date,
    number: date,
    createdAt: date,
    customerName: "Kofi",
    customerPhone: "0240000000",
    customerAddress: "Accra",
    notes: "",
    input: {
      topWeight: 47.68,
      downWeight: 2.56,
      price: 11000,
      goldType: "refined",
      discountPercent: 0.7,
    },
    result: {
      pounds: 6.15,
      density: 18.62,
      karat: 22.84,
      purity: 95.17,
      pricePerPound: 10923.47,
      amount: 67179,
      discountApplied: 0.7,
    },
  };
}

describe("customer period exports", () => {
  const all = [
    "2026-10-01",
    "2026-10-31",
    "2026-11-02",
    "2026-11-04",
    "2026-11-09",
    "2027-01-01",
  ].map((d) => invoice(`${d}T12:00:00`));
  for (const [kind, count] of [
    ["week", 2],
    ["month", 3],
    ["quarter", 5],
  ] as const) {
    it(`includes only customer sales within the ${kind}`, () => {
      expect(customerReportInvoices(all, periodRange(kind, new Date(2026, 10, 4)))).toHaveLength(
        count,
      );
    });
  }
  it("uses stored customer details and figures without recalculation", () => {
    expect(customerReportRow(invoice("2026-11-04T12:00:00"))).toEqual([
      "Kofi",
      "0240000000",
      "Accra",
      "Refined",
      47.68,
      2.56,
      6.15,
      67179,
    ]);
  });
  it("keeps all customers across bounded picture pages", () => {
    const list = Array.from({ length: 19 }, (_, i) => invoice(`sale-${i}`));
    const pages = customerReportPages(list);
    expect(pages.map((p) => p.length)).toEqual([6, 6, 6, 1]);
    expect(pages.flat()).toEqual(list);
    expect(customerReportPages([])).toEqual([]);
  });
});
