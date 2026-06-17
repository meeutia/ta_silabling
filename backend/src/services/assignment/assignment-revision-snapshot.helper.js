const { Op } = require('sequelize');
const { AktivitasSistemLog, LkaHasil } = require('../../models/Associations');
const WorkflowLogService = require('../workflow/workflow-log.service');
const { getPlain } = require('./assignment-object.helper');

const REVISION_SNAPSHOT_ENTITY = 'LKA_REVISI';
const SNAPSHOT_BEFORE_ACTION = 'HASIL_SEBELUM_REVISI';
const SNAPSHOT_AFTER_ACTION = 'HASIL_SETELAH_REVISI';

const safeText = (value) => {
    const text = String(value ?? '').trim();
    return text || null;
};

const snapshotKey = (kodeLka, noSampel) => `${safeText(kodeLka) || ''}||${safeText(noSampel) || ''}`;

const normalizeRevisionStatus = (value) => String(value || '').trim();

const canUseCurrentResultAsAfterSnapshot = (revision = {}) => {
    const status = normalizeRevisionStatus(revision.status_revisi || revision.statusRevisi);

    return [
        'Diperbaiki Analis',
        'Disetujui Penyelia',
        'Disetujui Kasi',
        'Selesai',
    ].includes(status);
};

const buildSnapshotNote = ({ kodeLka, noSampel, hasil = null, catatanHasil = null }) => JSON.stringify({
    kode_lka: safeText(kodeLka),
    no_sampel: safeText(noSampel),
    hasil: safeText(hasil),
    catatan_hasil: safeText(catatanHasil),
});

const parseSnapshotNote = (note = '', fallback = {}) => {
    const text = String(note || '').trim();

    if (text) {
        try {
            const parsed = JSON.parse(text);
            return {
                kode_lka: safeText(parsed.kode_lka || parsed.kodeLka || fallback.kode_lka || fallback.kodeLka),
                no_sampel: safeText(parsed.no_sampel || parsed.noSampel || fallback.no_sampel || fallback.noSampel),
                hasil: safeText(parsed.hasil),
                catatan_hasil: safeText(parsed.catatan_hasil || parsed.catatanHasil),
            };
        }
        catch (_error) {
            // Fallback ke kolom status_sebelumnya/status_baru agar tetap kompatibel
            // kalau snapshot disimpan tanpa JSON pada catatan aktivitas.
        }
    }

    const action = safeText(fallback.aksi || fallback.action);
    const statusSebelumnya = safeText(fallback.status_sebelumnya || fallback.statusSebelumnya);
    const statusBaru = safeText(fallback.status_baru || fallback.statusBaru);
    const hasil = action === SNAPSHOT_AFTER_ACTION ? statusBaru : statusSebelumnya;

    if (!hasil)
        return null;

    return {
        kode_lka: safeText(fallback.kode_lka || fallback.kodeLka),
        no_sampel: safeText(fallback.no_sampel || fallback.noSampel),
        hasil,
        catatan_hasil: null,
    };
};

const getCurrentLkaHasilSnapshot = async (kodeLka, noSampel, transaction = null) => {
    const kode = safeText(kodeLka);
    const sample = safeText(noSampel);
    if (!kode || !sample)
        return null;

    const row = await LkaHasil.findOne({
        where: { kode_lka: kode, no_sampel: sample },
        attributes: ['kode_lka', 'no_sampel', 'hasil', 'catatan_hasil'],
        transaction: transaction || undefined,
    });

    const plain = getPlain(row);
    return plain
        ? {
            kode_lka: plain.kode_lka || kode,
            no_sampel: plain.no_sampel || sample,
            hasil: safeText(plain.hasil),
            catatan_hasil: safeText(plain.catatan_hasil),
        }
        : {
            kode_lka: kode,
            no_sampel: sample,
            hasil: null,
            catatan_hasil: null,
        };
};

const logRevisionResultSnapshot = async ({
    idRevisiLka,
    action,
    kodeLka,
    noSampel,
    hasil = null,
    catatanHasil = null,
    actorNik = null,
    source = 'Sistem',
}, transaction = null) => {
    const revisionId = safeText(idRevisiLka);
    const aksi = safeText(action);
    if (!revisionId || !aksi)
        return null;
    if (![SNAPSHOT_BEFORE_ACTION, SNAPSHOT_AFTER_ACTION].includes(aksi))
        return null;

    const cleanHasil = safeText(hasil);

    return WorkflowLogService.logStatusTransitionIfMissing({
        entityType: REVISION_SNAPSHOT_ENTITY,
        entityId: revisionId,
        action: aksi,
        source,
        note: buildSnapshotNote({ kodeLka, noSampel, hasil, catatanHasil }),
        statusBefore: aksi === SNAPSHOT_BEFORE_ACTION ? cleanHasil : null,
        statusAfter: aksi === SNAPSHOT_AFTER_ACTION ? cleanHasil : null,
        actorNik,
        transaction,
    });
};

