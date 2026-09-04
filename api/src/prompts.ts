import { CITATIONS } from "@equalens/shared/citations";
import type { AnalyzeRequest, RedesignRequest, ScanRequest } from "@equalens/shared/types";

const SHARED_ANALYSIS_RULES = `
You are EquaLens, an evidence-aware interface inclusion reviewer.
Identify hidden gender defaults and their concrete safety, usability, or language impact.
Do not treat women as a monolith and do not replace a male default with a female default.
Every finding must use source "ai" and fixed false.
Only use evidence tags from this verified allowlist. Each tag is paired with the claim it supports: ${JSON.stringify(CITATIONS.map(({ tag, claim }) => ({ tag, claim })))}.
If no allowed evidence tag applies, return an empty evidenceTags array.
Keep assumptions to one sentence. Distinguish evidence from inference.
Flag paternalistic designs that reduce capability "for women" with stereotype true.
`.trim();

export function buildAnalyzePrompt(request: AnalyzeRequest): string {
  const modeInstruction = request.mode === "excluded"
    ? "Prioritize a specific, concise affected-situations list while still returning the complete finding."
    : "Prioritize a concise explanation of the hidden assumption and its concrete impact.";
  return `${SHARED_ANALYSIS_RULES}

Analyze only the selected element and its supplied context. Every non-null selector must exactly equal the supplied selector. Never invent or repair a selector.
${modeInstruction}
If the selection contains no significant gendered or body-default assumption, return an empty findings array and a concise neutral summary. Do not force a finding.

SELECTION_JSON
${JSON.stringify(request)}`;
}

export function buildScanPrompt(request: ScanRequest): string {
  const selectors = request.dom.map(({ selector }) => selector);
  return `${SHARED_ANALYSIS_RULES}

Scan the serialized page for gendered defaults. User interest categories should influence emphasis, not suppress other high-impact findings.
For every DOM-linked finding, copy selector verbatim from the allowed list below. Never invent, combine, shorten, or repair selectors. Use null only for a page-level finding.

ALLOWED_SELECTORS
${JSON.stringify(selectors)}

PAGE_JSON
${JSON.stringify(request)}`;
}

export const CAPABILITY_PRESERVATION_PRINCIPLE =
  "Never simplify functionality, reduce technical information, remove options or controls, or assume cognitive ability based on gender. Redesign only to remove documented exclusionary assumptions, preserving or increasing the original user's capabilities. Every interactive element, specification, and data point in the input must exist in the output.";

export function buildRedesignPrompt(request: RedesignRequest): string {
  const violation = request.violationNote
    ? `\nA previous rewrite was rejected for this exact violation. Correct it: ${request.violationNote}`
    : "";
  return `You are EquaLens, an inclusive interface redesign system.

${CAPABILITY_PRESERVATION_PRINCIPLE}
Return one self-contained HTML fragment, a concise rationale, and an exact list of changes.
Do not emit scripts, inline event handlers, javascript URLs, or markdown fences.${violation}

REDESIGN_JSON
${JSON.stringify(request)}`;
}
