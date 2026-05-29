const { Op } = require('sequelize');

const {
  JadwalPengambilanLhu,
  JadwalSampel,
  Fppl,
  Pelanggan,
  User,
  Pegawai,
  PengajuanPerubahanJadwal,
} = require('../../models/Associations');

const { NOTIFICATION_TYPE } = require('../../constants/notification.constant');
const Roles = require('../../constants/roles');

const {
  buildAdminRequestLink,
  buildRequestDetailLink,
  safeString,
} = require('./notification-format.util');

const {
  createEmailLog,
  findNotificationTypeById,
  findOrCreateNotificationTypeById,
  getPlain,
  markEmailFailed,
  markEmailSent,
  resolveRecipientEmail,
  sendNotificationEmail,
} = require('./notification-core.service');

const {
  buildJadwalPengambilanLhuEmail,
} = require('../../templates/email/jadwal-pengambilan-lhu.template');

const {
  buildJadwalSampelEmail,
} = require('../../templates/email/jadwal-sampel.template');

const {
  buildScheduleChangeSubmittedAdminEmail,
  buildScheduleChangeDecisionCustomerEmail,
} = require('../../templates/email/schedule-change.template');

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

async function notifyJadwalPengambilanLhu(idJadwalLhu) {
  const jadwalId = safeString(idJadwalLhu).trim();

  if (!jadwalId) {
    const err = new Error('ID jadwal LHU wajib dikirim.');
    err.statusCode = 400;
    throw err;
  }

  const tipe = await findNotificationTypeById(
    NOTIFICATION_TYPE.JADWAL_PENGAMBILAN_LHU
  );

  const jadwalInstance = await JadwalPengambilanLhu.findOne({
    where: { id_jadwal_lhu: jadwalId },
    include: [
      {
        model: Fppl,
        as: 'fppl',
        required: true,
        include: [
          {
            model: Pelanggan,
            as: 'pelanggan',
            required: true,
          },
        ],
      },
    ],
  });

  if (!jadwalInstance) {
    const err = new Error('Jadwal pengambilan LHU tidak ditemukan.');
    err.statusCode = 404;
    throw err;
  }

  const jadwal = getPlain(jadwalInstance);
  const fppl = jadwal.fppl || jadwal.Fppl || {};
  const pelanggan = fppl.pelanggan || fppl.Pelanggan || {};

  const penerimaPelangganId =
    pelanggan.id_pelanggan ||
    fppl.id_pelanggan ||
    null;

  if (!penerimaPelangganId) {
    const err = new Error('Penerima pelanggan tidak valid.');
    err.statusCode = 400;
    throw err;
  }

  const log = await createEmailLog({
    idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
    penerimaUserNik: null,
    penerimaPelangganId,
    idRegistrasi: null,
    idJadwalLhu: jadwalId,
    nomorLhu: null,
    idPenugasan: null,
  });

  try {
    const to = await resolveRecipientEmail({
      penerimaUserNik: null,
      penerimaPelangganId,
    });

    const { subject, body, html } = buildJadwalPengambilanLhuEmail({
      pelanggan,
      fppl,
      jadwal,
    });

    await sendNotificationEmail({ to, subject, body, html });

    return markEmailSent(log);
  } catch (error) {
    await markEmailFailed(log, error);
    throw error;
  }
}

