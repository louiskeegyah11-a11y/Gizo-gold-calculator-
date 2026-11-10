import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const roots = ['dist/client'];
if (process.argv.includes('--synced')) {
  roots.push('android/app/src/main/assets/public', 'ios/App/App/public');
}
try {
  for (const directory of roots) {
    const root = resolve(directory);
    const html = await readFile(resolve(root, 'index.html'), 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)]
      .map((match) => match[1]);
    if (!scripts.some((src) => src?.startsWith('/assets/'))) {
      throw new Error(`Expected prerendered calculator HTML with local client scripts in ${directory}.`);
    }
    for (const src of scripts) {
      if (!src || !src.startsWith('/assets/')) continue;
      await access(resolve(root, src.slice(1).split('?')[0]));
    }
  }
  console.log('Local calculator HTML and client scripts found. Device checks are required before release.');
} catch (error) {
  console.error('Run bun run build before Capacitor sync; use --synced only after npx cap sync.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}