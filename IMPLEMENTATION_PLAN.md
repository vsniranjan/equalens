# EquaLens — Implementation Plan

Self-contained execution plan for building EquaLens. Written so any AI agent
(or human) can pick up any phase with zero prior conversation context.
Authoritative companion documents, all in this directory:

| File | What it is |
|---|---|
| `spec.md` | **The technical spec.** Section references below (e.g. "spec §2.6") point here. Read it first. |
| `plan.md` | Original ideation baseline (superseded by spec.md where they differ). |
| `STITCH_PROMPT.md` / `STITCH_PROMPT_EQUALENS.md` | Prompts used to generate the UI designs (reference only). |
| `meridian_motors/` | Stitch design export for the mock automaker site ("Obsidian Precision" design system). |
| `stitch_equalens_ui_design_system/` | Stitch design export for the EquaLens product UI ("EquaLens System" design system). |

---

## 0. Project context (read this even if you read nothing else)

**What:** EquaLens — a Chrome extension (Manifest V3) that detects
male-centric / exclusionary design assumptions on webpages, explains them with
verified evidence, and redesigns the page inclusively **in place**. Built for
a hackathon track ("The World Redesigned For Her") about rethinking
male-centric design. See spec §0 intro and plan.md for the narrative.

**Deliverables (3 deployables, one monorepo):**
1. `extension/` — MV3 Chrome extension, React 18 + Vite + CRXJS + TypeScript,
   UI in a Shadow-DOM overlay (spec §2).
2. `api/` — Cloudflare Worker (TypeScript + Hono) proxying Gemini
   (`gemini-3.6-flash`, structured output), with KV cache + KV report storage
   (spec §3).
3. `mock-site/` — "Meridian Motors" fake premium automaker product page that
   carries the scripted demo (spec §4).
Plus `shared/` — TS types + design tokens + curated citation library.

**Locked decisions (from a design interview — do not relitigate):**
- Demo strategy: **hybrid** — scripted wow-moments on the mock site + live
  scan on a real car-manufacturer site to prove generality.
- Backend: Cloudflare Worker + **Gemini** (not Claude/OpenAI).
- Scan: **hybrid pipeline** — instant local heuristics, then streamed LLM
  findings (spec §2.6).
- Redesign: **hybrid mechanics** — real LLM HTML rewrites anywhere (Path A) +
  pre-built inclusive variants on the mock site (Path B) (spec §2.8).
- Buddy: **docked orb that awakens on selection** — NOT a cursor follower.
- Findings UI: **injected shadow-DOM panel** — NOT Chrome sidePanel API.
- Inclusion Score: **deterministic formula** client-side (spec §2.7).
- Demo insurance: **Worker-side KV cache** keyed by content hash (spec §3.4).
- In scope: onboarding flow, report export. **Cut:** Perspective Lens /
  Human Fit Simulator, image/multimodal analysis, save/share, dashboards,
  passive background detection (spec §7).
- **Capability Preservation Principle** (spec §2.8): redesigns may change
  access, fit, wording, positioning, adaptability — never reduce
  information, functionality, or user control on the basis of gender.
  EquaLens removes the male default; it does not "simplify for women".
  This is the project's defense against the "aren't you just dumbing sites
  down for women / creating a female default?" judge challenge — answer:
  "We're not replacing a male default with a female default; we're removing
  the need for either default."
- Hosting: mock site + API both deployed to Cloudflare; extension loaded
  unpacked.

**Environment prerequisites (verify before Phase 1):**
- Node 20+, npm. TypeScript everywhere, including scripts.
- Cloudflare account, `wrangler` authenticated (`wrangler whoami`).
- `GEMINI_API_KEY` available (set as Worker secret, never client-side).
- Chrome for loading the unpacked extension.

**Version management:**
- Repo: `github.com/vsniranjan/equalens`. **Trunk-based — work directly on
  `main`.** No feature branches, no PRs: one person + one agent, so branching
  would cost time and buy nothing.
- **Commit at the end of every phase with a working build** (also a §3
  invariant). Message format: `Phase N: <what shipped>`, e.g.
  `Phase 5: heuristic scan, heatmap, findings panel, score`. **Push after
  every phase commit** — the remote is the only backup; a dead laptop with
  hours of unpushed work ends the project.
