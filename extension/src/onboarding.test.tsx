// @vitest-environment jsdom

import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const preferences = vi.hoisted(() => ({
  loadPreferences: vi.fn(),
  savePreferences: vi.fn(),
}));

vi.mock("./preferences", async (importOriginal) => ({
  ...await importOriginal<typeof import("./preferences")>(),
  loadPreferences: preferences.loadPreferences,
  savePreferences: preferences.savePreferences,
}));

describe("Phase 8 onboarding", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    document.body.innerHTML = '<div id="onboarding-root"></div>';
    preferences.loadPreferences.mockResolvedValue({
      buddyStyle: "orb",
      categories: ["safety", "sizing-fit", "language", "everyday-usability"],
      onboardingComplete: false,
    });
    preferences.savePreferences.mockImplementation(async (value) => value);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("saves the chosen companion and audit dimensions with informed privacy copy", async () => {
    await import("./onboarding");
    await vi.waitFor(() => expect(document.body.textContent).toContain("Choose your companion"));

    expect(document.body.textContent).toContain(
      "EquaLens never asks for or stores personal, gender, or medical information.",
    );
    const minimal = document.querySelectorAll<HTMLInputElement>('input[name="buddy-style"]')[1]!;
    await act(async () => minimal.click());
    const continueButton = [...document.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.includes("Continue"))!;
    await act(async () => continueButton.click());

    expect(document.body.textContent).toContain("What should EquaLens watch for?");
    const language = document.querySelector<HTMLInputElement>('input[value="language"]')!;
    await act(async () => language.click());
    const finish = [...document.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.includes("Start browsing"))!;
    await act(async () => finish.click());

    await vi.waitFor(() => expect(preferences.savePreferences).toHaveBeenCalledWith({
      buddyStyle: "minimal",
      categories: ["safety", "sizing-fit", "everyday-usability"],
      onboardingComplete: true,
    }));
    expect(document.body.textContent).toContain("Preferences saved");
  });
});