async function getScheduleChangeNotificationContext(idPengajuanJadwal) {
  const pengajuanId = safeString(idPengajuanJadwal).trim();

  if (!pengajuanId) {
    const err = new Error('ID pengajuan jadwal wajib dikirim untuk notifikasi.');
    err.statusCode = 400;
    throw err;
  }

  const rowInstance = await PengajuanPerubahanJadwal.findOne({
    where: { id_pengajuan_jadwal: pengajuanId },
    include: [
      {
        model: Fppl,
        as: 'fppl',
        required: true,
        include: [
          {
            model: Pelanggan,
            as: 'pelanggan',
            required: false,
          },
        ],
      },
      {
        model: JadwalSampel,
        as: 'jadwal_sampel',
        required: false,
      },
      {
        model: JadwalPengambilanLhu,
        as: 'jadwal_pengambilan_lhu',
        required: false,
      },
    ],
  });

  if (!rowInstance) {
    const err = new Error('Pengajuan perubahan jadwal tidak ditemukan untuk notifikasi.');
    err.statusCode = 404;
    throw err;
  }

  const pengajuan = getPlain(rowInstance);
  const fppl = pengajuan.fppl || pengajuan.Fppl || {};
  const pelanggan = fppl.pelanggan || fppl.Pelanggan || {};
  const pelangganId = fppl.id_pelanggan || pelanggan.id_pelanggan || null;

  if (!pelangganId) {
    const err = new Error('Pelanggan penerima notifikasi perubahan jadwal tidak valid.');
    err.statusCode = 400;
    throw err;
  }

  return {
    pengajuan,
    fppl,
    pelanggan,
    pelangganId,
    idRegistrasi: pengajuan.id_registrasi || fppl.id_registrasi,
  };
}

async function getScheduleChangeNotificationType(idTipeNotifikasi, deskripsi) {
  return findOrCreateNotificationTypeById(idTipeNotifikasi, {
    deskripsi,
    konteks: 'JADWAL',
  });
}

async function notifyScheduleChangeSubmittedToAdmin({ idPengajuanJadwal } = {}) {
  const tipe = await getScheduleChangeNotificationType(
    NOTIFICATION_TYPE.SCHEDULE_CHANGE_SUBMITTED,
    'Pelanggan mengajukan perubahan jadwal'
  );
  const context = await getScheduleChangeNotificationContext(idPengajuanJadwal);
  const admins = await getActiveUsersByRole(Roles.ADMIN);
  const results = [];

  for (const admin of admins) {
    if (!admin.nik) continue;

    const log = await createEmailLog({
      idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
      penerimaUserNik: admin.nik,
      penerimaPelangganId: null,
      idRegistrasi: context.idRegistrasi,
      idJadwalLhu: context.pengajuan.id_jadwal_lhu || null,
      nomorLhu: null,
      idPenugasan: null,
    });

    try {
      const to = await resolveRecipientEmail({
        penerimaUserNik: admin.nik,
        penerimaPelangganId: null,
      });
      const { subject, body, html } = buildScheduleChangeSubmittedAdminEmail({
        admin,
        pelanggan: context.pelanggan,
        fppl: context.fppl,
        pengajuan: context.pengajuan,
        adminLink: buildAdminRequestLink(context.idRegistrasi),
      });

      await sendNotificationEmail({ to, subject, body, html });
      results.push(await markEmailSent(log));
    } catch (error) {
      results.push(await markEmailFailed(log, error));
      console.error('Gagal kirim notifikasi pengajuan perubahan jadwal ke Admin:', error);
    }
  }

  return results;
}

async function notifyScheduleChangeApprovedToCustomer({ idPengajuanJadwal } = {}) {
  const tipe = await getScheduleChangeNotificationType(
    NOTIFICATION_TYPE.SCHEDULE_CHANGE_APPROVED,
    'Pengajuan perubahan jadwal disetujui admin'
  );
  const context = await getScheduleChangeNotificationContext(idPengajuanJadwal);

  const log = await createEmailLog({
    idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
    penerimaUserNik: null,
    penerimaPelangganId: context.pelangganId,
    idRegistrasi: context.idRegistrasi,
    idJadwalLhu: context.pengajuan.id_jadwal_lhu || null,
    nomorLhu: null,
    idPenugasan: null,
  });

  try {
    const to = await resolveRecipientEmail({
      penerimaUserNik: null,
      penerimaPelangganId: context.pelangganId,
    });
    const { subject, body, html } = buildScheduleChangeDecisionCustomerEmail({
      pelanggan: context.pelanggan,
      fppl: context.fppl,
      pengajuan: context.pengajuan,
      approved: true,
      detailLink: buildRequestDetailLink(context.idRegistrasi),
    });

    await sendNotificationEmail({ to, subject, body, html });
    return markEmailSent(log);
  } catch (error) {
    await markEmailFailed(log, error);
    throw error;
  }
}

