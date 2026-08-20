/**
 * Best-effort starter drafts for the narrative fields in "Overall Condition of
 * Equipment" (report section 2.4). Each function only restates real computed
 * numbers or genuinely matched finding text — never invented analysis — and
 * the result always lands in a plain editable textarea, so it's a starting
 * point the user can edit or overwrite freely, not a locked-in value.
 */
import type { AuditStats, Finding } from '../types/audit';
import { formatPercentage } from './formatters';

/** 2.4.1 Safety Accomplishment — purely the computed safety stats, already shown in the Executive Summary. */
export function draftSafetyAccomplishment(safetyStats: AuditStats | undefined, year: string): string {
  if (!safetyStats || safetyStats.total === 0) {
    return `No safety audit findings were recorded for the ${year} cycle.`;
  }
  return (
    `The safety audit for the ${year} cycle recorded a total of ${safetyStats.total} finding${
      safetyStats.total === 1 ? '' : 's'
    } across the Area, of which ${safetyStats.outstanding} ${
      safetyStats.outstanding === 1 ? 'was' : 'were'
    } outstanding at the time of the audit and ${safetyStats.resolved} ${
      safetyStats.resolved === 1 ? 'was' : 'were'
    } newly raised or already resolved, giving a computed accomplishment figure of ${formatPercentage(
      safetyStats.percentage,
    )}. A year-on-year comparison against the previous cycle was not computed here, as no reconciled list of prior-year outstanding items was supplied for this cycle.`
  );
}

/** 2.4.2 Operating Standards — findings whose text mentions "training" (the recurring theme called out in the reference report), grouped by area. Purely a keyword match over real finding text, not an inferred narrative. */
export function draftOperatingStandards(findings: Finding[]): string {
  const trainingFindings = findings.filter(
    (f) => /training/i.test(f.finding) || /training/i.test(f.recommendation),
  );
  if (trainingFindings.length === 0) {
    return 'No recurring operating-standards issues were identified in this audit cycle’s findings. Edit this paragraph to note any other standards-compliance patterns worth flagging.';
  }
  const areas = [...new Set(trainingFindings.map((f) => f.area))];
  return (
    `Inadequate operator training was flagged in ${trainingFindings.length} finding${
      trainingFindings.length === 1 ? '' : 's'
    } across the following substation${areas.length === 1 ? '' : 's'}: ${areas.join(', ')}. It is recommended that ` +
    'the relevant training unit be engaged to organize follow-up training for operators at these locations to address this recurring finding.'
  );
}

/** 2.4.3 Fire Protection — summarizes actual Fire-type findings if any exist, or notes fire readiness wasn't assessed this cycle. */
export function draftFireProtection(fireFindings: Finding[], year: string): string {
  if (fireFindings.length === 0) {
    return `Fire readiness was not assessed as part of the ${year} audit cycle’s dataset. Note here the status of any outstanding fire-protection items carried over from prior cycles, if known.`;
  }
  const outstanding = fireFindings.filter((f) => f.status.toLowerCase().includes('outstanding')).length;
  const areas = [...new Set(fireFindings.map((f) => f.area))];
  return (
    `The fire safety audit for the ${year} cycle identified ${fireFindings.length} finding${
      fireFindings.length === 1 ? '' : 's'
    } across ${areas.join(', ')}, of which ${outstanding} remain${outstanding === 1 ? 's' : ''} outstanding. See ` +
    'Appendix III for the full list of fire safety findings and recommendations.'
  );
}
