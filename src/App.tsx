import { useMemo, useState } from 'react';
import gridcoLogo from './assets/gridco-logo.png';
import FileUploader from './components/FileUploader';
import SheetSelector from './components/SheetSelector';
import AuditConfiguration from './components/AuditConfiguration';
import ReportInformation from './components/ReportInformation';
import TeamEditor from './components/TeamEditor';
import PhotoUploader from './components/PhotoUploader';
import CoverPhotoUploader from './components/CoverPhotoUploader';
import DataPreview from './components/DataPreview';
import StatisticsCards from './components/StatisticsCards';
import GenerateReportButton from './components/GenerateReportButton';

import { parseWorkbookFile, reapplySheetConfig } from './services/excelParser';
import { computeStatsBreakdown } from './services/auditCalculator';
import { processImageFile } from './services/imageProcessor';
import { validateImageFile, validateParsedWorkbook, type ValidationIssue } from './utils/validators';
import { makeId } from './utils/formatters';
import {
  DEFAULT_ABBREVIATIONS,
  DEFAULT_ACKNOWLEDGEMENT,
  DEFAULT_BATTERY_ROOMS_TEXT,
  DEFAULT_FIRE_PROTECTION_TEXT,
  DEFAULT_GENERAL_CONDITION,
  DEFAULT_OBJECTIVES,
  DEFAULT_OPERATING_STANDARDS_TEXT,
  DEFAULT_OTHER_EQUIPMENT_TEXT,
  DEFAULT_POWER_TRANSFORMERS_TEXT,
  DEFAULT_RECURRING_THEMES,
  DEFAULT_SAFETY_ACCOMPLISHMENT_TEXT,
  DEFAULT_SCOPE_OF_AUDIT,
  type CoverPhoto,
  type FindingImage,
  type ParsedWorkbook,
  type ReportInfo,
  type SheetConfig,
  type TeamMember,
} from './types/audit';

const DEFAULT_INTRO =
  'To ensure the reliable and efficient performance of the organization\u2019s network facilities, regular technical and safety audits, as well as equipment inspections, are conducted at major installations. These audits involve a comprehensive assessment of equipment condition, an evaluation of the adequacy of working tools, and an examination of the safety culture within the Operating Area.';

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      {title && <h1 className="mb-4 text-lg font-bold text-navy-800">{title}</h1>}
      {children}
    </section>
  );
}

