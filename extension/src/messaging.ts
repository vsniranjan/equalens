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

export async function requestApi<Result>(path: ApiPath, body: unknown): Promise<Result> {
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
  let settled = false;
  let disconnected = false;

  const disconnect = (): void => {
    if (disconnected) return;
    disconnected = true;
    port.disconnect();
  };

  const stop = (): void => {
    settled = true;
    disconnect();
  };

  port.onMessage.addListener((message: unknown) => {
    if (settled || !isScanPortMessage(message) || message.requestId !== requestId) return;
    switch (message.type) {
      case "open":
        callbacks.onOpen?.();
        break;
      case "data":
        callbacks.onFinding(message.finding);
        break;
      case "complete":
        settled = true;
        try {
          callbacks.onComplete();
        } finally {
          disconnect();
        }
        break;
      case "error":
        settled = true;
        try {
          callbacks.onError?.(new Error(message.error), message.status);
        } finally {
          disconnect();
        }
        break;
    }
  });

  port.onDisconnect?.addListener(() => {
    if (disconnected || settled) return;
    disconnected = true;
    settled = true;
    callbacks.onError?.(new Error(chrome.runtime.lastError?.message ?? "Deep scan connection closed before completion"), 0);
  });

  const message: ScanStartMessage = { type: "start", requestId, body: request };
  try {
    port.postMessage(message);
  } catch (error) {
    stop();
    throw error;
  }
  return stop;
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
