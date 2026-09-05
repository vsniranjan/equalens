import type { Finding } from "@equalens/shared/types";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export interface DialogPosition {
  x: number;
  y: number;
}

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
  dialogPosition?: DialogPosition;
  onPositionChange: (percent: number) => void;
  onDialogPositionChange: (position: DialogPosition) => void;
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
  const estimatedHeight = 224;
  const targetBottom = Math.max(12, rect.bottom - estimatedHeight - 12);
  const automaticPosition = {
    x: Math.min(viewport.width - width - 12, Math.max(12, rect.right - width - 12)),
    y: Math.max(12, Math.min(viewport.height - estimatedHeight - 12, targetBottom, Math.max(12, rect.top + 12))),
  };
  const dialog = useRef<HTMLElement>(null);
  const drag = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [dialogPosition, setDialogPosition] = useState(() => model.dialogPosition ?? automaticPosition);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    model.onPositionChange(position);
  }, [model, position]);

  useEffect(() => {
    setDialogPosition((current) => {
      const next = constrainDialog(current, viewport, dialog.current, width, estimatedHeight);
      if (next.x === current.x && next.y === current.y) return current;
      model.onDialogPositionChange(next);
      return next;
    });
  }, [estimatedHeight, model, viewport.height, viewport.width, width]);

  const choosePosition = (next: number): void => {
    setPosition(next);
  };

  const moveDialog = (next: DialogPosition): void => {
    const constrained = constrainDialog(next, viewport, dialog.current, width, estimatedHeight);
    setDialogPosition(constrained);
    model.onDialogPositionChange(constrained);
  };

  const startDrag = (event: PointerEvent<HTMLElement>): void => {
    if (event.button !== 0) return;
    const bounds = dialog.current?.getBoundingClientRect();
    if (!bounds) return;
    drag.current = { pointerId: event.pointerId, offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    event.preventDefault();
  };

  const continueDrag = (event: PointerEvent<HTMLElement>): void => {
    if (drag.current?.pointerId !== event.pointerId) return;
    moveDialog({ x: event.clientX - drag.current.offsetX, y: event.clientY - drag.current.offsetY });
  };

  const finishDrag = (event: PointerEvent<HTMLElement>): void => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  };

  const moveWithKeyboard = (event: KeyboardEvent<HTMLElement>): void => {
    const distance = event.shiftKey ? 4 : 16;
    const direction = {
      ArrowLeft: { x: -distance, y: 0 },
      ArrowRight: { x: distance, y: 0 },
      ArrowUp: { x: 0, y: -distance },
      ArrowDown: { x: 0, y: distance },
    }[event.key];
    if (!direction) return;
    event.preventDefault();
    moveDialog({ x: dialogPosition.x + direction.x, y: dialogPosition.y + direction.y });
  };

  if (!visible) return null;

  const delta = Math.max(0, model.scoreAfter - model.scoreBefore);
  return (
    <section
      ref={dialog}
      className="eqx-redesign-comparison"
      aria-label={`Review redesign for ${model.finding.title}`}
      data-dragging={dragging || undefined}
      style={{ left: dialogPosition.x, top: dialogPosition.y, width }}
    >
      <header
        aria-label="Move comparison dialog. Use arrow keys or drag."
        aria-roledescription="draggable dialog header"
        role="group"
        tabIndex={0}
        onKeyDown={moveWithKeyboard}
        onPointerCancel={finishDrag}
        onPointerDown={startDrag}
        onPointerMove={continueDrag}
        onPointerUp={finishDrag}
      >
        <span className="eqx-redesign-mark" aria-hidden="true">↔</span>
        <span className="eqx-redesign-title"><small>Change {model.index} of {model.total}</small><strong>{model.finding.title}</strong></span>
        <span className="eqx-redesign-move-hint" aria-hidden="true"><i>⠿</i> Move</span>
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

function constrainDialog(
  position: DialogPosition,
  viewport: { width: number; height: number },
  element: HTMLElement | null,
  fallbackWidth: number,
  fallbackHeight: number,
): DialogPosition {
  const width = element?.offsetWidth || fallbackWidth;
  const height = element?.offsetHeight || fallbackHeight;
  return {
    x: Math.max(12, Math.min(viewport.width - width - 12, position.x)),
    y: Math.max(12, Math.min(viewport.height - height - 12, position.y)),
  };
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
