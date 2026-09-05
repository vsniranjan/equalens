import { calculateInclusionScore } from "@equalens/shared/tokens";
import type { Finding, RedesignRequest, RedesignResponse } from "@equalens/shared/types";
import type { OverlayController } from "./overlay";
import {
  applySanitizedRedesign,
  captureElementSnapshot,
  checkCapabilityPreservation,
  createComparisonSnapshot,
  restoreElementSnapshot,
  preserveRedesignedFormState,
  revealRedesignedText,
  sanitizeRedesignHtml,
  type ElementSnapshot,
} from "./redesign";
import { applyRedesignVariant, findRedesignVariantTarget } from "./redesign-variants";

type RedesignOrigin = "selection" | "panel";

interface RedesignCoordinatorOptions {
  document: Document;
  overlay: OverlayController;
  requestRedesign: (request: RedesignRequest) => Promise<RedesignResponse>;
  getFindings: () => readonly Finding[];
  setFindings: (findings: Finding[]) => void;
  onBeforeRun: () => void;
  onPreviewReady?: () => void;
}

interface PlannedRedesign {
  target: HTMLElement;
  requestTarget: Element;
  finding: Finding;
  findingIds: string[];
  variant: boolean;
}

interface AppliedRedesign {
  snapshot: ElementSnapshot;
  finding: Finding;
  findingIds: string[];
  response: RedesignResponse;
}

interface ActiveTransaction {
  applied: AppliedRedesign[];
  comparison: ReturnType<typeof createComparisonSnapshot>;
  origin: RedesignOrigin;
  scoreBefore: number;
  scoreAfter: number;
}

class RedesignCancelled extends Error {}

/** Session-scoped by design: targets replaced during a request are rejected, and kept changes are never auto-reapplied. */
export class RedesignCoordinator {
  private generation = 0;
  private running = false;
  private disposed = false;
  private active: ActiveTransaction | null = null;
  private pending: AppliedRedesign[] = [];

  constructor(private readonly options: RedesignCoordinatorOptions) {}

  hasOpenPreview(): boolean {
    return this.running || this.active !== null;
  }

  async redesignSelection(finding: Finding): Promise<void> {
    await this.run([finding], "selection");
  }

  async redesignFromPanel(findings: readonly Finding[]): Promise<void> {
    try {
      await this.run(findings, "panel");
    } catch (error) {
      if (!this.disposed) {
        this.options.overlay.openPanel();
        this.options.overlay.setRedesignNotice({
          mode: "error",
          message: error instanceof Error ? error.message : "EquaLens could not prepare this redesign.",
          onRetry: () => { void this.redesignFromPanel(findings).catch(() => undefined); },
        });
      }
      throw error;
    }
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;
    this.restorePending();
    this.revertActive(false);
    this.options.overlay.setRedesignNotice(null);
  }

