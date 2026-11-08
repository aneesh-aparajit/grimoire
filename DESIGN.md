---
name: grimoire
description: A local-first study desk. The source on one side, a bound lab notebook on the other.
colors:
  paper: "#f3f5f1"
  paper-sunk: "#e8ece5"
  paper-raise: "#fafbf8"
  desk: "#d9dfd6"
  rule: "#cdd6cb"
  rule-strong: "#9fb3a1"
  ink: "#1c2230"
  ink-muted: "#535e6c"
  ink-faint: "#5d6876"
  pen: "#24396e"
  pen-soft: "color-mix(in oklab, #24396e 12%, transparent)"
  pen-on: "#f5f7fb"
  correction: "#b8382a"
  correction-soft: "color-mix(in oklab, #b8382a 9%, transparent)"
  pass: "#2f6b4a"
  caution: "#8a5a00"
  caution-soft: "#f4e9cf"
  cloth: "#22304a"
  cloth-raise: "#2c3c5a"
  cloth-ink: "#eef1ea"
  cloth-muted: "#aeb9cb"
  cloth-rule: "#3b4b69"
  site-ground: "#ffffff"
  focus: "#3a62c4"
  spark: "#7b5ce8"
typography:
  headline:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 680
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "0.96875rem"
    fontWeight: 650
    lineHeight: 1.3
  body:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "0.96875rem"
    fontWeight: 400
    lineHeight: 1.7
  ui:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 640
    letterSpacing: "0.07em"
    fontVariation: "'wdth' 72"
  stamp:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    letterSpacing: "0.08em"
    fontVariation: "'wdth' 66"
  mono:
    fontFamily: "JetBrains Mono Variable, JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "'tnum'"
  code:
    fontFamily: "JetBrains Mono Variable, JetBrains Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  display:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "clamp(3.4rem, 12.5vw, 9rem)"
    fontWeight: 820
    lineHeight: 0.9
    letterSpacing: "-0.04em"
    fontVariation: "'wdth' 112"
  display-close:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 108"
  entry-heading:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 680
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  margin-note:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
    fontVariation: "'wdth' 92"
rounded:
  mark: "2px"
  control: "3px"
  dialog: "4px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  inset: "14px"
  lg: "16px"
  xl: "20px"
  head: "36px"
  band: "52px"
  page-gutter: "40px"
  page-margin: "6.5rem"
components:
  button-primary:
    backgroundColor: "{colors.pen}"
    textColor: "{colors.pen-on}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "28px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "28px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "28px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.correction}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "28px"
  button-destroy:
    backgroundColor: "{colors.correction}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "28px"
  button-band-add:
    backgroundColor: "{colors.cloth-ink}"
    textColor: "{colors.cloth}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "28px"
  input-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  band-search:
    backgroundColor: "{colors.cloth-raise}"
    textColor: "{colors.cloth-ink}"
    rounded: "{rounded.control}"
    height: "32px"
  tag:
    backgroundColor: "{colors.paper-raise}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 8px"
    height: "26px"
  tag-selected:
    backgroundColor: "{colors.pen}"
    textColor: "{colors.pen-on}"
  stamp-pass:
    textColor: "{colors.pass}"
    typography: "{typography.stamp}"
    rounded: "{rounded.mark}"
    height: "18px"
  stamp-fail:
    textColor: "{colors.correction}"
    typography: "{typography.stamp}"
    rounded: "{rounded.mark}"
    height: "18px"
  module-head:
    backgroundColor: "{colors.paper-sunk}"
    textColor: "{colors.ink-muted}"
    height: "{spacing.head}"
  band:
    backgroundColor: "{colors.cloth}"
    textColor: "{colors.cloth-ink}"
    height: "{spacing.band}"
  dialog:
    backgroundColor: "{colors.paper-raise}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
  button-page:
    backgroundColor: "{colors.pen}"
    textColor: "{colors.pen-on}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  file-bar:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.mono}"
    height: "{spacing.head}"
  margin-note:
    textColor: "{colors.pen}"
    typography: "{typography.margin-note}"
    width: "24ch"
