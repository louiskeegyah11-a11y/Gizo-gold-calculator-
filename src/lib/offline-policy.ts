export function refuseOfflineRegistration(production: boolean, hostname: string, embedded: boolean, search: string) {
  const host = hostname.toLowerCase();
  const label = host.split(".")[0] ?? "";
  const lovableDomain = ["lovable.app", "gpt-eng.com", "gptengineer.run"].some((domain) => host.endsWith(`.${domain}`));
  const preview = lovableDomain && (/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(label) || label === "project--56bc411e-2e80-4442-a0e5-7d3ac2f65f28-dev");
  const editor = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"].some((domain) => host === domain || host.endsWith(`.${domain}`));
  return !production || embedded || preview || editor || new URLSearchParams(search).get("sw") === "off";
}