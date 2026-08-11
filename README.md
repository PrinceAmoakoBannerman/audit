# Audit Report Generator

A frontend-only web app that turns an Excel audit workbook into a professionally
formatted Word (`.docx`) audit report — entirely in the browser. No backend, no
database, nothing ever leaves your machine.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

To type-check and build a production bundle:

```bash
npm run build
npm run preview
```

> **Note on this build:** `npm install`, `npm run build` (real `tsc` +
> `vite build` against the actual installed `@types/react`, `xlsx`, `docx`
> types), and the full app have all been run for real — see "What's been
> verified" below.

## What's been verified

Using the sample workbook this app was built against (5 sheets: Prestea,
Bogoso, Akyempim, New Tarkwa, Tarkwa — each with a Safety Audit block and a
Technical Audit block):

- **excelParser.ts** correctly detects the header row on every sheet (zero
  unmapped columns), correctly splits each sheet into its Safety/Technical
  blocks, correctly detects section sub-headings (e.g. "225kV Switchyard"),
  and extracts the exact same row counts a manual audit of the file found
  (158 total findings: 82 Technical + 76 Safety).
- **auditCalculator.ts** produces correct, sane totals/outstanding/resolved
  splits and percentages from that data, including handling messy real-world
  status text (e.g. a stray `"Outstanding."` with a trailing period is still
  correctly classified as outstanding).
- **reportGenerator.ts** was run against the real `docx` library end-to-end,
  producing a valid, correctly structured multi-page `.docx`, including the
  GRIDCo logo on the cover page and in the running page header.
