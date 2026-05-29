export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  const candidates = [
    value.rows,
    value.items,
    value.requests,
    value.data,
    value.result,
    value.results,
    value.queue,
    value.history,
    value.assignments,
    value.samples,
    value.lhu,
  ];

  return candidates.find(Array.isArray) || [];
}

export function pickFirst(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? '-';
}

export function getRequestStatus(row) {
  return pickFirst(row?.status_fppl, row?.statusFppl, row?.status, row?.status_permohonan);
}

export function getRegistrationNumber(row) {
  return pickFirst(row?.id_registrasi, row?.nomorRegistrasi, row?.nomor_registrasi, row?.no_registrasi, row?.nomor_fppl, row?.no_fppl);
}

export function getCustomerName(row) {
  const customer = row?.Pelanggan || row?.pelanggan || row?.customer || null;
  return pickFirst(
    row?.nama_instansi,
    row?.namaInstansi,
    row?.customerName,
    customer?.nama_instansi,
    customer?.namaInstansi,
    customer?.nama_pelanggan,
    customer?.namaPelanggan,
    customer?.pic
  );
}

export function getSampleTypeName(row) {
  const samples = row?.FpplSampels || row?.fppl_sampels || row?.fpplSampels || [];
  if (samples.length > 0) {
    return samples
      .map((sample) => {
        const sampleType = sample?.JenisSampel || sample?.jenis_sampel || sample?.jenisSampel;
        if (typeof sampleType === 'string') return sampleType;
        return pickFirst(sampleType?.jenis_sampel, sampleType?.jenisSampel, sample?.jenis_sampel, sample?.jenisSampel, sample?.id_jenis_sampel);
      })
      .filter(Boolean)
      .join(', ');
  }

  return pickFirst(row?.jenis_sampel, row?.jenisSampel, row?.nama_sampel, row?.namaSampel);
}

export function getRowDate(row) {
  return pickFirst(
    row?.updated_at,
    row?.updatedAt,
    row?.tanggal_verifikasi,
    row?.tanggalVerifikasi,
    row?.tanggal_pendaftaran,
    row?.tanggalPendaftaran,
    row?.created_at,
    row?.createdAt,
    row?.assigned_at,
    row?.assignedAt,
    row?.tanggal_selesai,
    row?.tanggalSelesai
  );
}

export function sortByNewest(rows) {
  return [...rows].sort((a, b) => new Date(getRowDate(b)).getTime() - new Date(getRowDate(a)).getTime());
}

export function countWhere(rows, predicate) {
  return rows.reduce((count, row) => (predicate(row) ? count + 1 : count), 0);
}

