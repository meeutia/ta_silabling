const {
  getFallbackParameterKey,
  getSubkontrakSnapshot,
  isResultApprovedByKasi,
  toDateOnly,
  toTinyIntFlag,
} = require('./lhu-data-utils');

function normalizeBmText(value) {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();

  if (!text) return null;

  return text;
}

function normalizeNilaiBmForLhu(value) {
  const text = normalizeBmText(value);
  if (!text || text === '-' || text === '(-)') return '(-)';
  return text;
}

function findApprovedResultForExpectedParameter(expected = {}, resultRows = []) {
  const expectedFpmId = String(expected.id_fppl_parameter_metode || '').trim();
  const expectedMethodId = String(expected.id_metode_parameter || '').trim();
  const expectedParameterId = String(expected.id_parameter || '').trim();

  const candidates = (Array.isArray(resultRows) ? resultRows : []).filter((row) => {
    const rowFpmId = String(row.id_fppl_parameter_metode || row.idFpplParameterMetode || '').trim();
    const rowMethodId = String(row.id_metode_parameter || row.idMetodeParameter || '').trim();
    const rowParameterId = String(row.id_parameter || row.idParameter || '').trim();

    if (expectedFpmId && rowFpmId && expectedFpmId === rowFpmId) return true;
    if (expectedMethodId && rowMethodId && expectedMethodId === rowMethodId) return true;
    if (expectedParameterId && rowParameterId && expectedParameterId === rowParameterId) return true;
    return false;
  });

  const approvedCandidates = candidates.filter((row) =>
    isResultApprovedByKasi(row) && String(row.hasil || '').trim()
  );

  if (!approvedCandidates.length) return null;

  return approvedCandidates.sort((a, b) => {
    const aId = Number(String(a.kode_lka || a.kodeLka || '').replace(/\D/g, '')) || 0;
    const bId = Number(String(b.kode_lka || b.kodeLka || '').replace(/\D/g, '')) || 0;
    return bId - aId;
  })[0];
}

function mapDetailRow(resultRow, bmInfo, sample = {}) {
  const bm = bmInfo.map.get(resultRow.id_parameter) || null;
  const adaDiBm = Boolean(bm && Number(bm.is_in_bm) === 1);

  const nilaiBm = normalizeNilaiBmForLhu(bm?.nilai_bm);
  const satuanBm = normalizeBmText(bm?.satuan_bm);

  return {
    nomor_lhu: null,
    no_sampel: resultRow.no_sampel,
    noSampel: resultRow.no_sampel,
    kode_lka: resultRow.kode_lka || null,
    kodeLka: resultRow.kode_lka || null,
    id_fppl_parameter_metode: resultRow.id_fppl_parameter_metode || null,
    idFpplParameterMetode: resultRow.id_fppl_parameter_metode || null,
    id_parameter: resultRow.id_parameter || null,
    idParameter: resultRow.id_parameter || null,
    id_metode_parameter: resultRow.id_metode_parameter || null,
    idMetodeParameter: resultRow.id_metode_parameter || null,
    nama_parameter: resultRow.nama_parameter,
    metode: resultRow.nama_metode,
    acuan_metode: resultRow.acuan_metode,
    hasil: resultRow.hasil,
    is_terakreditasi: toTinyIntFlag(resultRow.is_terakreditasi),
    isTerakreditasi: toTinyIntFlag(resultRow.is_terakreditasi),
    bm: nilaiBm,
    satuan_bm: satuanBm,
    satuanBm: satuanBm,
    ada_di_bm: adaDiBm ? 1 : 0,
    adaDiBm: adaDiBm ? 1 : 0,
    urutan_lhu: null,
    is_insitu: toTinyIntFlag(resultRow.is_insitu),
    isInsitu: toTinyIntFlag(resultRow.is_insitu),
    is_insitu_snapshot: toTinyIntFlag(resultRow.is_insitu),
    isInsituSnapshot: toTinyIntFlag(resultRow.is_insitu),
    is_subkontrak: getSubkontrakSnapshot(resultRow),
    isSubkontrak: getSubkontrakSnapshot(resultRow),
    is_subkontrak_snapshot: getSubkontrakSnapshot(resultRow),
    isSubkontrakSnapshot: getSubkontrakSnapshot(resultRow),
    tanggal_sampling: toDateOnly(sample?.tanggal_pengambilan_sampel),
    nilai_bm: nilaiBm,
    catatan_hasil: resultRow.catatan_hasil || null,
  };
}

function groupLhuDetailRowsByParameter(rows = []) {
  const map = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row, index) => {
    const key = getFallbackParameterKey(row) || `row-${index}`;

    if (!map.has(key)) {
      map.set(key, {
        ...row,
        no_sampel: null,
        noSampel: null,
        kode_lka: null,
        kodeLka: null,
        samples: [],
        sampels: [],
        hasil_by_sample: {},
        hasilBySample: {},
        kode_lka_by_sample: {},
        kodeLkaBySample: {},
      });
    }

    const group = map.get(key);
    const noSampel = String(row.no_sampel || row.noSampel || '').trim();
    if (!noSampel) return;

    group.hasil_by_sample[noSampel] = row.hasil || row.hasil_snapshot || row.hasilSnapshot || null;
    group.hasilBySample[noSampel] = group.hasil_by_sample[noSampel];
    group.kode_lka_by_sample[noSampel] = row.kode_lka || row.kodeLka || null;
    group.kodeLkaBySample[noSampel] = group.kode_lka_by_sample[noSampel];

    if (!group.samples.includes(noSampel)) group.samples.push(noSampel);
    if (!group.sampels.includes(noSampel)) group.sampels.push(noSampel);

    group.hasil = group.samples
      .map((sampleNo) => `${sampleNo}: ${group.hasil_by_sample[sampleNo] || '-'}`)
      .join('\n');
    group.hasil_snapshot = group.hasil;
    group.hasilSnapshot = group.hasil;
  });

  return Array.from(map.values()).sort((a, b) =>
    Number(a.urutan_lhu || 0) - Number(b.urutan_lhu || 0) ||
    String(a.nama_parameter || a.nama_parameter_snapshot || '').localeCompare(String(b.nama_parameter || b.nama_parameter_snapshot || ''))
  );
}

module.exports = {
  findApprovedResultForExpectedParameter,
  groupLhuDetailRowsByParameter,
  mapDetailRow,
  normalizeBmText,
  normalizeNilaiBmForLhu,
};
