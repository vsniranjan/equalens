// @vitest-environment jsdom

import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountOverlay } from "./overlay";
import { OVERLAY_CSS } from "./overlay-styles";

class TestStyleSheet {
  cssText = "";

  replaceSync(cssText: string) {
    this.cssText = cssText;
  }
}

describe("EquaLens overlay", () => {
  beforeEach(() => {
    vi.stubGlobal("CSSStyleSheet", TestStyleSheet);
    Object.defineProperty(ShadowRoot.prototype, "adoptedStyleSheets", {
      configurable: true,
      get() {
        return (this as ShadowRoot & { sheets?: CSSStyleSheet[] }).sheets ?? [];
      },
      set(value: CSSStyleSheet[]) {
        (this as ShadowRoot & { sheets?: CSSStyleSheet[][] }).sheets = value as never;
      },
    });
  });

  afterEach(() => {
    document.querySelector("#equalens-root")?.remove();
    vi.unstubAllGlobals();
  });

  it("mounts one open shadow root with a constructed stylesheet", () => {
    const first = mountOverlay();
    const second = mountOverlay();
    const host = document.querySelector<HTMLDivElement>("#equalens-root")!;

    expect(document.querySelectorAll("#equalens-root")).toHaveLength(1);
    expect(host.shadowRoot).not.toBeNull();
    expect(host.shadowRoot?.adoptedStyleSheets).toHaveLength(1);
    expect(first).toBe(second);
    expect(OVERLAY_CSS).toContain("z-index: 2147483646");
    expect(OVERLAY_CSS).toContain("pointer-events: none");
  });

  it("opens the menu, exposes inspect mode, and glides to a selection", async () => {
    const onAction = vi.fn();
    const controller = mountOverlay({ onAction });
    const shadow = document.querySelector<HTMLDivElement>("#equalens-root")!.shadowRoot!;
    const orb = shadow.querySelector<HTMLButtonElement>('[data-testid="buddy-orb"]')!;

    await act(async () => orb.click());
    const inspect = [...shadow.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Inspect element")!;
    expect(shadow.activeElement?.textContent).toBe("Scan page");
    await act(async () => inspect.click());
    expect(onAction).toHaveBeenCalledWith("inspect");

    await act(async () => controller.setSelection({
      text: "50th-percentile adult male",
      rect: { top: 40, right: 360, bottom: 64, left: 120, width: 240, height: 24 },
    }));
    expect(orb.dataset.mode).toBe("attentive");
    expect(orb.parentElement?.getAttribute("style")).toContain("translate3d");
    expect(shadow.textContent).toContain("Selection ready");
  });

  it("renders thinking and alert states with reduced-motion support in CSS", async () => {
    const controller = mountOverlay();
    const shadow = document.querySelector<HTMLDivElement>("#equalens-root")!.shadowRoot!;
    const orb = shadow.querySelector<HTMLButtonElement>('[data-testid="buddy-orb"]')!;

    await act(async () => controller.setOrbStatus({ mode: "thinking" }));
    expect(orb.dataset.mode).toBe("thinking");
    await act(async () => controller.setOrbStatus({ mode: "alert", count: 3 }));
    expect(orb.dataset.mode).toBe("alert");
    expect(shadow.querySelector('[data-testid="alert-count"]')?.textContent).toBe("3");
    expect(OVERLAY_CSS).toContain("prefers-reduced-motion: reduce");
  });
});
