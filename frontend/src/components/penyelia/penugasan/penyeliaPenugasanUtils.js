export const createDraftItem = () => ({
  key: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  selectedGroupKey: '',
  catatanDetail: '',
  deadline: '',
  selectedSampleRefs: [],
});

export const normalizeKeyPart = (value) => String(value || '').trim().toLowerCase();

export const buildGroupKey = (item) =>
  `${normalizeKeyPart(item.nama_parameter)}__${normalizeKeyPart(item.nama_metode)}`;

export const buildGroupLabel = (item) =>
  [item.nama_parameter, item.nama_metode].filter(Boolean).join(' — ');

export function formatDateOnly(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const parseDateInputValue = (value) => {
  if (!value) return null;

  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return null;

  return date;
};

export const addCalendarDays = (dateValue, days) => {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);

  return date;
};

export const getTodayInputValue = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return toDateInputValue(today);
};

export function getMonitorStatusClass(summary) {
  const value = String(summary || '').toLowerCase();

  if (value.includes('revisi')) return 'bg-red-100 text-red-700';
  if (value.includes('review')) return 'bg-amber-100 text-amber-700';
  if (value.includes('selesai')) return 'bg-emerald-100 text-emerald-700';
  if (value.includes('dikerjakan')) return 'bg-blue-100 text-blue-700';

  return 'bg-gray-100 text-gray-700';
}

export function getNumericIdValue(value) {
  const numericText = String(value || '')
    .match(/\d+/g)
    ?.join('');

  return Number(numericText || 0);
}

export function getMonitorPriority(statusRingkas) {
  const value = String(statusRingkas || '').toLowerCase();

  if (value.includes('review')) return 0;
  if (value.includes('revisi')) return 1;
  if (value.includes('dikerjakan')) return 2;
  if (value.includes('ditugaskan')) return 3;
  if (value.includes('selesai')) return 4;

  return 5;
}

export function getMonitorDetailSortValue(detail) {
  const dateCandidates = [
    detail?.latestActivityAt,
    detail?.latest_activity_at,
    detail?.tanggalPelaporan,
    detail?.tanggal_pelaporan,
    detail?.assignedAt,
    detail?.assigned_at,
    detail?.tanggalPenugasan,
    detail?.tanggal_penugasan,
    detail?.deadline,
    detail?.tanggalTenggat,
    detail?.tanggal_tenggat,
  ];

  for (const value of dateCandidates) {
    if (!value) continue;

    const time = new Date(value).getTime();
    if (!Number.isNaN(time)) return time;
  }

  return getNumericIdValue(detail?.idPenugasan || detail?.id_penugasan);
}

export function getMonitorAssignedAt(details = []) {
  const dates = details
    .map((detail) =>
      detail.assignedAt ||
      detail.assigned_at ||
      detail.tanggalPenugasan ||
      detail.tanggal_penugasan ||
      null
    )
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return dates[0] || null;
}

export function combineStatusLabel(details) {
  if (!details.length) return 'Belum ada detail';

  const statuses = details.map((detail) => detail.statusDetail);
  let label = 'Ditugaskan';

  if (statuses.some((status) => status === 'Perlu Revisi')) {
    label = 'Perlu Revisi';
  } else if (statuses.some((status) => status === 'Worksheet Terkirim')) {
    label = 'Menunggu Review';
  } else if (statuses.some((status) => status === 'Sedang Dikerjakan')) {
    label = 'Sedang Dikerjakan';
  } else if (statuses.every((status) => ['Disetujui', 'Selesai'].includes(status))) {
    label = 'Selesai';
  }

  return label;
}

export function normalizeResultExpressionInput(value) {
  return String(value || '')
    .replace(/\./g, ',')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, '')
    .replace(/[^\d,<>=≤≥-]/g, '');
}

export function isValidResultExpression(value) {
  const text = String(value || '').trim();

  if (!text) return false;
  if (text === '-') return true;

  return /^(?:[<>]=?|≤|≥)?-?\d+(?:,\d+)?$/.test(text);
}

export function isTruthyFlag(value) {
  if (value === true || value === 1) return true;

  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export function isSubkontrakItem(item) {
  return (
    isTruthyFlag(item?.is_subkontrak) ||
    isTruthyFlag(item?.isSubkontrak) ||
    isTruthyFlag(item?.is_subkontrak) ||
    isTruthyFlag(item?.isSubkontrak) ||
    isTruthyFlag(item?.parameter_metode?.is_subkontrak) ||
    isTruthyFlag(item?.ParameterMetode?.is_subkontrak) ||
    String(item?.status_kemampuan_lab || '').toUpperCase() === 'TIDAK_MAMPU'
  );
}

export function isInsituItem(item) {
  return (
    isTruthyFlag(item?.is_insitu) ||
    isTruthyFlag(item?.isInsitu) ||
    isTruthyFlag(item?.insitu) ||
    isTruthyFlag(item?.is_insitu) ||
    isTruthyFlag(item?.isInsitu)
  );
}

export function getSubkontrakRowKey(row) {
  return `${row.id_fppl_parameter_metode || row.idFpplParameterMetode}-${row.no_sampel || row.noSampel}`;
}
