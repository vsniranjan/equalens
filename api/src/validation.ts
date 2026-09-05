import { CITATION_TAGS } from "@equalens/shared/citations";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  AnalyzeMode,
  Category,
  Confidence,
  Finding,
  InterestCategory,
  RedesignRequest,
  RedesignResponse,
  ReportPayload,
  ScanRequest,
  SerializedDomElement,
  Severity,
} from "@equalens/shared/types";
import { AIValidationError, HttpError } from "./errors";

const SEVERITIES = new Set<Severity>(["safety-high", "safety-med", "usability-high", "usability-med", "language"]);
const CATEGORIES = new Set<Category>(["safety", "usability", "language"]);
const CONFIDENCE = new Set<Confidence>(["high", "medium", "low"]);
const INTERESTS = new Set<InterestCategory>(["safety", "sizing-fit", "language", "everyday-usability"]);
const ANALYZE_MODES = new Set<AnalyzeMode>(["explain", "excluded"]);
const EVIDENCE_TAGS = new Set(CITATION_TAGS);
const MAX_TEXT_LENGTH = 16_000;
const MAX_DOM_ELEMENTS = 600;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requestRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new HttpError(400, "Invalid request body");
  return value;
}

function requestString(value: unknown, field: string, maxLength = MAX_TEXT_LENGTH): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    throw new HttpError(400, `Invalid ${field}`);
  }
  return value;
}

function requestUrl(value: unknown, field: string): string {
  const url = requestString(value, field, 2_048);
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Unsupported protocol");
  } catch {
    throw new HttpError(400, `Invalid ${field}`);
  }
  return url;
}

function requestInterests(value: unknown): InterestCategory[] {
  if (!Array.isArray(value) || !value.every((item): item is InterestCategory => typeof item === "string" && INTERESTS.has(item as InterestCategory))) {
    throw new HttpError(400, "Invalid categories");
  }
  return [...new Set(value)];
}

export function parseAnalyzeRequest(value: unknown): AnalyzeRequest {
  const body = requestRecord(value);
  return {
    text: requestString(body.text, "text", 8_000),
    outerHTML: requestString(body.outerHTML, "outerHTML", 8_192),
    selector: requestString(body.selector, "selector", 1_024),
    context: requestString(body.context, "context", 8_000),
    pageTitle: requestString(body.pageTitle, "pageTitle", 512),
    pageUrl: requestUrl(body.pageUrl, "pageUrl"),
    categories: requestInterests(body.categories),
    mode: requestAnalyzeMode(body.mode),
  };
}

function requestAnalyzeMode(value: unknown): AnalyzeMode {
  if (value === undefined) return "explain";
  if (typeof value !== "string" || !ANALYZE_MODES.has(value as AnalyzeMode)) throw new HttpError(400, "Invalid mode");
  return value as AnalyzeMode;
}

function parseDomElement(value: unknown): SerializedDomElement {
  const item = requestRecord(value);
  const element: SerializedDomElement = {
    selector: requestString(item.selector, "dom.selector", 1_024),
    text: requestString(item.text, "dom.text", 8_000),
    html: requestString(item.html, "dom.html", 16_000),
  };
  if (item.tagName !== undefined) element.tagName = requestString(item.tagName, "dom.tagName", 64);
  if (item.role !== undefined) element.role = requestString(item.role, "dom.role", 128);
  return element;
}

export function parseScanRequest(value: unknown): ScanRequest {
  const body = requestRecord(value);
  if (!Array.isArray(body.dom) || body.dom.length === 0 || body.dom.length > MAX_DOM_ELEMENTS) {
    throw new HttpError(400, "Invalid dom");
  }
  return {
    dom: body.dom.map(parseDomElement),
    pageTitle: requestString(body.pageTitle, "pageTitle", 512),
    pageUrl: requestUrl(body.pageUrl, "pageUrl"),
    categories: requestInterests(body.categories),
  };
}

export function parseRedesignRequest(value: unknown): RedesignRequest {
  const body = requestRecord(value);
  const finding = parseFinding(body.finding, undefined, false);
  const request: RedesignRequest = {
    outerHTML: requestString(body.outerHTML, "outerHTML", 16_000),
    finding,
    pageTitle: requestString(body.pageTitle, "pageTitle", 512),
    pageUrl: requestUrl(body.pageUrl, "pageUrl"),
  };
  if (body.violationNote !== undefined) request.violationNote = requestString(body.violationNote, "violationNote", 2_000);
  return request;
}

export function parseReportPayload(value: unknown): ReportPayload {
  const body = requestRecord(value);
  if (!Array.isArray(body.findings)) throw new HttpError(400, "Invalid findings");
  if (!Number.isInteger(body.scoreBefore) || (body.scoreBefore as number) < 0 || (body.scoreBefore as number) > 100) {
    throw new HttpError(400, "Invalid scoreBefore");
  }
  const payload: ReportPayload = {
    pageTitle: requestString(body.pageTitle, "pageTitle", 512),
    pageUrl: requestUrl(body.pageUrl, "pageUrl"),
    findings: body.findings.map((finding) => parseFinding(finding, undefined, false)),
    scoreBefore: body.scoreBefore as number,
  };
  if (body.scoreAfter !== undefined) {
    if (!Number.isInteger(body.scoreAfter) || (body.scoreAfter as number) < 0 || (body.scoreAfter as number) > 100) {
      throw new HttpError(400, "Invalid scoreAfter");
    }
    payload.scoreAfter = body.scoreAfter as number;
  }
  if (body.generatedAt !== undefined) payload.generatedAt = requestString(body.generatedAt, "generatedAt", 64);
  return payload;
}

