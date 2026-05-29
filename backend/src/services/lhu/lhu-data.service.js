const { Op } = require('sequelize');
const {
  User,
  Pegawai,
  Role,
  Pelanggan,
  Fppl,
  JadwalSampel,
  FpplSampel,
  JenisSampel,
  RegBm,
  PktBm,
  PktBmParam,
  PktBmPm,
  Parameter,
  Metode,
  ParameterMetode,
  FpplParameterMetode,
  Sampel,
  SampelParameter,
  PenugasanItem,
  PenugasanDetail,
  Lka,
  LkaHasil,
  Lhu,
  LhuSampel,
  DetailLhu,
} = require('../../models/Associations');
const { buildLkaHasilRevisionResponse } = require('../assignment/assignment-revision.helper');
const {
  calculateAccreditationStats,
  getPlain,
  pickObject,
  pickArray,
  getAssociatedFpmsFromSample,
  getMethodIdFromFpm,
  getMethodIdFromDetail,
  firstDate,
  toDateOnly,
  buildAcuanBmSnapshot,
  getLkaHasilTargetKey,
  getFpplParameterMetodeKey,
  getParameterMethodKey,
  getFallbackParameterKey,
  applyDetailOrder,
  toTinyIntFlag,
  getSubkontrakSnapshot,
  getLkaHasilReviewStatus,
  isResultApprovedByKasi,
  getScheduleCreatedTime,
  getScheduleDateTime,
  getScheduleIdOrder,
  getActiveJadwalFromFppl,
} = require('./lhu-data-utils');
const {
  findApprovedResultForExpectedParameter,
  groupLhuDetailRowsByParameter,
  normalizeBmText,
  normalizeNilaiBmForLhu,
} = require('./lhu-detail-row.mapper');
const {
  isEditableByQcStatus,
  buildStandarLabel,
  mapSamplePayload,
  mapPelangganPayload,
  mapRequestPayload,
  buildDefaultDetailRows,
  buildDetailLhuCreateRow,
  getPegawaiDisplayName,
  getPktBmHeaderById,
  countDetailStats,
  mapLhuHeaderPayload,
} = require('./lhu-payload.mapper');

async function getExistingLhuBySample(noSampel, transaction = null) {
  const sampleNo = String(noSampel || '').trim();
  if (!sampleNo) return null;

  const instance = await Lhu.findOne({
    include: [
      {
        model: LhuSampel,
        as: 'lhu_sampels',
        required: true,
        where: { no_sampel: sampleNo },
        attributes: [],
      },
    ],
    order: [
      ['created_at', 'DESC'],
      ['nomor_lhu', 'DESC'],
    ],
    transaction,
  });

  return getPlain(instance);
}

