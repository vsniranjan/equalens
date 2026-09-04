---
name: Obsidian Precision
colors:
  surface: '#121315'
  surface-dim: '#121315'
  surface-bright: '#38393b'
  surface-container-lowest: '#0d0e10'
  surface-container-low: '#1b1c1e'
  surface-container: '#1f2022'
  surface-container-high: '#292a2c'
  surface-container-highest: '#343537'
  on-surface: '#e3e2e5'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e3e2e5'
  inverse-on-surface: '#303033'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#a7c8ff'
  on-secondary: '#003060'
  secondary-container: '#1e477b'
  on-secondary-container: '#92b7f1'
  tertiary: '#ffffff'
  on-tertiary: '#033257'
  tertiary-container: '#d1e4ff'
  on-tertiary-container: '#43678f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#d5e3ff'
  secondary-fixed-dim: '#a7c8ff'
  on-secondary-fixed: '#001c3b'
  on-secondary-fixed-variant: '#1e477b'
  tertiary-fixed: '#d1e4ff'
  tertiary-fixed-dim: '#a6c9f6'
  on-tertiary-fixed: '#001d36'
  on-tertiary-fixed-variant: '#23496f'
  background: '#121315'
  on-background: '#e3e2e5'
  surface-variant: '#343537'
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 72px
    fontWeight: '300'
    lineHeight: 80px
    letterSpacing: -0.03em
  display-xl-mobile:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '300'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 44px
    fontWeight: '400'
    lineHeight: 52px
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '300'
    lineHeight: 30px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.18em
  label-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.05em
  button-text:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.08em
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-3xl: 5rem
  space-4xl: 8rem
  space-5xl: 12rem
  gutter-desktop: 2rem
  gutter-mobile: 1rem
  margin-desktop: 5rem
  margin-mobile: 1.5rem
  max-width: 1440px
---

## Brand & Style

This design system embodies high-performance automotive luxury, architectural restraint, and uncompromising technical precision. It speaks to discerning clients seeking bespoke electric performance, engineering transparency, and effortless sophistication. 

The aesthetic is architectural minimalism blended with technical refinement. Interfaces prioritize monolithic canvas areas, extreme negative space, razor-sharp alignment, and high-fidelity product rendering over decorative flourishes. Interaction patterns evoke the mechanical certainty of aerospace controls and physical cockpit switches: smooth, weighted, and deliberate.

## Colors

The palette relies on a disciplined scale of near-black basalt tones layered beneath optical silver and pure illumination. 

- **Base Canvas:** `#0A0B0D` provides an absolute void that eliminates visual clutter and isolates form.
- **Surface Elevation:** Layered containment uses `#14161A` for grounding structures and `#1C1F26` for interactive planes, card structures, and floating configuration docks.
- **Structural Lines:** Structural dividing rules and low-contrast borders use `#242831` and `#2D323E`.
- **Typography & Assets:** Primary headers command the space in `#FFFFFF`. Technical readouts, telemetry, and body prose scale down to `#C9CDD3`, with secondary captions resting at `#8E95A2`.
- **Accents:** Accentuation is strictly curated. Steel Blue (`#4A6FA5`) serves as the operative signal for active configuration states, focus rings, and primary interactive vectors. Soft Ice Blue (`#7B9EC9`) is reserved exclusively for micro-highlights and precision metrics.

## Typography

Typography drives the monolithic, engineered tone of the brand. Using `Inter` throughout ensures mathematical proportions, immaculate digital rendering, and an ultra-modern aesthetic akin to high-end instrumentation.

- **Scale Rhythm:** Display styles feature light weights (`300`) with tight letter spacing, producing an airy, architectural elegance on expansive viewports.
- **Section Eyebrows & Metadata:** Every section header is anchored by `label-caps` in strict uppercase format with generous horizontal tracking (`0.18em`), giving context without weight.
- **Technical & Spec Metrics:** Telemetry, chassis specs, torque ratings, and pricing counters employ `JetBrains Mono` at subtle scales to reinforce mechanical integrity and engineering authenticity.

## Layout & Spacing

The layout operates on an architectural 12-column grid capped at an absolute max width of 1440px for desktop precision, paired with dynamic vertical rhythm.