  private async run(findings: readonly Finding[], origin: RedesignOrigin): Promise<void> {
    if (this.disposed) throw new Error("Redesign is unavailable");
    if (this.running) throw new Error("A redesign is already being prepared.");
    if (this.active) throw new Error("Keep or revert the current preview before starting another redesign.");

    const plan = createPlan(this.options.document, findings);
    if (plan.length === 0) throw new Error("No redesignable page element could be located.");
    this.running = true;
    const generation = ++this.generation;
    this.options.onBeforeRun();
    if (origin === "panel") this.options.overlay.closePanel();
    this.options.overlay.setRedesignNotice({
      mode: "running",
      label: plan.length === 1 ? "Preparing inclusive redesign" : "Redesigning page sequentially",
      completed: 0,
      total: plan.length,
    });

    const applied: AppliedRedesign[] = [];
    let pendingComparison: ReturnType<typeof createComparisonSnapshot> | null = null;
    this.pending = applied;
    try {
      for (const [index, item] of plan.entries()) {
        this.assertActive(generation);
        const result = await this.apply(item, generation);
        applied.push(result);
        this.options.overlay.setRedesignNotice({
          mode: "running",
          label: plan.length === 1 ? "Preparing inclusive redesign" : "Redesigning page sequentially",
          completed: index + 1,
          total: plan.length,
        });
        if (plan.length > 1 && index < plan.length - 1) await wait(this.options.document, 180);
      }

      this.assertActive(generation);
      const primary = applied[0];
      if (!primary) throw new Error("No redesign was applied.");
      const comparison = createComparisonSnapshot(primary.snapshot);
      pendingComparison = comparison;
      focusTarget(this.options.document, primary.snapshot.target);
      const scoreBefore = score(this.options.getFindings());
      const fixedIds = new Set(applied.flatMap(({ findingIds }) => findingIds));
      const fixedSelectors = new Set(applied.map(({ finding }) => finding.selector).filter((selector): selector is string => selector !== null));
      const scoreAfter = score(this.options.getFindings().map((finding) => (
        fixedIds.has(finding.id) || (finding.selector !== null && fixedSelectors.has(finding.selector))
          ? { ...finding, fixed: true }
          : finding
      )));
      const transaction: ActiveTransaction = { applied, comparison, origin, scoreBefore, scoreAfter };
      this.active = transaction;
      this.pending = [];
      pendingComparison = null;
      this.options.overlay.setRedesignNotice(null);
      this.options.overlay.showRedesignComparison({
        id: `${generation}:${primary.finding.id}`,
        target: primary.snapshot.target,
        finding: primary.finding,
        rationale: primary.response.rationale,
        changes: primary.response.changes,
        scoreBefore,
        scoreAfter,
        onPositionChange: (percent) => comparison.setPosition(percent),
        onRefresh: () => comparison.refresh(),
        onKeep: () => this.keep(transaction),
        onRevert: () => this.revert(transaction),
      });
      this.options.onPreviewReady?.();
    } catch (error) {
      pendingComparison?.destroy();
      for (const result of [...applied].reverse()) restoreElementSnapshot(result.snapshot);
      this.pending = [];
      if (error instanceof RedesignCancelled) return;
      if (origin === "selection" && !this.disposed) {
        this.options.overlay.setRedesignNotice(null);
      }
      throw error;
    } finally {
      this.running = false;
    }
  }

  private async apply(item: PlannedRedesign, generation: number): Promise<AppliedRedesign> {
    const snapshot = captureElementSnapshot(item.target);
    const originalOuterHtml = item.target.outerHTML;
    const requestOuterHtml = item.variant ? item.requestTarget.outerHTML : originalOuterHtml;
    const baseRequest: RedesignRequest = {
      outerHTML: requestOuterHtml,
      finding: item.finding,
      pageTitle: this.options.document.title.trim() || this.options.document.location.hostname || "Untitled page",
      pageUrl: this.options.document.location.href,
    };
    if (baseRequest.outerHTML.length > 16_000) {
      throw new Error("This element is too large to redesign safely in one pass.");
    }

    let response = validResponse(await this.options.requestRedesign(baseRequest));
    this.assertActive(generation);
    if (!item.target.isConnected) throw new Error("The page replaced this target. Scan again to refresh its location.");

    if (item.variant) {
      applyRedesignVariant(item.target);
      preserveRedesignedFormState(snapshot);
      revealRedesignedText(item.target, snapshot.originalHtml);
      return { snapshot, finding: item.finding, findingIds: item.findingIds, response };
    }

    let sanitized = sanitizeRedesignHtml(this.options.document, response.rewritten_html);
    let capability = checkCapabilityPreservation(this.options.document, originalOuterHtml, sanitized);
    if (!capability.preserved) {
      response = validResponse(await this.options.requestRedesign({
        ...baseRequest,
        violationNote: capability.violationNote ?? "Preserve every original control, option, table row, table cell, and substantive detail.",
      }));
      this.assertActive(generation);
      sanitized = sanitizeRedesignHtml(this.options.document, response.rewritten_html);
      capability = checkCapabilityPreservation(this.options.document, originalOuterHtml, sanitized);
      if (!capability.preserved) {
        throw new Error("Couldn't produce a capability-preserving redesign");
      }
    }
    applySanitizedRedesign(snapshot, sanitized);
    return { snapshot, finding: item.finding, findingIds: item.findingIds, response };
  }

