# NVIDIA NIM migration — handover plan

Purpose: make the `/analyze`, `/scan`, `/redesign` endpoints in `api/` use NVIDIA NIM
as the primary LLM provider (three API keys rotated), with Gemini as automatic fallback.
This file is the single source of truth for an agent resuming this work. Work ONE step
at a time; after each step update the "Status" table below and stop until told to proceed.

## 1. Why (root cause, verified 2026-09-05)

The extension's "Deep scan paused / AI service request failed / Retry AI scan" overlay is
caused by the deployed Worker's Gemini key being **free tier and out of quota**:

```
Gemini returned 429: RESOURCE_EXHAUSTED
Quota exceeded for metric: generate_content_free_tier_requests, limit: 20, model: gemini-3.6-flash
```

Confirmed via `npx wrangler tail equalens-api --format json` (run from `api/`) while POSTing
to `https://equalens-api.ragsetu-goa-2026.workers.dev/scan?nocache=1`. Still failing after
several minutes with no other traffic → daily quota, not per-minute burst. Cached scans still
work because KV never touches Gemini. `api/src/gemini.ts` maps every non-OK upstream response to
a generic `502 "AI service request failed"`, which is what the overlay shows.

User decision: do NOT enable Gemini billing; use NIM free tier instead. Local model rejected
(RTX 4050 6 GB VRAM, and the API runs on a Cloudflare Worker, not the laptop).

## 2. Architecture facts an agent needs

- Monorepo, npm workspaces: `shared`, `extension`, `api`, `mock-site`. TypeScript everywhere.
- API = Cloudflare Worker (Hono) in `api/`. Deployed name `equalens-api`. Config `api/wrangler.jsonc`.
- Extension calls `API_ORIGIN` from `shared/src/config.ts` with header `X-EquaLens-Key`
  = `EQUALENS_API_KEY` (also in `shared/src/config.ts`). Nothing in `extension/` or `shared/`
  references Gemini — the blast radius is `api/` only.
- LLM call sites (all in `api/src/index.ts`): `/analyze`, `/scan`, `/redesign` each call
  `generateStructured({ apiKey: context.env.GEMINI_API_KEY, prompt, responseSchema, signal? })`
  from `api/src/gemini.ts`, then validate with `parseFindingsResponse` / `parseRedesignResponse`
  in `api/src/validation.ts`. `/redesign` passes a shared `AbortSignal.timeout(GEMINI_TIMEOUT_MS)`
  across up to 2 attempts.
- Schemas: `api/src/schemas.ts` (`FINDINGS_RESPONSE_SCHEMA`, `REDESIGN_RESPONSE_SCHEMA`), currently
  in Gemini's dialect (`type: "STRING"`, `nullable: true`).
- Constants: `api/src/constants.ts` (`GEMINI_MODEL = "gemini-3.6-flash"`, `GEMINI_TIMEOUT_MS = 25_000`).
- Errors: `api/src/errors.ts` `HttpError(status, publicMessage, detail?, headers?)`; status union
  is `400|401|404|413|429|502|503|504`. `AIValidationError` = 502 "AI response failed validation".
- `app.onError` in `index.ts` logs `{event:"request_error", detail}` to console (visible in tail)
  and returns only `publicMessage` to clients.
- Tests: `api/test/api.test.ts` (vitest + `@cloudflare/vitest-pool-workers`). They mock
  `globalThis.fetch` and assert on the Gemini request shape (URL contains
  `gemini-3.6-flash:generateContent`, body has `responseSchema`, `generationConfig.thinkingConfig`,
  no `"temperature"`). Bindings for tests come from `api/vitest.config.ts`
  `miniflare.bindings` (currently only `GEMINI_API_KEY`).
- `api/worker-configuration.d.ts` is generated: `cd api && npx wrangler types`. `Env` currently has
  `CACHE`, `REPORTS`, `API_RATE_LIMITER`, `GEMINI_API_KEY`.
