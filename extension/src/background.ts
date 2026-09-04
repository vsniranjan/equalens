chrome.runtime.onInstalled.addListener(() => {
  console.info(JSON.stringify({ event: "extension_installed", service: "equalens-background" }));
});

console.info(JSON.stringify({ event: "worker_ready", service: "equalens-background" }));
