import { calculateInclusionScore } from "@equalens/shared/tokens";
import type { Finding, RedesignRequest, RedesignResponse } from "@equalens/shared/types";
import type { OverlayController } from "./overlay";
import type { RedesignComparisonModel } from "./redesign-overlay";
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

export type RedesignAvailability =
  | { available: true }
  | { available: false; buttonLabel: string; message: string };

const MAX_REDESIGN_HTML_LENGTH = 16_000;

interface AppliedRedesign {
  snapshot: ElementSnapshot;
  finding: Finding;
  findingIds: string[];
  response: RedesignResponse;
}

interface ActiveTransaction {
  applied: AppliedRedesign[];
  comparisons: ReturnType<typeof createComparisonSnapshot>[];
  models: RedesignComparisonModel[];
  accepted: Set<number>;
  decided: Set<number>;
  origin: RedesignOrigin;
  scoreBefore: number;
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
    if (plan.length === 0) {
      const unavailable = findings
        .map((finding) => getRedesignAvailability(this.options.document, finding))
        .find((availability) => !availability.available);
      throw new Error(unavailable?.message ?? "No redesignable page element could be located.");
    }
    for (const item of plan.filter(({ variant }) => variant)) {
      const related = this.options.getFindings().filter((finding) => {
        const element = finding.selector ? safeQuery(this.options.document, finding.selector) : null;
        return !finding.fixed && finding.redesignable && element && item.target.contains(element);
      });
      item.findingIds = [...new Set([...item.findingIds, ...related.map(({ id }) => id)])];
    }
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
    const comparisons: ReturnType<typeof createComparisonSnapshot>[] = [];
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
      for (const result of applied) comparisons.push(createComparisonSnapshot(result.snapshot));
      focusTarget(this.options.document, primary.snapshot.target);
      const scoreBefore = score(this.options.getFindings());
      const transaction: ActiveTransaction = {
        applied,
        comparisons,
        models: [],
        accepted: new Set(),
        decided: new Set(),
        origin,
        scoreBefore,
      };
      transaction.models = applied.map((result, index) => {
        const model: RedesignComparisonModel = {
          id: `${generation}:${result.finding.id}`,
          target: result.snapshot.target,
          finding: result.finding,
          index: index + 1,
          total: applied.length,
          rationale: result.response.rationale,
          changes: result.response.changes,
          scoreBefore,
          scoreAfter: scoreAfterAccepting(this.options.getFindings(), [result]),
          position: 50,
          onPositionChange: (percent) => {
            model.position = percent;
            comparisons[index]?.setPosition(percent);
          },
          onDialogPositionChange: (position) => { model.dialogPosition = position; },
          onRefresh: () => comparisons[index]?.refresh(),
          onApprove: () => this.decide(transaction, index, true),
          onReject: () => this.decide(transaction, index, false),
        };
        return model;
      });
      this.active = transaction;
      this.pending = [];
      this.options.overlay.setRedesignNotice(null);
      this.options.overlay.showRedesignComparisons(transaction.models);
      this.options.onPreviewReady?.();
    } catch (error) {
      comparisons.forEach((comparison) => comparison.destroy());
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
    const originalOuterHtml = item.target.outerHTML;
    const requestOuterHtml = item.variant ? item.requestTarget.outerHTML : originalOuterHtml;
    const baseRequest: RedesignRequest = {
      outerHTML: requestOuterHtml,
      finding: item.finding,
      pageTitle: this.options.document.title.trim() || this.options.document.location.hostname || "Untitled page",
      pageUrl: this.options.document.location.href,
    };
    let response = validResponse(await this.options.requestRedesign(baseRequest));
    this.assertActive(generation);
    if (!item.target.isConnected) throw new Error("The page replaced this target. Scan again to refresh its location.");

    if (item.variant) {
      const snapshot = captureElementSnapshot(item.target);
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
    if (!item.target.isConnected) throw new Error("The page replaced this target. Scan again to refresh its location.");
    const snapshot = captureElementSnapshot(item.target);
    const original = item.target.cloneNode(true);
    try {
      applySanitizedRedesign(snapshot, sanitized);
      if (item.target.isEqualNode(original)) throw new Error("The redesign did not change this element. Try again to generate a new proposal.");
    } catch (error) {
      restoreElementSnapshot(snapshot);
      throw error;
    }
    return { snapshot, finding: item.finding, findingIds: item.findingIds, response };
  }

  private decide(transaction: ActiveTransaction, index: number, approved: boolean): void {
    if (this.active !== transaction || transaction.decided.has(index)) return;
    const result = transaction.applied[index];
    if (!result) return;

    transaction.decided.add(index);
    transaction.comparisons[index]?.destroy();
    if (approved) transaction.accepted.add(index);
    else restoreElementSnapshot(result.snapshot);

    const remaining = transaction.models.filter((_, modelIndex) => !transaction.decided.has(modelIndex));
    if (remaining.length > 0) {
      const acceptedResults = [...transaction.accepted].map((acceptedIndex) => transaction.applied[acceptedIndex]!).filter(Boolean);
      const currentScore = scoreAfterAccepting(this.options.getFindings(), acceptedResults);
      for (const model of remaining) {
        const modelIndex = transaction.models.indexOf(model);
        const modelResult = transaction.applied[modelIndex];
        model.scoreBefore = currentScore;
        model.scoreAfter = modelResult
          ? scoreAfterAccepting(this.options.getFindings(), [...acceptedResults, modelResult])
          : currentScore;
      }
      this.options.overlay.showRedesignComparisons(remaining);
      focusTarget(this.options.document, remaining[0]!.target);
      return;
    }

    const accepted = [...transaction.accepted].map((acceptedIndex) => transaction.applied[acceptedIndex]!).filter(Boolean);
    const nextFindings = markAcceptedFindings(this.options.getFindings(), accepted);
    const scoreAfter = score(nextFindings);
    this.active = null;
    this.options.overlay.showRedesignComparisons([]);
    if (transaction.origin === "panel") this.options.overlay.openPanel();
    this.options.setFindings(nextFindings);
    this.options.overlay.setRedesignNotice({
      mode: "payoff",
      scoreBefore: transaction.scoreBefore,
      scoreAfter,
      accepted: accepted.length,
      rejected: transaction.applied.length - accepted.length,
    });
  }

  private revertActive(reopenPanel: boolean): void {
    const transaction = this.active;
    if (!transaction) return;
    transaction.comparisons.forEach((comparison) => comparison.destroy());
    for (const result of [...transaction.applied].reverse()) restoreElementSnapshot(result.snapshot);
    this.active = null;
    this.options.overlay.showRedesignComparisons([]);
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
    const planned = planFinding(document, finding);
    if (!planned || redesignHtml(planned).length > MAX_REDESIGN_HTML_LENGTH) continue;
    const { target } = planned;
    const current = byTarget.get(target);
    if (current) {
      current.findingIds.push(finding.id);
    } else {
      byTarget.set(target, planned);
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

export function getRedesignAvailability(document: Document, finding: Finding): RedesignAvailability {
  if (finding.fixed) {
    return { available: false, buttonLabel: "Already resolved", message: "This finding is already marked as resolved." };
  }
  if (!finding.redesignable) {
    return {
      available: false,
      buttonLabel: "Recommendation only",
      message: "This finding needs a broader product, policy, or design decision and cannot be fixed by rewriting one page element. Address it manually, then mark it fixed.",
    };
  }
  if (!finding.selector) {
    return {
      available: false,
      buttonLabel: "No editable location",
      message: "The AI found an issue but could not tie it to a specific page element. Locate and update the relevant content manually, then mark it fixed.",
    };
  }
  const planned = planFinding(document, finding);
  if (!planned) {
    return {
      available: false,
      buttonLabel: "Location unavailable",
      message: "The matched page element is missing or cannot be edited safely. Scan the page again, or update the relevant content manually and mark it fixed.",
    };
  }
  if (redesignHtml(planned).length > MAX_REDESIGN_HTML_LENGTH) {
    return {
      available: false,
      buttonLabel: "Section too large",
      message: "This section is too large to redesign safely in one AI request. Select a smaller element or split the content into smaller sections first.",
    };
  }
  return { available: true };
}

function planFinding(document: Document, finding: Finding): PlannedRedesign | null {
  if (finding.fixed || !finding.redesignable || !finding.selector) return null;
  const selected = safeQuery(document, finding.selector);
  if (!selected || selected.closest("#equalens-root")) return null;
  const variantTarget = findRedesignVariantTarget(selected);
  const target = variantTarget ?? genericTarget(selected);
  if (!target) return null;
  return {
    target,
    requestTarget: selected,
    finding,
    findingIds: [finding.id],
    variant: variantTarget !== null,
  };
}

function redesignHtml(planned: PlannedRedesign): string {
  return planned.variant ? planned.requestTarget.outerHTML : planned.target.outerHTML;
}

function safeQuery(document: Document, selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function genericTarget(element: Element): HTMLElement | null {
  if (element.matches("h1, h2, h3, h4, h5, h6")) return element.closest<HTMLElement>("article") ?? element as HTMLElement;
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

function scoreAfterAccepting(findings: readonly Finding[], accepted: readonly AppliedRedesign[]): number {
  return score(markAcceptedFindings(findings, accepted));
}

function markAcceptedFindings(findings: readonly Finding[], accepted: readonly AppliedRedesign[]): Finding[] {
  const fixedIds = new Set(accepted.flatMap(({ findingIds }) => findingIds));
  const fixedSelectors = new Set(accepted.map(({ finding }) => finding.selector).filter((selector): selector is string => selector !== null));
  return findings.map((finding) => (
    fixedIds.has(finding.id) || (finding.selector !== null && fixedSelectors.has(finding.selector))
      ? { ...finding, fixed: true }
      : finding
  ));
}

function focusTarget(document: Document, target: HTMLElement): void {
  if (typeof target.scrollIntoView !== "function") return;
  const reducedMotion = document.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center", inline: "nearest" });
}

function wait(document: Document, milliseconds: number): Promise<void> {
  return new Promise((resolve) => (document.defaultView ?? window).setTimeout(resolve, milliseconds));
}
