export function getPersonelValue(personel) {
  return (
    personel?.nik ||
    personel?.id ||
    personel?.id_user ||
    personel?.value ||
    ''
  );
}

export function getPersonelLabel(personel) {
  const nik = personel?.nik || personel?.id || personel?.id_user || '';
  const nama =
    personel?.username ||
    personel?.nama ||
    personel?.nama_user ||
    personel?.name ||
    personel?.nama_pegawai ||
    '';

  if (nik && nama) return `${nama} - ${nik}`;
  return nama || nik || '-';
}

export function getPktValue(pkt) {
  return pkt?.id_pkt_bm || pkt?.idPktBm || pkt?.value || '';
}

function cleanText(value) {
  const text = String(value ?? '').trim();
  if (!text || ['null', 'undefined', '-'].includes(text.toLowerCase())) return '';
  return text.replace(/\s+/g, ' ');
}

function pickFirst(...values) {
  return values.map(cleanText).find(Boolean) || '';
}

function sameText(a, b) {
  return cleanText(a).toLowerCase() === cleanText(b).toLowerCase();
}

function normalizeJenisAir(value) {
  const text = cleanText(value);
  if (!text) return '';
  if (/^air\s+/i.test(text)) return text;
  if (/^(sungai|danau|laut|limbah|lindi|minum)\b/i.test(text)) return `Air ${text}`;
  return text;
}

function stripTrailingKlasifikasi(label, klasifikasi) {
  const text = cleanText(label);
  const klas = cleanText(klasifikasi);
  if (!text || !klas) return text;

  const pattern = new RegExp(`\\s+${klas.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  return text.replace(pattern, '').trim() || text;
}

function getJenisSampelLabel(pkt = {}, klasifikasi = '') {
  const nestedJenis = pkt?.jenis_sampel || pkt?.jenisSampel || pkt?.JenisSampel || {};
  const directJenis = pickFirst(
    nestedJenis?.jenis_sampel,
    nestedJenis?.jenisSampel,
    nestedJenis?.nama_jenis_sampel,
    nestedJenis?.namaJenisSampel,
    pkt?.jenis_sampel_label,
    pkt?.jenisSampelLabel,
    pkt?.nama_jenis_sampel,
    pkt?.namaJenisSampel,
    pkt?.jenis_sampel,
    pkt?.jenisSampel
  );

  if (directJenis) return normalizeJenisAir(directJenis);

  const namaPaket = pickFirst(pkt?.nama_pkt, pkt?.namaPkt, pkt?.nama);
  return normalizeJenisAir(stripTrailingKlasifikasi(namaPaket, klasifikasi));
}

function getRegulasiLabel(pkt = {}) {
  const regBm = pkt?.reg_bm || pkt?.regBm || pkt?.RegBm || {};
  const directReg = pickFirst(
    regBm?.ref_reg,
    regBm?.refReg,
    regBm?.nama_regulasi,
    regBm?.namaRegulasi,
    pkt?.ref_reg,
    pkt?.refReg,
    pkt?.nama_regulasi,
    pkt?.namaRegulasi,
    pkt?.regulasi
  );

  if (directReg) return directReg;

  const teksLhu = cleanText(pkt?.teks_lhu || pkt?.teksLhu);
  if (!teksLhu) return '';

  const namaPaket = cleanText(pkt?.nama_pkt || pkt?.namaPkt || pkt?.nama);
  const parts = teksLhu.split(/\s+-\s+/).map(cleanText).filter(Boolean);

  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (sameText(last, namaPaket)) {
      return parts.slice(0, -1).join(' - ');
    }
  }

  return teksLhu;
}

export function getPktLabel(pkt) {
  const klasifikasi = pickFirst(
    pkt?.klasifikasi,
    pkt?.nama_klasifikasi,
    pkt?.namaKlasifikasi,
    pkt?.klasifikasi_label,
    pkt?.klasifikasiLabel,
    pkt?.klasifikasi?.klasifikasi,
    pkt?.Klasifikasi?.klasifikasi
  );

  const jenis = getJenisSampelLabel(pkt, klasifikasi);
  const regulasi = getRegulasiLabel(pkt);

  const parts = [jenis, klasifikasi, regulasi]
    .map(cleanText)
    .filter(Boolean)
    .filter((part, index, array) => array.findIndex((item) => sameText(item, part)) === index);

  return parts.join(' - ') || cleanText(pkt?.nama_pkt || pkt?.namaPkt || pkt?.nama) || '-';
}
