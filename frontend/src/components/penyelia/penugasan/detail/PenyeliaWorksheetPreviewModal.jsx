import { useMemo } from 'react';
import { Download, X } from 'lucide-react';
import {
  normalizeReviewWorksheetFiles,
} from './penyeliaPenugasanDetailUtils';
import { WorksheetFilesPreviewPane } from './WorksheetFilesPreviewPane';

export function PenyeliaWorksheetPreviewModal({
  worksheetModal,
  onClose,
  onSelectedFileChange,
}) {
  const worksheetFiles = useMemo(() => {
    if (!worksheetModal.open || !worksheetModal.detail) return [];
    return normalizeReviewWorksheetFiles(worksheetModal.detail);
  }, [worksheetModal.open, worksheetModal.detail]);

  const worksheetFilesKey = useMemo(() => {
    return worksheetFiles
      .map((file) => (
        file.path ||
        file.filePath ||
        file.file_path ||
        file.downloadUrl ||
        file.secureUrl ||
        file.originalUrl ||
        file.original_url ||
        ''
      ))
      .filter(Boolean)
      .join('|');
  }, [worksheetFiles]);

  if (!worksheetModal.open || !worksheetModal.detail) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-[1px]">
      <div className="flex h-full w-full max-w-[98vw] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between bg-emerald-600 px-6 py-3">
          <div>
            <h3 className="text-lg font-bold text-white">
              Pratinjau File Worksheet
            </h3>
            <p className="text-sm text-emerald-100">
              {worksheetModal.detail.parameter} — {worksheetModal.detail.metode}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white transition-all hover:bg-white/20"
            title="Tutup preview"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden bg-gray-100 p-2">
          <WorksheetFilesPreviewPane
            key={worksheetFilesKey || 'empty-worksheet-files'}
            files={worksheetFiles}
            onSelectedFileChange={onSelectedFileChange}
          />
        </div>
      </div>
    </div>
  );
}
