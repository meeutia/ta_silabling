const { Op } = require('sequelize');
const { NotifikasiEmail } = require('../../models/Associations');
const {
  NOTIFICATION_TYPE,
  NOTIFICATION_TYPE_DEFINITIONS,
  STATUS_PENGIRIMAN_EMAIL,
} = require('../../constants/notification.constant');
const { safeString } = require('./notification-format.util');
const { getPlain } = require('./notification-core.service');

class EmailDeliveryAuditService {
  getNotificationTypeLabelMap = () => {
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

  normalizeStatus = (status) => {
    const value = safeString(status).trim().toUpperCase();
    if (!value) return null;
    const allowed = Object.values(STATUS_PENGIRIMAN_EMAIL);
    return allowed.includes(value) ? value : null;
  };

  normalizeLimit = (limit) => {
    const parsed = Number(limit || 50);
    if (!Number.isFinite(parsed) || parsed <= 0) return 50;
    return Math.min(Math.floor(parsed), 200);
  };

  buildWhere = ({ status = null, type = null, referenceId = null, email = null } = {}) => {
    const where = {};
    const normalizedStatus = this.normalizeStatus(status);
    const normalizedType = safeString(type).trim();
    const normalizedReferenceId = safeString(referenceId).trim();
    const normalizedEmail = safeString(email).trim();

    if (normalizedStatus) where.status_pengiriman = normalizedStatus;
    if (normalizedType) where.id_tipe_notifikasi = normalizedType;
    if (normalizedReferenceId) where.referensi_id = normalizedReferenceId;
    if (normalizedEmail) where.email_tujuan = { [Op.like]: `%${normalizedEmail}%` };

    return where;
  };

  mapRow = (row, typeMap = null) => {
    const data = getPlain(row) || {};
    const tipe = (typeMap || this.getNotificationTypeLabelMap())[data.id_tipe_notifikasi] || null;
    return {
      idNotifikasiEmail: data.id_notifikasi_email,
      idTipeNotifikasi: data.id_tipe_notifikasi,
      tipeNotifikasi: tipe,
      nikPenerima: data.nik_penerima,
      emailTujuan: data.email_tujuan,
      namaPenerima: data.nama_penerima,
      referensiTipe: data.referensi_tipe,
      referensiId: data.referensi_id,
      statusPengiriman: data.status_pengiriman,
      terkirim: data.status_pengiriman === STATUS_PENGIRIMAN_EMAIL.TERKIRIM,
      gagal: data.status_pengiriman === STATUS_PENGIRIMAN_EMAIL.GAGAL,
      menunggu: data.status_pengiriman === STATUS_PENGIRIMAN_EMAIL.MENUNGGU,
      pesanError: data.pesan_error,
      dikirimPada: data.dikirim_pada,
      dibuatPada: data.dibuat_pada,
    };
  };

  listEmailLogs = async ({ status = null, type = null, referenceId = null, email = null, limit = 50 } = {}) => {
    const typeMap = this.getNotificationTypeLabelMap();
    const rows = await NotifikasiEmail.findAll({
      where: this.buildWhere({ status, type, referenceId, email }),
      order: [['dibuat_pada', 'DESC'], ['id_notifikasi_email', 'DESC']],
      limit: this.normalizeLimit(limit),
    });

    return rows.map((row) => this.mapRow(row, typeMap));
  };

  getEmailSummary = async () => {
    const statuses = Object.values(STATUS_PENGIRIMAN_EMAIL);
    const result = {
      total: 0,
      byStatus: statuses.reduce((map, status) => ({ ...map, [status]: 0 }), {}),
      byType: [],
    };

    const rows = await NotifikasiEmail.findAll({
      attributes: ['id_tipe_notifikasi', 'status_pengiriman'],
      raw: true,
    });

    const typeMap = this.getNotificationTypeLabelMap();
    const grouped = new Map();

    rows.forEach((row) => {
      const status = row.status_pengiriman || STATUS_PENGIRIMAN_EMAIL.MENUNGGU;
      const type = row.id_tipe_notifikasi || 'UNKNOWN';
      result.total += 1;
      result.byStatus[status] = (result.byStatus[status] || 0) + 1;

      if (!grouped.has(type)) {
        grouped.set(type, {
          idTipeNotifikasi: type,
          tipeNotifikasi: typeMap[type] || null,
          total: 0,
          byStatus: statuses.reduce((map, statusKey) => ({ ...map, [statusKey]: 0 }), {}),
        });
      }

      const current = grouped.get(type);
      current.total += 1;
      current.byStatus[status] = (current.byStatus[status] || 0) + 1;
    });

    result.byType = Array.from(grouped.values()).sort((a, b) =>
      safeString(a.idTipeNotifikasi).localeCompare(safeString(b.idTipeNotifikasi), 'id', { numeric: true })
    );

    return result;
  };

  getKnownNotificationTypes = async () => {
    return {
      types: NOTIFICATION_TYPE,
      definitions: NOTIFICATION_TYPE_DEFINITIONS,
      statuses: STATUS_PENGIRIMAN_EMAIL,
    };
  };
}

const emailDeliveryAuditService = new EmailDeliveryAuditService();
module.exports = emailDeliveryAuditService;
module.exports.EmailDeliveryAuditService = EmailDeliveryAuditService;
