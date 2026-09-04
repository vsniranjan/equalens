import { createUniqueSelector } from "./selectors";
import { toViewportRect, type ViewportRect } from "./selection";

export interface ElementCapture {
  selector: string;
  text: string;
  outerHTML: string;
  rect: ViewportRect;
  element: Element;
}

interface ElementPickerOptions {
  document: Document;
  rootHost: HTMLElement;
  onHover: (rect: ViewportRect | null) => void;
  onPick: (capture: ElementCapture) => void;
  onCancel: () => void;
}

export class ElementPicker {
  #active = false;
  readonly #options: ElementPickerOptions;

  constructor(options: ElementPickerOptions) {
    this.#options = options;
  }

  get active(): boolean {
    return this.#active;
  }

  start(): void {
    if (this.#active) return;
    this.#active = true;
    this.#options.document.addEventListener("mouseover", this.#handleMouseOver, true);
    this.#options.document.addEventListener("click", this.#handleClick, true);
    this.#options.document.addEventListener("keydown", this.#handleKeyDown, true);
  }

  stop(): void {
    if (!this.#active) return;
    this.#active = false;
    this.#options.document.removeEventListener("mouseover", this.#handleMouseOver, true);
    this.#options.document.removeEventListener("click", this.#handleClick, true);
    this.#options.document.removeEventListener("keydown", this.#handleKeyDown, true);
    this.#options.onHover(null);
  }

  cancel(): void {
    if (!this.#active) return;
    this.stop();
    this.#options.onCancel();
  }

  readonly #handleMouseOver = (event: MouseEvent): void => {
    const element = this.#hostElement(event.target);
    if (!element) return;
    this.#options.onHover(toViewportRect(element.getBoundingClientRect()));
  };

  readonly #handleClick = (event: MouseEvent): void => {
    const element = this.#hostElement(event.target);
    if (!element) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const capture: ElementCapture = {
      selector: createUniqueSelector(element, this.#options.document),
      text: (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 8_000),
      outerHTML: element.outerHTML.slice(0, 8_192),
      rect: toViewportRect(element.getBoundingClientRect()),
      element,
    };
    this.stop();
    this.#options.onPick(capture);
  };

  readonly #handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    this.cancel();
  };

  #hostElement(target: EventTarget | null): Element | null {
    if (!(target instanceof Element)) return null;
    if (target === this.#options.rootHost || this.#options.rootHost.contains(target)) return null;
    return target;
  }
}
