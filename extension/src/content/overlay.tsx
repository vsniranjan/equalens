import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import type { AnalyzeRequest, Finding } from "@equalens/shared/types";
import { AnalysisCard, type AnalysisIndicator, type AnalyzeHandler, type RedesignHandler } from "./analysis-card";
import {
  RedesignComparison,
  RedesignNoticeView,
  type RedesignComparisonModel,
  type RedesignNotice,
} from "./redesign-overlay";
import type { BuddyStyle } from "../preferences";
import { ScanOverlay, type DeepScanStatus, type ReportExportStatus, type ScanPanelAction } from "./scan-overlay";
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
  setPageNotice(message: string | null): void;
  showScan(findings: readonly Finding[]): void;
  setFindings(findings: readonly Finding[]): void;
  setScanStatus(status: DeepScanStatus): void;
  setReportStatus(status: ReportExportStatus): void;
  setBuddyStyle(style: BuddyStyle): void;
  showRedesignComparison(comparison: RedesignComparisonModel | null): void;
  setRedesignNotice(notice: RedesignNotice | null): void;
  openPanel(): void;
  closePanel(): void;
  refreshPosition(): void;
  destroy(): void;
}

interface OverlayOptions {
  document?: Document;
  onAction?: (action: OrbAction) => void;
  onAnalyze?: AnalyzeHandler;
  onRedesignSelection?: RedesignHandler;
  onScanAction?: (action: ScanPanelAction, finding: Finding | undefined, findings: readonly Finding[]) => void;
  onRetryScan?: () => void;
  onFindingsChange?: (findings: readonly Finding[]) => void;
}

interface OverlayViewProps {
  selection: OverlaySelection | null;
  status: OrbStatus;
  inspectionRect: ViewportRect | null;
  inspecting: boolean;
  pageNotice: string | null;
  findings: readonly Finding[];
  panelOpen: boolean;
  scanRevision: number;
  scanStatus: DeepScanStatus;
  reportStatus: ReportExportStatus;
  buddyStyle: BuddyStyle;
  redesignComparison: RedesignComparisonModel | null;
  redesignNotice: RedesignNotice | null;
  viewport: { width: number; height: number };
  document: Document;
  onAction: (action: OrbAction) => void;
  onAnalyze: AnalyzeHandler;
  onRedesignSelection: RedesignHandler;
  onScanAction: (action: ScanPanelAction, finding?: Finding) => void;
  onRetryScan: () => void;
  onClosePanel: () => void;
  onFindingsChange: (findings: Finding[]) => void;
  onDismissRedesignNotice: () => void;
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
  let pageNotice: string | null = null;
  let findings: Finding[] = [];
  let panelOpen = false;
  let scanRevision = 0;
  let scanStatus: DeepScanStatus = { mode: "idle" };
  let reportStatus: ReportExportStatus = { mode: "idle" };
  let buddyStyle: BuddyStyle = "orb";
  let redesignComparison: RedesignComparisonModel | null = null;
  let redesignNotice: RedesignNotice | null = null;
  let destroyed = false;

  const updateFindings = (nextFindings: readonly Finding[]): void => {
    findings = nextFindings.map((finding) => ({ ...finding }));
    const count = findings.filter((finding) => !finding.fixed).length;
    status = count > 0 ? { mode: "alert", count } : { mode: "idle" };
  };

