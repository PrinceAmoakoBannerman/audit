import type { AuditType, SheetConfig } from '../types/audit';

interface AuditConfigurationProps {
  configs: SheetConfig[];
  onChange: (sheetName: string, patch: Partial<SheetConfig>) => void;
}

const AUDIT_TYPES: AuditType[] = ['Safety', 'Technical', 'Fire', 'Other'];

export default function AuditConfiguration({ configs, onChange }: AuditConfigurationProps) {
  return (
    <div>
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Audit Configuration</h2>
      <p className="mb-3 text-sm text-gray-500">
        Tell us what each worksheet represents. Rows inside a sheet that already say &ldquo;Safety Audit&rdquo; or &ldquo;Technical
        Audit&rdquo; are detected automatically and override this default.
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">Sheet</th>
              <th className="px-3 py-2">Default Audit Type</th>
              <th className="px-3 py-2">Area / Substation</th>
              <th className="px-3 py-2">Substation Code</th>
              <th className="px-3 py-2">Audit Day</th>
              <th className="px-3 py-2 text-center">Include</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {configs.map((cfg) => (
              <tr key={cfg.sheetName} className={cfg.includeInReport ? '' : 'opacity-50'}>
                <td className="px-3 py-2 font-medium text-gray-800">{cfg.sheetName}</td>
                <td className="px-3 py-2">
                  <select
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    value={cfg.auditType}
                    onChange={(e) => onChange(cfg.sheetName, { auditType: e.target.value as AuditType })}
                  >
                    {AUDIT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                    value={cfg.area}
                    onChange={(e) => onChange(cfg.sheetName, { area: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    placeholder="e.g. P10"
                    className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    value={cfg.substationCode}
                    onChange={(e) => onChange(cfg.sheetName, { substationCode: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    placeholder="e.g. Monday, May 18, 2026"
                    className="w-48 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    value={cfg.auditDay}
                    onChange={(e) => onChange(cfg.sheetName, { auditDay: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={cfg.includeInReport}
                    onChange={(e) => onChange(cfg.sheetName, { includeInReport: e.target.checked })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
