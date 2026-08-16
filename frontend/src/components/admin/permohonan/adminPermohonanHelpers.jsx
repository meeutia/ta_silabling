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

function pickSampleIdentity(sample) {
  return sample?.id_fppl_sampel || sample?.idFpplSampel || sample?.id || '';
}

function pickSampleTypeId(sample) {
  return sample?.id_jenis_sampel || sample?.idJenisSampel || sample?.JenisSampel?.id_jenis_sampel || sample?.jenis_sampel?.id_jenis_sampel || sample?.jenisSampel?.idJenisSampel || '';
}

function pickRegBmId(sample) {
  return sample?.id_reg_bm || sample?.idRegBm || sample?.RegBm?.id_reg_bm || sample?.reg_bm?.id_reg_bm || sample?.regBm?.idRegBm || '';
}

function pickRegistrationId(sample) {
  return sample?.id_registrasi || sample?.idRegistrasi || '';
}

function sameSampleGroup(a = {}, b = {}) {
  const pick = (row, snake, camel) => String(row?.[snake] ?? row?.[camel] ?? '').trim();

  const idJenisA = pick(a, 'id_jenis_sampel', 'idJenisSampel') || pickSampleTypeId(a);
  const idJenisB = pick(b, 'id_jenis_sampel', 'idJenisSampel') || pickSampleTypeId(b);
  const idRegA = pick(a, 'id_reg_bm', 'idRegBm') || pickRegBmId(a);
  const idRegB = pick(b, 'id_reg_bm', 'idRegBm') || pickRegBmId(b);
  const idRegistrasiA = pick(a, 'id_registrasi', 'idRegistrasi') || pickRegistrationId(a);
  const idRegistrasiB = pick(b, 'id_registrasi', 'idRegistrasi') || pickRegistrationId(b);

  if (idRegistrasiA && idRegistrasiB && idRegistrasiA !== idRegistrasiB) return false;
  return Boolean(idJenisA && idJenisB && idRegA && idRegB) && idJenisA === idJenisB && idRegA === idRegB;
}

function pickParameterIdentity(sampleParameterMethod) {
  const parameterMethod = getParameterMethod(sampleParameterMethod);
  const parameter = sampleParameterMethod?.Parameter || sampleParameterMethod?.parameter || parameterMethod?.Parameter || parameterMethod?.parameter || null;

  return (
    sampleParameterMethod?.id_fppl_parameter_metode ||
    sampleParameterMethod?.idFpplParameterMetode ||
    sampleParameterMethod?.id_parameter ||
    sampleParameterMethod?.idParameter ||
    parameter?.id_parameter ||
    parameter?.idParameter ||
    parameterMethod?.id_parameter ||
    parameterMethod?.idParameter ||
    parameterMethod?.id_parameter_metode ||
    parameterMethod?.idParameterMetode ||
    getParameterName(sampleParameterMethod)
  );
}

function getAllSampleParameterMethods(requestSample) {
  return [
    ...(Array.isArray(requestSample?.FpplParameterMetodes) ? requestSample.FpplParameterMetodes : []),
    ...(Array.isArray(requestSample?.fppl_parameter_metodes) ? requestSample.fppl_parameter_metodes : []),
    ...(Array.isArray(requestSample?.fpplParameterMetodes) ? requestSample.fpplParameterMetodes : []),
  ];
}


function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return Number.POSITIVE_INFINITY;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : Number.POSITIVE_INFINITY;
}

