const { buildEmailResponse, escapeHtml } = require('./email-layout.template');

function clean(value, fallback = '-') {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return text || fallback;
}

function resolveParameter(item, index) {
  return clean(
    item?.nama_parameter ||
      item?.namaParameter ||
      item?.parameter ||
      item?.nama_parameter_metode ||
      item?.namaParameterMetode,
    `Parameter ${index + 1}`
  );
}

function resolveMetode(item) {
  return clean(
    item?.acuan_metode ||
      item?.acuanMetode ||
      item?.nama_metode ||
      item?.namaMetode ||
      item?.metode,
    '-'
  );
}

function resolveCatatan(item, fallbackNote = '-') {
  return clean(
    item?.catatan_revisi ||
      item?.catatanRevisi ||
      item?.catatan ||
      item?.note,
    fallbackNote
  );
}

function buildPlainItemList(items = [], fallbackNote = '-') {
  if (!Array.isArray(items) || !items.length) return '-';

  return items
    .map((item, index) => {
      const parameter = resolveParameter(item, index);
      const metode = resolveMetode(item);
      const catatan = resolveCatatan(item, fallbackNote);

      return `${index + 1}. ${parameter}\n   Metode: ${metode}\n   Catatan revisi: ${catatan}`;
    })
    .join('\n');
}

function renderInfoRow(label, value) {
  return `
    <tr>
      <td style="padding:10px 0 10px 14px;color:#6b7280;font-size:13px;line-height:1.5;width:116px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:10px 14px 10px 12px;color:#111827;font-size:13px;line-height:1.5;font-weight:700;vertical-align:top;word-break:break-word;overflow-wrap:anywhere;">${escapeHtml(value)}</td>
    </tr>`;
}

function renderParameterCards(items = [], fallbackNote = '-') {
  if (!Array.isArray(items) || !items.length) {
    return `
      <div style="margin:12px 0 18px 0;padding:14px;border:1px solid #d1fae5;border-radius:14px;background:#ffffff;color:#111827;font-size:14px;line-height:1.6;">
        Tidak ada parameter/metode yang tercatat.
      </div>`;
  }

  return items
    .map((item, index) => {
      const parameter = resolveParameter(item, index);
      const metode = resolveMetode(item);
      const catatan = resolveCatatan(item, fallbackNote);

      return `
        <div style="margin:12px 0 14px 0;border:1px solid #d1fae5;border-radius:16px;background:#ffffff;overflow:hidden;">
          <div style="padding:12px 14px;background:#ecfdf5;border-bottom:1px solid #d1fae5;">
            <p style="margin:0;color:#047857;font-size:11px;line-height:1.4;font-weight:800;text-transform:uppercase;letter-spacing:.05em;">Parameter ${index + 1}</p>
            <p style="margin:4px 0 0 0;color:#111827;font-size:15px;line-height:1.45;font-weight:800;word-break:break-word;overflow-wrap:anywhere;">${escapeHtml(parameter)}</p>
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">
            <tbody>
              ${renderInfoRow('Metode', metode)}
              ${renderInfoRow('Catatan revisi', catatan)}
            </tbody>
          </table>
        </div>`;
    })
    .join('');
}

function buildContentHtml({ namaAnalis, sampleNo, catatanRevisi, items, testingLink }) {
  return `
    <p style="margin:0 0 14px 0;color:#111827;font-size:14px;line-height:1.7;">Yth. ${escapeHtml(namaAnalis)},</p>
    <p style="margin:0 0 18px 0;color:#111827;font-size:14px;line-height:1.7;">Kasi Pengujian meminta revisi hasil pengujian untuk sampel <strong>${escapeHtml(sampleNo)}</strong>.</p>

    <div style="margin:18px 0 8px 0;color:#047857;font-size:12px;line-height:1.5;font-weight:800;text-transform:uppercase;letter-spacing:.05em;">Parameter/metode yang perlu direvisi</div>
    ${renderParameterCards(items, catatanRevisi || '-')}

    <div style="margin:18px 0;border:1px solid #d1fae5;border-radius:16px;background:#ecfdf5;padding:14px;">
      <p style="margin:0;color:#047857;font-size:12px;line-height:1.4;font-weight:800;text-transform:uppercase;letter-spacing:.05em;">Ringkasan catatan revisi</p>
      <p style="margin:7px 0 0 0;color:#111827;font-size:14px;line-height:1.7;font-weight:700;white-space:pre-line;word-break:break-word;overflow-wrap:anywhere;">${escapeHtml(clean(catatanRevisi, '-'))}</p>
    </div>

    <div style="margin:18px 0;border:1px solid #e5e7eb;border-radius:16px;background:#f9fafb;padding:14px;">
      <p style="margin:0;color:#111827;font-size:14px;line-height:1.7;">Mohon segera melakukan perbaikan hasil pengujian/LKA pada sistem melalui tombol di bawah email ini.</p>
      ${testingLink ? `<p style="margin:8px 0 0 0;color:#6b7280;font-size:11px;line-height:1.5;word-break:break-word;overflow-wrap:anywhere;">Link cadangan: <a href="${escapeHtml(testingLink)}" style="color:#047857;font-weight:700;text-decoration:none;">${escapeHtml(testingLink)}</a></p>` : ''}
    </div>

    <p style="margin:0;color:#111827;font-size:14px;line-height:1.7;">Terima kasih.</p>`;
}

function buildTestResultRevisionByKasiEmail({
  analis,
  noSampel,
  catatanRevisi,
  items = [],
  testingLink = null,
}) {
  const namaAnalis = analis?.username || analis?.nama_pegawai || analis?.nik || 'Analis';
  const sampleNo = noSampel || '-';
  const subject = `Revisi Hasil Pengujian dari Kasi Pengujian - ${sampleNo}`;

  const body = [
    `Yth. ${namaAnalis},`,
    '',
    `Kasi Pengujian meminta revisi hasil pengujian untuk sampel ${sampleNo}.`,
    '',
    'Parameter/metode yang perlu direvisi:',
    buildPlainItemList(items, catatanRevisi || '-'),
    '',
    'Ringkasan catatan revisi:',
    catatanRevisi || '-',
    '',
    `Link ke halaman pengujian: ${testingLink || '-'}`,
    '',
    'Mohon segera melakukan perbaikan hasil pengujian/LKA pada sistem.',
    '',
    'Terima kasih.',
  ].join('\n');

  return buildEmailResponse({
    subject,
    body,
    title: subject,
    preheader: `Revisi hasil pengujian untuk sampel ${sampleNo}.`,
    contentHtml: buildContentHtml({
      namaAnalis,
      sampleNo,
      catatanRevisi,
      items,
      testingLink,
    }),
    actionUrl: testingLink,
    actionLabel: 'Buka Tugas Pengujian',
  });
}

module.exports = {
  buildTestResultRevisionByKasiEmail,
};
