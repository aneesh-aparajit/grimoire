---
name: grimoire
description: A quiet instrument for long study. The source on one side, notes and a sandbox on the other, set as panels into a warm-grey body.
colors:
  body: "#e9e9e6"
  panel: "#f5f5f3"
  raise: "#fbfbfa"
  well: "#ebebe7"
  desk: "#dcdcd8"
  rule: "#d8d8d4"
  rule-strong: "#c4c4bf"
  ink: "#2a2b2d"
  ink-muted: "#56585c"
  ink-faint: "#6b6d72"
  select-soft: "color-mix(in oklab, #2a2b2d 7%, transparent)"
  signal: "#c4520f"
  signal-hover: "#b0490c"
  signal-edge: "#a3440b"
  signal-ink: "#ffffff"
  pass: "#2f7d3e"
  fail: "#c4372a"
  fail-soft: "color-mix(in oklab, #c4372a 9%, transparent)"
  caution: "#9a6600"
  caution-soft: "#f5ebd3"
  focus: "#2f6fd6"
  site-ground: "#ffffff"
  site-ink: "#262626"
typography:
  display:
    fontFamily: "Figtree Variable, Figtree, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 4.4vw, 3.25rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.028em"
  headline:
    fontFamily: "Figtree Variable, Figtree, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.022em"
  title-notes:
    fontFamily: "Figtree Variable, Figtree, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Figtree Variable, Figtree, system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title-band:
    fontFamily: "Figtree Variable, Figtree, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
  body-notes:
    fontFamily: "Figtree Variable, Figtree, system-ui, sans-serif"
    fontSize: "0.96875rem"
    fontWeight: 400
    lineHeight: 1.7
  body-site:
    fontFamily: "Figtree Variable, Figtree, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  ui:
    fontFamily: "Figtree Variable, Figtree, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
  label:
    fontFamily: "Figtree Variable, Figtree, system-ui, sans-serif"
    fontSize: "0.65625rem"
    fontWeight: 600
    letterSpacing: "0.06em"
  mono:
    fontFamily: "JetBrains Mono Variable, JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "tnum"
rounded:
  code: "3px"
  key: "6px"
  well: "7px"
  panel: "8px"
  sheet: "12px"
  pill: "13px"
  device: "14px"
spacing:
  gutter: "10px"
  head: "36px"
  band: "52px"
  panel-pad: "20px"
  site-gutter: "48px"
  site-gutter-narrow: "16px"
  site-column: "1200px"
components:
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.key}"
    padding: "0 10px"
    height: "28px"
  button-ghost-hover:
    backgroundColor: "{colors.select-soft}"
  button-key:
    backgroundColor: "{colors.raise}"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.key}"
    padding: "0 10px"
    height: "28px"
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.signal-ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.key}"
    padding: "0 10px"
    height: "28px"
  button-primary-hover:
    backgroundColor: "{colors.signal-hover}"
  button-primary-disabled:
    backgroundColor: "{colors.well}"
    textColor: "{colors.ink-faint}"
  button-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    rounded: "{rounded.key}"
    height: "28px"
  button-danger:
    backgroundColor: "{colors.raise}"
    textColor: "{colors.fail}"
    rounded: "{rounded.key}"
    height: "28px"
  key-site:
    backgroundColor: "{colors.raise}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "0 18px"
    height: "44px"
  key-site-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.signal-ink}"
    rounded: "{rounded.panel}"
    padding: "0 18px"
    height: "44px"
  input:
    backgroundColor: "{colors.raise}"
    textColor: "{colors.ink}"
    rounded: "{rounded.key}"
    padding: "0 10px"
    height: "32px"
  search-well:
    backgroundColor: "{colors.well}"
    textColor: "{colors.ink-faint}"
    rounded: "{rounded.well}"
    padding: "0 8px 0 10px"
    height: "32px"
  segmented:
    backgroundColor: "{colors.well}"
    rounded: "{rounded.well}"
    padding: "2px"
  segmented-on:
    backgroundColor: "{colors.raise}"
    textColor: "{colors.ink}"
    rounded: "5px"
    height: "22px"
  tag:
    backgroundColor: "{colors.well}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "26px"
  tag-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
  modal:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "8px 8px 8px 14px"
