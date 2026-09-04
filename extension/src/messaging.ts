import type { Finding, ScanRequest } from "@equalens/shared/types";
import type { ApiPath, ApiRequestMessage, ScanStartMessage } from "./api-proxy";

interface ApiResponseMessage {
  type: "equalens:api-response";
  requestId: string;
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
}

type ScanPortMessage =
  | { type: "open"; requestId: string }
  | { type: "data"; requestId: string; finding: Finding }
  | { type: "complete"; requestId: string }
  | { type: "error"; requestId: string; status: number; error: string };

export interface ScanCallbacks {
  onOpen?: () => void;
  onFinding: (finding: Finding) => void;
  onComplete: () => void;
  onError?: (error: Error, status: number) => void;
}

export async function requestApi<Result>(path: Exclude<ApiPath, "/scan">, body: unknown): Promise<Result> {
  const requestId = crypto.randomUUID();
  const message: ApiRequestMessage = {
    type: "equalens:api-request",
    requestId,
    path,
    body,
  };
  const response: unknown = await chrome.runtime.sendMessage(message);
  if (!isApiResponse(response) || response.requestId !== requestId) {
    throw new Error("EquaLens received an invalid service worker response");
  }
  if (!response.ok) {
    throw new Error(response.error ?? `EquaLens request failed (${response.status})`);
  }
  return response.data as Result;
}

export function streamScan(request: ScanRequest, callbacks: ScanCallbacks): () => void {
  const requestId = crypto.randomUUID();
  const port = chrome.runtime.connect({ name: "equalens-scan" });

  port.onMessage.addListener((message: unknown) => {
    if (!isScanPortMessage(message) || message.requestId !== requestId) return;
    switch (message.type) {
      case "open":
        callbacks.onOpen?.();
        break;
      case "data":
        callbacks.onFinding(message.finding);
        break;
      case "complete":
        callbacks.onComplete();
        break;
      case "error":
        callbacks.onError?.(new Error(message.error), message.status);
        break;
    }
  });

  const message: ScanStartMessage = { type: "start", requestId, body: request };
  port.postMessage(message);
  return () => port.disconnect();
}

function isApiResponse(value: unknown): value is ApiResponseMessage {
  return isRecord(value)
    && value.type === "equalens:api-response"
    && typeof value.requestId === "string"
    && typeof value.ok === "boolean"
    && typeof value.status === "number";
}

function isScanPortMessage(value: unknown): value is ScanPortMessage {
  if (!isRecord(value) || typeof value.type !== "string" || typeof value.requestId !== "string") return false;
  if (value.type === "open" || value.type === "complete") return true;
  if (value.type === "data") return isRecord(value.finding);
  return value.type === "error" && typeof value.status === "number" && typeof value.error === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
