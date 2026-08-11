import * as XLSX from 'xlsx';
import type { CanonicalField, Finding, ParsedSheet, ParsedWorkbook, AuditType } from '../types/audit';
import { formatCellValue, makeId, normalizeText } from '../utils/formatters';

/**
 * Aliases we recognize for each canonical field. Matching is done against a
 * normalized header (lowercase, trimmed, collapsed whitespace), so
 * "Status", "STATUS", "Status " and "Status/Constraints" all resolve to the
 * same field. Order matters: more specific aliases are listed first so they
 * win over shorter, more ambiguous ones during "contains" matching.
 */
const HEADER_ALIASES: Record<CanonicalField, string[]> = {
  item: ['item no.', 'item no', 's/n', 'sn', 'item'],
  location: [
    'equipment/location',
    'equipment / location',
    'equipment and location',
    'location/equipment',
    'equipment',
    'location',
  ],
  finding: [
    'findings/observations',
    'findings / observations',
    'finding/observation',
    'findings and observations',
    'observations',
    'observation',
    'findings',
    'finding',
  ],
  recommendation: [
    'recommendations/remarks',
    'recommendations / remarks',
    'recommendation/remarks',
    'recommendations and remarks',
    'recommendations',
    'recommendation',
    'remarks',
  ],
  status: ['status/constraints', 'status / constraints', 'status'],
  expectedDate: [
    'expected date of completion',
    'expected completion date',
    'date of completion',
    'completion date',
    'expected date',
    'date',
  ],
};

// Order matters: "fire safety audit" contains "safety audit" as a substring, so the more
// specific fire keywords must be checked first or every fire block would be misread as Safety.
const AUDIT_TYPE_KEYWORDS: Array<{ keyword: string; type: AuditType }> = [
  { keyword: 'fire safety audit', type: 'Fire' },
  { keyword: 'fire audit', type: 'Fire' },
  { keyword: 'safety audit', type: 'Safety' },
  { keyword: 'technical audit', type: 'Technical' },
];

const MIN_MATCHED_COLUMNS_FOR_HEADER = 3;
/** These two fields are the strongest signal a row is really a header row. */
const STRONG_SIGNAL_FIELDS: CanonicalField[] = ['finding', 'status'];

function matchHeaderAlias(rawHeader: unknown): CanonicalField | null {
  const normalized = normalizeText(rawHeader);
  if (!normalized) return null;

  // Exact match first.
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [CanonicalField, string[]][]) {
    if (aliases.includes(normalized)) return field;
  }
  // Fall back to "contains" matching (handles things like "S/N Item" or
  // stray extra words), trying longer aliases first to avoid false positives.
  const allAliases = (Object.entries(HEADER_ALIASES) as [CanonicalField, string[]][])
    .flatMap(([field, aliases]) => aliases.map((alias) => ({ field, alias })))
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const { field, alias } of allAliases) {
    if (normalized.includes(alias)) return field;
  }
  return null;
}

/** Try to interpret a row as the header row of a findings table. */
function tryMapHeaderRow(row: unknown[]): { map: Map<number, CanonicalField>; unmapped: string[] } | null {
  const map = new Map<number, CanonicalField>();
  const unmapped: string[] = [];
  const matchedFields = new Set<CanonicalField>();

  row.forEach((cell, colIndex) => {
    if (cell === null || cell === undefined || String(cell).trim() === '') return;
    const field = matchHeaderAlias(cell);
    if (field && !map.has(colIndex)) {
      // Avoid mapping two different columns to the same field by accident;
      // first match wins, later duplicates are left unmapped.
      if (![...map.values()].includes(field)) {
        map.set(colIndex, field);
        matchedFields.add(field);
        return;
      }
    }
    unmapped.push(String(cell).trim());
  });

  const strongSignals = STRONG_SIGNAL_FIELDS.filter((f) => matchedFields.has(f)).length;
  if (map.size < MIN_MATCHED_COLUMNS_FOR_HEADER || strongSignals < STRONG_SIGNAL_FIELDS.length) {
    return null;
  }
  return { map, unmapped };
}

/** A row that has exactly one non-empty cell and it's not purely numeric — likely a section/title row. */
function isLoneTextRow(row: unknown[]): string | null {
  const nonEmpty = row
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c !== null && c !== undefined && String(c).trim() !== '');
  if (nonEmpty.length !== 1) return null;
  const value = String(nonEmpty[0].c).trim();
  if (value === '') return null;
  if (/^\d+(\.\d+)?$/.test(value)) return null; // a lone number isn't a title
  return value;
}

function detectAuditTypeKeyword(text: string): AuditType | null {
  const normalized = normalizeText(text);
  for (const { keyword, type } of AUDIT_TYPE_KEYWORDS) {
    if (normalized.includes(keyword)) return type;
  }
  return null;
}

/** Detect a "SAFETY AUDIT" / "TECHNICAL AUDIT" block-title row by looking at its first cell only
 *  (that's where these labels appear in the source data; other cells on the same row may hold a
 *  date, so we deliberately don't require the whole row to be a single lone cell). A purely numeric
 *  first cell means this is a data row (an item number), not a block title, so it's excluded. */
