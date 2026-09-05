import { API_ORIGIN } from "@equalens/shared/config";

type NavigationMessage =
  | { type: "equalens:open-options" }
  | { type: "equalens:open-report"; url: string };

interface NavigationResponse {
  ok: boolean;
  error?: string;
}

export async function openOptionsPage(): Promise<void> {
  await requestNavigation({ type: "equalens:open-options" });
}

export async function openReportPage(url: string): Promise<void> {
  await requestNavigation({ type: "equalens:open-report", url });
}

export function createNavigationHandler(
  openOptions: () => Promise<void> = () => chrome.runtime.openOptionsPage(),
  createTab: (properties: chrome.tabs.CreateProperties) => Promise<chrome.tabs.Tab> = (properties) => chrome.tabs.create(properties),
) {
  return (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: NavigationResponse) => void,
  ): boolean | undefined => {
    if (!isNavigationMessage(message)) return undefined;
    const operation = navigate(message, openOptions, createTab);
    void operation.then(
      () => sendResponse({ ok: true }),
      (error: unknown) => sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "EquaLens could not open this page",
      }),
    );
    return true;
  };
}

async function navigate(
  message: NavigationMessage,
  openOptions: () => Promise<void>,
  createTab: (properties: chrome.tabs.CreateProperties) => Promise<chrome.tabs.Tab>,
): Promise<void> {
  if (message.type === "equalens:open-options") {
    await openOptions();
    return;
  }
  await createTab({ url: validatedReportUrl(message.url), active: true });
}

function isNavigationMessage(value: unknown): value is NavigationMessage {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "equalens:open-options") return true;
  return value.type === "equalens:open-report" && typeof value.url === "string";
}

function validatedReportUrl(value: string): string {
  const url = new URL(value);
  const api = new URL(API_ORIGIN);
  if (url.origin !== api.origin || !/^\/report\/[a-f0-9]{12}$/.test(url.pathname) || url.search || url.hash) {
    throw new Error("EquaLens rejected an invalid report URL");
  }
  return url.href;
}

async function requestNavigation(message: NavigationMessage): Promise<void> {
  const response: unknown = await chrome.runtime.sendMessage(message);
  if (!isNavigationResponse(response)) {
    throw new Error("EquaLens received an invalid navigation response");
  }
  if (!response.ok) throw new Error(response.error ?? "EquaLens could not open this page");
}

function isNavigationResponse(value: unknown): value is NavigationResponse {
  return isRecord(value)
    && typeof value.ok === "boolean"
    && (value.error === undefined || typeof value.error === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
