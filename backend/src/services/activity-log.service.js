const { Op } = require('sequelize');
const {
  AktivitasSistemLog,
  Fppl,
  Pelanggan,
  Invoice,
  Payment,
  JadwalSampel,
  JadwalPengambilanLhu,
  PengajuanPerubahanJadwal,
  Sampel,
  FpplSampel,
  Penugasan,
  PenugasanDetail,
  PenugasanItem,
  Lka,
  LkaRevisi,
  Lhu,
} = require('../models/Associations');
const { generateId } = require('../utils/id-generator');
const { WORKFLOW_SOURCE } = require('../constants/workflow-status.constant');

const normalizeNullable = (value) => {
  if (value === undefined || value === '') return null;
  return value;
};

const safeString = (value, maxLength = 50) => {
  if (value === null || value === undefined) return null;
  return String(value).slice(0, maxLength);
};

const ALLOWED_LOG_SOURCES = new Set(Object.values(WORKFLOW_SOURCE));

const normalizeLogSource = (value) => {
  const source = normalizeNullable(value) || WORKFLOW_SOURCE.SYSTEM;
  return ALLOWED_LOG_SOURCES.has(source) ? source : WORKFLOW_SOURCE.SYSTEM;
};

const isValidDateValue = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime());
};

const toDateOrNull = (value) => (isValidDateValue(value) ? new Date(value) : null);

const mapSourceByStatus = (status) => {
  if (status === 'Dibatalkan Pelanggan') return 'Pelanggan';
  if (status === 'Ditolak Admin') return 'Admin';
  if (status === 'Ditolak Kasi') return 'Kasi';
  if (status === 'Ditolak Penyelia') return 'Penyelia';
  return 'Sistem';
};

const mapActionByFpplStatus = (status) => {
  if (status === 'Dibatalkan Pelanggan') return 'MEMBATALKAN_PERMOHONAN_PELANGGAN';
  if (status === 'Ditolak Admin') return 'MENOLAK_PERMOHONAN_ADMIN';
  if (status === 'Ditolak Kasi') return 'MENOLAK_PERMOHONAN_KASI';
  if (status === 'Ditolak Penyelia') return 'MENOLAK_PERMOHONAN_PENYELIA';
  return 'MEMPERBARUI_STATUS_PERMOHONAN';
};

function plain(row) {
  return row ? row.get({ plain: true }) : null;
}

function plainRows(rows = []) {
  return rows.map(plain).filter(Boolean);
}

function tx(options = {}) {
  return options.transaction || undefined;
}

async function safeFindAll(label, finder) {
  try {
    return await finder();
  } catch (error) {
    console.warn(`[activity-log] Gagal membaca ${label}:`, error.message);
    return [];
  }
}

async function createActivityLog(payload = {}, options = {}) {
  const transaction = options.transaction || null;

  try {
    if (!payload.entityType || !payload.entityId || !payload.action) return null;

    const idLog = await generateId(
      AktivitasSistemLog,
      'id_aktivitas_log',
      'LOG-',
      transaction,
      9
    );

    const row = await AktivitasSistemLog.create(
      {
        id_aktivitas_log: idLog,
        entity_type: safeString(payload.entityType, 30),
        entity_id: safeString(payload.entityId, 30),
        aksi: safeString(payload.action, 50),
        status_sebelumnya: safeString(normalizeNullable(payload.statusBefore), 50),
        status_baru: safeString(normalizeNullable(payload.statusAfter), 50),
        sumber_aksi: normalizeLogSource(payload.source),
        catatan: normalizeNullable(payload.note),
        dibuat_oleh: safeString(normalizeNullable(payload.actorNik), 16),
        dibuat_pada: payload.createdAt || new Date(),
      },
      { transaction }
    );

    return row;
  } catch (error) {
    console.warn('[activity-log] Gagal menulis log aktivitas:', error.message);
    return null;
  }
}

async function createActivityLogIfMissing(payload = {}, options = {}) {
  const transaction = options.transaction || null;

  try {
    if (!payload.entityType || !payload.entityId || !payload.action) return null;

    const where = {
      entity_type: safeString(payload.entityType, 30),
      entity_id: safeString(payload.entityId, 30),
      aksi: safeString(payload.action, 50),
    };

    const existing = await AktivitasSistemLog.findOne({ where, transaction });
    if (existing) return existing;

    return createActivityLog(payload, { transaction });
  } catch (error) {
    console.warn('[activity-log] Gagal memastikan log aktivitas:', error.message);
    return null;
  }
}

