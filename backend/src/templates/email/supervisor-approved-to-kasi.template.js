const { buildEmailResponse } = require('./email-layout.template');

function pickDisplayName(user = {}) {
  return user?.nama_pegawai || user?.username || user?.nik || 'Kasi Pengujian';
}

function formatSampleList(sampleNos = []) {
  if (!Array.isArray(sampleNos) || !sampleNos.length) return '-';
  return sampleNos.filter(Boolean).join(', ') || '-';
}

function formatRevisionItems(items = []) {
  if (!Array.isArray(items) || !items.length) return '-';

  return items
    .map((item, index) => {
      const noSampel = item.no_sampel || item.noSampel || '-';
      const parameter = item.nama_parameter || item.namaParameter || '-';
      const metode = item.acuan_metode || item.acuanMetode || item.nama_metode || item.namaMetode || '-';
      const catatan = item.catatan_revisi || item.catatanRevisi || item.catatan || '-';

      return [
        `${index + 1}. Sampel ${noSampel} - ${parameter}`,
        `   Metode: ${metode}`,
        `   Catatan revisi Kasi: ${catatan}`,
      ].join('\n');
    })
    .join('\n');
}

function buildSupervisorApprovedToKasiEmail({
  penerima = {},
  fppl = {},
  idRegistrasi = '',
  nomorFppl = '',
  sampleNos = [],
  totalSample = 0,
  totalParameter = 0,
  reviewLink = null,
}) {
  const namaKasi = pickDisplayName(penerima);
  const registrasi = idRegistrasi || fppl?.id_registrasi || '-';
  const fpplNo = nomorFppl || fppl?.nomor_fppl || registrasi;
  const daftarSampel = formatSampleList(sampleNos);
  const subject = `Permohonan siap direview Kasi Pengujian - ${fpplNo}`;

  const body = [
    `Yth. ${namaKasi},`,
    '',
    'Penyelia telah menyetujui seluruh hasil pengujian untuk satu permohonan.',
    'Permohonan ini sudah siap direview oleh Kasi Pengujian.',
    '',
    `ID Registrasi      : ${registrasi}`,
    `Nomor FPPL         : ${fpplNo}`,
    `Jumlah sampel      : ${totalSample || sampleNos.length || '-'}`,
    `Nomor sampel       : ${daftarSampel}`,
    `Total parameter    : ${totalParameter || '-'}`,
    '',
    reviewLink ? `Buka antrean review Kasi: ${reviewLink}` : null,
    'Silakan cek menu LHU / review hasil pada sistem.',
    '',
    'Terima kasih.',
  ].filter(Boolean).join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `Permohonan ${fpplNo} sudah lengkap dan siap direview Kasi Pengujian.`,
    actionUrl: reviewLink,
    actionLabel: 'Buka Review Kasi',
  });
}

function buildSupervisorApprovedKasiRevisionToKasiEmail({
  penerima = {},
  fppl = {},
  idRegistrasi = '',
  nomorFppl = '',
  sampleNos = [],
  items = [],
  reviewLink = null,
}) {
  const namaKasi = pickDisplayName(penerima);
  const registrasi = idRegistrasi || fppl?.id_registrasi || '-';
  const fpplNo = nomorFppl || fppl?.nomor_fppl || registrasi;
  const daftarSampel = formatSampleList(sampleNos);
  const subject = `Revisi hasil siap direview ulang Kasi - ${daftarSampel}`;

  const body = [
    `Yth. ${namaKasi},`,
    '',
    'Penyelia telah menyetujui perbaikan hasil dari revisi yang sebelumnya diajukan oleh Kasi Pengujian.',
    'Hasil revisi berikut sudah siap direview ulang oleh Kasi Pengujian.',
    '',
    `ID Registrasi      : ${registrasi}`,
    `Nomor FPPL         : ${fpplNo}`,
    `Nomor sampel       : ${daftarSampel}`,
    '',
    'Parameter yang direvisi:',
    formatRevisionItems(items),
    '',
    reviewLink ? `Buka review Kasi Pengujian: ${reviewLink}` : null,
    '',
    'Silakan cek kembali hasil revisi pada menu LHU / review hasil.',
    '',
    'Terima kasih.',
  ].filter((line) => line !== null).join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `Revisi sampel ${daftarSampel} sudah disetujui Penyelia dan siap direview ulang Kasi.`,
    actionUrl: reviewLink,
    actionLabel: 'Buka Review Kasi',
  });
}

module.exports = {
  buildSupervisorApprovedToKasiEmail,
  buildSupervisorApprovedKasiRevisionToKasiEmail,
};
