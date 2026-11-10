import { isNativeApp, nativeShareFile } from './native-files';

export type DeliverOutcome = "shared" | "downloaded" | "cancelled";

function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Phones: opens the share sheet (iPhone "Save to Files", Android Drive/Excel/WhatsApp).
 * Computers, or phones that can't share this file type: a normal download.
 * Call straight from a tap with a file that is already built.
 */
export async function deliverFile(file: File): Promise<DeliverOutcome> {
  if (isNativeApp()) return nativeShareFile(file);
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const touch = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
  if (touch && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return "shared";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  download(file);
  return "downloaded";
}
