import type { Finding } from "@equalens/shared/types";
import { useEffect, useState } from "react";

export interface RedesignComparisonModel {
  id: string;
  target: HTMLElement;
  finding: Finding;
  rationale: string;
  changes: readonly string[];
  scoreBefore: number;
  scoreAfter: number;
  onPositionChange: (percent: number) => void;
  onRefresh: () => void;
  onKeep: () => void;
  onRevert: () => void;
}

export type RedesignNotice =
  | { mode: "running"; label: string; completed: number; total: number }
  | { mode: "error"; message: string; onRetry?: () => void }
  | { mode: "payoff"; scoreBefore: number; scoreAfter: number };

export function RedesignComparison({ model, viewport }: {
  model: RedesignComparisonModel;
  viewport: { width: number; height: number };
}) {
  const [position, setPosition] = useState(50);
  const rect = model.target.getBoundingClientRect();
  const width = Math.min(360, viewport.width - 24);
  const left = clamp(rect.left + (rect.width - width) / 2, 12, viewport.width - width - 12);
  const below = rect.bottom + 12;
  const top = below < viewport.height - 238 ? below : Math.max(12, rect.top - 226);

  useEffect(() => {
    model.onPositionChange(position);
  }, [model, position]);

  const choosePosition = (next: number): void => {
    setPosition(next);
  };

  const delta = Math.max(0, model.scoreAfter - model.scoreBefore);
  return (
    <section
      className="eqx-redesign-comparison"
      aria-label="Before and after redesign comparison"
      style={{ left, top, width }}
    >
      <header>
        <span className="eqx-redesign-mark" aria-hidden="true">↔</span>
        <span><small>Redesign preview</small><strong>{model.finding.title}</strong></span>
      </header>

      <div className="eqx-comparison-control">
        <button type="button" aria-pressed={position === 100} onClick={() => choosePosition(100)}>Before</button>
        <input
          type="range"
          min="0"
          max="100"
          value={position}
          aria-label="Original design visibility"
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
        <button className="eqx-button eqx-button-primary" type="button" onClick={model.onKeep}>Keep change</button>
        <button className="eqx-button eqx-button-secondary" type="button" onClick={model.onRevert}>Revert</button>
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
  return (
    <div className="eqx-redesign-notice" data-mode="payoff" data-delta={delta > 0 ? "positive" : "neutral"} role="status">
      <span className="eqx-payoff-check" aria-hidden="true">✓</span>
      <span><strong>Inclusive redesign kept</strong><small>{delta > 0 ? `Score ${notice.scoreBefore} → ${notice.scoreAfter}` : "Capability-preserving change is active"}</small></span>
      {delta > 0 && <b>+{delta}</b>}
      <button type="button" aria-label="Dismiss score update" onClick={onDismiss}>×</button>
    </div>
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