- Secrets: `api/wrangler.jsonc` has `"secrets": { "required": ["GEMINI_API_KEY"] }`. Prod secrets via
  `cd api && npx wrangler secret put NAME`. Local: `api/.dev.vars` (gitignored, verified with
  `git check-ignore`). The user has already put these in `api/.dev.vars`:
  `NVIDIA_NIM_API_KEY_1`, `NVIDIA_NIM_API_KEY_2`, `NVIDIA_NIM_API_KEY_3` (values start `nvapi-`).
  NEVER print these. Source them with `set -a; source api/.dev.vars; set +a` when probing.
- Commands: `npm run typecheck` (root), `npm test -w api`, `cd api && npx wrangler deploy`.
- The repo has a lot of unrelated uncommitted work (extension phase 6 etc). Do not touch it and
  do not commit it as part of this task.

## 3. NIM probe results (2026-09-05, key 1, real `api/test/fixtures/scan.json` prompt)

Endpoint `https://integrate.api.nvidia.com/v1/chat/completions`, `Authorization: Bearer <key>`.
`GET /v1/models` on the key returns 81 models.

| Model | Mode | Result |
|---|---|---|
| `nvidia/nemotron-3-super-120b-a12b` | `nvext.guided_json` | **400** `unknown field guided_json` — NOT supported on hosted catalog |
| `nvidia/nemotron-3-super-120b-a12b` | `response_format: json_schema`, thinking ON (default) | 200 but 37 s, 4096 completion tokens all reasoning, JSON truncated/invalid |
| `nvidia/nemotron-3-super-120b-a12b` | `response_format: json_schema` + `chat_template_kwargs:{enable_thinking:false}` + system `/no_think` | **200, 12.9 s, valid JSON, 2 findings, selectors verbatim from allowed list** ← CHOSEN |
| `nvidia/nemotron-3.5-lightning-30b-a3b` | same, thinking off | 200, 21.5 s, valid (but emitted `severity: "language"` for a safety finding — weaker) |
| `mistralai/mistral-nemotron` | `response_format: json_schema` | 200, 13.0 s, valid |
| `nvidia/llama-3.1-nemotron-70b-instruct` | — | **404** "Function not found for account" — unusable |

No `x-ratelimit-*` headers are returned. Rate limits are unpublished (~40 RPM community figure).

Decisions:
- Primary model: `nvidia/nemotron-3-super-120b-a12b`. Fallback model idea if it misbehaves: `mistralai/mistral-nemotron`.
- Structured output: standard OpenAI `response_format: { type: "json_schema", json_schema: { name, schema } }`.
- Always send `chat_template_kwargs: { enable_thinking: false }` AND a system message `/no_think`
  (both were sent together in the successful probe; not tested separately).
- `temperature: 0.2`, `max_tokens: 8192` (redesign HTML can be up to 16k chars), `stream: false`.
- Response text = `choices[0].message.content`. Ignore `reasoning_content` if present.

## 4. Design (what to build)

1. **`api/src/schemas.ts`** → standard JSON Schema (lowercase types, `type: ["string","null"]`
   for nullable, `additionalProperties: false`). Add `toGeminiSchema(schema)` converter in
   `api/src/gemini.ts` (uppercase type, `["x","null"]` → `type:"X", nullable:true`, drop
   `additionalProperties`) so the Gemini payload shape is byte-for-byte what worked before
   (Gemini cannot be live-tested right now — quota).
2. **`api/src/constants.ts`**: add `NIM_MODEL`, `NIM_ENDPOINT`, `NIM_KEY_COOLDOWN_MS = 60_000`;
   rename `GEMINI_TIMEOUT_MS` → `AI_TIMEOUT_MS` (update `index.ts` + test import).
3. **`api/src/nim.ts`**: `generateWithNim({ apiKeys, prompt, responseSchema, signal })`.
   - Module-level round-robin counter + `Map<key, cooldownUntil>`; skip keys on cooldown.
   - On 429 from a key: mark cooldown, try the next key (each key at most once per request).
   - Non-OK → `HttpError(502, "AI service request failed", "NIM returned <status>: <detail>")`.
     Abort/Timeout → `HttpError(504, "AI service timed out")`.
   - Parse `choices[0].message.content` → `JSON.parse`; empty → 502 "AI service returned no result".
