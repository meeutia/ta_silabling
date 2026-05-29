const { buildEmailResponse } = require('./email-layout.template');

function buildSampleReceivedEmail({ pelanggan = {}, fppl = {}, samples = [], detailLink = null } = {}) {
  const sampleRows = Array.isArray(samples) && samples.length
    ? samples.map((sample, index) => `${index + 1}. ${sample.no_sampel || sample.noSampel || sample}`).join('\n')
    : '-';

  const body = [
    `Yth. ${pelanggan.nama_pelanggan || pelanggan.nama_instansi || pelanggan.nama || 'Pelanggan'},`,
    '',
    'Sampel untuk permohonan pengujian Anda telah diterima oleh laboratorium.',
    '',
    `Nomor Permohonan : ${fppl.id_registrasi || '-'}`,
    'Nomor Sampel:',
    sampleRows,
    detailLink ? `Detail          : ${detailLink}` : null,
    '',
    'Tahap berikutnya adalah proses pengujian sesuai jadwal laboratorium.',
    '',
    'Terima kasih.',
  ].filter(Boolean).join('\n');

  const subject = 'Sampel Diterima Laboratorium';

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: 'Sampel untuk permohonan Anda sudah diterima laboratorium.',
    actionUrl: detailLink,
    actionLabel: 'Lihat Detail Permohonan',
  });
}

module.exports = { buildSampleReceivedEmail };
