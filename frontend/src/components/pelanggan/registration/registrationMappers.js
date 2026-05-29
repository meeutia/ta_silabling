import { KNOWN_TESTING_PURPOSES } from './registrationConstants';
import { asTrimmedText, toPositiveInteger } from '../../../utils/formValidation';
import { toTimeHHmmOrEmpty, toYmdOrEmpty } from './registrationDateUtils';

export const createEmptySampleEntry = () => ({
  jenisSampel: '',
  idRegBm: '',
  parameters: [],
  jumlahSampel: 1,
});

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

  return mapped.length > 0 ? mapped : [createEmptySampleEntry()];
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
  const savedPurpose = request?.maksud_pengujian || '';
  const isKnownPurpose = knownPurposes.has(savedPurpose);

  return {
    ...createDefaultFormData(fallbackUserData),
    id_pelanggan: pelanggan?.id_pelanggan || request?.id_pelanggan || '',
    namaInstansi: pelanggan?.nama_instansi || '',
    pic: pelanggan?.pic || fallbackUserData?.username || fallbackUserData?.nama_user || '',
    emailPic: pelanggan?.email_kontak || fallbackUserData?.email || '',
    noTelp: pelanggan?.no_telp || fallbackUserData?.no_telp || '',
    alamat: pelanggan?.alamat || fallbackUserData?.alamat || '',
    maksudPengujian: isKnownPurpose ? savedPurpose : savedPurpose ? 'lainnya' : '',
    maksudLainnya: isKnownPurpose ? '' : savedPurpose,
    metodePengambilan,
    tanggalPengambilan: isPetugas ? toYmdOrEmpty(request?.tanggal_rencana_pengambilan_sampel) : '',
    jamPengambilan: isPetugas ? toTimeHHmmOrEmpty(request?.jam_rencana_pengambilan_sampel) : '',
    estimasiDiterima: isMandiri ? toYmdOrEmpty(request?.tanggal_rencana_pengantaran_sampel) : '',
    alamatPengambilan: request?.lokasi_pengambilan_sampel || '',
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
  id_pelanggan: formData.id_pelanggan,
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
  sampleEntries: formData.sampleEntries
    .filter((entry) => entry.jenisSampel && entry.idRegBm && entry.parameters.length > 0)
    .map((entry) => ({
      jenisSampel: entry.jenisSampel,
      idRegBm: entry.idRegBm,
      jumlahSampel: toPositiveInteger(entry.jumlahSampel),
      parameters: entry.parameters,
    })),
});
