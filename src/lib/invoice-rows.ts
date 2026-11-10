import { formatMoney, formatNum, MAX_KARAT } from "./gold";
import type { Invoice } from "./invoices";

/** Label/value lines shown on an invoice. Shared by the on-screen invoice and the gallery image. */
export function invoiceRows(invoice: Invoice): [string, string][] {
  const { input, result } = invoice;
  return input.goldType === "ball"
    ? [
        ["Gold type", "Ball"],
        ["Weight", `${formatNum(input.topWeight)} g`],
        ["Pounds", formatNum(result.pounds)],
        ["Price", `GH₵ ${formatMoney(input.price)}`],
      ]
    : [
        ["Gold type", "Refined"],
        ["Top weight", `${formatNum(input.topWeight)} g`],
        ["Down (water)", `${formatNum(input.downWeight)} g`],
        ["Pounds", formatNum(result.pounds)],
        ["Density", formatNum(result.density)],
        ["Karat", formatNum(result.karat)],
        ["Purity", `${formatNum(result.purity)}%`],
        [`Price (${MAX_KARAT}kt)`, `GH₵ ${formatMoney(input.price)}`],
        ["Price per pound", `GH₵ ${formatMoney(result.pricePerPound)}`],
      ];
}

export function invoiceDateParts(invoice: Invoice) {
  const date = new Date(invoice.createdAt);
  return {
    day: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  };
}
