const { Op } = require('sequelize');
const { NotifikasiEmail } = require('../../models/Associations');
const {
  NOTIFICATION_TYPE,
  NOTIFICATION_TYPE_DEFINITIONS,
  NOTIFICATION_REFERENCE_TYPE,
  STATUS_PENGIRIMAN_EMAIL,
} = require('../../constants/notification.constant');
const { safeString } = require('./notification-format.util');
const { getPlain } = require('./notification-core.service');

class WebNotificationService {
  getTypeMap = () => {
    return (NOTIFICATION_TYPE_DEFINITIONS || []).reduce((map, item) => {
      if (item?.id) {
        map[item.id] = {
          id: item.id,
          deskripsi: item.deskripsi || null,
          konteks: item.konteks || null,
        };
      }
      return map;
    }, {});
  };

  normalizeLimit = (limit) => {
    const parsed = Number(limit || 20);
    if (!Number.isFinite(parsed) || parsed <= 0) return 20;
    return Math.min(Math.floor(parsed), 100);
  };

  getCurrentNik = (user = {}) => {
    const nik = safeString(user?.nik).trim();
    if (!nik) {
      const err = new Error('User tidak valid. Silakan login ulang.');
      err.statusCode = 401;
      throw err;
    }
    return nik;
  };

  getReferenceLabel = (referensiTipe, referensiId) => {
    const id = safeString(referensiId).trim();
    if (!id) return null;

    switch (referensiTipe) {
      case NOTIFICATION_REFERENCE_TYPE.FPPL:
        return `Permohonan ${id}`;
      case NOTIFICATION_REFERENCE_TYPE.JADWAL_LHU:
        return `Jadwal LHU ${id}`;
      case NOTIFICATION_REFERENCE_TYPE.LHU:
        return `LHU ${id}`;
      case NOTIFICATION_REFERENCE_TYPE.PENUGASAN:
        return `Penugasan ${id}`;
      default:
        return id;
    }
  };

  buildActionTarget = ({ referensiTipe, referensiId } = {}) => {
    const id = safeString(referensiId).trim();
    if (!id) return null;

    if (referensiTipe === NOTIFICATION_REFERENCE_TYPE.FPPL) {
      return {
        pelanggan: { page: 'status', pathSegments: [id] },
        admin: { page: 'permohonan', pathSegments: [id] },
        kasi: { page: 'permohonan', pathSegments: [id] },
      };
    }

    if (referensiTipe === NOTIFICATION_REFERENCE_TYPE.LHU) {
      return {
        qc: { page: 'verifikasi', pathSegments: [id] },
        kalab: { page: 'lhu', pathSegments: [id] },
        kasi: { page: 'lhu', queryParams: { tab: 'antrean', q: id } },
        admin: { page: 'permohonan', queryParams: { q: id } },
        pelanggan: { page: 'status', queryParams: { q: id } },
      };
    }

    if (referensiTipe === NOTIFICATION_REFERENCE_TYPE.PENUGASAN) {
      return {
        analis: { page: 'sampel', queryParams: { idPenugasan: id } },
        penyelia: { page: 'detail-penugasan', queryParams: { idPenugasan: id } },
        kasi: { page: 'lhu', queryParams: { tab: 'antrean', q: id } },
        qc: { page: 'verifikasi', queryParams: { q: id } },
      };
    }

    if (referensiTipe === NOTIFICATION_REFERENCE_TYPE.JADWAL_LHU) {
      return {
        admin: { page: 'permohonan', queryParams: { tab: 'pengambilan', pickup: id } },
        pelanggan: { page: 'status', pathSegments: [id] },
      };
    }

    return null;
  };

