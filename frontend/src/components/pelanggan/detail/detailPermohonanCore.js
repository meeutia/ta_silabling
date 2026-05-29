import {
  combineDateTimeValue,
  formatDateLong,
  normalizeDateValue,
  formatDateTime as formatDateTimeSafe,
  toDateTimestamp,
} from '../../../utils/formatters';
import {
  findActivityLogByActions,
  getActivityLogDate as getLogDate,
} from '../../../utils/activityLog.util';

export { combineDateTimeValue, normalizeDateValue, toDateTimestamp };

export const getCustomerProfile = (request) =>
  request?.Pelanggan || request?.pelanggan || null;

export const getRequestSamples = (request) =>
  request?.FpplSampels ||
  request?.fppl_sampels ||
  request?.fpplSampels ||
  [];

export const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
};

export const getFpplNumber = (request) =>
  request?.nomor_fppl ||
  request?.no_fppl ||
  request?.nomorFppl ||
  request?.noFppl ||
  request?.id_registrasi ||
  request?.nomorRegistrasi ||
  '-';

export const pickFirstDateValue = (...values) => {
  for (const value of values) {
    const normalizedValue = normalizeDateValue(value);
    if (normalizedValue !== null && normalizedValue !== undefined && normalizedValue !== '') {
      return normalizedValue;
    }
  }

  return null;
};

export const pickLatestDateValue = (...values) => {
  const candidates = values
    .flatMap((value) => toArray(value))
    .map((value) => normalizeDateValue(value))
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map((value) => ({ value, timestamp: toDateTimestamp(value, Number.NEGATIVE_INFINITY) }))
    .filter((item) => Number.isFinite(item.timestamp));

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.timestamp - a.timestamp);
  return candidates[0].value;
};

export const pickDateFromObject = (source, keys) => {
  if (!source) return null;
  return pickFirstDateValue(...keys.map((key) => source?.[key]));
};

export const formatDate = (dateString) => formatDateLong(dateString, '-');

export const formatDateTime = (dateString, timeString = '') =>
  formatDateTimeSafe(dateString, timeString, '-');

export const formatTimelineDateValue = (dateValue, timeValue = '') => {
  const normalizedDate = normalizeDateValue(dateValue);
  if (!normalizedDate) return '—';

  const formatted = timeValue
    ? formatDateTime(combineDateTimeValue(normalizedDate, timeValue), '', '—')
    : formatDateTime(normalizedDate, '', '—');

  return formatted && formatted !== '-' ? formatted : '—';
};

export const getTimelineSortTimestamp = (dateValue, timeValue = '') => {
  const normalizedDate = normalizeDateValue(dateValue);
  if (!normalizedDate) return Number.POSITIVE_INFINITY;

  const targetValue = timeValue
    ? combineDateTimeValue(normalizedDate, timeValue)
    : normalizedDate;

  const timestamp = toDateTimestamp(targetValue, Number.POSITIVE_INFINITY);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
};

export const sortTimelineItemsAscending = (items = []) =>
  items
    .map((item, index) => ({ ...item, __timelineOrder: index }))
    .sort((left, right) => {
      const leftOrder = Number.isFinite(left.order) ? left.order : 999;
      const rightOrder = Number.isFinite(right.order) ? right.order : 999;
      const leftTime = Number.isFinite(left.sortTimestamp) ? left.sortTimestamp : Number.POSITIVE_INFINITY;
      const rightTime = Number.isFinite(right.sortTimestamp) ? right.sortTimestamp : Number.POSITIVE_INFINITY;

      if (leftTime !== rightTime) return leftTime - rightTime;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.__timelineOrder - right.__timelineOrder;
    })
    .map((item) => {
      const clonedItem = { ...item };
      delete clonedItem.__timelineOrder;
      return clonedItem;
    });

const getDetailDateSources = (requestItem) => [
  requestItem,
  requestItem?.__historyDates,
  requestItem?.historyDates,
  requestItem?._historyDates,
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
  requestItem?.detail,
  requestItem?.detail?.dataValues,
  requestItem?.Detail,
  requestItem?.Detail?.dataValues,
  requestItem?.fpplDetail,
  requestItem?.fpplDetail?.dataValues,
  requestItem?.FpplDetail,
  requestItem?.FpplDetail?.dataValues,
  requestItem?.data,
  requestItem?.data?.dataValues,
  requestItem?.attributes,
  requestItem?.dataValues,
].filter(Boolean);

