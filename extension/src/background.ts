import { attachScanPort, createApiRequestHandler } from "./api-proxy";

chrome.runtime.onMessage.addListener(createApiRequestHandler());
chrome.runtime.onConnect.addListener((port) => attachScanPort(port));

console.info(JSON.stringify({ event: "worker_ready", service: "equalens-background" }));
