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
  --eqx-z-dimmer: 1;
  --eqx-z-heatmap: 2;
  --eqx-z-panel: 10;
  --eqx-z-controls: 20;
  --eqx-z-redesign: 30;
  --eqx-z-toast: 40;
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
.eqx-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.eqx-buddy-position {
  position: fixed;
  z-index: var(--eqx-z-controls);
  top: 0;
  left: 0;
  width: 44px;
  height: 44px;
  pointer-events: auto;
  transform: translate3d(0, 0, 0);
  transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}
.eqx-buddy-position[data-buddy-style="minimal"] { width: 104px; height: 34px; }
.eqx-buddy-position[data-buddy-style="minimal"] .eqx-popover { right: 112px; }
.eqx-buddy-position[data-buddy-style="minimal"] .eqx-popover[data-side="right"] { right: auto; left: 112px; }

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
.eqx-buddy[data-style="minimal"] {
  display: inline-flex;
  width: 104px;
  height: 34px;
  justify-content: center;
  gap: 8px;
  padding: 0 10px;
  border-color: var(--eqx-border);
  border-radius: 5px;
  background: var(--eqx-surface);
  color: var(--eqx-ink);
  box-shadow: 0 3px 6px rgb(14 27 29 / 0.12);
}
.eqx-buddy[data-style="minimal"]:hover { border-color: var(--eqx-primary); box-shadow: 0 3px 6px rgb(14 27 29 / 0.16); }
.eqx-minimal-dot { width: 9px; height: 9px; flex: none; border-radius: 50%; background: var(--eqx-primary); }
.eqx-buddy[data-mode="thinking"] .eqx-minimal-dot { animation: eqx-deep-scan-pulse 800ms ease-in-out infinite alternate; }
.eqx-buddy[data-mode="alert"] .eqx-minimal-dot { background: var(--eqx-alert); }
.eqx-minimal-label { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; font-weight: 750; letter-spacing: 0.025em; white-space: nowrap; }
.eqx-buddy[data-style="minimal"] .eqx-alert-count { display: none; }

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
.eqx-finding-classification { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 5px; }
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
  z-index: var(--eqx-z-controls);
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

.eqx-scan-dimmer {
  position: fixed;
  z-index: var(--eqx-z-dimmer);
  inset: 0;
  background: rgb(0 0 0 / 0.55);
  pointer-events: none;
  animation: eqx-dimmer-in 180ms ease-out both;
}

.eqx-heatmap {
  position: fixed;
  z-index: var(--eqx-z-heatmap);
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.eqx-heatmap-rect {
  --eqx-heat-color: var(--eqx-language);
  --eqx-heat-opacity: 0.88;
  position: fixed;
  top: 0;
  left: 0;
  min-width: 4px;
  min-height: 4px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--eqx-heat-color) 18%, transparent);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--eqx-heat-color) 88%, white),
    0 0 18px color-mix(in srgb, var(--eqx-heat-color) 58%, transparent);
  opacity: var(--eqx-heat-opacity);
  transform-origin: center;
  will-change: transform;
  animation: eqx-hotspot-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.eqx-heatmap-rect[data-category="safety"] { --eqx-heat-color: var(--eqx-alert); }
.eqx-heatmap-rect[data-category="usability"] { --eqx-heat-color: var(--eqx-usability); }
.eqx-heatmap-rect[data-impact="high"] {
  --eqx-heat-opacity: 1;
  background: color-mix(in srgb, var(--eqx-heat-color) 24%, transparent);
}

.eqx-heatmap-label {
  position: absolute;
  top: 6px;
  left: 6px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 7px;
  border-radius: 4px;
  background: var(--eqx-surface);
  color: color-mix(in srgb, var(--eqx-heat-color) 82%, black);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.035em;
  line-height: 14px;
  text-transform: uppercase;
  box-shadow: 0 2px 4px rgb(14 27 29 / 0.16);
}

.eqx-heatmap-label i, .eqx-finding-dot {
  width: 7px;
  height: 7px;
  flex: none;
  border-radius: 50%;
  background: var(--eqx-heat-color);
}

.eqx-heatmap-rect.is-pulsing { animation: eqx-heat-pulse 800ms cubic-bezier(0.16, 1, 0.3, 1); }

