const XENDIT_API_BASE = process.env.XENDIT_API_BASE || 'https://api.xendit.co';
class XenditService {
getAuthHeader = () => {
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
    requestXendit = async (path, payload) => {
        const response = await fetch(`${XENDIT_API_BASE}${path}`, {
            method: 'POST',
            headers: {
                Authorization: this.getAuthHeader(),
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const data = await this.parseXenditResponse(response);
        if (!response.ok) {
            const message = data?.message ||
                data?.error_code ||
                data?.errors?.[0]?.message ||
                'Gagal membuat sesi pembayaran Xendit.';
            const error = new Error(message);
            error.statusCode = response.status;
            error.payload = data;
            throw error;
        }
        return data;
    };
    getAllowedPaymentChannels = () => {
        return String(process.env.XENDIT_ALLOWED_PAYMENT_CHANNELS || '')
            .split(',')
            .map((channel) => channel.trim())
            .filter(Boolean);
    };
    createPaymentSession = async (payload) => {
        // Prefer allowed_payment_channels provided in the payload (per-request).
        // If none provided, fall back to the environment configuration.
        const envAllowed = this.getAllowedPaymentChannels();
        const finalPayload = {
            ...payload,
            ...(payload && payload.allowed_payment_channels && payload.allowed_payment_channels.length > 0
                ? { allowed_payment_channels: payload.allowed_payment_channels }
                : envAllowed.length > 0
                    ? { allowed_payment_channels: envAllowed }
                    : {}),
        };
        return this.requestXendit('/sessions', finalPayload);
    };
}
module.exports = new XenditService();
module.exports.XenditService = XenditService;
