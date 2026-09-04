import { describe, expect, it } from "vitest";
import { cacheKey } from "../src/cache";

describe("cache key normalization", () => {
  it("is stable across object key order and distinct across endpoints", async () => {
    const first = await cacheKey("/analyze", { text: "same", nested: { second: 2, first: 1 } });
    const reordered = await cacheKey("/analyze", { nested: { first: 1, second: 2 }, text: "same" });
    const otherEndpoint = await cacheKey("/scan", { nested: { first: 1, second: 2 }, text: "same" });

    expect(first).toBe(reordered);
    expect(first).not.toBe(otherEndpoint);
    expect(first).toMatch(/^response:[a-f0-9]{64}$/);
  });
});
