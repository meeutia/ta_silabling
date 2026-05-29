import { buildApiFileUrl, pickFirstFileValue } from '../../utils/secureFileUrl';

export function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export const formatDateOnly = formatDate;

export function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateTimeDisplay(dateValue, timeValue) {
  const dateText = formatDate(dateValue);
  const timeText = String(timeValue || '').slice(0, 5);

  if (dateText === '-' && !timeText) return '-';
  if (!timeText) return dateText;

  return `${dateText}, ${timeText}`;
}

export function pickValue(...values) {
  return (
    values.find(
      (value) => value !== null && value !== undefined && String(value).trim() !== ''
    ) || '-'
  );
}

export function pickRealValue(...values) {
  return (
    values.find((value) => {
      if (value === null || value === undefined) return false;
      const text = String(value).trim();
      return text !== '' && text !== '-';
    }) || '-'
  );
}

export function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

export function getNoSampel(row = {}) {
  return row?.noSampel || row?.no_sampel || '';
}

export function getNomorLhu(row = {}) {
  return row?.nomorLhu || row?.nomor_lhu || '';
}

export function getStatusLhu(row = {}, fallback = 'Belum Dibuat') {
  return row?.statusLhu || row?.status_lhu || fallback;
}

export function getKalabStatusLhu(row = {}) {
  return getStatusLhu(row, '-');
}

export function getFilePath(row = {}) {
  return pickFirstFileValue(
    row?.fileLhuDownloadUrl,
    row?.file_lhu_download_url,
    row?.downloadUrl,
    row?.download_url,
    row?.fileLhuSecureUrl,
    row?.file_lhu_secure_url,
    row?.secureUrl,
    row?.secure_url,
    row?.fileLhuPath,
    row?.file_lhu_path,
    row?.filePath,
    row?.file_path
  );
}

export function getFileUrl(filePath) {
  return buildApiFileUrl(filePath);
}

export function getLkaHasilTargetKey(row = {}) {
  const kode = String(row.kodeLka || row.kode_lka || '').trim();
  const noSampel = String(row.noSampel || row.no_sampel || '').trim();
  return kode && noSampel ? `${kode}|${noSampel}` : null;
}

export function getLkaHasilTarget(row = {}) {
  return {
    kodeLka: row.kodeLka || row.kode_lka || null,
    kode_lka: row.kode_lka || row.kodeLka || null,
    noSampel: row.noSampel || row.no_sampel || null,
    no_sampel: row.no_sampel || row.noSampel || null,
  };
}

export function getStatusReview(row = {}) {
  return (
    row?.statusReviewHasil ||
    row?.status_review_hasil ||
    row?.statusReview ||
    row?.status_review ||
    row?.statusLka ||
    row?.status_lka ||
    'Menunggu Review Kasi Pengujian'
  );
}

function joinUniqueText(values = []) {
  const seen = new Set();
  const result = [];

  values.forEach((value) => {
    const text = String(value || '').trim();
    if (!text || text === '-') return;

    const key = text.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    result.push(text);
  });

  return result.join('\n\n');
}

function cleanRevisionNoteText(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) =>
      line &&
      line !== '-' &&
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

function extractDecisionFromText(value) {
  const line = String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => /^Keputusan\s+Penyelia\s*:/i.test(item));

  return line ? line.replace(/^Keputusan\s+Penyelia\s*:/i, '').trim() : '';
}

function extractPenyeliaResponseFromText(value) {
  const line = String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => /^Respon\s+Penyelia\s*:/i.test(item) || /^Catatan\s+Penyelia\s*:/i.test(item));

  return stripPenyeliaResponsePrefix(line || '');
}

function firstText(values = []) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text && text !== '-') return text;
  }
  return '';
}

function firstCleanRevisionText(values = []) {
  for (const value of values) {
    const text = cleanRevisionNoteText(value);
    if (text) return text;
  }
  return '';
}

