import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  Footer,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  PageBreak,
  PageNumber,
  ShadingType,
  StyleLevel,
  Table,
  TableCell,
  TableRow,
  TableOfContents,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { AuditStats, AuditType, Finding, FindingImage, ReportBuildContext, ReportInfo, SheetConfig, TeamMember } from '../types/audit';
import { formatPercentage } from '../utils/formatters';
import { dataUrlToUint8Array, fitImageForDocx } from './imageProcessor';
import gridcoLogoUrl from '../assets/gridco-logo.png';

// Intrinsic pixel size of src/assets/gridco-logo.png — used to keep the aspect
// ratio correct when the logo is scaled for the cover page.
const LOGO_ASPECT_RATIO = 398 / 123;

/** Fetch the bundled GRIDCo logo once and return it as raw bytes for ImageRun. */
async function loadLogoBytes(): Promise<Uint8Array> {
  const response = await fetch(gridcoLogoUrl);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

// ---------------------------------------------------------------------------
// Shared styling constants
// ---------------------------------------------------------------------------

const NAVY = '1F3864';
const HEADER_GREY = 'D9D9D9';
const LIGHT_GREY = 'F2F2F2';
const FONT = 'Arial';
const PAGE_CONTENT_WIDTH_DXA = 10800; // A4-ish content width used for every full-width table
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  return new Paragraph({
    heading: level,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, bold: true, color: NAVY })],
  });
}

function paragraph(
  text: string,
  opts: { italics?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {},
): Paragraph {
  return new Paragraph({
    spacing: { after: 160, line: 276 },
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, italics: opts.italics })],
  });
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    numbering: { reference: 'report-bullets', level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text })],
  });
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

function cell(
  text: string,
  opts: {
    width: number;
    bold?: boolean;
    color?: string;
    shading?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    columnSpan?: number;
    /** When false, an empty string stays blank instead of being shown as "-". Default true. */
    emptyDash?: boolean;
    noBorder?: boolean;
  },
): TableCell {
  const displayText = text || (opts.emptyDash === false ? '' : '-');
  return new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    columnSpan: opts.columnSpan,
    shading: opts.shading ? { type: ShadingType.CLEAR, fill: opts.shading } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    borders: opts.noBorder
      ? { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER }
      : undefined,
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.LEFT,
        children: [new TextRun({ text: displayText, bold: opts.bold, color: opts.color, size: 19 })],
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// 1. Cover page
// ---------------------------------------------------------------------------

export function generateCoverPage(reportInfo: ReportInfo, logoBytes?: Uint8Array): (Paragraph | Table)[] {
  const logoWidth = 200;
  const logoHeight = Math.round(logoWidth / LOGO_ASPECT_RATIO);
  const out: (Paragraph | Table)[] = [];

  if (logoBytes) {
    out.push(
      new Paragraph({
        spacing: { after: 400 },
        children: [
          new ImageRun({
            data: logoBytes,
            transformation: { width: logoWidth, height: logoHeight },
            type: 'png',
          }),
        ],
      }),
    );
  } else {
    out.push(new Paragraph({ spacing: { after: 400 } }));
  }

  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 800 },
      children: [new TextRun({ text: 'SAFETY / TECHNICAL AUDIT REPORT', bold: true, size: 36, color: NAVY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 200 },
      children: [new TextRun({ text: reportInfo.areaName.toUpperCase(), bold: true, size: 36, color: NAVY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: reportInfo.coverMonthYear.toUpperCase(), bold: true, size: 26 })],
    }),
  );

  if (reportInfo.coverPhoto) {
    try {
      const { width, height } = fitImageForDocx(reportInfo.coverPhoto.width, reportInfo.coverPhoto.height, 6.3, 4.5);
      out.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new ImageRun({
              data: dataUrlToUint8Array(reportInfo.coverPhoto.dataUrl),
              transformation: { width, height },
              type: reportInfo.coverPhoto.dataUrl.includes('image/png') ? 'png' : 'jpg',
            }),
          ],
        }),
      );
    } catch {
      // If the cover photo can't be embedded, the report still generates fine without it.
    }
  }

  out.push(pageBreak());
  return out;
}