export function formatDashboardDate(value) {
  if (!value || value === '-') return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatRelativeTime(value) {
  if (!value || value === '-') return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60_000));

  if (diffMinutes < 1) return 'Baru saja';
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} hari lalu`;
}

export function getAssignmentStatus(row) {
  return pickFirst(row?.status_detail, row?.statusDetail, row?.status_penugasan, row?.statusPenugasan, row?.status);
}

export function getAssignmentNumber(row) {
  return pickFirst(row?.id_registrasi, row?.idRegistrasi, row?.no_sampel, row?.noSampel, row?.id_penugasan, row?.idPenugasan);
}

export function getAssignmentCustomer(row) {
  return pickFirst(row?.nama_pelanggan, row?.namaPelanggan, row?.nama_instansi, row?.namaInstansi, row?.pelanggan);
}

export function getAssignmentSampleType(row) {
  return pickFirst(row?.jenis_sampel, row?.jenisSampel, row?.nama_sampel, row?.namaSampel, row?.no_sampel, row?.noSampel);
}

export function normalizeStatusText(status) {
  return String(status || '').trim().toLowerCase();
}

export function getSampleNumber(row) {
  return pickFirst(row?.no_sampel, row?.noSampel, row?.nomor_sampel, row?.nomorSampel, row?.sampleNumber);
}

export function getParameterNameList(row) {
  const direct = pickFirst(row?.parameter, row?.nama_parameter, row?.namaParameter, row?.parameter_uji, row?.parameterUji, '');
  if (direct) return direct;

  const details = row?.details || row?.detailRows || row?.detail_lhu || row?.detailLhu || row?.hasil || [];
  if (Array.isArray(details) && details.length > 0) {
    return details
      .map((detail) => pickFirst(detail?.nama_parameter, detail?.namaParameter, detail?.parameter, ''))
      .filter(Boolean)
      .join(', ');
  }

  return '-';
}

export function getAnalisDetailStatus(row) {
  return pickFirst(row?.statusDetail, row?.status_detail, row?.statusPenugasan, row?.status_penugasan, row?.status, 'Ditugaskan');
}

export function getAnalisRegistrationNumber(row) {
  return pickFirst(row?.id_registrasi, row?.idRegistrasi, row?.nomor_registrasi, row?.nomorRegistrasi, row?.nomor_fppl, row?.nomorFppl);
}

export function getAnalisSampleType(row) {
  return pickFirst(row?.jenis_sampel, row?.jenisSampel, row?.nama_sampel, row?.namaSampel);
}

export function getLhuStatus(row) {
  return pickFirst(row?.status_lhu, row?.statusLhu, row?.status, row?.status_finalisasi);
}

export function getLhuNumber(row) {
  return pickFirst(row?.nomor_lhu, row?.nomorLhu, row?.no_lhu, row?.noLhu);
}

export function getLhuSampleNumber(row) {
  return pickFirst(row?.no_sampel, row?.noSampel, row?.nomor_sampel, row?.nomorSampel);
}

export function getLhuRegistrationNumber(row) {
  return pickFirst(row?.id_registrasi, row?.idRegistrasi, row?.nomor_registrasi, row?.nomorRegistrasi, row?.nomor_fppl, row?.nomorFppl, row?.no_fppl, row?.noFppl);
}

export function getLhuCustomer(row) {
  return pickFirst(row?.nama_pelanggan, row?.namaPelanggan, row?.nama_instansi, row?.namaInstansi, row?.pelanggan, row?.customerName);
}

export function getLhuSampleType(row) {
  return pickFirst(row?.jenis_sampel, row?.jenisSampel, row?.nama_sampel, row?.namaSampel);
}

export function getLhuParameterList(row) {
  return getParameterNameList(row);
}

export function getLhuDate(row) {
  return pickFirst(row?.tanggal_lhu, row?.tanggalLhu, row?.tanggal_terbit, row?.tanggalTerbit, row?.created_at, row?.createdAt, row?.updated_at, row?.updatedAt);
}

export function uniqueCount(rows, getter) {
  const values = new Set(rows.map(getter).filter((value) => value && value !== '-'));
  return values.size;
}

export function isToday(value) {
  if (!value || value === '-') return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function isSameMonth(value, referenceDate = new Date()) {
  if (!value || value === '-') return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return date.getFullYear() === referenceDate.getFullYear() && date.getMonth() === referenceDate.getMonth();
}

export function getStatusColorClass(status) {
  const normalized = normalizeStatusText(status);

  if (normalized.includes('selesai') || normalized.includes('disahkan') || normalized.includes('lunas')) {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (normalized.includes('revisi') || normalized.includes('tolak') || normalized.includes('batal')) {
    return 'bg-red-100 text-red-700';
  }

  if (normalized.includes('bayar') || normalized.includes('invoice')) {
    return 'bg-yellow-100 text-yellow-700';
  }

  if (normalized.includes('sampel') || normalized.includes('pengambilan') || normalized.includes('penerimaan')) {
    return 'bg-purple-100 text-purple-700';
  }

  if (normalized.includes('uji') || normalized.includes('pengujian') || normalized.includes('proses')) {
    return 'bg-blue-100 text-blue-700';
  }

  return 'bg-gray-100 text-gray-700';
}

export function getPickupScheduleDate(row) {
  return pickFirst(
    row?.tanggal_jadwal_pengambilan,
    row?.tanggalJadwalPengambilan,
    row?.tanggal_pengambilan_lhu,
    row?.tanggalPengambilanLhu,
    row?.jadwal_pengambilan,
    row?.jadwalPengambilan,
    row?.tanggal_pengambilan,
    row?.tanggalPengambilan,
    row?.created_at,
    row?.createdAt
  );
}
