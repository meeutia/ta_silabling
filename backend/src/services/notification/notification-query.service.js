const { Op } = require('sequelize');

const {
  Fppl,
  FpplSampel,
  JenisSampel,
  Lhu,
  Lka,
  LkaHasil,
  Metode,
  Parameter,
  ParameterMetode,
  Pelanggan,
  Pegawai,
  Penugasan,
  PenugasanDetail,
  PenugasanItem,
  Sampel,
  User,
} = require('../../models/Associations');
const { NOTIFICATION_TYPE } = require('../../constants/notification.constant');
const RequestStatus = require('../../constants/request-status');
const { LHU_STATUS } = require('../../constants/lhu-status.constant');
const { safeString } = require('./notification-format.util');
const {
  findNotificationTypeById,
  getPlain,
  pickArray,
  pickObject,
} = require('./notification-core.service');

async function getSampleNotificationContext(noSampel) {
  const sampleNo = safeString(noSampel).trim();

  if (!sampleNo) {
    const err = new Error('Nomor sampel wajib dikirim.');
    err.statusCode = 400;
    throw err;
  }

  const instance = await Sampel.findOne({
    where: { no_sampel: sampleNo },
    include: [
      {
        model: FpplSampel,
        as: 'fppl_sampel',
        required: false,
        include: [
          { model: JenisSampel, required: false },
          {
            model: Fppl,
            as: 'fppl',
            required: false,
            include: [{ model: Pelanggan, as: 'pelanggan', required: false }],
          },
        ],
      },
      { model: Lhu, as: 'lhus', required: false, through: { attributes: [] } },
    ],
  });

  if (!instance) {
    const err = new Error('Sampel tidak ditemukan untuk notifikasi.');
    err.statusCode = 404;
    throw err;
  }

  const sample = getPlain(instance) || {};
  const fpplSampel = pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {};
  const jenis = pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
  const fppl = pickObject(fpplSampel, ['fppl', 'Fppl']) || {};
  const pelanggan = pickObject(fppl, ['pelanggan', 'Pelanggan']) || {};
  const lhu = pickObject(sample, ['lhu', 'Lhu']) || {};

  return { sample, fpplSampel, jenis, fppl, pelanggan, lhu };
}

async function getRequestLhuCompletionContext(nomorLhu) {
  const lhuNo = safeString(nomorLhu).trim();

  const lhuInstance = await Lhu.findOne({
    where: { nomor_lhu: lhuNo },
    include: [
      {
        model: Sampel,
        as: 'sampels',
        required: true,
        through: { attributes: [] },
        include: [
          {
            model: FpplSampel,
            as: 'fppl_sampel',
            required: true,
            include: [
              {
                model: Fppl,
                as: 'fppl',
                required: true,
                include: [{ model: Pelanggan, as: 'pelanggan', required: false }],
              },
            ],
          },
        ],
      },
    ],
  });

  if (!lhuInstance) {
    const err = new Error('LHU tidak ditemukan untuk cek kelengkapan permohonan.');
    err.statusCode = 404;
    throw err;
  }

  const currentLhu = getPlain(lhuInstance) || {};
  const currentSamples = currentLhu.sampels || currentLhu.Sampels || [];
  const currentSample = Array.isArray(currentSamples) ? currentSamples[0] || {} : {};
  const currentFpplSampel = currentSample.fppl_sampel || currentSample.FpplSampel || {};
  const fppl = currentFpplSampel.fppl || currentFpplSampel.Fppl || {};
  const pelanggan = fppl.pelanggan || fppl.Pelanggan || {};
  const idRegistrasi = fppl.id_registrasi || currentFpplSampel.id_registrasi || null;

  if (!idRegistrasi) {
    const err = new Error('ID registrasi permohonan tidak ditemukan untuk cek kelengkapan LHU.');
    err.statusCode = 400;
    throw err;
  }

  const sampleInstances = await Sampel.findAll({
    include: [
      {
        model: FpplSampel,
        as: 'fppl_sampel',
        required: true,
        where: { id_registrasi: idRegistrasi },
      },
      {
        model: Lhu,
        as: 'lhus',
        required: false,
        through: { attributes: [] },
      },
    ],
    order: [['no_sampel', 'ASC']],
  });

  const samples = sampleInstances.map((row) => getPlain(row) || {});

  const incompleteSamples = samples.filter((sample) => {
    const lhus = sample.lhus || sample.Lhus || [];
    const approvedFinalLhu = Array.isArray(lhus)
      ? lhus.find((lhu) => lhu && lhu.status_lhu === LHU_STATUS.APPROVED_FINAL)
      : null;

    return !approvedFinalLhu;
  });

  const lhuRowsMap = new Map();

  samples.forEach((sample) => {
    const lhus = sample.lhus || sample.Lhus || [];

    if (!Array.isArray(lhus)) return;

    lhus.forEach((lhu) => {
      if (!lhu || lhu.status_lhu !== LHU_STATUS.APPROVED_FINAL) return;

      const key = lhu.nomor_lhu || lhu.id_lhu;
      if (!key) return;

      if (!lhuRowsMap.has(key)) {
        lhuRowsMap.set(key, {
          ...lhu,
          sampels: [],
        });
      }

      const current = lhuRowsMap.get(key);
      current.sampels.push({
        no_sampel: sample.no_sampel,
        status_sample: sample.status_sample,
      });
    });
  });

  const lhuRows = Array.from(lhuRowsMap.values()).sort((a, b) =>
    safeString(a.nomor_lhu).localeCompare(safeString(b.nomor_lhu))
  );

  return {
    isComplete: samples.length > 0 && incompleteSamples.length === 0,
    idRegistrasi,
    fppl,
    pelanggan,
    totalSamples: samples.length,
    incompleteSamples,
    lhuRows,
  };
}

