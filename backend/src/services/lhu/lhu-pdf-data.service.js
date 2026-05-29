const {
  Lhu,
  LhuSampel,
  DetailLhu,
  Sampel,
  FpplSampel,
  JenisSampel,
  RegBm,
  Fppl,
  Pelanggan,
  PktBm,
  PktBmParam,
  FpplParameterMetode,
  Parameter,
  ParameterMetode,
  Metode,
  Pegawai,
  JadwalSampel,
  Lka,
  LkaHasil,
  PenugasanDetail,
} = require('../../models/Associations');

const {
  formatSampleNoList,
  formatSampleFieldLines,
  getSampleOrderValue,
  sortRowsBySampleOrder,
  normalizeSampleTypeForLhu,
  normalizeSampleCollectorForLhu,
} = require('./lhu-pdf-format.util');

function getPlain(instance) {
  return instance ? instance.get({ plain: true }) : null;
}

function pickObject(source, keys = []) {
  for (const key of keys) {
    if (source?.[key]) return source[key];
  }

  return null;
}

function pickArray(source, keys = []) {
  for (const key of keys) {
    if (Array.isArray(source?.[key])) return source[key];
  }

  return [];
}

function toTinyIntFlag(value) {
  if (value === true || value === 1) return 1;

  const text = String(value ?? '').trim().toLowerCase();
  return text === '1' || text === 'true' || text === 'yes' ? 1 : 0;
}

function normalizeBmText(value) {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  return text || null;
}

function normalizeNilaiBmForLhu(value) {
  const text = normalizeBmText(value);
  if (!text || text === '-' || text === '(-)') return '(-)';
  return text;
}

function getLkaHasilReviewStatus(row = {}) {
  return row.status_review_hasil || row.statusReviewHasil || null;
}

function isResultApprovedByKasi(row = {}) {
  return String(getLkaHasilReviewStatus(row) || '').trim() === 'Disetujui Kasi Pengujian';
}

function getParameterMethodKey(row = {}) {
  return String(
    row.id_metode_parameter ||
      row.idMetodeParameter ||
      row.id_parameter_metode ||
      row.idParameterMetode ||
      ''
  ).trim();
}

function getParameterKey(row = {}) {
  return String(row.id_parameter || row.idParameter || '').trim();
}

function getFpplParameterMetodeKey(row = {}) {
  return String(
    row.id_fppl_parameter_metode ||
      row.idFpplParameterMetode ||
      row.id_fppl_pm ||
      row.idFpplPm ||
      ''
  ).trim();
}

function getSubkontrakSnapshot(row = {}) {
  return toTinyIntFlag(
    row.is_subkontrak_snapshot ??
      row.isSubkontrakSnapshot ??
      row.is_subkontrak ??
      row.isSubkontrak
  );
}

function getScheduleCreatedTime(row = {}) {
  const createdCandidates = [row.dibuat_pada, row.created_at, row.createdAt, row.updated_at, row.updatedAt];

  for (const value of createdCandidates) {
    if (!value) continue;

    const time = new Date(value).getTime();
    if (!Number.isNaN(time)) return time;
  }

  return 0;
}

