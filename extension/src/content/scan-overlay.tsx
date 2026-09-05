import { calculateInclusionScore } from "@equalens/shared/tokens";
import type { Category, Finding } from "@equalens/shared/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { FindingExplanation } from "./analysis-card";
import type { ViewportRect } from "./selection";

export type ScanPanelAction = "redesign-finding" | "redesign-all" | "export-report";
export type DeepScanStatus =
  | { mode: "idle" }
  | { mode: "scanning" }
  | { mode: "complete" }
  | { mode: "error"; message: string };
export type ReportExportStatus =
  | { mode: "idle" }
  | { mode: "exporting" }
  | { mode: "error"; message: string };

interface ScanOverlayProps {
  document: Document;
  findings: readonly Finding[];
  scanStatus: DeepScanStatus;
  reportStatus: ReportExportStatus;
  onClose: () => void;
  onRetry: () => void;
  onFindingsChange: (findings: Finding[]) => void;
  onAction: (action: ScanPanelAction, finding?: Finding) => void;
}

interface PositionedFinding {
  finding: Finding;
  approximate: boolean;
  rect: ViewportRect | null;
}

const CATEGORY_ORDER: readonly Category[] = ["safety", "usability", "language"];
const RING_RADIUS = 50;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function ScanOverlay({ document, findings, scanStatus, reportStatus, onClose, onRetry, onFindingsChange, onAction }: ScanOverlayProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const pulseTimeout = useRef<number | null>(null);
  const positioned = findings.map((finding): PositionedFinding => {
    const element = resolveFindingElement(document, finding);
    return {
      finding,
      approximate: element === null,
      rect: element ? rectForElement(element) : null,
    };
  });
  const activeFindings = findings.filter((finding) => !finding.fixed);
  const score = scoreFindings(findings);

  useEffect(() => {
    if (expandedId && !findings.some(({ id }) => id === expandedId)) setExpandedId(null);
  }, [expandedId, findings]);

  useEffect(() => () => {
    const view = document.defaultView;
    if (pulseTimeout.current !== null) view?.clearTimeout(pulseTimeout.current);
  }, [document]);

  const focusFinding = (finding: Finding): void => {
    const target = resolveFindingElement(document, finding);
    if (!target) return;

    const reducedMotion = document.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center", inline: "nearest" });
    }
    setPulseId(finding.id);
    const view = document.defaultView;
    if (pulseTimeout.current !== null) view?.clearTimeout(pulseTimeout.current);
    pulseTimeout.current = view?.setTimeout(() => setPulseId(null), 800) ?? null;
  };

  const markFixed = (id: string): void => {
    onFindingsChange(findings.map((finding) => finding.id === id ? { ...finding, fixed: true } : finding));
  };

  return (
    <div className="eqx-scan" data-testid="scan-overlay">
      {activeFindings.length > 0 && <div className="eqx-scan-dimmer" aria-hidden="true" />}
      <div className="eqx-heatmap" aria-hidden="true">
        {positioned.map(({ finding, rect }) => !finding.fixed && rect ? (
          <div
            className={`eqx-heatmap-rect${pulseId === finding.id ? " is-pulsing" : ""}`}
            data-category={finding.category}
            data-impact={finding.severity.endsWith("high") ? "high" : "medium"}
            key={finding.id}
            style={{
              width: rect.width,
              height: rect.height,
              transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
            }}
          >
            <span className="eqx-heatmap-label">
              <i />
              {categoryLabel(finding.category)}
            </span>
          </div>
        ) : null)}
      </div>

      <aside className="eqx-findings-panel" aria-label="EquaLens scan findings" data-testid="findings-panel">
        <header className="eqx-panel-header">
          <div className="eqx-panel-brand">
            <span className="eqx-analysis-mark" aria-hidden="true" />
            <strong>EquaLens</strong>
          </div>
          <span className="eqx-panel-status" data-mode={scanStatus.mode}>{scanStatusLabel(scanStatus)}</span>
          <button className="eqx-icon-button" type="button" aria-label="Close findings panel" autoFocus onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <div className="eqx-panel-scroll">
          {scanStatus.mode === "scanning" && <DeepScanProgress />}
          {scanStatus.mode === "error" && <DeepScanError message={scanStatus.message} onRetry={onRetry} />}
          <ScoreSummary document={document} score={score} total={findings.length} open={activeFindings.length} scanStatus={scanStatus} />
          <div className="eqx-findings-list">
            {findings.length === 0 && scanStatus.mode === "complete" ? (
              <div className="eqx-findings-empty">
                <span aria-hidden="true">✓</span>
                <strong>No AI findings</strong>
                <p>The AI scan did not identify a significant gendered or body-default assumption on this page.</p>
              </div>
            ) : findings.length > 0 ? CATEGORY_ORDER.map((category) => {
              const group = positioned.filter(({ finding }) => finding.category === category);
              if (group.length === 0) return null;
              return (
                <section className="eqx-finding-group" data-category={category} key={category}>
                  <header>
                    <h2>{categoryLabel(category)} <span>({group.length})</span></h2>
                    <span>{group.some(({ finding }) => finding.severity.endsWith("high")) ? "High impact" : categoryDescriptor(category)}</span>
                  </header>
                  <div className="eqx-finding-rows">
                    {group.map(({ finding, approximate }) => (
                      <FindingRow
                        finding={finding}
                        approximate={approximate}
                        expanded={expandedId === finding.id}
                        key={finding.id}
                        onFocus={() => focusFinding(finding)}
                        onToggle={() => setExpandedId((current) => current === finding.id ? null : finding.id)}
                        onMarkFixed={() => markFixed(finding.id)}
                        onRedesign={() => onAction("redesign-finding", finding)}
                      />
                    ))}
                  </div>
                </section>
              );
            }) : null}
          </div>
        </div>

        <footer className="eqx-panel-footer">
          {reportStatus.mode === "error" && (
            <p className="eqx-report-error" role="alert">{reportStatus.message}</p>
          )}
          <button
            className="eqx-button eqx-button-primary"
            type="button"
            disabled={scanStatus.mode === "scanning" || !activeFindings.some((finding) => finding.redesignable)}
            title={scanStatus.mode === "scanning" ? "Wait for the deep scan to finish reviewing the page" : undefined}
            onClick={() => onAction("redesign-all")}
          >
            Redesign all
          </button>
          <button
            className="eqx-button eqx-button-secondary"
            type="button"
            aria-busy={reportStatus.mode === "exporting"}
            disabled={findings.length === 0 || reportStatus.mode === "exporting"}
            onClick={() => onAction("export-report")}
          >
            {reportStatus.mode === "exporting" ? "Preparing report…" : reportStatus.mode === "error" ? "Try export again" : "Export report"}
          </button>
        </footer>
      </aside>
    </div>
  );
}

