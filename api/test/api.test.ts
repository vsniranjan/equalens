import { reset, SELF } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EQUALENS_API_KEY } from "@equalens/shared/config";
import { GEMINI_TIMEOUT_MS } from "../src/constants";
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

function geminiResponse(payload: unknown): Response {
  return Response.json({
    candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
  });
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

describe("Gemini endpoints", () => {
  it("allows the free-tier Gemini model enough time to answer", () => {
    expect(GEMINI_TIMEOUT_MS).toBe(25_000);
  });

  it("analyzes a selection with structured output and caches the response", async () => {
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
    const geminiBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    const geminiContents = geminiBody.contents as Array<{ parts: Array<{ text: string }> }> | undefined;
    const geminiPrompt = geminiContents?.[0]?.parts[0]?.text ?? "";
    expect(JSON.stringify(geminiBody)).toContain("responseSchema");
    expect(geminiPrompt).toContain('"mode":"explain"');
    expect(geminiPrompt).toContain("73% greater odds");
    expect(String(url)).toContain("gemini-3.6-flash:generateContent");
    expect(geminiBody).toMatchObject({
      generationConfig: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: "low" },
      },
    });
    expect(JSON.stringify(geminiBody)).not.toContain('"temperature"');
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
    expect(String(fetchSpy.mock.calls[0]?.[1]?.body)).toContain("Never simplify functionality");
    expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toMatchObject({
      generationConfig: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: "low" },
      },
    });
    expect(String(fetchSpy.mock.calls[0]?.[1]?.body)).not.toContain('"temperature"');
  });

  it("surfaces upstream failures without leaking provider details", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("quota detail", { status: 429 }));

    const response = await post("/analyze?nocache=1", analyzeRequest);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "AI service request failed" });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Gemini returned 429: quota detail"));
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
});

describe("reports and rate limiting", () => {
  it("stores a report and renders escaped shareable HTML", async () => {
    const createResponse = await post("/report", { ...reportPayload, pageTitle: "Meridian <script>alert(1)</script>" });
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
