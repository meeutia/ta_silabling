import { buildApiFileUrl } from '../../../../utils/secureFileUrl';

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

export function formatDateTimeDisplay(dateValue, timeValue) {
  const dateText = formatDateOnly(dateValue);
  const timeText = String(timeValue || '').slice(0, 5);

  if (dateText === '-' && !timeText) return '-';
  if (!timeText) return dateText;

  return `${dateText}, ${timeText}`;
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
    row.diterima_pada ||
    row.diterimaPada ||
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
  return (
    row.koordinat ||
    row.koordinat_sampel ||
    row.koordinatSampel ||
    row.titik_koordinat ||
    row.titikKoordinat ||
    row.koordinat_sampling ||
    row.koordinatSampling ||
    '-'
  );
}


export function getStatusClass(status) {
  const value = String(status || '').toLowerCase();

  if (value.includes('revisi')) return 'border border-red-200 bg-red-100 text-red-700';
  if (value.includes('worksheet') || value.includes('verifikasi')) return 'border border-amber-200 bg-amber-100 text-amber-700';
  if (value.includes('dikerjakan')) return 'border border-blue-200 bg-blue-100 text-blue-700';
  if (value.includes('setuju') || value.includes('selesai')) return 'border border-emerald-200 bg-emerald-100 text-emerald-700';

  return 'border border-gray-200 bg-gray-100 text-gray-700';
}

export function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

export function isWorksheetSubmitted(detail) {
  const detailStatus = normalizeStatus(detail?.statusDetail || detail?.status_detail);
  const lkaStatus = normalizeStatus(
    detail?.worksheet?.statusLka || detail?.worksheet?.status_lka
  );

  if (detailStatus === 'worksheet terkirim') return true;

  return [
    'menunggu verifikasi penyelia',
    'disetujui penyelia',
    'perlu perbaikan',
    'disetujui',
    'selesai',
  ].includes(lkaStatus);
}

export function buildWorksheetUrl(path) {
  return buildApiFileUrl(path);
}

export function getFileName(path) {
  if (!path) return '-';
  return String(path).split('/').pop() || path;
}

export function getFileExtension(path) {
  const cleanPath = String(path || '').split('?')[0];
  const fileName = cleanPath.split('/').pop() || '';
  return fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
}

export function canServerPreviewFile(path) {
  return ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'xlsx', 'xls', 'csv', 'docx', 'txt'].includes(getFileExtension(path));
}

export function normalizeReviewWorksheetFiles(detail) {
  const files = detail?.worksheet?.worksheetFiles || detail?.worksheet?.files || [];

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
            getFileName(path),
          ext:
            file.ext ||
            file.fileExt ||
            file.file_ext ||
            getFileExtension(path),
        };
      })
      .filter((file) => file.path);
  }

  const legacyPath =
    detail?.worksheet?.fileWorksheetPath ||
    detail?.worksheet?.file_worksheet_path ||
    detail?.worksheet?.worksheetUrl ||
    detail?.worksheet?.worksheet_url;

  if (legacyPath) {
    return [
      {
        path: legacyPath,
        secureUrl: detail?.worksheet?.secureUrl || detail?.worksheet?.secure_url || '',
        downloadUrl: detail?.worksheet?.downloadUrl || detail?.worksheet?.download_url || '',
        originalName: getFileName(legacyPath),
        ext: getFileExtension(legacyPath),
      },
    ];
  }

  return [];
}

export function isRevisionLikeStatus(value) {
  const status = normalizeStatus(value);

  return (
    status.includes('revisi') ||
    status.includes('perbaikan') ||
    status.includes('dikembalikan')
  );
}


function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function joinUniqueTextLines(lines = []) {
  const values = [];

  lines.forEach((line) => {
    const text = String(line || '').trim();
    if (!text) return;
    if (!values.some((item) => item === text)) values.push(text);
  });

  return values.join('\n');
}


function firstNonEmptyText(values = []) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }

  return '';
}

function stripPenyeliaResponsePrefix(value) {
  return String(value || '')
    .replace(/^Respon\s+Penyelia\s*:/i, '')
    .replace(/^Catatan\s+Penyelia\s*:/i, '')
    .replace(/^Keputusan\s+Penyelia\s*:/i, '')
    .trim();
}

