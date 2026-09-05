import { GEMINI_MODEL, KEY_COOLDOWN_MS } from "./constants";
import { HttpError } from "./errors";
import { createKeyRotator } from "./key-rotation";
import type { JsonSchema } from "./schemas";

interface GenerateOptions {
  apiKeys: readonly string[];
  prompt: string;
  responseSchema: JsonSchema;
  signal: AbortSignal;
}

// Gemini's responseSchema is an OpenAPI subset: uppercase type names, `nullable`
// instead of a ["x", "null"] type union, and no additionalProperties.
export function toGeminiSchema(schema: JsonSchema): JsonSchema {
  const { additionalProperties: _ignored, type, ...rest } = schema as Record<string, unknown>;
  const converted: Record<string, unknown> = { ...rest };
  if (typeof type === "string") converted.type = type.toUpperCase();
  else if (Array.isArray(type)) {
    const concrete = type.find((entry): entry is string => typeof entry === "string" && entry !== "null");
    if (concrete) converted.type = concrete.toUpperCase();
    if (type.includes("null")) converted.nullable = true;
  }
  if (rest.properties && typeof rest.properties === "object") {
    converted.properties = Object.fromEntries(
      Object.entries(rest.properties as Record<string, JsonSchema>).map(([name, value]) => [name, toGeminiSchema(value)]),
    );
  }
  if (rest.items && typeof rest.items === "object") converted.items = toGeminiSchema(rest.items as JsonSchema);
  return converted;
}

interface GeminiPart {
  text?: unknown;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
}

interface GeminiEnvelope {
  candidates?: GeminiCandidate[];
}

const rotator = createKeyRotator();

export async function generateWithGemini(options: GenerateOptions): Promise<unknown> {
  if (options.apiKeys.length === 0) throw new HttpError(503, "AI service is not configured");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  let lastRateLimit: HttpError | undefined;
  for (const apiKey of rotator.orderKeys(options.apiKeys)) {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: options.prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: toGeminiSchema(options.responseSchema),
            thinkingConfig: { thinkingLevel: "low" },
          },
        }),
        signal: options.signal,
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new HttpError(504, "AI service timed out", error.message);
      }
      throw new HttpError(502, "AI service request failed", error instanceof Error ? error.message : "Unknown fetch failure");
    }

    if (response.status === 429) {
      rotator.cooldown(apiKey, KEY_COOLDOWN_MS);
      const detail = (await response.text()).slice(0, 500);
      lastRateLimit = new HttpError(502, "AI service request failed", `Gemini returned 429: ${detail}`);
      console.warn(JSON.stringify({ event: "gemini_key_rate_limited", keySuffix: apiKey.slice(-4) }));
      continue;
    }

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new HttpError(502, "AI service request failed", `Gemini returned ${response.status}: ${detail}`);
    }

    const envelope = (await response.json()) as GeminiEnvelope;
    const text = envelope.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter((part): part is string => typeof part === "string")
      .join("");

    if (!text) throw new HttpError(502, "AI service returned no result");

    try {
      return JSON.parse(text) as unknown;
    } catch (error) {
      throw new HttpError(502, "AI response failed validation", error instanceof Error ? error.message : "Invalid structured JSON");
    }
  }

  throw lastRateLimit ?? new HttpError(502, "AI service request failed", "No Gemini key available");
}