.eqx-findings-panel {
  position: fixed;
  z-index: var(--eqx-z-panel);
  top: 0;
  right: 0;
  display: flex;
  width: min(380px, calc(100vw - 16px));
  height: 100vh;
  height: 100dvh;
  flex-direction: column;
  overflow: hidden;
  background: var(--eqx-surface);
  color: var(--eqx-ink);
  box-shadow: -4px 0 8px rgb(14 27 29 / 0.14);
  pointer-events: auto;
  animation: eqx-panel-in 240ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.eqx-panel-header {
  display: flex;
  min-height: 58px;
  flex: none;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 16px;
  border-bottom: 1px solid var(--eqx-border);
  background: color-mix(in srgb, var(--eqx-canvas) 58%, var(--eqx-surface));
}

.eqx-panel-brand { display: flex; align-items: center; gap: 8px; }
.eqx-panel-brand strong { color: var(--eqx-primary); font-size: 15px; font-weight: 750; letter-spacing: -0.01em; }
.eqx-panel-status {
  margin-left: auto;
  padding: 3px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--eqx-canvas) 82%, var(--eqx-surface));
  color: var(--eqx-muted);
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.055em;
  text-transform: uppercase;
}
.eqx-panel-status[data-mode="scanning"] {
  background: var(--eqx-primary);
  color: white;
}
.eqx-panel-status[data-mode="complete"] { background: color-mix(in srgb, var(--eqx-resolved) 10%, var(--eqx-surface)); color: var(--eqx-resolved); }
.eqx-panel-status[data-mode="error"] { background: color-mix(in srgb, var(--eqx-usability) 13%, var(--eqx-surface)); color: color-mix(in srgb, var(--eqx-usability) 76%, black); }

.eqx-icon-button {
  display: grid;
  width: 34px;
  height: 34px;
  flex: none;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--eqx-muted);
  cursor: pointer;
}
.eqx-icon-button:hover { background: var(--eqx-canvas); color: var(--eqx-ink); }
.eqx-icon-button:active { transform: translateY(1px); }
.eqx-icon-button:focus-visible { outline: 2px solid var(--eqx-focus); outline-offset: 1px; }
.eqx-icon-button svg { width: 18px; height: 18px; fill: none; stroke: currentcolor; stroke-linecap: round; stroke-width: 1.7; }

.eqx-panel-scroll { min-height: 0; flex: 1; overflow: auto; overscroll-behavior: contain; }

