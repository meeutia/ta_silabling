export function formatRupiah(value, fallback = 'Rp0') {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return fallback;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
}
