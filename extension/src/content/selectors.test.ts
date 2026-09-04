// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createUniqueSelector } from "./selectors";

describe("createUniqueSelector", () => {
  it("prefers a unique id and escapes punctuation", () => {
    document.body.innerHTML = '<button id="trim:chooser">Choose trim</button>';
    const button = document.querySelector("button")!;

    const selector = createUniqueSelector(button);

    expect(document.querySelector(selector)).toBe(button);
    expect(selector).toContain("trim\\:chooser");
  });

  it("uses a unique data attribute before a structural path", () => {
    document.body.innerHTML = `
      <main>
        <button data-testid="seat-control">Seat</button>
        <button>Climate</button>
      </main>
    `;
    const button = document.querySelector<HTMLButtonElement>("[data-testid]")!;

    expect(createUniqueSelector(button)).toBe('[data-testid="seat-control"]');
  });

  it("falls back to an nth-child path that resolves to the same element", () => {
    document.body.innerHTML = `
      <main>
        <section><button>First</button></section>
        <section><button>Second</button><button>Target</button></section>
      </main>
    `;
    const target = [...document.querySelectorAll("button")].at(-1)!;

    const selector = createUniqueSelector(target);

    expect(selector).toContain(":nth-child(");
    expect(document.querySelector(selector)).toBe(target);
  });
});
