const { buildEmailResponse } = require('./email-layout.template');

function resolveName(user, fallback) {
  return user?.nama_pegawai || user?.username || user?.nik || fallback;
}

function formatParameterItems(items = []) {
  if (!Array.isArray(items) || !items.length) return '-';

  return items
    .map((item, index) => {
      const parameter = item.nama_parameter || item.namaParameter || '-';
      const metode = item.acuan_metode || item.acuanMetode || item.nama_metode || item.namaMetode || '-';
      const catatan = item.catatan_revisi || item.catatanRevisi || item.catatan || '-';

      return `${index + 1}. ${parameter}\n   Metode: ${metode}\n   Catatan revisi: ${catatan}`;
    })
    .join('\n');
}

function buildKasiRevisionRejectedEmail({
  kasi,
  noSampel,
  catatanTinjauan,
  items = [],
  reviewLink = null,
}) {
  const namaKasi = resolveName(kasi, 'Kasi Pengujian');
  const sampleNo = noSampel || '-';
  const subject = `Revisi Ditolak Penyelia - ${sampleNo}`;

  const body = [
    `Yth. ${namaKasi},`,
    '',
    `Pengajuan revisi hasil pengujian untuk sampel ${sampleNo} ditolak oleh Penyelia.`,
    '',
    'Parameter/metode pada pengajuan revisi:',
    formatParameterItems(items),
    '',
    'Catatan Penyelia:',
    catatanTinjauan || '-',
    '',
    reviewLink ? `Link review Kasi Pengujian: ${reviewLink}` : null,
    '',
    'Status hasil dikembalikan ke antrean review Kasi Pengujian.',
    '',
    'Terima kasih.',
  ].filter((line) => line !== null).join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `Revisi sampel ${sampleNo} ditolak Penyelia dan kembali ke Kasi Pengujian.`,
    actionUrl: reviewLink,
    actionLabel: 'Buka Review Kasi',
  });
}

module.exports = {
  buildKasiRevisionRejectedEmail,
};
