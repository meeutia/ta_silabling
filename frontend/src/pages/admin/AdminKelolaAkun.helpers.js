export const STAFF_ROLES = [
  'Admin',
  'Petugas Pendaftaran',
  'Kasi Pengujian',
  'Penyelia',
  'Analis',
  'Pengendalian Mutu',
  'PCC',
];

export const STATUS_OPTIONS = ['Aktif', 'Nonaktif'];

export const EMPTY_STAFF_FORM = {
  nik: '',
  name: '',
  nip: '',
  email: '',
  phone: '',
  username: '',
  role: 'Analis',
  status: 'Aktif',
  passwordMode: 'generate',
  password: '',
  confirmPassword: '',
};

export function text(value) {
  return String(value ?? '').trim();
}

export function dash(value) {
  const clean = text(value);
  return clean || '-';
}

export function initials(name) {
  const parts = text(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function getStatus(row) {
  if (row?.status) return row.status;
  return Number(row?.isActive ?? row?.is_active ?? 1) === 1 ? 'Aktif' : 'Nonaktif';
}

export function getToggleValue(row) {
  return getStatus(row) === 'Aktif' ? 0 : 1;
}

export function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const clean = text(value);

    if (clean && clean !== 'Semua') {
      query.set(key, clean);
    }
  });

  const qs = query.toString();
  return qs ? `?${qs}` : '';
}