function detectAuditTypeKeywordInRow(row: unknown[]): AuditType | null {
  const first = row[0];
  if (first === null || first === undefined) return null;
  const trimmed = String(first).trim();
  if (trimmed === '' || /^\d+(\.\d+)?$/.test(trimmed)) return null;
  return detectAuditTypeKeyword(trimmed);
}

function isRowEmpty(row: unknown[]): boolean {
  return row.every((c) => c === null || c === undefined || String(c).trim() === '');
}

/**
 * Parse a single worksheet into Finding rows.
 *
 * The sheet may contain more than one findings table (e.g. a "TECHNICAL
 * AUDIT" block followed by a "SAFETY AUDIT" block, each with its own header
 * row), and section sub-headings between rows (e.g. "225kV Switchyard").
 * We walk the sheet top to bottom, keeping track of the current column
 * mapping, the current in-sheet audit-type override, and the current
 * section title, re-detecting the header whenever we hit a new one.
 */
export function parseSheet(
  worksheet: XLSX.WorkSheet,
  sheetName: string,
  defaultAuditType: AuditType,
  defaultArea: string,
): ParsedSheet {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    raw: false,
    dateNF: 'dd/mm/yyyy',
  });

  const findings: Finding[] = [];
  const unmappedHeaders = new Set<string>();

  let currentMap: Map<number, CanonicalField> | null = null;
  let currentAuditType: AuditType = defaultAuditType;
  let currentSection: string | null = null;
  let headerEverFound = false;
  let rowCounter = 0;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? [];
    if (isRowEmpty(row)) continue;

    // 1. Does this row announce a new audit-type block (e.g. "SAFETY AUDIT ...")?
    //    Checked against the first cell only, independent of how many other
    //    cells on the row are populated (the source data often has a date in
    //    a later column on the same row as the "SAFETY AUDIT" label).
    const auditTypeFromRow = detectAuditTypeKeywordInRow(row);
    if (auditTypeFromRow) {
      currentAuditType = auditTypeFromRow;
      currentMap = null; // force re-detection of the header for the new block
      currentSection = null;
      continue;
    }

    // 2. Does this row look like a header row for a findings table?
    const headerAttempt = tryMapHeaderRow(row);
    if (headerAttempt) {
      currentMap = headerAttempt.map;
      headerEverFound = true;
      headerAttempt.unmapped.forEach((h) => unmappedHeaders.add(h));
      currentSection = null;
      continue;
    }

    // 3. If we don't have a column mapping yet, this row is front-matter
    //    (title rows, dates, etc.) — skip it.
    if (!currentMap) {
      continue;
    }

    // 4. A lone-text row *after* we already have a header mapping is very
    //    likely a section sub-heading (e.g. "225kV Switchyard", "Control Building").
    const loneText = isLoneTextRow(row);
    if (loneText) {
      currentSection = loneText;
      continue;
    }

    // 5. Otherwise, treat it as a data row using the current column mapping.
    const get = (field: CanonicalField): string => {
      for (const [colIndex, mappedField] of currentMap!.entries()) {
        if (mappedField === field) return formatCellValue(row[colIndex]);
      }
      return '';
    };

    const findingText = get('finding');
    const itemText = get('item');
    // A genuine data row needs at least a finding or a recommendation —
    // otherwise it's probably a stray merged-cell continuation or blank spacer.
    if (!findingText && !get('recommendation')) continue;

    rowCounter++;
    findings.push({
      id: makeId('f'),
      item: itemText || String(rowCounter),
      location: get('location'),
      finding: findingText,
      recommendation: get('recommendation'),
      status: get('status'),
      expectedDate: get('expectedDate'),
      section: currentSection,
      sheetName,
      auditType: currentAuditType,
      area: defaultArea,
      rowIndex: r,
      critical: false,
    });
  }

  return {
    sheetName,
    findings,
    unmappedHeaders: [...unmappedHeaders],
    headerNotFound: !headerEverFound,
  };
}

/** Read a File (from an <input type="file">) into a parsed workbook. Everything runs locally in the browser. */
export async function parseWorkbookFile(
  file: File,
  areaBySheet: (sheetName: string) => string = (name) => name,
  auditTypeBySheet: (sheetName: string) => AuditType = () => 'Other',
): Promise<ParsedWorkbook> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  const sheets: ParsedSheet[] = workbook.SheetNames.map((sheetName) => {
    const ws = workbook.Sheets[sheetName];
    return parseSheet(ws, sheetName, auditTypeBySheet(sheetName), areaBySheet(sheetName));
  });

  const warnings: string[] = [];
  if (workbook.SheetNames.length === 0) {
    warnings.push('The workbook contains no worksheets.');
  }

  return {
    fileName: file.name,
    sheetNames: workbook.SheetNames,
    sheets,
    warnings,
  };
}

/** Re-parse a workbook's findings after the user changes sheet -> area/audit-type configuration, without re-reading the file. */
export function reapplySheetConfig(
  workbook: ParsedWorkbook,
  configFor: (sheetName: string) => { area: string; auditType: AuditType; includeInReport: boolean },
): Finding[] {
  const result: Finding[] = [];
  for (const sheet of workbook.sheets) {
    const cfg = configFor(sheet.sheetName);
    if (!cfg.includeInReport) continue;
    for (const f of sheet.findings) {
      result.push({ ...f, area: cfg.area, auditType: f.auditType === 'Other' ? cfg.auditType : f.auditType });
    }
  }
  return result;
}
