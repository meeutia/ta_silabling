const cleanText = (value) => String(value ?? '').trim();
const emptyToNull = (value) => {
  const text = cleanText(value);
  return text || null;
};

const pickFirstFilled = (...values) => {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return null;
};

export const buildSampleReceivePayload = (sampelFormList = []) => ({
  sampels: sampelFormList.map((form, index) => ({
    id_registrasi: pickFirstFilled(form.id_registrasi, form.idRegistrasi),
    id_jenis_sampel: pickFirstFilled(form.id_jenis_sampel, form.idJenisSampel),
    id_reg_bm: pickFirstFilled(form.id_reg_bm, form.idRegBm),
    sample_group_index: Number.isFinite(Number(form.sample_group_index))
      ? Number(form.sample_group_index)
      : index,
    sample_unit_index: Number.isFinite(Number(form.sample_unit_index))
      ? Number(form.sample_unit_index)
      : index + 1,
    sample_type_counter: form.sample_type_counter ?? null,
    sample_label: emptyToNull(form.sample_label),
    tanggal_pengambilan_sampel: emptyToNull(form.tanggal_pengambilan_sampel),
    kondisi_sampel: cleanText(form.kondisi) || 'Sesuai',
    abnormalitas_sampel: emptyToNull(form.catatan),
    acuan_pengambilan_sampel: emptyToNull(form.acuan_pengambilan_sampel),
    lokasi_spesifik: emptyToNull(form.lokasi_spesifik),
    koordinat: emptyToNull(form.koordinat),
  })),
});
