const { NotifikasiEmail, Pelanggan, User, } = require('../../models/Associations');
const { NOTIFICATION_TYPE_DEFINITIONS, NOTIFICATION_RECIPIENT_TYPE, NOTIFICATION_REFERENCE_TYPE, STATUS_PENGIRIMAN_EMAIL, } = require('../../constants/notification.constant');
const { generateId } = require('../../utils/id-generator');
const mailer = require('../../utils/mailer');
const { safeString } = require('./notification-format.util');

class NotificationCoreService {
    constructor() {
    }

    getPlain = (instance) => {
        if (!instance)
            return null;
        if (typeof instance.get === 'function')
            return instance.get({ plain: true });
        return instance;
    };

    pickObject = (source = {}, keys = []) => {
        if (!source || typeof source !== 'object')
            return {};
        for (const key of keys) {
            const value = source[key];
            if (value && typeof value === 'object' && !Array.isArray(value))
                return value;
        }
        return {};
    };

    pickArray = (source = {}, keys = []) => {
        if (!source || typeof source !== 'object')
            return [];
        for (const key of keys) {
            const value = source[key];
            if (Array.isArray(value))
                return value;
            if (value && typeof value === 'object')
                return [value];
        }
        return [];
    };

    toDateOnly = (value) => {
        const date = value ? new Date(value) : new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    addDays = (value, days) => {
        const date = value ? new Date(value) : new Date();
        date.setDate(date.getDate() + days);
        return date;
    };

    startOfToday = () => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
    };

    startOfTomorrow = () => {
        const date = this.startOfToday();
        date.setDate(date.getDate() + 1);
        return date;
    };

    resolveRecipientSnapshot = async ({ nikPenerima = null, penerimaTipe = null, penerimaId = null, penerimaUserNik = null, penerimaPelangganId = null, requireEmail = false, } = {}) => {
        const explicitType = safeString(penerimaTipe).trim().toUpperCase();
        const explicitId = safeString(penerimaId).trim();
        const directNik = safeString(nikPenerima || penerimaUserNik || (explicitType === NOTIFICATION_RECIPIENT_TYPE.USER ? explicitId : null)).trim();
        const pelangganId = safeString(penerimaPelangganId || (explicitType === NOTIFICATION_RECIPIENT_TYPE.PELANGGAN ? explicitId : null)).trim();

        let pelanggan = null;
        let user = null;
        let nik = directNik;

        if (pelangganId) {
            pelanggan = await Pelanggan.findOne({ where: { id_pelanggan: pelangganId } });
            if (!pelanggan) {
                const err = new Error('Data pelanggan penerima tidak ditemukan.');
                err.statusCode = 400;
                throw err;
            }
            nik = safeString(pelanggan.get('nik') || nik).trim();
        }

        if (nik) {
            user = await User.findOne({ where: { nik } });
            if (!user && !pelanggan) {
                const err = new Error('User penerima notifikasi tidak ditemukan.');
                err.statusCode = 400;
                throw err;
            }
        }

        if (!pelanggan && nik) {
            pelanggan = await Pelanggan.findOne({ where: { nik } });
        }

        if (!nik && !pelanggan) {
            const err = new Error('Penerima notifikasi belum ditentukan.');
            err.statusCode = 400;
            throw err;
        }

        const emailTujuan = safeString(pelanggan?.get('email_kontak')).trim() || safeString(user?.get('email')).trim();
        if (!emailTujuan && requireEmail) {
            const err = new Error('Email penerima tidak ditemukan pada pelanggan.email_kontak atau user.email.');
            err.statusCode = 400;
            throw err;
        }

        const namaPenerima = safeString(pelanggan?.get('pic')).trim() ||
            safeString(pelanggan?.get('nama_instansi')).trim() ||
            safeString(user?.get('username')).trim() ||
            nik ||
            pelangganId;

        return {
            nik_penerima: nik ? safeString(nik, 16) : null,
            email_tujuan: emailTujuan ? safeString(emailTujuan, 100) : null,
            nama_penerima: safeString(namaPenerima, 100),
        };
    };

