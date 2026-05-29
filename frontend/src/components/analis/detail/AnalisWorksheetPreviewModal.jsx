import { AlertCircle, Download, ExternalLink, Loader2, X } from 'lucide-react';
import {
  buildPreviewHtmlDocument,
  buildWorksheetUrl,
  getFileNameFromPath,
} from './analisDetailUtils';

export function AnalisWorksheetPreviewModal({
  previewFile,
  previewPayload,
  loadingPreview,
  previewError,
  onClose,
}) {
  if (!previewFile) return null;

  const displayName = previewFile.originalName || getFileNameFromPath(previewFile.path);
  const openUrl = buildWorksheetUrl(
    previewPayload?.url ||
      previewFile.secureUrl ||
      previewFile.url ||
      previewFile.path
  );
  const downloadUrl = buildWorksheetUrl(
    previewPayload?.downloadUrl ||
      previewFile.downloadUrl ||
      previewPayload?.url ||
      previewFile.secureUrl ||
      previewFile.url ||
      previewFile.path
  );
  const fallbackUrl = openUrl || downloadUrl;
  const hasHtmlPreview = Boolean(
    previewPayload?.html && ['html', 'excel', 'spreadsheet'].includes(previewPayload?.type)
  );
  const canOpenDirectFile = Boolean(
    openUrl &&
      previewPayload?.type === 'direct' &&
      ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif'].includes(previewPayload?.ext)
  );
  const canOpenPreview = hasHtmlPreview || canOpenDirectFile;

  const handleOpenPreviewInNewTab = () => {
    if (hasHtmlPreview) {
      const html = buildPreviewHtmlDocument(previewPayload.html);
      const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      return;
    }

    if (canOpenDirectFile) {
      window.open(openUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const fallbackActions = (fallbackUrl || canOpenPreview) ? (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <span>Jika preview kosong/terblokir browser, gunakan aksi berikut:</span>
      {canOpenPreview && (
        <button
          type="button"
          onClick={handleOpenPreviewInNewTab}
          className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 font-semibold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Buka Preview
        </button>
      )}
      {downloadUrl && (
        <a
          href={downloadUrl}
          download={displayName}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 font-semibold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </a>
      )}
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-1 backdrop-blur-[1px]">
      <div className="flex h-full w-full max-w-[98vw] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between bg-emerald-600 px-6 py-2.5">
          <div>
            <h3 className="text-lg font-bold text-white">
              Pratinjau File Worksheet
            </h3>
            <p className="text-sm text-emerald-100">
              {displayName}
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

        <div className="min-h-0 flex-1 overflow-hidden bg-gray-100 p-1.5">
          {loadingPreview ? (
            <div className="flex h-full flex-col items-center justify-center rounded-lg bg-white text-gray-500">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-emerald-600" />
              <p>Memuat pratinjau file...</p>
            </div>
          ) : previewError ? (
            <div className="flex h-full flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-semibold">Preview gagal dimuat</p>
                  <p className="mt-1 text-sm">{previewError}</p>
                </div>
              </div>
              {fallbackActions}
            </div>
          ) : previewPayload?.type === 'direct' ? (
            ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(previewPayload.ext) ? (
              <div className="flex h-full items-center justify-center overflow-auto rounded-lg bg-white">
                <img
                  src={buildWorksheetUrl(previewPayload.url)}
                  alt={previewPayload.fileName || 'Preview file'}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-full flex-col gap-2">
                {fallbackActions}
                <iframe
                  title={previewPayload.fileName || 'Preview PDF'}
                  src={buildWorksheetUrl(previewPayload.url)}
                  className="min-h-0 flex-1 rounded-lg border border-gray-300 bg-white"
                />
              </div>
            )
          ) : ['html', 'excel', 'spreadsheet'].includes(previewPayload?.type) ? (
            <div className="flex h-full flex-col gap-2">
              {fallbackActions}
              <iframe
                title={previewPayload.fileName || 'Preview dokumen'}
                srcDoc={buildPreviewHtmlDocument(previewPayload.html)}
                className="min-h-0 flex-1 rounded-lg border border-gray-300 bg-white"
              />
            </div>
          ) : previewPayload?.type === 'text' ? (
            <pre className="h-full overflow-auto rounded-lg border border-gray-300 bg-white p-4 text-sm text-gray-900">
              {previewPayload.content}
            </pre>
          ) : previewPayload?.type === 'unsupported' ? (
            <div className="flex h-full flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-semibold">
                    Format file belum bisa dipreview.
                  </p>
                  <p className="mt-1 text-sm">
                    {previewPayload.message || 'Format ini belum didukung untuk pratinjau langsung.'}
                  </p>
                </div>
              </div>
              {fallbackActions}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg bg-white text-gray-500">
              Preview tidak tersedia.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
