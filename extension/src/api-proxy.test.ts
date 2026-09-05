import type { Finding, ScanRequest } from "@equalens/shared/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { attachScanPort, createApiRequestHandler, type ScanPort } from "./api-proxy";

const scanRequest: ScanRequest = {
  dom: [{ selector: "#seat", text: "Average male", html: "<p>Average male</p>" }],
  pageTitle: "Meridian S4",
  pageUrl: "https://meridian.example/",
  categories: ["safety"],
};

const finding: Finding = {
  id: "seat",
  selector: "#seat",
  title: "Male crash-test baseline",
  assumption: "One body size represents everyone.",
  impact: "Other occupants may receive less protection.",
  affected: ["smaller occupants"],
  category: "safety",
  severity: "safety-high",
  confidence: "high",
  evidenceTags: [],
  source: "ai",
  redesignable: true,
  fixed: false,
};

function listenerSlot<T extends (...args: never[]) => unknown>() {
  let listener: T | undefined;
  return {
    event: { addListener: (next: T) => { listener = next; } },
    get: () => listener!,
  };
}

describe("background API proxy", () => {
  afterEach(() => vi.useRealTimers());

  it("ends a stalled API request with a retryable timeout before Chrome expires the worker", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    }));
    const respond = vi.fn();
    createApiRequestHandler(fetcher)(
      { type: "equalens:api-request", requestId: "hung", path: "/report", body: {} },
      {}, respond,
    );
    await vi.advanceTimersByTimeAsync(28_000);
    expect(respond).toHaveBeenCalledWith(expect.objectContaining({ ok: false, status: 504, error: "EquaLens request timed out. Please try again." }));
  });

  it("ends a stalled scan without triggering the network fallback a second time", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    }));
    const messages = vi.fn();
    const incoming = listenerSlot<(message: unknown) => void>();
    const disconnected = listenerSlot<() => void>();
    const port: ScanPort = { name: "equalens-scan", postMessage: messages, onMessage: incoming.event, onDisconnect: disconnected.event };
    attachScanPort(port, fetcher);
    incoming.get()({ type: "start", requestId: "hung", body: scanRequest });
    await vi.advanceTimersByTimeAsync(28_000);
    expect(messages).toHaveBeenCalledWith(expect.objectContaining({ type: "error", status: 504 }));
  });
  it("adds the API token and returns one-shot JSON responses", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ findings: [], summary: "Clear" }));
    const handler = createApiRequestHandler(fetcher);
    const response = new Promise((resolve) => {
      expect(handler(
        { type: "equalens:api-request", requestId: "request-1", path: "/analyze", body: {} },
        {} as chrome.runtime.MessageSender,
        resolve,
      )).toBe(true);
    });

    await expect(response).resolves.toMatchObject({ ok: true, status: 200, requestId: "request-1" });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(String(url)).toContain("/analyze");
    expect(new Headers(init?.headers).get("X-EquaLens-Key")).toBeTruthy();
  });

  it("rejects incomplete findings before forwarding a response to React", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ findings: [{ id: "broken" }], summary: "Invalid" }));
    const response = new Promise((resolve) => createApiRequestHandler(fetcher)(
      { type: "equalens:api-request", requestId: "bad", path: "/scan", body: {} }, {}, resolve,
    ));
    await expect(response).resolves.toMatchObject({ ok: false, status: 502 });
  });

  it("relays only complete NDJSON findings over a named port", async () => {
    const encoder = new TextEncoder();
    const firstLine = JSON.stringify(finding);
    const secondLine = JSON.stringify({ ...finding, id: "reach", selector: "#reach" });
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(firstLine.slice(0, 30)));
        controller.enqueue(encoder.encode(`${firstLine.slice(30)}\n${secondLine}\n`));
        controller.close();
      },
    });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, {
      headers: { "Content-Type": "application/x-ndjson" },
    }));
    const messages = vi.fn();
    const incoming = listenerSlot<(message: unknown) => void>();
    const disconnected = listenerSlot<() => void>();
    const port = {
      name: "equalens-scan",
      postMessage: messages,
      onMessage: incoming.event,
      onDisconnect: disconnected.event,
    } as unknown as ScanPort;

    attachScanPort(port, fetcher);
    incoming.get()({ type: "start", requestId: "scan-1", body: scanRequest });

    await vi.waitFor(() => expect(messages).toHaveBeenCalledWith({ type: "complete", requestId: "scan-1" }));
    expect(messages.mock.calls.map(([message]) => message)).toEqual([
      { type: "open", requestId: "scan-1" },
      { type: "data", requestId: "scan-1", finding },
      { type: "data", requestId: "scan-1", finding: { ...finding, id: "reach", selector: "#reach" } },
      { type: "complete", requestId: "scan-1" },
    ]);
    expect(new Headers(fetcher.mock.calls[0]![1]?.headers).get("Accept")).toBe("application/x-ndjson");
  });

  it("relays a single JSON scan response when streaming is unavailable", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ findings: [finding], summary: "One finding" }));
    const messages = vi.fn();
    const incoming = listenerSlot<(message: unknown) => void>();
    const disconnected = listenerSlot<() => void>();
    const port = {
      name: "equalens-scan",
      postMessage: messages,
      onMessage: incoming.event,
      onDisconnect: disconnected.event,
    } as unknown as ScanPort;

    attachScanPort(port, fetcher);
    incoming.get()({ type: "start", requestId: "scan-json", body: scanRequest });

    await vi.waitFor(() => expect(messages).toHaveBeenCalledWith({ type: "complete", requestId: "scan-json" }));
    expect(messages.mock.calls.map(([message]) => message)).toEqual([
      { type: "open", requestId: "scan-json" },
      { type: "data", requestId: "scan-json", finding },
      { type: "complete", requestId: "scan-json" },
    ]);
  });
});
