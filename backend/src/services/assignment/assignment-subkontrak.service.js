const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const {
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
} = require('../../models/Associations');

const WorkflowLogService = require('../workflow/workflow-log.service');
const { SUBKONTRAK_ASSIGNMENT_TYPE } = require('./assignment.constants');
const { nextRunningId } = require('./assignment-id.helper');
const {
  getPlain,
  pickObject,
  pickArray,
} = require('./assignment-object.helper');
const {
  pairKey,
  assignmentPendingKey,
  sortSamplesForAssignment,
  isSubkontrakFpm,
} = require('./assignment-fpm.helper');
const {
  subkontrakAssignmentWhere,
} = require('./assignment-scope.helper');
const {
  getLkaHasilKey,
} = require('./assignment-revision.helper');
const {
  assertSamplesEditableBeforeLhu,
} = require('./assignment-lhu-lock.helper');

function isValidResultExpression(value) {
  const text = String(value || '').trim();

  if (!text) return false;
  if (text === '-') return true;

  const decimalNumber = '-?\\d+(?:,\\d+)?';
  const comparator = '(?:[<>]=?|≤|≥)?';
  const superscriptExponent = '[⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+';
  const normalExponent = '[+-]?\\d+';

  const patterns = [
    new RegExp(`^${comparator}${decimalNumber}$`),
    new RegExp(`^${comparator}${decimalNumber}[Ee]${normalExponent}$`),
    new RegExp(`^${comparator}${decimalNumber}×10${superscriptExponent}$`),
    new RegExp(`^${comparator}${decimalNumber}×10${normalExponent}$`),
  ];

  return patterns.some((pattern) => pattern.test(text));
}
async function findExistingSubkontrakDetail(idMetodeParameter, transaction) {
  const detail = await PenugasanDetail.findOne({
    where: {
      id_metode_parameter: idMetodeParameter,
    },
    include: [
      {
        model: Penugasan,
        required: true,
        where: subkontrakAssignmentWhere({
          status_penugasan: { [Op.ne]: 'Dibatalkan' },
        }),
      },
      {
        model: Lka,
        required: false,
      },
    ],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  if (!detail) return null;

  const plain = getPlain(detail);
  const lka = pickObject(plain, ['lka', 'Lka']) || {};

  return {
    id_penugasan_detail: plain.id_penugasan_detail,
    id_penugasan: plain.id_penugasan,
    kode_lka: lka.kode_lka || null,
  };
}

async function ensureSubkontrakPenugasan(currentUserNik, transaction) {
  const idPenugasan = await nextRunningId('penugasan', 'id_penugasan', 'PNG-', 4, transaction);

  await Penugasan.create(
    {
      id_penugasan: idPenugasan,
      id_user_analis: currentUserNik,
      assigned_by: currentUserNik,
      assigned_at: new Date(),
      status_penugasan: 'Selesai',
      jenis_penugasan: SUBKONTRAK_ASSIGNMENT_TYPE,
      catatan_penugasan: null,
    },
    { transaction }
  );

  await WorkflowLogService.logStatusTransition({
    entityType: 'PENUGASAN',
    entityId: idPenugasan,
    action: 'MEMBUAT_PENUGASAN_SUBKONTRAK',
    statusBefore: null,
    statusAfter: 'Selesai',
    source: 'Penyelia',
    note: 'Penugasan subkontrak dibuat.',
    actorNik: currentUserNik || null,
    transaction,
  });

  return idPenugasan;
}

async function ensureSubkontrakDetail(idMetodeParameter, currentUserNik, transaction, penugasanCache) {
  if (!idMetodeParameter) {
    throw new Error('ID metode parameter subkontrak tidak ditemukan.');
  }

  const existing = await findExistingSubkontrakDetail(idMetodeParameter, transaction);

  if (existing?.id_penugasan_detail) {
    return {
      idPenugasanDetail: existing.id_penugasan_detail,
      kodeLka: existing.kode_lka || null,
    };
  }

  if (!penugasanCache.idPenugasan) {
    penugasanCache.idPenugasan = await ensureSubkontrakPenugasan(currentUserNik, transaction);
  }

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
      id_penugasan: penugasanCache.idPenugasan,
      id_metode_parameter: idMetodeParameter,
      status_detail: 'Disetujui',
      tanggal_tenggat: new Date(),
      catatan_detail: null,
    },
    { transaction }
  );

  await WorkflowLogService.logStatusTransition({
    entityType: 'PENUGASAN_DETAIL',
    entityId: idPenugasanDetail,
    action: 'MEMBUAT_DETAIL_SUBKONTRAK',
    statusBefore: null,
    statusAfter: 'Disetujui',
    source: 'Penyelia',
    note: 'Detail penugasan subkontrak dibuat.',
    actorNik: currentUserNik || null,
    transaction,
  });

  return {
    idPenugasanDetail,
    kodeLka: null,
  };
}

