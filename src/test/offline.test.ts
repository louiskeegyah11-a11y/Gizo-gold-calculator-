import { describe, expect, it } from "vitest";
import { refuseOfflineRegistration } from "@/lib/offline-policy";

describe("offline installation safety", () => {
  it("allows published phone and laptop installations", () => {
    expect(refuseOfflineRegistration(true, "gizogold.app", false, "")).toBe(false);
    expect(refuseOfflineRegistration(true, "gizo-gold-invoice.lovable.app", false, "")).toBe(false);
  });
  it("never installs in development, frames or previews", () => {
    expect(refuseOfflineRegistration(false, "localhost", false, "")).toBe(true);
    expect(refuseOfflineRegistration(true, "gizogold.app", true, "")).toBe(true);
    for (const host of ["id-preview--56bc411e-2e80-4442-a0e5-7d3ac2f65f28.lovable.app", "preview-v2--test.gpt-eng.com", "project--56bc411e-2e80-4442-a0e5-7d3ac2f65f28-dev.lovable.app", "x.lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"]) {
      expect(refuseOfflineRegistration(true, host, false, "")).toBe(true);
    }
    expect(refuseOfflineRegistration(true, "preview-v2--shop.example.com", false, "")).toBe(false);
  });
  it("supports the offline kill switch", () => {
    expect(refuseOfflineRegistration(true, "gizogold.app", false, "?sw=off")).toBe(true);
  });
});