async function getSampleInfo(noSampel, transaction = null) {
  const sampleInstance = await Sampel.findOne({
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
            required: true,
            include: [
              { model: Pelanggan, as: 'pelanggan', required: true },
              { model: JadwalSampel, as: 'jadwal_sampels', required: false },
            ],
          },
        ],
      },
    ],
    transaction,
  });

  if (!sampleInstance) {
    throw new Error('Sampel tidak ditemukan.');
  }

  const sample = getPlain(sampleInstance);
  const fpplSampel = pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {};
  const jenis = pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
  const regBm = pickObject(fpplSampel, ['reg_bm', 'RegBm']) || {};
  const fppl = pickObject(fpplSampel, ['fppl', 'Fppl']) || {};
  const pelanggan = pickObject(fppl, ['pelanggan', 'Pelanggan']) || {};
  const jadwal = getActiveJadwalFromFppl(fppl);

  return {
    no_sampel: sample.no_sampel,

    tanggal_pengambilan_sampel:
      sample.tanggal_pengambilan ||
      sample.tanggal_pengambilan_sampel ||
      null,
    tanggal_jadwal: jadwal?.tanggal_jadwal || null,
    jam_jadwal: jadwal?.jam_jadwal || null,

    diterima_pada: sample.diterima_pada || null,
    tanggal_penerimaan: sample.diterima_pada || null,
    jam_penerimaan: sample.diterima_pada ? new Date(sample.diterima_pada).toTimeString().slice(0, 8) : null,
    kondisi_sampel: sample.kondisi_sampel || null,
    abnormalitas_sampel: sample.abnormalitas_sampel || null,
    acuan_pengambilan_sampel: sample.acuan_pengambilan_sampel || null,
    lokasi_spesifik: sample.lokasi_spesifik || null,
    lokasi_pengambilan_sampel: sample.lokasi_spesifik || fppl.lokasi_pengambilan_sampel || null,
    koordinat: sample.koordinat || null,
    status_sample: sample.status_sample || null,

    id_fppl_sampel: fpplSampel.id_fppl_sampel || sample.id_fppl_sampel || null,
    id_registrasi: fpplSampel.id_registrasi || null,
    id_jenis_sampel: fpplSampel.id_jenis_sampel || null,
    id_reg_bm: fpplSampel.id_reg_bm || null,
    jumlah_sampel: fpplSampel.jumlah_sampel || null,

    jenis_sampel: jenis.jenis_sampel || null,
    jenisSampel: jenis.jenis_sampel || null,

    reg_bm_instansi: regBm.instansi || null,
    ref_reg: regBm.ref_reg || null,

    nomor_fppl: fppl.nomor_fppl || null,
    tanggal_pendaftaran: fppl.tanggal_pendaftaran || null,
    maksud_pengujian: fppl.maksud_pengujian || null,
    lokasi_pengambilan_permohonan: fppl.lokasi_pengambilan_sampel || null,
    jenis_pengambilan_sampel: fppl.jenis_pengambilan_sampel || null,
    tanggal_rencana_pengambilan_sampel: fppl.tanggal_rencana_pengambilan_sampel || null,
    jam_rencana_pengambilan_sampel: fppl.jam_rencana_pengambilan_sampel || null,
    tanggal_rencana_pengantaran_sampel: fppl.tanggal_rencana_pengantaran_sampel || null,
    status_fppl: fppl.status_fppl || null,

    id_pelanggan: pelanggan.id_pelanggan || null,
    nama_pelanggan: pelanggan.nama_instansi || null,
    nama_instansi: pelanggan.nama_instansi || null,
    alamat_pelanggan: pelanggan.alamat || null,
    alamat: pelanggan.alamat || null,
    pic_pelanggan: pelanggan.pic || null,
    pic: pelanggan.pic || null,
    telp_pelanggan: pelanggan.no_telp || null,
    no_telp: pelanggan.no_telp || null,
    email_pelanggan: pelanggan.email_kontak || null,
    email_kontak: pelanggan.email_kontak || null,
  };
}

function resolvePersonelDihubungiPic(sample = {}, payloadValue = null) {
  const pic =
    sample.pic_pelanggan ||
    sample.pic ||
    payloadValue ||
    null;

  const value = String(pic || '').trim();
  return value || null;
}

async function getPersonelOptions() {
  const rows = await Pegawai.findAll({
    where: {
      nik: {
        [Op.ne]: null,
      },
    },
    include: [
      {
        model: User,
        required: false,
        include: [{ model: Role, required: false }],
      },
    ],
    order: [['nama_pegawai', 'ASC']],
  });

  return rows.map((instance) => {
    const row = getPlain(instance);
    const user = pickObject(row, ['user', 'User']) || {};
    const role = pickObject(user, ['role', 'Role']) || {};

    return {
      id_pegawai: row.id_pegawai,
      nik: row.nik,
      nip: row.nip,
      nama_pegawai: row.nama_pegawai,
      username: user.username || row.nama_pegawai,
      no_wa: row.no_wa,
      nama_role: role.nama_role || null,
      is_pcc: Number(row.is_pcc || 0),
    };
  });
}

// Legacy single-sample implementation of getPaketBmOptions removed.
// The active implementation below supports multi-sample LHU finalization.


function dedupeLkaResultRows(rows = []) {
  const map = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row, index) => {
    const key = String(
      row.id_fppl_parameter_metode ||
        row.idFpplParameterMetode ||
        row.id_metode_parameter ||
        row.idMetodeParameter ||
        row.id_parameter ||
        row.idParameter ||
        getLkaHasilTargetKey(row) ||
        `row-${index}`
    ).trim();

    if (!key) return;

    const current = map.get(key);

    if (!current) {
      map.set(key, row);
      return;
    }

    const currentId =
      Number(String(current.kode_lka || current.kodeLka || getLkaHasilTargetKey(current) || '').replace(/\D/g, '')) || 0;

    const nextId =
      Number(String(row.kode_lka || row.kodeLka || getLkaHasilTargetKey(row) || '').replace(/\D/g, '')) || 0;

    if (nextId >= currentId) {
      map.set(key, row);
    }
  });

  return Array.from(map.values());
}

