// @vitest-environment jsdom

import type { Finding } from "@equalens/shared/types";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountOverlay, type OverlayController } from "./overlay";
import { scoreFindings } from "./scan-overlay";

class TestStyleSheet {
  replaceSync(_cssText: string) {}
}

const safetyFinding: Finding = {
  id: "safety",
  selector: "#safety-target",
  title: "Single-body safety baseline",
  assumption: "One average male body represents every occupant.",
  impact: "Other occupants may receive less protection.",
  affected: ["shorter occupants", "pregnancy"],
  category: "safety",
  severity: "safety-high",
  confidence: "high",
  evidenceTags: ["crash-dummy-body-range"],
  source: "ai",
  redesignable: true,
  fixed: false,
};

const approximateFinding: Finding = {
  id: "language",
  selector: "#removed-target",
  title: "Male-default language",
  assumption: "A male term represents every user.",
  impact: "Other users are treated as exceptions.",
  affected: ["women", "non-binary people"],
  category: "language",
  severity: "language",
  confidence: "high",
  evidenceTags: [],
  source: "ai",
  stereotype: true,
  redesignable: true,
  fixed: false,
};

describe("Phase 5 scan overlay", () => {
  let controller: OverlayController | null = null;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.stubGlobal("CSSStyleSheet", TestStyleSheet);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    Object.defineProperty(ShadowRoot.prototype, "adoptedStyleSheets", {
      configurable: true,
      get() { return []; },
      set(_value: CSSStyleSheet[]) {},
    });
    document.body.innerHTML = '<p id="safety-target">50th percentile male baseline</p>';
    const target = document.querySelector<HTMLElement>("#safety-target")!;
    target.getBoundingClientRect = () => DOMRect.fromRect({ x: 40, y: 80, width: 260, height: 32 });
    target.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    controller?.destroy();
    controller = null;
    vi.unstubAllGlobals();
  });

  it("renders resolved heatmap locations and panel-only selector misses", async () => {
    controller = mountOverlay();
    await act(async () => {
      controller!.showScan([safetyFinding, approximateFinding]);
      controller!.setScanStatus({ mode: "complete" });
    });
    const shadow = controller.host.shadowRoot!;
    const groups = [...shadow.querySelectorAll<HTMLElement>(".eqx-finding-group")];

    expect(shadow.querySelectorAll(".eqx-heatmap-rect")).toHaveLength(1);
    expect(shadow.querySelector(".eqx-heatmap-rect")?.getAttribute("style"))
      .toContain("translate3d(40px, 80px, 0)");
    expect(groups.map(({ dataset }) => dataset.category)).toEqual(["safety", "language"]);
    expect(shadow.textContent).toContain("Location approximate");
    expect(shadow.textContent).toContain("Stereotype");
    expect(shadow.querySelector('[data-testid="alert-count"]')?.textContent).toBe("2");
    expect(shadow.querySelector('[data-testid="inclusion-score"]')?.textContent).toBe("79");
  });

  it("scrolls and pulses a focused finding, then marking it fixed raises the score", async () => {
    controller = mountOverlay();
    await act(async () => {
      controller!.showScan([safetyFinding, approximateFinding]);
      controller!.setScanStatus({ mode: "complete" });
    });
    const shadow = controller.host.shadowRoot!;
    const summary = [...shadow.querySelectorAll<HTMLButtonElement>(".eqx-finding-summary")]
      .find((button) => button.textContent?.includes(safetyFinding.title))!;

    await act(async () => summary.focus());
    expect(document.querySelector<HTMLElement>("#safety-target")!.scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "center",
      inline: "nearest",
    });
    expect(shadow.querySelector(".eqx-heatmap-rect")?.classList.contains("is-pulsing")).toBe(true);

    await act(async () => summary.click());
    expect(shadow.textContent).toContain("AI inference");
    const markFixed = [...shadow.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Mark fixed")!;
    await act(async () => markFixed.click());

    expect(shadow.querySelector('[data-testid="inclusion-score"]')?.textContent).toBe("97");
    expect(shadow.querySelector('[data-testid="alert-count"]')?.textContent).toBe("1");
    expect(shadow.querySelectorAll(".eqx-heatmap-rect")).toHaveLength(0);
    expect(shadow.textContent).toContain("Resolved");
  });

  it("dispatches deferred redesign and export actions with the current findings", async () => {
    const onScanAction = vi.fn();
    controller = mountOverlay({ onScanAction });
    await act(async () => {
      controller!.showScan([safetyFinding]);
      controller!.setScanStatus({ mode: "complete" });
    });
    const shadow = controller.host.shadowRoot!;
    const summary = shadow.querySelector<HTMLButtonElement>(".eqx-finding-summary")!;
    await act(async () => summary.click());

    const redesignThis = [...shadow.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Redesign this")!;
    await act(async () => redesignThis.click());
    expect(onScanAction).toHaveBeenCalledWith("redesign-finding", safetyFinding, [safetyFinding]);

    const exportReport = [...shadow.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Export report")!;
    await act(async () => exportReport.click());
    expect(onScanAction).toHaveBeenCalledWith("export-report", undefined, [safetyFinding]);
  });

  it("locks report export while preparing and exposes a retryable error", async () => {
    controller = mountOverlay();
    await act(async () => {
      controller!.showScan([safetyFinding]);
      controller!.setScanStatus({ mode: "complete" });
    });
    const shadow = controller.host.shadowRoot!;

    await act(async () => controller!.setReportStatus({ mode: "exporting" }));
    const exporting = [...shadow.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Preparing report…")!;
    expect(exporting.disabled).toBe(true);
    expect(exporting.getAttribute("aria-busy")).toBe("true");

    await act(async () => controller!.setReportStatus({ mode: "error", message: "Report service unavailable" }));
    expect(shadow.querySelector('[role="alert"]')?.textContent).toBe("Report service unavailable");
    expect([...shadow.querySelectorAll("button")].some((button) => button.textContent === "Try export again")).toBe(true);
  });

  it("scores only unresolved findings with the canonical shared weights", () => {
    expect(scoreFindings([safetyFinding, approximateFinding])).toBe(79);
    expect(scoreFindings([{ ...safetyFinding, fixed: true }, approximateFinding])).toBe(97);
    expect(scoreFindings([{ ...safetyFinding, fixed: true }, { ...approximateFinding, fixed: true }])).toBe(100);
  });

  it("shows a prominent pending state before the AI report completes", async () => {
    controller = mountOverlay();
    await act(async () => controller!.showScan([]));
    const shadow = controller.host.shadowRoot!;

    expect(shadow.querySelector(".eqx-panel-status")?.textContent).toBe("AI scanning");
    expect(shadow.querySelector(".eqx-deep-scan-progress")).not.toBeNull();
    expect(shadow.querySelector('[data-testid="inclusion-score"]')?.textContent).toBe("—");
    expect(shadow.textContent).toContain("Score pending");

    await act(async () => controller!.setScanStatus({ mode: "complete" }));
    expect(shadow.querySelector('[data-testid="inclusion-score"]')?.textContent).toBe("100");
    expect(shadow.textContent).toContain("No AI findings");
  });
});
