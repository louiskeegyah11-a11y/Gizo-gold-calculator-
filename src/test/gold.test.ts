import { describe, expect, it } from "vitest";
import { calculateGold, checkDownWeight } from "@/lib/gold";

const base = { topWeight: 70.21, downWeight: 3.75, price: 11000, discountPercent: 0.7 };

describe("calculateGold", () => {
  it("shows 1.57 pounds from 12.20 g without water or price", () => {
    const result = calculateGold({ ...base, topWeight: 12.2, downWeight: 0, price: 0, goldType: "refined" });
    expect(result.pounds).toBe(1.57);
    expect(result.density).toBe(0);
    expect(result.karat).toBe(0);
    expect(result.purity).toBe(0);
    expect(result.amount).toBe(0);
  });

  it("keeps weight-only pounds visible without paying on invalid water", () => {
    const result = calculateGold({ ...base, topWeight: 12.2, downWeight: 1.2, goldType: "refined" });
    expect(result.pounds).toBe(1.57);
    expect(result.amount).toBe(0);
  });

  it("pounds = top weight / 7.75, cut to 2 decimals", () => {
    expect(calculateGold({ ...base, goldType: "refined" }).pounds).toBe(9.05);
  });

  it("density = top weight / down weight", () => {
    expect(calculateGold({ ...base, goldType: "refined" }).density).toBe(18.72);
  });

  it("reference example gives karat 23.00", () => {
    expect(calculateGold({ ...base, goldType: "refined" }).karat).toBe(23);
  });

  it("709.21 / 38.31 uses fixed density 18.51 and gives purity 94.46%", () => {
    expect(calculateGold({ ...base, topWeight: 709.21, downWeight: 38.31, goldType: "refined" }).purity).toBe(94.46);
  });

  it("reference example gives purity 95.83%", () => {
    expect(calculateGold({ ...base, goldType: "refined" }).purity).toBe(95.83);
  });

  it("24.18 / 1.29 gives karat 23.03 (not capped at 23)", () => {
    const r = calculateGold({ ...base, topWeight: 24.18, downWeight: 1.29, goldType: "refined" });
    expect(r.density).toBe(18.74);
    expect(r.karat).toBe(23.03);
    expect(r.purity).toBe(95.96);
  });

  it("amount matches the reference example (GHS 99,550.00)", () => {
    expect(calculateGold({ ...base, goldType: "refined" }).amount).toBe(99550);
  });

  it("refined gets the 0.7% purity discount, ball gets none", () => {
    const low = { ...base, topWeight: 50, downWeight: 3.0 }; // 16.66
    expect(calculateGold({ ...low, goldType: "ball" }).discountApplied).toBe(0);
    expect(calculateGold({ ...low, goldType: "refined" }).discountApplied).toBe(0.7);
  });

  it("ball amount = pounds x price (12.20 g at 11,000 = 17,270)", () => {
    const r = calculateGold({ ...base, topWeight: 12.2, downWeight: 0, price: 11000, goldType: "ball" });
    expect(r.amount).toBe(17270);
  });

  it("discount is fixed at 0.7% regardless of input", () => {
    expect(calculateGold({ ...base, discountPercent: 5, goldType: "refined" }).discountApplied).toBe(0.7);
  });

  it("returns zeros when weights are missing", () => {
    expect(calculateGold({ ...base, downWeight: 0, goldType: "refined" }).amount).toBe(0);
  });

  it("12.20 g top weight gives 1.57 pounds", () => {
    expect(calculateGold({ ...base, topWeight: 12.2, downWeight: 0.67, goldType: "refined" }).pounds).toBe(1.57);
  });

  it("12.20 / 0.67 gives density 18.20 (cut, not rounded)", () => {
    expect(calculateGold({ ...base, topWeight: 12.2, downWeight: 0.67, goldType: "refined" }).density).toBe(18.2);
  });

  it("709.21 / 38.31 gives karat 22.67 and purity 94.46%", () => {
    const r = calculateGold({ ...base, topWeight: 709.21, downWeight: 38.31, goldType: "refined" });
    expect(r.purity).toBe(94.46);
    expect(r.karat).toBe(22.67);
  });

  it("12.20 / 0.67 gives karat 22.16 like the other app", () => {
    const r = calculateGold({ ...base, topWeight: 12.2, downWeight: 0.67, goldType: "refined" });
    expect(r.karat).toBe(22.16);
  });
});

describe("fixed density 47.68 / 2.56 (matches the other app's screen)", () => {
  it("density 18.62, karat 22.84, purity 95.17", () => {
    const r = calculateGold({ topWeight: 47.68, downWeight: 2.56, price: 11000, discountPercent: 0.7, goldType: "refined" });
    expect(r.pounds).toBe(6.15);
    expect(r.density).toBe(18.62);
    expect(r.karat).toBe(22.84);
    expect(r.purity).toBe(95.17);
  });
});

describe("2-decimal cut, no rounding up", () => {
  it("ball shows pounds 1.57 for 12.20 g", () => {
    expect(calculateGold({ topWeight: 12.2, downWeight: 0, price: 1000, discountPercent: 0, goldType: "ball" }).pounds).toBe(1.57);
  });
  it("ball amount is drops pesewas (1.57 pounds x 10.5 = 16.00)", () => {
    expect(calculateGold({ topWeight: 12.2, downWeight: 0, price: 10.5, discountPercent: 0, goldType: "ball" }).amount).toBe(16);
  });
});

describe("wrong down (water) figure", () => {
  it("down bigger than top is wrong and pays nothing", () => {
    expect(checkDownWeight(12.2, 13)).not.toBeNull();
    expect(calculateGold({ ...base, topWeight: 12.2, downWeight: 13, goldType: "refined" }).amount).toBe(0);
  });
  it("density below 15.00 (down too high) is wrong", () => {
    expect(checkDownWeight(12.2, 1.2)).not.toBeNull(); // 10.16
    expect(checkDownWeight(14.99, 1)).not.toBeNull();
    expect(checkDownWeight(15, 1)).toBeNull();
  });
  it("density above 19.32 (down too low) is wrong", () => {
    expect(checkDownWeight(12.2, 0.6)).not.toBeNull(); // 20.33
    expect(calculateGold({ ...base, topWeight: 12.2, downWeight: 0.6, goldType: "refined" }).amount).toBe(0);
  });
  it("12.20 / 0.67 is a good figure", () => {
    expect(checkDownWeight(12.2, 0.67)).toBeNull();
  });
});