const pickDetailDateFromSources = (requestItem, keys) => {
  for (const source of getDetailDateSources(requestItem)) {
    const value = pickFirstDateValue(...keys.map((key) => source?.[key]));
    if (value) return value;
  }

  return null;
};

export const getDetailRegistrationDate = (requestItem) =>
  pickDetailDateFromSources(requestItem, [
    'tanggal_pendaftaran',
    'detailTanggalDaftar',
    'detail_tanggal_daftar',
    'tanggalPendaftaran',
    'tanggal_daftar',
    'tanggalDaftar',
    'tanggal_registrasi',
    'tanggal_dibuat',
    'tanggalDibuat',
    'waktu_pendaftaran',
    'waktuPendaftaran',
    'tanggalRegistrasi',
    'tgl_pendaftaran',
    'tglPendaftaran',
    'tgl_daftar',
    'tglDaftar',
    'registered_at',
    'registration_date',
    'created',
    'createdOn',
    'registeredAt',
    'submitted_at',
    'submittedAt',
    'tanggal',
    'created_at',
    'createdAt',
  ]);

export const getDetailVerificationDate = (requestItem) =>
  pickDetailDateFromSources(requestItem, [
    'tanggal_verifikasi',
    'detailTanggalVerifikasi',
    'detail_tanggal_verifikasi',
    'tanggal_verifikasi_admin',
    'tanggalVerifikasiAdmin',
    'tanggalVerifikasi',
    'tanggal_validasi',
    'tanggal_validasi_admin',
    'tanggalValidasiAdmin',
    'tanggalDiverifikasi',
    'tanggal_diverifikasi',
    'tanggalValidasi',
    'tgl_verifikasi',
    'tglVerifikasi',
    'tgl_validasi',
    'tglValidasi',
    'verified_at',
    'verification_date',
    'waktu_verifikasi',
    'waktuVerifikasi',
    'verifiedAt',
    'validated_at',
    'validatedAt',
    'approved_at',
    'accepted_at',
    'acceptedAt',
    'approvedAt',
    'diverifikasi_pada',
    'diverifikasiPada',
    'validasi_pada',
    'validasiPada',
  ]);

export const mergeDetailRequestDates = (detailRequest, fallbackRequest) => {
  if (!detailRequest && !fallbackRequest) return detailRequest;

  const tanggalDaftar =
    getDetailRegistrationDate(detailRequest) || getDetailRegistrationDate(fallbackRequest);
  const tanggalVerifikasi =
    getDetailVerificationDate(detailRequest) || getDetailVerificationDate(fallbackRequest);

  return {
    ...(fallbackRequest || {}),
    ...(detailRequest || {}),
    __historyDates: {
      tanggalDaftar: tanggalDaftar || null,
      tanggalVerifikasi: tanggalVerifikasi || null,
    },
    ...(tanggalDaftar
      ? {
          tanggal_pendaftaran: tanggalDaftar,
          tanggalPendaftaran: tanggalDaftar,
          tanggal_daftar: tanggalDaftar,
          tanggalDaftar,
          detailTanggalDaftar: tanggalDaftar,
        }
      : {}),
    ...(tanggalVerifikasi
      ? {
          tanggal_verifikasi: tanggalVerifikasi,
          tanggalVerifikasi,
          tanggal_validasi: tanggalVerifikasi,
          tanggalValidasi: tanggalVerifikasi,
          detailTanggalVerifikasi: tanggalVerifikasi,
        }
      : {}),
  };
};

export const getActivityLogDateByActions = (requestData, actionList = [], entityTypes = []) => {
  const log = findActivityLogByActions(requestData, actionList, entityTypes, { latest: true });
  return getLogDate(log);
};

export const normalizeWhatsAppNumber = (value) => {
  const raw = String(value || '').replace(/\D/g, '');

  if (!raw) return '';
  if (raw.startsWith('62')) return raw;
  if (raw.startsWith('0')) return `62${raw.slice(1)}`;

  return raw;
};

export const buildWhatsAppLink = (phoneNumber, message = '') => {
  const normalizedPhone = normalizeWhatsAppNumber(phoneNumber);

  if (!normalizedPhone) return '';

  const encodedMessage = message ? `?text=${encodeURIComponent(message)}` : '';

  return `https://wa.me/${normalizedPhone}${encodedMessage}`;
};

export const isTruthyFlag = (value) => {
  if (value === true || value === 1) return true;
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

export const formatCurrency = (amount) => {
  const numericValue = Number(amount || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(numericValue);
};