.eqx-redesign-comparison {
  position: fixed;
  z-index: var(--eqx-z-redesign);
  max-height: min(420px, calc(100dvh - 24px));
  overflow: auto;
  overscroll-behavior: contain;
  border: 1px solid var(--eqx-border);
  border-radius: 10px;
  background: var(--eqx-surface);
  color: var(--eqx-ink);
  box-shadow: 0 6px 8px rgb(14 27 29 / 0.24);
  pointer-events: auto;
  animation: eqx-comparison-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
.eqx-redesign-comparison > header { display: flex; align-items: center; gap: 9px; padding: 12px 13px; border-bottom: 1px solid var(--eqx-border); background: color-mix(in srgb, var(--eqx-primary) 7%, var(--eqx-canvas)); }
.eqx-redesign-comparison > header > span:last-child { display: grid; min-width: 0; gap: 1px; }
.eqx-redesign-comparison > header small { color: var(--eqx-primary); font-size: 9px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.eqx-redesign-comparison > header strong { overflow: hidden; font-size: 12px; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.eqx-redesign-mark { display: grid; width: 25px; height: 25px; flex: none; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--eqx-primary) 12%, var(--eqx-surface)); color: var(--eqx-primary); font-size: 14px; font-weight: 800; }
.eqx-comparison-control { display: grid; grid-template-columns: auto minmax(80px, 1fr) auto; align-items: center; gap: 9px; padding: 12px 13px 9px; background: var(--eqx-surface); }
.eqx-comparison-control button { min-height: 28px; padding: 4px 7px; border: 1px solid transparent; border-radius: 5px; background: transparent; color: var(--eqx-muted); cursor: pointer; font-size: 9.5px; font-weight: 750; }
.eqx-comparison-control button:hover { background: var(--eqx-canvas); color: var(--eqx-ink); }
.eqx-comparison-control button[aria-pressed="true"] { border-color: var(--eqx-border); background: var(--eqx-canvas); color: var(--eqx-primary); }
.eqx-comparison-control button:focus-visible { outline: 2px solid var(--eqx-focus); outline-offset: 1px; }
.eqx-comparison-control input { width: 100%; height: 22px; margin: 0; accent-color: var(--eqx-primary); cursor: ew-resize; }
.eqx-comparison-control input:focus-visible { outline: 2px solid var(--eqx-focus); outline-offset: 2px; }
.eqx-redesign-rationale { margin: 0; padding: 2px 13px 8px; color: var(--eqx-muted); font-size: 10.5px; line-height: 1.48; text-wrap: pretty; }
.eqx-redesign-changes { display: flex; flex-wrap: wrap; gap: 4px; margin: 0; padding: 0 13px 9px; list-style: none; }
.eqx-redesign-changes li { padding: 3px 6px; border-radius: 4px; background: color-mix(in srgb, var(--eqx-primary) 8%, var(--eqx-canvas)); color: var(--eqx-muted); font-size: 8.5px; line-height: 1.35; }
.eqx-redesign-changes li::before { content: "✓"; margin-right: 4px; color: var(--eqx-resolved); font-weight: 800; }
.eqx-redesign-score-preview { display: flex; align-items: center; gap: 7px; margin: 0 13px 10px; padding: 7px 8px; border-radius: 5px; background: var(--eqx-canvas); font-size: 9.5px; }
.eqx-redesign-score-preview span { color: var(--eqx-muted); }
.eqx-redesign-score-preview strong { margin-left: auto; color: var(--eqx-ink); font-variant-numeric: tabular-nums; }
.eqx-redesign-score-preview b { padding: 2px 4px; border-radius: 3px; background: color-mix(in srgb, var(--eqx-resolved) 12%, var(--eqx-surface)); color: var(--eqx-resolved); font-size: 9px; }
.eqx-redesign-comparison > footer { position: sticky; bottom: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; padding: 10px 13px 12px; border-top: 1px solid var(--eqx-border); background: var(--eqx-surface); }

.eqx-redesign-notice {
  position: fixed;
  z-index: var(--eqx-z-toast);
  top: 16px;
  left: 50%;
  display: grid;
  width: min(390px, calc(100vw - 24px));
  min-height: 56px;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--eqx-surface);
  color: var(--eqx-ink);
  box-shadow: 0 6px 8px rgb(14 27 29 / 0.22);
  transform: translateX(-50%);
  pointer-events: auto;
  animation: eqx-notice-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
.eqx-redesign-notice[data-mode="running"] { grid-template-columns: 10px minmax(0, 1fr); overflow: hidden; }
.eqx-redesign-notice[data-mode="error"] { grid-template-columns: minmax(0, 1fr) auto; outline: 1px solid color-mix(in srgb, var(--eqx-alert) 42%, var(--eqx-border)); }
.eqx-redesign-notice[data-mode="payoff"] { grid-template-columns: 26px minmax(0, 1fr) auto 24px; outline: 1px solid color-mix(in srgb, var(--eqx-resolved) 38%, var(--eqx-border)); }
.eqx-redesign-notice[data-mode="payoff"][data-delta="neutral"] { grid-template-columns: 26px minmax(0, 1fr) 24px; }
.eqx-redesign-notice[data-mode="payoff"][data-outcome="rejected"] { outline-color: var(--eqx-border); }
.eqx-redesign-notice > span:not(.eqx-redesign-notice-mark):not(.eqx-payoff-check) { display: grid; gap: 1px; }
.eqx-redesign-notice strong { font-size: 11px; font-weight: 750; }
.eqx-redesign-notice small { color: var(--eqx-muted); font-size: 9.5px; line-height: 1.4; }
.eqx-redesign-notice-mark { width: 8px; height: 8px; border-radius: 50%; background: var(--eqx-primary); animation: eqx-deep-scan-pulse 800ms ease-in-out infinite alternate; }
.eqx-redesign-progress { position: absolute; right: 0; bottom: 0; left: 0; height: 2px; background: var(--eqx-primary); transform-origin: left; transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1); }
.eqx-redesign-notice-actions { display: flex !important; grid-auto-flow: column; gap: 5px !important; }
.eqx-redesign-notice button { min-height: 28px; padding: 4px 7px; border: 1px solid var(--eqx-border); border-radius: 5px; background: var(--eqx-canvas); color: var(--eqx-ink); cursor: pointer; font-size: 9.5px; font-weight: 700; }
.eqx-redesign-notice button:hover { border-color: var(--eqx-muted); }
.eqx-redesign-notice button:focus-visible { outline: 2px solid var(--eqx-focus); outline-offset: 1px; }
.eqx-payoff-check { display: grid; width: 25px; height: 25px; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--eqx-resolved) 14%, var(--eqx-surface)); color: var(--eqx-resolved); font-size: 12px; font-weight: 850; }
.eqx-redesign-notice[data-outcome="rejected"] .eqx-payoff-check { background: var(--eqx-canvas); color: var(--eqx-muted); }
.eqx-redesign-notice[data-mode="payoff"] > b { color: var(--eqx-resolved); font-size: 13px; font-variant-numeric: tabular-nums; }
.eqx-redesign-notice[data-mode="payoff"] > button { width: 24px; min-height: 24px; padding: 0; border: 0; background: transparent; color: var(--eqx-muted); font-size: 16px; }

