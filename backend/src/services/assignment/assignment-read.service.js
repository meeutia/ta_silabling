const { Op } = require('sequelize');
const {
  User,
  Pegawai,
  Pelanggan,
  Fppl,
  FpplSampel,
  RegBm,
  JenisSampel,
  Parameter,
  Metode,
  ParameterMetode,
  FpplParameterMetode,
  Penugasan,
  PenugasanDetail,
  PenugasanItem,
  Sampel,
  Lka,
  LkaHasil,
  LkaRevisi,
  LkaRevisiItem,
} = require('../../models/Associations');

const { ROLE_ANALIS } = require('./assignment.constants');
const { getPlain, pickObject, pickArray, firstDate } = require('./assignment-object.helper');
const { internalAssignmentWhere, isSubkontrakAssignment } = require('./assignment-scope.helper');
const {
  assignmentGroupKey,
  assignmentPendingKey,
  getAssociatedFpmsFromSample,
  getStatusOrderValue,
  isInternalCapableFpm,
  sortSamplesForAssignment,
} = require('./assignment-fpm.helper');

const {
  hasActiveRevisionForMonitorDetail,
  resolveMonitorDisplayStatus,
} = require('./assignment-status.helper');
const {
  deriveSampleStatus,
  getDetailParameterInfo,
  getDetailSampleRows,
  isInternalDetail,
} = require('./assignment-monitor.mapper');
const {
  buildRevisionNoteBuckets,
  buildRevisionNoteResponseFromBuckets,
  getRevisionItemsFromRow,
  isGlobalRevisionLevel,
  isRevisionVisibleForAudience,
} = require('./assignment-revision.helper');

async function getAnalystOptions() {
  const analystInstances = await User.findAll({
    where: {
      id_role: ROLE_ANALIS,
      is_active: 1,
    },
    attributes: ['nik', 'username'],
    include: [{ model: Pegawai, required: false, attributes: ['nama_pegawai'] }],
    order: [['username', 'ASC']],
  });

  return analystInstances.map((instance) => {
    const user = getPlain(instance);
    const pegawai = pickObject(user, ['pegawai', 'Pegawai']) || {};
    const label = pegawai.nama_pegawai || user.username || user.nik;

    return {
      nik: user.nik,
      id: user.nik,
      username: user.username,
      nama: pegawai.nama_pegawai || null,
      label,
      value: user.nik,
    };
  });
}

