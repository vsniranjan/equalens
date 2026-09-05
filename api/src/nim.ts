import { KEY_COOLDOWN_MS, NIM_ENDPOINT, NIM_MODEL } from "./constants";
import { HttpError } from "./errors";
import { createKeyRotator } from "./key-rotation";
import type { JsonSchema } from "./schemas";

interface GenerateOptions {
  apiKeys: readonly string[];
  prompt: string;
  responseSchema: JsonSchema;
  signal: AbortSignal;
}

interface NimEnvelope {
  choices?: Array<{ message?: { content?: unknown } }>;
}

const rotator = createKeyRotator();

export async function generateWithNim(options: GenerateOptions): Promise<unknown> {
  if (options.apiKeys.length === 0) throw new HttpError(503, "AI service is not configured");

  let lastRateLimit: HttpError | undefined;
  for (const apiKey of rotator.orderKeys(options.apiKeys)) {
    let response: Response;
    try {
      response = await fetch(NIM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: NIM_MODEL,
          messages: [
            { role: "system", content: "/no_think" },
            { role: "user", content: options.prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "equalens_response", schema: options.responseSchema },
          },
          chat_template_kwargs: { enable_thinking: false },
          temperature: 0.2,
          max_tokens: 8192,
          stream: false,
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
      lastRateLimit = new HttpError(502, "AI service request failed", `NIM returned 429: ${detail}`);
      console.warn(JSON.stringify({ event: "nim_key_rate_limited", keySuffix: apiKey.slice(-4) }));
      continue;
    }

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new HttpError(502, "AI service request failed", `NIM returned ${response.status}: ${detail}`);
    }

    const envelope = (await response.json()) as NimEnvelope;
    const text = envelope.choices?.[0]?.message?.content;
    if (typeof text !== "string" || text.length === 0) throw new HttpError(502, "AI service returned no result");

    try {
      return JSON.parse(text) as unknown;
    } catch (error) {
      throw new HttpError(502, "AI response failed validation", error instanceof Error ? error.message : "Invalid structured JSON");
    }
  }

  throw lastRateLimit ?? new HttpError(502, "AI service request failed", "No NIM key available");
}
