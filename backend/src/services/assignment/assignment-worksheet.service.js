const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const {
  User,
  Pelanggan,
  Fppl,
  FpplSampel,
  RegBm,
  JenisSampel,
  Parameter,
  Metode,
  ParameterMetode,
  Penugasan,
  PenugasanDetail,
  PenugasanItem,
  Sampel,
  Lka,
  LkaHasil,
  LkaRevisi,
  LkaRevisiItem,
} = require('../../models/Associations');

const notificationService = require('../notification/notification.service');
const WorkflowLogService = require('../workflow/workflow-log.service');
const { asYmd } = require('../../utils/business-day.util');

const { EDITABLE_LKA_STATUSES, LKA_HASIL_STATUS } = require('./assignment.constants');
const { getPlain, pickObject, pickArray, uniqueText, firstDate } = require('./assignment-object.helper');
const {
  parseWorksheetFiles,
  serializeWorksheetFiles,
  getPrimaryWorksheetPath,
} = require('./assignment-worksheet-files.helper');
const { getDetailParameterInfo } = require('./assignment-monitor.mapper');
const { getStatusOrderValue } = require('./assignment-fpm.helper');
const {
  resolveLkaHasilStatus,
  normalizeLegacyLkaHasilStatuses,
  syncLkaAggregateStatus,
  syncAssignmentHeaderStatusFromDetail,
  syncDetailStatusFromLka,
  hasActiveRevisionForMonitorDetail,
  resolveMonitorDisplayStatus,
} = require('./assignment-status.helper');
const {
  assertPenugasanDetailSamplesEditableBeforeLhu,
  getSampleNosForPenugasanDetail,
  getLockedLhuRowsBySamples,
  toLhuLockPayload,
} = require('./assignment-lhu-lock.helper');
const {
  collectRevisionNotesForSample,
  buildWorksheetRevisionResponse,
  buildLkaHasilRevisionResponse,
} = require('./assignment-revision.helper');
const { getLkaRevisionHistory, loadRevisionRowsForLka } = require('./assignment-worksheet-revision-history.helper');
const { assertWorksheetBusinessDatesOrThrow } = require('./assignment-worksheet-business-date.helper');
const {
  normalizeResultRows,
  getLkaRevisionScope,
  upsertWorksheetResults,
  assertWorksheetReadyToSubmit,
  markRevisionItemsWorkedByAnalyst,
  markRevisionItemsApprovedByPenyelia,
  markRevisionItemsApprovedByKasi,
} = require('./assignment-worksheet-result.helper');

const RUNNING_ID_MODEL_MAP = {
  lka: {
    model: Lka,
    field: 'kode_lka',
  },
};

