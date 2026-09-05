// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  applySanitizedRedesign,
  captureElementSnapshot,
  checkCapabilityPreservation,
  restoreElementSnapshot,
  sanitizeRedesignHtml,
} from "./redesign";

describe("Phase 7 generic redesign safeguards", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("removes executable markup and unsafe inline styles", () => {
    const sanitized = sanitizeRedesignHtml(document, `
      <section class="inclusive" onclick="steal()">
        <script>steal()</script>
        <iframe src="https://evil.example"></iframe>
        <a href="https://example.com" target="_blank">Details</a>
        <p style="color: navy">Safe detail</p>
        <p style="background: url(javascript:steal())">Unsafe detail</p>
      </section>
    `);
    const template = document.createElement("template");
    template.innerHTML = sanitized;

    expect(template.content.querySelector("script, iframe")).toBeNull();
    expect(template.content.querySelector("section")?.hasAttribute("onclick")).toBe(false);
    expect(template.content.querySelector("section")?.className).toBe("inclusive");
    expect(template.content.querySelector('p[style="color: navy"]')).not.toBeNull();
    expect(template.content.querySelectorAll("p")[1]?.hasAttribute("style")).toBe(false);
    expect(template.content.querySelector("a")?.rel).toBe("noopener noreferrer");
  });

  it("rejects rewrites that remove controls, table structure, or substantive text", () => {
    const original = `
      <section><p>This specification preserves a detailed safety baseline for every occupant.</p>
      <select><option>Small</option><option>Large</option></select>
      <table><tbody><tr><th>Metric</th><td>Value</td></tr></tbody></table></section>
    `;
    const result = checkCapabilityPreservation(document, original, "<section><button>Continue</button></section>");

    expect(result.preserved).toBe(false);
    expect(result.violationNote).toContain("interactive elements fell");
    expect(result.violationNote).toContain("table rows fell");
    expect(result.violationNote).toContain("table cells fell");
    expect(result.violationNote).toContain("text length fell below 70%");
  });

  it("accepts additive rewrites and restores live form state on revert", () => {
    document.body.innerHTML = '<label id="target">Name <input value="default"><span>Original guidance</span></label>';
    const target = document.querySelector<HTMLElement>("#target")!;
    const input = target.querySelector("input")!;
    input.value = "Alex";
    const snapshot = captureElementSnapshot(target);
    const rewritten = '<label id="target">Name <input value="default"><span>Original guidance for everyone</span></label>';

    expect(checkCapabilityPreservation(document, target.outerHTML, rewritten).preserved).toBe(true);
    applySanitizedRedesign(snapshot, sanitizeRedesignHtml(document, rewritten));
    expect(target.textContent).toContain("for everyone");

    restoreElementSnapshot(snapshot);
    expect(target.textContent).toContain("Original guidance");
    expect(target.querySelector<HTMLInputElement>("input")?.value).toBe("Alex");
  });

  it("preserves named field values across reordered controls and expanded options", () => {
    document.body.innerHTML = '<section><input name="name"><select name="title"><option>Mr.</option><option>Mrs.</option></select></section>';
    const target = document.querySelector("section")!;
    const input = target.querySelector("input")!;
    input.value = "Alex";
    target.querySelector("select")!.value = "Mrs.";
    let clicks = 0;
    input.addEventListener("click", () => { clicks += 1; });
    const snapshot = captureElementSnapshot(target);
    applySanitizedRedesign(snapshot, '<section><select name="title"><option>No title</option><option>Mx.</option><option>Mr.</option><option>Mrs.</option></select><input name="new"><input name="name"></section>');
    expect(target.querySelector<HTMLInputElement>('[name="name"]')!.value).toBe("Alex");
    expect(target.querySelector("select")!.value).toBe("Mrs.");
    expect(target.querySelector<HTMLInputElement>('[name="new"]')!.value).toBe("");
    restoreElementSnapshot(snapshot);
    expect(target.querySelector("input")).toBe(input);
    input.click();
    expect(clicks).toBe(1);
  });

  it("applies root accessibility and styling attributes and restores them on undo", () => {
    document.body.innerHTML = '<button id="target" class="old" style="width: 12px"></button>';
    const target = document.querySelector<HTMLElement>("#target")!;
    const snapshot = captureElementSnapshot(target);
    applySanitizedRedesign(snapshot, sanitizeRedesignHtml(document, '<button id="target" class="accessible" aria-label="Open settings" style="min-width: 44px; min-height: 44px"></button>'));
    expect(target.getAttribute("aria-label")).toBe("Open settings");
    expect(target.style.minWidth).toBe("44px");
    expect(target.className).toBe("accessible");
    restoreElementSnapshot(snapshot);
    expect(target.outerHTML).toBe('<button id="target" class="old" style="width: 12px"></button>');
  });

  it("preserves multiple selections and distinct checked states in a named group", () => {
    document.body.innerHTML = '<section><select name="sizes" multiple><option selected>S</option><option selected>M</option><option>L</option></select><input type="checkbox" name="choice" value="a" checked><input type="checkbox" name="choice" value="b"></section>';
    const target = document.querySelector("section")!;
    const snapshot = captureElementSnapshot(target);
    applySanitizedRedesign(snapshot, '<section><select name="sizes" multiple><option>XS</option><option>S</option><option>M</option><option>L</option></select><input type="checkbox" name="choice" value="b"><input type="checkbox" name="choice" value="a"><p>More sizes available</p></section>');
    expect([...target.querySelector("select")!.selectedOptions].map((option) => option.value)).toEqual(["S", "M"]);
    expect(target.querySelector<HTMLInputElement>('[value="b"]')!.checked).toBe(false);
    expect(target.querySelector<HTMLInputElement>('[value="a"]')!.checked).toBe(true);
    restoreElementSnapshot(snapshot);
    expect([...target.querySelector("select")!.selectedOptions].map((option) => option.value)).toEqual(["S", "M"]);
    expect(target.querySelector<HTMLInputElement>('[value="b"]')!.checked).toBe(false);
    expect(target.querySelector<HTMLInputElement>('[value="a"]')!.checked).toBe(true);
  });

  it("retains page-owned control listeners after keeping a rewrite", () => {
    document.body.innerHTML = '<section><button id="action">Continue</button></section>';
    const target = document.querySelector("section")!;
    const button = target.querySelector("button")!;
    let clicks = 0;
    button.addEventListener("click", () => { clicks += 1; });
    const snapshot = captureElementSnapshot(target);
    applySanitizedRedesign(snapshot, '<section><button id="action" aria-label="Continue to all options">Continue</button><p>All options remain available</p></section>');
    target.querySelector("button")!.click();
    expect(clicks).toBe(1);
    restoreElementSnapshot(snapshot);
    expect(target.querySelector("button")).toBe(button);
    expect(button.hasAttribute("aria-label")).toBe(false);
  });
});
