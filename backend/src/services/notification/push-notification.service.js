const { Op } = require('sequelize');
const { NotifikasiEmail, User } = require('../../models/Associations');
const {
  NOTIFICATION_TYPE,
  NOTIFICATION_TYPE_DEFINITIONS,
  NOTIFICATION_REFERENCE_TYPE,
  STATUS_PENGIRIMAN_EMAIL,
} = require('../../constants/notification.constant');
const { generateId } = require('../../utils/id-generator');
const { safeString } = require('./notification-format.util');

let webPush = null;
try {
  // Dependency ini aktif setelah menjalankan: npm install web-push
  // File tetap aman dibaca walaupun dependency belum di-install.
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  webPush = require('web-push');
} catch {
  webPush = null;
}

const ROLE_ID_TO_KEY = {
  'RL-001': 'pelanggan',
  'RL-002': 'admin',
  'RL-003': 'kasi',
  'RL-004': 'penyelia',
  'RL-005': 'analis',
  'RL-006': 'qc',
  'RL-007': 'kalab',
};

class PushNotificationService {
  constructor() {
    this.subscriptionTypeId = NOTIFICATION_TYPE.PUSH_SUBSCRIPTION_BROWSER;
  }

  parseBooleanEnv = (value, defaultValue = false) => {
    const normalized = safeString(value).trim().toLowerCase();
    if (!normalized) return defaultValue;
    return ['1', 'true', 'yes', 'on'].includes(normalized);
  };

  getFrontendOrigin = () => safeString(process.env.FRONTEND_ORIGIN).trim() || 'http://localhost:5173';

  getPublicKey = () => safeString(process.env.VAPID_PUBLIC_KEY).trim();

  getPrivateKey = () => safeString(process.env.VAPID_PRIVATE_KEY).trim();

  getVapidSubject = () => safeString(process.env.VAPID_SUBJECT).trim() || 'mailto:admin@silabling.local';

  isEnabled = () => {
    if (!this.parseBooleanEnv(process.env.ENABLE_PUSH_NOTIFICATIONS, false)) return false;
    return Boolean(webPush && this.getPublicKey() && this.getPrivateKey());
  };

  getConfig = () => {
    const installed = Boolean(webPush);
    const publicKey = this.getPublicKey();
    const privateKey = this.getPrivateKey();
    const envEnabled = this.parseBooleanEnv(process.env.ENABLE_PUSH_NOTIFICATIONS, false);

    return {
      enabled: Boolean(envEnabled && installed && publicKey && privateKey),
      publicKey,
      installed,
      envEnabled,
      reason: !envEnabled
        ? 'push_disabled_by_env'
        : !installed
          ? 'web_push_dependency_not_installed'
          : !publicKey || !privateKey
            ? 'vapid_key_not_configured'
            : null,
    };
  };

  configureWebPush = () => {
    if (!this.isEnabled()) return false;
    webPush.setVapidDetails(this.getVapidSubject(), this.getPublicKey(), this.getPrivateKey());
    return true;
  };

  getPlain = (instance) => {
    if (!instance) return null;
    if (typeof instance.get === 'function') return instance.get({ plain: true });
    return instance;
  };

  getCurrentNik = (user = {}) => {
    const nik = safeString(user?.nik || user?.NIK || user?.id || user?.sub).trim();
    if (!nik) {
      const err = new Error('User tidak valid. Silakan login ulang.');
      err.statusCode = 401;
      throw err;
    }
    return safeString(nik, 16);
  };

  sanitizeEndpoint = (endpoint) => safeString(endpoint).trim().slice(0, 2000);

  sanitizeKey = (value) => safeString(value).trim().slice(0, 255);

  normalizeSubscription = (subscription = {}) => {
    const endpoint = this.sanitizeEndpoint(subscription.endpoint);
    const p256dh = this.sanitizeKey(subscription.keys?.p256dh || subscription.p256dh);
    const auth = this.sanitizeKey(subscription.keys?.auth || subscription.auth);

    if (!endpoint || !p256dh || !auth) {
      const err = new Error('Data subscription push tidak lengkap.');
      err.statusCode = 400;
      throw err;
    }

    return { endpoint, p256dh, auth };
  };