    normalizeRecipient = ({ nikPenerima = null, penerimaTipe = null, penerimaId = null, penerimaUserNik = null, } = {}) => {
        const explicitType = safeString(penerimaTipe).trim().toUpperCase();
        const explicitId = safeString(penerimaId).trim();
        const directNik = safeString(nikPenerima || penerimaUserNik || (explicitType === NOTIFICATION_RECIPIENT_TYPE.USER ? explicitId : null)).trim();
        return { nik_penerima: directNik ? safeString(directNik, 16) : null };
    };

    normalizeReference = ({ referensiTipe = null, referensiId = null, idRegistrasi = null, idJadwalLhu = null, nomorLhu = null, idPenugasan = null, } = {}) => {
        const explicitType = safeString(referensiTipe).trim().toUpperCase();
        const explicitId = safeString(referensiId).trim();
        if (explicitType && explicitId) {
            return { referensi_tipe: explicitType, referensi_id: explicitId };
        }

        const assignmentId = safeString(idPenugasan).trim();
        if (assignmentId) {
            return { referensi_tipe: NOTIFICATION_REFERENCE_TYPE.PENUGASAN, referensi_id: assignmentId };
        }

        const lhuNo = safeString(nomorLhu).trim();
        if (lhuNo) {
            return { referensi_tipe: NOTIFICATION_REFERENCE_TYPE.LHU, referensi_id: lhuNo };
        }

        const lhuScheduleId = safeString(idJadwalLhu).trim();
        if (lhuScheduleId) {
            return { referensi_tipe: NOTIFICATION_REFERENCE_TYPE.JADWAL_LHU, referensi_id: lhuScheduleId };
        }

        const registrationId = safeString(idRegistrasi).trim();
        if (registrationId) {
            return { referensi_tipe: NOTIFICATION_REFERENCE_TYPE.FPPL, referensi_id: registrationId };
        }

        return { referensi_tipe: null, referensi_id: null };
    };

    buildEmailLogWhere = ({ idTipeNotifikasi, nikPenerima = null, penerimaTipe = null, penerimaId = null, penerimaUserNik = null, referensiTipe = null, referensiId = null, idRegistrasi = null, idJadwalLhu = null, nomorLhu = null, idPenugasan = null, } = {}) => {
        const recipient = this.normalizeRecipient({ nikPenerima, penerimaTipe, penerimaId, penerimaUserNik });
        const reference = this.normalizeReference({ referensiTipe, referensiId, idRegistrasi, idJadwalLhu, nomorLhu, idPenugasan });
        return {
            id_tipe_notifikasi: idTipeNotifikasi,
            nik_penerima: recipient.nik_penerima,
            referensi_tipe: reference.referensi_tipe,
            referensi_id: reference.referensi_id,
        };
    };

    buildNotificationTypeValue = (id, defaults = {}) => {
        const definition = (NOTIFICATION_TYPE_DEFINITIONS || []).find((item) => item.id === id);
        const value = {
            id_tipe_notifikasi: id,
            deskripsi: defaults.deskripsi || definition?.deskripsi || `Notifikasi ${id}`,
            konteks: defaults.konteks || definition?.konteks || 'UMUM',
        };
        return {
            ...value,
            get: (keyOrOptions) => {
                if (typeof keyOrOptions === 'string')
                    return value[keyOrOptions];
                return { ...value };
            },
        };
    };

    findNotificationTypeById = async (idTipeNotifikasi) => {
        const id = safeString(idTipeNotifikasi).trim();
        if (!id) {
            const err = new Error('ID tipe notifikasi wajib diisi.');
            err.statusCode = 400;
            throw err;
        }
        const definition = (NOTIFICATION_TYPE_DEFINITIONS || []).find((item) => item.id === id);
        if (!definition) {
            const err = new Error(`Tipe notifikasi ${id} tidak ditemukan.`);
            err.statusCode = 404;
            throw err;
        }
        return this.buildNotificationTypeValue(id, definition);
    };

    findOrCreateNotificationTypeById = async (idTipeNotifikasi, defaults = {}) => {
        const id = safeString(idTipeNotifikasi).trim();
        if (!id) {
            const err = new Error('ID tipe notifikasi wajib diisi.');
            err.statusCode = 400;
            throw err;
        }
        return this.buildNotificationTypeValue(id, defaults);
    };