.eqx-deep-scan-progress, .eqx-deep-scan-error {
  display: grid;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--eqx-border);
  background: color-mix(in srgb, var(--eqx-canvas) 52%, var(--eqx-surface));
}
.eqx-deep-scan-progress {
  position: relative;
  grid-template-columns: 12px minmax(0, 1fr) 48px;
  min-height: 88px;
  overflow: hidden;
  padding: 17px 18px;
  border-bottom-color: color-mix(in srgb, var(--eqx-primary) 72%, white);
  background: var(--eqx-primary-dark);
  color: white;
}
.eqx-deep-scan-progress::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  background: #70d0d5;
  content: "";
  transform: scaleX(0.18);
  transform-origin: left;
  animation: eqx-scan-sweep 1.6s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
.eqx-deep-scan-progress > span:nth-child(2), .eqx-deep-scan-error > span { display: grid; gap: 1px; }
.eqx-deep-scan-progress strong, .eqx-deep-scan-error strong { color: var(--eqx-ink); font-size: 11px; font-weight: 750; }
.eqx-deep-scan-progress small, .eqx-deep-scan-error small { color: var(--eqx-muted); font-size: 9.5px; line-height: 1.4; }
.eqx-deep-scan-progress > span:nth-child(2) { gap: 4px; }
.eqx-deep-scan-progress strong { color: white; font-size: 14px; letter-spacing: -0.01em; }
.eqx-deep-scan-progress small { max-width: 38ch; color: #c9e8ea; font-size: 10.5px; line-height: 1.45; }
.eqx-deep-scan-mark {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #8ce0e4;
  box-shadow: 0 0 0 4px rgb(140 224 228 / 0.2);
  animation: eqx-deep-scan-pulse 900ms ease-in-out infinite alternate;
}
.eqx-deep-scan-bars { display: flex; align-items: flex-end; justify-content: flex-end; gap: 4px; height: 20px; }
.eqx-deep-scan-bars i { width: 4px; border-radius: 2px; background: #8ce0e4; animation: eqx-deep-scan-bars 720ms ease-in-out infinite alternate; }
.eqx-deep-scan-bars i:nth-child(1) { height: 9px; }
.eqx-deep-scan-bars i:nth-child(2) { height: 19px; animation-delay: 120ms; }
.eqx-deep-scan-bars i:nth-child(3) { height: 13px; animation-delay: 240ms; }

.eqx-deep-scan-error {
  grid-template-columns: minmax(0, 1fr) auto;
  background: color-mix(in srgb, var(--eqx-usability) 9%, var(--eqx-surface));
}
.eqx-deep-scan-error button {
  min-height: 32px;
  padding: 5px 8px;
  border: 1px solid color-mix(in srgb, var(--eqx-usability) 52%, var(--eqx-border));
  border-radius: 5px;
  background: var(--eqx-surface);
  color: var(--eqx-ink);
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
}
.eqx-deep-scan-error button:hover { border-color: var(--eqx-usability); background: color-mix(in srgb, var(--eqx-usability) 8%, var(--eqx-surface)); }
.eqx-deep-scan-error button:active { transform: translateY(1px); }
.eqx-deep-scan-error button:focus-visible { outline: 2px solid var(--eqx-focus); outline-offset: 2px; }

.eqx-score-summary {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--eqx-border);
}

.eqx-score-ring { position: relative; width: 132px; height: 132px; color: var(--eqx-alert); }
.eqx-score-ring[data-band="medium"] { color: var(--eqx-usability); }
.eqx-score-ring[data-band="high"] { color: var(--eqx-resolved); }
.eqx-score-ring--pending { color: var(--eqx-muted); }
.eqx-score-summary[data-state="scanning"] .eqx-score-ring--pending { color: var(--eqx-primary); }
.eqx-score-ring svg { display: block; width: 100%; height: 100%; transform: rotate(-90deg); }
.eqx-score-ring circle { fill: none; stroke-width: 8; }
.eqx-score-track { stroke: color-mix(in srgb, var(--eqx-border) 70%, var(--eqx-canvas)); }
.eqx-score-value { stroke: currentcolor; stroke-linecap: round; transition: stroke 220ms ease-out; }
.eqx-score-ring > div { position: absolute; inset: 0; display: grid; align-content: center; justify-items: center; }
.eqx-score-ring strong { color: var(--eqx-ink); font-size: 36px; font-variant-numeric: tabular-nums; font-weight: 700; letter-spacing: -0.025em; line-height: 1; }
.eqx-score-ring span { margin-top: 5px; color: var(--eqx-muted); font-size: 9px; font-weight: 750; letter-spacing: 0.045em; text-transform: uppercase; }

.eqx-score-benchmark {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 10px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--eqx-canvas) 68%, var(--eqx-surface));
  color: var(--eqx-muted);
  font-size: 10.5px;
}
.eqx-score-benchmark strong { padding: 2px 5px; border-radius: 4px; color: var(--eqx-alert); font-size: 9px; letter-spacing: 0.035em; text-transform: uppercase; }
.eqx-score-benchmark strong[data-band="medium"] { color: color-mix(in srgb, var(--eqx-usability) 78%, black); }
.eqx-score-benchmark strong[data-band="high"] { color: var(--eqx-resolved); }
.eqx-score-benchmark--pending { justify-content: center; text-align: center; }
.eqx-score-benchmark--pending:has(strong) { justify-content: space-between; text-align: left; }
.eqx-score-benchmark--pending strong { color: var(--eqx-primary); }

