const { Op } = require('sequelize');
const { sequelize, Fppl, Pelanggan, FpplSampel, FpplParameterMetode, JenisSampel, RegBm, ParameterMetode, Parameter, Metode, TarifPengambilan, Invoice, InvoiceItem, Payment } = require('../../models/Associations');
const RequestStatus = require('../../constants/request-status');
const { generateId, generateNomorFppl } = require('../../utils/id-generator');
const WorkflowLogService = require('../workflow/workflow-log.service');
const NotificationRequestService = require('../notification/notification-request.service');
const { createXenditPaymentSession, findPaymentForXenditWebhook, getWebhookData, getXendit, normalizeSessionStatus, } = require('./payment-xendit.service');
const { getAllowedXenditPaymentChannels, } = require('./payment-xendit.service');
const { buildInvoiceSummary, createOrRefreshInvoiceForRequest, ensureCustomerOwnsRequest, loadRequestForBilling, updateCustomerApprovalStatus, } = require('./payment-billing.service');
const { INTERNAL_PAYMENT_METHOD, canMoveRequestToWaitingSampleAfterPayment, deriveCustomerDecisionStatus, getAvailablePaymentMethods, getLatestPaymentRow, getPaymentLifecycleState, isInvoiceSettled, isRequestAlreadyPastPayment, normalizeAmount, normalizeGatewayStatus, resolvePaymentMethod, } = require('./payment-policy.util');
const { buildPaymentGatewayData, buildXenditPaymentSessionData, } = require('./payment-session-request.util');
class PaymentService {
    constructor({ notificationRequestService = NotificationRequestService } = {}) {
        this.notificationRequestService = notificationRequestService;
    }
    createGatewayPayment = async (requestId, userNik, paymentMethodCode) => {
        const t = await sequelize.transaction();
        try {
            const requestRecord = await ensureCustomerOwnsRequest(requestId, userNik, t);
            if (requestRecord.status_fppl !== RequestStatus.WAITING_PAYMENT) {
                throw new Error(`Permohonan tidak bisa diproses ke payment gateway karena status saat ini: ${requestRecord.status_fppl}`);
            }
            const method = resolvePaymentMethod(paymentMethodCode);
            if (!method) {
                throw new Error('Metode pembayaran tidak valid. Pilih salah satu metode pembayaran yang tersedia.');
            }
            if (method.code === INTERNAL_PAYMENT_METHOD.code) {
                throw new Error('Bayar Nanti hanya dapat dicatat oleh admin, bukan dibuat sebagai payment gateway.');
            }
            // Validate that selected method is a valid Xendit payment method
            if (method.provider !== 'XENDIT') {
                throw new Error('Metode pembayaran tidak valid. Pilih salah satu metode Xendit yang tersedia.');
            }
            // Validate that the selected channel is in allowed channels
            const allowedChannels = getAllowedXenditPaymentChannels();
            if (allowedChannels.length > 0 && !allowedChannels.includes(method.channel)) {
                throw new Error(`Metode pembayaran ${method.label} tidak tersedia saat ini.`);
            }
            await updateCustomerApprovalStatus(requestId, 'Disetujui', t);
            const invoice = await createOrRefreshInvoiceForRequest(requestId, t);
            const requestForGateway = await loadRequestForBilling(requestId, t);
            const requestJson = requestForGateway.toJSON();
            const totalAmount = Number(invoice.subtotal_uji || 0) + Number(invoice.subtotal_pengambilan || 0);
            if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
                throw new Error('Total tagihan harus lebih dari 0 untuk membuat pembayaran Xendit.');
            }
            let payment = await Payment.findOne({
                where: { id_invoice: invoice.id_invoice },
                order: [['id_payment', 'DESC']],
                transaction: t,
                lock: t.LOCK.UPDATE
            });
            const paymentLifecycle = getPaymentLifecycleState(payment);
            if (paymentLifecycle.state === 'settled') {
                throw new Error('Payment sebelumnya sudah lunas atau terverifikasi. Payment baru tidak dapat dibuat.');
            }
            if (paymentLifecycle.state === 'deferred') {
                throw new Error('Invoice ini sudah dicatat sebagai Bayar Nanti oleh admin. Tidak bisa membuat payment gateway.');
            }
            if (payment && paymentLifecycle.state === 'active') {
                const summary = await buildInvoiceSummary(requestId, t);
                await t.commit();
                return summary;
            }
            if (payment && paymentLifecycle.state === 'expired' && normalizeGatewayStatus(payment.gateway_status) !== 'EXPIRED') {
                await payment.update({
                    gateway_status: 'EXPIRED'
                }, { transaction: t });
            }
            if (!payment || paymentLifecycle.state !== 'active') {
                const paymentId = await generateId(Payment, 'id_payment', 'PAY-', t, 3);
                payment = await Payment.create({
                    id_payment: paymentId,
                    id_invoice: invoice.id_invoice,
                    metode_bayar: method.code,
                    gateway_provider: 'XENDIT',
                    gateway_session_id: null,
                    gateway_reference_id: null,
                    gateway_payment_url: null,
                    gateway_status: null,
                    gateway_payment_id: null,
                    gateway_payment_request_id: null,
                    expires_at: null,
                    gatewayData: null,
                    paid_at: null
                }, { transaction: t });
            }
            else {
                await payment.update({
                    metode_bayar: method.code,
                    gateway_provider: 'XENDIT',
                    paid_at: null
                }, { transaction: t });
            }
            const referenceId = `SILAB-${invoice.id_invoice}-${payment.id_payment}-${Date.now()}`.slice(0, 64);
            const sessionData = buildXenditPaymentSessionData({
                requestJson,
                requestId,
                invoice,
                payment,
                amount: totalAmount,
                referenceId,
                paymentMethod: method
            });
            const xenditSession = await createXenditPaymentSession(sessionData);
            const paymentUrl = xenditSession.payment_link_url;
            if (!paymentUrl) {
                throw new Error('Xendit tidak mengembalikan payment_link_url.');
            }
            await payment.update({
                gateway_provider: 'XENDIT',
                gateway_session_id: xenditSession.payment_session_id || xenditSession.id || null,
                gateway_reference_id: xenditSession.reference_id || referenceId,
                gateway_payment_url: paymentUrl,
                gateway_status: xenditSession.status || 'ACTIVE',
                gateway_payment_id: xenditSession.payment_id || null,
                gateway_payment_request_id: xenditSession.payment_request_id || null,
                expires_at: xenditSession.expires_at || sessionData.expires_at,
                gatewayData: xenditSession
            }, { transaction: t });
            await invoice.update({
                status_invoice: 'Belum Dibayar'
            }, { transaction: t });
            await t.commit();
            return buildInvoiceSummary(requestId);
        }
        catch (error) {
            await t.rollback();
            throw error;
        }
    };
    rejectInvoiceByCustomer = async (requestId, userNik, rejectionNote = null) => {
        const t = await sequelize.transaction();
        try {
            const requestRecord = await ensureCustomerOwnsRequest(requestId, userNik, t);
            const allowedStatuses = [RequestStatus.WAITING_PAYMENT, RequestStatus.WAITING_PAYMENT_VERIFICATION];
            if (!allowedStatuses.includes(requestRecord.status_fppl)) {
                throw new Error(`Permohonan tidak bisa ditolak pelanggan karena status saat ini: ${requestRecord.status_fppl}`);
            }
            const normalizedRejectionNote = String(rejectionNote || '').trim();
            // Phase 20: pelanggan membatalkan seluruh permohonan, bukan menolak per parameter-metode.
            // Jangan set fppl_parameter_metode.status_keputusan_permohonan = 'Ditolak'.
            const invoice = await Invoice.findOne({
                where: { id_registrasi: requestId },
                order: [['tanggal_invoice', 'DESC']],
                transaction: t
            });
            if (invoice) {
                await invoice.update({
                    status_invoice: 'Dibatalkan'
                }, { transaction: t });
            }
            const previousStatus = requestRecord.status_fppl;
            await requestRecord.update({
                status_fppl: RequestStatus.CANCELLED_BY_CUSTOMER,
                catatan_penolakan: null
            }, { transaction: t });
            await WorkflowLogService.logStatusTransition({
                entityType: 'FPPL',
                entityId: requestRecord.id_registrasi,
                action: 'MEMBATALKAN_PERMOHONAN_PELANGGAN',
                statusBefore: previousStatus,
                statusAfter: RequestStatus.CANCELLED_BY_CUSTOMER,
                source: 'Pelanggan',
                note: normalizedRejectionNote || null,
                actorNik: userNik,
                transaction: t,
            });
            await t.commit();
            return {
                idRegistrasi: requestRecord.id_registrasi,
                status: RequestStatus.CANCELLED_BY_CUSTOMER,
                note: normalizedRejectionNote || null
            };
        }
        catch (error) {
            await t.rollback();
            throw error;
        }
    };
    markDeferredPaymentByAdmin = async (requestId, adminNik, note) => {
        const t = await sequelize.transaction();
        try {
            const normalizedNote = String(note || '').trim();
            const deferredVerificationNote = normalizedNote
                ? `Bayar Nanti (admin). ${normalizedNote}`
                : 'Bayar Nanti (admin). Dicatat admin sebagai skema Bayar Nanti.';
            const requestRecord = await Fppl.findByPk(requestId, { transaction: t });
            if (!requestRecord) {
                throw new Error('Permohonan tidak ditemukan.');
            }
            if (requestRecord.status_fppl !== RequestStatus.WAITING_PAYMENT) {
                throw new Error(`Permohonan tidak bisa dicatat sebagai Bayar Nanti karena status saat ini: ${requestRecord.status_fppl}`);
            }
            await updateCustomerApprovalStatus(requestId, 'Disetujui', t);
            const invoice = await createOrRefreshInvoiceForRequest(requestId, t);
            let payment = await Payment.findOne({
                where: { id_invoice: invoice.id_invoice },
                order: [['id_payment', 'DESC']],
                transaction: t
            });
            if (!payment) {
                const paymentId = await generateId(Payment, 'id_payment', 'PAY-', t, 3);
                payment = await Payment.create({
                    id_payment: paymentId,
                    id_invoice: invoice.id_invoice,
                    metode_bayar: INTERNAL_PAYMENT_METHOD.code,
                    gateway_provider: null,
                    gateway_session_id: null,
                    gateway_reference_id: null,
                    gateway_payment_url: null,
                    gateway_status: null,
                    gateway_payment_id: null,
                    gateway_payment_request_id: null,
                    expires_at: null,
                    gatewayData: null,
                    paid_at: null
                }, { transaction: t });
            }
            else {
                await payment.update({
                    metode_bayar: INTERNAL_PAYMENT_METHOD.code,
                    gateway_provider: null,
                    gateway_session_id: null,
                    gateway_reference_id: null,
                    gateway_payment_url: null,
                    gateway_status: null,
                    gateway_payment_id: null,
                    gateway_payment_request_id: null,
                    expires_at: null,
                    gatewayData: null,
                    paid_at: null
                }, { transaction: t });
            }
            await invoice.update({
                status_invoice: 'Bayar Nanti',
                file_invoice_path: null,
            }, { transaction: t });
            const previousStatus = requestRecord.status_fppl;
            const nextWaitingSampleStatus = RequestStatus.getWaitingSampleStatusBySamplingType(requestRecord.jenis_pengambilan_sampel);
            await requestRecord.update({
                status_fppl: nextWaitingSampleStatus,
                catatan_penolakan: null
            }, { transaction: t });
            await WorkflowLogService.logStatusTransition({
                entityType: 'FPPL',
                entityId: requestRecord.id_registrasi,
                action: 'MENCATAT_PEMBAYARAN_AKHIR',
                statusBefore: previousStatus,
                statusAfter: nextWaitingSampleStatus,
                source: 'Admin',
                note: note || 'Bayar Nanti dicatat admin.',
                actorNik: adminNik,
                transaction: t,
            });
            let nomorFppl = requestRecord.nomor_fppl;
            if (!nomorFppl) {
                nomorFppl = await generateNomorFppl(Fppl, t, invoice.tanggal_invoice || new Date());
                await requestRecord.update({
                    nomor_fppl: nomorFppl,
                    tanggal_verifikasi: requestRecord.tanggal_verifikasi || new Date(),
                }, { transaction: t });
            }
            await t.commit();
            const summary = await buildInvoiceSummary(requestId);
            return {
                ...summary,
                idRegistrasi: requestRecord.id_registrasi,
                nomorFppl,
                status: nextWaitingSampleStatus
            };
        }
        catch (error) {
            await t.rollback();
            throw error;
        }
    };
    firstNonEmpty = (...values) => {
        for (const value of values) {
            if (value !== undefined && value !== null && String(value).trim() !== '')
                return value;
        }
        return null;
    };
    firstArrayItem = (value) => {
        return (Array.isArray(value) && value.length > 0 ? value[0] : null);
    };
    notifyPaymentCompletedInBackground = (idRegistrasi) => {
        const registrasiId = String(idRegistrasi || '').trim();
        if (!registrasiId)
            return;
        setImmediate(() => {
            Promise.allSettled([
                this.notificationRequestService.notifyPaymentCompletedToAdmin({ idRegistrasi: registrasiId }),
                this.notificationRequestService.notifyPaymentCompletedToCustomer({ idRegistrasi: registrasiId }),
            ]).then((results) => {
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        const target = index === 0 ? 'admin' : 'pelanggan';
                        console.error(`notifyPaymentCompletedTo${target} error:`, result.reason);
                    }
                });
            });
        });
    };
    triggerPaymentNotificationFromResult = (result = {}) => {
        if (result?.notificationContext?.event !== 'PAYMENT_COMPLETED')
            return;
        this.notifyPaymentCompletedInBackground(result.notificationContext.idRegistrasi);
    };
    extractXenditPaymentId = (data = {}) => {
        const payment = this.firstArrayItem(data.payments) || data.payment || {};
        const paymentRequest = this.firstArrayItem(data.payment_requests) || data.payment_request || {};
        return this.firstNonEmpty(data.payment_id, payment.id, payment.payment_id, paymentRequest.payment_id);
    };
    extractXenditPaymentRequestId = (data = {}) => {
        const paymentRequest = this.firstArrayItem(data.payment_requests) || data.payment_request || {};
        const payment = this.firstArrayItem(data.payments) || data.payment || {};
        return this.firstNonEmpty(data.payment_request_id, paymentRequest.id, paymentRequest.payment_request_id, payment.payment_request_id);
    };
    extractXenditPaidAt = (webhookData = {}) => {
        const payment = this.firstArrayItem(webhookData.payments) || webhookData.payment || {};
        return this.firstNonEmpty(webhookData.paid_at, webhookData.completed_at, webhookData.updated, webhookData.updated_at, payment.paid_at, payment.completed_at, payment.updated, webhookData.created, new Date());
    };
    applyXenditPaymentSessionUpdate = async (rawWebhookData, transaction) => {
        const webhookData = getWebhookData(rawWebhookData);
        const status = normalizeSessionStatus(webhookData);
        const payment = await findPaymentForXenditWebhook(webhookData, transaction);
        if (!payment) {
            return { found: false, status };
        }
        const invoice = payment.invoice || payment.Invoice;
        const requestRecord = invoice?.fppl || invoice?.Fppl;
        let notificationContext = null;
        if (!invoice || !requestRecord) {
            throw new Error('Relasi payment, invoice, atau permohonan tidak lengkap.');
        }
        await payment.update({
            gateway_status: status,
            gateway_session_id: webhookData.payment_session_id || webhookData.id || payment.gateway_session_id || null,
            gateway_reference_id: webhookData.reference_id || payment.gateway_reference_id || null,
            gateway_payment_url: webhookData.payment_link_url || webhookData.payment_url || payment.gateway_payment_url || null,
            gateway_payment_id: this.extractXenditPaymentId(webhookData) || payment.gateway_payment_id || null,
            gateway_payment_request_id: this.extractXenditPaymentRequestId(webhookData) || payment.gateway_payment_request_id || null,
            gatewayData: webhookData,
        }, { transaction });
        if (status === 'COMPLETED') {
            const wasAlreadyConfirmed = Boolean(payment.paid_at) || isInvoiceSettled(invoice);
            const paidAt = this.extractXenditPaidAt(webhookData);
            await payment.update({ paid_at: paidAt }, { transaction });
            await invoice.update({
                status_invoice: 'Lunas',
                file_invoice_path: null,
            }, { transaction });
            let nomorFppl = requestRecord.nomor_fppl;
            if (!nomorFppl) {
                nomorFppl = await generateNomorFppl(Fppl, transaction, invoice.tanggal_invoice || new Date());
            }
            const previousStatus = requestRecord.status_fppl;
            const nextStatus = canMoveRequestToWaitingSampleAfterPayment(previousStatus)
                ? RequestStatus.getWaitingSampleStatusBySamplingType(requestRecord.jenis_pengambilan_sampel)
                : previousStatus;
            await requestRecord.update({
                status_fppl: nextStatus,
                nomor_fppl: nomorFppl,
                tanggal_verifikasi: requestRecord.tanggal_verifikasi || new Date(),
                catatan_penolakan: null,
            }, { transaction });
            await WorkflowLogService.logStatusTransitionIfMissing({
                entityType: 'FPPL',
                entityId: requestRecord.id_registrasi,
                action: 'PEMBAYARAN_DIKONFIRMASI',
                statusBefore: previousStatus,
                statusAfter: nextStatus,
                source: 'Sistem',
                note: previousStatus === nextStatus && isRequestAlreadyPastPayment(previousStatus)
                    ? 'Pembayaran gateway sudah lunas; status permohonan dipertahankan karena proses sudah melewati tahap pembayaran.'
                    : 'Pembayaran dikonfirmasi otomatis oleh payment gateway.',
                actorNik: null,
                createdAt: paidAt,
                transaction,
            });
            if (!wasAlreadyConfirmed) {
                notificationContext = {
                    event: 'PAYMENT_COMPLETED',
                    idRegistrasi: requestRecord.id_registrasi,
                };
            }
        }
        if (['EXPIRED', 'FAILED', 'CANCELLED', 'CANCELED'].includes(status)) {
            if (isInvoiceSettled(invoice) || payment.paid_at || isRequestAlreadyPastPayment(requestRecord.status_fppl)) {
                return {
                    found: true,
                    status,
                    paymentId: payment.id_payment,
                    ignored: true,
                    reason: 'terminal_event_after_payment_settled',
                };
            }
            await invoice.update({ status_invoice: 'Belum Dibayar' }, { transaction });
            await requestRecord.update({
                status_fppl: RequestStatus.WAITING_PAYMENT,
                catatan_penolakan: null,
            }, { transaction });
        }
        return {
            found: true,
            status,
            paymentId: payment.id_payment,
            idRegistrasi: requestRecord.id_registrasi,
            notificationContext,
        };
    };
    syncXenditPaymentStatusFromReturn = async (query = {}) => {
        const paymentId = String(query.id_payment || '').trim();
        const sessionIdFromQuery = String(query.payment_session_id || query.session_id || '').trim();
        if (!paymentId && !sessionIdFromQuery) {
            return { skipped: true, reason: 'missing_payment_identifier' };
        }
        const payment = await Payment.findOne({
            where: paymentId
                ? { id_payment: paymentId }
                : { gateway_session_id: sessionIdFromQuery },
        });
        if (!payment || !payment.gateway_session_id) {
            return { skipped: true, reason: 'payment_or_session_not_found' };
        }
        const xenditSession = await getXendit(`/sessions/${encodeURIComponent(payment.gateway_session_id)}`);
        const t = await sequelize.transaction();
        try {
            const result = await this.applyXenditPaymentSessionUpdate(xenditSession, t);
            await t.commit();
            this.triggerPaymentNotificationFromResult(result);
            return result;
        }
        catch (error) {
            await t.rollback();
            throw error;
        }
    };
    handleXenditPaymentSessionWebhook = async (req, res) => {
        const callbackToken = req.headers['x-callback-token'];
        if (!process.env.XENDIT_CALLBACK_TOKEN) {
            return res.status(500).json({
                success: false,
                message: 'XENDIT_CALLBACK_TOKEN belum diatur di backend.',
            });
        }
        if (callbackToken !== process.env.XENDIT_CALLBACK_TOKEN) {
            return res.status(403).json({
                success: false,
                message: 'Invalid Xendit callback token.',
            });
        }
        const rawWebhookData = req.body || {};
        const webhookData = getWebhookData(rawWebhookData);
        const status = normalizeSessionStatus(webhookData);
        const t = await sequelize.transaction();
        try {
            const result = await this.applyXenditPaymentSessionUpdate(webhookData, t);
            await t.commit();
            this.triggerPaymentNotificationFromResult(result);
            return res.status(200).json({
                success: true,
                message: result.found
                    ? 'Webhook Xendit berhasil diproses.'
                    : 'Payment tidak ditemukan. Webhook diabaikan.',
                data: result,
            });
        }
        catch (error) {
            await t.rollback();
            console.error('Xendit webhook error:', error);
            return res.status(500).json({
                success: false,
                message: 'Gagal memproses webhook Xendit.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    };
}
module.exports = new PaymentService();
module.exports.PaymentService = PaymentService;
