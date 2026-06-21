const { getFallbackParameterKey, getSubkontrakSnapshot, isResultApprovedByKasi, sortDetailRowsForLhu, toDateOnly, toTinyIntFlag, } = require('./lhu-data-utils');
class LhuDetailRowMapper {
normalizeBmText = (value) => {
        if (value === null || value === undefined)
            return null;
        const text = String(value).trim();
        if (!text)
            return null;
        return text;
    };
    normalizeNilaiBmForLhu = (value) => {
        const text = this.normalizeBmText(value);
        if (!text || text === '-' || text === '(-)')
            return '(-)';
        return text;
    };
    normalizeSampleNoKey = (value) => String(value || '').trim().replace(/\s*\/\s*/g, '/').toLowerCase();
    pushSampleNoOnce = (group, noSampel) => {
        const value = String(noSampel || '').trim();
        if (!value)
            return;
        if (!group.__sampleNoKeySet)
            group.__sampleNoKeySet = new Set((group.samples || []).map((sampleNo) => this.normalizeSampleNoKey(sampleNo)));
        const key = this.normalizeSampleNoKey(value);
        if (group.__sampleNoKeySet.has(key))
            return;
        group.__sampleNoKeySet.add(key);
        group.samples.push(value);
    };
    findApprovedResultForExpectedParameter = (expected = {}, resultRows = []) => {
        const expectedFpmId = String(expected.id_fppl_parameter_metode || '').trim();
        const expectedMethodId = String(expected.id_metode_parameter || '').trim();
        const expectedParameterId = String(expected.id_parameter || '').trim();
        const candidates = (Array.isArray(resultRows) ? resultRows : []).filter((row) => {
            const rowFpmId = String(row.id_fppl_parameter_metode || row.idFpplParameterMetode || '').trim();
            const rowMethodId = String(row.id_metode_parameter || row.idMetodeParameter || '').trim();
            const rowParameterId = String(row.id_parameter || row.idParameter || '').trim();
            if (expectedFpmId && rowFpmId && expectedFpmId === rowFpmId)
                return true;
            if (expectedMethodId && rowMethodId && expectedMethodId === rowMethodId)
                return true;
            if (expectedParameterId && rowParameterId && expectedParameterId === rowParameterId)
                return true;
            return false;
        });
        const approvedCandidates = candidates.filter((row) => isResultApprovedByKasi(row) && String(row.hasil || '').trim());
        if (!approvedCandidates.length)
            return null;
        return approvedCandidates.sort((a, b) => {
            const aId = Number(String(a.kode_lka || a.kodeLka || '').replace(/\D/g, '')) || 0;
            const bId = Number(String(b.kode_lka || b.kodeLka || '').replace(/\D/g, '')) || 0;
            return bId - aId;
        })[0];
    };
    mapDetailRow = (resultRow, bmInfo, sample = {}) => {
        const parameterId = resultRow.idParameter || resultRow.id_parameter;
        const bm = bmInfo.map.get(parameterId) || null;
        const adaDiBm = Boolean(bm);
        const nilaiBm = this.normalizeNilaiBmForLhu(bm?.nilaiBm ?? bm?.nilai_bm);
        const satuanBm = this.normalizeBmText(bm?.satuanBm ?? bm?.satuan_bm);
        const data = {
            nomorLhu: null,
            noSampel: resultRow.noSampel || resultRow.no_sampel,
            kodeLka: resultRow.kodeLka || resultRow.kode_lka || null,
            idFpplParameterMetode: resultRow.idFpplParameterMetode || resultRow.id_fppl_parameter_metode || null,
            idParameter: parameterId || null,
            idMetodeParameter: resultRow.idMetodeParameter || resultRow.id_metode_parameter || null,
            namaParameter: resultRow.namaParameter || resultRow.nama_parameter,
            metode: resultRow.namaMetode || resultRow.nama_metode || resultRow.metode,
            acuanMetode: resultRow.acuanMetode || resultRow.acuan_metode,
            hasil: resultRow.hasil,
            isTerakreditasi: toTinyIntFlag(resultRow.isTerakreditasi ?? resultRow.is_terakreditasi),
            bm: nilaiBm,
            satuanBm,
            adaDiBm: adaDiBm ? 1 : 0,
            isInsitu: toTinyIntFlag(resultRow.isInsitu ?? resultRow.is_insitu),
            isInsituSnapshot: toTinyIntFlag(resultRow.isInsitu ?? resultRow.is_insitu),
            isSubkontrak: getSubkontrakSnapshot(resultRow),
            isSubkontrakSnapshot: getSubkontrakSnapshot(resultRow),
            tanggalSampling: toDateOnly(sample?.tanggalPengambilanSampel || sample?.tanggal_pengambilan_sampel),
            nilaiBm,
            catatanHasil: resultRow.catatanHasil || resultRow.catatan_hasil || null,
        };
        const detailKey = getFallbackParameterKey(data);
        return {
            ...data,
            detailKey,
        };
    };
    groupLhuDetailRowsByParameter = (rows = []) => {
        const map = new Map();
        (Array.isArray(rows) ? rows : []).forEach((row, index) => {
            const key = getFallbackParameterKey(row) || `row-${index}`;
            if (!map.has(key)) {
                map.set(key, {
                    ...row,
                    noSampel: null,
                    kodeLka: null,
                    samples: [],
                    resultsBySample: {},
                    kodeLkaBySample: {},
                });
            }
            const group = map.get(key);
            const noSampel = String(row.noSampel || row.no_sampel || '').trim();
            if (!noSampel)
                return;
            group.resultsBySample[noSampel] = row.hasil || row.hasilSnapshot || row.hasil_snapshot || null;
            group.kodeLkaBySample[noSampel] = row.kodeLka || row.kode_lka || null;
            this.pushSampleNoOnce(group, noSampel);
            group.hasil = group.samples
                .map((sampleNo) => `${sampleNo}: ${group.resultsBySample[sampleNo] || '-'}`)
                .join('\n');
            group.hasilSnapshot = group.hasil;
        });
        const groupedRows = Array.from(map.values()).map((row) => {
            const { __sampleNoKeySet, ...data } = row;
            return data;
        });
        groupedRows.sort((a, b) => {
            const orderA = Number(a.urutanLhu || a.urutan_lhu) || 99999;
            const orderB = Number(b.urutanLhu || b.urutan_lhu) || 99999;
            return orderA - orderB;
        });
        return groupedRows;
    };
}
module.exports = new LhuDetailRowMapper();
module.exports.LhuDetailRowMapper = LhuDetailRowMapper;
