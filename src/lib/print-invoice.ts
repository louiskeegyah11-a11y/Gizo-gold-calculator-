import { isNativeApp } from './native-files';

/** Keep the same invoice document and print CSS on web and native. */
export async function printInvoice(): Promise<void> {
  if (isNativeApp()) {
    const { Printer } = await import('@capgo/capacitor-printer');
    await document.fonts?.ready;
    await Printer.printWebView({ name: 'GIZO GOLD invoice' });
    return;
  }
  window.print();
}