import {
  getRequestSamples,
  isTruthyFlag,
  pickDateFromObject,
  pickFirstDateValue,
  pickLatestDateValue,
  toArray,
} from './detailPermohonanCore';

export const getInvoiceFromRequest = (request) =>
  request?.invoice ||
  request?.Invoice ||
  request?.billing ||
  request?.Billing ||
  request?.invoiceSummary ||
  request?.invoice_summary ||
  request?.tagihan ||
  request?.Tagihan ||
  null;

export const getPaymentFromInvoice = (invoice) =>
  invoice?.payment ||
  invoice?.Payment ||
  invoice?.pembayaran ||
  invoice?.Pembayaran ||
  invoice?.paymentConfirmation ||
  invoice?.payment_confirmation ||
  invoice?.konfirmasiPembayaran ||
  invoice?.konfirmasi_pembayaran ||
  null;

export const getInvoiceNumber = (invoice) =>
  invoice?.nomorInvoice ||
  invoice?.nomor_invoice ||
  invoice?.noInvoice ||
  invoice?.no_invoice ||
  invoice?.kodeInvoice ||
  invoice?.kode_invoice ||
  invoice?.id_invoice ||
  invoice?.idInvoice ||
  '-';

export const getInvoiceIssueDate = (invoice) =>
  pickDateFromObject(invoice, [
    'tanggalTerbit',
    'tanggal_terbit',
    'tanggalInvoice',
    'tanggal_invoice',
    // Alias defensif untuk typo lama yang pernah muncul di beberapa payload/UI.
    'tanggal_invoce',
  ]);

export const getPaymentConfirmedDate = (invoice) => {
  const payment = getPaymentFromInvoice(invoice);

  return pickFirstDateValue(
    payment?.paid_at,
    payment?.paidAt,
    payment?.tanggal_bayar,
    payment?.tanggalBayar,
    payment?.verified_at,
    payment?.verifiedAt,
    payment?.tanggal_verifikasi,
    payment?.tanggalVerifikasi,
    invoice?.payment?.paid_at,
    invoice?.payment?.paidAt,
    invoice?.payment?.verified_at,
    invoice?.payment?.verifiedAt,
    invoice?.payment_verified_at,
    invoice?.paymentVerifiedAt,
    invoice?.paid_at,
    invoice?.paidAt,
    invoice?.verified_at,
    invoice?.verifiedAt
  );
};

export const getPaymentStatusLabel = (invoice) => {
  const payment = getPaymentFromInvoice(invoice);
  const statusInvoice = String(invoice?.status_invoice || invoice?.statusInvoice || '').toLowerCase();
  const metodeBayar = String(payment?.metode_bayar || payment?.metodeBayar || '').toUpperCase();
  const deferredFlag = Boolean(
    invoice?.isDeferredByAdmin ||
      invoice?.is_deferred_by_admin ||
      payment?.isDeferredByAdmin ||
      payment?.is_deferred_by_admin ||
      payment?.pembayaran_di_akhir ||
      payment?.deferredByAdmin
  );

  if (statusInvoice.includes('Bayar Nanti') || ['PEMBAYARAN_AKHIR_ADMIN', 'MANUAL', 'BAYAR_NANTI'].includes(metodeBayar) || deferredFlag) {
    return 'Bayar Nanti';
  }

  if (statusInvoice.includes('lunas')) {
    return 'Lunas';
  }

  return 'Lunas';
};

export const getPaymentTimelineNote = (invoice) => {
  const paymentStatus = getPaymentStatusLabel(invoice);

  if (paymentStatus === 'Bayar Nanti') {
    return 'Status pembayaran: Bayar Nanti. Skema ini telah dicatat oleh admin.';
  }

  return 'Status pembayaran: Lunas. Pembayaran dikonfirmasi otomatis oleh payment gateway.';
};

