const { Op } = require('sequelize');
const { FpplParameterMetode, Lka, LkaHasil, Metode, Parameter, ParameterMetode, PenugasanDetail, PenugasanItem, SampelParameter, } = require('../../models/Associations');
const { getLkaHasilReviewStatus, getPlain, isResultApprovedByKasi, pickObject, } = require('./lhu-data-utils');
class LhuApprovedLkaRowsService {
getApprovedLkaRowsForExpectedParameters = async (noSampel, transaction = null) => {
        const sampleNo = String(noSampel || '').trim();
        if (!sampleNo) {
            throw new Error('Nomor sampel wajib dipilih.');
        }
        // Model-only version. Jangan pakai raw SQL di alur QC/LHU.
        // Sumber kebenaran parameter wajib adalah SampelParameter -> FpplParameterMetode.
        const expectedInstances = await SampelParameter.findAll({
            where: { no_sampel: sampleNo },
            include: [
                {
                    model: FpplParameterMetode,
                    as: 'fppl_parameter_metode',
                    required: true,
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
            transaction,
        });
        const expectedRows = expectedInstances
            .map((instance) => {
            const row = getPlain(instance);
            const fpm = pickObject(row, ['fppl_parameter_metode', 'FpplParameterMetode']) || {};
            const parameter = pickObject(fpm, ['parameter', 'Parameter']) || {};
            const parameterMetode = pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
            const metode = pickObject(parameterMetode, ['metode', 'Metode']) || {};
            return {
                noSampel: sampleNo,
                idFpplParameterMetode: fpm.idFpplParameterMetode || fpm.id_fppl_parameter_metode || row.idFpplParameterMetode || row.id_fppl_parameter_metode || null,
                idParameter: fpm.idParameter || fpm.id_parameter || parameter.idParameter || parameter.id_parameter || parameterMetode.idParameter || parameterMetode.id_parameter || null,
                idMetodeParameter: fpm.idMetodeParameter || fpm.id_metode_parameter || parameterMetode.idMetodeParameter || parameterMetode.id_metode_parameter || null,
                isInsitu: fpm.isInsitu ?? fpm.is_insitu ?? 0,
                statusKemampuanLab: fpm.statusKemampuanLab || fpm.status_kemampuan_lab || null,
                isSubkontrak: parameterMetode.isSubkontrak ?? parameterMetode.is_subkontrak ?? 0,
                isSubkontrakSnapshot: parameterMetode.isSubkontrak ?? parameterMetode.is_subkontrak ?? 0,
                namaParameter: parameter.namaParameter || parameter.nama_parameter || '-',
                nama_parameter: parameter.namaParameter || parameter.nama_parameter || '-',
                kategoriParameter: parameter.kategoriParameter || parameter.kategori_parameter || parameter.idKategoriParameter || parameter.id_kategori_parameter || null,
                acuanMetode: parameterMetode.acuanMetode || parameterMetode.acuan_metode || '-',
                acuan_metode: parameterMetode.acuanMetode || parameterMetode.acuan_metode || '-',
                isTerakreditasi: parameterMetode.isTerakreditasi ?? parameterMetode.is_terakreditasi ?? 0,
                namaMetode: metode.namaMetode || metode.nama_metode || '-',
                nama_metode: metode.namaMetode || metode.nama_metode || '-',
            };
        })
            .filter((row) => row.idFpplParameterMetode || row.idMetodeParameter || row.idParameter);
        if (!expectedRows.length) {
            throw new Error(`Belum ada parameter yang terdaftar untuk sampel ${sampleNo}.`);
        }
        // Ambil relasi penugasan lewat model agar mapping id_metode_parameter stabil.
        const assignmentItemInstances = await PenugasanItem.findAll({
            where: { no_sampel: sampleNo },
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
                        {
                            model: Lka,
                            required: false,
                        },
                    ],
                },
            ],
            transaction,
        });
        const assignmentRows = assignmentItemInstances.map((instance) => getPlain(instance));
        const detailById = new Map();
        const detailsByMethodId = new Map();
        assignmentRows.forEach((row) => {
            const detail = pickObject(row, ['penugasan_detail', 'PenugasanDetail']) || {};
            const methodId = String(detail.id_metode_parameter || '').trim();
            const detailId = String(detail.id_penugasan_detail || row.id_penugasan_detail || '').trim();
            if (detailId)
                detailById.set(detailId, detail);
            if (methodId) {
                if (!detailsByMethodId.has(methodId))
                    detailsByMethodId.set(methodId, []);
                detailsByMethodId.get(methodId).push(detail);
            }
        });
        // Ambil hasil LKA approved lewat model. Field statusReviewHasil adalah atribut Sequelize
        // untuk kolom fisik status_review_hasil.
        const resultInstances = await LkaHasil.findAll({
            where: {
                no_sampel: sampleNo,
                statusReviewHasil: 'Disetujui Kasi Pengujian',
                hasil: { [Op.ne]: null },
            },
            include: [
                {
                    model: Lka,
                    required: true,
                    include: [
                        {
                            model: PenugasanDetail,
                            required: false,
                            include: [
                                {
                                    model: ParameterMetode,
                                    required: false,
                                    include: [
                                        { model: Parameter, required: false },
                                        { model: Metode, required: false },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
            transaction,
        });
        const resultRows = resultInstances
            .map((instance) => {
            const row = getPlain(instance);
            const lka = pickObject(row, ['lka', 'Lka']) || {};
            let detail = pickObject(lka, ['penugasan_detail', 'PenugasanDetail']) || {};
            const detailId = String(lka.id_penugasan_detail || detail.id_penugasan_detail || '').trim();
            if ((!detail || !detail.id_penugasan_detail) && detailId && detailById.has(detailId)) {
                detail = detailById.get(detailId);
            }
            const parameterMetode = pickObject(detail, ['parameter_metode', 'ParameterMetode']) || {};
            const parameter = pickObject(parameterMetode, ['parameter', 'Parameter']) || {};
            const metode = pickObject(parameterMetode, ['metode', 'Metode']) || {};
            const statusReview = getLkaHasilReviewStatus(row);
            return {
                kodeLka: row.kodeLka || row.kode_lka,
                kode_lka: row.kodeLka || row.kode_lka,
                noSampel: sampleNo,
                no_sampel: sampleNo,
                hasil: row.hasil,
                catatanHasil: row.catatanHasil || row.catatan_hasil,
                statusReviewHasil: statusReview,
                status_review_hasil: statusReview,
                statusLka: lka.statusLka || lka.status_lka,
                tanggalMulaiPengujian: lka.tanggalMulaiPengujian || lka.tanggal_mulai_pengujian,
                tanggalSelesaiPengujian: lka.tanggalSelesaiPengujian || lka.tanggal_selesai_pengujian,
                idPenugasanDetail: detail.idPenugasanDetail || detail.id_penugasan_detail || lka.idPenugasanDetail || lka.id_penugasan_detail || null,
                id_penugasan_detail: detail.idPenugasanDetail || detail.id_penugasan_detail || lka.idPenugasanDetail || lka.id_penugasan_detail || null,
                idMetodeParameter: detail.idMetodeParameter || detail.id_metode_parameter || parameterMetode.idMetodeParameter || parameterMetode.id_metode_parameter || null,
                id_metode_parameter: detail.idMetodeParameter || detail.id_metode_parameter || parameterMetode.idMetodeParameter || parameterMetode.id_metode_parameter || null,
                idParameter: parameterMetode.idParameter || parameterMetode.id_parameter || parameter.idParameter || parameter.id_parameter || null,
                id_parameter: parameterMetode.idParameter || parameterMetode.id_parameter || parameter.idParameter || parameter.id_parameter || null,
                isSubkontrak: parameterMetode.isSubkontrak ?? parameterMetode.is_subkontrak ?? 0,
                isSubkontrakSnapshot: parameterMetode.isSubkontrak ?? parameterMetode.is_subkontrak ?? 0,
                namaParameter: parameter.namaParameter || parameter.nama_parameter || '-',
                nama_parameter: parameter.namaParameter || parameter.nama_parameter || '-',
                kategoriParameter: parameter.kategoriParameter || parameter.kategori_parameter || parameter.idKategoriParameter || parameter.id_kategori_parameter || null,
                acuanMetode: parameterMetode.acuanMetode || parameterMetode.acuan_metode || '-',
                acuan_metode: parameterMetode.acuanMetode || parameterMetode.acuan_metode || '-',
                isTerakreditasi: parameterMetode.isTerakreditasi ?? parameterMetode.is_terakreditasi ?? 0,
                namaMetode: metode.namaMetode || metode.nama_metode || '-',
                nama_metode: metode.namaMetode || metode.nama_metode || '-',
            };
        })
            .filter((row) => String(row.hasil || '').trim() && isResultApprovedByKasi(row));
        const approvedRows = [];
        const missingRows = [];
        expectedRows.forEach((expected) => {
            const expectedMethodId = String(expected.idMetodeParameter || '').trim();
            const expectedParameterId = String(expected.idParameter || '').trim();
            const candidates = resultRows.filter((row) => {
                const rowMethodId = String(row.idMetodeParameter || '').trim();
                const rowParameterId = String(row.idParameter || '').trim();
                if (expectedMethodId && rowMethodId && expectedMethodId === rowMethodId)
                    return true;
                if (expectedParameterId && rowParameterId && expectedParameterId === rowParameterId)
                    return true;
                return false;
            });
            const result = candidates.sort((a, b) => {
                const aId = Number(String(a.kode_lka || a.kodeLka || '').replace(/\D/g, '')) || 0;
                const bId = Number(String(b.kode_lka || b.kodeLka || '').replace(/\D/g, '')) || 0;
                return bId - aId;
            })[0];
            if (!result) {
                missingRows.push(expected);
                return;
            }
            approvedRows.push({
                ...result,
                idFpplParameterMetode: expected.idFpplParameterMetode || result.idFpplParameterMetode || null,
                idParameter: expected.idParameter || result.idParameter || null,
                idMetodeParameter: expected.idMetodeParameter || result.idMetodeParameter || null,
                isInsitu: expected.isInsitu ?? result.isInsitu ?? 0,
                statusKemampuanLab: expected.statusKemampuanLab || result.statusKemampuanLab || null,
                isSubkontrak: expected.isSubkontrak ?? result.isSubkontrak ?? 0,
                isSubkontrakSnapshot: expected.isSubkontrakSnapshot ?? result.isSubkontrakSnapshot ?? result.isSubkontrak ?? 0,
                namaParameter: expected.namaParameter || result.namaParameter || '-',
                kategoriParameter: expected.kategoriParameter || result.kategoriParameter || null,
                acuanMetode: expected.acuanMetode || result.acuanMetode || '-',
                isTerakreditasi: expected.isTerakreditasi ?? result.isTerakreditasi ?? 0,
                namaMetode: expected.namaMetode || result.namaMetode || '-',
                noSampel: sampleNo,
                no_sampel: sampleNo,
            });
        });
        if (missingRows.length) {
            const names = missingRows
                .map((row) => [row.namaParameter, row.namaMetode || row.acuanMetode]
                .filter(Boolean)
                .join(' - '))
                .filter(Boolean);
            const suffix = names.length ? ` Parameter belum siap: ${names.join(', ')}.` : '';
            throw new Error(`Semua parameter pada sampel ${sampleNo} harus memiliki hasil dan sudah Disetujui Kasi Pengujian.${suffix}`);
        }
        return approvedRows.sort((a, b) => String(a.namaParameter || '').localeCompare(String(b.namaParameter || '')));
    };
}
module.exports = new LhuApprovedLkaRowsService();
module.exports.LhuApprovedLkaRowsService = LhuApprovedLkaRowsService;