function extractPenyeliaResponseFromText(value) {
  const line = String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => (
      /^Respon\s+Penyelia\s*:/i.test(item) ||
      /^Catatan\s+Penyelia\s*:/i.test(item) ||
      /^Keputusan\s+Penyelia\s*:/i.test(item)
    ));

  return stripPenyeliaResponsePrefix(line || '');
}

function stripKnownKasiRevisionTargetPrefix(line = '', sample = {}, detail = {}) {
  const original = String(line || '').trim();
  if (!original) return '';

  let text = original.replace(/^[-•]\s*/, '').trim();

  const noSampel = String(
    sample.noSampel ||
      sample.no_sampel ||
      detail.noSampel ||
      detail.no_sampel ||
      ''
  ).trim();

  const parameter = String(
    sample.namaParameter ||
      sample.nama_parameter ||
      sample.parameter ||
      detail.namaParameter ||
      detail.nama_parameter ||
      detail.parameter ||
      ''
  ).trim();

  const metode = String(
    sample.namaMetode ||
      sample.nama_metode ||
      sample.metode ||
      detail.namaMetode ||
      detail.nama_metode ||
      detail.metode ||
      ''
  ).trim();

  const acuan = String(
    sample.acuanMetode ||
      sample.acuan_metode ||
      detail.acuanMetode ||
      detail.acuan_metode ||
      ''
  ).trim();

  if (noSampel) {
    text = text.replace(new RegExp(`^${escapeRegExp(noSampel)}\\s*[:\\-–—]\\s*`, 'i'), '').trim();
  }

  const labels = [
    [parameter, metode, acuan],
    [parameter, metode],
    [parameter, acuan],
    [metode, acuan],
    [parameter],
    [metode],
    [acuan],
  ]
    .map((parts) => parts.filter(Boolean).join(' - ').trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const label of labels) {
    const next = text.replace(new RegExp(`^${escapeRegExp(label)}\\s*[:\\-–—]?\\s*`, 'i'), '').trim();
    if (next !== text) {
      text = next;
      break;
    }
  }

  return text || original;
}

function cleanKasiRevisionNote(note = '', sample = {}, detail = {}) {
  const text = String(note || '').trim();
  if (!text) return '';

  return joinUniqueTextLines(
    text
      .split(/\r?\n/)
      .map((line) => stripKnownKasiRevisionTargetPrefix(line, sample, detail))
  );
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

  if (specificNote) return specificNote;

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

  return String(row.catatanRevisiHasil || row.catatan_revisi_hasil || '').trim();
}

export function getKasiPengujianRevisionNote(row = {}, detail = {}) {
  return cleanKasiRevisionNote(
    row.catatanRevisiHasilKasiPengujian ||
      row.catatan_revisi_hasil_kasi_pengujian ||
      '',
    row,
    detail
  );
}


export function getPenyeliaResponseNote(row = {}) {
  const explicit = firstNonEmptyText([
    stripPenyeliaResponsePrefix(row.catatanResponPenyelia),
    stripPenyeliaResponsePrefix(row.catatan_respon_penyelia),
    stripPenyeliaResponsePrefix(row.catatanTinjauanPenyelia),
    stripPenyeliaResponsePrefix(row.catatan_tinjauan_penyelia),
    stripPenyeliaResponsePrefix(row.revisionResponsePenyelia),
    stripPenyeliaResponsePrefix(row.revision_response_penyelia),
    stripPenyeliaResponsePrefix(row.keputusanPenyelia),
    stripPenyeliaResponsePrefix(row.keputusan_penyelia),
  ]);

  if (explicit) return explicit;

  return firstNonEmptyText([
    extractPenyeliaResponseFromText(row.catatanRevisiHasilKasiPengujian),
    extractPenyeliaResponseFromText(row.catatan_revisi_hasil_kasi_pengujian),
    extractPenyeliaResponseFromText(row.catatanRevisiHasil),
    extractPenyeliaResponseFromText(row.catatan_revisi_hasil),
    extractPenyeliaResponseFromText(row.revisionNote),
    extractPenyeliaResponseFromText(row.revision_note),
  ]);
}

export function getKasiRevisionNote(detail = {}) {
  const note =
    detail.catatanRevisiGlobalKasiPengujian ||
    detail.catatan_revisi_global_kasi_pengujian ||
    detail.worksheet?.catatanRevisiGlobalKasiPengujian ||
    detail.worksheet?.catatan_revisi_global_kasi_pengujian ||
    getKasiPengujianRevisionNote(detail, detail) ||
    detail.catatanKasi ||
    detail.catatan_kasi ||
    getKasiPengujianRevisionNote(detail.worksheet || {}, detail) ||
    '';

  return cleanKasiRevisionNote(note, detail, detail);
}

