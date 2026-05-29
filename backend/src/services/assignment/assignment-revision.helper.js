const { Op } = require('sequelize');

const LKA_HASIL_KEY_SEPARATOR = '|';

function pickArray(source, keys = []) {
  for (const key of keys) {
    if (Array.isArray(source?.[key])) return source[key];
  }
  return [];
}

function prefixRevisionNote(sourceRole, note) {
  const cleanNote = String(note || '').trim();

  if (!cleanNote) return cleanNote;

  return cleanNote.replace(/^\[[^\]]+\]\s*/, '').trim();
}


function stripRevisionNotePrefix(note = '') {
  return String(note || '').replace(/^\[[^\]]+\]\s*/, '').trim();
}


function stripPenyeliaReviewLines(note = '') {
  return String(note || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) =>
      line &&
      !/^Respon\s+Penyelia\s*:/i.test(line) &&
      !/^Keputusan\s+Penyelia\s*:/i.test(line) &&
      !/^Catatan\s+Penyelia\s*:/i.test(line)
    )
    .join('\n')
    .trim();
}


function stripPenyeliaReviewPrefix(note = '') {
  return String(note || '')
    .replace(/^Respon\s+Penyelia\s*:/i, '')
    .replace(/^Catatan\s+Penyelia\s*:/i, '')
    .trim();
}


function appendRevisionNote(existingNote, nextNote) {
  const existing = String(existingNote || '').trim();
  const next = String(nextNote || '').trim();

  if (!next) return existing || null;
  if (!existing) return next;

  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const existingNorm = normalize(existing);
  const nextNorm = normalize(next);

  if (existingNorm === nextNorm || existingNorm.includes(nextNorm)) {
    return existing;
  }

  return `${existing}\n\n${next}`;
}


function buildRevisionNotePatch(existingNote, nextNote) {
  // DB final tidak lagi menyimpan catatan revisi langsung di tabel lka.
  // Catatan revisi disimpan di lka_revisi dan lka_revisi_item.
  appendRevisionNote(existingNote, nextNote);
  return {};
}


function buildRevisionResultNotePatch(fieldName, existingNote, nextNote) {
  // DB final tidak lagi menyimpan catatan revisi langsung di tabel lka_hasil.
  // Field seperti catatan_revisi_hasil_penyelia/kasi sudah legacy.
  void fieldName;
  appendRevisionNote(existingNote, nextNote);
  return {};
}


function firstNonEmpty(values = []) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return null;
}


