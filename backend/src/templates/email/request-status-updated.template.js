const { buildEmailResponse } = require('./email-layout.template');

function buildRequestStatusUpdatedEmail({
  pelanggan,
  idRegistrasi,
  statusTerbaru,
  detailLink = null,
}) {
  const namaPelanggan =
    pelanggan?.nama_instansi ||
    pelanggan?.pic ||
    pelanggan?.id_pelanggan ||
    'Pelanggan';

  const subject = `Status Permohonan Diperbarui - ${idRegistrasi}`;

  const body = [
    `Yth. ${namaPelanggan},`,
    '',
    'Status permohonan Anda telah diperbarui.',
    '',
    `Nomor registrasi: ${idRegistrasi}`,
    `Status terbaru: ${statusTerbaru}`,
    `Link detail permohonan: ${detailLink || '-'}`,
    '',
    'Terima kasih.',
  ].join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `Status permohonan ${idRegistrasi} diperbarui.`,
    actionUrl: detailLink,
    actionLabel: 'Lihat Detail Permohonan',
  });
}

module.exports = {
  buildRequestStatusUpdatedEmail,
};
