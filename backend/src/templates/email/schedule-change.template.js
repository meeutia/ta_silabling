const { buildEmailResponse } = require('./email-layout.template');

function safeText(value, fallback = '-') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

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

function formatJam(value) {
  const text = String(value || '').trim();
  if (!text) return '-';
  return `${text.slice(0, 5)} WIB`;
}

function getNomorPermohonan(fppl = {}) {
  return fppl.nomor_fppl || fppl.nomorFppl || fppl.id_registrasi || fppl.idRegistrasi || '-';
}

function getNamaPelanggan(pelanggan = {}) {
  return pelanggan.nama_instansi || pelanggan.pic || pelanggan.nama_pic || pelanggan.nama_kontak || pelanggan.id_pelanggan || 'Pelanggan';
}

function getJadwalLabel(pengajuan = {}) {
  return String(pengajuan.jenis_jadwal || pengajuan.jenisJadwal || '').toUpperCase() === 'LHU'
    ? 'Jadwal Pengambilan LHU'
    : 'Jadwal Sampel';
}

function buildScheduleChangeSubmittedAdminEmail({ admin = {}, pelanggan = {}, fppl = {}, pengajuan = {}, adminLink = null } = {}) {
  const nomorPermohonan = getNomorPermohonan(fppl);
  const jenisJadwal = getJadwalLabel(pengajuan);
  const namaAdmin = admin.nama_pegawai || admin.username || 'Admin';
  const namaPelanggan = getNamaPelanggan(pelanggan);
  const subject = `Pengajuan Perubahan Jadwal - ${nomorPermohonan}`;

  const body = [
    `Yth. ${namaAdmin},`,
    '',
    `${namaPelanggan} mengajukan perubahan ${jenisJadwal.toLowerCase()}.`,
    '',
    `Nomor FPPL: ${safeText(fppl.nomor_fppl || fppl.nomorFppl || nomorPermohonan)}`,
    `Nomor registrasi: ${safeText(fppl.id_registrasi || fppl.idRegistrasi || nomorPermohonan)}`,
    `Jenis jadwal: ${jenisJadwal}`,
    `Jadwal lama: ${formatTanggalIndonesia(pengajuan.tanggal_sebelumnya || pengajuan.tanggalSebelumnya)} • ${formatJam(pengajuan.jam_sebelumnya || pengajuan.jamSebelumnya)}`,
    `Tanggal usulan: ${formatTanggalIndonesia(pengajuan.tanggal_usulan || pengajuan.tanggalUsulan)}`,
    `Jam usulan: ${formatJam(pengajuan.jam_usulan || pengajuan.jamUsulan)}`,
    `Alasan: ${safeText(pengajuan.alasan_pengajuan || pengajuan.alasanPengajuan)}`,
    '',
    'Silakan proses pengajuan ini dari halaman detail permohonan.',
  ].join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `${namaPelanggan} mengajukan perubahan ${jenisJadwal.toLowerCase()}.`,
    actionUrl: adminLink,
    actionLabel: 'Buka Detail Permohonan',
  });
}

function buildScheduleChangeDecisionCustomerEmail({ pelanggan = {}, fppl = {}, pengajuan = {}, approved = false, detailLink = null } = {}) {
  const nomorPermohonan = getNomorPermohonan(fppl);
  const jenisJadwal = getJadwalLabel(pengajuan);
  const namaPelanggan = getNamaPelanggan(pelanggan);
  const subject = approved
    ? `Pengajuan Perubahan Jadwal Disetujui - ${nomorPermohonan}`
    : `Pengajuan Perubahan Jadwal Ditolak - ${nomorPermohonan}`;

  const intro = approved
    ? `Pengajuan perubahan ${jenisJadwal.toLowerCase()} Anda telah disetujui admin.`
    : `Pengajuan perubahan ${jenisJadwal.toLowerCase()} Anda ditolak admin.`;

  const body = [
    `Yth. ${namaPelanggan},`,
    '',
    intro,
    '',
    `Nomor FPPL: ${safeText(fppl.nomor_fppl || fppl.nomorFppl || nomorPermohonan)}`,
    `Nomor registrasi: ${safeText(fppl.id_registrasi || fppl.idRegistrasi || nomorPermohonan)}`,
    `Jenis jadwal: ${jenisJadwal}`,
    approved
      ? `Jadwal baru: ${formatTanggalIndonesia(pengajuan.tanggal_usulan || pengajuan.tanggalUsulan)} • ${formatJam(pengajuan.jam_usulan || pengajuan.jamUsulan)}`
      : `Tanggal usulan: ${formatTanggalIndonesia(pengajuan.tanggal_usulan || pengajuan.tanggalUsulan)}`,
    !approved ? `Jam usulan: ${formatJam(pengajuan.jam_usulan || pengajuan.jamUsulan)}` : null,
    !approved ? `Alasan pengajuan: ${safeText(pengajuan.alasan_pengajuan || pengajuan.alasanPengajuan)}` : null,
    `Catatan admin: ${safeText(pengajuan.catatan_admin || pengajuan.catatanAdmin, '-')}`,
    '',
    approved
      ? 'Silakan ikuti jadwal baru yang sudah disetujui.'
      : 'Silakan cek detail permohonan untuk informasi selanjutnya.',
  ]
    .filter(Boolean)
    .join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: intro,
    actionUrl: detailLink,
    actionLabel: 'Lihat Detail Permohonan',
  });
}

module.exports = {
  buildScheduleChangeSubmittedAdminEmail,
  buildScheduleChangeDecisionCustomerEmail,
};