function buildLkaHasilRevisionResponse(row = {}) {
  const penyeliaNote = firstNonEmpty([
    row.catatanRevisiHasilPenyelia,
    row.catatan_revisi_hasil_penyelia,
    row.catatanRevisiPenyelia,
    row.catatan_revisi_penyelia,
  ]);
  const kasiNote = firstNonEmpty([
    row.catatanRevisiHasilKasiPengujian,
    row.catatan_revisi_hasil_kasi_pengujian,
    row.catatanRevisiKasiPengujian,
    row.catatan_revisi_kasi_pengujian,
  ]);
  const penyeliaResponseNote = firstNonEmpty([
    row.catatanResponPenyelia,
    row.catatan_respon_penyelia,
    row.catatanTinjauanPenyelia,
    row.catatan_tinjauan_penyelia,
    row.revisionResponsePenyelia,
    row.revision_response_penyelia,
  ]);
  const penyeliaDecisionNote = firstNonEmpty([
    row.keputusanPenyelia,
    row.keputusan_penyelia,
    row.keputusanRevisiPenyelia,
    row.keputusan_revisi_penyelia,
  ]);
  const combinedNote = firstNonEmpty([
    row.catatanRevisiHasil,
    row.catatan_revisi_hasil,
    row.catatanRevisi,
    row.catatan_revisi,
    penyeliaNote,
    kasiNote,
  ]);

  const penyeliaBy = firstNonEmpty([row.revisiPenyeliaBy, row.revisi_penyelia_by]);
  const kasiBy = firstNonEmpty([row.revisiKasiPengujianBy, row.revisi_kasi_pengujian_by]);
  const combinedBy = firstNonEmpty([row.direvisiOleh, row.direvisi_oleh, penyeliaBy, kasiBy]);

  const penyeliaAt = firstNonEmpty([row.revisiPenyeliaAt, row.revisi_penyelia_at]);
  const kasiAt = firstNonEmpty([row.revisiKasiPengujianAt, row.revisi_kasi_pengujian_at]);
  const combinedAt = firstNonEmpty([row.direvisiPada, row.direvisi_pada, penyeliaAt, kasiAt]);

  return {
    catatanRevisiHasilPenyelia: penyeliaNote,
    catatan_revisi_hasil_penyelia: penyeliaNote,
    catatanRevisiHasilKasiPengujian: kasiNote,
    catatan_revisi_hasil_kasi_pengujian: kasiNote,

    keputusanPenyelia: penyeliaDecisionNote,
    keputusan_penyelia: penyeliaDecisionNote,
    keputusanRevisiPenyelia: penyeliaDecisionNote,
    keputusan_revisi_penyelia: penyeliaDecisionNote,
    catatanResponPenyelia: penyeliaResponseNote,
    catatan_respon_penyelia: penyeliaResponseNote,
    catatanTinjauanPenyelia: penyeliaResponseNote,
    catatan_tinjauan_penyelia: penyeliaResponseNote,
    revisionResponsePenyelia: penyeliaResponseNote,
    revision_response_penyelia: penyeliaResponseNote,

    revisiPenyeliaBy: penyeliaBy,
    revisi_penyelia_by: penyeliaBy,
    revisiPenyeliaAt: penyeliaAt,
    revisi_penyelia_at: penyeliaAt,

    revisiKasiPengujianBy: kasiBy,
    revisi_kasi_pengujian_by: kasiBy,
    revisiKasiPengujianAt: kasiAt,
    revisi_kasi_pengujian_at: kasiAt,

    catatanRevisiHasil: combinedNote,
    catatan_revisi_hasil: combinedNote,
    catatanRevisi: combinedNote,
    catatan_revisi: combinedNote,
    direvisiOleh: combinedBy,
    direvisi_oleh: combinedBy,
    direvisiPada: combinedAt,
    direvisi_pada: combinedAt,
  };
}


function getRevisionItemsFromRow(revision = {}) {
  return pickArray(revision, ['items', 'lka_revisi_items', 'LkaRevisiItems']);
}


function normalizeRevisionSource(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
}


function isRevisionVisibleForAnalyst(revision = {}, item = {}) {
  const revisionStatus = String(revision.status_revisi || revision.statusRevisi || '').trim();
  const itemStatus = String(item.status_item_revisi || item.statusItemRevisi || '').trim();
  const source = normalizeRevisionSource(revision.sumber_revisi || revision.sumberRevisi);

  if (source === 'PENYELIA') {
    return revisionStatus !== 'Ditolak Penyelia' && itemStatus !== 'Ditolak Penyelia';
  }

  return ['Dikirim ke Analis', 'Disetujui untuk Analis', 'Diperbaiki Analis', 'Selesai'].includes(revisionStatus) ||
    ['Disetujui untuk Analis', 'Diperbaiki Analis', 'Disetujui Penyelia', 'Disetujui Kasi'].includes(itemStatus);
}


function isRevisionVisibleForAudience(revision = {}, item = {}, audience = 'analis') {
  if (audience === 'penyelia' || audience === 'kasi') {
    return true;
  }

  return isRevisionVisibleForAnalyst(revision, item);
}


function getKasiRevisionDecisionLabel(revision = {}) {
  const status = String(revision.status_revisi || revision.statusRevisi || '').trim();

  if (status === 'Ditolak Penyelia') return 'Ditolak Penyelia';
  if (['Dikirim ke Analis', 'Selesai', 'Disetujui Penyelia'].includes(status)) return 'Disetujui Penyelia';
  return '';
}


