const VARIANT_ATTRIBUTE = "data-equalens-variant";

export type RedesignVariantId = "seat-restraint" | "controls-reach" | "config-form";

const VARIANTS: Record<RedesignVariantId, string> = {
  "seat-restraint": `
    <div class="eqx-variant-shell eqx-seat-variant" data-eqx-variant-content="seat-restraint">
      <header class="eqx-variant-heading">
        <p>Seat &amp; restraint system <span>Inclusive range validated</span></p>
        <h2>Adaptive geometry for a wider occupant range</h2>
        <p>Restraint, lumbar, and head-support positions now adapt without reducing the original protection specification.</p>
      </header>
      <div class="eqx-variant-layout">
        <figure class="eqx-variant-visual">
          <div class="eqx-variant-image-frame">
            <img src="/assets/seat-ergonomic-diagram.jpg" alt="Technical seat cross-section with adjustable restraint anchor positions" width="1376" height="768" />
            <svg class="eqx-seat-geometry" viewBox="0 0 1000 560" role="img" aria-label="Eight-position restraint anchor and adjustable lumbar geometry">
              <path class="eqx-geometry-line" d="M710 84v298" />
              <path class="eqx-geometry-line eqx-geometry-line--soft" d="M610 190c-72 38-105 106-111 206" />
              <g class="eqx-anchor-range">
                <circle class="eqx-primary-anchor" cx="710" cy="116" r="13" /><circle cx="710" cy="154" r="8" /><circle cx="710" cy="192" r="8" />
                <circle cx="710" cy="230" r="8" /><circle cx="710" cy="268" r="8" /><circle cx="710" cy="306" r="8" />
                <circle cx="710" cy="344" r="8" /><circle cx="710" cy="382" r="13" />
              </g>
              <path class="eqx-measure-line" d="M752 116h74M752 382h74M810 116v266" />
              <text x="838" y="255">8-POSITION RANGE</text>
              <g class="eqx-lumbar-points"><circle cx="526" cy="306" r="9" /><circle cx="505" cy="336" r="9" /><circle cx="496" cy="368" r="9" /></g>
              <text x="390" y="438">4-WAY LUMBAR</text>
            </svg>
            <span class="eqx-variant-chip">5th F → 95th M</span>
          </div>
          <figcaption><span>Adaptive anchor geometry</span><span>ISO 2631-1 retained</span></figcaption>
        </figure>
        <div class="eqx-variant-spec">
          <div class="eqx-variant-spec-head"><span>Dimension &amp; metric</span><span>Expanded standard</span></div>
          <table>
            <tbody>
              <tr><th scope="row">Restraint validation</th><td>Validated from 5th-percentile female to 95th-percentile male anthropometric range; includes the legacy 175 cm / 78 kg benchmark.</td></tr>
              <tr><th scope="row">Seatbelt anchor</th><td>Eight-position B-pillar anchor with 266 mm vertical adjustment.</td></tr>
              <tr><th scope="row">Lumbar support</th><td>Four-way depth and height adjustment with position memory.</td></tr>
              <tr><th scope="row">Headrest</th><td>Independent height and fore-aft fit across the validated range.</td></tr>
            </tbody>
          </table>
          <p class="eqx-variant-note">Protection specification preserved · fit envelope expanded</p>
        </div>
      </div>
    </div>`,
  "controls-reach": `
    <div class="eqx-variant-shell eqx-controls-variant" data-eqx-variant-content="controls-reach">
      <header class="eqx-variant-heading eqx-variant-heading--split">
        <div><p>Controls &amp; reach <span>Adjustable interface envelope</span></p><h2>Primary controls meet the driver</h2></div>
        <p>Core functions are available at the wheel and console, with reach calibration stored per driver profile.</p>
      </header>
      <figure class="eqx-controls-visual">
        <img src="/assets/cockpit-reach-dashboard.jpg" alt="Meridian cockpit with duplicated steering-wheel and console controls" width="1376" height="768" />
        <svg viewBox="0 0 1376 768" role="img" aria-label="Adjustable reach zones and duplicated primary controls">
          <ellipse class="eqx-reach-zone eqx-reach-zone--near" cx="444" cy="444" rx="218" ry="138" />
          <ellipse class="eqx-reach-zone eqx-reach-zone--far" cx="732" cy="414" rx="306" ry="178" />
          <g class="eqx-control-point"><circle cx="374" cy="430" r="18" /><text x="404" y="436">WHEEL CONTROLS</text></g>
          <g class="eqx-control-point"><circle cx="716" cy="446" r="18" /><text x="746" y="452">CONSOLE DUPLICATE</text></g>
          <path class="eqx-control-link" d="M392 430C500 380 610 392 698 446" />
        </svg>
        <span class="eqx-variant-chip">Driver-calibrated reach</span>
      </figure>
      <p class="eqx-inclusive-claim">Primary drive, climate, and media controls are duplicated across adjustable near and extended reach zones.</p>
      <div class="eqx-control-specs">
        <article><p>Grip envelope</p><h3>Adjustable steering grip</h3><span>32–42 mm rim profiles · original 38 mm tactile specification retained</span></article>
        <article><p>Footwell</p><h3>Stored pedal reach</h3><span>120 mm travel · original 1:1.2 stroke ratio retained</span></article>
        <article><p>Console</p><h3>Duplicated primary controls</h3><span>Wheel + console access · original datum elevation +210 mm retained</span></article>
      </div>
    </div>`,
  "config-form": `
    <div class="eqx-variant-shell eqx-config-variant" data-eqx-variant-content="config-form">
      <div class="eqx-config-brief">
        <p class="eqx-variant-kicker">Commission intake <span>Fit profile added</span></p>
        <h2>Reserve your S4</h2>
        <p>Secure priority allocation in the inaugural production wave. Your optional fit profile prepares the cabin around body dimensions—not gender assumptions.</p>
        <ul><li>Allocation window: 2026/Q4 delivery</li><li>Bespoke telemetry profiling included</li><li>Fully refundable security deposit</li></ul>
      </div>
      <form class="eqx-inclusive-form" data-reservation-form>
        <div class="eqx-form-row eqx-form-row--identity">
          <label><span>Title <small>Optional</small></span><select id="title" name="title"><option value="">No title</option><option value="Mr.">Mr.</option><option value="Mrs.">Mrs.</option><option value="Ms.">Ms.</option><option value="Mx.">Mx.</option><option value="Dr.">Dr.</option><option value="Prof.">Prof.</option></select></label>
          <label><span>First name</span><input name="firstName" autocomplete="given-name" placeholder="E.g. Alex" required /></label>
        </div>
        <div class="eqx-form-row">
          <label><span>Last name</span><input name="lastName" autocomplete="family-name" placeholder="E.g. Morgan" required /></label>
          <label><span>Email address</span><input name="email" type="email" autocomplete="email" placeholder="name@domain.com" required /></label>
        </div>
        <fieldset class="eqx-fit-profile">
          <legend>Optional cabin fit profile</legend>
          <p>Used only to preconfigure adjustable controls. Values can be changed or skipped.</p>
          <div class="eqx-form-row eqx-form-row--fit">
            <label><span>Seated height</span><select name="seatedHeight"><option value="">Choose later</option><option>Under 82 cm</option><option>82–92 cm</option><option>93–103 cm</option><option>Over 103 cm</option></select></label>
            <label><span>Comfortable reach</span><select name="reachRange"><option value="">Choose later</option><option>Under 60 cm</option><option>60–70 cm</option><option>71–80 cm</option><option>Over 80 cm</option></select></label>
          </div>
        </fieldset>
        <div class="eqx-form-actions"><button type="submit">Reserve now <span aria-hidden="true">→</span></button><span>SECURE TOKEN TRANSIT // 256-BIT ENCRYPTION</span></div>
        <p class="eqx-confirmation" data-confirmation role="status" hidden>Allocation slot requested. Your Meridian Concierge will contact you within 24 hours.</p>
      </form>
    </div>`,
};

