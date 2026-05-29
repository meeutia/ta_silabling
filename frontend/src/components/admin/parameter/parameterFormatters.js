export function stripHtml(html = '') {
  return String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export function normalizeBool(value) {
  return value === true || value === 1 || value === '1';
}

export function formatCurrency(value) {
  const number = Number(value || 0);
  return `Rp ${number.toLocaleString('id-ID')}`;
}
