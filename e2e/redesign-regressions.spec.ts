import { resolve } from "node:path";
import type { Finding } from "@equalens/shared/types";
import { test, expect, API_ORIGIN, DEMO_ORIGIN, dismissOnboarding, scanPage, selectRestraint } from "./fixtures";

const baseFinding: Finding = {
  id: "demo", selector: "#seat-system .spec-list", title: "Single-body safety baseline",
  assumption: "One body represents every occupant.", impact: "Other occupants may be excluded.",
  affected: ["people outside the reference range"], category: "safety", severity: "safety-high", confidence: "high",
  evidenceTags: [], source: "ai", redesignable: true, fixed: false,
};

const demoFindings: Finding[] = [
  baseFinding,
  { ...baseFinding, id: "reach", selector: "#controls .reach-claim", title: "Single reach baseline", category: "usability", severity: "usability-high" },
  { ...baseFinding, id: "seat-fit", selector: "#interior .feature-card:nth-child(2) h3", title: "One-size design assumption", category: "usability", severity: "usability-high" },
  { ...baseFinding, id: "title", selector: "#configure select", title: "Restricted title options", category: "language", severity: "language" },
];

test.beforeEach(async ({ context, worker }) => {
  await dismissOnboarding(context, worker);
  await context.route(`${DEMO_ORIGIN}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    await route.fulfill({ path: resolve("mock-site/dist", pathname === "/" ? "index.html" : pathname.slice(1)) });
  });
  await context.route(`${API_ORIGIN}/scan`, (route) => route.fulfill({ json: { findings: [], summary: "Done" } }));
});

for (const buddyStyle of ["orb", "minimal"] as const) {
  test(`${buddyStyle} selection actions and menu fit narrow viewports`, async ({ page, worker, context }, testInfo) => {
    await worker.evaluate(async (style) => chrome.storage.sync.set({ equalensPreferences: {
      buddyStyle: style, categories: ["safety"], onboardingComplete: true,
    } }), buddyStyle);
    await context.route(`${API_ORIGIN}/analyze`, (route) => route.fulfill({ json: { findings: [], summary: "No significant assumption found." } }));
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(DEMO_ORIGIN);
    await page.getByTestId("buddy-orb").click();
    const menu = await page.getByRole("menu", { name: "EquaLens actions" }).boundingBox();
    expect.soft(menu!.x).toBeGreaterThanOrEqual(0);
    expect.soft(menu!.x + menu!.width).toBeLessThanOrEqual(320);
    await page.keyboard.press("Escape");
    await selectRestraint(page);
    await page.getByRole("button", { name: "Explain", exact: true }).click();
    await expect(page.locator(".eqx-neutral-result")).toBeVisible();
    const card = await page.locator(".eqx-analysis-card").boundingBox();
    expect.soft(card!.x).toBeGreaterThanOrEqual(0);
    expect.soft(card!.x + card!.width).toBeLessThanOrEqual(320);
    await page.screenshot({ path: testInfo.outputPath(`${buddyStyle}-selection-mobile.png`), animations: "disabled" });
  });
}

test("redesign-all waits for the complete scan instead of dropping pending findings", async ({ context, page }) => {
  let held: import("@playwright/test").Route | undefined;
  await context.route(`${API_ORIGIN}/scan`, (route) => { held = route; });
  await page.goto(DEMO_ORIGIN);
  await scanPage(page);
  await expect.poll(() => Boolean(held)).toBe(true);
  await expect(page.getByRole("button", { name: "Redesign all", exact: true })).toBeDisabled();
  await held!.fulfill({ json: { findings: [baseFinding], summary: "Done" } });
  await expect(page.getByRole("button", { name: "Redesign all", exact: true })).toBeEnabled();
});

test("redesign-all changes every flagged area and compares every changed section", async ({ context, page }, testInfo) => {
  await context.route(`${API_ORIGIN}/scan`, (route) => route.fulfill({ json: { findings: demoFindings, summary: "Done" } }));
  await context.route(`${API_ORIGIN}/redesign`, (route) => route.fulfill({ json: {
    rewritten_html: route.request().postDataJSON().outerHTML.replace("One-size-fits-all sport seats", "Adjustable sport seats for a broad range of body dimensions"),
    rationale: "Expand fit while preserving the original specifications.", changes: ["Expanded fit"],
  } }));
  await page.goto(DEMO_ORIGIN);
  await scanPage(page);
  await expect(page.locator(".eqx-panel-status")).toHaveText("Scan complete");
  await page.screenshot({ path: testInfo.outputPath("scan-desktop.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Redesign all", exact: true }).click();
  await expect(page.getByRole("button", { name: "Keep change", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("preview-desktop.png"), animations: "disabled" });
  await expect.soft(page.locator(".eqx-redesign-original-snapshot")).toHaveCount(4);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator("#configure").scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`preview-form-${width}.png`), animations: "disabled" });
    await expect.soft(page.getByRole("button", { name: "Keep change", exact: true })).toBeInViewport();
    expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole("button", { name: "Keep change", exact: true }).click();
  await page.getByRole("button", { name: "Close findings panel" }).click();
  const brokenLabels = await page.locator("main [aria-labelledby]").evaluateAll((elements) => elements
    .filter((element) => element.getAttribute("aria-labelledby")!.split(/\s+/).some((id) => !document.getElementById(id)))
    .map((element) => element.id));
  expect.soft(brokenLabels).toEqual([]);
  await expect(page.locator("#interior")).not.toContainText("One-size-fits-all sport seats");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator("#configure").scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`kept-form-${width}.png`), animations: "disabled" });
  }
});

test("a button redesign applies accessibility attributes while retaining its click handler", async ({ context, page }) => {
  const finding: Finding = {
    id: "action-label", selector: "#test-action", title: "Action needs a label", assumption: "Users recognize an unlabeled control.",
    impact: "The action is not accessible by name.", affected: ["screen reader users"], category: "usability", severity: "usability-high",
    confidence: "high", evidenceTags: [], source: "ai", redesignable: true, fixed: false,
  };
  await context.route(`${API_ORIGIN}/scan`, (route) => route.fulfill({ json: { findings: [finding], summary: "Done" } }));
  await context.route(`${API_ORIGIN}/redesign`, (route) => route.fulfill({ json: {
    rewritten_html: '<button id="test-action" aria-label="Open vehicle details" style="min-width: 44px; min-height: 44px"></button>',
    rationale: "Give the control an accessible name and a larger target.", changes: ["Accessible name", "Larger target"],
  } }));
  await page.goto(DEMO_ORIGIN);
  await page.locator("main").evaluate((main: HTMLElement) => {
    const button = document.createElement("button");
    button.id = "test-action";
    button.style.cssText = "width: 12px; height: 12px";
    button.addEventListener("click", () => { button.dataset.clicked = "true"; });
    main.insertBefore(button, main.firstChild);
  });
  await scanPage(page);
  const row = page.locator(".eqx-finding-row").filter({ hasText: finding.title });
  await row.locator(".eqx-finding-summary").click();
  await row.getByRole("button", { name: "Redesign this", exact: true }).click();
  await page.getByRole("button", { name: "Keep change", exact: true }).click();
  await page.getByRole("button", { name: "Close findings panel" }).click();
  const button = page.getByRole("button", { name: "Open vehicle details", exact: true });
  // The injected target sits under the site's fixed header; keyboard activation
  // tests its original handler independently of the demo header's placement.
  await button.focus();
  await button.press("Enter");
  await expect(button).toHaveAttribute("data-clicked", "true");
  expect((await button.boundingBox())!.width).toBeGreaterThanOrEqual(44);
});

test("an unchanged AI response cannot be kept as a successful fix", async ({ context, page }) => {
  await context.route(`${API_ORIGIN}/scan`, (route) => route.fulfill({ json: { findings: [demoFindings[2]], summary: "Done" } }));
  await context.route(`${API_ORIGIN}/redesign`, (route) => route.fulfill({ json: {
    rewritten_html: route.request().postDataJSON().outerHTML,
    rationale: "Expanded fit.", changes: ["Expanded fit"],
  } }));
  await page.goto(DEMO_ORIGIN);
  await scanPage(page);
  await expect(page.locator(".eqx-panel-status")).toHaveText("Scan complete");
  const row = page.locator(".eqx-finding-row").filter({ hasText: "One-size design assumption" }).last();
  await row.locator(".eqx-finding-summary").click();
  await row.getByRole("button", { name: "Redesign this", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("did not change");
  await expect(page.locator(".eqx-finding-row[data-fixed=true]")).toHaveCount(0);
});