const PAGE_REDESIGN_CSS = `
.eqx-variant-shell { --eqx-page-accent: #a7c8ff; --eqx-page-line: #343941; --eqx-page-panel: #1b1d21; --eqx-page-raised: #23262b; width: min(100% - 10rem, 1440px); margin-inline: auto; color: #f5f5f5; font-family: Inter, system-ui, sans-serif; }
.eqx-variant-shell *, .eqx-variant-shell *::before, .eqx-variant-shell *::after { box-sizing: border-box; }
.eqx-variant-heading { max-width: 850px; margin-bottom: 48px; }
.eqx-variant-heading > p:first-child, .eqx-variant-kicker { margin: 0 0 14px; color: var(--eqx-page-accent); font-size: 11px; font-weight: 650; letter-spacing: .15em; text-transform: uppercase; }
.eqx-variant-heading > p:first-child span, .eqx-variant-kicker span { margin-left: 10px; padding: 3px 6px; background: rgb(167 200 255 / .11); color: #d6e6ff; letter-spacing: .07em; }
.eqx-variant-heading h2, .eqx-config-brief h2 { margin: 0 0 16px; color: #f5f5f5; font-size: clamp(2.25rem, 4vw, 3.4rem); font-weight: 300; letter-spacing: -.035em; line-height: 1.08; text-wrap: balance; }
.eqx-variant-heading > p:last-child, .eqx-variant-heading--split > p, .eqx-config-brief > p { max-width: 670px; margin: 0; color: #aeb5c0; font-size: 17px; font-weight: 300; line-height: 1.65; }
.eqx-variant-heading--split { display: flex; max-width: none; align-items: end; justify-content: space-between; gap: 48px; }
.eqx-variant-heading--split > p { max-width: 430px; padding-bottom: 7px; }
.eqx-variant-layout { display: grid; grid-template-columns: minmax(0, 1.48fr) minmax(360px, .92fr); gap: 24px; }
.eqx-variant-visual, .eqx-controls-visual { margin: 0; background: var(--eqx-page-panel); }
.eqx-variant-image-frame, .eqx-controls-visual { position: relative; overflow: hidden; }
.eqx-variant-image-frame img, .eqx-controls-visual > img { display: block; width: 100%; height: 100%; object-fit: cover; filter: saturate(.88) contrast(1.04); }
.eqx-variant-image-frame { min-height: 500px; }
.eqx-variant-image-frame img { position: absolute; inset: 0; }
.eqx-seat-geometry, .eqx-controls-visual svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.eqx-geometry-line, .eqx-measure-line, .eqx-control-link { fill: none; stroke: #b9d4ff; stroke-width: 3; }
.eqx-geometry-line--soft { stroke-dasharray: 8 10; opacity: .65; }
.eqx-measure-line { stroke-width: 2; }
.eqx-anchor-range circle, .eqx-lumbar-points circle { fill: #0c1118; stroke: #b9d4ff; stroke-width: 4; transform-box: fill-box; transform-origin: center; animation: eqx-anchor-arrive 520ms cubic-bezier(.16,1,.3,1) both; }
.eqx-anchor-range circle:nth-child(2), .eqx-lumbar-points circle:nth-child(2) { animation-delay: 70ms; }
.eqx-anchor-range circle:nth-child(3), .eqx-lumbar-points circle:nth-child(3) { animation-delay: 120ms; }
.eqx-anchor-range .eqx-primary-anchor { animation-name: eqx-anchor-morph; animation-duration: 720ms; }
.eqx-seat-geometry text, .eqx-controls-visual text { fill: #d6e6ff; font-family: ui-monospace, monospace; font-size: 17px; font-weight: 700; letter-spacing: 2px; }
.eqx-variant-chip { position: absolute; top: 18px; right: 18px; padding: 7px 9px; background: rgb(10 13 18 / .88); color: #d6e6ff; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }
.eqx-variant-visual figcaption { display: flex; justify-content: space-between; gap: 20px; padding: 14px; color: #8e98a6; font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: .1em; text-transform: uppercase; }
.eqx-variant-spec { display: flex; flex-direction: column; padding: 26px; background: var(--eqx-page-panel); }
.eqx-variant-spec-head { display: flex; justify-content: space-between; gap: 14px; padding-bottom: 14px; color: #929ba8; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.eqx-variant-spec-head span:last-child { color: var(--eqx-page-accent); }
.eqx-variant-spec table { width: 100%; border-collapse: separate; border-spacing: 0 9px; }
.eqx-variant-spec tr { background: var(--eqx-page-raised); }
.eqx-variant-spec th, .eqx-variant-spec td { padding: 14px 15px; vertical-align: top; text-align: left; }
.eqx-variant-spec th { width: 34%; color: var(--eqx-page-accent); font-size: 9px; letter-spacing: .09em; text-transform: uppercase; }
.eqx-variant-spec td { color: #e8eaf0; font-size: 13px; line-height: 1.5; }
.eqx-variant-note { margin: auto 0 0; padding-top: 22px; color: #9ba5b3; font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: .09em; text-transform: uppercase; }
.eqx-controls-visual { max-height: 660px; }
.eqx-controls-visual > img { min-height: 460px; }
.eqx-reach-zone { fill: rgb(167 200 255 / .08); stroke: #a7c8ff; stroke-width: 3; stroke-dasharray: 12 10; animation: eqx-zone-arrive 620ms cubic-bezier(.16,1,.3,1) both; transform-box: fill-box; transform-origin: center; }
.eqx-reach-zone--far { fill: rgb(167 200 255 / .04); opacity: .72; animation-delay: 90ms; }
.eqx-control-point circle { fill: #a7c8ff; stroke: #0a0b0d; stroke-width: 7; }
.eqx-control-link { stroke-dasharray: 9 8; }
.eqx-inclusive-claim { margin: 20px 0 44px; padding: 17px 20px; background: rgb(167 200 255 / .08); color: #dce8fa; font-size: 18px; font-weight: 300; }
.eqx-control-specs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--eqx-page-line); }
.eqx-control-specs article { display: flex; min-height: 250px; flex-direction: column; padding: 30px; background: var(--eqx-page-panel); }
.eqx-control-specs p { margin: 0; color: var(--eqx-page-accent); font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: .12em; text-transform: uppercase; }
.eqx-control-specs h3 { margin: 26px 0 12px; color: #f5f5f5; font-size: 25px; font-weight: 400; letter-spacing: -.025em; line-height: 1.18; }
.eqx-control-specs span { margin-top: auto; color: #a9b1bd; font-size: 13px; line-height: 1.55; }
.eqx-config-variant { display: grid; grid-template-columns: .82fr 1.18fr; gap: clamp(34px,7vw,100px); padding: clamp(34px,5vw,68px) clamp(26px,5vw,72px); background: var(--eqx-page-panel); outline: 1px solid var(--eqx-page-line); }
.eqx-config-brief > p { max-width: 590px; }
.eqx-config-brief ul { display: grid; gap: 11px; margin: 34px 0 0; padding: 0; color: #9ca6b4; font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: .1em; list-style: none; text-transform: uppercase; }
.eqx-config-brief li::before { content: "✓"; margin-right: 10px; color: var(--eqx-page-accent); }
.eqx-inclusive-form { display: grid; gap: 18px; padding: clamp(24px,3.5vw,42px); background: var(--eqx-page-raised); }
.eqx-form-row { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px; }
.eqx-form-row--identity { grid-template-columns: minmax(155px,.55fr) 1fr; }
.eqx-inclusive-form label > span, .eqx-fit-profile legend { display: block; margin-bottom: 6px; color: #aab2bd; font-size: 10px; font-weight: 650; letter-spacing: .12em; text-transform: uppercase; }
.eqx-inclusive-form label small { color: #8b95a2; font-size: 8px; }
.eqx-inclusive-form input, .eqx-inclusive-form select { width: 100%; min-height: 48px; padding: 0 13px; border: 1px solid transparent; border-radius: 0; background: #17191d; color: #f5f5f5; font: inherit; }
.eqx-inclusive-form input::placeholder { color: #8f98a4; }
.eqx-inclusive-form input:focus, .eqx-inclusive-form select:focus { border-color: #8eb8f7; background: #292d33; outline: 0; }
.eqx-fit-profile { margin: 2px 0; padding: 17px; border: 1px solid #3c424b; }
.eqx-fit-profile legend { padding: 0 7px; color: var(--eqx-page-accent); }
.eqx-fit-profile > p { margin: 0 0 14px; color: #aeb5c0; font-size: 12px; }
.eqx-form-actions { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding-top: 4px; }
.eqx-form-actions button { display: inline-flex; min-height: 48px; align-items: center; gap: 20px; padding: 0 22px; border: 0; border-radius: 0; background: var(--eqx-page-accent); color: #071528; cursor: pointer; font: inherit; font-weight: 650; }
.eqx-form-actions > span { color: #939ca9; font-family: ui-monospace, monospace; font-size: 8px; letter-spacing: .1em; text-align: right; }
.eqx-confirmation { margin: 0; padding: 14px; background: #17191d; color: #d6e6ff; }
.eqx-redesign-original-snapshot { position: absolute !important; z-index: 2147483644 !important; margin: 0 !important; overflow: hidden !important; pointer-events: none !important; user-select: none !important; contain: paint; }
.eqx-redesign-original-snapshot *, .eqx-redesign-original-snapshot *::before, .eqx-redesign-original-snapshot *::after { animation: none !important; transition: none !important; }
.eqx-redesign-divider { position: absolute; z-index: 2147483645; width: 2px; background: #d6e6ff; box-shadow: 0 0 0 1px rgb(7 21 40 / .8); pointer-events: none; }
.eqx-redesign-divider::before { content: "BEFORE"; position: absolute; top: 12px; right: 8px; padding: 4px 6px; background: #f5f5f5; color: #071528; font-family: ui-monospace, monospace; font-size: 9px; font-weight: 800; letter-spacing: .08em; }
@keyframes eqx-anchor-arrive { from { opacity: 0; transform: scale(.2); } to { opacity: 1; transform: scale(1); } }
@keyframes eqx-anchor-morph { from { opacity: .65; transform: translateY(114px) scale(.72); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes eqx-zone-arrive { from { opacity: 0; transform: scale(.72); } to { opacity: 1; transform: scale(1); } }
@media (max-width: 980px) { .eqx-variant-shell { width: min(100% - 3rem,1440px); } .eqx-variant-layout, .eqx-config-variant { grid-template-columns: 1fr; } .eqx-control-specs { grid-template-columns: 1fr; } .eqx-variant-heading--split { display: block; } }
@media (max-width: 680px) { .eqx-variant-shell { width: min(100% - 2rem,1440px); } .eqx-form-row, .eqx-form-row--identity { grid-template-columns: 1fr; } .eqx-form-actions, .eqx-variant-visual figcaption { align-items: flex-start; flex-direction: column; } .eqx-config-variant { width: 100%; outline: 0; } .eqx-variant-image-frame { min-height: 360px; } }
@media (prefers-reduced-motion: reduce) { .eqx-variant-shell *, .eqx-variant-shell *::before, .eqx-variant-shell *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
`;

