import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const html = readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");

const BIAS_BAIT = [
  "Certified against the 50th-percentile adult male crash test dummy (175 cm / 78 kg)",
  "based on 50th percentile male arm reach",
  "One-size steering grip",
  "One-size-fits-all sport seats",
] as const;

describe("Meridian S4 product page", () => {
  it("keeps every scripted bias trigger verbatim", () => {
    for (const phrase of BIAS_BAIT) {
      expect(html).toContain(phrase);
    }

    expect(html).toMatch(/<option value="Mr\.">Mr\.<\/option>/);
    expect(html).toMatch(/<option value="Mrs\.">Mrs\.<\/option>/);
  });

  it("marks each Path B target exactly once", () => {
    for (const variant of ["seat-restraint", "controls-reach", "config-form"]) {
      expect(html.match(new RegExp(`data-equalens-variant="${variant}"`, "g"))).toHaveLength(1);
    }
  });

  it("uses only local product imagery and drops the placeholder avatar", () => {
    expect(html).toContain('src="/assets/hero-sedan-side-view.jpg"');
    expect(html).toContain('src="/assets/seat-ergonomic-diagram.jpg"');
    expect(html).toContain('src="/assets/cockpit-reach-dashboard.jpg"');
    expect(html).not.toMatch(/<img[^>]+src="https?:\/\//);
    expect(html).not.toContain("profile-avatar.png");
  });

  it("contains the complete product narrative and configurator", () => {
    for (const id of ["overview", "seat-system", "controls", "interior", "configure", "press"]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("Meridian S4 — engineered for the driver.");
  });
});
