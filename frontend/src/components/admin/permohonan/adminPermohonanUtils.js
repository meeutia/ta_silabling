import { FPPL_STATUSES, normalizeFpplStatus } from '../../../utils/fpplStatus';
import { pickFirstFileValue } from '../../../utils/secureFileUrl';

const ACTIVE_LHU_PICKUP_STATUSES = ['Dijadwalkan', 'Disetujui Pelanggan', 'Disetujui Admin'];

export const getCustomerProfile = (requestItem) => requestItem?.Pelanggan || requestItem?.pelanggan || null;

export const readSampleQuantity = (sample) => {
  const rawValue =
    sample?.jumlah_sampel ??
    sample?.jumlahSampel ??
    sample?.jumlah ??
    sample?.total_sampel ??
    sample?.totalSampel ??
    1;

  const quantity = Number(rawValue);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
};

export const getRequestSamples = (requestItem) => {
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

    const existingQuantity = readSampleQuantity(existing);
    const incomingQuantity = readSampleQuantity(sample);

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
        sample?.FpplParameterMetodes ||
        existing?.FpplParameterMetodes,
      fppl_parameter_metodes:
        sample?.fppl_parameter_metodes ||
        existing?.fppl_parameter_metodes,
      fpplParameterMetodes:
        sample?.fpplParameterMetodes ||
        existing?.fpplParameterMetodes,
      Sampels:
        sample?.Sampels ||
        existing?.Sampels,
      sampels:
        sample?.sampels ||
        existing?.sampels,
    });
  });

  return Array.from(sampleMap.values()).sort((a, b) =>
    String(a?.id_fppl_sampel || '').localeCompare(String(b?.id_fppl_sampel || ''))
  );
};

export const getRequestSampleTypeName = (requestSample) => {
  const sampleType =
    requestSample?.JenisSampel ||
    requestSample?.jenis_sampel ||
    requestSample?.jenisSampel;

  if (!sampleType) return 'Sampel';
  if (typeof sampleType === 'string') return sampleType;

  return sampleType.jenis_sampel || sampleType.nama_jenis_sampel || 'Sampel';
};

export const getRegBmLabel = (requestSample) => {
  const reg =
    requestSample?.RegBm ||
    requestSample?.reg_bm ||
    requestSample?.regBm;

  if (!reg) return requestSample?.id_reg_bm || '-';
  if (typeof reg === 'string') return reg;

  const instansi = reg?.instansi || '';
  const ref = reg?.ref_reg || reg?.refReg || reg?.id_reg_bm || '';

  return [instansi, ref].filter(Boolean).join(' - ') || reg?.id_reg_bm || '-';
};

export const getSampleQuantity = readSampleQuantity;

export const buildSampleReceiptForms = (requestItem) => {
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
        kondisi: 'Sesuai',
        catatan: '',
        acuan_pengambilan_sampel: '',
        koordinat: '',
        id_sampel: '',
      });
    }
  });

  return forms;
};

export const getSampleParameterMethods = (requestSample) =>
  requestSample?.FpplParameterMetodes ||
  requestSample?.fppl_parameter_metodes ||
  requestSample?.fpplParameterMetodes ||
  [];

export const getParameterMethod = (sampleParameterMethod) =>
  sampleParameterMethod?.ParameterMetode ||
  sampleParameterMethod?.parameter_metode ||
  sampleParameterMethod?.parameterMetode ||
  null;

export const getParameterName = (sampleParameterMethod) => {
  const directParameter = sampleParameterMethod?.parameter || sampleParameterMethod?.Parameter;
  if (directParameter?.nama_parameter) return directParameter.nama_parameter;

  const parameterMethod = getParameterMethod(sampleParameterMethod);
  const pmParameter = parameterMethod?.Parameter || parameterMethod?.parameter || null;
  return pmParameter?.nama_parameter || '-';
};

export const getActualSamples = (requestSample) =>
  requestSample?.Sampels ||
  requestSample?.sampels ||
  requestSample?.Sampel ||
  [];

export const getMethodName = (sampleParameterMethod) => {
  const parameterMethod = getParameterMethod(sampleParameterMethod);
  const metode = parameterMethod?.Metode || parameterMethod?.metode || null;
  return metode?.nama_metode || '-';
};