.eqx-findings-list { display: grid; gap: 20px; padding: 18px 18px 24px; }
.eqx-finding-group { min-width: 0; }
.eqx-finding-group > header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.eqx-finding-group h2 { margin: 0; color: var(--eqx-ink); font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.eqx-finding-group h2 span { color: var(--eqx-muted); font-variant-numeric: tabular-nums; font-weight: 650; }
.eqx-finding-group > header > span { padding: 2px 5px; border-radius: 4px; font-size: 9px; font-weight: 700; }
.eqx-finding-group[data-category="safety"] > header > span { background: color-mix(in srgb, var(--eqx-alert) 10%, var(--eqx-surface)); color: color-mix(in srgb, var(--eqx-alert) 88%, black); }
.eqx-finding-group[data-category="usability"] > header > span { background: color-mix(in srgb, var(--eqx-usability) 12%, var(--eqx-surface)); color: color-mix(in srgb, var(--eqx-usability) 78%, black); }
.eqx-finding-group[data-category="language"] > header > span { background: color-mix(in srgb, var(--eqx-language) 10%, var(--eqx-surface)); color: color-mix(in srgb, var(--eqx-language) 84%, black); }
.eqx-finding-rows { border-top: 1px solid var(--eqx-border); }

.eqx-finding-row {
  --eqx-row-color: var(--eqx-language);
  border-bottom: 1px solid var(--eqx-border);
  background: var(--eqx-surface);
}
.eqx-finding-group[data-category="safety"] .eqx-finding-row { --eqx-row-color: var(--eqx-alert); }
.eqx-finding-group[data-category="usability"] .eqx-finding-row { --eqx-row-color: var(--eqx-usability); }
.eqx-finding-row[data-fixed="true"] { --eqx-row-color: var(--eqx-resolved); }

.eqx-finding-summary {
  display: grid;
  width: 100%;
  grid-template-columns: 8px minmax(0, 1fr) 18px;
  gap: 10px;
  align-items: start;
  padding: 12px 7px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--eqx-ink);
  text-align: left;
  cursor: pointer;
}
.eqx-finding-summary:hover { background: color-mix(in srgb, var(--eqx-canvas) 58%, var(--eqx-surface)); }
.eqx-finding-summary:focus-visible { position: relative; outline: 2px solid var(--eqx-focus); outline-offset: -2px; }
.eqx-finding-dot { --eqx-heat-color: var(--eqx-row-color); margin-top: 5px; }
.eqx-finding-copy { display: grid; min-width: 0; gap: 3px; }
.eqx-finding-copy > strong { font-size: 12.5px; font-weight: 700; line-height: 1.35; text-wrap: pretty; }
.eqx-finding-copy > span:not(.eqx-finding-tags) { display: -webkit-box; overflow: hidden; color: var(--eqx-muted); font-size: 11px; line-height: 1.4; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.eqx-finding-tags { display: flex; flex-wrap: wrap; gap: 4px; padding-top: 3px; }
.eqx-chevron { width: 17px; height: 17px; margin-top: 1px; fill: none; stroke: var(--eqx-muted); stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; transition: transform 160ms ease-out; }
.eqx-finding-summary[aria-expanded="true"] .eqx-chevron { transform: rotate(90deg); }

.eqx-stereotype-chip, .eqx-approximate-chip, .eqx-fixed-chip {
  display: inline-flex;
  padding: 2px 5px;
  border: 1px solid color-mix(in srgb, var(--eqx-language) 30%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--eqx-language) 8%, var(--eqx-surface));
  color: color-mix(in srgb, var(--eqx-language) 84%, black);
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.025em;
  line-height: 14px;
}
.eqx-approximate-chip { border-color: var(--eqx-border); background: var(--eqx-canvas); color: var(--eqx-muted); }
.eqx-fixed-chip { border-color: color-mix(in srgb, var(--eqx-resolved) 30%, transparent); background: color-mix(in srgb, var(--eqx-resolved) 8%, var(--eqx-surface)); color: var(--eqx-resolved); }