  mapRow = (row, typeMap = null) => {
    const data = getPlain(row) || {};
    const tipe = (typeMap || this.getTypeMap())[data.id_tipe_notifikasi] || null;
    const unread = data.status_pengiriman === STATUS_PENGIRIMAN_EMAIL.MENUNGGU;
    const referenceLabel = this.getReferenceLabel(data.referensi_tipe, data.referensi_id);

    return {
      idNotifikasi: data.id_notifikasi_email,
      idNotifikasiEmail: data.id_notifikasi_email,
      idTipeNotifikasi: data.id_tipe_notifikasi,
      judul: tipe?.deskripsi || `Notifikasi ${data.id_tipe_notifikasi || ''}`.trim(),
      konteks: tipe?.konteks || null,
      pesan: referenceLabel
        ? `${tipe?.deskripsi || 'Ada notifikasi baru'} terkait ${referenceLabel}.`
        : `${tipe?.deskripsi || 'Ada notifikasi baru'}.`,
      referensiTipe: data.referensi_tipe,
      referensiId: data.referensi_id,
      referensiLabel: referenceLabel,
      status: data.status_pengiriman,
      belumDibaca: unread,
      sudahDibaca: !unread,
      dibuatPada: data.dibuat_pada,
      dibacaPada: data.status_pengiriman === STATUS_PENGIRIMAN_EMAIL.TERKIRIM ? data.dikirim_pada : null,
      target: this.buildActionTarget({
        referensiTipe: data.referensi_tipe,
        referensiId: data.referensi_id,
      }),
    };
  };

  listForCurrentUser = async (user, { limit = 20, unreadOnly = false } = {}) => {
    const nik = this.getCurrentNik(user);
    const onlyUnread = unreadOnly === true || ['1', 'true', 'yes'].includes(
      safeString(unreadOnly).trim().toLowerCase()
    );
    const where = {
      nik_penerima: nik,
      id_tipe_notifikasi: { [Op.ne]: NOTIFICATION_TYPE.PUSH_SUBSCRIPTION_BROWSER },
      status_pengiriman: onlyUnread
        ? STATUS_PENGIRIMAN_EMAIL.MENUNGGU
        : { [Op.in]: [STATUS_PENGIRIMAN_EMAIL.MENUNGGU, STATUS_PENGIRIMAN_EMAIL.TERKIRIM] },
    };

    const typeMap = this.getTypeMap();
    const rows = await NotifikasiEmail.findAll({
      where,
      order: [['dibuat_pada', 'DESC'], ['id_notifikasi_email', 'DESC']],
      limit: this.normalizeLimit(limit),
    });

    return rows.map((row) => this.mapRow(row, typeMap));
  };

  countUnreadForCurrentUser = async (user) => {
    const nik = this.getCurrentNik(user);
    return NotifikasiEmail.count({
      where: {
        nik_penerima: nik,
        id_tipe_notifikasi: { [Op.ne]: NOTIFICATION_TYPE.PUSH_SUBSCRIPTION_BROWSER },
        status_pengiriman: STATUS_PENGIRIMAN_EMAIL.MENUNGGU,
      },
    });
  };

  markAsRead = async (user, idNotifikasi) => {
    const nik = this.getCurrentNik(user);
    const id = safeString(idNotifikasi).trim();
    if (!id) {
      const err = new Error('ID notifikasi wajib dikirim.');
      err.statusCode = 400;
      throw err;
    }

    const row = await NotifikasiEmail.findOne({
      where: {
        id_notifikasi_email: id,
        nik_penerima: nik,
        id_tipe_notifikasi: { [Op.ne]: NOTIFICATION_TYPE.PUSH_SUBSCRIPTION_BROWSER },
      },
    });

    if (!row) {
      const err = new Error('Notifikasi tidak ditemukan.');
      err.statusCode = 404;
      throw err;
    }

    if (row.get('status_pengiriman') === STATUS_PENGIRIMAN_EMAIL.MENUNGGU) {
      await row.update({
        status_pengiriman: STATUS_PENGIRIMAN_EMAIL.TERKIRIM,
        pesan_error: null,
        dikirim_pada: new Date(),
      });
    }

    return this.mapRow(row);
  };

  markAllAsRead = async (user) => {
    const nik = this.getCurrentNik(user);
    const [affectedRows] = await NotifikasiEmail.update({
      status_pengiriman: STATUS_PENGIRIMAN_EMAIL.TERKIRIM,
      pesan_error: null,
      dikirim_pada: new Date(),
    }, {
      where: {
        nik_penerima: nik,
        id_tipe_notifikasi: { [Op.ne]: NOTIFICATION_TYPE.PUSH_SUBSCRIPTION_BROWSER },
        status_pengiriman: STATUS_PENGIRIMAN_EMAIL.MENUNGGU,
      },
    });

    return { updated: affectedRows || 0 };
  };
}

const webNotificationService = new WebNotificationService();
module.exports = webNotificationService;
module.exports.WebNotificationService = WebNotificationService;