const logRevisionResultSnapshotFromCurrentResult = async ({
    idRevisiLka,
    action,
    kodeLka,
    noSampel,
    actorNik = null,
    source = 'Sistem',
}, transaction = null) => {
    const snapshot = await getCurrentLkaHasilSnapshot(kodeLka, noSampel, transaction);
    return logRevisionResultSnapshot({
        idRevisiLka,
        action,
        kodeLka: snapshot?.kode_lka || kodeLka,
        noSampel: snapshot?.no_sampel || noSampel,
        hasil: snapshot?.hasil || null,
        catatanHasil: snapshot?.catatan_hasil || null,
        actorNik,
        source,
    }, transaction);
};

const mapSnapshotLogsByRevisionId = (logs = []) => {
    const snapshotByRevisionId = new Map();

    logs.forEach((logRow) => {
        const row = getPlain(logRow) || logRow || {};
        const revisionId = safeText(row.entity_id);
        const action = safeText(row.aksi);
        const snapshot = parseSnapshotNote(row.catatan, row);

        if (!revisionId || !action || !snapshot)
            return;

        if (!snapshotByRevisionId.has(revisionId)) {
            snapshotByRevisionId.set(revisionId, {});
        }

        const target = snapshotByRevisionId.get(revisionId);
        if (action === SNAPSHOT_BEFORE_ACTION)
            target.before = snapshot;
        if (action === SNAPSHOT_AFTER_ACTION)
            target.after = snapshot;
    });

    return snapshotByRevisionId;
};

const buildCurrentResultMap = async (rows = [], transaction = null) => {
    const targets = Array.from(new Map(
        rows
            .map((row) => ({
                kode_lka: safeText(row.kode_lka || row.kodeLka),
                no_sampel: safeText(row.no_sampel || row.noSampel),
            }))
            .filter((row) => row.kode_lka && row.no_sampel)
            .map((row) => [snapshotKey(row.kode_lka, row.no_sampel), row])
    ).values());

    if (!targets.length)
        return new Map();

    const rowsByKode = targets.reduce((acc, row) => {
        if (!acc.has(row.kode_lka))
            acc.set(row.kode_lka, []);
        acc.get(row.kode_lka).push(row.no_sampel);
        return acc;
    }, new Map());

    const currentRows = [];
    for (const [kodeLka, sampleNos] of rowsByKode.entries()) {
        const found = await LkaHasil.findAll({
            where: {
                kode_lka: kodeLka,
                no_sampel: { [Op.in]: Array.from(new Set(sampleNos)) },
            },
            attributes: ['kode_lka', 'no_sampel', 'hasil', 'catatan_hasil'],
            transaction: transaction || undefined,
        });
        currentRows.push(...found);
    }

    const map = new Map();
    currentRows.forEach((row) => {
        const plain = getPlain(row) || row || {};
        const kode = safeText(plain.kode_lka || plain.kodeLka);
        const noSampel = safeText(plain.no_sampel || plain.noSampel);
        if (!kode || !noSampel)
            return;
        map.set(snapshotKey(kode, noSampel), {
            kode_lka: kode,
            no_sampel: noSampel,
            hasil: safeText(plain.hasil),
            catatan_hasil: safeText(plain.catatan_hasil),
        });
    });

    return map;
};

const sameSnapshotValue = (a = {}, b = {}) => (
    safeText(a.hasil) === safeText(b.hasil) &&
    safeText(a.catatan_hasil) === safeText(b.catatan_hasil)
);