async function getPendingItems() {
  const fpmInstances = await FpplParameterMetode.findAll({
    include: [
      {
        model: FpplSampel,
        required: true,
        include: [
          {
            model: Fppl,
            as: 'fppl',
            required: true,
            where: { status_fppl: 'Proses Pengujian' },
            include: [{ model: Pelanggan, as: 'pelanggan', required: false }],
          },
          { model: JenisSampel, required: false },
          { model: RegBm, required: false },
        ],
      },
      { model: Parameter, required: false },
      {
        model: ParameterMetode,
        required: false,
        include: [{ model: Metode, required: false }],
      },
      {
        model: Sampel,
        as: 'sampels',
        required: false,
        through: { attributes: [] },
      },
    ],
    order: [['id_fppl_parameter_metode', 'ASC']],
  });

  const rows = fpmInstances
    .map((instance) => getPlain(instance))
    .filter(Boolean)
    .filter((fpm) => {
      const parameterMetode = pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
      return isInternalCapableFpm(fpm, parameterMetode);
    });

  const methodIds = Array.from(
      new Set(
        rows
          .map((fpm) => {
            const parameterMetode =
              pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};

            return (
              fpm.id_metode_parameter ||
              fpm.idMetodeParameter ||
              parameterMetode.id_metode_parameter ||
              parameterMetode.idMetodeParameter ||
              null
            );
          })
          .filter(Boolean)
      )
    );

  const assignedDetailInstances = methodIds.length
      ? await PenugasanDetail.findAll({
          where: {
            id_metode_parameter: { [Op.in]: methodIds },
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
            },
          ],
        })
    : [];

  const assignedMethodSampleSet = new Set();

  assignedDetailInstances.forEach((instance) => {
      const detail = getPlain(instance);

      const items = pickArray(detail, [
        'penugasan_items',
        'PenugasanItems',
        'penugasan_item',
        'PenugasanItem',
      ]);

      items.forEach((item) => {
        if (!item?.no_sampel) return;

        assignedMethodSampleSet.add(
          assignmentPendingKey(detail.id_metode_parameter, item.no_sampel)
        );
      });
    });

  const grouped = new Map();
  rows.forEach((fpm) => {
      const fpplSampel = pickObject(fpm, ['fppl_sampel', 'FpplSampel']) || {};
      const fppl = pickObject(fpplSampel, ['fppl', 'Fppl']) || {};
      const pelanggan = pickObject(fppl, ['pelanggan', 'Pelanggan']) || {};
      const jenis = pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
      const regBm = pickObject(fpplSampel, ['reg_bm', 'RegBm']) || {};
      const parameter = pickObject(fpm, ['parameter', 'Parameter']) || {};
      const parameterMetode = pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
      const metode = pickObject(parameterMetode, ['metode', 'Metode']) || {};

      const groupKey = assignmentGroupKey(fpm);

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          idRegistrasi: fppl.id_registrasi || fpplSampel.id_registrasi || '-',
          pelanggan: pelanggan.nama_instansi || '-',

          // pakai salah satu FPM sebagai representative untuk penugasan_detail
          id_fppl_parameter_metode: fpm.id_fppl_parameter_metode,
          idFpplParameterMetode: fpm.id_fppl_parameter_metode,

          id_metode_parameter:
            fpm.id_metode_parameter || parameterMetode.id_metode_parameter || null,

          nama_parameter: parameter.nama_parameter || '-',
          namaParameter: parameter.nama_parameter || '-',

          nama_metode: metode.nama_metode || '-',
          namaMetode: metode.nama_metode || '-',

          acuan_metode: parameterMetode.acuan_metode || '-',
          acuanMetode: parameterMetode.acuan_metode || '-',

          is_insitu: Number(fpm.is_insitu || 0),
          status_kemampuan_lab: fpm.status_kemampuan_lab || null,

          is_subkontrak: Number(parameterMetode.is_subkontrak || 0),
          isSubkontrak: false,

          fpmIds: [],
          availableSamples: [],
          availableSampleRows: [],
          assignedSamples: [],
          jenis_sampel: new Set(),
          reg_bm: new Set(),
          assignedNoSet: new Set(),
          assignedByNo: new Map(),
        });
      }

      const group = grouped.get(groupKey);

      group.fpmIds.push(fpm.id_fppl_parameter_metode);
      group.jenis_sampel.add(jenis.jenis_sampel || '-');
      group.reg_bm.add([regBm.instansi, regBm.ref_reg].filter(Boolean).join(' - ') || '-');

      const sampelRowsRaw = pickArray(fpm, ['sampels', 'Sampels', 'Sampel']);

      const sampleMap = new Map();

      sampelRowsRaw.forEach((sampel) => {
        if (!sampel?.no_sampel) return;

        sampleMap.set(sampel.no_sampel, {
          no_sampel: sampel.no_sampel,
          id_fppl_parameter_metode: fpm.id_fppl_parameter_metode,

          pelanggan: pelanggan.nama_instansi || '-',
          nama_pelanggan: pelanggan.nama_instansi || '-',
          namaPelanggan: pelanggan.nama_instansi || '-',

          id_registrasi: fppl.id_registrasi || fpplSampel.id_registrasi || '-',
          idRegistrasi: fppl.id_registrasi || fpplSampel.id_registrasi || '-',

          id_fppl_sampel: fpplSampel.id_fppl_sampel || fpm.id_fppl_sampel || null,

          jenis_sampel: jenis.jenis_sampel || '-',
          jenisSampel: jenis.jenis_sampel || '-',

          reg_bm: [regBm.instansi, regBm.ref_reg].filter(Boolean).join(' - ') || '-',
          regBm: [regBm.instansi, regBm.ref_reg].filter(Boolean).join(' - ') || '-',

          tanggal_pengambilan_sampel: sampel.tanggal_pengambilan_sampel || null,
          tanggalPengambilanSampel: sampel.tanggal_pengambilan_sampel || null,
          tanggal_sampling: sampel.tanggal_pengambilan_sampel || null,
          tanggalSampling: sampel.tanggal_pengambilan_sampel || null,

          tanggal_penerimaan: sampel.diterima_pada || null,
          tanggal_terima: sampel.diterima_pada || null,
          jam_penerimaan: (sampel.diterima_pada ? new Date(sampel.diterima_pada).toTimeString().slice(0, 8) : null) || null,

          kondisi_sampel: sampel.kondisi_sampel || '-',
          abnormalitas_sampel: sampel.abnormalitas_sampel || '-',
          acuan_pengambilan_sampel: sampel.acuan_pengambilan_sampel || '-',
          koordinat: sampel.koordinat || '-',
        });
      });

      const idMetodeParameter =
        fpm.id_metode_parameter ||
        fpm.idMetodeParameter ||
        parameterMetode.id_metode_parameter ||
        parameterMetode.idMetodeParameter ||
        null;

      const allSamples = Array.from(sampleMap.values()).sort(sortSamplesForAssignment);

      allSamples.forEach((sample) => {
        const methodSampleKey = assignmentPendingKey(
          idMetodeParameter,
          sample.no_sampel
        );

        const alreadyAssigned =
          assignedMethodSampleSet.has(methodSampleKey) ||
          group.assignedNoSet.has(sample.no_sampel);

        if (alreadyAssigned) {
          const assignedInfo =
            group.assignedByNo.get(sample.no_sampel) || {
              no_sampel: sample.no_sampel,
              id_user_analis: null,
              analis_nama: '-',
            };

          group.assignedNoSet.add(sample.no_sampel);
          group.assignedByNo.set(sample.no_sampel, assignedInfo);

          if (!group.assignedSamples.some((item) => item.no_sampel === sample.no_sampel)) {
            group.assignedSamples.push(assignedInfo);
          }
        } else {
          group.availableSampleRows.push(sample);
          group.availableSamples.push(sample.no_sampel);
        }
      });
    });

  return Array.from(grouped.values())
      .map((group) => {
        const availableRows = group.availableSampleRows.filter(
          (sample) => !group.assignedNoSet.has(sample.no_sampel)
        );

        const uniqueAvailableSamples = Array.from(
          new Set(
            availableRows
              .map((sample) => sample.no_sampel)
              .filter(Boolean)
          )
        );

        const uniqueAssignedSamples = Array.from(
          new Map(
            [
              ...group.assignedSamples,
              ...Array.from(group.assignedByNo.values()),
            ].map((item) => [item.no_sampel, item])
          ).values()
        );

        let status_item = 'Sudah Habis Ditugaskan';
        if (uniqueAssignedSamples.length === 0) status_item = 'Belum Ditugaskan';
        else if (uniqueAvailableSamples.length > 0) status_item = 'Sebagian Ditugaskan';

        return {
          ...group,
          jenis_sampel: Array.from(group.jenis_sampel).join(', '),
          reg_bm: Array.from(group.reg_bm).join(', '),
          availableSamples: uniqueAvailableSamples,
          availableSampleRows: availableRows,
          assignedSamples: uniqueAssignedSamples,
          status_item,
        };
      })
      .filter((group) => group.availableSamples.length > 0);
}



