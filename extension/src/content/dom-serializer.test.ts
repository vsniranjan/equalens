// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { MAX_SERIALIZED_DOM_BYTES, serializeVisibleDom } from "./dom-serializer";

function position(element: Element, top: number, width = 240, height = 32): void {
  element.getBoundingClientRect = () => DOMRect.fromRect({ x: 24, y: top, width, height });
}

describe("Phase 6 DOM serializer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1_024 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
  });

  it("prioritizes viewport-near content and emits roles and key attributes", () => {
    document.body.innerHTML = `
      <p id="below">Below viewport</p>
      <button id="visible" class="primary" aria-label="Launch scan">Scan now</button>
      <p id="above">Above viewport</p>
      <p id="hidden" style="display: none">Hidden content</p>
      <div id="equalens-root"><p id="overlay-copy">Overlay content</p></div>
    `;
    position(document.querySelector("#below")!, 1_100);
    position(document.querySelector("#visible")!, 120);
    position(document.querySelector("#above")!, -100);
    position(document.querySelector("#hidden")!, 160);
    position(document.querySelector("#overlay-copy")!, 180);

    const result = serializeVisibleDom(document);

    expect(result.map(({ selector }) => selector)).toEqual(["#visible", "#above", "#below"]);
    expect(result[0]).toMatchObject({
      selector: "#visible",
      tagName: "button",
      role: "button",
      text: "Scan now",
    });
    expect(result[0]?.html).toContain('aria-label="Launch scan"');
    expect(result[0]?.html).toContain('class="primary"');
  });

  it("keeps the serialized DOM JSON within the 15 KB byte budget", () => {
    document.body.innerHTML = Array.from({ length: 100 }, (_, index) => (
      `<p id="item-${index}">${"Inclusive product detail ".repeat(30)}</p>`
    )).join("");
    [...document.querySelectorAll("p")].forEach((element, index) => position(element, index * 36));

    const result = serializeVisibleDom(document);
    const byteLength = new TextEncoder().encode(JSON.stringify(result)).byteLength;

    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(100);
    expect(byteLength).toBeLessThanOrEqual(MAX_SERIALIZED_DOM_BYTES);
  });

  it("does not let repeated navigation exhaust the budget before product content", () => {
    document.body.innerHTML = `<nav>${Array.from({ length: 50 }, (_, i) => `<a id="nav-${i}" href="/cars">${"Menu link ".repeat(30)}</a>`).join("")}</nav><main><h1 id="product">Adjustable seat and restraint geometry</h1><p id="detail">Choose a comfortable reach range.</p></main>`;
    for (const element of document.querySelectorAll("a")) position(element, 10);
    position(document.querySelector("#product")!, 700);
    position(document.querySelector("#detail")!, 760);
    const result = serializeVisibleDom(document, 1_024);
    expect(result.map(({ selector }) => selector)).toContain("#product");
    expect(result.map(({ selector }) => selector)).toContain("#detail");
  });
});