async function getPenugasanSampleNos(idPenugasan) {
  const details = await PenugasanDetail.findAll({
    where: { id_penugasan: idPenugasan },
    attributes: ['id_penugasan_detail'],
    include: [
      {
        model: PenugasanItem,
        required: false,
        attributes: ['no_sampel'],
      },
    ],
  });

  const rows = details.map(getPlain);

  const sampleNos = rows
    .flatMap((detail) => {
      const items = pickArray(detail, [
        'penugasan_items',
        'PenugasanItems',
        'penugasan_item',
        'PenugasanItem',
      ]);

      return items.map((item) => item.no_sampel).filter(Boolean);
    })
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return Array.from(new Set(sampleNos)).sort();
}

function getParameterMetodeInfoFromDetail(detail = {}) {
  const parameterMetode = pickObject(detail, ['parameter_metode', 'ParameterMetode']);
  const parameter =
    pickObject(parameterMetode, ['parameter', 'Parameter']) ||
    pickObject(detail, ['parameter', 'Parameter']);
  const metode =
    pickObject(parameterMetode, ['metode', 'Metode']) ||
    pickObject(detail, ['metode', 'Metode']);

  const namaParameter = safeString(
    parameter.nama_parameter ||
      parameter.namaParameter ||
      parameterMetode.nama_parameter ||
      parameterMetode.namaParameter ||
      detail.nama_parameter ||
      detail.namaParameter ||
      '-'
  ).trim() || '-';

  const namaMetode = safeString(
    metode.nama_metode ||
      metode.namaMetode ||
      parameterMetode.nama_metode ||
      parameterMetode.namaMetode ||
      parameterMetode.acuan_metode ||
      parameterMetode.acuanMetode ||
      detail.nama_metode ||
      detail.namaMetode ||
      '-'
  ).trim() || '-';

  return {
    label: `${namaParameter} — ${namaMetode}`,
    namaParameter,
    namaMetode,
  };
}

async function getPenugasanParameterMethodGroups(idPenugasan) {
  const details = await PenugasanDetail.findAll({
    where: { id_penugasan: idPenugasan },
    attributes: ['id_penugasan_detail', 'id_metode_parameter'],
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
        model: PenugasanItem,
        required: false,
        attributes: ['no_sampel'],
      },
    ],
    order: [['id_penugasan_detail', 'ASC']],
  });

  const grouped = new Map();

  details.map(getPlain).forEach((detail) => {
    const { label, namaParameter, namaMetode } = getParameterMetodeInfoFromDetail(detail);
    const items = pickArray(detail, [
      'penugasan_items',
      'PenugasanItems',
      'penugasan_item',
      'PenugasanItem',
    ]);
    const sampleNos = Array.from(new Set(
      items
        .map((item) => safeString(item.no_sampel).trim())
        .filter(Boolean)
    )).sort();

    if (!sampleNos.length) return;

    if (!grouped.has(label)) {
      grouped.set(label, {
        parameter: namaParameter,
        metode: namaMetode,
        label,
        samples: [],
      });
    }

    const current = grouped.get(label);
    sampleNos.forEach((noSampel) => {
      if (!current.samples.includes(noSampel)) current.samples.push(noSampel);
    });
  });

  return Array.from(grouped.values()).map((group) => ({
    ...group,
    samples: group.samples.sort(),
  }));
}

