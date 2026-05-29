const { buildEmailResponse } = require('./email-layout.template');

function formatTanggalIndonesia(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '-');
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function displayName(user = {}) {
  return user?.nama_pegawai || user?.username || user?.nik || 'Kasi Pengujian';
}

function buildKasiMethodNeededEmail({ penerima = {}, fppl = {}, pelanggan = {}, sampleSummary = [], detailLink = null }) {
  const nomorPermohonan = fppl.nomor_fppl || fppl.nomorFppl || fppl.id_registrasi || fppl.idRegistrasi || '-';
  const namaInstansi = pelanggan.nama_instansi || pelanggan.namaInstansi || '-';
  const tanggalVerifikasi = formatTanggalIndonesia(fppl.tanggal_verifikasi || fppl.tanggalVerifikasi || fppl.tanggal_pendaftaran);
  const namaPenerima = displayName(penerima);

  const daftarSampel = (sampleSummary || [])
    .map((item, index) => {
      const jenis = item.jenis_sampel || item.jenisSampel || '-';
      const jumlah = item.jumlah_sampel || item.jumlahSampel || 1;
      return `${index + 1}. ${jenis} — ${jumlah} sampel`;
    })
    .join('\n');

  const subject = `Perlu Penentuan Metode - ${nomorPermohonan}`;

  const body = [
    `Yth. ${namaPenerima},`,
    '',
    'Ada permohonan yang sudah diverifikasi admin dan menunggu penentuan metode pengujian.',
    '',
    `Nomor permohonan: ${nomorPermohonan}`,
    `Nama instansi: ${namaInstansi}`,
    `Tanggal verifikasi: ${tanggalVerifikasi}`,
    '',
    daftarSampel ? 'Ringkasan sampel:' : null,
    daftarSampel || null,
    '',
    'Silakan buka menu Kasi Pengujian untuk menentukan metode yang masuk.',
    '',
    'Terima kasih.',
  ]
    .filter(Boolean)
    .join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `Permohonan ${nomorPermohonan} menunggu penentuan metode.`,
    actionUrl: detailLink,
    actionLabel: 'Buka Detail Permohonan',
  });
}

module.exports = {
  buildKasiMethodNeededEmail,
};
