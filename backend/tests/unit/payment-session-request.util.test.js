const util = require('../../src/services/payment/payment-session-request.util');

describe('Unit Test - payment-session-request.util', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-03T00:00:00.000Z'));
    process.env = {
      ...OLD_ENV,
      FRONTEND_URL: 'http://localhost:5173/',
      PUBLIC_BACKEND_URL: 'https://backend.test/',
      XENDIT_SESSION_DURATION_MINUTES: '30',
    };
    delete process.env.XENDIT_SUCCESS_RETURN_URL;
    delete process.env.XENDIT_CANCEL_RETURN_URL;
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = OLD_ENV;
  });

  test('buildPaymentGatewayRequestData mengembalikan null tanpa provider', () => {
    expect(util.buildPaymentGatewayRequestData(null)).toBeNull();
    expect(util.buildPaymentGatewayRequestData({})).toBeNull();
  });

  test('buildPaymentGatewayRequestData membentuk ringkasan gateway dari payment', () => {
    expect(util.buildPaymentGatewayRequestData({
      gateway_provider: 'XENDIT', gateway_session_id: 'SES-1', gateway_reference_id: 'REF-1',
      gateway_payment_url: 'https://pay.test', gateway_status: 'ACTIVE', gateway_payment_id: 'XP-1',
      gateway_payment_request_id: 'XR-1', expires_at: '2026-06-03T01:00:00Z', gatewayData: { amount: '25000' },
    })).toEqual({
      provider: 'XENDIT', channel: 'hosted_checkout', sessionId: 'SES-1', referenceId: 'REF-1',
      paymentUrl: 'https://pay.test', paymentLinkUrl: 'https://pay.test', invoiceUrl: 'https://pay.test',
      status: 'ACTIVE', paymentId: 'XP-1', paymentRequestId: 'XR-1', expiresAt: '2026-06-03T01:00:00Z',
      amount: 25000, isXendit: true,
    });
  });

  test('normalizePhoneForXendit menormalkan nomor Indonesia', () => {
    expect(util.normalizePhoneForXendit('0812-3456')).toBe('+628123456');
    expect(util.normalizePhoneForXendit('62812 3456')).toBe('+628123456');
    expect(util.normalizePhoneForXendit('+628123456')).toBe('+628123456');
    expect(util.normalizePhoneForXendit('')).toBeUndefined();
  });

  test('helper base URL membuang slash akhir dan memakai fallback env', () => {
    expect(util.trimTrailingSlash('https://a.test///')).toBe('https://a.test');
    expect(util.getFrontendBaseUrl()).toBe('http://localhost:5173');
    expect(util.getPublicBackendBaseUrl()).toBe('https://backend.test');
  });

  test('buildBackendPaymentBridgeUrl membentuk endpoint success dan cancel', () => {
    expect(util.buildBackendPaymentBridgeUrl('success')).toBe('https://backend.test/payment/success');
    expect(util.buildBackendPaymentBridgeUrl('failed')).toBe('https://backend.test/payment/cancel');
  });

  test('parseHttpsUrlForXendit dan buildXenditReturnUrl hanya menerima HTTPS', () => {
    expect(util.parseHttpsUrlForXendit('http://backend.test')).toBeNull();
    expect(util.parseHttpsUrlForXendit('https://backend.test/a')).toBe('https://backend.test/a');
    expect(util.buildXenditReturnUrl({ status: 'success', requestId: 'REG-1', invoiceId: 'INV-1', paymentId: 'PAY-1' }))
      .toBe('https://backend.test/payment/success?id_registrasi=REG-1&id_invoice=INV-1&id_payment=PAY-1');
  });

  test('buildFrontendPaymentStatusUrl dan buildPaymentReturnUrls membawa ID transaksi', () => {
    expect(util.buildFrontendPaymentStatusUrl({ requestId: 'REG-1', invoiceId: 'INV-1', paymentId: 'PAY-1', status: 'success' }))
      .toContain('/pelanggan/status?payment=success&id_registrasi=REG-1&registrasi=REG-1&id_invoice=INV-1&id_payment=PAY-1');
    expect(util.buildPaymentReturnUrls({ requestId: 'REG-1', invoiceId: 'INV-1', paymentId: 'PAY-1' }))
      .toEqual(expect.objectContaining({ success_return_url: expect.stringContaining('/payment/success'), cancel_return_url: expect.stringContaining('/payment/cancel') }));
  });

  test('buildXenditPaymentSessionRequestData membentuk payload checkout dan pembatasan kanal', () => {
    const result = util.buildXenditPaymentSessionRequestData({
      requestJson: { pelanggan: { email_kontak: 'user@mail.test', no_telp: '0812345', pic: 'Budi' } },
      requestId: 'REG-1', invoice: { id_invoice: 'INV-1' }, payment: { id_payment: 'PAY-1' },
      amount: 125000.4, referenceId: 'REF-1', paymentMethod: { channel: 'QRIS' },
    });
    expect(result).toMatchObject({
      reference_id: 'REF-1', session_type: 'PAY', mode: 'PAYMENT_LINK', amount: 125000,
      currency: 'IDR', country: 'ID', allowed_payment_channels: ['QRIS'],
      customer: { email: 'user@mail.test', mobile_number: '+62812345', individual_detail: { given_names: 'Budi' } },
      metadata: { id_registrasi: 'REG-1', id_invoice: 'INV-1', id_payment: 'PAY-1' },
    });
    expect(result.expires_at).toBe('2026-06-03T00:30:00.000Z');
    expect(result.items[0]).toMatchObject({ net_unit_amount: 125000, quantity: 1 });
  });
});