function modelString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new AIValidationError(`Missing or invalid ${field}`);
  return value;
}

function modelStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every((item): item is string => typeof item === "string" && item.trim().length > 0)) {
    throw new AIValidationError(`Missing or invalid ${field}`);
  }
  return value;
}

function parseFinding(value: unknown, allowedSelectors?: ReadonlySet<string>, requireUnfixed = true): Finding {
  if (!isRecord(value)) throw new AIValidationError("Finding must be an object");
  if (value.selector !== null && typeof value.selector !== "string") throw new AIValidationError("Invalid selector");
  if (typeof value.selector === "string" && allowedSelectors && !allowedSelectors.has(value.selector)) {
    throw new AIValidationError(`Model invented selector: ${value.selector}`);
  }
  if (typeof value.category !== "string" || !CATEGORIES.has(value.category as Category)) throw new AIValidationError("Invalid category");
  if (typeof value.severity !== "string" || !SEVERITIES.has(value.severity as Severity)) throw new AIValidationError("Invalid severity");
  if (typeof value.confidence !== "string" || !CONFIDENCE.has(value.confidence as Confidence)) throw new AIValidationError("Invalid confidence");
  if (value.source !== "ai") throw new AIValidationError("Invalid source");
  if (typeof value.redesignable !== "boolean" || typeof value.fixed !== "boolean") throw new AIValidationError("Invalid finding state");
  if (requireUnfixed && value.fixed !== false) throw new AIValidationError("AI findings must begin unfixed");
  if (value.stereotype !== undefined && value.stereotype !== null && typeof value.stereotype !== "boolean") {
    throw new AIValidationError("Invalid stereotype flag");
  }

  const evidenceTags = modelStringArrayAllowEmpty(value.evidenceTags, "evidenceTags");
  if (evidenceTags.some((tag) => !EVIDENCE_TAGS.has(tag))) throw new AIValidationError("Unknown evidence tag");

  const finding: Finding = {
    id: modelString(value.id, "id"),
    selector: value.selector,
    title: modelString(value.title, "title"),
    assumption: modelString(value.assumption, "assumption"),
    impact: modelString(value.impact, "impact"),
    affected: modelStringArray(value.affected, "affected"),
    category: value.category as Category,
    severity: value.severity as Severity,
    confidence: value.confidence as Confidence,
    evidenceTags,
    source: value.source,
    redesignable: value.redesignable,
    fixed: value.fixed,
  };
  if (typeof value.stereotype === "boolean") finding.stereotype = value.stereotype;
  return finding;
}

function modelStringArrayAllowEmpty(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item): item is string => typeof item === "string" && item.trim().length > 0)) {
    throw new AIValidationError(`Missing or invalid ${field}`);
  }
  return value;
}

export function parseFindingsResponse(value: unknown, allowedSelectors: ReadonlySet<string>): AnalyzeResponse {
  if (!isRecord(value) || !Array.isArray(value.findings)) throw new AIValidationError("Findings response must be an object");
  return {
    findings: value.findings.map((finding) => parseFinding(finding, allowedSelectors)),
    summary: modelString(value.summary, "summary"),
  };
}

export function parseRedesignResponse(value: unknown, originalHtml: string): RedesignResponse {
  if (!isRecord(value)) throw new AIValidationError("Redesign response must be an object");
  const response: RedesignResponse = {
    rewritten_html: modelString(value.rewritten_html, "rewritten_html"),
    rationale: modelString(value.rationale, "rationale"),
    changes: modelStringArray(value.changes, "changes"),
  };
  assertCapabilityPreserved(originalHtml, response.rewritten_html);
  return response;
}

function assertCapabilityPreserved(originalHtml: string, rewrittenHtml: string): void {
  if (/<script\b|\son\w+\s*=|javascript:/i.test(rewrittenHtml)) throw new AIValidationError("Unsafe HTML in redesign");

  for (const tag of ["a", "button", "input", "select", "textarea", "details"]) {
    const originalCount = countTags(originalHtml, tag);
    if (countTags(rewrittenHtml, tag) < originalCount) throw new AIValidationError(`Redesign removed interactive <${tag}> elements`);
  }

  const dataPoints = originalHtml.match(/\b\d+(?:\.\d+)?\s*(?:mm|cm|kg|%|°c|hz|db)?\b/gi) ?? [];
  if (dataPoints.some((point) => !rewrittenHtml.toLowerCase().includes(point.toLowerCase()))) {
    throw new AIValidationError("Redesign removed a numeric data point");
  }
}

function countTags(html: string, tag: string): number {
  return html.match(new RegExp(`<${tag}\\b`, "gi"))?.length ?? 0;
}