async function logStatusChange({
  entityType = 'FPPL',
  entityId,
  action,
  statusBefore = null,
  statusAfter = null,
  source = 'Sistem',
  note = null,
  actorNik = null,
  createdAt = null,
  transaction = null,
}) {
  return createActivityLog(
    {
      entityType,
      entityId,
      action,
      statusBefore,
      statusAfter,
      source,
      note,
      actorNik,
      createdAt,
    },
    { transaction }
  );
}

async function getLogsForEntity(entityType, entityId, options = {}) {
  try {
    const rows = await AktivitasSistemLog.findAll({
      where: {
        entity_type: entityType,
        entity_id: String(entityId),
      },
      order: [
        ['dibuat_pada', 'ASC'],
        ['id_aktivitas_log', 'ASC'],
      ],
      transaction: tx(options),
    });

    return plainRows(rows);
  } catch (error) {
    console.warn('[activity-log] Gagal membaca log aktivitas:', error.message);
    return [];
  }
}

async function getFpplLogs(idRegistrasi, options = {}) {
  return getLogsForEntity('FPPL', idRegistrasi, options);
}

function addPair(pairs, entityType, entityId) {
  if (!entityId) return;
  const value = String(entityId);
  if (!pairs.some((row) => row.entity_type === entityType && row.entity_id === value)) {
    pairs.push({ entity_type: entityType, entity_id: value });
  }
}

function sampleRegistrationInclude(required = true) {
  return {
    model: Sampel,
    required,
    include: [
      {
        model: FpplSampel,
        as: 'fppl_sampel',
        required: true,
      },
    ],
  };
}

function penugasanDetailInclude(idRegistrasi) {
  return {
    model: PenugasanDetail,
    required: true,
    include: [
      {
        model: PenugasanItem,
        required: true,
        include: [
          {
            ...sampleRegistrationInclude(true),
            where: undefined,
            include: [
              {
                model: FpplSampel,
                as: 'fppl_sampel',
                required: true,
                where: { id_registrasi: idRegistrasi },
              },
            ],
          },
        ],
      },
    ],
  };
}

function lkaIncludeForRegistration(idRegistrasi) {
  return {
    model: Lka,
    as: 'lka',
    required: true,
    include: [penugasanDetailInclude(idRegistrasi)],
  };
}

