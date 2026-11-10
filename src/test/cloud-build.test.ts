import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const root = resolve(import.meta.dirname, '../..');
const config = parse(readFileSync(resolve(root, 'codemagic.yaml'), 'utf8'));

describe('Codemagic validation builds', () => {
  for (const name of ['android-unsigned', 'ios-unsigned']) {
    it(`${name} builds web assets and syncs installed Capacitor before compilation`, () => {
      const flow = config.workflows[name];
      const scripts = flow.scripts.map((step: { script: string }) => step.script).join('\n');
      const nativeCommand = name === 'android-unsigned' ? './gradlew' : 'xcodebuild archive';
      expect(scripts.indexOf('bun install --frozen-lockfile')).toBeLessThan(scripts.indexOf('bun run build'));
      expect(scripts).toContain('bun run build');
      expect(scripts.indexOf('bun run build')).toBeLessThan(scripts.indexOf('npx --no-install cap sync'));
      expect(scripts.indexOf('npx --no-install cap sync')).toBeLessThan(scripts.indexOf(nativeCommand));
      expect(scripts).toContain('node scripts/check-native-assets.mjs --synced');
      expect(scripts).toContain(nativeCommand);
    });
    it(`${name} is manual and never publishes or requests signing secrets`, () => {
      const flow = config.workflows[name];
      expect(flow.publishing).toBeUndefined();
      expect(flow.triggering).toBeUndefined();
      expect(flow.integrations).toBeUndefined();
      expect(flow.environment.groups).toBeUndefined();
      expect(flow.environment.ios_signing).toBeUndefined();
      expect(flow.environment.android_signing).toBeUndefined();
    });
  }
  it('produces an Android release AAB and an unsigned macOS iOS archive', () => {
    const android = config.workflows['android-unsigned'];
    const ios = config.workflows['ios-unsigned'];
    expect(android.environment.java).toBe(21);
    expect(android.artifacts).toContain('android/app/build/outputs/bundle/release/*.aab');
    expect(android.scripts.at(-1).script).toContain('bundleRelease');
    expect(ios.instance_type).toBe('mac_mini_m2');
    expect(ios.environment.xcode).toBe('26.4');
    expect(ios.scripts.at(-1).script).toContain('CODE_SIGNING_ALLOWED=NO');
    expect(ios.scripts.at(-1).script).toContain('GizoGold-unsigned.xcarchive.zip');
    expect(ios.artifacts).toContain('build/*.zip');
  });
  it('preserves the app ID across Android and both iOS configurations', () => {
    expect(readFileSync(resolve(root, 'android/app/build.gradle'), 'utf8')).toContain('applicationId "com.louisdenzel.gizogold"');
    const ios = readFileSync(resolve(root, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
    expect(ios.match(/PRODUCT_BUNDLE_IDENTIFIER = com\.louisdenzel\.gizogold;/g)).toHaveLength(2);
  });
  it('refuses compilation when a synced platform is missing its client script', () => {
    const temporary = mkdtempSync(resolve(tmpdir(), 'gizo-assets-'));
    const folders = ['dist/client', 'android/app/src/main/assets/public', 'ios/App/App/public'] as const;
    try {
      for (const folder of folders) {
        mkdirSync(resolve(temporary, folder, 'assets'), { recursive: true });
        writeFileSync(resolve(temporary, folder, 'index.html'), '<script src="/assets/client.js"></script>');
        writeFileSync(resolve(temporary, folder, 'assets/client.js'), '');
      }
      const check = () => spawnSync(process.execPath, [resolve(root, 'scripts/check-native-assets.mjs'), '--synced'], { cwd: temporary });
      expect(check().status).toBe(0);
      rmSync(resolve(temporary, folders[2], 'assets/client.js'));
      expect(check().status).toBe(1);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });
});