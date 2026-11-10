import { refuseOfflineRegistration } from "./offline-policy";
import { isNativeApp } from './native-files';

// The only app-shell service-worker registrar. Never run it during SSR.
export async function registerOfflineApp() {
  // Native builds load bundled assets offline, without a web service worker.
  if (isNativeApp()) return;
  if (!("serviceWorker" in navigator)) return;
  if (refuseOfflineRegistration(import.meta.env.PROD, window.location.hostname.toLowerCase(), window.self !== window.top, window.location.search)) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((registration) => {
      const worker = registration.active ?? registration.waiting ?? registration.installing;
      return worker && new URL(worker.scriptURL).origin === window.location.origin && new URL(worker.scriptURL).pathname === "/sw.js";
    }).map((registration) => registration.unregister()));
    return;
  }
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}