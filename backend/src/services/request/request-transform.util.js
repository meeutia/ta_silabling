const RequestStatus = require('../../constants/request-status');
const { LHU_STATUS, normalizeLhuStatus } = require('../../constants/lhu-status.constant');

const getKasiDecisionStatus = (statusFppl, catatanPenolakan) => {
  const note = catatanPenolakan || '';
  if (
    statusFppl === RequestStatus.REJECTED_BY_KASI ||
    (statusFppl === RequestStatus.REJECTED && note.startsWith('[Kasi]'))
  ) {
    return 'Ditolak';
  }
  return 'Disetujui';
};

const resolveSampleQuantity = (entry) => {
  const rawValue =
    entry?.jumlahSampel ??
    entry?.jumlah_sampel ??
    entry?.jumlah ??
    entry?.totalSampel ??
    entry?.total_sampel ??
    entry?.sampleCount ??
    entry?.sample_count ??
    1;

  const quantity = Number(rawValue);

  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
};

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const isCancelledOrRejectedStatus = (status) => [
  RequestStatus.REJECTED,
  RequestStatus.CANCELLED_BY_CUSTOMER,
  RequestStatus.REJECTED_BY_ADMIN,
  RequestStatus.REJECTED_BY_KASI,
  RequestStatus.REJECTED_BY_PENYELIA,
].includes(status);

const getRequestLhuRows = (requestJson = {}) => [
  requestJson.lhus,
  requestJson.Lhus,
  requestJson.LHUs,
  requestJson.lhuList,
  requestJson.lhu_list,
].find(Array.isArray) || [];

const getRequestLhuPickupSchedule = (requestJson = {}) =>
  requestJson.jadwal_pengambilan_lhu ||
  requestJson.jadwalPengambilanLhu ||
  requestJson.JadwalPengambilanLhu ||
  null;

const getLhuPickupScheduleStatus = (schedule) =>
  String(schedule?.status_pengambilan || schedule?.statusPengambilan || '').trim();

const isActiveLhuPickupSchedule = (schedule) => {
  if (!schedule) return false;

  const status = getLhuPickupScheduleStatus(schedule);
  if (status === 'Dibatalkan') return false;

  return Boolean(
    schedule.id_jadwal_lhu ||
    schedule.idJadwalLhu ||
    schedule.tanggal_pengambilan ||
    schedule.tanggalPengambilan ||
    schedule.dijadwalkan_pada ||
    schedule.dijadwalkanPada
  );
};

const isCompletedLhuPickupSchedule = (schedule) =>
  getLhuPickupScheduleStatus(schedule) === 'Sudah Diambil';

const isApprovedFinalLhu = (lhu) => {
  if (!lhu) return false;

  const normalizedStatus = normalizeLhuStatus(lhu.status_lhu || lhu.statusLhu || lhu.status || '');

  return normalizedStatus === LHU_STATUS.APPROVED_FINAL || Boolean(lhu.kalab_at || lhu.kalabAt);
};

const areAllAvailableLhusApproved = (requestJson = {}) => {
  const lhuRows = getRequestLhuRows(requestJson).filter(Boolean);
  return lhuRows.length > 0 && lhuRows.every(isApprovedFinalLhu);
};

const deriveCustomerHistoryStatus = (requestJson = {}) => {
  const currentStatus = requestJson.status_fppl || requestJson.statusFppl || requestJson.status || '';

  if (!currentStatus) return currentStatus;
  if (currentStatus === RequestStatus.COMPLETED) return currentStatus;
  if (isCancelledOrRejectedStatus(currentStatus)) return currentStatus;

  const pickupSchedule = getRequestLhuPickupSchedule(requestJson);

  if (isCompletedLhuPickupSchedule(pickupSchedule)) {
    return RequestStatus.COMPLETED;
  }

  if (isActiveLhuPickupSchedule(pickupSchedule)) {
    return RequestStatus.WAITING_LHU_PICKUP;
  }

  if (areAllAvailableLhusApproved(requestJson)) {
    return RequestStatus.WAITING_LHU_SCHEDULING;
  }

  return currentStatus;
};

const deriveCustomerDecisionStatus = (statusFppl) => {
  if (statusFppl === RequestStatus.CANCELLED_BY_CUSTOMER) return RequestStatus.CANCELLED_BY_CUSTOMER;
  if (statusFppl === RequestStatus.REJECTED_BY_ADMIN) return RequestStatus.REJECTED_BY_ADMIN;
  if (statusFppl === RequestStatus.REJECTED_BY_KASI) return RequestStatus.REJECTED_BY_KASI;
  if (statusFppl === RequestStatus.REJECTED_BY_PENYELIA) return RequestStatus.REJECTED_BY_PENYELIA;
  if (statusFppl === RequestStatus.REJECTED) return 'Dibatalkan';
  if ([RequestStatus.WAITING_PAYMENT, RequestStatus.WAITING_PAYMENT_VERIFICATION].includes(statusFppl)) return 'Menunggu Pembayaran';
  if ([
    RequestStatus.WAITING_SAMPLE,
    RequestStatus.WAITING_SAMPLE_PICKUP,
    RequestStatus.WAITING_SAMPLE_DELIVERY,
    RequestStatus.TESTING_PROCESS,
    RequestStatus.WAITING_LHU_SCHEDULING,
    RequestStatus.WAITING_LHU_PICKUP,
    RequestStatus.COMPLETED,
  ].includes(statusFppl)) return 'Disetujui';
  return 'Menunggu';
};