function buildKasiRevisionReviewNote(revision = {}, audience = 'analis') {
  const source = normalizeRevisionSource(revision.sumber_revisi || revision.sumberRevisi);
  if (source !== 'KASI_PENGUJIAN') return '';

  const reviewNote = stripPenyeliaReviewPrefix(
    revision.catatan_tinjauan || revision.catatanTinjauan || ''
  );
  const decisionLabel = getKasiRevisionDecisionLabel(revision);

  if (audience === 'kasi') {
    if (!decisionLabel && !reviewNote) return '';
    return [
      decisionLabel ? `Keputusan Penyelia: ${decisionLabel}` : '',
      reviewNote ? `Catatan Penyelia: ${reviewNote}` : '',
    ].filter(Boolean).join('\n');
  }

  return reviewNote;
}


function isGlobalRevisionLevel(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return ['LKA', 'GLOBAL', 'LKA_DAN_ITEM', 'GLOBAL_DAN_ITEM'].includes(normalized);
}


function buildRevisionNoteBuckets() {
  const penyeliaNotes = [];
  const kasiNotes = [];
  const penyeliaResponseNotes = [];
  const penyeliaDecisionNotes = [];
  const allNotes = [];

  const addUnique = (target, note, options = {}) => {
    const rawText = options.keepReviewLines
      ? stripRevisionNotePrefix(note)
      : stripPenyeliaReviewLines(stripRevisionNotePrefix(note));
    const text = String(rawText || '').trim();
    if (!text) return;
    if (!target.some((item) => item === text)) target.push(text);
  };

  const addBySource = (source, note) => {
    const normalizedSource = normalizeRevisionSource(source);
    if (normalizedSource === 'KASI_PENGUJIAN') addUnique(kasiNotes, note);
    else addUnique(penyeliaNotes, note);
    addUnique(allNotes, note);
  };

  const addPenyeliaReview = (revision = {}) => {
    const source = normalizeRevisionSource(revision.sumber_revisi || revision.sumberRevisi);
    if (source !== 'KASI_PENGUJIAN') return;

    const decisionLabel = getKasiRevisionDecisionLabel(revision);
    const reviewNote = stripPenyeliaReviewPrefix(
      revision.catatan_tinjauan || revision.catatanTinjauan || ''
    );

    if (decisionLabel) addUnique(penyeliaDecisionNotes, decisionLabel, { keepReviewLines: true });
    if (reviewNote) addUnique(penyeliaResponseNotes, reviewNote, { keepReviewLines: true });
  };

  return {
    penyeliaNotes,
    kasiNotes,
    penyeliaResponseNotes,
    penyeliaDecisionNotes,
    allNotes,
    addBySource,
    addPenyeliaReview,
  };
}


function buildRevisionNoteResponseFromBuckets({
  penyeliaNotes = [],
  kasiNotes = [],
  penyeliaResponseNotes = [],
  penyeliaDecisionNotes = [],
  allNotes = [],
} = {}) {
  const penyeliaNote = penyeliaNotes.join('\n\n') || null;
  const kasiNote = kasiNotes.join('\n\n') || null;
  const penyeliaResponseNote = penyeliaResponseNotes.join('\n\n') || null;
  const penyeliaDecisionNote = penyeliaDecisionNotes.join('\n\n') || null;
  const combinedNote = allNotes.join('\n\n') || null;

  return {
    catatanRevisiHasilPenyelia: penyeliaNote,
    catatan_revisi_hasil_penyelia: penyeliaNote,
    catatanRevisiPenyelia: penyeliaNote,
    catatan_revisi_penyelia: penyeliaNote,
    catatanRevisiItemPenyelia: penyeliaNote,
    catatan_revisi_item_penyelia: penyeliaNote,
    revisionNotePenyelia: penyeliaNote,
    revision_note_penyelia: penyeliaNote,

    catatanRevisiHasilKasiPengujian: kasiNote,
    catatan_revisi_hasil_kasi_pengujian: kasiNote,
    catatanRevisiKasiPengujian: kasiNote,
    catatan_revisi_kasi_pengujian: kasiNote,
    catatanRevisiItemKasiPengujian: kasiNote,
    catatan_revisi_item_kasi_pengujian: kasiNote,
    revisionNoteKasiPengujian: kasiNote,
    revision_note_kasi_pengujian: kasiNote,

    keputusanPenyelia: penyeliaDecisionNote,
    keputusan_penyelia: penyeliaDecisionNote,
    keputusanRevisiPenyelia: penyeliaDecisionNote,
    keputusan_revisi_penyelia: penyeliaDecisionNote,

    catatanResponPenyelia: penyeliaResponseNote,
    catatan_respon_penyelia: penyeliaResponseNote,
    catatanTinjauanPenyelia: penyeliaResponseNote,
    catatan_tinjauan_penyelia: penyeliaResponseNote,
    revisionResponsePenyelia: penyeliaResponseNote,
    revision_response_penyelia: penyeliaResponseNote,

    catatanRevisiHasil: combinedNote,
    catatan_revisi_hasil: combinedNote,
    catatanRevisi: combinedNote,
    catatan_revisi: combinedNote,
    catatanRevisiKolom: combinedNote,
    catatan_revisi_kolom: combinedNote,
    revisionNote: combinedNote,
    revision_note: combinedNote,
  };
}