---

# Design System: grimoire

## Overview

**Creative North Star: "The Engineer's Lab Notebook"**

Every item you study is a bound lab notebook. Notes are numbered entries in a ruled margin, every sandbox run is a logged and timed entry, and failures are struck through with a single red line rather than erased. The app is the notebook's binding: a navy cloth band across the top, cool ruled paper below, and the source material laid on the desk beside it.

The system is dense and quiet, built for sessions that last hours. Structure comes from hairline rules and small tabbed module heads, not from cards, panels or shadows. Color carries meaning, not decoration: blue ink is what you wrote, red is a correction, green is a pass, ochre is a caution, and sage is the ruling on the page. Type follows a printed form. Archivo at normal width does the reading and writing; its condensed cut, uppercase and letterspaced, is the voice of a form's field names; JetBrains Mono records code, output and measurements.

The world rejects the default dark neutral IDE split with tabs and a single purple accent, and it rejects cream "paper": the ground is a cool, faintly green-gray stock.

**Key Characteristics:**
- Cool ruled paper ground with a notebook-cloth navy band as the only heavy surface.
- Ink-blue for the user's own writing; correction red reserved for failure.
- Hairline modules with small tab heads; panes never cast shadows.
- Condensed uppercase form labels, numbered entries (E-01) and numbered runs (R-01).
- Status marks itself with bordered stamps that stay on the page.
- Light and dark follow the system; dark is night ink on navy paper, not inverted gray.

## Colors

A cool, low-chroma paper and ink palette where every saturated hue is a signal.

### Primary
- **Notebook Ink Blue** (pen): the user's own writing. Note text in the editor and preview, entry titles in the peek, the caret, the selection tint, the current outline item, selected rows and tags, and the primary action. In dark mode it lifts to a pale periwinkle so writing stays the brightest thing on the page.
- **Ink Wash** (pen-soft): the 12% wash of the same ink behind selected list rows, the active palette item, the current PDF outline entry and hovered recent vaults.

### Secondary
- **Notebook Cloth Navy** (cloth): the shell band at the top of every view and the transient notice toast. Its raise (cloth-raise) is the hover and pressed fill for band buttons and the search well; cloth-ink and cloth-muted are the text on it; cloth-rule divides band groups.

### Tertiary (signals)
- **Correction Red** (correction): failure. The strike through a failed run, the failed run's duration bar, `Exit n` and `Timed out` stamps, invalid fields, form errors, the error notice, and the two actions that end or destroy something (Stop a run; delete an item together with its folder).
- **Pass Green** (pass): a clean exit, the saved dot, `Done` stamps, and strings in code.
- **Caution Ochre** (caution, caution-soft): stopped runs, the unsaved dot, lint hints, missing toolchains and the `INDEX.md` merge-conflict banner. Its soft fill backs banners only.
- **Focus Blue** (focus): the 2px keyboard focus ring and focused input outline, brighter than the pen so focus never reads as writing.

### Neutral
- **Cool Paper** (paper): the ground of the notebook, list, dialogs' footers and the run log.
- **Sunk Paper** (paper-sunk): module heads, tag bar, find bar, collapsed-pane rails, fenced code.
- **Raised Paper** (paper-raise): the peek, dialogs, the code editor, select and URL wells.
- **Desk** (desk): the surface behind PDF pages.
- **Sage Rule** (rule) and **Strong Sage Rule** (rule-strong): hairlines between modules, rows and entries; control borders, splitter hover and scrollbar thumbs.
- **Ink** (ink), **Muted Ink** (ink-muted), **Faint Ink** (ink-faint): printed text, secondary text and metadata, and entry and row numbers.
- **Site Ground** (site-ground): the white behind third-party content. The source is shown in its own look, not grimoire's.