async function getLkaResultRows(noSampel, transaction = null) {
  const expectedRows = await getExpectedParameterRows(noSampel, transaction);

  const expectedByFpmId = new Map(
    expectedRows
      .filter((row) => row.id_fppl_parameter_metode)
      .map((row) => [String(row.id_fppl_parameter_metode), row])
  );

  const expectedByMethodId = new Map();

  expectedRows.forEach((row) => {
    if (!row.id_metode_parameter) return;

    const key = String(row.id_metode_parameter);

    if (!expectedByMethodId.has(key)) {
      expectedByMethodId.set(key, row);
    }
  });

  const rows = await LkaHasil.findAll({
    where: { no_sampel: noSampel },
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

  const mappedRows = rows
    .map((instance) => {
      const row = getPlain(instance);
      const lka = pickObject(row, ['lka', 'Lka']) || {};
      const detail =
        pickObject(lka, ['penugasan_detail', 'PenugasanDetail']) || {};

      const directParameterMetode =
        pickObject(detail, ['parameter_metode', 'ParameterMetode']) || {};

      const detailFpm =
        pickObject(detail, ['fppl_parameter_metode', 'FpplParameterMetode']) || {};

      const detailMethodId = getMethodIdFromDetail(detail);

      const expectedByMethod = detailMethodId
        ? expectedByMethodId.get(String(detailMethodId))
        : null;

      const expectedByFpm = detail.id_fppl_parameter_metode
        ? expectedByFpmId.get(String(detail.id_fppl_parameter_metode))
        : null;

      const expected = expectedByMethod || expectedByFpm || null;

      const fpmParameter = pickObject(detailFpm, ['parameter', 'Parameter']) || {};
      const fpmParameterMetode =
        pickObject(detailFpm, ['parameter_metode', 'ParameterMetode']) || {};
      const fpmMetode = pickObject(fpmParameterMetode, ['metode', 'Metode']) || {};

      const directParameter =
        pickObject(directParameterMetode, ['parameter', 'Parameter']) || {};
      const directMetode =
        pickObject(directParameterMetode, ['metode', 'Metode']) || {};

      return {
        kode_lka: row.kode_lka,
        no_sampel: row.no_sampel,
        hasil: row.hasil,
        catatan_hasil: row.catatan_hasil,
        status_review_hasil: getLkaHasilReviewStatus(row),
        statusReviewHasil: getLkaHasilReviewStatus(row),
        ...buildLkaHasilRevisionResponse(row),

        status_lka: lka.status_lka,
        tanggal_mulai_pengujian: lka.tanggal_mulai_pengujian,
        tanggal_selesai_pengujian: lka.tanggal_selesai_pengujian,

        id_penugasan_detail: detail.id_penugasan_detail,

        // ini tetap diisi dari FPM asli sampel kalau ada
        id_fppl_parameter_metode:
          expected?.id_fppl_parameter_metode ||
          detail.id_fppl_parameter_metode ||
          detailFpm.id_fppl_parameter_metode ||
          null,

        id_parameter:
          expected?.id_parameter ||
          detailFpm.id_parameter ||
          directParameter.id_parameter ||
          fpmParameter.id_parameter ||
          null,

        id_metode_parameter:
          expected?.id_metode_parameter ||
          detail.id_metode_parameter ||
          directParameterMetode.id_metode_parameter ||
          detailFpm.id_metode_parameter ||
          fpmParameterMetode.id_metode_parameter ||
          null,

        is_insitu:
          expected?.is_insitu ??
          detailFpm.is_insitu ??
          0,

        status_kemampuan_lab:
          expected?.status_kemampuan_lab ||
          detailFpm.status_kemampuan_lab ||
          null,

        is_subkontrak:
          expected?.is_subkontrak ??
          directParameterMetode.is_subkontrak ??
          fpmParameterMetode.is_subkontrak ??
          0,

        is_subkontrak_snapshot:
          directParameterMetode.is_subkontrak ??
          fpmParameterMetode.is_subkontrak ??
          expected?.is_subkontrak ??
          0,

        nama_parameter:
          expected?.nama_parameter ||
          directParameter.nama_parameter ||
          fpmParameter.nama_parameter ||
          '-',

        kategori_parameter:
          expected?.kategori_parameter ||
          directParameter.kategori_parameter ||
          fpmParameter.kategori_parameter ||
          null,

        acuan_metode:
          expected?.acuan_metode ||
          directParameterMetode.acuan_metode ||
          fpmParameterMetode.acuan_metode ||
          '-',

        is_terakreditasi:
          expected?.is_terakreditasi ??
          directParameterMetode.is_terakreditasi ??
          fpmParameterMetode.is_terakreditasi ??
          0,

        nama_metode:
          expected?.nama_metode ||
          directMetode.nama_metode ||
          fpmMetode.nama_metode ||
          '-',
      };
    })
    .filter((row) => row.kode_lka && row.no_sampel);

  return dedupeLkaResultRows(mappedRows).sort((a, b) =>
    String(a.nama_parameter || '').localeCompare(String(b.nama_parameter || ''))
  );
}

async function getExpectedParameterRows(noSampel, transaction = null) {
  const sample = await Sampel.findOne({
    where: { no_sampel: noSampel },
    include: [
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
            include: [{ model: Metode, required: false }],
          },
        ],
      },
    ],
    transaction,
  });

  if (!sample) return [];

  const plain = getPlain(sample);
  const fpms = getAssociatedFpmsFromSample(plain);

  return fpms
    .map((fpm) => {
      const parameter = pickObject(fpm, ['parameter', 'Parameter']) || {};
      const parameterMetode =
        pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
      const metode = pickObject(parameterMetode, ['metode', 'Metode']) || {};

      return {
        no_sampel: plain.no_sampel,

        id_fppl_parameter_metode: fpm.id_fppl_parameter_metode,
        id_parameter: fpm.id_parameter,
        id_metode_parameter:
          fpm.id_metode_parameter || parameterMetode.id_metode_parameter || null,

        is_insitu: fpm.is_insitu,
        status_kemampuan_lab: fpm.status_kemampuan_lab,

        is_subkontrak: parameterMetode.is_subkontrak ?? 0,

        is_subkontrak_snapshot: parameterMetode.is_subkontrak ?? 0,

        nama_parameter: parameter.nama_parameter,
        kategori_parameter: parameter.kategori_parameter,

        acuan_metode: parameterMetode.acuan_metode,
        is_terakreditasi: parameterMetode.is_terakreditasi,

        nama_metode: metode.nama_metode,
      };
    })
    .sort((a, b) =>
      String(a.nama_parameter || '').localeCompare(String(b.nama_parameter || ''))
    );
}

