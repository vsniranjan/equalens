// @vitest-environment jsdom

import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapContentScript, type ContentScriptController } from "./content";

class TestStyleSheet {
  replaceSync(_cssText: string) {}
}

describe("content script runtime", () => {
  let controller: ContentScriptController | null = null;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.stubGlobal("CSSStyleSheet", TestStyleSheet);
    Object.defineProperty(ShadowRoot.prototype, "adoptedStyleSheets", {
      configurable: true,
      get() { return []; },
      set(_value: CSSStyleSheet[]) {},
    });
    document.body.innerHTML = '<main><p id="crash-copy">Average male crash test baseline</p></main>';
  });

  afterEach(() => {
    controller?.destroy();
    controller = null;
    window.getSelection()?.removeAllRanges();
    vi.unstubAllGlobals();
  });

  it("mounts once and moves the buddy into attentive selection state", async () => {
    const selectionEvent = vi.fn();
    window.addEventListener("equalens:selection", selectionEvent);
    controller = bootstrapContentScript(document);
    expect(bootstrapContentScript(document)).toBe(controller);
    const paragraph = document.querySelector("p")!;
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    Object.defineProperty(range, "getBoundingClientRect", {
      value: () => ({ top: 80, right: 400, bottom: 104, left: 120, width: 280, height: 24 }),
    });
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    await act(async () => document.dispatchEvent(new Event("selectionchange")));

    const shadow = document.querySelector<HTMLDivElement>("#equalens-root")!.shadowRoot!;
    expect(shadow.querySelector('[data-testid="buddy-orb"]')?.getAttribute("data-mode")).toBe("attentive");
    expect(shadow.textContent).toContain("Ready to inspect this assumption");
    expect(selectionEvent).toHaveBeenCalledOnce();
    expect((selectionEvent.mock.calls[0]?.[0] as CustomEvent).detail).toMatchObject({
      source: "text",
      request: { selector: "#crash-copy" },
    });
  });

  it("starts each AI scan with an empty result set", async () => {
    const actionEvent = vi.fn();
    window.addEventListener("equalens:action", actionEvent);
    controller = bootstrapContentScript(document);
    const shadow = controller.overlay.host.shadowRoot!;
    const orb = shadow.querySelector<HTMLButtonElement>('[data-testid="buddy-orb"]')!;

    await act(async () => orb.click());
    const firstScan = [...shadow.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Scan page")!;
    await act(async () => firstScan.click());

    expect(shadow.textContent).toContain("Deep scan in progress");
    expect(shadow.querySelectorAll(".eqx-finding-row")).toHaveLength(0);
    expect(shadow.querySelector('[data-testid="inclusion-score"]')?.textContent).toBe("100");
    expect(actionEvent).toHaveBeenLastCalledWith(expect.objectContaining({
      detail: expect.objectContaining({ action: "scan", count: 0 }),
    }));

    const close = shadow.querySelector<HTMLButtonElement>('[aria-label="Close findings panel"]')!;
    await act(async () => close.click());
    document.querySelector("#crash-copy")!.textContent = "A neutral vehicle description.";

    await act(async () => orb.click());
    const secondScan = [...shadow.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Scan page")!;
    await act(async () => secondScan.click());

    expect(shadow.textContent).not.toContain("Single-body safety baseline");
    expect(shadow.querySelectorAll(".eqx-finding-row")).toHaveLength(0);
    expect(shadow.querySelector('[data-testid="inclusion-score"]')?.textContent).toBe("100");
  });
});