async function getAssignmentMonitor() {
  const penugasanInstances = await Penugasan.findAll({
    where: internalAssignmentWhere({ status_penugasan: { [Op.ne]: 'Dibatalkan' } }),
    include: [
      { model: User, as: 'Analis', required: false, attributes: ['nik', 'username'] },
      {
        model: PenugasanDetail,
        required: true,

        include: [
          {
            model: ParameterMetode,
            required: false,
            include: [
              { model: Parameter, required: false },
              { model: Metode, required: false },
            ],
          },
          { model: PenugasanItem, required: false, include: [{ model: Sampel, required: false }] },
          {
            model: Lka,
            required: false,
            include: [
              { model: LkaHasil, required: false },
              {
                model: LkaRevisi,
                as: 'revisi_lka',
                required: false,
                include: [{ model: LkaRevisiItem, as: 'items', required: false }],
              },
            ],
          },
        ],
      },
    ],
  });

  const rows = penugasanInstances.flatMap((instance) => {
    const penugasan = getPlain(instance);
    const analis = pickObject(penugasan, ['Analis']) || {};
    const details = pickArray(penugasan, ['penugasan_details', 'PenugasanDetails', 'penugasan_detail']);

    return details.filter(isInternalDetail).map((detail) => {
      const info = getDetailParameterInfo(detail);
      const sampleRows = getDetailSampleRows(detail);
      const lka = pickObject(detail, ['lka', 'Lka']) || {};

      const totalSampel = sampleRows.length;
      const totalHasil = sampleRows.filter((row) => String(row.hasil || '').trim()).length;
      const tanggalPenugasan = firstDate(sampleRows.map((row) => row.tanggal_penugasan));
      const hasActiveRevision = hasActiveRevisionForMonitorDetail(detail, lka);
      const statusDetail = resolveMonitorDisplayStatus(detail, lka, hasActiveRevision);

      const latestActivityAt =
        lka.tanggal_pelaporan ||
        penugasan.assigned_at ||
        tanggalPenugasan ||
        detail.tanggal_tenggat ||
        null;

      return {
        idPenugasan: penugasan.id_penugasan,
        id_penugasan: penugasan.id_penugasan,

        idPenugasanDetail: detail.id_penugasan_detail,
        id_penugasan_detail: detail.id_penugasan_detail,

        analis: analis.username || penugasan.id_user_analis || '-',
        parameter: info.namaParameter,
        metode: info.namaMetode,

        deadline: detail.tanggal_tenggat,
        tanggalTenggat: detail.tanggal_tenggat,
        tanggal_tenggat: detail.tanggal_tenggat,

        assignedAt: penugasan.assigned_at || null,
        assigned_at: penugasan.assigned_at || null,

        tanggalPenugasan,
        tanggal_penugasan: tanggalPenugasan,

        tanggalPelaporan: lka.tanggal_pelaporan || null,
        tanggal_pelaporan: lka.tanggal_pelaporan || null,

        tanggalPemeriksaan: lka.tanggal_pemeriksaan || null,
        tanggal_pemeriksaan: lka.tanggal_pemeriksaan || null,

        latestActivityAt,
        latest_activity_at: latestActivityAt,

        statusDetail,
        status_detail: statusDetail,
        statusDetailActual: detail.status_detail,
        status_detail_actual: detail.status_detail,
        hasActiveRevision,
        has_active_revision: hasActiveRevision,

        totalSampel,
        total_sampel: totalSampel,

        totalHasil,
        total_hasil: totalHasil,
      };
    });
  });

  return rows.sort((a, b) => {
    const statusDiff = getStatusOrderValue(a.statusDetail) - getStatusOrderValue(b.statusDetail);
    if (statusDiff !== 0) return statusDiff;

    return String(b.latestActivityAt || '').localeCompare(String(a.latestActivityAt || '')) ||
      String(b.idPenugasan || '').localeCompare(String(a.idPenugasan || ''));
  });
}

