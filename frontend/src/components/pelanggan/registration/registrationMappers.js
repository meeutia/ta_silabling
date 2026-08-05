import { KNOWN_TESTING_PURPOSES } from './registrationConstants';
import { asTrimmedText, toPositiveInteger } from '../../../utils/formValidation';
import { toTimeHHmmOrEmpty, toYmdOrEmpty } from './registrationDateUtils';

export const createEmptySampleEntry = () => ({
  jenisSampel: '',
  idRegBm: '',
  parameters: [],
  jumlahSampel: 1,
});


export const normalizeSampleEntries = (entries = []) => {
  const normalized = [];
  const seenKeys = new Set();

  entries.forEach((entry) => {
    const jenisSampel = entry?.jenisSampel || entry?.id_jenis_sampel || '';
    const idRegBm = entry?.idRegBm || entry?.id_reg_bm || '';
    const parameters = Array.isArray(entry?.parameters)
      ? [...new Set(entry.parameters.filter(Boolean))]
      : [];
    const jumlahSampel = toPositiveInteger(entry?.jumlahSampel || entry?.jumlah_sampel || 1);

    const normalizedEntry = {
      ...createEmptySampleEntry(),
      ...entry,
      jenisSampel,
      idRegBm,
      parameters,
      jumlahSampel,
    };

    const key = [
      jenisSampel,
      idRegBm,
      jumlahSampel,
      [...parameters].sort().join(','),
    ].join('|');

    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    normalized.push(normalizedEntry);
  });

  return normalized.length > 0 ? normalized : [createEmptySampleEntry()];
};

export const createDefaultFormData = (userData) => ({
  id_pelanggan: '',
  namaInstansi: '',
  pic: userData?.username || userData?.nama_user || '',
  emailPic: userData?.email || '',
  noTelp: userData?.no_telp || '',
  alamat: userData?.alamat || '',
  maksudPengujian: '',
  maksudLainnya: '',
  tanggalPengambilan: '',
  sampleEntries: [createEmptySampleEntry()],
  parameterLainnya: '',
  acuanBakuMutu: '',
  metodePengambilan: '',
  jamPengambilan: '',
  alamatPengambilan: '',
  estimasiDiterima: '',
});

export const getSampleEntriesFromRequest = (request) => {
  if (Array.isArray(request?.kelompokSampel) && request.kelompokSampel.length > 0) {
    const mapped = request.kelompokSampel.map((ks) => {
      return {
        jenisSampel: ks.idJenisSampel || '',
        idRegBm: ks.idRegBm || '',
        parameters: (ks.parameters || []).map((p) => p.paramId).filter(Boolean),
        jumlahSampel: Number(ks.jumlahSampel || 1) || 1,
      };
    });
    return normalizeSampleEntries(mapped);
  }

  const requestSamples =
    request?.FpplSampels ||
    request?.fppl_sampels ||
    request?.fpplSampels ||
    [];

  const mapped = requestSamples.map((requestSample) => {
    const parameterRows =
      requestSample?.FpplParameterMetodes ||
      requestSample?.fppl_parameter_metodes ||
      requestSample?.fpplParameterMetodes ||
      [];

    const idRegBm = requestSample?.id_reg_bm || requestSample?.idRegBm || '';
    const jenisSampel = requestSample?.id_jenis_sampel || requestSample?.idJenisSampel || '';

    const parameters = [
      ...new Set(
        parameterRows
          .map((row) =>
            row?.id_parameter ||
            row?.idParameter ||
            row?.Parameter?.id_parameter ||
            row?.parameter?.id_parameter ||
            null
          )
          .filter(Boolean)
      ),
    ];

    return {
      jenisSampel,
      idRegBm,
      parameters,
      jumlahSampel: Number(requestSample?.jumlah_sampel || requestSample?.jumlahSampel || 1) || 1,
    };
  }).filter((entry) => entry.jenisSampel);

  return normalizeSampleEntries(mapped);
};