- **Tag the demo.** When the full 60-second choreography (spec §4.3) runs
  clean in Phase 9: `git tag -a demo-ready -m "Verified full demo run" &&
  git push origin demo-ready`. Keep polishing `main` afterwards; if a
  last-hour change breaks the climax, fall back to the tag in seconds
  instead of debugging in front of judges.
- **Secrets discipline** (spec §3.5) — two credentials, different rules:
  - `GEMINI_API_KEY` — **never in git.** `wrangler secret put` for prod,
    `api/.dev.vars` locally (gitignored). If it ever lands in a commit,
    rotate it in the Google console; scrubbing history does not un-leak it.
  - `X-EquaLens-Key` shared token — fine in `shared/config.ts`. It ships
    inside the extension bundle anyway, so it is abuse-friction, not auth.
- `.gitignore` covers `node_modules/`, build output (`dist/`, `.vite/`),
  `.wrangler/`, `.dev.vars`, `.env*`, and `*.local.json`. It exists before
  Phase 0 specifically because scaffolding creates `node_modules/`.
- **Not worth doing:** Git LFS (6.6 MB of design PNGs is nothing, and it
  adds a setup failure mode), conventional-commit tooling, changelogs,
  history rewriting.
- **Don't rebuild at the venue.** Keep the tested unpacked extension build
  on disk before judging.

**Verbatim "bias bait" strings** — these exact strings appear in the mock
site content AND are matched by scan heuristics AND appear in the design
mockups. Never paraphrase them; they keep design/demo/code in sync:
- "Certified against the 50th-percentile adult male crash test dummy (175 cm / 78 kg)"
- "based on 50th percentile male arm reach"
- "One-size steering grip"
- "One-size-fits-all sport seats"
- Title dropdown with only "Mr." / "Mrs."

---

## 1. Design assets — how to use the Stitch exports

Both exports are **Tailwind-CDN HTML files** (`code.html` per screen +
`screen.png` reference render + a `DESIGN.md` with full token tables).
They are **starting points, not drop-ins**. Global adaptation rules:

1. **No Tailwind CDN in production code.** Extract the token config from each
   `code.html` `<script id="tailwind-config">` into a real Tailwind build
   (mock-site) or plain CSS custom properties (extension shadow DOM).
2. **Remote images: already downloaded.** All `lh3.googleusercontent.com`
   references in every `code.html` have been replaced with local relative
   paths (venue Wi-Fi and link rot are demo killers — zero remote image
   refs remain; verify with `grep -r googleusercontent`). The saved assets:

   | Local file | Used by | Notes |
   |---|---|---|
   | `meridian_motors/assets/hero-sedan-side-view.jpg` (1376×768) | Product page hero | Full-bleed sedan studio shot |
   | `meridian_motors/assets/seat-ergonomic-diagram.jpg` (1376×768) | Seat & Restraint section | Pairs with the biased spec table |
   | `meridian_motors/assets/cockpit-reach-dashboard.jpg` (1376×768) | Controls & Reach section | Dashboard/cockpit diagram |
   | `meridian_motors/assets/profile-avatar.png` (400×80) | Nav avatar in export | Near-blank placeholder — **drop it in Phase 1**, spec's nav has no avatar |
   | `stitch_equalens_ui_design_system/assets/equalens-orb-logo.png` (88×88) | All 6 EquaLens screens | Visual reference for the orb — recreate as CSS/SVG in the extension (Phase 3), don't ship the PNG |
   | `stitch_equalens_ui_design_system/assets/scan-overlay-showroom-bg.jpg` (1408×768) | Screen 1 fake page background | Demo prop only — discarded when lifting overlay markup |
3. **Material Symbols icon font:** replace with inline SVGs in the extension
   (`@font-face` does not apply inside shadow roots from a shadow stylesheet —
   fonts must be registered in the host document, which we must not pollute).
   The mock site may keep the font via a local copy.
4. Screens 1–3 of the EquaLens export render a fake page background behind
   the overlay — **lift only the panel/popup/card markup**, discard the fake
   backgrounds (spec §export notes in STITCH_PROMPT_EQUALENS.md).

