# EquaLens — Technical Specification

Chrome extension that reveals male-centric / exclusionary design assumptions on
any webpage, explains them with evidence, and redesigns the page inclusively in
place. Built for "The World Redesigned For Her" track. 30 hours remaining;
Devin builds everything.

---

## 1. System overview

Three deployable artifacts:

```
┌─────────────────────────────────────────────────────────────┐
│  Chrome Extension (MV3, React + Vite + CRXJS, TypeScript)   │
│                                                             │
│  content script ──injects──▶ Shadow-DOM overlay (React)     │
│    • Buddy orb (docked, awakens on selection)               │
│    • Selection popup (Explain / Excluded / Evidence /       │
│      Redesign)                                              │
│    • Heatmap overlay + page dimmer                          │
│    • Slide-in findings panel + Inclusion Score              │
│    • Before/After slider for redesigns                      │
│  background service worker                                  │
│    • fetch() proxy to API (content scripts can't reliably   │
│      call cross-origin)                                     │
│    • onboarding state (chrome.storage)                      │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTPS JSON
┌──────────────▼──────────────────────────────────────────────┐
│  API — Cloudflare Worker (TypeScript, Hono or raw fetch)    │
│    POST /analyze   POST /scan   POST /redesign              │
│    GET  /report/:id                                         │
│    • Gemini API calls (structured JSON output)              │
│    • KV cache keyed by content hash (demo insurance)        │
│    • KV storage for generated reports                       │
│    • Rate limit + shared header token                       │
└──────────────┬──────────────────────────────────────────────┘
               │
        Gemini API (gemini-3.6-flash primary)

┌─────────────────────────────────────────────────────────────┐
│  Mock demo site — "Meridian Motors" (static, Vite build,    │
│  deployed to Cloudflare Workers static assets / Pages)      │
│    • Car product page: seat & restraint specs, interactive  │
│      car diagram, controls section                          │
│    • Pre-built inclusive-variant components for the         │
│      Redesign climax                                        │
└─────────────────────────────────────────────────────────────┘
```

Hosting: mock site + Worker API both deployed to Cloudflare. The extension is
loaded unpacked on the demo laptop.

Repo layout (npm workspaces, single repo):

```
hack26/
  extension/     # CRXJS + React + TS
  api/           # Cloudflare Worker + wrangler
  mock-site/     # Meridian Motors static site
  shared/        # shared TS types (Finding, ScanResult, ...)
```

---

## 2. Chrome extension

### 2.1 Manifest (MV3)

- `content_scripts`: one script, `<all_urls>`, `run_at: document_idle`.
- `background.service_worker`: API proxy + storage.
- `permissions`: `storage`, `activeTab`.
- `host_permissions`: none beyond activeTab (API calls go through the
  background worker to our own Worker URL — declared in
  `host_permissions` for the API origin only).
- No `captureVisibleTab` (image analysis is cut).

### 2.2 Shadow-DOM overlay

Content script creates one `<div id="equalens-root">` on `document.body`,
attaches `shadowRoot` (mode: open for debuggability), injects compiled CSS as a
constructed stylesheet, mounts a single React app. Everything (buddy, popup,
heatmap, panel) renders inside this one React tree. Host-page CSS cannot leak
in; ours cannot leak out. `z-index: 2147483646`, `pointer-events: none` on the
root with `pointer-events: auto` re-enabled per interactive child, so the page
stays fully usable.

### 2.3 Buddy orb

- Docked at the right page edge, vertically centered; a soft animated
  gradient orb (~44px) with idle breathing animation (CSS transforms only).
- On `selectionchange` with non-empty selection: orb glides (spring easing,
  GSAP is allowed but plain CSS transitions suffice) to the selection's
  bounding rect and the selection popup fades in beside it.
- On deselect/Escape: popup closes, orb returns to dock.
- Clicking the orb opens a mini-menu: **Scan page** · **Open panel** ·
  **Settings**.
- States: idle · attentive (near selection) · thinking (during API call,
  gentle pulse) · alert (findings exist — small badge with count).

### 2.4 Selection & element picking

- **Text**: `window.getSelection()` → selected string + `Range` bounding rect
  + closest element's CSS selector (computed by a small unique-selector util:
  id → data attributes → nth-child path).
