import { test, expect, API_ORIGIN, DEMO_ORIGIN, dismissOnboarding, selectRestraint, scanPage } from "./fixtures";
import { writeFile } from "node:fs/promises";

test("live production diagnostic", async ({ page, context, worker }, testInfo) => {
  await dismissOnboarding(context, worker);
  const requests: unknown[] = [];
  const responses: Promise<void>[] = [];
  context.on("response", (response) => {
    if (!response.url().startsWith(API_ORIGIN)) return;
    responses.push((async () => {
      const body = await response.text().catch((error) => String(error));
      const record = { url: response.url(), status: response.status(), headers: response.headers(), request: response.request().postDataJSON(), body };
      requests.push(record);
      console.log(JSON.stringify({ api: response.url(), status: response.status(), body: body.slice(0, 350) }));
    })());
  });
  try {
    await page.goto(DEMO_ORIGIN, { waitUntil: "networkidle" });
    await expect(page.getByTestId("buddy-orb")).toBeVisible();
    await selectRestraint(page);
    await page.getByRole("button", { name: "Explain", exact: true }).click();
    await expect(page.locator("#equalens-root")).toContainText("verified source", { timeout: 40_000 });
    await scanPage(page);
    await expect(page.locator("#equalens-root")).toContainText("Scan complete", { timeout: 40_000 });
    console.log("findings", await page.locator(".eqx-finding-summary").allTextContents());
    await page.getByRole("button", { name: "Redesign all", exact: true }).click();
    await expect(page.locator(".eqx-redesign-comparison, .eqx-redesign-notice[data-mode=error]")).toBeVisible({ timeout: 85_000 });
    await expect(page.locator(".eqx-redesign-notice[data-mode=error]")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("redesign-preview.png"), fullPage: true });
    await page.getByRole("button", { name: "Keep change", exact: true }).click();
    const reportPromise = context.waitForEvent("page");
    await page.getByRole("button", { name: "Export report", exact: true }).click();
    const report = await reportPromise;
    await expect(report.getByRole("heading", { name: "EquaLens Inclusion Report" })).toBeVisible();
    await report.screenshot({ path: testInfo.outputPath("report.png"), fullPage: true });
  } finally {
    await Promise.all(responses);
    await writeFile(testInfo.outputPath("production-traffic.json"), JSON.stringify(requests, null, 2));
    await testInfo.attach("production-traffic", { body: JSON.stringify(requests, null, 2), contentType: "application/json" });
    await testInfo.attach("overlay-text", { body: await page.locator("#equalens-root").innerText().catch(() => "unavailable"), contentType: "text/plain" });
  }
});
