const { Op } = require('sequelize');
const {
  Fppl,
  FpplSampel,
  RegBm,
  PktBm,
  PktBmParam,
  PktBmPm,
  JenisSampel,
  Parameter,
  Metode,
  ParameterMetode,
  FpplParameterMetode,
  Penugasan,
  PenugasanDetail,
  PenugasanItem,
  Sampel,
  Lka,
  LkaHasil,
  JadwalSampel,
} = require('../../models/Associations');
const {
  SAMPLE_REVIEW_STATUS,
} = require('../../constants/lhu-status.constant');
const {
  LKA_HASIL_STATUS,
} = require('./assignment.constants');
const {
  buildLkaHasilRevisionResponse,
  collectRevisionNotesForSample,
} = require('./assignment-revision.helper');
const {
  resolveLkaHasilStatus,
} = require('./assignment-status.helper');
const {
  getPlain,
  pickObject,
  pickArray,
} = require('./assignment-object.helper');
const {
  parseWorksheetFiles,
  getPrimaryWorksheetPath,
} = require('./assignment-worksheet-files.helper');
const {
  isSubkontrakAssignment,
} = require('./assignment-scope.helper');
const {
  getActiveJadwalFromFppl,
  getAssociatedFpmsFromSample,
  isSubkontrakFpm,
} = require('./assignment-fpm.helper');
const {
  loadRevisionRowsForLka,
} = require('./assignment-worksheet.service');

async function getBmParamMap(sample = {}) {
  const fpplSampel = pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {};
  const fpms = getAssociatedFpmsFromSample(sample);

  const idRegBm = fpplSampel.id_reg_bm;
  const idJenisSampel = fpplSampel.id_jenis_sampel;
  const parameterIds = Array.from(new Set(fpms.map((fpm) => fpm.id_parameter).filter(Boolean)));

  if (!idRegBm || !idJenisSampel || parameterIds.length === 0) {
    return new Map();
  }

  const rows = await PktBmParam.findAll({
    where: {
      id_parameter: { [Op.in]: parameterIds },
    },
    include: [
      {
        model: PktBm,
        required: true,
        where: {
          id_reg_bm: idRegBm,
          id_jenis_sampel: idJenisSampel,
        },
      },
      {
        model: PktBmPm,
        required: false,
      },
    ],
  });

  const map = new Map();

  rows.forEach((instance) => {
    const row = getPlain(instance);
    if (!row?.id_parameter) return;

    map.set(String(row.id_parameter), {
      id_pkt_bm_param: row.id_pkt_bm_param || null,
      id_pkt_bm: row.id_pkt_bm || null,
      nilai_bm: row.nilai_bm || null,
      satuan_bm: row.satuan_bm || null,
      ket_bm: row.ket_bm || null,
      is_in_bm: row.is_in_bm,
    });
  });

  return map;
}



