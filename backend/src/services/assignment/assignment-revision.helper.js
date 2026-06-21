const { Op } = require('sequelize');
const LKA_HASIL_KEY_SEPARATOR = '|';
class AssignmentRevisionHelper {
pickArray = (source, keys = []) => {
        for (const key of keys) {
            if (Array.isArray(source?.[key]))
                return source[key];
        }
        return [];
    };
    prefixRevisionNote = (sourceRole, note) => {
        const cleanNote = String(note || '').trim();
        if (!cleanNote)
            return cleanNote;
        return cleanNote.replace(/^\[[^\]]+\]\s*/, '').trim();
    };
    stripRevisionNotePrefix = (note = '') => {
        return String(note || '').replace(/^\[[^\]]+\]\s*/, '').trim();
    };
    stripPenyeliaReviewLines = (note = '') => {
        return String(note || '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line &&
            !/^Respon\s+Penyelia\s*:/i.test(line) &&
            !/^Keputusan\s+Penyelia\s*:/i.test(line) &&
            !/^Catatan\s+Penyelia\s*:/i.test(line))
            .join('\n')
            .trim();
    };
    stripPenyeliaReviewPrefix = (note = '') => {
        return String(note || '')
            .replace(/^Respon\s+Penyelia\s*:/i, '')
            .replace(/^Catatan\s+Penyelia\s*:/i, '')
            .trim();
    };
    appendRevisionNote = (existingNote, nextNote) => {
        const existing = String(existingNote || '').trim();
        const next = String(nextNote || '').trim();
        if (!next)
            return existing || null;
        if (!existing)
            return next;
        const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
        const existingNorm = normalize(existing);
        const nextNorm = normalize(next);
        if (existingNorm === nextNorm || existingNorm.includes(nextNorm)) {
            return existing;
        }
        return `${existing}\n\n${next}`;
    };
    buildRevisionNotePatch = (existingNote, nextNote) => {
        // DB final tidak lagi menyimpan catatan revisi langsung di tabel lka.
        // Catatan revisi disimpan langsung di tabel lka_revisi.
        this.appendRevisionNote(existingNote, nextNote);
        return {};
    };
    buildRevisionResultNotePatch = (fieldName, existingNote, nextNote) => {
        // DB final tidak lagi menyimpan catatan revisi langsung di tabel lka_hasil.
        // Field seperti catatan_revisi_hasil_penyelia/kasi sudah legacy.
        void fieldName;
        this.appendRevisionNote(existingNote, nextNote);
        return {};
    };
    firstNonEmpty = (values = []) => {
        for (const value of values) {
            const text = String(value ?? '').trim();
            if (text)
                return text;
        }
        return null;
    };
    buildLkaHasilRevisionResponse = (row = {}) => {
        const penyeliaNote = this.firstNonEmpty([
            row.catatanRevisiHasilPenyelia,
            row.catatan_revisi_hasil_penyelia,
            row.catatanRevisiPenyelia,
            row.catatan_revisi_penyelia,
        ]);
        const kasiNote = this.firstNonEmpty([
            row.catatanRevisiHasilKasiPengujian,
            row.catatan_revisi_hasil_kasi_pengujian,
            row.catatanRevisiKasiPengujian,
            row.catatan_revisi_kasi_pengujian,
        ]);
        const penyeliaResponseNote = this.firstNonEmpty([
            row.catatanResponPenyelia,
            row.catatan_respon_penyelia,
            row.catatanTinjauanPenyelia,
            row.catatan_tinjauan_penyelia,
            row.revisionResponsePenyelia,
            row.revision_response_penyelia,
        ]);
        const penyeliaDecisionNote = this.firstNonEmpty([
            row.keputusanPenyelia,
            row.keputusan_penyelia,
            row.keputusanRevisiPenyelia,
            row.keputusan_revisi_penyelia,
        ]);
        const combinedNote = this.firstNonEmpty([
            row.catatanRevisiHasil,
            row.catatan_revisi_hasil,
            row.catatanRevisi,
            row.catatan_revisi,
            penyeliaNote,
            kasiNote,
        ]);
        const penyeliaBy = this.firstNonEmpty([row.revisiPenyeliaBy, row.revisi_penyelia_by]);
        const kasiBy = this.firstNonEmpty([row.revisiKasiPengujianBy, row.revisi_kasi_pengujian_by]);
        const combinedBy = this.firstNonEmpty([row.direvisiOleh, row.direvisi_oleh, penyeliaBy, kasiBy]);
        const penyeliaAt = this.firstNonEmpty([row.revisiPenyeliaAt, row.revisi_penyelia_at]);
        const kasiAt = this.firstNonEmpty([row.revisiKasiPengujianAt, row.revisi_kasi_pengujian_at]);
        const combinedAt = this.firstNonEmpty([row.direvisiPada, row.direvisi_pada, penyeliaAt, kasiAt]);
        const hasilSebelumRevisi = this.firstNonEmpty([row.hasilSebelumRevisi, row.hasil_sebelum_revisi]);
        const hasilSetelahRevisi = this.firstNonEmpty([row.hasilSetelahRevisi, row.hasil_setelah_revisi]);
        const catatanHasilSebelumRevisi = this.firstNonEmpty([row.catatanHasilSebelumRevisi, row.catatan_hasil_sebelum_revisi]);
        const catatanHasilSetelahRevisi = this.firstNonEmpty([row.catatanHasilSetelahRevisi, row.catatan_hasil_setelah_revisi]);
        const revisionComparison = (hasilSebelumRevisi || hasilSetelahRevisi || catatanHasilSebelumRevisi || catatanHasilSetelahRevisi)
            ? {
                idRevisiLka: row.idRevisiLka || row.id_revisi_lka || null,
                idRevisiSebelumnya: row.idRevisiSebelumnya || row.id_revisi_sebelumnya || null,
                hasilSebelumRevisi,
                hasil_sebelum_revisi: hasilSebelumRevisi,
                hasilSetelahRevisi,
                hasil_setelah_revisi: hasilSetelahRevisi,
                catatanHasilSebelumRevisi,
                catatan_hasil_sebelum_revisi: catatanHasilSebelumRevisi,
                catatanHasilSetelahRevisi,
                catatan_hasil_setelah_revisi: catatanHasilSetelahRevisi,
            }
            : null;
        return {
            catatanRevisiHasilPenyelia: penyeliaNote,
            catatanRevisiHasilKasiPengujian: kasiNote,
            keputusanPenyelia: penyeliaDecisionNote,
            keputusanRevisiPenyelia: penyeliaDecisionNote,
            catatanResponPenyelia: penyeliaResponseNote,
            catatanTinjauanPenyelia: penyeliaResponseNote,
            revisionResponsePenyelia: penyeliaResponseNote,
            revisiPenyeliaBy: penyeliaBy,
            revisiPenyeliaAt: penyeliaAt,
            revisiKasiPengujianBy: kasiBy,
            revisiKasiPengujianAt: kasiAt,
            catatanRevisiHasil: combinedNote,
            catatanRevisi: combinedNote,
            direvisiOleh: combinedBy,
            direvisiPada: combinedAt,
            hasilSebelumRevisi,
            hasil_sebelum_revisi: hasilSebelumRevisi,
            hasilSetelahRevisi,
            hasil_setelah_revisi: hasilSetelahRevisi,
            catatanHasilSebelumRevisi,
            catatan_hasil_sebelum_revisi: catatanHasilSebelumRevisi,
            catatanHasilSetelahRevisi,
            catatan_hasil_setelah_revisi: catatanHasilSetelahRevisi,
            revisionComparison,
            revision_comparison: revisionComparison,
        };
    };
    getRevisionItemsFromRow = (revision = {}) => {
        const items = this.pickArray(revision, ['items']);
        return items.length ? items : [revision];
    };
    normalizeRevisionSource = (value) => {
        return String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
    };
    isRevisionVisibleForAnalyst = (revision = {}, item = {}) => {
        const revisionStatus = String(revision.status_revisi || revision.statusRevisi || '').trim();
        const itemStatus = String(item.status_revisi || item.statusRevisi || '').trim();
        const source = this.normalizeRevisionSource(revision.sumber_revisi || revision.sumberRevisi);
        if (source === 'PENYELIA') {
            return revisionStatus !== 'Ditolak Penyelia' && itemStatus !== 'Ditolak Penyelia';
        }
        return ['Dikirim ke Analis', 'Disetujui untuk Analis', 'Diperbaiki Analis', 'Selesai'].includes(revisionStatus) ||
            ['Disetujui untuk Analis', 'Diperbaiki Analis', 'Disetujui Penyelia', 'Disetujui Kasi'].includes(itemStatus);
    };
    isRevisionVisibleForAudience = (revision = {}, item = {}, audience = 'analis') => {
        if (audience === 'penyelia' || audience === 'kasi') {
            return true;
        }
        return this.isRevisionVisibleForAnalyst(revision, item);
    };
    getKasiRevisionDecisionLabel = (revision = {}) => {
        const status = String(revision.status_revisi || revision.statusRevisi || '').trim();
        if (status === 'Ditolak Penyelia')
            return 'Ditolak Penyelia';
        if (['Dikirim ke Analis', 'Selesai', 'Disetujui Penyelia'].includes(status))
            return 'Disetujui Penyelia';
        return '';
    };
    buildKasiRevisionReviewNote = (revision = {}, audience = 'analis') => {
        const source = this.normalizeRevisionSource(revision.sumber_revisi || revision.sumberRevisi);
        if (source !== 'KASI_PENGUJIAN')
            return '';
        const reviewNote = this.stripPenyeliaReviewPrefix(revision.catatan_tinjauan || revision.catatanTinjauan || '');
        const decisionLabel = this.getKasiRevisionDecisionLabel(revision);
        if (audience === 'kasi') {
            if (!decisionLabel && !reviewNote)
                return '';
            return [
                decisionLabel ? `Keputusan Penyelia: ${decisionLabel}` : '',
                reviewNote ? `Catatan Penyelia: ${reviewNote}` : '',
            ].filter(Boolean).join('\n');
        }
        return reviewNote;
    };
    isGlobalRevisionLevel = (value) => {
        const normalized = String(value || '').trim().toUpperCase();
        return ['LKA', 'GLOBAL', 'LKA_DAN_ITEM', 'GLOBAL_DAN_ITEM'].includes(normalized);
    };
    buildRevisionNoteBuckets = () => {
        const penyeliaNotes = [];
        const kasiNotes = [];
        const penyeliaResponseNotes = [];
        const penyeliaDecisionNotes = [];
        const allNotes = [];
        const addUnique = (target, note, options = {}) => {
            const rawText = options.keepReviewLines
                ? this.stripRevisionNotePrefix(note)
                : this.stripPenyeliaReviewLines(this.stripRevisionNotePrefix(note));
            const text = String(rawText || '').trim();
            if (!text)
                return;
            if (!target.some((item) => item === text))
                target.push(text);
        };
        const addBySource = (source, note) => {
            const normalizedSource = this.normalizeRevisionSource(source);
            if (normalizedSource === 'KASI_PENGUJIAN')
                addUnique(kasiNotes, note);
            else
                addUnique(penyeliaNotes, note);
            addUnique(allNotes, note);
        };
        const addPenyeliaReview = (revision = {}) => {
            const source = this.normalizeRevisionSource(revision.sumber_revisi || revision.sumberRevisi);
            if (source !== 'KASI_PENGUJIAN')
                return;
            const decisionLabel = this.getKasiRevisionDecisionLabel(revision);
            const reviewNote = this.stripPenyeliaReviewPrefix(revision.catatan_tinjauan || revision.catatanTinjauan || '');
            if (decisionLabel)
                addUnique(penyeliaDecisionNotes, decisionLabel, { keepReviewLines: true });
            if (reviewNote)
                addUnique(penyeliaResponseNotes, reviewNote, { keepReviewLines: true });
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
    };
    buildRevisionNoteResponseFromBuckets = ({ penyeliaNotes = [], kasiNotes = [], penyeliaResponseNotes = [], penyeliaDecisionNotes = [], allNotes = [], } = {}) => {
        const penyeliaNote = penyeliaNotes.join('\n\n') || null;
        const kasiNote = kasiNotes.join('\n\n') || null;
        const penyeliaResponseNote = penyeliaResponseNotes.join('\n\n') || null;
        const penyeliaDecisionNote = penyeliaDecisionNotes.join('\n\n') || null;
        const combinedNote = allNotes.join('\n\n') || null;
        return {
            catatanRevisiHasilPenyelia: penyeliaNote,
            catatanRevisiPenyelia: penyeliaNote,
            catatanRevisiItemPenyelia: penyeliaNote,
            revisionNotePenyelia: penyeliaNote,
            catatanRevisiHasilKasiPengujian: kasiNote,
            catatanRevisiKasiPengujian: kasiNote,
            catatanRevisiItemKasiPengujian: kasiNote,
            revisionNoteKasiPengujian: kasiNote,
            keputusanPenyelia: penyeliaDecisionNote,
            keputusanRevisiPenyelia: penyeliaDecisionNote,
            catatanResponPenyelia: penyeliaResponseNote,
            catatanTinjauanPenyelia: penyeliaResponseNote,
            revisionResponsePenyelia: penyeliaResponseNote,
            catatanRevisiHasil: combinedNote,
            catatanRevisi: combinedNote,
            catatanRevisiKolom: combinedNote,
            revisionNote: combinedNote,
        };
    };
    collectGlobalRevisionNotesForLka = (revisionRows = [], options = {}) => {
        const audience = options.audience || 'analis';
        const buckets = this.buildRevisionNoteBuckets();
        for (const revision of Array.isArray(revisionRows) ? revisionRows : []) {
            if (!this.isRevisionVisibleForAudience(revision, {}, audience))
                continue;
            const globalNote = String(revision.catatan_revisi ||
                revision.catatanRevisi ||
                revision.catatan_revisi_global ||
                revision.catatanRevisiGlobal ||
                '').trim();
            if (globalNote && this.isGlobalRevisionLevel(revision.level_revisi || revision.levelRevisi)) {
                buckets.addBySource(revision.sumber_revisi || revision.sumberRevisi, globalNote);
            }
        }
        const response = this.buildRevisionNoteResponseFromBuckets(buckets);
        return {
            catatanRevisiGlobalPenyelia: response.catatanRevisiHasilPenyelia,
            catatanRevisiGlobalKasiPengujian: response.catatanRevisiHasilKasiPengujian,
            catatanRevisiGlobal: response.catatanRevisiHasil,
            catatanRevisiLka: response.catatanRevisiHasil,
        };
    };
    buildWorksheetRevisionResponse = (lka = {}, revisionRows = [], options = {}) => {
        const globalRequestData = this.collectGlobalRevisionNotesForLka(revisionRows, options);
        const legacyNote = this.firstNonEmpty([
            lka.catatanRevisiGlobal,
            lka.catatan_revisi_global,
            lka.catatanRevisiLka,
            lka.catatan_revisi_lka,
            lka.catatanRevisi,
            lka.catatan_revisi,
        ]);
        const globalNote = this.firstNonEmpty([
            globalRequestData.catatanRevisiLka,
            globalRequestData.catatan_revisi_lka,
            globalRequestData.catatanRevisiGlobal,
            globalRequestData.catatan_revisi_global,
            legacyNote,
        ]);
        const penyeliaNote = this.firstNonEmpty([
            globalRequestData.catatanRevisiGlobalPenyelia,
            globalRequestData.catatan_revisi_global_penyelia,
            legacyNote,
        ]);
        const kasiNote = this.firstNonEmpty([
            globalRequestData.catatanRevisiGlobalKasiPengujian,
            globalRequestData.catatan_revisi_global_kasi_pengujian,
        ]);
        return {
            ...globalRequestData,
            catatanRevisiGlobalPenyelia: penyeliaNote,
            catatanRevisiGlobalKasiPengujian: kasiNote,
            catatanRevisiGlobal: globalNote,
            catatanRevisiLka: globalNote,
            catatanRevisi: globalNote,
            lkaRevisionNote: globalNote,
        };
    };
    collectRevisionNotesForSample = (revisionRows = [], noSampel, kodeLka = null, options = {}) => {
        const sampleNo = String(noSampel || '').trim();
        const kode = String(kodeLka || '').trim();
        const audience = options.audience || 'analis';
        const buckets = this.buildRevisionNoteBuckets();
        for (const revision of Array.isArray(revisionRows) ? revisionRows : []) {
            const source = revision.sumber_revisi || revision.sumberRevisi;
            const revisionKode = String(revision.kode_lka || revision.kodeLka || '').trim();
            if (kode && revisionKode && revisionKode !== kode)
                continue;
            const items = this.getRevisionItemsFromRow(revision);
            for (const item of items) {
                const itemSample = String(item.no_sampel || item.noSampel || '').trim();
                const itemKode = String(item.kode_lka || item.kodeLka || revisionKode || '').trim();
                if (sampleNo && itemSample !== sampleNo)
                    continue;
                if (kode && itemKode && itemKode !== kode)
                    continue;
                if (!this.isRevisionVisibleForAudience(revision, item, audience))
                    continue;
                const itemNote = item.catatan_revisi || item.catatanRevisi || item.catatan_revisi_item || item.catatanRevisiItem || '';
                buckets.addBySource(source, itemNote);
                buckets.addPenyeliaReview(revision);
            }
        }
        return {
            ...this.buildRevisionNoteResponseFromBuckets(buckets),
            ...this.buildLatestRevisionResultComparison(revisionRows, noSampel, kodeLka, options),
        };
    };
    buildLatestRevisionResultComparison = (revisionRows = [], noSampel, kodeLka = null, options = {}) => {
        const sampleNo = String(noSampel || '').trim();
        const kode = String(kodeLka || '').trim();
        const audience = options.audience || 'analis';
        const matchingRows = (Array.isArray(revisionRows) ? revisionRows : [])
            .filter((revision) => {
                const revisionKode = String(revision.kode_lka || revision.kodeLka || '').trim();
                const revisionSample = String(revision.no_sampel || revision.noSampel || '').trim();
                if (!sampleNo || revisionSample !== sampleNo)
                    return false;
                if (kode && revisionKode && revisionKode !== kode)
                    return false;
                if (!this.isRevisionVisibleForAudience(revision, revision, audience))
                    return false;
                return Boolean(
                    this.firstNonEmpty([revision.hasilSebelumRevisi, revision.hasil_sebelum_revisi]) ||
                    this.firstNonEmpty([revision.hasilSetelahRevisi, revision.hasil_setelah_revisi]) ||
                    this.firstNonEmpty([revision.catatanHasilSebelumRevisi, revision.catatan_hasil_sebelum_revisi]) ||
                    this.firstNonEmpty([revision.catatanHasilSetelahRevisi, revision.catatan_hasil_setelah_revisi])
                );
            })
            .sort((a, b) => {
                const dateCompare = new Date(b.diajukan_pada || b.diajukanPada || 0) - new Date(a.diajukan_pada || a.diajukanPada || 0);
                return dateCompare || String(b.id_revisi_lka || b.idRevisiLka || '').localeCompare(String(a.id_revisi_lka || a.idRevisiLka || ''));
            });
        const latest = matchingRows[0] || null;
        if (!latest)
            return {};
        const hasilSebelumRevisi = this.firstNonEmpty([latest.hasilSebelumRevisi, latest.hasil_sebelum_revisi]);
        const hasilSetelahRevisi = this.firstNonEmpty([latest.hasilSetelahRevisi, latest.hasil_setelah_revisi]);
        const catatanHasilSebelumRevisi = this.firstNonEmpty([latest.catatanHasilSebelumRevisi, latest.catatan_hasil_sebelum_revisi]);
        const catatanHasilSetelahRevisi = this.firstNonEmpty([latest.catatanHasilSetelahRevisi, latest.catatan_hasil_setelah_revisi]);
        const revisionComparison = {
            idRevisiLka: latest.id_revisi_lka || latest.idRevisiLka || null,
            idRevisiSebelumnya: latest.id_revisi_sebelumnya || latest.idRevisiSebelumnya || null,
            hasilSebelumRevisi,
            hasil_sebelum_revisi: hasilSebelumRevisi,
            hasilSetelahRevisi,
            hasil_setelah_revisi: hasilSetelahRevisi,
            catatanHasilSebelumRevisi,
            catatan_hasil_sebelum_revisi: catatanHasilSebelumRevisi,
            catatanHasilSetelahRevisi,
            catatan_hasil_setelah_revisi: catatanHasilSetelahRevisi,
            diajukanPada: latest.diajukan_pada || latest.diajukanPada || null,
            sumberRevisi: latest.sumber_revisi || latest.sumberRevisi || null,
        };
        return {
            hasilSebelumRevisi,
            hasil_sebelum_revisi: hasilSebelumRevisi,
            hasilSetelahRevisi,
            hasil_setelah_revisi: hasilSetelahRevisi,
            catatanHasilSebelumRevisi,
            catatan_hasil_sebelum_revisi: catatanHasilSebelumRevisi,
            catatanHasilSetelahRevisi,
            catatan_hasil_setelah_revisi: catatanHasilSetelahRevisi,
            revisionComparison,
            revision_comparison: revisionComparison,
        };
    };
    uniqueSampleNos = (values = []) => {
        return Array.from(new Set((Array.isArray(values) ? values : [values])
            .map((value) => String(value || '').trim())
            .filter(Boolean)));
    };
    buildLkaHasilKey = (kodeLka, noSampel) => {
        const kode = String(kodeLka || '').trim();
        const sample = String(noSampel || '').trim();
        return kode && sample ? `${kode}${LKA_HASIL_KEY_SEPARATOR}${sample}` : '';
    };
    getLkaHasilKey = (row = {}) => {
        return this.buildLkaHasilKey(row.kode_lka || row.kodeLka, row.no_sampel || row.noSampel);
    };
    parseLkaHasilKey = (value, fallbackKodeLka = null) => {
        const raw = String(value || '').trim();
        if (!raw)
            return null;
        if (raw.includes(LKA_HASIL_KEY_SEPARATOR)) {
            const [kodeLka, ...rest] = raw.split(LKA_HASIL_KEY_SEPARATOR);
            const noSampel = rest.join(LKA_HASIL_KEY_SEPARATOR);
            if (kodeLka && noSampel)
                return { kode_lka: kodeLka, no_sampel: noSampel };
        }
        const fallback = String(fallbackKodeLka || '').trim();
        return fallback ? { kode_lka: fallback, no_sampel: raw } : null;
    };
    lkaHasilWhereFromKey = (value, fallbackKodeLka = null) => {
        const parsed = this.parseLkaHasilKey(value, fallbackKodeLka);
        if (!parsed)
            return null;
        return { kode_lka: parsed.kode_lka, no_sampel: parsed.no_sampel };
    };
    lkaHasilWhereFromKeys = (values = [], fallbackKodeLka = null) => {
        const clauses = (Array.isArray(values) ? values : [values])
            .map((value) => this.lkaHasilWhereFromKey(value, fallbackKodeLka))
            .filter(Boolean);
        if (!clauses.length)
            return null;
        if (clauses.length === 1)
            return clauses[0];
        return { [Op.or]: clauses };
    };
    attachLkaHasilCompat = (row = {}) => {
        // Tidak lagi menambahkan kolom ID hasil lama. Identitas hasil adalah kode_lka + no_sampel.
        return row;
    };
    normalizeRevisionTargetItem = (item = {}, fallbackKodeLka = null) => {
        const parsed = this.parseLkaHasilKey(item.hasilTargetKey || item.hasil_target_key || '', fallbackKodeLka);
        const kodeLka = String(item.kodeLka || item.kode_lka || parsed?.kode_lka || fallbackKodeLka || '').trim();
        const noSampel = String(item.noSampel || item.no_sampel || parsed?.no_sampel || '').trim();
        const hasilTargetKey = this.buildLkaHasilKey(kodeLka, noSampel);
        if (!hasilTargetKey)
            return null;
        return {
            hasilTargetKey,
            kode_lka: kodeLka,
            kodeLka,
            no_sampel: noSampel,
            noSampel,
            catatanRevisi: String(item.catatanRevisi || item.catatan_revisi || item.catatan || item.note || '').trim(),
        };
    };
    normalizeKasiRevisionItems = (catatanRevisi, hasilTargets = [], revisionsRequestData = null, fallbackKodeLka = null) => {
        const source = Array.isArray(revisionsRequestData) && revisionsRequestData.length > 0
            ? revisionsRequestData
            : Array.isArray(hasilTargets)
                ? hasilTargets
                : [];
        const sharedNote = String(catatanRevisi || '').trim();
        const seen = new Set();
        return source
            .map((item = {}) => {
            const normalized = this.normalizeRevisionTargetItem(item, fallbackKodeLka);
            if (!normalized)
                return null;
            return {
                ...normalized,
                catatanRevisi: normalized.catatanRevisi || sharedNote,
            };
        })
            .filter((item) => {
            if (!item || seen.has(item.hasilTargetKey))
                return false;
            seen.add(item.hasilTargetKey);
            return true;
        });
    };
    buildKasiRevisionSummary = (targetRows = [], revisionItems = []) => {
        const noteByTarget = new Map(revisionItems.map((item) => [String(item.hasilTargetKey), this.stripRevisionNotePrefix(item.catatanRevisi)]));
        const lines = targetRows.map((row) => {
            const targetKey = String(this.getLkaHasilKey(row) || '');
            const parameter = row.nama_parameter || row.namaParameter || row.no_sampel || row.noSampel || targetKey;
            const metode = row.nama_metode || row.namaMetode || '';
            const label = [parameter, metode].filter(Boolean).join(' - ');
            const note = noteByTarget.get(targetKey) || '-';
            return `- ${label}: ${note}`;
        });
        return this.prefixRevisionNote('Kasi Pengujian', lines.join('\n'));
    };
    normalizeRevisionRole = (role) => {
        const raw = String(role || '').trim();
        const lower = raw.toLowerCase();
        // Internal role: used for branching logic inside requestLkaRevision
        // Display role: used for prefixing notes (final format expected by frontend)
        if (lower === 'qc' ||
            lower === 'pengendalian mutu' ||
            lower === 'kasi pengendalian mutu') {
            return { internal: 'QC', display: 'Pengendalian Mutu' };
        }
        if (lower === 'kasi pengujian' ||
            lower === 'kasi' ||
            lower === 'pengujian') {
            return { internal: 'Kasi Pengujian', display: 'Kasi Pengujian' };
        }
        if (lower === 'kalab' ||
            lower === 'kepala lab' ||
            lower === 'kepala laboratorium') {
            return { internal: 'Kalab', display: 'Kalab' };
        }
        // Fallback: keep as-is
        return { internal: raw, display: raw };
    };
}
module.exports = new AssignmentRevisionHelper();
module.exports.AssignmentRevisionHelper = AssignmentRevisionHelper;