    isDuplicatePrimaryKeyError = (error) => {
        return error?.name === 'SequelizeUniqueConstraintError' ||
            error?.parent?.code === 'ER_DUP_ENTRY' ||
            error?.original?.code === 'ER_DUP_ENTRY';
    };

    createEmailLog = async ({ idTipeNotifikasi, nikPenerima = null, penerimaTipe = null, penerimaId = null, penerimaUserNik = null, penerimaPelangganId = null, referensiTipe = null, referensiId = null, idRegistrasi = null, idJadwalLhu = null, nomorLhu = null, idPenugasan = null, }) => {
        const recipient = await this.resolveRecipientSnapshot({ nikPenerima, penerimaTipe, penerimaId, penerimaUserNik, penerimaPelangganId });
        const reference = this.normalizeReference({ referensiTipe, referensiId, idRegistrasi, idJadwalLhu, nomorLhu, idPenugasan });
        let lastError = null;

        for (let attempt = 1; attempt <= 5; attempt += 1) {
            const id = await generateId(NotifikasiEmail, 'id_notifikasi_email', 'NE', null, 8);
            try {
                return await NotifikasiEmail.create({
                    id_notifikasi_email: id,
                    id_tipe_notifikasi: idTipeNotifikasi,
                    nik_penerima: recipient.nik_penerima,
                    email_tujuan: recipient.email_tujuan,
                    nama_penerima: recipient.nama_penerima,
                    referensi_tipe: reference.referensi_tipe,
                    referensi_id: reference.referensi_id,
                    status_pengiriman: STATUS_PENGIRIMAN_EMAIL.MENUNGGU,
                    pesan_error: null,
                    dikirim_pada: null,
                    dibuat_pada: new Date(),
                });
            }
            catch (error) {
                lastError = error;
                if (!this.isDuplicatePrimaryKeyError(error)) {
                    throw error;
                }
            }
        }

        throw lastError || new Error('Gagal membuat log notifikasi email.');
    };

    resolveRecipientEmail = async ({ nikPenerima = null, penerimaTipe = null, penerimaId = null, penerimaUserNik = null, penerimaPelangganId = null, } = {}) => {
        const recipient = await this.resolveRecipientSnapshot({ nikPenerima, penerimaTipe, penerimaId, penerimaUserNik, penerimaPelangganId, requireEmail: true });
        return recipient.email_tujuan;
    };

    sendNotificationEmail = async ({ to, subject, body, html = null }) => {
        const emailTo = safeString(to).trim();
        const emailSubject = safeString(subject).trim();
        const text = safeString(body);

        if (!emailTo) {
            throw new Error('Email tujuan belum diisi.');
        }

        if (!emailSubject) {
            throw new Error('Subject email belum diisi.');
        }

        const fallbackHtml = text
            .split('\n')
            .map((line) => line
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;'))
            .join('<br/>');

        return mailer.sendMail({
            to: emailTo,
            subject: emailSubject,
            text,
            html: html || fallbackHtml,
        });
    };

    markEmailSent = async (log) => {
        await log.update({
            status_pengiriman: STATUS_PENGIRIMAN_EMAIL.TERKIRIM,
            pesan_error: null,
            dikirim_pada: new Date(),
        });
        const plain = this.getPlain(log);
        console.info('[EMAIL TERKIRIM]', {
            id: plain?.id_notifikasi_email,
            tipe: plain?.id_tipe_notifikasi,
            to: plain?.email_tujuan,
            referensi: plain?.referensi_id,
        });
        return plain;
    };

    markEmailFailed = async (log, error) => {
        await log.update({
            status_pengiriman: STATUS_PENGIRIMAN_EMAIL.GAGAL,
            pesan_error: safeString(error?.message).slice(0, 2000) ||
                'Gagal mengirim email.',
            dikirim_pada: null,
        });
        const plain = this.getPlain(log);
        console.error('[EMAIL GAGAL]', {
            id: plain?.id_notifikasi_email,
            tipe: plain?.id_tipe_notifikasi,
            to: plain?.email_tujuan,
            referensi: plain?.referensi_id,
            error: plain?.pesan_error,
        });
        return plain;
    };
}

const notificationCoreService = new NotificationCoreService();
module.exports = notificationCoreService;
module.exports.NotificationCoreService = NotificationCoreService;
module.exports.notificationCoreService = notificationCoreService;
