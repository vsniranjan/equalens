import { GEMINI_MODEL, GEMINI_TIMEOUT_MS } from "./constants";
import { HttpError } from "./errors";

type GeminiSchema = Readonly<Record<string, unknown>>;

interface GenerateOptions {
  apiKey: string;
  prompt: string;
  responseSchema: GeminiSchema;
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

export async function generateStructured(options: GenerateOptions): Promise<unknown> {
  if (!options.apiKey) throw new HttpError(503, "AI service is not configured");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": options.apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: options.prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: options.responseSchema,
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new HttpError(504, "AI service timed out", error.message);
    }
    throw new HttpError(502, "AI service request failed", error instanceof Error ? error.message : "Unknown fetch failure");
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