function collectGlobalRevisionNotesForLka(revisionRows = [], options = {}) {
  const audience = options.audience || 'analis';
  const buckets = buildRevisionNoteBuckets();

  for (const revision of Array.isArray(revisionRows) ? revisionRows : []) {
    if (!isRevisionVisibleForAudience(revision, {}, audience)) continue;

    const globalNote = String(
      revision.catatan_umum ||
      revision.catatanUmum ||
      revision.catatan_revisi_global ||
      revision.catatanRevisiGlobal ||
      ''
    ).trim();

    if (globalNote && isGlobalRevisionLevel(revision.level_revisi || revision.levelRevisi)) {
      buckets.addBySource(revision.sumber_revisi || revision.sumberRevisi, globalNote);
    }
  }

  const response = buildRevisionNoteResponseFromBuckets(buckets);

  return {
    catatanRevisiGlobalPenyelia: response.catatanRevisiHasilPenyelia,
    catatan_revisi_global_penyelia: response.catatan_revisi_hasil_penyelia,
    catatanRevisiGlobalKasiPengujian: response.catatanRevisiHasilKasiPengujian,
    catatan_revisi_global_kasi_pengujian: response.catatan_revisi_hasil_kasi_pengujian,
    catatanRevisiGlobal: response.catatanRevisiHasil,
    catatan_revisi_global: response.catatan_revisi_hasil,
    catatanRevisiLka: response.catatanRevisiHasil,
    catatan_revisi_lka: response.catatan_revisi_hasil,
  };
}


function buildWorksheetRevisionResponse(lka = {}, revisionRows = [], options = {}) {
  const globalPayload = collectGlobalRevisionNotesForLka(revisionRows, options);
  const legacyNote = firstNonEmpty([
    lka.catatanRevisiGlobal,
    lka.catatan_revisi_global,
    lka.catatanRevisiLka,
    lka.catatan_revisi_lka,
    lka.catatanRevisi,
    lka.catatan_revisi,
  ]);
  const globalNote = firstNonEmpty([
    globalPayload.catatanRevisiLka,
    globalPayload.catatan_revisi_lka,
    globalPayload.catatanRevisiGlobal,
    globalPayload.catatan_revisi_global,
    legacyNote,
  ]);
  const penyeliaNote = firstNonEmpty([
    globalPayload.catatanRevisiGlobalPenyelia,
    globalPayload.catatan_revisi_global_penyelia,
    legacyNote,
  ]);
  const kasiNote = firstNonEmpty([
    globalPayload.catatanRevisiGlobalKasiPengujian,
    globalPayload.catatan_revisi_global_kasi_pengujian,
  ]);

  return {
    ...globalPayload,

    catatanRevisiGlobalPenyelia: penyeliaNote,
    catatan_revisi_global_penyelia: penyeliaNote,
    catatanRevisiGlobalKasiPengujian: kasiNote,
    catatan_revisi_global_kasi_pengujian: kasiNote,

    catatanRevisiGlobal: globalNote,
    catatan_revisi_global: globalNote,
    catatanRevisiLka: globalNote,
    catatan_revisi_lka: globalNote,
    catatanRevisi: globalNote,
    catatan_revisi: globalNote,
    lkaRevisionNote: globalNote,
    lka_revision_note: globalNote,
  };
}


