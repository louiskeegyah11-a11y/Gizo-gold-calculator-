// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA, type VitePluginPWAAPI } from "vite-plugin-pwa";
import { copyFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Native Capacitor builds package local web assets and do not need a website service worker.
// Skip the PWA plugin in native builds to prevent its closeBundle hook running before
// TanStack Start has finished creating dist/client/index.html.
const isNativeBuild = process.env.GIZO_NATIVE_BUILD === "1";

const createOfflinePlugins = () => VitePWA({
  strategies: "generateSW",
  filename: "sw.js",
  outDir: "dist/client",
  manifest: false,
  injectRegister: null,
  registerType: "autoUpdate",
  devOptions: { enabled: false },
  workbox: {
    globDirectory: "dist/client",
    globPatterns: ["**/*.{js,css,woff2,png,ico,webmanifest}"],
    // HTML uses NetworkFirst, including the precached generic fallback.
    globIgnores: ["**/server/**"],
    directoryIndex: null,
    navigateFallback: null,
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: ({ request, url }) => request.mode === "navigate" && url.origin === self.location.origin && !/^\/(?:~oauth|api)(?:\/|$)/.test(url.pathname),
        handler: "NetworkFirst",
        options: { cacheName: "gizo-pages", networkTimeoutSeconds: 3, precacheFallback: { fallbackURL: "/offline-shell.html" }, cacheableResponse: { statuses: [200] }, expiration: { maxEntries: 30 } },
      },
      {
        urlPattern: ({ url }) => url.origin === self.location.origin && /^\/assets\/.+-[\w-]+\.(?:js|css|woff2|png)$/.test(url.pathname),
        handler: "CacheFirst",
        options: { cacheName: "gizo-assets", expiration: { maxEntries: 200 } },
      },
    ],
  },
});

const offlinePlugins = isNativeBuild ? [] : createOfflinePlugins();

// TanStack prerenders after the client environment closes. Generate the browser
// offline shell only after the whole app build; native builds skip this plugin.
for (const plugin of offlinePlugins) delete plugin.closeBundle;
const offlineBuild = {
  name: "gizo:offline-after-prerender",
  enforce: "post" as const,
  apply: "build" as const,
  buildApp: {
    order: "post" as const,
    async handler() {
      const api = offlinePlugins.find((plugin) => plugin.name === "vite-plugin-pwa")?.api as VitePluginPWAAPI | undefined;
      if (!api) throw new Error("Offline generator unavailable");
      const html = await readFile("dist/client/index.html");
      await copyFile("dist/client/index.html", "dist/client/offline-shell.html");
      const revision = createHash("sha256").update(html).digest("hex");
      api.extendManifestEntries((entries) => [...entries, { url: "/offline-shell.html", revision }]);
      await api.generateSW();
    },
  },
};

export default defineConfig({
  plugins: [...offlinePlugins, ...(isNativeBuild ? [] : [offlineBuild])],
  tanstackStart: {
    pages: [{ path: "/" }],
    prerender: { enabled: true, autoStaticPathsDiscovery: false },
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
});