  const render = (): void => {
    if (destroyed) return;
    const view = document.defaultView ?? window;
    flushSync(() => root.render(
      <OverlayView
        selection={selection}
        status={status}
        inspectionRect={inspectionRect}
        inspecting={inspecting}
        pageNotice={pageNotice}
        findings={findings}
        panelOpen={panelOpen}
        scanRevision={scanRevision}
        scanStatus={scanStatus}
        reportStatus={reportStatus}
        buddyStyle={buddyStyle}
        redesignComparison={redesignComparison}
        redesignNotice={redesignNotice}
        viewport={{ width: view.innerWidth, height: view.innerHeight }}
        document={document}
        onAction={options.onAction ?? (() => undefined)}
        onAnalyze={options.onAnalyze ?? (() => Promise.reject(new Error("Analysis is unavailable.")))}
        onRedesignSelection={options.onRedesignSelection ?? (() => Promise.reject(new Error("Redesign is unavailable.")))}
        onScanAction={(action, finding) => options.onScanAction?.(action, finding, findings)}
        onRetryScan={options.onRetryScan ?? (() => undefined)}
        onClosePanel={() => {
          panelOpen = false;
          render();
        }}
        onFindingsChange={(nextFindings) => {
          updateFindings(nextFindings);
          options.onFindingsChange?.(findings);
          render();
        }}
        onDismissRedesignNotice={() => {
          redesignNotice = null;
          render();
        }}
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
    setPageNotice(message) {
      pageNotice = message;
      render();
    },
    showScan(nextFindings) {
      updateFindings(nextFindings);
      panelOpen = true;
      scanRevision += 1;
      scanStatus = { mode: "idle" };
      reportStatus = { mode: "idle" };
      render();
    },
    setFindings(nextFindings) {
      updateFindings(nextFindings);
      render();
    },
    setScanStatus(nextStatus) {
      scanStatus = nextStatus;
      render();
    },
    setReportStatus(nextStatus) {
      reportStatus = nextStatus;
      render();
    },
    setBuddyStyle(nextStyle) {
      buddyStyle = nextStyle;
      render();
    },
    showRedesignComparison(nextComparison) {
      redesignComparison = nextComparison;
      render();
    },
    setRedesignNotice(nextNotice) {
      redesignNotice = nextNotice;
      render();
    },
    openPanel() {
      panelOpen = true;
      render();
    },
    closePanel() {
      panelOpen = false;
      render();
    },
    refreshPosition() {
      redesignComparison?.onRefresh();
      render();
    },
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

function OverlayView({
  selection,
  status,
  inspectionRect,
  inspecting,
  pageNotice,
  findings,
  panelOpen,
  scanRevision,
  scanStatus,
  reportStatus,
  buddyStyle,
  redesignComparison,
  redesignNotice,
  viewport,
  document,
  onAction,
  onAnalyze,
  onRedesignSelection,
  onScanAction,
  onRetryScan,
  onClosePanel,
  onFindingsChange,
  onDismissRedesignNotice,
}: OverlayViewProps) {
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
  const position = buddyPosition(selection?.rect ?? null, viewport, buddyStyle);
  const side = position.x > viewport.width / 2 ? "left" : "right";
  const popoverLeft = (width: number): number => {
    const buddyWidth = buddyStyle === "minimal" ? 104 : 44;
    const preferred = side === "left" ? position.x - width - 8 : position.x + buddyWidth + 8;
    return clamp(preferred, 12, viewport.width - width - 12) - position.x;
  };
  const analysisWidth = Math.min(370, viewport.width - 24);

  useEffect(() => {
    if (menuOpen) firstAction.current?.focus();
  }, [menuOpen]);

  useEffect(() => {
    if (!selection && analysisIndicator.mode !== "idle") setAnalysisIndicator({ mode: "idle" });
  }, [analysisIndicator.mode, selection]);

  useEffect(() => {
    const view = document.defaultView ?? window;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      if (panelOpen) onClosePanel();
    };
    view.addEventListener("keydown", closeOnEscape);
    return () => view.removeEventListener("keydown", closeOnEscape);
  }, [document, onClosePanel, panelOpen]);

  const runAction = (action: OrbAction): void => {
    setMenuOpen(false);
    onAction(action);
  };

  return (
    <>
      {panelOpen && (
        <ScanOverlay
          document={document}
          findings={findings}
          key={scanRevision}
          scanStatus={scanStatus}
          reportStatus={reportStatus}
          onAction={onScanAction}
          onClose={onClosePanel}
          onFindingsChange={onFindingsChange}
          onRetry={onRetryScan}
        />
      )}
      {redesignComparison && <RedesignComparison model={redesignComparison} viewport={viewport} />}
      {redesignNotice && <RedesignNoticeView notice={redesignNotice} onDismiss={onDismissRedesignNotice} />}
      {inspecting && <div className="eqx-inspection-status" role="status">Choose an element. Press Escape to cancel.</div>}
      {!inspecting && pageNotice && <div className="eqx-inspection-status" role="status">{pageNotice}</div>}
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
      <div className="eqx-buddy-position" data-buddy-style={buddyStyle} style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}>
        <button
          className="eqx-buddy"
          type="button"
          data-testid="buddy-orb"
          data-mode={effectiveMode}
          data-style={buddyStyle}
          aria-label={orbLabel(effectiveMode)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {buddyStyle === "orb"
            ? <span className="eqx-buddy-core" aria-hidden="true" />
            : <><span className="eqx-minimal-dot" aria-hidden="true" /><span className="eqx-minimal-label">EQL // {String(Math.min(alertCount, 99)).padStart(2, "0")}</span></>}
          {effectiveMode === "alert" && (
            <span className="eqx-alert-count" data-testid="alert-count">{Math.min(alertCount, 99)}</span>
          )}
        </button>

        {menuOpen && (
          <div className="eqx-popover" data-side={side} role="menu" aria-label="EquaLens actions" style={{ left: popoverLeft(214), right: "auto", top: Math.min(0, viewport.height - position.y - 220) }}>
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
            style={{ left: popoverLeft(analysisWidth), right: "auto", width: analysisWidth, maxHeight: position.y > viewport.height / 2 ? position.y + 32 : viewport.height - position.y - 12 }}
          >
            <AnalysisCard
              request={selection.request}
              onAnalyze={onAnalyze}
              onRedesign={onRedesignSelection}
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

function buddyPosition(rect: ViewportRect | null, viewport: { width: number; height: number }, buddyStyle: BuddyStyle = "orb"): { x: number; y: number } {
  const margin = 12;
  const width = buddyStyle === "minimal" ? 104 : 44;
  const height = buddyStyle === "minimal" ? 34 : 44;
  if (!rect) return { x: viewport.width - width - margin, y: Math.max(margin, viewport.height / 2 - height / 2) };

  const preferredX = rect.right + margin + width <= viewport.width ? rect.right + margin : rect.left - width - margin;
  return {
    x: clamp(preferredX, margin, viewport.width - width - margin),
    y: clamp(rect.top + rect.height / 2 - height / 2, margin, viewport.height - height - margin),
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
