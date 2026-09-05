import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PREFERENCES,
  INTEREST_CATEGORIES,
  loadPreferences,
  savePreferences,
  watchPreferences,
} from "./preferences";

describe("Phase 8 preferences", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses independent defaults when sync storage is unavailable", async () => {
    vi.stubGlobal("chrome", undefined);

    const first = await loadPreferences();
    first.categories.pop();

    await expect(loadPreferences()).resolves.toEqual(DEFAULT_PREFERENCES);
  });

  it("normalizes saved values and persists only canonical preferences", async () => {
    const set = vi.fn().mockResolvedValue(undefined);
    stubChromeStorage({
      buddyStyle: "minimal",
      categories: ["language", "invalid", "language", "safety"],
      onboardingComplete: true,
    }, set);

    await expect(loadPreferences()).resolves.toEqual({
      buddyStyle: "minimal",
      categories: ["safety", "language"],
      onboardingComplete: true,
    });
    await expect(savePreferences({ buddyStyle: "minimal", categories: [], onboardingComplete: true }))
      .resolves.toEqual({
        buddyStyle: "minimal",
        categories: [...INTEREST_CATEGORIES],
        onboardingComplete: true,
      });
    expect(set).toHaveBeenCalledWith({
      equalensPreferences: {
        buddyStyle: "minimal",
        categories: [...INTEREST_CATEGORIES],
        onboardingComplete: true,
      },
    });
  });

  it("watches sync changes and unsubscribes", () => {
    let changeListener: ((changes: Record<string, chrome.storage.StorageChange>, area: string) => void) | undefined;
    const addListener = vi.fn((listener) => { changeListener = listener; });
    const removeListener = vi.fn();
    vi.stubGlobal("chrome", {
      storage: {
        sync: { get: vi.fn(), set: vi.fn() },
        onChanged: { addListener, removeListener },
      },
    });
    const listener = vi.fn();

    const stop = watchPreferences(listener);
    changeListener?.({ equalensPreferences: { newValue: { buddyStyle: "minimal", categories: ["language"] } } }, "local");
    expect(listener).not.toHaveBeenCalled();
    changeListener?.({ equalensPreferences: { newValue: { buddyStyle: "minimal", categories: ["language"] } } }, "sync");

    expect(listener).toHaveBeenCalledWith({
      buddyStyle: "minimal",
      categories: ["language"],
      onboardingComplete: false,
    });
    stop();
    expect(removeListener).toHaveBeenCalledWith(changeListener);
  });
});

function stubChromeStorage(value: unknown, set: ReturnType<typeof vi.fn>): void {
  vi.stubGlobal("chrome", {
    storage: {
      sync: {
        get: vi.fn().mockResolvedValue({ equalensPreferences: value }),
        set,
      },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  });
}
