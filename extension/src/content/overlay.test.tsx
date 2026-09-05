// @vitest-environment jsdom

import type { AnalyzeRequest, AnalyzeResponse } from "@equalens/shared/types";
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
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
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
      request: {
        text: "50th-percentile adult male",
        outerHTML: "<p>50th-percentile adult male</p>",
        selector: "#baseline",
        context: "Safety baseline",
        pageTitle: "Vehicle",
        pageUrl: "https://vehicle.example/",
        categories: ["safety"],
      },
      rect: { top: 40, right: 360, bottom: 64, left: 120, width: 240, height: 24 },
    }));
    expect(orb.dataset.mode).toBe("attentive");
    expect(orb.parentElement?.getAttribute("style")).toContain("translate3d");
    expect(shadow.textContent).toContain("Ready to inspect this assumption");
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

  it("switches to the static minimal companion without losing the finding count", async () => {
    const controller = mountOverlay();
    const shadow = controller.host.shadowRoot!;

    await act(async () => controller.setOrbStatus({ mode: "alert", count: 4 }));
    await act(async () => controller.setBuddyStyle("minimal"));

    const buddy = shadow.querySelector<HTMLElement>('[data-testid="buddy-orb"]')!;
    expect(buddy.dataset.style).toBe("minimal");
    expect(buddy.querySelector(".eqx-buddy-core")).toBeNull();
    expect(buddy.textContent).toContain("EQL // 04");
    expect(OVERLAY_CSS).toContain('.eqx-buddy[data-style="minimal"]');
  });

  it("recovers from an analysis error and renders matched verified evidence", async () => {
    const request: AnalyzeRequest = {
      text: "Certified against the 50th-percentile adult male crash test dummy",
      outerHTML: "<dd>Certified against the 50th-percentile adult male crash test dummy</dd>",
      selector: "#seat-system dd",
      context: "Restraint validation specification",
      pageTitle: "Meridian S4",
      pageUrl: "https://meridian.example/",
      categories: ["safety"],
    };
    const response: AnalyzeResponse = {
      summary: "The restraint uses one body as its safety baseline.",
      findings: [{
        id: "restraint-baseline",
        selector: request.selector,
        title: "Single-body restraint baseline",
        assumption: "One average male body represents all occupants.",
        impact: "Occupants outside that body range may receive less protection.",
        affected: ["shorter occupants", "pregnancy"],
        category: "safety",
        severity: "safety-high",
        confidence: "high",
        evidenceTags: ["crash-injury-sex-gap"],
        source: "ai",
        redesignable: true,
        fixed: false,
      }],
    };
    const onAnalyze = vi.fn()
      .mockRejectedValueOnce(new Error("Unable to reach EquaLens"))
      .mockResolvedValueOnce(response);
    const controller = mountOverlay({ onAnalyze });
    controller.setSelection({
      text: request.text,
      request,
      rect: { top: 40, right: 360, bottom: 64, left: 120, width: 240, height: 24 },
    });
    const shadow = controller.host.shadowRoot!;

    const explain = [...shadow.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Explain")!;
    await act(async () => explain.click());
    await vi.waitFor(() => expect(shadow.textContent).toContain("Try again"));

    const retry = [...shadow.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Try again")!;
    await act(async () => retry.click());
    await vi.waitFor(() => expect(shadow.textContent).toContain("73% greater odds"));

    expect(shadow.textContent).toContain("verified source");
    expect(shadow.textContent).toContain("AI inference");
    expect(onAnalyze).toHaveBeenLastCalledWith(expect.objectContaining({ mode: "explain" }));
  });

  it("runs the selection redesign workflow and exposes its page comparison controls", async () => {
    const request: AnalyzeRequest = {
      text: "Average adult male baseline",
      outerHTML: '<p id="target">Average adult male baseline</p>',
      selector: "#target",
      context: "Safety baseline",
      pageTitle: "Vehicle",
      pageUrl: "https://vehicle.example/",
      categories: ["safety"],
    };
    const finding = {
      id: "baseline",
      selector: "#target",
      title: "Single-body baseline",
      assumption: "One body represents every occupant.",
      impact: "Other occupants may receive less protection.",
      affected: ["shorter occupants"],
      category: "safety" as const,
      severity: "safety-high" as const,
      confidence: "high" as const,
      evidenceTags: [],
      source: "ai" as const,
      redesignable: true,
      fixed: false,
    };
    const onAnalyze = vi.fn().mockResolvedValue({ findings: [finding], summary: "One finding" });
    const onRedesignSelection = vi.fn().mockResolvedValue(undefined);
    const controller = mountOverlay({ onAnalyze, onRedesignSelection });
    controller.setSelection({
      text: request.text,
      request,
      rect: { top: 40, right: 320, bottom: 64, left: 80, width: 240, height: 24 },
    });
    const shadow = controller.host.shadowRoot!;
    const redesign = [...shadow.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Redesign")!;

    await act(async () => redesign.click());
    await vi.waitFor(() => expect(onRedesignSelection).toHaveBeenCalledWith(finding, request));
    expect(shadow.textContent).toContain("Preview ready on the page");

    const target = document.createElement("section");
    target.getBoundingClientRect = () => DOMRect.fromRect({ x: 80, y: 100, width: 500, height: 240 });
    document.body.append(target);
    const onPositionChange = vi.fn();
    const onKeep = vi.fn();
    const onRevert = vi.fn();
    controller.showRedesignComparison({
      id: "preview",
      target,
      finding,
      rationale: "Expanded the body range.",
      changes: ["Preserved safety metrics"],
      scoreBefore: 82,
      scoreAfter: 100,
      onPositionChange,
      onRefresh: vi.fn(),
      onKeep,
      onRevert,
    });

    expect(shadow.textContent).toContain("82 → 100");
    expect(shadow.textContent).toContain("+18");
    const before = [...shadow.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Before")!;
    await act(async () => before.click());
    expect(onPositionChange).toHaveBeenLastCalledWith(100);
    const keep = [...shadow.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Keep change")!;
    await act(async () => keep.click());
    expect(onKeep).toHaveBeenCalledOnce();
    expect(onRevert).not.toHaveBeenCalled();
  });
});