// ---------------------------------------------------------------------------
// 2. Table of contents — a real Word TOC field, since this report's structure
//    (per-substation appendices, variable-length critical-observation tables)
//    makes page numbers impossible to know ahead of generation. Word computes
//    them the first time the field is updated (automatic on most opens, or
//    right-click → "Update Field" / F9 otherwise).
// ---------------------------------------------------------------------------

export function generateTableOfContentsSection(
  context: ReportBuildContext,
  areaLetters: Map<string, string>,
): (Paragraph | TableOfContents)[] {
  return [
    heading('TABLE OF CONTENTS', HeadingLevel.HEADING_1),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({
          italics: true,
          size: 18,
          color: '888888',
          text: 'Page numbers below populate automatically when this document is opened in Word. If you ever need to refresh them manually (e.g. after editing the document), right-click the table and choose "Update Field", or press Ctrl+A then F9.',
        }),
      ],
    }),
    new TableOfContents('Table of Contents', {
      hyperlink: true,
      headingStyleRange: '1-3',
      stylesWithLevels: [new StyleLevel('Heading1', 1), new StyleLevel('Heading2', 2), new StyleLevel('Heading3', 3)],
      cachedEntries: buildTocEntries(context, areaLetters).map((e) => ({ title: e.title, level: e.level })),
    }),
    pageBreak(),
  ];
}

// ---------------------------------------------------------------------------
// 3. Acknowledgement & List of Abbreviations
// ---------------------------------------------------------------------------

export function generateAcknowledgement(reportInfo: ReportInfo): Paragraph[] {
  return [heading('ACKNOWLEDGEMENT', HeadingLevel.HEADING_1), paragraph(reportInfo.acknowledgementText)];
}

export function generateAbbreviations(reportInfo: ReportInfo): (Paragraph | Table)[] {
  if (reportInfo.abbreviations.length === 0) {
    return [heading('LIST OF ABBREVIATIONS', HeadingLevel.HEADING_1), paragraph('No abbreviations have been listed for this report.')];
  }
  const colw = [1600, PAGE_CONTENT_WIDTH_DXA - 1600];
  const rows = reportInfo.abbreviations.map(
    (a) =>
      new TableRow({
        children: [
          cell(a.code, { width: colw[0], bold: true, noBorder: true }),
          cell(a.meaning, { width: colw[1], noBorder: true }),
        ],
      }),
  );
  return [
    heading('LIST OF ABBREVIATIONS', HeadingLevel.HEADING_1),
    new Table({ width: { size: PAGE_CONTENT_WIDTH_DXA, type: WidthType.DXA }, columnWidths: colw, rows }),
    new Paragraph({ spacing: { after: 160 } }),
  ];
}

// ---------------------------------------------------------------------------
// 4. Executive summary
// ---------------------------------------------------------------------------

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function accomplishmentStatRows(technical: AuditStats | undefined, safety: AuditStats | undefined): TableRow[] {
  const colw = [3600, 1800, 3600, 1800];
  const row = (vals: [string, string, string, string], opts: { bold?: boolean; shading?: string; emptyDash?: boolean } = {}) =>
    new TableRow({
      children: vals.map((v, i) =>
        cell(v, {
          width: colw[i],
          bold: opts.bold,
          shading: opts.shading,
          align: i % 2 === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
          emptyDash: opts.emptyDash,
        }),
      ),
    });

  return [
    row(['Technical Audit % Accomplishment', '', 'Safety Audit % Accomplishment', ''], {
      bold: true,
      shading: NAVY,
      emptyDash: false,
    }),
    row(['Total number of issues', String(technical?.total ?? 0), 'Total number of issues', String(safety?.total ?? 0)]),
    row([
      'No. of Outstanding issues',
      String(technical?.outstanding ?? 0),
      'No. of Outstanding issues',
      String(safety?.outstanding ?? 0),
    ]),
    row([
      'No. of New/resolved issues',
      String(technical?.resolved ?? 0),
      'No. of New/resolved issues',
      String(safety?.resolved ?? 0),
    ]),
    row(
      ['% Accomplishment', formatPercentage(technical?.percentage ?? 0), '% Accomplishment', formatPercentage(safety?.percentage ?? 0)],
      { bold: true, shading: LIGHT_GREY },
    ),
  ];
}

