import type { SerializedDomElement } from "@equalens/shared/types";
import { createUniqueSelector } from "./selectors";

export const MAX_SERIALIZED_DOM_BYTES = 15 * 1_024;

const MAX_TEXT_LENGTH = 480;
const MAX_ATTRIBUTE_LENGTH = 180;
const SEMANTIC_TAGS = new Set([
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "legend",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "li",
  "dt",
  "dd",
  "blockquote",
  "figcaption",
  "th",
  "td",
  "img",
]);
const EXCLUDED_TAGS = new Set(["script", "style", "noscript", "template", "svg", "path"]);
const KEY_ATTRIBUTES = new Set([
  "id",
  "class",
  "name",
  "type",
  "role",
  "tabindex",
  "disabled",
  "required",
  "multiple",
  "checked",
  "scope",
  "placeholder",
  "alt",
  "title",
  "href",
  "for",
  "min",
  "max",
  "step",
  "autocomplete",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-required",
  "aria-checked",
  "aria-expanded",
  "data-equalens-variant",
]);
const VOID_TAGS = new Set(["img", "input"]);

interface Candidate {
  element: Element;
  rect: DOMRect;
  documentIndex: number;
  viewportDistance: number;
  navigation: number;
}

export function serializeVisibleDom(
  document: Document,
  maxBytes: number = MAX_SERIALIZED_DOM_BYTES,
): SerializedDomElement[] {
  if (!Number.isFinite(maxBytes) || maxBytes < 2) return [];
  const root = document.body;
  if (!root) return [];

  const view = document.defaultView;
  const viewportWidth = view?.innerWidth ?? 0;
  const viewportHeight = view?.innerHeight ?? 0;
  const candidates: Candidate[] = [];

  for (const [documentIndex, element] of [...root.querySelectorAll("*")].entries()) {
    if (!shouldSerialize(element)) continue;
    const rect = element.getBoundingClientRect();
    if (!isRendered(element, view, rect)) continue;
    candidates.push({
      element,
      rect,
      documentIndex,
      viewportDistance: distanceFromViewport(rect, viewportWidth, viewportHeight),
      navigation: element.closest("nav, [role='navigation'], [role='banner'], footer, [role='contentinfo']") ? 1 : 0,
    });
  }

  // Large mega-menus must not consume the bounded payload before the product.
  candidates.sort((left, right) => left.navigation - right.navigation
    || left.viewportDistance - right.viewportDistance
    || left.rect.top - right.rect.top
    || left.rect.left - right.rect.left
    || left.documentIndex - right.documentIndex);

  const serialized: SerializedDomElement[] = [];
  let usedBytes = 2;
  for (const { element } of candidates) {
    const item = serializeElement(element);
    if (!item) continue;
    const itemBytes = utf8Length(JSON.stringify(item));
    const separatorBytes = serialized.length > 0 ? 1 : 0;
    if (usedBytes + separatorBytes + itemBytes > maxBytes) break;
    serialized.push(item);
    usedBytes += separatorBytes + itemBytes;
  }

  if (serialized.length === 0) {
    const fallback = serializeElement(root);
    if (fallback && utf8Length(JSON.stringify([fallback])) <= maxBytes) serialized.push(fallback);
  }

  return serialized;
}

function serializeElement(element: Element): SerializedDomElement | null {
  let selector: string;
  try {
    selector = createUniqueSelector(element, element.ownerDocument);
  } catch {
    return null;
  }

  const tagName = element.tagName.toLocaleLowerCase();
  const text = elementText(element, tagName);
  if (!text) return null;
  const role = element.getAttribute("role")?.trim() || implicitRole(element, tagName);
  const attributes = [...element.attributes]
    .filter(({ name }) => {
      const normalizedName = name.toLocaleLowerCase();
      return KEY_ATTRIBUTES.has(normalizedName) || normalizedName.startsWith("aria-");
    })
    .sort(({ name: left }, { name: right }) => left.localeCompare(right))
    .map(({ name, value }) => `${name}="${escapeHtml(truncate(normalizeText(value), MAX_ATTRIBUTE_LENGTH))}"`)
    .join(" ");
  const openingTag = `<${tagName}${attributes ? ` ${attributes}` : ""}>`;
  const html = VOID_TAGS.has(tagName) ? openingTag : `${openingTag}${escapeHtml(text)}</${tagName}>`;

  return {
    selector,
    text,
    html,
    tagName,
    ...(role ? { role } : {}),
  };
}

function shouldSerialize(element: Element): boolean {
  const tagName = element.tagName.toLocaleLowerCase();
  if (EXCLUDED_TAGS.has(tagName) || element.closest("#equalens-root, [hidden], [inert], [aria-hidden='true']")) return false;
  if (SEMANTIC_TAGS.has(tagName)) return true;
  if (element.hasAttribute("role") || element.hasAttribute("aria-label") || element.hasAttribute("data-equalens-variant")) return true;
  return [...element.childNodes].some((node) => node.nodeType === 3 && Boolean(normalizeText(node.nodeValue ?? "")));
}

function isRendered(element: Element, view: Window | null, rect: DOMRect): boolean {
  if (view) {
    const style = view.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || style.opacity === "0") return false;
  }
  return rect.width > 0 && rect.height > 0;
}

function elementText(element: Element, tagName: string): string {
  const content = normalizeText(element.textContent ?? "");
  if (content) return truncate(content, MAX_TEXT_LENGTH);

  const accessibleText = normalizeText(
    element.getAttribute("aria-label")
      ?? element.getAttribute("alt")
      ?? element.getAttribute("placeholder")
      ?? element.getAttribute("title")
      ?? "",
  );
  if (accessibleText) return truncate(accessibleText, MAX_TEXT_LENGTH);

  if (tagName === "input" && ["button", "submit", "reset"].includes(element.getAttribute("type")?.toLocaleLowerCase() ?? "")) {
    return truncate(normalizeText(element.getAttribute("value") ?? ""), MAX_TEXT_LENGTH);
  }
  if (["input", "select", "textarea"].includes(tagName)) {
    return normalizeText([tagName, element.getAttribute("type"), element.getAttribute("name")].filter(Boolean).join(" "));
  }
  return "";
}

function implicitRole(element: Element, tagName: string): string | undefined {
  if (tagName === "button") return "button";
  if (tagName === "a" && element.hasAttribute("href")) return "link";
  if (tagName === "img") return "img";
  if (/^h[1-6]$/.test(tagName)) return "heading";
  if (tagName === "li") return "listitem";
  if (tagName === "th") return element.getAttribute("scope") === "row" ? "rowheader" : "columnheader";
  if (tagName === "td") return "cell";
  if (tagName === "textarea") return "textbox";
  if (tagName === "select") return element.hasAttribute("multiple") ? "listbox" : "combobox";
  if (tagName === "input") {
    const type = element.getAttribute("type")?.toLocaleLowerCase() ?? "text";
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio";
    if (type === "range") return "slider";
    if (type === "number") return "spinbutton";
    if (type === "search") return "searchbox";
    if (["button", "submit", "reset"].includes(type)) return "button";
    return "textbox";
  }
  return undefined;
}

function distanceFromViewport(rect: DOMRect, viewportWidth: number, viewportHeight: number): number {
  const vertical = rect.bottom < 0 ? -rect.bottom : rect.top > viewportHeight ? rect.top - viewportHeight : 0;
  const horizontal = rect.right < 0 ? -rect.right : rect.left > viewportWidth ? rect.left - viewportWidth : 0;
  return vertical + horizontal;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}
