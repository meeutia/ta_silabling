const { Op } = require('sequelize');
const {
  Lka,
  LkaHasil,
  LkaRevisi,
  Penugasan,
  PenugasanDetail,
} = require('../../models/Associations');
const { LKA_HASIL_STATUS } = require('./assignment.constants');
const { getLkaHasilKey, lkaHasilWhereFromKey } = require('./assignment-revision.helper');
const { isSubkontrakAssignment } = require('./assignment-scope.helper');

function getPlain(instance) {
  if (!instance) return {};
  if (typeof instance.get === 'function') return instance.get({ plain: true });
  return instance;
}

function pickArray(source, keys = []) {
  for (const key of keys) {
    if (Array.isArray(source?.[key])) return source[key];
  }
  return [];
}

function getLkaHasilStatus(row = {}, fallbackStatus = null) {
  return row.statusReviewHasil || row.status_review_hasil || fallbackStatus || null;
}


function isActiveRevisionReviewStatus(status) {
  const value = String(status || '').trim();

  return [
    LKA_HASIL_STATUS.REVISION,
    LKA_HASIL_STATUS.WAIT_PENYELIA_KASI,
  ].includes(value);
}


function isActiveLkaRevisionStatus(status) {
  const value = String(status || '').trim();

  if (!value) return false;

  return ![
    'Selesai',
    'Ditolak Penyelia',
  ].includes(value);
}


function isActiveLkaRevisionItemStatus(status) {
  const value = String(status || '').trim();

  if (!value) return false;

  return ![
    'Ditolak Penyelia',
    'Diperbaiki Analis',
    'Disetujui Penyelia',
    'Disetujui Kasi',
  ].includes(value);
}


function hasActiveRevisionForMonitorDetail(detail = {}, lka = {}) {
  const detailStatus = String(detail.status_detail || detail.statusDetail || '').trim();
  const lkaStatus = String(lka.status_lka || lka.statusLka || '').trim();
  const statusSuggestsRevision = detailStatus === 'Perlu Revisi' || lkaStatus === 'Perlu Perbaikan';

  const hasilRows = pickArray(lka, ['lka_hasils', 'LkaHasils', 'lka_hasil', 'LkaHasil']);
  if (hasilRows.some((row) => isActiveRevisionReviewStatus(getLkaHasilStatus(row)))) {
    return true;
  }

  const revisionRows = pickArray(lka, ['revisi_lka', 'RevisiLka', 'LkaRevisis', 'revisiLka']);
  if (revisionRows.length > 0) {
    return revisionRows.some((revision) => {
      const revisionStatus = revision.status_revisi || revision.statusRevisi;
      if (!isActiveLkaRevisionStatus(revisionStatus)) return false;

      const items = pickArray(revision, ['items', 'lka_revisi_items', 'LkaRevisiItems']);
      if (items.length === 0) return true;

      return items.some((item) => isActiveLkaRevisionItemStatus(item.status_item_revisi || item.statusItemRevisi));
    });
  }

  return statusSuggestsRevision;
}


function resolveMonitorDisplayStatus(detail = {}, lka = {}, hasActiveRevision = false) {
  if (hasActiveRevision) return 'Perlu Revisi';

  const actualStatus = String(detail.status_detail || detail.statusDetail || '').trim();
  if (actualStatus && actualStatus !== 'Perlu Revisi') return actualStatus;

  const lkaStatus = String(lka.status_lka || lka.statusLka || '').trim();
  if (lkaStatus === 'Menunggu Verifikasi Penyelia') return 'Worksheet Terkirim';
  if (
    lkaStatus === 'Menunggu Verifikasi Kasi Pengujian' ||
    lkaStatus === 'Disetujui Penyelia' ||
    lkaStatus === 'Disetujui Kasi Pengujian'
  ) {
    return 'Disetujui';
  }

  const hasilRows = pickArray(lka, ['lka_hasils', 'LkaHasils', 'lka_hasil', 'LkaHasil']);
  const hasilStatuses = hasilRows
    .map((row) => getLkaHasilStatus(row))
    .filter(Boolean);

  if (hasilStatuses.some((status) => status === LKA_HASIL_STATUS.WAIT_PENYELIA)) {
    return 'Worksheet Terkirim';
  }

  if (
    hasilStatuses.length > 0 &&
    hasilStatuses.every((status) => [
      LKA_HASIL_STATUS.APPROVED_PENYELIA,
      LKA_HASIL_STATUS.WAIT_KASI,
      LKA_HASIL_STATUS.APPROVED_KASI,
    ].includes(status))
  ) {
    return 'Disetujui';
  }

  if (hasilRows.some((row) => String(row.hasil || '').trim())) {
    return 'Sedang Dikerjakan';
  }

  return actualStatus || 'Ditugaskan';
}


