import { resolve } from "node:path";
import { test, expect, API_ORIGIN, DEMO_ORIGIN, scanPage } from "./fixtures";

test("fresh install opens onboarding, validates choices, and syncs them to an open tab", async ({ context, worker }) => {
  await expect.poll(() => context.pages().some((page) => page.url().endsWith("/onboarding.html"))).toBe(true);
  const options = context.pages().find((page) => page.url().endsWith("/onboarding.html"))!;
  await expect(options.getByRole("heading", { name: "Choose your companion" })).toBeVisible();
  await expect(options.getByText("EquaLens never asks for or stores personal, gender, or medical information.")).toBeVisible();
  await context.route(`${DEMO_ORIGIN}/**`, (route) => {
    const pathname = new URL(route.request().url()).pathname;
    return route.fulfill({ path: resolve("mock-site/dist", pathname === "/" ? "index.html" : pathname.slice(1)) });
  });
  let categories: unknown;
  await context.route(`${API_ORIGIN}/scan`, (route) => {
    categories = route.request().postDataJSON().categories;
    return route.fulfill({ json: { findings: [], summary: "Done" } });
  });
  const page = await context.newPage();
  await page.goto(DEMO_ORIGIN);
  await expect(page.getByTestId("buddy-orb")).toHaveAttribute("data-style", "orb");

  await options.setViewportSize({ width: 390, height: 844 });
  await options.locator(".buddy-option").filter({ hasText: "Minimal badge" }).click();
  await expect(options.getByRole("radio", { name: /Minimal badge/ })).toBeChecked();
  await options.getByRole("button", { name: /Continue/ }).click();
  await options.getByText("Scan everything", { exact: true }).click();
  await options.getByRole("button", { name: /Start browsing/ }).click();
  await expect(options.getByRole("alert")).toHaveText("Choose at least one area for EquaLens to watch.");
  await options.getByText("Accessibility", { exact: true }).click();
  expect(await options.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await options.getByRole("button", { name: /Start browsing/ }).click();
  await expect(page.getByTestId("buddy-orb")).toHaveAttribute("data-style", "minimal");
  await scanPage(page);
  await expect.poll(() => categories).toEqual(["everyday-usability"]);
  expect(await worker.evaluate(async () => (await chrome.storage.sync.get("equalensPreferences")).equalensPreferences)).toEqual({
    buddyStyle: "minimal", categories: ["everyday-usability"], onboardingComplete: true,
  });
  await page.getByRole("button", { name: "Close findings panel" }).click();
  await page.getByTestId("buddy-orb").click();
  await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
  await expect.poll(() => context.pages().some((candidate) => candidate.url().endsWith("/onboarding.html"))).toBe(true);
  const reopened = context.pages().find((candidate) => candidate.url().endsWith("/onboarding.html"))!;
  await expect(reopened.getByRole("radio", { name: /Minimal badge/ })).toBeChecked();
});