async function getActiveUsersByRole(roleId) {
  const rows = await User.findAll({
    where: {
      id_role: roleId,
      is_active: 1,
    },
    include: [
      {
        model: Pegawai,
        required: false,
      },
    ],
    order: [['username', 'ASC']],
  });

  return rows.map((row) => {
    const user = getPlain(row) || {};
    const pegawai = user.pegawai || user.Pegawai || {};

    return {
      ...user,
      nama_pegawai: pegawai.nama_pegawai || user.nama_pegawai || null,
      no_wa: pegawai.no_wa || user.no_wa || null,
    };
  });
}

async function getRequestWithCustomerAndSamples(idRegistrasi) {
  const registrasiId = safeString(idRegistrasi).trim();

  if (!registrasiId) {
    const err = new Error('ID registrasi wajib dikirim.');
    err.statusCode = 400;
    throw err;
  }

  const requestInstance = await Fppl.findOne({
    where: { id_registrasi: registrasiId },
    include: [
      {
        model: Pelanggan,
        as: 'pelanggan',
        required: false,
      },
      {
        model: FpplSampel,
        as: 'fppl_sampels',
        required: false,
        include: [
          {
            model: JenisSampel,
            required: false,
          },
          {
            model: Sampel,
            as: 'sampels',
            required: false,
            attributes: ['no_sampel', 'diterima_pada', 'status_sample'],
          },
        ],
      },
    ],
  });

  if (!requestInstance) {
    const err = new Error('Permohonan tidak ditemukan.');
    err.statusCode = 404;
    throw err;
  }

  const request = getPlain(requestInstance);
  const pelanggan = request.pelanggan || request.Pelanggan || {};
  const fpplSampels = request.fppl_sampels || request.FpplSampels || [];
  const sampleSummary = fpplSampels.map((row) => {
    const jenis = row.jenis_sampel || row.JenisSampel || {};
    return {
      id_fppl_sampel: row.id_fppl_sampel,
      jenis_sampel: jenis.jenis_sampel || row.jenis_sampel || row.jenisSampel || row.nama_jenis_sampel || row.id_jenis_sampel,
      jumlah_sampel: row.jumlah_sampel || row.jumlahSampel || 1,
    };
  });
  const samples = fpplSampels.flatMap((row) => {
    const rows = row.sampels || row.Sampels || [];
    return Array.isArray(rows)
      ? rows.map((sample) => ({
          ...sample,
          jenis_sampel: (row.jenis_sampel || row.JenisSampel || {}).jenis_sampel || row.jenisSampel || row.id_jenis_sampel || null,
        }))
      : [];
  });

  return { request, pelanggan, sampleSummary, samples };
}

async function getRequestAndCustomer(idRegistrasi) {
  const registrasiId = safeString(idRegistrasi).trim();

  if (!registrasiId) {
    const err = new Error('ID registrasi wajib dikirim.');
    err.statusCode = 400;
    throw err;
  }

  const requestInstance = await Fppl.findOne({
    where: { id_registrasi: registrasiId },
    include: [
      {
        model: Pelanggan,
        as: 'pelanggan',
        required: false,
      },
    ],
  });

  if (!requestInstance) {
    const err = new Error('Permohonan tidak ditemukan.');
    err.statusCode = 404;
    throw err;
  }

  const request = getPlain(requestInstance);
  const pelanggan = request.pelanggan || request.Pelanggan || {};
  const pelangganId = request.id_pelanggan || pelanggan.id_pelanggan;

  if (!pelangganId) {
    const err = new Error('Pelanggan penerima notifikasi tidak valid.');
    err.statusCode = 400;
    throw err;
  }

  return { request, pelanggan, pelangganId };
}