  buildSubscriptionObject = (row) => {
    const data = this.getPlain(row) || {};
    if (!data.push_endpoint || !data.push_p256dh || !data.push_auth) return null;

    return {
      endpoint: data.push_endpoint,
      keys: {
        p256dh: data.push_p256dh,
        auth: data.push_auth,
      },
    };
  };

  generateNotificationId = async () => {
    let lastError = null;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      try {
        return await generateId(NotifikasiEmail, 'id_notifikasi_email', 'NE', null, 8);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Gagal membuat ID push subscription.');
  };

  findExistingSubscriptionRow = async ({ nik, endpoint }) => NotifikasiEmail.findOne({
    where: {
      push_endpoint: endpoint,
      id_tipe_notifikasi: this.subscriptionTypeId,
      [Op.or]: [
        { nik_penerima: nik },
        { nik_penerima: null },
        { nik_penerima: { [Op.ne]: nik } },
      ],
    },
    order: [['dibuat_pada', 'DESC']],
  });

  saveSubscription = async (user, rawSubscription = {}, userAgent = '') => {
    const nik = this.getCurrentNik(user);
    const subscription = this.normalizeSubscription(rawSubscription);
    const now = new Date();
    const existing = await this.findExistingSubscriptionRow({ nik, endpoint: subscription.endpoint });
    const values = {
      id_tipe_notifikasi: this.subscriptionTypeId,
      nik_penerima: nik,
      email_tujuan: null,
      nama_penerima: safeString(user?.username || user?.namaUser || user?.email || nik, 100),
      referensi_tipe: null,
      referensi_id: null,
      status_pengiriman: STATUS_PENGIRIMAN_EMAIL.TERKIRIM,
      pesan_error: null,
      dikirim_pada: now,
      push_endpoint: subscription.endpoint,
      push_p256dh: subscription.p256dh,
      push_auth: subscription.auth,
      push_user_agent: safeString(userAgent, 255),
      push_aktif: 1,
      push_subscription_pada: now,
    };

    if (existing) {
      await existing.update(values);
      return { subscribed: true, idNotifikasi: existing.get('id_notifikasi_email') };
    }

    const id = await this.generateNotificationId();
    const row = await NotifikasiEmail.create({
      id_notifikasi_email: id,
      ...values,
      dibuat_pada: now,
    });

    return { subscribed: true, idNotifikasi: row.get('id_notifikasi_email') };
  };

  unsubscribe = async (user, rawSubscription = {}) => {
    const nik = this.getCurrentNik(user);
    const endpoint = this.sanitizeEndpoint(rawSubscription.endpoint || rawSubscription);
    if (!endpoint) {
      const err = new Error('Endpoint push wajib dikirim.');
      err.statusCode = 400;
      throw err;
    }

    const [updated] = await NotifikasiEmail.update({
      push_aktif: 0,
      pesan_error: null,
    }, {
      where: {
        nik_penerima: nik,
        id_tipe_notifikasi: this.subscriptionTypeId,
        push_endpoint: endpoint,
      },
    });

    return { unsubscribed: true, updated: updated || 0 };
  };

  getActiveSubscriptionRows = async (nikPenerima) => {
    const nik = safeString(nikPenerima).trim();
    if (!nik) return [];

    return NotifikasiEmail.findAll({
      where: {
        nik_penerima: nik,
        id_tipe_notifikasi: this.subscriptionTypeId,
        push_aktif: 1,
        push_endpoint: { [Op.ne]: null },
        push_p256dh: { [Op.ne]: null },
        push_auth: { [Op.ne]: null },
      },
      order: [['push_subscription_pada', 'DESC'], ['dibuat_pada', 'DESC']],
      limit: 10,
    });
  };

  getNotificationType = (idTipeNotifikasi) => (
    NOTIFICATION_TYPE_DEFINITIONS.find((item) => item.id === idTipeNotifikasi) || null
  );

  getReferenceLabel = (referensiTipe, referensiId) => {
    const id = safeString(referensiId).trim();
    if (!id) return '';

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

  resolveRoleKey = async (nik) => {
    const user = await User.findOne({ where: { nik }, attributes: ['nik', 'id_role'] });
    const idRole = safeString(user?.get('id_role')).trim();
    return ROLE_ID_TO_KEY[idRole] || 'pelanggan';
  };

  isInternalRole = (roleKey) => roleKey && roleKey !== 'pelanggan';

  buildNotificationUrl = (roleKey) => {
    const origin = this.getFrontendOrigin().replace(/\/+$/, '');
    const role = roleKey || 'pelanggan';
    return `${origin}/${role}/notifikasi`;
  };

  buildPayloadFromLog = async (log) => {
    const data = this.getPlain(log) || {};
    const tipe = this.getNotificationType(data.id_tipe_notifikasi);
    const roleKey = await this.resolveRoleKey(data.nik_penerima);
    const referenceLabel = this.getReferenceLabel(data.referensi_tipe, data.referensi_id);

    return {
      roleKey,
      payload: {
        title: tipe?.deskripsi || 'Notifikasi SILABLING',
        body: referenceLabel
          ? `${tipe?.deskripsi || 'Ada notifikasi baru'} terkait ${referenceLabel}.`
          : `${tipe?.deskripsi || 'Ada notifikasi baru'}.`,
        tag: data.id_notifikasi_email,
        data: {
          idNotifikasi: data.id_notifikasi_email,
          referensiTipe: data.referensi_tipe || null,
          referensiId: data.referensi_id || null,
          url: this.buildNotificationUrl(roleKey),
        },
      },
    };
  };

  handleSendError = async (row, error) => {
    const statusCode = Number(error?.statusCode || error?.status || 0);
    const shouldDeactivate = statusCode === 404 || statusCode === 410;
    const values = {
      pesan_error: safeString(error?.message || 'Gagal mengirim push notification.').slice(0, 2000),
    };

    if (shouldDeactivate) values.push_aktif = 0;
    await row.update(values);
  };

  sendNotificationForLog = async (log) => {
    const data = this.getPlain(log) || {};
    const nik = safeString(data.nik_penerima).trim();
    if (!nik || data.id_tipe_notifikasi === this.subscriptionTypeId) {
      return { skipped: true, reason: 'not_notifiable_log' };
    }

    const { roleKey, payload } = await this.buildPayloadFromLog(log);
    if (!this.isInternalRole(roleKey)) {
      return { skipped: true, reason: 'customer_recipient_uses_email_or_website' };
    }

    if (!this.configureWebPush()) {
      return { skipped: true, reason: this.getConfig().reason || 'push_not_configured' };
    }

    const rows = await this.getActiveSubscriptionRows(nik);
    if (!rows.length) return { skipped: true, reason: 'no_active_subscription' };

    const body = JSON.stringify(payload);
    let sent = 0;
    let failed = 0;

    for (const row of rows) {
      const subscription = this.buildSubscriptionObject(row);
      if (!subscription) continue;

      try {
        await webPush.sendNotification(subscription, body, { TTL: 60 * 60 });
        sent += 1;
        await row.update({
          pesan_error: null,
          push_terkirim_pada: new Date(),
        });
      } catch (error) {
        failed += 1;
        await this.handleSendError(row, error);
      }
    }

    if (sent > 0 && typeof log.update === 'function') {
      await log.update({ push_terkirim_pada: new Date() });
    }

    return { sent, failed, skipped: false };
  };
}

const pushNotificationService = new PushNotificationService();

module.exports = pushNotificationService;
module.exports.PushNotificationService = PushNotificationService;
