import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.louisdenzel.gizogold',
  appName: 'GIZO GOLD CALCULATOR',
  webDir: 'dist/client',
  // Release apps bundle local assets, never a remote preview URL.
  server: { hostname: 'localhost', androidScheme: 'https' },
};

export default config;