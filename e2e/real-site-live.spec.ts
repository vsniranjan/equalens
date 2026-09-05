import { test, expect, API_ORIGIN, dismissOnboarding, scanPage } from "./fixtures";
import { writeFile } from "node:fs/promises";
import { throttle3G } from "./throttling";

export const REAL_SITE = process.env.EQUALENS_REAL_SITE ?? "https://www.hyundai.com/in/en/find-a-car/creta/convenience";

test("real manufacturer page scans without modifying its content", async ({ context, page, worker, extensionId }, testInfo) => {
  await dismissOnboarding(context, worker);
  const navigation = await page.goto(REAL_SITE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  expect(navigation?.ok(), `Manufacturer returned HTTP ${navigation?.status()}`).toBe(true);
  await expect(page.getByTestId("buddy-orb")).toBeVisible();
  const consent = page.getByRole("button", { name: /Reject all|Only necessary|Accept all/i });
  if (await consent.count()) await consent.first().click();
  await expect(page.getByRole("heading", { name: /Access Denied|Forbidden|Verify you are human/i })).toHaveCount(0);
  expect((await page.locator("body").innerText()).length).toBeGreaterThan(1_000);
  await page.screenshot({ path: testInfo.outputPath("real-site-before.png"), fullPage: false });
  const restoreNetwork = process.env.EQUALENS_3G ? await throttle3G(context, [page], extensionId) : null;
  const responsePromise = context.waitForEvent("response", { predicate: (response) => response.url() === `${API_ORIGIN}/scan`, timeout: 40_000 });
  await scanPage(page);
  const response = await responsePromise;
  const body = await response.text();
  const captured = response.request().postDataJSON();
  if (!process.env.EQUALENS_REAL_SITE) {
    expect(captured.dom.some((element: { text: string }) => /Convenience: Always|driver.*seat|seating|comfort|steering/i.test(element.text))).toBe(true);
  }
  await writeFile(testInfo.outputPath("production-traffic.json"), JSON.stringify([{ url: response.url(), request: response.request().postDataJSON(), status: response.status(), body }], null, 2));
  expect(response.status(), body).toBe(200);
  await expect(page.locator(".eqx-panel-status")).toHaveText("Scan complete", { timeout: 40_000 });
  await restoreNetwork?.();
  await page.screenshot({ path: testInfo.outputPath("real-site-scan.png"), fullPage: false });
  console.log(JSON.stringify({ realSite: page.url(), findings: await page.locator(".eqx-finding-summary").allTextContents() }));
});
