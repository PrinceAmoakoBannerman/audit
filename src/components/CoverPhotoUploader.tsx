import { useRef } from 'react';
import type { CoverPhoto } from '../types/audit';

interface CoverPhotoUploaderProps {
  photo: CoverPhoto | null;
  isProcessing: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}

export default function CoverPhotoUploader({ photo, isProcessing, onSelect, onRemove }: CoverPhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Cover Photo (optional)</h2>
        <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary text-xs">
          {isProcessing ? 'Processing…' : photo ? 'Replace Photo' : '+ Upload Photo'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelect(file);
            e.target.value = '';
          }}
        />
      </div>

      {photo ? (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
          <img src={photo.dataUrl} alt="Cover" className="h-24 w-40 flex-shrink-0 rounded-md object-cover" />
          <div className="flex-1 text-sm text-gray-500">Shown full-width on the report cover page.</div>
          <button type="button" onClick={onRemove} className="flex-shrink-0 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50">
            Remove
          </button>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-400">
          No cover photo added. A representative site photo will appear beneath the title on the report cover page.
        </p>
      )}
    </div>
  );
}