function getScheduleDateTime(row = {}) {
  const time = new Date(`${row.tanggal_jadwal || '1900-01-01'} ${row.jam_jadwal || '00:00:00'}`).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getScheduleIdOrder(row = {}) {
  const numeric = String(row.id_jadwal || '').match(/\d+/g)?.join('');
  return Number(numeric || 0);
}

function getActiveJadwalFromFppl(fppl = {}) {
  const rows = pickArray(fppl, [
    'jadwal_sampels',
    'JadwalSampels',
    'jadwalSampel',
    'jadwalSampels',
  ]);

  return rows
    .filter((row) => String(row?.status_jadwal || '').trim().toLowerCase() !== 'dibatalkan')
    .sort((a, b) => (
      getScheduleCreatedTime(b) - getScheduleCreatedTime(a) ||
      getScheduleIdOrder(b) - getScheduleIdOrder(a) ||
      getScheduleDateTime(b) - getScheduleDateTime(a)
    ))[0] || null;
}

async function getPegawaiSnapshot(nik, transaction = null) {
  const userNik = String(nik || '').trim();

  if (!userNik) {
    return {
      nama_pegawai: null,
      nip: null,
    };
  }

  const pegawai = await Pegawai.findOne({
    where: { nik: userNik },
    attributes: ['nik', 'nama_pegawai', 'nip'],
    transaction,
  });

  if (!pegawai) {
    return {
      nama_pegawai: null,
      nip: null,
    };
  }

  const row = getPlain(pegawai);

  return {
    nama_pegawai: row.nama_pegawai || null,
    nip: row.nip || null,
  };
}

async function getLhuHeaderForPdf(nomorLhu, transaction = null) {
  const instance = await Lhu.findByPk(nomorLhu, {
    include: [
      {
        model: Fppl,
        as: 'fppl',
        required: false,
        include: [
          { model: Pelanggan, as: 'pelanggan', required: false },
          { model: JadwalSampel, as: 'jadwal_sampels', required: false },
        ],
      },
      {
        model: PktBm,
        required: false,
        include: [{ model: RegBm, required: false }],
      },
    ],
    transaction,
  });

  const row = getPlain(instance);
  if (!row) return null;

  const fppl = pickObject(row, ['fppl', 'Fppl']) || {};
  const pelanggan = pickObject(fppl, ['pelanggan', 'Pelanggan']) || {};
  const pktBm = pickObject(row, ['pkt_bm', 'PktBm']) || {};
  const regBm = pickObject(pktBm, ['reg_bm', 'RegBm']) || {};

  return {
    ...row,
    nomor_fppl: fppl.nomor_fppl || null,
    tanggal_pendaftaran: fppl.tanggal_pendaftaran || null,
    maksud_pengujian: fppl.maksud_pengujian || null,
    lokasi_pengambilan_sampel: fppl.lokasi_pengambilan_sampel || null,
    jenis_pengambilan_sampel: fppl.jenis_pengambilan_sampel || null,
    nama_pelanggan: pelanggan.nama_instansi || null,
    alamat_pelanggan: pelanggan.alamat || null,
    pic_pelanggan: pelanggan.pic || null,
    telp_pelanggan: pelanggan.no_telp || null,
    email_pelanggan: pelanggan.email_kontak || null,
    nama_pkt: pktBm.nama_pkt || null,
    klasifikasi: pktBm.klasifikasi || null,
    teks_lhu: pktBm.teks_lhu || null,
    reg_bm_instansi: regBm.instansi || null,
    ref_reg: regBm.ref_reg || null,
  };
}

async function getLhuSampleRowsForPdf(nomorLhu, transaction = null) {
  const instances = await LhuSampel.findAll({
    where: { nomor_lhu: nomorLhu },
    include: [
      {
        model: Sampel,
        as: 'sampel',
        required: true,
        include: [
          {
            model: FpplSampel,
            as: 'fppl_sampel',
            required: false,
            include: [{ model: JenisSampel, required: false }],
          },
        ],
      },
    ],
    order: [
      ['urutan_sampel', 'ASC'],
      ['no_sampel', 'ASC'],
    ],
    transaction,
  });

  const mappedRows = instances.map((instance, index) => {
    const row = getPlain(instance) || {};
    const sample = pickObject(row, ['sampel', 'Sampel']) || {};
    const fpplSampel = pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {};
    const jenisSampel = pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};

    return {
      no_sampel: row.no_sampel || sample.no_sampel || null,
      urutan_sampel: getSampleOrderValue(row, index),
      tanggal_pengambilan_sampel: sample.tanggal_pengambilan_sampel || null,
      diterima_pada: sample.diterima_pada || null,
      kondisi_sampel: sample.kondisi_sampel || null,
      abnormalitas_sampel: sample.abnormalitas_sampel || null,
      lokasi_spesifik: sample.lokasi_spesifik || null,
      koordinat: sample.koordinat || null,
      acuan_pengambilan_sampel: sample.acuan_pengambilan_sampel || null,
      jenis_sampel: jenisSampel.jenis_sampel || null,
    };
  });

  return sortRowsBySampleOrder(mappedRows);
}

