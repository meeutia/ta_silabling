import { buildApiFileUrl } from '../../../utils/secureFileUrl';
import { formatYmd } from '../../../utils/businessDays';

export const MAX_WORKSHEET_FILES = 10;
export const MAX_WORKSHEET_SIZE = 15 * 1024 * 1024;
export const ALLOWED_WORKSHEET_EXTENSIONS = ['pdf', 'xls', 'xlsx', 'xlsm', 'csv', 'doc', 'docx'];

export function formatDateOnly(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateInput(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return formatYmd(date);
}

export function formatFileSize(value) {
  const size = Number(value || 0);

  if (!size) return '-';

  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  }

  return `${(size / 1024).toFixed(1)} KB`;
}

export function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

export function getStatusBadgeClass(status) {
  const value = normalizeStatus(status);

  if (
    value === 'perlu revisi' ||
    value === 'perlu perbaikan' ||
    value === 'revisi'
  ) {
    return 'bg-red-100 text-red-700 border border-red-200';
  }

  if (
    value === 'worksheet terkirim' ||
    value === 'menunggu review' ||
    value === 'menunggu verifikasi penyelia'
  ) {
    return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
  }

  if (value === 'sedang dikerjakan') {
    return 'bg-blue-100 text-blue-700 border border-blue-200';
  }

  if (
    value === 'disetujui' ||
    value === 'selesai' ||
    value === 'disetujui penyelia'
  ) {
    return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
  }

  return 'bg-amber-100 text-amber-700 border border-amber-200';
}

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(status)}`}
    >
      {status || '-'}
    </span>
  );
}

export function getRowReviewStatus(row = {}) {
  return row.statusReviewHasil || row.status_review_hasil || '';
}

function cleanRevisionNoteText(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) =>
      line &&
      !/^Respon\s+Penyelia\s*:/i.test(line) &&
      !/^Keputusan\s+Penyelia\s*:/i.test(line) &&
      !/^Catatan\s+Penyelia\s*:/i.test(line)
    )
    .join('\n')
    .trim();
}

function stripPenyeliaResponsePrefix(value) {
  return String(value || '')
    .replace(/^Respon\s+Penyelia\s*:/i, '')
    .replace(/^Catatan\s+Penyelia\s*:/i, '')
    .trim();
}

function extractPenyeliaResponseFromText(value) {
  const text = String(value || '');
  if (!text.trim()) return '';

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const responseLine = lines.find((line) =>
    /^Respon\s+Penyelia\s*:/i.test(line) || /^Catatan\s+Penyelia\s*:/i.test(line)
  );

  return stripPenyeliaResponsePrefix(responseLine || '');
}

function firstDirectResponseText(values = []) {
  for (const value of values) {
    const text = stripPenyeliaResponsePrefix(value);
    if (text) return text;
  }
  return '';
}

function firstExtractedResponseText(values = []) {
  for (const value of values) {
    const extracted = extractPenyeliaResponseFromText(value);
    if (extracted) return extracted;
  }
  return '';
}

export function getPenyeliaRevisionNote(row = {}) {
  const specificNote = String(
    row.catatanRevisiHasilPenyelia ||
      row.catatan_revisi_hasil_penyelia ||
      row.catatanRevisiPenyelia ||
      row.catatan_revisi_penyelia ||
      row.catatanRevisiItemPenyelia ||
      row.catatan_revisi_item_penyelia ||
      row.revisionNotePenyelia ||
      row.revision_note_penyelia ||
      ''
  ).trim();

  if (specificNote) return cleanRevisionNoteText(specificNote);

  const hasKasiSpecificNote = Boolean(
    String(
      row.catatanRevisiHasilKasiPengujian ||
        row.catatan_revisi_hasil_kasi_pengujian ||
        row.catatanRevisiKasiPengujian ||
        row.catatan_revisi_kasi_pengujian ||
        row.catatanRevisiItemKasiPengujian ||
        row.catatan_revisi_item_kasi_pengujian ||
        row.revisionNoteKasiPengujian ||
        row.revision_note_kasi_pengujian ||
        ''
    ).trim()
  );

  if (hasKasiSpecificNote) return '';

  return cleanRevisionNoteText(row.catatanRevisiHasil || row.catatan_revisi_hasil || '');
}

export function getPenyeliaResponseNote(row = {}) {
  const explicit = firstDirectResponseText([
    row.catatanResponPenyelia,
    row.catatan_respon_penyelia,
    row.catatanTinjauanPenyelia,
    row.catatan_tinjauan_penyelia,
    row.revisionResponsePenyelia,
    row.revision_response_penyelia,
  ]);

  if (explicit) return explicit;

  return firstExtractedResponseText([
    row.catatanRevisiHasilKasiPengujian,
    row.catatan_revisi_hasil_kasi_pengujian,
    row.catatanRevisiHasilPenyelia,
    row.catatan_revisi_hasil_penyelia,
    row.catatanRevisiHasil,
    row.catatan_revisi_hasil,
    row.catatanRevisi,
    row.catatan_revisi,
    row.revisionNote,
    row.revision_note,
  ]);
}

export function getKasiPengujianRevisionNote(row = {}) {
  const explicitNote = String(
    row.catatanRevisiHasilKasiPengujian ||
      row.catatan_revisi_hasil_kasi_pengujian ||
      row.catatanRevisiKasiPengujian ||
      row.catatan_revisi_kasi_pengujian ||
      row.catatanRevisiItemKasiPengujian ||
      row.catatan_revisi_item_kasi_pengujian ||
      row.revisionNoteKasiPengujian ||
      row.revision_note_kasi_pengujian ||
      ''
  ).trim();

  // Jangan fallback ke catatanRevisiHasil/catatan_revisi_hasil.
  // Field generic itu bisa berisi catatan revisi Penyelia, sehingga analis
  // akan salah melihat catatan Penyelia sebagai Catatan Revisi Kasi Pengujian.
  return explicitNote ? cleanRevisionNoteText(explicitNote) : '';
}

export function getRowRevisionNote(row = {}) {
  return [getPenyeliaRevisionNote(row), getKasiPengujianRevisionNote(row), getPenyeliaResponseNote(row)]
    .filter(Boolean)
    .join('\n\n');
}

export function isPerluRevisiStatus(value) {
  const status = normalizeStatus(value);

  return (
    status === 'perlu revisi' ||
    status === 'perlu perbaikan' ||
    status === 'revisi'
  );
}

export function isRowUnderRevision(row = {}) {
  return isPerluRevisiStatus(getRowReviewStatus(row));
}

export function InfoRow({ label, children }) {
  return (
    <div
      className="grid items-start gap-x-2 py-1 text-sm"
      style={{
        gridTemplateColumns: '170px 8px minmax(0, 1fr)',
      }}
    >
      <div className="leading-5 text-gray-700">
        {label}
      </div>

      <div className="leading-5 text-center text-gray-500">
        :
      </div>

      <div className="min-w-0 leading-5 font-medium text-gray-900">
        {children || '-'}
      </div>
    </div>
  );
}

export function getFileExtension(value) {
  const clean = String(value || '').split('?')[0];
  const fileName = clean.split('/').pop() || '';

  return fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
}

export function getFileNameFromPath(value) {
  if (!value) return '-';

  return String(value).split('/').pop() || value;
}

export function buildWorksheetUrl(path) {
  return buildApiFileUrl(path);
}

export function normalizeWorksheetFiles(worksheet) {
  const files =
    worksheet?.worksheetFiles ||
    worksheet?.worksheet_files ||
    worksheet?.files ||
    worksheet?.fileWorksheetFiles ||
    worksheet?.file_worksheet_files ||
    [];

  if (Array.isArray(files) && files.length > 0) {
    return files
      .map((file) => {
        const path =
          file.path ||
          file.filePath ||
          file.file_path ||
          '';

        return {
          path,
          secureUrl: file.secureUrl || file.secure_url || file.url || '',
          downloadUrl: file.downloadUrl || file.download_url || '',
          originalName:
            file.originalName ||
            file.original_name ||
            getFileNameFromPath(path),
          mimeType:
            file.mimeType ||
            file.mime_type ||
            null,
          size:
            file.size ||
            file.fileSize ||
            file.file_size ||
            null,
          ext:
            file.ext ||
            file.fileExt ||
            file.file_ext ||
            getFileExtension(path),
          uploadedAt:
            file.uploadedAt ||
            file.uploaded_at ||
            null,
        };
      })
      .filter((file) => file.path);
  }

  const legacyPath =
    worksheet?.fileWorksheetPath ||
    worksheet?.file_worksheet_path ||
    worksheet?.worksheetUrl ||
    worksheet?.worksheet_url ||
    worksheet?.path ||
    '';

  if (!legacyPath) return [];

  try {
    const parsed = JSON.parse(legacyPath);

    if (Array.isArray(parsed)) {
      return parsed
        .map((file) => {
          const path = file.path || file.filePath || file.file_path || '';

          return {
            path,
            secureUrl: file.secureUrl || file.secure_url || file.url || '',
            downloadUrl: file.downloadUrl || file.download_url || '',
            originalName:
              file.originalName ||
              file.original_name ||
              getFileNameFromPath(path),
            mimeType: file.mimeType || file.mime_type || null,
            size: file.size || file.fileSize || file.file_size || null,
            ext: file.ext || file.fileExt || file.file_ext || getFileExtension(path),
            uploadedAt: file.uploadedAt || file.uploaded_at || null,
          };
        })
        .filter((file) => file.path);
    }
  } catch {
    // fallback legacy path biasa
  }

  return [
    {
      path: legacyPath,
      originalName: getFileNameFromPath(legacyPath),
      mimeType: null,
      size: null,
      ext: getFileExtension(legacyPath),
      uploadedAt: null,
    },
  ];
}

export function validateWorksheetFile(file) {
  const ext = getFileExtension(file.name);

  if (!ALLOWED_WORKSHEET_EXTENSIONS.includes(ext)) {
    return `${file.name}: format harus PDF, XLS, XLSX, XLSM, CSV, DOC, atau DOCX.`;
  }

  if (file.size > MAX_WORKSHEET_SIZE) {
    return `${file.name}: ukuran maksimal 15 MB.`;
  }

  return '';
}

export function serializeWorksheetFiles(files) {
  return JSON.stringify(
    (files || []).map((file) => ({
      path: file.path,
      originalName: file.originalName,
      mimeType: file.mimeType || null,
      size: file.size || null,
      ext: file.ext || getFileExtension(file.path),
      uploadedAt: file.uploadedAt || new Date().toISOString(),
    }))
  );
}

export function getWorksheetUploadEndpoints(idPenugasanDetail) {
  // Gunakan satu endpoint utama saja agar browser tidak menampilkan error 400 ganda.
  // Endpoint alias `/worksheet/upload` tetap ada di backend untuk kompatibilitas lama,
  // tetapi frontend analis cukup memakai endpoint canonical ini.
  return [`/assignments/work/${idPenugasanDetail}/upload`];
}

export function toSuperscriptExponent(value) {
  const map = {
    '-': '⁻',
    '+': '⁺',
    0: '⁰',
    1: '¹',
    2: '²',
    3: '³',
    4: '⁴',
    5: '⁵',
    6: '⁶',
    7: '⁷',
    8: '⁸',
    9: '⁹',
  };

  return String(value || '')
    .split('')
    .map((char) => map[char] ?? char)
    .join('');
}

export function formatScientificDhl(value) {
  const raw = String(value || '').trim();

  if (!raw) return '-';

  if (raw.includes('× 10') || raw.includes('x 10')) {
    return raw;
  }

  const eNotationMatch = raw.match(
    /^([+-]?\d+(?:[.,]\d+)?)\s*[eE]\s*([+-]?\d+)\s*(.*)$/
  );

  if (!eNotationMatch) return raw;

  const coefficient = eNotationMatch[1].replace(',', '.');
  const exponent = toSuperscriptExponent(eNotationMatch[2]);
  const unit = String(eNotationMatch[3] || '').trim();

  return `${coefficient} × 10${exponent}${unit ? ` ${unit}` : ''}`;
}

export const DHL_SCIENTIFIC_SYMBOLS = [
  '× 10⁻¹',
  '× 10⁻²',
  '× 10⁻³',
  '× 10⁻⁴',
  '× 10⁻⁵',
  '× 10⁻⁶',
  '× 10⁻⁷',
  '× 10⁻⁸',
  'µ',
  'µS/cm',
  'mS/cm',
  'S/cm',
];

export function getProgressStats(rows) {
  const total = rows.length;
  const filled = rows.filter((row) => String(row.hasil || '').trim()).length;
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0;

  return { total, filled, percent };
}

export function normalizeScientificResultInput(value) {
  return String(value || '')
    .replace(/\./g, ',')          // 1.2 -> 1,2
    .replace(/[xX]/g, '×')        // x10 -> ×10
    .replace(/[–—]/g, '-')        // dash panjang -> -
    .replace(/\s+/g, '')          // hapus spasi
    .replace(/10\^-/g, '10⁻')    // 10^-3 -> 10⁻3
    .replace(/10\+/g, '10')      // 10+3 -> 103 sementara
    .replace(/[^\d,<>≤≥=×Ee+\-⁻⁺⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '');
}

export function isValidNumericResult(value) {
  const text = String(value || '').trim();

  if (!text) return false;

  if (text === '-') return true;

  const decimalNumber = '-?\\d+(?:,\\d+)?';
  const comparator = '(?:[<>]=?|≤|≥)?';
  const superscriptExponent = '[⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+';
  const normalExponent = '[+-]?\\d+';


  const patterns = [
    // 7
    // 7,5
    // <0,01
    // >=100
    new RegExp(`^${comparator}${decimalNumber}$`),

    // 1,2E-3
    // <1,2E-3
    new RegExp(`^${comparator}${decimalNumber}[Ee]${normalExponent}$`),

    // 1,2×10⁻³
    // <1,2×10⁻³
    new RegExp(`^${comparator}${decimalNumber}×10${superscriptExponent}$`),

    // 1,2×10-3
    // <1,2×10-3
    new RegExp(`^${comparator}${decimalNumber}×10${normalExponent}$`),
  ];

  return patterns.some((pattern) => pattern.test(text));
}
export function getTanggalPengambilanSampel(row = {}) {
  return (
    row.tanggal_pengambilan_sampel ||
    row.tanggalPengambilanSampel ||
    row.tanggal_sampling ||
    row.tanggalSampling ||
    null
  );
}

export function getTanggalPenerimaanSampel(row = {}) {
  return (
    row.tanggal_penerimaan ||
    row.tanggalPenerimaan ||
    row.tanggal_terima ||
    row.tanggalTerima ||
    null
  );
}

export function getJamPenerimaanSampel(row = {}) {
  return (
    row.jam_penerimaan ||
    row.jamPenerimaan ||
    row.jam_terima ||
    row.jamTerima ||
    null
  );
}

export function getAcuanPengambilanSampel(row = {}) {
  return (
    row.acuan_pengambilan_sampel ||
    row.acuanPengambilanSampel ||
    '-'
  );
}

export function getAbnormalitasSampel(row = {}) {
  return (
    row.abnormalitas_sampel ||
    row.abnormalitasSampel ||
    row.abnormalitas_contoh ||
    row.abnormalitasContoh ||
    '-'
  );
}

export function getKondisiSampel(row = {}) {
  return (
    row.kondisi_sampel ||
    row.kondisiSampel ||
    '-'
  );
}

export function getKoordinatSampel(row = {}) {
  return row.koordinat || '-';
}

export function formatDateTimeDisplay(dateValue, timeValue) {
  const dateText = formatDateOnly(dateValue);
  const timeText = String(timeValue || '').slice(0, 5);

  if (dateText === '-' && !timeText) return '-';
  if (!timeText) return dateText;

  return `${dateText}, ${timeText}`;
}

export function buildPreviewHtmlDocument(html = '') {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 24px;
            font-family: Arial, sans-serif;
            color: #111827;
            background: #ffffff;
          }

          table {
            border-collapse: collapse;
            width: max-content;
            min-width: 100%;
            font-size: 13px;
          }

          th,
          td {
            border: 1px solid #d1d5db;
            padding: 6px 8px;
            vertical-align: top;
            white-space: pre-wrap;
          }

          th {
            background: #f3f4f6;
            font-weight: 700;
          }

          p {
            margin: 0 0 10px;
            line-height: 1.5;
          }

          h1, h2, h3 {
            margin: 0 0 12px;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;
}