  private keep(transaction: ActiveTransaction): void {
    if (this.active !== transaction) return;
    transaction.comparison.destroy();
    this.active = null;
    this.options.overlay.showRedesignComparison(null);
    if (transaction.origin === "panel") this.options.overlay.openPanel();
    const fixedIds = new Set(transaction.applied.flatMap(({ findingIds }) => findingIds));
    const fixedSelectors = new Set(transaction.applied.map(({ finding }) => finding.selector).filter((selector): selector is string => selector !== null));
    this.options.setFindings(this.options.getFindings().map((finding) => (
      fixedIds.has(finding.id) || (finding.selector !== null && fixedSelectors.has(finding.selector))
        ? { ...finding, fixed: true }
        : finding
    )));
    this.options.overlay.setRedesignNotice({
      mode: "payoff",
      scoreBefore: transaction.scoreBefore,
      scoreAfter: transaction.scoreAfter,
    });
  }

  private revert(transaction: ActiveTransaction): void {
    if (this.active !== transaction) return;
    this.revertActive(transaction.origin === "panel");
    this.options.overlay.setRedesignNotice(null);
  }

  private revertActive(reopenPanel: boolean): void {
    const transaction = this.active;
    if (!transaction) return;
    transaction.comparison.destroy();
    for (const result of [...transaction.applied].reverse()) restoreElementSnapshot(result.snapshot);
    this.active = null;
    this.options.overlay.showRedesignComparison(null);
    if (reopenPanel) this.options.overlay.openPanel();
  }

  private restorePending(): void {
    for (const result of [...this.pending].reverse()) restoreElementSnapshot(result.snapshot);
    this.pending = [];
  }

  private assertActive(generation: number): void {
    if (this.disposed || generation !== this.generation) throw new RedesignCancelled();
  }
}

function createPlan(document: Document, findings: readonly Finding[]): PlannedRedesign[] {
  const byTarget = new Map<HTMLElement, PlannedRedesign>();
  for (const finding of findings) {
    if (finding.fixed || !finding.redesignable || !finding.selector) continue;
    const selected = safeQuery(document, finding.selector);
    if (!selected || selected.closest("#equalens-root")) continue;
    const variantTarget = findRedesignVariantTarget(selected);
    const target = variantTarget ?? genericTarget(selected);
    if (!target) continue;
    const current = byTarget.get(target);
    if (current) {
      current.findingIds.push(finding.id);
    } else {
      byTarget.set(target, {
        target,
        requestTarget: selected,
        finding,
        findingIds: [finding.id],
        variant: variantTarget !== null,
      });
    }
  }
  const withoutOverlaps: PlannedRedesign[] = [];
  for (const item of byTarget.values()) {
    const ancestor = withoutOverlaps.find((candidate) => candidate.target.contains(item.target));
    if (ancestor) {
      ancestor.findingIds.push(...item.findingIds);
      continue;
    }
    const descendants = withoutOverlaps.filter((candidate) => item.target.contains(candidate.target));
    if (descendants.length > 0) {
      item.findingIds.push(...descendants.flatMap(({ findingIds }) => findingIds));
      for (const descendant of descendants) withoutOverlaps.splice(withoutOverlaps.indexOf(descendant), 1);
    }
    withoutOverlaps.push(item);
  }
  return withoutOverlaps.sort((left, right) => variantPriority(left.target) - variantPriority(right.target));
}

function safeQuery(document: Document, selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function genericTarget(element: Element): HTMLElement | null {
  if (element instanceof HTMLElement && !element.matches("input, img, br, hr")) return element;
  const label = element.closest<HTMLElement>("label");
  return label ?? element.parentElement;
}

function variantPriority(target: HTMLElement): number {
  const id = target.dataset.equalensVariant;
  if (id === "seat-restraint") return 0;
  if (id === "controls-reach") return 1;
  if (id === "config-form") return 2;
  return 3;
}

function validResponse(value: RedesignResponse): RedesignResponse {
  if (!value
    || typeof value.rewritten_html !== "string"
    || typeof value.rationale !== "string"
    || !Array.isArray(value.changes)
    || !value.changes.every((change) => typeof change === "string")) {
    throw new Error("EquaLens received an invalid redesign response");
  }
  return value;
}

function score(findings: readonly Finding[]): number {
  return calculateInclusionScore(findings.filter(({ fixed }) => !fixed).map(({ severity }) => severity));
}

function focusTarget(document: Document, target: HTMLElement): void {
  if (typeof target.scrollIntoView !== "function") return;
  const reducedMotion = document.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center", inline: "nearest" });
}

function wait(document: Document, milliseconds: number): Promise<void> {
  return new Promise((resolve) => (document.defaultView ?? window).setTimeout(resolve, milliseconds));
}
