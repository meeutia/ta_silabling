const { buildEmailResponse } = require('./email-layout.template');

function displayName(user = {}) {
  return user?.nama_pegawai || user?.username || user?.nik || 'Penyelia';
}

function buildPenyeliaAssignmentNeededEmail({ penerima = {}, fppl = {}, pelanggan = {}, samples = [], detailLink = null }) {
  const nomorPermohonan = fppl.nomor_fppl || fppl.nomorFppl || fppl.id_registrasi || fppl.idRegistrasi || '-';
  const namaInstansi = pelanggan.nama_instansi || pelanggan.namaInstansi || '-';
  const namaPenerima = displayName(penerima);

  const sampleList = (samples || [])
    .map((sample, index) => {
      const noSampel = sample.no_sampel || sample.noSampel || '-';
      const jenis = sample.jenis_sampel || sample.jenisSampel || sample.jenis || '-';
      const totalParameter = sample.total_parameter || sample.totalParameter || null;
      return `${index + 1}. ${noSampel} — ${jenis}${totalParameter ? ` (${totalParameter} parameter)` : ''}`;
    })
    .join('\n');

  const subject = `Perlu Penugasan Pengujian Sampel - ${nomorPermohonan}`;

  const body = [
    `Yth. ${namaPenerima},`,
    '',
    'Sampel untuk permohonan berikut sudah diterima laboratorium dan perlu ditugaskan kepada analis.',
    '',
    `Nomor permohonan: ${nomorPermohonan}`,
    `Nama instansi: ${namaInstansi}`,
    'Daftar sampel masuk:',
    sampleList || '-',
    '',
    detailLink ? `Buka penugasan: ${detailLink}` : null,
    'Silakan buka menu Penyelia untuk membuat penugasan pengujian sampel.',
    '',
    'Terima kasih.',
  ]
    .filter(Boolean)
    .join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `Sampel permohonan ${nomorPermohonan} perlu ditugaskan ke analis.`,
    actionUrl: detailLink,
    actionLabel: 'Buka Penugasan',
  });
}

module.exports = {
  buildPenyeliaAssignmentNeededEmail,
};