---

# Design System: grimoire

## Overview

**Creative North Star: "The Quiet Instrument"**

grimoire is drawn the way Braun drew its products: a warm-grey body with lighter panels set into it, soft physical keys, and small lights that tell you the state of things. The source and the notebook sit side by side as two inset panels separated only by a 10px gutter of body colour. Nothing is chrome for its own sake. The window shows what the moment needs, and the rest stays at rest.

Density is that of a tool used for hours: 13px UI type, 28px keys, 36px panel heads, a 52px top band that is the body itself rather than a coloured bar. Prose (notes, the landing's claims) opens up to 15.5–16px with generous leading. Colour is almost absent. The grey family carries structure, ink carries meaning, one orange marks the single primary action, and green, red and amber appear as lights. Light and dark follow the system; dark keeps the same structure with a charcoal body and lifted panels.

The landing site is the same instrument presented as a product: the study view as an object on a plain ground, a short spec list, and each claim paired with an instrument panel (file tree, toolchain lights, terminal). It shares the app's tokens and is scaled up for reading at a distance: 44px keys, 12px panel corners, a soft drop under panels and the device shot.

**Key Characteristics:**
- Warm-grey body, lighter inset panels on an 8px radius with a 1px hairline ring.
- Soft keys: raised fill, 1px edge, 1px bottom shadow, a 1px press.
- One orange key per view; green, red and amber as 7px status lamps with a word beside them.
- Figtree for all UI and prose; JetBrains Mono only for code, paths, URLs and measurements.
- Small uppercase labels name panels and fields from inside their heads.
- No numbering systems, no rubber stamps, no coloured band.

## Colors

A near-monochrome warm grey family with ink for meaning, one orange for action, and three status hues used as lights.

### Primary
- **Braun Orange** (signal): fills the one primary key of each view: Run in the sandbox, Add in the reading list, Install on the landing. Hover deepens to **Pressed Orange** (signal-hover); the key's 1px edge is **Burnt Edge** (signal-edge); its label is white (signal-ink). Outside that key, orange appears only as the 2px text caret in the editors and as the selection tint (18–20% mix). Unchanged in dark mode.

### Tertiary (status lights)
- **Lamp Green** (pass): saved, exit 0, done, toolchain found, In sync. Dark: #5cbf6c.
- **Fault Red** (fail): failed run, save error, missing toolchain, destructive keys and invalid fields. Its soft mix (fail-soft) is the lamp halo. Dark: #ef6a5c.
- **Caution Amber** (caution): running, saving, unsaved, lint hints, and the warning banner (fill caution-soft). Dark: #e0a634, banner #3a3122.

### Neutral
- **Warm-Grey Body** (body): the window ground, the top band, the modal footer. Dark: #1d1e20.
- **Panel Grey** (panel): every inset panel (list, peek, notes, sandbox, rails, dialogs). Dark: #26272a.
- **Key Face** (raise): the face of keys, inputs and the pressed segment. Dark: #323337.
- **Sunk Well** (well): search well, segmented control trough, inline code, code fences, URL field, find bar. Dark: #2e2f33.
- **Desk Grey** (desk): behind PDF pages only. Dark: #151618.
- **Hairline** (rule): panel rings, head and row dividers. Dark: #38393d.
- **Key Edge** (rule-strong): key and input borders, splitter grips, off lamps, section rules on the landing. Dark: #4c4d52.
- **Ink** (ink), **Muted Ink** (ink-muted), **Faint Ink** (ink-faint): primary text; secondary text and list prose; labels, meta and comments. Dark: #e7e7e4 / #b6b7b4 / #9a9ca1.
- **Selection Tint** (select-soft): hovered ghost buttons, selected rows, pressed pane toggles. 9% in dark.
- **Focus Blue** (focus): the 2px focus ring and focused input border only. Dark: #6f9ff0.
- **Site White** (site-ground) and **Site Ink** (site-ink): the ground of the content pane, where third-party pages render in their own look.

### Named Rules
**The One Orange Rule.** Each view has exactly one orange key. Everything else is a grey key, an ink key, or a flat button. Orange elsewhere is limited to the text caret and the selection tint.

**The Lights Are State Rule.** Green, red and amber mean state. In the interface they appear as a 7px lamp with a 2px halo of their own colour, beside a plain word; never as fills, panels or decoration. The one exception the build ships is code syntax, where strings take Lamp Green and numbers take Caution Amber at text weight; orange and red are kept out of syntax on purpose.

**The Ink Select Rule.** Selection and "on" states are ink, not colour: an active tag or pressed segment fills with ink (on light) and a selected row takes a 7% ink tint.

## Typography

**Body Font:** Figtree Variable (with Figtree, system-ui, sans-serif)
**Label/Mono Font:** JetBrains Mono Variable (with JetBrains Mono, ui-monospace, monospace)

**Character:** A friendly, even geometric sans for everything a person reads or presses, and a plain mono kept for what a machine would print. The pairing reads like a product label: words in the sans, measurements in the mono.

### Hierarchy
- **Display** (600, clamp(2.25rem, 4.4vw, 3.25rem), 1.06, -0.028em): landing and install page headline only, held to about 13ch.
- **Headline** (600, clamp(1.75rem, 3vw, 2.25rem), 1.12, -0.022em): landing section claims, max 16ch. Install guide section heads step down to 1.375rem.
- **Title, notes** (600, 1.75rem, 1.15): the first heading of a NOTES.md, in both the editor and the preview.
- **Title** (600, 1.3125rem, 1.25): the selected item in the peek; the vault picker heading is 1.625rem.
- **Title, band** (600, 0.9375rem): item title in the top band, list row titles at 0.875rem/550, dialog titles at 0.96875rem.
- **Body, notes** (400, 0.96875rem, 1.7): notes in the editor and preview, capped at 68ch.
- **Body, site** (400, 1rem, 1.55): landing prose, 44–52ch; the lede is 1.125rem in muted ink.
- **UI** (400–500, 0.8125rem): buttons, meta, spec lists, most interface text.
- **Label** (600, 0.65625rem in the app / 0.6875rem on the landing, 0.06em, uppercase, faint ink): names a panel or a field.
- **Mono** (400, 0.71875–0.8125rem, tabular figures): paths, URLs, file names, counts, durations, exit codes, shell commands, the code editor (13px).

### Named Rules
**The Mono Is Measurement Rule.** JetBrains Mono is for things a machine produced or would accept: code, output, paths, URLs, counts and timings. Captions, notes, list prose and empty-state copy are Figtree.

**The Named Panel Rule.** A small uppercase label names the panel or field it sits in (SANDBOX, VAULT, TERMINAL, SAVED). It lives inside a panel head or a status readout; it never floats above a headline as a kicker.

## Layout

The app is a body-coloured frame: a 52px band across the top, then panels inset with a 10px gutter on all sides and between them. The study view splits source (about 52%) and notebook; the notebook stacks NOTES.md over the sandbox, which docks beneath and collapses to its 36px head. The reading list splits 58/42 between the list and the peek (peek at least 18rem). Splitters are the gutter itself with a 3×28px grip that brightens and stretches on hover; inside a panel a splitter is a 1px hairline. Collapsed panes become 36px rails with a vertical label.

Panel heads are 36px with a label, a mono path and the panel's own controls. Rows are 9px by 14px with a lamp, a kind icon and a title over meta. Peek and dialogs pad 20px.

Below 760px the app stacks its panes vertically and drops meta, file names and button labels; the notebook is a container that tightens its toolbars at 720px and 480px of its own width.

The landing sits in a 1200px column with 48px gutters (16px below 900px). The hero is an 0.82:1.4 two-column grid (copy, then the device shot); later sections are claim beside instrument panel, alternating sides, separated by Key Edge rules and 88px of padding. The install guide is a 13rem heading column beside a 46rem body. Everything collapses to one column at 900px; the device shot drops its source pane there.

## Elevation & Depth

Depth is tonal first. Panels sit lighter than the body and are outlined by a 1px ring drawn as a shadow, not a border, so they read as plates set into the casing. Real shadows are small and physical: a 1px line under keys, a lift under things that float above the window, and on the landing a soft drop that presents panels as objects.

### Shadow Vocabulary
- **Panel ring** (`box-shadow: 0 0 0 1px var(--rule)`): every app panel, rail and inner device pane.
- **Key shadow** (`box-shadow: 0 1px 0 rgb(0 0 0 / 0.06)`, dark 0.3): grey keys, inputs-as-keys, pressed segments, copy key. Removed on press.
- **Primary key shadow** (`box-shadow: 0 1px 0 rgb(0 0 0 / 0.14)`): the orange key.
- **Lift** (`box-shadow: 0 4px 10px rgb(20 20 18 / 0.1), 0 24px 60px rgb(20 20 18 / 0.2)`): dialogs, the palette, toasts and editor tooltips.
- **Search inset** (`box-shadow: inset 0 1px 1px rgb(0 0 0 / 0.04)`): the search well, sunk into the band.
- **Lamp halo** (`box-shadow: 0 0 0 2px color-mix(in oklab, <status> 18%, transparent)`): lit lamps only; off lamps have none.
- **Site panel** (`box-shadow: 0 0 0 1px var(--rule-strong), 0 20px 40px -30px rgb(0 0 0 / 0.35)`): landing instrument panels.
- **Device** (`box-shadow: 0 0 0 1px var(--rule-strong), 0 34px 70px -34px rgb(0 0 0 / 0.4)`): the landing's product shot.

### Named Rules
**The Inset Plate Rule.** In the app, panels never cast a drop shadow; they are separated from the body by tone and a hairline ring. Only floating layers (dialogs, toasts, tooltips) lift.

## Shapes

Gently rounded, consistent corners that nest: 14px for the device casing, 12px for dialogs and landing panels, 8px for app panels and landing keys, 7px for wells, 6px for app keys, inputs and code blocks, 5px for segments inside a well, 3–4px for inline code. Tags are pills (13px). Lamps are 7px circles. Borders are 1px throughout; key and input edges use Key Edge, dividers use Hairline. Dashed borders appear only on placeholders that are not real content (the "Demo page" marker, the file drop target).

## Components

### Buttons
Flat until they need to be keys.
- **Shape:** 6px corners, 28px tall, 10px side padding, 13px weight 500, 15px stroke icons at 1.75.
- **Ghost:** transparent; hover takes the selection tint. Used for icon tools and pane toggles (pressed toggles keep the tint).
- **Key:** Key Face fill, Key Edge border, key shadow. Every text button in the top band is a key. Hover mixes a touch of ink into the face.
- **Primary:** Braun Orange, Burnt Edge, white 600 label, stronger 1px shadow; hover Pressed Orange; disabled falls back to a well with faint ink. One per view.
- **On (ink key):** ink fill, panel-coloured 600 label. A pressed secondary that still opens something (Open study).
- **Danger:** Key Face with a red-tinted edge and red label; the confirming destroy key fills Fault Red.
- **Press:** every key moves down 1px and loses its shadow (80ms).
- **Landing keys:** same anatomy at 44px tall, 8px corners, 18px padding, 15px label; a small 26px/6px variant appears inside the device shot.

### Status lights
A 7px lamp, lit with a 2px halo of its own colour, beside a plain 12px weight 600 word in the same colour (Exit 0, Failed, Running). Running and saving blink (1s, two steps). The notes save state and the vault's In sync readout pair a lamp with an uppercase label. The Done checkbox in the list is itself a lamp: off grey while pending, green once studied. A failed run keeps its meta line and draws a single red strike across it (420ms).

### Chips
- **Style:** pill tags, 26px tall, well fill, muted ink 12.5px weight 500, a faint mono count.
- **State:** hover adds a Key Edge border; active fills with ink and panel-coloured text. The tag bar scrolls and fades its far edge.

### Cards / Containers
- **Corner Style:** 8px (app), 12px (landing panel, dialog), 14px (device).
- **Background:** Panel Grey on the body.
- **Shadow Strategy:** panel ring in the app; site panel drop on the landing (see Elevation).
- **Border:** the ring; internal dividers are 1px Hairline.
- **Internal Padding:** heads 0 8px 0 14px at 36px (38px on the landing); bodies 14–20px.

### Inputs / Fields
- **Style:** Key Face fill, 1px Key Edge, 6px corners, 32px tall, 14px text. Selects carry a drawn chevron and the key shadow.
- **Search well:** sunk into the band: well fill, Hairline border, inset shadow, 7px corners, 32px.
- **Focus:** 2px Focus Blue outline (inputs draw it inset at -1px and hide the border); the search well turns its border and a 1px ring blue.
- **Error / Disabled:** invalid fields take a red border with red hint text; disabled fields sink to the well with muted ink.

### Segmented control
A well trough (2px padding, 7px corners) holding 22px buttons; the pressed one becomes a key (face, edge, key shadow). Source/Preview in the notes head; a wider 30px version in dialogs.

### Navigation
- **App:** the body-coloured band: back key, kind icon, title, mono origin and tags, then the band tools on the right. In the list view, the wordmark, vault name, search well, the orange Add key, and the vault's In sync lamp.
- **Landing:** a 68px line (60px narrow): 18px weight 700 wordmark with the feather mark, then 14px weight 500 links in muted ink that turn ink on hover or when current. No bar, no fill.

### Peek spec plate
The selected item's facts on disk as a two-column definition list (4.5rem term column, faint terms, 13px values, mono for paths), between the peek head and the notes excerpt. The landing's hero spec list is the same device: faint terms, muted values, a Key Edge rule above.

### Sandbox and run log
The sandbox is a panel docked under the notes with a head holding the language select, file select, tools and the orange Run key. The run log sits on a half-well tint: a head with lamp, mono meta and right-aligned mono duration, a 2px scale bar drawn against the timeout (faint, amber while running, red on failure), then mono output with stderr in red.

### Shell block (landing)
Commands in 13px mono with a faint, unselectable `$` prompt, wrapping with a hanging indent rather than scrolling, and a small Copy key pinned top right.

## Do's and Don'ts

### Do:
- **Do** give each view exactly one orange key, and make it the action the view exists for (Run, Add, Install).
- **Do** show state with a 7px lamp and a plain word: green done or passed, amber in progress or warned, red failed.
- **Do** set panels lighter than the body on an 8px radius with a 1px hairline ring, separated by the 10px body gutter.
- **Do** make text buttons keys (face, 1px edge, 1px shadow, 1px press) and icon tools flat until hovered.
- **Do** name panels with a small uppercase label inside the panel head.
- **Do** use JetBrains Mono for paths, URLs, code, output, counts and timings, and Figtree for everything else.
- **Do** keep selected and active states in ink, not colour.
- **Do** let third-party content render in its own look on the white content ground.

### Don't:
- **Don't** put orange on a second control in the same view, on icons, links, headings or panels.
- **Don't** use green, red or amber as fills, panel colours or decoration.
- **Don't** number items, sections or entries (no E-/R- codes, no section numerals).
- **Don't** draw rubber-stamp badges or a coloured band across the top; the band is the body.
- **Don't** set captions, notes, list prose or empty states in mono.
- **Don't** add drop shadows to app panels; only floating layers lift.
- **Don't** place uppercase labels above headlines as kickers.
