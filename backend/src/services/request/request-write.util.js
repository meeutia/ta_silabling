const {
  resolveSamplingType,
  resolveSamplingSchedule,
  resolveSamplingLocation,
  resolveSampleQuantity
} = require('./request-transform.util');

const normalizeRequestWritePayload = (data) => {
  const {
    namaInstansi, pic, emailPic, noTelp, alamat,
    maksudPengujian, maksudLainnya,
    metodePengambilan, tanggalPengambilan, jamPengambilan,
    lokasiPengambilan, alamatPengambilan, estimasiDiterima,
    sampleEntries
  } = data;

  const maksudPengujianText = String(maksudPengujian || '').trim();
  const isOtherPurpose = maksudPengujianText.toLowerCase() === 'lainnya';
  const finalTestPurpose = String(isOtherPurpose
      ? (maksudLainnya || maksudPengujianText || '')
      : maksudPengujianText).trim();

  if (!finalTestPurpose) {
      throw new Error('Maksud pengujian wajib diisi.');
  }

  const samplingType = resolveSamplingType(metodePengambilan);
  const samplingSchedule = resolveSamplingSchedule({
      metodePengambilan,
      tanggalPengambilan,
      jamPengambilan,
      estimasiDiterima,
  });
  const samplingSiteLocation = resolveSamplingLocation({
      metodePengambilan,
      lokasiPengambilan,
      alamatPengambilan,
  });

  return {
    customer: {
        namaInstansi,
        pic,
        emailPic,
        noTelp,
        alamat,
    },
    request: {
        maksudPengujian: finalTestPurpose,
        jenisPengambilanSampel: samplingType,
        lokasiPengambilanSampel: samplingSiteLocation,
        tanggalRencanaPengambilanSampel: samplingSchedule.tanggalRencanaPengambilanSampel || null,
        jamRencanaPengambilanSampel: samplingSchedule.jamRencanaPengambilanSampel || null,
        tanggalRencanaPengantaranSampel: samplingSchedule.tanggalRencanaPengantaranSampel || null,
    },
    sampleEntries: Array.isArray(sampleEntries) ? sampleEntries : []
  };
};

const validateRequestSampleComposition = (sampleEntries) => {
  if (!Array.isArray(sampleEntries) || sampleEntries.length === 0) {
      throw new Error('Data sampel dan parameter uji wajib diisi.');
  }
};

const buildCandidateSamples = (sampleEntries) => {
  return sampleEntries.map((entry) => ({
      id_jenis_sampel: entry.idJenisSampel || entry.id_jenis_sampel || entry.jenisSampel,
      id_reg_bm: entry.idRegBm || entry.id_reg_bm,
      jumlah_sampel: resolveSampleQuantity(entry)
  }));
};

const buildCandidateParameters = (sampleEntries) => {
  const candidateParams = [];
  for (const entry of sampleEntries) {
      const idJs = entry.idJenisSampel || entry.id_jenis_sampel || entry.jenisSampel;
      const idBm = entry.idRegBm || entry.id_reg_bm;
      const paramIds = Array.isArray(entry.parameters)
          ? entry.parameters.map((p) => (typeof p === 'string' ? p : p?.id_parameter)).filter(Boolean)
          : [];
      for (const idParam of paramIds) {
          candidateParams.push({ id_jenis_sampel: idJs, id_reg_bm: idBm, id_parameter: idParam });
      }
  }
  return candidateParams;
};

const buildFpplWriteFields = (normalizedData) => {
  return {
      maksud_pengujian: normalizedData.request.maksudPengujian,
      lokasi_pengambilan_sampel: normalizedData.request.lokasiPengambilanSampel,
      jenis_pengambilan_sampel: normalizedData.request.jenisPengambilanSampel,
      tanggal_rencana_pengambilan_sampel: normalizedData.request.tanggalRencanaPengambilanSampel,
      jam_rencana_pengambilan_sampel: normalizedData.request.jamRencanaPengambilanSampel,
      tanggal_rencana_pengantaran_sampel: normalizedData.request.tanggalRencanaPengantaranSampel,
  };
};

module.exports = {
  normalizeRequestWritePayload,
  validateRequestSampleComposition,
  buildCandidateSamples,
  buildCandidateParameters,
  buildFpplWriteFields
};
