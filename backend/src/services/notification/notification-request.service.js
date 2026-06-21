const { Op } = require('sequelize');
const { Fppl, Pelanggan, Invoice, Payment, NotifikasiEmail, FpplSampel, Sampel, Lhu, } = require('../../models/Associations');
const { NOTIFICATION_TYPE, STATUS_PENGIRIMAN_EMAIL, } = require('../../constants/notification.constant');
const Roles = require('../../constants/roles');
const { buildAdminRequestLink, buildKasiMethodsLink, buildPenyeliaAssignmentLink, buildRequestDetailLink, safeString, } = require('./notification-format.util');
const { buildEmailLogWhere, createEmailLog, findNotificationTypeById, findOrCreateNotificationTypeById, getPlain, markEmailFailed, markEmailSent, resolveRecipientEmail, resolveRecipientSnapshot, sendNotificationEmail, } = require('./notification-core.service');
const { getActiveUsersByRole, getRequestAndCustomer, getRequestWithCustomerAndSamples, resolveRequestStatusNotificationType, } = require('./notification-query.service');
const { buildAdminRequestSubmittedEmail, } = require('../../templates/email/admin-request-submitted.template');
const { buildDeferredPaymentMarkedEmail, } = require('../../templates/email/deferred-payment-marked.template');
const { buildInvoiceReadyEmail, } = require('../../templates/email/invoice-ready.template');
const { buildKasiMethodNeededEmail, } = require('../../templates/email/kasi-method-needed.template');
const { buildLhuReadyEmail, } = require('../../templates/email/lhu-ready.template');
const { buildPenyeliaAssignmentNeededEmail, } = require('../../templates/email/penyelia-assignment-needed.template');
const { buildRequestStatusUpdatedEmail, } = require('../../templates/email/request-status-updated.template');
const { buildSampleReceivedEmail, } = require('../../templates/email/sample-received.template');
const { buildCustomerCancellationAdminEmail, buildCustomerCancellationCustomerEmail, buildPaymentCompletedAdminEmail, buildPaymentCompletedCustomerEmail, } = require('../../templates/email/payment-customer-action.template');
class NotificationRequestService {
getLatestInvoiceAndPayment = async (registrasiId) => {
        const invoiceInstance = await Invoice.findOne({
            where: { id_registrasi: registrasiId },
            order: [
                ['tanggal_invoice', 'DESC'],
                ['id_invoice', 'DESC'],
            ],
        });
        const invoice = getPlain(invoiceInstance) || {};
        let payment = {};
        if (invoice?.id_invoice) {
            const paymentInstance = await Payment.findOne({
                where: { id_invoice: invoice.id_invoice },
                order: [['id_payment', 'DESC']],
            });
            payment = getPlain(paymentInstance) || {};
        }
        return { invoice, payment };
    };
    createEmailLogIfNotAlreadyQueuedOrSent = async ({ idTipeNotifikasi, penerimaUserNik = null, penerimaPelangganId = null, idRegistrasi = null, idJadwalLhu = null, nomorLhu = null, idPenugasan = null, }) => {
        const recipient = await resolveRecipientSnapshot({ penerimaUserNik, penerimaPelangganId });
        const existing = await NotifikasiEmail.findOne({
            where: {
                ...buildEmailLogWhere({
                    idTipeNotifikasi,
                    nikPenerima: recipient.nik_penerima,
                    idRegistrasi,
                    idJadwalLhu,
                    nomorLhu,
                    idPenugasan,
                }),
                status_pengiriman: {
                    [Op.in]: [
                        STATUS_PENGIRIMAN_EMAIL.MENUNGGU,
                        STATUS_PENGIRIMAN_EMAIL.TERKIRIM,
                    ],
                },
            },
            order: [['dibuat_pada', 'DESC']],
        });
        if (existing) {
            return {
                skipped: true,
                reason: 'notification_already_queued_or_sent',
                existing: getPlain(existing),
            };
        }
        const log = await createEmailLog({
            idTipeNotifikasi,
            penerimaUserNik,
            penerimaPelangganId,
            idRegistrasi,
            idJadwalLhu,
            nomorLhu,
            idPenugasan,
        });
        return { skipped: false, log };
    };
    notifyAdminPermohonanBaru = async ({ idRegistrasi } = {}) => {
        const registrasiId = safeString(idRegistrasi).trim();
        if (!registrasiId) {
            const err = new Error('ID registrasi wajib dikirim untuk notifikasi permohonan baru ke admin.');
            err.statusCode = 400;
            throw err;
        }
        const tipe = await findOrCreateNotificationTypeById(NOTIFICATION_TYPE.PERMOHONAN_BARU_ADMIN, {
            deskripsi: 'Permohonan baru masuk ke admin',
            konteks: 'FPPL',
        });
        const { request, pelanggan, sampleSummary } = await getRequestWithCustomerAndSamples(registrasiId);
        const recipients = await getActiveUsersByRole(Roles.ADMIN);
        const results = [];
        for (const penerima of recipients) {
            const nik = penerima.nik;
            if (!nik)
                continue;
            const log = await createEmailLog({
                idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                penerimaUserNik: nik,
                penerimaPelangganId: null,
                idRegistrasi: registrasiId,
                idJadwalLhu: null,
                nomorLhu: null,
                idPenugasan: null,
            });
            try {
                const to = await resolveRecipientEmail({
                    penerimaUserNik: nik,
                    penerimaPelangganId: null,
                });
                const { subject, body, html } = buildAdminRequestSubmittedEmail({
                    penerima,
                    fppl: request,
                    pelanggan,
                    sampleSummary,
                    detailLink: buildAdminRequestLink(registrasiId),
                });
                await sendNotificationEmail({ to, subject, body, html });
                results.push(await markEmailSent(log));
            }
            catch (error) {
                results.push(await markEmailFailed(log, error));
                console.error('Gagal kirim email permohonan baru ke Admin:', error);
            }
        }
        return results;
    };
    notifyInvoiceReady = async ({ idRegistrasi } = {}) => {
        const registrasiId = safeString(idRegistrasi).trim();
        if (!registrasiId) {
            const err = new Error('ID registrasi wajib dikirim untuk notifikasi invoice.');
            err.statusCode = 400;
            throw err;
        }
        const tipe = await findNotificationTypeById(NOTIFICATION_TYPE.MENUNGGU_PEMBAYARAN);
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
            const err = new Error('Permohonan tidak ditemukan untuk notifikasi invoice.');
            err.statusCode = 404;
            throw err;
        }
        const invoiceInstance = await Invoice.findOne({
            where: { id_registrasi: registrasiId },
            order: [
                ['tanggal_invoice', 'DESC'],
                ['id_invoice', 'DESC'],
            ],
        });
        if (!invoiceInstance) {
            const err = new Error('Invoice belum tersedia untuk notifikasi.');
            err.statusCode = 404;
            throw err;
        }
        const request = getPlain(requestInstance);
        const invoice = getPlain(invoiceInstance);
        const pelanggan = request.pelanggan || request.Pelanggan || {};
        const pelangganId = request.id_pelanggan || pelanggan.id_pelanggan;
        if (!pelangganId) {
            const err = new Error('Pelanggan penerima notifikasi invoice tidak valid.');
            err.statusCode = 400;
            throw err;
        }
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
            const { subject, body, html } = buildInvoiceReadyEmail({
                pelanggan,
                fppl: request,
                invoice,
                detailLink: buildRequestDetailLink(registrasiId),
            });
            await sendNotificationEmail({ to, subject, body, html });
            return markEmailSent(log);
        }
        catch (error) {
            await markEmailFailed(log, error);
            throw error;
        }
    };
    notifyDeferredPaymentMarked = async ({ idRegistrasi, note = null } = {}) => {
        const registrasiId = safeString(idRegistrasi).trim();
        if (!registrasiId) {
            const err = new Error('ID registrasi wajib dikirim untuk notifikasi pembayaran.');
            err.statusCode = 400;
            throw err;
        }
        const tipe = await findNotificationTypeById(NOTIFICATION_TYPE.MENUNGGU_SAMPEL);
        const { request, pelanggan, pelangganId } = await getRequestAndCustomer(registrasiId);
        const invoiceInstance = await Invoice.findOne({
            where: { id_registrasi: registrasiId },
            order: [
                ['tanggal_invoice', 'DESC'],
                ['id_invoice', 'DESC'],
            ],
        });
        const invoice = getPlain(invoiceInstance) || {};
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
            const { subject, body, html } = buildDeferredPaymentMarkedEmail({
                pelanggan,
                fppl: request,
                invoice,
                note,
                detailLink: buildRequestDetailLink(registrasiId),
            });
            await sendNotificationEmail({ to, subject, body, html });
            return markEmailSent(log);
        }
        catch (error) {
            await markEmailFailed(log, error);
            throw error;
        }
    };
    notifySamplesReceived = async ({ idRegistrasi, samples = [] } = {}) => {
        const registrasiId = safeString(idRegistrasi).trim();
        if (!registrasiId) {
            const err = new Error('ID registrasi wajib dikirim untuk notifikasi sampel diterima.');
            err.statusCode = 400;
            throw err;
        }
        const tipe = await findNotificationTypeById(NOTIFICATION_TYPE.MENUNGGU_SAMPEL);
        const { request, pelanggan, pelangganId } = await getRequestAndCustomer(registrasiId);
        let sampleRows = Array.isArray(samples) ? samples : [];
        if (!sampleRows.length) {
            const fpplSamples = await FpplSampel.findAll({
                where: { id_registrasi: registrasiId },
                include: [
                    {
                        model: Sampel,
                        as: 'sampels',
                        required: false,
                        attributes: ['no_sampel', 'diterima_pada'],
                    },
                ],
            });
            sampleRows = fpplSamples
                .map(getPlain)
                .flatMap((row) => row.sampels || row.Sampels || [])
                .filter(Boolean);
        }
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
            const { subject, body, html } = buildSampleReceivedEmail({
                pelanggan,
                fppl: request,
                samples: sampleRows,
                detailLink: buildRequestDetailLink(registrasiId),
            });
            await sendNotificationEmail({ to, subject, body, html });
            return markEmailSent(log);
        }
        catch (error) {
            await markEmailFailed(log, error);
            throw error;
        }
    };
    notifyLhuReady = async ({ nomorLhu } = {}) => {
        const lhuNo = safeString(nomorLhu).trim();
        if (!lhuNo) {
            const err = new Error('Nomor LHU wajib dikirim untuk notifikasi LHU.');
            err.statusCode = 400;
            throw err;
        }
        const tipe = await findNotificationTypeById(NOTIFICATION_TYPE.LHU_SIAP_DIAMBIL);
        const lhuInstance = await Lhu.findOne({
            where: { nomor_lhu: lhuNo },
            include: [
                {
                    model: Fppl,
                    as: 'fppl',
                    required: false,
                    include: [
                        {
                            model: Pelanggan,
                            as: 'pelanggan',
                            required: false,
                        },
                    ],
                },
                {
                    model: Sampel,
                    as: 'sampels',
                    required: false,
                    include: [
                        {
                            model: FpplSampel,
                            as: 'fppl_sampel',
                            required: false,
                            include: [
                                {
                                    model: Fppl,
                                    as: 'fppl',
                                    required: false,
                                    include: [
                                        {
                                            model: Pelanggan,
                                            as: 'pelanggan',
                                            required: false,
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        });
        if (!lhuInstance) {
            const err = new Error('LHU tidak ditemukan untuk notifikasi.');
            err.statusCode = 404;
            throw err;
        }
        const lhu = getPlain(lhuInstance);
        const lhuSamples = Array.isArray(lhu.sampels || lhu.Sampels)
            ? (lhu.sampels || lhu.Sampels)
            : [];
        const sampel = lhuSamples[0] || {};
        const fpplSampel = sampel.fppl_sampel || sampel.FpplSampel || {};
        const requestFromSample = fpplSampel.fppl || fpplSampel.Fppl || {};
        const request = lhu.fppl || lhu.Fppl || requestFromSample || {};
        const pelanggan = request.pelanggan || request.Pelanggan || {};
        const pelangganId = request.id_pelanggan || pelanggan.id_pelanggan || lhu.id_pelanggan || null;
        const registrasiId = request.id_registrasi || lhu.id_registrasi || null;
        if (!pelangganId) {
            const err = new Error('Pelanggan penerima notifikasi LHU tidak valid.');
            err.statusCode = 400;
            throw err;
        }
        const log = await createEmailLog({
            idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
            penerimaUserNik: null,
            penerimaPelangganId: pelangganId,
            idRegistrasi: registrasiId,
            idJadwalLhu: null,
            nomorLhu: lhuNo,
            idPenugasan: null,
        });
        try {
            const to = await resolveRecipientEmail({
                penerimaUserNik: null,
                penerimaPelangganId: pelangganId,
            });
            const { subject, body, html } = buildLhuReadyEmail({
                pelanggan,
                fppl: request,
                lhu,
                detailLink: registrasiId ? buildRequestDetailLink(registrasiId) : null,
            });
            await sendNotificationEmail({ to, subject, body, html });
            return markEmailSent(log);
        }
        catch (error) {
            await markEmailFailed(log, error);
            throw error;
        }
    };
    notifyRequestStatusChanged = async ({ idRegistrasi, statusTerbaru, } = {}) => {
        const registrasiId = safeString(idRegistrasi).trim();
        const status = safeString(statusTerbaru).trim();
        if (!registrasiId) {
            const err = new Error('ID registrasi wajib dikirim.');
            err.statusCode = 400;
            throw err;
        }
        if (!status) {
            const err = new Error('Status terbaru wajib dikirim.');
            err.statusCode = 400;
            throw err;
        }
        const tipe = await resolveRequestStatusNotificationType(status);
        if (!tipe) {
            return {
                skipped: true,
                reason: `Status ${status} tidak termasuk tipe notifikasi status permohonan yang aktif.`,
            };
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
            const { subject, body, html } = buildRequestStatusUpdatedEmail({
                pelanggan,
                idRegistrasi: registrasiId,
                statusTerbaru: status,
                detailLink: buildRequestDetailLink(registrasiId),
            });
            await sendNotificationEmail({ to, subject, body, html });
            return markEmailSent(log);
        }
        catch (error) {
            await markEmailFailed(log, error);
            throw error;
        }
    };
    notifyPaymentCompletedToAdmin = async ({ idRegistrasi } = {}) => {
        const registrasiId = safeString(idRegistrasi).trim();
        if (!registrasiId) {
            const err = new Error('ID registrasi wajib dikirim untuk notifikasi pembayaran ke admin.');
            err.statusCode = 400;
            throw err;
        }
        const tipe = await findOrCreateNotificationTypeById(NOTIFICATION_TYPE.PEMBAYARAN_PELANGGAN_ADMIN, {
            deskripsi: 'Pelanggan telah menyelesaikan pembayaran permohonan',
            konteks: 'FPPL',
        });
        const { request, pelanggan } = await getRequestAndCustomer(registrasiId);
        const { invoice, payment } = await this.getLatestInvoiceAndPayment(registrasiId);
        const recipients = await getActiveUsersByRole(Roles.ADMIN);
        const results = [];
        for (const penerima of recipients) {
            const nik = penerima.nik;
            if (!nik)
                continue;
            const logResult = await this.createEmailLogIfNotAlreadyQueuedOrSent({
                idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                penerimaUserNik: nik,
                penerimaPelangganId: null,
                idRegistrasi: registrasiId,
                idJadwalLhu: null,
                nomorLhu: null,
                idPenugasan: null,
            });
            if (logResult.skipped) {
                results.push(logResult);
                continue;
            }
            const log = logResult.log;
            try {
                const to = await resolveRecipientEmail({
                    penerimaUserNik: nik,
                    penerimaPelangganId: null,
                });
                const { subject, body, html } = buildPaymentCompletedAdminEmail({
                    penerima,
                    pelanggan,
                    fppl: request,
                    invoice,
                    payment,
                    detailLink: buildAdminRequestLink(registrasiId),
                });
                await sendNotificationEmail({ to, subject, body, html });
                results.push(await markEmailSent(log));
            }
            catch (error) {
                results.push(await markEmailFailed(log, error));
                console.error('Gagal kirim email pembayaran pelanggan ke Admin:', error);
            }
        }
        return results;
    };
    notifyPaymentCompletedToCustomer = async ({ idRegistrasi } = {}) => {
        const registrasiId = safeString(idRegistrasi).trim();
        if (!registrasiId) {
            const err = new Error('ID registrasi wajib dikirim untuk notifikasi pembayaran ke pelanggan.');
            err.statusCode = 400;
            throw err;
        }
        const tipe = await findOrCreateNotificationTypeById(NOTIFICATION_TYPE.PEMBAYARAN_TERVERIFIKASI, {
            deskripsi: 'Pembayaran telah diverifikasi',
            konteks: 'FPPL',
        });
        const { request, pelanggan, pelangganId } = await getRequestAndCustomer(registrasiId);
        const { invoice, payment } = await this.getLatestInvoiceAndPayment(registrasiId);
        const logResult = await this.createEmailLogIfNotAlreadyQueuedOrSent({
            idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
            penerimaUserNik: null,
            penerimaPelangganId: pelangganId,
            idRegistrasi: registrasiId,
            idJadwalLhu: null,
            nomorLhu: null,
            idPenugasan: null,
        });
        if (logResult.skipped)
            return logResult;
        const log = logResult.log;
        try {
            const to = await resolveRecipientEmail({
                penerimaUserNik: null,
                penerimaPelangganId: pelangganId,
            });
            const { subject, body, html } = buildPaymentCompletedCustomerEmail({
                pelanggan,
                fppl: request,
                invoice,
                payment,
                detailLink: buildRequestDetailLink(registrasiId),
            });
            await sendNotificationEmail({ to, subject, body, html });
            return markEmailSent(log);
        }
        catch (error) {
            await markEmailFailed(log, error);
            throw error;
        }
    };
    notifyCustomerRequestCancelledToAdmin = async ({ idRegistrasi, note = null } = {}) => {
        const registrasiId = safeString(idRegistrasi).trim();
        if (!registrasiId) {
            const err = new Error('ID registrasi wajib dikirim untuk notifikasi pembatalan ke admin.');
            err.statusCode = 400;
            throw err;
        }
        const tipe = await findOrCreateNotificationTypeById(NOTIFICATION_TYPE.PEMBATALAN_PELANGGAN_ADMIN, {
            deskripsi: 'Pelanggan membatalkan permohonan',
            konteks: 'FPPL',
        });
        const { request, pelanggan } = await getRequestAndCustomer(registrasiId);
        const recipients = await getActiveUsersByRole(Roles.ADMIN);
        const results = [];
        for (const penerima of recipients) {
            const nik = penerima.nik;
            if (!nik)
                continue;
            const logResult = await this.createEmailLogIfNotAlreadyQueuedOrSent({
                idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                penerimaUserNik: nik,
                penerimaPelangganId: null,
                idRegistrasi: registrasiId,
                idJadwalLhu: null,
                nomorLhu: null,
                idPenugasan: null,
            });
            if (logResult.skipped) {
                results.push(logResult);
                continue;
            }
            const log = logResult.log;
            try {
                const to = await resolveRecipientEmail({
                    penerimaUserNik: nik,
                    penerimaPelangganId: null,
                });
                const { subject, body, html } = buildCustomerCancellationAdminEmail({
                    penerima,
                    pelanggan,
                    fppl: request,
                    note,
                    detailLink: buildAdminRequestLink(registrasiId),
                });
                await sendNotificationEmail({ to, subject, body, html });
                results.push(await markEmailSent(log));
            }
            catch (error) {
                results.push(await markEmailFailed(log, error));
                console.error('Gagal kirim email pembatalan permohonan pelanggan ke Admin:', error);
            }
        }
        return results;
    };
    notifyCustomerRequestCancelledToCustomer = async ({ idRegistrasi, note = null } = {}) => {
        const registrasiId = safeString(idRegistrasi).trim();
        if (!registrasiId) {
            const err = new Error('ID registrasi wajib dikirim untuk notifikasi pembatalan ke pelanggan.');
            err.statusCode = 400;
            throw err;
        }
        const tipe = await findOrCreateNotificationTypeById(NOTIFICATION_TYPE.PERMOHONAN_DITOLAK, {
            deskripsi: 'Permohonan FPPL ditolak atau dibatalkan',
            konteks: 'FPPL',
        });
        const { request, pelanggan, pelangganId } = await getRequestAndCustomer(registrasiId);
        const logResult = await this.createEmailLogIfNotAlreadyQueuedOrSent({
            idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
            penerimaUserNik: null,
            penerimaPelangganId: pelangganId,
            idRegistrasi: registrasiId,
            idJadwalLhu: null,
            nomorLhu: null,
            idPenugasan: null,
        });
        if (logResult.skipped)
            return logResult;
        const log = logResult.log;
        try {
            const to = await resolveRecipientEmail({
                penerimaUserNik: null,
                penerimaPelangganId: pelangganId,
            });
            const { subject, body, html } = buildCustomerCancellationCustomerEmail({
                pelanggan,
                fppl: request,
                note,
                detailLink: buildRequestDetailLink(registrasiId),
            });
            await sendNotificationEmail({ to, subject, body, html });
            return markEmailSent(log);
        }
        catch (error) {
            await markEmailFailed(log, error);
            throw error;
        }
    };
    notifyKasiMetodePerluDitentukan = async ({ idRegistrasi } = {}) => {
        const registrasiId = safeString(idRegistrasi).trim();
        if (!registrasiId) {
            const err = new Error('ID registrasi wajib dikirim untuk notifikasi Kasi Pengujian.');
            err.statusCode = 400;
            throw err;
        }
        const tipe = await findNotificationTypeById(NOTIFICATION_TYPE.KASI_METODE_PERLU_DITENTUKAN);
        const { request, pelanggan, sampleSummary } = await getRequestWithCustomerAndSamples(registrasiId);
        const recipients = await getActiveUsersByRole(Roles.KASI);
        const results = [];
        for (const penerima of recipients) {
            const nik = penerima.nik;
            if (!nik)
                continue;
            const log = await createEmailLog({
                idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                penerimaUserNik: nik,
                penerimaPelangganId: null,
                idRegistrasi: registrasiId,
                idJadwalLhu: null,
                nomorLhu: null,
                idPenugasan: null,
            });
            try {
                const to = await resolveRecipientEmail({
                    penerimaUserNik: nik,
                    penerimaPelangganId: null,
                });
                const { subject, body, html } = buildKasiMethodNeededEmail({
                    penerima,
                    fppl: request,
                    pelanggan,
                    sampleSummary,
                    detailLink: buildKasiMethodsLink(registrasiId),
                });
                await sendNotificationEmail({ to, subject, body, html });
                results.push(await markEmailSent(log));
            }
            catch (error) {
                results.push(await markEmailFailed(log, error));
                console.error('Gagal kirim email kebutuhan penentuan metode ke Kasi:', error);
            }
        }
        return results;
    };
    notifyPenyeliaPenugasanSampelMasuk = async ({ idRegistrasi, samples = [] } = {}) => {
        const registrasiId = safeString(idRegistrasi).trim();
        if (!registrasiId) {
            const err = new Error('ID registrasi wajib dikirim untuk notifikasi Penyelia.');
            err.statusCode = 400;
            throw err;
        }
        const tipe = await findNotificationTypeById(NOTIFICATION_TYPE.PENYELIA_PENUGASAN_SAMPEL_MASUK);
        const context = await getRequestWithCustomerAndSamples(registrasiId);
        const request = context.request;
        const pelanggan = context.pelanggan;
        const sampleRows = Array.isArray(samples) && samples.length ? samples : context.samples;
        const recipients = await getActiveUsersByRole(Roles.PENYELIA);
        const results = [];
        for (const penerima of recipients) {
            const nik = penerima.nik;
            if (!nik)
                continue;
            const log = await createEmailLog({
                idTipeNotifikasi: tipe.get('id_tipe_notifikasi'),
                penerimaUserNik: nik,
                penerimaPelangganId: null,
                idRegistrasi: registrasiId,
                idJadwalLhu: null,
                nomorLhu: null,
                idPenugasan: null,
            });
            try {
                const to = safeString(penerima.email).trim() || await resolveRecipientEmail({
                    penerimaUserNik: nik,
                    penerimaPelangganId: null,
                });
                const { subject, body, html } = buildPenyeliaAssignmentNeededEmail({
                    penerima,
                    fppl: request,
                    pelanggan,
                    samples: sampleRows,
                    detailLink: buildPenyeliaAssignmentLink(),
                });
                await sendNotificationEmail({ to, subject, body, html });
                results.push(await markEmailSent(log));
            }
            catch (error) {
                results.push(await markEmailFailed(log, error));
                console.error('Gagal kirim email kebutuhan penugasan sampel ke Penyelia:', error);
            }
        }
        return results;
    };
}
module.exports = new NotificationRequestService();
module.exports.NotificationRequestService = NotificationRequestService;
