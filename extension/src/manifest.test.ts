import { describe, expect, it } from "vitest";
import { manifest } from "../manifest.config";

describe("extension manifest", () => {
  it("uses the required Manifest V3 boundaries", () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual(["storage", "activeTab"]);
    expect(manifest.background).toEqual({ service_worker: "src/background.ts" });
    expect(manifest.content_scripts?.[0]).toMatchObject({
      matches: ["<all_urls>"],
      run_at: "document_idle",
    });
    expect(manifest.host_permissions).toHaveLength(1);
  });
});
