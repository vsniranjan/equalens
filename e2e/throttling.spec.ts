import { createServer } from "node:http";
import { test, expect } from "./fixtures";
import { throttle3G } from "./throttling";

test("3G throttling really applies to extension-worker fetches", async ({ context, page, worker, extensionId }) => {
  const server = createServer((_request, response) => {
    response.setHeader("Content-Type", "text/plain");
    response.end("x".repeat(100_000));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server has no port");
  const restore = await throttle3G(context, [page], extensionId);
  try {
    const elapsed = await worker.evaluate(async (url) => {
      const started = performance.now();
      const response = await fetch(url);
      const body = await response.text();
      if (body.length !== 100_000) throw new Error("Incomplete network probe");
      return performance.now() - started;
    }, `http://127.0.0.1:${address.port}/probe`);
    expect(elapsed).toBeGreaterThan(1_800);
    expect(elapsed).toBeLessThan(10_000);
  } finally {
    await restore();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
