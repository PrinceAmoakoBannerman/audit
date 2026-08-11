import { useState } from 'react';
import { saveAs } from 'file-saver';
import type { ReportBuildContext } from '../types/audit';
import { generateReportDocx } from '../services/reportGenerator';
import { slugify } from '../utils/formatters';

interface GenerateReportButtonProps {
  context: ReportBuildContext;
  disabled: boolean;
}

export default function GenerateReportButton({ context, disabled }: GenerateReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      const blob = await generateReportDocx(context);
      const fileName = `${slugify(context.reportInfo.reportTitle || 'audit-report')}-${context.reportInfo.year || ''}.docx`;
      saveAs(blob, fileName);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong while generating the report.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isGenerating}
        className="rounded-lg bg-navy-700 px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isGenerating ? 'Generating Word document\u2026' : 'Generate Word Report'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
