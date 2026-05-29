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

function formatJam(value) {
  const text = String(value || '').trim();
  if (!text) return '-';
  return `${text.slice(0, 5)} WIB`;
}

function safeString(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function buildCustomerSampleConfirmationLink(fppl = {}) {
  const frontendUrl = safeString(process.env.FRONTEND_URL || 'http://localhost:5173')
    .trim()
    .replace(/\/+$/, '');

  const idRegistrasi = safeString(fppl.id_registrasi || fppl.idRegistrasi || '').trim();

  if (!frontendUrl) return null;

  const params = new URLSearchParams({
    section: 'sampel',
    focus: 'sample-schedule-confirmation',
  });

  if (!idRegistrasi) return `${frontendUrl}/pelanggan/status?${params.toString()}`;

  return `${frontendUrl}/pelanggan/status/${encodeURIComponent(idRegistrasi)}?${params.toString()}`;
}

function buildJadwalSampelEmail({ pelanggan = {}, fppl = {}, jadwal = {}, pegawaiPcc = {}, detailLink = null }) {
  const nomorPermohonan = fppl.nomor_fppl || fppl.nomorFppl || fppl.id_registrasi || fppl.idRegistrasi || '-';
  const nama = pelanggan.nama_pic || pelanggan.namaPic || pelanggan.nama_kontak || pelanggan.namaKontak || pelanggan.nama_instansi || 'Pelanggan';
  const jenisPengambilan = fppl.jenis_pengambilan_sampel || fppl.jenisPengambilanSampel || '-';
  const isMandiri = String(jenisPengambilan).toLowerCase() === 'mandiri';
  const tanggal = formatTanggalIndonesia(jadwal.tanggal_jadwal || jadwal.tanggalJadwal);
  const jam = formatJam(jadwal.jam_jadwal || jadwal.jamJadwal);
  const lokasi = fppl.lokasi_pengambilan_sampel || fppl.lokasiPengambilanSampel || '-';
  const namaPetugas = pegawaiPcc.nama_pegawai || pegawaiPcc.namaPegawai || '-';
  const kontakPetugas = pegawaiPcc.no_wa || pegawaiPcc.noWa || '-';

  const subject = isMandiri
    ? `Konfirmasi Jadwal Pengantaran Sampel - ${nomorPermohonan}`
    : `Konfirmasi Jadwal Pengambilan Sampel - ${nomorPermohonan}`;
  const confirmationLink = buildCustomerSampleConfirmationLink(fppl) || detailLink;

  const body = [
    `Yth. ${nama},`,
    '',
    isMandiri
      ? `Jadwal pengantaran sampel mandiri untuk permohonan ${nomorPermohonan} telah ditentukan dan perlu dikonfirmasi melalui portal.`
      : `Jadwal pengambilan sampel oleh petugas untuk permohonan ${nomorPermohonan} telah ditentukan dan perlu dikonfirmasi melalui portal.`,
    '',
    `Nomor permohonan: ${nomorPermohonan}`,
    `Tanggal jadwal: ${tanggal}`,
    `Jam jadwal: ${jam}`,
    !isMandiri ? `Lokasi pengambilan: ${lokasi}` : null,
    !isMandiri ? `Petugas/PCC: ${namaPetugas}` : null,
    !isMandiri ? `Kontak petugas: ${kontakPetugas}` : null,
    '',
    'Konfirmasi jadwal:',
    'Jika jadwal sudah sesuai, tekan Setujui Jadwal. Jika belum sesuai, tekan Atur Ulang Jadwal? untuk mengajukan perubahan jadwal.',
    '',
    confirmationLink ? `Buka konfirmasi jadwal: ${confirmationLink}` : null,
    isMandiri
      ? 'Setelah dikonfirmasi, silakan antar sampel sesuai jadwal yang telah ditentukan.'
      : 'Setelah dikonfirmasi, mohon pastikan sampel sudah siap saat petugas datang sesuai jadwal.',
    '',
    'Terima kasih.',
  ]
    .filter(Boolean)
    .join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: isMandiri
      ? `Jadwal pengantaran sampel ${nomorPermohonan} perlu dikonfirmasi.`
      : `Jadwal pengambilan sampel ${nomorPermohonan} perlu dikonfirmasi.`,
    actionUrl: confirmationLink,
    actionLabel: 'Konfirmasi Jadwal Sampel',
  });
}

module.exports = {
  buildJadwalSampelEmail,
};