export function generateExecutiveSummary(context: ReportBuildContext): (Paragraph | Table)[] {
  const { byAuditType, byArea } = context.stats;
  const { reportInfo } = context;
  const technical = byAuditType.Technical;
  const safety = byAuditType.Safety;
  const areas = Object.keys(byArea);

  const parts: (Paragraph | Table)[] = [heading('EXECUTIVE SUMMARY', HeadingLevel.HEADING_1)];

  parts.push(
    paragraph(
      `The technical and safety audit of the ${reportInfo.areaName} was conducted from ${reportInfo.auditDateRange} as part of ` +
        `GRIDCo’s ongoing efforts to ensure the reliability, safety, and operational integrity of its power network ` +
        `infrastructure. The audit covered the ${joinWithAnd(areas)} substations.`,
    ),
  );

  parts.push(
    paragraph(
      `The audit identified a total of ${technical?.total ?? 0} technical issues and ${safety?.total ?? 0} safety issues ` +
        `across the ${areas.length} substations. Of the technical issues, ${technical?.outstanding ?? 0} were outstanding from ` +
        `previous audit cycles and ${technical?.resolved ?? 0} were newly identified. Of the safety issues, ${
          safety?.outstanding ?? 0
        } were outstanding and ${safety?.resolved ?? 0} were newly identified.`,
    ),
  );

  parts.push(paragraph(reportInfo.recurringThemesText));

  parts.push(
    paragraph(
      'The Area is strongly advised to adhere to the recommendations in this report to enhance equipment reliability, ' +
        'reduce system downtime, and maintain safety compliance.',
    ),
  );

  parts.push(paragraph(`The percentage accomplishment for the ${reportInfo.year} audit cycle are as follows:`));

  parts.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: [3600, 1800, 3600, 1800],
      rows: accomplishmentStatRows(technical, safety),
    }),
  );

  parts.push(
    new Paragraph({
      spacing: { before: 160, after: 200 },
      children: [
        new TextRun({
          italics: true,
          size: 18,
          text:
            '"% Accomplishment" here reflects the share of items that are newly raised or already closed against the total ' +
            'found in this audit cycle, as no prior-year outstanding list was supplied for year-on-year resolution tracking.',
        }),
      ],
    }),
  );
  parts.push(pageBreak());
  return parts;
}

// ---------------------------------------------------------------------------
// 5. 1.0 Introduction and its subsections
// ---------------------------------------------------------------------------

export function generateIntroduction(context: ReportBuildContext): Paragraph[] {
  return [heading('1.0 Introduction', HeadingLevel.HEADING_1), paragraph(context.reportInfo.introText)];
}

export function generateTeamComposition(team: TeamMember[], teamNoteText: string): (Paragraph | Table)[] {
  const colw = [3600, 4800, 2400];
  const rows: TableRow[] = [
    new TableRow({
      children: [
        cell('Name', { width: colw[0], bold: true, color: 'FFFFFF', shading: NAVY, align: AlignmentType.CENTER }),
        cell('Position', { width: colw[1], bold: true, color: 'FFFFFF', shading: NAVY, align: AlignmentType.CENTER }),
        cell('Role', { width: colw[2], bold: true, color: 'FFFFFF', shading: NAVY, align: AlignmentType.CENTER }),
      ],
    }),
    ...team.map(
      (m) =>
        new TableRow({
          children: [
            cell(m.name, { width: colw[0] }),
            cell(m.position, { width: colw[1] }),
            cell(m.role, { width: colw[2], align: AlignmentType.CENTER }),
          ],
        }),
    ),
  ];
  const out: (Paragraph | Table)[] = [heading('1.1 Composition of Team', HeadingLevel.HEADING_2)];
  if (teamNoteText.trim()) out.push(paragraph(teamNoteText, { align: AlignmentType.LEFT, italics: true }));
  out.push(new Table({ width: { size: PAGE_CONTENT_WIDTH_DXA, type: WidthType.DXA }, columnWidths: colw, rows }));
  out.push(new Paragraph({ spacing: { after: 160 } }));
  return out;
}

export function generateObjectives(objectives: string[]): Paragraph[] {
  return [
    heading('1.2 Aims and Objectives', HeadingLevel.HEADING_2),
    paragraph('The aims and objectives of the audit were as follows:'),
    ...objectives.filter((o) => o.trim()).map(bulletParagraph),
    new Paragraph({ spacing: { after: 160 } }),
  ];
}

