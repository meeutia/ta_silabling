import { FPPL_STATUSES } from '../../../utils/fpplStatus';
import {
  findLatestFpplStatusLog,
  getActivityLogAction as normalizeActivityAction,
  getActivityLogDate as getLogDate,
  getActivityLogsFromSource as getActivityLogsFromRequest,
} from '../../../utils/activityLog.util';
import {
  combineDateTimeValue,
  formatDateTime,
  formatTimelineDateValue,
  getActivityLogDateByActions,
  getTimelineSortTimestamp,
  pickFirstDateValue,
  sortTimelineItemsAscending,
} from './detailPermohonanCore';
import {
  getMethodDecisionDateFromRequest,
  getPaymentConfirmedDate,
  getPaymentTimelineNote,
} from './detailPermohonanBilling';
import {
  buildLhuTimelineGroupsFromRequest,
  getCustomerSampleCountText,
  getLhuActivityFacts,
  getSampleReceivedDateFromRequest,
  isLhuApprovedForProgress,
} from './detailPermohonanSampleLhu';
import {
  buildScheduleChangeTimelineItems,
  getLhuPickupInfoFromRequest,
  getScheduleDecisionDate,
  getScheduleTargetDate,
  getScheduleTargetTime,
  getTestingStartedDate,
} from './detailPermohonanSchedule';

const LHU_STAGE_STATUSES = [
  FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU,
  FPPL_STATUSES.MENUNGGU_PENGAMBILAN_LHU,
];

const AFTER_PAYMENT_STATUSES = [
  FPPL_STATUSES.MENUNGGU_SAMPEL,
  FPPL_STATUSES.PROSES_PENGUJIAN,
  FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU,
  FPPL_STATUSES.MENUNGGU_PENGAMBILAN_LHU,
  FPPL_STATUSES.SELESAI,
];

const AFTER_SAMPLE_STATUSES = [
  FPPL_STATUSES.PROSES_PENGUJIAN,
  FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU,
  FPPL_STATUSES.MENUNGGU_PENGAMBILAN_LHU,
  FPPL_STATUSES.SELESAI,
];

const ACTION_TIMELINE_LABELS = {
  MENCATAT_PEMBAYARAN_AKHIR: {
    status: 'Pembayaran Akhir Dicatat',
    note: 'Pembayaran akhir telah dicatat oleh admin.',
    order: 41,
  },
};

const buildExtraActivityLogTimelineItems = (requestData) => {
  const seen = new Set();
  return getActivityLogsFromRequest(requestData)
    .map((log, index) => {
      const action = normalizeActivityAction(log);
      const config = ACTION_TIMELINE_LABELS[action];
      const dateValue = getLogDate(log);
      if (!config || !dateValue) return null;

      const dedupeKey = `${action}-${dateValue}-${log?.entity_id || log?.entityId || index}`;
      if (seen.has(dedupeKey)) return null;
      seen.add(dedupeKey);

      const statusLabel = typeof config.status === 'function' ? config.status(log) : config.status;

      return {
        date: formatTimelineDateValue(dateValue),
        sortTimestamp: getTimelineSortTimestamp(dateValue),
        order: config.order,
        status: statusLabel,
        note: log?.catatan || log?.note || config.note,
        show: true,
      };
    })
    .filter(Boolean);
};

