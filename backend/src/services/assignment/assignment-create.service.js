const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const {
  User,
  FpplParameterMetode,
  ParameterMetode,
  Penugasan,
  PenugasanDetail,
  PenugasanItem,
  Sampel,
} = require('../../models/Associations');
const notificationService = require('../notification/notification.service');
const WorkflowLogService = require('../workflow/workflow-log.service');
const { ROLE_ANALIS } = require('./assignment.constants');
const { nextRunningId } = require('./assignment-id.helper');
const {
  getPlain,
  pickObject,
  pickArray,
} = require('./assignment-object.helper');
const {
  internalAssignmentWhere,
} = require('./assignment-scope.helper');
const {
  pairKey,
  methodGroupKeyFromFpm,
  assignmentGroupKey,
  isInternalCapableFpm,
} = require('./assignment-fpm.helper');
const {
  assertSamplesEditableBeforeLhu,
} = require('./assignment-lhu-lock.helper');

function normalizeAssignmentPayload(assignments = []) {
  return assignments
    .map((item) => {
      const rawNoSampel = Array.isArray(item.no_sampel || item.noSampel)
        ? item.no_sampel || item.noSampel
        : [];

      const noSampelRows = Array.from(
        new Set(
          rawNoSampel
            .map((value) => String(value || '').trim())
            .filter(Boolean)
        )
      );

      const rawPairs = Array.isArray(item.pairs) ? item.pairs : [];

      const pairs = rawPairs
        .map((pair) => ({
          id_fppl_parameter_metode: String(
            pair.id_fppl_parameter_metode ||
              pair.idFpplParameterMetode ||
              ''
          ).trim(),
          no_sampel: String(pair.no_sampel || pair.noSampel || '').trim(),
        }))
        .filter((pair) => pair.id_fppl_parameter_metode && pair.no_sampel);

      const representativeFpmId = String(
        item.id_fppl_parameter_metode ||
          item.idFpplParameterMetode ||
          pairs[0]?.id_fppl_parameter_metode ||
          ''
      ).trim();

      const normalizedPairs =
        pairs.length > 0
          ? pairs
          : noSampelRows.map((noSampel) => ({
              id_fppl_parameter_metode: representativeFpmId,
              no_sampel: noSampel,
            }));

      return {
        id_fppl_parameter_metode: representativeFpmId,
        id_metode_parameter: String(
          item.id_metode_parameter ||
            item.idMetodeParameter ||
            ''
        ).trim() || null,
        no_sampel: noSampelRows,
        pairs: normalizedPairs,
        tanggal_tenggat: item.tanggal_tenggat || item.tanggalTenggat || null,
        catatan_detail: item.catatan_detail || item.catatanDetail || null,
      };
    })
    .filter(
      (item) =>
        item.id_fppl_parameter_metode &&
        item.no_sampel.length > 0 &&
        item.pairs.length > 0
    );
}

