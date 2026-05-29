const { normalizeAmount } = require('./payment-policy.util');

const buildPaymentGatewayPayload = (payment) => {
  if (!payment?.gateway_provider) return null;

  return {
    provider: payment.gateway_provider,
    channel: 'hosted_checkout',
    sessionId: payment.gateway_session_id || null,
    session_id: payment.gateway_session_id || null,
    referenceId: payment.gateway_reference_id || null,
    reference_id: payment.gateway_reference_id || null,
    paymentUrl: payment.gateway_payment_url || null,
    payment_url: payment.gateway_payment_url || null,
    paymentLinkUrl: payment.gateway_payment_url || null,
    payment_link_url: payment.gateway_payment_url || null,
    invoiceUrl: payment.gateway_payment_url || null,
    invoice_url: payment.gateway_payment_url || null,
    status: payment.gateway_status || null,
    paymentId: payment.gateway_payment_id || null,
    payment_id: payment.gateway_payment_id || null,
    paymentRequestId: payment.gateway_payment_request_id || null,
    payment_request_id: payment.gateway_payment_request_id || null,
    expiresAt: payment.expires_at || null,
    expires_at: payment.expires_at || null,
    amount: normalizeAmount(payment.gateway_payload?.amount || 0),
    isXendit: payment.gateway_provider === 'XENDIT'
  };
};

const normalizePhoneForXendit = (phone) => {
  const value = String(phone || '').trim().replace(/[^0-9+]/g, '');
  if (!value) return undefined;
  if (value.startsWith('+')) return value;
  if (value.startsWith('0')) return `+62${value.slice(1)}`;
  if (value.startsWith('62')) return `+${value}`;
  return value;
};

const trimTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

const getFrontendBaseUrl = () => {
  return trimTrailingSlash(
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    process.env.VITE_FRONTEND_URL ||
    'http://localhost:5173'
  );
};

const getPublicBackendBaseUrl = () => {
  return trimTrailingSlash(
    process.env.PUBLIC_BACKEND_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    process.env.APP_URL ||
    ''
  );
};

const buildBackendPaymentBridgeUrl = (status) => {
  const backendUrl = getPublicBackendBaseUrl();
  if (!backendUrl) return null;

  // Gunakan path callback yang stabil diterima Xendit dan jangan kirim query panjang
  // ke Xendit. Query status/id akan dibuat ulang saat backend redirect ke frontend.
  return `${backendUrl}/payment/${status === 'success' ? 'success' : 'cancel'}`;
};

const normalizeUrlWithPaymentParams = (rawUrl, params = {}) => {
  const parsed = new URL(rawUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      parsed.searchParams.set(key, String(value));
    }
  });

  return parsed.toString();
};

const parseHttpsUrlForXendit = (rawUrl) => {
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
};

const buildXenditReturnUrl = ({ status, requestId, invoiceId, paymentId }) => {
  const envName = status === 'success' ? 'XENDIT_SUCCESS_RETURN_URL' : 'XENDIT_CANCEL_RETURN_URL';

  const configuredUrl = parseHttpsUrlForXendit(process.env[envName]);
  const backendBridgeUrl = parseHttpsUrlForXendit(buildBackendPaymentBridgeUrl(status));
  const baseUrl = configuredUrl || backendBridgeUrl;

  if (!baseUrl) {
    throw new Error(
      `${envName} atau PUBLIC_BACKEND_URL harus berupa URL HTTPS valid. ` +
        'Untuk frontend lokal, isi PUBLIC_BACKEND_URL dengan URL tunnel backend, lalu gunakan /payment/success dan /payment/cancel sebagai bridge.'
    );
  }

  // Return browser dari Xendit bukan webhook, tetapi query pendek ini penting agar backend
  // bisa sinkron ulang status sesi saat pelanggan kembali dari checkout.
  return normalizeUrlWithPaymentParams(baseUrl, {
    id_registrasi: requestId,
    id_invoice: invoiceId,
    id_payment: paymentId,
  });
};

const buildFrontendPaymentStatusUrl = ({ requestId, invoiceId, paymentId, status }) => {
  const frontendUrl = getFrontendBaseUrl();

  return normalizeUrlWithPaymentParams(`${frontendUrl}/pelanggan/status`, {
    payment: status,
    id_registrasi: requestId,
    registrasi: requestId,
    id_invoice: invoiceId,
    id_payment: paymentId
  });
};

const buildPaymentReturnUrls = ({ requestId, invoiceId, paymentId }) => ({
  success_return_url: buildXenditReturnUrl({ status: 'success', requestId, invoiceId, paymentId }),
  cancel_return_url: buildXenditReturnUrl({ status: 'failed', requestId, invoiceId, paymentId })
});

const buildXenditPaymentSessionPayload = ({
  requestJson,
  requestId,
  invoice,
  payment,
  amount,
  referenceId,
  paymentMethod = null
}) => {
  const pelanggan = requestJson.pelanggan || requestJson.Pelanggan || {};
  const expiresInMinutes = Number(process.env.XENDIT_SESSION_DURATION_MINUTES || 30);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const payload = {
    reference_id: referenceId,
    session_type: 'PAY',
    mode: 'PAYMENT_LINK',
    amount: Math.round(amount),
    currency: 'IDR',
    country: 'ID',
    capture_method: 'AUTOMATIC',
    locale: process.env.XENDIT_LOCALE || 'id',
    description: `Pembayaran invoice ${invoice.id_invoice}`,
    expires_at: expiresAt.toISOString(),
    ...buildPaymentReturnUrls({
      requestId,
      invoiceId: invoice.id_invoice,
      paymentId: payment.id_payment
    }),
    customer: {
      reference_id: `CUST-${requestId}-${payment.id_payment}-${Date.now()}`.slice(0, 64),
      type: 'INDIVIDUAL',
      email: pelanggan.email_kontak,
      mobile_number: normalizePhoneForXendit(pelanggan.no_telp),
      individual_detail: {
        given_names: pelanggan.pic || pelanggan.nama_instansi || 'Pelanggan'
      }
    },
    items: [
      {
        reference_id: `ITEM-${invoice.id_invoice}-${payment.id_payment}`.slice(0, 64),
        type: 'DIGITAL_SERVICE',
        name: `Jasa Pengujian Laboratorium ${invoice.id_invoice}`,
        net_unit_amount: Math.round(amount),
        quantity: 1,
        category: 'Laboratorium'
      }
    ],
    metadata: {
      id_registrasi: requestId,
      id_invoice: invoice.id_invoice,
      id_payment: payment.id_payment
    }
  };

  // If specific payment method is selected with a channel code, set allowed_payment_channels
  // This will restrict Xendit checkout to only show that payment method
  if (paymentMethod && paymentMethod.channel && !['hosted_checkout', 'bayar_nanti'].includes(paymentMethod.channel)) {
    payload.allowed_payment_channels = [paymentMethod.channel];
  }

  return payload;
};

module.exports = {
  buildFrontendPaymentStatusUrl,
  buildPaymentGatewayPayload,
  buildPaymentReturnUrls,
  buildXenditPaymentSessionPayload,
  getFrontendBaseUrl,
  getPublicBackendBaseUrl,
  normalizePhoneForXendit,
};