### Design system A — "Obsidian Precision" (mock site)
Source: `meridian_motors/obsidian_precision/DESIGN.md` (full token tables).
Essentials: base canvas `#0A0B0D`/`#121315`, surfaces `#14161A`→`#1C1F26`,
text white/`#C9CDD3`/`#8E95A2`, accent steel blue `#4A6FA5`, **border-radius
0 everywhere** (sharp automotive geometry), Inter (display 300 weight,
tight tracking) + JetBrains Mono for specs, uppercase eyebrows with 0.18em
tracking, depth via hairline borders (`#242831`) not shadows.
Screens: `meridian_s4_product_page/code.html` (the entire product page —
417 lines, contains all bias-bait content already), `meridian_motors_wordmark/`,
plus 3 generated hero/diagram images.

### Design system B — "EquaLens System" (extension UI, onboarding, report)
Source: `stitch_equalens_ui_design_system/equalens_system/DESIGN.md`.
Essentials: primary deep teal `#0F5257` (dark anchor `#003A3E`), canvas tint
`#EAF4F4`, white cards with 1px `#D5E3E3` borders and 8px radius, ink
`#0E1B1D`, severity tokens **red `#D64550` (safety) / amber `#E8A13C`
(usability) / blue `#3E7CB1` (language) / green `#2D936C` (resolved)** with
10%-alpha tinted chip backgrounds (4px radius, never pill-shaped), Inter for
text + Geist for labels/code/metrics, elevation via tonal layering + hairline
borders, focus rings 2px offset `#0F5257`.
Screens map 1:1 to product surfaces:
| Export dir | Product surface | Spec ref |
|---|---|---|
| `screen_1_scan_overlay_with_findings_panel/` | Findings panel + heatmap + score ring + orb badge | §2.6, §2.7 |
| `screen_2_selection_popup_with_explain_card/` | Selection popup, 4 actions, Explain card | §2.5 |
| `screen_3_redesign_result_with_before_after_slider/` | Before/After slider + score delta | §2.8 |
| `screen_4_onboarding_step_1_of_2/`, `screen_5_...` | Onboarding pages | §2.9 |
| `screen_6_exported_inclusion_report/` | Worker-rendered report page | §2.10, §3.1 |
| `equalens_glowing_teal_orb_logo/` | Buddy orb visual | §2.3 |

Severity colors and teal primary are **canonical tokens** — define once in
`shared/tokens.ts` and consume everywhere (extension CSS vars, report HTML,
mock-site variant components).

---

## 2. Phases

Phases are ordered by dependency and demo value. Each produces a working,
demoable increment. Hour figures assume the spec §6 budget (30h total);
the **cut order** if behind schedule: Phase 8 report → Phase 8 onboarding →
Phase 6 streaming (fall back to single JSON response) → typewriter polish in
Phase 7. **Never cut:** heatmap, Path B redesign climax, score animation,
KV cache.

---

### Phase 0 — Monorepo scaffold & shared foundation (~2h)

**Goal:** All three packages exist, build, and share types/tokens.

Tasks:
1. npm workspaces root (`package.json` with `workspaces: ["extension","api","mock-site","shared"]`).
2. `shared/`: plain TS package (no build step needed if consumed via TS paths):
   - `types.ts` — copy the contracts **verbatim from spec §3.2**
     (`Finding`, `Severity`, `Category`, `RedesignResponse`, plus
     `ScanRequest`, `AnalyzeRequest/Response`, `ReportPayload`).
   - `tokens.ts` — canonical colors from Design system B (§1 above) +
     severity weights for the score formula (spec §2.7):
     `safety-high 18, safety-med 12, usability-high 10, usability-med 6, language 3`.
   - `citations.ts` — placeholder module (filled in Phase 4).
3. `extension/`: Vite + CRXJS + React + TS scaffold; manifest per spec §2.1
   (`content_scripts` on `<all_urls>` at `document_idle`, background service
   worker, permissions `storage` + `activeTab`, host_permissions only for the
   API origin). Verify it loads unpacked and logs from both content script and
   background worker.
