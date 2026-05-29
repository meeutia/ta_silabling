const BRAND = {
  name: 'SILABLING',
  title: 'Sistem Informasi Laboratorium Lingkungan',
  primary: '#059669',
  primaryDark: '#047857',
  primarySoft: '#ecfdf5',
  text: '#111827',
  muted: '#6b7280',
  border: '#d1fae5',
  page: '#f3f4f6',
};

function safeString(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function escapeHtml(value) {
  return safeString(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeHtmlWithBreaks(value) {
  return safeString(value)
    .split(/\r?\n|\\n/g)
    .map((part) => escapeHtml(part))
    .join('<br>');
}

function normalizeTextLines(body) {
  return safeString(body)
    .split('\n')
    .map((line) => line.trimEnd());
}

function isUrl(value) {
  return /^https?:\/\//i.test(safeString(value).trim());
}

function renderParagraph(text) {
  return `<p style="margin:0 0 12px 0;color:${BRAND.text};font-size:14px;line-height:1.7;word-break:break-word;overflow-wrap:anywhere;">${escapeHtml(text)}</p>`;
}

function renderSectionTitle(text) {
  return `<p style="margin:18px 0 8px 0;color:${BRAND.primaryDark};font-size:13px;line-height:1.5;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(text.replace(/:$/, ''))}</p>`;
}

function renderInfoRow(label, value) {
  const cleanLabel = escapeHtml(label.trim());
  const cleanValue = escapeHtmlWithBreaks(value.trim() || '-');

  return `
    <tr>
      <td style="padding:11px 10px;border-bottom:1px solid #ecfdf5;color:${BRAND.muted};font-size:13px;width:38%;vertical-align:top;word-break:break-word;overflow-wrap:anywhere;">${cleanLabel}</td>
      <td style="padding:11px 10px;border-bottom:1px solid #ecfdf5;color:${BRAND.text};font-size:13px;font-weight:600;vertical-align:top;word-break:break-word;overflow-wrap:anywhere;">${cleanValue}</td>
    </tr>`;
}

function renderListItem(text) {
  return `
    <li style="margin:0 0 8px 0;color:${BRAND.text};font-size:14px;line-height:1.6;">
      ${escapeHtml(text.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, ''))}
    </li>`;
}

function isListLine(text) {
  return /^\d+\.\s+/.test(text) || /^[-•]\s+/.test(text);
}

function normalizeListValue(text) {
  return safeString(text)
    .replace(/^\d+\.\s*/, '')
    .replace(/^[-•]\s*/, '')
    .trim();
}

function renderBodyContent(body) {
  const lines = normalizeTextLines(body);
  const htmlParts = [];
  let infoRows = [];
  let listRows = [];

  function flushInfoRows() {
    if (!infoRows.length) return;
    htmlParts.push(`
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:100%;margin:8px 0 18px 0;border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;background:#ffffff;border-collapse:separate;border-spacing:0;table-layout:fixed;">
        <tbody>${infoRows.join('')}</tbody>
      </table>`);
    infoRows = [];
  }

  function flushListRows() {
    if (!listRows.length) return;
    htmlParts.push(`
      <ul style="margin:8px 0 18px 18px;padding:0;">
        ${listRows.join('')}
      </ul>`);
    listRows = [];
  }

  for (let i = 0; i < lines.length; i += 1) {
    const text = (lines[i] || '').trim();

    if (!text) {
      flushInfoRows();
      flushListRows();
      htmlParts.push('<div style="height:8px;line-height:8px;">&nbsp;</div>');
      continue;
    }

    if (isListLine(text)) {
      flushInfoRows();
      listRows.push(renderListItem(text));
      continue;
    }

    const colonIndex = text.indexOf(':');
    const hasLabelValue = colonIndex > 0 && colonIndex <= 70 && text.slice(colonIndex + 1).trim().length > 0 && !isUrl(text);

    if (hasLabelValue) {
      flushListRows();
      const label = text.slice(0, colonIndex).replace(/\s+/g, ' ');
      const rawValue = text.slice(colonIndex + 1).trim();

      if (isListLine(rawValue)) {
        const listValues = [normalizeListValue(rawValue)];
        let listIndex = i + 1;

        while (listIndex < lines.length) {
          const nextListText = (lines[listIndex] || '').trim();
          if (!nextListText || !isListLine(nextListText)) break;
          listValues.push(normalizeListValue(nextListText));
          listIndex += 1;
        }

        infoRows.push(renderInfoRow(label, listValues.join('\n')));
        i = listIndex - 1;
        continue;
      }

      infoRows.push(renderInfoRow(label, rawValue));
      continue;
    }

    if (text.endsWith(':')) {
      const listValues = [];
      let listIndex = i + 1;

      while (listIndex < lines.length) {
        const nextListText = (lines[listIndex] || '').trim();
        if (!nextListText) break;
        if (!isListLine(nextListText)) break;
        listValues.push(normalizeListValue(nextListText));
        listIndex += 1;
      }

      if (listValues.length) {
        flushListRows();
        const label = text.slice(0, -1).replace(/\s+/g, ' ');
        infoRows.push(renderInfoRow(label, listValues.join('\n')));
        i = listIndex - 1;
        continue;
      }

      const nextText = (lines[i + 1] || '').trim();
      const canPairWithNext =
        nextText &&
        !isListLine(nextText) &&
        !isUrl(nextText);

      if (canPairWithNext) {
        flushListRows();
        const label = text.slice(0, -1).replace(/\s+/g, ' ');
        infoRows.push(renderInfoRow(label, nextText));
        i += 1;
        continue;
      }

      flushInfoRows();
      flushListRows();
      htmlParts.push(renderSectionTitle(text));
      continue;
    }

    flushInfoRows();
    flushListRows();
    htmlParts.push(renderParagraph(text));
  }

  flushInfoRows();
  flushListRows();

  return htmlParts.join('');
}

function renderButton(url, label = 'Buka SILABLING') {
  if (!url || !isUrl(url)) return '';

  return `
    <div style="margin:24px 0 4px 0;text-align:left;">
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 18px;border-radius:12px;">
        ${escapeHtml(label)}
      </a>
    </div>`;
}

function buildEmailHtml({
  title,
  preheader = '',
  body,
  contentHtml = null,
  actionUrl = null,
  actionLabel = 'Buka SILABLING',
} = {}) {
  const emailTitle = title || 'Notifikasi SILABLING';
  const preview = preheader || emailTitle;

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(emailTitle)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};font-family:Arial,Helvetica,sans-serif;color:${BRAND.text};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.page};padding:18px 8px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:${BRAND.primary};padding:18px 22px;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                <tr>
                  <td width="54" height="54" style="width:54px;height:54px;text-align:center;vertical-align:middle;">
                    <img src="cid:silabling-logo-email" alt="Logo" width="54" height="54" style="display:block;width:54px;height:54px;border:0;outline:none;text-decoration:none;margin:0;">
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <p style="margin:0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:.02em;line-height:1.2;">${BRAND.name}</p>
                    <p style="margin:3px 0 0 0;color:#d1fae5;font-size:12px;line-height:1.35;">${BRAND.title}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px;">
              <div style="display:inline-block;background:${BRAND.primarySoft};color:${BRAND.primaryDark};border:1px solid ${BRAND.border};font-size:11px;font-weight:700;padding:5px 9px;border-radius:999px;margin-bottom:12px;">Notifikasi Sistem</div>
              <h1 style="margin:0 0 14px 0;color:${BRAND.text};font-size:21px;line-height:1.3;font-weight:800;">${escapeHtml(emailTitle)}</h1>
              ${contentHtml || renderBodyContent(body)}
              ${renderButton(actionUrl, actionLabel)}
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 22px;">
              <p style="margin:0;color:${BRAND.muted};font-size:11px;line-height:1.5;">Email otomatis SILABLING. Mohon tidak membalas email ini.</p>
              <p style="margin:6px 0 0 0;color:${BRAND.muted};font-size:11px;line-height:1.5;">© ${new Date().getFullYear()} SILABLING</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailResponse({
  subject,
  body,
  title = subject,
  preheader = subject,
  contentHtml = null,
  actionUrl = null,
  actionLabel = 'Buka SILABLING',
} = {}) {
  return {
    subject,
    body,
    html: buildEmailHtml({
      title,
      preheader,
      body,
      contentHtml,
      actionUrl,
      actionLabel,
    }),
  };
}

module.exports = {
  buildEmailHtml,
  buildEmailResponse,
  escapeHtml,
};
