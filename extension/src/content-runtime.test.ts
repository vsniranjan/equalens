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
});