function mapStatusLkaToHasilStatus(statusLka) {
  if (statusLka === 'Menunggu Verifikasi Penyelia') return LKA_HASIL_STATUS.WAIT_PENYELIA;
  if (statusLka === 'Disetujui Penyelia') return LKA_HASIL_STATUS.APPROVED_PENYELIA;
  if (statusLka === 'Menunggu Verifikasi Kasi Pengujian') return LKA_HASIL_STATUS.WAIT_KASI;
  if (statusLka === 'Disetujui Kasi Pengujian') return LKA_HASIL_STATUS.APPROVED_KASI;
  if (statusLka === 'Perlu Perbaikan') return LKA_HASIL_STATUS.REVISION;
  if (statusLka === 'Draft') return LKA_HASIL_STATUS.DRAFT;
  return null;
}


function hasFilledLkaHasil(row = {}) {
  return Boolean(String(row.hasil || '').trim());
}


function hasExplicitLkaHasilStatuses(rows = []) {
  return (Array.isArray(rows) ? rows : []).some((row) =>
    Boolean(row?.statusReviewHasil || row?.status_review_hasil)
  );
}


function getFallbackStatusForMixedLka(row = {}, statusLka = null) {
  if (!hasFilledLkaHasil(row)) {
    return mapStatusLkaToHasilStatus(statusLka) || LKA_HASIL_STATUS.DRAFT;
  }

  if (statusLka === 'Disetujui Kasi Pengujian') {
    return LKA_HASIL_STATUS.APPROVED_KASI;
  }

  // Jika satu LKA sudah punya status detail campuran, row lama yang belum punya
  // statusReviewHasil tapi sudah punya hasil tidak boleh ikut status agregat LKA
  // seperti "Perlu Perbaikan" atau "Menunggu Verifikasi Penyelia".
  // Secara aman, anggap row tersebut tetap hasil yang sudah disetujui penyelia.
  return LKA_HASIL_STATUS.APPROVED_PENYELIA;
}


function resolveLkaHasilStatus(row = {}, statusLka = null, siblingRows = []) {
  const explicitStatus = getLkaHasilStatus(row);
  if (explicitStatus) return explicitStatus;

  const hasMixedStatus = hasExplicitLkaHasilStatuses(siblingRows);
  if (hasMixedStatus) {
    return getFallbackStatusForMixedLka(row, statusLka);
  }

  return mapStatusLkaToHasilStatus(statusLka) ||
    (hasFilledLkaHasil(row) ? LKA_HASIL_STATUS.APPROVED_PENYELIA : LKA_HASIL_STATUS.DRAFT);
}