function collectRevisionNotesForSample(revisionRows = [], noSampel, kodeLka = null, options = {}) {
  const sampleNo = String(noSampel || '').trim();
  const kode = String(kodeLka || '').trim();
  const audience = options.audience || 'analis';
  const buckets = buildRevisionNoteBuckets();

  for (const revision of Array.isArray(revisionRows) ? revisionRows : []) {
    const source = revision.sumber_revisi || revision.sumberRevisi;
    const revisionKode = String(revision.kode_lka || revision.kodeLka || '').trim();
    if (kode && revisionKode && revisionKode !== kode) continue;

    const items = getRevisionItemsFromRow(revision);

    for (const item of items) {
      const itemSample = String(item.no_sampel || item.noSampel || '').trim();
      const itemKode = String(item.kode_lka || item.kodeLka || revisionKode || '').trim();

      if (sampleNo && itemSample !== sampleNo) continue;
      if (kode && itemKode && itemKode !== kode) continue;
      if (!isRevisionVisibleForAudience(revision, item, audience)) continue;

      const itemNote = item.catatan_revisi || item.catatanRevisi || item.catatan_revisi_item || item.catatanRevisiItem || '';
      buckets.addBySource(source, itemNote);
      buckets.addPenyeliaReview(revision);
    }
  }

  return buildRevisionNoteResponseFromBuckets(buckets);
}


function uniqueSampleNos(values = []) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [values])
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )
  );
}


function buildLkaHasilKey(kodeLka, noSampel) {
  const kode = String(kodeLka || '').trim();
  const sample = String(noSampel || '').trim();
  return kode && sample ? `${kode}${LKA_HASIL_KEY_SEPARATOR}${sample}` : '';
}


function getLkaHasilKey(row = {}) {
  return buildLkaHasilKey(row.kode_lka || row.kodeLka, row.no_sampel || row.noSampel);
}


function parseLkaHasilKey(value, fallbackKodeLka = null) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  if (raw.includes(LKA_HASIL_KEY_SEPARATOR)) {
    const [kodeLka, ...rest] = raw.split(LKA_HASIL_KEY_SEPARATOR);
    const noSampel = rest.join(LKA_HASIL_KEY_SEPARATOR);
    if (kodeLka && noSampel) return { kode_lka: kodeLka, no_sampel: noSampel };
  }

  const fallback = String(fallbackKodeLka || '').trim();
  return fallback ? { kode_lka: fallback, no_sampel: raw } : null;
}


function lkaHasilWhereFromKey(value, fallbackKodeLka = null) {
  const parsed = parseLkaHasilKey(value, fallbackKodeLka);
  if (!parsed) return null;
  return { kode_lka: parsed.kode_lka, no_sampel: parsed.no_sampel };
}


function lkaHasilWhereFromKeys(values = [], fallbackKodeLka = null) {
  const clauses = (Array.isArray(values) ? values : [values])
    .map((value) => lkaHasilWhereFromKey(value, fallbackKodeLka))
    .filter(Boolean);

  if (!clauses.length) return null;
  if (clauses.length === 1) return clauses[0];
  return { [Op.or]: clauses };
}


function attachLkaHasilCompat(row = {}) {
  // Tidak lagi menambahkan kolom ID hasil lama. Identitas hasil adalah kode_lka + no_sampel.
  return row;
}


function normalizeRevisionTargetItem(item = {}, fallbackKodeLka = null) {
  const parsed = parseLkaHasilKey(item.hasilTargetKey || item.hasil_target_key || '', fallbackKodeLka);
  const kodeLka = String(item.kodeLka || item.kode_lka || parsed?.kode_lka || fallbackKodeLka || '').trim();
  const noSampel = String(item.noSampel || item.no_sampel || parsed?.no_sampel || '').trim();
  const hasilTargetKey = buildLkaHasilKey(kodeLka, noSampel);

  if (!hasilTargetKey) return null;

  return {
    hasilTargetKey,
    kode_lka: kodeLka,
    kodeLka,
    no_sampel: noSampel,
    noSampel,
    catatanRevisi: String(item.catatanRevisi || item.catatan_revisi || item.catatan || item.note || '').trim(),
  };
}