export const buildDetailTimelineItems = ({
  normalizedRequest,
  requestData,
  statusAktif,
  invoice,
  activeSchedule,
  cleanDecisionNote,
  isAdminRejected,
  isKasiRejected,
  isCustomerRejected,
  canShowMethodTariffTimeline,
}) => {
  const lhuPickupInfo = getLhuPickupInfoFromRequest(requestData);
  const changeItems = buildScheduleChangeTimelineItems(requestData);
  const methodDecisionLogDate = getActivityLogDateByActions(requestData, ['MENETAPKAN_METODE_DAN_INVOICE', 'MEMBUAT_INVOICE'], ['FPPL', 'INVOICE']);
  const paymentConfirmedLogDate = getActivityLogDateByActions(requestData, ['MEMVERIFIKASI_PEMBAYARAN', 'PEMBAYARAN_DIKONFIRMASI'], ['PAYMENT', 'FPPL']);
  const scheduleLogDate = getActivityLogDateByActions(requestData, ['MENJADWALKAN_SAMPEL', 'MEMPERBARUI_JADWAL_SAMPEL'], ['JADWAL_SAMPEL', 'FPPL']);
  const sampleReceivedLogDate = getActivityLogDateByActions(requestData, ['MENERIMA_SAMPEL'], ['SAMPEL', 'FPPL']);
  const lhuPickupReadyLogDate = getActivityLogDateByActions(requestData, ['MENJADWALKAN_PENGAMBILAN_LHU'], ['JADWAL_LHU', 'LHU']);
  const lhuPickupDoneLogDate = getActivityLogDateByActions(requestData, ['LHU_DIAMBIL_PELANGGAN'], ['JADWAL_LHU', 'LHU', 'FPPL']);
  const methodDecisionDate = methodDecisionLogDate || getMethodDecisionDateFromRequest(requestData) || normalizedRequest.tanggalVerifikasi;
  const sampleReceivedDate = sampleReceivedLogDate || getSampleReceivedDateFromRequest(requestData);
  const lhuTimelineGroups = buildLhuTimelineGroupsFromRequest(requestData);
  const lhuActivityFacts = getLhuActivityFacts(requestData);
  const sampleCountText = getCustomerSampleCountText(requestData);
  const adminVerifiedLog = findLatestFpplStatusLog(requestData, [FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER], ['MEMVERIFIKASI_PERMOHONAN']);
  const decisionLog = findLatestFpplStatusLog(
    requestData,
    [
      FPPL_STATUSES.DIBATALKAN,
      FPPL_STATUSES.DIBATALKAN_PELANGGAN,
      FPPL_STATUSES.DITOLAK_ADMIN,
      FPPL_STATUSES.DITOLAK_KASI,
      FPPL_STATUSES.DITOLAK_PENYELIA,
    ],
    []
  );
  const adminVerificationDate = getLogDate(adminVerifiedLog) || normalizedRequest.tanggalVerifikasi;
  const decisionDate = getLogDate(decisionLog) || normalizedRequest.tanggalVerifikasi;
  const decisionNote = cleanDecisionNote || decisionLog?.catatan || decisionLog?.note || null;
  const paymentConfirmedDate = paymentConfirmedLogDate ||
    getPaymentConfirmedDate(invoice) ||
    pickFirstDateValue(
      requestData?.timeline_dates?.pembayaran_dikonfirmasi,
      requestData?.timelineDates?.pembayaranDikonfirmasi,
      requestData?.payment?.verified_at,
      requestData?.payment?.verifiedAt,
      requestData?.tanggal_verifikasi_pembayaran,
      requestData?.tanggalVerifikasiPembayaran,
      requestData?.payment_verified_at,
      requestData?.paymentVerifiedAt
    );
  const lhuPickupReadyDate = lhuPickupReadyLogDate || lhuActivityFacts.latestPickupScheduleDate || lhuPickupInfo?.dijadwalkan_pada || lhuPickupInfo?.dijadwalkanPada || lhuPickupInfo?.created_at || lhuPickupInfo?.createdAt;
  const lhuPickupDoneDate = lhuPickupDoneLogDate || lhuActivityFacts.latestPickupDoneDate || lhuPickupInfo?.diambil_pada || lhuPickupInfo?.diambilPada;
  const allLhuApproved = lhuTimelineGroups.length > 0
    ? lhuTimelineGroups.every((group) => isLhuApprovedForProgress(group.lhu))
    : lhuActivityFacts.allLhuApprovedFromLogs;
  const hasRawLhuPickupSchedule = Boolean(
    lhuPickupReadyLogDate ||
      lhuActivityFacts.hasLhuPickupScheduleActivity ||
      lhuPickupInfo?.tanggal_pengambilan ||
      lhuPickupInfo?.tanggalPengambilan ||
      lhuPickupInfo?.jam_pengambilan ||
      lhuPickupInfo?.jamPengambilan ||
      lhuPickupInfo?.status_pengambilan ||
      lhuPickupInfo?.statusPengambilan
  );
  const hasLhuPickupSchedule = allLhuApproved && hasRawLhuPickupSchedule;
  const lhuPickupTargetDate = lhuPickupInfo?.tanggal_pengambilan || lhuPickupInfo?.tanggalPengambilan || null;
  const lhuPickupTargetTime = lhuPickupInfo?.jam_pengambilan || lhuPickupInfo?.jamPengambilan || '';
  const lhuPickupScheduleText = lhuPickupTargetDate
    ? formatDateTime(combineDateTimeValue(lhuPickupTargetDate, lhuPickupTargetTime))
    : '';
  const testingStartedDate = getTestingStartedDate(requestData) || sampleReceivedDate;
  const sampleScheduleStatus = `${requestData?.jenis_pengambilan_sampel === 'Petugas' ? 'Jadwal Pengambilan' : 'Jadwal Pengantaran'} Disetujui Admin`;
  const extraActivityItems = buildExtraActivityLogTimelineItems(requestData);

  const items = [
    {
      date: formatTimelineDateValue(normalizedRequest.tanggalDaftar),
      sortTimestamp: getTimelineSortTimestamp(normalizedRequest.tanggalDaftar),
      order: 10,
      status: 'Permohonan Dibuat',
      note: 'Permohonan pengujian berhasil didaftarkan.',
      show: true,
    },
    {
      date: formatTimelineDateValue(adminVerificationDate),
      sortTimestamp: getTimelineSortTimestamp(adminVerificationDate),
      order: 20,
      status: 'Permohonan Diverifikasi Admin',
      note: 'Admin telah memeriksa kelengkapan data permohonan.',
      show:
        statusAktif !== FPPL_STATUSES.MENUNGGU_VERIFIKASI && !isAdminRejected,
    },
    {
      date: formatTimelineDateValue(methodDecisionDate),
      sortTimestamp: getTimelineSortTimestamp(methodDecisionDate),
      order: 30,
      status: 'Metode Pengujian Ditetapkan Kasi',
      note: 'Kasi Pengujian menetapkan metode uji, tarif parameter, dan rincian biaya.',
      show: canShowMethodTariffTimeline,
    },
    {
      date: formatTimelineDateValue(decisionDate),
      sortTimestamp: getTimelineSortTimestamp(decisionDate),
      order: 31,
      status: isAdminRejected
        ? 'Ditolak Admin'
        : isKasiRejected
        ? 'Ditolak Kasi'
        : isCustomerRejected
        ? 'Dibatalkan Pelanggan'
        : 'Dibatalkan',
      note: decisionNote || 'Permohonan dibatalkan.',
      show: [
        FPPL_STATUSES.DIBATALKAN,
        FPPL_STATUSES.DIBATALKAN_PELANGGAN,
        FPPL_STATUSES.DITOLAK_ADMIN,
        FPPL_STATUSES.DITOLAK_KASI,
        FPPL_STATUSES.DITOLAK_PENYELIA,
      ].includes(statusAktif),
    },
    {
      date: formatTimelineDateValue(paymentConfirmedDate),
      sortTimestamp: getTimelineSortTimestamp(paymentConfirmedDate),
      order: 40,
      status: 'Pembayaran Dikonfirmasi',
      note: getPaymentTimelineNote(invoice),
      show:
        Boolean(paymentConfirmedDate) ||
        AFTER_PAYMENT_STATUSES.includes(statusAktif),
    },
    ...changeItems.map((item) => ({ ...item, order: item.order ?? 45 })),
    {
      date: formatTimelineDateValue(scheduleLogDate || (activeSchedule ? getScheduleDecisionDate(activeSchedule) : null)),
      sortTimestamp: getTimelineSortTimestamp(scheduleLogDate || (activeSchedule ? getScheduleDecisionDate(activeSchedule) : null)),
      order: 50,
      status: sampleScheduleStatus,
      note: activeSchedule
        ? `${requestData?.jenis_pengambilan_sampel === 'Petugas' ? 'Jadwal pengambilan' : 'Jadwal pengantaran'} telah ditentukan oleh admin untuk ${formatDateTime(combineDateTimeValue(getScheduleTargetDate(activeSchedule), getScheduleTargetTime(activeSchedule)))}${requestData?.jenis_pengambilan_sampel === 'Petugas' && activeSchedule.nama_pegawai_pcc ? ` oleh Petugas ${activeSchedule.nama_pegawai_pcc}` : ''}`
        : 'Jadwal belum ditentukan oleh admin.',
      show:
        Boolean(scheduleLogDate) ||
        AFTER_PAYMENT_STATUSES.includes(statusAktif),
    },
    {
      date: formatTimelineDateValue(sampleReceivedDate),
      sortTimestamp: getTimelineSortTimestamp(sampleReceivedDate),
      order: 60,
      status: 'Sampel Diterima',
      note: `${sampleCountText} telah diterima oleh laboratorium.`,
      show: Boolean(sampleReceivedDate) || AFTER_SAMPLE_STATUSES.includes(statusAktif),
    },
    {
      date: formatTimelineDateValue(testingStartedDate),
      sortTimestamp: getTimelineSortTimestamp(testingStartedDate),
      order: 70,
      status: 'Sampel Mulai Diuji',
      note: 'Sampel sedang dalam proses pengujian.',
      show:
        AFTER_SAMPLE_STATUSES.includes(statusAktif) ||
        Boolean(sampleReceivedDate),
    },
    {
      date: formatTimelineDateValue(lhuPickupReadyDate),
      sortTimestamp: getTimelineSortTimestamp(lhuPickupReadyDate),
      order: 100,
      status: 'LHU Siap Diambil',
      note: lhuPickupScheduleText
        ? `Seluruh LHU telah disahkan dan siap diambil pada ${lhuPickupScheduleText}.`
        : 'Seluruh LHU telah disahkan dan siap dijadwalkan untuk pengambilan.',
      show: hasLhuPickupSchedule || LHU_STAGE_STATUSES.includes(statusAktif),
    },
    {
      date: formatTimelineDateValue(lhuPickupDoneDate),
      sortTimestamp: getTimelineSortTimestamp(lhuPickupDoneDate),
      order: 110,
      status: 'Selesai',
      note: `LHU sudah diambil oleh ${lhuPickupInfo?.nama_pengambil || lhuPickupInfo?.namaPengambil || 'pelanggan'}.`,
      show: lhuPickupInfo?.status_pengambilan === 'Sudah Diambil' || lhuPickupInfo?.statusPengambilan === 'Sudah Diambil' || Boolean(lhuPickupDoneLogDate),
    },
    ...extraActivityItems,
  ].filter((item) => item.show);

  return sortTimelineItemsAscending(items);
};