export const getMethodReference = (sampleParameterMethod) => {
  const parameterMethod = getParameterMethod(sampleParameterMethod);
  return parameterMethod?.acuan_metode || '-';
};

export const getPriceValue = (sampleParameterMethod) => {
  const snapshot = sampleParameterMethod?.tarif_snapshot;
  if (snapshot !== null && snapshot !== undefined) return Number(snapshot) || 0;

  const parameterMethod = getParameterMethod(sampleParameterMethod);
  return Number(parameterMethod?.tarif || 0);
};

export const isTruthyFlag = (value) => {
  if (value === true || value === 1) return true;

  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

export const isSubkontrakParameter = (sampleParameterMethod) => {
  const parameterMethod = getParameterMethod(sampleParameterMethod);

  return (
    isTruthyFlag(sampleParameterMethod?.is_subkontrak_snapshot) ||
    isTruthyFlag(sampleParameterMethod?.isSubkontrakSnapshot) ||
    isTruthyFlag(sampleParameterMethod?.is_subkontrak) ||
    isTruthyFlag(sampleParameterMethod?.isSubkontrak) ||
    isTruthyFlag(parameterMethod?.is_subkontrak) ||
    isTruthyFlag(parameterMethod?.isSubkontrak) ||
    String(sampleParameterMethod?.status_kemampuan_lab || '').toUpperCase() === 'TIDAK_MAMPU'
  );
};

export const getLabCapabilityLabel = (sampleParameterMethod) => {
  const rawStatus = String(sampleParameterMethod?.status_kemampuan_lab || '').toUpperCase();

  if (isSubkontrakParameter(sampleParameterMethod)) {
    return 'Tidak Mampu / Subkontrak';
  }

  if (rawStatus === 'MAMPU') return 'Mampu';
  if (rawStatus === 'TIDAK_MAMPU') return 'Tidak Mampu';

  return sampleParameterMethod?.status_kemampuan_lab || '-';
};

export const getCustomerApprovalLabel = (sampleParameterMethod) =>
  sampleParameterMethod?.status_persetujuan_pelanggan || sampleParameterMethod?.statusPersetujuanPelanggan || '-';

export const getAccreditationLabel = (sampleParameterMethod) => {
  const parameterMethod = getParameterMethod(sampleParameterMethod);
  return parameterMethod?.is_terakreditasi ? 'Terakreditasi' : 'Non Akreditasi';
};

export const usesOfficerSampling = (requestItem) => requestItem?.jenis_pengambilan_sampel === 'Petugas';

export const getScheduleRows = (requestItem) =>
  requestItem?.JadwalSampels ||
  requestItem?.jadwal_sampels ||
  requestItem?.JadwalSampel ||
  requestItem?.jadwal_sampel ||
  [];

const ACTIVE_SAMPLE_SCHEDULE_STATUSES = ['Terjadwal', 'Disetujui Pelanggan', 'Disetujui Admin'];

export const getActiveSchedule = (requestItem) => {
  const activeRows = getScheduleRows(requestItem)
    .filter((row) => ACTIVE_SAMPLE_SCHEDULE_STATUSES.includes(row?.status_jadwal))
    .sort((a, b) => new Date(b?.dibuat_pada || 0).getTime() - new Date(a?.dibuat_pada || 0).getTime());

  return activeRows[0] || requestItem?.jadwal_sampel || null;
};

export const getInitialScheduleDate = (requestItem) => {
  const activeSchedule = getActiveSchedule(requestItem);
  return activeSchedule?.tanggal_jadwal || requestItem?.tanggal_rencana_pengambilan_sampel || requestItem?.tanggal_rencana_pengantaran_sampel || '';
};

export const getInitialScheduleTime = (requestItem) => {
  const activeSchedule = getActiveSchedule(requestItem);
  const rawTime = activeSchedule?.jam_jadwal || requestItem?.jam_rencana_pengambilan_sampel || '08:00:00';
  return String(rawTime).slice(0, 5);
};

export const getSampleTypeList = (requestItem) => {
  const requestSamples = getRequestSamples(requestItem);
  if (requestSamples.length === 0) return '-';

  return requestSamples
    .map((requestSample) => {
      const sampleType = requestSample?.JenisSampel || requestSample?.jenis_sampel || requestSample?.jenisSampel;
      if (!sampleType) return 'Unknown';
      if (typeof sampleType === 'string') return sampleType;
      return sampleType.jenis_sampel || sampleType.jenisSampel || 'Unknown';
    })
    .join(', ');
};

export const getParameterList = (requestItem) => {
  const parameterNames = [];
  getRequestSamples(requestItem).forEach((requestSample) => {
    getSampleParameterMethods(requestSample).forEach((sampleParameterMethod) => {
      const parameterName = getParameterName(sampleParameterMethod);
      if (parameterName && !parameterNames.includes(parameterName)) parameterNames.push(parameterName);
    });
  });
  return parameterNames;
};

export const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value) return [value];
  return [];
};

