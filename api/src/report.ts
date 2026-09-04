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

export function renderReport(payload: ReportPayload): string {
  const after = payload.scoreAfter === undefined ? "Not measured" : String(payload.scoreAfter);
  const findings = payload.findings.length === 0
    ? '<p class="empty">No findings were included in this report.</p>'
    : `<ol>${payload.findings.map(renderFinding).join("")}</ol>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>EquaLens Inclusion Report | ${escapeHtml(payload.pageTitle)}</title>
<style>
:root{color:${TOKENS.ink};background:${TOKENS.canvas};font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0}main{width:min(100% - 32px,960px);margin:0 auto;padding:64px 0 96px}.eyebrow{margin:0;color:${TOKENS.primary};font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}h1{margin:10px 0 8px;font-size:clamp(36px,7vw,64px);line-height:1;letter-spacing:-.04em}a{color:${TOKENS.primary}}.meta{color:#526b6d}.scores{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;margin:40px 0;background:${TOKENS.border};border:1px solid ${TOKENS.border}}.score{padding:28px;background:white}.score span{display:block;color:#526b6d;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.score strong{font-size:52px;line-height:1}.summary{margin:48px 0 20px;font-size:28px}ol{display:grid;gap:12px;padding:0;list-style:none}li,.empty{padding:24px;border:1px solid ${TOKENS.border};background:white}li h3{margin:0 0 8px;font-size:20px}li p{margin:6px 0;color:#355052}.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}.chips span{padding:4px 7px;border-radius:4px;background:${TOKENS.canvas};color:${TOKENS.primaryDark};font-size:11px}.footer{margin-top:48px;padding-top:18px;border-top:1px solid ${TOKENS.border};color:#526b6d;font-size:12px}@media(max-width:560px){main{padding-top:40px}.scores{grid-template-columns:1fr}}
</style></head><body><main>
<p class="eyebrow">EquaLens Inclusion Report</p><h1>${escapeHtml(payload.pageTitle)}</h1>
<p class="meta">Reviewed page: <a href="${escapeAttribute(payload.pageUrl)}">${escapeHtml(payload.pageUrl)}</a><br>Generated ${escapeHtml(payload.generatedAt ?? "")}</p>
<section class="scores" aria-label="Inclusion scores"><div class="score"><span>Before</span><strong>${payload.scoreBefore}</strong></div><div class="score"><span>After</span><strong>${escapeHtml(after)}</strong></div></section>
<h2 class="summary">${payload.findings.length} documented finding${payload.findings.length === 1 ? "" : "s"}</h2>${findings}
<p class="footer">This report stores page metadata and findings only. Model inferences should be reviewed alongside cited evidence.</p>
</main></body></html>`;
}

function renderFinding(finding: Finding): string {
  const chips = [finding.severity, ...finding.affected, ...(finding.stereotype ? ["stereotype"] : [])];
  return `<li><h3>${escapeHtml(finding.title)}</h3><p><strong>Hidden assumption:</strong> ${escapeHtml(finding.assumption)}</p><p>${escapeHtml(finding.impact)}</p><div class="chips">${chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join("")}</div></li>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
