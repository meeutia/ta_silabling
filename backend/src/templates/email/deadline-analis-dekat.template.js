const { buildEmailResponse } = require('./email-layout.template');

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

function buildDeadlineAnalisDekatEmail({ analis, penugasan, details }) {
  const namaAnalis = analis?.username || analis?.nik || 'Analis';

  const subject = `Pengingat Deadline Pengujian - ${penugasan.id_penugasan}`;

  const daftarDetail = details.map((detail, index) => {
    const namaParameter = detail.nama_parameter || detail.parameter || '-';
    const metode = detail.metode || detail.acuan_metode || '-';
    const deadline = formatTanggalIndonesia(detail.tanggal_tenggat);

    return `${index + 1}. ${namaParameter}
   Metode: ${metode}
   Deadline: ${deadline}
   Status: ${detail.status_detail}`;
  }).join('\n\n');

  const body = [
    `Yth. ${namaAnalis},`,
    '',
    `Terdapat penugasan pengujian yang deadline-nya sudah dekat.`,
    '',
    `ID Penugasan: ${penugasan.id_penugasan}`,
    '',
    daftarDetail,
    '',
    'Mohon segera menyelesaikan pengujian dan menginput hasil pada sistem.',
    '',
    'Terima kasih.',
  ].join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: 'Terdapat penugasan pengujian yang deadline-nya sudah dekat.',
  });
}

module.exports = {
  buildDeadlineAnalisDekatEmail,
};