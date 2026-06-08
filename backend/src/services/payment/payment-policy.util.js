const RequestStatus = require('../../constants/request-status');
const { getAllowedXenditPaymentChannels } = require('./payment-xendit.service');
/**
 * PAYMENT METHOD
 * - PUBLIC: hanya tampil ke pelanggan
 * - INTERNAL: hanya dipakai admin
 */
const QRIS_PAYMENT_METHOD = {
    code: 'XENDIT_QRIS',
    label: 'QRIS',
    provider: 'XENDIT',
    channel: 'QRIS'
};
const DANA_PAYMENT_METHOD = {
    code: 'XENDIT_DANA',
    label: 'Dana',
    provider: 'XENDIT',
    channel: 'DANA'
};
const PUBLIC_PAYMENT_METHOD = {
    code: 'XENDIT_QRIS',
    label: 'QRIS',
    provider: 'XENDIT',
    channel: 'QRIS'
};
const INTERNAL_PAYMENT_METHOD = {
    // Nilai DB tetap MANUAL untuk kompatibilitas enum lama, tetapi label bisnis aktif adalah Bayar Nanti.
    code: 'MANUAL',
    label: 'Bayar Nanti',
    provider: null,
    channel: 'bayar_nanti',
    bank: null,
    accountName: null
};
const TERMINAL_GATEWAY_STATUSES = new Set(['EXPIRED', 'FAILED', 'CANCELLED', 'CANCELED']);
const ACTIVE_GATEWAY_STATUSES = new Set(['ACTIVE', 'PENDING', 'PROCESSING', 'OPEN', 'IN_PROGRESS']);
const PAYMENT_COMPLETED_STATUSES = new Set([
    RequestStatus.WAITING_SAMPLE,
    RequestStatus.WAITING_SAMPLE_PICKUP,
    RequestStatus.WAITING_SAMPLE_DELIVERY,
    RequestStatus.TESTING_PROCESS,
    RequestStatus.WAITING_LHU_SCHEDULING,
    RequestStatus.WAITING_LHU_PICKUP,
    RequestStatus.COMPLETED,
]);
const FINAL_REQUEST_REJECTION_STATUSES = new Set([
    RequestStatus.REJECTED,
    RequestStatus.CANCELLED_BY_CUSTOMER,
    RequestStatus.REJECTED_BY_ADMIN,
    RequestStatus.REJECTED_BY_KASI,
    RequestStatus.REJECTED_BY_PENYELIA
]);
class PaymentPolicyUtil {
normalizeGatewayStatus = (value) => {
        return String(value || '').trim().toUpperCase();
    };
    extractPaymentSequence = (paymentId) => {
        const match = String(paymentId || '').match(/(\d+)$/);
        return match ? Number(match[1]) : null;
    };
    comparePaymentRowsDesc = (left, right) => {
        const leftSequence = this.extractPaymentSequence(left?.id_payment);
        const rightSequence = this.extractPaymentSequence(right?.id_payment);
        if (leftSequence !== null && rightSequence !== null && leftSequence !== rightSequence) {
            return rightSequence - leftSequence;
        }
        return String(right?.id_payment || '').localeCompare(String(left?.id_payment || ''));
    };
    getLatestPaymentRow = (paymentRows = []) => {
        return [...paymentRows].sort(this.comparePaymentRowsDesc)[0] || null;
    };
    canMoveRequestToWaitingSampleAfterPayment = (status) => {
        return [
            RequestStatus.WAITING_PAYMENT,
            RequestStatus.WAITING_PAYMENT_VERIFICATION,
            RequestStatus.WAITING_SAMPLE,
            RequestStatus.WAITING_SAMPLE_PICKUP,
            RequestStatus.WAITING_SAMPLE_DELIVERY,
        ].includes(status);
    };
    isRequestAlreadyPastPayment = (status) => {
        return PAYMENT_COMPLETED_STATUSES.has(status);
    };
    isInvoiceSettled = (invoice) => {
        return ['Lunas', 'Bayar Nanti'].includes(String(invoice?.status_invoice || '').trim());
    };
    isSettledPayment = (payment) => {
        if (!payment)
            return false;
        if (payment.paid_at) {
            return true;
        }
        return this.normalizeGatewayStatus(payment.gateway_status) === 'COMPLETED';
    };
    isDeferredPaymentAttempt = (payment) => {
        if (!payment)
            return false;
        const resolvedMethod = this.resolvePaymentMethod(payment.metode_bayar);
        const methodCode = resolvedMethod?.code || String(payment.metode_bayar || '').trim().toUpperCase();
        return methodCode === INTERNAL_PAYMENT_METHOD.code;
    };
    getPaymentLifecycleState = (payment) => {
        if (!payment) {
            return { state: 'none', gatewayStatus: null };
        }
        const gatewayStatus = this.normalizeGatewayStatus(payment.gateway_status);
        const expiresAt = payment.expires_at ? new Date(payment.expires_at).getTime() : null;
        const isExpiredByTime = Number.isFinite(expiresAt) && expiresAt <= Date.now();
        if (this.isDeferredPaymentAttempt(payment)) {
            return { state: 'deferred', gatewayStatus };
        }
        if (this.isSettledPayment(payment)) {
            return { state: 'settled', gatewayStatus: gatewayStatus || 'COMPLETED' };
        }
        if (gatewayStatus === 'EXPIRED' || isExpiredByTime) {
            return { state: 'expired', gatewayStatus: 'EXPIRED' };
        }
        if (TERMINAL_GATEWAY_STATUSES.has(gatewayStatus)) {
            return { state: 'inactive', gatewayStatus };
        }
        if (payment.gateway_provider === 'XENDIT' ||
            payment.gateway_payment_url ||
            payment.gateway_session_id ||
            payment.gateway_reference_id ||
            ACTIVE_GATEWAY_STATUSES.has(gatewayStatus) ||
            !gatewayStatus) {
            return { state: 'active', gatewayStatus: gatewayStatus || 'ACTIVE' };
        }
        return { state: 'inactive', gatewayStatus: gatewayStatus || null };
    };
    deriveCustomerDecisionStatus = (statusFppl) => {
        if (statusFppl === RequestStatus.CANCELLED_BY_CUSTOMER)
            return RequestStatus.CANCELLED_BY_CUSTOMER;
        if (statusFppl === RequestStatus.REJECTED_BY_ADMIN)
            return RequestStatus.REJECTED_BY_ADMIN;
        if (statusFppl === RequestStatus.REJECTED_BY_KASI)
            return RequestStatus.REJECTED_BY_KASI;
        if (statusFppl === RequestStatus.REJECTED_BY_PENYELIA)
            return RequestStatus.REJECTED_BY_PENYELIA;
        if (statusFppl === RequestStatus.REJECTED)
            return 'Dibatalkan';
        if ([RequestStatus.WAITING_PAYMENT, RequestStatus.WAITING_PAYMENT_VERIFICATION].includes(statusFppl)) {
            return 'Menunggu Pembayaran';
        }
        if ([
            RequestStatus.WAITING_SAMPLE,
            RequestStatus.WAITING_SAMPLE_PICKUP,
            RequestStatus.WAITING_SAMPLE_DELIVERY,
            RequestStatus.TESTING_PROCESS,
            RequestStatus.WAITING_LHU_SCHEDULING,
            RequestStatus.WAITING_LHU_PICKUP,
            RequestStatus.COMPLETED,
        ].includes(statusFppl)) {
            return 'Disetujui';
        }
        return 'Menunggu';
    };
    normalizeAmount = (value) => {
        return Number.parseFloat(value || 0) || 0;
    };
    getAvailablePaymentMethods = () => {
        const allowedChannels = getAllowedXenditPaymentChannels();
        const shouldExposeAllDefault = allowedChannels.length === 0;
        const paymentMethods = [];
        if (shouldExposeAllDefault || allowedChannels.includes('QRIS')) {
            paymentMethods.push({ ...QRIS_PAYMENT_METHOD });
        }
        if (shouldExposeAllDefault || allowedChannels.includes('DANA')) {
            paymentMethods.push({ ...DANA_PAYMENT_METHOD });
        }
        return paymentMethods.length > 0 ? paymentMethods : [{ ...QRIS_PAYMENT_METHOD }];
    };
    resolvePaymentMethod = (identifier) => {
        if (!identifier)
            return null;
        const normalized = String(identifier).trim().toUpperCase();
        // Check specific payment methods
        if (normalized === QRIS_PAYMENT_METHOD.code)
            return QRIS_PAYMENT_METHOD;
        if (normalized === DANA_PAYMENT_METHOD.code)
            return DANA_PAYMENT_METHOD;
        // Legacy/fallback Xendit codes
        const xenditCodes = new Set([
            'XENDIT',
            'XENDIT_PAYMENT_LINK',
            'XENDIT_PAYMENT_SESSION',
            'VA_BCA'
        ]);
        if (xenditCodes.has(normalized)) {
            return QRIS_PAYMENT_METHOD;
        }
        if (normalized === INTERNAL_PAYMENT_METHOD.code ||
            normalized === INTERNAL_PAYMENT_METHOD.label.toUpperCase() ||
            normalized === 'PEMBAYARAN_AKHIR_ADMIN') {
            return INTERNAL_PAYMENT_METHOD;
        }
        return null;
    };
}
module.exports = new PaymentPolicyUtil();
module.exports.PaymentPolicyUtil = PaymentPolicyUtil;
module.exports.QRIS_PAYMENT_METHOD = QRIS_PAYMENT_METHOD;
module.exports.DANA_PAYMENT_METHOD = DANA_PAYMENT_METHOD;
module.exports.PUBLIC_PAYMENT_METHOD = PUBLIC_PAYMENT_METHOD;
module.exports.INTERNAL_PAYMENT_METHOD = INTERNAL_PAYMENT_METHOD;
