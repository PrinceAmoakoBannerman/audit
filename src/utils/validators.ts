import type { ParsedWorkbook } from '../types/audit';

export interface ValidationIssue {
  level: 'error' | 'warning';
  message: string;
}

const ACCEPTED_EXCEL_EXTENSIONS = ['.xlsx', '.xls'];
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_EXCEL_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB — generous for an audit workbook
const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB pre-compression

/** Validate a File is a plausible Excel workbook before we even try to parse it. */
export function validateExcelFile(file: File): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lowerName = file.name.toLowerCase();
  const hasValidExtension = ACCEPTED_EXCEL_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

  if (!hasValidExtension) {
    issues.push({
      level: 'error',
      message: `"${file.name}" doesn't look like an Excel file. Please upload a .xlsx or .xls workbook.`,
    });
  }
  if (file.size === 0) {
    issues.push({ level: 'error', message: `"${file.name}" is empty.` });
  }
  if (file.size > MAX_EXCEL_SIZE_BYTES) {
    issues.push({
      level: 'error',
      message: `"${file.name}" is larger than 25 MB. Please split it or remove unused sheets.`,
    });
  }
  return issues;
}

/** Validate an uploaded image before we attempt to resize/embed it. */
export function validateImageFile(file: File): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    issues.push({
      level: 'error',
      message: `"${file.name}" is not a supported image type. Please use JPG or PNG.`,
    });
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    issues.push({
      level: 'error',
      message: `"${file.name}" is larger than 20 MB and can't be processed.`,
    });
  }
  return issues;
}

/** Sanity-check a parsed workbook and surface useful, specific warnings. */
export function validateParsedWorkbook(workbook: ParsedWorkbook): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (workbook.sheetNames.length === 0) {
    issues.push({ level: 'error', message: 'The workbook has no worksheets.' });
    return issues;
  }

  const usableSheets = workbook.sheets.filter((s) => !s.headerNotFound && s.findings.length > 0);
  if (usableSheets.length === 0) {
    issues.push({
      level: 'error',
      message:
        'No usable audit data was found in any worksheet. Make sure each sheet has a header row with columns like "Item", "Findings/Observations", "Recommendations", and "Status".',
    });
  }

  workbook.sheets.forEach((sheet) => {
    if (sheet.headerNotFound) {
      issues.push({
        level: 'warning',
        message: `Sheet "${sheet.sheetName}": couldn't find a recognizable header row (Item / Findings / Recommendations / Status). This sheet was skipped.`,
      });
      return;
    }
    if (sheet.findings.length === 0) {
      issues.push({ level: 'warning', message: `Sheet "${sheet.sheetName}" has a header row but no data rows.` });
    }
    if (sheet.unmappedHeaders.length > 0) {
      issues.push({
        level: 'warning',
        message: `Sheet "${sheet.sheetName}": columns not recognized and ignored: ${sheet.unmappedHeaders.join(', ')}.`,
      });
    }
    const missingStatus = sheet.findings.filter((f) => !f.status.trim()).length;
    if (missingStatus > 0) {
      issues.push({
        level: 'warning',
        message: `Sheet "${sheet.sheetName}": ${missingStatus} row(s) have no Status value and will be treated as "resolved" in the statistics.`,
      });
    }
  });

  return issues;
}
