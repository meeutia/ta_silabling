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

    abnormalitas_sampel: emptyToNull(form.catatan),
    acuan_pengambilan_sampel: emptyToNull(form.acuan_pengambilan_sampel),
    lokasi_spesifik: emptyToNull(form.lokasi_spesifik),
    koordinat: emptyToNull(form.koordinat),
    parameters: Array.isArray(form.parameters)
      ? form.parameters.map((p) => ({
          id_fppl_parameter_metode: pickFirstFilled(p.id_fppl_parameter_metode),
          wadah: emptyToNull(p.wadah),
          volume_ml: p.volume_ml !== '' && p.volume_ml !== null && !isNaN(Number(p.volume_ml)) ? Number(p.volume_ml) : null,
          perlakuan_pengawetan: emptyToNull(p.perlakuan_pengawetan),
        }))
      : [],
  })),
});
