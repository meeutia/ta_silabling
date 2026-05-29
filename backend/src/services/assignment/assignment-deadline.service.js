const sequelize = require('../../config/database');
const {
  Penugasan,
  PenugasanDetail,
} = require('../../models/Associations');
const {
  getPlain,
} = require('./assignment-object.helper');
const {
  assertPenugasanDetailSamplesEditableBeforeLhu,
} = require('./assignment-lhu-lock.helper');

async function updateAssignmentDetailDeadline(idPenugasanDetail, tanggalTenggat, currentUserNik = null) {
  const detailId = String(idPenugasanDetail || '').trim();
  const nextDeadline = String(tanggalTenggat || '').trim();

  if (!detailId) throw new Error('ID detail penugasan wajib dikirim.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDeadline)) {
    throw new Error('Deadline harus berformat YYYY-MM-DD.');
  }

  const deadlineDate = new Date(`${nextDeadline}T00:00:00`);

  if (Number.isNaN(deadlineDate.getTime())) {
    throw new Error('Deadline tidak valid.');
  }

  const t = await sequelize.transaction();

  try {
    const detail = await PenugasanDetail.findOne({
      where: { id_penugasan_detail: detailId },
      include: [
        {
          model: Penugasan,
          required: true,
        },
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!detail) throw new Error('Detail penugasan tidak ditemukan.');

    const plainDetail = getPlain(detail);
    const penugasan = plainDetail.penugasan || plainDetail.Penugasan || {};

    if (penugasan.status_penugasan === 'Dibatalkan') {
      throw new Error('Deadline tidak bisa diubah karena penugasan sudah dibatalkan.');
    }

    const nonEditableStatuses = new Set(['Disetujui', 'Selesai']);
    if (nonEditableStatuses.has(plainDetail.status_detail)) {
      throw new Error(`Deadline tidak bisa diubah karena detail sudah berstatus ${plainDetail.status_detail}.`);
    }

    await assertPenugasanDetailSamplesEditableBeforeLhu(detailId, t);

    await detail.update({ tanggal_tenggat: nextDeadline }, { transaction: t });

    await t.commit();

    return {
      id_penugasan: penugasan.id_penugasan || null,
      idPenugasan: penugasan.id_penugasan || null,
      id_penugasan_detail: detailId,
      idPenugasanDetail: detailId,
      tanggal_tenggat: nextDeadline,
      tanggalTenggat: nextDeadline,
      updated_by: currentUserNik || null,
      updatedBy: currentUserNik || null,
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

module.exports = {
  updateAssignmentDetailDeadline,
};
