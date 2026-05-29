const { SUBKONTRAK_ASSIGNMENT_TYPE } = require('./assignment.constants');
const { pickObject, pickArray, firstDate } = require('./assignment-object.helper');
const { collectRevisionNotesForSample } = require('./assignment-revision.helper');

function deriveSampleStatus(row) {
  const total = Number(row.total_parameter || 0);
  const assigned = Number(row.total_ditugaskan || 0);
  const worksheetSent = Number(row.total_worksheet_terkirim || 0);
  const revisi = Number(row.total_perlu_revisi || 0);
  const selesai = Number(row.total_selesai || 0);

  if (assigned === 0) return 'Pending Penugasan';
  if (assigned < total) return 'Sebagian Ditugaskan';
  if (revisi > 0) return 'Perlu Revisi';
  if (worksheetSent > 0) return 'Menunggu Review Penyelia';
  if (selesai === total && total > 0) return 'Selesai';
  return 'Sedang Diuji';
}

function getDetailParameterInfo(detail = {}) {
  const directParameterMetode =
    pickObject(detail, ['parameter_metode', 'ParameterMetode']) || {};

  const fpm =
    pickObject(detail, ['fppl_parameter_metode', 'FpplParameterMetode']) || {};

  const fpmParameterMetode =
    pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};

  const parameterMetode =
    directParameterMetode.id_metode_parameter
      ? directParameterMetode
      : fpmParameterMetode;

  const parameter =
    pickObject(parameterMetode, ['parameter', 'Parameter']) ||
    pickObject(fpm, ['parameter', 'Parameter']) ||
    {};

  const metode =
    pickObject(parameterMetode, ['metode', 'Metode']) ||
    pickObject(fpmParameterMetode, ['metode', 'Metode']) ||
    {};

  return {
    fpm,
    parameter,
    parameterMetode,
    metode,
    idMetodeParameter:
      detail.id_metode_parameter ||
      parameterMetode.id_metode_parameter ||
      fpm.id_metode_parameter ||
      null,
    namaParameter: parameter.nama_parameter || '-',
    namaMetode: metode.nama_metode || parameterMetode.acuan_metode || '-',
    acuanMetode: parameterMetode.acuan_metode || '-',
  };
}

function getDetailSampleRows(detail = {}) {
  const penugasanItems = pickArray(detail, ['penugasan_items', 'PenugasanItems', 'penugasan_item']);
  const lka = pickObject(detail, ['lka', 'Lka']) || {};
  const lkaHasilRows = pickArray(lka, ['lka_hasils', 'LkaHasils', 'lka_hasil', 'LkaHasil']);
  const lkaRevisionRows = pickArray(lka, ['revisi_lka', 'RevisiLka', 'LkaRevisis']);

  return penugasanItems
    .map((item) => {
      const sampel = pickObject(item, ['sampel', 'Sampel']) || {};
      const noSampel = item.no_sampel || sampel.no_sampel;
      const hasilRow = lkaHasilRows.find((hasil) => hasil.no_sampel === noSampel) || {};
      const revisionNotePayload = collectRevisionNotesForSample(
        lkaRevisionRows,
        noSampel,
        lka?.kode_lka || hasilRow.kode_lka || null,
        { audience: 'penyelia' }
      );

      return {
        kode_lka: lka?.kode_lka || hasilRow.kode_lka || null,
        kodeLka: lka?.kode_lka || hasilRow.kode_lka || null,
        no_sampel: noSampel,
        noSampel,
        tanggal_penugasan: item.tanggal_penugasan || null,
        tanggal_tenggat: detail.tanggal_tenggat || null,
        tanggal_pengambilan_sampel: sampel.tanggal_pengambilan_sampel || null,
        tanggal_penerimaan: sampel.diterima_pada || null,
        jam_penerimaan: (sampel.diterima_pada ? new Date(sampel.diterima_pada).toTimeString().slice(0, 8) : null) || null,
        hasil: hasilRow.hasil || '',
        catatan_hasil: hasilRow.catatan_hasil || '',
        catatanHasil: hasilRow.catatan_hasil || '',
        status_review_hasil: hasilRow.statusReviewHasil || null,
        statusReviewHasil: hasilRow.statusReviewHasil || null,
        catatan_revisi: revisionNotePayload.text || '-',
        catatanRevisi: revisionNotePayload.text || '-',
        catatan_revisi_items: revisionNotePayload.items || [],
        catatanRevisiItems: revisionNotePayload.items || [],
      };
    })
    .filter((row) => row.no_sampel);
}

function getLatestActivityFromDetail(detail = {}) {
  const lka = pickObject(detail, ['lka', 'Lka']) || {};
  const sampleRows = getDetailSampleRows(detail);

  return (
    lka.tanggal_pelaporan ||
    lka.tanggal_pemeriksaan ||
    firstDate(sampleRows.map((row) => row.tanggal_penugasan)) ||
    detail.tanggal_tenggat ||
    null
  );
}

function isInternalDetail(detail = {}) {
  const penugasan = pickObject(detail, ['penugasan', 'Penugasan']) || {};
  return String(penugasan.jenis_penugasan || penugasan.jenisPenugasan || '').toUpperCase() !== SUBKONTRAK_ASSIGNMENT_TYPE;
}

module.exports = {
  deriveSampleStatus,
  getDetailParameterInfo,
  getDetailSampleRows,
  getLatestActivityFromDetail,
  isInternalDetail,
};