async function findNotificationTypeByIdOrNull(idTipeNotifikasi) {
  try {
    return await findNotificationTypeById(idTipeNotifikasi);
  } catch {
    return null;
  }
}

async function resolveRequestStatusNotificationType(statusFppl) {
  const status = safeString(statusFppl).trim();

  if (status === RequestStatus.WAITING_PARAMETER) {
    return findNotificationTypeById(NOTIFICATION_TYPE.PERMOHONAN_DITERIMA);
  }

  if ([RequestStatus.REJECTED, RequestStatus.REJECTED_BY_ADMIN, RequestStatus.REJECTED_BY_KASI, RequestStatus.REJECTED_BY_PENYELIA, RequestStatus.CANCELLED_BY_CUSTOMER].includes(status)) {
    return findNotificationTypeById(NOTIFICATION_TYPE.PERMOHONAN_DITOLAK);
  }

  if (status === RequestStatus.TESTING_PROCESS) {
    return (
      await findNotificationTypeByIdOrNull(NOTIFICATION_TYPE.PERMOHONAN_DIPROSES)
    ) || findNotificationTypeByIdOrNull(NOTIFICATION_TYPE.MENUNGGU_SAMPEL);
  }

  return null;
}

function normalizeIdList(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)));
  }
  if (typeof value === 'string') {
    return Array.from(new Set(value.split(',').map((item) => item.trim()).filter(Boolean)));
  }
  if (value === null || value === undefined) return [];
  const single = String(value || '').trim();
  return single ? [single] : [];
}

async function findRevisionTargetsBySample(noSampel, idPenugasanDetailList = []) {
  const sampleNo = safeString(noSampel).trim();
  const selectedIds = normalizeIdList(idPenugasanDetailList);

  if (!sampleNo) {
    const err = new Error('Nomor sampel wajib dikirim untuk notifikasi revisi.');
    err.statusCode = 400;
    throw err;
  }

  if (!selectedIds.length) {
    const err = new Error('Pilih minimal satu parameter/metode yang perlu direvisi.');
    err.statusCode = 400;
    throw err;
  }

  const rows = await LkaHasil.findAll({
    where: { no_sampel: sampleNo },
    include: [
      {
        model: Lka,
        required: true,
        include: [
          {
            model: PenugasanDetail,
            required: true,
            where: { id_penugasan_detail: { [Op.in]: selectedIds } },
            include: [
              {
                model: Penugasan,
                required: true,
                include: [
                  {
                    model: User,
                    as: 'Analis',
                    required: false,
                    attributes: ['nik', 'username', 'email'],
                  },
                ],
              },
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
  });

  const map = new Map();

  rows.map(getPlain).forEach((row) => {
    const lka = row.lka || row.Lka || {};
    const detail = lka.penugasan_detail || lka.PenugasanDetail || {};
    const penugasan = detail.penugasan || detail.Penugasan || {};
    const analis = penugasan.Analis || penugasan.analis || {};
    const parameterMetode = detail.parameter_metode || detail.ParameterMetode || {};
    const parameter = parameterMetode.parameter || parameterMetode.Parameter || {};
    const metode = parameterMetode.metode || parameterMetode.Metode || {};

    const idPenugasan = penugasan.id_penugasan;
    const nikAnalis = penugasan.id_user_analis;

    if (!idPenugasan || !nikAnalis) return;

    if (!map.has(idPenugasan)) {
      map.set(idPenugasan, {
        id_penugasan: idPenugasan,
        penerima_user_nik: nikAnalis,
        analis,
        items: [],
      });
    }

    map.get(idPenugasan).items.push({
      id_penugasan_detail: detail.id_penugasan_detail,
      nama_parameter: parameter.nama_parameter || parameterMetode.nama_parameter || '-',
      acuan_metode: parameterMetode.acuan_metode || metode.nama_metode || '-',
    });
  });

  return Array.from(map.values());
}

module.exports = {
  findRevisionTargetsBySample,
  getActiveUsersByRole,
  getPenugasanParameterMethodGroups,
  getPenugasanSampleNos,
  getRequestAndCustomer,
  getRequestLhuCompletionContext,
  getRequestWithCustomerAndSamples,
  getSampleNotificationContext,
  resolveRequestStatusNotificationType,
};