export function generateScopeOfAudit(scope: string[]): Paragraph[] {
  return [
    heading('1.3 Scope of Audit', HeadingLevel.HEADING_2),
    paragraph('The scope of the audit is as follows:'),
    ...scope.filter((s) => s.trim()).map(bulletParagraph),
    new Paragraph({ spacing: { after: 160 } }),
  ];
}

const CRITICAL_COLW = [700, 4200, 4200, 1700];

function criticalObservationsTable(findings: Finding[]): Table {
  const headRow = new TableRow({
    tableHeader: true,
    children: ['No.', 'Observation', 'Recommendation', 'Location'].map((t, i) =>
      cell(t, { width: CRITICAL_COLW[i], bold: true, color: 'FFFFFF', shading: NAVY, align: AlignmentType.CENTER }),
    ),
  });
  const rows = findings.map(
    (f, idx) =>
      new TableRow({
        children: [
          cell(String(idx + 1), { width: CRITICAL_COLW[0], align: AlignmentType.CENTER }),
          cell(f.finding, { width: CRITICAL_COLW[1] }),
          cell(f.recommendation, { width: CRITICAL_COLW[2] }),
          cell(f.area, { width: CRITICAL_COLW[3] }),
        ],
      }),
  );
  return new Table({ width: { size: PAGE_CONTENT_WIDTH_DXA, type: WidthType.DXA }, columnWidths: CRITICAL_COLW, rows: [headRow, ...rows] });
}

