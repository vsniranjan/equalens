import { API_ORIGIN } from "@equalens/shared/config";
import { defineManifest } from "@crxjs/vite-plugin";

export const manifest = {
  manifest_version: 3,
  name: "EquaLens",
  description: "Reveal gendered assumptions and redesign interfaces without reducing user capability.",
  version: "0.1.0",
  permissions: ["storage", "activeTab"],
  host_permissions: [`${API_ORIGIN}/*`],
  background: {
    service_worker: "src/background.ts",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content.ts"],
      run_at: "document_idle",
    },
  ],
  action: {
    default_popup: "index.html",
    default_title: "EquaLens",
  },
} satisfies chrome.runtime.ManifestV3;

export default defineManifest(manifest);
