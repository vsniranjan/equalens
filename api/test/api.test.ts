import { reset, SELF } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EQUALENS_API_KEY } from "@equalens/shared/config";
import { AI_TIMEOUT_MS, GEMINI_MODEL, GEMINI_PRIMARY_TIMEOUT_MS } from "../src/constants";
import analyzeRequest from "./fixtures/analyze.json";
import redesignRequest from "./fixtures/redesign.json";
import reportPayload from "./fixtures/report.json";
import scanRequest from "./fixtures/scan.json";

const API_HEADERS = {
  "Content-Type": "application/json",
  "X-EquaLens-Key": EQUALENS_API_KEY,
};

const finding = {
  id: "grip-size",
  selector: "#controls .feature-card:first-child h3",
  title: "Fixed grip assumes one hand size",
  assumption: "A single steering-wheel grip diameter works for every driver.",
  impact: "Drivers with smaller hands may have less secure control.",
  affected: ["drivers with smaller hands", "drivers with limited grip"],
  category: "usability",
  severity: "usability-high",
  confidence: "high",
  evidenceTags: [],
  source: "ai",
  redesignable: true,
  fixed: false,
};

function nimResponse(payload: unknown): Response {
  return Response.json({
    choices: [{ message: { content: JSON.stringify(payload) } }],
  });
}

function geminiResponse(payload: unknown): Response {
  return Response.json({
    candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
  });
}

function isNimUrl(url: unknown): boolean {
  return String(url).includes("integrate.api.nvidia.com");
}

function isGeminiUrl(url: unknown): boolean {
  return String(url).includes("generativelanguage.googleapis.com");
}

function requestBody(init: RequestInit | undefined): Record<string, unknown> {
  return JSON.parse(String(init?.body)) as Record<string, unknown>;
}

