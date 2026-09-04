// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { captureTextSelection } from "./selection";

function selectedParagraph(text: string): Selection {
  document.body.innerHTML = `<main><p id="seat-copy">${text}</p></main>`;
  document.title = "Meridian S4";
  const paragraph = document.querySelector("p")!;
  const range = document.createRange();
  range.selectNodeContents(paragraph);
  Object.defineProperty(range, "getBoundingClientRect", {
    value: () => ({ top: 40, right: 360, bottom: 64, left: 120, width: 240, height: 24, x: 120, y: 40 }),
  });
  return {
    rangeCount: 1,
    isCollapsed: false,
    anchorNode: paragraph.firstChild,
    focusNode: paragraph.firstChild,
    toString: () => text,
    getRangeAt: () => range,
  } as unknown as Selection;
}

describe("captureTextSelection", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("builds an analyze payload with a resolvable selector and viewport rect", () => {
    const selection = selectedParagraph("Certified against the 50th-percentile adult male crash test dummy");

    const capture = captureTextSelection(selection, document);

    expect(capture?.request).toMatchObject({
      text: "Certified against the 50th-percentile adult male crash test dummy",
      selector: "#seat-copy",
      pageTitle: "Meridian S4",
      categories: ["safety", "sizing-fit", "language", "everyday-usability"],
    });
    expect(document.querySelector(capture!.request.selector)).toBe(capture?.element);
    expect(capture?.rect).toEqual({ top: 40, right: 360, bottom: 64, left: 120, width: 240, height: 24 });
  });

  it("caps HTML at 8 KB and surrounding context at 1500 characters", () => {
    const text = `Selected phrase ${"context ".repeat(1_200)}`;
    const capture = captureTextSelection(selectedParagraph(text), document);

    expect(capture?.request.outerHTML.length).toBeLessThanOrEqual(8_192);
    expect(capture?.request.context.length).toBeLessThanOrEqual(1_500);
  });

  it("ignores empty or collapsed selections", () => {
    const selection = selectedParagraph("Nothing");
    Object.defineProperty(selection, "isCollapsed", { value: true });

    expect(captureTextSelection(selection, document)).toBeNull();
  });
});
