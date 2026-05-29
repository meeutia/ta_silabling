const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const {
  Sampel,
  Lka,
  PenugasanDetail,
} = require('../../models/Associations');
const {
  SAMPLE_REVIEW_STATUS,
} = require('../../constants/lhu-status.constant');
const {
  prefixRevisionNote,
  buildRevisionNotePatch,
  normalizeRevisionRole,
} = require('./assignment-revision.helper');
const {
  syncAssignmentHeaderStatusForDetails,
} = require('./assignment-status.helper');
const {
  assertSamplesEditableBeforeLhu,
  cancelNonFinalLhusBySamples,
} = require('./assignment-lhu-lock.helper');
const {
  assertSampleReadyForKasiReview,
} = require('./assignment-kasi-review.service');
const {
  getLkaResultRowsForSample,
} = require('./assignment-lka-result.service');

async function requestLkaRevision({ noSampel, sourceRole, catatanRevisi, currentNik }) {
  const sampleNo = String(noSampel || '').trim();
  const role = String(sourceRole || '').trim();
  const userNik = String(currentNik || '').trim();
  const note = String(catatanRevisi || '').trim();

  if (!sampleNo) {
    throw new Error('Nomor sampel wajib dikirim.');
  }

  if (!userNik) {
    throw new Error('User review tidak valid.');
  }

  if (!note) {
    throw new Error('Catatan revisi wajib diisi.');
  }

  if (!role) {
    throw new Error('Role sumber revisi wajib dikirim.');
  }

  const normalizedRole = normalizeRevisionRole(role);
  const prefixedNote = prefixRevisionNote(normalizedRole.display, note);

  return sequelize.transaction(async (transaction) => {
    const sample = await Sampel.findOne({
      where: { no_sampel: sampleNo },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!sample) {
      throw new Error('Sampel tidak ditemukan.');
    }

    await assertSamplesEditableBeforeLhu([sampleNo], transaction);

    let lkaRows = [];

    if (normalizedRole.internal === 'Kasi Pengujian') {
      const readyState = await assertSampleReadyForKasiReview(sampleNo, transaction);
      lkaRows = readyState.completedRows || [];
    } else if (normalizedRole.internal === 'QC') {
      if (sample.statusReviewHasil !== SAMPLE_REVIEW_STATUS.APPROVED_KASI_PENGUJIAN) {
        throw new Error('Sampel belum berada pada tahap finalisasi Pengendalian Mutu.');
      }

      lkaRows = await getLkaResultRowsForSample(sampleNo, transaction);
    } else if (normalizedRole.internal === 'Kalab') {
      if (sample.statusReviewHasil !== SAMPLE_REVIEW_STATUS.APPROVED_KASI_PENGUJIAN) {
        throw new Error('Sampel belum berada pada tahap persetujuan Kepala Lab.');
      }

      lkaRows = await getLkaResultRowsForSample(sampleNo, transaction);
    } else {
      throw new Error('Role sumber revisi tidak dikenal.');
    }

    const samplePayload = {
      statusReviewHasil: SAMPLE_REVIEW_STATUS.REVISION_KASI_PENGUJIAN,
    };

    if (normalizedRole.internal === 'Kasi Pengujian') {
      samplePayload.kasiPengujianReviewBy = userNik;
      samplePayload.kasiPengujianReviewAt = new Date();
    }

    await sample.update(samplePayload, { transaction });

    const affectedRows = Array.isArray(lkaRows)
      ? lkaRows.filter((row) => row.status_lka === 'Disetujui Penyelia')
      : [];

    const affectedLkaCodes = Array.from(
      new Set(affectedRows.map((row) => row.kode_lka).filter(Boolean))
    );

    const affectedDetailIds = Array.from(
      new Set(affectedRows.map((row) => row.id_penugasan_detail).filter(Boolean))
    );

    if (affectedLkaCodes.length > 0) {
      const affectedLkas = await Lka.findAll({
        where: {
          kode_lka: { [Op.in]: affectedLkaCodes },
          status_lka: 'Disetujui Penyelia',
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      for (const lka of affectedLkas) {
        await lka.update(
          {
            status_lka: 'Perlu Perbaikan',
            ...buildRevisionNotePatch(lka.catatan_revisi, prefixedNote),
          },
          { transaction }
        );
      }
    }

    if (affectedDetailIds.length > 0) {
      await PenugasanDetail.update(
        { status_detail: 'Perlu Revisi' },
        {
          where: {
            id_penugasan_detail: { [Op.in]: affectedDetailIds },
          },
          transaction,
        }
      );

      await syncAssignmentHeaderStatusForDetails(affectedDetailIds, transaction);
    }

    await cancelNonFinalLhusBySamples([sampleNo], transaction);

    return {
      noSampel: sampleNo,
      no_sampel: sampleNo,
      statusReviewHasil: SAMPLE_REVIEW_STATUS.REVISION_KASI_PENGUJIAN,
      status_review_hasil: SAMPLE_REVIEW_STATUS.REVISION_KASI_PENGUJIAN,
    };
  });
}

module.exports = {
  requestLkaRevision,
};
