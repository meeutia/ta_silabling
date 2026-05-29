const { buildEmailResponse } = require('./email-layout.template');

function buildSubcontractResultEntryEmail({ penerima, idRegistrasi = null, items = [] }) {
  const nama =
    penerima?.nama_pegawai ||
    penerima?.username ||
    penerima?.nik ||
    'Penyelia';

  const totalItem = Array.isArray(items) ? items.length : 0;
  const requestLabel = idRegistrasi ? ` untuk permohonan ${idRegistrasi}` : '';

  const daftarItem = Array.isArray(items) && items.length
    ? items.map((item, index) => {
        const noSampel = item.no_sampel || item.noSampel || '-';
        const parameter = item.nama_parameter || item.namaParameter || '-';
        const metode = item.acuan_metode || item.acuanMetode || item.nama_metode || item.namaMetode || '-';

        return `${index + 1}. Sampel: ${noSampel}
   Parameter: ${parameter}
   Metode: ${metode}`;
      }).join('\n\n')
    : '-';

  const subject = `Pengisian Hasil Subkontrak Perlu Dilakukan${requestLabel} (${totalItem} item)`;

  const body = [
    `Yth. ${nama},`,
    '',
    `Terdapat hasil pengujian subkontrak${requestLabel} yang perlu diisi pada sistem.`,
    '',
    'Daftar item:',
    daftarItem,
    '',
    'Mohon segera mengisi hasil subkontrak melalui menu Hasil Subkontrak.',
    '',
    'Terima kasih.',
  ].join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `${totalItem} hasil subkontrak perlu diisi.`,
  });
}

module.exports = {
  buildSubcontractResultEntryEmail,
};