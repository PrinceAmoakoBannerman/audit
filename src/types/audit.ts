/**
 * Core domain types shared across the app.
 */

export type AuditType = 'Safety' | 'Technical' | 'Fire' | 'Other';

/** Canonical fields we try to map every worksheet's columns onto. */
export type CanonicalField =
  | 'item'
  | 'location'
  | 'finding'
  | 'recommendation'
  | 'status'
  | 'expectedDate';

/** One parsed audit finding/row, already mapped to canonical fields. */
export interface Finding {
  /** Stable id, unique within the whole workbook — used to attach photos. */
  id: string;
  /** Item / serial number as it appeared in the sheet (kept as string — may be "3a" etc). */
  item: string;
  location: string;
  finding: string;
  recommendation: string;
  status: string;
  expectedDate: string;
  /** Sub-heading the row was found under, e.g. "225kV Switchyard" (if detected). */
  section: string | null;
  /** Name of the worksheet this row came from. */
  sheetName: string;
  /** Audit type this row belongs to (resolved from sheet config + in-sheet block detection). */
  auditType: AuditType;
  /** Area/substation this row belongs to (from sheet configuration). */
  area: string;
  /** Row index in the original sheet — used only for ordering/debugging. */
  rowIndex: number;
  /** User-flagged as a "critical" finding — pulled into the Critical Observations tables in section 1. */
  critical: boolean;
}

/** Result of parsing a single worksheet. */
export interface ParsedSheet {
  sheetName: string;
  findings: Finding[];
  /** Column headers that could not be confidently mapped (for diagnostics). */
  unmappedHeaders: string[];
  /** True if the sheet had no usable header row at all. */
  headerNotFound: boolean;
}

/** Result of parsing the whole workbook. */
export interface ParsedWorkbook {
  fileName: string;
  sheetNames: string[];
  sheets: ParsedSheet[];
  warnings: string[];
}

/** How a given sheet (or an in-sheet block) should be treated when building the report. */
export interface SheetConfig {
  sheetName: string;
  /** Default audit type for rows in this sheet that don't have an in-sheet override. */
  auditType: AuditType;
  /** Area / substation label, e.g. "Prestea". */
  area: string;
  /** Whether to include this sheet in the generated report at all. */
  includeInReport: boolean;
  /** Short substation code shown in appendix headings, e.g. "P10". */
  substationCode: string;
  /** Freeform audit day/date for this substation, e.g. "Monday, May 18, 2026". */
  auditDay: string;
}

/** Status classification bucket used for statistics. */
export type StatusBucket = 'outstanding' | 'resolved';

export interface AuditStats {
  total: number;
  outstanding: number;
  resolved: number;
  /** resolved / total * 100, one decimal place. */
  percentage: number;
  /** Alternate weighted accomplishment figure — see auditCalculator.ts. */
  weightedPercentage: number;
  /** Raw counts per distinct status string, for transparency in the UI. */
  byStatus: Record<string, number>;
}

export interface StatsBreakdown {
  overall: AuditStats;
  byAuditType: Partial<Record<AuditType, AuditStats>>;
  byArea: Record<string, AuditStats>;
  bySheet: Record<string, AuditStats>;
}

/** A team member listed under "Composition of Team". */
export interface TeamMember {
  id: string;
  name: string;
  position: string;
  role: string;
}

/** A photo the user attaches, optionally linked to a specific Finding. */
export interface FindingImage {
  id: string;
  /** Finding.id this image is attached to, or null for a general/unattached photo. */
  findingId: string | null;
  fileName: string;
  caption: string;
  /** Resized/compressed image as a data URL, ready to embed in the docx. */
  dataUrl: string;
  /** Natural pixel dimensions of the (resized) image — needed to size it in Word. */
  width: number;
  height: number;
}

/** A code/meaning pair listed in "List of Abbreviations". */
export interface Abbreviation {
  code: string;
  meaning: string;
}

/** The single illustrative photo shown on the cover page (separate from finding-linked photos). */
export interface CoverPhoto {
  dataUrl: string;
  width: number;
  height: number;
}

/** Editable report metadata shown in the "Report Information" panel. */
export interface ReportInfo {
  areaName: string;
  year: string;
  reportTitle: string;
  auditDateRange: string;
  /** Cover-page month/year line, e.g. "MAY 2026". */
  coverMonthYear: string;
  coverPhoto: CoverPhoto | null;
  acknowledgementText: string;
  abbreviations: Abbreviation[];
  introText: string;
  /** Optional short note shown above the team table, e.g. carried-forward-from-last-cycle caveats. */
  teamNoteText: string;
  objectives: string[];
  scopeOfAudit: string[];
  recurringThemesText: string;
  generalConditionText: string;
  powerTransformersText: string;
  otherEquipmentText: string;
  batteryRoomsText: string;
  safetyAccomplishmentText: string;
  operatingStandardsText: string;
  fireProtectionText: string;
}

/** Everything the report generator needs to build the .docx. */
export interface ReportBuildContext {
  reportInfo: ReportInfo;
  team: TeamMember[];
  sheetConfigs: SheetConfig[];
  findings: Finding[];
  images: FindingImage[];
  stats: StatsBreakdown;
}

