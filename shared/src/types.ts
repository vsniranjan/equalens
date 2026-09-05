export type Severity =
  | "safety-high"
  | "safety-med"
  | "usability-high"
  | "usability-med"
  | "language";

export type Category = "safety" | "usability" | "language";

export type Confidence = "high" | "medium" | "low";

export type InterestCategory = "safety" | "sizing-fit" | "language" | "everyday-usability";
export type AnalyzeMode = "explain" | "excluded";

export interface Finding {
  id: string;
  selector: string | null;
  title: string;
  assumption: string;
  impact: string;
  affected: string[];
  category: Category;
  severity: Severity;
  confidence: Confidence;
  evidenceTags: string[];
  source: "ai";
  stereotype?: boolean;
  redesignable: boolean;
  fixed: boolean;
}

export interface RedesignResponse {
  rewritten_html: string;
  rationale: string;
  changes: string[];
}

export interface SerializedDomElement {
  selector: string;
  text: string;
  html: string;
  tagName?: string;
  role?: string;
}

export interface AnalyzeRequest {
  text: string;
  outerHTML: string;
  selector: string;
  context: string;
  pageTitle: string;
  pageUrl: string;
  categories: InterestCategory[];
  mode?: AnalyzeMode;
}

export interface AnalyzeResponse {
  findings: Finding[];
  summary: string;
  cached?: boolean;
}

export interface ScanRequest {
  dom: SerializedDomElement[];
  pageTitle: string;
  pageUrl: string;
  categories: InterestCategory[];
}

export interface ScanResponse {
  findings: Finding[];
  summary: string;
  cached?: boolean;
}

export interface RedesignRequest {
  outerHTML: string;
  finding: Finding;
  pageTitle: string;
  pageUrl: string;
  violationNote?: string;
}

export interface ReportPayload {
  pageTitle: string;
  pageUrl: string;
  findings: Finding[];
  scoreBefore: number;
  scoreAfter?: number;
  generatedAt?: string;
}

export interface ReportResponse {
  id: string;
  url: string;
}
