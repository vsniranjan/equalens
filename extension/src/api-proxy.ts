import { API_ORIGIN, EQUALENS_API_KEY } from "@equalens/shared/config";
import type { Finding, ScanRequest } from "@equalens/shared/types";

const API_PATHS = ["/analyze", "/scan", "/redesign", "/report"] as const;
// Allow the Worker's 25-second AI deadline plus network overhead, while
// finishing before Chrome's 30-second service-worker fetch deadline.
const REQUEST_TIMEOUT_MS = 28_000;
const TIMEOUT_MESSAGE = "EquaLens request timed out. Please try again.";
export type ApiPath = (typeof API_PATHS)[number];

export interface ApiRequestMessage {
  type: "equalens:api-request";
  requestId: string;
  path: ApiPath;
  body: unknown;
}

export interface ScanStartMessage {
  type: "start";
  requestId: string;
  body: ScanRequest;
}

interface PortEvent<Listener extends (...args: never[]) => unknown> {
  addListener(listener: Listener): void;
}

export interface ScanPort {
  name: string;
  postMessage(message: unknown): void;
  onMessage: PortEvent<(message: unknown) => void>;
  onDisconnect: PortEvent<() => void>;
}

export function createApiRequestHandler(fetcher: typeof fetch = fetch) {
  return (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ): boolean | undefined => {
    if (!isApiRequest(message)) return undefined;
    void requestJson(message, fetcher).then(sendResponse);
    return true;
  };
}

export function attachScanPort(port: ScanPort, fetcher: typeof fetch = fetch): void {
  if (port.name !== "equalens-scan") return;
  let controller: AbortController | null = null;
  let disconnected = false;

  port.onDisconnect.addListener(() => {
    disconnected = true;
    controller?.abort();
  });

  port.onMessage.addListener((message) => {
    if (!isScanStart(message)) return;
    controller?.abort();
    controller = new AbortController();
    void relayScan(message, port, fetcher, controller.signal, () => disconnected);
  });
}

async function requestJson(message: ApiRequestMessage, fetcher: typeof fetch): Promise<Record<string, unknown>> {
  const deadline = requestDeadline();
  try {
    const response = await fetcher(`${API_ORIGIN}${message.path}`, requestInit(message.body, deadline.signal));
    const data = await response.json() as unknown;
    if (!response.ok) {
      return { type: "equalens:api-response", requestId: message.requestId, ok: false, status: response.status, error: publicError(data) };
    }
    if ((message.path === "/analyze" || message.path === "/scan")
      && (!isRecord(data) || !Array.isArray(data.findings) || !data.findings.every(isFinding) || typeof data.summary !== "string")) {
      return { type: "equalens:api-response", requestId: message.requestId, ok: false, status: 502, error: "EquaLens received an invalid analysis response. Please try again." };
    }
    return { type: "equalens:api-response", requestId: message.requestId, ok: true, status: response.status, data };
  } catch {
    return {
      type: "equalens:api-response", requestId: message.requestId, ok: false,
      status: deadline.signal.aborted ? 504 : 0,
      error: deadline.signal.aborted ? TIMEOUT_MESSAGE : "Unable to reach EquaLens",
    };
  } finally {
    deadline.clear();
  }
}

