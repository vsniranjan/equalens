import { resolve } from "node:path";
import { calculateInclusionScore } from "@equalens/shared/tokens";
import type { Finding } from "@equalens/shared/types";
import { renderReport } from "../api/src/report";
import { test, expect, API_ORIGIN, DEMO_ORIGIN, dismissOnboarding, selectRestraint, scanPage } from "./fixtures";

const finding: Finding = {
  id: "test-reach", selector: "#controls .feature-card:first-child h3", title: "Fixed grip assumes one hand size",
  assumption: "One grip fits every driver.", impact: "Smaller hands may have less secure control.",
  affected: ["drivers with smaller hands"], category: "usability", severity: "usability-high", confidence: "high",
  evidenceTags: [], source: "ai", redesignable: true, fixed: false,
};

const demoFindings: Finding[] = [
  { ...finding, id: "seat", selector: "#seat-system .spec-list", title: "Single-body safety baseline", category: "safety", severity: "safety-high" },
  { ...finding, id: "reach", selector: "#controls .reach-claim", title: "Single reach baseline" },
  { ...finding, id: "seat-fit", selector: "#interior .feature-card:nth-child(2) h3", title: "One-size design assumption" },
  { ...finding, id: "title", selector: "#configure select", title: "Restricted title options", category: "language", severity: "language" },
];