4. `api/`: `wrangler.jsonc` + Hono skeleton, bindings `CACHE` (KV),
   `REPORTS` (KV), secret `GEMINI_API_KEY`. Deploy hello-world; record the
   deployed URL in `shared/config.ts` (single source for the API origin +
   the `X-EquaLens-Key` shared token, spec §3.5).
5. `mock-site/`: Vite vanilla-TS scaffold with Tailwind (build, not CDN),
   tokens imported from Obsidian Precision DESIGN.md frontmatter.

**Verify:** `npm run build` succeeds in all workspaces; extension loads in
Chrome; `curl <api>/health` returns 200; mock-site dev server renders.

---

### Phase 1 — Meridian Motors mock site (~3h)

**Goal:** The demo stage exists and is deployed. (Spec §4)

Tasks:
1. Adapt `meridian_motors/meridian_s4_product_page/code.html` into
   `mock-site/` (convert CDN Tailwind → build Tailwind; copy the already-
   downloaded images from `meridian_motors/assets/` — see §1 asset table —
   into `mock-site/public/assets/`; keep layout & copy). The export already
   contains the required biased content — **verify every bias-bait string
   from §0 survives verbatim** and matches spec §4.1's section list (hero,
   seat & restraint spec table, controls & reach, interior comfort,
   configurator form with Mr./Mrs.-only dropdown, footer press quotes).
2. Add the minimal home page (spec §4.1 item 1 / STITCH_PROMPT.md screen 1.2)
   — low effort, skip if tight.
3. Tag Path-B redesign targets with `data-equalens-variant` attributes:
   `seat-restraint`, `controls-reach`, `config-form` (spec §4.2). The
   variants themselves are built in Phase 7 — only the anchors go in now.
4. Deploy to Cloudflare (Workers static assets or Pages). Record URL.

**Verify:** Deployed page visually matches
`meridian_motors/meridian_s4_product_page/screen.png`; all images local;
Lighthouse loads with no external requests except fonts; bias strings present
in DOM text (grep the built HTML).

---

### Phase 2 — API Worker: Gemini integration (~3h)

**Goal:** All AI endpoints live. (Spec §3)

Tasks:
1. Endpoints per spec §3.1: `POST /analyze`, `POST /scan`, `POST /redesign`,
   `POST /report`, `GET /report/:id`.
2. Gemini calls (spec §3.3): model constant `gemini-3.6-flash`; **always**
   use `responseSchema` structured output (no freeform JSON parsing) and the
   model's default sampling (Gemini 3.6 no longer accepts sampling controls).
   Use `thinkingLevel: low` to keep interactive requests inside the Worker
   deadline. Scan prompt rules:
   selectors must be echoed verbatim from input, never invented; model may
   only cite evidence tags that exist in the citation library tag list
   (passed in the prompt); user interest categories bias emphasis; flag
   paternalistic designs (capability reduced "for women") with
   `stereotype: true`. Redesign prompt carries the Capability Preservation
   Principle text verbatim from spec §3.3 (never remove
   functionality/information/options; every interactive element and data
   point in the input must exist in the output), and accepts an optional
   violation note for guardrail-rejection retries.
3. `/scan` streaming: consume Gemini streaming, re-emit complete `Finding`
   objects as NDJSON lines (spec §3.3). Implement non-streaming JSON mode
   first, add streaming as an upgrade (this is the Phase 6 fallback).
4. KV cache (spec §3.4): key `sha256(endpoint + normalized payload)`; 7-day
   TTL; `cached: true` marker; `?nocache=1` bypass.
5. Security (spec §3.5): require `X-EquaLens-Key` header; KV-counter rate
   limit 30 req/min/IP; permissive CORS restricted to our routes.

**Verify:** `curl` each endpoint with fixture payloads (write
`api/test/fixtures/*.json` — a selection payload and a serialized-DOM payload
from the mock site). Confirm: valid `Finding[]` with real selectors; cache
hit on second identical call (<100ms); 401 without header; schema-valid
redesign HTML.

---

### Phase 3 — Extension shell: overlay, orb, selection capture (~3h)

**Goal:** EquaLens visibly exists on any page. (Spec §2.2–2.4)