- **Desktop (1440px):** 12 columns with 32px (`2rem`) gutters and 80px (`5rem`) outer safe margins. Macro hero containers take advantage of full-bleed positioning, while textual elements lock strictly to internal column spans (e.g., editorial blocks spanning 4 columns, interactive configurators spanning 8 + 4 splits).
- **Tablet (768px - 1023px):** 8 columns, 24px gutters, 40px outer margins. Two-column split configurators collapse into vertical tiered views.
- **Mobile (< 767px):** 4 columns, 16px gutters, 24px margins. Visual configurator canvases collapse to 16:9 aspect ratios while specs dock to bottom sheets.
- **Vertical Hierarchy:** Large gaps (`space-4xl` and `space-5xl`) isolate chapters of the vehicle showcase, creating a slow, cinematic browsing cadence.

## Elevation & Depth

Visual hierarchy does not use diffuse, fuzzy drop shadows or skeuomorphic drop highlights. Instead, depth is articulated through surface tiers, razor-sharp hairline borders, and subtle luminescent overlays.

1. **Ground Layer (`#0A0B0D`):** The primary void. Holds full-bleed vehicle visuals, 3D Canvas viewports, and primary narrative copy.
2. **Elevated Surfaces (`#14161A` with 1px border of `#242831`):** Structural content cards, feature specs panels, and secondary module sections.
3. **Floating & Overlay Layer (`#1C1F26` at 85% opacity with `backdrop-filter: blur(16px)` and 1px border of `#2D323E`):** Sticky header navigation, sticky bottom order/configurator summaries, tooltips, and floating selector pods.
4. **Specular Edge Detail:** Highlighted modules and active cards incorporate an ultra-subtle top edge gradient line (`linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent)`) simulating overhead cockpit lighting glancing off brushed magnesium.

## Shapes

The design system enforces an uncompromising sharp architectural geometry (`roundedness: 0`). Elements terminate at absolute 90-degree angles to echo automotive sheet metal folding, chassis cross-sections, and industrial CAD precision.

- **Panels, Buttons, and Inputs:** Strictly square corners (`border-radius: 0px`). Precision is communicated through crisp borders and micro-insets rather than rounded corners.
- **Paint Swatches & Wheel Selectors:** Swatches are formatted as square architectural tiles with 1px internal borders or inset technical rings, rejecting typical soft circular tokens.
- **Badges & Micro Chips:** Crisp rectangular boundaries with fixed vertical height and monospaced or uppercase labels.

## Components

### Buttons
- **Primary Action:** Solid white fill (`#FFFFFF`), pure black text (`#0A0B0D`), sharp corners (`0px`). Text is tracked uppercase (`button-text`). Hover shifts background to silver mist (`#E1E4EA`) with a smooth 150ms transition.
- **Secondary Action:** Transparent fill with a 1px solid border (`#2D323E`), white text (`#FFFFFF`). Hover shifts border color to `#4A6FA5` and text to `#FFFFFF` with a faint interior tint (`rgba(74, 111, 165, 0.08)`).
- **Ghost/Tertiary:** No border, uppercase tracked label with an animated 1px bottom tracking underline that expands outward from center on hover.

### Inputs & Form Fields
- Single-line and numerical inputs feature a bottom border only (`1px solid #242831`) or full containment inside `#14161A` with a 1px border.
- Floating placeholder labels use `label-caps` in `#8E95A2`.
- Focused state transitions border to `#4A6FA5` with absolute sharpness; no glow halos or soft focus rings.

### Swatches & Configurator Controls
- Vehicle exterior and interior material selectors feature square preview swatches (48x48px) framed in 1px `#242831`.
- Active state adds a distinct, high-contrast outer framing boundary in `#4A6FA5` spaced 2px away from the swatch edge.

### Spec Cards & Data Displays
- Framed in `#14161A` with top edge specular highlighting. 
- Primary metric (e.g., "0-60 mph / 2.1s", "Peak Power / 1,020 hp") rendered in `display-xl` or `headline-lg` in `#FFFFFF`, paired immediately with uppercase subtitle metadata in `label-caps` (`#8E95A2`).

### Selection Lists & Accordions
- Flush, full-width dividers (`1px solid #242831`). 
- Interactive items reveal detail drawers using linear downward sliding motions, paired with ultra-minimal `+` and `-` technical glyphs instead of standard carousels or rounded chevrons.

### Telemetry HUD & Configurator Sticky Bar
- An anchored, horizontal lower dock (`1440px` max, pinned to the bottom viewport).
- Structured in glassmorphic `#14161A` at 90% opacity with `backdrop-filter: blur(20px)` and a continuous top border of `#242831`.
- Displays real-time estimated range, acceleration stats, total build valuation, and the primary "Reserve Now" trigger.