function extractActualSampleOrder(sample = {}) {
  const noSampel = String(
    sample?.no_sampel ||
    sample?.noSampel ||
    sample?.nomor_sampel ||
    sample?.nomorSampel ||
    ''
  ).trim();

  const leadingNumber = noSampel.match(/^\s*(\d+)\s*\//);
  if (leadingNumber) return Number(leadingNumber[1]);

  const looseLeadingNumber = noSampel.match(/^\s*(\d+)/);
  if (looseLeadingNumber) return Number(looseLeadingNumber[1]);

  return toFiniteNumber(
    sample?.sample_unit_index ??
    sample?.sampleUnitIndex ??
    sample?.sample_type_counter ??
    sample?.sampleTypeCounter ??
    sample?.urutan_sampel ??
    sample?.urutanSampel ??
    sample?.nomor_urut ??
    sample?.nomorUrut
  );
}

function compareActualSamples(a = {}, b = {}) {
  const orderA = extractActualSampleOrder(a);
  const orderB = extractActualSampleOrder(b);

  if (orderA !== orderB) return orderA - orderB;

  const noSampelA = String(a?.no_sampel || a?.noSampel || a?.nomor_sampel || a?.nomorSampel || '');
  const noSampelB = String(b?.no_sampel || b?.noSampel || b?.nomor_sampel || b?.nomorSampel || '');

  const byNoSampel = noSampelA.localeCompare(noSampelB, undefined, { numeric: true, sensitivity: 'base' });
  if (byNoSampel !== 0) return byNoSampel;

  return String(a?.id_sampel || a?.idSampel || '').localeCompare(String(b?.id_sampel || b?.idSampel || ''), undefined, { numeric: true, sensitivity: 'base' });
}

function sortActualSamples(rows = []) {
  return [...rows].sort(compareActualSamples);
}

function mergeUniqueByIdentity(items, pickIdentity) {
  const map = new Map();

  items.forEach((item, index) => {
    const identity = pickIdentity(item) || `idx-${index}`;
    const key = String(identity).trim().toLowerCase();
    const existing = map.get(key);
    map.set(key, existing ? { ...existing, ...item } : item);
  });

  return Array.from(map.values());
}

function buildSampleBusinessKey(sample) {
  const parameterSignature = mergeUniqueByIdentity(getAllSampleParameterMethods(sample), pickParameterIdentity)
    .map((item) => String(pickParameterIdentity(item) || '').trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('|');

  return [
    pickSampleTypeId(sample) || getRequestSampleTypeName(sample),
    pickRegBmId(sample) || getRegBmLabel(sample),
    parameterSignature,
  ]
    .map((value) => String(value || '').trim().toLowerCase())
    .join('::');
}

function mergeRequestSample(existing, incoming) {
  const existingQuantity = getSampleQuantity(existing);
  const incomingQuantity = getSampleQuantity(incoming);
  const mergedParameterMethods = mergeUniqueByIdentity(
    [
      ...getAllSampleParameterMethods(existing),
      ...getAllSampleParameterMethods(incoming),
    ],
    pickParameterIdentity
  );

  return {
    ...existing,
    ...incoming,
    id_fppl_sampel: pickSampleIdentity(incoming) || pickSampleIdentity(existing),
    idFpplSampel: pickSampleIdentity(incoming) || pickSampleIdentity(existing),
    id_registrasi: pickRegistrationId(incoming) || pickRegistrationId(existing),
    idRegistrasi: pickRegistrationId(incoming) || pickRegistrationId(existing),
    id_jenis_sampel: pickSampleTypeId(incoming) || pickSampleTypeId(existing),
    idJenisSampel: pickSampleTypeId(incoming) || pickSampleTypeId(existing),
    id_reg_bm: pickRegBmId(incoming) || pickRegBmId(existing),
    idRegBm: pickRegBmId(incoming) || pickRegBmId(existing),
    jumlah_sampel: Math.max(existingQuantity, incomingQuantity),
    jumlahSampel: Math.max(existingQuantity, incomingQuantity),
    JenisSampel: incoming?.JenisSampel || existing?.JenisSampel,
    jenis_sampel: incoming?.jenis_sampel || existing?.jenis_sampel,
    jenisSampel: incoming?.jenisSampel || existing?.jenisSampel,
    RegBm: incoming?.RegBm || existing?.RegBm,
    reg_bm: incoming?.reg_bm || existing?.reg_bm,
    regBm: incoming?.regBm || existing?.regBm,
    FpplParameterMetodes: mergedParameterMethods,
    fppl_parameter_metodes: mergedParameterMethods,
    fpplParameterMetodes: mergedParameterMethods,
    Sampels: incoming?.Sampels || existing?.Sampels,
    sampels: incoming?.sampels || existing?.sampels,
  };
}

export function getRequestSamples(requestItem) {
  const allSamples = [
    ...(Array.isArray(requestItem?.FpplSampels) ? requestItem.FpplSampels : []),
    ...(Array.isArray(requestItem?.fppl_sampels) ? requestItem.fppl_sampels : []),
    ...(Array.isArray(requestItem?.fpplSampels) ? requestItem.fpplSampels : []),
  ];

  const sampleMap = new Map();

  allSamples.forEach((sample) => {
    const key = pickSampleIdentity(sample) || buildSampleBusinessKey(sample);
    const normalizedKey = String(key).trim().toLowerCase();
    const existing = sampleMap.get(normalizedKey);

    sampleMap.set(normalizedKey, existing ? mergeRequestSample(existing, sample) : mergeRequestSample({}, sample));
  });

  return Array.from(sampleMap.values()).sort((a, b) =>
    String(pickSampleIdentity(a) || buildSampleBusinessKey(a)).localeCompare(String(pickSampleIdentity(b) || buildSampleBusinessKey(b)))
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
        id_fppl_sampel: sample.id_fppl_sampel || sample.idFpplSampel || '',
        idFpplSampel: sample.id_fppl_sampel || sample.idFpplSampel || '',
        id_registrasi: pickRegistrationId(sample) || requestItem?.id_registrasi || requestItem?.idRegistrasi || '',
        idRegistrasi: pickRegistrationId(sample) || requestItem?.id_registrasi || requestItem?.idRegistrasi || '',
        id_jenis_sampel: pickSampleTypeId(sample),
        idJenisSampel: pickSampleTypeId(sample),
        id_reg_bm: pickRegBmId(sample),
        idRegBm: pickRegBmId(sample),
        sample_group_index: groupIndex,
        sample_unit_index: unitIndex + 1,
        sample_type_counter: counterByType[sampleTypeName],
        sample_type_name: sampleTypeName,
        sample_label: `${sampleTypeName} ${counterByType[sampleTypeName]}`,
        tanggal_pengambilan_sampel: '',
        tanggal_terima: '',
        jam_terima: '',

        catatan: '',
        acuan_pengambilan_sampel: '',
        lokasi_spesifik: '',
        lokasiSpesifik: '',
        koordinat: '',
        id_sampel: '',
        parameters: getSampleParameterMethods(sample).map((pm) => ({
          id_fppl_parameter_metode: pm.id_fppl_parameter_metode || pm.idFpplParameterMetode,
          nama_parameter: getParameterName(pm),
          acuan_metode: getMethodReference(pm),
          nama_metode: getMethodName(pm),
          wadah: '',
          volume_ml: '',
          perlakuan_pengawetan: ''
        }))
      });
    }
  });


  return forms;
}