async function ensurePenugasanItemForSample(idPenugasanDetail, noSampel, transaction) {
  const existing = await PenugasanItem.findOne({
    where: {
      id_penugasan_detail: idPenugasanDetail,
      no_sampel: noSampel,
    },
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  if (existing) return;

  await PenugasanItem.create(
    {
      id_penugasan_detail: idPenugasanDetail,
      no_sampel: noSampel,
      tanggal_penugasan: new Date(),
    },
    { transaction }
  );
}

async function ensureSubkontrakLka(idPenugasanDetail, kodeLka, currentUserNik, tanggalTerimaHasil, transaction) {
  const tanggalHasil = tanggalTerimaHasil || new Date();

  if (kodeLka) {
    const lka = await Lka.findOne({
      where: { kode_lka: kodeLka },
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : undefined,
    });

    if (!lka) {
      throw new Error('Data LKA subkontrak tidak ditemukan.');
    }

    await lka.update(
      {
        tanggal_mulai_pengujian: tanggalTerimaHasil || lka.tanggal_mulai_pengujian || tanggalHasil,
        tanggal_selesai_pengujian: tanggalTerimaHasil || lka.tanggal_selesai_pengujian || tanggalHasil,
        dilaporkan_oleh: currentUserNik,
        tanggal_pelaporan: new Date(),
        diperiksa_oleh: currentUserNik,
        tanggal_pemeriksaan: new Date(),
        status_lka: 'Disetujui Penyelia',
      },
      { transaction }
    );

    return kodeLka;
  }

  const newKodeLka = await nextRunningId('lka', 'kode_lka', 'LKA-', 5, transaction);

  await Lka.create(
    {
      kode_lka: newKodeLka,
      id_penugasan_detail: idPenugasanDetail,
      tanggal_sampling: null,
      tanggal_mulai_pengujian: tanggalHasil,
      tanggal_selesai_pengujian: tanggalHasil,
      dhl_akuades: null,
      file_worksheet_path: null,
      dilaporkan_oleh: currentUserNik,
      tanggal_pelaporan: new Date(),
      diperiksa_oleh: currentUserNik,
      tanggal_pemeriksaan: new Date(),
      catatan_revisi: null,
      status_lka: 'Disetujui Penyelia',
    },
    { transaction }
  );

  return newKodeLka;
}

async function upsertLkaHasilSubkontrak(kodeLka, noSampel, hasil, transaction) {
  const existing = await LkaHasil.findOne({
    where: {
      kode_lka: kodeLka,
      no_sampel: noSampel,
    },
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  if (existing) {
    await existing.update(
      {
        hasil,
        statusReviewHasil: 'Disetujui Penyelia',
      },
      { transaction }
    );

    return getLkaHasilKey(getPlain(existing));
  }

  const created = await LkaHasil.create(
    {
      kode_lka: kodeLka,
      no_sampel: noSampel,
      hasil,
      statusReviewHasil: 'Disetujui Penyelia',
    },
    { transaction }
  );

  return getLkaHasilKey(getPlain(created));
}
async function getSubkontrakItems() {
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
        required: true,
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
      return isSubkontrakFpm(fpm, parameterMetode);
    });

  const methodIds = Array.from(
    new Set(
      rows
        .map((fpm) => {
          const parameterMetode = pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
          return fpm.id_metode_parameter || parameterMetode.id_metode_parameter || null;
        })
        .filter(Boolean)
    )
  );

  const sampleNos = Array.from(
    new Set(
      rows
        .flatMap((fpm) => pickArray(fpm, ['sampels', 'Sampels', 'Sampel']))
        .map((sample) => sample?.no_sampel)
        .filter(Boolean)
    )
  );

  const itemInclude = {
    model: PenugasanItem,
    required: false,
  };

  if (sampleNos.length > 0) {
    itemInclude.where = {
      no_sampel: { [Op.in]: sampleNos },
    };
  }

  const subkontrakDetailInstances = methodIds.length
    ? await PenugasanDetail.findAll({
        where: {
          id_metode_parameter: { [Op.in]: methodIds },
        },
        include: [
          {
            model: Penugasan,
            required: true,
            where: subkontrakAssignmentWhere({
              status_penugasan: { [Op.ne]: 'Dibatalkan' },
            }),
          },
          itemInclude,
          {
            model: Lka,
            required: false,
            include: [{ model: LkaHasil, required: false }],
          },
        ],
      })
    : [];

  const savedByMethodSample = new Map();

  subkontrakDetailInstances.forEach((instance) => {
    const detail = getPlain(instance);
    const idMetodeParameter = detail.id_metode_parameter;
    const lka = pickObject(detail, ['lka', 'Lka']) || {};
    const items = pickArray(detail, [
      'penugasan_items',
      'PenugasanItems',
      'penugasan_item',
      'PenugasanItem',
    ]);
    const hasilRows = pickArray(lka, [
      'lka_hasils',
      'LkaHasils',
      'lka_hasil',
      'LkaHasil',
    ]);

    items.forEach((item) => {
      const noSampel = item.no_sampel;
      if (!idMetodeParameter || !noSampel) return;

      const hasilRow =
        hasilRows.find((hasil) => hasil.no_sampel === noSampel) || {};

      savedByMethodSample.set(
        assignmentPendingKey(idMetodeParameter, noSampel),
        {
          detail,
          lka,
          hasilRow,
        }
      );
    });
  });

  return rows
    .flatMap((fpm) => {
      const fpplSampel = pickObject(fpm, ['fppl_sampel', 'FpplSampel']) || {};
      const fppl = pickObject(fpplSampel, ['fppl', 'Fppl']) || {};
      const pelanggan = pickObject(fppl, ['pelanggan', 'Pelanggan']) || {};
      const jenis = pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};
      const regBm = pickObject(fpplSampel, ['reg_bm', 'RegBm']) || {};
      const parameter = pickObject(fpm, ['parameter', 'Parameter']) || {};
      const parameterMetode = pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
      const metode = pickObject(parameterMetode, ['metode', 'Metode']) || {};
      const samples = pickArray(fpm, ['sampels', 'Sampels', 'Sampel']).sort(sortSamplesForAssignment);

      const idMetodeParameter =
        fpm.id_metode_parameter ||
        parameterMetode.id_metode_parameter ||
        null;

      return samples.map((sampel) => {
        const saved =
          savedByMethodSample.get(
            assignmentPendingKey(idMetodeParameter, sampel.no_sampel)
          ) || {};

        const subkontrakDetail = saved.detail || null;
        const lka = saved.lka || {};
        const hasilRow = saved.hasilRow || {};
        const regBmLabel = [regBm.instansi, regBm.ref_reg].filter(Boolean).join(' - ') || '-';

        return {
          idRegistrasi: fppl.id_registrasi || fpplSampel.id_registrasi || '-',
          id_registrasi: fppl.id_registrasi || fpplSampel.id_registrasi || '-',

          pelanggan: pelanggan.nama_instansi || '-',

          idFpplSampel: fpplSampel.id_fppl_sampel || fpm.id_fppl_sampel || null,
          id_fppl_sampel: fpplSampel.id_fppl_sampel || fpm.id_fppl_sampel || null,

          noSampel: sampel.no_sampel,
          no_sampel: sampel.no_sampel,

          jenisSampel: jenis.jenis_sampel || '-',
          jenis_sampel: jenis.jenis_sampel || '-',

          regBm: regBmLabel,
          reg_bm: regBmLabel,

          tanggalPengambilanSampel: sampel.tanggal_pengambilan_sampel || null,
          tanggal_pengambilan_sampel: sampel.tanggal_pengambilan_sampel || null,
          tanggalSampling: sampel.tanggal_pengambilan_sampel || null,
          tanggal_sampling: sampel.tanggal_pengambilan_sampel || null,

          tanggalPenerimaan: sampel.diterima_pada || null,
          tanggal_penerimaan: sampel.diterima_pada || null,

          jamPenerimaan: (sampel.diterima_pada ? new Date(sampel.diterima_pada).toTimeString().slice(0, 8) : null) || null,
          jam_penerimaan: (sampel.diterima_pada ? new Date(sampel.diterima_pada).toTimeString().slice(0, 8) : null) || null,

          kondisiSampel: sampel.kondisi_sampel || '-',
          kondisi_sampel: sampel.kondisi_sampel || '-',

          abnormalitasSampel: sampel.abnormalitas_sampel || '-',
          abnormalitas_sampel: sampel.abnormalitas_sampel || '-',

          acuanPengambilanSampel: sampel.acuan_pengambilan_sampel || '-',
          acuan_pengambilan_sampel: sampel.acuan_pengambilan_sampel || '-',

          koordinat: sampel.koordinat || '-',

          idFpplParameterMetode: fpm.id_fppl_parameter_metode,
          id_fppl_parameter_metode: fpm.id_fppl_parameter_metode,

          idMetodeParameter,
          id_metode_parameter: idMetodeParameter,

          namaParameter: parameter.nama_parameter || '-',
          nama_parameter: parameter.nama_parameter || '-',

          namaMetode: metode.nama_metode || '-',
          nama_metode: metode.nama_metode || '-',

          acuanMetode: parameterMetode.acuan_metode || '-',
          acuan_metode: parameterMetode.acuan_metode || '-',

          statusKemampuanLab: fpm.status_kemampuan_lab,
          status_kemampuan_lab: fpm.status_kemampuan_lab,

          isSubkontrak: true,
          is_subkontrak: 1,

          idPenugasanDetail: subkontrakDetail?.id_penugasan_detail || null,
          id_penugasan_detail: subkontrakDetail?.id_penugasan_detail || null,

          kodeLka: lka.kode_lka || null,
          kode_lka: lka.kode_lka || null,

          hasil: hasilRow.hasil || '',

          tanggalTerimaHasil: lka.tanggal_selesai_pengujian || null,
          tanggal_terima_hasil: lka.tanggal_selesai_pengujian || null,

          statusHasil: lka.status_lka || 'Belum Diisi',
          status_hasil: lka.status_lka || 'Belum Diisi',

          catatan: '',
        };
      });
    })
    .sort((a, b) => {
      const dateA = a.tanggal_pengambilan_sampel || a.tanggal_penerimaan || '';
      const dateB = b.tanggal_pengambilan_sampel || b.tanggal_penerimaan || '';

      return (
        String(dateB).localeCompare(String(dateA)) ||
        String(a.no_sampel || '').localeCompare(String(b.no_sampel || '')) ||
        String(a.nama_parameter || '').localeCompare(String(b.nama_parameter || ''))
      );
    });
}
async function saveSubkontrakResults(payload, currentUserNik) {
  const { results = [] } = payload || {};

  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('Minimal satu hasil subkontrak harus dikirim.');
  }

  const normalizedResults = results
    .map((item) => ({
      id_fppl_parameter_metode: String(item.id_fppl_parameter_metode || item.idFpplParameterMetode || '').trim(),
      no_sampel: String(item.no_sampel || item.noSampel || '').trim(),
      hasil: item.hasil == null ? '' : String(item.hasil).trim(),
      tanggal_terima_hasil: item.tanggal_terima_hasil || item.tanggalTerimaHasil || null,
    }))
    .filter((item) => item.id_fppl_parameter_metode && item.no_sampel);

  if (!normalizedResults.length) {
    throw new Error('Tidak ada hasil subkontrak yang valid.');
  }

  const fpmIds = Array.from(new Set(normalizedResults.map((item) => item.id_fppl_parameter_metode)));
  const sampleNos = Array.from(new Set(normalizedResults.map((item) => item.no_sampel)));

  return sequelize.transaction(async (transaction) => {
    await assertSamplesEditableBeforeLhu(sampleNos, transaction);

    const fpmInstances = await FpplParameterMetode.findAll({
      where: {
        id_fppl_parameter_metode: { [Op.in]: fpmIds },
      },
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

    const fpmRows = fpmInstances.map((instance) => getPlain(instance));
    const validPairSet = new Set();
    const fpmById = new Map(
      fpmRows.map((fpm) => [String(fpm.id_fppl_parameter_metode), fpm])
    );

    for (const fpm of fpmRows) {
      const parameterMetode = pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};

      if (!isSubkontrakFpm(fpm, parameterMetode)) {
        continue;
      }

      const samples = pickArray(fpm, ['sampels', 'Sampels', 'Sampel']);

      samples.forEach((sample) => {
        if (sample?.no_sampel) {
          validPairSet.add(pairKey(fpm.id_fppl_parameter_metode, sample.no_sampel));
        }
      });
    }

    for (const item of normalizedResults) {
      const key = pairKey(item.id_fppl_parameter_metode, item.no_sampel);

      if (!validPairSet.has(key)) {
        throw new Error(`Sampel ${item.no_sampel} bukan item subkontrak yang valid.`);
      }

      if (!item.hasil) {
        throw new Error(`Hasil untuk sampel ${item.no_sampel} wajib diisi.`);
      }

      if (!isValidResultExpression(item.hasil)) {
        throw new Error(`Hasil untuk sampel ${item.no_sampel} harus berupa angka atau format batas, contoh: 7,5 atau <0,01.`);
      }
    }

    const penugasanCache = { idPenugasan: null };
    const savedRows = [];

    for (const item of normalizedResults) {
      const fpm = fpmById.get(String(item.id_fppl_parameter_metode));
      const parameterMetode = pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};

      const idMetodeParameter =
        fpm?.id_metode_parameter ||
        parameterMetode.id_metode_parameter ||
        null;

      if (!idMetodeParameter) {
        throw new Error(`ID metode parameter tidak ditemukan untuk ${item.id_fppl_parameter_metode}.`);
      }

      const detail = await ensureSubkontrakDetail(
        idMetodeParameter,
        currentUserNik,
        transaction,
        penugasanCache
      );

      await ensurePenugasanItemForSample(
        detail.idPenugasanDetail,
        item.no_sampel,
        transaction
      );

      const kodeLka = await ensureSubkontrakLka(
        detail.idPenugasanDetail,
        detail.kodeLka,
        currentUserNik,
        item.tanggal_terima_hasil,
        transaction
      );

      await upsertLkaHasilSubkontrak(
        kodeLka,
        item.no_sampel,
        item.hasil,
        transaction
      );

      savedRows.push({
        kodeLka,
        idPenugasanDetail: detail.idPenugasanDetail,
        id_metode_parameter: idMetodeParameter,
        id_fppl_parameter_metode: item.id_fppl_parameter_metode,
        no_sampel: item.no_sampel,
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

    return {
      totalSaved: savedRows.length,
      rows: savedRows,
    };
  });
}

module.exports = {
  getSubkontrakItems,
  saveSubkontrakResults,
};
