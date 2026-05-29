import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, ExternalLink, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { penyeliaPenugasanDetailApi } from '../../../../api/penyeliaPenugasanDetailApi';
import {
  buildPreviewHtmlDocument,
  buildSheetsPreviewHtmlDocument,
  buildWorksheetUrl,
  getFileExtension,
  getFileName,
  canServerPreviewFile,
} from './penyeliaPenugasanDetailUtils';


const OFFICE_DOCUMENT_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);
const LOCALHOST_NAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

function isHostedPublicUrl(value = '') {
  const text = String(value || '').trim();
  if (!text) return false;

  try {
    const parsed = new URL(text);
    if (parsed.protocol !== 'https:') return false;
    if (LOCALHOST_NAMES.has(parsed.hostname)) return false;
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(parsed.hostname)) return false;

    return true;
  } catch {
    return false;
  }
}

function buildHostedOfficeViewerUrl(fileUrl = '') {
  const encoded = encodeURIComponent(fileUrl);
  const preferredViewer = String(import.meta.env.VITE_WORKSHEET_OFFICE_VIEWER || 'office').toLowerCase();

  if (preferredViewer === 'google') {
    return `https://docs.google.com/gview?embedded=true&url=${encoded}`;
  }

  return `https://view.officeapps.live.com/op/view.aspx?src=${encoded}`;
}

function shouldOpenHostedOfficeViewer(filePath = '', fileUrl = '') {
  const ext = getFileExtension(filePath || fileUrl);

  return OFFICE_DOCUMENT_EXTENSIONS.has(ext) && isHostedPublicUrl(fileUrl);
}

function decodeSignedWorksheetPath(value = '') {
  const text = String(value || '').trim();
  if (!text || !text.includes('/files/worksheet')) return '';

  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(text, base);
    const token = parsed.searchParams.get('token') || '';
    const encodedPayload = token.split('.')[0] || '';

    if (!encodedPayload) return '';

    const normalized = encodedPayload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
    const payload = JSON.parse(window.atob(normalized));

    return String(payload?.path || '').trim();
  } catch {
    return '';
  }
}

function pickRawWorksheetPath(file = {}) {
  const candidates = [
    file.path,
    file.filePath,
    file.file_path,
    file.originalUrl,
    file.original_url,
    file.secureUrl,
    file.secure_url,
    file.downloadUrl,
    file.download_url,
    file.url,
  ];

  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (!value) continue;

    const decodedPath = decodeSignedWorksheetPath(value);
    if (decodedPath) return decodedPath;

    if (!value.includes('/files/worksheet')) return value;
  }

  return '';
}