const toDateTimestamp = (value) => {
  if (!value) return 0;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
};

export const pickFirstValue = (...values) => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== '') return value;
  }
  return null;
};

export const getRequestPickupInfo = (requestItem) => {
  return (
    requestItem?.jadwal_pengambilan_lhu ||
    requestItem?.JadwalPengambilanLhu ||
    requestItem?.jadwalPengambilanLhu ||
    requestItem?.jadwal_pengambilan ||
    null
  );
};

export const getLhuFromSample = (actualSample) =>
  actualSample?.lhu || actualSample?.Lhu || actualSample?.LHU || actualSample?.lhu_data || null;

export const getLhuDetails = (lhu) =>
  toArray(lhu?.details || lhu?.Details || lhu?.detail_lhu || lhu?.DetailLhus || []);

export const getLhuFilePath = (lhu) => {
  return pickFirstFileValue(
    lhu?.fileLhuDownloadUrl,
    lhu?.file_lhu_download_url,
    lhu?.fileLhuSecureUrl,
    lhu?.file_lhu_secure_url,
    lhu?.fileLhuPath,
    lhu?.file_lhu_path,
    lhu?.filePath,
    lhu?.file_path,
    lhu?.fileLhu,
    lhu?.file_lhu
  );
};

export const getAdminSampleRows = (requestItem) => {
  const rows = [];

  getRequestSamples(requestItem).forEach((requestSample) => {
    const sampleTypeName = getRequestSampleTypeName(requestSample);
    const actualSamples = toArray(getActualSamples(requestSample));

    actualSamples.forEach((actualSample, index) => {
      rows.push({
        requestSample,
        actualSample,
        sampleTypeName,
        lhu: getLhuFromSample(actualSample),
        key: actualSample?.no_sampel || `${requestSample?.id_fppl_sampel || 'sampel'}-${index}`,
      });
    });
  });

  return rows;
};