export function getSampleReviewStatus(sample = {}, detail = {}) {
  return (
    sample.statusReviewHasil ||
    sample.statusReviewHasil ||
    detail.worksheet?.statusLka ||
    detail.worksheet?.status_lka ||
    '-'
  );
}

export function getWorksheetRevisionNote(detail = {}) {
  return String(
    detail.worksheet?.lkaRevisionNote ||
      detail.worksheet?.lka_revision_note ||
      detail.worksheet?.catatanRevisiGlobal ||
      detail.worksheet?.catatan_revisi_global ||
      detail.worksheet?.catatanRevisiLka ||
      detail.worksheet?.catatan_revisi_lka ||
      detail.worksheet?.catatanRevisi ||
      detail.worksheet?.catatan_revisi ||
      detail.lkaRevisionNote ||
      detail.lka_revision_note ||
      detail.catatanRevisiGlobal ||
      detail.catatan_revisi_global ||
      detail.catatanRevisiLka ||
      detail.catatan_revisi_lka ||
      detail.catatanRevisi ||
      detail.catatan_revisi ||
      ''
  ).trim();
}

export function getSamplePenyeliaRevisionNote(sample = {}) {
  // Kolom "Catatan Revisi" per sampel hanya menampilkan catatan hasil/sampel.
  // Catatan revisi seluruh LKA ditampilkan satu kali di blok "Keterangan Revisi LKA".
  return getPenyeliaRevisionNote(sample);
}

export function getSampleKasiPengujianRevisionNote(sample = {}, detail = {}) {
  return getKasiPengujianRevisionNote(sample, detail);
}

export function getSampleRevisionNote(sample = {}, detail = {}) {
  return [
    getSamplePenyeliaRevisionNote(sample, detail),
    getSampleKasiPengujianRevisionNote(sample),
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function isSampleWaitingPenyelia(sample = {}, detail = {}) {
  return normalizeStatus(getSampleReviewStatus(sample, detail)) === 'menunggu verifikasi penyelia';
}

export function getSampleLkaHasilTargetKey(sample = {}) {
  const kode = String(sample.kodeLka || sample.kode_lka || '').trim();
  const noSampel = String(sample.noSampel || sample.no_sampel || '').trim();
  return kode && noSampel ? `${kode}|${noSampel}` : null;
}

export function getSampleLkaHasilTarget(sample = {}) {
  return {
    kodeLka: sample.kodeLka || sample.kode_lka || null,
    kode_lka: sample.kode_lka || sample.kodeLka || null,
    noSampel: sample.noSampel || sample.no_sampel || null,
    no_sampel: sample.no_sampel || sample.noSampel || null,
  };
}

export function isNormalPenyeliaReviewReady(detail) {
  const detailStatus = normalizeStatus(detail?.statusDetail || detail?.status_detail);
  const lkaStatus = normalizeStatus(
    detail?.worksheet?.statusLka || detail?.worksheet?.status_lka
  );

  return (
    detailStatus === 'worksheet terkirim' &&
    lkaStatus === 'menunggu verifikasi penyelia'
  );
}

export function isReturnedByKasiForRevision(detail) {
  const statusKasi =
    detail?.statusKasi ||
    detail?.status_kasi ||
    detail?.worksheet?.statusKasi ||
    detail?.worksheet?.status_kasi ||
    '';

  return Boolean(getKasiRevisionNote(detail)) || isRevisionLikeStatus(statusKasi);
}

export function hasActivePenyeliaRevisionRequest(detail) {
  if (!detail || isNormalPenyeliaReviewReady(detail)) return false;

  const detailStatus = detail?.statusDetail || detail?.status_detail;
  const lkaStatus = detail?.worksheet?.statusLka || detail?.worksheet?.status_lka;
  const reviewStatus =
    detail?.statusReviewHasil ||
    detail?.status_review_hasil ||
    detail?.worksheet?.statusReviewHasil ||
    detail?.worksheet?.status_review_hasil ||
    '';

  const samples = detail.samples || detail.results || detail.sampels || [];
  const hasPenyeliaSampleNote = samples.some((sample) => Boolean(getPenyeliaRevisionNote(sample)));
  const hasPenyeliaDetailNote = Boolean(getPenyeliaRevisionNote(detail));
  const hasPenyeliaWorksheetNote = Boolean(getWorksheetRevisionNote(detail)) && !getKasiRevisionNote(detail);
  const hasRevisionStatus = [detailStatus, lkaStatus, reviewStatus].some(isRevisionLikeStatus);

  return (
    hasPenyeliaSampleNote ||
    hasPenyeliaDetailNote ||
    hasPenyeliaWorksheetNote ||
    (hasRevisionStatus && !isReturnedByKasiForRevision(detail))
  );
}

export function canApproveDetail(detail) {
  return isNormalPenyeliaReviewReady(detail);
}

export function canRequestRevisionToAnalyst(detail) {
  if (hasActivePenyeliaRevisionRequest(detail)) return false;

  return (
    isNormalPenyeliaReviewReady(detail) ||
    isReturnedByKasiForRevision(detail)
  );
}


export function canEditDetailDeadline(detail) {
  const assignmentStatus = normalizeStatus(detail?.statusPenugasan || detail?.status_penugasan);
  const detailStatus = normalizeStatus(detail?.statusDetail || detail?.status_detail);
  const lkaStatus = normalizeStatus(
    detail?.worksheet?.statusLka || detail?.worksheet?.status_lka
  );
  const reviewStatus = normalizeStatus(
    detail?.statusReviewHasil ||
      detail?.status_review_hasil ||
      detail?.worksheet?.statusReviewHasil ||
      detail?.worksheet?.status_review_hasil
  );

  const lockedStatuses = [detailStatus, lkaStatus, reviewStatus];

  if (assignmentStatus === 'dibatalkan') return false;

  return !lockedStatuses.some((status) => (
    status.includes('disetujui') ||
    status.includes('selesai') ||
    status.includes('final') ||
    status.includes('lhu')
  ));
}

export function InfoRow({ label, children }) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      <div className="w-[190px] shrink-0 text-gray-700">{label}</div>
      <div className="w-[10px] shrink-0 text-gray-500">:</div>
      <div className="min-w-0 flex-1 font-medium text-gray-900">
        {children || '-'}
      </div>
    </div>
  );
}


