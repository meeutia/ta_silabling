jest.mock('../../src/services/payment/payment-xendit.service', () => ({
  getAllowedXenditPaymentChannels: jest.fn(),
}));

const RequestStatus = require('../../src/constants/request-status');
const xendit = require('../../src/services/payment/payment-xendit.service');
const policy = require('../../src/services/payment/payment-policy.util');

describe('Unit Test - payment-policy.util', () => {
  beforeEach(() => {
    xendit.getAllowedXenditPaymentChannels.mockReturnValue([]);
  });

  test('normalizeGatewayStatus menormalkan spasi dan huruf kapital', () => {
    expect(policy.normalizeGatewayStatus(' completed ')).toBe('COMPLETED');
    expect(policy.normalizeGatewayStatus(null)).toBe('');
  });

  test('extractPaymentSequence membaca angka terakhir pada id pembayaran', () => {
    expect(policy.extractPaymentSequence('PAY-0012')).toBe(12);
    expect(policy.extractPaymentSequence('PAY-A')).toBeNull();
  });

  test('comparePaymentRowsDesc dan getLatestPaymentRow memilih pembayaran terbaru', () => {
    const rows = [{ id_payment: 'PAY-002' }, { id_payment: 'PAY-010' }, { id_payment: 'PAY-001' }];
    expect([...rows].sort(policy.comparePaymentRowsDesc).map((x) => x.id_payment)).toEqual(['PAY-010', 'PAY-002', 'PAY-001']);
    expect(policy.getLatestPaymentRow(rows)).toEqual({ id_payment: 'PAY-010' });
  });

  test('canMoveRequestToWaitingSampleAfterPayment membatasi status yang dapat dipindahkan', () => {
    expect(policy.canMoveRequestToWaitingSampleAfterPayment(RequestStatus.WAITING_PAYMENT)).toBe(true);
    expect(policy.canMoveRequestToWaitingSampleAfterPayment(RequestStatus.COMPLETED)).toBe(false);
  });

  test('isRequestAlreadyPastPayment mengenali status setelah pembayaran', () => {
    expect(policy.isRequestAlreadyPastPayment(RequestStatus.TESTING_PROCESS)).toBe(true);
    expect(policy.isRequestAlreadyPastPayment(RequestStatus.WAITING_PAYMENT)).toBe(false);
  });

  test('isInvoiceSettled menerima Lunas dan Bayar Nanti', () => {
    expect(policy.isInvoiceSettled({ status_invoice: 'Lunas' })).toBe(true);
    expect(policy.isInvoiceSettled({ status_invoice: 'Bayar Nanti' })).toBe(true);
    expect(policy.isInvoiceSettled({ status_invoice: 'Belum Dibayar' })).toBe(false);
  });

  test('isSettledPayment menerima paid_at atau gateway COMPLETED', () => {
    expect(policy.isSettledPayment({ paid_at: new Date() })).toBe(true);
    expect(policy.isSettledPayment({ gateway_status: 'completed' })).toBe(true);
    expect(policy.isSettledPayment(null)).toBe(false);
  });

  test('isDeferredPaymentAttempt mengenali metode Bayar Nanti', () => {
    expect(policy.isDeferredPaymentAttempt({ metode_bayar: 'MANUAL' })).toBe(true);
    expect(policy.isDeferredPaymentAttempt({ metode_bayar: 'Bayar Nanti' })).toBe(true);
    expect(policy.isDeferredPaymentAttempt({ metode_bayar: 'XENDIT_QRIS' })).toBe(false);
  });

  test('getPaymentLifecycleState membedakan none, deferred, settled, expired, active, dan inactive', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-03T00:00:00Z').getTime());
    expect(policy.getPaymentLifecycleState(null).state).toBe('none');
    expect(policy.getPaymentLifecycleState({ metode_bayar: 'MANUAL' }).state).toBe('deferred');
    expect(policy.getPaymentLifecycleState({ gateway_status: 'COMPLETED' }).state).toBe('settled');
    expect(policy.getPaymentLifecycleState({ expires_at: '2026-06-02T00:00:00Z' }).state).toBe('expired');
    expect(policy.getPaymentLifecycleState({ gateway_provider: 'XENDIT' }).state).toBe('active');
    expect(policy.getPaymentLifecycleState({ gateway_status: 'UNKNOWN' }).state).toBe('inactive');
  });

  test('deriveCustomerDecisionStatus memetakan status permohonan untuk pelanggan', () => {
    expect(policy.deriveCustomerDecisionStatus(RequestStatus.WAITING_PAYMENT)).toBe('Menunggu Pembayaran');
    expect(policy.deriveCustomerDecisionStatus(RequestStatus.TESTING_PROCESS)).toBe('Disetujui');
    expect(policy.deriveCustomerDecisionStatus(RequestStatus.REJECTED)).toBe('Dibatalkan');
    expect(policy.deriveCustomerDecisionStatus(RequestStatus.DRAFT)).toBe('Menunggu');
  });

  test('normalizeAmount mengubah angka string dan memberi fallback nol', () => {
    expect(policy.normalizeAmount('125000.50')).toBe(125000.5);
    expect(policy.normalizeAmount('salah')).toBe(0);
  });

  test('resolvePaymentMethod dan getAvailablePaymentMethods mematuhi kanal yang diizinkan', () => {
    expect(policy.resolvePaymentMethod('xendit_dana')).toMatchObject({ code: 'XENDIT_DANA', channel: 'DANA' });
    expect(policy.resolvePaymentMethod('XENDIT')).toMatchObject({ code: 'XENDIT_QRIS' });
    expect(policy.resolvePaymentMethod('PEMBAYARAN_AKHIR_ADMIN')).toMatchObject({ code: 'MANUAL' });
    expect(policy.resolvePaymentMethod('TIDAK_ADA')).toBeNull();
    xendit.getAllowedXenditPaymentChannels.mockReturnValue(['DANA']);
    expect(policy.getAvailablePaymentMethods()).toEqual([expect.objectContaining({ code: 'XENDIT_DANA' })]);
  });
});