async function relayScan(
  message: ScanStartMessage,
  port: ScanPort,
  fetcher: typeof fetch,
  signal: AbortSignal,
  isDisconnected: () => boolean,
): Promise<void> {
  const deadline = requestDeadline();
  post(port, isDisconnected, { type: "open", requestId: message.requestId });
  try {
    const response = await fetcher(`${API_ORIGIN}/scan`, requestInit(message.body, AbortSignal.any([signal, deadline.signal]), "application/x-ndjson"));
    if (!response.ok) {
      const data = await safeJson(response);
      post(port, isDisconnected, {
        type: "error",
        requestId: message.requestId,
        status: response.status,
        error: publicError(data),
      });
      return;
    }

    if (response.headers.get("Content-Type")?.includes("application/json")) {
      const data = await response.json() as unknown;
      if (!isRecord(data) || !Array.isArray(data.findings)) throw new Error("Invalid scan response");
      for (const finding of data.findings) {
        if (!isFinding(finding)) throw new Error("Invalid scan finding");
        post(port, isDisconnected, { type: "data", requestId: message.requestId, finding });
      }
      post(port, isDisconnected, { type: "complete", requestId: message.requestId });
      return;
    }

    if (!response.body) throw new Error("Empty scan response");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    while (true) {
      const { done, value } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) relayLine(line, message.requestId, port, isDisconnected);
      if (done) break;
    }
    relayLine(pending, message.requestId, port, isDisconnected);
    post(port, isDisconnected, { type: "complete", requestId: message.requestId });
  } catch (error) {
    if (signal.aborted || isDisconnected()) return;
    post(port, isDisconnected, {
      type: "error",
      requestId: message.requestId,
      status: deadline.signal.aborted ? 504 : 0,
      error: deadline.signal.aborted ? TIMEOUT_MESSAGE : error instanceof Error ? "EquaLens scan response was interrupted" : "Unable to reach EquaLens",
    });
  } finally {
    deadline.clear();
  }
}

function requestDeadline(): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function relayLine(line: string, requestId: string, port: ScanPort, isDisconnected: () => boolean): void {
  if (!line.trim()) return;
  const finding: unknown = JSON.parse(line);
  if (!isFinding(finding)) throw new Error("Invalid scan finding");
  post(port, isDisconnected, { type: "data", requestId, finding });
}

function isFinding(value: unknown): value is Finding {
  if (!isRecord(value)) return false;
  const strings = [value.id, value.title, value.assumption, value.impact];
  const stringArray = (items: unknown): items is string[] => Array.isArray(items)
    && items.every((item) => typeof item === "string" && item.trim().length > 0);
  return strings.every((item) => typeof item === "string" && item.trim().length > 0)
    && (value.selector === null || typeof value.selector === "string")
    && typeof value.category === "string" && ["safety", "usability", "language"].includes(value.category)
    && typeof value.severity === "string" && ["safety-high", "safety-med", "usability-high", "usability-med", "language"].includes(value.severity)
    && typeof value.confidence === "string" && ["high", "medium", "low"].includes(value.confidence)
    && (value.source === "ai" || value.source === "heuristic")
    && typeof value.fixed === "boolean" && typeof value.redesignable === "boolean"
    && (value.stereotype === undefined || typeof value.stereotype === "boolean")
    && stringArray(value.affected) && stringArray(value.evidenceTags);
}

function post(port: ScanPort, isDisconnected: () => boolean, message: unknown): void {
  if (!isDisconnected()) port.postMessage(message);
}

function requestInit(body: unknown, signal?: AbortSignal, accept = "application/json"): RequestInit {
  const init: RequestInit = {
    method: "POST",
    headers: {
      Accept: accept,
      "Content-Type": "application/json",
      "X-EquaLens-Key": EQUALENS_API_KEY,
    },
    body: JSON.stringify(body),
  };
  if (signal) init.signal = signal;
  return init;
}

function isApiRequest(value: unknown): value is ApiRequestMessage {
  if (!isRecord(value) || value.type !== "equalens:api-request" || typeof value.requestId !== "string") return false;
  return typeof value.path === "string" && API_PATHS.includes(value.path as ApiPath) && "body" in value;
}

function isScanStart(value: unknown): value is ScanStartMessage {
  return isRecord(value) && value.type === "start" && typeof value.requestId === "string" && isRecord(value.body);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function publicError(value: unknown): string {
  return isRecord(value) && typeof value.error === "string" ? value.error : "EquaLens request failed";
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json() as unknown;
  } catch {
    return null;
  }
}