function post(path: string, body: unknown, headers: HeadersInit = API_HEADERS): Promise<Response> {
  return SELF.fetch(`https://equalens.test${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

afterEach(async () => {
  vi.restoreAllMocks();
  await reset();
});

describe("API boundary", () => {
  it("rejects a protected route without the shared token", async () => {
    const response = await post("/analyze", analyzeRequest, { "Content-Type": "application/json" });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("handles preflight only on an API route", async () => {
    const response = await SELF.fetch("https://equalens.test/scan", {
      method: "OPTIONS",
      headers: {
        Origin: "chrome-extension://test-extension",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "X-EquaLens-Key, Content-Type",
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toContain("POST");
    expect((await SELF.fetch("https://equalens.test/not-an-api-route", { method: "OPTIONS" })).status).toBe(404);
  });
});

describe("AI endpoints", () => {
  it("allows the free-tier models enough time to answer", () => {
    expect(GEMINI_PRIMARY_TIMEOUT_MS).toBe(18_000);
    expect(AI_TIMEOUT_MS).toBe(55_000);
  });

  it("falls back to NIM when the primary provider times out", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (isGeminiUrl(url)) throw new DOMException("Primary deadline reached", "TimeoutError");
      return nimResponse({ findings: [finding], summary: "Fallback completed the analysis." });
    });
    const response = await post("/analyze?nocache=1", analyzeRequest);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ findings: [finding], cached: false });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(isGeminiUrl(fetchSpy.mock.calls[0]?.[0])).toBe(true);
    expect(isNimUrl(fetchSpy.mock.calls[1]?.[0])).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("ai_provider_fallback"));
  });

  // Runs before any test that rate limits a key, since cooled-down keys are skipped.
  it("rotates Gemini keys across consecutive requests", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      geminiResponse({ findings: [finding], summary: "Rotation check." }),
    );

    for (let requestNumber = 0; requestNumber < 10; requestNumber += 1) {
      expect((await post("/analyze?nocache=1", analyzeRequest)).status).toBe(200);
    }

    const keys = fetchSpy.mock.calls.map(([, init]) => new Headers(init?.headers).get("x-goog-api-key"));
    expect(keys.every((key) => key?.startsWith("test-gemini-key-"))).toBe(true);
    expect(new Set(keys).size).toBe(10);
  });

  it("analyzes a selection with Gemini structured output and caches the response", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      geminiResponse({ findings: [{ ...finding, stereotype: null }], summary: "The control assumes one hand-size baseline." }),
    );

    const first = await post("/analyze", analyzeRequest);
    const secondStartedAt = performance.now();
    const second = await post("/analyze", analyzeRequest);
    const secondDuration = performance.now() - secondStartedAt;

    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toMatchObject({ findings: [finding], cached: false });
    await expect(second.json()).resolves.toMatchObject({ findings: [finding], cached: true });
    expect(secondDuration).toBeLessThan(100);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(isGeminiUrl(url)).toBe(true);
    expect(String(url)).toContain(`${GEMINI_MODEL}:generateContent`);
    const body = requestBody(init);
    const contents = body.contents as Array<{ parts: Array<{ text: string }> }>;
    expect(contents[0]?.parts[0]?.text).toContain('"mode":"explain"');
    expect(contents[0]?.parts[0]?.text).toContain("73% greater odds");
    expect(body).toMatchObject({
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: { type: "OBJECT" },
        thinkingConfig: { thinkingLevel: "low" },
      },
    });
  });

  it("bypasses cache when nocache=1 is present", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      geminiResponse({ findings: [finding], summary: "A fixed baseline is present." }),
    );

    expect((await post("/analyze?nocache=1", analyzeRequest)).status).toBe(200);
    expect((await post("/analyze?nocache=1", analyzeRequest)).status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("returns scan findings as JSON or complete NDJSON objects", async () => {
    const scanFinding = { ...finding, selector: scanRequest.dom[0]!.selector };
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      geminiResponse({ findings: [scanFinding], summary: "One safety baseline was found." }),
    );

    const jsonResponse = await post("/scan", scanRequest);
    expect(jsonResponse.status).toBe(200);
    await expect(jsonResponse.json()).resolves.toMatchObject({ findings: [scanFinding] });

    const ndjsonResponse = await post("/scan?nocache=1", scanRequest, {
      ...API_HEADERS,
      Accept: "application/x-ndjson",
    });
    expect(ndjsonResponse.headers.get("content-type")).toContain("application/x-ndjson");
    const ndjson = new TextDecoder().decode(await ndjsonResponse.arrayBuffer());
    expect(ndjson.trim().split("\n").map((line) => JSON.parse(line))).toEqual([scanFinding]);
  });

  it("rejects a model-invented selector", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      geminiResponse({ findings: [{ ...finding, selector: "#invented" }], summary: "Invalid selector." }),
    );

    const response = await post("/scan?nocache=1", scanRequest);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "AI response failed validation" });
  });

  it("returns a capability-preserving redesign", async () => {
    const redesign = {
      rewritten_html: "<section><h3>Adjustable steering grip</h3><p>Diameter: 38 mm</p><button type=\"button\">Choose trim</button></section>",
      rationale: "Adds adaptability while retaining the original control and specification.",
      changes: ["Made the grip adjustable", "Preserved the trim control and diameter specification"],
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => geminiResponse(redesign));

    const response = await post("/redesign", redesignRequest);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ...redesign, cached: false });
    const body = requestBody(fetchSpy.mock.calls[0]?.[1]);
    expect(JSON.stringify(body.contents)).toContain("Never simplify functionality");
    expect(body).toMatchObject({
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: { type: "OBJECT" },
        thinkingConfig: { thinkingLevel: "low" },
      },
    });
  });

  it("moves to the next Gemini key when one is rate limited", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(async () => new Response("slow down", { status: 429 }))
      .mockImplementationOnce(async () => geminiResponse({ findings: [finding], summary: "Second key answered." }));

    const response = await post("/analyze?nocache=1", analyzeRequest);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ findings: [finding] });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls.every(([url]) => isGeminiUrl(url))).toBe(true);
    const keyOf = (init: RequestInit | undefined) => new Headers(init?.headers).get("x-goog-api-key");
    expect(keyOf(fetchSpy.mock.calls[0]?.[1])).not.toBe(keyOf(fetchSpy.mock.calls[1]?.[1]));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("gemini_key_rate_limited"));
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining("test-gemini-key"));
  });

  it("falls back to NIM when every Gemini key is rate limited", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      isGeminiUrl(url)
        ? new Response("quota", { status: 429 })
        : nimResponse({ findings: [finding], summary: "NIM answered." }),
    );

    const response = await post("/analyze?nocache=1", analyzeRequest);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ findings: [finding], cached: false });
    // Keys cooled down by earlier tests are skipped, so Gemini attempts range from 1 to 10.
    const geminiCalls = fetchSpy.mock.calls.slice(0, -1);
    const nimCall = fetchSpy.mock.calls.at(-1);
    expect(geminiCalls.length).toBeGreaterThanOrEqual(1);
    expect(geminiCalls.length).toBeLessThanOrEqual(10);
    expect(geminiCalls.every(([url]) => isGeminiUrl(url))).toBe(true);
    const keyOf = (init: RequestInit | undefined) => new Headers(init?.headers).get("x-goog-api-key");
    expect(new Set(geminiCalls.map(([, init]) => keyOf(init))).size).toBe(geminiCalls.length);
    expect(isNimUrl(nimCall?.[0])).toBe(true);
    expect(requestBody(nimCall?.[1])).toMatchObject({
      response_format: { type: "json_schema" },
      chat_template_kwargs: { enable_thinking: false },
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("ai_provider_fallback"));
  });

  it("surfaces upstream failures without leaking provider details", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("quota detail", { status: 429 }));

    const response = await post("/analyze?nocache=1", analyzeRequest);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "AI service request failed" });
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(isNimUrl(fetchSpy.mock.calls.at(-1)?.[0])).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("NIM returned 429: quota detail"));
  });

  it("rejects unsafe or capability-reducing redesign HTML", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => geminiResponse({
      rewritten_html: "<section><script>alert(1)</script><p>Diameter: 38 mm</p></section>",
      rationale: "Removed the control.",
      changes: ["Removed interaction"],
    }));

    const response = await post("/redesign?nocache=1", redesignRequest);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "AI response failed validation" });
  });

  it("corrects one invalid redesign within the original deadline and caches only the safe result", async () => {
    const safe = {
      rewritten_html: '<section><p>Diameter: 38 mm</p><button type="button">Choose trim</button><p>Adjustable fit for different hands.</p></section>',
      rationale: "Expanded fit while retaining the measurement and control.",
      changes: ["Added adjustable fit"],
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(async () => geminiResponse({ ...safe, rewritten_html: "<p>Less detail</p>" }))
      .mockImplementationOnce(async () => geminiResponse(safe));
    const response = await post("/redesign", redesignRequest);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject(safe);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(fetchSpy.mock.calls[1]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.stringify(requestBody(fetchSpy.mock.calls[1]?.[1]).contents)).toContain("previous rewrite was rejected");
    const cached = await post("/redesign", redesignRequest);
    await expect(cached.json()).resolves.toMatchObject({ ...safe, cached: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe("reports and rate limiting", () => {
  it("rejects non-AI findings at the report boundary", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await post("/report", {
      ...reportPayload,
      findings: [{ ...finding, source: "local" }],
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "AI response failed validation" });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid source"));
  });

  it("stores a report and renders escaped shareable HTML", async () => {
    const createResponse = await post("/report", {
      ...reportPayload,
      pageTitle: "Meridian <script>alert(1)</script>",
      findings: [{ ...finding, evidenceTags: ["crash-dummy-body-range"] }],
    });
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { id: string; url: string };
    expect(created.id).toMatch(/^[a-f0-9]{12}$/);

    const reportResponse = await SELF.fetch(created.url);
    const reportHtml = await reportResponse.text();
    expect(reportResponse.status).toBe(200);
    expect(reportResponse.headers.get("content-type")).toContain("text/html");
    expect(reportHtml).toContain("Meridian &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(reportHtml).not.toContain("<script>alert(1)</script>");
    expect(reportHtml).toContain("41");
    expect(reportHtml).toContain("86");
    expect(reportHtml).toContain("Findings &amp; remediation summary");
    expect(reportHtml).toContain("Hidden assumption");
    expect(reportHtml).toContain("Fixed grip assumes one hand size");
    expect(reportHtml).toContain("Evidence &amp; sources");
    expect(reportHtml).toContain("Print / Save as PDF");
    expect(reportHtml).toContain("@media print");
    expect(reportHtml).toContain("@media(max-width:640px)");
    expect(reportHtml).toContain("never asks for or stores personal, gender, or medical information");
    expect(reportResponse.headers.get("referrer-policy")).toBe("no-referrer");
    expect(reportResponse.headers.get("x-content-type-options")).toBe("nosniff");

    const policy = reportResponse.headers.get("content-security-policy") ?? "";
    const nonce = policy.match(/script-src 'nonce-([^']+)'/)?.[1];
    expect(nonce).toMatch(/^[a-f0-9]{32}$/);
    expect(reportHtml).toContain(`<script nonce="${nonce}">`);
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it("returns 404 for an unknown report id", async () => {
    const response = await SELF.fetch("https://equalens.test/report/000000000000");
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Report not found" });
  });

  it("limits a client to 30 protected requests per minute", async () => {
    for (let requestNumber = 1; requestNumber <= 30; requestNumber += 1) {
      const response = await post("/report", reportPayload, { ...API_HEADERS, "CF-Connecting-IP": "203.0.113.44" });
      expect(response.status).toBe(201);
    }

    const blocked = await post("/report", reportPayload, { ...API_HEADERS, "CF-Connecting-IP": "203.0.113.44" });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
  });
});