4. **`api/src/ai.ts`**: `generateStructured(env, { prompt, responseSchema, signal })`:
   - Collect NIM keys from `env.NVIDIA_NIM_API_KEY_1..3` (filter falsy).
   - Try NIM if any key; on `HttpError` with status 502 or 503 (NOT 504 — no time left) log
     `console.warn({event:"ai_provider_fallback", detail})` and call Gemini with `env.GEMINI_API_KEY`.
   - If neither provider configured → `HttpError(503, "AI service is not configured")`.
   - `signal` defaults to `AbortSignal.timeout(AI_TIMEOUT_MS)` created ONCE and shared by NIM+Gemini.
5. **`api/src/index.ts`**: replace the three `generateStructured({ apiKey: ... })` calls with
   `generateStructured(context.env, { prompt, responseSchema, signal? })`. Keep everything else.
6. **Config**: `api/wrangler.jsonc` `secrets.required` → add the three NIM key names; run
   `cd api && npx wrangler types`; add the three keys to `api/vitest.config.ts` miniflare bindings
   (dummy values like `"test-nim-key-1"`). Update `api/.dev.vars.example` with the 3 new names.
7. **Tests** (`api/test/api.test.ts`): mock responses become NIM-shaped
   (`{ choices: [{ message: { content: JSON.stringify(payload) } }] }`); assert URL contains
   `integrate.api.nvidia.com`, body has `response_format.type === "json_schema"`,
   `chat_template_kwargs.enable_thinking === false`, `model === NIM_MODEL`. Add tests:
   (a) rotates Authorization header across consecutive requests; (b) NIM 429 on all keys →
   falls back to Gemini and returns Gemini's result; (c) NIM 429 ×3 + Gemini 429 → 502 with
   `request_error` detail logged. Keep the 25 s timeout test (rename constant).
8. **Deploy**: `cd api && npx wrangler secret put NVIDIA_NIM_API_KEY_1` (×3; values from
   `.dev.vars`, e.g. `grep '^NVIDIA_NIM_API_KEY_1=' .dev.vars | cut -d= -f2- | npx wrangler secret put NVIDIA_NIM_API_KEY_1`),
   then `npx wrangler deploy`, then re-run the curl from §1 with `?nocache=1` and confirm 200 +
   findings via tail. Then remind user to pre-warm KV cache on the demo pages.

Out of scope (suggested later): map Gemini/NIM 429 to a distinct client-visible status so the
overlay can say "quota exceeded"; Ollama last-resort fallback.

