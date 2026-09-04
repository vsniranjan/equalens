import type { AnalyzeRequest, AnalyzeResponse } from "@equalens/shared/types";
import { ElementPicker, type ElementCapture } from "./content/element-picker";
import { mountOverlay, type OrbAction, type OverlayController } from "./content/overlay";
import { captureTextSelection, DEFAULT_INTEREST_CATEGORIES, toViewportRect } from "./content/selection";
import { requestApi } from "./messaging";

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
  let frame = 0;
  let destroyed = false;

  const dispatchAction = (action: OrbAction, detail: Record<string, unknown> = {}): void => {
    view.dispatchEvent(new view.CustomEvent("equalens:action", { detail: { action, ...detail } }));
  };

  const dispatchSelection = (detail: Record<string, unknown>): void => {
    view.dispatchEvent(new view.CustomEvent("equalens:selection", { detail }));
  };

  const overlay = mountOverlay({
    document,
    onAnalyze: (request) => requestApi<AnalyzeResponse>("/analyze", request),
    onAction(action) {
      if (action === "inspect") {
        view.getSelection()?.removeAllRanges();
        activeElement = null;
        activeRequest = null;
        overlay.setSelection(null);
        overlay.setInspection(null, true);
        picker.start();
        return;
      }
      dispatchAction(action);
    },
  });

  const picker = new ElementPicker({
    document,
    rootHost: overlay.host,
    onHover: (rect) => overlay.setInspection(rect, true),
    onPick: (capture) => handlePickedElement(capture),
    onCancel: () => overlay.setInspection(null, false),
  });

  const handleSelectionChange = (): void => {
    if (picker.active) return;
    const capture = captureTextSelection(view.getSelection(), document);
    activeElement = capture?.element ?? null;
    activeRequest = capture?.request ?? null;
    overlay.setSelection(capture ? { text: capture.request.text, rect: capture.rect, request: capture.request } : null);
    if (capture) dispatchSelection({ source: "text", request: capture.request });
  };

  const handlePickedElement = (capture: ElementCapture): void => {
    activeElement = capture.element;
    const request: AnalyzeRequest = {
      text: capture.text || capture.element.tagName.toLowerCase(),
      outerHTML: capture.outerHTML,
      selector: capture.selector,
      context: (capture.element.parentElement?.textContent ?? capture.text).replace(/\s+/g, " ").trim().slice(0, 1_500),
      pageTitle: document.title || document.location.hostname,
      pageUrl: document.location.href,
      categories: [...DEFAULT_INTEREST_CATEGORIES],
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

    const selectionCapture = captureTextSelection(view.getSelection(), document);
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
  };

  document.addEventListener("selectionchange", handleSelectionChange);
  document.addEventListener("keydown", handleEscape, true);
  document.addEventListener("scroll", scheduleRefresh, true);
  view.addEventListener("resize", scheduleRefresh);

  const controller: ContentScriptController = {
    overlay,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      picker.stop();
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("keydown", handleEscape, true);
      document.removeEventListener("scroll", scheduleRefresh, true);
      view.removeEventListener("resize", scheduleRefresh);
      if (frame) view.cancelAnimationFrame(frame);
      overlay.destroy();
      controllers.delete(document);
    },
  };

  controllers.set(document, controller);
  return controller;
}

if (typeof chrome !== "undefined" && chrome.runtime?.id) {
  bootstrapContentScript();
  console.info(JSON.stringify({ event: "content_script_ready", service: "equalens" }));
}
