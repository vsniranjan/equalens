import { attachScanPort, createApiRequestHandler } from "./api-proxy";
import { createNavigationHandler } from "./navigation";

chrome.runtime.onMessage.addListener(createApiRequestHandler());
chrome.runtime.onMessage.addListener(createNavigationHandler());
chrome.runtime.onConnect.addListener((port) => attachScanPort(port));
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "install") return;
  void chrome.runtime.openOptionsPage().catch((error: unknown) => {
    console.error(JSON.stringify({
      event: "onboarding_open_failed",
      error: error instanceof Error ? error.message : "Unknown extension error",
    }));
  });
});

console.info(JSON.stringify({ event: "worker_ready", service: "equalens-background" }));
