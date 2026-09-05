// @vitest-environment jsdom

import type { Finding, RedesignRequest, RedesignResponse } from "@equalens/shared/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OverlayController } from "./overlay";
import type { RedesignComparisonModel, RedesignNotice } from "./redesign-overlay";
import { RedesignCoordinator } from "./redesign-coordinator";

class TestStyleSheet { replaceSync(_cssText: string) {} }

const response = (rewritten_html: string): RedesignResponse => ({
  rewritten_html,
  rationale: "Broadens access without removing the original capability.",
  changes: ["Preserved every control", "Added an inclusive option"],
});

const finding = (id: string, selector: string): Finding => ({
  id,
  selector,
  title: `Finding ${id}`,
  assumption: "One default represents everyone.",
  impact: "Some people may be excluded.",
  affected: ["people outside the default"],
  category: "safety",
  severity: "safety-high",
  confidence: "high",
  evidenceTags: [],
  source: "ai",
  redesignable: true,
  fixed: false,
});

function overlayHarness() {
  let comparisons: readonly RedesignComparisonModel[] = [];
  let notice: RedesignNotice | null = null;
  const overlay = {
    host: document.createElement("div"),
    setSelection: vi.fn(), setOrbStatus: vi.fn(), setInspection: vi.fn(), showScan: vi.fn(),
    setFindings: vi.fn(), setScanStatus: vi.fn(), openPanel: vi.fn(), closePanel: vi.fn(),
    refreshPosition: vi.fn(), destroy: vi.fn(),
    showRedesignComparisons: vi.fn((value: readonly RedesignComparisonModel[]) => { comparisons = value; }),
    setRedesignNotice: vi.fn((value: RedesignNotice | null) => { notice = value; }),
  } as unknown as OverlayController;
  return { overlay, comparison: () => comparisons[0] ?? null, comparisons: () => comparisons, notice: () => notice };
}

