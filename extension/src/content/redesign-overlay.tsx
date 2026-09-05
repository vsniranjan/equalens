import type { Finding } from "@equalens/shared/types";
import { useEffect, useState } from "react";

export interface RedesignComparisonModel {
  id: string;
  target: HTMLElement;
  finding: Finding;
  index: number;
  total: number;
  rationale: string;
  changes: readonly string[];
  scoreBefore: number;
  scoreAfter: number;
  position: number;
  onPositionChange: (percent: number) => void;
  onRefresh: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export type RedesignNotice =
  | { mode: "running"; label: string; completed: number; total: number }
  | { mode: "error"; message: string; onRetry?: () => void }
  | { mode: "payoff"; scoreBefore: number; scoreAfter: number; accepted: number; rejected: number };

export function RedesignComparison({ model, viewport }: {
  model: RedesignComparisonModel;
  viewport: { width: number; height: number };
}) {
  const [position, setPosition] = useState(model.position);
  const rect = model.target.getBoundingClientRect();
  const visible = rect.bottom > 0 && rect.top < viewport.height;
  const width = Math.min(360, viewport.width - 24, Math.max(280, rect.width - 24));
  const left = Math.min(viewport.width - width - 12, Math.max(12, rect.right - width - 12));
  const estimatedHeight = 224;
  const targetBottom = Math.max(12, rect.bottom - estimatedHeight - 12);
  const top = Math.max(12, Math.min(viewport.height - estimatedHeight - 12, targetBottom, Math.max(12, rect.top + 12)));

  useEffect(() => {
    model.onPositionChange(position);
  }, [model, position]);

  const choosePosition = (next: number): void => {
    setPosition(next);
  };

  if (!visible) return null;

  const delta = Math.max(0, model.scoreAfter - model.scoreBefore);
  return (
    <section
      className="eqx-redesign-comparison"
      aria-label={`Review redesign for ${model.finding.title}`}
      style={{ left, top, width }}
    >
      <header>
        <span className="eqx-redesign-mark" aria-hidden="true">↔</span>
        <span><small>Change {model.index} of {model.total}</small><strong>{model.finding.title}</strong></span>
      </header>

      <div className="eqx-comparison-control">
        <button type="button" aria-pressed={position === 100} onClick={() => choosePosition(100)}>Before</button>
        <input
          type="range"
          min="0"
          max="100"
          value={position}
          aria-label={`Original design visibility for ${model.finding.title}`}
          aria-valuetext={`${position}% before, ${100 - position}% after`}
          onChange={(event) => setPosition(Number(event.currentTarget.value))}
        />
        <button type="button" aria-pressed={position === 0} onClick={() => choosePosition(0)}>After</button>
      </div>

      <p className="eqx-redesign-rationale">{model.rationale}</p>
      {model.changes.length > 0 && (
        <ul className="eqx-redesign-changes">
          {model.changes.slice(0, 3).map((change) => <li key={change}>{change}</li>)}
          {model.changes.length > 3 && <li>+{model.changes.length - 3} more preserved changes</li>}
        </ul>
      )}
      {delta > 0 && (
        <div className="eqx-redesign-score-preview">
          <span>Projected score</span>
          <strong>{model.scoreBefore} → {model.scoreAfter}</strong>
          <b>+{delta}</b>
        </div>
      )}
      <footer>
        <button className="eqx-button eqx-button-primary" type="button" onClick={model.onApprove}>Approve change</button>
        <button className="eqx-button eqx-button-secondary" type="button" onClick={model.onReject}>Reject change</button>
      </footer>
    </section>
  );
}

export function RedesignNoticeView({ notice, onDismiss }: { notice: RedesignNotice; onDismiss: () => void }) {
  if (notice.mode === "running") {
    const progress = notice.total > 0 ? notice.completed / notice.total : 0;
    return (
      <div className="eqx-redesign-notice" data-mode="running" role="status">
        <span className="eqx-redesign-notice-mark" aria-hidden="true" />
        <span><strong>{notice.label}</strong><small>{notice.completed} of {notice.total} redesigns prepared</small></span>
        <i className="eqx-redesign-progress" aria-hidden="true" style={{ transform: `scaleX(${progress})` }} />
      </div>
    );
  }

  if (notice.mode === "error") {
    return (
      <div className="eqx-redesign-notice" data-mode="error" role="alert">
        <span><strong>Redesign not applied</strong><small>{notice.message}</small></span>
        <span className="eqx-redesign-notice-actions">
          {notice.onRetry && <button type="button" onClick={notice.onRetry}>Try again</button>}
          <button type="button" onClick={onDismiss}>Dismiss</button>
        </span>
      </div>
    );
  }

  const delta = Math.max(0, notice.scoreAfter - notice.scoreBefore);
  const kept = notice.accepted > 0;
  const title = kept
    ? notice.accepted === 1 ? "1 redesign approved" : `${notice.accepted} redesigns approved`
    : "Review complete";
  const detail = kept
    ? `${notice.rejected > 0 ? `${notice.rejected} rejected · ` : ""}Score ${notice.scoreBefore} → ${notice.scoreAfter}`
    : `${notice.rejected} proposed change${notice.rejected === 1 ? "" : "s"} rejected`;
  return (
    <div className="eqx-redesign-notice" data-mode="payoff" data-outcome={kept ? "approved" : "rejected"} data-delta={delta > 0 ? "positive" : "neutral"} role="status">
      <span className="eqx-payoff-check" aria-hidden="true">{kept ? "✓" : "–"}</span>
      <span><strong>{title}</strong><small>{detail}</small></span>
      {delta > 0 && <b>+{delta}</b>}
      <button type="button" aria-label="Dismiss score update" onClick={onDismiss}>×</button>
    </div>
  );
}
