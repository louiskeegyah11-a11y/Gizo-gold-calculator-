import { formatMoney } from "./gold";
import type { Invoice } from "./invoices";
import { invoiceDateParts, invoiceRows } from "./invoice-rows";
import { isNativeApp, nativeShareFile } from './native-files';

// Canvas cannot read CSS variables, so the brand colours are mirrored here (sRGB of the theme tokens).
const C = {
  bg: "#f3eeea",
  card: "#ffffff",
  ink: "#162146",
  primary: "#7e4401",
  onPrimary: "#fdfaf3",
  muted: "#60697b",
  border: "#dfd5ce",
  gold: "#ddb049",
};

const W = 1080;
const PAD = 96;
const DISPLAY = "Montserrat, system-ui, sans-serif";
const SANS = "Figtree, system-ui, sans-serif";

async function loadFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  const wanted = [
    `800 48px Montserrat`,
    `700 32px Montserrat`,
    `400 30px Figtree`,
    `italic 400 30px Figtree`,
    `600 32px Figtree`,
  ];
  await Promise.race([
    Promise.all(wanted.map((f) => document.fonts.load(f).catch(() => undefined))),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws the invoice; returns the total height used. With draw=false it only measures. */
function paint(ctx: CanvasRenderingContext2D, invoice: Invoice, height: number, draw: boolean): number {
  const { result } = invoice;
  const inner = W - PAD * 2;
  const { day, time } = invoiceDateParts(invoice);

  if (draw) {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, height);
    ctx.fillStyle = C.card;
    roundRect(ctx, 40, 40, W - 80, height - 80, 48);
    ctx.fill();
  }

  let y = PAD + 20;
  ctx.textBaseline = "middle";

  // Header
  if (draw) {
    ctx.fillStyle = C.primary;
    ctx.beginPath();
    ctx.arc(PAD + 40, y + 40, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.onPrimary;
    ctx.font = `800 40px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.fillText("G", PAD + 40, y + 42);

    ctx.textAlign = "left";
    ctx.fillStyle = C.ink;
    ctx.font = `800 40px ${DISPLAY}`;
    ctx.fillText("GIZO GOLD", PAD + 100, y + 24);
    ctx.fillStyle = C.muted;
    ctx.font = `500 22px ${SANS}`;
    ctx.fillText("GOLD PURCHASE INVOICE", PAD + 100, y + 62);

    ctx.textAlign = "right";
    ctx.fillStyle = C.ink;
    ctx.font = `700 28px ${DISPLAY}`;
    ctx.fillText(invoice.number, W - PAD, y + 24);
    ctx.fillStyle = C.muted;
    ctx.font = `400 24px ${SANS}`;
    ctx.fillText(`${day} · ${time}`, W - PAD, y + 62);
  }
  y += 112;
  if (draw) {
    ctx.fillStyle = C.primary;
    ctx.fillRect(PAD, y, inner, 5);
  }
  y += 48;

  // Seller
  if (draw) {
    ctx.textAlign = "left";
    ctx.fillStyle = C.muted;
    ctx.font = `500 22px ${SANS}`;
    ctx.fillText("SELLER", PAD, y);
    ctx.fillStyle = C.ink;
    ctx.font = `700 36px ${DISPLAY}`;
    ctx.fillText(invoice.customerName || "—", PAD, y + 46);
  }
  y += 46;
  if (invoice.customerPhone) {
    if (draw) {
      ctx.fillStyle = C.muted;
      ctx.font = `400 28px ${SANS}`;
      ctx.fillText(invoice.customerPhone, PAD, y + 44);
    }
    y += 44;
  }
  if (invoice.customerAddress) {
    if (draw) {
      ctx.fillStyle = C.muted;
      ctx.font = `400 28px ${SANS}`;
      ctx.fillText(invoice.customerAddress, PAD, y + 44, W - PAD * 2);
    }
    y += 44;
  }
  y += 44;

  // Rows
  for (const [k, v] of invoiceRows(invoice)) {
    if (draw) {
      ctx.textAlign = "left";
      ctx.fillStyle = C.muted;
      ctx.font = `italic 400 30px ${SANS}`;
      ctx.fillText(k, PAD, y + 36);
      ctx.textAlign = "right";
      ctx.fillStyle = C.ink;
      ctx.font = `600 32px ${SANS}`;
      ctx.fillText(v, W - PAD, y + 36);
      ctx.strokeStyle = C.border;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(PAD, y + 72);
      ctx.lineTo(W - PAD, y + 72);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    y += 72;
  }
  y += 36;

  // Amount
  const boxH = 140;
  if (draw) {
    ctx.fillStyle = C.primary;
    roundRect(ctx, PAD, y, inner, boxH, 32);
    ctx.fill();
    ctx.fillStyle = C.onPrimary;
    ctx.textAlign = "left";
    ctx.font = `400 28px ${SANS}`;
    ctx.fillText("Amount paid", PAD + 36, y + 52);
    ctx.fillText("to seller", PAD + 36, y + 90);
    const amount = `GH₵ ${formatMoney(result.amount)}`;
    let size = 56;
    ctx.font = `800 ${size}px ${DISPLAY}`;
    while (ctx.measureText(amount).width > inner - 260 && size > 28) {
      size -= 2;
      ctx.font = `800 ${size}px ${DISPLAY}`;
    }
    ctx.textAlign = "right";
    ctx.fillText(amount, W - PAD - 36, y + boxH / 2 + 2);
  }
  y += boxH;

  if (result.discountApplied > 0) {
    if (draw) {
      ctx.textAlign = "center";
      ctx.fillStyle = C.muted;
      ctx.font = `600 24px ${SANS}`;
      ctx.fillText(`${result.discountApplied}% purity discount applied`, W / 2, y + 40);
    }
    y += 60;
  }

  // Notes
  if (invoice.notes.trim()) {
    y += 40;
    if (draw) {
      ctx.textAlign = "left";
      ctx.fillStyle = C.muted;
      ctx.font = `500 22px ${SANS}`;
      ctx.fillText("NOTES", PAD, y);
    }
    ctx.font = `400 28px ${SANS}`;
    const lines = wrap(ctx, invoice.notes.trim(), inner);
    lines.forEach((line, i) => {
      if (draw) {
        ctx.fillStyle = C.ink;
        ctx.fillText(line, PAD, y + 44 + i * 40);
      }
    });
    y += 44 + (lines.length - 1) * 40;
  }

  // Signatures
  y += 120;
  if (draw) {
    const half = (inner - 60) / 2;
    ctx.fillStyle = C.ink;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(PAD, y, half, 2);
    ctx.fillRect(W - PAD - half, y, half, 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.muted;
    ctx.font = `400 22px ${SANS}`;
    ctx.textAlign = "left";
    ctx.fillText("Seller signature", PAD, y + 30);
    ctx.textAlign = "right";
    ctx.fillText("For GIZO GOLD", W - PAD, y + 30);
  }
  y += 100;
  if (draw) {
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.arc(W / 2 - 150, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = C.muted;
    ctx.font = `500 22px ${SANS}`;
    ctx.fillText("Powered by GIZO GOLD", W / 2 + 8, y);
  }
  y += PAD;
  return y;
}

export interface InvoiceImage {
  file: File;
  dataUrl: string;
}

/** Renders the invoice to a PNG picture suitable for saving to the phone's photo gallery. */
export async function buildInvoiceImage(invoice: Invoice): Promise<InvoiceImage> {
  await loadFonts();
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("Canvas not supported");
  const height = Math.ceil(paint(measure, invoice, 0, false));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  paint(ctx, invoice, height, true);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create image"))), "image/png"),
  );
  const file = new File([blob], `${invoice.number}.png`, { type: "image/png" });
  return { file, dataUrl: canvas.toDataURL("image/png") };
}

export type SaveOutcome = "shared" | "downloaded" | "cancelled" | "blocked";

/**
 * Opens the phone's share sheet (iPhone: "Save Image" → Photos; Android: Gallery/Photos),
 * falling back to a normal download. Must be called directly from a tap.
 * Only the file is shared: adding title/text hides "Save Image" on iPhone.
 */
export async function saveImageToGallery(file: File): Promise<SaveOutcome> {
  if (isNativeApp()) return nativeShareFile(file);
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return "shared";
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === "AbortError") return "cancelled";
      if (name === "NotAllowedError") return "blocked";
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}
