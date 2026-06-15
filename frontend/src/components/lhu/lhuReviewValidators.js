import { asTrimmedText, isBlank } from '../../utils/formValidation';
import { getNomorLhu, getNoSampel } from './lhuReviewUtils';

function getResultValue(row = {}) {
  return row.hasil || row.hasil || row.hasil || '';
}

function getNoSampelListFromSelection(selectedSample = {}, form = {}) {
  const raw =
    form?.noSampelList ||
    form?.no_sampel_list ||
    form?.sampleNos ||
    form?.sample_nos ||
    selectedSample?.selectedNoSampelList ||
    selectedSample?.selected_no_sampel_list ||
    selectedSample?.noSampelList ||
    selectedSample?.no_sampel_list;

  const values = Array.isArray(raw) ? raw : String(raw || getNoSampel(selectedSample) || '').split(',');
  return [...new Set(values.map((item) => String(item || '').trim()).filter(Boolean))];
}

export function validateKasiApprove({ noSampel, resultRows } = {}) {
  if (isBlank(noSampel)) return 'Nomor sampel tidak valid.';

  const rows = Array.isArray(resultRows) ? resultRows : [];
  if (!rows.length) return 'Detail hasil pengujian belum tersedia. Buka ulang detail sebelum menyetujui.';

  const emptyIndex = rows.findIndex((row) => isBlank(getResultValue(row)));
  if (emptyIndex >= 0) {
    return `Hasil pengujian pada baris #${emptyIndex + 1} belum terisi.`;
  }

  return '';
}

export function validateKasiRevision({ noSampel, selectedRevisionIds, revisionNotes, revisionNotesById } = {}) {
  if (isBlank(noSampel)) return 'Nomor sampel tidak valid.';
  if (!Array.isArray(selectedRevisionIds) || selectedRevisionIds.length === 0) {
    return 'Pilih minimal satu parameter/metode yang perlu direvisi.';
  }

  if (revisionNotesById && typeof revisionNotesById === 'object') {
    const emptyId = selectedRevisionIds.find((id) => isBlank(revisionNotesById[String(id)]));
    if (emptyId) return 'Catatan revisi setiap parameter/metode yang dipilih wajib diisi.';
    return '';
  }

  if (isBlank(revisionNotes)) return 'Catatan revisi wajib diisi.';
  return '';
}

export function validateQcFinalize({ selectedSample, form, detailRows } = {}) {
  const noSampelList = getNoSampelListFromSelection(selectedSample, form);
  if (!noSampelList.length) return 'Pilih minimal satu sampel untuk difinalisasi.';
  if (isBlank(form?.idPktBm)) return 'Paket baku mutu wajib dipilih.';

  const rows = Array.isArray(detailRows) ? detailRows : [];
  if (!rows.length) return 'Detail LHU belum tersedia. Buka preview/detail sebelum finalisasi.';

  const emptyResultIndex = rows.findIndex((row) => isBlank(getResultValue(row)));
  if (emptyResultIndex >= 0) {
    return `Hasil pengujian pada detail LHU baris #${emptyResultIndex + 1} belum tersedia.`;
  }

  return '';
}

export function buildQcFinalizePayload({ selectedSample, form } = {}) {
  const noSampelList = getNoSampelListFromSelection(selectedSample, form);

  return {
    idRegistrasi: selectedSample?.idRegistrasi || selectedSample?.id_registrasi || null,
    id_registrasi: selectedSample?.idRegistrasi || selectedSample?.id_registrasi || null,
    noSampel: noSampelList[0] || getNoSampel(selectedSample),
    sampleNos: noSampelList,
    sample_nos: noSampelList,
    noSampelList,
    no_sampel_list: noSampelList,
    detailOrder: Array.isArray(form?.detailOrder) ? form.detailOrder : [],
    detail_order: Array.isArray(form?.detailOrder) ? form.detailOrder : [],
    idPktBm: form?.idPktBm,
    keteranganSampel: asTrimmedText(form?.keteranganSampel) || null,
  };
}

export function validateKalabApprove({ selectedRow, detailRows } = {}) {
  const nomorLhu = getNomorLhu(selectedRow);
  if (isBlank(nomorLhu)) return 'Nomor LHU tidak valid.';

  const rows = Array.isArray(detailRows) ? detailRows : [];
  if (!rows.length) return 'Detail LHU belum tersedia. Buka ulang detail LHU sebelum menyetujui.';

  const emptyResultIndex = rows.findIndex((row) => isBlank(getResultValue(row)));
  if (emptyResultIndex >= 0) {
    return `Hasil pengujian pada detail LHU baris #${emptyResultIndex + 1} belum tersedia.`;
  }

  return '';
}
