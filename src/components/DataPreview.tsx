import { useMemo, useState } from 'react';
import type { Finding } from '../types/audit';

interface DataPreviewProps {
  findings: Finding[];
  onToggleCritical: (id: string) => void;
}

export default function DataPreview({ findings, onToggleCritical }: DataPreviewProps) {
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const areas = useMemo(() => ['all', ...new Set(findings.map((f) => f.area))], [findings]);
  const visible = areaFilter === 'all' ? findings : findings.filter((f) => f.area === areaFilter);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Findings Preview <span className="text-gray-400">({visible.length})</span>
        </h2>
        <select className="rounded-md border border-gray-300 px-2 py-1 text-sm" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a === 'all' ? 'All areas' : a}
            </option>
          ))}
        </select>
      </div>
      <p className="mb-3 text-xs text-gray-400">
        Tick &ldquo;Critical&rdquo; to pull a finding into the Critical Observations tables (report section 1.4/1.5).
      </p>
      <div className="max-h-96 overflow-auto rounded-lg border border-gray-200">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-gray-50 text-gray-500">
            <tr>
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Area</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Location</th>
              <th className="px-2 py-2">Finding</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2 text-center">Critical</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map((f) => (
              <tr key={f.id}>
                <td className="px-2 py-2 text-gray-500">{f.item}</td>
                <td className="px-2 py-2">{f.area}</td>
                <td className="px-2 py-2">{f.auditType}</td>
                <td className="px-2 py-2">{f.location}</td>
                <td className="max-w-xs truncate px-2 py-2" title={f.finding}>
                  {f.finding}
                </td>
                <td className="px-2 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      f.status.toLowerCase().includes('outstanding')
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {f.status || 'Not specified'}
                  </span>
                </td>
                <td className="px-2 py-2 text-center">
                  <input type="checkbox" checked={f.critical} onChange={() => onToggleCritical(f.id)} />
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-center text-gray-400">
                  No findings to show.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