const normalizeText = (value) => String(value || '').trim();

const isOfficerSamplingMethod = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === 'laboratorium' || normalized === 'petugas';
};

const resolveSamplingType = (metodePengambilan) => {
  return isOfficerSamplingMethod(metodePengambilan) ? 'Petugas' : 'Mandiri';
};

const buildPenyeliaRequestSummary = (json) => {
  const fpplSamples = json.fppl_sampels || json.FpplSampels || [];
  const jenisSet = new Set();
  const parameterSet = new Set();
  let totalSampel = 0;
  let totalPenugasan = 0;

  fpplSamples.forEach((fpplSample) => {
    const jenisNama =
      fpplSample?.pkt_bm?.jenis_sampel?.jenis_sampel ||
      fpplSample?.pkt_bm?.JenisSampel?.jenis_sampel ||
      fpplSample?.PktBm?.jenis_sampel?.jenis_sampel ||
      fpplSample?.PktBm?.JenisSampel?.jenis_sampel ||
      '-';

    if (jenisNama) {
      jenisSet.add(jenisNama);
    }

    const sampelRows = fpplSample?.sampels || fpplSample?.Sampels || [];
    totalSampel += sampelRows.length;

    const parameterRows = fpplSample?.fppl_parameter_metodes || fpplSample?.FpplParameterMetodes || [];
    parameterRows.forEach((fpm) => {
      const namaParameter =
        fpm?.parameter?.nama_parameter ||
        fpm?.Parameter?.nama_parameter ||
        '-';

      if (namaParameter && namaParameter !== '-') {
        parameterSet.add(namaParameter);
      }
    });

    sampelRows.forEach((sampel) => {
      const penugasanItems = sampel?.penugasan_items || sampel?.PenugasanItems || [];
      totalPenugasan += penugasanItems.length;
    });
  });

  return {
    ...json,
    noReg: json.id_registrasi,
    tanggal: json.tanggal_pendaftaran,
    pelanggan:
      json.Pelanggan?.nama_instansi ||
      json.pelanggan?.nama_instansi ||
      json.Pelanggan?.pic ||
      json.pelanggan?.pic ||
      '-',
    jenisSampel: Array.from(jenisSet).join(', ') || '-',
    parameterPengujian: Array.from(parameterSet),
    jumlahSampel: totalSampel,
    jumlahPenugasan: totalPenugasan,
    status: json.status_fppl,
  };
};

const resolveSamplingSchedule = ({
  metodePengambilan,
  tanggalPengambilan,
  jamPengambilan,
  estimasiDiterima,
}) => {
  const isOfficer = isOfficerSamplingMethod(metodePengambilan);

  return {
    tanggalRencanaPengambilanSampel: isOfficer
      ? tanggalPengambilan || null
      : null,

    jamRencanaPengambilanSampel: isOfficer
      ? jamPengambilan || null
      : null,

    tanggalRencanaPengantaranSampel: isOfficer
      ? null
      : estimasiDiterima || null,
  };
};

const resolveSamplingLocation = ({
  metodePengambilan,
  lokasiPengambilan,
  alamatPengambilan,
}) => {
  const location = normalizeText(lokasiPengambilan || alamatPengambilan);

  if (!location) {
    const samplingType = resolveSamplingType(metodePengambilan);

    throw new Error(
      samplingType === 'Petugas'
        ? 'Lokasi pengambilan sampel wajib diisi.'
        : 'Lokasi asal sampel wajib diisi untuk pengambilan mandiri.'
    );
  }

  return location;
};

module.exports = {
  areAllAvailableLhusApproved,
  buildPenyeliaRequestSummary,
  deriveCustomerDecisionStatus,
  deriveCustomerHistoryStatus,
  getKasiDecisionStatus,
  getRequestLhuPickupSchedule,
  getRequestLhuRows,
  isActiveLhuPickupSchedule,
  isApprovedFinalLhu,
  isCancelledOrRejectedStatus,
  isOfficerSamplingMethod,
  normalizeText,
  resolveSampleQuantity,
  resolveSamplingLocation,
  resolveSamplingSchedule,
  resolveSamplingType,
  toArray,
};
