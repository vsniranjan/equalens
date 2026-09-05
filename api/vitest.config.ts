import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          GEMINI_API_KEY_1: "test-gemini-key-1",
          GEMINI_API_KEY_2: "test-gemini-key-2",
          GEMINI_API_KEY_3: "test-gemini-key-3",
          GEMINI_API_KEY_4: "test-gemini-key-4",
          GEMINI_API_KEY_5: "test-gemini-key-5",
          GEMINI_API_KEY_6: "test-gemini-key-6",
          GEMINI_API_KEY_7: "test-gemini-key-7",
          GEMINI_API_KEY_8: "test-gemini-key-8",
          GEMINI_API_KEY_9: "test-gemini-key-9",
          GEMINI_API_KEY_10: "test-gemini-key-10",
          NVIDIA_NIM_API_KEY_1: "test-nim-key-1",
          NVIDIA_NIM_API_KEY_2: "test-nim-key-2",
          NVIDIA_NIM_API_KEY_3: "test-nim-key-3",
        },
      },
    }),
  ],
});
