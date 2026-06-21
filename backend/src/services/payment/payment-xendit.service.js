const { Op } = require('sequelize');
const { Fppl, Invoice, Payment, } = require('../../models/Associations');
const XENDIT_API_BASE = process.env.XENDIT_API_BASE || 'https://api.xendit.co';
class PaymentXenditService {
getXenditAuthHeader = () => {
        const secretKey = process.env.XENDIT_SECRET_KEY;
        if (!secretKey) {
            throw new Error('XENDIT_SECRET_KEY belum diatur di file .env backend.');
        }
        return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
    };
    parseXenditResponse = async (response) => {
        const text = await response.text();
        if (!text)
            return null;
        try {
            return JSON.parse(text);
        }
        catch {
            return { raw: text };
        }
    };
    requestXendit = async (path, requestData) => {
        const response = await fetch(`${XENDIT_API_BASE}${path}`, {
            method: 'POST',
            headers: {
                Authorization: this.getXenditAuthHeader(),
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(requestData),
        });
        const responseData = await this.parseXenditResponse(response);
        if (!response.ok) {
            const message = responseData?.message ||
                responseData?.error_code ||
                responseData?.errors?.[0]?.message ||
                'Gagal membuat sesi pembayaran Xendit.';
            const error = new Error(message);
            error.statusCode = response.status;
            error.data = responseData;
            throw error;
        }
        return responseData;
    };
    getXendit = async (path) => {
        const response = await fetch(`${XENDIT_API_BASE}${path}`, {
            method: 'GET',
            headers: {
                Authorization: this.getXenditAuthHeader(),
                Accept: 'application/json',
            },
        });
        const responseData = await this.parseXenditResponse(response);
        if (!response.ok) {
            const message = responseData?.message ||
                responseData?.error_code ||
                responseData?.errors?.[0]?.message ||
                'Gagal mengambil status sesi pembayaran Xendit.';
            const error = new Error(message);
            error.statusCode = response.status;
            error.data = responseData;
            throw error;
        }
        return responseData;
    };
    getAllowedXenditPaymentChannels = () => {
        return String(process.env.XENDIT_ALLOWED_PAYMENT_CHANNELS || '')
            .split(',')
            .map((channel) => channel.trim().toUpperCase())
            .filter(Boolean);
    };
    createXenditPaymentSession = async (data) => {
        const envAllowed = this.getAllowedXenditPaymentChannels();
        const finalData = {
            ...data,
            ...(data?.allowed_payment_channels?.length > 0
                ? { allowed_payment_channels: data.allowed_payment_channels }
                : envAllowed.length > 0
                    ? { allowed_payment_channels: envAllowed }
                    : {}),
        };
        return this.requestXendit('/sessions', finalData);
    };
    getWebhookData = (data = {}) => {
        return data.data && typeof data.data === 'object' ? data.data : data;
    };
    normalizeSessionStatus = (rawData = {}) => {
        const event = String(rawData.event || '').toLowerCase();
        const webhookData = this.getWebhookData(rawData);
        const status = String(webhookData.status || '').toUpperCase();
        if (event === 'payment_session.completed')
            return 'COMPLETED';
        if (event === 'payment_session.expired')
            return 'EXPIRED';
        if (event === 'payment_session.cancelled' || event === 'payment_session.canceled')
            return 'CANCELLED';
        if (event === 'payment_session.failed')
            return 'FAILED';
        return status || 'UNKNOWN';
    };
    findPaymentForXenditWebhook = async (data, transaction) => {
        const conditions = [];
        const sessionId = data.payment_session_id || data.id;
        if (sessionId) {
            conditions.push({ gateway_session_id: sessionId });
        }
        if (data.reference_id) {
            conditions.push({ gateway_reference_id: data.reference_id });
        }
        if (conditions.length === 0)
            return null;
        return Payment.findOne({
            where: { [Op.or]: conditions },
            include: [
                {
                    model: Invoice,
                    include: [Fppl],
                },
            ],
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
    };
}
module.exports = new PaymentXenditService();
module.exports.PaymentXenditService = PaymentXenditService;
