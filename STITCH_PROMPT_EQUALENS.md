# Stitch Prompts — EquaLens UI only

How to use this file:

- Create one Stitch project named `EquaLens`.
- Mode: **Web / Desktop** for every screen.
- Generate **one screen per prompt**, in the order listed (screen 1 first —
  it defines the reusable components: score ring, finding rows, severity
  chips — and the rest of the project inherits its style).
- Each prompt is self-contained: paste the whole block including the style
  header.
- Copy in quotes must appear **verbatim** — several lines mirror what the
  scanner detects in the demo. If Stitch paraphrases, regenerate or edit the
  text layer.
- We export the HTML/CSS as a starting point, so prefer regenerating with
  simpler layout instructions over accepting overly clever layouts.

### Global style header (prepend to every prompt)

> Clinical, trustworthy analysis-tool aesthetic. Deep teal primary
> (#0F5257), white surfaces, ink text (#0E1B1D), light teal tint background
> (#EAF4F4). Severity colors used consistently: red #D64550 (safety),
> amber #E8A13C (usability), blue #3E7CB1 (language). Sharp 8px-radius
> cards, subtle borders (#D5E3E3), no heavy shadows, evidence-first
> typography: clean sans-serif, clear hierarchy, generous line height.
> Feels like a professional audit tool, calm and credible, not playful.
> Desktop web, 1440px.

### Screen 1 — Scan overlay with findings panel (hero screen of the product)

> A webpage-analysis overlay shown on top of a darkened generic dark
> automotive webpage (dim the background page to ~45% black; the underlying
> page content is just a blurred placeholder). On the dimmed page, three
> glowing rounded rectangles highlight page regions: one red glow, one
> amber glow, one blue glow, each with a tiny severity chip pinned to its
> corner ("Safety", "Usability", "Language").
>
> Docked on the right: a 380px slide-in panel on a white surface titled
> "EquaLens" with a small teal orb logo. Panel top: a large circular
> progress ring gauge showing "41" with the label "Inclusion Score" and a
> red-to-amber gradient ring. Below: findings list grouped under bold
> group headers "Safety (1)", "Usability (2)", "Language (1)". Each finding
> row: colored severity dot, title, one-line description, chevron. Example
> rows verbatim: "Restraint validated for male bodies only — Crash
> certification assumes a 50th-percentile male occupant", "One-size
> steering grip — Grip diameter excludes smaller hand spans", "Fixed
> seatbelt anchor — Anchor height cannot adapt to shorter torsos",
> "Title field offers Mr./Mrs. only". Panel footer: two buttons —
> primary teal "Redesign all", secondary outline "Export report".
> Bottom-right corner of the viewport: a small glowing teal orb (44px) with
> a badge showing "4".

### Screen 2 — Selection popup with Explain card

> Same dimmed-page setting. In the middle of the page a text passage is
> shown highlighted (selection blue) reading "Certified against the
> 50th-percentile adult male crash test dummy". Next to it floats a compact
> white popup card (~340px) with a small teal orb icon and four pill
> buttons in a row: "Explain", "Who's excluded?", "Evidence", "Redesign".
> Below the pills, an expanded Explain card containing: label "HIDDEN
> ASSUMPTION" with text "This restraint system assumes the occupant has a
> 50th-percentile male body (175 cm, 78 kg)."; a red chip "Safety risk";
> label "AFFECTED SITUATIONS" with small chips "Shorter stature",
> "Pregnancy", "Older adults", "Smaller torsos"; label "EVIDENCE" with a
> citation row "Women are 47% more likely to be seriously injured in a
> comparable crash — University of Virginia, 2019" marked with a small
> "verified source" badge, and a second row "Fixed anchors reduce belt fit
> for shorter torsos" marked with an "AI inference" badge in grey; footer
> "Confidence: High".

### Screen 3 — Redesign result with before/after slider

> Same setting. Center of screen: a wide card showing a specification table
> mid-transformation with a vertical draggable divider: left half labeled
> "BEFORE" showing greyed table text "Certified against the
> 50th-percentile adult male crash test dummy", right half labeled "AFTER"
> in fresh white showing "Certified across the 5th-percentile female to
> 95th-percentile male anthropometric range", with changed phrases
> underlined in teal. Below the card a floating pill control: drag-handle
> slider icon, toggle "Before / After", and two buttons "Keep change"
> (teal) and "Revert" (ghost). Top-right of screen: the Inclusion Score
> ring now shows "86" in green with a small upward arrow "+45".

### Screen 4 — Onboarding, step 1 of 2

> A centered onboarding card on the light teal tint background. Progress
> indicator "1 / 2". Headline "Choose your companion". Two large selectable
> cards side by side: "Orb" showing a soft glowing teal orb illustration
> with caption "A subtle animated companion that appears when you select
> content", and "Minimal badge" showing a small static badge icon with
> caption "Just an indicator. No character." Below, a reassurance line
> with a shield icon: "EquaLens never asks for or stores personal, gender,
> or medical information." Primary button "Continue".

### Screen 5 — Onboarding, step 2 of 2

> Same layout, progress "2 / 2". Headline "What should EquaLens watch
> for?". Five selectable chips-as-cards in a grid, each with an icon and
> one-line description: "Safety — restraints, protective equipment, crash
> standards", "Sizing & fit — one-size claims, grip, reach", "Language —
> gendered defaults and forms", "Accessibility — targets, labels,
> contrast", "Scan everything (recommended)" shown pre-selected. Buttons:
> ghost "Back", primary "Start browsing".

### Screen 6 — Exported Inclusion Report (shareable page)

> A print-friendly report web page on white. Header: teal band with
> "EquaLens Inclusion Report", the analyzed site "meridian-motors.example —
> Meridian S4 product page", date, and two score rings side by side:
> "Before 41" (red ring) and "After 86" (green ring). Body: a findings
> table with columns Severity, Finding, Hidden assumption, Recommendation,
> Status — 4 rows matching the findings from earlier screens, severity
> cells as colored chips, status cells showing "Fixed" in green or "Open"
> in amber. Below the table: section "Evidence & sources" listing three
> numbered citations with years and source names. Footer: "Generated by
> EquaLens" with the orb mark and a "Print / Save as PDF" button top-right.

## Export notes (for adapting the code)

- Screens 1–3 render as full pages in Stitch, but in the product they are
  shadow-DOM overlays — we only lift the panel/popup/card markup, not the
  fake page background.
- Keep the severity hex values and the teal primary exactly as specified;
  they map 1:1 to design tokens in `shared/`.
