import { chromium, test as base, expect, type BrowserContext, type Page, type Worker } from "@playwright/test";
import { resolve } from "node:path";

export { expect };
export const API_ORIGIN = "https://equalens-api.ragsetu-goa-2026.workers.dev";
export const DEMO_ORIGIN = "https://meridian-motors.ragsetu-goa-2026.workers.dev";

export const test = base.extend<{ extensionId: string; worker: Worker }>({
  page: async ({ context }, use) => {
    const page = await context.newPage();
    await use(page);
  },
  context: async ({}, use, testInfo) => {
    const extensionPath = resolve("extension/dist");
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      ...(process.env.EQUALENS_CHROMIUM_EXECUTABLE ? { executablePath: process.env.EQUALENS_CHROMIUM_EXECUTABLE } : {}),
      headless: true,
      viewport: { width: 1440, height: 1000 },
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    const errors: string[] = [];
    const uncaught: string[] = [];
    context.on("weberror", (error) => {
      const message = error.error().stack ?? error.error().message;
      errors.push(message);
      if (!process.env.EQUALENS_LIVE || message.includes("chrome-extension://")) uncaught.push(message);
    });
    context.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    await context.tracing.start({ screenshots: true, snapshots: true });
    try {
      // Chrome may reuse a blank tab for openOptionsPage during onInstalled.
      // Let installation finish before allocating the page under test.
      await expect.poll(() => context.pages().some((page) => page.url().endsWith("/onboarding.html"))).toBe(true);
      await use(context);
      expect(uncaught, "Uncaught application errors").toEqual([]);
    } finally {
      await testInfo.attach("browser-errors", { body: errors.join("\n"), contentType: "text/plain" });
      if (testInfo.status !== testInfo.expectedStatus) {
        for (const [index, page] of context.pages().entries()) {
          await page.screenshot({ path: testInfo.outputPath(`failure-${index}.png`), fullPage: true }).catch(() => undefined);
        }
      }
      await context.tracing.stop({ path: testInfo.outputPath("trace.zip") });
      await context.close();
    }
  },
  worker: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await use(worker);
  },
  extensionId: async ({ worker }, use) => {
    await use(new URL(worker.url()).host);
  },
});

export async function dismissOnboarding(_context: BrowserContext, worker: Worker): Promise<void> {
  await worker.evaluate(async () => {
    await chrome.storage.sync.set({ equalensPreferences: {
      buddyStyle: "orb", categories: ["safety", "sizing-fit", "language", "everyday-usability"], onboardingComplete: true,
    } });
  });
}

export async function scanPage(page: Page): Promise<void> {
  await page.getByTestId("buddy-orb").click();
  await page.getByRole("menuitem", { name: "Scan page", exact: true }).click();
  await expect(page.getByTestId("inclusion-score")).toBeVisible();
}

export async function selectRestraint(page: Page): Promise<void> {
  const target = page.getByText("Certified against the 50th-percentile adult male crash test dummy (175 cm / 78 kg)", { exact: true });
  await target.scrollIntoViewIfNeeded();
  await target.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await expect(page.getByRole("button", { name: "Explain", exact: true })).toBeVisible();
}
