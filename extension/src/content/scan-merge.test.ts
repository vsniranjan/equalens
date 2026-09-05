import type { Finding } from "@equalens/shared/types";
import { describe, expect, it } from "vitest";
import { mergeScanFinding, mergeScanFindings } from "./scan-merge";

const heuristic: Finding = {
  id: "heuristic-seat",
  selector: "#seat",
  title: "Local title",
  assumption: "Local assumption.",
  impact: "Local impact.",
  affected: ["shorter occupants"],
  category: "safety",
  severity: "safety-med",
  confidence: "medium",
  evidenceTags: ["crash-dummy-body-range"],
  source: "heuristic",
  redesignable: true,
  fixed: true,
};

const ai: Finding = {
  ...heuristic,
  id: "ai-seat",
  title: "AI-enriched title",
  severity: "safety-high",
  confidence: "high",
  evidenceTags: ["seatbelt-pregnancy-fit"],
  source: "ai",
  fixed: false,
};

describe("Phase 6 scan merging", () => {
  it("enriches a heuristic hit by selector without losing client state", () => {
    expect(mergeScanFinding([heuristic], ai)).toEqual([{
      ...ai,
      id: heuristic.id,
      fixed: true,
      evidenceTags: ["crash-dummy-body-range", "seatbelt-pregnancy-fit"],
    }]);
  });

  it("appends genuinely new AI findings in arrival order", () => {
    const reach = { ...ai, id: "ai-reach", selector: "#reach", title: "Reach assumption" };
    const language = { ...ai, id: "ai-language", selector: null, title: "Page language" };

    const merged = mergeScanFindings([heuristic], [reach, language]);

    expect(merged.map(({ id }) => id)).toEqual(["heuristic-seat", "ai-reach", "ai-language"]);
  });
});
