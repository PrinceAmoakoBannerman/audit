import type { Abbreviation, ReportInfo } from '../types/audit';

interface ReportInformationProps {
  info: ReportInfo;
  onChange: (patch: Partial<ReportInfo>) => void;
}

export default function ReportInformation({ info, onChange }: ReportInformationProps) {
  const updateObjective = (index: number, value: string) => {
    const next = [...info.objectives];
    next[index] = value;
    onChange({ objectives: next });
  };
  const removeObjective = (index: number) => {
    onChange({ objectives: info.objectives.filter((_, i) => i !== index) });
  };
  const addObjective = () => {
    onChange({ objectives: [...info.objectives, ''] });
  };

  const updateScopeItem = (index: number, value: string) => {
    const next = [...info.scopeOfAudit];
    next[index] = value;
    onChange({ scopeOfAudit: next });
  };
  const removeScopeItem = (index: number) => {
    onChange({ scopeOfAudit: info.scopeOfAudit.filter((_, i) => i !== index) });
  };
  const addScopeItem = () => {
    onChange({ scopeOfAudit: [...info.scopeOfAudit, ''] });
  };

  const updateAbbreviation = (index: number, patch: Partial<Abbreviation>) => {
    const next = [...info.abbreviations];
    next[index] = { ...next[index], ...patch };
    onChange({ abbreviations: next });
  };
  const removeAbbreviation = (index: number) => {
    onChange({ abbreviations: info.abbreviations.filter((_, i) => i !== index) });
  };
  const addAbbreviation = () => {
    onChange({ abbreviations: [...info.abbreviations, { code: '', meaning: '' }] });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Report Information</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Area">
            <input
              className="input"
              value={info.areaName}
              onChange={(e) => onChange({ areaName: e.target.value })}
              placeholder="e.g. Prestea Area"
            />
          </Field>
          <Field label="Year">
            <input className="input" value={info.year} onChange={(e) => onChange({ year: e.target.value })} placeholder="e.g. 2026" />
          </Field>
          <Field label="Report Title">
            <input
              className="input"
              value={info.reportTitle}
              onChange={(e) => onChange({ reportTitle: e.target.value })}
              placeholder="e.g. Prestea Area Audit Report 2026"
            />
          </Field>
          <Field label="Cover Month / Year">
            <input
              className="input"
              value={info.coverMonthYear}
              onChange={(e) => onChange({ coverMonthYear: e.target.value })}
              placeholder="e.g. MAY 2026"
            />
          </Field>
          <Field label="Audit Date Range">
            <input
              className="input"
              value={info.auditDateRange}
              onChange={(e) => onChange({ auditDateRange: e.target.value })}
              placeholder="e.g. May 18 - 21, 2026"
            />
          </Field>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Acknowledgement</h2>
        <textarea
          className="input min-h-[90px]"
          value={info.acknowledgementText}
          onChange={(e) => onChange({ acknowledgementText: e.target.value })}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">List of Abbreviations</span>
          <button type="button" onClick={addAbbreviation} className="btn-secondary text-xs">
            + Add Abbreviation
          </button>
        </div>
        <ul className="space-y-2">
          {info.abbreviations.map((abbr, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                className="input w-28 flex-shrink-0"
                value={abbr.code}
                onChange={(e) => updateAbbreviation(i, { code: e.target.value })}
                placeholder="Code"
              />
              <input
                className="input"
                value={abbr.meaning}
                onChange={(e) => updateAbbreviation(i, { meaning: e.target.value })}
                placeholder="Meaning"
              />
              <button
                type="button"
                onClick={() => removeAbbreviation(i)}
                className="flex-shrink-0 rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Field label="Introduction Text">
        <textarea
          className="input min-h-[110px]"
          value={info.introText}
          onChange={(e) => onChange({ introText: e.target.value })}
        />
      </Field>

      <Field label="Team Note (optional, shown above the team table)">
        <input
          className="input"
          value={info.teamNoteText}
          onChange={(e) => onChange({ teamNoteText: e.target.value })}
          placeholder="e.g. Team composition carried forward from the previous audit cycle — please confirm/update"
        />
      </Field>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Aims &amp; Objectives</span>
          <button type="button" onClick={addObjective} className="btn-secondary text-xs">
            + Add Objective
          </button>
        </div>
        <ul className="space-y-2">
          {info.objectives.map((obj, i) => (
            <li key={i} className="flex items-center gap-2">
              <input className="input" value={obj} onChange={(e) => updateObjective(i, e.target.value)} />
              <button
                type="button"
                onClick={() => removeObjective(i)}
                className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Scope of Audit</span>
          <button type="button" onClick={addScopeItem} className="btn-secondary text-xs">
            + Add Item
          </button>
        </div>
        <ul className="space-y-2">
          {info.scopeOfAudit.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <input className="input" value={item} onChange={(e) => updateScopeItem(i, e.target.value)} />
              <button
                type="button"
                onClick={() => removeScopeItem(i)}
                className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Overall Condition of Equipment (report section 2.0&ndash;2.4)
        </h2>
        <Field label="2.0 General Condition">
          <textarea
            className="input min-h-[80px]"
            value={info.generalConditionText}
            onChange={(e) => onChange({ generalConditionText: e.target.value })}
          />
        </Field>
        <Field label="2.1 Power Transformers, Auto Transformers and Reactors">
          <textarea
            className="input min-h-[80px]"
            value={info.powerTransformersText}
            onChange={(e) => onChange({ powerTransformersText: e.target.value })}
          />
        </Field>
        <Field label="2.2 Other Major Substation Equipment">
          <textarea
            className="input min-h-[80px]"
            value={info.otherEquipmentText}
            onChange={(e) => onChange({ otherEquipmentText: e.target.value })}
          />
        </Field>
        <Field label="2.3 Battery Rooms and Communication Equipment">
          <textarea
            className="input min-h-[80px]"
            value={info.batteryRoomsText}
            onChange={(e) => onChange({ batteryRoomsText: e.target.value })}
          />
        </Field>
        <Field label="2.4.1 Safety Accomplishment">
          <textarea
            className="input min-h-[80px]"
            value={info.safetyAccomplishmentText}
            onChange={(e) => onChange({ safetyAccomplishmentText: e.target.value })}
          />
        </Field>
        <Field label="2.4.2 Operating Standards">
          <textarea
            className="input min-h-[80px]"
            value={info.operatingStandardsText}
            onChange={(e) => onChange({ operatingStandardsText: e.target.value })}
          />
        </Field>
        <Field label="2.4.3 Fire Protection">
          <textarea
            className="input min-h-[80px]"
            value={info.fireProtectionText}
            onChange={(e) => onChange({ fireProtectionText: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Recurring Themes (shown in the Executive Summary)">
        <textarea
          className="input min-h-[90px]"
          value={info.recurringThemesText}
          onChange={(e) => onChange({ recurringThemesText: e.target.value })}
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