const getParameterMethodRowsFromRequest = (request) =>
  getRequestSamples(request).flatMap((sample) =>
    toArray(
      sample?.fppl_parameter_metodes ||
        sample?.FpplParameterMetodes ||
        sample?.fpplParameterMetodes
    )
  );

export const getMethodDecisionDateFromRequest = (request) =>
  pickLatestDateValue(
    getParameterMethodRowsFromRequest(request).map((row) =>
      pickFirstDateValue(row?.dipilih_pada, row?.dipilihPada)
    )
  );

export const normalizeInvoiceForDetail = (invoice) => {
  if (!invoice) return null;

  const payment = getPaymentFromInvoice(invoice);
  const paidAt = getPaymentConfirmedDate(invoice);
  const tanggalTerbit = getInvoiceIssueDate(invoice);
  const nomorInvoice = getInvoiceNumber(invoice);
  const totalTagihan =
    invoice?.totalTagihan ??
    invoice?.total_tagihan ??
    invoice?.grand_total ??
    invoice?.grandTotal ??
    invoice?.total ??
    invoice?.jumlah_tagihan ??
    invoice?.jumlahTagihan;

  const rincian = invoice?.rincian || invoice?.rincianBiaya || invoice?.rincian_biaya || null;

  return {
    ...invoice,
    nomorInvoice,
    tanggalTerbit,
    totalTagihan,
    rincian,
    payment: payment
      ? {
          ...payment,
          paidAt: paidAt || payment?.paidAt || payment?.paid_at || null,
          methodLabel:
            (String(payment?.methodLabel || payment?.method_label || payment?.metodePembayaran || payment?.metode_pembayaran || '').toUpperCase() === 'MANUAL'
              ? 'Bayar Nanti'
              : payment?.methodLabel ||
                payment?.method_label ||
                payment?.metodePembayaran) ||
            payment?.metode_pembayaran ||
            payment?.payment_method ||
            payment?.paymentMethod ||
            payment?.gateway ||
            '-',
          adminNote:
            payment?.adminNote ||
            payment?.admin_note ||
            payment?.catatan_admin ||
            payment?.catatanAdmin ||
            '',
          isDeferredByAdmin:
            payment?.isDeferredByAdmin ||
            payment?.is_deferred_by_admin ||
            payment?.pembayaran_di_akhir ||
            payment?.deferredByAdmin ||
            false,
        }
      : null,
  };
};

export const getSampleParameterMethods = (requestSample) =>
  requestSample?.FpplParameterMetodes ||
  requestSample?.fppl_parameter_metodes ||
  requestSample?.fpplParameterMetodes ||
  [];

export const getSampleTypeName = (requestSample) => {
  const sampleType =
    requestSample?.JenisSampel ||
    requestSample?.jenis_sampel ||
    requestSample?.jenisSampel;

  if (!sampleType) return requestSample?.id_jenis_sampel || '-';
  if (typeof sampleType === 'string') return sampleType;

  return sampleType?.jenis_sampel || sampleType?.jenisSampel || '-';
};

export const getRegBmLabel = (requestSample) => {
  const reg =
    requestSample?.RegBm ||
    requestSample?.reg_bm ||
    requestSample?.regBm;

  if (!reg) return requestSample?.id_reg_bm || '-';
  if (typeof reg === 'string') return reg;

  const instansi = reg?.instansi || '';
  const ref = reg?.ref_reg || reg?.refReg || reg?.id_reg_bm || '';

  return [instansi, ref].filter(Boolean).join(' - ') || reg?.id_reg_bm || '-';
};

export const getParameterName = (fpm) =>
  fpm?.parameter?.nama_parameter ||
  fpm?.Parameter?.nama_parameter ||
  fpm?.ParameterMetode?.Parameter?.nama_parameter ||
  fpm?.parameter_metode?.parameter?.nama_parameter ||
  'Parameter';

