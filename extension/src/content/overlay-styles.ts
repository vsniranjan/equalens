import { TOKENS } from "@equalens/shared/tokens";

export const OVERLAY_CSS = `
:host {
  --eqx-primary: ${TOKENS.primary};
  --eqx-primary-dark: ${TOKENS.primaryDark};
  --eqx-canvas: ${TOKENS.canvas};
  --eqx-surface: #f8ffff;
  --eqx-ink: ${TOKENS.ink};
  --eqx-muted: #3f595b;
  --eqx-border: ${TOKENS.border};
  --eqx-focus: #2d7f85;
  --eqx-alert: ${TOKENS.severity.safetyHigh};
  --eqx-usability: ${TOKENS.severity.usability};
  --eqx-language: ${TOKENS.severity.language};
  --eqx-resolved: ${TOKENS.resolved};
  all: initial;
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  pointer-events: none;
  color: var(--eqx-ink);
  font: 400 14px/1.45 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color-scheme: light dark;
}

*, *::before, *::after { box-sizing: border-box; }
button { font: inherit; }

.eqx-buddy-position {
  position: fixed;
  top: 0;
  left: 0;
  width: 44px;
  height: 44px;
  pointer-events: auto;
  transform: translate3d(0, 0, 0);
  transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.eqx-buddy {
  position: relative;
  display: grid;
  width: 44px;
  height: 44px;
  padding: 0;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--eqx-primary) 68%, white);
  border-radius: 50%;
  background: var(--eqx-primary-dark);
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 8px rgb(0 58 62 / 0.18);
  transition: border-color 120ms ease-out, box-shadow 120ms ease-out, scale 120ms ease-out;
}

.eqx-buddy:hover { border-color: #8dd4d9; box-shadow: 0 5px 8px rgb(0 58 62 / 0.24); }
.eqx-buddy:active { scale: 0.96; }
.eqx-buddy:focus-visible { outline: 2px solid var(--eqx-focus); outline-offset: 3px; }

.eqx-buddy-core {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 30%, #dcffff 0 7%, #73d4d7 19%, #168189 48%, #003a3e 76%);
  box-shadow: inset -3px -4px 8px rgb(0 32 34 / 0.45), inset 2px 2px 4px rgb(255 255 255 / 0.3);
  transform: scale(1);
}

.eqx-buddy[data-mode="attentive"] .eqx-buddy-core { transform: scale(1.08); }
.eqx-buddy[data-mode="thinking"] .eqx-buddy-core { animation: eqx-think 900ms ease-in-out infinite alternate; }
.eqx-buddy[data-mode="alert"] { border-color: var(--eqx-alert); }

.eqx-alert-count {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border: 2px solid var(--eqx-surface);
  border-radius: 9px;
  background: var(--eqx-alert);
  color: white;
  font-size: 11px;
  font-weight: 700;
  line-height: 14px;
  text-align: center;
}

.eqx-popover {
  position: absolute;
  right: 52px;
  top: 0;
  width: 214px;
  overflow: hidden;
  border: 1px solid var(--eqx-border);
  border-radius: 8px;
  background: var(--eqx-surface);
  color: var(--eqx-ink);
  box-shadow: 0 8px 12px rgb(14 27 29 / 0.12);
  animation: eqx-popover-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.eqx-popover[data-side="right"] { right: auto; left: 52px; }
.eqx-popover[data-vertical="bottom"] { top: auto; bottom: 0; }

.eqx-analysis-card {
  width: min(370px, calc(100vw - 72px));
  overflow: auto;
  overscroll-behavior: contain;
}

.eqx-analysis { min-width: 0; }
.eqx-analysis-header { padding: 13px 14px 11px; background: color-mix(in srgb, var(--eqx-canvas) 62%, var(--eqx-surface)); }
.eqx-analysis-identity { display: flex; align-items: center; gap: 7px; }
.eqx-analysis-identity strong { font-size: 14px; font-weight: 700; letter-spacing: -0.01em; }
.eqx-analysis-mark {
  width: 18px;
  height: 18px;
  border: 1px solid color-mix(in srgb, var(--eqx-primary) 72%, white);
  border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, #dcffff 0 7%, #73d4d7 19%, #168189 48%, #003a3e 76%);
  box-shadow: inset -2px -2px 4px rgb(0 32 34 / 0.35);
}
.eqx-target-label {
  margin-left: auto;
  padding: 2px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--eqx-primary) 12%, var(--eqx-surface));
  color: var(--eqx-primary);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.eqx-analysis-header p {
  margin: 9px 0 0;
  overflow: hidden;
  color: var(--eqx-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.eqx-analysis-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 3px;
  padding: 5px;
  border-block: 1px solid var(--eqx-border);
  background: color-mix(in srgb, var(--eqx-canvas) 72%, var(--eqx-surface));
}
.eqx-analysis-tab {
  min-width: 0;
  min-height: 38px;
  padding: 5px 3px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--eqx-muted);
  cursor: pointer;
  font-size: 10.5px;
  font-weight: 650;
  line-height: 1.15;
}
.eqx-analysis-tab:hover { background: var(--eqx-surface); color: var(--eqx-ink); }
.eqx-analysis-tab[aria-pressed="true"] { background: var(--eqx-primary); color: white; }
.eqx-analysis-tab:disabled { cursor: wait; opacity: 0.62; }
.eqx-analysis-tab:active { transform: translateY(1px); }
.eqx-analysis-tab:focus-visible { outline: 2px solid var(--eqx-focus); outline-offset: -2px; }

.eqx-analysis-body { display: grid; gap: 10px; min-height: 132px; padding: 15px 16px 14px; background: var(--eqx-surface); }
.eqx-section-label { color: var(--eqx-muted); font-size: 10px; font-weight: 750; letter-spacing: 0.055em; text-transform: uppercase; }
.eqx-finding-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.eqx-assumption { margin: 0; color: var(--eqx-ink); font-size: 14px; font-weight: 620; line-height: 1.35; text-wrap: pretty; }
.eqx-impact { margin: -3px 0 3px; color: var(--eqx-muted); font-size: 12px; line-height: 1.45; text-wrap: pretty; }

.eqx-severity {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 5px;
  padding: 3px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--eqx-alert) 11%, var(--eqx-surface));
  color: color-mix(in srgb, var(--eqx-alert) 88%, black);
  font-size: 10px;
  font-weight: 700;
}
.eqx-severity i { width: 6px; height: 6px; border-radius: 50%; background: currentcolor; }
.eqx-severity[data-severity^="usability"] { background: color-mix(in srgb, var(--eqx-usability) 13%, var(--eqx-surface)); color: color-mix(in srgb, var(--eqx-usability) 76%, black); }
.eqx-severity[data-severity="language"] { background: color-mix(in srgb, var(--eqx-language) 12%, var(--eqx-surface)); color: color-mix(in srgb, var(--eqx-language) 82%, black); }

.eqx-situation-list { display: flex; flex-wrap: wrap; gap: 5px; }
.eqx-situation-list span {
  padding: 4px 7px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--eqx-canvas) 78%, var(--eqx-surface));
  color: var(--eqx-ink);
  font-size: 11px;
}

.eqx-evidence-list { display: grid; gap: 6px; }
.eqx-evidence-list > a, .eqx-inference-row {
  display: grid;
  gap: 6px;
  padding: 9px 10px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--eqx-canvas) 67%, var(--eqx-surface));
  color: var(--eqx-ink);
  font-size: 11px;
  line-height: 1.4;
  text-decoration: none;
}
.eqx-evidence-list > a:hover { background: color-mix(in srgb, var(--eqx-primary) 9%, var(--eqx-surface)); }
.eqx-evidence-list > a:focus-visible { outline: 2px solid var(--eqx-focus); outline-offset: 1px; }
.eqx-evidence-list small { color: var(--eqx-muted); font-size: 9.5px; font-weight: 650; }
.eqx-evidence-list a small { color: color-mix(in srgb, var(--eqx-resolved) 86%, black); }
.eqx-evidence-list b { font-weight: 800; }

.eqx-confidence { display: flex; align-items: center; gap: 6px; padding-top: 4px; color: var(--eqx-muted); font-size: 10.5px; font-weight: 650; text-transform: capitalize; }
.eqx-confidence > span { width: 7px; height: 7px; border-radius: 50%; background: var(--eqx-resolved); }

.eqx-excluded-list { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.eqx-excluded-list li { padding: 8px 9px; border-radius: 5px; background: color-mix(in srgb, var(--eqx-canvas) 72%, var(--eqx-surface)); font-size: 12px; }
.eqx-excluded-list li::before { content: "•"; margin-right: 8px; color: var(--eqx-primary); font-weight: 800; }
.eqx-result-note { display: grid; gap: 3px; padding-top: 3px; }
.eqx-result-note strong { font-size: 11px; }
.eqx-result-note span { color: var(--eqx-muted); font-size: 12px; line-height: 1.45; }

.eqx-analysis-prompt, .eqx-analysis-error, .eqx-neutral-result { display: grid; align-content: center; gap: 5px; min-height: 102px; }
.eqx-analysis-prompt strong, .eqx-analysis-error strong, .eqx-neutral-result strong { font-size: 13px; }
.eqx-analysis-prompt span, .eqx-analysis-error span, .eqx-neutral-result > span:last-child { color: var(--eqx-muted); font-size: 12px; line-height: 1.45; }
.eqx-analysis-error button { justify-self: start; min-height: 32px; margin-top: 5px; padding: 0 10px; border: 0; border-radius: 5px; background: var(--eqx-primary); color: white; cursor: pointer; font-weight: 650; }
.eqx-analysis-error button:hover { background: var(--eqx-primary-dark); }
.eqx-analysis-error button:focus-visible { outline: 2px solid var(--eqx-focus); outline-offset: 2px; }
.eqx-neutral-result { grid-template-columns: 24px 1fr; }
.eqx-neutral-result strong, .eqx-neutral-result > span:last-child { grid-column: 2; }
.eqx-neutral-mark { display: grid; grid-row: 1 / span 2; width: 22px; height: 22px; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--eqx-resolved) 14%, var(--eqx-surface)); color: var(--eqx-resolved); font-weight: 800; }

.eqx-skeleton { display: grid; gap: 8px; min-height: 112px; align-content: center; }
.eqx-skeleton > span { height: 9px; border-radius: 4px; background: color-mix(in srgb, var(--eqx-border) 75%, var(--eqx-canvas)); animation: eqx-skeleton-pulse 900ms ease-in-out infinite alternate; }
.eqx-skeleton > span:nth-child(2) { width: 84%; }
.eqx-skeleton > span:nth-child(3) { width: 58%; }
.eqx-skeleton small { margin-top: 3px; color: var(--eqx-muted); font-size: 10px; }

.eqx-menu-header { padding: 12px 14px 8px; color: var(--eqx-muted); font-size: 12px; font-weight: 650; }
.eqx-menu-list { display: grid; padding: 0 6px 6px; }
.eqx-menu-action {
  min-height: 36px;
  padding: 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--eqx-ink);
  text-align: left;
  cursor: pointer;
}
.eqx-menu-action:hover { background: var(--eqx-canvas); }
.eqx-menu-action:active { transform: translateY(1px); }
.eqx-menu-action:focus-visible { outline: 2px solid var(--eqx-focus); outline-offset: -2px; }

.eqx-inspection-outline {
  position: fixed;
  border: 2px solid var(--eqx-primary);
  border-radius: 6px;
  background: rgb(15 82 87 / 0.08);
  box-shadow: 0 0 0 1px rgb(255 255 255 / 0.72);
  pointer-events: none;
  transition: transform 90ms cubic-bezier(0.2, 0, 0, 1);
}

.eqx-inspection-status {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 9px 12px;
  border-radius: 6px;
  background: var(--eqx-primary-dark);
  color: white;
  font-size: 12px;
  font-weight: 600;
  pointer-events: none;
}

@keyframes eqx-think { from { transform: scale(0.9); } to { transform: scale(1.08); } }
@keyframes eqx-popover-in { from { opacity: 0; transform: translateX(8px) scale(0.98); } to { opacity: 1; transform: translateX(0) scale(1); } }
@keyframes eqx-skeleton-pulse { from { opacity: 0.48; } to { opacity: 1; } }

@media (prefers-color-scheme: dark) {
  :host {
    --eqx-canvas: #142a2c;
    --eqx-surface: #102426;
    --eqx-ink: #e3f6f7;
    --eqx-muted: #b4cbcd;
    --eqx-border: #365154;
    --eqx-focus: #96d0d6;
    --eqx-resolved: #78d9ad;
  }
  .eqx-target-label { color: #96d0d6; }
  .eqx-severity[data-severity^="safety"] { color: #ffb3b8; }
  .eqx-severity[data-severity^="usability"] { color: #ffd39a; }
  .eqx-severity[data-severity="language"] { color: #a9d2ff; }
  .eqx-evidence-list a small { color: #9ee5bd; }
}

@media (prefers-reduced-motion: no-preference) {
  .eqx-buddy[data-mode="idle"] .eqx-buddy-core { animation: eqx-breathe 3.2s ease-in-out infinite; }
  @keyframes eqx-breathe { 0%, 100% { transform: scale(0.96); } 50% { transform: scale(1.03); } }
}

@media (prefers-reduced-motion: reduce) {
  .eqx-buddy-position, .eqx-buddy, .eqx-buddy-core, .eqx-popover, .eqx-inspection-outline, .eqx-skeleton > span {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
}

@media (forced-colors: active) {
  .eqx-buddy, .eqx-popover, .eqx-inspection-status { border: 2px solid ButtonText; background: Canvas; color: CanvasText; }
  .eqx-buddy-core { background: Highlight; box-shadow: none; }
  .eqx-inspection-outline { border-color: Highlight; background: transparent; box-shadow: none; }
}
`;
