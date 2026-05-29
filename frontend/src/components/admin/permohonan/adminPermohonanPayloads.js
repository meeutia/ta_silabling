const cleanText = (value) => String(value ?? '').trim();

export const buildSampleReceivePayload = (sampelFormList = []) => {
  const sampels = sampelFormList.map((form) => ({
    id_fppl_sampel: form.id_fppl_sampel,
    sample_unit_index: form.sample_unit_index,
    sample_type_counter: form.sample_type_counter,
    sample_label: form.sample_label,

    tanggal_pengambilan_sampel: form.tanggal_pengambilan_sampel,
    tanggalPengambilanSampel: form.tanggal_pengambilan_sampel,


    kondisi: cleanText(form.kondisi),
    kondisi_sampel: cleanText(form.kondisi),
    kondisiSampel: cleanText(form.kondisi),

    catatan: cleanText(form.catatan),
    abnormalitas_sampel: cleanText(form.catatan),
    abnormalitasSampel: cleanText(form.catatan),

    acuan_pengambilan_sampel: cleanText(form.acuan_pengambilan_sampel),
    acuanPengambilanSampel: cleanText(form.acuan_pengambilan_sampel),

    lokasi_spesifik: cleanText(form.lokasi_spesifik),
    lokasiSpesifik: cleanText(form.lokasi_spesifik),

    koordinat: cleanText(form.koordinat),
  }));

  const firstForm = sampelFormList[0] || {};

  return {
    tanggal_pengambilan_sampel: firstForm.tanggal_pengambilan_sampel || null,
    tanggalPengambilanSampel: firstForm.tanggal_pengambilan_sampel || null,
    kondisi_sampel: cleanText(firstForm.kondisi) || 'Sesuai',
    kondisiSampel: cleanText(firstForm.kondisi) || 'Sesuai',
    abnormalitas_sampel: cleanText(firstForm.catatan) || null,
    abnormalitasSampel: cleanText(firstForm.catatan) || null,
    acuan_pengambilan_sampel: cleanText(firstForm.acuan_pengambilan_sampel) || null,
    acuanPengambilanSampel: cleanText(firstForm.acuan_pengambilan_sampel) || null,
    lokasi_spesifik: cleanText(firstForm.lokasi_spesifik) || null,
    lokasiSpesifik: cleanText(firstForm.lokasi_spesifik) || null,
    koordinat: cleanText(firstForm.koordinat) || null,
    sampels,
  };
};