export function scoreFindings(findings: readonly Finding[]): number {
  return calculateInclusionScore(findings.filter((finding) => !finding.fixed).map(({ severity }) => severity));
}

export function resolveFindingElement(document: Document, finding: Pick<Finding, "selector">): Element | null {
  if (!finding.selector) return null;
  try {
    const element = document.querySelector(finding.selector);
    return element?.closest("#equalens-root") ? null : element;
  } catch {
    return null;
  }
}

function rectForElement(element: Element): ViewportRect | null {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function FindingRow({ finding, approximate, expanded, onFocus, onToggle, onMarkFixed, onRedesign }: {
  finding: Finding;
  approximate: boolean;
  expanded: boolean;
  onFocus: () => void;
  onToggle: () => void;
  onMarkFixed: () => void;
  onRedesign: () => void;
}) {
  const detailsId = `eqx-finding-${finding.id}`;
  return (
    <article className="eqx-finding-row" data-fixed={finding.fixed || undefined}>
      <button
        className="eqx-finding-summary"
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={onToggle}
        onMouseEnter={onFocus}
        onFocus={onFocus}
      >
        <i className="eqx-finding-dot" aria-hidden="true" />
        <span className="eqx-finding-copy">
          <strong>{finding.title}</strong>
          <span>{finding.assumption}</span>
          <span className="eqx-finding-tags">
            {finding.stereotype && <span className="eqx-stereotype-chip">Stereotype</span>}
            {approximate && <span className="eqx-approximate-chip">Location approximate</span>}
            {finding.fixed && <span className="eqx-fixed-chip">Resolved</span>}
          </span>
        </span>
        <ChevronIcon />
      </button>
      {expanded && (
        <div className="eqx-finding-details" id={detailsId}>
          <FindingExplanation finding={finding} />
          <div className="eqx-finding-actions">
            <button className="eqx-button eqx-button-primary" type="button" disabled={!finding.redesignable || finding.fixed} onClick={onRedesign}>
              Redesign this
            </button>
            <button className="eqx-button eqx-button-secondary" type="button" disabled={finding.fixed} onClick={onMarkFixed}>
              {finding.fixed ? "Marked fixed" : "Mark fixed"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function DeepScanProgress() {
  return (
    <div className="eqx-deep-scan-progress" role="status" aria-live="polite">
      <span className="eqx-deep-scan-mark" aria-hidden="true" />
      <span>
        <strong>AI scan in progress</strong>
        <small>Reviewing the visible page content now. Results will appear when the report is ready.</small>
      </span>
      <span className="eqx-deep-scan-bars" aria-hidden="true"><i /><i /><i /></span>
    </div>
  );
}

function DeepScanError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const sentence = /[.!?]$/.test(message) ? message : `${message}.`;
  return (
    <div className="eqx-deep-scan-error" role="alert">
      <span>
        <strong>Deep scan paused</strong>
        <small>{sentence} Retry to run the AI scan again.</small>
      </span>
      <button type="button" onClick={onRetry}>Retry AI scan</button>
    </div>
  );
}

function ScoreSummary({ document, score, total, open, scanStatus }: {
  document: Document;
  score: number;
  total: number;
  open: number;
  scanStatus: DeepScanStatus;
}) {
  if (scanStatus.mode !== "complete") {
    const scanning = scanStatus.mode === "scanning";
    const label = scanning ? "Score pending" : scanStatus.mode === "error" ? "Score unavailable" : "Not scanned";
    const detail = scanning ? "Waiting for the AI report" : scanStatus.mode === "error" ? "Complete the AI scan to calculate a score" : "Run an AI scan to calculate a score";
    return (
      <section className="eqx-score-summary" data-state={scanStatus.mode} aria-label={label}>
        <div className="eqx-score-ring eqx-score-ring--pending">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle className="eqx-score-track" cx="60" cy="60" r={RING_RADIUS} />
          </svg>
          <div>
            <strong data-testid="inclusion-score" aria-hidden="true">—</strong>
            <span>{label}</span>
          </div>
        </div>
        <div className="eqx-score-benchmark eqx-score-benchmark--pending">
          <span>{detail}</span>
          {scanning && <strong>Analyzing</strong>}
        </div>
      </section>
    );
  }

  const animatedScore = useAnimatedScore(score, document);
  const band = scoreBand(animatedScore);
  const ringOffset = RING_CIRCUMFERENCE * (1 - animatedScore / 100);
  return (
    <section className="eqx-score-summary" aria-label={`Inclusion score ${score} out of 100`}>
      <div className="eqx-score-ring" data-band={band}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="eqx-score-track" cx="60" cy="60" r={RING_RADIUS} />
          <circle
            className="eqx-score-value"
            cx="60"
            cy="60"
            r={RING_RADIUS}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={ringOffset}
          />
        </svg>
        <div>
          <strong data-testid="inclusion-score" aria-hidden="true">{animatedScore}</strong>
          <span>Inclusion score</span>
        </div>
      </div>
      <span className="eqx-visually-hidden" aria-live="polite">Inclusion score updated to {score} out of 100.</span>
      <div className="eqx-score-benchmark">
        <span>{open} open · {total} total</span>
        <strong data-band={band}>{scoreLabel(band)}</strong>
      </div>
    </section>
  );
}

function useAnimatedScore(target: number, document: Document): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);
  const previousTarget = useRef(target);
  const view = document.defaultView;
  const reducedMotion = useMemo(
    () => view?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    [view],
  );

  useEffect(() => {
    if (previousTarget.current === target) return;
    previousTarget.current = target;
    if (reducedMotion || !view?.requestAnimationFrame) {
      valueRef.current = target;
      setValue(target);
      return;
    }

    const startValue = valueRef.current;
    const startedAt = view.performance.now();
    let frame = 0;
    const step = (now: number): void => {
      const progress = Math.min((now - startedAt) / 800, 1);
      const eased = 1 - (1 - progress) ** 4;
      const next = Math.round(startValue + (target - startValue) * eased);
      valueRef.current = next;
      setValue(next);
      if (progress < 1) frame = view.requestAnimationFrame(step);
    };
    frame = view.requestAnimationFrame(step);
    return () => view.cancelAnimationFrame(frame);
  }, [reducedMotion, target, view]);

  return value;
}

function categoryLabel(category: Category): string {
  return category.charAt(0).toLocaleUpperCase() + category.slice(1);
}

function categoryDescriptor(category: Category): string {
  if (category === "usability") return "Usability risk";
  if (category === "language") return "Inclusive context";
  return "Safety review";
}

function scanStatusLabel(status: DeepScanStatus): string {
  if (status.mode === "scanning") return "AI scanning";
  if (status.mode === "complete") return "Scan complete";
  if (status.mode === "error") return "Scan paused";
  return "Scan ready";
}

function scoreBand(score: number): "low" | "medium" | "high" {
  if (score < 50) return "low";
  if (score < 80) return "medium";
  return "high";
}

function scoreLabel(band: ReturnType<typeof scoreBand>): string {
  if (band === "low") return "Deficient";
  if (band === "medium") return "Needs review";
  return "Inclusive";
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="eqx-chevron" viewBox="0 0 20 20" aria-hidden="true">
      <path d="m7.5 4.5 5 5.5-5 5.5" />
    </svg>
  );
}
