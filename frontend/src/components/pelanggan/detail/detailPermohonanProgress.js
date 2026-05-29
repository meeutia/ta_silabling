import { FPPL_STATUSES, normalizeFpplStatus } from '../../../utils/fpplStatus';
import {
  buildLhuTimelineGroupsFromRequest,
  getLhuActivityFacts,
  getLhuCreatedDateValue,
  isLhuApprovedForProgress,
} from './detailPermohonanSampleLhu';
import { getLhuPickupInfoFromRequest } from './detailPermohonanSchedule';

const getLhuProgressFacts = (requestData) => {
  const lhuGroups = buildLhuTimelineGroupsFromRequest(requestData);
  const lhuActivityFacts = getLhuActivityFacts(requestData);
  const lhuPickupInfo = getLhuPickupInfoFromRequest(requestData);
  const pickupStatus = String(
    lhuPickupInfo?.status_pengambilan ||
      lhuPickupInfo?.statusPengambilan ||
      ''
  ).trim();

  const hasGroupedLhuRows = lhuGroups.length > 0;
  const hasLhuRow = hasGroupedLhuRows || lhuActivityFacts.hasLhuActivity;
  const hasAnyApprovedLhu =
    lhuGroups.some((group) => isLhuApprovedForProgress(group.lhu)) ||
    lhuActivityFacts.hasAnyApprovedLhu;
  const allLhuApproved = hasGroupedLhuRows
    ? lhuGroups.every((group) => isLhuApprovedForProgress(group.lhu))
    : lhuActivityFacts.allLhuApprovedFromLogs;
  const hasLhuInApprovalFlow =
    lhuGroups.some((group) => Boolean(getLhuCreatedDateValue(group.lhu))) ||
    lhuActivityFacts.hasLhuInApprovalFlow;
  const hasRawPickupSchedule = Boolean(
    lhuActivityFacts.hasLhuPickupScheduleActivity ||
      lhuPickupInfo?.tanggal_pengambilan ||
      lhuPickupInfo?.tanggalPengambilan ||
      lhuPickupInfo?.jam_pengambilan ||
      lhuPickupInfo?.jamPengambilan ||
      pickupStatus
  );
  const hasPickupSchedule = allLhuApproved && hasRawPickupSchedule;
  const isPickupDone =
    allLhuApproved && (
      pickupStatus === 'Sudah Diambil' ||
      Boolean(lhuPickupInfo?.diambil_pada || lhuPickupInfo?.diambilPada) ||
      lhuActivityFacts.hasLhuPickupDoneActivity
    );

  return {
    hasLhuRow,
    hasAnyApprovedLhu,
    allLhuApproved,
    hasLhuInApprovalFlow,
    hasPickupSchedule,
    isPickupDone,
  };
};

export const buildProgressSteps = (statusAktif, requestData = null) => {
  const steps = [
    { label: 'Validasi', key: 'validasi' },
    { label: 'Pembayaran', key: 'pembayaran' },
    { label: 'Sampel', key: 'sampel' },
    { label: 'Pengujian', key: 'pengujian' },
    { label: 'Verifikasi', key: 'verifikasi' },
    { label: 'Selesai', key: 'selesai' },
  ];

  const stepIndexByStatus = {
    [FPPL_STATUSES.MENUNGGU_VERIFIKASI]: 0,
    [FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER]: 1,
    [FPPL_STATUSES.MENUNGGU_PEMBAYARAN]: 1,
    [FPPL_STATUSES.MENUNGGU_VERIFIKASI_PEMBAYARAN]: 1,
    [FPPL_STATUSES.MENUNGGU_SAMPEL]: 2,
    [FPPL_STATUSES.PROSES_PENGUJIAN]: 3,
    [FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU]: 4,
    [FPPL_STATUSES.MENUNGGU_PENGAMBILAN_LHU]: 5,
    [FPPL_STATUSES.SELESAI]: 5,
    [FPPL_STATUSES.DIBATALKAN]: 0,
    [FPPL_STATUSES.DIBATALKAN_PELANGGAN]: 0,
    [FPPL_STATUSES.DITOLAK_ADMIN]: 0,
    [FPPL_STATUSES.DITOLAK_KASI]: 0,
    [FPPL_STATUSES.DITOLAK_PENYELIA]: 0,
  };

  const normalizedStatus = normalizeFpplStatus(statusAktif);
  const rejectedStatuses = [
    FPPL_STATUSES.DIBATALKAN,
    FPPL_STATUSES.DIBATALKAN_PELANGGAN,
    FPPL_STATUSES.DITOLAK_ADMIN,
    FPPL_STATUSES.DITOLAK_KASI,
    FPPL_STATUSES.DITOLAK_PENYELIA,
  ];

  let activeIdx = rejectedStatuses.includes(normalizedStatus)
    ? 0
    : stepIndexByStatus[normalizedStatus] ?? 0;

  if (!rejectedStatuses.includes(normalizedStatus) && requestData) {
    const {
      hasLhuRow,
      allLhuApproved,
      hasLhuInApprovalFlow,
      isPickupDone,
    } = getLhuProgressFacts(requestData);

    if (
      isPickupDone ||
      normalizedStatus === FPPL_STATUSES.MENUNGGU_PENGAMBILAN_LHU ||
      normalizedStatus === FPPL_STATUSES.SELESAI
    ) {
      activeIdx = 5;
    } else if (normalizedStatus === FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU || allLhuApproved) {
      activeIdx = Math.max(activeIdx, 4);
    } else if (hasLhuInApprovalFlow || hasLhuRow) {
      activeIdx = Math.max(activeIdx, 4);
    }
  }

  return steps.map((step, idx) => ({
    ...step,
    completed: idx < activeIdx,
    active: idx === activeIdx,
  }));
};
