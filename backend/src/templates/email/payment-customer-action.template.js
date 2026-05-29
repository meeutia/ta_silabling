const { buildEmailResponse } = require('./email-layout.template');

function formatCurrency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(number) ? number : 0);
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
    timeZoneName: 'short',
  }).format(date);
}

function getCustomerName(pelanggan = {}) {
  return (
    pelanggan.nama_instansi ||
    pelanggan.nama_pelanggan ||
    pelanggan.pic ||
    pelanggan.nama ||
    pelanggan.id_pelanggan ||
    'Pelanggan'
  );
}

function getInvoiceTotal(invoice = {}) {
  const explicitTotal = invoice.total_tagihan || invoice.total || invoice.grand_total;
  if (explicitTotal !== undefined && explicitTotal !== null && explicitTotal !== '') return explicitTotal;
  return Number(invoice.subtotal_uji || 0) + Number(invoice.subtotal_pengambilan || 0);
}

function buildPaymentCompletedAdminEmail({ penerima = {}, pelanggan = {}, fppl = {}, invoice = {}, payment = {}, detailLink = null } = {}) {
  const namaPenerima = penerima.nama_pegawai || penerima.username || penerima.nik || 'Admin';
  const customerName = getCustomerName(pelanggan);
  const idRegistrasi = fppl.id_registrasi || invoice.id_registrasi || '-';
  const subject = `Pembayaran Pelanggan Berhasil - ${idRegistrasi}`;

  const body = [
    `Yth. ${namaPenerima},`,
    '',
    'Pelanggan telah menyelesaikan pembayaran permohonan pengujian melalui payment gateway.',
    '',
    `Nomor registrasi : ${idRegistrasi}`,
    `Nomor FPPL       : ${fppl.nomor_fppl || '-'}`,
    `Pelanggan        : ${customerName}`,
    `Nomor invoice    : ${invoice.id_invoice || '-'}`,
    `Total tagihan    : ${formatCurrency(getInvoiceTotal(invoice))}`,
    `Metode bayar     : ${payment.metode_bayar || '-'}`,
    `Waktu bayar      : ${formatDateTime(payment.paid_at)}`,
    `Status berikutnya: ${fppl.status_fppl || '-'}`,
    detailLink ? `Detail admin     : ${detailLink}` : null,
    '',
    'Silakan lanjutkan proses permohonan sesuai status terbaru di sistem.',
    '',
    'Terima kasih.',
  ].filter(Boolean).join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `Pembayaran permohonan ${idRegistrasi} sudah berhasil.`,
    actionUrl: detailLink,
    actionLabel: 'Buka Detail Permohonan',
  });
}

function buildPaymentCompletedCustomerEmail({ pelanggan = {}, fppl = {}, invoice = {}, payment = {}, detailLink = null } = {}) {
  const customerName = getCustomerName(pelanggan);
  const idRegistrasi = fppl.id_registrasi || invoice.id_registrasi || '-';
  const subject = `Pembayaran Berhasil - ${idRegistrasi}`;

  const body = [
    `Yth. ${customerName},`,
    '',
    'Pembayaran permohonan pengujian Anda telah berhasil dikonfirmasi oleh sistem.',
    '',
    `Nomor registrasi : ${idRegistrasi}`,
    `Nomor FPPL       : ${fppl.nomor_fppl || '-'}`,
    `Nomor invoice    : ${invoice.id_invoice || '-'}`,
    `Total tagihan    : ${formatCurrency(getInvoiceTotal(invoice))}`,
    `Waktu bayar      : ${formatDateTime(payment.paid_at)}`,
    `Status terbaru   : ${fppl.status_fppl || '-'}`,
    detailLink ? `Detail          : ${detailLink}` : null,
    '',
    'Permohonan Anda akan dilanjutkan ke tahap penerimaan, pengantaran, atau pengambilan sampel sesuai alur layanan.',
    '',
    'Terima kasih.',
  ].filter(Boolean).join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `Pembayaran permohonan ${idRegistrasi} sudah berhasil.`,
    actionUrl: detailLink,
    actionLabel: 'Lihat Detail Permohonan',
  });
}

function buildCustomerCancellationAdminEmail({ penerima = {}, pelanggan = {}, fppl = {}, note = '', detailLink = null } = {}) {
  const namaPenerima = penerima.nama_pegawai || penerima.username || penerima.nik || 'Admin';
  const customerName = getCustomerName(pelanggan);
  const idRegistrasi = fppl.id_registrasi || '-';
  const subject = `Permohonan Dibatalkan Pelanggan - ${idRegistrasi}`;

  const body = [
    `Yth. ${namaPenerima},`,
    '',
    'Pelanggan telah membatalkan permohonan pengujian.',
    '',
    `Nomor registrasi : ${idRegistrasi}`,
    `Nomor FPPL       : ${fppl.nomor_fppl || '-'}`,
    `Pelanggan        : ${customerName}`,
    `Status terbaru   : ${fppl.status_fppl || 'Dibatalkan Pelanggan'}`,
    note ? `Catatan pelanggan: ${note}` : null,
    detailLink ? `Detail admin     : ${detailLink}` : null,
    '',
    'Permohonan tidak perlu diproses lebih lanjut kecuali ada tindak lanjut manual dari pelanggan.',
    '',
    'Terima kasih.',
  ].filter(Boolean).join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `Pelanggan membatalkan permohonan ${idRegistrasi}.`,
    actionUrl: detailLink,
    actionLabel: 'Buka Detail Permohonan',
  });
}

function buildCustomerCancellationCustomerEmail({ pelanggan = {}, fppl = {}, note = '', detailLink = null } = {}) {
  const customerName = getCustomerName(pelanggan);
  const idRegistrasi = fppl.id_registrasi || '-';
  const subject = `Permohonan Berhasil Dibatalkan - ${idRegistrasi}`;

  const body = [
    `Yth. ${customerName},`,
    '',
    'Permohonan pengujian Anda telah berhasil dibatalkan.',
    '',
    `Nomor registrasi : ${idRegistrasi}`,
    `Nomor FPPL       : ${fppl.nomor_fppl || '-'}`,
    `Status terbaru   : ${fppl.status_fppl || 'Dibatalkan Pelanggan'}`,
    note ? `Catatan         : ${note}` : null,
    detailLink ? `Detail          : ${detailLink}` : null,
    '',
    'Terima kasih.',
  ].filter(Boolean).join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `Permohonan ${idRegistrasi} berhasil dibatalkan.`,
    actionUrl: detailLink,
    actionLabel: 'Lihat Detail Permohonan',
  });
}

module.exports = {
  buildCustomerCancellationAdminEmail,
  buildCustomerCancellationCustomerEmail,
  buildPaymentCompletedAdminEmail,
  buildPaymentCompletedCustomerEmail,
};
