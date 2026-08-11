import { useCallback, useRef, useState } from 'react';
import { validateExcelFile, type ValidationIssue } from '../utils/validators';

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  fileName: string | null;
  isProcessing: boolean;
}

export default function FileUploader({ onFileSelected, fileName, isProcessing }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const issues = validateExcelFile(file);
      setErrors(issues);
      if (issues.some((i) => i.level === 'error')) return;
      onFileSelected(file);
    },
    [onFileSelected],
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragging ? 'border-navy-700 bg-navy-50' : 'border-gray-300 bg-white hover:border-navy-600'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-navy-700">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V4.5m0 0L7 9.5m5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        </div>
        <p className="font-medium text-gray-800">
          {isProcessing ? 'Reading workbook\u2026' : 'Drop your Excel audit workbook here, or click to browse'}
        </p>
        <p className="mt-1 text-sm text-gray-500">Supported: .xlsx, .xls &mdash; processed entirely in your browser</p>
        {fileName && !isProcessing && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-navy-50 px-3 py-1 text-sm font-medium text-navy-700">
            <span className="h-2 w-2 rounded-full bg-green-500" /> {fileName}
          </p>
        )}
      </div>
      {errors.length > 0 && (
        <ul className="mt-3 space-y-1">
          {errors.map((e, i) => (
            <li key={i} className="text-sm text-red-600">
              {e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
