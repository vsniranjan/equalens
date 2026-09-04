export const GEMINI_MODEL = "gemini-2.5-flash";
export const GEMINI_TIMEOUT_MS = 12_000;
export const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
export const RATE_LIMIT_REQUESTS = 30;
export const RATE_LIMIT_WINDOW_SECONDS = 60;

export const PROTECTED_ROUTES = ["/analyze", "/scan", "/redesign", "/report"] as const;
