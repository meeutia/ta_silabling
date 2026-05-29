import { FPPL_STATUSES, normalizeFpplStatus } from '../../../utils/fpplStatus';
import { pickFirstFileValue } from '../../../utils/secureFileUrl';
import { getLhuStatusDisplayLabel, normalizeLhuStatus } from '../../../utils/workflowAccessRules';
import {
  findLatestFpplStatusLog,
  getActivityLogAction as getActivityAction,
  getActivityLogDate as getLogDate,
  getActivityLogsFromSource as getActivityLogsFromRequest,
} from '../../../utils/activityLog.util';
import {
  getActualSamples,
  getRequestSamples,
  getRequestSampleTypeName,
} from './adminPermohonanHelpers';

const ACTIVE_LHU_PICKUP_STATUSES = ['Dijadwalkan', 'Disetujui Pelanggan', 'Disetujui Admin'];

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

const getPaymentFromInvoiceInfo = (invoiceInfo) => (
  invoiceInfo?.payment ||
  invoiceInfo?.Payment ||
  invoiceInfo?.pembayaran ||
  invoiceInfo?.Pembayaran ||
  invoiceInfo?.paymentData ||
  null
);

export const getPaymentStatusLabel = (invoiceInfo) => {
  const payment = getPaymentFromInvoiceInfo(invoiceInfo);
  const statusInvoice = String(invoiceInfo?.status_invoice || invoiceInfo?.statusInvoice || '').toLowerCase();
  const metodeBayar = String(payment?.metode_bayar || payment?.metodeBayar || '').toUpperCase();
  const deferredFlag = Boolean(
    invoiceInfo?.isDeferredByAdmin ||
      invoiceInfo?.is_deferred_by_admin ||
      payment?.isDeferredByAdmin ||
      payment?.is_deferred_by_admin ||
      payment?.pembayaran_di_akhir ||
      payment?.deferredByAdmin
  );

  if (statusInvoice.includes('Bayar Nanti') || metodeBayar === 'PEMBAYARAN_AKHIR_ADMIN' || deferredFlag) {
    return 'Bayar Nanti';
  }

  if (statusInvoice.includes('lunas')) {
    return 'Lunas';
  }

  return 'Lunas';
};

