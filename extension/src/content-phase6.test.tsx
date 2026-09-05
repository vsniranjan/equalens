// @vitest-environment jsdom

import type { Finding } from "@equalens/shared/types";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapContentScript, type ContentScriptController } from "./content";
import type { ScanCallbacks } from "./messaging";

const messaging = vi.hoisted(() => ({
  requestApi: vi.fn(),
  streamScan: vi.fn(),
}));
const preferenceStorage = vi.hoisted(() => ({
  loadPreferences: vi.fn(),
  watchPreferences: vi.fn(() => vi.fn()),
}));
const navigation = vi.hoisted(() => ({
  openOptionsPage: vi.fn(),
  openReportPage: vi.fn(),
}));

vi.mock("./messaging", () => messaging);
vi.mock("./preferences", async (importOriginal) => ({
  ...await importOriginal<typeof import("./preferences")>(),
  loadPreferences: preferenceStorage.loadPreferences,
  watchPreferences: preferenceStorage.watchPreferences,
}));
vi.mock("./navigation", () => navigation);

class TestStyleSheet {
  replaceSync(_cssText: string) {}
}

const aiFinding: Finding = {
  id: "ai-seat",
  selector: "#scan-target",
  title: "AI-enriched safety baseline",
  assumption: "One reference body represents every occupant.",
  impact: "Other occupants may receive less protection.",
  affected: ["shorter occupants"],
  category: "safety",
  severity: "safety-high",
  confidence: "high",
  evidenceTags: ["crash-dummy-body-range"],
  source: "ai",
  redesignable: true,
  fixed: false,
};

