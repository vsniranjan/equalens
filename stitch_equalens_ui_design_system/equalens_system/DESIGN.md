---
name: EquaLens System
colors:
  surface: '#e9fdff'
  surface-dim: '#c8dee0'
  surface-bright: '#e9fdff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#e2f8fa'
  surface-container: '#dcf2f4'
  surface-container-high: '#d6ecee'
  surface-container-highest: '#d1e7e9'
  on-surface: '#0a1f20'
  on-surface-variant: '#404849'
  inverse-surface: '#203436'
  inverse-on-surface: '#dff5f7'
  outline: '#707979'
  outline-variant: '#bfc8c9'
  surface-tint: '#2b676c'
  primary: '#003a3e'
  on-primary: '#ffffff'
  primary-container: '#0f5257'
  on-primary-container: '#89c4c9'
  inverse-primary: '#96d0d6'
  secondary: '#1d6296'
  on-secondary: '#ffffff'
  secondary-container: '#8cc6ff'
  on-secondary-container: '#005284'
  tertiary: '#003c28'
  on-tertiary: '#ffffff'
  tertiary-container: '#00553a'
  on-tertiary-container: '#6bcca1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b2edf2'
  primary-fixed-dim: '#96d0d6'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#084f54'
  secondary-fixed: '#cfe5ff'
  secondary-fixed-dim: '#98cbff'
  on-secondary-fixed: '#001d33'
  on-secondary-fixed-variant: '#004a77'
  tertiary-fixed: '#94f6c8'
  tertiary-fixed-dim: '#78d9ad'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005138'
  background: '#e9fdff'
  on-background: '#0a1f20'
  surface-variant: '#d1e7e9'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-inline:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-2: 0.125rem
  space-4: 0.25rem
  space-8: 0.5rem
  space-12: 0.75rem
  space-16: 1rem
  space-20: 1.25rem
  space-24: 1.5rem
  space-32: 2rem
  space-40: 2.5rem
  space-48: 3rem
  gutter-desktop: 1.5rem
  margin-desktop: 2rem
---

## Brand & Style

This design system delivers an uncompromising, clinical, and authoritative audit environment for digital inclusion and equity analysis. Built specifically for deep scrutiny and compliance validation, the visual language avoids decorative trends, superficial gradients, and hyper-stylized novelty. Instead, it embodies the precision and sobriety of an institutional laboratory instrument.

### Design Movement & Ethos
- **Movement:** Clinical Precision / Structural Modernism.
- **Tone:** Methodical, unshakeable, evidentiary, and objective.
- **Emotional Impact:** Reassurance through rigor. Users must immediately perceive that diagnostics, violation scores, and equity flags are grounded in deterministic data rather than subjective impressions.
- **Principles:**
  - *Evidence Over Decoration:* Every visual mark, pill, badge, and rule line corresponds directly to an analytical state, category, or quantitative threshold.
  - *Calm Density:* Complex accessibility trees and algorithmic auditing findings are arranged with structured tabular rhythm to reduce cognitive fatigue during prolonged investigative work.
  - *High Legibility & Strict Contrast:* Strict adherence to WCAG AAA contrast ratios ensures the tool itself exemplifies the gold standard of the compliance checks it executes.

## Colors

The color system is organized around diagnostic clarity and severity calibration. Backgrounds remain clear and low-glare, anchored by deep teal ink and deliberate diagnostic status tokens.

### Core Palette
- **Primary (`#0F5257`):** Deep Mineral Teal. Utilized for institutional anchor elements, primary action drivers, active navigation indicators, and high-level metric summaries.
- **On-Primary (`#FFFFFF`):** Absolute White. Ensures maximum contrast against primary teal elements.
- **Surface Canvas (`#FFFFFF`):** Base container surfaces, data tables, code inspector panes, and modal cards.
- **Application Background (`#EAF4F4`):** Soft Glare-Reduction Teal Tint. Forms the backdrop layer across screens, separating structural cards without demanding heavy elevation shadows.
- **Primary Ink (`#0E1B1D`):** Deepest Petrol Ink. Used for headlines, values, code tokens, and critical body text.
- **Secondary Ink (`#4A5E60`):** Muted Slate Teal. Used for metadata labels, column headers, timestamps, and secondary captions.
- **Structural Stroke (`#D5E3E3`):** Neutral Slate Hairline. Dictates panel divisions, table grids, and card perimeters with surgical crispness.

