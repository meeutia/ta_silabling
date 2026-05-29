const WORKFLOW_ENTITY = Object.freeze({
  FPPL: 'FPPL',
  FPPL_SAMPEL: 'FPPL_SAMPEL',
  SAMPEL: 'SAMPEL',
  INVOICE: 'INVOICE',
  PAYMENT: 'PAYMENT',
  JADWAL_SAMPEL: 'JADWAL_SAMPEL',
  JADWAL_LHU: 'JADWAL_LHU',
  PENGAJUAN_JADWAL: 'PENGAJUAN_JADWAL',
  PENUGASAN: 'PENUGASAN',
  PENUGASAN_DETAIL: 'PENUGASAN_DETAIL',
  LKA: 'LKA',
  LKA_HASIL: 'LKA_HASIL',
  LKA_REVISI: 'LKA_REVISI',
  LHU: 'LHU',
  NOTIFIKASI: 'NOTIFIKASI',
  USER: 'USER',
  SISTEM: 'SISTEM',
});

const WORKFLOW_SOURCE = Object.freeze({
  CUSTOMER: 'Pelanggan',
  ADMIN: 'Admin',
  KASI: 'Kasi',
  PENYELIA: 'Penyelia',
  ANALIS: 'Analis',
  QC: 'QC',
  KALAB: 'Kalab',
  SYSTEM: 'Sistem',
});

const SCHEDULE_CHANGE_STATUS = Object.freeze({
  PENDING: 'Menunggu Persetujuan Admin',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  CANCELLED_BY_CUSTOMER: 'Dibatalkan Pelanggan',
});

const SCHEDULE_STATUS = Object.freeze({
  SCHEDULED: 'Dijadwalkan',
  APPROVED_BY_CUSTOMER: 'Disetujui Pelanggan',
  APPROVED_BY_ADMIN: 'Disetujui Admin',
  DONE: 'Selesai',
  PICKED_UP: 'Sudah Diambil',
  CANCELLED: 'Dibatalkan',
});

module.exports = {
  WORKFLOW_ENTITY,
  WORKFLOW_SOURCE,
  SCHEDULE_CHANGE_STATUS,
  SCHEDULE_STATUS,
};