export const DEFAULT_OBJECTIVES: string[] = [
  'To assess the overall condition of equipment at the various substations/facilities audited.',
  'To provide early warning of potential issues that could lead to major outages or affect system reliability.',
  'To monitor adherence to policies and procedures governing the maintenance of equipment.',
  'To evaluate compliance with relevant statutory instruments and Occupational Health, Safety and Environment regulations.',
  'To monitor compliance with best industry practices, including relevant health and safety regulations.',
  'To assess the safety culture of personnel, including preparedness for emergency situations.',
];

export const DEFAULT_SCOPE_OF_AUDIT: string[] = [
  'Safety Management and Administration',
  'Office and Switchyard Safety and General Housekeeping',
  'Battery Room',
  'Control Room and associated equipment',
  'Transformers and Reactors',
  'Sections of transmission lines',
  'Circuit Breakers',
  'Disconnect Switches',
  'Communication Equipment',
  'Instrument Transformers',
  'Lightning Arrestors',
  'Capacitor Banks',
  'First Aid',
  'Public Protection',
  'Amenities such as washrooms and security buildings.',
];

export const DEFAULT_ABBREVIATIONS: Abbreviation[] = [
  { code: 'AVR', meaning: 'Automatic Voltage Regulator' },
  { code: 'CT', meaning: 'Current Transformer' },
  { code: 'CVT', meaning: 'Capacitor Voltage Transformer' },
  { code: 'GRIDCo', meaning: 'Ghana Grid Company Ltd' },
  { code: 'MCB', meaning: 'Miniature Circuit Breaker' },
  { code: 'OLTC', meaning: 'On Load Tap Changer' },
  { code: 'OSHA', meaning: 'Occupational Safety, Health and Administration' },
  { code: 'PPE', meaning: 'Personal Protective Equipment' },
  { code: 'SCADA', meaning: 'Supervisory Control and Data Acquisition' },
  { code: 'SF6', meaning: 'Sulphur Hexafluoride' },
];

export const DEFAULT_ACKNOWLEDGEMENT =
  'The Technical Services Department (TSD) is grateful to the Director for the support given to the Safety and ' +
  'Technical Audit Team to undertake this assignment successfully. TSD is also grateful to the Area Manager for ' +
  'supporting the Team with the necessary resources to undertake the Audit. We are equally grateful to the Safety ' +
  'Coordinator, various Supervisors and Maintenance teams who assisted with the audit in various ways.';

export const DEFAULT_RECURRING_THEMES =
  'Recurring themes across the Area should be summarized here (e.g. common defects seen across multiple ' +
  'substations, such as saturated silica gel breathers, defective cooling fans, oil leakage, or a lack of standby ' +
  'generators). Edit this paragraph to reflect the actual patterns found in this audit cycle.';

export const DEFAULT_GENERAL_CONDITION =
  'In general, the audit team was satisfied with the condition of most of the equipment within the Area at the ' +
  'time of the Audit. A number of issues, several of them outstanding from the previous audit cycle, remain due to ' +
  'lack of funds, spares and the difficulty of obtaining outages to carry out maintenance works. A detailed ' +
  'breakdown of findings is presented in Appendix I (Technical) and Appendix II (Safety) of this report.';

export const DEFAULT_POWER_TRANSFORMERS_TEXT =
  'Summarize recurring transformer-related issues across the Area here (e.g. saturated silica gel breathers, ' +
  'defective cooling fans, oil leakage from radiators, valves, gaskets and OLTC chambers), referencing the ' +
  'affected substations and transformers. See Appendix I for full details of individual findings.';

export const DEFAULT_OTHER_EQUIPMENT_TEXT =
  'Summarize the condition of other major substation equipment here (circuit breakers, disconnect switches, ' +
  'batteries, communication systems, auxiliary transformers, protection and metering systems), noting any ' +
  'recurring defects. See Appendix I for full details.';

export const DEFAULT_BATTERY_ROOMS_TEXT =
  'Summarize battery room and communication equipment deficiencies noted at stations across the Area here (e.g. ' +
  'frayed leads, unnumbered battery cells, missing battery banks, faulty extractor fans). See Appendix I and ' +
  'Appendix II for full details.';

export const DEFAULT_SAFETY_ACCOMPLISHMENT_TEXT =
  'Summarize the safety audit accomplishment for this cycle here, including a year-on-year comparison against ' +
  'the previous cycle where a reconciled list of prior-year outstanding items is available.';

export const DEFAULT_OPERATING_STANDARDS_TEXT =
  'Note any recurring operating-standards findings here (e.g. inadequate operator training flagged at one or ' +
  'more substations), and the recommended follow-up action.';

export const DEFAULT_FIRE_PROTECTION_TEXT =
  'Summarize fire readiness findings for this audit cycle here, or note that fire readiness was not assessed as ' +
  'part of this cycle’s dataset and reference the status of any outstanding fire-protection items from prior cycles.';