- **The full app shell has been run for real**: `npm install`, `npm run
  build` (real `tsc -b` type-check + `vite build`, zero errors), and the dev
  server driven end-to-end in a real headless Chromium browser — upload
  workbook → configure sheets → edit team → upload a photo (exercising
  `imageProcessor.ts`'s Canvas-based resize/compress, which needs real
  browser APIs and couldn't be tested outside one) → generate → download —
  with zero console errors at every step. The downloaded `.docx` was
  unzipped and its `document.xml`/`header1.xml`/`footer1.xml` parts were
  confirmed well-formed, with both the uploaded photo and the GRIDCo logo
  correctly embedded and referenced.
- **Error-handling paths** in `validators.ts` and `imageProcessor.ts` were
  exercised with a genuinely empty file, a corrupted `.xlsx`, a workbook with
  no recognizable header row, and a corrupted image file — each produced the
  correct, specific user-facing message.
- **The full GRIDCo-style template** (Acknowledgement, List of Abbreviations,
  Executive Summary stats table, Introduction with Scope of Audit and Critical
  Observations tables, "Overall Condition of Equipment" narrative section, a
  real Word Table-of-Contents field, and Appendices I–IV split by
  Technical/Safety/Fire and lettered by substation) was driven end-to-end in a
  real browser against a 2-substation, 3-audit-type (Technical/Safety/Fire)
  workbook — with a cover photo, a finding photo, and critical-observation
  flags all set — and the resulting `.docx` was unzipped and checked
  section-by-section (every heading, every appendix, both the "flagged"
  and "nothing flagged" states of the critical-observations tables, and the
  "no data" placeholder text for Fire/Photos) for correct content and
  well-formed XML.

All of that was exercised via the actual source files in `src/services/`
(compiled and run directly), not a reimplementation.

## Security note

`npm audit` flags a high-severity prototype-pollution/ReDoS issue in the
`xlsx` package. The npm registry copy is stuck on the vulnerable 0.18.x line
(SheetJS ships fixes only via their own CDN, not npm), so this project
installs `xlsx` directly from `https://cdn.sheetjs.com/xlsx-0.20.3/` — the
fix path SheetJS themselves recommend. See the `xlsx` entry in
`package.json`.

A separate moderate-severity advisory remains in `vite`/`esbuild`
(dev-server-only path/NTLM issues that don't affect the production build);
fixing it requires a major-version Vite upgrade and was left alone rather
than risking a breaking change.

## How it works

1. **Upload** an `.xlsx`/`.xls` workbook. Parsing happens with SheetJS,
   entirely client-side (`services/excelParser.ts`).
2. The parser scans each sheet for a recognizable header row (flexible
   matching on column names — "Status", "STATUS", "Status/Constraints" all
   resolve to the same field), and walks the rows underneath it, picking up:
   - in-sheet audit-type blocks (a row whose first cell says "SAFETY AUDIT"
     or "TECHNICAL AUDIT" switches the audit type for subsequent rows), and
   - section sub-headings (a row with exactly one populated cell, after a
     header has already been found, e.g. "225kV Switchyard").
3. You **configure** each sheet's default area name and audit type in the
   Audit Configuration panel — this is only a *default*; any in-sheet
   "SAFETY AUDIT"/"TECHNICAL AUDIT" block label found during parsing takes
   precedence for rows under it.
4. **Statistics** are computed by `services/auditCalculator.ts`. A finding is
   bucketed as "outstanding" if its status text contains the word
   "outstanding" (case-insensitive); everything else counts as "resolved" —
   this mirrors how the source paper reports define the two buckets. A
   separate, swappable "weighted" accomplishment figure is also computed
   (see `STATUS_WEIGHTS` in that file) for audits that want partially-
   addressed items to count for less than fully-resolved ones.
5. You can optionally **flag findings as critical** (pulls them into the
   Critical Observations tables in section 1.4/1.5), **upload a cover photo**
   and **finding photos** — resized/compressed client-side (Canvas API,
   `services/imageProcessor.ts`) — and link each finding photo to a specific
   finding with a caption. Each sheet can also be given a **substation code**
   and **audit day**, used in the appendix headings.
6. **Generate Report** builds the `.docx` with the `docx` library
   (`services/reportGenerator.ts`), following the standard GRIDCo audit
   report structure: cover page (logo, title, area, month/year, cover photo),
   a real Word Table-of-Contents field, Acknowledgement, List of
   Abbreviations, Executive Summary (with a Technical/Safety accomplishment
   table), Introduction (Team, Objectives, Scope of Audit, Critical Technical
   and Safety Observations), Overall Condition of Equipment, Appendix I
   (Technical findings), Appendix II (Safety findings), Appendix III (Fire
   findings), and Appendix IV (photos) — each appendix grouped by area
   (lettered A, B, C…) and, within an area, by in-sheet section (e.g. "225kV
   Switchyard") — and downloads it via `file-saver`.

## Customizing the report template

Each section of the report is its own exported function in
`src/services/reportGenerator.ts` (`generateCoverPage`,
`generateTableOfContentsSection`, `generateAcknowledgement`,
`generateAbbreviations`, `generateExecutiveSummary`, `generateIntroduction`,
`generateTeamComposition`, `generateObjectives`, `generateScopeOfAudit`,
`generateCriticalObservations`, `generateOverallConditionOfEquipment`,
`generateAppendix`, `generatePhotoAppendix`), assembled by
`generateReportDocx`. Edit or reorder these independently — none of them
depend on each other's output.

The Table of Contents is a real Word field (`docx`'s `TableOfContents`), not
a hand-rolled static list — Word computes the actual page numbers the first
time the field is updated (most Word versions do this automatically on open;
otherwise right-click the TOC and choose "Update Field", or press Ctrl+A then
F9). This was a deliberate change from a static page-number TOC: with four
data-driven appendices whose length depends entirely on the uploaded
workbook, there's no way to know real page numbers ahead of generation.

Text sections that would otherwise require the app to editorialize about the
data (Acknowledgement, List of Abbreviations, Recurring Themes, and the
"Overall Condition of Equipment" narrative in 2.0–2.4) are editable fields in
the Report Information panel, pre-filled with generic starter text — the app
never invents analysis of your data on your behalf.

To change how "resolved" vs "outstanding" is decided, or how the weighted
percentage is computed, edit `classifyStatus` / `STATUS_WEIGHTS` in
`src/services/auditCalculator.ts` — nothing else needs to change.

To recognize additional column header spellings, add them to
`HEADER_ALIASES` in `src/services/excelParser.ts`. In-sheet audit-type block
labels ("SAFETY AUDIT", "TECHNICAL AUDIT", "FIRE AUDIT" / "FIRE SAFETY
AUDIT") are recognized in `AUDIT_TYPE_KEYWORDS` in the same file.

## Project structure

```
src/
├── components/       UI only — no parsing/calculation/document logic
├── services/         excelParser, auditCalculator, reportGenerator, imageProcessor
├── types/            shared TypeScript types (audit.ts)
├── utils/            formatters.ts, validators.ts
├── App.tsx           wires state + services + components together
└── main.tsx
```

## Data privacy

Excel files, images, and generated reports are processed entirely in memory
in your browser tab. Nothing is uploaded anywhere, and there are no API
calls — this app works fully offline once loaded.

## Known limitations / next steps

- The Table of Contents needs one manual "Update Field" the first time a
  reader opens the doc if their Word doesn't refresh fields automatically on
  open (a note to that effect is printed above the TOC in the generated
  document).
- Photos are placed in a single "Pictures of Critical Findings" appendix
  rather than inline inside the findings tables (embedding images inside
  table cells that also need to paginate cleanly is significantly more
  complex); each photo does show which finding it's linked to.
- Image reordering uses up/down buttons rather than drag-and-drop.
- Appendix area headings use one consistent `{Letter}. {Area} ({Code})`
  format across Technical/Safety/Fire; the original hand-written GRIDCo
  reports this template is based on sometimes used slightly different
  suffixes per appendix (e.g. voltage classes only in the Safety appendix)
  — that level of per-appendix customization isn't modeled to keep the data
  model from growing another special case for a cosmetic difference.
