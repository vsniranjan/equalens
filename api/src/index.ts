import type { AnalyzeResponse, RedesignResponse } from "@equalens/shared/types";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { getOrCreateCached } from "./cache";
import { HttpError } from "./errors";
import { generateStructured } from "./gemini";
import { buildAnalyzePrompt, buildRedesignPrompt, buildScanPrompt } from "./prompts";
import { loadReport, renderReport, storeReport } from "./report";
import { FINDINGS_RESPONSE_SCHEMA, REDESIGN_RESPONSE_SCHEMA } from "./schemas";
import { protectRoute } from "./security";
import {
  parseAnalyzeRequest,
  parseFindingsResponse,
  parseRedesignRequest,
  parseRedesignResponse,
  parseReportPayload,
  parseScanRequest,
} from "./validation";

const app = new Hono<{ Bindings: Env }>();
const MAX_BODY_BYTES = 300_000;

app.use("*", async (context, next) => {
  const startedAt = performance.now();
  const requestId = crypto.randomUUID();
  await next();
  console.log(JSON.stringify({
    event: "request_complete",
    requestId,
    method: context.req.method,
    path: context.req.path,
    status: context.res.status,
    durationMs: Math.round(performance.now() - startedAt),
  }));
});

const apiCors = cors({
  origin: "*",
  allowMethods: ["POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "X-EquaLens-Key"],
  exposeHeaders: ["X-EquaLens-Cached", "Retry-After"],
  maxAge: 86_400,
});

app.use("/analyze", apiCors);
app.use("/scan", apiCors);
app.use("/redesign", apiCors);
app.use("/report", apiCors);
app.use("/analyze", protectRoute);
app.use("/scan", protectRoute);
app.use("/redesign", protectRoute);
app.use("/report", protectRoute);

app.get("/health", (context) => context.json({ service: "equalens-api", status: "ok" }));

app.post("/analyze", async (context) => {
  const request = parseAnalyzeRequest(await readJson(context));
  const result = await getOrCreateCached<AnalyzeResponse>(
    context.env.CACHE,
    "/analyze",
    request,
    context.req.query("nocache") === "1",
    async () => {
      const output = await generateStructured({
        apiKey: context.env.GEMINI_API_KEY,
        prompt: buildAnalyzePrompt(request),
        responseSchema: FINDINGS_RESPONSE_SCHEMA,
        temperature: 0.3,
      });
      return parseFindingsResponse(output, new Set([request.selector]));
    },
  );
  return context.json({ ...result.value, cached: result.cached });
});

app.post("/scan", async (context) => {
  const request = parseScanRequest(await readJson(context));
  const result = await getOrCreateCached<AnalyzeResponse>(
    context.env.CACHE,
    "/scan",
    request,
    context.req.query("nocache") === "1",
    async () => {
      const output = await generateStructured({
        apiKey: context.env.GEMINI_API_KEY,
        prompt: buildScanPrompt(request),
        responseSchema: FINDINGS_RESPONSE_SCHEMA,
        temperature: 0.3,
      });
      return parseFindingsResponse(output, new Set(request.dom.map(({ selector }) => selector)));
    },
  );

  if (context.req.header("Accept")?.includes("application/x-ndjson")) {
    const body = `${result.value.findings.map((finding) => JSON.stringify(finding)).join("\n")}\n`;
    return context.body(body, 200, {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-EquaLens-Cached": String(result.cached),
    });
  }

  return context.json({ ...result.value, cached: result.cached });
});

app.post("/redesign", async (context) => {
  const request = parseRedesignRequest(await readJson(context));
  const result = await getOrCreateCached<RedesignResponse>(
    context.env.CACHE,
    "/redesign",
    request,
    context.req.query("nocache") === "1",
    async () => {
      const output = await generateStructured({
        apiKey: context.env.GEMINI_API_KEY,
        prompt: buildRedesignPrompt(request),
        responseSchema: REDESIGN_RESPONSE_SCHEMA,
        temperature: 0.5,
      });
      return parseRedesignResponse(output, request.outerHTML);
    },
  );
  return context.json({ ...result.value, cached: result.cached });
});

app.post("/report", async (context) => {
  const payload = parseReportPayload(await readJson(context));
  const origin = new URL(context.req.url).origin;
  return context.json(await storeReport(context.env.REPORTS, origin, payload), 201);
});

app.get("/report/:id", async (context) => {
  const id = context.req.param("id");
  if (!/^[a-f0-9]{12}$/.test(id)) throw new HttpError(404, "Report not found");
  const report = await loadReport(context.env.REPORTS, id);
  if (!report) throw new HttpError(404, "Report not found");
  return context.html(renderReport(report), 200, {
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
});

app.notFound((context) => context.json({ error: "Not found" }, 404));

app.onError((error, context) => {
  const status = error instanceof HttpError ? error.status : 500;
  const publicMessage = error instanceof HttpError ? error.publicMessage : "Internal server error";
  console.error(JSON.stringify({ event: "request_error", path: context.req.path, status, errorType: error.name }));
  const response = context.json({ error: publicMessage }, status);
  response.headers.set("Cache-Control", "no-store");
  if (error instanceof HttpError && error.headers) {
    for (const [name, value] of new Headers(error.headers)) response.headers.set(name, value);
  }
  return response;
});

async function readJson(context: Context): Promise<unknown> {
  const contentLength = Number.parseInt(context.req.header("Content-Length") ?? "0", 10);
  if (contentLength > MAX_BODY_BYTES) throw new HttpError(413, "Request body too large");
  try {
    const value = await context.req.json<unknown>();
    if (JSON.stringify(value).length > MAX_BODY_BYTES) throw new HttpError(413, "Request body too large");
    return value;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Invalid JSON body");
  }
}

export { app };
export default app;