export const getRequestTrackingSteps = (requestItem) => {
  const status = normalizeFpplStatus(requestItem?.status_fppl || requestItem?.status);
  const pickupInfo = getRequestPickupInfo(requestItem);
  const adminSampleRows = getAdminSampleRows(requestItem);
  const hasFinalLhu = adminSampleRows.some((row) => row.lhu?.status_lhu === 'Disahkan');

  const baseSteps = [
    {
      key: 'created',
      label: 'Permohonan dibuat',
      description: 'Pelanggan mengirim permohonan pengujian.',
      date: requestItem?.tanggal_pendaftaran,
      done: true,
    },
    {
      key: 'verified',
      label: 'Validasi admin',
      description: 'Permohonan diverifikasi oleh admin.',
      date: requestItem?.tanggal_verifikasi,
      done: ![FPPL_STATUSES.MENUNGGU_VERIFIKASI].includes(status),
      active: status === FPPL_STATUSES.MENUNGGU_VERIFIKASI,
    },
    {
      key: 'method',
      label: 'Penentuan metode',
      description: 'Kasi Pengujian menentukan parameter dan metode.',
      done: ![
        FPPL_STATUSES.MENUNGGU_VERIFIKASI,
        FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER,
      ].includes(status),
      active: status === FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER,
    },
    {
      key: 'payment',
      label: 'Pembayaran',
      description: 'Pembayaran dikonfirmasi otomatis oleh payment gateway.',
      done: ![
        FPPL_STATUSES.MENUNGGU_VERIFIKASI,
        FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER,
        FPPL_STATUSES.MENUNGGU_PEMBAYARAN,
        FPPL_STATUSES.MENUNGGU_VERIFIKASI_PEMBAYARAN,
      ].includes(status),
      active: [
        FPPL_STATUSES.MENUNGGU_PEMBAYARAN,
        FPPL_STATUSES.MENUNGGU_VERIFIKASI_PEMBAYARAN,
      ].includes(status),
    },
    {
      key: 'sample',
      label: 'Penerimaan sampel',
      description: 'Sampel diterima dan nomor sampel dibuat.',
      done: ![
        FPPL_STATUSES.MENUNGGU_VERIFIKASI,
        FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER,
        FPPL_STATUSES.MENUNGGU_PEMBAYARAN,
        FPPL_STATUSES.MENUNGGU_VERIFIKASI_PEMBAYARAN,
        FPPL_STATUSES.MENUNGGU_SAMPEL,
      ].includes(status),
      active: status === FPPL_STATUSES.MENUNGGU_SAMPEL,
    },
    {
      key: 'testing',
      label: 'Proses pengujian',
      description: 'Sampel dikerjakan analis sampai LHU disahkan.',
      done: [
        FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU,
        FPPL_STATUSES.MENUNGGU_PENGAMBILAN_LHU,
        FPPL_STATUSES.SELESAI,
      ].includes(status) || hasFinalLhu,
      active: status === FPPL_STATUSES.PROSES_PENGUJIAN,
    },
    {
      key: 'pickup_schedule',
      label: 'Jadwal pengambilan LHU',
      description: pickupInfo
        ? 'LHU selesai. Admin sudah membuat jadwal pengambilan LHU.'
        : 'Menunggu admin menjadwalkan pengambilan LHU.',
      date: pickupInfo?.tanggal_pengambilan,
      time: pickupInfo?.jam_pengambilan,
      done: Boolean(pickupInfo),
      active: status === FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU || (hasFinalLhu && !pickupInfo),
    },
    {
      key: 'completed',
      label: 'Selesai',
      description: pickupInfo?.status_pengambilan === 'Sudah Diambil'
        ? `LHU sudah diambil oleh ${pickupInfo?.nama_pengambil || 'pelanggan'}.`
        : 'LHU belum ditandai sudah diambil.',
      date: pickupInfo?.diambil_pada,
      done: status === FPPL_STATUSES.SELESAI || pickupInfo?.status_pengambilan === 'Sudah Diambil',
      active: status === FPPL_STATUSES.MENUNGGU_PENGAMBILAN_LHU || ACTIVE_LHU_PICKUP_STATUSES.includes(pickupInfo?.status_pengambilan),
    },
  ];

  return baseSteps.map((step) => ({
    ...step,
    state: step.done ? 'done' : step.active ? 'active' : 'pending',
  }));
};


const flattenValues = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenValues);
  return [value];
};

const pickLatestValue = (...values) => {
  const flattened = values.flatMap(flattenValues).filter(Boolean);
  if (!flattened.length) return null;

  return flattened.reduce((latest, current) => {
    const currentTime = toDateTimestamp(current);
    const latestTime = toDateTimestamp(latest);
    if (!latest || currentTime > latestTime) return current;
    return latest;
  }, null);
};

const getSampleAssignmentItems = (actualSample) => toArray(
  actualSample?.penugasan_items ||
  actualSample?.penugasanItems ||
  actualSample?.PenugasanItems ||
  actualSample?.assignments ||
  []
);

const getLkaRowsFromSample = (actualSample) => {
  return getSampleAssignmentItems(actualSample)
    .map((item) => {
      const detail = item?.penugasan_detail || item?.penugasanDetail || item?.PenugasanDetail || item?.detail || null;
      return detail?.lka || detail?.Lka || detail?.LKA || null;
    })
    .filter(Boolean);
};

