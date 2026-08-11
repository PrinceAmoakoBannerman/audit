import type { ParsedSheet } from '../types/audit';

interface SheetSelectorProps {
  sheets: ParsedSheet[];
}

export default function SheetSelector({ sheets }: SheetSelectorProps) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Worksheets Detected</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {sheets.map((sheet) => (
          <li
            key={sheet.sheetName}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
              sheet.headerNotFound ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
            }`}
          >
            <span className="flex items-center gap-2 font-medium text-gray-800">
              <span className={sheet.headerNotFound ? 'text-amber-500' : 'text-green-600'}>
                {sheet.headerNotFound ? '\u26a0' : '\u2713'}
              </span>
              {sheet.sheetName}
            </span>
            <span className="text-gray-500">
              {sheet.headerNotFound ? 'no header found' : `${sheet.findings.length} row${sheet.findings.length === 1 ? '' : 's'}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
