function asText(value) {
  return String(value ?? '').trim();
}

function normalizeSource(value) {
  return asText(value).toUpperCase().replace(/\s+/g, '_');
}

function getRevisionRows(payload = {}) {
  const sourceRows = Array.isArray(payload)
    ? payload
    : (
        payload.revisions ||
        payload.revision_items ||
        payload.items ||
        payload.data?.revisions ||
        payload.data?.revision_items ||
        payload.data ||
        []
      );

  if (!Array.isArray(sourceRows)) return [];

  return sourceRows.flatMap((row = {}) => {
    const items = row.items || row.revisi_items || row.revision_items || row.lka_revisi_items || [];

    if (!Array.isArray(items) || items.length === 0) return [row];

    return items.map((item = {}) => ({
      ...row,
      ...item,
      idRevisiLka: row.idRevisiLka || row.id_revisi_lka,
      id_revisi_lka: row.id_revisi_lka || row.idRevisiLka,
      sumberRevisi: row.sumberRevisi || row.sumber_revisi,
      sumber_revisi: row.sumber_revisi || row.sumberRevisi,
      levelRevisi: row.levelRevisi || row.level_revisi,
      level_revisi: row.level_revisi || row.levelRevisi,
      statusRevisi: row.statusRevisi || row.status_revisi,
      status_revisi: row.status_revisi || row.statusRevisi,
      diajukanOleh: row.diajukanOleh || row.diajukan_oleh,
      diajukan_oleh: row.diajukan_oleh || row.diajukanOleh,
      diajukanPada: row.diajukanPada || row.diajukan_pada,
      diajukan_pada: row.diajukan_pada || row.diajukanPada,
      ditinjauOleh: row.ditinjauOleh || row.ditinjau_oleh,
      ditinjau_oleh: row.ditinjau_oleh || row.ditinjauOleh,
      ditinjauPada: row.ditinjauPada || row.ditinjau_pada,
      ditinjau_pada: row.ditinjau_pada || row.ditinjauPada,
      catatanTinjauan: row.catatanTinjauan || row.catatan_tinjauan,
      catatan_tinjauan: row.catatan_tinjauan || row.catatanTinjauan,
      idRevisiItem: item.idRevisiItem || item.id_revisi_item,
      id_revisi_item: item.id_revisi_item || item.idRevisiItem,
      statusItemRevisi: item.statusItemRevisi || item.status_item_revisi,
      status_item_revisi: item.status_item_revisi || item.statusItemRevisi,
      catatanRevisi: item.catatanRevisi || item.catatan_revisi,
      catatan_revisi: item.catatan_revisi || item.catatanRevisi,
    }));
  });
}

export function getKodeLkaFromWorkDetail(detail = {}) {
  return (
    detail.kodeLka ||
    detail.kode_lka ||
    detail.worksheet?.kodeLka ||
    detail.worksheet?.kode_lka ||
    detail.lka?.kodeLka ||
    detail.lka?.kode_lka ||
    ''
  );
}

export function getLkaHasilTargetKey(row = {}) {
  const kode = asText(row.kodeLka || row.kode_lka);
  const sample = asText(row.noSampel || row.no_sampel);
  return kode && sample ? `${kode}|${sample}` : '';
}

function getRevisionId(row = {}) {
  return asText(row.idRevisiItem || row.id_revisi_item || row.idRevisiLka || row.id_revisi_lka);
}

function joinUniqueNotes(notes = []) {
  const seen = new Set();
  const result = [];

  notes.forEach((note) => {
    const text = asText(note);
    if (!text) return;

    const key = text.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    result.push(text);
  });

  return result.join('\n\n');
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

function stripPenyeliaResponsePrefix(note = '') {
  return String(note || '')
    .replace(/^Respon\s+Penyelia\s*:/i, '')
    .replace(/^Catatan\s+Penyelia\s*:/i, '')
    .trim();
}

function getPenyeliaDecisionLabel(row = {}) {
  const explicit = asText(
    row.keputusanPenyelia ||
      row.keputusan_penyelia ||
      row.keputusanRevisiPenyelia ||
      row.keputusan_revisi_penyelia
  );

  if (explicit) return explicit;

  const status = asText(row.statusRevisi || row.status_revisi);
  if (status === 'Ditolak Penyelia') return 'Ditolak Penyelia';
  if (['Dikirim ke Analis', 'Selesai', 'Disetujui Penyelia'].includes(status)) return 'Disetujui Penyelia';
  return '';
}

function getPenyeliaResponseNote(row = {}) {
  const direct = stripPenyeliaResponsePrefix(
    row.catatanResponPenyelia ||
      row.catatan_respon_penyelia ||
      row.catatanTinjauanPenyelia ||
      row.catatan_tinjauan_penyelia ||
      row.revisionResponsePenyelia ||
      row.revision_response_penyelia ||
      row.catatanTinjauan ||
      row.catatan_tinjauan ||
      ''
  );

  if (direct) return direct;

  const sourceText = asText(row.catatanRevisi || row.catatan_revisi || row.catatanUmum || row.catatan_umum);
  const responseLine = sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^Respon\s+Penyelia\s*:/i.test(line) || /^Catatan\s+Penyelia\s*:/i.test(line));

  return stripPenyeliaResponsePrefix(responseLine || '');
}