async function getBmInfo(idPktBm, transaction = null) {
  const pktInstance = await PktBm.findOne({
    where: {
      id_pkt_bm: idPktBm,
    },
    include: [
      { model: RegBm, required: false },
      { model: PktBmParam, required: false },
    ],
    transaction,
  });

  if (!pktInstance) {
    throw new Error('Paket baku mutu tidak ditemukan.');
  }

  const pkt = getPlain(pktInstance);
  const regBm = pickObject(pkt, ['reg_bm', 'RegBm']) || {};
  const paramRows = pickArray(pkt, ['pkt_bm_params', 'PktBmParams', 'pkt_bm_param', 'PktBmParam']);

  const header = {
    id_pkt_bm: pkt.id_pkt_bm,
    id_reg_bm: pkt.id_reg_bm,
    id_jenis_sampel: pkt.id_jenis_sampel,
    klasifikasi: pkt.klasifikasi,
    nama_pkt: pkt.nama_pkt,
    teks_lhu: pkt.teks_lhu,
    instansi: regBm.instansi,
    ref_reg: regBm.ref_reg,
  };

  const rows = paramRows
    .map((row) => ({
      ...header,
      id_pkt_bm_param: row.id_pkt_bm_param,
      id_parameter: row.id_parameter,
      nilai_bm: row.nilai_bm,
      satuan_bm: row.satuan_bm,
      ket_bm: row.ket_bm,
      is_in_bm: row.is_in_bm,
    }))
    .sort((a, b) =>
      String(a.id_parameter || '').localeCompare(String(b.id_parameter || ''))
    );

  const map = new Map();

  rows.forEach((row) => {
    if (row.id_parameter) {
      map.set(row.id_parameter, row);
    }
  });

  return {
    header,
    rows,
    map,
  };
}

