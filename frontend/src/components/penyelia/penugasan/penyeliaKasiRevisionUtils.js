export function joinUniqueNotes(notes = []) {
  const values = [];

  notes.forEach((note) => {
    const text = String(note || '').trim();
    if (!text) return;
    if (!values.some((item) => item === text)) values.push(text);
  });

  return values.join('\n\n');
}

export function formatRevisionDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getKasiRevisionItems(row = {}) {
  return Array.isArray(row.items)
    ? row.items
    : Array.isArray(row.lka_revisi_items)
      ? row.lka_revisi_items
      : [];
}

export function getRevisionItemLabel(item = {}) {
  const hasil = item.hasil || {};
  const noSampel = hasil.no_sampel || item.no_sampel || item.noSampel || item.no_sampel;
  const parameter = item.namaParameter || item.nama_parameter || hasil.namaParameter || hasil.nama_parameter || '';
  const metode = item.namaMetode || item.nama_metode || hasil.namaMetode || hasil.nama_metode || '';
  const acuan = item.acuanMetode || item.acuan_metode || hasil.acuanMetode || hasil.acuan_metode || '';
  const detail = [parameter, metode, acuan].filter(Boolean).join(' - ');

  return [noSampel, detail].filter(Boolean).join(': ');
}

export function getRevisionItemsText(row = {}) {
  const labels = getKasiRevisionItems(row)
    .map(getRevisionItemLabel)
    .filter(Boolean);

  return labels.length > 0 ? labels.join('\n') : '-';
}

export function getRevisionItemsNote(row = {}) {
  const itemNotes = getKasiRevisionItems(row).map((item) =>
    item.catatan_revisi || item.catatanRevisi || ''
  );
  const globalNote = row.catatan_umum || row.catatanUmum || '';
  const noteText = joinUniqueNotes(itemNotes.length > 0 ? itemNotes : [globalNote]);

  return noteText || '-';
}