export default function App() {
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [sheetConfigs, setSheetConfigs] = useState<SheetConfig[]>([]);

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [images, setImages] = useState<FindingImage[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [imageErrors, setImageErrors] = useState<string[]>([]);

  const [reportInfo, setReportInfo] = useState<ReportInfo>({
    areaName: '',
    year: String(new Date().getFullYear()),
    reportTitle: '',
    auditDateRange: '',
    coverMonthYear: '',
    coverPhoto: null,
    acknowledgementText: DEFAULT_ACKNOWLEDGEMENT,
    abbreviations: DEFAULT_ABBREVIATIONS.map((a) => ({ ...a })),
    introText: DEFAULT_INTRO,
    teamNoteText: '',
    objectives: [...DEFAULT_OBJECTIVES],
    scopeOfAudit: [...DEFAULT_SCOPE_OF_AUDIT],
    recurringThemesText: DEFAULT_RECURRING_THEMES,
    generalConditionText: DEFAULT_GENERAL_CONDITION,
    powerTransformersText: DEFAULT_POWER_TRANSFORMERS_TEXT,
    otherEquipmentText: DEFAULT_OTHER_EQUIPMENT_TEXT,
    batteryRoomsText: DEFAULT_BATTERY_ROOMS_TEXT,
    safetyAccomplishmentText: DEFAULT_SAFETY_ACCOMPLISHMENT_TEXT,
    operatingStandardsText: DEFAULT_OPERATING_STANDARDS_TEXT,
    fireProtectionText: DEFAULT_FIRE_PROTECTION_TEXT,
  });

  const [isProcessingCoverPhoto, setIsProcessingCoverPhoto] = useState(false);
  const [coverPhotoErrors, setCoverPhotoErrors] = useState<string[]>([]);
  const [criticalIds, setCriticalIds] = useState<Set<string>>(new Set());

  const findings = useMemo(() => {
    if (!workbook) return [];
    const configMap = new Map(sheetConfigs.map((c) => [c.sheetName, c]));
    const rows = reapplySheetConfig(workbook, (sheetName) => {
      const cfg = configMap.get(sheetName);
      return {
        area: cfg?.area ?? sheetName,
        auditType: cfg?.auditType ?? 'Other',
        includeInReport: cfg?.includeInReport ?? true,
      };
    });
    return rows.map((f) => ({ ...f, critical: criticalIds.has(f.id) }));
  }, [workbook, sheetConfigs, criticalIds]);

  const stats = useMemo(() => computeStatsBreakdown(findings), [findings]);

  async function handleFileSelected(file: File) {
    setIsParsingExcel(true);
    setValidationIssues([]);
    try {
      const parsed = await parseWorkbookFile(file);
      setWorkbook(parsed);
      setSheetConfigs(
        parsed.sheetNames.map((name) => ({
          sheetName: name,
          auditType: 'Other',
          area: name,
          includeInReport: true,
          substationCode: '',
          auditDay: '',
        })),
      );
      setValidationIssues(validateParsedWorkbook(parsed));
      if (!reportInfo.areaName) {
        setReportInfo((prev) => ({ ...prev, areaName: `${parsed.sheetNames[0] ?? ''} Area`.trim() }));
      }
    } catch (err) {
      setValidationIssues([
        {
          level: 'error',
          message:
            err instanceof Error
              ? `Could not read "${file.name}": ${err.message}`
              : `Could not read "${file.name}". Please check the file is a valid Excel workbook.`,
        },
      ]);
      setWorkbook(null);
    } finally {
      setIsParsingExcel(false);
    }
  }

  function handleSheetConfigChange(sheetName: string, patch: Partial<SheetConfig>) {
    setSheetConfigs((prev) => prev.map((c) => (c.sheetName === sheetName ? { ...c, ...patch } : c)));
  }

  async function handleAddPhotos(files: FileList) {
    const fileArray = Array.from(files);
    const errors: string[] = [];
    const valid: File[] = [];
    fileArray.forEach((f) => {
      const issues = validateImageFile(f);
      if (issues.length) errors.push(...issues.map((i) => i.message));
      else valid.push(f);
    });
    setImageErrors(errors);
    if (valid.length === 0) return;

    setIsProcessingImages(true);
    try {
      const processed = await Promise.all(
        valid.map(async (file) => {
          const p = await processImageFile(file);
          const img: FindingImage = {
            id: makeId('img'),
            findingId: null,
            fileName: file.name,
            caption: '',
            dataUrl: p.dataUrl,
            width: p.width,
            height: p.height,
          };
          return img;
        }),
      );
      setImages((prev) => [...prev, ...processed]);
    } catch (err) {
      setImageErrors((prev) => [...prev, err instanceof Error ? err.message : 'Could not process one or more images.']);
    } finally {
      setIsProcessingImages(false);
    }
  }

  function handleUpdateImage(id: string, patch: Partial<FindingImage>) {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...patch } : img)));
  }
  function handleRemoveImage(id: string) {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }
  function handleReorderImage(id: string, direction: 'up' | 'down') {
    setImages((prev) => {
      const index = prev.findIndex((img) => img.id === id);
      if (index === -1) return prev;
      const swapWith = direction === 'up' ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
  }

  function handleToggleCritical(id: string) {
    setCriticalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCoverPhotoSelected(file: File) {
    setCoverPhotoErrors([]);
    const issues = validateImageFile(file);
    if (issues.length) {
      setCoverPhotoErrors(issues.map((i) => i.message));
      return;
    }
    setIsProcessingCoverPhoto(true);
    try {
      const p = await processImageFile(file);
      const coverPhoto: CoverPhoto = { dataUrl: p.dataUrl, width: p.width, height: p.height };
      setReportInfo((prev) => ({ ...prev, coverPhoto }));
    } catch (err) {
      setCoverPhotoErrors([err instanceof Error ? err.message : 'Could not process the cover photo.']);
    } finally {
      setIsProcessingCoverPhoto(false);
    }
  }

  function handleRemoveCoverPhoto() {
    setReportInfo((prev) => ({ ...prev, coverPhoto: null }));
  }

  const hasData = !!workbook && findings.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-6 sm:px-6">
          <img src={gridcoLogo} alt="GRIDCo" className="h-10 w-auto flex-shrink-0" />
          <div className="h-10 w-px flex-shrink-0 bg-gray-200" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold text-navy-800">Audit Report Generator</h1>
            <p className="mt-1 text-sm text-gray-500">
              Generate professional Word audit reports from your Excel audit workbook &mdash; entirely in your browser. Nothing is
              uploaded to a server.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
        <Section>
          <FileUploader onFileSelected={handleFileSelected} fileName={workbook?.fileName ?? null} isProcessing={isParsingExcel} />
          {validationIssues.length > 0 && (
            <ul className="mt-4 space-y-1">
              {validationIssues.map((issue, i) => (
                <li key={i} className={`text-sm ${issue.level === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
                  {issue.level === 'error' ? '\u2717' : '\u26a0'} {issue.message}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {workbook && (
          <>
            <Section>
              <SheetSelector sheets={workbook.sheets} />
            </Section>

            <Section>
              <AuditConfiguration configs={sheetConfigs} onChange={handleSheetConfigChange} />
            </Section>

            {hasData && (
              <Section title="Overview">
                <StatisticsCards stats={stats} />
              </Section>
            )}

            <Section>
              <ReportInformation info={reportInfo} onChange={(patch) => setReportInfo((prev) => ({ ...prev, ...patch }))} />
            </Section>

            <Section>
              <CoverPhotoUploader
                photo={reportInfo.coverPhoto}
                isProcessing={isProcessingCoverPhoto}
                onSelect={handleCoverPhotoSelected}
                onRemove={handleRemoveCoverPhoto}
              />
              {coverPhotoErrors.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {coverPhotoErrors.map((msg, i) => (
                    <li key={i} className="text-sm text-red-600">
                      {msg}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section>
              <TeamEditor team={team} onChange={setTeam} />
            </Section>

            <Section>
              <PhotoUploader
                images={images}
                findings={findings}
                isProcessing={isProcessingImages}
                onAddFiles={handleAddPhotos}
                onUpdate={handleUpdateImage}
                onRemove={handleRemoveImage}
                onReorder={handleReorderImage}
              />
              {imageErrors.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {imageErrors.map((msg, i) => (
                    <li key={i} className="text-sm text-red-600">
                      {msg}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {hasData && (
              <Section title="Preview Data">
                <DataPreview findings={findings} onToggleCritical={handleToggleCritical} />
              </Section>
            )}

            <div className="flex justify-end">
              <GenerateReportButton
                context={{ reportInfo, team, sheetConfigs, findings, images, stats }}
                disabled={!hasData}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
