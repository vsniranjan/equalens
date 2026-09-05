// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyRedesignVariant, findRedesignVariantTarget } from "./redesign-variants";

class TestStyleSheet {
  cssText = "";
  replaceSync(cssText: string) { this.cssText = cssText; }
}

describe("Phase 7 pre-built page redesigns", () => {
  beforeEach(() => {
    vi.stubGlobal("CSSStyleSheet", TestStyleSheet);
    Object.defineProperty(document, "adoptedStyleSheets", {
      configurable: true,
      get() { return (document as Document & { testSheets?: CSSStyleSheet[] }).testSheets ?? []; },
      set(value: CSSStyleSheet[]) { (document as Document & { testSheets?: CSSStyleSheet[] }).testSheets = value; },
    });
    document.body.innerHTML = "";
  });

  it.each([
    ["seat-restraint", "5th-percentile female", "95th-percentile male", "175 cm / 78 kg"],
    ["controls-reach", "WHEEL CONTROLS", "CONSOLE DUPLICATE", "original 38 mm"],
    ["config-form", "No title", "Mx.", "Optional cabin fit profile"],
  ] as const)("applies the %s variant with inclusive additions and retained details", (id, addition, secondAddition, retained) => {
    document.body.innerHTML = `<section data-equalens-variant="${id}"><p id="finding">Legacy detail</p></section>`;
    const finding = document.querySelector("#finding")!;
    const target = findRedesignVariantTarget(finding)!;

    expect(applyRedesignVariant(target)).toBe(id);
    expect(target.textContent).toContain(addition);
    expect(target.textContent).toContain(secondAddition);
    expect(target.textContent).toContain(retained);
    expect(target.querySelector(`[data-eqx-variant-content="${id}"]`)).not.toBeNull();
  });

  it("rejects an element without a registered variant", () => {
    document.body.innerHTML = "<section></section>";
    expect(() => applyRedesignVariant(document.querySelector("section")!)).toThrow(
      "EquaLens could not resolve the pre-built redesign variant",
    );
  });

  it("preserves the reservation flow and exposes confirmation through a status region", () => {
    document.body.innerHTML = '<section data-equalens-variant="config-form"><p>Original form</p></section>';
    const target = document.querySelector<HTMLElement>("section")!;
    applyRedesignVariant(target);
    const form = target.querySelector<HTMLFormElement>("form")!;
    const confirmation = form.querySelector<HTMLElement>("[data-confirmation]")!;
    form.reportValidity = () => true;

    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));

    expect(confirmation.hidden).toBe(false);
    expect(confirmation.getAttribute("role")).toBe("status");
  });
});