async function createAssignment(payload, currentUserNik) {
  const {
    idUserAnalis,
    catatanPenugasan = null,
    assignments = [],
  } = payload || {};

  if (!idUserAnalis) {
    throw new Error('Analis wajib dipilih.');
  }

  if (!Array.isArray(assignments) || assignments.length === 0) {
    throw new Error('Minimal harus ada satu item yang ditugaskan.');
  }

  const normalizedAssignments = normalizeAssignmentPayload(assignments);

  if (!normalizedAssignments.length) {
    throw new Error('Tidak ada pasangan parameter-sampel yang dipilih.');
  }

  const requestedFpmIds = Array.from(
    new Set(
      normalizedAssignments.flatMap((item) => [
        item.id_fppl_parameter_metode,
        ...item.pairs.map((pair) => pair.id_fppl_parameter_metode),
      ])
    )
  ).filter(Boolean);

  const sampleNos = Array.from(
    new Set(normalizedAssignments.flatMap((item) => item.no_sampel))
  ).filter(Boolean);

  const result = await sequelize.transaction(async (transaction) => {
    await assertSamplesEditableBeforeLhu(sampleNos, transaction);

    const analyst = await User.findOne({
      where: {
        nik: idUserAnalis,
        id_role: ROLE_ANALIS,
        is_active: 1,
      },
      attributes: ['nik', 'username'],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!analyst) {
      throw new Error('Analis tidak valid.');
    }

    const requestedFpmInstances = await FpplParameterMetode.findAll({
      where: {
        id_fppl_parameter_metode: { [Op.in]: requestedFpmIds },
      },
      include: [
        {
          model: ParameterMetode,
          required: false,
          attributes: ['id_metode_parameter', 'is_subkontrak'],
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (requestedFpmInstances.length !== requestedFpmIds.length) {
      throw new Error('Sebagian parameter/metode tidak ditemukan.');
    }

    const requestedFpmRows = requestedFpmInstances
      .map((instance) => getPlain(instance))
      .filter(Boolean);

    const requestedMethodIds = Array.from(
      new Set(
        requestedFpmRows
          .map((fpm) => methodGroupKeyFromFpm(fpm))
          .filter(Boolean)
      )
    );

    const fpmWhere =
      requestedMethodIds.length > 0
        ? {
            id_metode_parameter: {
              [Op.in]: requestedMethodIds,
            },
          }
        : {
            id_fppl_parameter_metode: {
              [Op.in]: requestedFpmIds,
            },
          };

    const fpmInstances = await FpplParameterMetode.findAll({
      where: fpmWhere,
      include: [
        {
          model: ParameterMetode,
          required: false,
        },
        {
          model: Sampel,
          as: 'sampels',
          required: false,
          through: { attributes: [] },
          where: {
            no_sampel: { [Op.in]: sampleNos },
          },
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const fpmRows = fpmInstances
      .map((instance) => getPlain(instance))
      .filter(Boolean);

    const fpmById = new Map(
      fpmRows.map((fpm) => [String(fpm.id_fppl_parameter_metode), fpm])
    );

    const validPairSet = new Set();
    const duplicatePairSet = new Set();
    const duplicateGroupSet = new Set();
    const groupSampleToPair = new Map();

    const existingAssignedByMethodInstances = requestedMethodIds.length
      ? await PenugasanDetail.findAll({
          where: {
            id_metode_parameter: { [Op.in]: requestedMethodIds },
          },
          include: [
            {
              model: Penugasan,
              required: true,
              where: internalAssignmentWhere({
                status_penugasan: { [Op.ne]: 'Dibatalkan' },
              }),
            },
            {
              model: PenugasanItem,
              required: true,
              where: {
                no_sampel: { [Op.in]: sampleNos },
              },
            },
          ],
          transaction,
          lock: transaction.LOCK.UPDATE,
        })
      : [];

    existingAssignedByMethodInstances.forEach((instance) => {
      const detail = getPlain(instance);
      const detailMethodId = String(detail.id_metode_parameter || '').trim();

      const items = pickArray(detail, [
        'penugasan_items',
        'PenugasanItems',
        'penugasan_item',
        'PenugasanItem',
      ]);

      items.forEach((item) => {
        if (!detailMethodId || !item?.no_sampel) return;

        duplicateGroupSet.add(`MP::${detailMethodId}::${item.no_sampel}`);
      });
    });

    for (const fpm of fpmRows) {
      const parameterMetode =
        pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};

      const groupKey = assignmentGroupKey(fpm);
      const samples = pickArray(fpm, ['sampels', 'Sampels', 'Sampel']);

      if (samples.length > 0 && !isInternalCapableFpm(fpm, parameterMetode)) {
        throw new Error('Parameter subkontrak tidak boleh ditugaskan ke analis internal.');
      }

      samples.forEach((sample) => {
        if (!sample?.no_sampel) return;

        const key = pairKey(fpm.id_fppl_parameter_metode, sample.no_sampel);
        const groupSampleKey = `${groupKey}::${sample.no_sampel}`;

        validPairSet.add(key);

        if (!groupSampleToPair.has(groupSampleKey)) {
          groupSampleToPair.set(groupSampleKey, {
            id_fppl_parameter_metode: fpm.id_fppl_parameter_metode,
            no_sampel: sample.no_sampel,
          });
        }
      });
    }

    for (const item of normalizedAssignments) {
      const representativeFpm = fpmById.get(String(item.id_fppl_parameter_metode));

      if (!representativeFpm) {
        throw new Error(`Parameter/metode tidak ditemukan: ${item.id_fppl_parameter_metode}`);
      }

      const representativeGroupKey = assignmentGroupKey(representativeFpm);
      const representativeMethodId = methodGroupKeyFromFpm(representativeFpm);

      if (!representativeMethodId) {
        throw new Error(`ID metode parameter tidak ditemukan untuk ${item.id_fppl_parameter_metode}.`);
      }

      const explicitPairBySample = new Map(
        item.pairs.map((pair) => [pair.no_sampel, pair.id_fppl_parameter_metode])
      );

      const resolvedPairMap = new Map();

      for (const noSampel of item.no_sampel) {
        let resolvedFpmId = explicitPairBySample.get(noSampel) || '';

        if (!validPairSet.has(pairKey(resolvedFpmId, noSampel))) {
          const resolved = groupSampleToPair.get(`${representativeGroupKey}::${noSampel}`);
          resolvedFpmId = resolved?.id_fppl_parameter_metode || '';
        }

        const actualPairKey = pairKey(resolvedFpmId, noSampel);
        const groupDuplicateKey = `${representativeGroupKey}::${noSampel}`;
        const methodDuplicateKey = `MP::${representativeMethodId}::${noSampel}`;
        const resolvedFpm = fpmById.get(String(resolvedFpmId));
        const resolvedMethodId = methodGroupKeyFromFpm(resolvedFpm);

        if (!resolvedFpmId || !validPairSet.has(actualPairKey)) {
          throw new Error(
            `Pasangan parameter-sampel tidak valid: ${item.id_fppl_parameter_metode} / ${noSampel}`
          );
        }

        if (resolvedMethodId && resolvedMethodId !== representativeMethodId) {
          throw new Error(
            `Sampel ${noSampel} tidak berada pada metode parameter yang sama.`
          );
        }

        if (
          duplicatePairSet.has(actualPairKey) ||
          duplicateGroupSet.has(groupDuplicateKey) ||
          duplicateGroupSet.has(methodDuplicateKey)
        ) {
          throw new Error(
            `Sampel ${noSampel} untuk parameter-metode ini sudah pernah ditugaskan.`
          );
        }
        duplicatePairSet.add(actualPairKey);
        duplicateGroupSet.add(groupDuplicateKey);
        duplicateGroupSet.add(methodDuplicateKey);

        resolvedPairMap.set(`${resolvedFpmId}::${noSampel}`, {
          id_fppl_parameter_metode: resolvedFpmId,
          no_sampel: noSampel,
        });
      }

      item.id_metode_parameter = item.id_metode_parameter || representativeMethodId;

      item.pairs = Array.from(resolvedPairMap.values());
      item.no_sampel = Array.from(
        new Set(item.pairs.map((pair) => pair.no_sampel))
      );
    }

    const idPenugasan = await nextRunningId(
      'penugasan',
      'id_penugasan',
      'PNG-',
      4,
      transaction
    );

    await Penugasan.create(
      {
        id_penugasan: idPenugasan,
        id_user_analis: idUserAnalis,
        assigned_by: currentUserNik,
        assigned_at: new Date(),
        status_penugasan: 'Aktif',
        jenis_penugasan: 'INTERNAL',
        catatan_penugasan: catatanPenugasan,
      },
      { transaction }
    );

    const createdDetails = [];

    for (const item of normalizedAssignments) {
      const idPenugasanDetail = await nextRunningId(
        'penugasan_detail',
        'id_penugasan_detail',
        'PD-',
        5,
        transaction
      );

      await PenugasanDetail.create(
        {
          id_penugasan_detail: idPenugasanDetail,
          id_penugasan: idPenugasan,
          id_metode_parameter: item.id_metode_parameter,
          status_detail: 'Ditugaskan',
          tanggal_tenggat: item.tanggal_tenggat,
          catatan_detail: item.catatan_detail,
        },
        { transaction }
      );

      for (const noSampel of item.no_sampel) {
        await PenugasanItem.create(
          {
            id_penugasan_detail: idPenugasanDetail,
            no_sampel: noSampel,
            tanggal_penugasan: new Date(),
          },
          { transaction }
        );
      }

      createdDetails.push({
        id_penugasan_detail: idPenugasanDetail,
        id_fppl_parameter_metode: item.id_fppl_parameter_metode,
        total_sampel: item.no_sampel.length,
      });
    }

    await Sampel.update(
      { status_sample: 'Dalam Pengujian' },
      {
        where: {
          no_sampel: { [Op.in]: sampleNos },
        },
        transaction,
      }
    );

    await WorkflowLogService.logStatusTransition({
      entityType: 'PENUGASAN',
      entityId: idPenugasan,
      action: 'MEMBUAT_PENUGASAN',
      statusBefore: null,
      statusAfter: 'Aktif',
      source: 'Penyelia',
      note: catatanPenugasan || 'Penugasan pengujian dibuat.',
      actorNik: currentUserNik || null,
      transaction,
    });

    for (const detail of createdDetails) {
      await WorkflowLogService.logStatusTransition({
        entityType: 'PENUGASAN_DETAIL',
        entityId: detail.id_penugasan_detail,
        action: 'MEMBUAT_DETAIL_PENUGASAN',
        statusBefore: null,
        statusAfter: 'Ditugaskan',
        source: 'Penyelia',
        note: `Detail penugasan dibuat untuk ${detail.total_sampel} sampel.`,
        actorNik: currentUserNik || null,
        transaction,
      });
    }

    return {
      idPenugasan,
      idUserAnalis,
      totalDetail: createdDetails.length,
      details: createdDetails,
    };
  });

  try {
    await notificationService.notifyPenugasanAnalisBaru(result.idPenugasan);
  } catch (error) {
    console.error('Gagal kirim email penugasan analis baru:', error);
  }

  return result;
}

module.exports = {
  createAssignment,
};
