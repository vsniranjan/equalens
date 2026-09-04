// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { ElementPicker } from "./element-picker";

describe("ElementPicker", () => {
  it("outlines without mutating host styles and captures a clicked element", () => {
    document.body.innerHTML = '<article><button data-testid="target">Choose trim</button></article>';
    const target = document.querySelector<HTMLButtonElement>("button")!;
    target.getBoundingClientRect = () => ({
      top: 20,
      right: 180,
      bottom: 60,
      left: 80,
      width: 100,
      height: 40,
      x: 80,
      y: 20,
      toJSON: () => ({}),
    });
    const rootHost = document.createElement("div");
    rootHost.id = "equalens-root";
    document.body.append(rootHost);
    const onHover = vi.fn();
    const onPick = vi.fn();
    const picker = new ElementPicker({ document, rootHost, onHover, onPick, onCancel: vi.fn() });

    picker.start();
    target.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    target.dispatchEvent(click);

    expect(onHover).toHaveBeenCalledWith({ top: 20, right: 180, bottom: 60, left: 80, width: 100, height: 40 });
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({
      selector: '[data-testid="target"]',
      outerHTML: expect.stringContaining("Choose trim"),
    }));
    expect(target.getAttribute("style")).toBeNull();
    expect(click.defaultPrevented).toBe(true);
    expect(picker.active).toBe(false);
  });

  it("cancels on Escape", () => {
    const onCancel = vi.fn();
    const picker = new ElementPicker({
      document,
      rootHost: document.createElement("div"),
      onHover: vi.fn(),
      onPick: vi.fn(),
      onCancel,
    });

    picker.start();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(picker.active).toBe(false);
  });
});