describe("AI content scan pipeline", () => {
  let controller: ContentScriptController | null = null;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.stubGlobal("CSSStyleSheet", TestStyleSheet);
    Object.defineProperty(ShadowRoot.prototype, "adoptedStyleSheets", {
      configurable: true,
      get() { return []; },
      set(_value: CSSStyleSheet[]) {},
    });
    document.body.innerHTML = '<main><p id="scan-target">Average male crash test baseline</p></main>';
    document.querySelector("#scan-target")!.getBoundingClientRect = () => DOMRect.fromRect({
      x: 40,
      y: 100,
      width: 280,
      height: 32,
    });
    messaging.requestApi.mockReset();
    messaging.streamScan.mockReset();
    preferenceStorage.loadPreferences.mockReset();
    preferenceStorage.loadPreferences.mockResolvedValue({
      buddyStyle: "orb",
      categories: ["safety", "sizing-fit", "language", "everyday-usability"],
      onboardingComplete: true,
    });
    preferenceStorage.watchPreferences.mockClear();
    navigation.openOptionsPage.mockReset();
    navigation.openReportPage.mockReset();
  });

  afterEach(() => {
    controller?.destroy();
    controller = null;
    vi.unstubAllGlobals();
  });

  it("starts empty and renders streamed AI findings", async () => {
    let callbacks: ScanCallbacks | undefined;
    messaging.streamScan.mockImplementation((_request, nextCallbacks: ScanCallbacks) => {
      callbacks = nextCallbacks;
      return vi.fn();
    });

    const shadow = await startScan();
    expect(shadow.querySelectorAll(".eqx-finding-row")).toHaveLength(0);
    expect(shadow.textContent).toContain("AI scan in progress");
    expect(shadow.querySelector('[data-testid="inclusion-score"]')?.textContent).toBe("—");
    await vi.waitFor(() => expect(messaging.streamScan).toHaveBeenCalledOnce());

    await act(async () => callbacks!.onFinding(aiFinding));
    expect(shadow.querySelectorAll(".eqx-finding-row")).toHaveLength(1);
    expect(shadow.textContent).toContain("AI-enriched safety baseline");
    expect(shadow.querySelectorAll(".eqx-heatmap-rect")).toHaveLength(1);

    await act(async () => callbacks!.onComplete());
    expect(shadow.textContent).toContain("Scan complete");
    expect(shadow.querySelector('[data-testid="inclusion-score"]')?.textContent).toBe("82");
  });

  it("uses the one-shot response after a streaming transport failure", async () => {
    messaging.streamScan.mockImplementation((_request, callbacks: ScanCallbacks) => {
      callbacks.onError?.(new Error("Port interrupted"), 0);
      return vi.fn();
    });
    messaging.requestApi.mockResolvedValue({ findings: [aiFinding], summary: "One finding" });

    const shadow = await startScan();

    await vi.waitFor(() => expect(messaging.requestApi).toHaveBeenCalledWith(
      "/scan",
      expect.objectContaining({ dom: expect.any(Array) }),
    ));
    await vi.waitFor(() => expect(shadow.textContent).toContain("Scan complete"));
    expect(shadow.textContent).toContain("AI-enriched safety baseline");
    expect(shadow.textContent).not.toContain("Deep scan paused");
  });

  it("shows an AI error and retries from an empty result set", async () => {
    let retryCallbacks: ScanCallbacks | undefined;
    messaging.streamScan
      .mockImplementationOnce((_request, callbacks: ScanCallbacks) => {
        callbacks.onError?.(new Error("AI service unavailable"), 503);
        return vi.fn();
      })
      .mockImplementationOnce((_request, callbacks: ScanCallbacks) => {
        retryCallbacks = callbacks;
        return vi.fn();
      });

    const shadow = await startScan();
    await vi.waitFor(() => expect(shadow.textContent).toContain("Deep scan paused"));
    expect(shadow.querySelectorAll(".eqx-finding-row")).toHaveLength(0);
    expect(shadow.textContent).toContain("Score unavailable");

    const retry = [...shadow.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Retry AI scan")!;
    await act(async () => retry.click());
    await vi.waitFor(() => expect(messaging.streamScan).toHaveBeenCalledTimes(2));
    expect(shadow.textContent).toContain("AI scan in progress");

    await act(async () => retryCallbacks!.onFinding(aiFinding));
    await act(async () => retryCallbacks!.onComplete());
    expect(shadow.textContent).toContain("Scan complete");
    expect(shadow.textContent).toContain("AI-enriched safety baseline");
  });

  it("applies saved categories to scans and exports the current before/after scores", async () => {
    preferenceStorage.loadPreferences.mockResolvedValue({
      buddyStyle: "minimal",
      categories: ["safety"],
      onboardingComplete: true,
    });
    let callbacks: ScanCallbacks | undefined;
    messaging.streamScan.mockImplementation((_request, nextCallbacks: ScanCallbacks) => {
      callbacks = nextCallbacks;
      return vi.fn();
    });
    messaging.requestApi.mockResolvedValue({
      id: "012345abcdef",
      url: "https://equalens-api.ragsetu-goa-2026.workers.dev/report/012345abcdef",
    });

    const shadow = await startScan();
    await vi.waitFor(() => expect(messaging.streamScan).toHaveBeenCalledWith(
      expect.objectContaining({ categories: ["safety"] }),
      expect.any(Object),
    ));
    await act(async () => callbacks!.onFinding(aiFinding));
    await act(async () => callbacks!.onComplete());
    expect(shadow.querySelector('[data-testid="buddy-orb"]')?.getAttribute("data-style")).toBe("minimal");

    const exportReport = [...shadow.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Export report")!;
    await act(async () => exportReport.click());

    await vi.waitFor(() => expect(messaging.requestApi).toHaveBeenCalledWith(
      "/report",
      expect.objectContaining({
        findings: expect.any(Array),
        scoreBefore: 82,
        scoreAfter: 82,
      }),
    ));
    expect(navigation.openReportPage).toHaveBeenCalledWith(
      "https://equalens-api.ragsetu-goa-2026.workers.dev/report/012345abcdef",
    );
  });

  async function startScan(): Promise<ShadowRoot> {
    controller = bootstrapContentScript(document);
    const shadow = controller.overlay.host.shadowRoot!;
    const orb = shadow.querySelector<HTMLButtonElement>('[data-testid="buddy-orb"]')!;
    await act(async () => orb.click());
    const scan = [...shadow.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Scan page")!;
    await act(async () => scan.click());
    return shadow;
  }
});
