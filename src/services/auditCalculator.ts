import type { AuditStats, AuditType, Finding, StatsBreakdown, StatusBucket } from '../types/audit';
import { normalizeText, titleCase } from '../utils/formatters';

/**
 * Status classification
 * ----------------------
 * Real-world audit sheets use inconsistent status text ("Outstanding",
 * "New", "Resolved", "Closed", "Referred to Engineering", ...). We only
 * need a binary bucket — "outstanding" vs "resolved" — to compute the
 * accomplishment percentage the same way the existing paper reports do:
 *
 *   Percentage Accomplishment = resolved / total * 100
 *
 * By default, anything whose status text contains "outstanding" is
 * outstanding; everything else (New, Resolved, Closed, Referred to
 * Engineering, or even a blank status) counts toward "resolved" — i.e.
 * "not currently blocking / not carried over as unresolved". This mirrors
 * how the source reports define the two buckets and keeps the total always
 * equal to outstanding + resolved.
 *
 * This classifier is intentionally a single, swappable function — change
 * it here (or pass a different one into computeStats) if a workbook uses
 * a three-way status scheme you want to bucket differently.
 */
export function classifyStatus(status: string): StatusBucket {
  const normalized = normalizeText(status);
  if (normalized.includes('outstanding')) return 'outstanding';
  return 'resolved';
}

/**
 * Weighted accomplishment strategy
 * ---------------------------------
 * The existing GRIDCo technical-audit reports sometimes use a "weighted"
 * percentage instead of a plain resolved/total ratio (e.g. partially-
 * addressed items count for less than fully-resolved ones). We model that
 * as a per-status weight in [0, 1]; anything not listed defaults to the
 * weight implied by classifyStatus (0 for outstanding, 1 otherwise).
 *
 * Edit STATUS_WEIGHTS to change how the weighted figure is computed —
 * nothing else needs to change.
 */
const STATUS_WEIGHTS: Record<string, number> = {
  outstanding: 0,
  new: 1,
  resolved: 1,
  closed: 1,
  'referred to engineering': 0.5,
};

function weightForStatus(status: string): number {
  const normalized = normalizeText(status);
  if (normalized in STATUS_WEIGHTS) return STATUS_WEIGHTS[normalized];
  return classifyStatus(status) === 'outstanding' ? 0 : 1;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computeStats(findings: Finding[]): AuditStats {
  const total = findings.length;
  let outstanding = 0;
  let resolved = 0;
  let weightedSum = 0;
  const byStatus: Record<string, number> = {};

  for (const f of findings) {
    const bucket = classifyStatus(f.status);
    if (bucket === 'outstanding') outstanding++;
    else resolved++;
    weightedSum += weightForStatus(f.status);

    const label = f.status.trim() ? titleCase(normalizeText(f.status)) : 'Not specified';
    byStatus[label] = (byStatus[label] ?? 0) + 1;
  }

  const percentage = total > 0 ? round1((resolved / total) * 100) : 0;
  const weightedPercentage = total > 0 ? round1((weightedSum / total) * 100) : 0;

  return { total, outstanding, resolved, percentage, weightedPercentage, byStatus };
}

export function computeStatsBreakdown(findings: Finding[]): StatsBreakdown {
  const overall = computeStats(findings);

  const byAuditType: Partial<Record<AuditType, AuditStats>> = {};
  const auditTypes = new Set(findings.map((f) => f.auditType));
  auditTypes.forEach((type) => {
    byAuditType[type] = computeStats(findings.filter((f) => f.auditType === type));
  });

  const byArea: Record<string, AuditStats> = {};
  const areas = new Set(findings.map((f) => f.area));
  areas.forEach((area) => {
    byArea[area] = computeStats(findings.filter((f) => f.area === area));
  });

  const bySheet: Record<string, AuditStats> = {};
  const sheets = new Set(findings.map((f) => f.sheetName));
  sheets.forEach((sheet) => {
    bySheet[sheet] = computeStats(findings.filter((f) => f.sheetName === sheet));
  });

  return { overall, byAuditType, byArea, bySheet };
}
