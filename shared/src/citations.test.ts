import { describe, expect, it } from "vitest";
import { CITATIONS, CITATION_TAGS, citationsForTags } from "./citations";

describe("verified citation library", () => {
  it("ships a unique 12-source allowlist and resolves only known tags", () => {
    expect(CITATIONS).toHaveLength(12);
    expect(new Set(CITATION_TAGS).size).toBe(12);
    expect(CITATIONS.every(({ url }) => url.startsWith("https://"))).toBe(true);

    expect(citationsForTags(["crash-injury-sex-gap", "invented-tag"]).map(({ claim }) => claim)).toEqual([
      expect.stringContaining("73% greater odds"),
    ]);
  });
});