async function getBmParamMapForPdf(idPktBm, transaction = null) {
  const id = String(idPktBm || '').trim();
  if (!id) return new Map();

  const rows = await PktBmParam.findAll({
    where: { id_pkt_bm: id },
    transaction,
  });

  const map = new Map();
  rows.map(getPlain).forEach((row) => {
    if (row?.id_parameter) map.set(String(row.id_parameter), row);
  });

  return map;
}

function buildResultRowForPdf(instance) {
  const row = getPlain(instance) || {};
  const lka = pickObject(row, ['lka', 'Lka']) || {};
  const penugasanDetail = pickObject(lka, ['penugasan_detail', 'PenugasanDetail']) || {};
  const parameterMetode = pickObject(penugasanDetail, ['parameter_metode', 'ParameterMetode']) || {};
  const parameter = pickObject(parameterMetode, ['parameter', 'Parameter']) || {};
  const metode = pickObject(parameterMetode, ['metode', 'Metode']) || {};

  return {
    kode_lka: row.kode_lka || lka.kode_lka || null,
    no_sampel: row.no_sampel || null,
    hasil: row.hasil || null,
    catatan_hasil: row.catatan_hasil || null,
    status_review_hasil: row.status_review_hasil || row.statusReviewHasil || null,
    statusReviewHasil: row.statusReviewHasil || row.status_review_hasil || null,
    id_parameter: parameterMetode.id_parameter || parameter.id_parameter || null,
    idParameter: parameterMetode.id_parameter || parameter.id_parameter || null,
    id_metode_parameter: penugasanDetail.id_metode_parameter || parameterMetode.id_metode_parameter || null,
    idMetodeParameter: penugasanDetail.id_metode_parameter || parameterMetode.id_metode_parameter || null,
    nama_parameter: parameter.nama_parameter || null,
    namaParameter: parameter.nama_parameter || null,
    nama_metode: metode.nama_metode || null,
    namaMetode: metode.nama_metode || null,
    acuan_metode: parameterMetode.acuan_metode || null,
    acuanMetode: parameterMetode.acuan_metode || null,
    is_terakreditasi: parameterMetode.is_terakreditasi ?? 0,
    isTerakreditasi: parameterMetode.is_terakreditasi ?? 0,
    is_subkontrak: parameterMetode.is_subkontrak ?? 0,
    isSubkontrak: parameterMetode.is_subkontrak ?? 0,
  };
}

async function getApprovedResultRowsForPdf(sampleNo, transaction = null) {
  const rows = await LkaHasil.findAll({
    where: {
      no_sampel: sampleNo,
      statusReviewHasil: 'Disetujui Kasi Pengujian',
    },
    include: [
      {
        model: Lka,
        required: true,
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
            ],
          },
        ],
      },
    ],
    transaction,
  });

  return rows
    .map(buildResultRowForPdf)
    .filter((row) => String(row.hasil || '').trim() && isResultApprovedByKasi(row));
}

function findApprovedResultForPdf(expected = {}, rows = []) {
  const expectedMethodKey = getParameterMethodKey(expected);
  const expectedParameterKey = getParameterKey(expected);

  return (Array.isArray(rows) ? rows : []).find((row) => {
    const rowMethodKey = getParameterMethodKey(row);
    if (expectedMethodKey && rowMethodKey && expectedMethodKey === rowMethodKey) return true;

    const rowParameterKey = getParameterKey(row);
    if (expectedParameterKey && rowParameterKey && expectedParameterKey === rowParameterKey) return true;

    return false;
  }) || null;
}