async function getTestingOverview() {
  const sampleInstances = await Sampel.findAll({
    include: [
      {
        model: FpplSampel,
        as: 'fppl_sampel',
        required: true,
        include: [
          { model: JenisSampel, required: false },
          { model: RegBm, required: false },
        ],
      },
      {
        model: FpplParameterMetode,
        as: 'parameter_metodes',
        required: false,
        through: { attributes: [] },
        include: [
          { model: Parameter, required: false },
          {
            model: ParameterMetode,
            required: false,
            include: [{ model: Metode, required: false }],
          },
        ],
      },
    ],
    order: [['no_sampel', 'ASC']],
  });

  const samples = sampleInstances.map((instance) => getPlain(instance)).filter(Boolean);

  const methodIds = Array.from(
    new Set(
      samples
        .flatMap((sample) => getAssociatedFpmsFromSample(sample))
        .map((fpm) => {
          const parameterMetode =
            pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};

          return (
            fpm.id_metode_parameter ||
            fpm.idMetodeParameter ||
            parameterMetode.id_metode_parameter ||
            parameterMetode.idMetodeParameter ||
            null
          );
        })
        .filter(Boolean)
    )
  );

  const sampleNos = samples.map((sample) => sample.no_sampel).filter(Boolean);

  const detailInstances = methodIds.length && sampleNos.length
    ? await PenugasanDetail.findAll({
        where: {
          id_metode_parameter: { [Op.in]: methodIds },
        },
        include: [
          {
            model: Penugasan,
            required: true,
            where: {
              status_penugasan: { [Op.ne]: 'Dibatalkan' },
            },
            include: [
              {
                model: User,
                as: 'Analis',
                required: false,
                attributes: ['nik', 'username'],
              },
            ],
          },
          {
            model: PenugasanItem,
            required: true,
            where: {
              no_sampel: { [Op.in]: sampleNos },
            },
          },
        ],
      })
    : [];

  const detailsByMethodSample = new Map();

  detailInstances.forEach((instance) => {
    const detail = getPlain(instance);
    const idMetodeParameter = String(detail.id_metode_parameter || '').trim();
    const penugasan = pickObject(detail, ['penugasan', 'Penugasan']) || {};
    const analis = pickObject(penugasan, ['Analis']) || {};
    const items = pickArray(detail, [
      'penugasan_items',
      'PenugasanItems',
      'penugasan_item',
      'PenugasanItem',
    ]);

    items.forEach((item) => {
      if (!idMetodeParameter || !item?.no_sampel) return;

      const key = assignmentPendingKey(idMetodeParameter, item.no_sampel);

      if (!detailsByMethodSample.has(key)) {
        detailsByMethodSample.set(key, []);
      }

      detailsByMethodSample.get(key).push({
        detail,
        penugasan,
        analis,
      });
    });
  });

  return samples.map((sample) => {
    const fpplSampel = pickObject(sample, ['fppl_sampel', 'FpplSampel']) || {};
    const jenis = pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
    const regBm = pickObject(fpplSampel, ['reg_bm', 'RegBm']) || {};
    const fpms = getAssociatedFpmsFromSample(sample);

    const totalParameter = fpms.length;
    let totalDitugaskan = 0;
    let totalWorksheetTerkirim = 0;
    let totalPerluRevisi = 0;
    let totalSelesai = 0;

    const analisNames = new Set();

    fpms.forEach((fpm) => {
      const parameterMetode =
        pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};

      const idMetodeParameter =
        fpm.id_metode_parameter ||
        fpm.idMetodeParameter ||
        parameterMetode.id_metode_parameter ||
        parameterMetode.idMetodeParameter ||
        null;

      if (!idMetodeParameter) return;

      const matchingDetails =
        detailsByMethodSample.get(
          assignmentPendingKey(idMetodeParameter, sample.no_sampel)
        ) || [];

      if (matchingDetails.length > 0) {
        totalDitugaskan += 1;
      }

      if (matchingDetails.some(({ detail }) => detail.status_detail === 'Worksheet Terkirim')) {
        totalWorksheetTerkirim += 1;
      }

      if (matchingDetails.some(({ detail }) => detail.status_detail === 'Perlu Revisi')) {
        totalPerluRevisi += 1;
      }

      if (matchingDetails.some(({ detail }) => ['Disetujui', 'Selesai'].includes(detail.status_detail))) {
        totalSelesai += 1;
      }

      matchingDetails.forEach(({ penugasan, analis }) => {
        const name = isSubkontrakAssignment(penugasan)
          ? 'Subkontrak'
          : (analis.username || penugasan.id_user_analis || '');
        if (name) analisNames.add(name);
      });
    });

    const status = deriveSampleStatus({
      total_parameter: totalParameter,
      total_ditugaskan: totalDitugaskan,
      total_worksheet_terkirim: totalWorksheetTerkirim,
      total_perlu_revisi: totalPerluRevisi,
      total_selesai: totalSelesai,
    });

    return {
      noSampel: sample.no_sampel,
      no_sampel: sample.no_sampel,

      jenisSampel: jenis.jenis_sampel || '-',
      jenis_sampel: jenis.jenis_sampel || '-',

      standar: [regBm.instansi, regBm.ref_reg].filter(Boolean).join(' - ') || '-',

      tanggalPengambilanSampel: sample.tanggal_pengambilan_sampel || null,
      tanggal_pengambilan_sampel: sample.tanggal_pengambilan_sampel || null,
      tanggalSampling: sample.tanggal_pengambilan_sampel || null,
      tanggal_sampling: sample.tanggal_pengambilan_sampel || null,

      tanggalPenerimaan: sample.diterima_pada || null,
      tanggal_penerimaan: sample.diterima_pada || null,

      acuanPengambilanSampel: sample.acuan_pengambilan_sampel || '-',
      acuan_pengambilan_sampel: sample.acuan_pengambilan_sampel || '-',

      abnormalitasSampel: sample.abnormalitas_sampel || '-',
      abnormalitas_sampel: sample.abnormalitas_sampel || '-',

      totalParameter,
      totalDitugaskan,
      totalWorksheetTerkirim,
      totalPerluRevisi,
      totalSelesai,

      analisList: Array.from(analisNames).sort().join(', ') || '-',
      statusAgregat: status,
    };
  });
}