export const mapRequestToFormData = (request, fallbackUserData) => {
  const pelanggan = request?.Pelanggan || request?.pelanggan || {};
  const jenisPengambilan = request?.jenis_pengambilan_sampel || request?.jenisPengambilanSampel || '';

  const isPetugas = jenisPengambilan === 'Petugas';
  const isMandiri = jenisPengambilan === 'Mandiri';

  const metodePengambilan = isPetugas
    ? 'laboratorium'
    : isMandiri
      ? 'kirim'
      : '';

  const knownPurposes = new Set(KNOWN_TESTING_PURPOSES);
  const savedPurpose = request?.maksud_pengujian || request?.maksudPengujian || '';
  const isKnownPurpose = knownPurposes.has(savedPurpose);

  return {
    ...createDefaultFormData(fallbackUserData),
    id_pelanggan: pelanggan?.id_pelanggan || pelanggan?.idPelanggan || request?.id_pelanggan || request?.idPelanggan || '',
    namaInstansi: pelanggan?.nama_instansi || pelanggan?.namaInstansi || '',
    pic: pelanggan?.pic || fallbackUserData?.username || fallbackUserData?.nama_user || '',
    emailPic: pelanggan?.email_kontak || pelanggan?.emailKontak || fallbackUserData?.email || '',
    noTelp: pelanggan?.no_telp || pelanggan?.noTelp || fallbackUserData?.no_telp || '',
    alamat: pelanggan?.alamat || fallbackUserData?.alamat || '',
    maksudPengujian: isKnownPurpose ? savedPurpose : savedPurpose ? 'lainnya' : '',
    maksudLainnya: isKnownPurpose ? '' : savedPurpose,
    metodePengambilan,
    tanggalPengambilan: isPetugas ? toYmdOrEmpty(request?.tanggal_rencana_pengambilan_sampel || request?.tanggalRencanaPengambilanSampel) : '',
    jamPengambilan: isPetugas ? toTimeHHmmOrEmpty(request?.jam_rencana_pengambilan_sampel || request?.jamRencanaPengambilanSampel) : '',
    estimasiDiterima: isMandiri ? toYmdOrEmpty(request?.tanggal_rencana_pengantaran_sampel || request?.tanggalRencanaPengantaranSampel) : '',
    alamatPengambilan: request?.lokasi_pengambilan_sampel || request?.lokasiPengambilanSampel || '',
    sampleEntries: getSampleEntriesFromRequest(request),
    parameterLainnya: '',
    acuanBakuMutu: '',
  };
};

export const mapSampleTypesToOptions = (rows = []) => {
  return rows.map((sampleType) => ({
    value: sampleType.id_jenis_sampel,
    label: sampleType.jenis_sampel,
  }));
};

export const mapBmStandardsToOptions = (rows = []) => {
  return rows.map((item) => ({
    value: item.id_reg_bm,
    label: `${item.instansi} - ${item.ref_reg}`,
    instansi: item.instansi,
    referensi: item.ref_reg,
  }));
};

export const mapEntryStandardsToOptions = (rows = []) => {
  return rows.map((item) => ({
    value: item.id_reg_bm,
    label: `${item.instansi || ''} - ${item.ref_reg || item.id_reg_bm}`.trim(),
    instansi: item.instansi || '',
    referensi: item.ref_reg || '',
  }));
};

export const mapParametersToOptions = (rows = []) => {
  return rows.map((item) => ({
    value: item.id_parameter,
    label: item.nama_parameter,
    nama: item.nama_parameter,
    satuan_bm: item.satuan_bm,
    nilai_bm: item.nilai_bm,
    ket_bm: item.ket_bm,
    id_parameter: item.id_parameter,
  }));
};

export const mapHolidaysToLookup = (rows = []) => {
  const dates = new Set();
  const names = {};

  rows.forEach(({ date, nama }) => {
    dates.add(date);
    names[date] = nama;
  });

  return { dates, names };
};

export const buildRegistrationPayload = (formData) => ({
  idPelanggan: formData.id_pelanggan,
  namaInstansi: asTrimmedText(formData.namaInstansi),
  pic: asTrimmedText(formData.pic),
  emailPic: asTrimmedText(formData.emailPic),
  noTelp: asTrimmedText(formData.noTelp),
  alamat: asTrimmedText(formData.alamat),
  maksudPengujian: formData.maksudPengujian,
  maksudLainnya: asTrimmedText(formData.maksudLainnya) || null,
  metodePengambilan: formData.metodePengambilan,
  tanggalPengambilan: formData.metodePengambilan === 'laboratorium' ? formData.tanggalPengambilan || null : null,
  jamPengambilan: formData.metodePengambilan === 'laboratorium' ? formData.jamPengambilan || null : null,
  alamatPengambilan: asTrimmedText(formData.alamatPengambilan) || null,
  estimasiDiterima: formData.metodePengambilan === 'kirim' ? formData.estimasiDiterima || null : null,
  sampleEntries: normalizeSampleEntries(formData.sampleEntries)
    .filter((entry) => entry.jenisSampel && entry.idRegBm && entry.parameters.length > 0)
    .map((entry) => ({
      idJenisSampel: entry.jenisSampel,
      idRegBm: entry.idRegBm,
      jumlahSampel: toPositiveInteger(entry.jumlahSampel),
      parameters: [...new Set(entry.parameters.filter(Boolean))],
    })),
});
