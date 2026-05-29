const { buildEmailResponse } = require('./email-layout.template');

function buildTestResultRevisionByPenyeliaEmail({
  analis,
  noSampel = [],
  catatanRevisi,
  items = [],
  testingLink = null,
}) {
  const namaAnalis = analis?.username || analis?.nama_pegawai || analis?.nik || 'Analis';
  const sampleList = Array.isArray(noSampel) ? noSampel.filter(Boolean).join(', ') : noSampel || '-';
  const subject = `Revisi Worksheet dari Penyelia - ${sampleList || '-'}`;

  const daftarParameter = items.length
    ? items
        .map((item, index) => {
          const parameter = item.nama_parameter || item.namaParameter || '-';
          const metode = item.acuan_metode || item.acuanMetode || item.nama_metode || item.namaMetode || '-';
          return `${index + 1}. ${parameter}\n   Metode: ${metode}`;
        })
        .join('\n')
    : '-';

  const body = [
    `Yth. ${namaAnalis},`,
    '',
    `Penyelia meminta revisi worksheet/hasil pengujian untuk sampel ${sampleList || '-'}.`,
    '',
    'Parameter/metode yang perlu direvisi:',
    daftarParameter,
    '',
    'Catatan revisi:',
    catatanRevisi || '-',
    '',
    `Link tugas pengujian: ${testingLink || '-'}`,
    '',
    'Mohon segera lakukan perbaikan pada sistem.',
    '',
    'Terima kasih.',
  ].join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `Revisi worksheet untuk sampel ${sampleList || '-'}.`,
    actionUrl: testingLink,
    actionLabel: 'Buka Tugas Pengujian',
  });
}

module.exports = {
  buildTestResultRevisionByPenyeliaEmail,
};