export const getMethodName = (fpm) =>
  fpm?.Metode?.nama_metode ||
  fpm?.metode?.nama_metode ||
  fpm?.parameter_metode?.metode?.nama_metode ||
  fpm?.parameter_metode?.Metode?.nama_metode ||
  fpm?.parameterMetode?.metode?.nama_metode ||
  fpm?.parameterMetode?.Metode?.nama_metode ||
  fpm?.ParameterMetode?.metode?.nama_metode ||
  fpm?.ParameterMetode?.Metode?.nama_metode ||
  '-';

export const calculateInvoiceTotal = (invoice) => {
  const subtotalUji = Number(invoice?.subtotal_uji || invoice?.subtotalUji || 0);
  const subtotalPengambilan = Number(invoice?.subtotal_pengambilan || invoice?.subtotalPengambilan || 0);
  return subtotalUji + subtotalPengambilan;
};

export const isInvoiceItemSubkontrak = (item) => (
  isTruthyFlag(item?.isSubkontrak) ||
  isTruthyFlag(item?.is_subkontrak_snapshot) ||
  String(item?.statusKemampuanLab || '').toUpperCase() === 'TIDAK_MAMPU'
);

export const getInvoiceItemQty = (item) =>
  Number(item?.qty || item?.jumlahSampel || item?.jumlah_sampel || 1) || 1;

export const getInvoiceItemSubtotal = (item) => {
  const explicitSubtotal = item?.subtotal ?? item?.jumlahBiaya ?? item?.jumlah_biaya;

  if (explicitSubtotal !== undefined && explicitSubtotal !== null) {
    return Number(explicitSubtotal || 0);
  }

  return Number(item?.harga || 0) * getInvoiceItemQty(item);
};

export const getParameterPrice = (fpm) => Number(
  fpm?.tarif_snapshot ??
    fpm?.tarifSnapshot ??
    fpm?.parameter_metode?.tarif ??
    fpm?.parameterMetode?.tarif ??
    fpm?.ParameterMetode?.tarif ??
    0
);

export const isParameterSubkontrak = (fpm) => (
  isTruthyFlag(fpm?.is_subkontrak_snapshot) ||
  isTruthyFlag(fpm?.isSubkontrak) ||
  isTruthyFlag(fpm?.parameter_metode?.is_subkontrak) ||
  isTruthyFlag(fpm?.parameterMetode?.is_subkontrak) ||
  isTruthyFlag(fpm?.ParameterMetode?.is_subkontrak) ||
  String(fpm?.status_kemampuan_lab || fpm?.statusKemampuanLab || '').toUpperCase() === 'TIDAK_MAMPU'
);

export const getKasiPengujianNote = (fpm) => (
  fpm?.catatan_kemampuan ||
  fpm?.catatanKemampuan ||
  fpm?.catatan_kasi_pengujian ||
  fpm?.catatanKasiPengujian ||
  '-'
);

export const getAllParameterMethodsFromRequest = (request) =>
  getRequestSamples(request).flatMap((requestSample) =>
    getSampleParameterMethods(requestSample)
  );

export const hasMethodAndTariffDetermined = (request) => {
  const rows = getAllParameterMethodsFromRequest(request);

  if (rows.length === 0) return false;

  return rows.every((fpm) => {
    const idMetodeParameter =
      fpm?.id_metode_parameter ||
      fpm?.idMetodeParameter ||
      fpm?.parameter_metode?.id_metode_parameter ||
      fpm?.parameterMetode?.id_metode_parameter ||
      fpm?.ParameterMetode?.id_metode_parameter ||
      null;

    const tarif =
      fpm?.tarif_snapshot ??
      fpm?.tarifSnapshot ??
      fpm?.parameter_metode?.tarif ??
      fpm?.parameterMetode?.tarif ??
      fpm?.ParameterMetode?.tarif ??
      null;

    return (
      Boolean(idMetodeParameter) &&
      tarif !== null &&
      tarif !== undefined &&
      String(tarif).trim() !== ''
    );
  });
};
