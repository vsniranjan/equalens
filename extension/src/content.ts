import { calculateInclusionScore } from "@equalens/shared/tokens";
import type { AnalyzeRequest, AnalyzeResponse, Finding, InterestCategory, RedesignResponse, ReportPayload, ReportResponse, ScanRequest, ScanResponse } from "@equalens/shared/types";
import { serializeVisibleDom } from "./content/dom-serializer";
import { ElementPicker, type ElementCapture } from "./content/element-picker";
import { mountOverlay, type OrbAction, type OverlayController } from "./content/overlay";
import { RedesignCoordinator } from "./content/redesign-coordinator";
import type { ScanPanelAction } from "./content/scan-overlay";
import { captureTextSelection, toViewportRect } from "./content/selection";
import { requestApi, streamScan } from "./messaging";
import { openOptionsPage, openReportPage } from "./navigation";
import { DEFAULT_PREFERENCES, loadPreferences, watchPreferences, type EqualensPreferences } from "./preferences";

export interface ContentScriptController {
  readonly overlay: OverlayController;
  destroy(): void;
}

const controllers = new WeakMap<Document, ContentScriptController>();

export function bootstrapContentScript(document: Document = window.document): ContentScriptController {
  const existing = controllers.get(document);
  if (existing?.overlay.host.isConnected) return existing;
  if (!document.body) throw new Error("EquaLens requires document.body before mounting.");

  const view = document.defaultView ?? window;
  let activeElement: Element | null = null;
  let activeRequest: AnalyzeRequest | null = null;
  let scanFindings: Finding[] = [];
  let activeScanStop: (() => void) | null = null;
  let scanStartTimer: number | null = null;
  let scanGeneration = 0;
  let frame = 0;
  let frameFocusTimer: number | null = null;
  let destroyed = false;
  let redesignCoordinator: RedesignCoordinator | null = null;
  let preferences: EqualensPreferences = { ...DEFAULT_PREFERENCES, categories: [...DEFAULT_PREFERENCES.categories] };
  let preferencesReady: Promise<void> = Promise.resolve();

  const dispatchAction = (action: OrbAction | ScanPanelAction, detail: Record<string, unknown> = {}): void => {
    view.dispatchEvent(new view.CustomEvent("equalens:action", { detail: { action, ...detail } }));
  };

  const dispatchSelection = (detail: Record<string, unknown>): void => {
    view.dispatchEvent(new view.CustomEvent("equalens:selection", { detail }));
  };

  const overlay = mountOverlay({
    document,
    onAnalyze: async (request) => {
      await preferencesReady;
      return requestApi<AnalyzeResponse>("/analyze", { ...request, categories: [...preferences.categories] });
    },
    onRedesignSelection: (finding) => redesignCoordinator
      ? redesignCoordinator.redesignSelection(finding)
      : Promise.reject(new Error("Redesign is unavailable.")),
    onAction(action) {
      if ((action === "scan" || action === "panel") && redesignCoordinator?.hasOpenPreview()) {
        overlay.setRedesignNotice({ mode: "error", message: "Keep or revert the current redesign preview before opening scan results." });
        return;
      }
      if (action === "inspect" && redesignCoordinator?.hasOpenPreview()) {
        overlay.setRedesignNotice({ mode: "error", message: "Keep or revert the current redesign preview before inspecting another element." });
        return;
      }
      if (action === "scan" || action === "panel") {
        view.getSelection()?.removeAllRanges();
        activeElement = null;
        activeRequest = null;
        overlay.setSelection(null);
        if (action === "scan") {
          startPageScan();
        } else {
          overlay.openPanel();
          dispatchAction(action);
        }
        return;
      }
      if (action === "inspect") {
        view.getSelection()?.removeAllRanges();
        activeElement = null;
        activeRequest = null;
        overlay.setSelection(null);
        overlay.setInspection(null, true);
        picker.start();
        return;
      }
      if (action === "settings") {
        dispatchAction(action);
        void openOptionsPage().catch((error: unknown) => {
          console.error(JSON.stringify({
            event: "settings_open_failed",
            error: error instanceof Error ? error.message : "Unknown extension error",
          }));
        });
        return;
      }
      dispatchAction(action);
    },
    onScanAction(action, finding, findings) {
      if (action === "redesign-finding" && finding) {
        dispatchAction(action, { finding });
        void redesignCoordinator?.redesignFromPanel([finding]).catch(() => undefined);
        return;
      }
      if (action === "redesign-all") {
        dispatchAction(action, { findings });
        void redesignCoordinator?.redesignFromPanel(findings).catch(() => undefined);
        return;
      }
      if (action === "export-report") {
        dispatchAction(action, { findings });
        void exportReport(findings);
        return;
      }
      dispatchAction(action, finding ? { finding } : { findings });
    },
    onRetryScan: retryDeepScan,
    onFindingsChange(findings) {
      scanFindings = findings.map((finding) => ({ ...finding }));
    },
  });

  const applyPreferences = (nextPreferences: EqualensPreferences): void => {
    preferences = nextPreferences;
    overlay.setBuddyStyle(preferences.buddyStyle);
    if (activeRequest) activeRequest = { ...activeRequest, categories: [...preferences.categories] };
  };
  preferencesReady = loadPreferences().then(applyPreferences).catch((error: unknown) => {
    console.error(JSON.stringify({
      event: "preferences_load_failed",
      error: error instanceof Error ? error.message : "Unknown extension error",
    }));
  });
  const stopWatchingPreferences = watchPreferences(applyPreferences);

  redesignCoordinator = new RedesignCoordinator({
    document,
    overlay,
    requestRedesign: (request) => requestApi<RedesignResponse>("/redesign", request),
    getFindings: () => scanFindings,
    setFindings(findings) {
      scanFindings = findings.map((finding) => ({ ...finding }));
      overlay.setFindings(scanFindings);
    },
    onBeforeRun() {
      cancelDeepScan();
      if (scanFindings.length > 0) overlay.setScanStatus({ mode: "complete" });
    },
    onPreviewReady() {
      view.getSelection()?.removeAllRanges();
      activeElement = null;
      activeRequest = null;
      overlay.setSelection(null);
    },
  });

  function startPageScan(): void {
    cancelDeepScan();
    scanFindings = [];
    overlay.showScan(scanFindings);
    dispatchAction("scan", { count: scanFindings.length, findings: scanFindings });
    beginDeepScan();
  }

  function retryDeepScan(): void {
    cancelDeepScan();
    scanFindings = [];
    overlay.setFindings(scanFindings);
    beginDeepScan();
  }

  function beginDeepScan(): void {
    const generation = scanGeneration;
    overlay.setScanStatus({ mode: "scanning" });
    void preferencesReady.then(() => {
      if (destroyed || generation !== scanGeneration) return;
      scanStartTimer = view.setTimeout(() => {
        scanStartTimer = null;
        if (destroyed || generation !== scanGeneration) return;

        let request: ScanRequest;
        try {
          request = createScanRequest(document, preferences.categories);
        } catch (error) {
          showDeepScanError(error, generation);
          return;
        }

        try {
          let streamSettled = false;
          const stop = streamScan(request, {
            onFinding(finding) {
              if (destroyed || generation !== scanGeneration) return;
              scanFindings = [...scanFindings, { ...finding }];
              overlay.setFindings(scanFindings);
            },
            onComplete() {
              if (destroyed || generation !== scanGeneration) return;
              streamSettled = true;
              activeScanStop = null;
              overlay.setScanStatus({ mode: "complete" });
            },
            onError(error, status) {
              if (destroyed || generation !== scanGeneration) return;
              streamSettled = true;
              activeScanStop = null;
              if (status === 0) {
                void runSingleResponseFallback(request, generation, error);
                return;
              }
              showDeepScanError(error, generation);
            },
          });
          activeScanStop = streamSettled ? null : stop;
        } catch (error) {
          void runSingleResponseFallback(request, generation, error);
        }
      }, 0);
    });
  }

  async function exportReport(findings: readonly Finding[]): Promise<void> {
    overlay.setReportStatus({ mode: "exporting" });
    const payload: ReportPayload = {
      pageTitle: document.title.trim() || document.location.hostname || "Untitled page",
      pageUrl: document.location.href,
      findings: findings.map((finding) => ({ ...finding, affected: [...finding.affected], evidenceTags: [...finding.evidenceTags] })),
      scoreBefore: calculateInclusionScore(findings.map(({ severity }) => severity)),
      scoreAfter: calculateInclusionScore(findings.filter(({ fixed }) => !fixed).map(({ severity }) => severity)),
    };
    try {
      const response = await requestApi<ReportResponse>("/report", payload);
      if (!response || typeof response.url !== "string" || typeof response.id !== "string") {
        throw new Error("EquaLens received an invalid report response");
      }
      await openReportPage(response.url);
      overlay.setReportStatus({ mode: "idle" });
    } catch (error) {
      overlay.setReportStatus({
        mode: "error",
        message: error instanceof Error ? error.message : "EquaLens could not export this report.",
      });
    }
  }

  async function runSingleResponseFallback(request: ScanRequest, generation: number, streamError: unknown): Promise<void> {
    try {
      const response = await requestApi<ScanResponse>("/scan", request);
      if (destroyed || generation !== scanGeneration) return;
      if (!response || !Array.isArray(response.findings)) throw new Error("EquaLens received an invalid scan response");
      scanFindings = response.findings.map((finding) => ({ ...finding }));
      overlay.setFindings(scanFindings);
      overlay.setScanStatus({ mode: "complete" });
    } catch (fallbackError) {
      if (destroyed || generation !== scanGeneration) return;
      showDeepScanError(fallbackError instanceof Error ? fallbackError : streamError, generation);
    }
  }

  function showDeepScanError(error: unknown, generation: number): void {
    if (destroyed || generation !== scanGeneration) return;
    const message = error instanceof Error && error.message.trim()
      ? error.message.trim()
      : "Deep analysis is temporarily unavailable";
    overlay.setScanStatus({ mode: "error", message });
  }

  function cancelDeepScan(): void {
    scanGeneration += 1;
    if (scanStartTimer !== null) {
      view.clearTimeout(scanStartTimer);
      scanStartTimer = null;
    }
    activeScanStop?.();
    activeScanStop = null;
  }

  const picker = new ElementPicker({
    document,
    rootHost: overlay.host,
    onHover: (rect) => overlay.setInspection(rect, true),
    onPick: (capture) => handlePickedElement(capture),
    onCancel: () => overlay.setInspection(null, false),
  });

  const handleSelectionChange = (): void => {
    if (picker.active || redesignCoordinator?.hasOpenPreview()) return;
    const capture = captureTextSelection(view.getSelection(), document, preferences.categories);
    activeElement = capture?.element ?? null;
    activeRequest = capture?.request ?? null;
    overlay.setSelection(capture ? { text: capture.request.text, rect: capture.rect, request: capture.request } : null);
    if (capture) dispatchSelection({ source: "text", request: capture.request });
  };

  const handlePickedElement = (capture: ElementCapture): void => {
    if (capture.element.tagName === "IFRAME") {
      showFrameBoundary();
      return;
    }
    activeElement = capture.element;
    const request: AnalyzeRequest = {
      text: capture.text || capture.element.tagName.toLowerCase(),
      outerHTML: capture.outerHTML,
      selector: capture.selector,
      context: (capture.element.parentElement?.textContent ?? capture.text).replace(/\s+/g, " ").trim().slice(0, 1_500),
      pageTitle: document.title || document.location.hostname,
      pageUrl: document.location.href,
      categories: [...preferences.categories],
    };
    activeRequest = request;
    overlay.setInspection(null, false);
    overlay.setSelection({ text: request.text, rect: capture.rect, request });
    dispatchSelection({
      source: "element",
      request,
    });
  };

  const refreshPosition = (): void => {
    frame = 0;
    if (picker.active || !activeElement?.isConnected) {
      overlay.refreshPosition();
      return;
    }

    const selectionCapture = captureTextSelection(view.getSelection(), document, preferences.categories);
    if (selectionCapture) {
      activeElement = selectionCapture.element;
      activeRequest = selectionCapture.request;
      overlay.setSelection({ text: selectionCapture.request.text, rect: selectionCapture.rect, request: selectionCapture.request });
      return;
    }

    if (!activeRequest) return;
    const text = (activeElement.textContent ?? activeElement.tagName).replace(/\s+/g, " ").trim().slice(0, 120);
    overlay.setSelection({ text, rect: toViewportRect(activeElement.getBoundingClientRect()), request: activeRequest });
  };

  const scheduleRefresh = (): void => {
    if (!frame) frame = view.requestAnimationFrame(refreshPosition);
  };

  const handleEscape = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || picker.active) return;
    view.getSelection()?.removeAllRanges();
    activeElement = null;
    activeRequest = null;
    overlay.setSelection(null);
    overlay.setPageNotice(null);
  };

  function showFrameBoundary(): void {
    picker.stop();
    overlay.setInspection(null, false);
    activeElement = null;
    activeRequest = null;
    overlay.setSelection(null);
    overlay.setPageNotice("EquaLens can't analyze embedded frames. Select content on the main page instead.");
  }

  const handleWindowBlur = (): void => {
    if (frameFocusTimer !== null) view.clearTimeout(frameFocusTimer);
    frameFocusTimer = view.setTimeout(() => {
      frameFocusTimer = null;
      if (!destroyed && document.activeElement?.tagName === "IFRAME") showFrameBoundary();
    }, 0);
  };
  const clearPageNotice = (): void => overlay.setPageNotice(null);

  document.addEventListener("selectionchange", handleSelectionChange);
  document.addEventListener("keydown", handleEscape, true);
  document.addEventListener("scroll", scheduleRefresh, true);
  view.addEventListener("resize", scheduleRefresh);
  view.addEventListener("blur", handleWindowBlur);
  document.addEventListener("pointerdown", clearPageNotice, true);

  const controller: ContentScriptController = {
    overlay,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelDeepScan();
      stopWatchingPreferences();
      redesignCoordinator?.destroy();
      picker.stop();
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("keydown", handleEscape, true);
      document.removeEventListener("scroll", scheduleRefresh, true);
      view.removeEventListener("resize", scheduleRefresh);
      view.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("pointerdown", clearPageNotice, true);
      if (frameFocusTimer !== null) view.clearTimeout(frameFocusTimer);
      if (frame) view.cancelAnimationFrame(frame);
      overlay.destroy();
      controllers.delete(document);
    },
  };

  controllers.set(document, controller);
  return controller;
}

function createScanRequest(document: Document, categories: readonly InterestCategory[]): ScanRequest {
  const pageUrl = document.location.href;
  const protocol = new URL(pageUrl).protocol;
  if (protocol !== "http:" && protocol !== "https:") {
    throw new Error("Deep scan is unavailable on this page");
  }

  const dom = serializeVisibleDom(document);
  if (dom.length === 0) throw new Error("Deep scan could not find visible page content");
  return {
    dom,
    pageTitle: document.title.trim() || document.location.hostname || "Untitled page",
    pageUrl,
    categories: [...categories],
  };
}

if (typeof chrome !== "undefined" && chrome.runtime?.id) {
  bootstrapContentScript();
  console.info(JSON.stringify({ event: "content_script_ready", service: "equalens" }));
}