## 5. Status (update after every step; one step per instruction)

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Probe NIM, choose model + output mode | DONE | See §3 |
| 2 | Schemas → standard JSON Schema + `toGeminiSchema` in gemini.ts | DONE | `api/src/schemas.ts` rewritten (exports `JsonSchema` type); `toGeminiSchema` exported from `api/src/gemini.ts` and applied at the `responseSchema:` call site. Verified converter output `toStrictEqual` the old Gemini schemas via a throwaway vitest (deleted). `npm run typecheck` (in api/) clean; `npx vitest run` 17/17 pass. |
| 3 | constants rename + `nim.ts` + `ai.ts` + wire `index.ts` | DONE | `constants.ts`: added `NIM_MODEL`, `NIM_ENDPOINT`, `NIM_KEY_COOLDOWN_MS`, renamed `GEMINI_TIMEOUT_MS`→`AI_TIMEOUT_MS`. `gemini.ts`: `generateStructured`→`generateWithGemini`, `signal` now required, no key check (moved to ai.ts). New `nim.ts` (`generateWithNim`, module-level round robin + 60 s cooldown on 429, tries each key once, logs `nim_key_rate_limited` with key suffix only). New `ai.ts` (`generateStructured(env, opts)`, `AiEnv` interface with optional key fields so it compiles before `wrangler types` is rerun; falls back NIM→Gemini on 502/503 only, logs `ai_provider_fallback`). `index.ts`: 3 call sites now `generateStructured(context.env, {...})`. Test import renamed to `AI_TIMEOUT_MS`. Typecheck clean; api.test.ts 15/15 still pass (test env has no NIM keys → Gemini path exercised unchanged). |
| 4 | wrangler.jsonc secrets, `wrangler types`, vitest bindings, .dev.vars.example | DONE | `wrangler.jsonc` `secrets.required` now lists the 3 NIM keys (the `ratelimits` block in that file's diff is the user's pre-existing change). `npx wrangler types` rerun → `Env` has `NVIDIA_NIM_API_KEY_1..3: string`. `vitest.config.ts` bindings add `test-nim-key-1..3`. `.dev.vars.example` documents the 3 names. Typecheck clean. `api.test.ts` now 11 pass / 4 fail, exactly the predicted Gemini-shape tests: "analyzes a selection…", "bypasses cache…", "returns a capability-preserving redesign", "corrects one invalid redesign…". |
| 5 | Update/add tests; `npm run typecheck`; `npm test -w api` all green | DONE | `api/test/api.test.ts`: describe renamed "AI endpoints"; added `nimResponse`, `isNimUrl`, `requestBody`, `authorization` helpers (kept `geminiResponse` for fallback tests); all generation mocks now NIM-shaped; request-shape assertions check `integrate.api.nvidia.com`, `model === NIM_MODEL`, `response_format.json_schema.schema.required`, `chat_template_kwargs.enable_thinking === false`, system `/no_think`. New tests: key rotation (3 distinct Bearer keys), 429 → next key (no key value leaked in logs), all NIM 429 → Gemini fallback (Gemini payload shape asserted, `ai_provider_fallback` logged), timeout does not fall back. Result: 20/20 pass in `api/`, root `npm run typecheck` clean. |
| 6 | Put 3 secrets, deploy, verify live `/scan?nocache=1` returns 200 via tail | DONE | `wrangler secret put` ×3 succeeded (values piped from `.dev.vars`, never echoed); `wrangler secret list` shows GEMINI + 3 NIM keys. `wrangler deploy` → version `8a615884-806e-4517-b350-74ddbe81ee6a`. Live `/scan?nocache=1` with `api/test/fixtures/scan.json`: HTTP 200, 2 findings with verbatim selectors + valid evidence tags, 8.5 s and 24.9 s on two runs (the 24.9 s one was uncomfortably close to the 25 s deadline). Tail showed only `request_complete` — no `nim_key_rate_limited`, no `ai_provider_fallback`, so NIM served directly. Cached repeat: 200 in 0.38 s. |
| 7 | Pre-warm KV cache on demo pages | DONE (cache since invalidated by step 8's provider swap only if categories/order changed — re-warm before demo) | Warmed by running the real extension: `EQUALENS_LIVE=1 npx playwright test e2e/demo-live.spec.ts` (headless Chromium, `extension/dist`, against the deployed mock site + API). Run 1: `/analyze` 200 but `/scan` **504** at the 25 s deadline. Replayed the captured scan body (`test-results/live/.../production-traffic.json` → `/tmp/scan-body.json`) directly at `/scan` → 200 in 9 s, populating KV. Run 2: full flow passed (analyze, scan, 4× redesign, report) in 24.5 s, 2 redesigns generated live. Run 3: transient `Unable to reach EquaLens` on first `/analyze` (fetch threw — network, not server; 0 API responses captured). Run 4: passed, **all 7 API responses `cached: true`**. NOTE (discovered after a real manual repro of the timeout): `cacheKey` in `api/src/cache.ts` (`stableStringify`) sorts object keys but does NOT normalize array order/content, so a different `categories` array order or any DOM diff is a cache miss even for the "same" page. Not yet fixed. |
| 8 | Swap providers: Gemini primary (up to 10 rotated keys), NIM fallback | DONE | User will supply ~10 Gemini keys; asked user 2 clarifying questions first (NIM stays as fallback; keys as `GEMINI_API_KEY_1..10`, not comma-list). Extracted `api/src/key-rotation.ts` (`createKeyRotator()`) — shared round-robin + cooldown, used by both providers via separate instances (isolate-local state, no cross-provider interference). `constants.ts`: `NIM_KEY_COOLDOWN_MS` → `KEY_COOLDOWN_MS` (shared). `gemini.ts`: `generateWithGemini` now takes `apiKeys: readonly string[]`, loops/rotates/cools down on 429 exactly like `nim.ts` (logs `gemini_key_rate_limited` with key suffix only). `ai.ts`: `AiEnv` now has `GEMINI_API_KEY_1..10` + `NVIDIA_NIM_API_KEY_1..3`; `generateStructured` tries Gemini first, falls back to NIM on 502/503 (logs `ai_provider_fallback` from:"gemini" to:"nim" — inverted from before). `wrangler.jsonc` secrets.required, `worker-configuration.d.ts` (regenerated), `vitest.config.ts` bindings (`test-gemini-key-1..10` + `test-nim-key-1..3`), `api/.dev.vars.example`, and `api/.dev.vars` (placeholders for the 10 Gemini keys) all updated. `api.test.ts`: swapped which mock/URL is primary throughout; new/renamed tests: "rotates Gemini keys across consecutive requests" (10 keys), "moves to the next Gemini key when one is rate limited", "falls back to NIM when every Gemini key is rate limited", "surfaces upstream failures" now asserts the NIM 429 detail (last provider tried). Result: 20/20 pass, typecheck clean (api/ and root). |
| 9 | Deploy real 10 Gemini keys + redeploy + live verify + re-warm cache | DONE | User confirmed all 10 real keys added to `api/.dev.vars` (verified 0 placeholder lines remaining, all values 53 chars — consistent with Gemini `AIza...` key format; values never printed to chat). `wrangler secret put GEMINI_API_KEY_1..10` ×10 succeeded. Deleted the now-dead singular `GEMINI_API_KEY` secret (old exhausted key, no longer referenced by code) — required an interactive Y/n confirmation, handled via `write_to_process`. `wrangler secret list` confirms: `GEMINI_API_KEY_1..10` + `NVIDIA_NIM_API_KEY_1..3`, no stray `GEMINI_API_KEY`. `wrangler deploy` → version `ca2a4f49-1fc1-462d-a7f0-e000956a8ccc`. Live verify: `/scan?nocache=1` 200 in 4.2s; tail showed only `request_complete`, no `gemini_key_rate_limited`/`ai_provider_fallback` — first Gemini key answered directly. FINDING: Gemini's own latency also varies — a follow-up uncached `/analyze` took 22.2s and another sequential one hit the full 25s **504** with no fallback (by design: 504 means the shared deadline is spent, nothing left to fall back with). So Gemini does NOT eliminate the latency/timeout risk documented in step 7 — it's a different provider with the same class of risk, just faster on average in this sample (4-22s vs NIM's 8-25s). Cache warm: confirmed the KV cache key is provider-agnostic (hash of request body only, `api/src/cache.ts`), so the OLD NIM-warmed cache entries are still valid after the provider swap — a direct replay of the previously-captured `/scan` body returned 200 in 0.4s (cache hit) with zero new deploy needed. Re-ran `EQUALENS_LIVE=1 npx playwright test e2e/demo-live.spec.ts`: first attempt failed (scan request never got a captured response — likely a slow/transient hiccup, extension-side timeout), second attempt **passed in 22.1s with all 7 API responses `cached: true`**. |

## 6. Log

- 2026-09-05: root cause found (Gemini free-tier quota). Probes run (§3). User chose NIM primary +
  Gemini fallback, model Nemotron latest large, 3-key round robin. No repo files modified yet for
  this task when the plan was written.
- 2026-09-05 (step 2): modified `api/src/schemas.ts`, `api/src/gemini.ts` only. Note: `npm run
  typecheck -w api` fails ("No workspaces found") — run `npm run typecheck` from inside `api/`
  instead, or `npm run typecheck -w @equalens/api` from root.
  Next: step 3 (see §4 items 2–5).
- 2026-09-05 (step 3): files touched: `api/src/constants.ts`, `api/src/gemini.ts`, `api/src/nim.ts`
  (new), `api/src/ai.ts` (new), `api/src/index.ts` (imports + 3 call sites only; the redesign
  retry loop and report nonce in the same file are the user's pre-existing uncommitted work),
  `api/test/api.test.ts` (one import rename). Important for step 5: once step 4 adds NIM keys to
  `vitest.config.ts` bindings, every existing Gemini-shaped mock will route through NIM first and
  the URL/body assertions will break — that is expected and is what step 5 fixes.
  Next: step 4 (see §4 item 6).
- 2026-09-05 (step 4): files touched: `api/wrangler.jsonc`, `api/vitest.config.ts`,
  `api/.dev.vars.example`, `api/worker-configuration.d.ts` (generated). Note `.dev.vars` is auto-loaded
  by vitest-pool-workers ("Using secrets defined in .dev.vars") but the explicit `miniflare.bindings`
  take precedence, so tests never use real keys. Step 5 guidance: in `api.test.ts`, add a
  `nimResponse(payload)` helper returning `Response.json({ choices: [{ message: { content: JSON.stringify(payload) } }] })`,
  switch the 4 failing tests (and the scan/selector/redesign-unsafe ones, which currently pass only
  via fallback) to it, rewrite the request-shape assertions for NIM (`integrate.api.nvidia.com`,
  `response_format.type === "json_schema"`, `chat_template_kwargs.enable_thinking === false`,
  `model === NIM_MODEL`), keep `toHaveBeenCalledTimes` counts at 1 per generation, and add the
  three new tests listed in §4 item 7. Because `nim.ts` keeps module-level rotation state, the
  rotation test should assert the Authorization headers of consecutive calls are distinct rather
  than assume which key comes first.
  Next: step 5.
- 2026-09-05 (step 5): only `api/test/api.test.ts` touched. Gotcha found and handled: `nim.ts`
  cooldown state is module-level and vitest-pool-workers runs all tests in one isolate, so a key
  429'd in one test is skipped in later tests. The rotation test is placed before any 429 test, and
  the two fallback tests assert "1–3 NIM calls with distinct keys, then Gemini last" instead of a
  fixed call count. If tests are ever reordered or run with `--shuffle`, that's where to look.
  Next: step 6 — needs the real keys from `api/.dev.vars`; commands in §4 item 8. Run
  `npx wrangler secret put` three times (piping the value, never echoing it), `npx wrangler deploy`,
  then the §1 curl with `?nocache=1` while `npx wrangler tail equalens-api --format json` runs.
  Expect 200 with findings; if 502, read the `request_error.detail` in the tail output.
- 2026-09-05 (step 6): deployed and verified live. No repo files changed. Open risk: NIM latency
  observed 8.5–24.9 s for a small fixture; the 25 s `AI_TIMEOUT_MS` is tight for real pages (up to
  600 DOM elements). Pre-warming the KV cache (step 7) is the mitigation; a code option is raising
  `AI_TIMEOUT_MS` (the extension has its own deadline in `extension/src/api-proxy.ts` — check it before
  raising the server one). The remaining code is uncommitted; commit only the NIM-related files
  listed in the step 2–5 log entries, not the user's unrelated extension work.
  Next: step 7.
- 2026-09-05 (step 7): cache warmed (see table). Latency evidence on the REAL scan payload
  (60 DOM elements, 15 KB body, 7,434 prompt tokens) via new diagnostic `scripts/nim-latency-probe.ts`
  (run: `set -a; source api/.dev.vars; set +a; node --experimental-strip-types scripts/nim-latency-probe.ts <model>`;
  needs a prior live run to have produced `production-traffic.json`):
  `nemotron-3-super-120b-a12b` 11.2 s / 623 completion tokens (but >25 s in live run 1 minutes earlier);
  `nemotron-3.5-lightning-30b-a3b` 24.9 s; `mistralai/mistral-nemotron` HTTP 500 after 82 s.
  Conclusion: variance is NVIDIA's shared queue, not prompt size. 25 s is a hard ceiling — the
  extension caps at 28 s (`extension/src/api-proxy.ts` `REQUEST_TIMEOUT_MS`) because of Chrome's
  30 s service-worker fetch deadline, so raising `AI_TIMEOUT_MS` alone is useless.
  Suggested (not done) follow-ups: hedged request in `ai.ts` (start Gemini if NIM has not answered
  in ~10 s, first response wins); re-run `test:demo` right before the demo to confirm all
  `cached: true`. All migration code is still UNCOMMITTED.
  (superseded by step 8 below — Gemini is now primary, not NIM)
- 2026-09-05 (step 8): user decided to reverse the architecture: Gemini becomes primary with
  ~10 rotated free-tier keys (one per Google Cloud project, all under one account — see chat
  history for the reasoning: per-project quotas, not per-account/per-key), NIM (3 keys) becomes
  the fallback. Files touched: `api/src/key-rotation.ts` (new, shared rotator factory),
  `api/src/constants.ts`, `api/src/gemini.ts` (rewritten for multi-key), `api/src/nim.ts`
  (rewritten to use the shared rotator instead of its own inline one — behavior unchanged),
  `api/src/ai.ts` (rewritten, primary/fallback swapped), `api/wrangler.jsonc`,
  `api/worker-configuration.d.ts` (regenerated), `api/vitest.config.ts`, `api/.dev.vars.example`,
  `api/.dev.vars` (10 Gemini placeholder lines added — NOT filled in yet), `api/test/api.test.ts`
  (rewritten AI endpoints block). 20/20 tests pass, typecheck clean. NOTHING DEPLOYED YET.
  BLOCKER for next step: the user has not yet pasted/added their real Gemini keys — `api/.dev.vars`
  still has `GEMINI_API_KEY_1..10=replace-with-your-google-ai-studio-key` placeholders. Do not
  attempt to deploy or run a live curl until real values are confirmed in place (check with
  `grep -c replace-with api/.dev.vars` — should be 0 for the Gemini lines once real keys are in).
  Next steps (not started):
    (a) get real keys into `api/.dev.vars` (user-provided, never pasted in chat/echoed by tools),
    (b) `cd api && npx wrangler secret put GEMINI_API_KEY_N` for N=1..10 (and re-confirm the 3 NIM
        secrets are still set — they were set in the old step 6, should still be there:
        `npx wrangler secret list`), then `npx wrangler deploy`,
    (c) redo live verification (old §"step 6" instructions still apply, same curl/tail pattern),
    (d) redo cache warm (old §"step 7", `EQUALENS_LIVE=1 npx playwright test e2e/demo-live.spec.ts`,
        repeat until all API responses show `cached: true`),
    (e) OPEN ISSUE carried over from step 7: cache key doesn't normalize array order
        (`api/src/cache.ts` `stableStringify`) — a real manual demo run can still cache-miss if
        the extension sends `categories` in a different order than the warmed request. Consider
        sorting `categories` (and any other arrays that don't have meaningful order) before
        hashing, as a follow-up.
- 2026-09-05 (step 9): deployed and re-verified. Migration is functionally complete and LIVE:
  Gemini (10 keys) primary, NIM (3 keys) fallback, deployed, demo flow passes with warm cache.
  Nothing is committed to git yet — all migration files remain uncommitted (see steps 2-3-4-5-8
  file lists above for exactly what to `git add`; do not sweep in the user's unrelated extension
  work sitting in the same working tree).
  OPEN ITEMS for a future agent/session, in priority order:
  1. Cache-key array-order bug (§ item (e) above) — real risk for manual demo runs, not yet fixed.
  2. Gemini/NIM both have highly variable per-request latency against the shared 25s deadline
     (`AI_TIMEOUT_MS`) — observed 4s to 25s+ (timeout) on the *same* small fixture, back to back.
     The mitigation discussed with the user but not implemented: a hedged request in `ai.ts`
     (fire Gemini and, if it hasn't answered in ~10s, also fire NIM; take whichever resolves
     first). This is the most direct fix for the actual failure mode, more so than swapping
     which provider is primary.
  3. Re-run `EQUALENS_LIVE=1 npx playwright test e2e/demo-live.spec.ts` once more, right before
     the real demo, to confirm all 7 responses are still `cached: true` (cache TTL is 7 days from
     original write, so this remains valid for about a week from 2026-09-05 unless the demo
     page content or `categories` selection changes).
  ALL PLANNED MIGRATION STEPS COMPLETE. Remaining work above is optional hardening.
