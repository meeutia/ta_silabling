const ROLE_ANALIS = 'RL-005';
const SUBKONTRAK_ASSIGNMENT_TYPE = 'SUBKONTRAK';
const EDITABLE_LKA_STATUSES = new Set(['Draft', 'Perlu Perbaikan']);

const LKA_HASIL_STATUS = Object.freeze({
  DRAFT: 'Draft',
  WAIT_PENYELIA: 'Menunggu Verifikasi Penyelia',
  WAIT_KASI: 'Menunggu Verifikasi Kasi Pengujian',
  WAIT_PENYELIA_KASI: 'Menunggu Persetujuan Penyelia Atas Revisi Kasi',
  APPROVED_PENYELIA: 'Disetujui Penyelia',
  APPROVED_KASI: 'Disetujui Kasi Pengujian',
  REVISION: 'Perlu Revisi',
});

module.exports = {
  ROLE_ANALIS,
  SUBKONTRAK_ASSIGNMENT_TYPE,
  EDITABLE_LKA_STATUSES,
  LKA_HASIL_STATUS,
};
