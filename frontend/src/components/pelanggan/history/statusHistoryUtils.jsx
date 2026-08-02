import { FPPL_STATUSES, getFpplStatusBadgeClass, isFinalFpplStatus, normalizeFpplStatus } from '../../../utils/fpplStatus';
import { formatDateOnly, normalizeDateValue, toDateTimestamp } from '../../../utils/formatters';

export const HISTORY_FILTERS = ['Semua', 'Aktif', 'Selesai'];


const LHU_FINAL_STATUS = 'Disahkan';

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const pickFirstDefinedValue = (...values) => {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
};

const getHistoryLhuRows = (requestItem) =>
  toArray(
    requestItem?.lhus ||
    requestItem?.Lhus ||
    requestItem?.LHUs ||
    requestItem?.lhuList ||
    requestItem?.lhu_list
  );

const getHistoryLhuPickupSchedule = (requestItem) =>
  requestItem?.jadwal_pengambilan_lhu ||
  requestItem?.jadwalPengambilanLhu ||
  requestItem?.JadwalPengambilanLhu ||
  null;

const getHistoryLhuPickupStatus = (schedule) =>
  String(schedule?.status_pengambilan || schedule?.statusPengambilan || '').trim();

const isActiveHistoryLhuPickupSchedule = (schedule) => {
  if (!schedule) return false;

  const status = getHistoryLhuPickupStatus(schedule);
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

const isCompletedHistoryLhuPickupSchedule = (schedule) =>
  getHistoryLhuPickupStatus(schedule) === 'Sudah Diambil';

const isApprovedFinalHistoryLhu = (lhu) => {
  const status = String(lhu?.status_lhu || lhu?.statusLhu || lhu?.status || '').trim();
  return status === LHU_FINAL_STATUS || Boolean(lhu?.tanggal_penerbitan || lhu?.tanggalPenerbitan);
};

const areAllHistoryLhusApproved = (requestItem) => {
  const lhus = getHistoryLhuRows(requestItem).filter(Boolean);
  return lhus.length > 0 && lhus.every(isApprovedFinalHistoryLhu);
};

const deriveHistoryStatusFromLhu = (requestItem) => {
  const rawStatus = pickFirstDefinedValue(
    requestItem?.status_fppl,
    requestItem?.statusFppl,
    requestItem?.status
  );
  const normalizedRawStatus = normalizeFpplStatus(rawStatus);

  if (isFinalFpplStatus(normalizedRawStatus)) return normalizedRawStatus;

  const pickupSchedule = getHistoryLhuPickupSchedule(requestItem);

  if (isCompletedHistoryLhuPickupSchedule(pickupSchedule)) {
    return FPPL_STATUSES.SELESAI;
  }

  if (isActiveHistoryLhuPickupSchedule(pickupSchedule)) {
    return FPPL_STATUSES.MENUNGGU_PENGAMBILAN_LHU;
  }

  if (areAllHistoryLhusApproved(requestItem)) {
    return FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU;
  }

  return null;
};

const pickFirstDateValue = (...values) => {
  for (const value of values) {
    const normalizedValue = normalizeDateValue(value);
    if (normalizedValue !== null && normalizedValue !== undefined && normalizedValue !== '') {
      return normalizedValue;
    }
  }

  return null;
};

const getRequestDateSources = (requestItem) => [
  requestItem,
  requestItem?.Fppl,
  requestItem?.Fppl?.dataValues,
  requestItem?.fppl,
  requestItem?.fppl?.dataValues,
  requestItem?.Permohonan,
  requestItem?.Permohonan?.dataValues,
  requestItem?.permohonan,
  requestItem?.permohonan?.dataValues,
  requestItem?.Request,
  requestItem?.Request?.dataValues,
  requestItem?.request,
  requestItem?.request?.dataValues,
  requestItem?.data,
  requestItem?.data?.dataValues,
  requestItem?.attributes,
  requestItem?.dataValues,
].filter(Boolean);

const pickDateFromSources = (requestItem, keys) => {
  for (const source of getRequestDateSources(requestItem)) {
    const value = pickFirstDateValue(...keys.map((key) => source?.[key]));
    if (value) return value;
  }

  return null;
};

export const getHistoryRegistrationDate = (requestItem) =>
  pickDateFromSources(requestItem, [
    'tanggal_pendaftaran',
    'tanggalPendaftaran',
    'tanggal_daftar',
    'tanggalDaftar',
    'tanggal_registrasi',
    'tanggalRegistrasi',
    'tgl_pendaftaran',
    'tglPendaftaran',
    'tgl_daftar',
    'tglDaftar',
    'tanggal',
    'created_at',
    'createdAt',
  ]);

export const getHistoryVerificationDate = (requestItem) =>
  pickDateFromSources(requestItem, [
    'tanggal_verifikasi',
    'tanggalVerifikasi',
    'tanggal_validasi',
    'tanggalValidasi',
    'tgl_verifikasi',
    'tglVerifikasi',
    'tgl_validasi',
    'tglValidasi',
    'verified_at',
    'verifiedAt',
    'validated_at',
    'validatedAt',
    'diverifikasi_pada',
    'diverifikasiPada',
    'validasi_pada',
    'validasiPada',
  ]);


export const buildHistoryDetailPayload = (detailRequest, fallbackRequest = null) => {
  const tanggalDaftar =
    getHistoryRegistrationDate(detailRequest) || getHistoryRegistrationDate(fallbackRequest);
  const tanggalVerifikasi =
    getHistoryVerificationDate(detailRequest) || getHistoryVerificationDate(fallbackRequest);

  const merged = {
    ...(fallbackRequest || {}),
    ...(detailRequest || {}),
  };

  if (tanggalDaftar) {
    merged.tanggal_pendaftaran = tanggalDaftar;
    merged.tanggalPendaftaran = tanggalDaftar;
    merged.tanggal_daftar = tanggalDaftar;
    merged.tanggalDaftar = tanggalDaftar;
    merged.detailTanggalDaftar = tanggalDaftar;
  }

  if (tanggalVerifikasi) {
    merged.tanggal_verifikasi = tanggalVerifikasi;
    merged.tanggalVerifikasi = tanggalVerifikasi;
    merged.tanggal_validasi = tanggalVerifikasi;
    merged.tanggalValidasi = tanggalVerifikasi;
    merged.detailTanggalVerifikasi = tanggalVerifikasi;
  }

  merged.__historyDates = {
    tanggalDaftar: tanggalDaftar || null,
    tanggalVerifikasi: tanggalVerifikasi || null,
  };

  return merged;
};

export const formatHistoryDate = (dateString) => formatDateOnly(dateString, '-');

export const getHistoryCustomerProfile = (requestItem) =>
  requestItem?.Pelanggan || requestItem?.pelanggan || null;

export const getHistoryRequestSamples = (requestItem) =>
  requestItem?.FpplSampels ||
  requestItem?.fppl_sampels ||
  requestItem?.fpplSampels ||
  [];

export const getHistorySampleTypeList = (requestItem) => {
  const requestSamples = getHistoryRequestSamples(requestItem);
  if (requestSamples.length === 0) return '-';

  return requestSamples
    .map((requestSample) => {
      const sampleType =
        requestSample?.JenisSampel ||
        requestSample?.jenis_sampel ||
        requestSample?.jenisSampel;

      if (!sampleType) return 'Unknown';
      if (typeof sampleType === 'string') return sampleType;

      return sampleType.jenis_sampel || sampleType.jenisSampel || 'Unknown';
    })
    .join(', ');
};

export const getHistoryRequestId = (requestItem) =>
  requestItem?.id_registrasi || requestItem?.idRegistrasi || '';

export const getHistoryStatus = (requestItem) =>
  requestItem?.status_pelanggan ||
  requestItem?.statusPelanggan ||
  requestItem?.status_display ||
  requestItem?.statusDisplay ||
  deriveHistoryStatusFromLhu(requestItem) ||
  requestItem?.status_fppl ||
  requestItem?.statusFppl ||
  requestItem?.status;

export const getHistoryStatusBadge = (status) => {
  const normalizedStatus = normalizeFpplStatus(status);
  const config = getFpplStatusBadgeClass(normalizedStatus);

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {normalizedStatus}
    </span>
  );
};

export const isActiveHistoryStatus = (status) => !isFinalFpplStatus(status);

export const filterHistoryRequests = (requests, searchQuery, activeFilter) => {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return requests
    .filter((req) => {
      const registrationNumber = getHistoryRequestId(req);
      const sampleTypeList = getHistorySampleTypeList(req);
      const companyName = getHistoryCustomerProfile(req)?.nama_instansi || '';

      const matchesSearch =
        !normalizedQuery ||
        registrationNumber.toLowerCase().includes(normalizedQuery) ||
        sampleTypeList.toLowerCase().includes(normalizedQuery) ||
        companyName.toLowerCase().includes(normalizedQuery);

      let matchesFilter = true;
      if (activeFilter === 'Aktif') {
        matchesFilter = isActiveHistoryStatus(getHistoryStatus(req));
      } else if (activeFilter === 'Selesai') {
        matchesFilter = normalizeFpplStatus(getHistoryStatus(req)) === FPPL_STATUSES.SELESAI;
      }

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) =>
      toDateTimestamp(getHistoryRegistrationDate(b)) -
      toDateTimestamp(getHistoryRegistrationDate(a))
    );
};