### Diagnostic Severity Tokens
Severity signaling is absolute, consistent, and strictly partitioned across the four core scanning categories:
- **Safety Critical (`#D64550`):** High-priority exclusion barriers, systemic failures, and non-negotiable compliance violations.
- **Usability Warning (`#E8A13C`):** Sub-optimal interaction patterns, contrast threshold slips, and cognitive load hurdles.
- **Language / Inclusive Context (`#3E7CB1`):** Cognitive, bias, readability, and alternative-text linguistic considerations.
- **Resolved / Compliant (`#2D936C`):** Verified equity milestones, passes, and remediated violations.

All diagnostic colors are paired with a 10% alpha background tint when applied to inline chips, rows, and callouts to preserve visual equilibrium across high-density reporting views.

## Typography

The typographic hierarchy prioritizes scan efficiency, tabular alignment, and forensic legibility. Inter supplies a neutral, highly readable grotesque foundation for executive summaries and narrative findings, while Geist provides sharp, monoline precision for metadata, counts, metrics, and DOM selector strings.

### Hierarchy & Editorial Rules
- **Display & Section Titles (`Inter` 600):** Tightly tracked display sizes convey authority and deliberate structure without decorative flair.
- **Body Text (`Inter` 400/500):** Set with generous proportional line heights to guarantee effortless review of complex regulatory descriptions and compliance guidelines.
- **Metadata, Tags, and Audit Metrics (`Geist` 500/600):** Rendered with uppercase styling for short labels and strict proportional tabular figures for numeric quantities.
- **Code & Snippets (`Geist`):** Used whenever showing raw HTML, ARIA properties, XPath expressions, or specific screen reader output strings.

## Layout & Spacing

This design system is optimized for high-density analysis at a standard desktop baseline of 1440px. The interface utilizes a rigorous 8px spatial grid, relying on a 12-column structure for dashboard modules and split-pane viewports.

### Desktop 1440px Layout Model
- **App Shell Structure:**
  - **Global Audit Rail (Left):** 64px collapsed icon rail, expandable to 240px for full taxonomy navigation.
  - **Main Inspection Canvas:** 12-column fluid grid bounded by a max container width of 1440px, pinned with 32px exterior side margins.
  - **Gutter System:** 24px structural gap between primary dashboard cards; 16px between interior sub-panels and diagnostic tables.
- **Dual-Pane Inspector Split:** For root-cause auditing, the screen bisects into a 60/40 ratio: 60% left column for live DOM viewport / screen capture overlay, 40% right rail for stacked diagnostic code blocks, remediation steps, and WCAG references.
- **Rhythm & Padding Rules:**
  - Standard card interior padding is universally fixed at 24px (`space-24`).
  - Compact table rows, chip elements, and search bars adhere to 8px/12px vertical rhythms to preserve vertical real estate.

## Elevation & Depth

To maintain a clinical instrument environment, spatial hierarchy relies on tonal layering and crisp structural borders rather than exaggerated light sources or dramatic drops. Surfaces sit close to each other, communicating physical stability.

### The Elevation Stack
- **Layer 0 (Canvas Base):** `#EAF4F4` tint. Houses all structural layouts and inactive workspace zones.
- **Layer 1 (Card & Module Surfaces):** `#FFFFFF` solid fill bounded by a continuous 1px stroke of `#D5E3E3`. No drop shadow under resting states.
- **Layer 2 (Hovered Cards / Active Diagnostic Panes):** `#FFFFFF` surface with a 1px border shift to `#0F5257` (at 40% opacity) accompanied by an ultra-subtle ambient shadow:
  - `box-shadow: 0px 2px 4px rgba(14, 27, 29, 0.04), 0px 4px 12px rgba(14, 27, 29, 0.03);`
