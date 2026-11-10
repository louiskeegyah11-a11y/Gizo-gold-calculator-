import {
  customerReportInvoices,
  customerReportName,
  customerReportPages,
  customerReportRow,
  CUSTOMER_HEADERS,
} from "./customer-report";
import { formatMoney, formatNum } from "./gold";
import type { Invoice } from "./invoices";
import { summarize, type PeriodRange } from "./reports";

export interface CustomerPicture {
  file: File;
  url: string;
}

function lines(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const result: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > width && line) {
      result.push(line);
      line = "";
    }
    if (ctx.measureText(word).width > width) {
      for (const character of word) {
        if (ctx.measureText(line + character).width > width && line) {
          result.push(line);
          line = "";
        }
        line += character;
      }
    } else line = line ? `${line} ${word}` : word;
  }
  result.push(line);
  return result;
}

/** Paginated PNGs keep every customer readable without oversized phone canvases. */
export async function buildCustomerPictures(
  all: Invoice[],
  range: PeriodRange,
): Promise<CustomerPicture[]> {
  await document.fonts.ready;
  const list = customerReportInvoices(all, range);
  const pages = customerReportPages(list);
  const summary = summarize(list);
  const css = getComputedStyle(document.documentElement);
  const color = (role: string) => css.getPropertyValue(`--${role}`).trim();
  const widths = [250, 190, 260, 130, 140, 150, 100, 220];
  return Promise.all(
    pages.map(async (page, pageIndex) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Pictures are not supported on this device");
      ctx.font = "24px Figtree, sans-serif";
      const rows = page.map((inv) =>
        customerReportRow(inv).map((value, i) =>
          lines(
            ctx,
            value === null
              ? "—"
              : typeof value === "number"
                ? i === 7
                  ? formatMoney(value)
                  : formatNum(value)
                : value || "—",
            (widths[i] ?? 100) - 24,
          ),
        ),
      );
      const heights = rows.map((row) => Math.max(90, ...row.map((cell) => cell.length * 34 + 32)));
      canvas.height = 380 + heights.reduce((sum, h) => sum + h, 0);
      ctx.fillStyle = color("card");
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color("primary");
      ctx.font = "800 42px Montserrat, sans-serif";
      ctx.fillText("GIZO GOLD — Customer report", 30, 65);
      ctx.font = "28px Figtree, sans-serif";
      ctx.fillStyle = color("foreground");
      ctx.fillText(range.label, 30, 112);
      ctx.font = "24px Figtree, sans-serif";
      ctx.fillText(
        `Page ${pageIndex + 1} of ${pages.length} · ${summary.count} customer sales`,
        30,
        155,
      );
      ctx.fillStyle = color("primary");
      ctx.fillRect(30, 180, 1540, 100);
      let x = 30;
      ctx.font = "600 24px Figtree, sans-serif";
      ctx.fillStyle = color("primary-foreground");
      CUSTOMER_HEADERS.forEach((header, i) => {
        lines(ctx, header, (widths[i] ?? 100) - 24).forEach((line, j) =>
          ctx.fillText(line, x + 12, 215 + j * 30),
        );
        x += widths[i] ?? 100;
      });
      let y = 280;
      ctx.font = "24px Figtree, sans-serif";
      rows.forEach((row, index) => {
        const height = heights[index] ?? 90;
        ctx.fillStyle = color(index % 2 ? "card" : "muted");
        ctx.fillRect(30, y, 1540, height);
        ctx.fillStyle = color("foreground");
        x = 30;
        row.forEach((cell, i) => {
          cell.forEach((line, j) => ctx.fillText(line, x + 12, y + 36 + j * 34));
          x += widths[i] ?? 100;
        });
        y += height;
      });
      ctx.fillStyle = color("primary");
      ctx.font = "600 26px Figtree, sans-serif";
      ctx.fillText(
        `Period totals: ${formatNum(summary.totalWeight)} g · ${formatNum(summary.totalPounds)} lb · GH₵ ${formatMoney(summary.totalAmount)}`,
        30,
        y + 55,
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Could not prepare picture"))),
          "image/png",
        ),
      );
      const file = new File(
        [blob],
        `${customerReportName(range, new Date())}-${pageIndex + 1}.png`,
        { type: "image/png" },
      );
      return { file, url: URL.createObjectURL(blob) };
    }),
  );
}
