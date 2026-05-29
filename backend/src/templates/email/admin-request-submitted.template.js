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
  return user?.nama_pegawai || user?.username || user?.nik || 'Admin';
}

function buildAdminRequestSubmittedEmail({ penerima = {}, fppl = {}, pelanggan = {}, sampleSummary = [], detailLink = null }) {
  const nomorPermohonan = fppl.nomor_fppl || fppl.nomorFppl || fppl.id_registrasi || fppl.idRegistrasi || '-';
  const namaInstansi = pelanggan.nama_instansi || pelanggan.namaInstansi || pelanggan.nama_pelanggan || '-';
  const pic = pelanggan.pic || pelanggan.nama_pic || '-';
  const tanggalPendaftaran = formatTanggalIndonesia(fppl.tanggal_pendaftaran || fppl.tanggalPendaftaran || new Date());
  const namaPenerima = displayName(penerima);

  const daftarSampel = (sampleSummary || [])
    .map((item, index) => {
      const jenis = item.jenis_sampel || item.jenisSampel || '-';
      const jumlah = item.jumlah_sampel || item.jumlahSampel || 1;
      return `${index + 1}. ${jenis} — ${jumlah} sampel`;
    })
    .join('\n');

  const subject = `Permohonan Baru Masuk - ${nomorPermohonan}`;

  const body = [
    `Yth. ${namaPenerima},`,
    '',
    'Ada permohonan pengujian baru dari pelanggan dan menunggu verifikasi admin.',
    '',
    `Nomor permohonan: ${nomorPermohonan}`,
    `Nama instansi: ${namaInstansi}`,
    `PIC: ${pic}`,
    `Tanggal pendaftaran: ${tanggalPendaftaran}`,
    '',
    daftarSampel ? 'Ringkasan sampel:' : null,
    daftarSampel || null,
    '',
    'Silakan buka menu Admin untuk memeriksa kelengkapan dan memverifikasi permohonan.',
    '',
    'Terima kasih.',
  ]
    .filter(Boolean)
    .join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `Permohonan ${nomorPermohonan} menunggu verifikasi admin.`,
    actionUrl: detailLink,
    actionLabel: 'Buka Detail Permohonan',
  });
}

module.exports = {
  buildAdminRequestSubmittedEmail,
};
