export type JsonSchema = Readonly<Record<string, unknown>>;

const findingProperties = {
  id: { type: "string" },
  selector: { type: ["string", "null"] },
  title: { type: "string" },
  assumption: { type: "string" },
  impact: { type: "string" },
  affected: { type: "array", items: { type: "string" } },
  category: { type: "string", enum: ["safety", "usability", "language"] },
  severity: {
    type: "string",
    enum: ["safety-high", "safety-med", "usability-high", "usability-med", "language"],
  },
  confidence: { type: "string", enum: ["high", "medium", "low"] },
  evidenceTags: { type: "array", items: { type: "string" } },
  source: { type: "string", enum: ["ai"] },
  stereotype: { type: ["boolean", "null"] },
  redesignable: { type: "boolean" },
  fixed: { type: "boolean" },
} as const;

export const FINDING_SCHEMA = {
  type: "object",
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
  additionalProperties: false,
} as const;

export const FINDINGS_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    findings: { type: "array", items: FINDING_SCHEMA },
    summary: { type: "string" },
  },
  required: ["findings", "summary"],
  additionalProperties: false,
} as const;

export const REDESIGN_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    rewritten_html: { type: "string" },
    rationale: { type: "string" },
    changes: { type: "array", items: { type: "string" } },
  },
  required: ["rewritten_html", "rationale", "changes"],
  additionalProperties: false,
} as const;
