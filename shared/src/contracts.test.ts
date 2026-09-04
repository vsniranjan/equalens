import { describe, expect, it } from "vitest";
import { SCORE_WEIGHTS, TOKENS, calculateInclusionScore } from "./tokens";
import type { AnalyzeRequest, Finding, ScanRequest } from "./types";

describe("shared contracts", () => {
  it("publishes the canonical design and severity tokens", () => {
    expect(TOKENS.primary).toBe("#0F5257");
    expect(TOKENS.severity.safetyHigh).toBe("#D64550");
    expect(SCORE_WEIGHTS["safety-high"]).toBe(18);
    expect(calculateInclusionScore(["safety-high", "language"])).toBe(79);
  });

  it("keeps selectors and user context explicit in API payloads", () => {
    const analyze: AnalyzeRequest = {
      text: "One-size steering grip",
      outerHTML: "<h3>One-size steering grip</h3>",
      selector: "#controls h3",
      context: "Cockpit specification",
      pageTitle: "Meridian S4",
      pageUrl: "https://example.com/s4",
      categories: ["sizing-fit"],
    };
    const scan: ScanRequest = {
      dom: [{ selector: "#controls h3", text: analyze.text, html: analyze.outerHTML }],
      pageTitle: analyze.pageTitle,
      pageUrl: analyze.pageUrl,
      categories: analyze.categories,
    };
    const finding: Finding = {
      id: "finding-1",
      selector: scan.dom[0]?.selector ?? null,
      title: "Fixed grip assumes one hand size",
      assumption: "A single grip diameter works for every driver.",
      impact: "Drivers with smaller hands may have less secure control.",
      affected: ["smaller hands"],
      category: "usability",
      severity: "usability-high",
      confidence: "high",
      evidenceTags: [],
      source: "ai",
      redesignable: true,
      fixed: false,
    };

    expect(finding.selector).toBe("#controls h3");
  });
});