async function normalizeLegacyLkaHasilStatuses(kodeLka, transaction = null) {
  if (!kodeLka) return 0;

  const lkaInstance = await Lka.findOne({
    where: { kode_lka: kodeLka },
    attributes: ['kode_lka', 'status_lka'],
    include: [{ model: LkaHasil, required: false }],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  if (!lkaInstance) return 0;

  const lka = getPlain(lkaInstance);
  const hasilRows = pickArray(lka, ['lka_hasils', 'LkaHasils', 'lka_hasil', 'LkaHasil']);
  const hasMixedStatus = hasExplicitLkaHasilStatuses(hasilRows);

  const rowsToUpdate = hasilRows
    .filter((row) => getLkaHasilKey(row))
    .filter((row) => !getLkaHasilStatus(row))
    .filter((row) => hasFilledLkaHasil(row));

  for (const row of rowsToUpdate) {
    const statusReview = hasMixedStatus
      ? getFallbackStatusForMixedLka(row, lka.status_lka)
      : mapStatusLkaToHasilStatus(lka.status_lka) || LKA_HASIL_STATUS.APPROVED_PENYELIA;

    await LkaHasil.update(
      { statusReviewHasil: statusReview },
      {
        where: lkaHasilWhereFromKey(getLkaHasilKey(row)),
        transaction,
      }
    );
  }

  return rowsToUpdate.length;
}


function deriveAggregateLkaStatus(hasilRows = []) {
  const statuses = hasilRows.map((row) => getLkaHasilStatus(row)).filter(Boolean);

  if (!statuses.length) return 'Draft';
  if (statuses.some((status) => status === LKA_HASIL_STATUS.REVISION)) return 'Perlu Perbaikan';
  if (statuses.some((status) => status === LKA_HASIL_STATUS.WAIT_PENYELIA)) return 'Menunggu Verifikasi Penyelia';
  if (statuses.some((status) => status === LKA_HASIL_STATUS.WAIT_PENYELIA_KASI)) return 'Menunggu Verifikasi Kasi Pengujian';
  if (statuses.some((status) => status === LKA_HASIL_STATUS.WAIT_KASI)) return 'Menunggu Verifikasi Kasi Pengujian';
  if (statuses.every((status) => status === LKA_HASIL_STATUS.APPROVED_KASI)) return 'Disetujui Kasi Pengujian';
  if (statuses.every((status) => status === LKA_HASIL_STATUS.APPROVED_PENYELIA || status === LKA_HASIL_STATUS.APPROVED_KASI)) return 'Disetujui Penyelia';
  if (statuses.every((status) => status === LKA_HASIL_STATUS.DRAFT)) return 'Draft';

  return 'Perlu Perbaikan';
}


async function syncLkaAggregateStatus(kodeLka, transaction = null, extraPayload = {}) {
  if (!kodeLka) return null;

  const rows = await LkaHasil.findAll({
    where: { kode_lka: kodeLka },
    attributes: ['kode_lka', 'no_sampel', 'statusReviewHasil'],
    transaction,
  });

  const plainRows = rows.map(getPlain).filter(Boolean);
  const status_lka = deriveAggregateLkaStatus(plainRows);

  const payload = { ...extraPayload };

  if (Object.prototype.hasOwnProperty.call(payload, 'catatan_revisi')) {
    const nextRevisionNote = payload.catatan_revisi;
    delete payload.catatan_revisi;

    if (String(nextRevisionNote || '').trim()) {
      const lka = await Lka.findOne({
        where: { kode_lka: kodeLka },
        attributes: ['kode_lka'],
        transaction,
        lock: transaction ? transaction.LOCK.UPDATE : undefined,
      });

      if (lka) {
        Object.assign(payload, buildRevisionNotePatch(lka.catatan_revisi, nextRevisionNote));
      }
    }
  }

  await Lka.update(
    {
      ...payload,
      status_lka,
    },
    {
      where: { kode_lka: kodeLka },
      transaction,
    }
  );

  return status_lka;
}


function derivePenugasanHeaderStatusFromDetails(statuses = []) {
  const normalizedStatuses = statuses.map((status) => String(status || '').trim()).filter(Boolean);

  if (!normalizedStatuses.length) return 'Aktif';

  const isFinal = (status) => ['Disetujui', 'Selesai'].includes(status);
  return normalizedStatuses.every(isFinal) ? 'Selesai' : 'Aktif';
}


async function syncAssignmentHeaderStatusFromDetail(idPenugasanDetail, transaction = null) {
  if (!idPenugasanDetail) return null;

  const detail = await PenugasanDetail.findOne({
    where: { id_penugasan_detail: idPenugasanDetail },
    attributes: ['id_penugasan_detail', 'id_penugasan'],
    transaction,
  });

  if (!detail?.id_penugasan) return null;

  const penugasan = await Penugasan.findOne({
    where: { id_penugasan: detail.id_penugasan },
    attributes: ['id_penugasan', 'status_penugasan', 'jenis_penugasan'],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  if (!penugasan || penugasan.status_penugasan === 'Dibatalkan') return null;
  if (isSubkontrakAssignment(penugasan)) return penugasan.status_penugasan;

  const detailRows = await PenugasanDetail.findAll({
    where: { id_penugasan: detail.id_penugasan },
    attributes: ['status_detail'],
    transaction,
  });

  const nextStatus = derivePenugasanHeaderStatusFromDetails(
    detailRows.map((row) => row.status_detail)
  );

  if (penugasan.status_penugasan !== nextStatus) {
    await penugasan.update({ status_penugasan: nextStatus }, { transaction });
  }

  return nextStatus;
}


async function syncAssignmentHeaderStatusForDetails(idPenugasanDetails = [], transaction = null) {
  const detailIds = Array.from(new Set((Array.isArray(idPenugasanDetails) ? idPenugasanDetails : [idPenugasanDetails]).filter(Boolean)));
  const results = [];

  for (const detailId of detailIds) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await syncAssignmentHeaderStatusFromDetail(detailId, transaction));
  }

  return results.filter(Boolean);
}


async function syncDetailStatusFromLka(kodeLka, transaction = null) {
  if (!kodeLka) return null;

  const lka = await Lka.findOne({
    where: { kode_lka: kodeLka },
    attributes: ['kode_lka', 'id_penugasan_detail', 'status_lka'],
    transaction,
  });

  if (!lka) return null;

  const row = getPlain(lka);
  let statusDetail = 'Sedang Dikerjakan';

  if (row.status_lka === 'Menunggu Verifikasi Penyelia') statusDetail = 'Worksheet Terkirim';
  else if (row.status_lka === 'Perlu Perbaikan') statusDetail = 'Perlu Revisi';
  else if (
    row.status_lka === 'Menunggu Verifikasi Kasi Pengujian' ||
    row.status_lka === 'Disetujui Penyelia' ||
    row.status_lka === 'Disetujui Kasi Pengujian'
  ) {
    statusDetail = 'Disetujui';
  }
  else if (row.status_lka === 'Draft') statusDetail = 'Draft';

  await PenugasanDetail.update(
    { status_detail: statusDetail },
    {
      where: { id_penugasan_detail: row.id_penugasan_detail },
      transaction,
    }
  );

  await syncAssignmentHeaderStatusFromDetail(row.id_penugasan_detail, transaction);

  return statusDetail;
}


module.exports = {
  getLkaHasilStatus,
  hasActiveRevisionForMonitorDetail,
  resolveMonitorDisplayStatus,
  mapStatusLkaToHasilStatus,
  resolveLkaHasilStatus,
  normalizeLegacyLkaHasilStatuses,
  syncLkaAggregateStatus,
  syncAssignmentHeaderStatusFromDetail,
  syncAssignmentHeaderStatusForDetails,
  syncDetailStatusFromLka,
};