const installedSheets = new WeakMap<Document, CSSStyleSheet>();
const installedBehaviors = new WeakSet<Document>();

export function findRedesignVariantTarget(element: Element): HTMLElement | null {
  const target = element.closest<HTMLElement>(`[${VARIANT_ATTRIBUTE}]`);
  return target && isRedesignVariantId(target.getAttribute(VARIANT_ATTRIBUTE)) ? target : null;
}

export function applyRedesignVariant(target: HTMLElement): RedesignVariantId {
  const id = target.getAttribute(VARIANT_ATTRIBUTE);
  if (!isRedesignVariantId(id)) throw new Error("EquaLens could not resolve the pre-built redesign variant");
  ensureRedesignPageStyles(target.ownerDocument);
  target.innerHTML = VARIANTS[id];
  return id;
}

export function ensureRedesignPageStyles(document: Document): void {
  if (!installedSheets.has(document)) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(PAGE_REDESIGN_CSS);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    installedSheets.set(document, sheet);
  }
  if (installedBehaviors.has(document)) return;
  document.addEventListener("submit", handleVariantSubmit);
  installedBehaviors.add(document);
}

function handleVariantSubmit(event: SubmitEvent): void {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.closest('[data-equalens-variant="config-form"]')) return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  const confirmation = form.querySelector<HTMLElement>("[data-confirmation]");
  if (!confirmation) throw new Error("Reservation confirmation status element was not found");
  confirmation.hidden = false;
}

function isRedesignVariantId(value: string | null): value is RedesignVariantId {
  return value !== null && Object.hasOwn(VARIANTS, value);
}