.eqx-finding-details { display: grid; gap: 12px; padding: 4px 14px 14px 25px; }
.eqx-finding-details .eqx-finding-heading { align-items: flex-start; }
.eqx-finding-details .eqx-evidence-list > a, .eqx-finding-details .eqx-inference-row { border: 1px solid var(--eqx-border); background: transparent; }
.eqx-finding-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; padding-top: 2px; }

.eqx-button {
  min-height: 36px;
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11.5px;
  font-weight: 700;
  line-height: 16px;
  transition: background 120ms ease-out, border-color 120ms ease-out, color 120ms ease-out, transform 120ms ease-out;
}
.eqx-button-primary { border: 1px solid var(--eqx-primary); background: var(--eqx-primary); color: white; }
.eqx-button-primary:hover { border-color: var(--eqx-primary-dark); background: var(--eqx-primary-dark); }
.eqx-button-secondary { border: 1px solid var(--eqx-border); background: transparent; color: var(--eqx-ink); }
.eqx-button-secondary:hover { border-color: var(--eqx-muted); background: var(--eqx-canvas); }
.eqx-button:active { transform: translateY(1px); }
.eqx-button:focus-visible { outline: 2px solid var(--eqx-focus); outline-offset: 2px; }
.eqx-button:disabled { cursor: not-allowed; opacity: 0.48; transform: none; }

.eqx-findings-empty { display: grid; justify-items: center; padding: 34px 20px; text-align: center; }
.eqx-findings-empty > span { display: grid; width: 30px; height: 30px; margin-bottom: 10px; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--eqx-resolved) 12%, var(--eqx-surface)); color: var(--eqx-resolved); font-weight: 800; }
.eqx-findings-empty strong { font-size: 13px; }
.eqx-findings-empty p { max-width: 30ch; margin: 5px 0 0; color: var(--eqx-muted); font-size: 11.5px; line-height: 1.5; text-wrap: pretty; }

.eqx-panel-footer {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  flex: none;
  padding: 12px 14px;
  border-top: 1px solid var(--eqx-border);
  background: var(--eqx-surface);
}
.eqx-report-error { grid-column: 1 / -1; margin: 0; padding: 7px 9px; border-radius: 4px; background: color-mix(in srgb, var(--eqx-alert) 9%, var(--eqx-surface)); color: color-mix(in srgb, var(--eqx-alert) 82%, black); font-size: 10px; line-height: 1.4; }
.eqx-report-error { grid-column: 1 / -1; margin: 0; padding: 7px 9px; border-radius: 4px; background: color-mix(in srgb, var(--eqx-alert) 9%, var(--eqx-surface)); color: color-mix(in srgb, var(--eqx-alert) 82%, black); font-size: 10px; line-height: 1.4; }