export function buildPreviewHtmlDocument(html = '') {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
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
          th, td {
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
      <body>${html}</body>
    </html>
  `;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildSheetsPreviewHtmlDocument(preview = {}) {
  const sheets = preview.sheets || [];

  const sheetSections = sheets.map((sheet, sheetIndex) => {
    const rows = sheet.rows || [];
    const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);

    const tableRows = rows.map((row, rowIndex) => {
      const cells = Array.from({ length: maxCols }).map((_, colIndex) => {
        const value = row[colIndex] ?? '';

        return `
          <td class="${rowIndex === 0 ? 'head-cell' : ''}">
            ${escapeHtml(value)}
          </td>
        `;
      }).join('');

      return `<tr>${cells}</tr>`;
    }).join('');

    return `
      <section class="sheet-section ${sheetIndex === 0 ? '' : 'page-break'}">
        ${sheets.length > 1 ? `<div class="sheet-title">${escapeHtml(sheet.name || `Sheet ${sheetIndex + 1}`)}</div>` : ''}
        <div class="table-wrap">
          <table>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </section>
    `;
  }).join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            min-width: 100%;
            min-height: 100%;
            background: #ffffff;
            color: #111827;
            font-family: Arial, sans-serif;
          }

          body {
            padding: 12px;
            overflow: auto;
          }

          .sheet-section {
            width: max-content;
            min-width: 100%;
          }

          .sheet-title {
            position: sticky;
            top: 0;
            z-index: 2;
            margin-bottom: 8px;
            padding: 8px 10px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            background: #f3f4f6;
            font-size: 13px;
            font-weight: 700;
          }

          .page-break {
            margin-top: 24px;
          }

          .table-wrap {
            width: max-content;
            min-width: 100%;
          }

          table {
            border-collapse: collapse;
            width: max-content;
            min-width: 100%;
            font-size: 12px;
          }

          td {
            min-width: 120px;
            max-width: 360px;
            border: 1px solid #d1d5db;
            padding: 6px 8px;
            vertical-align: top;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
          }

          .head-cell {
            position: sticky;
            top: 0;
            z-index: 1;
            background: #f3f4f6;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        ${sheetSections || '<p>Sheet kosong atau tidak dapat dibaca.</p>'}
      </body>
    </html>
  `;
}
