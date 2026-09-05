export const GEMINI_MODEL = "gemini-3.6-flash";
export const NIM_MODEL = "nvidia/nemotron-3-super-120b-a12b";
export const NIM_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
export const KEY_COOLDOWN_MS = 60_000;
export const AI_TIMEOUT_MS = 25_000;
export const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
export const RATE_LIMIT_REQUESTS = 30;
export const RATE_LIMIT_WINDOW_SECONDS = 60;

export const PROTECTED_ROUTES = ["/analyze", "/scan", "/redesign", "/report"] as const;