async function getCompletedKasiResultRowsFromSample(sample = {}, transaction = null) {
  const noSampel = sample.no_sampel;
  const fpms = getAssociatedFpmsFromSample(sample);
  const rows = [];
  const bmMap = await getBmParamMap(sample);

  for (const fpm of fpms) {
    const parameter = pickObject(fpm, ['parameter', 'Parameter']) || {};
    const parameterMetode = pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
    const metode = pickObject(parameterMetode, ['metode', 'Metode']) || {};

    const idMetodeParameter =
      fpm.id_metode_parameter ||
      parameterMetode.id_metode_parameter ||
      null;

    if (!idMetodeParameter) continue;

    const isSubkontrakTarget = isSubkontrakFpm(fpm, parameterMetode);

    const detailInstances = await PenugasanDetail.findAll({
      where: {
        id_metode_parameter: idMetodeParameter,
      },
      include: [
        {
          model: Penugasan,
          required: true,
          where: {
            status_penugasan: { [Op.ne]: 'Dibatalkan' },
          },
        },
        {
          model: PenugasanItem,
          required: true,
          where: {
            no_sampel: noSampel,
          },
        },
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
          required: true,
          include: [
            {
              model: LkaHasil,
              required: false,
              where: {
                no_sampel: noSampel,
              },
            },
          ],
        },
      ],
      order: [['id_penugasan_detail', 'DESC']],
      transaction,
    });

    const detailRows = detailInstances
      .map((instance) => getPlain(instance))
      .filter(Boolean);

    const isPreferredDetail = (detail) => {
      const penugasan = pickObject(detail, ['penugasan', 'Penugasan']) || {};
      return isSubkontrakTarget
        ? isSubkontrakAssignment(penugasan)
        : !isSubkontrakAssignment(penugasan);
    };

    // Utamakan tipe penugasan yang sesuai FPM.
    // Fallback tetap perlu untuk data lama yang hasil LKA-nya valid, tetapi jenis_penugasan belum konsisten.
    const candidateDetailRows = [...detailRows].sort((a, b) => {
      const preferredDiff = Number(isPreferredDetail(b)) - Number(isPreferredDetail(a));
      if (preferredDiff !== 0) return preferredDiff;

      return String(b.id_penugasan_detail || '').localeCompare(String(a.id_penugasan_detail || ''));
    });

    const completedRows = [];

    for (const detail of candidateDetailRows) {
      const lka = pickObject(detail, ['lka', 'Lka']) || {};
      const hasilRows = pickArray(lka, [
        'lka_hasils',
        'LkaHasils',
        'lka_hasil',
        'LkaHasil',
      ]);

      const hasilRow = hasilRows.find(
        (hasil) =>
          hasil.no_sampel === noSampel &&
          String(hasil.hasil || '').trim()
      );

      if (!hasilRow) continue;

      const statusReviewHasil = resolveLkaHasilStatus(hasilRow, lka.status_lka, hasilRows);

      if (![LKA_HASIL_STATUS.APPROVED_PENYELIA, LKA_HASIL_STATUS.APPROVED_KASI, LKA_HASIL_STATUS.WAIT_KASI].includes(statusReviewHasil)) {
        continue;
      }

      const lkaRevisionRows = lka?.kode_lka ? await loadRevisionRowsForLka(lka.kode_lka, transaction) : [];
      const revisionNotePayload = collectRevisionNotesForSample(
        lkaRevisionRows,
        noSampel,
        lka?.kode_lka || hasilRow.kode_lka || null,
        { audience: 'kasi' }
      );
      const bm = bmMap.get(String(fpm.id_parameter)) || {};

      completedRows.push({
        kode_lka: hasilRow.kode_lka,
        no_sampel: hasilRow.no_sampel,
        hasil: hasilRow.hasil,
        catatan_hasil: hasilRow.catatan_hasil,
        statusReviewHasil: statusReviewHasil,
        ...buildLkaHasilRevisionResponse({ ...hasilRow, ...revisionNotePayload }),

        status_lka: lka.status_lka,
        tanggal_mulai_pengujian: lka.tanggal_mulai_pengujian,
        tanggal_selesai_pengujian: lka.tanggal_selesai_pengujian,
        file_worksheet_path: getPrimaryWorksheetPath(lka.file_worksheet_path),
        fileWorksheetPath: getPrimaryWorksheetPath(lka.file_worksheet_path),
        worksheet_files: parseWorksheetFiles(lka.file_worksheet_path),
        worksheetFiles: parseWorksheetFiles(lka.file_worksheet_path),

        id_penugasan_detail: detail.id_penugasan_detail,
        id_fppl_parameter_metode: fpm.id_fppl_parameter_metode,

        id_parameter: fpm.id_parameter,
        id_metode_parameter: idMetodeParameter,

        nama_parameter: parameter.nama_parameter,
        kategori_parameter: parameter.kategori_parameter,

        acuan_metode: parameterMetode.acuan_metode,
        is_terakreditasi: parameterMetode.is_terakreditasi,

        nama_metode: metode.nama_metode,

        satuan_bm: bm.satuan_bm || null,
        satuanBm: bm.satuan_bm || null,
        nilai_bm: bm.nilai_bm || null,
        nilaiBm: bm.nilai_bm || null,

        status_kemampuan_lab: fpm.status_kemampuan_lab || null,
        statusKemampuanLab: fpm.status_kemampuan_lab || null,

        is_subkontrak: isSubkontrakTarget ? 1 : 0,
        isSubkontrak: isSubkontrakTarget ? 1 : 0,
        is_insitu: Number(fpm.is_insitu || 0),
        isInsitu: Number(fpm.is_insitu || 0),

        catatan_kemampuan: fpm.catatan_kemampuan || null,
        catatanKemampuan: fpm.catatan_kemampuan || null,
      });
    }

    if (completedRows.length > 0) {
      rows.push(completedRows[0]);
    }
  }

  return rows.sort((a, b) =>
    String(a.nama_parameter || '').localeCompare(String(b.nama_parameter || ''))
  );
}



async function countKasiReviewCompletion(sample = {}) {
  const fpms = getAssociatedFpmsFromSample(sample);
  const totalParameter = fpms.length;
  const completedRows = await getCompletedKasiResultRowsFromSample(sample);

  const completedFpmIds = new Set(
    completedRows
      .map((row) => row.id_fppl_parameter_metode)
      .filter(Boolean)
  );

  return {
    totalParameter,
    totalSelesai: completedFpmIds.size,
    completedRows,
  };
}



