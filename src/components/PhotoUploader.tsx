import { useRef } from 'react';
import type { Finding, FindingImage } from '../types/audit';

interface PhotoUploaderProps {
  images: FindingImage[];
  findings: Finding[];
  isProcessing: boolean;
  onAddFiles: (files: FileList) => void;
  onUpdate: (id: string, patch: Partial<FindingImage>) => void;
  onRemove: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
}

export default function PhotoUploader({
  images,
  findings,
  isProcessing,
  onAddFiles,
  onUpdate,
  onRemove,
  onReorder,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Photographs (optional)</h2>
        <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary text-xs">
          {isProcessing ? 'Processing\u2026' : '+ Upload Photos'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) onAddFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {images.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-400">
          No photos added yet. Photos you upload will appear in a &ldquo;Photographs / Evidence&rdquo; section in the generated report.
        </p>
      ) : (
        <ul className="space-y-3">
          {images.map((img, idx) => (
            <li key={img.id} className="flex gap-3 rounded-lg border border-gray-200 p-3">
              <img src={img.dataUrl} alt={img.fileName} className="h-24 w-32 flex-shrink-0 rounded-md object-cover" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium text-gray-700">{img.fileName}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onReorder(img.id, 'up')}
                      className="rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                      title="Move up"
                    >
                      {'\u2191'}
                    </button>
                    <button
                      type="button"
                      disabled={idx === images.length - 1}
                      onClick={() => onReorder(img.id, 'down')}
                      className="rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                      title="Move down"
                    >
                      {'\u2193'}
                    </button>
                    <button type="button" onClick={() => onRemove(img.id)} className="rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50">
                      Remove
                    </button>
                  </div>
                </div>
                <select
                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                  value={img.findingId ?? ''}
                  onChange={(e) => onUpdate(img.id, { findingId: e.target.value || null })}
                >
                  <option value="">Not linked to a specific finding</option>
                  {findings.map((f) => (
                    <option key={f.id} value={f.id}>
                      {`Item ${f.item} \u2013 ${f.area} \u2013 ${f.location || f.finding.slice(0, 40)}`}
                    </option>
                  ))}
                </select>
                <input
                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                  placeholder="Optional caption"
                  value={img.caption}
                  onChange={(e) => onUpdate(img.id, { caption: e.target.value })}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
