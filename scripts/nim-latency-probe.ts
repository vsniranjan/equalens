// Temporary diagnostic: replay the real scan payload captured by e2e/demo-live.spec.ts
// against NIM models directly and report latency + token usage. Not part of the build.
import { readFileSync } from "node:fs";
import { buildScanPrompt } from "../api/src/prompts.ts";
import { FINDINGS_RESPONSE_SCHEMA } from "../api/src/schemas.ts";

const traffic = JSON.parse(readFileSync("test-results/live/demo-live-live-production-diagnostic/production-traffic.json", "utf8")) as Array<{ url: string; request: unknown }>;
const scan = traffic.find((entry) => entry.url.endsWith("/scan"))?.request;
if (!scan) throw new Error("no scan request captured");
const prompt = buildScanPrompt(scan as never);
console.log("prompt chars", prompt.length);

const [model, ...flags] = process.argv.slice(2);
const noThink = !flags.includes("--think");
const body: Record<string, unknown> = {
  model,
  messages: [...(noThink ? [{ role: "system", content: "/no_think" }] : []), { role: "user", content: prompt }],
  response_format: { type: "json_schema", json_schema: { name: "equalens_response", schema: FINDINGS_RESPONSE_SCHEMA } },
  temperature: 0.2,
  max_tokens: 8192,
  stream: false,
  ...(noThink ? { chat_template_kwargs: { enable_thinking: false } } : {}),
};
const started = performance.now();
const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NVIDIA_NIM_API_KEY_1}` },
  body: JSON.stringify(body),
});
const ms = Math.round(performance.now() - started);
const text = await response.text();
if (!response.ok) { console.log(model, "status", response.status, ms, "ms", text.slice(0, 300)); process.exit(1); }
const json = JSON.parse(text);
const content = json.choices?.[0]?.message?.content ?? "";
let findings = "PARSE FAIL";
try { findings = String(JSON.parse(content).findings?.length); } catch {}
console.log(model, "status 200", ms, "ms", "usage", JSON.stringify(json.usage), "findings", findings);