export function getCatatanRevisiParts(row = {}) {
  const combinedValues = [
    row?.catatanRevisiHasil,
    row?.catatan_revisi_hasil,
    row?.catatanRevisi,
    row?.catatan_revisi,
    row?.revisionNote,
    row?.revision_note,
  ];

  const kasiNote = firstCleanRevisionText([
    row?.catatanRevisiHasilKasiPengujian,
    row?.catatan_revisi_hasil_kasi_pengujian,
    row?.catatanRevisiItemKasiPengujian,
    row?.catatan_revisi_item_kasi_pengujian,
    row?.revisionNoteKasiPengujian,
    row?.revision_note_kasi_pengujian,
  ]);

  const penyeliaNote = firstCleanRevisionText([
    row?.catatanRevisiHasilPenyelia,
    row?.catatan_revisi_hasil_penyelia,
    row?.catatanRevisiItemPenyelia,
    row?.catatan_revisi_item_penyelia,
    row?.revisionNotePenyelia,
    row?.revision_note_penyelia,
  ]);

  const keputusanPenyelia = firstText([
    row?.keputusanPenyelia,
    row?.keputusan_penyelia,
    row?.keputusanRevisiPenyelia,
    row?.keputusan_revisi_penyelia,
    ...combinedValues.map(extractDecisionFromText),
  ]);

  const catatanPenyelia = firstText([
    row?.catatanResponPenyelia,
    row?.catatan_respon_penyelia,
    row?.catatanTinjauanPenyelia,
    row?.catatan_tinjauan_penyelia,
    row?.catatanTinjauan,
    row?.catatan_tinjauan,
    row?.revisionResponsePenyelia,
    row?.revision_response_penyelia,
    ...combinedValues.map(extractPenyeliaResponseFromText),
  ].map((value) => stripPenyeliaResponsePrefix(value)));

  return {
    penyeliaNote,
    kasiNote,
    keputusanPenyelia,
    catatanPenyelia,
    hasAny: Boolean(penyeliaNote || kasiNote || keputusanPenyelia || catatanPenyelia),
  };
}

export function getCatatanRevisi(row = {}) {
  const parts = getCatatanRevisiParts(row);
  return joinUniqueText([
    parts.penyeliaNote,
    parts.kasiNote,
    parts.keputusanPenyelia ? `Keputusan Penyelia: ${parts.keputusanPenyelia}` : '',
    parts.catatanPenyelia ? `Catatan Penyelia: ${parts.catatanPenyelia}` : '',
  ]);
}

export function getTanggalPengambilanSampel(row = {}) {
  return (
    row.tanggalPengambilanSampel ||
    row.tanggal_pengambilan_sampel ||
    row.tanggalSampling ||
    row.tanggal_sampling ||
    null
  );
}

export function getTanggalPenerimaanSampel(row = {}) {
  return (
    row.tanggalPenerimaan ||
    row.tanggal_penerimaan ||
    row.tanggalTerima ||
    row.tanggal_terima ||
    null
  );
}

export function getJamPenerimaanSampel(row = {}) {
  return (
    row.jamPenerimaan ||
    row.jam_penerimaan ||
    row.jamTerima ||
    row.jam_terima ||
    null
  );
}

export function getKondisiSampel(row = {}) {
  return row.kondisiSampel || row.kondisi_sampel || '-';
}

export function getKoordinatSampel(row = {}) {
  return row.koordinat || '-';
}

export function getAcuanPengambilanSampel(row = {}) {
  return row.acuanPengambilanSampel || row.acuan_pengambilan_sampel || '-';
}

export function getAbnormalitasSampel(row = {}) {
  return (
    row.abnormalitasSampel ||
    row.abnormalitas_sampel ||
    row.abnormalitasContoh ||
    row.abnormalitas_contoh ||
    '-'
  );
}

export function getKeteranganSampel(row = {}) {
  return (
    row.keteranganSampel ||
    row.keterangan_sampel ||
    row.catatanUmum ||
    row.catatan_umum ||
    '-'
  );
}