async function getDetailLhuRows(nomorLhu, transaction = null) {
  const lhuInstance = await Lhu.findByPk(nomorLhu, {
    include: [
      {
        model: LhuSampel,
        as: 'lhu_sampels',
        required: false,
      },
    ],
    transaction,
  });

  if (!lhuInstance) return [];

  const lhu = getPlain(lhuInstance);
  const lhuSamples = pickArray(lhu, ['lhu_sampels', 'LhuSampels'])
    .slice()
    .sort((a, b) =>
      Number(a.urutan_sampel || a.urutanSampel || 0) - Number(b.urutan_sampel || b.urutanSampel || 0) ||
      String(a.no_sampel || a.noSampel || '').localeCompare(String(b.no_sampel || b.noSampel || ''))
    );

  const sampleNos = lhuSamples
    .map((row) => String(row.no_sampel || row.noSampel || '').trim())
    .filter(Boolean);

  if (!sampleNos.length) return [];

  const detailInstances = await DetailLhu.findAll({
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
  });

  if (!detailInstances.length) return [];

  const bmInfo = lhu.id_pkt_bm
    ? await getBmInfo(lhu.id_pkt_bm, transaction)
    : { map: new Map() };

  const resultRowsBySample = new Map();
  for (const sampleNo of sampleNos) {
    const rows = await getLkaResultRows(sampleNo, transaction);
    resultRowsBySample.set(
      sampleNo,
      rows.filter((row) => String(row.hasil || '').trim() && isResultApprovedByKasi(row))
    );
  }

  const rows = [];

  detailInstances.forEach((instance) => {
    const detail = getPlain(instance);
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

    const bm = bmInfo.map.get(expected.id_parameter) || null;
    const nilaiBm = normalizeNilaiBmForLhu(bm?.nilai_bm);
    const satuanBm = normalizeBmText(bm?.satuan_bm);
    const adaDiBm = bm ? toTinyIntFlag(bm.is_in_bm) : 0;

    sampleNos.forEach((sampleNo) => {
      const result = findApprovedResultForExpectedParameter(
        { ...expected, no_sampel: sampleNo, noSampel: sampleNo },
        resultRowsBySample.get(sampleNo) || []
      ) || {};

      rows.push({
        nomor_lhu: nomorLhu,
        nomorLhu,
        no_sampel: sampleNo,
        noSampel: sampleNo,
        kode_lka: result.kode_lka || result.kodeLka || null,
        kodeLka: result.kode_lka || result.kodeLka || null,
        id_fppl_parameter_metode: expected.id_fppl_parameter_metode,
        idFpplParameterMetode: expected.idFpplParameterMetode,
        id_parameter: expected.id_parameter,
        idParameter: expected.idParameter,
        id_metode_parameter: expected.id_metode_parameter,
        idMetodeParameter: expected.idMetodeParameter,
        nama_parameter: expected.nama_parameter,
        namaParameter: expected.namaParameter,
        nama_parameter_snapshot: expected.nama_parameter,
        namaParameterSnapshot: expected.namaParameter,
        kategori_parameter: expected.kategori_parameter,
        kategoriParameter: expected.kategoriParameter,
        metode: expected.nama_metode,
        nama_metode: expected.nama_metode,
        namaMetode: expected.namaMetode,
        metode_snapshot: expected.nama_metode,
        metodeSnapshot: expected.namaMetode,
        acuan_metode: expected.acuan_metode,
        acuanMetode: expected.acuanMetode,
        acuan_metode_snapshot: expected.acuan_metode,
        acuanMetodeSnapshot: expected.acuanMetode,
        hasil: result.hasil || null,
        hasil_snapshot: result.hasil || null,
        hasilSnapshot: result.hasil || null,
        catatan_hasil: result.catatan_hasil || result.catatanHasil || null,
        catatanHasil: result.catatan_hasil || result.catatanHasil || null,
        is_terakreditasi: toTinyIntFlag(expected.is_terakreditasi),
        isTerakreditasi: toTinyIntFlag(expected.isTerakreditasi),
        is_terakreditasi_snapshot: toTinyIntFlag(expected.is_terakreditasi),
        isTerakreditasiSnapshot: toTinyIntFlag(expected.isTerakreditasi),
        is_insitu: toTinyIntFlag(expected.is_insitu),
        isInsitu: toTinyIntFlag(expected.isInsitu),
        is_insitu_snapshot: toTinyIntFlag(expected.is_insitu),
        isInsituSnapshot: toTinyIntFlag(expected.isInsitu),
        is_subkontrak: getSubkontrakSnapshot(expected),
        isSubkontrak: getSubkontrakSnapshot(expected),
        is_subkontrak_snapshot: getSubkontrakSnapshot(expected),
        isSubkontrakSnapshot: getSubkontrakSnapshot(expected),
        bm: nilaiBm,
        nilai_bm: nilaiBm,
        nilaiBm,
        nilai_bm_pkt: nilaiBm,
        nilaiBmPkt: nilaiBm,
        satuan_bm: satuanBm,
        satuanBm,
        satuan_bm_pkt: satuanBm,
        satuanBmPkt: satuanBm,
        ada_di_bm: adaDiBm,
        adaDiBm,
        ada_di_bm_pkt: adaDiBm,
        adaDiBmPkt: adaDiBm,
        urutan_lhu: detail.urutan_lhu || 1,
        urutanLhu: detail.urutan_lhu || 1,
      });
    });
  });

  return groupLhuDetailRowsByParameter(rows);
}

