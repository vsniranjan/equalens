import type { AnalyzeRequest, InterestCategory } from "@equalens/shared/types";
import { createUniqueSelector } from "./selectors";

export const DEFAULT_INTEREST_CATEGORIES: readonly InterestCategory[] = [
  "safety",
  "sizing-fit",
  "language",
  "everyday-usability",
];

export interface ViewportRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface SelectionCapture {
  request: AnalyzeRequest;
  rect: ViewportRect;
  element: Element;
}

export function captureTextSelection(
  selection: Selection | null,
  document: Document,
  categories: readonly InterestCategory[] = DEFAULT_INTEREST_CATEGORIES,
): SelectionCapture | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const selectedText = normalizeText(selection.toString()).slice(0, 8_000);
  if (!selectedText) return null;

  const range = selection.getRangeAt(0);
  const element = closestElement(range.commonAncestorContainer)
    ?? closestElement(selection.anchorNode)
    ?? closestElement(selection.focusNode);
  if (!element || isInsideOverlay(element)) return null;

  const rect = usableRect(range);
  if (!rect) return null;

  const contextSource = normalizeText(element.parentElement?.textContent ?? element.textContent ?? selectedText);
  return {
    request: {
      text: selectedText,
      outerHTML: element.outerHTML.slice(0, 8_192),
      selector: createUniqueSelector(element, document),
      context: clipAround(contextSource, selectedText, 1_500),
      pageTitle: document.title || document.location.hostname,
      pageUrl: document.location.href,
      categories: [...categories],
    },
    rect,
    element,
  };
}

export function toViewportRect(rect: Pick<DOMRect, "top" | "right" | "bottom" | "left" | "width" | "height">): ViewportRect {
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function closestElement(node: Node | null): Element | null {
  if (node instanceof Element) return node;
  return node?.parentElement ?? null;
}

function isInsideOverlay(element: Element): boolean {
  const root = element.getRootNode();
  return element.closest("#equalens-root") !== null
    || (root instanceof ShadowRoot && root.host.id === "equalens-root");
}

function usableRect(range: Range): ViewportRect | null {
  const primary = range.getBoundingClientRect();
  if (primary.width > 0 || primary.height > 0) return toViewportRect(primary);
  const fallback = range.getClientRects().item(0);
  return fallback ? toViewportRect(fallback) : null;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clipAround(value: string, needle: string, limit: number): string {
  if (value.length <= limit) return value;
  const index = value.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
  if (index < 0) return value.slice(0, limit);
  const start = Math.max(0, Math.min(index - Math.floor((limit - needle.length) / 2), value.length - limit));
  return value.slice(start, start + limit);
}
