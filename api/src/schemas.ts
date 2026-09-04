const findingProperties = {
  id: { type: "STRING" },
  selector: { type: "STRING", nullable: true },
  title: { type: "STRING" },
  assumption: { type: "STRING" },
  impact: { type: "STRING" },
  affected: { type: "ARRAY", items: { type: "STRING" } },
  category: { type: "STRING", enum: ["safety", "usability", "language"] },
  severity: {
    type: "STRING",
    enum: ["safety-high", "safety-med", "usability-high", "usability-med", "language"],
  },
  confidence: { type: "STRING", enum: ["high", "medium", "low"] },
  evidenceTags: { type: "ARRAY", items: { type: "STRING" } },
  source: { type: "STRING", enum: ["ai"] },
  stereotype: { type: "BOOLEAN", nullable: true },
  redesignable: { type: "BOOLEAN" },
  fixed: { type: "BOOLEAN" },
} as const;

export const FINDING_SCHEMA = {
  type: "OBJECT",
  properties: findingProperties,
  required: [
    "id",
    "selector",
    "title",
    "assumption",
    "impact",
    "affected",
    "category",
    "severity",
    "confidence",
    "evidenceTags",
    "source",
    "redesignable",
    "fixed",
  ],
} as const;

export const FINDINGS_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    findings: { type: "ARRAY", items: FINDING_SCHEMA },
    summary: { type: "STRING" },
  },
  required: ["findings", "summary"],
} as const;

export const REDESIGN_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    rewritten_html: { type: "STRING" },
    rationale: { type: "STRING" },
    changes: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["rewritten_html", "rationale", "changes"],
} as const;