async function getRequestTimelineEntityPairs(idRegistrasi, options = {}) {
  const pairs = [{ entity_type: 'FPPL', entity_id: String(idRegistrasi) }];

  const invoices = plainRows(await safeFindAll('invoice', () => Invoice.findAll({
    where: { id_registrasi: idRegistrasi },
    transaction: tx(options),
  })));
  invoices.forEach((row) => addPair(pairs, 'INVOICE', row.id_invoice));

  const payments = plainRows(await safeFindAll('payment', () => Payment.findAll({
    include: [{ model: Invoice, required: true, where: { id_registrasi: idRegistrasi } }],
    transaction: tx(options),
  })));
  payments.forEach((row) => addPair(pairs, 'PAYMENT', row.id_payment));

  const jadwalSampel = plainRows(await safeFindAll('jadwal sampel', () => JadwalSampel.findAll({
    where: { id_registrasi: idRegistrasi },
    transaction: tx(options),
  })));
  jadwalSampel.forEach((row) => addPair(pairs, 'JADWAL_SAMPEL', row.id_jadwal));

  const jadwalLhu = plainRows(await safeFindAll('jadwal LHU', () => JadwalPengambilanLhu.findAll({
    where: { id_registrasi: idRegistrasi },
    transaction: tx(options),
  })));
  jadwalLhu.forEach((row) => addPair(pairs, 'JADWAL_LHU', row.id_jadwal_lhu));

  const scheduleChanges = plainRows(await safeFindAll('pengajuan jadwal', () => PengajuanPerubahanJadwal.findAll({
    where: { id_registrasi: idRegistrasi },
    transaction: tx(options),
  })));
  scheduleChanges.forEach((row) => addPair(pairs, 'PENGAJUAN_JADWAL', row.id_pengajuan_jadwal));

  const samples = plainRows(await safeFindAll('sampel', () => Sampel.findAll({
    include: [{ model: FpplSampel, as: 'fppl_sampel', required: true, where: { id_registrasi: idRegistrasi } }],
    transaction: tx(options),
  })));
  samples.forEach((row) => addPair(pairs, 'SAMPEL', row.no_sampel));

  const assignments = plainRows(await safeFindAll('penugasan', () => Penugasan.findAll({
    include: [penugasanDetailInclude(idRegistrasi)],
    transaction: tx(options),
  })));
  assignments.forEach((row) => addPair(pairs, 'PENUGASAN', row.id_penugasan));

  const assignmentDetails = plainRows(await safeFindAll('detail penugasan', () => PenugasanDetail.findAll({
    include: [
      {
        model: PenugasanItem,
        required: true,
        include: [
          {
            model: Sampel,
            required: true,
            include: [{ model: FpplSampel, as: 'fppl_sampel', required: true, where: { id_registrasi: idRegistrasi } }],
          },
        ],
      },
    ],
    transaction: tx(options),
  })));
  assignmentDetails.forEach((row) => addPair(pairs, 'PENUGASAN_DETAIL', row.id_penugasan_detail));

  const lkas = plainRows(await safeFindAll('LKA', () => Lka.findAll({
    include: [penugasanDetailInclude(idRegistrasi)],
    transaction: tx(options),
  })));
  lkas.forEach((row) => addPair(pairs, 'LKA', row.kode_lka));

  const lkaRevisions = plainRows(await safeFindAll('revisi LKA', () => LkaRevisi.findAll({
    include: [lkaIncludeForRegistration(idRegistrasi)],
    transaction: tx(options),
  })));
  lkaRevisions.forEach((row) => addPair(pairs, 'LKA_REVISI', row.id_revisi_lka));

  const lhus = plainRows(await safeFindAll('LHU', () => Lhu.findAll({
    where: { id_registrasi: idRegistrasi },
    transaction: tx(options),
  })));
  lhus.forEach((row) => addPair(pairs, 'LHU', row.nomor_lhu));

  return pairs;
}

