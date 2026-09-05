import type { BrowserContext, Page } from "@playwright/test";

// Apply the same conditions to the visible page AND the extension worker;
// page-only throttling does not slow the background API requests.
export async function throttle3G(context: BrowserContext, pages: Page[], extensionId: string): Promise<() => Promise<void>> {
  const conditions = { offline: false, latency: 400, downloadThroughput: 50_000, uploadThroughput: 50_000, connectionType: "cellular3g" as const };
  const sessions = await Promise.all(pages.map((page) => context.newCDPSession(page)));
  for (const session of sessions) {
    await session.send("Network.enable");
    await session.send("Network.emulateNetworkConditions", conditions);
  }
  const browser = context.browser();
  if (!browser) throw new Error("Chromium browser session unavailable for worker throttling");
  const root = await browser.newBrowserCDPSession();
  const { targetInfos } = await root.send("Target.getTargets");
  const target = targetInfos.find((target) => target.type === "service_worker" && target.url.startsWith(`chrome-extension://${extensionId}/`));
  if (!target) throw new Error("Extension worker target unavailable for throttling");
  const { sessionId } = await root.send("Target.attachToTarget", { targetId: target.targetId, flatten: false });
  let id = 0;
  const send = (method: string, params: object = {}): Promise<void> => new Promise((resolve, reject) => {
    const requestId = ++id;
    const timeout = setTimeout(() => { root.off("Target.receivedMessageFromTarget", receive); reject(new Error(`Worker CDP timed out: ${method}`)); }, 5_000);
    function receive(event: { sessionId: string; message: string }) {
      if (event.sessionId !== sessionId) return;
      const response = JSON.parse(event.message) as { id?: number; error?: { message: string } };
      if (response.id !== requestId) return;
      clearTimeout(timeout);
      root.off("Target.receivedMessageFromTarget", receive);
      if (response.error) reject(new Error(response.error.message));
      else resolve();
    }
    root.on("Target.receivedMessageFromTarget", receive);
    void root.send("Target.sendMessageToTarget", { sessionId, message: JSON.stringify({ id: requestId, method, params }) }).catch((error) => {
      clearTimeout(timeout); root.off("Target.receivedMessageFromTarget", receive); reject(error);
    });
  });
  await send("Network.enable");
  await send("Network.emulateNetworkConditions", conditions);
  return async () => {
    await send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await root.detach();
    for (const session of sessions) {
      await session.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      await session.detach();
    }
  };
}
