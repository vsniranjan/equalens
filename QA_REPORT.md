# EquaLens functionality and UI audit

Tested September 5, 2026 against the locally built extension and Meridian mock site, plus the deployed demo and live analysis API.

## Findings and fixes

| Problem | Fix and verification |
| --- | --- |
| Redesigns discarded an element's own attributes, leaving accessibility names and target sizes unchanged. | Apply sanitized root attributes while retaining page identity. Unit and browser regressions verify an accessible name and a 44 px button. |
| Replacing HTML removed existing button handlers. | Reconcile matching existing nodes instead of discarding them. Tests activate the original handler after redesign and check exact restoration on undo. |
| Multi-select choices and checkbox groups were copied incorrectly. | Preserve every selected option and match checkbox/radio values individually. Unit tests verify redesign and undo. |
| Input typed while waiting for AI could be overwritten. | Capture live form state immediately before applying the response. A delayed-response regression verifies keep/undo state. |
| An unchanged AI response was presented as a successful fix. | Reject an unchanged applied DOM, restore it, and show a retryable error without resolving findings. |
| Redesign-all compared only the first modified section. | Create and update a comparison snapshot for each changed target. Browser tests verify all four affected areas. |
| Preview controls scrolled outside the viewport and became impossible to click. | Anchor controls to the viewport. Browser tests scroll across sections at 390, 768, and 1440 px. |
| Computed desktop widths froze comparison layouts on smaller screens. | Preserve inherited appearance while allowing the page stylesheet to lay out snapshots responsively. Snapshots use unique IDs and do not masquerade as real demo targets. |
| Replacing one demo section left related findings unresolved and pointing at removed nodes. | Resolve related findings when the complete registered demo variant is kept. |
| Demo variants removed headings referenced by section accessibility labels. | Restore the heading IDs. Browser tests check every section's label reference after keep. |
| Redesign-all could interrupt an unfinished scan and miss later findings. | Disable the bulk action until the deep scan completes or returns an error. A held-response test verifies this behavior. |
| Page scans mixed local rule-based findings with the AI report, producing results before AI analysis completed and retaining them after AI failures. | Remove the local detector and merge layer. Scans now begin empty, accept only `source: "ai"` findings, replace results from the one-shot fallback, and clear results before retry. Browser tests verify empty error states and successful recovery. |
| A newly opened scan displayed a score of 100 before the AI report completed, making the pending state look like a completed result. | Enter the scanning state on the panel's first render, display a pending dash instead of a numeric score, and reserve scores for completed reports. The progress surface now uses a prominent high-contrast status band, visible activity, and reduced-motion support. |
| Redesign-all used one shared comparison slider and one all-or-nothing decision for every changed section. | Give each component an independent target-bound comparison, preserved slider position, and Approve/Reject actions. Only the component nearest the viewport center shows its review surface; accepted findings update the final score while rejected components restore exactly. |
| The minimal companion's menu and explanation card overflowed narrow screens. | Clamp popover positions to the viewport for both companion styles. Browser tests cover 320 px. |
| Mock-site reveal styling hid content until a scrolling observer fired. | Keep content visible by default, including snapshots and reduced-motion browsing. |
| Form placeholders had weak contrast; a diagram label extended beyond its SVG. | Increase placeholder contrast and anchor the label inside the diagram. |

## Validation

- TypeScript: `npm run typecheck` passed.
- Unit suites: shared 3, extension 68, API 21, mock site 5; all passed (97 total across the runs).
- Full browser suite: 28 passed, including onboarding/settings, selection analysis, offline and HTTP-error recovery, stale-scan cancellation, malformed results, strict CSP, frames, report retry/timeout, PDF printing, throttling, form submission, redesign rollback, and responsive layouts.
- Live API diagnostic: selection analysis, deep scan, redesign requests, and report export passed before this local UI iteration. The current component-review UI was verified against mocked API responses in Chromium.
- Local extension and mock-site production builds passed. The API dry-run build also completed; no deployment was performed.
- Inspected browser screenshots of the prominent pending-scan state, target-bound component comparisons, responsive form previews, the kept form at 320 px, and narrow-screen selection cards.
- AI-only scan regressions cover streamed findings, fallback responses, empty errors, retries, and strict rejection of non-AI result sources. Corrected an older test fixture that returned unchanged HTML while asserting a successful redesign.

Browser artifacts are under `test-results/browser/`; live screenshots and request traces are under `test-results/live/`. Playwright regenerates these directories on subsequent runs.

The initial sandbox prevented Chromium sockets and the local Cloudflare runtime from starting (`setsockopt: Operation not permitted` / `listen EPERM`). The suites passed after running with the required execution permissions; these were environment failures.

## Using the fixes and remaining scope

The rebuilt unpacked extension is in `extension/dist`. Reload that extension and refresh already-open site tabs to run the new content script. Mock-site CSS changes are built in `mock-site/dist` and require serving or deploying that build to appear on the hosted site.

These results cover the mock site and tested extension flows. Arbitrary third-party applications can replace their own DOM after a redesign; persistent integration with every site's framework is not established by these tests. Live AI output can vary, and the three registered demo sections continue to use their existing prebuilt redesign variants.