async function nextRunningId(tableName, fieldName, prefix, pad, transaction) {
  const config = RUNNING_ID_MODEL_MAP[tableName];
  if (!config || config.field !== fieldName) {
    throw new Error(`Konfigurasi running ID tidak ditemukan untuk ${tableName}.${fieldName}.`);
  }

  const latest = await config.model.findOne({
    attributes: [config.field],
    where: {
      [config.field]: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [[config.field, 'DESC']],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  const latestValue = latest ? latest.get(config.field) : null;
  const numeric = latestValue ? parseInt(String(latestValue).replace(prefix, ''), 10) : 0;
  const nextNumber = Number.isFinite(numeric) ? numeric + 1 : 1;

  return `${prefix}${String(nextNumber).padStart(pad, '0')}`;
}


async function ensureLkaForDetail(idPenugasanDetail, transaction) {
  const existing = await Lka.findOne({
    where: { id_penugasan_detail: idPenugasanDetail },
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  if (existing) return existing.kode_lka;

  const kodeLka = await nextRunningId('lka', 'kode_lka', 'LKA-', 5, transaction);

  await Lka.create(
    {
      kode_lka: kodeLka,
      id_penugasan_detail: idPenugasanDetail,
      status_lka: 'Draft',
    },
    { transaction }
  );

  return kodeLka;
}


async function assertOwnedPenugasanDetail(idPenugasanDetail, userNik, transaction = null) {
  const detail = await PenugasanDetail.findOne({
    where: { id_penugasan_detail: idPenugasanDetail },
    include: [
      {
        model: Penugasan,
        required: true,
        where: { id_user_analis: userNik },
      },
    ],
    transaction,
  });

  if (!detail) {
    throw new Error('Detail penugasan tidak ditemukan atau bukan milik analis ini.');
  }

  return getPlain(detail);
}


async function getAssignmentWorkDetail(idPenugasanDetail, userNik) {
  await assertOwnedPenugasanDetail(idPenugasanDetail, userNik);

  const detailInstance = await PenugasanDetail.findOne({
    where: { id_penugasan_detail: idPenugasanDetail },
    include: [
      {
        model: Penugasan,
        required: true,
        include: [
          { model: User, as: 'Analis', required: false, attributes: ['nik', 'username'] },
        ],
      },
      {
        model: ParameterMetode,
        required: false,
        include: [
          { model: Parameter, required: false },
          { model: Metode, required: false },
        ],
      },
      {
        model: PenugasanItem,
        required: false,
        include: [
          {
            model: Sampel,
            required: false,
            include: [
              {
                model: FpplSampel,
                as: 'fppl_sampel',
                required: false,
                include: [
                  { model: JenisSampel, required: false },
                  { model: RegBm, required: false },
                ],
              },
            ],
          },
        ],
      },
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
          { model: User, as: 'Pelapor', required: false, attributes: ['nik', 'username'] },
          { model: User, as: 'Pemeriksa', required: false, attributes: ['nik', 'username'] },
        ],
      },
    ],
  });

  if (!detailInstance) {
    throw new Error('Detail penugasan tidak ditemukan.');
  }

  const detail = getPlain(detailInstance);

  const penugasan = pickObject(detail, ['penugasan', 'Penugasan']) || {};
  const analis = pickObject(penugasan, ['Analis']) || {};

  const info = getDetailParameterInfo(detail);
  const fpm = info.fpm || {};
  const fpplSampel = pickObject(fpm, ['fppl_sampel', 'FpplSampel']) || {};
  const jenis = pickObject(fpplSampel, ['jenis_sampel', 'JenisSampel']) || {};

  const penugasanItems = pickArray(detail, ['penugasan_items', 'PenugasanItems', 'penugasan_item', 'PenugasanItem']);
  const lka = pickObject(detail, ['lka', 'Lka']) || null;
  const lkaHasilRows = lka ? pickArray(lka, ['lka_hasils', 'LkaHasils', 'lka_hasil', 'LkaHasil']) : [];
  const includedLkaRevisionRows = lka ? pickArray(lka, ['revisi_lka', 'RevisiLka', 'LkaRevisis']) : [];
  const lkaRevisionRows = lka?.kode_lka
    ? await loadRevisionRowsForLka(lka.kode_lka)
    : includedLkaRevisionRows;

  const sampleRows = penugasanItems
    .map((item) => {
      const sampel = pickObject(item, ['sampel', 'Sampel']) || {};
      const sampelFppl = pickObject(sampel, ['fppl_sampel', 'FpplSampel']) || {};
      const sampelJenis = pickObject(sampelFppl, ['jenis_sampel', 'JenisSampel']) || {};
      const hasilRow = lkaHasilRows.find((hasil) => hasil.no_sampel === item.no_sampel || hasil.no_sampel === sampel.no_sampel) || {};
      const noSampel = item.no_sampel || sampel.no_sampel;
      const revisionNotePayload = collectRevisionNotesForSample(
        lkaRevisionRows,
        noSampel,
        lka?.kode_lka || hasilRow.kode_lka || null,
        { audience: 'analis' }
      );

      return {
        kode_lka: lka?.kode_lka || hasilRow.kode_lka || null,
        kodeLka: lka?.kode_lka || hasilRow.kode_lka || null,
        no_sampel: noSampel,
        noSampel,

        id_fppl_sampel: sampelFppl.id_fppl_sampel || sampel.id_fppl_sampel || null,
        id_jenis_sampel: sampelFppl.id_jenis_sampel || null,
        jenis_sampel: sampelJenis.jenis_sampel || '-',
        jenisSampel: sampelJenis.jenis_sampel || '-',
        tanggal_pengambilan_sampel: sampel.tanggal_pengambilan_sampel || null,
        tanggal_penerimaan: sampel.diterima_pada || null,
        jam_penerimaan: (sampel.diterima_pada ? new Date(sampel.diterima_pada).toTimeString().slice(0, 8) : null) || null,
        kondisi_sampel: sampel.kondisi_sampel || '-',
        abnormalitas_sampel: sampel.abnormalitas_sampel || '-',
        acuan_pengambilan_sampel: sampel.acuan_pengambilan_sampel || '-',
        koordinat: sampel.koordinat || '-',
        hasil: hasilRow.hasil || '',
        catatan_hasil: hasilRow.catatan_hasil || '',
        statusReviewHasil: resolveLkaHasilStatus(hasilRow, lka?.status_lka, lkaHasilRows),
        ...buildLkaHasilRevisionResponse({ ...hasilRow, ...revisionNotePayload }),
      };
    })
    .filter((row) => row.no_sampel);

  const tanggalSampling = firstDate(sampleRows.map((row) => row.tanggal_pengambilan_sampel)) || lka?.tanggal_sampling || null;
  const abnormalitasSampel = uniqueText(sampleRows.map((row) => row.abnormalitas_sampel));
  const acuanPengambilanSampel = uniqueText(sampleRows.map((row) => row.acuan_pengambilan_sampel));
  const jenisContoh = uniqueText(sampleRows.map((row) => row.jenis_sampel)) || jenis.jenis_sampel || '-';
  const worksheetFiles = parseWorksheetFiles(lka?.file_worksheet_path);
  const worksheetRevisionPayload = buildWorksheetRevisionResponse(lka || {}, lkaRevisionRows, { audience: 'analis' });
  const lhuLock = toLhuLockPayload(await getLockedLhuRowsBySamples(sampleRows.map((row) => row.no_sampel)));
  const idJenisSampel =
  sampleRows.find((row) => row.id_jenis_sampel)?.id_jenis_sampel ||
  null;

  return {
    ...lhuLock,
    idPenugasan: detail.id_penugasan,
    id_penugasan: detail.id_penugasan,
    catatanPenugasan: penugasan.catatan_penugasan || null,
    catatan_penugasan: penugasan.catatan_penugasan || null,

    idPenugasanDetail: detail.id_penugasan_detail,
    id_penugasan_detail: detail.id_penugasan_detail,

    idFpplParameterMetode: detail.id_fppl_parameter_metode,
    id_fppl_parameter_metode: detail.id_fppl_parameter_metode,

    idAnalis: penugasan.id_user_analis || null,
    id_analis: penugasan.id_user_analis || null,
    analisNama: analis.username || penugasan.id_user_analis || '-',
    analis_nama: analis.username || penugasan.id_user_analis || '-',

    idPenyelia: lka?.diperiksa_oleh || penugasan.assigned_by || null,
    id_penyelia: lka?.diperiksa_oleh || penugasan.assigned_by || null,
    penyeliaNama: lka?.Pemeriksa?.username || penugasan.assigned_by || '-',
    penyelia_nama: lka?.Pemeriksa?.username || penugasan.assigned_by || '-',

    idJenisSampel,
    id_jenis_sampel: idJenisSampel,
    jenisContoh,
    jenis_contoh: jenisContoh,
    jenisSampel: jenisContoh,
    jenis_sampel: jenisContoh,

    idMetodeParameter: info.idMetodeParameter || null,
    id_metode_parameter: info.idMetodeParameter || null,

    parameter: info.namaParameter,
    namaParameter: info.namaParameter,
    nama_parameter: info.namaParameter,

    metode: info.acuanMetode || info.namaMetode || info.idMetodeParameter || '-',
    namaMetode: info.namaMetode,
    nama_metode: info.namaMetode,
    acuanMetode: info.acuanMetode,
    acuan_metode: info.acuanMetode,

    tanggalSampling,
    tanggal_sampling: tanggalSampling,
    tanggalPengambilanSampel: tanggalSampling,
    tanggal_pengambilan_sampel: tanggalSampling,

    abnormalitasSampel,
    abnormalitas_sampel: abnormalitasSampel,
    abnormalitasContoh: abnormalitasSampel,
    abnormalitas_contoh: abnormalitasSampel,

    acuanPengambilanSampel,
    acuan_pengambilan_sampel: acuanPengambilanSampel,

    deadline: detail.tanggal_tenggat,
    tanggalTenggat: detail.tanggal_tenggat,
    tanggal_tenggat: detail.tanggal_tenggat,

    statusDetail: detail.status_detail,
    status_detail: detail.status_detail,

    worksheet: {
      kodeLka: lka?.kode_lka || null,
      kode_lka: lka?.kode_lka || null,

      tanggalSampling,
      tanggal_sampling: tanggalSampling,
      tanggalPengambilanSampel: tanggalSampling,
      tanggal_pengambilan_sampel: tanggalSampling,

      abnormalitasSampel,
      abnormalitas_sampel: abnormalitasSampel,
      abnormalitasContoh: abnormalitasSampel,
      abnormalitas_contoh: abnormalitasSampel,

      acuanPengambilanSampel,
      acuan_pengambilan_sampel: acuanPengambilanSampel,

      tanggalMulaiPengujian: lka?.tanggal_mulai_pengujian || null,
      tanggal_mulai_pengujian: lka?.tanggal_mulai_pengujian || null,

      tanggalSelesaiPengujian: lka?.tanggal_selesai_pengujian || null,
      tanggal_selesai_pengujian: lka?.tanggal_selesai_pengujian || null,

      dhlAkuades: lka?.dhl_akuades || null,
      dhl_akuades: lka?.dhl_akuades || null,

      fileWorksheetPath: getPrimaryWorksheetPath(lka?.file_worksheet_path),
      file_worksheet_path: getPrimaryWorksheetPath(lka?.file_worksheet_path),
      worksheetFiles,

      statusLka: lka?.status_lka || 'Draft',
      status_lka: lka?.status_lka || 'Draft',

      ...worksheetRevisionPayload,
      catatanRevisi: worksheetRevisionPayload.catatanRevisiLka || worksheetRevisionPayload.catatanRevisi || null,
      catatan_revisi: worksheetRevisionPayload.catatan_revisi_lka || worksheetRevisionPayload.catatan_revisi || null,
      lkaRevisionNote: worksheetRevisionPayload.lkaRevisionNote || null,
      lka_revision_note: worksheetRevisionPayload.lka_revision_note || null,

      dilaporkanOleh: lka?.dilaporkan_oleh || penugasan.id_user_analis || null,
      dilaporkan_oleh: lka?.dilaporkan_oleh || penugasan.id_user_analis || null,
      dilaporkanOlehNama: lka?.Pelapor?.username || analis.username || penugasan.id_user_analis || '-',
      dilaporkan_oleh_nama: lka?.Pelapor?.username || analis.username || penugasan.id_user_analis || '-',
      tanggalPelaporan: lka?.tanggal_pelaporan || null,
      tanggal_pelaporan: lka?.tanggal_pelaporan || null,

      diperiksaOleh: lka?.diperiksa_oleh || null,
      diperiksa_oleh: lka?.diperiksa_oleh || null,
      diperiksaOlehNama: lka?.Pemeriksa?.username || lka?.diperiksa_oleh || '-',
      diperiksa_oleh_nama: lka?.Pemeriksa?.username || lka?.diperiksa_oleh || '-',
      tanggalPemeriksaan: lka?.tanggal_pemeriksaan || null,
      tanggal_pemeriksaan: lka?.tanggal_pemeriksaan || null,
    },

    samples: sampleRows.map((row) => ({
      kodeLka: row.kodeLka || row.kode_lka || lka?.kode_lka || null,
      kode_lka: row.kode_lka || row.kodeLka || lka?.kode_lka || null,
      noSampel: row.no_sampel,
      no_sampel: row.no_sampel,

      jenisSampel: row.jenis_sampel || '-',
      jenis_sampel: row.jenis_sampel || '-',
      idJenisSampel: row.id_jenis_sampel || null,
      id_jenis_sampel: row.id_jenis_sampel || null,

      tanggalPengambilanSampel: row.tanggal_pengambilan_sampel || null,
      tanggal_pengambilan_sampel: row.tanggal_pengambilan_sampel || null,
      tanggalSampling: row.tanggal_pengambilan_sampel || null,
      tanggal_sampling: row.tanggal_pengambilan_sampel || null,

      tanggalPenerimaan: row.tanggal_penerimaan || null,
      tanggal_penerimaan: row.tanggal_penerimaan || null,
      jamPenerimaan: row.jam_penerimaan || null,
      jam_penerimaan: row.jam_penerimaan || null,

      kondisiSampel: row.kondisi_sampel || '-',
      kondisi_sampel: row.kondisi_sampel || '-',
      koordinat: row.koordinat || '-',

      abnormalitasSampel: row.abnormalitas_sampel || '-',
      abnormalitas_sampel: row.abnormalitas_sampel || '-',

      acuanPengambilanSampel: row.acuan_pengambilan_sampel || '-',
      acuan_pengambilan_sampel: row.acuan_pengambilan_sampel || '-',

      hasil: row.hasil || '',
      hasHasil: Boolean(String(row.hasil || '').trim()),
      has_hasil: Boolean(String(row.hasil || '').trim()),

      catatanHasil: row.catatan_hasil || '',
      catatan_hasil: row.catatan_hasil || '',

      statusReviewHasil: row.statusReviewHasil || null,
      status_review_hasil: row.statusReviewHasil || null,

      ...buildLkaHasilRevisionResponse(row),
    })),
  };
}


async function saveWorksheetDraft(idPenugasanDetail, payload, userNik) {
  const { tanggalMulaiPengujian = null, tanggalSelesaiPengujian = null, dhlAkuades = null, fileWorksheetPath = null } = payload || {};

  return sequelize.transaction(async (transaction) => {
    await assertWorksheetEditableForAnalyst(idPenugasanDetail, userNik, transaction);
    await assertPenugasanDetailSamplesEditableBeforeLhu(idPenugasanDetail, transaction);
    await assertWorksheetBusinessDatesOrThrow(idPenugasanDetail, tanggalMulaiPengujian, tanggalSelesaiPengujian, transaction);

    const kodeLka = await ensureLkaForDetail(idPenugasanDetail, transaction);

    const lka = await Lka.findOne({
      where: { kode_lka: kodeLka },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!lka) {
      throw new Error('Data LKA tidak ditemukan.');
    }

    const nextStatusLka = lka.status_lka === 'Perlu Perbaikan' ? 'Perlu Perbaikan' : 'Draft';
    const revisionScope = await getLkaRevisionScope(kodeLka, transaction);

    const canEditLkaMeta =
      lka.status_lka !== 'Perlu Perbaikan' ||
      !revisionScope.hasSpecificRevisionRows ||
      revisionScope.allRowsRevision;

    const lkaPayload = {
      file_worksheet_path: fileWorksheetPath
        ? serializeWorksheetFiles(fileWorksheetPath)
        : lka.file_worksheet_path,
      dilaporkan_oleh: userNik,
      tanggal_pemeriksaan: null,
      diperiksa_oleh: null,
      catatan_revisi: lka.status_lka === 'Perlu Perbaikan' ? lka.catatan_revisi : null,
      status_lka: nextStatusLka,
    };

    if (canEditLkaMeta) {
      lkaPayload.tanggal_mulai_pengujian = tanggalMulaiPengujian;
      lkaPayload.tanggal_selesai_pengujian = tanggalSelesaiPengujian;
      lkaPayload.dhl_akuades = dhlAkuades;
    }

    await lka.update(lkaPayload, { transaction });

    await PenugasanDetail.update(
      { status_detail: 'Sedang Dikerjakan' },
      { where: { id_penugasan_detail: idPenugasanDetail }, transaction }
    );

    await syncAssignmentHeaderStatusFromDetail(idPenugasanDetail, transaction);

    return { kodeLka };
  });
}


async function saveWorksheetResults(idPenugasanDetail, payload, userNik) {
  const { results = [] } = payload || {};

  return sequelize.transaction(async (transaction) => {
    await assertWorksheetEditableForAnalyst(idPenugasanDetail, userNik, transaction);
    await assertPenugasanDetailSamplesEditableBeforeLhu(idPenugasanDetail, transaction);

    const kodeLka = await ensureLkaForDetail(idPenugasanDetail, transaction);

    await upsertWorksheetResults(idPenugasanDetail, kodeLka, results, transaction);

    await Lka.update(
      {
        dilaporkan_oleh: userNik,
        tanggal_pemeriksaan: null,
        diperiksa_oleh: null,
      },
      { where: { kode_lka: kodeLka }, transaction }
    );

    await PenugasanDetail.update(
      { status_detail: 'Sedang Dikerjakan' },
      { where: { id_penugasan_detail: idPenugasanDetail }, transaction }
    );

    await syncAssignmentHeaderStatusFromDetail(idPenugasanDetail, transaction);

    return { kodeLka };
  });
}


async function submitWorksheet(idPenugasanDetail, userNik, payload = {}) {
  const { worksheet = null, results = null } = payload || {};
  const requiredWorksheet = worksheet || {};

  const tanggalMulaiPengujian = String(requiredWorksheet.tanggalMulaiPengujian || '').trim();
  const tanggalSelesaiPengujian = String(requiredWorksheet.tanggalSelesaiPengujian || '').trim();
  const dhlAkuades = String(requiredWorksheet.dhlAkuades || '').trim();
  const fileWorksheetPath = requiredWorksheet.fileWorksheetPath || null;

  if (!tanggalMulaiPengujian) throw new Error('Tanggal pengerjaan wajib diisi.');
  if (!tanggalSelesaiPengujian) throw new Error('Tanggal selesai wajib diisi.');
  if (!dhlAkuades) throw new Error('DHL akuades wajib diisi.');
  if (!fileWorksheetPath) throw new Error('File Worksheet wajib diupload.');
  if (new Date(tanggalSelesaiPengujian) < new Date(tanggalMulaiPengujian)) throw new Error('Tanggal selesai tidak boleh sebelum tanggal pengerjaan.');
  if (!Array.isArray(results) || results.length === 0) throw new Error('Hasil pengujian sampel wajib diisi.');

  const emptyResult = results.find((row) => !String(row?.hasil || '').trim());
  if (emptyResult) throw new Error('Semua hasil pengujian sampel wajib diisi.');

  const result = await sequelize.transaction(async (transaction) => {
    await assertWorksheetEditableForAnalyst(idPenugasanDetail, userNik, transaction);
    await assertPenugasanDetailSamplesEditableBeforeLhu(idPenugasanDetail, transaction);
    await assertWorksheetBusinessDatesOrThrow(idPenugasanDetail, tanggalMulaiPengujian, tanggalSelesaiPengujian, transaction);

    const kodeLka = await ensureLkaForDetail(idPenugasanDetail, transaction);

    const lka = await Lka.findOne({
      where: { kode_lka: kodeLka },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!lka) {
      throw new Error('Data LKA tidak ditemukan.');
    }

    const revisionScope = await getLkaRevisionScope(kodeLka, transaction);

    const canEditLkaMeta =
      lka.status_lka !== 'Perlu Perbaikan' ||
      !revisionScope.hasSpecificRevisionRows ||
      revisionScope.allRowsRevision;

    const lkaPayload = {
      file_worksheet_path: fileWorksheetPath
        ? serializeWorksheetFiles(fileWorksheetPath)
        : lka.file_worksheet_path,
      dilaporkan_oleh: userNik,
      tanggal_pemeriksaan: null,
      diperiksa_oleh: null,
    };

    if (canEditLkaMeta) {
      lkaPayload.tanggal_mulai_pengujian = tanggalMulaiPengujian;
      lkaPayload.tanggal_selesai_pengujian = tanggalSelesaiPengujian;
      lkaPayload.dhl_akuades = dhlAkuades;
    }

    await lka.update(lkaPayload, { transaction });

    await normalizeLegacyLkaHasilStatuses(kodeLka, transaction);
    await upsertWorksheetResults(idPenugasanDetail, kodeLka, results, transaction);
    await assertWorksheetReadyToSubmit(idPenugasanDetail, kodeLka, transaction);

    const submittedNoSampels = normalizeResultRows(results).map((row) => row.noSampel);

    if (submittedNoSampels.length > 0) {
      await LkaHasil.update(
        {
          statusReviewHasil: LKA_HASIL_STATUS.WAIT_PENYELIA,
        },
        {
          where: {
            kode_lka: kodeLka,
            no_sampel: { [Op.in]: submittedNoSampels },
          },
          transaction,
        }
      );

      await markRevisionItemsWorkedByAnalyst(kodeLka, submittedNoSampels, transaction);
    }

    await syncLkaAggregateStatus(kodeLka, transaction, {
      dilaporkan_oleh: userNik,
      tanggal_pelaporan: new Date(),
    });

    await syncDetailStatusFromLka(kodeLka, transaction);

    return { kodeLka };
  });

  await WorkflowLogService.logStatusTransition({
    entityType: 'LKA',
    entityId: result.kodeLka,
    action: 'MELAPORKAN_LKA',
    statusBefore: null,
    statusAfter: 'Menunggu Verifikasi Penyelia',
    source: 'Analis',
    note: 'Analis mengirim LKA ke Penyelia.',
    actorNik: userNik || null,
  });

  try {
    await notificationService.notifyAnalisSubmitKePenyelia(idPenugasanDetail);
  } catch (error) {
    console.error('Gagal kirim email submit hasil analis ke penyelia:', error);
  }

  return result;
}


async function getLkaStateForDetail(idPenugasanDetail, transaction = null, forUpdate = false) {
  const detail = await PenugasanDetail.findOne({
    where: { id_penugasan_detail: idPenugasanDetail },
    include: [
      {
        model: Penugasan,
        required: true,
        attributes: ['id_penugasan', 'id_user_analis'],
      },
      {
        model: Lka,
        required: false,
        attributes: ['kode_lka', 'status_lka'],
      },
    ],
    transaction,
    lock: forUpdate && transaction ? transaction.LOCK.UPDATE : undefined,
  });

  if (!detail) return null;

  const plain = getPlain(detail);
  const penugasan = pickObject(plain, ['penugasan', 'Penugasan']) || {};
  const lka = pickObject(plain, ['lka', 'Lka']) || {};

  return {
    kode_lka: lka.kode_lka || null,
    status_lka: lka.status_lka || null,
    status_detail: plain.status_detail || null,
    id_user_analis: penugasan.id_user_analis || null,
  };
}


async function assertWorksheetEditableForAnalyst(idPenugasanDetail, userNik, transaction = null) {
  await assertOwnedPenugasanDetail(idPenugasanDetail, userNik, transaction);

  const state = await getLkaStateForDetail(
    idPenugasanDetail,
    transaction,
    Boolean(transaction)
  );

  const statusLka = state?.status_lka || null;

  if (statusLka && !EDITABLE_LKA_STATUSES.has(statusLka)) {
    throw new Error('LKA sudah dikirim ke penyelia dan tidak dapat diubah sebelum diminta revisi.');
  }

  return state;
}



module.exports = {
  loadRevisionRowsForLka,
  getAssignmentWorkDetail,
  getLkaRevisionHistory,
  saveWorksheetDraft,
  saveWorksheetResults,
  submitWorksheet,
  assertWorksheetEditableForAnalyst,
  markRevisionItemsApprovedByPenyelia,
  markRevisionItemsApprovedByKasi,
};
