export type GoldType = "refined" | "ball";

/** Grams in one local gold "pound". */
export const GRAMS_PER_POUND = 7.75;
/** Price entered is for 23 karat gold (higher karat pays proportionally more). */
export const MAX_KARAT = 23;
export const DEFAULT_DISCOUNT_PERCENT = 0.7;

export interface GoldInput {
  topWeight: number;
  downWeight: number;
  price: number;
  goldType: GoldType;
  discountPercent: number;
}

export interface GoldResult {
  pounds: number;
  density: number;
  karat: number;
  purity: number;
  pricePerPound: number;
  amount: number;
  discountApplied: number;
}

const truncate2 = (n: number) => Math.floor(n * 100 + 1e-9) / 100;

export const EMPTY_RESULT: GoldResult = {
  pounds: 0,
  density: 0,
  karat: 0,
  purity: 0,
  pricePerPound: 0,
  amount: 0,
  discountApplied: 0,
};

/** Lowest density accepted; below this the down (water) figure is flagged. */
export const MIN_DENSITY = 15;
/** Density of pure (24kt) gold — anything higher is impossible. */
export const MAX_DENSITY = 19.32;

/**
 * Checks the down (water) figure against the top weight.
 * Returns a message when the figure is wrong, or null when it looks fine.
 */
export function checkDownWeight(topWeight: number, downWeight: number): string | null {
  if (!(topWeight > 0) || !(downWeight > 0)) return null;
  if (downWeight >= topWeight) {
    return "Down (water) figure must be smaller than the top weight.";
  }
  const density = truncate2(topWeight / downWeight);
  if (density < MIN_DENSITY) {
    return `Down (water) figure is too high — density ${density.toFixed(2)} is below 15.00. Check the figure.`;
  }
  if (density > MAX_DENSITY) {
    return `Down (water) figure is too low — density ${density.toFixed(2)} is above pure gold (${MAX_DENSITY}). Check the figure.`;
  }
  return null;
}

export function calculateGold(input: GoldInput): GoldResult {
  const { topWeight, downWeight, price, goldType } = input;
  const safePrice = price > 0 ? price : 0;
  if (!(topWeight > 0)) return EMPTY_RESULT;
  const pounds = truncate2(topWeight / GRAMS_PER_POUND);

  if (goldType === "ball") {
    // Ball: pounds × price, no karat, no discount. Amount in whole cedis.
    const amount = Math.floor(pounds * safePrice + 1e-9);
    return { ...EMPTY_RESULT, pounds, amount };
  }

  if (!(downWeight > 0)) return { ...EMPTY_RESULT, pounds };
  // A wrong down (water) figure gives no payout, so nobody is paid on bad numbers.
  if (checkDownWeight(topWeight, downWeight)) return { ...EMPTY_RESULT, pounds };

  const discountApplied = DEFAULT_DISCOUNT_PERCENT;
  // Density is cut (not rounded) to 2 decimals ONCE; that fixed figure drives everything below.
  const density = truncate2(topWeight / downWeight);
  // Karat before discount, from the fixed density, cut to 2 decimals.
  const baseKarat = truncate2(Math.max(0, ((density - 10.51) * 52.838) / density));
  // Karat used: the cut karat less 0.7%, cut again. No cap (24.18/1.29 → 23.03).
  const karat = truncate2(baseKarat * (1 - discountApplied / 100));
  // Purity follows Karat Used exactly: karat ÷ 24 × 100, to the nearest 2 decimals
  // (the other app's method: 22.84 → 95.17, 22.18 → 92.42). 
  const purity = Math.round((karat / 24) * 100 * 100 + 1e-9) / 100;

  const pricePerPound = truncate2((safePrice * karat) / MAX_KARAT);
  const amount = Math.floor(pounds * pricePerPound + 1e-9);
  return { pounds, density, karat, purity, pricePerPound, amount, discountApplied };
}

export function formatMoney(n: number) {
  return n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatNum(n: number) {
  return n.toFixed(2);
}
