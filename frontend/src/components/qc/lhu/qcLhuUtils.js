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

export function getPktLabel(pkt) {
  const nama = pkt?.nama_pkt || pkt?.namaPkt || pkt?.nama || '-';
  const klasifikasi = pkt?.klasifikasi || '';
  const teks = pkt?.teks_lhu || pkt?.teksLhu || '';

  return [nama, klasifikasi, teks].filter(Boolean).join(' - ');
}