async function ensureRequestActivityLogs(idRegistrasi, options = {}) {
  const fppl = plain(await Fppl.findOne({
    where: { id_registrasi: idRegistrasi },
    include: [{ model: Pelanggan, as: 'pelanggan', required: false }],
    transaction: tx(options),
  }));
  if (!fppl) return;

  const pelanggan = fppl.pelanggan || fppl.Pelanggan || {};
  const customerNik = pelanggan.nik || null;

  await createActivityLogIfMissing({
    entityType: 'FPPL',
    entityId: idRegistrasi,
    action: 'MEMBUAT_PERMOHONAN',
    statusBefore: null,
    statusAfter: 'Menunggu Verifikasi',
    source: 'Pelanggan',
    note: 'Permohonan dibuat oleh pelanggan.',
    actorNik: customerNik,
    createdAt: toDateOrNull(fppl.tanggal_pendaftaran) || new Date(),
  }, options);

  if (fppl.status_fppl && fppl.status_fppl !== 'Menunggu Verifikasi') {
    await createActivityLogIfMissing({
      entityType: 'FPPL',
      entityId: idRegistrasi,
      action: mapActionByFpplStatus(fppl.status_fppl),
      statusBefore: 'Menunggu Verifikasi',
      statusAfter: fppl.status_fppl,
      source: mapSourceByStatus(fppl.status_fppl),
      note: fppl.catatan_penolakan || null,
      actorNik: fppl.diverifikasi_oleh || customerNik,
      createdAt: toDateOrNull(fppl.tanggal_verifikasi || fppl.tanggal_pendaftaran) || new Date(),
    }, options);
  }

  const invoiceRows = plainRows(await safeFindAll('invoice', () => Invoice.findAll({
    where: { id_registrasi: idRegistrasi },
    order: [['tanggal_invoice', 'ASC']],
    transaction: tx(options),
  })));
  for (const invoice of invoiceRows) {
    await createActivityLogIfMissing({
      entityType: 'INVOICE',
      entityId: invoice.id_invoice,
      action: 'MEMBUAT_INVOICE',
      statusBefore: null,
      statusAfter: invoice.status_invoice,
      source: 'Admin',
      note: 'Invoice diterbitkan.',
      actorNik: null,
      createdAt: toDateOrNull(invoice.tanggal_invoice) || new Date(),
    }, options);
  }

  const paymentRows = plainRows(await safeFindAll('payment', () => Payment.findAll({
    include: [{ model: Invoice, required: true, where: { id_registrasi: idRegistrasi } }],
    transaction: tx(options),
  })));
  for (const payment of paymentRows) {
    await createActivityLogIfMissing({
      entityType: 'PAYMENT',
      entityId: payment.id_payment,
      action: 'MEMBAYAR_INVOICE',
      statusBefore: null,
      statusAfter: payment.status_payment,
      source: 'Pelanggan',
      note: 'Pelanggan melakukan pembayaran.',
      actorNik: customerNik,
      createdAt: toDateOrNull(payment.tanggal_payment || payment.created_at) || new Date(),
    }, options);
  }

  const scheduleRows = plainRows(await safeFindAll('jadwal sampel', () => JadwalSampel.findAll({
    where: { id_registrasi: idRegistrasi },
    order: [['dibuat_pada', 'ASC']],
    transaction: tx(options),
  })));
  for (const schedule of scheduleRows) {
    await createActivityLogIfMissing({
      entityType: 'JADWAL_SAMPEL',
      entityId: schedule.id_jadwal,
      action: 'MEMBUAT_JADWAL_SAMPEL',
      statusBefore: null,
      statusAfter: schedule.status_jadwal,
      source: 'Admin',
      note: schedule.catatan_jadwal || 'Jadwal pengambilan sampel dibuat.',
      actorNik: schedule.dibuat_oleh,
      createdAt: toDateOrNull(schedule.dibuat_pada || schedule.tanggal_jadwal) || new Date(),
    }, options);
  }

  const scheduleChangeRows = plainRows(await safeFindAll('pengajuan perubahan jadwal', () => PengajuanPerubahanJadwal.findAll({
    where: { id_registrasi: idRegistrasi },
    order: [['diajukan_pada', 'ASC']],
    transaction: tx(options),
  })));
  for (const row of scheduleChangeRows) {
    await createActivityLogIfMissing({
      entityType: 'PENGAJUAN_JADWAL',
      entityId: row.id_pengajuan_jadwal,
      action: 'MENGAJUKAN_PERUBAHAN_JADWAL',
      statusBefore: null,
      statusAfter: row.status_pengajuan,
      source: 'Pelanggan',
      note: row.alasan_pengajuan,
      actorNik: customerNik,
      createdAt: toDateOrNull(row.diajukan_pada) || new Date(),
    }, options);

    if (row.status_pengajuan && row.status_pengajuan !== 'Menunggu Persetujuan Admin') {
      await createActivityLogIfMissing({
        entityType: 'PENGAJUAN_JADWAL',
        entityId: row.id_pengajuan_jadwal,
        action: 'MENINJAU_PERUBAHAN_JADWAL',
        statusBefore: 'Menunggu Persetujuan Admin',
        statusAfter: row.status_pengajuan,
        source: 'Admin',
        note: row.catatan_admin,
        actorNik: null,
        createdAt: toDateOrNull(row.updated_at || row.diajukan_pada) || new Date(),
      }, options);
    }
  }

  const sampleRows = plainRows(await safeFindAll('sampel', () => Sampel.findAll({
    include: [{ model: FpplSampel, as: 'fppl_sampel', required: true, where: { id_registrasi: idRegistrasi } }],
    transaction: tx(options),
  })));
  for (const sample of sampleRows) {
    await createActivityLogIfMissing({
      entityType: 'SAMPEL',
      entityId: sample.no_sampel,
      action: 'MENERIMA_SAMPEL',
      statusBefore: null,
      statusAfter: sample.status_sample,
      source: 'Admin',
      note: 'Sampel diterima oleh laboratorium.',
      actorNik: sample.diterima_oleh,
      createdAt: toDateOrNull(sample.diterima_pada) || new Date(),
    }, options);
  }

  const assignmentRows = plainRows(await safeFindAll('penugasan', () => Penugasan.findAll({
    include: [penugasanDetailInclude(idRegistrasi)],
    transaction: tx(options),
  })));
  for (const assignment of assignmentRows) {
    await createActivityLogIfMissing({
      entityType: 'PENUGASAN',
      entityId: assignment.id_penugasan,
      action: 'MEMBUAT_PENUGASAN',
      statusBefore: null,
      statusAfter: assignment.status_penugasan,
      source: 'Penyelia',
      note: assignment.catatan_penugasan || 'Penugasan pengujian dibuat.',
      actorNik: assignment.assigned_by,
      createdAt: toDateOrNull(assignment.assigned_at) || new Date(),
    }, options);
  }

  const lkaRows = plainRows(await safeFindAll('LKA', () => Lka.findAll({
    include: [penugasanDetailInclude(idRegistrasi)],
    transaction: tx(options),
  })));
  for (const lka of lkaRows) {
    await createActivityLogIfMissing({
      entityType: 'LKA',
      entityId: lka.kode_lka,
      action: 'MELAPORKAN_LKA',
      statusBefore: null,
      statusAfter: lka.status_lka,
      source: 'Analis',
      note: 'Analis mengirim LKA.',
      actorNik: lka.dilaporkan_oleh,
      createdAt: toDateOrNull(lka.tanggal_pelaporan || lka.tanggal_selesai_pengujian) || new Date(),
    }, options);

    if (lka.diperiksa_oleh || lka.tanggal_pemeriksaan) {
      await createActivityLogIfMissing({
        entityType: 'LKA',
        entityId: lka.kode_lka,
        action: 'MEMERIKSA_LKA',
        statusBefore: null,
        statusAfter: lka.status_lka,
        source: 'Penyelia',
        note: 'Penyelia memeriksa LKA.',
        actorNik: lka.diperiksa_oleh,
        createdAt: toDateOrNull(lka.tanggal_pemeriksaan || lka.tanggal_pelaporan) || new Date(),
      }, options);
    }
  }

  const revisionRows = plainRows(await safeFindAll('revisi LKA', () => LkaRevisi.findAll({
    include: [lkaIncludeForRegistration(idRegistrasi)],
    transaction: tx(options),
  })));
  for (const revision of revisionRows) {
    await createActivityLogIfMissing({
      entityType: 'LKA_REVISI',
      entityId: revision.id_revisi_lka,
      action: revision.sumber_revisi === 'KASI_PENGUJIAN' ? 'REVISI_LKA_DIAJUKAN_KASI' : 'REVISI_LKA_DIAJUKAN_PENYELIA',
      statusBefore: null,
      statusAfter: revision.status_revisi,
      source: revision.sumber_revisi === 'KASI_PENGUJIAN' ? 'Kasi' : 'Penyelia',
      note: revision.catatan_umum,
      actorNik: revision.diajukan_oleh,
      createdAt: toDateOrNull(revision.diajukan_pada || revision.created_at) || new Date(),
    }, options);

    if (revision.ditinjau_pada || revision.ditinjau_oleh) {
      await createActivityLogIfMissing({
        entityType: 'LKA_REVISI',
        entityId: revision.id_revisi_lka,
        action: 'REVISI_LKA_DITINJAU_PENYELIA',
        statusBefore: 'Menunggu Persetujuan Penyelia',
        statusAfter: revision.status_revisi,
        source: 'Penyelia',
        note: revision.catatan_tinjauan,
        actorNik: revision.ditinjau_oleh,
        createdAt: toDateOrNull(revision.ditinjau_pada || revision.updated_at) || new Date(),
      }, options);
    }
  }

  const lhuRows = plainRows(await safeFindAll('LHU', () => Lhu.findAll({
    where: { id_registrasi: idRegistrasi },
    transaction: tx(options),
  })));
  for (const lhu of lhuRows) {
    await createActivityLogIfMissing({
      entityType: 'LHU',
      entityId: lhu.nomor_lhu,
      action: 'MEMBUAT_LHU',
      statusBefore: null,
      statusAfter: lhu.status_lhu,
      source: 'Sistem',
      note: 'Draft/finalisasi LHU dibuat.',
      actorNik: null,
      createdAt: toDateOrNull(lhu.created_at || lhu.tanggal_penerbitan) || new Date(),
    }, options);

    if (lhu.qc_at) {
      await createActivityLogIfMissing({
        entityType: 'LHU',
        entityId: lhu.nomor_lhu,
        action: 'QC_MENYETUJUI_LHU',
        statusBefore: null,
        statusAfter: lhu.status_lhu,
        source: 'QC',
        note: 'LHU disetujui oleh Pengendalian Mutu.',
        actorNik: lhu.qc_by,
        createdAt: toDateOrNull(lhu.qc_at) || new Date(),
      }, options);
    }

    if (lhu.kalab_at) {
      await createActivityLogIfMissing({
        entityType: 'LHU',
        entityId: lhu.nomor_lhu,
        action: 'KALAB_MENGESAHKAN_LHU',
        statusBefore: null,
        statusAfter: 'Disahkan',
        source: 'Kalab',
        note: 'LHU disahkan oleh Kepala Laboratorium.',
        actorNik: lhu.kalab_by,
        createdAt: toDateOrNull(lhu.kalab_at) || new Date(),
      }, options);
    }
  }

  const lhuScheduleRows = plainRows(await safeFindAll('jadwal pengambilan LHU', () => JadwalPengambilanLhu.findAll({
    where: { id_registrasi: idRegistrasi },
    order: [['dijadwalkan_pada', 'ASC']],
    transaction: tx(options),
  })));
  for (const schedule of lhuScheduleRows) {
    await createActivityLogIfMissing({
      entityType: 'JADWAL_LHU',
      entityId: schedule.id_jadwal_lhu,
      action: 'MENJADWALKAN_PENGAMBILAN_LHU',
      statusBefore: null,
      statusAfter: schedule.status_pengambilan,
      source: 'Admin',
      note: 'Jadwal pengambilan LHU dibuat.',
      actorNik: schedule.dijadwalkan_oleh,
      createdAt: toDateOrNull(schedule.dijadwalkan_pada) || new Date(),
    }, options);

    if (schedule.diambil_pada) {
      await createActivityLogIfMissing({
        entityType: 'JADWAL_LHU',
        entityId: schedule.id_jadwal_lhu,
        action: 'LHU_DIAMBIL_PELANGGAN',
        statusBefore: schedule.status_pengambilan,
        statusAfter: 'Sudah Diambil',
        source: 'Admin',
        note: schedule.nama_pengambil ? `LHU diambil oleh ${schedule.nama_pengambil}.` : 'LHU diambil pelanggan.',
        actorNik: schedule.dijadwalkan_oleh,
        createdAt: toDateOrNull(schedule.diambil_pada) || new Date(),
      }, options);
    }
  }
}