async function getLhuSampleRows(nomorLhu, transaction = null) {
  const rows = await LhuSampel.findAll({
    where: { nomor_lhu: nomorLhu },
    order: [
      ['urutan_sampel', 'ASC'],
      ['no_sampel', 'ASC'],
    ],
    transaction,
  });

  return rows.map((instance) => getPlain(instance));
}

async function getFirstSampleInfoForLhu(nomorLhu, transaction = null) {
  const rows = await getLhuSampleRows(nomorLhu, transaction);
  const noSampel = rows?.[0]?.no_sampel;
  return noSampel ? getSampleInfo(noSampel, transaction) : null;
}
async function getSampleInfosForLhu(nomorLhu, transaction = null) {
  const rows = await getLhuSampleRows(nomorLhu, transaction);
  const sampleNos = (rows || []).map((row) => row.no_sampel).filter(Boolean);
  const sampleInfos = [];

  for (const noSampel of sampleNos) {
    sampleInfos.push(await getSampleInfo(noSampel, transaction));
  }

  return sampleInfos;
}

async function buildLhuListRow(lhu = {}) {
  const sampleInfos = await getSampleInfosForLhu(lhu.nomor_lhu);
  const sample = sampleInfos[0] || {};
  const samplePayloads = sampleInfos.map(mapSamplePayload);
  const sampleNos = sampleInfos.map((info) => info.no_sampel).filter(Boolean);
  const noSampelText = sampleNos.join('\n') || null;
  const joinUnique = (values = [], separator = ', ') => {
    const seen = new Set();
    const result = [];

    values.forEach((value) => {
      const text = String(value || '').trim();
      if (!text || seen.has(text.toLowerCase())) return;
      seen.add(text.toLowerCase());
      result.push(text);
    });

    return result.join(separator) || null;
  };

  const nomorFppl = joinUnique(sampleInfos.map((info) => info.nomor_fppl)) || sample.nomor_fppl || null;
  const jenisSampel = joinUnique(sampleInfos.map((info) => info.jenis_sampel)) || sample.jenis_sampel || null;
  const acuanPengambilan = joinUnique(sampleInfos.map((info) => info.acuan_pengambilan_sampel), '\n') || sample.acuan_pengambilan_sampel || null;
  const abnormalitas = joinUnique(sampleInfos.map((info) => info.abnormalitas_sampel), '\n') || sample.abnormalitas_sampel || null;
  const pktBm = await getPktBmHeaderById(lhu.id_pkt_bm);
  const details = await getDetailLhuRows(lhu.nomor_lhu);
  const stats = countDetailStats(details);
  const standarLabel = buildAcuanBmSnapshot(pktBm) || buildStandarLabel(sample);

  const [qcNama, kalabNama] = await Promise.all([
    getPegawaiDisplayName(lhu.qc_by),
    getPegawaiDisplayName(lhu.kalab_by),
  ]);

  return {
    nomorLhu: lhu.nomor_lhu,
    nomor_lhu: lhu.nomor_lhu,

    nomorFppl,
    nomor_fppl: nomorFppl,

    noSampel: noSampelText,
    no_sampel: noSampelText,
    sampleNos,
    sample_nos: sampleNos,
    daftarSampelFinalisasiQc: noSampelText,
    daftar_sampel_finalisasi_qc: noSampelText,
    totalSampelFinalisasiQc: sampleNos.length,
    total_sampel_finalisasi_qc: sampleNos.length,
    samples: samplePayloads,
    sampels: samplePayloads,

    idRegistrasi: sample.id_registrasi,
    id_registrasi: sample.id_registrasi,

    idPktBm: lhu.id_pkt_bm,
    id_pkt_bm: lhu.id_pkt_bm,

    jenisSampel,
    jenis_sampel: jenisSampel,

    namaPkt: pktBm.nama_pkt,
    nama_pkt: pktBm.nama_pkt,

    klasifikasi: pktBm.klasifikasi,
    teksLhu: pktBm.teks_lhu,
    teks_lhu: pktBm.teks_lhu,

    statusLhu: lhu.status_lhu,
    status_lhu: lhu.status_lhu,

    tanggalPenerbitan: lhu.tanggal_penerbitan,
    tanggal_penerbitan: lhu.tanggal_penerbitan,

    fileLhuPath: lhu.file_lhu_path,
    file_lhu_path: lhu.file_lhu_path,

    acuanPengambilanSampel: acuanPengambilan,
    acuan_pengambilan_sampel: acuanPengambilan,

    abnormalitasSampel: abnormalitas,
    abnormalitas_sampel: abnormalitas,

    regBm: standarLabel,
    reg_bm: standarLabel,
    standar: standarLabel,
    regBmInstansi: sample.reg_bm_instansi || pktBm.instansi || null,
    reg_bm_instansi: sample.reg_bm_instansi || pktBm.instansi || null,
    refReg: sample.ref_reg || pktBm.ref_reg || null,
    ref_reg: sample.ref_reg || pktBm.ref_reg || null,
    qcBy: lhu.qc_by,
    qc_by: lhu.qc_by,

    qcNama,
    qc_nama: qcNama,

    qcAt: lhu.qc_at,
    qc_at: lhu.qc_at,

    kalabBy: lhu.kalab_by,
    kalab_by: lhu.kalab_by,

    kalabNama,
    kalab_nama: kalabNama,

    kalabAt: lhu.kalab_at,
    kalab_at: lhu.kalab_at,

    ...stats,
  };
}