describe("Phase 7 redesign transaction coordinator", () => {
  const coordinators: RedesignCoordinator[] = [];

  beforeEach(() => {
    vi.stubGlobal("CSSStyleSheet", TestStyleSheet);
    Object.defineProperty(document, "adoptedStyleSheets", {
      configurable: true,
      get() { return (document as Document & { testSheets?: CSSStyleSheet[] }).testSheets ?? []; },
      set(value: CSSStyleSheet[]) { (document as Document & { testSheets?: CSSStyleSheet[] }).testSheets = value; },
    });
    document.body.innerHTML = "";
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    for (const coordinator of coordinators.splice(0)) coordinator.destroy();
    vi.unstubAllGlobals();
  });

  function setup(initialFindings: Finding[], requestRedesign: (request: RedesignRequest) => Promise<RedesignResponse>) {
    const harness = overlayHarness();
    let findings = initialFindings;
    const coordinator = new RedesignCoordinator({
      document,
      overlay: harness.overlay,
      requestRedesign,
      getFindings: () => findings,
      setFindings: (next) => { findings = next; },
      onBeforeRun: vi.fn(),
    });
    coordinators.push(coordinator);
    return { coordinator, harness, findings: () => findings };
  }

  it("retries one capability-reducing rewrite, then keeps the safe result and score payoff", async () => {
    document.body.innerHTML = '<section id="target"><p>Choose the complete safety configuration for every occupant.</p><select><option>A</option><option>B</option></select></section>';
    const item = finding("one", "#target");
    const requestRedesign = vi.fn()
      .mockResolvedValueOnce(response("<section><button>Only choice</button></section>"))
      .mockResolvedValueOnce(response('<section><p>Choose the complete safety configuration for every occupant and body range.</p><select><option>A</option><option>B</option><option>C</option></select></section>'));
    const { coordinator, harness, findings } = setup([item], requestRedesign);

    await coordinator.redesignSelection(item);

    expect(requestRedesign).toHaveBeenCalledTimes(2);
    expect(requestRedesign.mock.calls[1]?.[0].violationNote).toContain("Your rewrite reduced capability");
    expect(document.querySelector("#target")?.textContent).toContain("body range");
    expect(harness.comparison()?.scoreBefore).toBe(82);
    expect(harness.comparison()?.scoreAfter).toBe(100);

    harness.comparison()?.onApprove();
    expect(findings()[0]?.fixed).toBe(true);
    expect(harness.notice()).toEqual({ mode: "payoff", scoreBefore: 82, scoreAfter: 100, accepted: 1, rejected: 0 });
  });

  it("fails loudly after a second capability-reducing response and leaves the DOM untouched", async () => {
    const original = '<section id="target"><p>Keep this detailed original safety specification.</p><button>Continue</button></section>';
    document.body.innerHTML = original;
    const item = finding("one", "#target");
    const requestRedesign = vi.fn().mockResolvedValue(response("<section><p>Short</p></section>"));
    const { coordinator } = setup([item], requestRedesign);

    await expect(coordinator.redesignSelection(item)).rejects.toThrow("Couldn't produce a capability-preserving redesign");
    expect(requestRedesign).toHaveBeenCalledTimes(2);
    expect(document.body.innerHTML).toBe(original);
  });

  it("reverts a preview to the exact original markup", async () => {
    const original = '<section id="target" data-state="original"><p>Original content</p></section>';
    document.body.innerHTML = original;
    const item = finding("one", "#target");
    const { coordinator, harness } = setup([item], vi.fn().mockResolvedValue(response(
      '<section id="target"><p>Original content with broader support</p></section>',
    )));

    await coordinator.redesignSelection(item);
    harness.comparison()?.onReject();

    expect(document.body.innerHTML).toBe(original);
    expect(coordinator.hasOpenPreview()).toBe(false);
  });

  it("rolls back all earlier page changes when a later redesign request fails", async () => {
    const original = '<section id="one">First specification</section><section id="two">Second specification</section>';
    document.body.innerHTML = original;
    const items = [finding("one", "#one"), finding("two", "#two")];
    const requestRedesign = vi.fn()
      .mockResolvedValueOnce(response('<section id="one">First specification expanded</section>'))
      .mockRejectedValueOnce(new Error("Redesign service unavailable"));
    const { coordinator, harness } = setup(items, requestRedesign);

    await expect(coordinator.redesignFromPanel(items)).rejects.toThrow("Redesign service unavailable");

    expect(document.body.innerHTML).toBe(original);
    expect(harness.overlay.openPanel).toHaveBeenCalled();
    expect(harness.notice()).toMatchObject({ mode: "error", message: "Redesign service unavailable" });
  });

  it("reviews multiple redesigned components independently", async () => {
    document.body.innerHTML = '<section id="one">First specification</section><section id="two">Second specification</section>';
    const items = [finding("one", "#one"), finding("two", "#two")];
    const requestRedesign = vi.fn()
      .mockResolvedValueOnce(response('<section id="one">First specification expanded</section>'))
      .mockResolvedValueOnce(response('<section id="two">Second specification expanded</section>'));
    const { coordinator, harness, findings } = setup(items, requestRedesign);

    await coordinator.redesignFromPanel(items);
    expect(harness.comparisons()).toHaveLength(2);
    expect(harness.comparisons().map(({ finding: item }) => item.id)).toEqual(["one", "two"]);

    harness.comparisons()[0]!.onApprove();
    expect(harness.comparisons()).toHaveLength(1);
    expect(harness.comparisons()[0]).toMatchObject({ scoreBefore: 82, scoreAfter: 100 });
    expect(document.querySelector("#one")?.textContent).toContain("expanded");

    harness.comparisons()[0]!.onReject();
    expect(document.querySelector("#one")?.textContent).toContain("expanded");
    expect(document.querySelector("#two")?.textContent).toBe("Second specification");
    expect(findings().map(({ fixed }) => fixed)).toEqual([true, false]);
    expect(harness.notice()).toEqual({ mode: "payoff", scoreBefore: 64, scoreAfter: 82, accepted: 1, rejected: 1 });
  });

  it("skips an oversized target while redesigning the available targets", async () => {
    document.body.innerHTML = `<section id="large">${"Detailed specification ".repeat(900)}</section><section id="small">Original guidance</section>`;
    const items = [finding("large", "#large"), finding("small", "#small")];
    const requestRedesign = vi.fn().mockResolvedValue(response('<section id="small">Original guidance with broader support</section>'));
    const { coordinator, harness } = setup(items, requestRedesign);

    await coordinator.redesignFromPanel(items);

    expect(requestRedesign).toHaveBeenCalledTimes(1);
    expect(requestRedesign.mock.calls[0]?.[0].finding.id).toBe("small");
    expect(harness.comparisons()).toHaveLength(1);
    expect(harness.comparison()?.finding.id).toBe("small");
  });

  it("surfaces missing-target errors from panel actions before a transaction starts", async () => {
    const item = finding("missing", "#removed-target");
    const requestRedesign = vi.fn();
    const { coordinator, harness } = setup([item], requestRedesign);

    await expect(coordinator.redesignFromPanel([item])).rejects.toThrow("matched page element is missing");
    expect(harness.notice()).toMatchObject({ mode: "error", message: expect.stringContaining("matched page element is missing") });
    expect(requestRedesign).not.toHaveBeenCalled();
    expect(coordinator.hasOpenPreview()).toBe(false);
  });

  it("resolves related findings when a single action replaces their whole demo section", async () => {
    document.body.innerHTML = '<section data-equalens-variant="seat-restraint"><p id="restraint">Legacy restraint reference</p><p id="headrest">Standard fit</p></section>';
    const items = [finding("restraint", "#restraint"), finding("headrest", "#headrest")];
    const { coordinator, harness, findings } = setup(items, vi.fn().mockResolvedValue(response("<p>Expanded fit</p>")));
    await coordinator.redesignFromPanel([items[0]!]);
    harness.comparison()?.onApprove();
    expect(findings().every(({ fixed }) => fixed)).toBe(true);
  });

  it("keeps values entered while the redesign request was pending, including on undo", async () => {
    document.body.innerHTML = '<section id="form"><input name="firstName"><p>Original guidance</p></section>';
    const item = finding("form", "#form");
    let finish!: (response: RedesignResponse) => void;
    const pending = new Promise<RedesignResponse>((resolve) => { finish = resolve; });
    const { coordinator, harness } = setup([item], () => pending);
    const run = coordinator.redesignFromPanel([item]);
    document.querySelector("input")!.value = "Typed while waiting";
    finish(response('<section id="form"><input name="firstName"><p>Original guidance with more options</p></section>'));
    await run;
    expect(document.querySelector("input")!.value).toBe("Typed while waiting");
    harness.comparison()?.onReject();
    expect(document.querySelector("input")!.value).toBe("Typed while waiting");
  });
});
