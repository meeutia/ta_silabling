const { Op } = require('sequelize');

const {
  TipeNotifikasi,
  NotifikasiEmail,
  JadwalPengambilanLhu,
  JadwalSampel,
  Fppl,
  Pelanggan,
  User,
  Pegawai,
  Lhu,
  LhuSampel,
  Sampel,
  FpplSampel,
  JenisSampel,
  Penugasan,
  PenugasanDetail,
  PenugasanItem,
  ParameterMetode,
  Parameter,
  Metode,
  Lka,
  LkaHasil,
  Invoice,
  PengajuanPerubahanJadwal,
} = require('../../models/Associations');

const {
  NOTIFICATION_TYPE,
  STATUS_PENGIRIMAN_EMAIL,
} = require('../../constants/notification.constant');
const Roles = require('../../constants/roles');
const RequestStatus = require('../../constants/request-status');
const { LHU_STATUS } = require('../../constants/lhu-status.constant');

const {
  buildAdminRequestLink,
  buildAnalisTestingLink,
  buildKasiMethodsLink,
  buildKasiReviewLink,
  buildKalabApprovalLink,
  buildKasiReviewApprovedEmail,
  buildKasiReviewApprovedToQcEmail,
  buildLhuNeedsKalabApprovalEmail,
  buildPenyeliaAssignmentLink,
  buildPenyeliaReviewLink,
  buildRequestDetailLink,
  buildRequestLhusCompleteAdminEmail,
  buildTestResultRevisionByQcEmail,
  safeString,
} = require('./notification-format.util');

const {
  addDays,
  createEmailLog,
  findNotificationTypeById,
  findOrCreateNotificationTypeById,
  getPlain,
  markEmailFailed,
  markEmailSent,
  pickArray,
  pickObject,
  resolveRecipientEmail,
  sendNotificationEmail,
  startOfToday,
  startOfTomorrow,
  toDateOnly,
} = require('./notification-core.service');

const {
  buildJadwalPengambilanLhuEmail,
} = require('../../templates/email/jadwal-pengambilan-lhu.template');

const {
  buildDeadlineAnalisDekatEmail,
} = require('../../templates/email/deadline-analis-dekat.template');

const {
  buildAnalystAssignmentCreatedEmail,
} = require('../../templates/email/analyst-assignment-created.template');

const {
  buildAnalystSubmitToSupervisorEmail,
} = require('../../templates/email/analyst-submit-to-supervisor.template');

const {
  buildTestResultRevisionByKasiEmail,
} = require('../../templates/email/test-result-revision-by-kasi.template');

const {
  buildTestResultRevisionByPenyeliaEmail,
} = require('../../templates/email/test-result-revision-by-penyelia.template');

const {
  buildSubcontractResultEntryEmail,
} = require('../../templates/email/subcontract-result-entry.template');

const {
  buildRequestStatusUpdatedEmail,
} = require('../../templates/email/request-status-updated.template');

const {
  buildInvoiceReadyEmail,
} = require('../../templates/email/invoice-ready.template');

const {
  buildDeferredPaymentMarkedEmail,
} = require('../../templates/email/deferred-payment-marked.template');

const {
  buildSampleReceivedEmail,
} = require('../../templates/email/sample-received.template');

const {
  buildLhuReadyEmail,
} = require('../../templates/email/lhu-ready.template');

const {
  buildJadwalSampelEmail,
} = require('../../templates/email/jadwal-sampel.template');

const {
  buildKasiMethodNeededEmail,
} = require('../../templates/email/kasi-method-needed.template');

const {
  buildPenyeliaAssignmentNeededEmail,
} = require('../../templates/email/penyelia-assignment-needed.template');

const {
  buildScheduleChangeSubmittedAdminEmail,
  buildScheduleChangeDecisionCustomerEmail,
} = require('../../templates/email/schedule-change.template');

const {
  buildKasiRevisionApprovalNeededEmail,
} = require('../../templates/email/kasi-revision-approval-needed.template');

const {
  buildKasiRevisionRejectedEmail,
} = require('../../templates/email/kasi-revision-rejected-to-kasi.template');

const {
  notifyJadwalPengambilanLhu,
  notifyJadwalSampel,
  notifyScheduleChangeApprovedToCustomer,
  notifyScheduleChangeRejectedToCustomer,
  notifyScheduleChangeSubmittedToAdmin,
} = require('./notification-schedule.service');


const {
  notifyAdminPermohonanBaru,
  notifyDeferredPaymentMarked,
  notifyInvoiceReady,
  notifyKasiMetodePerluDitentukan,
  notifyLhuReady,
  notifyPenyeliaPenugasanSampelMasuk,
  notifyRequestStatusChanged,
  notifySamplesReceived,
} = require('./notification-request.service');