function getRevisionNote(row = {}) {
  const revisionNote = stripPenyeliaReviewLines(
    row.catatanRevisi ||
      row.catatan_revisi ||
      row.catatanUmum ||
      row.catatan_umum
  );

  return revisionNote;
}

function getRevisionTime(row = {}) {
  return row.diajukanPada || row.diajukan_pada || row.ditinjauPada || row.ditinjau_pada || null;
}

function isKasiRevisionVisibleForAnalyst(row = {}) {
  const revisionStatus = asText(row.statusRevisi || row.status_revisi).toLowerCase();
  const itemStatus = asText(row.statusItemRevisi || row.status_item_revisi).toLowerCase();

  return (
    revisionStatus === 'dikirim ke analis' ||
    revisionStatus === 'selesai' ||
    itemStatus === 'disetujui untuk analis' ||
    itemStatus === 'diperbaiki analis' ||
    itemStatus === 'disetujui penyelia' ||
    itemStatus === 'disetujui kasi'
  );
}

function isKasiLegacyNoteVisibleForAnalyst(row = {}) {
  const status = asText(
    row.statusReviewHasil ||
      row.status_review_hasil ||
      row.statusLka ||
      row.status_lka ||
      row.statusDetail ||
      row.status_detail
  ).toLowerCase();

  return status === 'perlu revisi' || status === 'perlu perbaikan' || status === 'revisi';
}

function buildLatestByResultTarget(revisionPayload = {}) {
  const rows = getRevisionRows(revisionPayload);
  const grouped = new Map();

  rows.forEach((item) => {
    const key = getLkaHasilTargetKey(item);
    if (!key) return;

    const nextItem = {
      ...item,
      _source: normalizeSource(item.sumberRevisi || item.sumber_revisi),
      _note: getRevisionNote(item),
      _reviewNote: getPenyeliaResponseNote(item),
      _decisionLabel: getPenyeliaDecisionLabel(item),
      _time: getRevisionTime(item),
      _key: getRevisionId(item),
    };

    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(nextItem);
  });

  grouped.forEach((items) => {
    items.sort((a, b) => {
      const aTime = a._time ? new Date(a._time).getTime() : 0;
      const bTime = b._time ? new Date(b._time).getTime() : 0;
      if (aTime !== bTime) return aTime - bTime;
      return String(a._key).localeCompare(String(b._key));
    });
  });

  return grouped;
}

function isRevisionVisibleForAdapterAudience(item = {}, source, options = {}) {
  const target = normalizeSource(source);

  if (target === 'KASI_PENGUJIAN' && options.audience === 'analis') {
    return isKasiRevisionVisibleForAnalyst(item);
  }

  return true;
}

function pickLatest(items = [], source, options = {}) {
  const target = normalizeSource(source);
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item._source !== target || !item._note) continue;
    if (!isRevisionVisibleForAdapterAudience(item, target, options)) continue;
    return item;
  }
  return null;
}

function collectRevisionNotes(items = [], source, options = {}) {
  const target = normalizeSource(source);
  const notes = [];

  items.forEach((item) => {
    if (item._source !== target || !item._note) return;
    if (!isRevisionVisibleForAdapterAudience(item, target, options)) return;
    notes.push(item._note);
  });

  return joinUniqueNotes(notes);
}

function collectPenyeliaResponses(items = [], source, options = {}) {
  const target = normalizeSource(source);
  const notes = [];

  items.forEach((item) => {
    if (item._source !== target || !item._reviewNote) return;
    if (!isRevisionVisibleForAdapterAudience(item, target, options)) return;
    notes.push(item._reviewNote);
  });

  return joinUniqueNotes(notes);
}

function collectPenyeliaDecisions(items = [], source, options = {}) {
  const target = normalizeSource(source);
  const notes = [];

  items.forEach((item) => {
    if (item._source !== target || !item._decisionLabel) return;
    if (!isRevisionVisibleForAdapterAudience(item, target, options)) return;
    notes.push(item._decisionLabel);
  });

  return joinUniqueNotes(notes);
}


