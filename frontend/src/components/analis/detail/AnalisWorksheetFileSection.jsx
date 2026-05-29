import {
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  MAX_WORKSHEET_FILES,
  formatFileSize,
  getFileExtension,
  getFileNameFromPath,
} from './analisDetailUtils';

export function AnalisWorksheetFileSection({
  fileInputRef,
  worksheetFiles,
  uploading,
  isReadOnly,
  onWorksheetFileChange,
  onOpenPreview,
  onRemoveWorksheetFile,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          File Worksheet <span className="text-red-500">*</span>
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Upload file LKA dalam format PDF, Excel, CSV, DOC, atau DOCX.
        </p>
      </div>

      <div className="space-y-4 p-6">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.xls,.xlsx,.csv,.doc,.docx"
          onChange={onWorksheetFileChange}
          className="hidden"
        />

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || worksheetFiles.length >= MAX_WORKSHEET_FILES}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50 px-5 py-5 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
            {uploading ? 'Mengupload file...' : 'Upload File LKA'}
          </button>
        )}

        <div className="space-y-3">
          {worksheetFiles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
              <FileSpreadsheet className="mx-auto mb-3 h-8 w-8 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">
                Belum ada file LKA
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Minimal satu file wajib diupload sebelum dikirim ke Penyelia.
              </p>
            </div>
          ) : (
            worksheetFiles.map((file, index) => (
              <div
                key={`${file.path}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {file.originalName || getFileNameFromPath(file.path)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {(file.ext || getFileExtension(file.path) || '-').toUpperCase()} • {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenPreview(file)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-100"
                  >
                    <Eye className="h-4 w-4" />
                    Lihat
                  </button>

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => onRemoveWorksheetFile(index)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