function WorksheetPreviewPane({ worksheetFile }) {
  const rawWorksheetPath = pickRawWorksheetPath(worksheetFile);
  const directWorksheetPath = worksheetFile?.secureUrl || worksheetFile?.secure_url || rawWorksheetPath;
  const worksheetPath = rawWorksheetPath;
  const fallbackFileName = worksheetFile?.originalName || getFileName(rawWorksheetPath);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accessLoading, setAccessLoading] = useState('');
  const [accessError, setAccessError] = useState('');

  const buildPreviewDocumentFromPayload = (payload = null) => {
    const currentPreview = payload || preview;

    if (!currentPreview) return '';

    if (currentPreview.type === 'html') {
      return buildPreviewHtmlDocument(currentPreview.html || '<p>Preview kosong.</p>');
    }

    if (currentPreview.type === 'sheets') {
      return buildSheetsPreviewHtmlDocument(currentPreview);
    }

    if (currentPreview.type === 'text') {
      const content = String(currentPreview.content || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      return buildPreviewHtmlDocument(`<pre>${content}</pre>`);
    }

    return '';
  };

  const openWorksheetPreviewTab = async () => {
    if (!worksheetPath) return;

    let popupWindow = null;

    setAccessError('');
    setAccessLoading('open');

    if (typeof window !== 'undefined') {
      popupWindow = window.open('', '_blank');

      if (popupWindow) {
        popupWindow.document.title = 'Pratinjau worksheet';
        popupWindow.document.body.innerHTML = '<p style="font-family: system-ui, sans-serif; padding: 24px; color: #374151;">Membuka pratinjau worksheet...</p>';
        popupWindow.opener = null;
      }
    }

    try {
      const ext = getFileExtension(worksheetPath);

      const data = await penyeliaPenugasanDetailApi.getWorksheetAccessUrl(worksheetPath);
      const freshFileUrl = buildWorksheetUrl(data?.url || data?.downloadUrl || directWorksheetPath || worksheetPath);

      if (!freshFileUrl) throw new Error('URL file worksheet tidak tersedia.');

      if (['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
        if (popupWindow && !popupWindow.closed) {
          popupWindow.location.assign(freshFileUrl);
        } else {
          const openedWindow = window.open(freshFileUrl, '_blank');
          if (!openedWindow) throw new Error('Browser memblokir tab baru. Izinkan pop-up untuk membuka worksheet.');
          openedWindow.opener = null;
        }

        return;
      }

      if (shouldOpenHostedOfficeViewer(worksheetPath, freshFileUrl)) {
        const viewerUrl = buildHostedOfficeViewerUrl(freshFileUrl);

        if (popupWindow && !popupWindow.closed) {
          popupWindow.location.assign(viewerUrl);
        } else {
          const openedWindow = window.open(viewerUrl, '_blank');
          if (!openedWindow) throw new Error('Browser memblokir tab baru. Izinkan pop-up untuk membuka worksheet.');
          openedWindow.opener = null;
        }

        return;
      }

      const payload = preview || await penyeliaPenugasanDetailApi.previewWorksheet(worksheetPath);
      const htmlDocument = buildPreviewDocumentFromPayload(payload);

      if (!htmlDocument) {
        throw new Error('Preview file ini belum tersedia. Gunakan tombol Download untuk membuka file asli.');
      }

      const blob = new Blob([htmlDocument], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);

      if (popupWindow && !popupWindow.closed) {
        popupWindow.location.assign(blobUrl);
      } else {
        const openedWindow = window.open(blobUrl, '_blank');
        if (!openedWindow) throw new Error('Browser memblokir tab baru. Izinkan pop-up untuk membuka worksheet.');
        openedWindow.opener = null;
      }

      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      if (popupWindow && !popupWindow.closed) popupWindow.close();
      setAccessError(err?.message || 'Gagal membuka preview worksheet.');
    } finally {
      setAccessLoading('');
    }
  };

  const downloadWorksheetFile = async () => {
    if (!worksheetPath) return;

    setAccessError('');
    setAccessLoading('download');

    try {
      const data = await penyeliaPenugasanDetailApi.getWorksheetAccessUrl(worksheetPath, {
        download: true,
      });
      const url = buildWorksheetUrl(data?.downloadUrl || data?.url || directWorksheetPath || worksheetPath);

      if (!url) {
        throw new Error('URL file worksheet tidak tersedia.');
      }

      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.download = fallbackFileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setAccessError(err?.message || 'Gagal download file worksheet.');
    } finally {
      setAccessLoading('');
    }
  };

  const openWorksheetFile = async (download = false) => {
    if (download) {
      await downloadWorksheetFile();
      return;
    }

    await openWorksheetPreviewTab();
  };

  const renderActionButton = (download = false, className = '') => {
    const loadingAction = download ? 'download' : 'open';
    const Icon = download ? Download : ExternalLink;
    const label = download ? 'Download' : 'Buka';

    return (
      <button
        type="button"
        onClick={() => openWorksheetFile(download)}
        disabled={accessLoading === loadingAction}
        className={className || 'inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 font-semibold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60'}
      >
        {accessLoading === loadingAction ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
        {label}
      </button>
    );
  };

  const renderFileActions = (message = 'Buka atau unduh file asli jika preview tidak tampil.') => (
    <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <div className="flex flex-wrap items-center gap-2">
        <span>{message}</span>
        {renderActionButton(false)}
        {renderActionButton(true)}
      </div>
      {accessError && <p className="mt-1 text-xs text-red-600">{accessError}</p>}
    </div>
  );

  useEffect(() => {
    if (!rawWorksheetPath) {
      setPreview(null);
      setError('');
      setLoading(false);
      return;
    }

    let cancelled = false;

    setPreview(null);
    setError('');

    const ext = getFileExtension(worksheetPath);

    if (!canServerPreviewFile(worksheetPath)) {
      setPreview({
        type: 'unsupported',
        ext,
        url: worksheetPath,
        message: 'Format file tidak didukung untuk preview. Gunakan PDF, gambar, XLS, XLSX, CSV, DOCX, atau TXT.',
      });
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 25000);

    async function loadPreview() {
      setLoading(true);

      try {
        const data = await penyeliaPenugasanDetailApi.previewWorksheet(
          worksheetPath,
          controller.signal
        );

        if (!cancelled) {
          setPreview(data || null);
        }
      } catch (err) {

        if (!cancelled) {
          setPreview(null);

          if (err.name === 'AbortError') {
            setError('Preview terlalu lama dibuat.');
          } else {
            setError(err.message || 'Gagal membuat preview worksheet.');
          }
        }
      } finally {
        window.clearTimeout(timeoutId);

        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [worksheetPath, rawWorksheetPath]);

  if (!rawWorksheetPath) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
        File worksheet belum tersedia.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-gray-200 bg-white p-6 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-emerald-600" />
        Membuat preview worksheet...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mb-3 h-6 w-6 text-red-600" />
        <p className="font-semibold text-red-700">{error}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
          {renderActionButton(false, 'inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60')}
          {renderActionButton(true, 'inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60')}
        </div>
        {accessError && <p className="mt-2 text-xs text-red-700">{accessError}</p>}
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        Preview belum tersedia.
      </div>
    );
  }

  if (preview.type === 'direct' || preview.type === 'pdf') {
    const ext = preview.ext || getFileExtension(preview.url || directWorksheetPath || rawWorksheetPath);
    const url = buildWorksheetUrl(preview.url || directWorksheetPath || rawWorksheetPath);
    const openActions = (
      <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <div className="flex flex-wrap items-center gap-2">
          <span>Jika preview kosong/terblokir browser, buka file langsung:</span>
          {renderActionButton(false)}
          {renderActionButton(true)}
        </div>
        {accessError && <p className="mt-1 text-xs text-red-600">{accessError}</p>}
      </div>
    );

    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
      return (
        <div className="flex h-full min-h-0 flex-col gap-2">
          {openActions}
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl border border-gray-200 bg-white">
            <img
              src={url}
              alt={preview.fileName || 'Preview file'}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        {openActions}
        <iframe
          title="Preview PDF Worksheet"
          src={url}
          className="min-h-0 flex-1 rounded-xl border border-gray-200 bg-white"
        />
      </div>
    );
  }

  if (preview.type === 'html') {
    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        {renderFileActions('Jika preview dokumen tidak tampil, buka atau download file asli.')}
        <iframe
          title={preview.fileName || 'Preview dokumen'}
          srcDoc={buildPreviewHtmlDocument(preview.html)}
          className="min-h-0 flex-1 rounded-xl border border-gray-200 bg-white"
        />
      </div>
    );
  }

  if (preview.type === 'sheets') {
    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        {renderFileActions('Jika preview Excel tidak tampil, buka atau download file asli.')}
        <iframe
          title={preview.fileName || 'Preview Excel'}
          srcDoc={buildSheetsPreviewHtmlDocument(preview)}
          className="min-h-0 flex-1 rounded-xl border border-gray-200 bg-white"
        />
      </div>
    );
  }

  if (preview.type === 'text') {
    return (
      <pre className="h-full min-h-0 overflow-auto rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-900">
        {preview.content}
      </pre>
    );
  }

  if (preview.type === 'unsupported') {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <FileSpreadsheet className="mb-3 h-8 w-8 text-amber-600" />
        <p className="font-semibold text-amber-800">Preview tidak tersedia.</p>
        <p className="mt-1 max-w-md text-sm text-amber-700">
          {preview.message || 'Format file ini belum didukung untuk preview.'}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
          {renderActionButton(false, 'inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 font-semibold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60')}
          {renderActionButton(true, 'inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 font-semibold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60')}
        </div>
        {accessError && <p className="mt-2 text-xs text-red-600">{accessError}</p>}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
      Preview tidak tersedia.
    </div>
  );
}

export function WorksheetFilesPreviewPane({
  files = [],
  onSelectedFileChange = null,
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const initialSelectedFile = useMemo(() => files[0] || null, [files]);

  useEffect(() => {
    if (onSelectedFileChange) {
      onSelectedFileChange(initialSelectedFile);
    }
  }, [initialSelectedFile, onSelectedFileChange]);

  const safeSelectedIndex = Math.min(selectedIndex, Math.max(files.length - 1, 0));
  const selectedFile = files[safeSelectedIndex] || files[0] || null;

  const handleSelectFile = (file, index) => {
    setSelectedIndex(index);

    if (onSelectedFileChange) {
      onSelectedFileChange(file);
    }
  };

  if (!files.length) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
        File worksheet belum tersedia.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="shrink-0 overflow-x-auto rounded-xl border border-gray-200 bg-white p-2">
        <div className="flex min-w-max gap-2">
          {files.map((file, index) => {
            const active = index === safeSelectedIndex;

            return (
              <button
                key={`${file.path}-${index}`}
                type="button"
                onClick={() => handleSelectFile(file, index)}
                className={`flex max-w-[260px] items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all ${
                  active
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-gray-50'
                }`}
              >
                <FileText
                  className={`h-4 w-4 shrink-0 ${
                    active ? 'text-emerald-600' : 'text-gray-400'
                  }`}
                />

                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">
                    {file.originalName || getFileName(file.path)}
                  </p>
                  <p className="text-[10px] uppercase text-gray-500">
                    {file.ext || getFileExtension(file.path) || 'file'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <WorksheetPreviewPane worksheetFile={selectedFile} />
      </div>
    </div>
  );
}
