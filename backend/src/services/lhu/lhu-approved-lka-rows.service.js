const { Op } = require('sequelize');
const {
  FpplParameterMetode,
  Lka,
  LkaHasil,
  Metode,
  Parameter,
  ParameterMetode,
  PenugasanDetail,
  PenugasanItem,
  SampelParameter,
} = require('../../models/Associations');
const {
  getLkaHasilReviewStatus,
  getPlain,
  isResultApprovedByKasi,
  pickObject,
} = require('./lhu-data-utils');

async function getApprovedLkaRowsForExpectedParameters(noSampel, transaction = null) {
  const sampleNo = String(noSampel || '').trim();

  if (!sampleNo) {
    throw new Error('Nomor sampel wajib dipilih.');
  }

  // Model-only version. Jangan pakai raw SQL di alur QC/LHU.
  // Sumber kebenaran parameter wajib adalah SampelParameter -> FpplParameterMetode.
  const expectedInstances = await SampelParameter.findAll({
    where: { no_sampel: sampleNo },
    include: [
      {
        model: FpplParameterMetode,
        as: 'fppl_parameter_metode',
        required: true,
        include: [
          { model: Parameter, required: false },
          {
            model: ParameterMetode,
            required: false,
            include: [{ model: Metode, required: false }],
          },
        ],
      },
    ],
    transaction,
  });

  const expectedRows = expectedInstances
    .map((instance) => {
      const row = getPlain(instance);
      const fpm = pickObject(row, ['fppl_parameter_metode', 'FpplParameterMetode']) || {};
      const parameter = pickObject(fpm, ['parameter', 'Parameter']) || {};
      const parameterMetode = pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
      const metode = pickObject(parameterMetode, ['metode', 'Metode']) || {};

      return {
        no_sampel: sampleNo,
        noSampel: sampleNo,
        id_fppl_parameter_metode: fpm.id_fppl_parameter_metode || row.id_fppl_parameter_metode || null,
        idFpplParameterMetode: fpm.id_fppl_parameter_metode || row.id_fppl_parameter_metode || null,
        id_parameter: fpm.id_parameter || parameter.id_parameter || parameterMetode.id_parameter || null,
        idParameter: fpm.id_parameter || parameter.id_parameter || parameterMetode.id_parameter || null,
        id_metode_parameter: fpm.id_metode_parameter || parameterMetode.id_metode_parameter || null,
        idMetodeParameter: fpm.id_metode_parameter || parameterMetode.id_metode_parameter || null,
        is_insitu: fpm.is_insitu ?? 0,
        isInsitu: fpm.is_insitu ?? 0,
        status_kemampuan_lab: fpm.status_kemampuan_lab || null,
        statusKemampuanLab: fpm.status_kemampuan_lab || null,
        is_subkontrak: parameterMetode.is_subkontrak ?? 0,
        isSubkontrak: parameterMetode.is_subkontrak ?? 0,
        is_subkontrak_snapshot: parameterMetode.is_subkontrak ?? 0,
        isSubkontrakSnapshot: parameterMetode.is_subkontrak ?? 0,
        nama_parameter: parameter.nama_parameter || '-',
        namaParameter: parameter.nama_parameter || '-',
        kategori_parameter: parameter.kategori_parameter || parameter.id_kategori_parameter || null,
        kategoriParameter: parameter.kategori_parameter || parameter.id_kategori_parameter || null,
        acuan_metode: parameterMetode.acuan_metode || '-',
        acuanMetode: parameterMetode.acuan_metode || '-',
        is_terakreditasi: parameterMetode.is_terakreditasi ?? 0,
        isTerakreditasi: parameterMetode.is_terakreditasi ?? 0,
        nama_metode: metode.nama_metode || '-',
        namaMetode: metode.nama_metode || '-',
      };
    })
    .filter((row) => row.id_fppl_parameter_metode || row.id_metode_parameter || row.id_parameter);

  if (!expectedRows.length) {
    throw new Error(`Belum ada parameter yang terdaftar untuk sampel ${sampleNo}.`);
  }

  // Ambil relasi penugasan lewat model agar mapping id_metode_parameter stabil.
  const assignmentItemInstances = await PenugasanItem.findAll({
    where: { no_sampel: sampleNo },
    include: [
      {
        model: PenugasanDetail,
        required: true,
        include: [
          {
            model: ParameterMetode,
            required: false,
            include: [
              { model: Parameter, required: false },
              { model: Metode, required: false },
            ],
          },
          {
            model: Lka,
            required: false,
          },
        ],
      },
    ],
    transaction,
  });

  const assignmentRows = assignmentItemInstances.map((instance) => getPlain(instance));
  const detailById = new Map();
  const detailsByMethodId = new Map();

  assignmentRows.forEach((row) => {
    const detail = pickObject(row, ['penugasan_detail', 'PenugasanDetail']) || {};
    const methodId = String(detail.id_metode_parameter || '').trim();
    const detailId = String(detail.id_penugasan_detail || row.id_penugasan_detail || '').trim();

    if (detailId) detailById.set(detailId, detail);
    if (methodId) {
      if (!detailsByMethodId.has(methodId)) detailsByMethodId.set(methodId, []);
      detailsByMethodId.get(methodId).push(detail);
    }
  });

  // Ambil hasil LKA approved lewat model. Field statusReviewHasil adalah atribut Sequelize
  // untuk kolom fisik status_review_hasil.
  const resultInstances = await LkaHasil.findAll({
    where: {
      no_sampel: sampleNo,
      statusReviewHasil: 'Disetujui Kasi Pengujian',
      hasil: { [Op.ne]: null },
    },
    include: [
      {
        model: Lka,
        required: true,
        include: [
          {
            model: PenugasanDetail,
            required: false,
            include: [
              {
                model: ParameterMetode,
                required: false,
                include: [
                  { model: Parameter, required: false },
                  { model: Metode, required: false },
                ],
              },
            ],
          },
        ],
      },
    ],
    transaction,
  });

  const resultRows = resultInstances
    .map((instance) => {
      const row = getPlain(instance);
      const lka = pickObject(row, ['lka', 'Lka']) || {};
      let detail = pickObject(lka, ['penugasan_detail', 'PenugasanDetail']) || {};

      const detailId = String(lka.id_penugasan_detail || detail.id_penugasan_detail || '').trim();
      if ((!detail || !detail.id_penugasan_detail) && detailId && detailById.has(detailId)) {
        detail = detailById.get(detailId);
      }

      const parameterMetode = pickObject(detail, ['parameter_metode', 'ParameterMetode']) || {};
      const parameter = pickObject(parameterMetode, ['parameter', 'Parameter']) || {};
      const metode = pickObject(parameterMetode, ['metode', 'Metode']) || {};
      const statusReview = getLkaHasilReviewStatus(row);

      return {
        kode_lka: row.kode_lka,
        kodeLka: row.kode_lka,
        no_sampel: sampleNo,
        noSampel: sampleNo,
        hasil: row.hasil,
        catatan_hasil: row.catatan_hasil,
        catatanHasil: row.catatan_hasil,
        status_review_hasil: statusReview,
        statusReviewHasil: statusReview,
        status_lka: lka.status_lka,
        statusLka: lka.status_lka,
        tanggal_mulai_pengujian: lka.tanggal_mulai_pengujian,
        tanggalMulaiPengujian: lka.tanggal_mulai_pengujian,
        tanggal_selesai_pengujian: lka.tanggal_selesai_pengujian,
        tanggalSelesaiPengujian: lka.tanggal_selesai_pengujian,
        id_penugasan_detail: detail.id_penugasan_detail || lka.id_penugasan_detail || null,
        idPenugasanDetail: detail.id_penugasan_detail || lka.id_penugasan_detail || null,
        id_metode_parameter: detail.id_metode_parameter || parameterMetode.id_metode_parameter || null,
        idMetodeParameter: detail.id_metode_parameter || parameterMetode.id_metode_parameter || null,
        id_parameter: parameterMetode.id_parameter || parameter.id_parameter || null,
        idParameter: parameterMetode.id_parameter || parameter.id_parameter || null,
        is_subkontrak: parameterMetode.is_subkontrak ?? 0,
        isSubkontrak: parameterMetode.is_subkontrak ?? 0,
        is_subkontrak_snapshot: parameterMetode.is_subkontrak ?? 0,
        isSubkontrakSnapshot: parameterMetode.is_subkontrak ?? 0,
        nama_parameter: parameter.nama_parameter || '-',
        namaParameter: parameter.nama_parameter || '-',
        kategori_parameter: parameter.kategori_parameter || parameter.id_kategori_parameter || null,
        kategoriParameter: parameter.kategori_parameter || parameter.id_kategori_parameter || null,
        acuan_metode: parameterMetode.acuan_metode || '-',
        acuanMetode: parameterMetode.acuan_metode || '-',
        is_terakreditasi: parameterMetode.is_terakreditasi ?? 0,
        isTerakreditasi: parameterMetode.is_terakreditasi ?? 0,
        nama_metode: metode.nama_metode || '-',
        namaMetode: metode.nama_metode || '-',
      };
    })
    .filter((row) => String(row.hasil || '').trim() && isResultApprovedByKasi(row));

  const approvedRows = [];
  const missingRows = [];

  expectedRows.forEach((expected) => {
    const expectedMethodId = String(expected.id_metode_parameter || expected.idMetodeParameter || '').trim();
    const expectedParameterId = String(expected.id_parameter || expected.idParameter || '').trim();

    const candidates = resultRows.filter((row) => {
      const rowMethodId = String(row.id_metode_parameter || row.idMetodeParameter || '').trim();
      const rowParameterId = String(row.id_parameter || row.idParameter || '').trim();

      if (expectedMethodId && rowMethodId && expectedMethodId === rowMethodId) return true;
      if (expectedParameterId && rowParameterId && expectedParameterId === rowParameterId) return true;
      return false;
    });

    const result = candidates.sort((a, b) => {
      const aId = Number(String(a.kode_lka || a.kodeLka || '').replace(/\D/g, '')) || 0;
      const bId = Number(String(b.kode_lka || b.kodeLka || '').replace(/\D/g, '')) || 0;
      return bId - aId;
    })[0];

    if (!result) {
      missingRows.push(expected);
      return;
    }

    approvedRows.push({
      ...result,
      id_fppl_parameter_metode: expected.id_fppl_parameter_metode || result.id_fppl_parameter_metode || null,
      idFpplParameterMetode: expected.idFpplParameterMetode || result.idFpplParameterMetode || null,
      id_parameter: expected.id_parameter || result.id_parameter || null,
      idParameter: expected.idParameter || result.idParameter || null,
      id_metode_parameter: expected.id_metode_parameter || result.id_metode_parameter || null,
      idMetodeParameter: expected.idMetodeParameter || result.idMetodeParameter || null,
      is_insitu: expected.is_insitu ?? result.is_insitu ?? 0,
      isInsitu: expected.isInsitu ?? result.isInsitu ?? 0,
      status_kemampuan_lab: expected.status_kemampuan_lab || result.status_kemampuan_lab || null,
      statusKemampuanLab: expected.statusKemampuanLab || result.statusKemampuanLab || null,
      is_subkontrak: expected.is_subkontrak ?? result.is_subkontrak ?? 0,
      isSubkontrak: expected.isSubkontrak ?? result.isSubkontrak ?? 0,
      is_subkontrak_snapshot: expected.is_subkontrak_snapshot ?? result.is_subkontrak_snapshot ?? result.is_subkontrak ?? 0,
      isSubkontrakSnapshot: expected.isSubkontrakSnapshot ?? result.isSubkontrakSnapshot ?? result.isSubkontrak ?? 0,
      nama_parameter: expected.nama_parameter || result.nama_parameter || '-',
      namaParameter: expected.namaParameter || result.namaParameter || '-',
      kategori_parameter: expected.kategori_parameter || result.kategori_parameter || null,
      kategoriParameter: expected.kategoriParameter || result.kategoriParameter || null,
      acuan_metode: expected.acuan_metode || result.acuan_metode || '-',
      acuanMetode: expected.acuanMetode || result.acuanMetode || '-',
      is_terakreditasi: expected.is_terakreditasi ?? result.is_terakreditasi ?? 0,
      isTerakreditasi: expected.isTerakreditasi ?? result.isTerakreditasi ?? 0,
      nama_metode: expected.nama_metode || result.nama_metode || '-',
      namaMetode: expected.namaMetode || result.namaMetode || '-',
      no_sampel: sampleNo,
      noSampel: sampleNo,
    });
  });

  if (missingRows.length) {
    const names = missingRows
      .map((row) => [row.nama_parameter || row.namaParameter, row.nama_metode || row.namaMetode || row.acuan_metode || row.acuanMetode]
        .filter(Boolean)
        .join(' - '))
      .filter(Boolean);
    const suffix = names.length ? ` Parameter belum siap: ${names.join(', ')}.` : '';
    throw new Error(`Semua parameter pada sampel ${sampleNo} harus memiliki hasil dan sudah Disetujui Kasi Pengujian.${suffix}`);
  }

  return approvedRows.sort((a, b) =>
    String(a.nama_parameter || '').localeCompare(String(b.nama_parameter || ''))
  );
}


module.exports = {
  getApprovedLkaRowsForExpectedParameters,
};
