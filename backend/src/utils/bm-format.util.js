const toPlain = (row) => {
  if (!row) return row;
  if (typeof row.toJSON === 'function') return row.toJSON();
  if (typeof row.get === 'function') return row.get({ plain: true });
  return row;
};

const pick = (source, keys = []) => {
  for (const key of keys) {
    if (source && source[key]) return source[key];
  }
  return null;
};

const formatJenisAir = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^air\s+/i.test(text)) return text;
  if (/^(sungai|danau|laut|limbah|lindi|minum)\b/i.test(text)) return `Air ${text}`;
  return text;
};

const buildPaketBmLabel = (pktBm = {}) => {
  const data = toPlain(pktBm) || {};
  const reg = pick(data, ['reg_bm', 'RegBm']) || {};
  const jenis = pick(data, ['jenis_sampel', 'JenisSampel']) || data.jenis_sampel_row || {};
  const klasifikasiRaw = data.klasifikasi;
  const klasifikasiRow = (klasifikasiRaw && typeof klasifikasiRaw === 'object' ? klasifikasiRaw : null) || pick(data, ['klasifikasi_row', 'Klasifikasi', 'klasifikasiRelasi']) || {};
  const jenisName = jenis.jenis_sampel || jenis.nama_jenis_sampel || data.jenis_sampel || data.nama_jenis_sampel || '';
  const jenisAir = formatJenisAir(jenisName);
  const klasifikasi = String(
    (typeof data.klasifikasi === 'string' ? data.klasifikasi : null) ||
    klasifikasiRow.klasifikasi ||
    data.nama_klasifikasi ||
    ''
  ).trim();
  return [jenisAir, klasifikasi].filter(Boolean).join(' ') || data.id_pkt_bm || '';
};

const buildPaketBmTeksLhu = (pktBm = {}) => {
  const data = toPlain(pktBm) || {};
  const reg = pick(data, ['reg_bm', 'RegBm']) || {};
  const refReg = reg.ref_reg || data.ref_reg || '';
  const label = buildPaketBmLabel(data);
  return [refReg, label].filter(Boolean).join(' - ') || label || data.id_pkt_bm || null;
};

const withPaketBmDisplayFields = (pktBm = {}) => {
  const data = toPlain(pktBm) || {};
  const klasifikasiRaw = data.klasifikasi;
  const klasifikasiRow = (klasifikasiRaw && typeof klasifikasiRaw === 'object' ? klasifikasiRaw : null) || pick(data, ['klasifikasi_row', 'Klasifikasi', 'klasifikasiRelasi']) || {};
  const klasifikasi = (typeof data.klasifikasi === 'string' ? data.klasifikasi : null) || klasifikasiRow.klasifikasi || null;
  const namaPkt = buildPaketBmLabel({ ...data, klasifikasi });
  const teksLhu = buildPaketBmTeksLhu(data);
  return {
    ...data,
    klasifikasi,
    id_klasifikasi: data.id_klasifikasi || klasifikasiRow.id_klasifikasi || null,
    nama_pkt: namaPkt,
    namaPkt,
    teks_lhu: teksLhu,
    teksLhu,
  };
};

module.exports = {
  toPlain,
  formatJenisAir,
  buildPaketBmLabel,
  buildPaketBmTeksLhu,
  withPaketBmDisplayFields,
};