### Named Rules
**The Correction Rule.** Red means something failed or is about to be destroyed. It never appears in syntax highlighting, decoration, badges or emphasis.

**The Ink Is Yours Rule.** Notebook ink blue is the color of what the person wrote. Printed interface text stays in ink; the pen also marks selection and the one primary action per view, never ornament.

**The Cool Paper Rule.** The ground is cool green-gray paper. Never cream, never pure white for grimoire's own surfaces; white belongs to third-party content only.

### Landing page (Persuade surface)
The landing page at `web/` reuses every app color above with the same light and dark values, and adds one:
- **Spark Violet** (spark): the star beside the feather in the wordmark, the star that lands at the end of the written-in title, the small star that pops onto the corner of a page button on hover and focus, and the burst of stars around a passing `Exit 0` stamp. It lifts to a pale lilac in dark mode.

**The Spark Rule.** Violet is the sparkle and nothing else. It is only ever the four-point star shape; never text, a link, a fill, a border, a focus ring or an accent on a control. It does not appear in the app's working views.

## Typography

**Display Font:** none; the system has no display face. The landing page sets Archivo itself at display sizes (see Landing page below).
**Body Font:** Archivo Variable (with Archivo, system-ui)
**Label/Mono Font:** Archivo Variable condensed via the `wdth` axis for labels; JetBrains Mono Variable (with ui-monospace) for code, output and measurements.

**Character:** one grotesque used at two widths, like a printed lab form: normal width for reading and writing, condensed and letterspaced for the form's field names. Mono is the instrument readout.

### Hierarchy
- **Headline** (680, 1.375rem, -0.01em): the note's H1 in source and preview. The peek title (660, 1.25rem) and vault picker heading (1.5rem) sit at this level.
- **Title** (620 to 650, 0.96875rem): band item title, dialog titles, note H2 entries (1.0625rem).
- **Body** (400, 0.96875rem, line-height 1.7): notes, max 68ch.
- **UI** (400 to 560, 0.8125rem): controls, rows (row titles 0.875rem at 560), dialogs.
- **Meta** (0.75 to 0.78rem, `wdth` 84 to 86): domains, tags and secondary row lines, slightly condensed.
- **Label** (640, 0.6875rem, 0.07em, uppercase, `wdth` 72): field names, module names, list section heads, table heads, entry and run numbers.
- **Stamp** (700, 0.625rem, 0.08em, uppercase, `wdth` 66): status stamps only.
- **Mono** (0.71875 to 0.75rem, tabular numerals): file paths, URLs, timestamps, durations, counts, page numbers, run output. Code editor at 13px, line-height 1.6.

### Named Rules
**The Printed Form Rule.** Uppercase condensed labels name a field, a module or a list section, sitting in a head or beside the thing they name. They are never a kicker above a heading.

**The Measurement Rule.** If it is code, output, a path or a number someone might compare (time, duration, count, page), set it in JetBrains Mono with tabular numerals. Nothing else is mono.

**The Width Axis Rule.** Hierarchy comes from width and weight on one family (100 for prose, 84 to 86 for metadata, 72 for labels, 66 for stamps), not from adding faces.

### Landing page (Persuade surface)
The same family runs wider and heavier for a page that has to persuade; nothing new is loaded.
- **Display** (820, `wdth` 112, -0.04em, line-height 0.9): the `# grimoire` title only, in pen, on one line, with its `#` marker at 480.
- **Display Close** (800, `wdth` 108, -0.035em): the closing `Open the book.` line only.
- **Entry Heading** (680, 1.75rem, -0.015em; 1.5rem under 760px): each entry's `##` heading, in pen, with the `##` marker in strong sage at 500.
- **Lede** (clamp(1.25rem, 2.2vw, 1.625rem), line-height 1.4, max 30ch): the single line under the title. Entry body copy runs at 1.0625rem, line-height 1.7, max 62ch, in pen.
- **Margin Note** (400, 0.9375rem, `wdth` 92): handwriting-voice asides in the right margin; see Components.