test("redesign changes can be approved or rejected independently without losing form values", async ({ context, page }) => {
  await context.route(`${API_ORIGIN}/scan`, (route) => route.fulfill({ json: { findings: demoFindings, summary: "Done" } }));
  await context.route(`${API_ORIGIN}/redesign`, (route) => route.fulfill({ json: {
    rewritten_html: route.request().postDataJSON().outerHTML.replace("One-size-fits-all sport seats", "Adjustable sport seats for a broad range of body dimensions"), rationale: "Preserve all existing capabilities and expand fit.", changes: ["Expanded fit"],
  } }));
  await page.goto(DEMO_ORIGIN);
  await page.locator('[name="firstName"]').fill("Alex");
  await page.locator('[name="lastName"]').fill("Example");
  await page.locator('[name="email"]').fill("alex@example.com");
  const original = await page.locator("[data-equalens-variant]").evaluateAll((elements) => elements.map((element) => element.innerHTML.replaceAll("reveal is-visible", "reveal")));
  await scanPage(page);
  await expect(page.locator(".eqx-panel-status")).toHaveText("Scan complete");
  const score = String(calculateInclusionScore(demoFindings.map(({ severity }) => severity)));
  await expect(page.getByTestId("inclusion-score")).toHaveText(score);
  await page.getByRole("button", { name: "Redesign all", exact: true }).click();
  await expect(page.getByRole("button", { name: "Approve change", exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Before", exact: true }).first().click();
  await expect(page.getByRole("slider").first()).toHaveValue("100");
  await page.getByRole("button", { name: "After", exact: true }).first().click();
  await expect(page.getByRole("slider").first()).toHaveValue("0");
  await page.getByRole("button", { name: "Reject change", exact: true }).first().click();
  await page.getByRole("button", { name: "Approve change", exact: true }).first().click();
  await page.getByRole("button", { name: "Reject change", exact: true }).first().click();
  await page.getByRole("button", { name: "Approve change", exact: true }).first().click();
  const partiallyReviewed = await page.locator("[data-equalens-variant]").evaluateAll((elements) => elements.map((element) => element.innerHTML.replaceAll("reveal is-visible", "reveal")));
  expect(partiallyReviewed[0]).toBe(original[0]);
  expect(partiallyReviewed[1]).not.toBe(original[1]);
  expect(partiallyReviewed[2]).toBe(original[2]);
  await expect(page.locator('[name="firstName"]')).toHaveValue("Alex");
  await expect(page.getByTestId("inclusion-score")).not.toHaveText(score);
  await expect(page.getByTestId("inclusion-score")).not.toHaveText("100");
  await page.locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page.locator("[data-confirmation]")).toBeVisible();
  await page.getByRole("button", { name: "Redesign all", exact: true }).click();
  await page.getByRole("button", { name: "Approve change", exact: true }).first().click();
  await page.getByRole("button", { name: "Approve change", exact: true }).first().click();
  await expect(page.getByTestId("inclusion-score")).toHaveText("100");
  await page.getByRole("button", { name: "Close findings panel" }).click();
  await expect(page.locator('[name="firstName"]')).toHaveValue("Alex");
  await expect(page.locator('[name="lastName"]')).toHaveValue("Example");
  await expect(page.locator('[name="email"]')).toHaveValue("alex@example.com");
  await page.getByRole("button", { name: "Reserve now" }).click();
  await expect(page.locator("[data-confirmation]")).toBeVisible();
});

test("a failure halfway through redesign-all rolls back every earlier DOM change", async ({ context, page }) => {
  await context.route(`${API_ORIGIN}/scan`, (route) => route.fulfill({ json: { findings: demoFindings, summary: "Done" } }));
  let requests = 0;
  await context.route(`${API_ORIGIN}/redesign`, (route) => {
    requests += 1;
    return route.fulfill(requests === 2 ? { status: 502, json: { error: "Injected second redesign failure" } } : { json: {
      rewritten_html: route.request().postDataJSON().outerHTML, rationale: "Expanded fit.", changes: ["Expanded fit"],
    } });
  });
  await page.goto(DEMO_ORIGIN);
  const original = (await page.locator("main").innerHTML()).replaceAll("reveal is-visible", "reveal");
  await scanPage(page);
  await expect(page.locator(".eqx-panel-status")).toHaveText("Scan complete");
  await page.getByRole("button", { name: "Redesign all", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Injected second redesign failure");
  expect((await page.locator("main").innerHTML()).replaceAll("reveal is-visible", "reveal")).toBe(original);
  await expect(page.locator(".eqx-finding-row[data-fixed=true]")).toHaveCount(0);
  await expect(page.getByRole("alert").getByRole("button", { name: "Try again" })).toBeEnabled();
});

test("the current report renders on mobile and prints a real PDF under its CSP", async ({ context, page }, testInfo) => {
  const nonce = "test-report-nonce";
  await context.route("https://report.example/**", (route) => route.fulfill({
    contentType: "text/html", headers: { "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'` },
    body: renderReport({ pageTitle: "Test report", pageUrl: DEMO_ORIGIN, scoreBefore: 29, scoreAfter: 100,
      findings: [{ ...finding, fixed: true, evidenceTags: ["crash-dummy-body-range"] }], generatedAt: new Date().toISOString() }, nonce),
  }));
  await page.goto("https://report.example/");
  await expect(page.getByRole("heading", { name: "EquaLens Inclusion Report" })).toBeVisible();
  await expect(page.locator(".finding-status")).toHaveText("Fixed");
  await expect(page.locator(".evidence-list a")).not.toHaveCount(0);
  await page.evaluate(() => { window.print = () => { document.body.dataset.printCalled = "true"; }; });
  await page.getByRole("button", { name: "Print / Save as PDF" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-print-called", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("report-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".report-toolbar")).not.toBeVisible();
  const pdf = await page.pdf({ path: testInfo.outputPath("report.pdf"), format: "A4", printBackground: true });
  expect(pdf.byteLength).toBeGreaterThan(10_000);
});

test("reduced motion disables the minimal buddy's pending-analysis animation", async ({ context, page, worker }) => {
  await worker.evaluate(async () => chrome.storage.sync.set({ equalensPreferences: {
    buddyStyle: "minimal", categories: ["safety"], onboardingComplete: true,
  } }));
  await context.route(`${API_ORIGIN}/analyze`, () => new Promise(() => undefined));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(DEMO_ORIGIN);
  await selectRestraint(page);
  await page.getByRole("button", { name: "Explain", exact: true }).click();
  await expect(page.getByTestId("buddy-orb")).toHaveAttribute("data-mode", "thinking");
  expect(await page.locator(".eqx-minimal-dot").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
});

test.beforeEach(async ({ context, worker }) => {
  await dismissOnboarding(context, worker);
  await context.route(`${DEMO_ORIGIN}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const path = resolve("mock-site/dist", pathname === "/" ? "index.html" : pathname.slice(1));
    if (!path.startsWith(resolve("mock-site/dist") + "/")) return route.abort();
    await route.fulfill({ path });
  });
});

for (const status of [401, 429, 502, 504]) {
  test(`scan reports HTTP ${status} and recovers on retry`, async ({ context, page }) => {
    let fail = true;
    await context.route(`${API_ORIGIN}/scan`, (route) => route.fulfill({
      status: fail ? status : 200,
      contentType: "application/json",
      body: JSON.stringify(fail ? { error: `Test failure ${status}` } : { findings: [], summary: "Done" }),
    }));
    await page.goto(DEMO_ORIGIN);
    await scanPage(page);
    await expect(page.getByText("Deep scan paused", { exact: true })).toBeVisible();
    await expect(page.locator(".eqx-finding-row")).toHaveCount(0);
    await expect(page.getByTestId("inclusion-score")).toHaveText("—");
    await expect(page.locator(".eqx-score-summary")).toContainText("Score unavailable");
    fail = false;
    await page.getByRole("button", { name: "Retry AI scan" }).click();
    await expect(page.locator(".eqx-panel-status")).toHaveText("Scan complete");
    await expect(page.getByText("No AI findings", { exact: true })).toBeVisible();
  });
}

test("offline selection and scan both show retry states", async ({ context, page }) => {
  await context.route(`${API_ORIGIN}/**`, (route) => route.abort("internetdisconnected"));
  await page.goto(DEMO_ORIGIN);
  await selectRestraint(page);
  await page.getByRole("button", { name: "Explain", exact: true }).click();
  await expect(page.getByText("Analysis paused", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeEnabled();
  await scanPage(page);
  await expect(page.getByText("Deep scan paused", { exact: true })).toBeVisible();
  await expect(page.locator(".eqx-finding-row")).toHaveCount(0);
});

test("a missing selector explains why redesign is unavailable before the user acts", async ({ context, page }, testInfo) => {
  let redesignRequests = 0;
  await context.route(`${API_ORIGIN}/scan`, (route) => route.fulfill({
    json: { findings: [{ ...finding, selector: "#removed-target" }], summary: "One approximate finding" },
  }));
  await context.route(`${API_ORIGIN}/redesign`, (route) => {
    redesignRequests += 1;
    return route.abort();
  });
  await page.goto(DEMO_ORIGIN);
  await scanPage(page);
  const row = page.locator(".eqx-finding-row").filter({ hasText: finding.title });
  await expect(row).toContainText("Location approximate");
  await expect(row).toContainText("No auto-redesign");
  await row.locator(".eqx-finding-summary").click();
  await expect(row.getByRole("note")).toContainText("Automatic redesign unavailable");
  await expect(row.getByRole("note")).toContainText("matched page element is missing");
  await expect(row.getByRole("button", { name: "Location unavailable" })).toBeDisabled();
  await expect(page.getByText("0 of 1 open findings can be redesigned automatically")).toBeVisible();
  await expect(page.getByRole("button", { name: "No automatic redesigns" })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("redesign-unavailable.png"), animations: "disabled" });
  expect(redesignRequests).toBe(0);
});

test("neutral selection stays neutral and Evidence reuses the completed analysis", async ({ context, page }) => {
  let calls = 0;
  await context.route(`${API_ORIGIN}/analyze`, (route) => {
    calls += 1;
    return route.fulfill({ json: { findings: [], summary: "No significant assumption was found." } });
  });
  await page.goto(DEMO_ORIGIN);
  await selectRestraint(page);
  await page.getByRole("button", { name: "Explain", exact: true }).click();
  await expect(page.locator(".eqx-neutral-result")).toBeVisible();
  await page.getByRole("button", { name: "Evidence", exact: true }).click();
  await expect(page.locator(".eqx-neutral-result")).toBeVisible();
  expect(calls).toBe(1);
});

test("export failure retains results and permits a successful retry", async ({ context, page }) => {
  await context.route(`${API_ORIGIN}/scan`, (route) => route.fulfill({ json: { findings: [finding], summary: "Done" } }));
  let fail = true;
  await context.route(`${API_ORIGIN}/report`, (route) => route.fulfill({
    status: fail ? 503 : 201,
    json: fail ? { error: "Report service unavailable" } : { id: "012345abcdef", url: `${API_ORIGIN}/report/012345abcdef` },
  }));
  await context.route(`${API_ORIGIN}/report/012345abcdef`, (route) => route.fulfill({
    contentType: "text/html", body: "<h1>Shared report</h1>",
  }));
  await page.goto(DEMO_ORIGIN);
  await scanPage(page);
  await page.getByRole("button", { name: "Export report", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Report service unavailable");
  fail = false;
  const newTab = context.waitForEvent("page");
  await page.getByRole("button", { name: "Try export again" }).click();
  const report = await newTab;
  await expect(report).toHaveURL(`${API_ORIGIN}/report/012345abcdef`);
  // Chromium's tabs.create initial navigation precedes Playwright's page
  // interception; reload to inspect our fixture after the tab is attached.
  await report.reload();
  await expect(report.getByRole("heading", { name: "Shared report" })).toBeVisible();
});

test("a second scan cancels stale results from the first scan", async ({ context, page }) => {
  let firstRoute: import("@playwright/test").Route | undefined;
  let calls = 0;
  await context.route(`${API_ORIGIN}/scan`, async (route) => {
    calls += 1;
    if (calls === 1) { firstRoute = route; return; }
    await route.fulfill({ json: { findings: [{ ...finding, id: "fresh", title: "Fresh scan result" }], summary: "Done" } });
  });
  await page.goto(DEMO_ORIGIN);
  await scanPage(page);
  await expect.poll(() => Boolean(firstRoute)).toBe(true);
  await page.getByRole("button", { name: "Close findings panel" }).click();
  await scanPage(page);
  await expect(page.locator(".eqx-panel-status")).toHaveText("Scan complete");
  await firstRoute!.fulfill({ json: { findings: [{ ...finding, id: "stale", title: "Stale scan result" }], summary: "Stale" } }).catch(() => undefined);
  await expect(page.locator(".eqx-finding-row").filter({ hasText: "Fresh scan result" })).toHaveCount(1);
  await expect(page.locator(".eqx-finding-row").filter({ hasText: "Stale scan result" })).toHaveCount(0);
});

test("network loss during a scan shows an empty error state and supports recovery", async ({ context, page }) => {
  let held: import("@playwright/test").Route | undefined;
  let offline = false;
  let resumed = false;
  await context.route(`${API_ORIGIN}/scan`, async (route) => {
    if (offline) return route.abort("internetdisconnected");
    if (resumed) return route.fulfill({ json: { findings: [], summary: "Done" } });
    held = route;
  });
  await page.goto(DEMO_ORIGIN);
  await scanPage(page);
  await expect.poll(() => Boolean(held)).toBe(true);
  offline = true;
  await context.setOffline(true);
  await held!.abort("internetdisconnected");
  await expect(page.getByText("Deep scan paused", { exact: true })).toBeVisible();
  await expect(page.locator(".eqx-finding-row")).toHaveCount(0);
  offline = false;
  resumed = true;
  await context.setOffline(false);
  await page.getByRole("button", { name: "Retry AI scan" }).click();
  await expect(page.locator(".eqx-panel-status")).toHaveText("Scan complete");
});

test("malformed scan findings cannot crash the overlay", async ({ context, page }) => {
  await context.route(`${API_ORIGIN}/scan`, (route) => route.fulfill({
    contentType: "application/x-ndjson", body: '{"id":"broken"}\n',
  }));
  await page.goto(DEMO_ORIGIN);
  await scanPage(page);
  await expect(page.getByText("Deep scan paused", { exact: true })).toBeVisible();
  await expect(page.locator(".eqx-finding-row")).toHaveCount(0);
  await expect(page.getByTestId("buddy-orb")).toBeVisible();
});

test("a hung report request times out and unlocks export", async ({ context, page }) => {
  await context.route(`${API_ORIGIN}/scan`, (route) => route.fulfill({ json: { findings: [finding], summary: "Done" } }));
  await context.route(`${API_ORIGIN}/report`, () => undefined);
  await page.goto(DEMO_ORIGIN);
  await scanPage(page);
  await page.getByRole("button", { name: "Export report", exact: true }).click();
  await expect(page.getByRole("button", { name: "Preparing report…" })).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("timed out", { timeout: 32_000 });
  await expect(page.getByRole("button", { name: "Try export again" })).toBeEnabled();
});

test("the extension remains usable under strict page CSP", async ({ context, page }) => {
  await context.route("https://strict.example/", (route) => route.fulfill({
    contentType: "text/html",
    headers: { "Content-Security-Policy": "default-src 'none'; style-src 'none'; script-src 'none'; connect-src 'none'" },
    body: '<html><head><title>Strict CSP</title></head><body><p>Average male crash test baseline</p><a href="/next">Normal page navigation</a></body></html>',
  }));
  await context.route(`${API_ORIGIN}/scan`, (route) => route.fulfill({ json: { findings: [], summary: "Done" } }));
  await page.goto("https://strict.example/");
  await expect(page.getByTestId("buddy-orb")).toBeVisible();
  await scanPage(page);
  await expect(page.locator(".eqx-panel-status")).toHaveText("Scan complete");
  expect(await page.getByTestId("findings-panel").evaluate((element) => getComputedStyle(element).position)).toBe("fixed");
});

test("Chrome internal pages do not inject the extension", async ({ page }) => {
  await page.goto("chrome://version");
  await expect(page.locator("#equalens-root")).toHaveCount(0);
});

test("interacting with an embedded frame explains the analysis boundary", async ({ context, page }) => {
  await context.route("https://frames.example/", (route) => route.fulfill({
    contentType: "text/html",
    body: '<html><head><title>Frame test</title></head><body><p>Main page</p><iframe title="Embedded content" srcdoc="<p>Embedded specification</p>"></iframe></body></html>',
  }));
  await page.goto("https://frames.example/");
  await page.frameLocator("iframe").getByText("Embedded specification").click();
  await expect(page.locator(".eqx-inspection-status")).toContainText("embedded frames");
});

test("printing hides the extension overlay", async ({ context, page }) => {
  await context.route(`${API_ORIGIN}/scan`, (route) => route.fulfill({ json: { findings: [], summary: "Done" } }));
  await page.goto(DEMO_ORIGIN);
  await scanPage(page);
  await page.emulateMedia({ media: "print" });
  await expect(page.getByTestId("buddy-orb")).toBeHidden();
  await expect(page.getByTestId("findings-panel")).toBeHidden();
});
