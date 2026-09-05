# EquaLens — Plan (baseline from ideation)

## Track
"The World Redesigned For Her" — surface male-centric design biases in everyday
products/systems and propose inclusive redesigns that work better for everyone.

## Product
**EquaLens** — a Chrome extension (Manifest V3) acting as an Inclusive Design
Copilot. A small companion ("buddy") lives on any webpage; the user can select
content, scan pages for design bias, view evidence-backed explanations, and
watch the page get redesigned inclusively in place.

## Core user flow
1. **Install & onboard** — choose buddy style (character or minimal icon);
   pick interest categories: safety, sizing, language, accessibility, or
   scan-everything. No personal gender/medical data collected.
2. **Browse normally** — extension stays minimized at page edge; a small
   indicator changes only when something is worth reviewing.
3. **Select an item** — highlight text, click an image/spec, or open the buddy.
   Compact popup with four actions: **Explain · Who might be excluded? ·
   Show evidence · Redesign**.
4. **Explain card** — hidden assumption → possible impact → affected
   situations → confidence & sources (evidence vs AI inference distinguished).
5. **Scan page** — page dims, color-coded heatmap overlays:
   red = safety, orange = usability/exclusion, blue = language/representation.
   Side panel lists findings by severity.
6. **Perspective Lens (Human Fit Simulator)** — adjust height, reach, hand
   size, vision, mobility; interface shows which controls/info/product
   dimensions become difficult, with narrated reasoning (explicitly not
   claiming to simulate lived experience).
7. **Redesign** — in-place DOM rewrite showing the inclusive version, with a
   before/after slider.
8. **Act** — consumers save/share findings and discover alternatives;
   designers open a detailed report, accept recommendations, export tasks,
   and see inclusion score before/after.

## Wow moments (demo order)
1. Bias Scan heatmap over a live page + "assumption fingerprint" score.
2. Live Redesign — DOM mutates in place, before/after toggle (the killer).
3. Perspective Lens — reframes as inclusive-for-everyone.

## 60-second judge demo
Automotive product page → select "standard seat and restraint system" →
assumed body dimensions revealed → scan shows safety/reach hotspots →
adjust Human Fit Simulator → controls visibly unreachable → click Redesign →
seatbelt geometry and control placement adapt → inclusion score rises live.

## Tentative technical direction (not yet finalized)
- Chrome extension, Manifest V3; content script injecting a Shadow-DOM-isolated
  overlay (host CSS can't break the UI).
- Buddy follows cursor with springy lag (GSAP or CSS transforms).
- AI via LLM API behind a thin backend (Cloudflare Worker suggested) so API
  keys stay off the client. Structured JSON output:
  `{assumption, who_is_excluded, evidence[], rewritten_html}`.
- Selection: `window.getSelection()` for text; `elementFromPoint` +
  hover-outline for components; `chrome.tabs.captureVisibleTab` + crop for
  images (multimodal analysis — stretch).
- Evidence cards use canned, verified citations (crash-test dummies, PPE fit
  studies, drug-dosage trials) rather than live-hallucinated facts.
- Cache AI responses for 2–3 demo sites so the demo never dies; live calls
  only if a judge asks for an arbitrary site.
- Passive background detection is faked for the hackathon (pre-triggered on
  demo sites); everything else is manual scan.

## Prioritization
- **MVP:** buddy + selection popup (4 actions), evidence cards, live DOM
  rewrite with before/after, page scan + heatmap + score, Perspective Lens.
- **Stretch:** exportable Inclusion Report (PDF), multimodal image analysis.
- **Skip:** dashboard, accounts, feedback loops.

## Open questions (to be resolved in interview)
- Exact frontend stack & build tooling for the extension.
- Backend choice, LLM provider/model, caching design.
- How Redesign technically rewrites the DOM safely (SPA re-renders, CSP).
- AI-only heatmap and findings pipeline.
- Perspective Lens implementation (anthropometric data → visual effect).
- Demo target sites: real sites vs self-hosted mock sites.
- Inclusion score formula and display.
- Side panel: Chrome sidePanel API vs injected panel.
- Team size, timeline, API budget.