Tasks:
1. Shadow-DOM mount (spec §2.2): single `#equalens-root` on `document.body`,
   open shadow root, **constructed stylesheets** (CSP-immune), one React
   tree, `z-index: 2147483646`, `pointer-events: none` root with per-child
   re-enable. CSS custom properties from `shared/tokens.ts`.
2. Buddy orb (spec §2.3): docked right edge; visual from
   `equalens_glowing_teal_orb_logo/` export (recreate as CSS/SVG gradient
   orb — don't ship a PNG); states idle / attentive / thinking / alert-badge;
   CSS-transform animations only. Click → mini-menu: Scan page · Open panel ·
   Settings. On selection, orb glides to the selection rect (CSS transition
   with spring-ish easing is sufficient; GSAP allowed but optional).
3. Selection capture (spec §2.4): `selectionchange` listener → selected text,
   `Range` bounding rect, unique-selector util (id → data-attrs → nth-child
   path). Element-picking "Inspect" mode: overlay outline rect on hover
   (never touch host styles), click captures `outerHTML` trimmed to 8 KB.
4. Background worker fetch proxy: content script → `chrome.runtime.sendMessage`
   → background `fetch` to API with the shared header. Include NDJSON
   streaming relay (port-based messaging) — needed in Phase 6.

**Verify:** Load on the deployed mock site AND on a real car-manufacturer
page: orb renders, doesn't break page interaction, glides to selections,
selector util returns selectors that `querySelector` resolves back to the
same element. Test one CSP-strict site (e.g. github.com) to confirm the
constructed-stylesheet approach holds.

---

### Phase 4 — Selection popup, Explain flow & citation library (~4h)

**Goal:** First real AI moment: select biased text → evidence-backed
explanation. (Spec §2.5, §4.4)

Tasks:
1. **Citation library** (`shared/citations.ts`, spec §4.4): 12–15 entries
   `{tag, claim, source, year, url}` covering crash-test dummy history &
   the "belted female occupants had 73% greater odds of serious injury"
   statistic (University of Virginia, 2019), PPE fit, drug-trial exclusion,
   voice-recognition gaps, office temperature standards, smartphone/hand
   size, seatbelt & pregnancy. **Verify each claim + source via web search
   during this phase** — the honesty of "verified source" badges depends on
   it. Pass the tag list to the Worker prompts (Phase 2 already reads it).
2. Selection popup UI from `screen_2_selection_popup_with_explain_card/`:
   compact card, 4 pill actions — **Explain · Who's excluded? · Evidence ·
   Redesign** (Redesign button wired in Phase 7).
3. Explain card per spec §2.5: hidden assumption → severity chip → affected
   situation chips → evidence rows with `verified source` vs `AI inference`
   badges → confidence footer. `loading → success | error` state machine
   with retry; never a blank card.
4. "Who's excluded?" renders the persona-impact list (same endpoint,
   mode: excluded). "Evidence" renders citation-library matches by tag
   (no LLM call when tags are known).

**Verify:** On the mock site, select the 50th-percentile restraint sentence →
Explain card shows the crash-test citation with verified badge. On an
arbitrary page, select neutral text → graceful "no significant assumption
found" state (make sure the prompt/schema allows a null finding).

---

### Phase 5 — Scan: heuristics, heatmap, findings panel, score (~4h)

**Goal:** The Scan wow-moment, working fully offline. (Spec §2.6 phase 1, §2.7)

Tasks:
1. Heuristic engine (spec §2.6 table): pure functions over the DOM emitting
   `Finding`s with `source: "heuristic"` — exclusionary sizing copy
   ("one-size-fits-all", "unisex" w/o size range, "standard fit"),
   binary/limited forms (Mr/Mrs-only selects, M/F radios), male-default
   language ("he/his" generic, "manpower", "chairman"), safety-spec keywords
   ("50th percentile", "average male", "standard crash test"), accessibility
   (click targets <24px, unlabeled inputs), **paternalistic/stereotype
   design** ("simplified for women", "female-friendly" meaning fewer
   options, "ladies' edition") → `stereotype: true`, rendered with a
   distinct "Stereotype" chip (spec §2.6). Deterministic severities.
2. Heatmap overlay (spec §2.6): 55% black dimmer + positioned glow rects
   (severity color, from `getBoundingClientRect`), rAF-throttled reposition
   on scroll/resize. **Selector-miss fallback:** finding without resolvable
   selector → panel-only with "location approximate" tag. Visual reference:
   `screen_1_scan_overlay_with_findings_panel/` (glow + pinned severity chips).
3. Findings panel (spec §2.7, same screen export): 380px slide-in, score
   ring header, findings grouped safety→usability→language, row hover
   scrolls-to + pulses element, row expand = full Explain card, per-finding
   "Redesign this" / "Mark fixed", footer "Redesign all" / "Export report".
4. Score (spec §2.7): deterministic formula from `shared/tokens.ts` weights;
   ring color bands <50 red / 50–79 amber / ≥80 green; ~800ms ease-out
   count-up on change. "Mark fixed" must already move the score.

**Verify:** Scan the mock site with the network disabled — heuristics alone
produce ≥4 findings, heatmap anchors correctly, score computes (expect ~41
per the demo script), marking fixed animates the score up. Re-scan clears
and re-runs (spec §5).

---

### Phase 6 — LLM deep scan with streaming merge (~3h)

**Goal:** Scan feels fast AND smart. (Spec §2.6 phase 2)

Tasks:
1. DOM serializer: viewport-order walk emitting
   `{selector, tag, role, text (truncated), key attrs}` capped at 15 KB JSON
   (spec §2.6, §5 long-page row).
2. Wire `POST /scan` through the background-worker streaming relay; parse
   NDJSON `Finding`s as they arrive; merge by selector (AI enriches
   heuristic hits, new hotspots fade in live); score recomputes per arrival.
3. Fallback: if streaming is flaky, single-response mode (Phase 2 already
   supports it) — a spinner on the panel is acceptable; dead heatmap is not
   (heuristics already lit it in Phase 5).

**Verify:** Mock site scan: heuristic hits <50ms, AI findings stream in
after; real car-manufacturer site scan produces sensible findings on markup
we don't control; Gemini failure (kill network after heuristic pass) leaves
a usable heuristic-only panel + error toast with retry (spec §5).

---

### Phase 7 — Redesign: Path A + Path B, before/after, score payoff (~5h)

**Goal:** The demo climax. (Spec §2.8, §4.2)

Tasks:
1. **Path A (anywhere):** `POST /redesign` → sanitize `rewritten_html` with
   DOMPurify (strip scripts/handlers/iframes; allow basic tags +
   class/style) → swap element innerHTML with a typewriter reveal on changed
   text. Keep the original node reference for revert (spec §2.8, §5 SPA row —
   session-scoped only, no re-apply on SPA re-render, documented limitation).
2. **Capability guardrail** (spec §2.8, Path A only): before injection,
   deterministic diff of original vs rewritten fragment — counts of
   interactive elements (`button`, `a[href]`, `input`, `select`, `option`,
   `textarea`), table rows/cells, total text length. Fewer
   interactive/table elements, or text <70% of original ⇒ reject and
   regenerate once with the violation appended to the prompt; second
   failure ⇒ "Couldn't produce a capability-preserving redesign" error
   state, nothing applied. DOMPurify catches unsafe HTML; this catches
   *biased* HTML (a redesign that "simplifies for women" is a bug).
3. **Path B (mock site):** variant registry keyed by `data-equalens-variant`
   (anchors placed in Phase 1). Build the three inclusive variants per spec
   §4.2 — `seat-restraint` (SVG anchor-point morph + spec table rewritten to
   "5th-percentile female to 95th-percentile male anthropometric range"),
   `controls-reach` (relocated/duplicated controls diagram), `config-form`
   (inclusive title options + body-dimension fit selector). Render into the
   page DOM (not shadow) with `eqx-` class namespace. The LLM rationale is
   still fetched and displayed — real AI narration over pre-built pixels.
4. Before/After control from
   `screen_3_redesign_result_with_before_after_slider/`: draggable divider
   crossfading original-node snapshot vs new version + instant toggle;
   "Keep change" (marks fixed → score counts up, e.g. 41 → 86 with "+45"
   indicator per the mockup) and "Revert" (restores original node).
5. "Redesign all" panel action: sequential Path B/A application with
   staggered animation — this is the 60-second-demo beat 4 (spec §4.3).

**Verify:** Full demo choreography spec §4.3 runs end-to-end on the deployed
mock site: explain → scan → redesign all → slider → score 41→86 green.
Path A alone verified on a real page (select marketing copy → rewrite →
sanitized swap → revert works). Guardrail verified with a forced-failure
fixture: feed the diff checker a rewrite that drops a `<select>` option and
confirm rejection + regeneration; confirm the Mr./Mrs. form redesign passes
(options *increase*).

---

### Phase 8 — Onboarding & Inclusion Report (~3h)

**Goal:** Secondary features that carry the privacy story and the
business/designer story. (Spec §2.9, §2.10)

Tasks:
1. Onboarding (spec §2.9): `onInstalled` → extension page; step 1 buddy
   style (Orb / Minimal badge), step 2 interest categories (Safety ·
   Sizing & fit · Language · Accessibility · Scan everything, default all);
   `chrome.storage.sync`; categories flow into every API payload (already
   plumbed in Phases 2/4). Include the verbatim privacy line: "EquaLens
   never asks for or stores personal, gender, or medical information."
   UI from `screen_4_...` / `screen_5_...` exports.
2. Report (spec §2.10, §3.1): panel "Export report" → `POST /report`
   (findings + score before/after + page metadata) → KV under short id →
   `GET /report/:id` returns server-rendered print-friendly HTML styled per
   `screen_6_exported_inclusion_report/` (teal band header, Before/After
   score rings, severity/finding/assumption/recommendation/status table,
   numbered evidence sources, "Print / Save as PDF" button). Inline CSS with
   the shared tokens — no client JS needed.

**Verify:** Fresh extension install triggers onboarding; chosen categories
appear in API request payloads; exported report URL opens on a phone
(share-ability) and prints cleanly.

---

### Phase 9 — Demo hardening & rehearsal (~2h, do not skip)

**Goal:** The demo cannot fail. (Spec §4.3, §3.4, §5)

Tasks:
1. **Warm the KV cache:** run every scripted interaction (spec §4.3 beats
   1–6) against production twice; confirm `cached: true` on the second pass.
2. Rehearse the real-site half on the chosen car-manufacturer page; fix
   selector anchoring issues; confirm the selector-miss fallback path renders.
3. Failure drills per spec §5: kill network mid-scan (heuristics survive),
   Gemini 25s timeout (error + retry UI), double-scan, iframe selection
   message, chrome:// no-op.
4. Polish pass: orb glide, heatmap bloom stagger, score count-up, typewriter
   pacing — motion is the wow multiplier, but only after everything works.
5. Update `AGENTS.md` at repo root with build/dev/deploy/test commands
   learned during the build.

**Verify:** Run the full 60-second demo (spec §4.3) three times in a row
with zero failures, once with Wi-Fi throttled to 3G.

---

## 3. Cross-phase invariants

- **Types come from `shared/` only** — no redefining `Finding` locally.
- **Severity colors/weights come from `shared/tokens.ts` only.**
- **LLM HTML is never injected unsanitized** — DOMPurify at the client is the
  enforcement point (spec §3.5).
- **Capability Preservation Principle** (spec §2.8): no redesign may reduce
  information, functionality, or user control on the basis of gender —
  enforced by the redesign prompt (spec §3.3) and the Path A capability
  guardrail (Phase 7 task 2). Paternalistic "simplified for women" designs
  are themselves flagged as findings (`stereotype: true`, spec §2.6).
- **Selectors are echoed, never invented** by the LLM; every selector is
  `querySelector`-verified before highlighting (spec §3.3, §2.6).
- **Evidence honesty:** `verified source` badge ⇢ citation library entry;
  everything else is labeled `AI inference` (spec §2.5, §4.4).
- Extension UI stays in the shadow root; only Path B variants (namespaced
  `eqx-`) and Path A swaps touch the host DOM (spec §2.2, §2.8).
- No personal/gender/medical data collected anywhere (spec §2.9).
- Commit at the end of every phase with a working build.