async function notifyScheduleChangeRejectedToCustomer({ idPengajuanJadwal } = {}) {
  const tipe = await getScheduleChangeNotificationType(
    NOTIFICATION_TYPE.SCHEDULE_CHANGE_REJECTED,
    'Pengajuan perubahan jadwal ditolak admin'
  );
  const context = await getScheduleChangeNotificationContext(idPengajuanJadwal);

  const log = await createEmailLog({
    idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
    penerimaUserNik: null,
    penerimaPelangganId: context.pelangganId,
    idRegistrasi: context.idRegistrasi,
    idJadwalLhu: context.pengajuan.id_jadwal_lhu || null,
    nomorLhu: null,
    idPenugasan: null,
  });

  try {
    const to = await resolveRecipientEmail({
      penerimaUserNik: null,
      penerimaPelangganId: context.pelangganId,
    });
    const { subject, body, html } = buildScheduleChangeDecisionCustomerEmail({
      pelanggan: context.pelanggan,
      fppl: context.fppl,
      pengajuan: context.pengajuan,
      approved: false,
      detailLink: buildRequestDetailLink(context.idRegistrasi),
    });

    await sendNotificationEmail({ to, subject, body, html });
    return markEmailSent(log);
  } catch (error) {
    await markEmailFailed(log, error);
    throw error;
  }
}

async function notifyJadwalSampel({ idRegistrasi, idJadwal = null } = {}) {
  const registrasiId = safeString(idRegistrasi).trim();

  if (!registrasiId) {
    const err = new Error('ID registrasi wajib dikirim untuk notifikasi jadwal sampel.');
    err.statusCode = 400;
    throw err;
  }

  const tipe = await findNotificationTypeById(NOTIFICATION_TYPE.JADWAL_SAMPEL);
  const { request, pelanggan, pelangganId } = await getRequestAndCustomer(registrasiId);

  const where = idJadwal
    ? { id_jadwal: idJadwal }
    : { id_registrasi: registrasiId, status_jadwal: { [Op.ne]: 'Dibatalkan' } };

  const jadwalInstance = await JadwalSampel.findOne({
    where,
    include: [
      {
        model: Pegawai,
        as: 'pegawai_pcc',
        required: false,
      },
    ],
    order: [['dibuat_pada', 'DESC'], ['id_jadwal', 'DESC']],
  });

  if (!jadwalInstance) {
    const err = new Error('Jadwal sampel tidak ditemukan untuk notifikasi.');
    err.statusCode = 404;
    throw err;
  }

  const jadwal = getPlain(jadwalInstance);
  const pegawaiPcc = jadwal.pegawai_pcc || jadwal.PegawaiPcc || jadwal.Pegawai || {};

  const log = await createEmailLog({
    idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
    penerimaUserNik: null,
    penerimaPelangganId: pelangganId,
    idRegistrasi: registrasiId,
    idJadwalLhu: null,
    nomorLhu: null,
    idPenugasan: null,
  });

  try {
    const to = await resolveRecipientEmail({
      penerimaUserNik: null,
      penerimaPelangganId: pelangganId,
    });

    const { subject, body, html } = buildJadwalSampelEmail({
      pelanggan,
      fppl: request,
      jadwal,
      pegawaiPcc,
      detailLink: buildRequestDetailLink(registrasiId),
    });

    await sendNotificationEmail({ to, subject, body, html });
    return markEmailSent(log);
  } catch (error) {
    await markEmailFailed(log, error);
    throw error;
  }
}

module.exports = {
  notifyJadwalPengambilanLhu,
  notifyJadwalSampel,
  notifyScheduleChangeApprovedToCustomer,
  notifyScheduleChangeRejectedToCustomer,
  notifyScheduleChangeSubmittedToAdmin,
};