- **Element picking**: mini-menu "Inspect element" mode; `mouseover` outlines
  hovered blocks (via a positioned overlay rect, not by touching host styles);
  click captures `outerHTML` (trimmed to 8 KB) + selector.
- The buddy mini-menu includes **Inspect element** alongside Scan page, Open
  panel, and Settings so element-picking mode is directly reachable.
- Escape cancels selection or element-picking state. Keyboard focus remains
  visible inside the overlay, and opening the buddy menu moves focus to its
  first action.
- Payload to API always includes: selected text/HTML, ~1500 chars of
  surrounding context, page title, URL, and user's interest categories.

The content/background boundary uses typed messages. One-shot API calls use
`chrome.runtime.sendMessage`; scan streaming uses a named runtime port that
relays only complete NDJSON lines and emits explicit open, data, complete, and
error messages. The background worker owns the API origin and shared header.

### 2.5 Selection popup — four actions

Compact card next to the selection, four buttons:

1. **Explain** → `POST /analyze` (mode: explain). Renders the Explain card:
   - Hidden assumption (one sentence)
   - Possible impact (severity chip: safety / usability / language)
   - Affected situations (chips: e.g. shorter reach, pregnancy, reduced grip)
   - Confidence + sources: each source labeled `evidence` (from curated
     citation library) or `inference` (model reasoning)
2. **Who might be excluded?** → same endpoint (mode: excluded); renders a
   persona-impact list.
3. **Show evidence** → renders matched entries from the curated citation
   library (see 4.4) relevant to this finding's tags; no LLM call needed if
   tags already known.
4. **Redesign** → see 2.8.

All responses stream state through a simple `loading → success | error`
machine; errors show a retry button, never a blank card.

### 2.6 Page Scan — AI report

Trigger: buddy menu → Scan page.

Content script serializes visible DOM: walks elements in viewport order,
extracts `{selector, tag, role, text (truncated), key attributes}` up to ~15 KB
of JSON. Background worker sends to `POST /scan`. Worker calls Gemini with a
structured-output schema; findings stream back (Worker uses Gemini streaming;
extension receives chunked JSON lines) and populate the heatmap and findings
panel. The panel starts empty and only displays findings from this AI report.
Every finding has `source: "ai"`.

The prompt explicitly flags paternalistic designs that claim to help women by
reducing capability. These findings use `stereotype: true`, render with a
distinct **"Stereotype"** chip, and state that remediation removes the
unsupported gender assumption without reducing features.

**Heatmap rendering:** page dims via a shadow-DOM full-viewport overlay at
55 % black; for each finding, a positioned glow rect (red/orange/blue,
severity-scaled opacity) is drawn from `getBoundingClientRect()` of the
resolved selector. Rects reposition on scroll/resize (rAF-throttled).
**Selector-miss fallback:** if `querySelector` returns null, the finding still
appears in the panel with a "location approximate" tag — never crashes, never
mis-highlights.

### 2.7 Findings panel + Inclusion Score

Slide-in panel (right side, ~380 px, in shadow DOM):

- Header: **Inclusion Score** — large number 0–100, animated ring.
- Findings list grouped by severity (safety → usability → language); each row:
  icon, title, one-line assumption, chevron → expands to full Explain card;
  hover → scrolls page to element and pulses its glow.
- Per-finding actions: **Redesign this** · **Mark fixed** (manual override).
- Footer: **Redesign all** · **Export report**.

**Score formula (deterministic, computed client-side):**

```
score = clamp(round(100 − Σ deduction(f) for unfixed findings), 0, 100)
deduction: safety-high 18 · safety-med 12 · usability-high 10 ·
           usability-med 6 · language 3
```

When a finding is fixed (redesign applied or marked fixed), its deduction is
removed and the score counts up with a ~800 ms ease-out animation + color
shift (red → amber → green bands at <50 / 50–79 / ≥80). Reproducible: same
findings ⇒ same score.

### 2.8 Redesign — hybrid mechanics

**Capability Preservation Principle (non-negotiable design rule):**
a redesign may change access, fit, wording, positioning, or adaptability, but
it may NEVER reduce information, functionality, or user control on the basis
of gender. EquaLens removes the male default; it does not "simplify for
women" — that would replace one stereotype with another. Enforced twice:
in the redesign prompt (§3.3) and by a client-side guardrail (below).