**The Wide For Display Rule.** Display size comes from pushing Archivo past normal width (108 to 112) and weight (800 to 820), never from a second face. Use it twice per page at most: the title and the close.

## Layout

Every view is the same three-row grid: the cloth band (52px), an optional banner row, then the work area. Module heads are 36px with a 14px left inset; that inset recurs as the left edge of run rows, banners and sandbox messages.

The study view is a resizable split: source left (about 52%), notebook right, joined by a 1px splitter with an 8px invisible hit area. In the notebook the NOTES.md module dominates and the sandbox docks beneath it, collapsed to its head by default, opening to editor plus run log. Either pane collapses to a 36px vertical rail with a sideways label. The reading list splits 58:42 between rows and the peek.

Notes carry a 4.5rem entry margin left of the text, where E-numbers sit opposite each `##` heading; the run log uses the same idea with R-numbers in a 2.5rem column and output indented to align past it.

Spacing steps are small and tight (6, 8, 12, 14, 16, 20px), with 20px reserved for dialog and peek padding. Under 760px the split stacks vertically, metadata and button labels drop, and the entry numbers move inline. The notebook also responds to its own width through a container query, shedding labels at 720px and file names at 480px.

### Landing page (Persuade surface)
The page is one NOTES.md: the cloth band (52px), a sticky mono file bar (36px), then a 1200px column with a 40px gutter. Each entry is a three-column grid: a 6.5rem entry margin holding its `E-00` to `E-05` label, a text column up to 680px, and a right margin for the margin note. A full-height sage rule runs down the page just inside the entry margin, and a full-width rule opens every entry after the title. Entries breathe more than the app (44px above, 72px below). Under 1040px the margin note drops beneath the text; under 760px the gutter falls to 16px, the margin rule disappears and the E-number moves to the top right of its entry.

## Elevation & Depth

The page is flat. Depth comes from tone (sunk heads, raised peek and dialogs, the desk under PDF pages) and from hairline rules. Shadows exist only on things that physically float over the page: dialogs, the notice toast, editor tooltips, and the paper of a PDF page lying on the desk.

### Shadow Vocabulary
- **Dialog lift** (`box-shadow: 0 4px 10px rgb(10 20 40 / 0.12), 0 24px 60px rgb(10 20 40 / 0.22)`): modal dialogs and the command palette, over a navy backdrop at 36%.
- **Notice lift** (`box-shadow: 0 2px 4px rgb(10 20 40 / 0.2), 0 8px 24px rgb(10 20 40 / 0.18)`): the bottom-centered notice toast.
- **Tooltip lift** (`box-shadow: 0 2px 4px rgb(10 20 40 / 0.08), 0 8px 20px rgb(10 20 40 / 0.1)`): CodeMirror lint tooltips.
- **Paper on desk** (`box-shadow: 0 1px 2px rgb(20 30 40 / 0.18), 0 4px 14px rgb(20 30 40 / 0.1)`): PDF pages only.

### Named Rules
**The No-Shadow Panes Rule.** Panes, modules, rows, the peek and the band never cast shadows. If it does not float above the page, it is separated by a rule or a tone, not a shadow.

## Shapes

Nearly square. Controls, inputs, tags, selects and the notice use a 3px corner; stamps and the focus ring a 2px corner; dialogs 4px. Panes, modules, rows and the band have no radius at all. Lines are 1px hairlines everywhere; the only heavier strokes are the 1.5px stamp border and the 1.5px correction strike. Dashed 1px borders mark a slot to fill (the PDF file picker). The one circle is the 6px save-state dot.

**The Hairline Rule.** Every division is a single 1px sage line. No double borders, no boxed cards.

## Components

