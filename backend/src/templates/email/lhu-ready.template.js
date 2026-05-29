const { buildEmailResponse } = require('./email-layout.template');

function buildLhuReadyEmail({ pelanggan = {}, fppl = {}, lhu = {}, detailLink = null } = {}) {
  const body = [
    `Yth. ${pelanggan.nama_pelanggan || pelanggan.nama_instansi || pelanggan.nama || 'Pelanggan'},`,
    '',
    'Lembar Hasil Uji (LHU) untuk permohonan pengujian Anda telah disahkan.',
    '',
    `Nomor Permohonan : ${fppl.id_registrasi || '-'}`,
    `Nomor LHU        : ${lhu.nomor_lhu || lhu.nomorLhu || '-'}`,
    `Nomor Sampel     : ${lhu.no_sampel || lhu.noSampel || '-'}`,
    `Tanggal Terbit   : ${lhu.tanggal_penerbitan || '-'}`,
    detailLink ? `Detail          : ${detailLink}` : null,
    '',
    'Silakan memantau portal pelanggan untuk informasi pengambilan LHU.',
    '',
    'Terima kasih.',
  ].filter(Boolean).join('\n');

  const subject = 'LHU Sudah Disahkan';

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: 'LHU untuk permohonan Anda sudah disahkan.',
    actionUrl: detailLink,
    actionLabel: 'Lihat Detail Permohonan',
  });
}

module.exports = { buildLhuReadyEmail };