export const getPaymentTimelineDescription = (invoiceInfo, audience = 'admin') => {
  const paymentStatus = getPaymentStatusLabel(invoiceInfo);

  if (paymentStatus === 'Bayar Nanti') {
    return audience === 'pelanggan'
      ? 'Status pembayaran: Bayar Nanti. Skema ini telah dicatat oleh admin.'
      : 'Status pembayaran: Bayar Nanti. Admin mencatat skema Bayar Nanti.';
  }

  return audience === 'pelanggan'
    ? 'Status pembayaran: Lunas. Pembayaran dikonfirmasi otomatis oleh payment gateway.'
    : 'Status pembayaran: Lunas. Pembayaran dikonfirmasi otomatis oleh payment gateway.';
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

export const getLhuFromSample = (actualSample) => {
  const listCandidate = [
    actualSample?.lhus,
    actualSample?.Lhus,
    actualSample?.lhu_list,
    actualSample?.lhuList,
    actualSample?.lhu_rows,
    actualSample?.lhuRows,
  ].find((value) => Array.isArray(value));

  if (Array.isArray(listCandidate)) return listCandidate.find(Boolean) || null;

  return actualSample?.lhu || actualSample?.Lhu || actualSample?.LHU || actualSample?.lhu_data || null;
};

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


const getLhuIdentity = (lhu, fallback = '') => (
  lhu?.nomor_lhu ||
  lhu?.nomorLhu ||
  lhu?.id_lhu ||
  lhu?.idLhu ||
  fallback
);

export const getUniqueAdminLhuRows = (requestItem) => {
  const seen = new Set();
  const directLhuRows = toArray(
    requestItem?.lhus ||
      requestItem?.Lhus ||
      requestItem?.lhu_list ||
      requestItem?.lhuList ||
      requestItem?.lhu_rows ||
      requestItem?.lhuRows
  );
  const sampleLhuRows = getAdminSampleRows(requestItem)
    .flatMap((row) => {
      const listCandidate = [
        row?.actualSample?.lhus,
        row?.actualSample?.Lhus,
        row?.actualSample?.lhu_list,
        row?.actualSample?.lhuList,
        row?.actualSample?.lhu_rows,
        row?.actualSample?.lhuRows,
      ].find((value) => Array.isArray(value));

      if (Array.isArray(listCandidate)) return listCandidate.filter(Boolean);
      return row.lhu ? [row.lhu] : [];
    });

  return [...directLhuRows, ...sampleLhuRows]
    .filter(Boolean)
    .filter((lhu, index) => {
      const key = String(getLhuIdentity(lhu, `lhu-${index}`)).trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};
const getNormalizedLhuStatus = (lhu) => normalizeLhuStatus(lhu?.status_lhu || lhu?.statusLhu || '');
const isLhuDisahkan = (lhu) => getNormalizedLhuStatus(lhu) === 'Disahkan';
const isLhuWaitingQc = (lhu) => ['Draft', 'Menunggu QC'].includes(getNormalizedLhuStatus(lhu));
const isLhuWaitingKalab = (lhu) => getNormalizedLhuStatus(lhu) === 'Menunggu Persetujuan Kepala Lab';


const getActivityEntityType = (log) => log?.entity_type || log?.entityType || '';
const getActivityEntityId = (log) => log?.entity_id || log?.entityId || '';
const getActivityRowsByActions = (requestItem, actionList = [], entityTypes = []) => {
  const actions = new Set(actionList.filter(Boolean));
  const types = new Set(entityTypes.filter(Boolean));

  return getActivityLogsFromRequest(requestItem).filter((log) => {
    const action = getActivityAction(log);
    const entityType = getActivityEntityType(log);
    const matchesAction = actions.size === 0 || actions.has(action);
    const matchesType = types.size === 0 || types.has(entityType);
    return matchesAction && matchesType && getLogDate(log);
  });
};

const getUniqueActivityEntityIds = (rows = []) => {
  const ids = new Set();
  rows.forEach((row, index) => {
    const id = String(getActivityEntityId(row) || `row-${index}`).trim();
    if (id) ids.add(id);
  });
  return ids;
};

const getAdminLhuActivityFacts = (requestItem) => {
  const createdRows = getActivityRowsByActions(requestItem, ['MEMBUAT_LHU', 'QC_MENYETUJUI_LHU'], ['LHU']);
  const approvedRows = getActivityRowsByActions(requestItem, ['KALAB_MENGESAHKAN_LHU'], ['LHU']);

  const createdIds = getUniqueActivityEntityIds(createdRows);
  const approvedIds = getUniqueActivityEntityIds(approvedRows);
  const hasLhuActivity = createdRows.length > 0 || approvedRows.length > 0;
  const allApproved = approvedRows.length > 0 && (
    createdIds.size === 0 || Array.from(createdIds).every((id) => approvedIds.has(id))
  );

  return {
    hasLhuActivity,
    hasCreatedOrQcLhu: createdRows.length > 0,
    hasApprovedLhu: approvedRows.length > 0,
    allApproved,
  };
};

export const getLhuStatusBadge = (status) => {
  const normalizedStatus = getLhuStatusDisplayLabel(status || 'Belum Ada LHU', 'Belum Ada LHU');
  let className = 'bg-gray-100 text-gray-700';

  if (normalizedStatus === 'Disahkan') {
    className = 'bg-emerald-100 text-emerald-700';
  } else if (normalizedStatus.includes('Menunggu')) {
    className = 'bg-amber-100 text-amber-700';
  } else if (normalizedStatus.includes('Revisi') || normalizedStatus.includes('Perbaikan')) {
    className = 'bg-red-100 text-red-700';
  } else if (normalizedStatus.includes('Disetujui')) {
    className = 'bg-blue-100 text-blue-700';
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${className}`}>
      {normalizedStatus}
    </span>
  );
};

export const getRequestTrackingSteps = (requestItem) => {
  const status = normalizeFpplStatus(requestItem?.status_fppl || requestItem?.status);
  const pickupInfo = getRequestPickupInfo(requestItem);
  const uniqueLhus = getUniqueAdminLhuRows(requestItem);
  const lhuActivityFacts = getAdminLhuActivityFacts(requestItem);
  const hasLhuRows = uniqueLhus.length > 0;
  const hasAnyLhu = hasLhuRows || lhuActivityFacts.hasLhuActivity;
  const allLhuDisahkan = hasLhuRows
    ? uniqueLhus.every(isLhuDisahkan)
    : lhuActivityFacts.allApproved;
  const hasLhuWaitingQc = uniqueLhus.some(isLhuWaitingQc);
  const hasLhuWaitingKalab = uniqueLhus.some(isLhuWaitingKalab) || (lhuActivityFacts.hasCreatedOrQcLhu && !allLhuDisahkan);
  const invoiceInfo = requestItem?.invoice || requestItem?.Invoice || requestItem?.invoiceSummary || null;
  const verifiedLog = findLatestFpplStatusLog(requestItem, [FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER], ['MEMVERIFIKASI_PERMOHONAN']);
  const verifiedDate = getLogDate(verifiedLog) || requestItem?.tanggal_verifikasi;
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
      label: 'Permohonan diverifikasi admin',
      description: 'Admin memeriksa dan memverifikasi kelengkapan data permohonan.',
      date: verifiedDate,
      done: ![FPPL_STATUSES.MENUNGGU_VERIFIKASI].includes(status),
      active: status === FPPL_STATUSES.MENUNGGU_VERIFIKASI,
    },
    {
      key: 'method',
      label: 'Metode pengujian ditetapkan Kasi',
      description: 'Kasi Pengujian menetapkan metode uji dan tarif parameter. Rincian biaya pengujian otomatis diterbitkan.',
      done: ![
        FPPL_STATUSES.MENUNGGU_VERIFIKASI,
        FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER,
      ].includes(status),
      active: status === FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER,
    },
    {
      key: 'payment',
      label: 'Biaya disetujui dan pembayaran dikonfirmasi',
      description: getPaymentTimelineDescription(invoiceInfo, 'admin'),
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
      label: 'Sampel diterima',
      description: 'Admin menerima sampel dan membuat nomor sampel.',
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
      label: 'Sampel masuk pengujian',
      description: 'Sampel masuk ke alur penugasan dan pengujian analis.',
      done: status === FPPL_STATUSES.SELESAI || hasAnyLhu,
      active: status === FPPL_STATUSES.PROSES_PENGUJIAN && !hasAnyLhu,
    },
    {
      key: 'lhu_qc',
      label: 'LHU difinalisasi QC',
      description: hasLhuWaitingKalab || allLhuDisahkan
        ? 'QC telah memfinalisasi LHU dan meneruskannya ke Kepala Lab.'
        : 'Menunggu QC memfinalisasi LHU.',
      done: hasLhuWaitingKalab || allLhuDisahkan,
      active: hasAnyLhu && hasLhuWaitingQc && !hasLhuWaitingKalab && !allLhuDisahkan,
    },
    {
      key: 'lhu_kalab',
      label: 'LHU disahkan Kepala Lab',
      description: allLhuDisahkan
        ? 'Kepala Lab telah mengesahkan seluruh LHU permohonan ini.'
        : 'Menunggu Kepala Lab mengesahkan LHU.',
      done: allLhuDisahkan,
      active: hasLhuWaitingKalab && !allLhuDisahkan,
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
      active: allLhuDisahkan && !pickupInfo,
    },
    {
      key: 'completed',
      label: 'Selesai',
      description: pickupInfo?.status_pengambilan === 'Sudah Diambil'
        ? `LHU sudah diambil oleh ${pickupInfo?.nama_pengambil || 'pelanggan'}.`
        : 'LHU belum ditandai sudah diambil.',
      date: pickupInfo?.diambil_pada,
      done: status === FPPL_STATUSES.SELESAI || pickupInfo?.status_pengambilan === 'Sudah Diambil',
      active: ACTIVE_LHU_PICKUP_STATUSES.includes(pickupInfo?.status_pengambilan),
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
      label: 'Sampel masuk pengujian',
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
      label: 'LHU difinalisasi QC',
      description: 'QC menetapkan paket/acuan baku mutu, menerbitkan nomor LHU, dan meneruskan LHU ke Kepala Lab.',
      date: qcBmDate,
      done: Boolean(lhu?.id_pkt_bm || lhu?.nomor_lhu),
    },
    {
      key: 'lhu_created',
      label: 'Nomor LHU diterbitkan',
      description: hasLhu ? `Nomor LHU: ${lhu?.nomor_lhu}` : 'Nomor LHU belum diterbitkan.',
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
      label: 'LHU disahkan Kepala Lab',
      description: lhuFinal
        ? 'Kepala Lab mengesahkan LHU.'
        : 'Menunggu pengesahan LHU oleh Kepala Lab.',
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
