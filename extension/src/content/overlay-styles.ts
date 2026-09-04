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
.eqx-selection-note { width: min(250px, calc(100vw - 72px)); padding: 12px 14px; }
.eqx-selection-note strong { display: block; margin-bottom: 2px; font-size: 13px; font-weight: 650; }
.eqx-selection-note span { display: block; overflow: hidden; color: var(--eqx-muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }

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

@media (prefers-color-scheme: dark) {
  :host {
    --eqx-canvas: #142a2c;
    --eqx-surface: #102426;
    --eqx-ink: #e3f6f7;
    --eqx-muted: #b4cbcd;
    --eqx-border: #365154;
    --eqx-focus: #96d0d6;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .eqx-buddy[data-mode="idle"] .eqx-buddy-core { animation: eqx-breathe 3.2s ease-in-out infinite; }
  @keyframes eqx-breathe { 0%, 100% { transform: scale(0.96); } 50% { transform: scale(1.03); } }
}

@media (prefers-reduced-motion: reduce) {
  .eqx-buddy-position, .eqx-buddy, .eqx-buddy-core, .eqx-popover, .eqx-inspection-outline {
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
