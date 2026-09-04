import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import type { AnalyzeRequest } from "@equalens/shared/types";
import { AnalysisCard, type AnalysisIndicator, type AnalyzeHandler } from "./analysis-card";
import type { ViewportRect } from "./selection";
import { OVERLAY_CSS } from "./overlay-styles";

export type OrbAction = "scan" | "panel" | "inspect" | "settings";
export type OrbStatus = { mode: "idle" | "attentive" | "thinking" } | { mode: "alert"; count: number };

export interface OverlaySelection {
  text: string;
  rect: ViewportRect;
  request: AnalyzeRequest;
}

export interface OverlayController {
  readonly host: HTMLDivElement;
  setSelection(selection: OverlaySelection | null): void;
  setOrbStatus(status: OrbStatus): void;
  setInspection(rect: ViewportRect | null, active?: boolean): void;
  refreshPosition(): void;
  destroy(): void;
}

interface OverlayOptions {
  document?: Document;
  onAction?: (action: OrbAction) => void;
  onAnalyze?: AnalyzeHandler;
}

interface OverlayViewProps {
  selection: OverlaySelection | null;
  status: OrbStatus;
  inspectionRect: ViewportRect | null;
  inspecting: boolean;
  viewport: { width: number; height: number };
  onAction: (action: OrbAction) => void;
  onAnalyze: AnalyzeHandler;
}

let active: { document: Document; controller: OverlayController } | null = null;

export function mountOverlay(options: OverlayOptions = {}): OverlayController {
  const document = options.document ?? window.document;
  if (active?.document === document && active.controller.host.isConnected) return active.controller;
  active = null;

  document.querySelector("#equalens-root")?.remove();
  const host = document.createElement("div");
  host.id = "equalens-root";
  host.setAttribute("data-equalens-overlay", "true");
  document.body.append(host);

  const shadow = host.attachShadow({ mode: "open" });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(OVERLAY_CSS);
  shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];
  const mountPoint = document.createElement("div");
  shadow.append(mountPoint);
  const root = createRoot(mountPoint);

  let selection: OverlaySelection | null = null;
  let status: OrbStatus = { mode: "idle" };
  let inspectionRect: ViewportRect | null = null;
  let inspecting = false;
  let destroyed = false;

  const render = (): void => {
    if (destroyed) return;
    const view = document.defaultView ?? window;
    flushSync(() => root.render(
      <OverlayView
        selection={selection}
        status={status}
        inspectionRect={inspectionRect}
        inspecting={inspecting}
        viewport={{ width: view.innerWidth, height: view.innerHeight }}
        onAction={options.onAction ?? (() => undefined)}
        onAnalyze={options.onAnalyze ?? (() => Promise.reject(new Error("Analysis is unavailable.")))}
      />,
    ));
  };

  const controller: OverlayController = {
    host,
    setSelection(nextSelection) {
      selection = nextSelection;
      render();
    },
    setOrbStatus(nextStatus) {
      status = nextStatus;
      render();
    },
    setInspection(rect, nextActive = rect !== null) {
      inspectionRect = rect;
      inspecting = nextActive;
      render();
    },
    refreshPosition: render,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      root.unmount();
      host.remove();
      if (active?.controller === controller) active = null;
    },
  };

  active = { document, controller };
  render();
  return controller;
}

function OverlayView({ selection, status, inspectionRect, inspecting, viewport, onAction, onAnalyze }: OverlayViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [analysisIndicator, setAnalysisIndicator] = useState<AnalysisIndicator>({ mode: "idle" });
  const firstAction = useRef<HTMLButtonElement>(null);
  const effectiveMode = analysisIndicator.mode === "thinking"
    ? "thinking"
    : analysisIndicator.mode === "alert"
      ? "alert"
      : status.mode === "idle" && selection ? "attentive" : status.mode;
  const alertCount = status.mode === "alert"
    ? status.count
    : analysisIndicator.mode === "alert" ? analysisIndicator.count : 0;
  const position = buddyPosition(selection?.rect ?? null, viewport);
  const side = position.x > viewport.width / 2 ? "left" : "right";

  useEffect(() => {
    if (menuOpen) firstAction.current?.focus();
  }, [menuOpen]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const runAction = (action: OrbAction): void => {
    setMenuOpen(false);
    onAction(action);
  };

  return (
    <>
      {inspecting && <div className="eqx-inspection-status" role="status">Choose an element. Press Escape to cancel.</div>}
      {inspectionRect && (
        <div
          className="eqx-inspection-outline"
          aria-hidden="true"
          style={{
            width: inspectionRect.width,
            height: inspectionRect.height,
            transform: `translate3d(${inspectionRect.left}px, ${inspectionRect.top}px, 0)`,
          }}
        />
      )}
      <div className="eqx-buddy-position" style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}>
        <button
          className="eqx-buddy"
          type="button"
          data-testid="buddy-orb"
          data-mode={effectiveMode}
          aria-label={orbLabel(effectiveMode)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="eqx-buddy-core" aria-hidden="true" />
          {effectiveMode === "alert" && (
            <span className="eqx-alert-count" data-testid="alert-count">{Math.min(alertCount, 99)}</span>
          )}
        </button>

        {menuOpen && (
          <div className="eqx-popover" data-side={side} role="menu" aria-label="EquaLens actions">
            <div className="eqx-menu-header">EquaLens</div>
            <div className="eqx-menu-list">
              <MenuAction ref={firstAction} onClick={() => runAction("scan")}>Scan page</MenuAction>
              <MenuAction onClick={() => runAction("panel")}>Open panel</MenuAction>
              <MenuAction onClick={() => runAction("inspect")}>Inspect element</MenuAction>
              <MenuAction onClick={() => runAction("settings")}>Settings</MenuAction>
            </div>
          </div>
        )}

        {selection && (
          <div
            className="eqx-popover eqx-analysis-card"
            data-side={side}
            data-vertical={position.y > viewport.height / 2 ? "bottom" : "top"}
            hidden={menuOpen}
            style={{ maxHeight: position.y > viewport.height / 2 ? position.y + 32 : viewport.height - position.y - 12 }}
          >
            <AnalysisCard
              request={selection.request}
              onAnalyze={onAnalyze}
              onIndicatorChange={setAnalysisIndicator}
            />
          </div>
        )}
      </div>
    </>
  );
}

const MenuAction = React.forwardRef<HTMLButtonElement, React.PropsWithChildren<{ onClick: () => void }>>(
  ({ children, onClick }, ref) => (
    <button ref={ref} className="eqx-menu-action" type="button" role="menuitem" onClick={onClick}>
      {children}
    </button>
  ),
);
MenuAction.displayName = "MenuAction";

function buddyPosition(rect: ViewportRect | null, viewport: { width: number; height: number }): { x: number; y: number } {
  const margin = 12;
  const size = 44;
  if (!rect) return { x: viewport.width - size - margin, y: Math.max(margin, viewport.height / 2 - size / 2) };

  const preferredX = rect.right + margin + size <= viewport.width ? rect.right + margin : rect.left - size - margin;
  return {
    x: clamp(preferredX, margin, viewport.width - size - margin),
    y: clamp(rect.top + rect.height / 2 - size / 2, margin, viewport.height - size - margin),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function orbLabel(mode: OrbStatus["mode"]): string {
  if (mode === "thinking") return "EquaLens is analyzing";
  if (mode === "alert") return "EquaLens findings available";
  if (mode === "attentive") return "Open EquaLens for this selection";
  return "Open EquaLens";
}