const {
  notifyAnalisSubmitKePenyelia,
  notifyDeadlineAnalisDekat,
  notifyPenugasanAnalisBaru,
  notifyPenyeliaApproveKeKasi,
} = require('./notification-assignment-event.service');

const {
  findRevisionTargetsBySample,
  getActiveUsersByRole,
  getPenugasanParameterMethodGroups,
  getPenugasanSampleNos,
  getRequestAndCustomer,
  getRequestLhuCompletionContext,
  getRequestWithCustomerAndSamples,
  getSampleNotificationContext,
  resolveRequestStatusNotificationType,
} = require('./notification-query.service');

async function notifyKasiReviewApprovedToKalab({ noSampel } = {}) {
  const context = await getSampleNotificationContext(noSampel);
  const tipe = await findOrCreateNotificationTypeById(NOTIFICATION_TYPE.LHU_MENUNGGU_KALAB, {
    deskripsi: 'LHU menunggu persetujuan Kepala Lab',
    konteks: 'LHU',
  });
  const recipients = await getActiveUsersByRole(Roles.KALAB);
  const results = [];

  for (const penerima of recipients) {
    const nik = penerima.nik;
    if (!nik) continue;

    const log = await createEmailLog({
      idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
      penerimaUserNik: nik,
      penerimaPelangganId: null,
      idRegistrasi: context.fpplSampel.id_registrasi || null,
      idJadwalLhu: null,
      nomorLhu: context.lhu.nomor_lhu || null,
      idPenugasan: null,
    });

    try {
      const to = await resolveRecipientEmail({ penerimaUserNik: nik, penerimaPelangganId: null });
      const { subject, body, html } = buildKasiReviewApprovedEmail({ penerima, context });
      await sendNotificationEmail({ to, subject, body, html });
      results.push(await markEmailSent(log));
    } catch (error) {
      results.push(await markEmailFailed(log, error));
      console.error('Gagal kirim notifikasi hasil disetujui Kasi ke Kalab:', error);
    }
  }

  return results;
}

async function notifyKasiReviewApprovedToQc({ noSampel } = {}) {
  const context = await getSampleNotificationContext(noSampel);
  const tipe = await findOrCreateNotificationTypeById(NOTIFICATION_TYPE.HASIL_KASI_MENUNGGU_QC, {
    deskripsi: 'Hasil yang disetujui Kasi Pengujian menunggu verifikasi QC',
    konteks: 'LHU',
  });
  const recipients = await getActiveUsersByRole(Roles.QC);
  const results = [];

  for (const penerima of recipients) {
    const nik = penerima.nik;
    if (!nik) continue;

    const log = await createEmailLog({
      idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
      penerimaUserNik: nik,
      penerimaPelangganId: null,
      idRegistrasi: context.fpplSampel?.id_registrasi || context.fppl?.id_registrasi || null,
      idJadwalLhu: null,
      nomorLhu: context.lhu?.nomor_lhu || null,
      idPenugasan: null,
    });

    try {
      const to = await resolveRecipientEmail({ penerimaUserNik: nik, penerimaPelangganId: null });
      const { subject, body, html } = buildKasiReviewApprovedToQcEmail({ penerima, context });
      await sendNotificationEmail({ to, subject, body, html });
      results.push(await markEmailSent(log));
    } catch (error) {
      results.push(await markEmailFailed(log, error));
      console.error('Gagal kirim notifikasi hasil disetujui Kasi ke QC:', error);
    }
  }

  return results;
}