async function getRequestTimelineLogs(idRegistrasi, options = {}) {
  try {
    if (options.ensure !== false) {
      await ensureRequestActivityLogs(idRegistrasi, options);
    }

    const pairs = await getRequestTimelineEntityPairs(idRegistrasi, options);
    if (!pairs.length) return [];

    const rows = await AktivitasSistemLog.findAll({
      where: {
        [Op.or]: pairs.map((pair) => ({
          entity_type: pair.entity_type,
          entity_id: pair.entity_id,
        })),
      },
      order: [
        ['dibuat_pada', 'ASC'],
        ['id_aktivitas_log', 'ASC'],
      ],
      transaction: tx(options),
    });

    return plainRows(rows);
  } catch (error) {
    console.warn('[activity-log] Gagal membaca timeline permohonan:', error.message);
    return getFpplLogs(idRegistrasi, options);
  }
}

async function getManyFpplLogs(idRegistrasiList = [], options = {}) {
  const ids = Array.from(new Set(idRegistrasiList.filter(Boolean).map(String)));
  if (!ids.length) return {};

  try {
    const result = {};
    for (const idRegistrasi of ids) {
      result[idRegistrasi] = await getRequestTimelineLogs(idRegistrasi, options);
    }
    return result;
  } catch (error) {
    console.warn('[activity-log] Gagal membaca log aktivitas banyak FPPL:', error.message);
    return {};
  }
}

async function backfillAllRequestActivityLogs(options = {}) {
  const rows = plainRows(await Fppl.findAll({
    attributes: ['id_registrasi'],
    order: [
      ['tanggal_pendaftaran', 'ASC'],
      ['id_registrasi', 'ASC'],
    ],
    transaction: tx(options),
  }));

  let total = 0;
  for (const row of rows) {
    await ensureRequestActivityLogs(row.id_registrasi, options);
    total += 1;
  }
  return { total_requests_processed: total };
}

module.exports = {
  createActivityLog,
  createActivityLogIfMissing,
  logStatusChange,
  getLogsForEntity,
  getFpplLogs,
  getManyFpplLogs,
  getRequestTimelineLogs,
  getRequestTimelineEntityPairs,
  ensureRequestActivityLogs,
  backfillAllRequestActivityLogs,
};