export function applyLkaRevisionHistoryToRows(rows = [], revisionPayload = {}) {
  const byResultTarget = buildLatestByResultTarget(revisionPayload);

  return rows.map((row) => {
    const key = getLkaHasilTargetKey(row);
    const history = key ? byResultTarget.get(key) || [] : [];

    const latestPenyelia = pickLatest(history, 'PENYELIA');
    const latestKasi = pickLatest(history, 'KASI_PENGUJIAN', { audience: 'analis' });

    const existingPenyeliaNote = asText(row.catatanRevisiHasilPenyelia || row.catatan_revisi_hasil_penyelia);
    const existingKasiNote = isKasiLegacyNoteVisibleForAnalyst(row)
      ? asText(row.catatanRevisiHasilKasiPengujian || row.catatan_revisi_hasil_kasi_pengujian)
      : '';
    const existingCombinedNote = asText(row.catatanRevisiHasil || row.catatan_revisi_hasil);
    const existingPenyeliaResponseNote = asText(
      row.catatanResponPenyelia ||
        row.catatan_respon_penyelia ||
        row.catatanTinjauanPenyelia ||
        row.catatan_tinjauan_penyelia ||
        row.revisionResponsePenyelia ||
        row.revision_response_penyelia
    );
    const existingPenyeliaDecision = asText(
      row.keputusanPenyelia ||
        row.keputusan_penyelia ||
        row.keputusanRevisiPenyelia ||
        row.keputusan_revisi_penyelia
    );
    const historyPenyeliaNote = collectRevisionNotes(history, 'PENYELIA');
    const historyKasiNote = collectRevisionNotes(history, 'KASI_PENGUJIAN', { audience: 'analis' });
    const historyPenyeliaResponseNote = collectPenyeliaResponses(history, 'KASI_PENGUJIAN', { audience: 'analis' });
    const historyPenyeliaDecision = collectPenyeliaDecisions(history, 'KASI_PENGUJIAN', { audience: 'analis' });

    const penyeliaNote = joinUniqueNotes([existingPenyeliaNote, historyPenyeliaNote]);
    const kasiNote = joinUniqueNotes([existingKasiNote, historyKasiNote]);
    const penyeliaResponseNote = joinUniqueNotes([existingPenyeliaResponseNote, historyPenyeliaResponseNote]);
    const penyeliaDecision = joinUniqueNotes([existingPenyeliaDecision, historyPenyeliaDecision]);
    const combinedNote = joinUniqueNotes([penyeliaNote, kasiNote, existingCombinedNote]);

    return {
      ...row,
      lkaRevisionHistory: history,
      lka_revision_history: history,
      sumberRevisiUtama: 'lka_revisi',
      sumber_revisi_utama: 'lka_revisi',

      catatanRevisiHasilPenyelia: penyeliaNote,
      catatan_revisi_hasil_penyelia: penyeliaNote,
      catatanRevisiHasilKasiPengujian: kasiNote,
      catatan_revisi_hasil_kasi_pengujian: kasiNote,
      keputusanPenyelia: penyeliaDecision,
      keputusan_penyelia: penyeliaDecision,
      keputusanRevisiPenyelia: penyeliaDecision,
      keputusan_revisi_penyelia: penyeliaDecision,
      catatanResponPenyelia: penyeliaResponseNote,
      catatan_respon_penyelia: penyeliaResponseNote,
      catatanTinjauanPenyelia: penyeliaResponseNote,
      catatan_tinjauan_penyelia: penyeliaResponseNote,
      revisionResponsePenyelia: penyeliaResponseNote,
      revision_response_penyelia: penyeliaResponseNote,
      catatanRevisiHasil: combinedNote,
      catatan_revisi_hasil: combinedNote,

      revisiPenyeliaBy: latestPenyelia?.diajukanOleh || latestPenyelia?.diajukan_oleh || null,
      revisi_penyelia_by: latestPenyelia?.diajukan_oleh || latestPenyelia?.diajukanOleh || null,
      revisiPenyeliaAt: latestPenyelia?._time || null,
      revisi_penyelia_at: latestPenyelia?._time || null,

      revisiKasiPengujianBy: latestKasi?.diajukanOleh || latestKasi?.diajukan_oleh || null,
      revisi_kasi_pengujian_by: latestKasi?.diajukan_oleh || latestKasi?.diajukanOleh || null,
      revisiKasiPengujianAt: latestKasi?._time || null,
      revisi_kasi_pengujian_at: latestKasi?._time || null,
    };
  });
}
