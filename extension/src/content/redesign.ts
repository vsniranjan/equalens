import createDOMPurify, { type WindowLike } from "dompurify";
import { ensureRedesignPageStyles } from "./redesign-variants";

const INTERACTIVE_SELECTOR = "button, a[href], input, select, option, textarea";
const SAFE_TAGS = [
  "a", "abbr", "b", "blockquote", "br", "button", "caption", "code", "col", "colgroup", "dd", "details",
  "div", "dl", "dt", "em", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5",
  "h6", "header", "hr", "i", "img", "input", "label", "legend", "li", "main", "nav", "ol", "option", "p",
  "section", "select", "small", "span", "strong", "summary", "table", "tbody", "td", "textarea", "tfoot", "th",
  "thead", "tr", "ul", "article", "aside",
];
const SAFE_ATTRIBUTES = [
  "alt", "autocomplete", "checked", "class", "colspan", "disabled", "for", "height", "href", "id", "max", "min",
  "multiple", "name", "placeholder", "rel", "required", "role", "rowspan", "scope", "selected", "src", "step", "hidden", "action", "method", "enctype", "pattern", "minlength", "maxlength", "readonly",
  "style", "tabindex", "target", "title", "type", "value", "width",
];
const UNSAFE_STYLE_PATTERN = /(?:expression\s*\(|url\s*\(|@import|behavior\s*:|-moz-binding)/i;

export interface CapabilityMetrics {
  interactiveElements: number;
  tableRows: number;
  tableCells: number;
  textLength: number;
}

export interface CapabilityResult {
  preserved: boolean;
  violationNote?: string;
  original: CapabilityMetrics;
  rewritten: CapabilityMetrics;
}

export interface ElementSnapshot {
  target: HTMLElement;
  originalHtml: string;
  clone: HTMLElement;
  nodeStates: Array<{ node: Node; attributes: Array<readonly [string, string]>; children: Node[]; text: string | null; formState?: HTMLElement }>;
}

export interface ComparisonSnapshot {
  setPosition(percent: number): void;
  refresh(): void;
  destroy(): void;
}

export function sanitizeRedesignHtml(document: Document, html: string): string {
  const view = document.defaultView;
  if (!view) throw new Error("EquaLens cannot sanitize HTML without a document window");
  const purifier = createDOMPurify(view as unknown as WindowLike);
  const sanitized = purifier.sanitize(html, {
    ALLOWED_TAGS: SAFE_TAGS,
    ALLOWED_ATTR: SAFE_ATTRIBUTES,
    ALLOW_ARIA_ATTR: true,
    ALLOW_DATA_ATTR: true,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "link", "meta"],
    RETURN_TRUSTED_TYPE: false,
  });
  const template = document.createElement("template");
  template.innerHTML = sanitized;
  for (const element of template.content.querySelectorAll<HTMLElement>("[style]")) {
    if (UNSAFE_STYLE_PATTERN.test(element.getAttribute("style") ?? "")) element.removeAttribute("style");
  }
  for (const link of template.content.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')) {
    link.rel = "noopener noreferrer";
  }
  return template.innerHTML.trim();
}

export function inspectCapabilities(document: Document, html: string): CapabilityMetrics {
  const template = document.createElement("template");
  template.innerHTML = html;
  return {
    interactiveElements: template.content.querySelectorAll(INTERACTIVE_SELECTOR).length,
    tableRows: template.content.querySelectorAll("tr").length,
    tableCells: template.content.querySelectorAll("th, td").length,
    textLength: normalizedText(template.content.textContent ?? "").length,
  };
}

export function checkCapabilityPreservation(document: Document, originalHtml: string, rewrittenHtml: string): CapabilityResult {
  const original = inspectCapabilities(document, originalHtml);
  const rewritten = inspectCapabilities(document, rewrittenHtml);
  const violations: string[] = [];

  if (rewritten.interactiveElements < original.interactiveElements) {
    violations.push(`interactive elements fell from ${original.interactiveElements} to ${rewritten.interactiveElements}`);
  }
  if (rewritten.tableRows < original.tableRows) {
    violations.push(`table rows fell from ${original.tableRows} to ${rewritten.tableRows}`);
  }
  if (rewritten.tableCells < original.tableCells) {
    violations.push(`table cells fell from ${original.tableCells} to ${rewritten.tableCells}`);
  }
  if (original.textLength > 0 && rewritten.textLength < Math.ceil(original.textLength * 0.7)) {
    violations.push(`text length fell below 70% (${original.textLength} to ${rewritten.textLength} characters)`);
  }

  return {
    preserved: violations.length === 0,
    ...(violations.length > 0 ? { violationNote: `Your rewrite reduced capability: ${violations.join("; ")}. Preserve every control, option, table row, table cell, and substantive detail.` } : {}),
    original,
    rewritten,
  };
}

export function captureElementSnapshot(target: HTMLElement): ElementSnapshot {
  const nodeStates: ElementSnapshot["nodeStates"] = [target, ...target.querySelectorAll("*")].map((node) => ({
    node, attributes: [...node.attributes].map(({ name, value }) => [name, value] as const),
    children: [...node.childNodes], text: null,
    ...(node instanceof HTMLElement && node.matches("input, select, textarea") ? { formState: cloneWithComputedStyles(node) } : {}),
  }));
  nodeStates.push(...textNodes(target).map((node) => ({ node, attributes: [], children: [], text: node.nodeValue })));
  return {
    target,
    originalHtml: target.innerHTML,
    clone: cloneWithComputedStyles(target),
    nodeStates,
  };
}

export function applySanitizedRedesign(snapshot: ElementSnapshot, sanitizedHtml: string): void {
  const template = snapshot.target.ownerDocument.createElement("template");
  template.innerHTML = sanitizedHtml;
  const replacement = singleRoot(template.content);
  if (replacement?.tagName === snapshot.target.tagName) {
    reconcileElement(snapshot.target, replacement);
  } else {
    reconcileChildren(snapshot.target, template.content);
  }
  preserveRedesignedFormState(snapshot);
  revealRedesignedText(snapshot.target, snapshot.originalHtml);
}

export function restoreElementSnapshot(snapshot: ElementSnapshot): void {
  for (const state of [...snapshot.nodeStates].reverse()) {
    if (state.node instanceof Element) {
      for (const attribute of [...state.node.attributes]) state.node.removeAttribute(attribute.name);
      for (const [name, value] of state.attributes) state.node.setAttribute(name, value);
      state.node.replaceChildren(...state.children);
    } else {
      state.node.nodeValue = state.text;
    }
  }
  for (const state of snapshot.nodeStates) {
    if (state.formState && state.node instanceof HTMLElement) copyFormState(state.formState, state.node);
  }
}

export function preserveRedesignedFormState(snapshot: ElementSnapshot): void {
  const originals = formControls(snapshot.clone);
  for (const target of formControls(snapshot.target)) {
    const source = originals.find((candidate) => candidate.tagName === target.tagName
      && (target.id ? candidate.id === target.id : target.name && candidate.name === target.name)
      && (target.tagName !== "INPUT" || (candidate.type === target.type
        && (!["checkbox", "radio"].includes(target.type) || candidate.getAttribute("value") === target.getAttribute("value")))));
    if (!source || (target.tagName === "INPUT" && target.type === "file")) continue;
    if (source.tagName === "SELECT" && target.tagName === "SELECT") {
      const selected = new Set([...(source as HTMLSelectElement).selectedOptions].map((option) => option.value));
      for (const option of (target as HTMLSelectElement).options) option.selected = selected.has(option.value);
    } else {
      copyFormState(source, target);
    }
  }
}

function formControls(root: HTMLElement): Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  const descendants = [...root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")];
  return root.matches("input, textarea, select") ? [root as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, ...descendants] : descendants;
}

export function revealRedesignedText(target: HTMLElement, originalHtml = ""): void {
  const view = target.ownerDocument.defaultView;
  if (!view || view.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const originalTexts = textLeafValues(target.ownerDocument, originalHtml);
  const leaves = [...target.querySelectorAll<HTMLElement>("h1, h2, h3, h4, p, li, dt, dd, th, td, label, button, figcaption")]
    .filter((element) => {
      const text = normalizedText(element.textContent ?? "");
      return text
        && !originalTexts.has(text)
        && !element.querySelector("h1, h2, h3, h4, p, li, dt, dd, th, td, label, button, figcaption");
    })
    .slice(0, 28);
  leaves.forEach((element, index) => {
    if (typeof element.animate !== "function") return;
    element.animate([
      { clipPath: "inset(0 100% 0 0)", opacity: 0.38 },
      { clipPath: "inset(0 0 0 0)", opacity: 1 },
    ], {
      duration: 260 + Math.min(normalizedText(element.textContent ?? "").length * 9, 520),
      delay: Math.min(index * 38, 420),
      easing: "steps(14, end)",
      fill: "both",
    });
  });
}

export function createComparisonSnapshot(snapshot: ElementSnapshot): ComparisonSnapshot {
  const { target } = snapshot;
  const document = target.ownerDocument;
  ensureRedesignPageStyles(document);
  const original = snapshot.clone;
  original.classList.add("eqx-redesign-original-snapshot");
  original.setAttribute("aria-hidden", "true");
  original.setAttribute("inert", "");
  removeSnapshotIds(original);
  const divider = document.createElement("div");
  divider.className = "eqx-redesign-divider";
  divider.setAttribute("aria-hidden", "true");
  document.body.append(original, divider);
  let position = 50;

  const refresh = (): void => {
    if (!target.isConnected) return;
    const view = document.defaultView;
    if (!view) return;
    const rect = target.getBoundingClientRect();
    const top = view.scrollY + rect.top;
    const left = view.scrollX + rect.left;
    original.style.top = `${top}px`;
    original.style.left = `${left}px`;
    original.style.width = `${rect.width}px`;
    original.style.height = `${rect.height}px`;
    original.style.clipPath = `inset(0 ${100 - position}% 0 0)`;
    if (position > 0 && position < 100) {
      const mask = `linear-gradient(to right, black 0%, black ${Math.max(0, position - 3)}%, transparent ${position}%)`;
      original.style.maskImage = mask;
      original.style.setProperty("-webkit-mask-image", mask);
    } else {
      original.style.removeProperty("mask-image");
      original.style.removeProperty("-webkit-mask-image");
    }
    divider.style.top = `${top}px`;
    divider.style.left = `${left + rect.width * position / 100}px`;
    divider.style.height = `${rect.height}px`;
    divider.hidden = position <= 0 || position >= 100;
  };

  refresh();
  return {
    setPosition(percent) {
      position = Math.min(100, Math.max(0, percent));
      refresh();
    },
    refresh,
    destroy() {
      original.remove();
      divider.remove();
    },
  };
}

function singleRoot(fragment: DocumentFragment): Element | null {
  const significantNodes = [...fragment.childNodes]
    .filter((node) => node.nodeType !== Node.TEXT_NODE || Boolean(normalizedText(node.nodeValue ?? "")));
  const onlyElement = significantNodes.length === 1 && significantNodes[0]?.nodeType === Node.ELEMENT_NODE
    ? significantNodes[0] as Element
    : null;
  return onlyElement;
}

function reconcileElement(target: Element, replacement: Element): void {
  for (const attribute of [...target.attributes]) {
    // Preserve page identity and event hooks when the model omits them.
    if (!replacement.hasAttribute(attribute.name) && attribute.name !== "id"
      && !attribute.name.startsWith("data-") && !attribute.name.startsWith("on")) target.removeAttribute(attribute.name);
  }
  for (const { name, value } of [...replacement.attributes]) {
    if (name !== "id" || !target.id) target.setAttribute(name, value);
  }
  reconcileChildren(target, replacement);
}

function reconcileChildren(target: Element, replacement: Element | DocumentFragment): void {
  const available = [...target.childNodes];
  const next = [...replacement.childNodes].map((node) => {
    const index = available.findIndex((candidate) => {
      if (candidate.nodeType !== node.nodeType) return false;
      if (!(candidate instanceof Element) || !(node instanceof Element)) return true;
      if (candidate.tagName !== node.tagName) return false;
      if (candidate.id || node.id) return candidate.id === node.id;
      if (candidate.hasAttribute("name") || node.hasAttribute("name")) {
        return candidate.getAttribute("name") === node.getAttribute("name")
          && candidate.getAttribute("type") === node.getAttribute("type")
          && (!candidate.matches('input[type="checkbox"], input[type="radio"]') || candidate.getAttribute("value") === node.getAttribute("value"));
      }
      return true;
    });
    if (index < 0) return node;
    const original = available.splice(index, 1)[0]!;
    if (original instanceof Element && node instanceof Element) reconcileElement(original, node);
    else original.nodeValue = node.nodeValue;
    return original;
  });
  target.replaceChildren(...next);
}

function textNodes(target: Element): Node[] {
  const walker = target.ownerDocument.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node);
  return nodes;
}

let snapshotSequence = 0;

function removeSnapshotIds(root: HTMLElement): void {
  const prefix = ++snapshotSequence;
  let index = 0;
  for (const element of [root, ...root.querySelectorAll<HTMLElement>("[id]")]) {
    if (!element.id) continue;
    element.id = `eqx-redesign-snapshot-${prefix}-${index}`;
    index += 1;
  }
  for (const element of [root, ...root.querySelectorAll("[data-equalens-variant]")]) element.removeAttribute("data-equalens-variant");
}

function cloneWithComputedStyles(target: HTMLElement): HTMLElement {
  const clone = target.cloneNode(true) as HTMLElement;
  const sources = [target, ...target.querySelectorAll<HTMLElement>("*")];
  const clones = [clone, ...clone.querySelectorAll<HTMLElement>("*")];
  const view = target.ownerDocument.defaultView;
  if (!view) return clone;
  sources.forEach((source, index) => {
    const copy = clones[index];
    if (!copy) return;
    if (index === 0) {
      const style = view.getComputedStyle(source);
      // Keep the inherited appearance, but let page CSS lay out the snapshot at
      // the current viewport. Copying computed pixel widths freezes desktop layout.
      for (const property of ["color", "background-color", "font-family", "font-size", "font-weight", "line-height", "text-align"]) {
        copy.style.setProperty(property, style.getPropertyValue(property));
      }
    }
    copyFormState(source, copy);
  });
  return clone;
}

function copyFormState(source: HTMLElement, clone: HTMLElement): void {
  if (source.tagName === "INPUT" && clone.tagName === "INPUT") {
    if ((source as HTMLInputElement).type !== "file") (clone as HTMLInputElement).value = (source as HTMLInputElement).value;
    (clone as HTMLInputElement).checked = (source as HTMLInputElement).checked;
  }
  if (source.tagName === "TEXTAREA" && clone.tagName === "TEXTAREA") {
    (clone as HTMLTextAreaElement).value = (source as HTMLTextAreaElement).value;
  }
  if (source.tagName === "SELECT" && clone.tagName === "SELECT") {
    const selected = new Set([...(source as HTMLSelectElement).selectedOptions].map((option) => option.value));
    for (const option of (clone as HTMLSelectElement).options) option.selected = selected.has(option.value);
  }
}

function normalizedText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function textLeafValues(document: Document, html: string): Set<string> {
  if (!html) return new Set();
  const template = document.createElement("template");
  template.innerHTML = html;
  return new Set([...template.content.querySelectorAll<HTMLElement>("h1, h2, h3, h4, p, li, dt, dd, th, td, label, button, figcaption")]
    .map((element) => normalizedText(element.textContent ?? ""))
    .filter(Boolean));
}
