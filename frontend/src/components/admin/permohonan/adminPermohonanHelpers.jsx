import { formatRupiah } from '../../../utils/formatters';

export const formatCurrency = formatRupiah;

export function getCustomerProfile(requestItem) {
  return requestItem?.Pelanggan || requestItem?.pelanggan || null;
}

export function getSampleQuantity(sample) {
  const rawValue =
    sample?.jumlah_sampel ??
    sample?.jumlahSampel ??
    sample?.jumlah ??
    sample?.total_sampel ??
    sample?.totalSampel ??
    1;

  const quantity = Number(rawValue);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

export function getRequestSamples(requestItem) {
  const allSamples = [
    ...(Array.isArray(requestItem?.FpplSampels) ? requestItem.FpplSampels : []),
    ...(Array.isArray(requestItem?.fppl_sampels) ? requestItem.fppl_sampels : []),
    ...(Array.isArray(requestItem?.fpplSampels) ? requestItem.fpplSampels : []),
  ];

  const sampleMap = new Map();

  allSamples.forEach((sample, index) => {
    const key =
      sample?.id_fppl_sampel ||
      `${sample?.id_jenis_sampel || sample?.idJenisSampel || 'jenis'}-${sample?.id_reg_bm || sample?.idRegBm || 'reg'}-${index}`;

    const existing = sampleMap.get(key);

    if (!existing) {
      sampleMap.set(key, sample);
      return;
    }

    const existingQuantity = getSampleQuantity(existing);
    const incomingQuantity = getSampleQuantity(sample);

    sampleMap.set(key, {
      ...existing,
      ...sample,
      jumlah_sampel: Math.max(existingQuantity, incomingQuantity),
      jumlahSampel: Math.max(existingQuantity, incomingQuantity),
      JenisSampel: sample?.JenisSampel || existing?.JenisSampel,
      jenis_sampel: sample?.jenis_sampel || existing?.jenis_sampel,
      jenisSampel: sample?.jenisSampel || existing?.jenisSampel,
      RegBm: sample?.RegBm || existing?.RegBm,
      reg_bm: sample?.reg_bm || existing?.reg_bm,
      regBm: sample?.regBm || existing?.regBm,
      FpplParameterMetodes:
        sample?.FpplParameterMetodes || existing?.FpplParameterMetodes,
      fppl_parameter_metodes:
        sample?.fppl_parameter_metodes || existing?.fppl_parameter_metodes,
      fpplParameterMetodes:
        sample?.fpplParameterMetodes || existing?.fpplParameterMetodes,
      Sampels: sample?.Sampels || existing?.Sampels,
      sampels: sample?.sampels || existing?.sampels,
    });
  });

  return Array.from(sampleMap.values()).sort((a, b) =>
    String(a?.id_fppl_sampel || '').localeCompare(String(b?.id_fppl_sampel || ''))
  );
}

export function getRequestSampleTypeName(requestSample) {
  const sampleType =
    requestSample?.JenisSampel ||
    requestSample?.jenis_sampel ||
    requestSample?.jenisSampel;

  if (!sampleType) return 'Sampel';
  if (typeof sampleType === 'string') return sampleType;

  return sampleType.jenis_sampel || sampleType.nama_jenis_sampel || 'Sampel';
}

export function getRegBmLabel(requestSample) {
  const reg =
    requestSample?.RegBm ||
    requestSample?.reg_bm ||
    requestSample?.regBm;

  if (!reg) return requestSample?.id_reg_bm || '-';
  if (typeof reg === 'string') return reg;

  const instansi = reg?.instansi || '';
  const ref = reg?.ref_reg || reg?.refReg || reg?.id_reg_bm || '';

  return [instansi, ref].filter(Boolean).join(' - ') || reg?.id_reg_bm || '-';
}

export function buildSampleReceiptForms(requestItem) {
  const requestSamples = getRequestSamples(requestItem);
  const counterByType = {};
  const forms = [];

  requestSamples.forEach((sample, groupIndex) => {
    const sampleTypeName = getRequestSampleTypeName(sample);
    const totalSamples = getSampleQuantity(sample);

    if (!counterByType[sampleTypeName]) {
      counterByType[sampleTypeName] = 0;
    }

    for (let unitIndex = 0; unitIndex < totalSamples; unitIndex += 1) {
      counterByType[sampleTypeName] += 1;

      forms.push({
        id_fppl_sampel: sample.id_fppl_sampel,
        sample_group_index: groupIndex,
        sample_unit_index: unitIndex + 1,
        sample_type_counter: counterByType[sampleTypeName],
        sample_type_name: sampleTypeName,
        sample_label: `${sampleTypeName} ${counterByType[sampleTypeName]}`,
        tanggal_pengambilan_sampel: '',
        tanggal_terima: '',
        jam_terima: '',
        kondisi: 'Sesuai',
        catatan: '',
        acuan_pengambilan_sampel: '',
        lokasi_spesifik: '',
        lokasiSpesifik: '',
        koordinat: '',
        id_sampel: '',
      });
    }
  });


  return forms;
}

export function getSampleParameterMethods(requestSample) {
  return requestSample?.FpplParameterMetodes || requestSample?.fppl_parameter_metodes || requestSample?.fpplParameterMetodes || [];
}

export function getParameterMethod(sampleParameterMethod) {
  return sampleParameterMethod?.ParameterMetode || sampleParameterMethod?.parameter_metode || sampleParameterMethod?.parameterMetode || null;
}

export function getParameterName(sampleParameterMethod) {
  const directParameter = sampleParameterMethod?.parameter || sampleParameterMethod?.Parameter;
  if (directParameter?.nama_parameter) return directParameter.nama_parameter;

  const parameterMethod = getParameterMethod(sampleParameterMethod);
  const pmParameter = parameterMethod?.Parameter || parameterMethod?.parameter || null;
  return pmParameter?.nama_parameter || '-';
}

export function getActualSamples(requestSample) {
  return requestSample?.Sampels || requestSample?.sampels || requestSample?.Sampel || [];
}

export function getMethodName(sampleParameterMethod) {
  const parameterMethod = getParameterMethod(sampleParameterMethod);
  const metode = parameterMethod?.Metode || parameterMethod?.metode || null;

  return metode?.nama_metode || '-';
}

export function getMethodReference(sampleParameterMethod) {
  const parameterMethod = getParameterMethod(sampleParameterMethod);
  return parameterMethod?.acuan_metode || '-';
}

export function getPriceValue(sampleParameterMethod) {
  const data = sampleParameterMethod?.tarif;
  if (data !== null && data !== undefined) return Number(data) || 0;

  const parameterMethod = getParameterMethod(sampleParameterMethod);
  return Number(parameterMethod?.tarif || 0);
}

export function isTruthyFlag(value) {
  if (value === true || value === 1) return true;

  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export function isSubkontrakParameter(sampleParameterMethod) {
  const parameterMethod = getParameterMethod(sampleParameterMethod);

  return (
    isTruthyFlag(sampleParameterMethod?.is_subkontrak) ||
    isTruthyFlag(sampleParameterMethod?.isSubkontrak) ||
    isTruthyFlag(sampleParameterMethod?.is_subkontrak) ||
    isTruthyFlag(sampleParameterMethod?.isSubkontrak) ||
    isTruthyFlag(parameterMethod?.is_subkontrak) ||
    isTruthyFlag(parameterMethod?.isSubkontrak) ||
    String(sampleParameterMethod?.status_kemampuan_lab || '').toUpperCase() === 'TIDAK_MAMPU'
  );
}

export function getLabCapabilityLabel(sampleParameterMethod) {
  const rawStatus = String(sampleParameterMethod?.status_kemampuan_lab || '').toUpperCase();

  if (isSubkontrakParameter(sampleParameterMethod)) {
    return 'Tidak Mampu / Subkontrak';
  }

  if (rawStatus === 'MAMPU') {
    return 'Mampu';
  }

  if (rawStatus === 'TIDAK_MAMPU') {
    return 'Tidak Mampu';
  }

  return sampleParameterMethod?.status_kemampuan_lab || '-';
}

export function renderLabCapabilityCell(sampleParameterMethod) {
  const isSubkontrak = isSubkontrakParameter(sampleParameterMethod);
  const label = getLabCapabilityLabel(sampleParameterMethod);

  if (isSubkontrak) {
    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium text-orange-700">{label}</span>
        <span className="w-fit rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
          Subkontrak
        </span>
      </div>
    );
  }

  return <span className="font-medium text-emerald-700">{label}</span>;
}

export function getCustomerApprovalLabel(sampleParameterMethod) {
  return sampleParameterMethod?.status_persetujuan_pelanggan || sampleParameterMethod?.statusPersetujuanPelanggan || '-';
}

export function getAccreditationLabel(sampleParameterMethod) {
  const parameterMethod = getParameterMethod(sampleParameterMethod);
  return parameterMethod?.is_terakreditasi ? 'Terakreditasi' : 'Non Akreditasi';
}

export function usesOfficerSampling(requestItem) {
  return requestItem?.jenis_pengambilan_sampel === 'Petugas';
}
