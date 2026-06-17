const { LkaRevisi, User, } = require('../../models/Associations');
const { enrichRevisionRowsWithResultSnapshots } = require('./assignment-revision-snapshot.helper');
const { getPlain, pickObject } = require('./assignment-object.helper');
class AssignmentWorksheetRevisionHistoryHelper {
loadRevisionRowsForLka = async (kodeLka, transaction = null) => {
        const kode = String(kodeLka || '').trim();
        if (!kode)
            return [];
        const rows = await LkaRevisi.findAll({
            where: { kode_lka: kode },
            include: [
                { model: LkaRevisi, as: 'RevisiSebelumnya', required: false },
            ],
            order: [
                ['diajukan_pada', 'ASC'],
                ['no_sampel', 'ASC'],
            ],
            transaction: transaction || undefined,
        });
        return enrichRevisionRowsWithResultSnapshots(rows, transaction);
    };
    getLkaRevisionHistory = async (kodeLka) => {
        const kode = String(kodeLka || '').trim();
        if (!kode)
            throw new Error('Kode LKA wajib dikirim.');
        const rows = await LkaRevisi.findAll({
            where: { kode_lka: kode },
            include: [
                { model: User, as: 'PengajuRevisi', required: false, attributes: ['nik', 'username'] },
                { model: User, as: 'PeninjauRevisi', required: false, attributes: ['nik', 'username'] },
                { model: LkaRevisi, as: 'RevisiSebelumnya', required: false },
            ],
            order: [
                ['diajukan_pada', 'ASC'],
                ['id_revisi_lka', 'ASC'],
                ['no_sampel', 'ASC'],
            ],
        });
        const enrichedRows = await enrichRevisionRowsWithResultSnapshots(rows);
        return enrichedRows.map((row) => {
            const items = row.no_sampel ? [{
                kodeLka: row.kode_lka || null,
                kode_lka: row.kode_lka || null,
                noSampel: row.no_sampel || null,
                no_sampel: row.no_sampel || null,
                statusRevisi: row.status_revisi || null,
                status_revisi: row.status_revisi || null,
                catatanRevisi: row.catatan_revisi || null,
                catatan_revisi: row.catatan_revisi || null,
            }] : [];
            const pengaju = pickObject(row, ['PengajuRevisi']) || {};
            const peninjau = pickObject(row, ['PeninjauRevisi']) || {};
            return {
                idRevisiLka: row.id_revisi_lka,
                id_revisi_lka: row.id_revisi_lka,
                idRevisiSebelumnya: row.id_revisi_sebelumnya || null,
                id_revisi_sebelumnya: row.id_revisi_sebelumnya || null,
                revisiSebelumnya: pickObject(row, ['RevisiSebelumnya']) || null,
                revisi_sebelumnya: pickObject(row, ['RevisiSebelumnya']) || null,
                kodeLka: row.kode_lka,
                kode_lka: row.kode_lka,
                sumberRevisi: row.sumber_revisi,
                sumber_revisi: row.sumber_revisi,
                levelRevisi: row.level_revisi,
                level_revisi: row.level_revisi,
                catatanRevisi: row.catatan_revisi || null,
                catatan_revisi: row.catatan_revisi || null,
                diajukanOleh: row.diajukan_oleh,
                diajukan_oleh: row.diajukan_oleh,
                diajukanOlehNama: pengaju.username || row.diajukan_oleh || null,
                diajukan_oleh_nama: pengaju.username || row.diajukan_oleh || null,
                diajukanPada: row.diajukan_pada,
                diajukan_pada: row.diajukan_pada,
                statusRevisi: row.status_revisi,
                status_revisi: row.status_revisi,
                ditinjauOleh: row.ditinjau_oleh || null,
                ditinjau_oleh: row.ditinjau_oleh || null,
                ditinjauOlehNama: peninjau.username || row.ditinjau_oleh || null,
                ditinjau_oleh_nama: peninjau.username || row.ditinjau_oleh || null,
                ditinjauPada: row.ditinjau_pada || null,
                ditinjau_pada: row.ditinjau_pada || null,
                catatanTinjauan: row.catatan_tinjauan || null,
                catatan_tinjauan: row.catatan_tinjauan || null,
                items,
                revisi_items: items,
            };
        });
    };
}
module.exports = new AssignmentWorksheetRevisionHistoryHelper();
module.exports.AssignmentWorksheetRevisionHistoryHelper = AssignmentWorksheetRevisionHistoryHelper;