@keyframes eqx-dimmer-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes eqx-panel-in { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: translateX(0); } }
@keyframes eqx-hotspot-in { from { opacity: 0; filter: blur(5px); } to { opacity: var(--eqx-heat-opacity); filter: blur(0); } }
@keyframes eqx-heat-pulse { 0%, 100% { filter: brightness(1); } 45% { filter: brightness(1.45); box-shadow: 0 0 28px var(--eqx-heat-color); } }
@keyframes eqx-deep-scan-pulse { from { opacity: 0.48; transform: scale(0.88); } to { opacity: 1; transform: scale(1); } }
@keyframes eqx-deep-scan-bars { from { opacity: 0.38; transform: scaleY(0.68); } to { opacity: 1; transform: scaleY(1); } }
@keyframes eqx-scan-sweep { 0% { transform: scaleX(0.12); } 55% { transform: scaleX(0.72); } 100% { transform: scaleX(1); } }
@keyframes eqx-comparison-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes eqx-notice-in { from { opacity: 0; transform: translate(-50%, -8px); } to { opacity: 1; transform: translate(-50%, 0); } }

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
  .eqx-panel-brand strong { color: #96d0d6; }
  .eqx-panel-status[data-mode="scanning"] { color: #96d0d6; }
  .eqx-panel-status[data-mode="error"] { color: #ffd39a; }
  .eqx-severity[data-severity^="safety"] { color: #ffb3b8; }
  .eqx-severity[data-severity^="usability"] { color: #ffd39a; }
  .eqx-severity[data-severity="language"] { color: #a9d2ff; }
  .eqx-evidence-list a small { color: #9ee5bd; }
  .eqx-stereotype-chip { color: #a9d2ff; }
  .eqx-heatmap-rect[data-category="safety"] .eqx-heatmap-label { color: #ffb3b8; }
  .eqx-heatmap-rect[data-category="usability"] .eqx-heatmap-label { color: #ffd39a; }
  .eqx-heatmap-rect[data-category="language"] .eqx-heatmap-label { color: #a9d2ff; }
  .eqx-finding-group[data-category="safety"] > header > span { color: #ffb3b8; }
  .eqx-finding-group[data-category="usability"] > header > span, .eqx-score-benchmark strong[data-band="medium"] { color: #ffd39a; }
  .eqx-finding-group[data-category="language"] > header > span { color: #a9d2ff; }
}

@media (prefers-reduced-motion: no-preference) {
  .eqx-buddy[data-mode="idle"] .eqx-buddy-core { animation: eqx-breathe 3.2s ease-in-out infinite; }
  @keyframes eqx-breathe { 0%, 100% { transform: scale(0.96); } 50% { transform: scale(1.03); } }
}

@media (prefers-reduced-motion: reduce) {
  .eqx-buddy-position, .eqx-buddy, .eqx-buddy-core, .eqx-popover, .eqx-inspection-outline, .eqx-skeleton > span,
  .eqx-scan-dimmer, .eqx-findings-panel, .eqx-heatmap-rect, .eqx-chevron, .eqx-score-value,
  .eqx-deep-scan-mark, .eqx-deep-scan-bars i, .eqx-deep-scan-progress::after, .eqx-minimal-dot {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
  .eqx-redesign-comparison, .eqx-redesign-notice, .eqx-redesign-notice-mark, .eqx-redesign-progress {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
}

@media (forced-colors: active) {
  .eqx-buddy, .eqx-popover, .eqx-inspection-status, .eqx-findings-panel, .eqx-redesign-comparison, .eqx-redesign-notice { border: 2px solid ButtonText; background: Canvas; color: CanvasText; }
  .eqx-buddy-core { background: Highlight; box-shadow: none; }
  .eqx-inspection-outline { border-color: Highlight; background: transparent; box-shadow: none; }
  .eqx-scan-dimmer { background: Canvas; opacity: 0.7; }
  .eqx-heatmap-rect { border: 3px solid Highlight; background: transparent; box-shadow: none; }
}

@media print {
  :host { display: none !important; }
}
`;
