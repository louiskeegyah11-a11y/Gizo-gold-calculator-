import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import config from '../../capacitor.config';
import { deliverFile } from '@/lib/deliver-file';
import { saveImageToGallery } from '@/lib/invoice-image';
import { printInvoice } from '@/lib/print-invoice';
import { registerOfflineApp } from '@/lib/offline';
import { loadInvoices } from '@/lib/invoices';

const mocks = vi.hoisted(() => ({
  native: vi.fn(() => true),
  write: vi.fn(async () => ({ uri: 'file:///cache/invoice.png' })),
  remove: vi.fn(async () => undefined),
  share: vi.fn(async () => ({})),
  print: vi.fn(async () => undefined),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: mocks.native } }));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: mocks.write, deleteFile: mocks.remove }, Directory: { Cache: 'CACHE' },
}));
vi.mock('@capacitor/share', () => ({ Share: { share: mocks.share } }));
vi.mock('@capgo/capacitor-printer', () => ({ Printer: { printWebView: mocks.print } }));

beforeEach(() => { vi.clearAllMocks(); mocks.native.mockReturnValue(true); });
afterEach(() => { vi.useRealTimers(); localStorage.clear(); });

describe('native preparation', () => {
  it('uses the requested application identity and bundled offline assets', () => {
    expect(config.appId).toBe('com.louisdenzel.gizogold');
    expect(config.appName).toBe('GIZO GOLD CALCULATOR');
    expect(config.webDir).toBe('dist/client');
    expect(config.server?.url).toBeUndefined();
  });
  it('shares receipt images as file-only native attachments and removes temporary files', async () => {
    expect(await saveImageToGallery(new File(['receipt'], 'invoice.png', { type: 'image/png' }))).toBe('shared');
    expect(mocks.write).toHaveBeenCalledWith(expect.objectContaining({ data: 'cmVjZWlwdA==', directory: 'CACHE' }));
    expect(mocks.share).toHaveBeenCalledWith({ files: ['file:///cache/invoice.png'] });
    vi.useFakeTimers();
    // A separate export schedules the cleanup under the fake clock.
    const read = vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      Object.defineProperty(this, 'result', { configurable: true, value: 'data:image/png;base64,YQ==' });
      this.onload?.(new ProgressEvent('load') as ProgressEvent<FileReader>);
    });
    await deliverFile(new File(['a'], 'customers.xlsx'));
    await vi.advanceTimersByTimeAsync(300_000);
    expect(mocks.remove).toHaveBeenCalledWith(expect.objectContaining({ directory: 'CACHE' }));
    read.mockRestore();
  });
  it('does not replace or clear existing customer records during native setup', async () => {
    const existing = [{ id: 'existing-record', customerName: 'Existing seller', result: { amount: 67179 } }];
    localStorage.setItem('gizo-gold-invoices', JSON.stringify(existing));
    await registerOfflineApp();
    expect(loadInvoices()).toEqual(existing);
  });
  it('opens the native print dialog and keeps browser printing unchanged', async () => {
    await printInvoice();
    expect(mocks.print).toHaveBeenCalledWith({ name: 'GIZO GOLD invoice' });
    mocks.native.mockReturnValue(false);
    const browserPrint = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    await printInvoice();
    expect(browserPrint).toHaveBeenCalledOnce();
    browserPrint.mockRestore();
  });
  it('treats a dismissed share sheet as cancellation, not a downloaded file', async () => {
    mocks.share.mockRejectedValueOnce(new Error('Share canceled'));
    expect(await deliverFile(new File(['a'], 'invoice.png'))).toBe('cancelled');
  });
});