export function getSampleParameterMethods(requestSample) {
  return mergeUniqueByIdentity(getAllSampleParameterMethods(requestSample), pickParameterIdentity);
}

export function getParameterMethod(sampleParameterMethod) {
  return sampleParameterMethod?.ParameterMetode || sampleParameterMethod?.parameter_metode || sampleParameterMethod?.parameterMetode || null;
}

export function getParameterName(sampleParameterMethod) {
  const directParameter = sampleParameterMethod?.parameter || sampleParameterMethod?.Parameter;
  if (directParameter?.nama_parameter || directParameter?.namaParameter) return directParameter.nama_parameter || directParameter.namaParameter;

  const parameterMethod = getParameterMethod(sampleParameterMethod);
  const pmParameter = parameterMethod?.Parameter || parameterMethod?.parameter || null;
  return pmParameter?.nama_parameter || pmParameter?.namaParameter || '-';
}

export function getActualSamples(requestSample) {
  const rows = requestSample?.Sampels || requestSample?.sampels || requestSample?.Sampel || [];
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const hasCompositeFields = rows.some((row) => row?.id_jenis_sampel || row?.idJenisSampel || row?.id_reg_bm || row?.idRegBm);
  const matchedRows = hasCompositeFields ? rows.filter((row) => sameSampleGroup(row, requestSample)) : rows;

  return sortActualSamples(matchedRows);
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