async function getLhuDetailRowsForPdf(nomorLhu, header = {}, sampleRows = [], transaction = null) {
  const [detailInstances, bmParamMap] = await Promise.all([
    DetailLhu.findAll({
      where: { nomor_lhu: nomorLhu },
      include: [
        {
          model: FpplParameterMetode,
          as: 'fppl_parameter_metode',
          required: false,
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
      order: [
        ['urutan_lhu', 'ASC'],
        ['id_fppl_parameter_metode', 'ASC'],
      ],
      transaction,
    }),
    getBmParamMapForPdf(header.id_pkt_bm, transaction),
  ]);

  const orderedSampleRows = sortRowsBySampleOrder(sampleRows);
  const sampleOrderMap = new Map();
  const resultRowsBySample = new Map();

  for (const [index, sample] of orderedSampleRows.entries()) {
    const sampleNo = String(sample.no_sampel || '').trim();
    if (!sampleNo) continue;
    sampleOrderMap.set(sampleNo, getSampleOrderValue(sample, index));
    resultRowsBySample.set(sampleNo, await getApprovedResultRowsForPdf(sampleNo, transaction));
  }

  const rows = [];

  detailInstances.forEach((instance) => {
    const detail = getPlain(instance) || {};
    const fpm = pickObject(detail, ['fppl_parameter_metode', 'FpplParameterMetode']) || {};
    const parameter = pickObject(fpm, ['parameter', 'Parameter']) || {};
    const parameterMetode = pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
    const metode = pickObject(parameterMetode, ['metode', 'Metode']) || {};

    const expected = {
      id_fppl_parameter_metode: detail.id_fppl_parameter_metode || fpm.id_fppl_parameter_metode || null,
      idFpplParameterMetode: detail.id_fppl_parameter_metode || fpm.id_fppl_parameter_metode || null,
      id_parameter: fpm.id_parameter || parameter.id_parameter || parameterMetode.id_parameter || null,
      idParameter: fpm.id_parameter || parameter.id_parameter || parameterMetode.id_parameter || null,
      id_metode_parameter: fpm.id_metode_parameter || parameterMetode.id_metode_parameter || null,
      idMetodeParameter: fpm.id_metode_parameter || parameterMetode.id_metode_parameter || null,
      nama_parameter: parameter.nama_parameter || '-',
      namaParameter: parameter.nama_parameter || '-',
      metode: metode.nama_metode || '-',
      nama_metode: metode.nama_metode || '-',
      namaMetode: metode.nama_metode || '-',
      acuan_metode: parameterMetode.acuan_metode || '-',
      acuanMetode: parameterMetode.acuan_metode || '-',
      is_terakreditasi: parameterMetode.is_terakreditasi ?? 0,
      isTerakreditasi: parameterMetode.is_terakreditasi ?? 0,
      is_insitu: fpm.is_insitu ?? 0,
      isInsitu: fpm.is_insitu ?? 0,
      is_subkontrak: parameterMetode.is_subkontrak ?? 0,
      isSubkontrak: parameterMetode.is_subkontrak ?? 0,
      urutan_lhu: detail.urutan_lhu || 1,
    };

    const bm = bmParamMap.get(String(expected.id_parameter || '')) || null;
    const nilaiBm = bm ? normalizeNilaiBmForLhu(bm.nilai_bm) : '(-)';
    const satuanBm = bm ? normalizeBmText(bm.satuan_bm) : null;
    const adaDiBm = bm ? toTinyIntFlag(bm.is_in_bm) : 0;

    orderedSampleRows.forEach((sample) => {
      const sampleNo = String(sample.no_sampel || '').trim();
      const result = findApprovedResultForPdf(
        { ...expected, no_sampel: sampleNo, noSampel: sampleNo },
        resultRowsBySample.get(sampleNo) || []
      );

      rows.push({
        nomor_lhu: nomorLhu,
        no_sampel: sampleNo,
        urutan_sampel: sampleOrderMap.get(sampleNo) || getSampleOrderValue(sample, 0),
        urutan_lhu: detail.urutan_lhu || 1,
        id_fppl_parameter_metode: expected.id_fppl_parameter_metode,
        id_metode_parameter: expected.id_metode_parameter,
        id_parameter: expected.id_parameter,
        nama_parameter_snapshot: expected.nama_parameter,
        metode_snapshot: expected.metode,
        acuan_metode_snapshot: expected.acuan_metode,
        hasil_snapshot: result?.hasil || null,
        is_terakreditasi: toTinyIntFlag(expected.is_terakreditasi),
        is_insitu_snapshot: toTinyIntFlag(expected.is_insitu),
        is_subkontrak_snapshot: getSubkontrakSnapshot(expected),
        bm_snapshot: nilaiBm,
        satuan_bm_snapshot: satuanBm,
        ada_di_bm_snapshot: adaDiBm,
        tanggal_sampling: sample.tanggal_pengambilan_sampel || null,
      });
    });
  });

  return rows.sort((a, b) =>
    Number(a.urutan_lhu || 0) - Number(b.urutan_lhu || 0) ||
    String(a.nama_parameter_snapshot || '').localeCompare(String(b.nama_parameter_snapshot || '')) ||
    Number(a.urutan_sampel || 0) - Number(b.urutan_sampel || 0) ||
    String(a.no_sampel || '').localeCompare(String(b.no_sampel || ''))
  );
}

async function getLhuPdfData(nomorLhu, transaction = null) {
  const header = await getLhuHeaderForPdf(nomorLhu, transaction);

  if (!header) {
    throw new Error('Data LHU tidak ditemukan untuk generate PDF.');
  }

  const sampleRows = await getLhuSampleRowsForPdf(nomorLhu, transaction);

  const [qc, kalab, details] = await Promise.all([
    getPegawaiSnapshot(header.qc_by, transaction),
    getPegawaiSnapshot(header.kalab_by, transaction),
    getLhuDetailRowsForPdf(nomorLhu, header, sampleRows, transaction),
  ]);

  const firstSample = sampleRows[0] || {};
  const sampleNoList = formatSampleNoList(sampleRows);
  const coordinateText = formatSampleFieldLines(
    sampleRows,
    (row) => row.koordinat,
    firstSample.koordinat || null,
    { repeatShared: false }
  );

  const lhu = {
    ...header,
    no_sampel: sampleNoList,
    sampleRows,
    sample_rows: sampleRows,
    jenis_sampel: normalizeSampleTypeForLhu(firstSample.jenis_sampel),
    jenisSampel: normalizeSampleTypeForLhu(firstSample.jenis_sampel),
    jenis_pengambilan_sampel: normalizeSampleCollectorForLhu(header.jenis_pengambilan_sampel),
    tanggal_pengambilan_sampel: firstSample.tanggal_pengambilan_sampel || null,
    tanggal_penerimaan: firstSample.diterima_pada || null,
    jam_penerimaan: firstSample.diterima_pada ? new Date(firstSample.diterima_pada).toTimeString().slice(0, 8) : null,
    tanggal_sampling: firstSample.tanggal_pengambilan_sampel || null,
    kondisi_sampel: firstSample.kondisi_sampel || null,
    abnormalitas_sampel: formatSampleFieldLines(
      sampleRows,
      (row) => row.abnormalitas_sampel,
      firstSample.abnormalitas_sampel || null
    ),
    lokasi_spesifik: formatSampleFieldLines(
      sampleRows,
      (row) => row.lokasi_spesifik || header.lokasi_pengambilan_sampel,
      firstSample.lokasi_spesifik || header.lokasi_pengambilan_sampel || null
    ),
    lokasi_pengambilan_sampel: formatSampleFieldLines(
      sampleRows,
      (row) => row.lokasi_spesifik || header.lokasi_pengambilan_sampel,
      firstSample.lokasi_spesifik || header.lokasi_pengambilan_sampel || null
    ),
    koordinat: coordinateText,
    acuan_pengambilan_sampel: formatSampleFieldLines(
      sampleRows,
      (row) => row.acuan_pengambilan_sampel,
      firstSample.acuan_pengambilan_sampel || null
    ),
    standar_lhu: header.teks_lhu || [header.reg_bm_instansi, header.ref_reg].filter(Boolean).join(' - ') || null,
    qc_nama: qc.nama_pegawai,
    qc_nip: qc.nip,
    kalab_nama: kalab.nama_pegawai,
    kalab_nip: kalab.nip,
  };

  return { lhu, details };
}

module.exports = {
  getLhuPdfData,
};