const getLkaHasilRowsFromLka = (lka) => toArray(
  lka?.lka_hasils ||
  lka?.LkaHasils ||
  lka?.lkaHasil ||
  lka?.LkaHasil ||
  lka?.hasil ||
  []
);

export const getSampleTrackingSteps = (actualSample, lhu) => {
  const sampleStatus = String(actualSample?.status_sample || '');
  const lhuStatus = String(lhu?.status_lhu || '');
  const hasLhu = Boolean(lhu?.nomor_lhu);
  const lhuFinal = lhuStatus === 'Disahkan';
  const assignmentItems = getSampleAssignmentItems(actualSample);
  const lkaRows = getLkaRowsFromSample(actualSample);
  const lkaHasilRows = lkaRows.flatMap(getLkaHasilRowsFromLka).filter((row) => {
    const noSampel = row?.no_sampel || row?.noSampel;
    return !noSampel || noSampel === actualSample?.no_sampel;
  });

  const testingStartDate = pickFirstValue(
    assignmentItems.map((item) => pickFirstValue(
      item?.tanggal_penugasan,
      item?.tanggalPenugasan,
      item?.penugasan_detail?.penugasan?.assigned_at,
      item?.penugasanDetail?.penugasan?.assignedAt,
      item?.PenugasanDetail?.Penugasan?.assigned_at
    )),
    actualSample?.tanggal_mulai_pengujian,
    actualSample?.mulai_pengujian_pada,
    actualSample?.kasiPengujianReviewAt,
    actualSample?.diterima_pada,
    actualSample?.diterimaPada,
    actualSample?.tanggal_penerimaan,
    actualSample?.tanggalPenerimaan,
    actualSample?.tanggal_terima,
    actualSample?.tanggalTerima,
    actualSample?.tanggal_diterima,
    actualSample?.tanggalDiterima
  );

  const testingStartTime = pickFirstValue(
    actualSample?.jam_mulai_pengujian,
    actualSample?.jam_penerimaan,
    actualSample?.jamPenerimaan,
    actualSample?.jam_terima,
    actualSample?.jamTerima
  );

  const testingTimeForTimeline =
    testingStartDate && /[T: ]/.test(String(testingStartDate))
      ? null
      : testingStartTime;

  const lkaRevisionRows = lkaRows.filter((lka) => {
    const status = String(lka?.status_lka || '').toLowerCase();
    return status.includes('perlu perbaikan') || Boolean(lka?.catatan_revisi);
  });

  const lkaApprovedRows = lkaRows.filter((lka) => {
    const status = String(lka?.status_lka || '').toLowerCase();
    return status.includes('disetujui penyelia') || status.includes('kasi') || status.includes('pengendalian mutu') || status.includes('kepala lab') || status.includes('disahkan');
  });

  const hasilRevisiKasiRows = lkaHasilRows.filter((row) => {
    const status = String(row?.statusReviewHasil || '').toLowerCase();
    return status.includes('revisi') || Boolean(
      row?.catatan_revisi_hasil_kasi_pengujian ||
        row?.catatanRevisiHasilKasiPengujian ||
        row?.catatan_revisi_hasil_penyelia ||
        row?.catatanRevisiHasilPenyelia ||
        row?.catatan_revisi_hasil ||
        row?.revisi_kasi_pengujian_at ||
        row?.revisiKasiPengujianAt ||
        row?.revisi_penyelia_at ||
        row?.revisiPenyeliaAt ||
        row?.direvisi_pada
    );
  });

  const lkaRevisionDate = pickLatestValue(lkaRevisionRows.map((lka) => lka?.tanggal_pemeriksaan || lka?.tanggal_pelaporan));
  const lkaApprovedDate = pickLatestValue(lkaApprovedRows.map((lka) => lka?.tanggal_pemeriksaan || lka?.tanggal_pelaporan));
  const hasilRevisiKasiDate = pickLatestValue(hasilRevisiKasiRows.map((row) =>
    row?.revisi_kasi_pengujian_at ||
    row?.revisiKasiPengujianAt ||
    row?.revisi_penyelia_at ||
    row?.revisiPenyeliaAt ||
    row?.direvisi_pada
  ));
  const qcBmDate = pickFirstValue(lhu?.qc_at, lhu?.qcAt, lhu?.created_at, lhu?.createdAt);

  return [
    {
      key: 'sample_received',
      label: 'Sampel diterima',
      description: 'Admin menerima sampel dan membuat nomor sampel.',
      date: pickFirstValue(
        actualSample?.diterima_pada,
        actualSample?.diterimaPada,
        actualSample?.tanggal_penerimaan,
        actualSample?.tanggalPenerimaan,
        actualSample?.tanggal_terima,
        actualSample?.tanggalTerima,
        actualSample?.tanggal_diterima,
        actualSample?.tanggalDiterima
      ),
      time: pickFirstValue(
        actualSample?.jam_penerimaan,
        actualSample?.jamPenerimaan,
        actualSample?.jam_terima,
        actualSample?.jamTerima
      ),
      done: Boolean(actualSample?.no_sampel),
    },
    {
      key: 'testing_started',
      label: 'Dalam pengujian',
      description: 'Sampel sudah masuk alur penugasan dan pengujian analis.',
      date: testingStartDate,
      time: testingTimeForTimeline,
      done: ['Dalam Pengujian', 'Selesai'].includes(sampleStatus) || hasLhu || assignmentItems.length > 0,
      active: sampleStatus === 'Dalam Pengujian' && !hasLhu,
    },
    {
      key: 'lka_revised',
      label: 'Revisi dari Penyelia',
      description: 'Penyelia meminta revisi LKA analis.',
      date: lkaRevisionDate,
      done: lkaRevisionRows.length > 0,
    },
    {
      key: 'lka_approved_supervisor',
      label: 'LKA Disetujui Penyelia',
      description: 'Penyelia menyetujui LKA analis.',
      date: lkaApprovedDate,
      done: lkaApprovedRows.length > 0,
    },
    {
      key: 'hasil_revisi_kasi',
      label: 'Revisi dari Kasi',
      description: 'Kasi Pengujian meminta revisi pada hasil parameter sampel.',
      date: hasilRevisiKasiDate,
      done: hasilRevisiKasiRows.length > 0,
    },
    {
      key: 'hasil_approved_kasi',
      label: 'Kasi Pengujian Menyetujui Hasil Sampel',
      description: 'Seluruh hasil parameter sampel disetujui Kasi Pengujian.',
      date: pickFirstValue(actualSample?.kasiPengujianReviewAt, actualSample?.kasiPengujianReviewAt),
      done: String(actualSample?.statusReviewHasil || '').includes('Disetujui') || Boolean(actualSample?.kasiPengujianReviewAt),
    },
    {
      key: 'qc_baku_mutu',
      label: 'QC Menetapkan Baku Mutu',
      description: 'QC menetapkan paket/acuan baku mutu untuk LHU.',
      date: qcBmDate,
      done: Boolean(lhu?.id_pkt_bm || lhu?.nomor_lhu),
    },
    {
      key: 'lhu_created',
      label: 'LHU dibuat',
      description: hasLhu ? `Nomor LHU: ${lhu?.nomor_lhu}` : 'LHU belum dibuat.',
      date: pickFirstValue(
        lhu?.created_at,
        lhu?.createdAt,
        lhu?.tanggal_lhu,
        lhu?.tanggal_penerbitan
      ),
      done: hasLhu,
      active: sampleStatus === 'Selesai' && !hasLhu,
    },
    {
      key: 'lhu_approved_kalab',
      label: 'Disahkan Kepala Lab',
      description: lhuFinal
        ? 'LHU sudah disahkan dan siap diberikan ke pelanggan.'
        : 'Menunggu pengesahan LHU.',
      date: pickFirstValue(
        lhu?.kalab_at,
        lhu?.kalabAt,
        lhu?.disetujui_pada,
        lhu?.tanggal_penerbitan,
        lhu?.tanggal_lhu
      ),
      done: lhuFinal,
      active: hasLhu && !lhuFinal,
    },
  ].map((step) => ({
    ...step,
    state: step.done ? 'done' : step.active ? 'active' : 'pending',
  }));
};
