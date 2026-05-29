const { buildEmailResponse } = require('./email-layout.template');

function buildAnalystSubmitToSupervisorEmail({
  penyelia,
  analis,
  sampleNos = [],
  totalSelesai = 0,
  reviewLink = null,
}) {
  const namaPenyelia =
    penyelia?.nama_pegawai ||
    penyelia?.username ||
    penyelia?.nik ||
    'Penyelia';

  const namaAnalis =
    analis?.username ||
    analis?.nama_pegawai ||
    analis?.nik ||
    'Analis';

  const daftarSampel = Array.isArray(sampleNos) && sampleNos.length
    ? sampleNos.join(', ')
    : '-';

  const subject = `Review Hasil Analis - ${daftarSampel}`;

  const body = [
    `Yth. ${namaPenyelia},`,
    '',
    'Analis telah menyelesaikan pengisian hasil dan mengirimkan worksheet untuk direview.',
    '',
    `Nomor sampel: ${daftarSampel}`,
    `Analis: ${namaAnalis}`,
    `Jumlah parameter/metode yang selesai: ${Number(totalSelesai || 0)}`,
    `Link review Penyelia: ${reviewLink || '-'}`,
    '',
    'Terima kasih.',
  ].join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: 'Worksheet analis menunggu review Penyelia.',
    actionUrl: reviewLink,
    actionLabel: 'Buka Review Penyelia',
  });
}

module.exports = {
  buildAnalystSubmitToSupervisorEmail,
};
