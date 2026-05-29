const { buildEmailResponse } = require('./email-layout.template');

function safeString(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function formatTanggalIndonesia(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatJam(value) {
  if (!value) return '-';
  return String(value).slice(0, 5);
}

function buildCustomerLhuPickupLink(fppl = {}) {
  const frontendUrl = safeString(process.env.FRONTEND_URL || 'http://localhost:5173')
    .trim()
    .replace(/\/+$/, '');

  const idRegistrasi = safeString(fppl.id_registrasi || fppl.idRegistrasi || '').trim();

  if (!frontendUrl) return null;
  if (!idRegistrasi) return `${frontendUrl}/pelanggan/status?section=sampel&focus=lhu-pickup`;

  const params = new URLSearchParams({ section: 'sampel', focus: 'lhu-pickup' });
  return `${frontendUrl}/pelanggan/status/${encodeURIComponent(idRegistrasi)}?${params.toString()}`;
}

function buildJadwalPengambilanLhuEmail({ pelanggan, fppl, jadwal }) {
  const namaPenerima = pelanggan.pic || pelanggan.nama_instansi || 'Pelanggan';
  const nomorPermohonan = fppl.nomor_fppl || fppl.id_registrasi;
  const actionUrl = buildCustomerLhuPickupLink(fppl);

  const subject = `Jadwal Pengambilan LHU - ${nomorPermohonan}`;

  const body = [
    `Yth. ${namaPenerima},`,
    '',
    `LHU untuk permohonan ${nomorPermohonan} telah dijadwalkan untuk pengambilan.`,
    '',
    `Tanggal pengambilan: ${formatTanggalIndonesia(jadwal.tanggal_pengambilan)}`,
    `Jam pengambilan: ${formatJam(jadwal.jam_pengambilan)} WIB`,
    jadwal.catatan ? `Catatan: ${jadwal.catatan}` : null,
    '',
    'Konfirmasi jadwal:',
    'Jadwal pengambilan LHU ini sudah ditetapkan dan disetujui admin. Silakan buka detail permohonan untuk melihat bagian Informasi Sampel & Jadwal.',
    '',
    actionUrl ? `Buka detail jadwal LHU: ${actionUrl}` : null,
    '',
    'Mohon datang sesuai jadwal yang telah ditentukan.',
    '',
    'Terima kasih.',
  ].filter(Boolean).join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `Jadwal pengambilan LHU untuk permohonan ${nomorPermohonan}.`,
    actionUrl,
    actionLabel: 'Buka Jadwal LHU',
  });
}

module.exports = {
  buildJadwalPengambilanLhuEmail,
};
