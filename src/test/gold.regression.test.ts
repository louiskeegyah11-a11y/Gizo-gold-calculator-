import { describe, expect, it } from "vitest";
import { calculateGold } from "@/lib/gold";

/**
 * Locked figures for the user's three Refined examples at GH₵ 11,000.
 * Truncation rules (fixed): density cut to 2 decimals once; karat and purity
 * come from that fixed density; every step is cut, never rounded up; the
 * amount drops pesewas. If any last digit changes, these tests fail.
 */
const refined = (topWeight: number, downWeight: number) =>
  calculateGold({ topWeight, downWeight, price: 11000, discountPercent: 0.7, goldType: "refined" });

describe("regression: 47.68 / 2.56 (matches the other app's screen)", () => {
  const r = refined(47.68, 2.56);
  it("pounds 6.15", () => expect(r.pounds).toBe(6.15));
  it("density 18.62", () => expect(r.density).toBe(18.62));
  it("karat 22.84", () => expect(r.karat).toBe(22.84));
  it("purity 95.17", () => expect(r.purity).toBe(95.17));
  it("price per pound 10,923.47", () => expect(r.pricePerPound).toBe(10923.47));
  it("amount 67,179", () => expect(r.amount).toBe(67179));
});

describe("regression: 100.20 / 5.50 (other app shows purity 92.42%)", () => {
  const r = refined(100.2, 5.5);
  it("pounds 12.92", () => expect(r.pounds).toBe(12.92));
  it("density 18.21", () => expect(r.density).toBe(18.21));
  it("karat 22.18", () => expect(r.karat).toBe(22.18));
  it("purity 92.42", () => expect(r.purity).toBe(92.42));
  it("price per pound 10,607.82", () => expect(r.pricePerPound).toBe(10607.82));
  it("amount 137,053", () => expect(r.amount).toBe(137053));
});

describe("regression: 12.20 / 0.67", () => {
  const r = refined(12.2, 0.67);
  it("pounds 1.57", () => expect(r.pounds).toBe(1.57));
  it("density 18.20", () => expect(r.density).toBe(18.2));
  it("karat 22.16", () => expect(r.karat).toBe(22.16));
  it("purity 92.33", () => expect(r.purity).toBe(92.33));
  it("price per pound 10,598.26", () => expect(r.pricePerPound).toBe(10598.26));
  it("amount 16,639", () => expect(r.amount).toBe(16639));
});

describe("regression: 709.21 / 38.31", () => {
  const r = refined(709.21, 38.31);
  it("pounds 91.51", () => expect(r.pounds).toBe(91.51));
  it("density 18.51", () => expect(r.density).toBe(18.51));
  it("karat 22.67", () => expect(r.karat).toBe(22.67));
  it("purity 94.46", () => expect(r.purity).toBe(94.46));
  it("price per pound 10,842.17", () => expect(r.pricePerPound).toBe(10842.17));
  it("amount 992,166", () => expect(r.amount).toBe(992166));
});

describe("purity always follows karat used", () => {
  it("purity = karat ÷ 24 × 100 for every example", () => {
    const examples: Array<[number, number]> = [[47.68, 2.56], [100.2, 5.5], [12.2, 0.67], [709.21, 38.31], [50, 2.8]];
    for (const [t, d] of examples) {
      const r = refined(t, d);
      expect(r.purity).toBe(Math.round((r.karat / 24) * 10000 + 1e-9) / 100);
    }
  });
});