Two paths, one UX:

**Path A — LLM rewrite (works anywhere):** for text/copy/form findings,
`POST /redesign` sends the element's outerHTML + finding context; Gemini
returns `{rewritten_html, rationale}`. Client sanitizes with **DOMPurify**
(strips scripts/handlers/iframes; allow basic tags + class/style) and swaps the
element's innerHTML. A typewriter-style reveal animates text changes.

**Capability guardrail (Path A only; Path B variants are hand-authored to
comply):** before injection, a deterministic diff compares original vs
rewritten fragments — counts of interactive elements (`button`, `a[href]`,
`input`, `select`, `option`, `textarea`), table rows/cells, and total text
length. If interactive elements or table rows decreased, or text length
dropped below 70 % of the original, the rewrite is rejected and regenerated
once with the violation appended to the prompt; a second failure surfaces
"Couldn't produce a capability-preserving redesign" instead of applying it.
DOMPurify protects against unsafe HTML; the guardrail protects against
*biased* HTML.

**Path B — pre-built variants (mock site only):** Meridian Motors components
carry `data-equalens-variant="<id>"`; the extension ships a variant registry
mapping id → inclusive replacement component (adjustable seatbelt geometry
diagram, size-inclusive chart, relocated controls). Redesign on these elements
swaps to the pre-built variant while the LLM's rationale is displayed — the
narration is real AI, the pixels are pre-built. Path B renders inside the
page DOM (not shadow DOM) via a namespaced class prefix `eqx-` to avoid style
collisions.

**Before/After slider:** after any redesign, a floating control appears pinned
to the element: a draggable slider crossfades between a snapshot of the
original (captured as cloned node, absolutely positioned) and the new version;
plus an instant toggle button. "Keep" dismisses the control and marks the
finding fixed (score rises); "Revert" restores the original node (we retain the
original element reference, so SPA-safe within the session).

### 2.9 Onboarding

First-install (background `onInstalled`) opens an extension page (options-page
style, full React): 2 steps —

1. Buddy style: **Orb** (animated) or **Minimal badge** (static).
2. Interest categories (multi-select): Safety · Sizing & fit · Language ·
   Accessibility · Scan everything (default all).

Stored in `chrome.storage.sync`. Categories are sent with every API call and
bias the scan prompt's emphasis. Explicit copy: "EquaLens never asks for or
stores personal, gender, or medical information."

### 2.10 Report export

Panel → Export report: extension sends the full findings array + score +
page metadata to `POST /report`; Worker stores it in KV under a short id and
returns `https://<api>/report/<id>` — a server-rendered, print-friendly HTML
page (severity table, evidence citations, recommendations, before/after score,
EquaLens branding). "Print to PDF" covers the PDF ask with zero PDF-lib work.
This is the designer/business beat for judges.

---

## 3. API — Cloudflare Worker

TypeScript, Hono router, `wrangler.jsonc`. Bindings: `GEMINI_API_KEY`
(secret), `CACHE` (KV), `REPORTS` (KV).

### 3.1 Endpoints

| Endpoint | Purpose | Gemini call |
|---|---|---|
| `POST /analyze` | Explain / who-excluded for a selection | yes |
| `POST /scan` | Deep page scan, streams findings | yes (streaming) |
| `POST /redesign` | Inclusive HTML rewrite + rationale | yes |
| `POST /report` | Store findings, return report URL | no |
| `GET /report/:id` | Render HTML report | no |

All POST bodies and responses share types from `shared/` (`Finding`,
`ScanRequest`, `AnalyzeResponse`, …).

### 3.2 Request/response contracts (core types)

```ts
type Severity = "safety-high" | "safety-med" | "usability-high"
              | "usability-med" | "language";
type Category = "safety" | "usability" | "language";

interface Finding {
  id: string;
  selector: string | null;       // null ⇒ panel-only
  title: string;
  assumption: string;            // the hidden assumption, 1 sentence
  impact: string;
  affected: string[];            // situation chips
  category: Category;
  severity: Severity;
  confidence: "high" | "medium" | "low";
  evidenceTags: string[];        // keys into citation library
  source: "ai";
  stereotype?: boolean;          // paternalistic/stereotype design (§2.6) — renders a "Stereotype" chip
  redesignable: boolean;
  fixed: boolean;                // client-side state
}

interface RedesignResponse {
  rewritten_html: string;        // sanitized client-side before injection
  rationale: string;
  changes: string[];             // bullet list for the UI
}
```