### Buttons
Compact and plain: a form's buttons, not a marketing call to action.
- **Shape:** 28px tall, slightly squared corners (3px), 15px Lucide line icons at 1.75 stroke, 6px gap.
- **Primary:** pen fill with pen-on text at weight 600; hover mixes 12% ink into the pen. One per view at most (Open, Run, Save).
- **Outline:** transparent with a strong-sage border; the default for secondary actions.
- **Ghost:** transparent; hover is a 6% ink wash, active 10%. Toolbar and icon buttons (28px square).
- **Danger:** correction-red text with a 55% red border (Stop). **Destroy:** solid correction fill with white text, only for deleting an item along with its folder.
- **On the band:** text in cloth-ink, hover and pressed in cloth-raise; the Add action inverts to a cloth-ink fill with cloth text.
- **Keyboard hints:** a mono 11px hint at 75% opacity inside the button (`⌘↵`, `↵`).

### Chips
- **Tag:** 26px, raised paper, strong-sage border, 3px corner; a mono count in faint ink after the name. Hover darkens the border to faint ink.
- **Selected:** pen fill and border, pen-on text, count at 80% opacity.

### Stamps (signature)
Uppercase condensed (`wdth` 66, 700, 10px) inside a 1.5px border in the current color, 18px tall, 2px corner. Color comes from the state: pass (`Exit 0`, `Done`), correction (`Exit n`, `Timed out`), caution (`Stopped`, `<bin> not found`), pen (`Running`). States mark themselves on and stay.

### Cards / Containers
There are no cards. Containers are modules: a 36px sunk head with a hairline beneath, then content flush to the edges.
- **Module head:** sunk paper, a condensed label or a mono file path (the file name bolded in ink), controls pushed right.
- **Peek:** raised paper column; a head block with kind and domain meta, a 1.25rem title, mono source and tags, actions; then ruled Entries and Runs lists.
- **Dialog:** raised paper, strong-sage border, 4px corner, dialog lift. Head and foot divided by hairlines; the foot sits on paper. Rises 6px over 200ms.

### Inputs / Fields
- **Style:** 32px, paper ground, strong-sage 1px border, 3px corner, 14px text. A condensed label sits above, a 12px muted hint below.
- **Focus:** 2px focus-blue outline inset by 1px; the border goes transparent.
- **Error / Disabled:** invalid fields take a correction border and a red hint; disabled fields drop to sunk paper and muted ink.
- **Select:** 28px raised-paper well with a drawn chevron. **Segmented control:** a strong-sage outline with the pressed segment filled in ink on paper.
- **Band search:** a 32px cloth-raise well with cloth-muted icon and placeholder; focus shows a cloth-muted border.

### Navigation
- **Cloth band:** wordmark (`grimoire`, lowercase, 700 at `wdth` 80), vault switcher, search, then tools right-aligned. In the study view: back to the reading list, a kind icon, title, condensed source domain and tags, Mark done, pane toggles. Group dividers are 1px cloth-rule lines inset 14px from the band edges.
- **Reading list rows:** checkbox, condensed row number, kind icon, title over a meta line. Hairline at 60% rule between rows; hover is a 3% ink wash, selection the ink wash with the title in pen. Done rows mute their title. Section heads (`To study`, `Done`) are sticky condensed labels with a mono count.
- **Command palette:** a 48px borderless input over a ruled list; the active item takes the ink wash and pen text.

### Entry Margin (signature)
Each `##` heading in NOTES.md opens a numbered entry: a full-width sage rule above it, and `E-01`, `E-02` in the condensed label voice in the 4.5rem left margin. The same numbering appears in the rendered preview and in the peek's Entries list, so an entry is findable everywhere by its number.

### Run Log (signature)
Every run is a ruled entry: `R-01` label, mono timestamp and file, the exit stamp, a right-aligned mono duration, a chevron. Under it a 3px bar draws the duration to scale against the timeout, in pen, or in correction when the run failed. A failed run's meta is struck through with a single 1.5px red line that draws left to right over 420ms and is never removed. A running bar pulses at 1.2s. Output sits in mono below, stderr in correction red. The peek repeats the log in miniature with a 2px bar.

