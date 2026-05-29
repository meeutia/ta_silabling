const { buildEmailResponse } = require('./email-layout.template');

function formatRupiah(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 'Rp 0';

  return `Rp ${new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(number)}`;
}

function formatTanggalIndonesia(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function buildInvoiceReadyEmail({ pelanggan, fppl, invoice, detailLink = null }) {
  const namaPenerima =
    pelanggan?.pic ||
    pelanggan?.nama_instansi ||
    pelanggan?.id_pelanggan ||
    'Pelanggan';

  const nomorPermohonan = fppl?.nomor_fppl || fppl?.id_registrasi || '-';
  const nomorInvoice = invoice?.id_invoice || invoice?.nomorInvoice || '-';
  const subtotalUji = Number(invoice?.subtotal_uji || invoice?.subtotalUji || 0);
  const subtotalPengambilan = Number(invoice?.subtotal_pengambilan || invoice?.subtotalPengambilan || 0);
  const totalTagihan = Number(invoice?.totalTagihan || subtotalUji + subtotalPengambilan || 0);

  const subject = `Invoice Pengujian Sudah Terbit - ${nomorPermohonan}`;

  const body = [
    `Yth. ${namaPenerima},`,
    '',
    `Invoice pengujian untuk permohonan ${nomorPermohonan} sudah terbit.`,
    '',
    `Nomor invoice: ${nomorInvoice}`,
    `Tanggal invoice: ${formatTanggalIndonesia(invoice?.tanggal_invoice || invoice?.tanggalTerbit)}`,
    `Subtotal pengujian: ${formatRupiah(subtotalUji)}`,
    `Biaya pengambilan sampel: ${formatRupiah(subtotalPengambilan)}`,
    `Total tagihan: ${formatRupiah(totalTagihan)}`,
    '',
    'Silakan buka aplikasi SILABLING untuk melihat rincian invoice dan melanjutkan pembayaran.',
    `Link detail permohonan: ${detailLink || '-'}`,
    '',
    'Terima kasih.',
  ].join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `Invoice untuk permohonan ${nomorPermohonan} sudah terbit.`,
    actionUrl: detailLink,
    actionLabel: 'Lihat Invoice',
  });
}

module.exports = {
  buildInvoiceReadyEmail,
};