async function getLhuKalabNotificationContext(lhuNo) {
  const lhuInstance = await Lhu.findOne({
    where: { nomor_lhu: lhuNo },
    include: [
      {
        model: Fppl,
        as: 'fppl',
        required: false,
        include: [{ model: Pelanggan, as: 'pelanggan', required: false }],
      },
      {
        model: LhuSampel,
        as: 'lhu_sampels',
        required: false,
        include: [
          {
            model: Sampel,
            as: 'sampel',
            required: false,
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
            ],
          },
        ],
      },
    ],
    order: [[{ model: LhuSampel, as: 'lhu_sampels' }, 'urutan_sampel', 'ASC']],
  });

  if (!lhuInstance) {
    const err = new Error('LHU tidak ditemukan untuk notifikasi Kepala Lab.');
    err.statusCode = 404;
    throw err;
  }

  const lhu = getPlain(lhuInstance) || {};
  const lhuSamples = pickArray(lhu, ['lhu_sampels', 'LhuSampels']);
  const firstLhuSample = lhuSamples[0] || {};
  const firstSample = pickObject(firstLhuSample, ['sampel', 'Sampel']) || {};
  const firstFpplSampel = pickObject(firstSample, ['fppl_sampel', 'FpplSampel']) || {};
  const fpplFromSample = pickObject(firstFpplSampel, ['fppl', 'Fppl']) || {};
  const fppl = pickObject(lhu, ['fppl', 'Fppl']) || fpplFromSample || {};
  const pelanggan = pickObject(fppl, ['pelanggan', 'Pelanggan']) || pickObject(fpplFromSample, ['pelanggan', 'Pelanggan']) || {};

  const sampleNos = lhuSamples
    .map((item) => {
      const sample = pickObject(item, ['sampel', 'Sampel']) || {};
      return sample.no_sampel || item.no_sampel || item.noSampel || null;
    })
    .filter(Boolean);

  const samples = lhuSamples.map((item) => {
    const sample = pickObject(item, ['sampel', 'Sampel']) || {};
    const fpplSampel = pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {};
    const jenis = pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};

    return {
      no_sampel: sample.no_sampel || item.no_sampel || item.noSampel || null,
      noSampel: sample.no_sampel || item.no_sampel || item.noSampel || null,
      jenis_sampel: jenis.jenis_sampel || jenis.nama_jenis || null,
      jenisSampel: jenis.jenis_sampel || jenis.nama_jenis || null,
      urutan_sampel: item.urutan_sampel || item.urutanSampel || null,
      urutanSampel: item.urutan_sampel || item.urutanSampel || null,
    };
  }).filter((item) => item.no_sampel || item.noSampel);

  const jenisList = Array.from(new Set(
    samples
      .map((item) => item.jenis_sampel || item.jenisSampel)
      .filter(Boolean)
  ));
  const jenis = {
    jenis_sampel: jenisList.join(', ') || null,
    jenisSampel: jenisList.join(', ') || null,
  };

  return {
    lhu,
    sample: firstSample,
    samples,
    sampleNos,
    sample_nos: sampleNos,
    totalSamples: sampleNos.length,
    total_sampel: sampleNos.length,
    fpplSampel: firstFpplSampel,
    jenis,
    fppl,
    pelanggan,
  };
}