### Banners
Full-width rows under the band on caution-soft with a 35% caution hairline and an ochre warning icon; plain-language text with mono file names, actions at the end.

### Landing page (Persuade surface)
The landing page uses the app's own stamps, modules, tags, entry margin and run log unchanged, with live product demos (INDEX.md, the split, the sandbox, the vault) built as real modules, not screenshots.
- **Page button:** the primary button scaled for a page: 40px, 16px side padding, 15px text at 600, the same 3px corner. A spark star pops onto its top right corner on hover and focus. One action, View on GitHub, appears in the hero and the close.
- **File bar:** a sticky 36px mono bar under the band naming the page `~/grimoire/NOTES.md`, a crumb of the entry in view (its E-number in pen), and the save dot with `Writing` or `Saved`. Paper at 92% with an 8px blur so text scrolling beneath stays legible; a hairline below.
- **Margin note (signature):** a short aside in the pen, tilted -1.5deg, at most 24ch, with a hand-drawn SVG arrow above it (1.5px pen stroke, round caps and joins) pointing back at the text. One per entry at most, and only for a true aside: a caveat, a hint, a reassurance.
- **Cast cell:** the sandbox module running its own story. R-01 fails, its meta is struck through in red and the traceback stays; the typo is rewritten in pen with a blinking caret; R-02 passes with `Exit 0` and a burst of five spark stars. The Cast button replays it; old runs keep their numbers.

### Motion (landing page)
Motion is writing, never decoration. Everything is visible by default; JavaScript opts the reveals in, and every reveal, write-in and burst is off under reduced motion.
- **Quill write-in:** the title is clipped open left to right over 1500ms while the feather quill travels with it and scribbles, then lifts away; the spark star then lands and twinkles every few seconds.
- **Rule draw-on:** each entry's top rule draws from the left over 900ms when the entry first enters view; its margin note's arrow draws on along its own path. The close line writes in the same way.
- **Cast sequence:** strike-through (the app's 420ms correction strike), pen rewrite, pass, sparkle burst (760ms, staggered 40ms per star).

**The Write-In Rule.** Things appear the way ink does: drawn left to right or along their path, once, the first time they are seen. Nothing fades up, slides in or bounces.

## Do's and Don'ts

### Do:
- **Do** keep red for failure: failed runs, error exits, timeouts, invalid input, and the Stop and delete-with-folder actions.
- **Do** set the user's own writing in notebook ink blue and printed interface text in ink.
- **Do** separate regions with 1px sage hairlines and sunk 36px module heads.
- **Do** number things the person makes: E-numbers for note entries, R-numbers for runs, row numbers in the list, all in the condensed label voice.
- **Do** set every path, timestamp, duration, count and output in JetBrains Mono with tabular numerals.
- **Do** mark status with a bordered stamp that stays put rather than a transient toast or a filled pill.
- **Do** strike a failed entry through with one red rule and leave it visible.
- **Do** keep corners at 3px for controls, 2px for marks and 4px for dialogs.
- **Do** show third-party content on its own white ground in its own type.
- **Do** (landing page) keep spark violet to the four-point star: the wordmark, the title's end, the page button's hover, the pass burst.

### Don't:
- **Don't** use correction red in syntax highlighting, decoration or emphasis.
- **Don't** erase or hide a failed run; correct it in place.
- **Don't** put shadows on panes, modules, rows, the peek or the band.
- **Don't** wrap content in cards or rounded panels; use ruled modules.
- **Don't** use a cream or warm paper ground, or pure white for grimoire's own surfaces.
- **Don't** fall back to a dark neutral IDE split with tabs and a single purple accent.
- **Don't** use the uppercase condensed label as a kicker or eyebrow above a heading.
- **Don't** introduce a second sans or a display face; get hierarchy from Archivo's weight and width.
- **Don't** use mono for prose or interface labels.
- **Don't** (landing page) replace live product modules with screenshots or feature cards, or use spark violet as a text, link or control color.
