import { AI_TIMEOUT_MS } from "./constants";
import { HttpError } from "./errors";
import { generateWithGemini } from "./gemini";
import { generateWithNim } from "./nim";
import type { JsonSchema } from "./schemas";

export interface AiEnv {
  GEMINI_API_KEY_1?: string;
  GEMINI_API_KEY_2?: string;
  GEMINI_API_KEY_3?: string;
  GEMINI_API_KEY_4?: string;
  GEMINI_API_KEY_5?: string;
  GEMINI_API_KEY_6?: string;
  GEMINI_API_KEY_7?: string;
  GEMINI_API_KEY_8?: string;
  GEMINI_API_KEY_9?: string;
  GEMINI_API_KEY_10?: string;
  NVIDIA_NIM_API_KEY_1?: string;
  NVIDIA_NIM_API_KEY_2?: string;
  NVIDIA_NIM_API_KEY_3?: string;
}

interface GenerateOptions {
  prompt: string;
  responseSchema: JsonSchema;
  signal?: AbortSignal;
}

function definedKeys(...keys: Array<string | undefined>): string[] {
  return keys.filter((key): key is string => typeof key === "string" && key.length > 0);
}

export function geminiApiKeys(env: AiEnv): string[] {
  return definedKeys(
    env.GEMINI_API_KEY_1, env.GEMINI_API_KEY_2, env.GEMINI_API_KEY_3, env.GEMINI_API_KEY_4, env.GEMINI_API_KEY_5,
    env.GEMINI_API_KEY_6, env.GEMINI_API_KEY_7, env.GEMINI_API_KEY_8, env.GEMINI_API_KEY_9, env.GEMINI_API_KEY_10,
  );
}

export function nimApiKeys(env: AiEnv): string[] {
  return definedKeys(env.NVIDIA_NIM_API_KEY_1, env.NVIDIA_NIM_API_KEY_2, env.NVIDIA_NIM_API_KEY_3);
}

// Gemini is primary (up to 10 rotated free-tier keys); NIM takes over when every Gemini
// key is rate limited or failing. A 504 means the shared deadline is already spent, so
// there is nothing left to fall back with.
export async function generateStructured(env: AiEnv, options: GenerateOptions): Promise<unknown> {
  const signal = options.signal ?? AbortSignal.timeout(AI_TIMEOUT_MS);
  const geminiKeys = geminiApiKeys(env);
  const nimKeys = nimApiKeys(env);

  if (geminiKeys.length > 0) {
    try {
      return await generateWithGemini({ apiKeys: geminiKeys, prompt: options.prompt, responseSchema: options.responseSchema, signal });
    } catch (error) {
      const recoverable = error instanceof HttpError && (error.status === 502 || error.status === 503);
      if (!recoverable || nimKeys.length === 0) throw error;
      console.warn(JSON.stringify({ event: "ai_provider_fallback", from: "gemini", to: "nim", detail: error.message }));
    }
  }

  if (nimKeys.length === 0) throw new HttpError(503, "AI service is not configured");
  return generateWithNim({ apiKeys: nimKeys, prompt: options.prompt, responseSchema: options.responseSchema, signal });
}