async function getRecentQcFinalizedLhus({ since, fallbackLhuNo }) {
  const rows = await Lhu.findAll({
    where: {
      status_lhu: LHU_STATUS.WAIT_KALAB,
      qc_at: {
        [Op.gte]: since,
      },
    },
    include: [
      {
        model: LhuSampel,
        as: 'lhu_sampels',
        required: false,
        include: [
          {
            model: Sampel,
            as: 'sampel',
            required: false,
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
      },
    ],
    order: [
      ['qc_at', 'ASC'],
      ['nomor_lhu', 'ASC'],
    ],
  });

  const mapped = rows.map((row) => {
    const lhu = getPlain(row) || {};
    const lhuSamples = pickArray(lhu, ['lhu_sampels', 'LhuSampels']);
    const samples = lhuSamples
      .map((item) => {
        const sample = pickObject(item, ['sampel', 'Sampel']) || {};
        const fpplSampel = pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {};
        const jenis = pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
        const noSampel = sample.no_sampel || item.no_sampel || item.noSampel || null;

        return {
          no_sampel: noSampel,
          noSampel,
          jenis_sampel: jenis.jenis_sampel || jenis.nama_jenis || null,
          jenisSampel: jenis.jenis_sampel || jenis.nama_jenis || null,
        };
      })
      .filter((sample) => sample.no_sampel || sample.noSampel);
    const sampleNos = samples.map((sample) => sample.no_sampel || sample.noSampel).filter(Boolean);
    const jenisList = Array.from(new Set(samples.map((sample) => sample.jenis_sampel || sample.jenisSampel).filter(Boolean)));

    return {
      nomor_lhu: lhu.nomor_lhu,
      nomorLhu: lhu.nomor_lhu,
      id_registrasi: lhu.id_registrasi,
      idRegistrasi: lhu.id_registrasi,
      qc_at: lhu.qc_at,
      qcAt: lhu.qc_at,
      sample_nos: sampleNos,
      sampleNos,
      samples,
      total_sampel: sampleNos.length,
      totalSamples: sampleNos.length,
      no_sampel: sampleNos.join(', ') || null,
      noSampel: sampleNos.join(', ') || null,
      jenis_sampel: jenisList.join(', ') || null,
      jenisSampel: jenisList.join(', ') || null,
    };
  });

  if (!mapped.some((row) => row.nomor_lhu === fallbackLhuNo)) {
    const fallbackContext = await getLhuKalabNotificationContext(fallbackLhuNo);
    mapped.push({
      nomor_lhu: fallbackLhuNo,
      nomorLhu: fallbackLhuNo,
      id_registrasi: fallbackContext.lhu.id_registrasi || fallbackContext.fpplSampel.id_registrasi || null,
      idRegistrasi: fallbackContext.lhu.id_registrasi || fallbackContext.fpplSampel.id_registrasi || null,
      sample_nos: fallbackContext.sampleNos || [],
      sampleNos: fallbackContext.sampleNos || [],
      samples: fallbackContext.samples || [],
      total_sampel: fallbackContext.totalSamples || 0,
      totalSamples: fallbackContext.totalSamples || 0,
      jenis_sampel: fallbackContext.jenis?.jenis_sampel || fallbackContext.jenis?.jenisSampel || null,
      jenisSampel: fallbackContext.jenis?.jenis_sampel || fallbackContext.jenis?.jenisSampel || null,
    });
  }

  return mapped;
}

async function notifyLhuNeedsKalabApproval({ nomorLhu } = {}) {
  const lhuNo = safeString(nomorLhu).trim();

  if (!lhuNo) {
    const err = new Error('Nomor LHU wajib dikirim.');
    err.statusCode = 400;
    throw err;
  }

  const context = await getLhuKalabNotificationContext(lhuNo);
  const tipe = await findOrCreateNotificationTypeById(NOTIFICATION_TYPE.LHU_MENUNGGU_KALAB, {
    deskripsi: 'LHU menunggu persetujuan Kepala Lab',
    konteks: 'LHU',
  });

  const recipients = await getActiveUsersByRole(Roles.KALAB);
  const results = [];
  const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
  const bundledLhus = await getRecentQcFinalizedLhus({
    since: twentyMinutesAgo,
    fallbackLhuNo: lhuNo,
  });

  for (const penerima of recipients) {
    const nik = penerima.nik;
    if (!nik) continue;

    const existingInWindow = await NotifikasiEmail.findOne({
      where: {
        id_tipe_notifikasi: tipe.get('id_tipe_notifikasi'),
        penerima_user_nik: nik,
        dibuat_pada: {
          [Op.gte]: twentyMinutesAgo,
        },
      },
      order: [['dibuat_pada', 'DESC']],
    });

    if (existingInWindow) {
      results.push({
        skipped: true,
        reason: 'Notifikasi Kalab sudah dikirim dalam rentang 20 menit terakhir.',
        nomor_lhu: lhuNo,
        penerima_user_nik: nik,
      });
      continue;
    }

    const log = await createEmailLog({
      idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
      penerimaUserNik: nik,
      penerimaPelangganId: null,
      idRegistrasi: context.lhu.id_registrasi || context.fpplSampel.id_registrasi || null,
      idJadwalLhu: null,
      nomorLhu: lhuNo,
      idPenugasan: null,
    });

    try {
      const to = await resolveRecipientEmail({ penerimaUserNik: nik, penerimaPelangganId: null });
      const { subject, body, html } = buildLhuNeedsKalabApprovalEmail({
        penerima,
        context,
        nomorLhu: lhuNo,
        lhus: bundledLhus,
      });
      await sendNotificationEmail({ to, subject, body, html });
      results.push(await markEmailSent(log));
    } catch (error) {
      results.push(await markEmailFailed(log, error));
      console.error('Gagal kirim notifikasi LHU ke Kalab:', error);
    }
  }

  return results;
}

async function notifyAdminWhenRequestLhusComplete({ nomorLhu } = {}) {
  const lhuNo = safeString(nomorLhu).trim();

  if (!lhuNo) {
    const err = new Error('Nomor LHU wajib dikirim untuk cek kelengkapan permohonan.');
    err.statusCode = 400;
    throw err;
  }

  const context = await getRequestLhuCompletionContext(lhuNo);

  if (!context.isComplete) {
    return {
      skipped: true,
      reason: 'Belum semua sampel dalam permohonan memiliki LHU berstatus Disahkan.',
      id_registrasi: context.idRegistrasi,
      total_sampel: context.totalSamples,
      belum_lengkap: context.incompleteSamples.map((sample) => sample.no_sampel),
    };
  }

  const tipe = await findOrCreateNotificationTypeById(
    NOTIFICATION_TYPE.LHU_PERMOHONAN_LENGKAP_ADMIN,
    {
      deskripsi: 'LHU sudah selesai dan siap diambil',
      konteks: 'LHU',
    }
  );

  const admins = await getActiveUsersByRole(Roles.ADMIN);
  const results = [];

  for (const admin of admins) {
    const nik = admin.nik;
    if (!nik) continue;

    const existing = await NotifikasiEmail.findOne({
      where: {
        id_tipe_notifikasi: tipe.get('id_tipe_notifikasi'),
        penerima_user_nik: nik,
        id_registrasi: context.idRegistrasi,
      },
    });

    if (existing) {
      results.push({
        penerima_user_nik: nik,
        skipped: true,
        reason: 'Notifikasi kelengkapan LHU permohonan sudah pernah dibuat untuk admin ini.',
      });
      continue;
    }

    const log = await createEmailLog({
      idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
      penerimaUserNik: nik,
      penerimaPelangganId: null,
      idRegistrasi: context.idRegistrasi,
      idJadwalLhu: null,
      nomorLhu: lhuNo,
      idPenugasan: null,
    });

    try {
      const to = await resolveRecipientEmail({ penerimaUserNik: nik, penerimaPelangganId: null });
      const { subject, body, html } = buildRequestLhusCompleteAdminEmail({
        penerima: admin,
        context,
      });
      await sendNotificationEmail({ to, subject, body, html });
      results.push(await markEmailSent(log));
    } catch (error) {
      results.push(await markEmailFailed(log, error));
      console.error('Gagal kirim notifikasi kelengkapan LHU permohonan ke Admin:', error);
    }
  }

  return results;
}

async function notifyRevisiLhuQc() {
  return {
    skipped: true,
    reason: 'Alur notifikasi revisi LHU oleh QC sudah dinonaktifkan.',
  };
}

async function findQcUserFromLhu(nomorLhu) {
  const lhuNo = safeString(nomorLhu).trim();

  if (!lhuNo) {
    const err = new Error('Nomor LHU wajib dikirim.');
    err.statusCode = 400;
    throw err;
  }

  const lhu = await Lhu.findOne({
    where: { nomor_lhu: lhuNo },
  });

  if (!lhu) {
    const err = new Error('LHU untuk notifikasi revisi Kalab tidak ditemukan.');
    err.statusCode = 404;
    throw err;
  }

  const row = getPlain(lhu);
  const qcNik = row.qc_by;

  if (!qcNik) {
    const err = new Error('User Pengendalian Mutu pada LHU belum tersedia.');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({
    where: { nik: qcNik },
    include: [
      {
        model: Pegawai,
        required: false,
      },
    ],
  });

  if (!user) {
    const err = new Error('User Pengendalian Mutu tidak ditemukan.');
    err.statusCode = 404;
    throw err;
  }

  const plainUser = getPlain(user);
  const pegawai = plainUser.pegawai || plainUser.Pegawai || {};

  return {
    lhu: row,
    qc: {
      ...plainUser,
      nama_pegawai: pegawai.nama_pegawai || null,
    },
  };
}

async function notifyRevisiLhuKalab() {
  return {
    skipped: true,
    reason: 'Alur revisi LHU oleh Kalab sudah dinonaktifkan.',
  };
}
async function notifyRevisiPenyeliaKeAnalis({ idPenugasanDetail, catatanRevisi, noSampel = [] } = {}) {
  const detailId = safeString(idPenugasanDetail).trim();
  const note = safeString(catatanRevisi).trim();

  if (!detailId) throw new Error('ID detail penugasan wajib dikirim.');
  if (!note) throw new Error('Catatan revisi wajib diisi.');

  const tipe = await findNotificationTypeById(NOTIFICATION_TYPE.REVISI_PENYELIA);
  const detailInstance = await PenugasanDetail.findOne({
    where: { id_penugasan_detail: detailId },
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
      { model: PenugasanItem, required: false },
    ],
  });

  if (!detailInstance) {
    const err = new Error('Detail penugasan untuk notifikasi revisi penyelia tidak ditemukan.');
    err.statusCode = 404;
    throw err;
  }

  const detail = getPlain(detailInstance);
  const penugasan = detail.penugasan || detail.Penugasan || {};
  const analis = penugasan.Analis || penugasan.analis || {};
  const parameterMetode = detail.parameter_metode || detail.ParameterMetode || {};
  const parameter = parameterMetode.parameter || parameterMetode.Parameter || {};
  const metode = parameterMetode.metode || parameterMetode.Metode || {};
  const items = pickArray(detail, ['penugasan_items', 'PenugasanItems', 'penugasan_item']);
  const sampleList = Array.isArray(noSampel) && noSampel.length
    ? noSampel
    : items.map((item) => item.no_sampel).filter(Boolean);

  if (!penugasan.id_user_analis) {
    const err = new Error('Analis penerima notifikasi revisi penyelia belum tersedia.');
    err.statusCode = 400;
    throw err;
  }

  const log = await createEmailLog({
    idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
    penerimaUserNik: penugasan.id_user_analis,
    penerimaPelangganId: null,
    idRegistrasi: null,
    idJadwalLhu: null,
    nomorLhu: null,
    idPenugasan: penugasan.id_penugasan || null,
  });

  try {
    const to = await resolveRecipientEmail({
      penerimaUserNik: penugasan.id_user_analis,
      penerimaPelangganId: null,
    });

    const { subject, body, html } = buildTestResultRevisionByPenyeliaEmail({
      analis,
      noSampel: sampleList,
      catatanRevisi: note,
      items: [
        {
          id_penugasan_detail: detail.id_penugasan_detail,
          nama_parameter: parameter.nama_parameter || parameterMetode.nama_parameter || '-',
          acuan_metode: parameterMetode.acuan_metode || metode.nama_metode || '-',
        },
      ],
      testingLink: buildAnalisTestingLink(detail.id_penugasan_detail, penugasan.id_penugasan),
    });

    await sendNotificationEmail({ to, subject, body, html });
    return markEmailSent(log);
  } catch (error) {
    await markEmailFailed(log, error);
    throw error;
  }
}


function normalizeNotificationIdList(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => safeString(item).trim()).filter(Boolean)));
  }
  if (value === null || value === undefined) return [];
  const text = safeString(value).trim();
  return text ? Array.from(new Set(text.split(',').map((item) => item.trim()).filter(Boolean))) : [];
}