### 3.3 Gemini integration

- Model: `gemini-3.6-flash` (stable, free-tier compatible, strong structured
  output). Config
  constant so it can be bumped to `-pro` for `/redesign` if flash quality
  disappoints.
- All calls use `responseSchema` (Gemini structured output) — no JSON parsing
  of freeform text. Use the model's default sampling because Gemini 3.6 no
  longer accepts `temperature`, `top_p`, or `top_k` controls. Set
  `thinkingLevel` to `low` to minimize latency for the interactive UI.
- Scan prompt includes: serialized DOM JSON, page URL/title, user categories,
  the citation library's tag list (model may only cite tags that exist —
  prevents fabricated citations), and instruction to return CSS selectors
  verbatim from the input (never invented).
- Redesign prompt carries the Capability Preservation Principle verbatim:
  "Never simplify functionality, reduce technical information, remove options
  or controls, or assume cognitive ability based on gender. Redesign only to
  remove documented exclusionary assumptions, preserving or increasing the
  original user's capabilities. Every interactive element, specification, and
  data point in the input must exist in the output." On guardrail rejection
  (§2.8) the retry appends the specific violation (e.g. "your rewrite removed
  2 of 5 table rows").
- Scan prompt instructs the model to flag paternalistic designs (capability
  reduced "for women") as findings with `stereotype: true` (§2.6).
- `/scan` streams: Worker consumes Gemini's streaming response, re-emits
  complete `Finding` objects as NDJSON lines.

### 3.4 KV cache (demo insurance)

- Key: `sha256(endpoint + normalized(payload.text|dom))`. On hit → return
  cached response immediately (adds `"cached": true`). On miss → call Gemini,
  store with 7-day TTL.
- Effect: every rehearsed demo interaction is served from KV in <100 ms even
  if Gemini is down or venue Wi-Fi is bad; unrehearsed judge requests go live.
- A `?nocache=1` flag exists for development.

### 3.5 Security

- Extension sends `X-EquaLens-Key: <shared token>` header; Worker rejects
  requests without it (stops random abuse of the Gemini quota; not real auth,
  documented as such).
- Rate limit: 30 req/min per IP via a KV counter.
- CORS: allow all origins (extension origin is `chrome-extension://…` and the
  mock site needs it too), restricted to our routes/methods.
- LLM HTML output is never trusted: DOMPurify on the client is the enforcement
  point.
- No user data stored; reports contain only page findings.

---

## 4. Mock demo site — "Meridian Motors"

Static site (Vite, vanilla TS + plain HTML/CSS — no framework needed),
deployed to Cloudflare. Deliberately styled as a slick, credible car
manufacturer product page — it must NOT look like a strawman.

### 4.1 Page content (single product page + minimal home)

1. Hero: "Meridian S4 — engineered for the driver."
2. **Seat & restraint section**: spec table ("Standard seat and restraint
   system — validated against the 50th-percentile adult male crash test
   dummy, 175 cm / 78 kg"), seat diagram SVG.
3. **Controls & reach section**: dashboard diagram, "controls positioned at
   standard reach distance (men's 50th percentile arm reach)".
4. **Interior comfort**: fixed seatbelt anchor height, non-adjustable lumbar,
   "one-size steering grip".
5. Configurator form: title dropdown (Mr/Mrs only) — planted scan case.
6. Footer with fake press quotes.

Every scripted demo beat is planted content that the AI scan genuinely
detects — the *analysis* is real; only the Path-B redesign pixels are pre-built.

### 4.2 Pre-built inclusive variants (Path B registry)

- `seat-restraint`: SVG diagram gains adjustable anchor points + spec table
  rewritten with 5th-percentile-female–to–95th-percentile-male validation
  range (animated morph between SVG states).
- `controls-reach`: dashboard SVG with relocated/duplicated controls +
  adjustable reach note.
- `config-form`: inclusive title/none option + body-dimension-based fit
  selector.

### 4.3 Demo choreography (revised — no Perspective Lens)

60-second script:
1. Open Meridian Motors → buddy docked, subtle.
2. Select "standard seat and restraint system…" → popup → **Explain** →
   assumption card: designed around 50th-percentile male body (evidence:
   crash-test citation, ~real "women 47 % more likely to be seriously
   injured" stat from curated library).
3. **Scan page** → AI reviews the page, then the dimmer and heatmap bloom as
   findings stream in → panel opens, Inclusion Score: e.g. **41**.
4. **Redesign all** → seat diagram morphs, specs rewrite with typewriter,
   form fixes → before/after slider on the hero finding → score counts up to
   e.g. **86**, ring turns green.
5. Switch tab to real car-manufacturer page → **Scan** → AI findings appear
   on a site we don't control ("works anywhere").
6. **Export report** → open the shareable report URL — the designer story.

### 4.4 Curated citation library

~12–15 verified entries shipped in `shared/citations.ts`:
crash-test dummy history & injury statistics, PPE fit studies, drug-dosage
trial exclusion, voice-recognition accuracy gaps, office temperature
standards, smartphone/hand size, seatbelt & pregnancy. Each:
`{tag, claim, source, year, url}`. All sources verified during build (web
search), not generated at runtime. The LLM references tags; UI renders the
full citation. This is what makes "evidence vs inference" honest.

---

## 5. Edge cases & failure handling

| Case | Behavior |
|---|---|
| Gemini error/timeout | Panel shows a friendly error with Retry and no scan findings. KV cache prevents this on rehearsed content. |
| Selector not found (SPA re-render, dynamic DOM) | Finding shown panel-only with "location approximate"; no crash. |
| SPA wipes our redesigned DOM | Session-scoped only; we keep node refs and re-apply is NOT attempted (out of scope) — demo sites don't re-render. Documented limitation. |
| Page with CSP blocking injected styles | We use constructed stylesheets in shadow DOM — unaffected by page CSP. Worker API calls go via background worker — unaffected by page CSP. |
| Very long pages | DOM serialization caps at 15 KB, viewport-first ordering; scan covers what matters. |
| Selection inside iframe | Not supported; popup shows "can't analyze embedded frames" if selection is empty in top document. |
| Double-scan | Re-scan clears previous findings and re-runs (cache makes this cheap). |
| Extension on chrome:// or store pages | Content script can't inject; no-op. |

---

## 6. Build plan (30 h)

| Block | Hours | Deliverable |
|---|---|---|
| 1. Scaffold monorepo, CRXJS extension shell, shadow-DOM mount, Worker + wrangler deploy, mock-site skeleton | 4 | Extension loads, orb renders, API hello-world deployed |
| 2. Selection capture + popup + `/analyze` (Gemini structured output) + Explain card + citation library | 5 | Wow-adjacent: real explain on selection |
| 3. Scan heatmap overlay + panel + score | 5 | AI report has a clear visual presentation |
| 4. `/scan` AI pipeline (serialize and stream) | 4 | Full AI-only scan |
| 5. Redesign Path A (LLM + DOMPurify + typewriter) + before/after slider + score animation | 4 | Killer moment, generic |
| 6. Meridian Motors full content + Path B variants (SVG morphs) | 4 | Killer moment, climax |
| 7. Onboarding + report export + KV caching + rate limit | 2 | Secondary features |
| 8. Rehearse both demo sites, warm KV cache, fix selector issues on the real car-manufacturer page, polish animations | 2 | Demo-ready |

Cut order if behind: report export → onboarding → LLM scan streaming
(fall back to single response) → Path A typewriter polish. Never cut: heatmap,
Path B climax, score animation, KV cache.

---

## 7. Explicitly out of scope (roadmap slide only)

- Perspective Lens / Human Fit Simulator (**cut in interview**)
- Image/multimodal analysis (cut)
- Save/share findings, accounts, dashboard, feedback loops (cut)
- Passive background detection (indicator is pre-triggered on demo sites only)
- Figma plugin, mobile camera scanner, web dashboard (roadmap)
