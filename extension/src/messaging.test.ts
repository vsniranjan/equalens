import type { Finding, ScanRequest } from "@equalens/shared/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestApi, streamScan } from "./messaging";

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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("content runtime messaging", () => {
  it("sends typed one-shot API requests through the service worker", async () => {
    const sendMessage = vi.fn().mockImplementation(async (message: { requestId: string }) => ({
      type: "equalens:api-response",
      requestId: message.requestId,
      ok: true,
      status: 200,
      data: { findings: [], summary: "Clear" },
    }));
    vi.stubGlobal("chrome", { runtime: { sendMessage } });

    await expect(requestApi("/analyze", { selection: "Average male" })).resolves.toEqual({
      findings: [],
      summary: "Clear",
    });
    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "equalens:api-request",
      path: "/analyze",
      body: { selection: "Average male" },
    }));
  });

  it("dispatches scan port events and disconnects cleanly", () => {
    const messages = listenerSlot<(message: unknown) => void>();
    const disconnect = vi.fn();
    const postMessage = vi.fn();
    const connect = vi.fn().mockReturnValue({
      name: "equalens-scan",
      postMessage,
      disconnect,
      onMessage: messages.event,
    });
    vi.stubGlobal("chrome", { runtime: { connect } });
    const onFinding = vi.fn();
    const onComplete = vi.fn();

    const stop = streamScan(scanRequest, { onFinding, onComplete });
    expect(connect).toHaveBeenCalledWith({ name: "equalens-scan" });
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "start",
      body: scanRequest,
    }));

    const requestId = (postMessage.mock.calls[0]![0] as { requestId: string }).requestId;
    messages.get()({ type: "data", requestId, finding });
    messages.get()({ type: "complete", requestId });
    expect(onFinding).toHaveBeenCalledWith(finding);
    expect(onComplete).toHaveBeenCalledOnce();

    stop();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("reports an interrupted scan so the caller can use its fallback", () => {
    const messages = listenerSlot<(message: unknown) => void>();
    const disconnects = listenerSlot<() => void>();
    const connect = vi.fn().mockReturnValue({
      name: "equalens-scan",
      postMessage: vi.fn(),
      disconnect: vi.fn(),
      onMessage: messages.event,
      onDisconnect: disconnects.event,
    });
    vi.stubGlobal("chrome", { runtime: { connect, lastError: undefined } });
    const onError = vi.fn();

    streamScan(scanRequest, { onFinding: vi.fn(), onComplete: vi.fn(), onError });
    disconnects.get()();

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: "Deep scan connection closed before completion",
    }), 0);
  });
});