function normalizeKasiRevisionItems(catatanRevisi, hasilTargets = [], revisionsPayload = null, fallbackKodeLka = null) {
  const source = Array.isArray(revisionsPayload) && revisionsPayload.length > 0
    ? revisionsPayload
    : Array.isArray(hasilTargets)
      ? hasilTargets
      : [];
  const sharedNote = String(catatanRevisi || '').trim();
  const seen = new Set();

  return source
    .map((item = {}) => {
      const normalized = normalizeRevisionTargetItem(item, fallbackKodeLka);
      if (!normalized) return null;
      return {
        ...normalized,
        catatanRevisi: normalized.catatanRevisi || sharedNote,
      };
    })
    .filter((item) => {
      if (!item || seen.has(item.hasilTargetKey)) return false;
      seen.add(item.hasilTargetKey);
      return true;
    });
}


function buildKasiRevisionSummary(targetRows = [], revisionItems = []) {
  const noteByTarget = new Map(
    revisionItems.map((item) => [String(item.hasilTargetKey), stripRevisionNotePrefix(item.catatanRevisi)])
  );

  const lines = targetRows.map((row) => {
    const targetKey = String(getLkaHasilKey(row) || '');
    const parameter = row.nama_parameter || row.namaParameter || row.no_sampel || row.noSampel || targetKey;
    const metode = row.nama_metode || row.namaMetode || '';
    const label = [parameter, metode].filter(Boolean).join(' - ');
    const note = noteByTarget.get(targetKey) || '-';

    return `- ${label}: ${note}`;
  });

  return prefixRevisionNote('Kasi Pengujian', lines.join('\n'));
}


function normalizeRevisionRole(role) {
  const raw = String(role || '').trim();
  const lower = raw.toLowerCase();

  // Internal role: used for branching logic inside requestLkaRevision
  // Display role: used for prefixing notes (final format expected by frontend)
  if (
    lower === 'qc' ||
    lower === 'pengendalian mutu' ||
    lower === 'kasi pengendalian mutu'
  ) {
    return { internal: 'QC', display: 'Pengendalian Mutu' };
  }

  if (
    lower === 'kasi pengujian' ||
    lower === 'kasi' ||
    lower === 'pengujian'
  ) {
    return { internal: 'Kasi Pengujian', display: 'Kasi Pengujian' };
  }

  if (
    lower === 'kalab' ||
    lower === 'kepala lab' ||
    lower === 'kepala laboratorium'
  ) {
    return { internal: 'Kalab', display: 'Kalab' };
  }

  // Fallback: keep as-is
  return { internal: raw, display: raw };
}


module.exports = {
  prefixRevisionNote,
  stripRevisionNotePrefix,
  stripPenyeliaReviewLines,
  appendRevisionNote,
  buildRevisionNotePatch,
  buildRevisionResultNotePatch,
  firstNonEmpty,
  buildRevisionNoteBuckets,
  buildRevisionNoteResponseFromBuckets,
  buildLkaHasilRevisionResponse,
  getRevisionItemsFromRow,
  normalizeRevisionSource,
  isRevisionVisibleForAudience,
  buildKasiRevisionReviewNote,
  isGlobalRevisionLevel,
  collectGlobalRevisionNotesForLka,
  buildWorksheetRevisionResponse,
  collectRevisionNotesForSample,
  uniqueSampleNos,
  buildLkaHasilKey,
  getLkaHasilKey,
  parseLkaHasilKey,
  lkaHasilWhereFromKey,
  lkaHasilWhereFromKeys,
  attachLkaHasilCompat,
  normalizeRevisionTargetItem,
  normalizeKasiRevisionItems,
  buildKasiRevisionSummary,
  normalizeRevisionRole,
};
