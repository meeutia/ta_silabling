jest.mock('../../src/services/payment/payment-xendit.service', () => ({
  getAllowedXenditPaymentChannels: jest.fn(() => []),
}));

const RequestStatus = require('../../src/constants/request-status');
const paymentXenditService = require('../../src/services/payment/payment-xendit.service');
const paymentPolicy = require('../../src/services/payment/payment-policy.util');
const paymentPayload = require('../../src/services/payment/payment-session-payload.util');

describe('Unit Test - service alur bisnis pembayaran dan invoice', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-30T08:00:00.000Z'));
    process.env = {
      ...OLD_ENV,
      FRONTEND_URL: 'https://silabling.example.test',
      PUBLIC_BACKEND_URL: 'https://api.silabling.example.test',
      XENDIT_SUCCESS_RETURN_URL: 'https://api.silabling.example.test/payment/success',
      XENDIT_CANCEL_RETURN_URL: 'https://api.silabling.example.test/payment/cancel',
      XENDIT_SESSION_DURATION_MINUTES: '30',
      XENDIT_LOCALE: 'id',
    };
    paymentXenditService.getAllowedXenditPaymentChannels.mockReturnValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  describe('kebijakan metode pembayaran', () => {
    test('resolvePaymentMethod mengenali QRIS, DANA, dan Bayar Nanti internal', () => {
      expect(paymentPolicy.resolvePaymentMethod('XENDIT_QRIS')).toMatchObject({ code: 'XENDIT_QRIS', channel: 'QRIS' });
      expect(paymentPolicy.resolvePaymentMethod('XENDIT_DANA')).toMatchObject({ code: 'XENDIT_DANA', channel: 'DANA' });
      expect(paymentPolicy.resolvePaymentMethod('Bayar Nanti')).toMatchObject({ code: 'MANUAL', label: 'Bayar Nanti' });
      expect(paymentPolicy.resolvePaymentMethod('tidak-valid')).toBeNull();
    });

    test('getAvailablePaymentMethods mengikuti channel Xendit yang dibuka', () => {
      paymentXenditService.getAllowedXenditPaymentChannels.mockReturnValue(['QRIS']);

      expect(paymentPolicy.getAvailablePaymentMethods()).toEqual([
        expect.objectContaining({ code: 'XENDIT_QRIS', channel: 'QRIS' }),
      ]);
    });

    test('getPaymentLifecycleState membedakan pembayaran deferred, settled, expired, active, dan inactive', () => {
      expect(paymentPolicy.getPaymentLifecycleState({ metode_bayar: 'MANUAL', gateway_status: '' })).toEqual({
        state: 'deferred',
        gatewayStatus: '',
      });

      expect(paymentPolicy.getPaymentLifecycleState({ gateway_status: 'COMPLETED' })).toEqual({
        state: 'settled',
        gatewayStatus: 'COMPLETED',
      });

      expect(paymentPolicy.getPaymentLifecycleState({ expires_at: '2026-05-30T07:59:00.000Z' })).toEqual({
        state: 'expired',
        gatewayStatus: 'EXPIRED',
      });

      expect(paymentPolicy.getPaymentLifecycleState({ gateway_provider: 'XENDIT', gateway_status: 'PENDING' })).toEqual({
        state: 'active',
        gatewayStatus: 'PENDING',
      });

      expect(paymentPolicy.getPaymentLifecycleState({ gateway_status: 'FAILED' })).toEqual({
        state: 'inactive',
        gatewayStatus: 'FAILED',
      });
    });

    test('status permohonan hanya boleh maju ke menunggu sampel dari status pembayaran yang benar', () => {
      expect(paymentPolicy.canMoveRequestToWaitingSampleAfterPayment(RequestStatus.WAITING_PAYMENT)).toBe(true);
      expect(paymentPolicy.canMoveRequestToWaitingSampleAfterPayment(RequestStatus.WAITING_PAYMENT_VERIFICATION)).toBe(true);
      expect(paymentPolicy.canMoveRequestToWaitingSampleAfterPayment(RequestStatus.WAITING_SAMPLE_DELIVERY)).toBe(true);
      expect(paymentPolicy.canMoveRequestToWaitingSampleAfterPayment(RequestStatus.TESTING_PROCESS)).toBe(false);
    });

    test('getLatestPaymentRow mengambil payment terbaru berdasarkan angka ID', () => {
      const latest = paymentPolicy.getLatestPaymentRow([
        { id_payment: 'PAY-0002' },
        { id_payment: 'PAY-0010' },
        { id_payment: 'PAY-0007' },
      ]);

      expect(latest).toEqual({ id_payment: 'PAY-0010' });
    });

    test('deriveCustomerDecisionStatus menampilkan keputusan pelanggan sesuai status FPPL', () => {
      expect(paymentPolicy.deriveCustomerDecisionStatus(RequestStatus.WAITING_PAYMENT)).toBe('Menunggu Pembayaran');
      expect(paymentPolicy.deriveCustomerDecisionStatus(RequestStatus.WAITING_SAMPLE_PICKUP)).toBe('Disetujui');
      expect(paymentPolicy.deriveCustomerDecisionStatus(RequestStatus.REJECTED_BY_ADMIN)).toBe(RequestStatus.REJECTED_BY_ADMIN);
      expect(paymentPolicy.deriveCustomerDecisionStatus(RequestStatus.DRAFT)).toBe('Menunggu');
    });
  });

  describe('payload payment gateway', () => {
    test('normalizePhoneForXendit mengubah nomor lokal menjadi format +62', () => {
      expect(paymentPayload.normalizePhoneForXendit('0812-3456-7890')).toBe('+6281234567890');
      expect(paymentPayload.normalizePhoneForXendit('6281234567890')).toBe('+6281234567890');
      expect(paymentPayload.normalizePhoneForXendit('+6281234567890')).toBe('+6281234567890');
      expect(paymentPayload.normalizePhoneForXendit('')).toBeUndefined();
    });

    test('buildPaymentGatewayPayload mengubah payment row menjadi payload frontend', () => {
      const result = paymentPayload.buildPaymentGatewayPayload({
        gateway_provider: 'XENDIT',
        gateway_session_id: 'sess-001',
        gateway_reference_id: 'REG-001-INV-001-PAY-001',
        gateway_payment_url: 'https://checkout.xendit.co/sess-001',
        gateway_status: 'ACTIVE',
        gateway_payload: { amount: '150000.50' },
        expires_at: '2026-05-30T08:30:00.000Z',
      });

      expect(result).toMatchObject({
        provider: 'XENDIT',
        channel: 'hosted_checkout',
        sessionId: 'sess-001',
        referenceId: 'REG-001-INV-001-PAY-001',
        paymentUrl: 'https://checkout.xendit.co/sess-001',
        status: 'ACTIVE',
        amount: 150000.5,
        isXendit: true,
      });
    });

    test('buildFrontendPaymentStatusUrl membentuk URL kembali ke halaman status pelanggan', () => {
      const result = paymentPayload.buildFrontendPaymentStatusUrl({
        requestId: 'REG-001',
        invoiceId: 'INV-001',
        paymentId: 'PAY-001',
        status: 'success',
      });

      expect(result).toBe('https://silabling.example.test/pelanggan/status?payment=success&id_registrasi=REG-001&registrasi=REG-001&id_invoice=INV-001&id_payment=PAY-001');
    });

    test('buildXenditPaymentSessionPayload membentuk payload sesi QRIS dengan return URL HTTPS', () => {
      const result = paymentPayload.buildXenditPaymentSessionPayload({
        requestJson: {
          pelanggan: {
            email_kontak: 'pelanggan@mail.test',
            no_telp: '081234567890',
            pic: 'Dewi',
            nama_instansi: 'PT Air Bersih',
          },
        },
        requestId: 'REG-001',
        invoice: { id_invoice: 'INV-001' },
        payment: { id_payment: 'PAY-001' },
        amount: 125000.4,
        referenceId: 'REG-001-INV-001-PAY-001',
        paymentMethod: { channel: 'QRIS' },
      });

      expect(result).toMatchObject({
        reference_id: 'REG-001-INV-001-PAY-001',
        session_type: 'PAY',
        mode: 'PAYMENT_LINK',
        amount: 125000,
        currency: 'IDR',
        country: 'ID',
        locale: 'id',
        description: 'Pembayaran invoice INV-001',
        customer: expect.objectContaining({
          email: 'pelanggan@mail.test',
          mobile_number: '+6281234567890',
          individual_detail: { given_names: 'Dewi' },
        }),
        metadata: {
          id_registrasi: 'REG-001',
          id_invoice: 'INV-001',
          id_payment: 'PAY-001',
        },
        allowed_payment_channels: ['QRIS'],
      });

      expect(result.success_return_url).toContain('https://api.silabling.example.test/payment/success');
      expect(result.success_return_url).toContain('id_payment=PAY-001');
      expect(result.cancel_return_url).toContain('https://api.silabling.example.test/payment/cancel');
      expect(result.expires_at).toBe('2026-05-30T08:30:00.000Z');
    });
  });
});
