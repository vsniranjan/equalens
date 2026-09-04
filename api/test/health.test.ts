import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("GET /health", () => {
  it("reports a healthy worker", async () => {
    const response = await SELF.fetch("https://equalens.test/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ service: "equalens-api", status: "ok" });
  });
});