const attachSnapshotToRow = (row = {}, snapshots = {}) => {
    const before = snapshots.before || null;
    const after = snapshots.after || null;
    const hasilSebelumRevisi = before?.hasil || null;
    const hasilSetelahRevisi = after?.hasil || null;
    const catatanHasilSebelumRevisi = before?.catatan_hasil || null;
    const catatanHasilSetelahRevisi = after?.catatan_hasil || null;

    if (!hasilSebelumRevisi && !hasilSetelahRevisi && !catatanHasilSebelumRevisi && !catatanHasilSetelahRevisi)
        return row;

    const revisionComparison = {
        idRevisiLka: row.id_revisi_lka || row.idRevisiLka || null,
        id_revisi_lka: row.id_revisi_lka || row.idRevisiLka || null,
        idRevisiSebelumnya: row.id_revisi_sebelumnya || row.idRevisiSebelumnya || null,
        id_revisi_sebelumnya: row.id_revisi_sebelumnya || row.idRevisiSebelumnya || null,
        hasilSebelumRevisi,
        hasil_sebelum_revisi: hasilSebelumRevisi,
        hasilSetelahRevisi,
        hasil_setelah_revisi: hasilSetelahRevisi,
        catatanHasilSebelumRevisi,
        catatan_hasil_sebelum_revisi: catatanHasilSebelumRevisi,
        catatanHasilSetelahRevisi,
        catatan_hasil_setelah_revisi: catatanHasilSetelahRevisi,
    };

    return {
        ...row,
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

const buildResolvedSnapshotByRevisionId = (plainRows = [], snapshotByRevisionId = new Map(), currentResultByKey = new Map()) => {
    const rowByRevisionId = new Map();
    plainRows.forEach((row) => {
        const id = safeText(row.id_revisi_lka || row.idRevisiLka);
        if (id)
            rowByRevisionId.set(id, row);
    });

    const resolved = new Map();
    const resolving = new Set();

    const resolveForRow = (row = {}) => {
        const id = safeText(row.id_revisi_lka || row.idRevisiLka);
        if (!id)
            return {};
        if (resolved.has(id))
            return resolved.get(id);
        if (resolving.has(id))
            return snapshotByRevisionId.get(id) || {};

        resolving.add(id);

        const own = snapshotByRevisionId.get(id) || {};
        const previousId = safeText(row.id_revisi_sebelumnya || row.idRevisiSebelumnya);
        const previousRow = rowByRevisionId.get(previousId) || row.RevisiSebelumnya || row.revisiSebelumnya || row.revisi_sebelumnya || null;
        const previousResolved = previousRow ? resolveForRow(previousRow) : {};

        let before = own.before || null;
        if (!before && previousResolved.after) {
            before = previousResolved.after;
        }

        let after = own.after || null;
        const currentKey = snapshotKey(row.kode_lka || row.kodeLka, row.no_sampel || row.noSampel);
        const current = currentResultByKey.get(currentKey) || null;

        if (!after && current && before && canUseCurrentResultAsAfterSnapshot(row)) {
            after = current;
        }

        // Jangan tampilkan perbandingan palsu saat nilai belum berubah.
        // Tetap simpan jika ada catatan hasil yang berubah.
        if (before && after && sameSnapshotValue(before, after)) {
            const status = normalizeRevisionStatus(row.status_revisi || row.statusRevisi);
            if (['Dikirim ke Analis', 'Disetujui untuk Analis'].includes(status)) {
                after = null;
            }
        }

        const pair = { before, after };
        resolved.set(id, pair);
        resolving.delete(id);
        return pair;
    };

    plainRows.forEach(resolveForRow);
    return resolved;
};

const enrichRevisionRowsWithResultSnapshots = async (rows = [], transaction = null) => {
    const plainRows = (Array.isArray(rows) ? rows : []).map((row) => getPlain(row) || row).filter(Boolean);
    const revisionIds = Array.from(new Set(plainRows
        .flatMap((row) => [
            row.id_revisi_lka || row.idRevisiLka,
            row.id_revisi_sebelumnya || row.idRevisiSebelumnya,
            row.RevisiSebelumnya?.id_revisi_lka || row.revisiSebelumnya?.id_revisi_lka || row.revisi_sebelumnya?.id_revisi_lka,
        ])
        .map(safeText)
        .filter(Boolean)));

    if (!revisionIds.length)
        return plainRows;

    const logs = await AktivitasSistemLog.findAll({
        where: {
            entity_type: REVISION_SNAPSHOT_ENTITY,
            entity_id: { [Op.in]: revisionIds },
            aksi: { [Op.in]: [SNAPSHOT_BEFORE_ACTION, SNAPSHOT_AFTER_ACTION] },
        },
        order: [
            ['dibuat_pada', 'ASC'],
            ['id_aktivitas_log', 'ASC'],
        ],
        transaction: transaction || undefined,
    });

    const snapshotByRevisionId = mapSnapshotLogsByRevisionId(logs);
    const currentResultByKey = await buildCurrentResultMap(plainRows, transaction);
    const resolvedSnapshotByRevisionId = buildResolvedSnapshotByRevisionId(plainRows, snapshotByRevisionId, currentResultByKey);

    return plainRows.map((row) => {
        const id = safeText(row.id_revisi_lka || row.idRevisiLka);
        const enriched = attachSnapshotToRow(row, resolvedSnapshotByRevisionId.get(id) || {});
        const previous = enriched.RevisiSebelumnya || enriched.revisiSebelumnya || enriched.revisi_sebelumnya || null;
        if (!previous)
            return enriched;

        const previousId = safeText(previous.id_revisi_lka || previous.idRevisiLka);
        const enrichedPrevious = attachSnapshotToRow(previous, resolvedSnapshotByRevisionId.get(previousId) || {});

        return {
            ...enriched,
            RevisiSebelumnya: enrichedPrevious,
            revisiSebelumnya: enrichedPrevious,
            revisi_sebelumnya: enrichedPrevious,
        };
    });
};

module.exports = {
    REVISION_SNAPSHOT_ENTITY,
    SNAPSHOT_BEFORE_ACTION,
    SNAPSHOT_AFTER_ACTION,
    logRevisionResultSnapshot,
    logRevisionResultSnapshotFromCurrentResult,
    enrichRevisionRowsWithResultSnapshots,
};
