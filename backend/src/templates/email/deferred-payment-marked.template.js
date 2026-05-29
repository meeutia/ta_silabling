const { buildEmailResponse } = require('./email-layout.template');

function formatCurrency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(number) ? number : 0);
}

function buildDeferredPaymentMarkedEmail({ pelanggan = {}, fppl = {}, invoice = {}, note = '', detailLink = null } = {}) {
  const subject = 'Skema Bayar Nanti Dicatat';
  const customerName = pelanggan.nama_pelanggan || pelanggan.nama_instansi || pelanggan.nama || 'Pelanggan';

  const body = [
    `Yth. ${customerName},`,
    '',
    'Permohonan pengujian Anda telah dicatat menggunakan skema Bayar Nanti oleh admin.',
    '',
    `Nomor Permohonan : ${fppl.id_registrasi || '-'}`,
    `Nomor Invoice    : ${invoice.id_invoice || invoice.idInvoice || invoice.nomorInvoice || invoice.nomor_invoice || invoice.no_invoice || '-'}`,
    `Total Tagihan    : ${formatCurrency(invoice.total_tagihan || invoice.total || invoice.grand_total || 0)}`,
    note ? `Catatan         : ${note}` : null,
    detailLink ? `Detail          : ${detailLink}` : null,
    '',
    'Permohonan dilanjutkan ke tahap penerimaan atau pengambilan sampel sesuai jadwal yang telah ditetapkan.',
    '',
    'Terima kasih.',
  ].filter(Boolean).join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: 'Skema Bayar Nanti untuk permohonan pengujian sudah dicatat.',
    actionUrl: detailLink,
    actionLabel: 'Lihat Detail Permohonan',
  });
}

module.exports = { buildDeferredPaymentMarkedEmail };