function mapKasiReviewSampleHeader(sample = {}) {
  const fpplSampel = pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {};
  const jenis = pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
  const regBm = pickObject(fpplSampel, ['reg_bm', 'RegBm']) || {};
  const fppl = pickObject(fpplSampel, ['fppl', 'Fppl']) || {};
  const jadwal = getActiveJadwalFromFppl(fppl);
  const standarLabel = [regBm.instansi, regBm.ref_reg].filter(Boolean).join(' - ');
  const tanggalPengambilanSampel = sample.tanggal_pengambilan_sampel || jadwal?.tanggal_jadwal || null;

  return {
    noSampel: sample.no_sampel,
    no_sampel: sample.no_sampel,

    idRegistrasi: fpplSampel.id_registrasi,
    id_registrasi: fpplSampel.id_registrasi,

    nomorFppl: fppl.nomor_fppl || null,
    nomor_fppl: fppl.nomor_fppl || null,

    jenisSampel: jenis.jenis_sampel,
    jenis_sampel: jenis.jenis_sampel,

    idJenisSampel: fpplSampel.id_jenis_sampel,
    id_jenis_sampel: fpplSampel.id_jenis_sampel,

    idRegBm: fpplSampel.id_reg_bm,
    id_reg_bm: fpplSampel.id_reg_bm,

    regBm: standarLabel,
    reg_bm: standarLabel,
    standar: standarLabel,

    tanggalPenerimaan: sample.diterima_pada,
    tanggal_penerimaan: sample.diterima_pada,

    jamPenerimaan: (sample.diterima_pada ? new Date(sample.diterima_pada).toTimeString().slice(0, 8) : null),
    jam_penerimaan: (sample.diterima_pada ? new Date(sample.diterima_pada).toTimeString().slice(0, 8) : null),

    tanggalPengambilanSampel,
    tanggal_pengambilan_sampel: tanggalPengambilanSampel,
    tanggalSampling: tanggalPengambilanSampel,
    tanggal_sampling: tanggalPengambilanSampel,

    tanggalJadwal: jadwal?.tanggal_jadwal || null,
    tanggal_jadwal: jadwal?.tanggal_jadwal || null,

    jamJadwal: jadwal?.jam_jadwal || null,
    jam_jadwal: jadwal?.jam_jadwal || null,

    kondisiSampel: sample.kondisi_sampel,
    kondisi_sampel: sample.kondisi_sampel,

    koordinat: sample.koordinat,

    abnormalitasSampel: sample.abnormalitas_sampel,
    abnormalitas_sampel: sample.abnormalitas_sampel,

    acuanPengambilanSampel: sample.acuan_pengambilan_sampel || '-',
    acuan_pengambilan_sampel: sample.acuan_pengambilan_sampel || '-',

    statusSample: sample.status_sample,
    status_sample: sample.status_sample,

    statusReviewHasil: sample.statusReviewHasil || SAMPLE_REVIEW_STATUS.WAIT_KASI_PENGUJIAN,
    status_review_hasil: sample.statusReviewHasil || SAMPLE_REVIEW_STATUS.WAIT_KASI_PENGUJIAN,

    kasiPengujianReviewBy: sample.kasiPengujianReviewBy,
    kasi_pengujian_review_by: sample.kasiPengujianReviewBy,

    kasiPengujianReviewAt: sample.kasiPengujianReviewAt,
    kasi_pengujian_review_at: sample.kasiPengujianReviewAt,
  };
}



async function findKasiReviewSample(noSampel, transaction = null) {
  return Sampel.findOne({
    where: { no_sampel: noSampel },
    include: [
      {
        model: FpplSampel,
        as: 'fppl_sampel',
        required: true,
        include: [
          { model: JenisSampel, required: false },
          { model: RegBm, required: false },
          {
            model: Fppl,
            as: 'fppl',
            required: false,
            include: [
              {
                model: JadwalSampel,
                as: 'jadwal_sampels',
                required: false,
              },
            ],
          },
        ],
      },
      {
        model: FpplParameterMetode,
        as: 'parameter_metodes',
        required: false,
        through: { attributes: [] },
        include: [
          { model: Parameter, required: false },
          {
            model: ParameterMetode,
            required: false,
            include: [
              { model: Metode, required: false },
            ],
          },
        ],
      },
    ],
    transaction,
  });
}




async function getKasiReviewSampleHeader(noSampel, transaction = null) {
  const sampleInstance = await findKasiReviewSample(noSampel, transaction);

  if (!sampleInstance) {
    throw new Error('Sampel tidak ditemukan.');
  }

  return mapKasiReviewSampleHeader(getPlain(sampleInstance));
}




async function getKasiReviewResultRows(noSampel, transaction = null) {
  const sampleInstance = await findKasiReviewSample(noSampel, transaction);

  if (!sampleInstance) {
    throw new Error('Sampel tidak ditemukan.');
  }

  return getCompletedKasiResultRowsFromSample(getPlain(sampleInstance), transaction);
}

module.exports = {
  countKasiReviewCompletion,
  findKasiReviewSample,
  getCompletedKasiResultRowsFromSample,
  getKasiReviewResultRows,
  getKasiReviewSampleHeader,
  mapKasiReviewSampleHeader,
};
