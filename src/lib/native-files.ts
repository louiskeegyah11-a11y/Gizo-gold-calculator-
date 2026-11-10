import { Capacitor } from '@capacitor/core';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function nativeShareFile(file: File): Promise<'shared' | 'cancelled'> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return reject(new Error('Could not read file'));
      resolve(reader.result.slice(reader.result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `gizo-share/${Date.now()}-${safeName}`;
  const { uri } = await Filesystem.writeFile({
    path, data: base64, directory: Directory.Cache, recursive: true,
  });
  try {
    // File only: retain Save Image and do not add private data to text or URLs.
    await Share.share({ files: [uri] });
    return 'shared';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/cancel|dismiss|abort/i.test(message)) return 'cancelled';
    throw error;
  } finally {
    setTimeout(() => {
      void Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => undefined);
    }, 300_000);
  }
}