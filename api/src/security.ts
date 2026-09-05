import { EQUALENS_API_KEY } from "@equalens/shared/config";
import type { Context, Next } from "hono";
import { RATE_LIMIT_WINDOW_SECONDS } from "./constants";
import { HttpError } from "./errors";

export async function protectRoute(context: Context<{ Bindings: Env }>, next: Next): Promise<Response | void> {
  if (context.req.method === "OPTIONS") return next();

  const authorized = await constantTimeEqual(context.req.header("X-EquaLens-Key") ?? "", EQUALENS_API_KEY);
  if (!authorized) throw new HttpError(401, "Unauthorized");

  await enforceRateLimit(context);
  return next();
}

async function enforceRateLimit(context: Context<{ Bindings: Env }>): Promise<void> {
  const now = Date.now();
  const ip = context.req.header("CF-Connecting-IP") ?? "unknown";
  const { success } = await context.env.API_RATE_LIMITER.limit({ key: ip });
  if (!success) {
    const retryAfter = RATE_LIMIT_WINDOW_SECONDS - Math.floor((now / 1_000) % RATE_LIMIT_WINDOW_SECONDS);
    throw new HttpError(429, "Rate limit exceeded", "Rate limit exceeded", { "Retry-After": String(retryAfter) });
  }
}

async function constantTimeEqual(received: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [receivedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(received)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const receivedBytes = new Uint8Array(receivedDigest);
  const expectedBytes = new Uint8Array(expectedDigest);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= (receivedBytes[index] ?? 0) ^ (expectedBytes[index] ?? 0);
  }
  return difference === 0;
}