// Legacy single-sample implementation of getFinalizationQueue removed.
// The active implementation below supports multi-sample LHU finalization.

// Legacy single-sample implementation of getFinalizationDetail removed.
// The active implementation below supports multi-sample LHU finalization.

// Legacy single-sample implementation of previewFinalization removed.
// The active implementation below supports multi-sample LHU finalization.

// Legacy single-sample implementation of finalizeLhu removed.
// The active implementation below supports multi-sample LHU finalization.

module.exports = {
  calculateAccreditationStats,
  getPlain,
  pickObject,
  pickArray,
  getAssociatedFpmsFromSample,
  getMethodIdFromFpm,
  getMethodIdFromDetail,
  firstDate,
  toDateOnly,
  buildAcuanBmSnapshot,
  getLkaHasilTargetKey,
  getFpplParameterMetodeKey,
  getParameterMethodKey,
  getFallbackParameterKey,
  applyDetailOrder,
  toTinyIntFlag,
  getSubkontrakSnapshot,
  getLkaHasilReviewStatus,
  isResultApprovedByKasi,
  getScheduleCreatedTime,
  getScheduleDateTime,
  getScheduleIdOrder,
  getActiveJadwalFromFppl,
  getExistingLhuBySample,
  getSampleInfo,
  resolvePersonelDihubungiPic,
  getPersonelOptions,
  getLkaResultRows,
  getExpectedParameterRows,
  getBmInfo,
  getDetailLhuRows,
  isEditableByQcStatus,
  buildStandarLabel,
  mapSamplePayload,
  mapPelangganPayload,
  mapRequestPayload,
  buildDefaultDetailRows,
  buildDetailLhuCreateRow,
  getPegawaiDisplayName,
  getPktBmHeaderById,
  countDetailStats,
  mapLhuHeaderPayload,
  getLhuSampleRows,
  getFirstSampleInfoForLhu,
  getSampleInfosForLhu,
  buildLhuListRow,
};
