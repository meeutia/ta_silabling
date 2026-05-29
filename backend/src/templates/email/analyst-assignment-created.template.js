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

function formatParameterMethodGroups(groups = []) {
  return (groups || [])
    .map((group) => {
      const label = String(group?.label || '').trim();
      const samples = Array.isArray(group?.samples) ? group.samples : [];

      if (!label) return '';

      const sampleLines = samples
        .map((no) => String(no || '').trim())
        .filter(Boolean)
        .map((noSampel) => `-${noSampel}`)
        .join('\\n');

      return [label, sampleLines].filter(Boolean).join('\\n');
    })
    .filter(Boolean)
    .join('\\n\\n');
}

function buildAnalystAssignmentCreatedEmail({ analis, penugasan, samples = [], parameterMethodGroups = [] }) {
  const nama = analis?.username || analis?.nama || 'Analis';
  const idPenugasan = penugasan?.id_penugasan || penugasan?.idPenugasan || '-';
  const tanggal = formatTanggalIndonesia(penugasan?.assigned_at || penugasan?.assignedAt);
  const catatanPenugasan = String(
    penugasan?.catatan_penugasan ||
      penugasan?.catatanPenugasan ||
      ''
  ).trim();

  const subject = `Penugasan Baru - ${idPenugasan}`;

  const sampleList = Array.from(
    new Set(
      (samples || [])
        .map((no) => String(no || '').trim())
        .filter(Boolean)
    )
  ).join(', ');

  const parameterMethodList = formatParameterMethodGroups(parameterMethodGroups);

  const body = [
    `Yth. ${nama},`,
    '',
    `Anda mendapatkan penugasan baru (${idPenugasan}).`,
    `Tanggal penugasan: ${tanggal}`,
    `Daftar sampel: ${sampleList || '-'}`,
    parameterMethodList ? `Parameter & metode: ${parameterMethodList}` : null,
    `Catatan penugasan: ${catatanPenugasan || '-'}`,
    '',
    'Silakan cek aplikasi SILABLING untuk memulai pekerjaan.',
    '',
    'Terima kasih.',
  ]
    .filter(Boolean)
    .join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `Anda mendapatkan penugasan baru ${idPenugasan}.`,
  });
}

module.exports = {
  buildAnalystAssignmentCreatedEmail,
};