export function getSatuanBm(row = {}) {
  return (
    row.satuan_bm_snapshot ||
    row.satuanBmSnapshot ||
    row.satuan_bm ||
    row.satuanBm ||
    row.satuan ||
    '-'
  );
}

export const getSatuanHasil = getSatuanBm;

export function getNilaiBm(row = {}) {
  return (
    row.bm_snapshot ||
    row.bmSnapshot ||
    row.nilai_bm ||
    row.nilaiBm ||
    ''
  );
}

export function isTruthyFlag(value) {
  if (value === true || value === 1) return true;

  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export function getInsituLabel(row = {}) {
  return isTruthyFlag(row.is_insitu_snapshot ?? row.isInsituSnapshot ?? row.is_insitu ?? row.isInsitu)
    ? 'Ya'
    : 'Tidak';
}

export function getSnapshotInsituLabel(row = {}) {
  return Number(row.is_insitu_snapshot ?? row.isInsituSnapshot ?? 0) === 1
    ? 'Ya'
    : 'Tidak';
}

export function isSubkontrakResult(row = {}) {
  return (
    isTruthyFlag(row.isSubkontrak) ||
    isTruthyFlag(row.is_subkontrak) ||
    isTruthyFlag(row.isSubkontrakSnapshot) ||
    isTruthyFlag(row.is_subkontrak_snapshot) ||
    String(row.statusKemampuanLab || row.status_kemampuan_lab || '').toUpperCase() === 'TIDAK_MAMPU'
  );
}

export function getSubkontrakLabel(row = {}) {
  return isSubkontrakResult(row) ? 'Ya' : 'Tidak';
}

export function getSnapshotSubkontrakLabel(row = {}) {
  return Number(row.is_subkontrak_snapshot ?? row.isSubkontrakSnapshot ?? 0) === 1
    ? 'Ya'
    : 'Tidak';
}

export function getStatusBadgeClass(status) {
  const value = String(status || '').toLowerCase();

  if (value.includes('revisi')) return 'bg-red-100 text-red-700';
  if (value.includes('disetujui')) return 'bg-emerald-100 text-emerald-700';
  if (value.includes('menunggu')) return 'bg-amber-100 text-amber-700';

  return 'bg-gray-100 text-gray-700';
}

export function getLhuStatusBadge(status) {
  const value = String(status || '').toLowerCase();

  if (value.includes('revisi')) return 'bg-red-100 text-red-700';
  if (value.includes('batal')) return 'bg-red-100 text-red-700';
  if (value.includes('belum')) return 'bg-gray-100 text-gray-700';
  if (value.includes('draft')) return 'bg-gray-100 text-gray-700';
  if (value.includes('qc') || value.includes('mutu') || value.includes('pengendalian')) return 'bg-pink-100 text-pink-700';
  if (value.includes('kepala lab') || value.includes('kalab')) return 'bg-purple-100 text-purple-700';
  if (value.includes('disahkan')) return 'bg-emerald-100 text-emerald-700';

  return 'bg-amber-100 text-amber-700';
}

export const getStatusBadge = getLhuStatusBadge;

export function getKalabStatusBadge(status) {
  const value = String(status || '').toLowerCase();

  if (value.includes('revisi')) return 'bg-red-100 text-red-700';
  if (value.includes('batal')) return 'bg-red-100 text-red-700';
  if (value.includes('draft')) return 'bg-gray-100 text-gray-700';
  if (value.includes('qc') || value.includes('mutu') || value.includes('pengendalian')) return 'bg-pink-100 text-pink-700';
  if (value.includes('kepala lab') || value.includes('kalab')) return 'bg-purple-100 text-purple-700';
  if (value.includes('disahkan')) return 'bg-emerald-100 text-emerald-700';

  return 'bg-amber-100 text-amber-700';
}

export function getAccreditationBadge(value) {
  return Number(value || 0) === 1
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-gray-100 text-gray-600';
}

export const getAccreditationBadgeClass = getAccreditationBadge;