function mapRevisionItemsForEmail(revisions = [], details = []) {
  const detailRows = Array.isArray(details) ? details : [];
  const detailById = new Map(
    detailRows
      .map((detail) => [safeString(detail.id_penugasan_detail || detail.idPenugasanDetail), detail])
      .filter(([id]) => id)
  );

  const rows = Array.isArray(revisions) && revisions.length
    ? revisions
    : detailRows;

  return (rows || []).map((row = {}, index) => {
    const rawDetailId = safeString(row.id_penugasan_detail || row.idPenugasanDetail || '').trim();
    const detail = detailById.get(rawDetailId) || detailRows[index] || row || {};
    const resolvedDetailId = safeString(
      rawDetailId || detail.id_penugasan_detail || detail.idPenugasanDetail || ''
    ).trim();
    const parameterMetode = pickObject(detail, ['parameter_metode', 'ParameterMetode']) || {};
    const parameter = pickObject(parameterMetode, ['parameter', 'Parameter']) || {};
    const metode = pickObject(parameterMetode, ['metode', 'Metode']) || {};

    return {
      id_penugasan_detail: resolvedDetailId || null,
      nama_parameter:
        row.nama_parameter || row.namaParameter ||
        detail.nama_parameter || detail.namaParameter ||
        parameter.nama_parameter || parameterMetode.nama_parameter ||
        `Parameter ${index + 1}`,
      acuan_metode:
        row.acuan_metode || row.acuanMetode || row.nama_metode || row.namaMetode ||
        detail.acuan_metode || detail.acuanMetode ||
        parameterMetode.acuan_metode || metode.nama_metode || metode.namaMetode || '-',
      catatan_revisi: row.catatan_revisi || row.catatanRevisi || row.catatan || null,
    };
  });
}