async function getMyAssignments(userNik) {
  const penugasanInstances = await Penugasan.findAll({
    where: internalAssignmentWhere({
      id_user_analis: userNik,
      status_penugasan: { [Op.ne]: 'Dibatalkan' },
    }),
    include: [
      {
        model: PenugasanDetail,
        required: true,

        include: [
          {
            model: ParameterMetode,
            required: false,
            include: [
              { model: Parameter, required: false },
              { model: Metode, required: false },
            ],
          },
          { model: PenugasanItem, required: false },
          {
            model: Lka,
            required: false,
            include: [
              { model: LkaHasil, required: false },
              {
                model: LkaRevisi,
                as: 'revisi_lka',
                required: false,
                include: [{ model: LkaRevisiItem, as: 'items', required: false }],
              },
            ],
          },
        ],
      },
    ],
    order: [['assigned_at', 'DESC']],
  });

  const rows = penugasanInstances.flatMap((instance) => {
    const penugasan = getPlain(instance);
    const details = pickArray(penugasan, ['penugasan_details', 'PenugasanDetails', 'penugasan_detail']);

    return details.filter(isInternalDetail).map((detail) => {
      const info = getDetailParameterInfo(detail);
      const sampleRows = getDetailSampleRows(detail);
      const lka = pickObject(detail, ['lka', 'Lka']) || null;
      const lkaHasilRows = lka ? pickArray(lka, ['lka_hasils', 'LkaHasils', 'lka_hasil', 'LkaHasil']) : [];
      const sampleNos = new Set(sampleRows.map((row) => row.no_sampel).filter(Boolean));
      const relatedResults = lkaHasilRows.filter((row) => sampleNos.has(row.no_sampel));
      const revisionRows = lka
        ? pickArray(lka, ['revisi_lka', 'lka_revisis', 'LkaRevisis', 'revisiLka'])
        : [];
      const revisionBuckets = buildRevisionNoteBuckets();

      revisionRows.forEach((revision) => {
        const source = revision.sumber_revisi || revision.sumberRevisi;
        const globalNote = String(
          revision.catatan_umum ||
          revision.catatanUmum ||
          revision.catatan_revisi_global ||
          revision.catatanRevisiGlobal ||
          ''
        ).trim();

        if (
          globalNote &&
          isGlobalRevisionLevel(revision.level_revisi || revision.levelRevisi) &&
          isRevisionVisibleForAudience(revision, {}, 'analis')
        ) {
          revisionBuckets.addBySource(source, globalNote);
        }

        getRevisionItemsFromRow(revision).forEach((item) => {
          const itemSample = String(item.no_sampel || item.noSampel || '').trim();

          if (!sampleNos.has(itemSample)) return;
          if (!isRevisionVisibleForAudience(revision, item, 'analis')) return;

          const itemNote = String(
            item.catatan_revisi ||
            item.catatanRevisi ||
            item.catatan_revisi_item ||
            item.catatanRevisiItem ||
            ''
          ).trim();

          revisionBuckets.addBySource(source, itemNote);
        });
      });

      const revisionNotePayload = buildRevisionNoteResponseFromBuckets(revisionBuckets);
      const catatanRevisiHasil = revisionNotePayload.catatanRevisiHasil || null;
      const catatanRevisiHasilPenyelia = revisionNotePayload.catatanRevisiHasilPenyelia || null;
      const catatanRevisiHasilKasiPengujian = revisionNotePayload.catatanRevisiHasilKasiPengujian || null;
      const catatanResponPenyelia = revisionNotePayload.catatanResponPenyelia || null;
      const totalHasil = relatedResults.filter((row) => String(row.hasil || '').trim()).length;
      const sampleNoList = Array.from(sampleNos);
      const catatanHasilAnalis = Array.from(new Set(
        relatedResults
          .map((row) => String(row.catatan_hasil || '').trim())
          .filter(Boolean)
      )).join('\n\n') || null;

      return {
        idPenugasan: penugasan.id_penugasan,
        id_penugasan: penugasan.id_penugasan,
        idPenugasanDetail: detail.id_penugasan_detail,
        id_penugasan_detail: detail.id_penugasan_detail,
        catatanPenugasan: penugasan.catatan_penugasan || null,
        catatan_penugasan: penugasan.catatan_penugasan || null,
        parameter: info.namaParameter,
        metode: info.namaMetode,
        deadline: detail.tanggal_tenggat,
        statusDetail: detail.status_detail,
        totalSampel: sampleRows.length,
        total_sampel: sampleRows.length,
        sampleNos: sampleNoList,
        sample_nos: sampleNoList,
        noSampelList: sampleNoList,
        no_sampel_list: sampleNoList,
        noSampel: sampleNoList.join(', '),
        no_sampel: sampleNoList.join(', '),
        totalHasil,
        total_hasil: totalHasil,
        catatanHasilAnalis,
        catatan_hasil_analis: catatanHasilAnalis,
        catatanRevisiHasilPenyelia,
        catatan_revisi_hasil_penyelia: catatanRevisiHasilPenyelia,
        catatanRevisiHasilKasiPengujian,
        catatan_revisi_hasil_kasi_pengujian: catatanRevisiHasilKasiPengujian,
        catatanResponPenyelia,
        catatan_respon_penyelia: catatanResponPenyelia,
        catatanRevisiHasil,
        catatan_revisi_hasil: catatanRevisiHasil,
      };
    });
  });

  return rows.sort((a, b) => {
    const deadlineA = a.deadline || '9999-12-31';
    const deadlineB = b.deadline || '9999-12-31';
    return String(deadlineA).localeCompare(String(deadlineB)) || String(b.idPenugasanDetail).localeCompare(String(a.idPenugasanDetail));
  });
}

module.exports = {
  getAnalystOptions,
  getPendingItems,
  getAssignmentMonitor,
  getTestingOverview,
  getMyAssignments,
};