- **Layer 3 (Modals, Popovers & Rule Inspectors):** Elevated surfaces for deep remediation flyouts:
  - `box-shadow: 0px 8px 24px rgba(14, 27, 29, 0.08), 0px 1px 2px rgba(14, 27, 29, 0.04);`
  - Border maintained at 1px `#D5E3E3`.
- **Dividers & Hairlines:** 1px solid `#D5E3E3` used to isolate table headers, metric splits, and terminal consoles.

## Shapes

The geometric signature is grounded, architectural, and restrained. A strict 8px card corner provides purposeful containment while preventing the UI from feeling playful or relaxed.

### Shape Geometry Rules
- **Analytical Cards & Data Modules:** Precisely 8px (`0.5rem`). This defines the signature profile of all panels, code inspectors, chart wrappers, and modal windows.
- **Interactive Controls (Buttons, Form Inputs):** Standardized at 6px (`0.375rem`) to create a clear tactile distinction from larger parent containers.
- **Pills & Status Chips:** 4px (`0.25rem`) corner radius. Pill-shaped round capsules are strictly forbidden to ensure diagnostic tags read as clinical metadata tags rather than consumer tags.
- **Focus Rings & Selection Outlines:** Crisp 2px offset border with a 0px blur radius using `#0F5257`.

## Components

### Buttons
- **Primary Action:** Solid `#0F5257` fill, `#FFFFFF` text (`Inter` 500), 6px radius. Height: 36px (Compact) or 40px (Standard). Subtle state change on hover: 8% darkened tint (`#0C4246`). Focus state displays a 2px offset stroke in `#0F5257`.
- **Secondary / Ghost:** Transparent background, 1px border in `#D5E3E3`, `#0E1B1D` text. On hover: background shifts to `#EAF4F4` with border transitioning to `#4A5E60`.
- **Critical Remediation Button:** Solid `#D64550` with white ink, strictly reserved for irreversible scan resets or destructive rule overrides.

### Diagnostic Chips & Badges
- Non-pill structure: 4px corner radius with 1px border stroke.
- **Critical Violation Badge:** Background `rgba(214, 69, 80, 0.08)`, border `rgba(214, 69, 80, 0.3)`, text `#D64550`.
- **Warning Badge:** Background `rgba(232, 161, 60, 0.10)`, border `rgba(232, 161, 60, 0.35)`, text `#9D6519`.
- **Language/Context Badge:** Background `rgba(62, 124, 177, 0.08)`, border `rgba(62, 124, 177, 0.3)`, text `#3E7CB1`.
- **Resolved Badge:** Background `rgba(45, 147, 108, 0.08)`, border `rgba(45, 147, 108, 0.3)`, text `#2D936C`.

### Cards & Container Panels
- White background (`#FFFFFF`), continuous 1px `#D5E3E3` border, 8px corner radius.
- Cards host a standardized 48px header zone containing module titling, item count markers, and quick-filter switches, cleanly segmented by a 1px border rule.

### Data Tables & Scan Results
- Minimalist data presentation. Alternating row fills are avoided in favor of 1px bottom dividers in `#D5E3E3`.
- Row hover produces an immediate `#EAF4F4` background change with zero transition delay to maintain high operational snap.
- Numeric counts and code strings use tabular lining via `Geist`.

### Form Fields & Inputs
- Default state: `#FFFFFF` fill, 1px `#D5E3E3` border, 6px radius, placeholder text `#4A5E60`.
- Active/Focused: Border instantly snaps to `#0F5257` accompanied by an ambient 1px glow (`rgba(15, 82, 87, 0.2)`).

### Specialized Instrument Components
- **DOM Node Inspector Strip:** Monospaced Geist container with `#EAF4F4` background, framing highlighted HTML element snippets with line indicators and direct node location paths.
- **Equity Ratio Bar:** A multi-segmented horizontal stacked gauge displaying the ratio of passed, language, usability, and safety violations at 6px height with 2px dividers between status chunks.