async function getPenugasanDetailsForNotification(idPenugasanDetailList = []) {
  const detailIds = normalizeNotificationIdList(idPenugasanDetailList);

  if (!detailIds.length) return [];

  const rows = await PenugasanDetail.findAll({
    where: { id_penugasan_detail: { [Op.in]: detailIds } },
    include: [
      {
        model: Penugasan,
        required: false,
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
  });

  return rows.map(getPlain).filter(Boolean);
}

async function notifyRevisiKasiKePenyelia({ noSampel, catatanRevisi, idPenugasanDetailList = [], revisions = [] } = {}) {
  const sampleNo = safeString(noSampel).trim();
  const note = safeString(catatanRevisi).trim();
  const detailIds = normalizeNotificationIdList(idPenugasanDetailList);

  if (!sampleNo) throw new Error('Nomor sampel wajib dikirim.');
  if (!note) throw new Error('Catatan revisi wajib diisi.');
  if (!detailIds.length) throw new Error('ID detail penugasan revisi wajib dikirim.');

  const tipe = await findOrCreateNotificationTypeById(NOTIFICATION_TYPE.REVISI_KASI_KE_PENYELIA, {
    deskripsi: 'Revisi Kasi Pengujian menunggu persetujuan Penyelia',
    konteks: 'PENUGASAN',
  });
  const details = await getPenugasanDetailsForNotification(detailIds);
  const penyeliaNikList = Array.from(new Set(
    details
      .map((detail) => {
        const penugasan = pickObject(detail, ['penugasan', 'Penugasan']) || {};
        return penugasan.assigned_by || penugasan.assignedBy || null;
      })
      .filter(Boolean)
  ));

  let recipients = [];

  if (penyeliaNikList.length) {
    const rows = await User.findAll({
      where: { nik: { [Op.in]: penyeliaNikList }, is_active: 1 },
      include: [{ model: Pegawai, required: false }],
    });

    recipients = rows.map((row) => {
      const user = getPlain(row) || {};
      const pegawai = user.pegawai || user.Pegawai || {};
      return {
        ...user,
        nama_pegawai: pegawai.nama_pegawai || user.nama_pegawai || null,
      };
    });
  }

  if (!recipients.length) {
    recipients = await getActiveUsersByRole(Roles.PENYELIA);
  }

  const items = mapRevisionItemsForEmail(revisions, details);
  const reviewLink = buildPenyeliaAssignmentLink();
  const results = [];

  for (const penyelia of recipients) {
    const nik = penyelia.nik;
    if (!nik) continue;

    const firstPenugasan = details
      .map((detail) => pickObject(detail, ['penugasan', 'Penugasan']) || {})
      .find((penugasan) => penugasan.id_penugasan);

    const log = await createEmailLog({
      idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
      penerimaUserNik: nik,
      penerimaPelangganId: null,
      idRegistrasi: null,
      idJadwalLhu: null,
      nomorLhu: null,
      idPenugasan: firstPenugasan?.id_penugasan || null,
    });

    try {
      const to = await resolveRecipientEmail({ penerimaUserNik: nik, penerimaPelangganId: null });
      const { subject, body, html } = buildKasiRevisionApprovalNeededEmail({
        penyelia,
        noSampel: sampleNo,
        catatanRevisi: note,
        items,
        reviewLink,
      });

      await sendNotificationEmail({ to, subject, body, html });
      results.push(await markEmailSent(log));
    } catch (error) {
      results.push(await markEmailFailed(log, error));
      console.error('Gagal kirim email revisi Kasi Pengujian ke Penyelia:', error);
    }
  }

  return results;
}

async function notifyRevisiKasiDitolakKeKasi({ noSampel, catatanTinjauan, kasiNik, idPenugasanDetailList = [], items = [] } = {}) {
  const sampleNo = safeString(noSampel).trim();
  const targetNik = safeString(kasiNik).trim();

  if (!sampleNo) throw new Error('Nomor sampel wajib dikirim.');
  if (!targetNik) throw new Error('NIK Kasi Pengujian penerima wajib dikirim.');

  const tipe = await findOrCreateNotificationTypeById(NOTIFICATION_TYPE.REVISI_KASI_DITOLAK_KE_KASI, {
    deskripsi: 'Revisi Kasi Pengujian ditolak oleh Penyelia',
    konteks: 'PENUGASAN',
  });
  const details = await getPenugasanDetailsForNotification(idPenugasanDetailList);
  const emailItems = mapRevisionItemsForEmail(items, details);
  const reviewLink = buildKasiReviewLink(sampleNo);

  const kasiInstance = await User.findOne({
    where: { nik: targetNik, is_active: 1 },
    include: [{ model: Pegawai, required: false }],
  });

  if (!kasiInstance) {
    const err = new Error('User Kasi Pengujian penerima tidak ditemukan atau tidak aktif.');
    err.statusCode = 404;
    throw err;
  }

  const kasi = getPlain(kasiInstance) || {};
  const pegawai = kasi.pegawai || kasi.Pegawai || {};
  const penerima = {
    ...kasi,
    nama_pegawai: pegawai.nama_pegawai || kasi.nama_pegawai || null,
  };

  const log = await createEmailLog({
    idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
    penerimaUserNik: targetNik,
    penerimaPelangganId: null,
    idRegistrasi: null,
    idJadwalLhu: null,
    nomorLhu: null,
    idPenugasan: null,
  });

  try {
    const to = await resolveRecipientEmail({ penerimaUserNik: targetNik, penerimaPelangganId: null });
    const { subject, body, html } = buildKasiRevisionRejectedEmail({
      kasi: penerima,
      noSampel: sampleNo,
      catatanTinjauan: catatanTinjauan || '-',
      items: emailItems,
      reviewLink,
    });

    await sendNotificationEmail({ to, subject, body, html });
    return markEmailSent(log);
  } catch (error) {
    await markEmailFailed(log, error);
    throw error;
  }
}

async function notifyRevisiKasiPengujian({ noSampel, catatanRevisi, idPenugasanDetailList = [] }) {
  const sampleNo = safeString(noSampel).trim();
  const note = safeString(catatanRevisi).trim();

  if (!sampleNo) throw new Error('Nomor sampel wajib dikirim.');
  if (!note) throw new Error('Catatan revisi wajib diisi.');

  const tipe = await findNotificationTypeById(NOTIFICATION_TYPE.REVISI_KASI_PENGUJIAN);
  const targets = await findRevisionTargetsBySample(sampleNo, idPenugasanDetailList);

  if (!targets.length) {
    const err = new Error('Target analis untuk notifikasi revisi Kasi Pengujian tidak ditemukan.');
    err.statusCode = 404;
    throw err;
  }

  const results = [];

  for (const target of targets) {
    const log = await createEmailLog({
      idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
      penerimaUserNik: target.penerima_user_nik,
      penerimaPelangganId: null,
      idRegistrasi: null,
      idJadwalLhu: null,
      nomorLhu: null,
      idPenugasan: target.id_penugasan,
    });

    try {
      const to = await resolveRecipientEmail({
        penerimaUserNik: target.penerima_user_nik,
        penerimaPelangganId: null,
      });

      const { subject, body, html } = buildTestResultRevisionByKasiEmail({
        analis: target.analis,
        noSampel: sampleNo,
        catatanRevisi: note,
        items: target.items,
        testingLink: buildAnalisTestingLink(target.items?.[0]?.id_penugasan_detail, target.id_penugasan),
      });

      await sendNotificationEmail({ to, subject, body, html });
      results.push(await markEmailSent(log));
    } catch (error) {
      results.push(await markEmailFailed(log, error));
      console.error('Gagal kirim email revisi Kasi Pengujian:', error);
    }
  }

  return results;
}

async function notifySubkontrakPerluDiisi(items = []) {
  // Filter items that still need manual entry (statusHasil is 'Belum Diisi')
  const itemsToFill = Array.isArray(items)
    ? items.filter(
        (item) =>
          item.status_hasil === 'Belum Diisi' ||
          item.statusHasil === 'Belum Diisi'
      )
    : [];

  if (itemsToFill.length === 0) {
    return [];
  }

  const tipe = await findNotificationTypeById(
    NOTIFICATION_TYPE.SUBKONTRAK_PERLU_DIISI
  );

  const penyeliaRows = await User.findAll({
    where: {
      id_role: Roles.PENYELIA,
      is_active: 1,
    },
    include: [
      {
        model: Pegawai,
        required: false,
      },
    ],
  });

  const results = [];

  for (const instance of penyeliaRows) {
    const penerima = getPlain(instance) || {};
    const pegawai = penerima.pegawai || penerima.Pegawai || {};
    const penerimaNik = penerima.nik;

    if (!penerimaNik) continue;

    const existingToday = await NotifikasiEmail.findOne({
      where: {
        id_tipe_notifikasi: tipe.get('id_tipe_notifikasi'),
        penerima_user_nik: penerimaNik,
        dibuat_pada: {
          [Op.gte]: startOfToday(),
          [Op.lt]: startOfTomorrow(),
        },
      },
    });

    if (existingToday) {
      results.push({
        penerima_user_nik: penerimaNik,
        skipped: true,
        reason: 'Notifikasi subkontrak sudah dikirim hari ini.',
      });
      continue;
    }

    const log = await createEmailLog({
      idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
      penerimaUserNik: penerimaNik,
      penerimaPelangganId: null,
      idRegistrasi: null,
      idJadwalLhu: null,
      nomorLhu: null,
      idPenugasan: null,
    });

    try {
      const to = await resolveRecipientEmail({
        penerimaUserNik: penerimaNik,
        penerimaPelangganId: null,
      });

      const { subject, body, html } = buildSubcontractResultEntryEmail({
        penerima: {
          ...penerima,
          nama_pegawai: pegawai.nama_pegawai || null,
        },
        items: itemsToFill,
      });

      await sendNotificationEmail({ to, subject, body, html });
      results.push(await markEmailSent(log));
    } catch (error) {
      results.push(await markEmailFailed(log, error));
      console.error('Gagal kirim email pengingat hasil subkontrak:', error);
    }
  }

  return results;
}




module.exports = {
  notifyAdminPermohonanBaru,
  notifyRequestStatusChanged,
  notifyInvoiceReady,
  notifyDeferredPaymentMarked,
  notifySamplesReceived,
  notifyLhuReady,
  notifyAdminWhenRequestLhusComplete,
  notifyJadwalPengambilanLhu,
  notifyJadwalSampel,
  notifyScheduleChangeRejectedToCustomer,
  notifyScheduleChangeApprovedToCustomer,
  notifyScheduleChangeSubmittedToAdmin,
  notifyKasiMetodePerluDitentukan,
  notifyPenyeliaPenugasanSampelMasuk,
  notifyDeadlineAnalisDekat,
  notifyPenugasanAnalisBaru,
  notifyAnalisSubmitKePenyelia,
  notifyPenyeliaApproveKeKasi,
  notifyRevisiLhuQc,
  notifyRevisiLhuKalab,
  notifyKasiReviewApprovedToKalab,
  notifyKasiReviewApprovedToQc,
  notifyLhuNeedsKalabApproval,
  notifyRevisiPenyeliaKeAnalis,
  findNotificationTypeById,
  notifyRevisiKasiPengujian,
  notifyRevisiKasiKePenyelia,
  notifyRevisiKasiDitolakKeKasi,
  notifySubkontrakPerluDiisi,
};