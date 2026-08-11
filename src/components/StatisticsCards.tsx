import type { StatsBreakdown } from '../types/audit';
import { formatPercentage } from '../utils/formatters';

interface StatisticsCardsProps {
  stats: StatsBreakdown;
}

export default function StatisticsCards({ stats }: StatisticsCardsProps) {
  const { overall } = stats;
  const cards = [
    { label: 'Total Issues', value: overall.total, tone: 'text-navy-700 bg-navy-50' },
    { label: 'Outstanding', value: overall.outstanding, tone: 'text-amber-700 bg-amber-50' },
    { label: 'Resolved', value: overall.resolved, tone: 'text-green-700 bg-green-50' },
    { label: 'Accomplishment', value: formatPercentage(overall.percentage), tone: 'text-gold-600 bg-amber-50/60' },
  ];

  const typeEntries = Object.entries(stats.byAuditType).filter(([type]) => type !== 'Other');

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl p-4 ${c.tone}`}>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">{c.label}</p>
          </div>
        ))}
      </div>

      {typeEntries.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {typeEntries.map(([type, s]) => (
            <div key={type} className="rounded-lg border border-gray-200 p-3 text-sm">
              <p className="mb-1 font-semibold text-gray-700">{type} Audit</p>
              <p className="text-gray-500">
                {s.total} total &middot; {s.outstanding} outstanding &middot; {s.resolved} resolved &middot;{' '}
                <span className="font-medium text-gray-700">{formatPercentage(s.percentage)}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