export function generateCriticalObservations(
  heading2: string,
  sectionNumber: '1.4' | '1.5',
  findings: Finding[],
): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [heading(`${sectionNumber} ${heading2}`, HeadingLevel.HEADING_2)];
  if (findings.length === 0) {
    out.push(paragraph(`No findings were flagged as critical ${heading2.replace('Critical ', '').toLowerCase()} for this cycle.`, { italics: true }));
  } else {
    out.push(criticalObservationsTable(findings));
    out.push(new Paragraph({ spacing: { after: 160 } }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// 6. "Overall Condition of Equipment" (2.0 - 2.4)
// ---------------------------------------------------------------------------

export function generateOverallConditionOfEquipment(reportInfo: ReportInfo): Paragraph[] {
  return [
    heading('OVERALL CONDITION OF EQUIPMENT', HeadingLevel.HEADING_1),
    heading('2.0 General Condition', HeadingLevel.HEADING_2),
    paragraph(reportInfo.generalConditionText),
    heading('2.1 Power Transformers, Auto Transformers and Reactors', HeadingLevel.HEADING_2),
    paragraph(reportInfo.powerTransformersText),
    heading('2.2 Other Major Substation Equipment', HeadingLevel.HEADING_2),
    paragraph(reportInfo.otherEquipmentText),
    heading('2.3 Battery Rooms and Communication Equipment', HeadingLevel.HEADING_2),
    paragraph(reportInfo.batteryRoomsText),
    heading('2.4 Safety Assessment', HeadingLevel.HEADING_2),
    heading('2.4.1 Safety Accomplishment', HeadingLevel.HEADING_3),
    paragraph(reportInfo.safetyAccomplishmentText),
    heading('2.4.2 Operating Standards', HeadingLevel.HEADING_3),
    paragraph(reportInfo.operatingStandardsText),
    heading('2.4.3 Fire Protection', HeadingLevel.HEADING_3),
    paragraph(reportInfo.fireProtectionText),
    pageBreak(),
  ];
}

// ---------------------------------------------------------------------------
// 7. Appendices I-III: findings tables grouped by Area (lettered), then by
//    in-sheet Section (e.g. "225kV Switchyard")
// ---------------------------------------------------------------------------

const FINDINGS_COLW = [500, 1500, 3300, 3300, 1200, 1000];

function findingsHeaderRow(): TableRow {
  const heads = ['No.', 'Equipment/Location', 'Findings/Observations', 'Recommendations/Remarks', 'Status', 'Expected Date of Completion'];
  return new TableRow({
    tableHeader: true,
    children: heads.map((t, i) =>
      cell(t, { width: FINDINGS_COLW[i], bold: true, color: 'FFFFFF', shading: NAVY, align: AlignmentType.CENTER }),
    ),
  });
}

function sectionRow(text: string): TableRow {
  return new TableRow({
    children: [cell(text, { width: PAGE_CONTENT_WIDTH_DXA, bold: true, shading: HEADER_GREY, columnSpan: 6 })],
  });
}

function findingsTable(findings: Finding[]): Table {
  const rows: TableRow[] = [findingsHeaderRow()];
  let lastSection: string | null | undefined = undefined;
  findings.forEach((f) => {
    if (f.section !== lastSection && f.section) {
      rows.push(sectionRow(f.section));
    }
    lastSection = f.section;
    rows.push(
      new TableRow({
        children: [
          cell(f.item, { width: FINDINGS_COLW[0], align: AlignmentType.CENTER }),
          cell(f.location, { width: FINDINGS_COLW[1] }),
          cell(f.finding, { width: FINDINGS_COLW[2] }),
          cell(f.recommendation, { width: FINDINGS_COLW[3] }),
          cell(f.status, { width: FINDINGS_COLW[4], align: AlignmentType.CENTER }),
          cell(f.expectedDate, { width: FINDINGS_COLW[5], align: AlignmentType.CENTER }),
        ],
      }),
    );
  });
  return new Table({ width: { size: PAGE_CONTENT_WIDTH_DXA, type: WidthType.DXA }, columnWidths: FINDINGS_COLW, rows });
}

/** Stable A, B, C... letter per area, in first-seen order — shared across Appendix I/II/III so an area keeps the same letter everywhere. */
export function assignAreaLetters(areas: string[]): Map<string, string> {
  const map = new Map<string, string>();
  areas.forEach((area, i) => map.set(area, String.fromCharCode(65 + i)));
  return map;
}

function sheetConfigForArea(sheetConfigs: SheetConfig[], findings: Finding[], area: string): SheetConfig | undefined {
  const match = findings.find((f) => f.area === area);
  if (!match) return undefined;
  return sheetConfigs.find((c) => c.sheetName === match.sheetName);
}

function areaHeadingLabel(letter: string, area: string, substationCode: string | undefined): string {
  return substationCode ? `${letter}. ${area} (${substationCode})` : `${letter}. ${area}`;
}

/** Areas (in stable letter order) that have at least one finding of the given audit type — shared by
 *  generateAppendix (to render the sections) and buildTocEntries (to pre-populate the same headings). */
function areasForAuditType(
  auditType: AuditType,
  context: ReportBuildContext,
  areaLetters: Map<string, string>,
): { letter: string; area: string; cfg: SheetConfig | undefined }[] {
  const relevant = context.findings.filter((f) => f.auditType === auditType);
  const orderedAreas = [...areaLetters.keys()].filter((area) => relevant.some((f) => f.area === area));
  return orderedAreas.map((area) => ({
    letter: areaLetters.get(area) ?? '?',
    area,
    cfg: sheetConfigForArea(context.sheetConfigs, context.findings, area),
  }));
}

export function generateAppendix(
  romanLabel: string,
  title: string,
  auditType: AuditType,
  context: ReportBuildContext,
  areaLetters: Map<string, string>,
  emptyPlaceholder: string,
): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [heading(romanLabel, HeadingLevel.HEADING_1), heading(title, HeadingLevel.HEADING_1)];
  const relevant = context.findings.filter((f) => f.auditType === auditType);

  if (relevant.length === 0) {
    out.push(paragraph(emptyPlaceholder));
    out.push(pageBreak());
    return out;
  }

  areasForAuditType(auditType, context, areaLetters).forEach(({ letter, area, cfg }) => {
    const areaFindings = relevant.filter((f) => f.area === area);
    out.push(heading(areaHeadingLabel(letter, area, cfg?.substationCode), HeadingLevel.HEADING_2));
    if (cfg?.auditDay) {
      out.push(paragraph(`${auditType} Audit — ${cfg.auditDay}`, { align: AlignmentType.LEFT }));
    }
    out.push(findingsTable(areaFindings));
    out.push(pageBreak());
  });

  return out;
}

/**
 * Pre-computed TOC entries, in the exact order/text the real headings appear in the document.
 * A brand-new Word field has no cached result, so any viewer that doesn't run Word's field engine
 * (or a Word that isn't set to auto-update fields) would otherwise show a blank Table of Contents —
 * this keeps the outline visible everywhere, with real page numbers filled in once Word updates the
 * field (see `features.updateFields` on the Document).
 */
function buildTocEntries(context: ReportBuildContext, areaLetters: Map<string, string>): { title: string; level: number }[] {
  const entries: { title: string; level: number }[] = [];
  const add = (title: string, level: number) => entries.push({ title, level });

  add('TABLE OF CONTENTS', 1);
  add('ACKNOWLEDGEMENT', 1);
  add('LIST OF ABBREVIATIONS', 1);
  add('EXECUTIVE SUMMARY', 1);
  add('1.0 Introduction', 1);
  add('1.1 Composition of Team', 2);
  add('1.2 Aims and Objectives', 2);
  add('1.3 Scope of Audit', 2);
  add('1.4 Critical Technical Audit Observations', 2);
  add('1.5 Critical Safety Audit Observations', 2);
  add('OVERALL CONDITION OF EQUIPMENT', 1);
  add('2.0 General Condition', 2);
  add('2.1 Power Transformers, Auto Transformers and Reactors', 2);
  add('2.2 Other Major Substation Equipment', 2);
  add('2.3 Battery Rooms and Communication Equipment', 2);
  add('2.4 Safety Assessment', 2);
  add('2.4.1 Safety Accomplishment', 3);
  add('2.4.2 Operating Standards', 3);
  add('2.4.3 Fire Protection', 3);

  const appendices: { roman: string; title: string; auditType: AuditType }[] = [
    { roman: 'APPENDIX I', title: 'TECHNICAL AUDIT FINDINGS AND RECOMMENDATION', auditType: 'Technical' },
    { roman: 'APPENDIX II', title: 'SAFETY AUDIT FINDINGS & RECOMMENDATION', auditType: 'Safety' },
    { roman: 'APPENDIX III', title: 'FIRE SAFETY AUDIT FINDINGS AND RECOMMENDATIONS', auditType: 'Fire' },
  ];
  appendices.forEach(({ roman, title, auditType }) => {
    add(roman, 1);
    add(title, 1);
    areasForAuditType(auditType, context, areaLetters).forEach(({ letter, area, cfg }) => {
      add(areaHeadingLabel(letter, area, cfg?.substationCode), 2);
    });
  });

  add('APPENDIX IV', 1);
  add('PICTURES OF CRITICAL FINDINGS', 1);

  return entries;
}

// ---------------------------------------------------------------------------
// 8. Appendix IV: Pictures of Critical Findings
// ---------------------------------------------------------------------------

export function generatePhotoAppendix(images: FindingImage[], findings: Finding[], year: string): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [heading('APPENDIX IV', HeadingLevel.HEADING_1), heading('PICTURES OF CRITICAL FINDINGS', HeadingLevel.HEADING_1)];

  if (images.length === 0) {
    out.push(
      paragraph(
        `No photographs were provided alongside the ${year} findings data. This appendix is retained as a placeholder to ` +
          'match the report structure used in previous cycles — please supply site photographs to populate this section.',
      ),
    );
    return out;
  }

  images.forEach((img, idx) => {
    const finding = img.findingId ? findings.find((f) => f.id === img.findingId) : undefined;
    out.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: `PHOTO ${idx + 1}`, bold: true, color: NAVY })],
      }),
    );
    if (finding) {
      out.push(
        paragraph(`Item ${finding.item} – ${finding.location || finding.section || finding.area}`, {
          align: AlignmentType.LEFT,
        }),
      );
      out.push(paragraph(`Finding: ${finding.finding}`, { align: AlignmentType.LEFT }));
    }
    if (img.caption) {
      out.push(paragraph(img.caption, { italics: true, align: AlignmentType.LEFT }));
    }
    try {
      const { width, height } = fitImageForDocx(img.width, img.height);
      out.push(
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new ImageRun({
              data: dataUrlToUint8Array(img.dataUrl),
              transformation: { width, height },
              type: img.dataUrl.includes('image/png') ? 'png' : 'jpg',
            }),
          ],
        }),
      );
    } catch {
      out.push(paragraph(`[Could not embed image "${img.fileName}"]`, { align: AlignmentType.LEFT }));
    }
  });

  return out;
}

