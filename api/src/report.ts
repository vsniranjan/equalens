import { citationsForTags, type Citation } from "@equalens/shared/citations";
import { TOKENS } from "@equalens/shared/tokens";
import type { Finding, ReportPayload, ReportResponse } from "@equalens/shared/types";

const REPORT_TTL_SECONDS = 30 * 24 * 60 * 60;

export async function storeReport(reports: KVNamespace, origin: string, payload: ReportPayload): Promise<ReportResponse> {
  const id = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const stored: ReportPayload = { ...payload, generatedAt: payload.generatedAt ?? new Date().toISOString() };
  await reports.put(`report:${id}`, JSON.stringify(stored), { expirationTtl: REPORT_TTL_SECONDS });
  return { id, url: `${origin}/report/${id}` };
}

export async function loadReport(reports: KVNamespace, id: string): Promise<ReportPayload | null> {
  return reports.get<ReportPayload>(`report:${id}`, "json");
}

export function renderReport(payload: ReportPayload, nonce: string): string {
  const scoreAfter = payload.scoreAfter ?? payload.scoreBefore;
  const date = reportDate(payload.generatedAt);
  const hostname = reportHostname(payload.pageUrl);
  const citations = citationsForTags(payload.findings.flatMap(({ evidenceTags }) => evidenceTags));
  const tableBody = payload.findings.length > 0
    ? payload.findings.map(renderFindingRow).join("")
    : '<tr class="empty-row"><td colspan="5">No findings were included in this report.</td></tr>';
  const evidence = citations.length > 0
    ? `<ol class="evidence-list">${citations.map(renderCitation).join("")}</ol>`
    : '<p class="empty-evidence">No verified evidence sources were attached to these findings.</p>';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>EquaLens Inclusion Report | ${escapeHtml(payload.pageTitle)}</title>
<style>
:root{color:${TOKENS.ink};background:${TOKENS.canvas};font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:light;font-synthesis:none}*{box-sizing:border-box}body{margin:0}button{font:inherit}.report-shell{width:min(100% - 32px,1180px);margin:0 auto;padding:28px 0 56px}.report-toolbar{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:16px}.report-mark{display:flex;align-items:center;gap:9px;color:${TOKENS.primaryDark};font-size:12px;font-weight:750}.report-mark i{width:8px;height:8px;border-radius:50%;background:${TOKENS.primary}}.print-button{display:inline-flex;min-height:42px;align-items:center;gap:10px;padding:0 18px;border:1px solid ${TOKENS.primaryDark};border-radius:6px;background:${TOKENS.primaryDark};color:white;cursor:pointer;font-weight:700}.print-button:hover{background:${TOKENS.primary}}.print-button:active{transform:translateY(1px)}.print-button:focus-visible{outline:2px solid ${TOKENS.primary};outline-offset:3px}.report-document{overflow:hidden;border-radius:10px;background:white;box-shadow:0 5px 8px rgb(14 27 29/.08)}.report-hero{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:48px;padding:42px 48px;background:${TOKENS.primaryDark};color:white}.report-reference{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin:0 0 18px;color:#b2d8db;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}.report-reference strong{padding:4px 7px;border-radius:3px;background:#0f5257;color:#d9f6f7;letter-spacing:.05em;text-transform:uppercase}.report-hero h1{max-width:720px;margin:0 0 28px;font-size:clamp(34px,5vw,54px);font-weight:620;letter-spacing:-.035em;line-height:1.05;text-wrap:balance}.report-meta{display:flex;flex-wrap:wrap;gap:24px 56px}.report-meta div{display:grid;gap:5px}.report-meta span{color:#a8cfd2;font-size:10px;font-weight:750;letter-spacing:.09em;text-transform:uppercase}.report-meta strong,.report-meta a{max-width:38ch;color:white;font-size:14px;font-weight:600;line-height:1.45;text-decoration:none;overflow-wrap:anywhere}.report-meta a:hover{text-decoration:underline}.score-pair{display:grid;grid-template-columns:1fr 1px 1fr;align-items:center;gap:18px;padding:24px;border-radius:8px;background:#0f5257}.score-pair>i{width:1px;height:90px;background:#3c7b80}.score{display:grid;justify-items:center;gap:10px}.score-ring{--score-color:${TOKENS.severity.safetyHigh};display:grid;width:100px;height:100px;place-items:center;border-radius:50%;background:conic-gradient(var(--score-color) var(--score),#1c686d 0);position:relative}.score-ring::before{content:"";position:absolute;inset:8px;border-radius:50%;background:#0f5257}.score:last-child .score-ring{--score-color:${TOKENS.resolved}}.score-ring strong{position:relative;font-size:34px;font-variant-numeric:tabular-nums;line-height:1}.score-ring small{position:absolute;top:60px;color:#b7d9db;font-size:8px;font-weight:750;letter-spacing:.08em;text-transform:uppercase}.score>span{color:#d7eded;font-size:12px;font-weight:650}.protocol{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:13px 34px;background:#dcf2f4;color:#355052;font-size:11px}.protocol span{display:flex;align-items:center;gap:8px}.protocol i{width:7px;height:7px;border-radius:50%;background:${TOKENS.primary}}.severity-key{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:12px!important}.severity-key b{font-weight:650}.severity-key b::before{content:"";display:inline-block;width:7px;height:7px;margin-right:5px;border-radius:50%;background:currentColor}.severity-key .safety{color:${TOKENS.severity.safetyHigh}}.severity-key .usability{color:#a96300}.severity-key .language{color:${TOKENS.severity.language}}.report-body{padding:42px 48px 36px}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:18px}.section-heading h2{margin:0;color:${TOKENS.primaryDark};font-size:24px;letter-spacing:-.02em;line-height:1.2;text-wrap:balance}.section-heading span{color:#526b6d;font-size:11px}.findings-table-wrap{overflow-x:auto;border:1px solid ${TOKENS.border};border-radius:7px}.findings-table{width:100%;border-collapse:collapse;table-layout:fixed}.findings-table th{padding:13px 14px;background:#dcf2f4;color:#173638;font-size:10px;font-weight:750;letter-spacing:.035em;text-align:left;text-transform:uppercase}.findings-table th:nth-child(1){width:12%}.findings-table th:nth-child(2){width:21%}.findings-table th:nth-child(3){width:23%}.findings-table th:nth-child(4){width:32%}.findings-table th:nth-child(5){width:12%}.findings-table td{padding:17px 14px;border-top:1px solid ${TOKENS.border};vertical-align:top;color:#294345;font-size:12px;line-height:1.5;overflow-wrap:anywhere}.findings-table td:nth-child(2){color:${TOKENS.ink};font-weight:650}.finding-origin{display:block;margin-top:5px;color:#526b6d;font-size:9px;font-weight:550;text-transform:capitalize}.severity,.finding-status{display:inline-flex;align-items:center;padding:4px 7px;border-radius:4px;font-size:9px;font-weight:800;letter-spacing:.055em;text-transform:uppercase}.severity[data-category="safety"]{background:rgb(214 69 80/.09);color:#b72834}.severity[data-category="usability"]{background:rgb(232 161 60/.12);color:#8a560b}.severity[data-category="language"]{background:rgb(62 124 177/.1);color:#286da8}.finding-status{gap:5px;background:#fff1df;color:#915704}.finding-status[data-fixed="true"]{background:#e7f7ef;color:#176d49}.finding-status[data-fixed="true"]::before{content:"✓"}.empty-row td{padding:42px!important;text-align:center;color:#526b6d!important;font-weight:500!important}.evidence-section{margin-top:38px}.evidence-section h2{margin:0 0 16px;color:${TOKENS.primaryDark};font-size:20px;letter-spacing:-.015em}.evidence-list{display:grid;gap:0;margin:0;padding:10px 20px 10px 52px;border-radius:7px;background:#e2f8fa}.evidence-list li{padding:12px 8px;color:#294345;font-size:12px;line-height:1.55}.evidence-list li+li{border-top:1px solid #c4dfe1}.evidence-list a{color:${TOKENS.primaryDark};font-weight:650;text-decoration:none}.evidence-list a:hover{text-decoration:underline}.evidence-list small{display:block;margin-top:2px;color:#526b6d}.empty-evidence{margin:0;padding:18px;border-radius:6px;background:#eaf4f4;color:#526b6d;font-size:12px}.governance{display:grid;grid-template-columns:1fr 1fr;gap:38px;margin-top:34px;padding:20px 22px;border-radius:7px;background:#f0f7f7}.governance div{display:grid;align-content:start;gap:6px}.governance strong{color:#173638;font-size:10px;letter-spacing:.055em;text-transform:uppercase}.governance span{color:#40585a;font-size:12px;line-height:1.55}.document-footer{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:20px 48px;background:#dcf2f4;color:#294345;font-size:10px}.document-footer strong{color:${TOKENS.primaryDark}}@media(max-width:840px){.report-hero{grid-template-columns:1fr}.score-pair{max-width:340px}.protocol{align-items:flex-start;flex-direction:column}.severity-key{justify-content:flex-start}.report-body{padding:32px 26px}.report-hero{padding:34px 26px}.document-footer{padding:18px 26px}}@media(max-width:640px){.report-shell{width:100%;padding:0}.report-toolbar{padding:12px 14px;margin:0}.report-mark{font-size:10px}.print-button{min-height:38px;padding:0 12px;font-size:12px}.report-document{border-radius:0;box-shadow:none}.report-hero h1{font-size:34px}.score-pair{width:100%;max-width:none}.protocol{padding:13px 20px}.section-heading{align-items:flex-start;flex-direction:column;gap:5px}.findings-table-wrap{overflow:visible;border:0}.findings-table,.findings-table tbody,.findings-table tr,.findings-table td{display:block;width:100%}.findings-table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.findings-table tr{margin-bottom:12px;border:1px solid ${TOKENS.border};border-radius:7px;background:white}.findings-table td{display:grid;grid-template-columns:94px minmax(0,1fr);gap:12px;padding:11px 13px;border-top:1px solid ${TOKENS.border}}.findings-table td:first-child{border-top:0}.findings-table td::before{content:attr(data-label);color:#526b6d;font-size:9px;font-weight:750;letter-spacing:.04em;text-transform:uppercase}.empty-row td{display:block!important}.empty-row td::before{content:none}.governance{grid-template-columns:1fr;gap:22px}.document-footer{align-items:flex-start;flex-direction:column;gap:6px}}@media print{@page{margin:12mm;size:auto}:root{background:white}.report-shell{width:100%;padding:0}.report-toolbar{display:none}.report-document{box-shadow:none}.report-hero{-webkit-print-color-adjust:exact;print-color-adjust:exact}.protocol,.score-pair,.findings-table th,.evidence-list,.document-footer,.severity,.finding-status{-webkit-print-color-adjust:exact;print-color-adjust:exact}.report-body{padding:28px 34px}.findings-table-wrap{overflow:visible}.findings-table{table-layout:auto}.findings-table tr{break-inside:avoid}.evidence-section,.governance{break-inside:avoid}.document-footer{padding:16px 34px}}
</style>
</head>
<body>
<main class="report-shell">
  <nav class="report-toolbar" aria-label="Report actions">
    <span class="report-mark"><i aria-hidden="true"></i> Official EquaLens audit extract</span>
    <button class="print-button" id="print-report" type="button"><span aria-hidden="true">▣</span> Print / Save as PDF</button>
  </nav>
  <article class="report-document">
    <header class="report-hero">
      <div>
        <p class="report-reference"><strong>Inclusion review</strong><span>Generated ${escapeHtml(date)}</span></p>
        <h1>EquaLens Inclusion Report</h1>
        <div class="report-meta">
          <div><span>Analyzed site</span><strong>${escapeHtml(hostname)} — ${escapeHtml(payload.pageTitle)}</strong></div>
          <div><span>Reviewed page</span><a href="${escapeAttribute(payload.pageUrl)}">${escapeHtml(payload.pageUrl)}</a></div>
          <div><span>Auditor</span><strong>Automated inspection</strong></div>
        </div>
      </div>
      <section class="score-pair" aria-label="Inclusion score before ${payload.scoreBefore} and after ${scoreAfter}">
        ${renderScore("Before", payload.scoreBefore)}<i aria-hidden="true"></i>${renderScore("After", scoreAfter)}
      </section>
    </header>
    <div class="protocol">
      <span><i aria-hidden="true"></i> Capability-preserving inclusion review</span>
      <span class="severity-key"><b class="safety">Safety</b><b class="usability">Usability</b><b class="language">Language</b></span>
    </div>
    <div class="report-body">
      <section aria-labelledby="findings-heading">
        <div class="section-heading"><h2 id="findings-heading">Findings &amp; remediation summary</h2><span>${payload.findings.length} documented finding${payload.findings.length === 1 ? "" : "s"}</span></div>
        <div class="findings-table-wrap">
          <table class="findings-table">
            <thead><tr><th>Severity</th><th>Finding</th><th>Hidden assumption</th><th>Recommendation</th><th>Status</th></tr></thead>
            <tbody>${tableBody}</tbody>
          </table>
        </div>
      </section>
      <section class="evidence-section" aria-labelledby="evidence-heading"><h2 id="evidence-heading">Evidence &amp; sources</h2>${evidence}</section>
      <aside class="governance">
        <div><strong>Evidence standard</strong><span>Verified sources are listed separately from model or heuristic inference. Recommendations require human review before production use.</span></div>
        <div><strong>Privacy boundary</strong><span>This report contains page metadata and findings only. EquaLens never asks for or stores personal, gender, or medical information.</span></div>
      </aside>
    </div>
    <footer class="document-footer"><span><strong>Generated by EquaLens</strong><br>${escapeHtml(payload.generatedAt ?? "Timestamp unavailable")}</span><span>Capability-preserving recommendations · Human review required</span></footer>
  </article>
</main>
<script nonce="${escapeAttribute(nonce)}">document.getElementById("print-report")?.addEventListener("click",()=>window.print());</script>
</body>
</html>`;
}

function renderFindingRow(finding: Finding): string {
  const category = categoryLabel(finding);
  const status = finding.fixed ? "Fixed" : "Open";
  return `<tr>
    <td data-label="Severity"><span class="severity" data-category="${finding.category}">${escapeHtml(category)}</span></td>
    <td data-label="Finding">${escapeHtml(finding.title)}<small class="finding-origin">${finding.source === "ai" ? "AI" : "Heuristic"} inference · ${escapeHtml(finding.confidence)} confidence${finding.stereotype ? " · stereotype" : ""}</small></td>
    <td data-label="Hidden assumption">${escapeHtml(finding.assumption)}</td>
    <td data-label="Recommendation">${escapeHtml(recommendationFor(finding))}</td>
    <td data-label="Status"><span class="finding-status" data-fixed="${String(finding.fixed)}">${status}</span></td>
  </tr>`;
}

function renderCitation(citation: Citation): string {
  return `<li><a href="${escapeAttribute(citation.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(citation.claim)}</a><small>${escapeHtml(citation.source)}, ${citation.year}</small></li>`;
}

function renderScore(label: string, score: number): string {
  return `<div class="score"><div class="score-ring" style="--score:${score}%"><strong>${score}</strong><small>Index</small></div><span>${label} ${score}</span></div>`;
}

function categoryLabel(finding: Finding): string {
  if (finding.category === "safety") return finding.severity === "safety-high" ? "Safety high" : "Safety";
  if (finding.category === "usability") return finding.severity === "usability-high" ? "Usability high" : "Usability";
  return "Language";
}

function recommendationFor(finding: Finding): string {
  if (finding.fixed) return `${finding.impact} Retain the applied capability-preserving redesign and verify it across the affected situations.`;
  const situations = finding.affected.slice(0, 3).join(", ");
  if (finding.redesignable) {
    return `${finding.impact} Remove the documented default for ${situations} while preserving every existing control, option, and substantive detail.`;
  }
  return `${finding.impact} Review this assumption with ${situations} and document a capability-preserving remediation before implementation.`;
}

function reportDate(value: string | undefined): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(date);
}

function reportHostname(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