// ---------------------------------------------------------------------------
// Document assembly
// ---------------------------------------------------------------------------

export async function generateReportDocx(context: ReportBuildContext): Promise<Blob> {
  let logoBytes: Uint8Array | undefined;
  try {
    logoBytes = await loadLogoBytes();
  } catch {
    logoBytes = undefined; // report still generates fine without the logo
  }

  const areaLetters = assignAreaLetters(Object.keys(context.stats.byArea));

  const children: (Paragraph | Table | TableOfContents)[] = [
    ...generateCoverPage(context.reportInfo, logoBytes),
    ...generateTableOfContentsSection(context, areaLetters),
    ...generateAcknowledgement(context.reportInfo),
    ...generateAbbreviations(context.reportInfo),
    ...generateExecutiveSummary(context),
    ...generateIntroduction(context),
    ...generateTeamComposition(context.team, context.reportInfo.teamNoteText),
    ...generateObjectives(context.reportInfo.objectives),
    ...generateScopeOfAudit(context.reportInfo.scopeOfAudit),
    ...generateCriticalObservations(
      'Critical Technical Audit Observations',
      '1.4',
      context.findings.filter((f) => f.critical && f.auditType === 'Technical'),
    ),
    ...generateCriticalObservations(
      'Critical Safety Audit Observations',
      '1.5',
      context.findings.filter((f) => f.critical && f.auditType === 'Safety'),
    ),
    pageBreak(),
    ...generateOverallConditionOfEquipment(context.reportInfo),
    ...generateAppendix(
      'APPENDIX I',
      'TECHNICAL AUDIT FINDINGS AND RECOMMENDATION',
      'Technical',
      context,
      areaLetters,
      `No technical audit dataset was provided for the ${context.reportInfo.year} cycle. This appendix is retained as a placeholder to match the report structure used in previous cycles — please supply technical audit findings to populate this section.`,
    ),
    ...generateAppendix(
      'APPENDIX II',
      'SAFETY AUDIT FINDINGS & RECOMMENDATION',
      'Safety',
      context,
      areaLetters,
      `No safety audit dataset was provided for the ${context.reportInfo.year} cycle. This appendix is retained as a placeholder to match the report structure used in previous cycles — please supply safety audit findings to populate this section.`,
    ),
    ...generateAppendix(
      'APPENDIX III',
      'FIRE SAFETY AUDIT FINDINGS AND RECOMMENDATIONS',
      'Fire',
      context,
      areaLetters,
      `No fire safety audit dataset was provided for the ${context.reportInfo.year} cycle. This appendix is retained as a placeholder to match the report structure used in previous cycles — please supply fire safety findings to populate this section.`,
    ),
    ...generatePhotoAppendix(context.images, context.findings, context.reportInfo.year),
  ];

  const doc = new Document({
    features: { updateFields: true },
    numbering: {
      config: [
        {
          reference: 'report-bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    styles: {
      default: { document: { run: { font: FONT, size: 21 } } },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          run: { size: 30, bold: true, color: NAVY, font: FONT },
          paragraph: { spacing: { before: 300, after: 160 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          run: { size: 25, bold: true, color: NAVY, font: FONT },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          run: { size: 22, bold: true, color: '444444', font: FONT },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 },
        },
        {
          id: 'TOC1',
          name: 'TOC 1',
          basedOn: 'Normal',
          next: 'Normal',
          run: { size: 21, bold: true, color: NAVY, font: FONT },
          paragraph: { spacing: { after: 100 } },
        },
        {
          id: 'TOC2',
          name: 'TOC 2',
          basedOn: 'Normal',
          next: 'Normal',
          run: { size: 20, font: FONT },
          paragraph: { spacing: { after: 80 }, indent: { left: 360 } },
        },
        {
          id: 'TOC3',
          name: 'TOC 3',
          basedOn: 'Normal',
          next: 'Normal',
          run: { size: 19, font: FONT },
          paragraph: { spacing: { after: 60 }, indent: { left: 720 } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            // A4
            size: { width: 11906, height: 16838 },
            margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: context.reportInfo.reportTitle, size: 16, color: '888888' })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: '888888' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '888888' }),
                  new TextRun({ text: ' of ', size: 16, color: '888888' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '888888' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
