const { buildPaketBmTeksLhu } = require('../../utils/bm-format.util');
class LhuDataUtilsModule {
calculateAccreditationStats = (details = []) => {
        const uniqueMap = new Map();
        (Array.isArray(details) ? details : []).forEach((row, index) => {
            const key = this.getFallbackParameterKey(row) || `row-${index}`;
            if (!uniqueMap.has(key))
                uniqueMap.set(key, row);
        });
        const uniqueRows = Array.from(uniqueMap.values());
        const totalParameter = uniqueRows.length;
        const totalTerakreditasi = uniqueRows.filter((row) => Number(row.is_terakreditasi || row.isTerakreditasi || 0) === 1).length;
        const persentase = totalParameter > 0
            ? Number(((totalTerakreditasi / totalParameter) * 100).toFixed(2))
            : 0;
        return {
            totalParameter,
            totalTerakreditasi,
            persentase,
            showLogoKan: persentase >= 60,
        };
    };
    getPlain = (instance) => {
        return instance ? instance.get({ plain: true }) : null;
    };
    pickObject = (source, keys = []) => {
        for (const key of keys) {
            if (source?.[key])
                return source[key];
        }
        return null;
    };
    pickArray = (source, keys = []) => {
        for (const key of keys) {
            if (Array.isArray(source?.[key]))
                return source[key];
        }
        return [];
    };
    getAssociatedFpmsFromSample = (sample = {}) => {
        return this.pickArray(sample, [
            'parameter_metodes',
            'ParameterMetodes',
            'fppl_parameter_metodes',
            'FpplParameterMetodes',
            'FpplParameterMetode',
        ]);
    };
    getMethodIdFromFpm = (fpm = {}) => {
        const parameterMetode = this.pickObject(fpm, ['parameter_metode', 'ParameterMetode']) || {};
        return String(fpm.id_metode_parameter ||
            fpm.idMetodeParameter ||
            parameterMetode.id_metode_parameter ||
            parameterMetode.idMetodeParameter ||
            '').trim();
    };
    getMethodIdFromDetail = (detail = {}) => {
        const directParameterMetode = this.pickObject(detail, ['parameter_metode', 'ParameterMetode']) || {};
        const fpm = this.pickObject(detail, ['fppl_parameter_metode', 'FpplParameterMetode']) || {};
        return String(detail.id_metode_parameter ||
            directParameterMetode.id_metode_parameter ||
            fpm.id_metode_parameter ||
            '').trim();
    };
    firstDate = (values = []) => {
        return values.find(Boolean) || null;
    };
    toDateOnly = (value) => {
        if (!value)
            return null;
        if (typeof value === 'string') {
            const match = value.match(/^\d{4}-\d{2}-\d{2}/);
            if (match)
                return match[0];
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime()))
            return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    buildAcuanBmSnapshot = (pktBm = {}) => {
        return buildPaketBmTeksLhu(pktBm);
    };
    getLkaHasilTargetKey = (row = {}) => {
        const kode = String(row.kode_lka || row.kodeLka || '').trim();
        const noSampel = String(row.no_sampel || row.noSampel || '').trim();
        return kode && noSampel ? `${kode}|${noSampel}` : '';
    };
    getFpplParameterMetodeKey = (row = {}) => {
        return String(row.id_fppl_parameter_metode ||
            row.idFpplParameterMetode ||
            row.id_fppl_pm ||
            row.idFpplPm ||
            '').trim();
    };
    getParameterMethodKey = (row = {}) => {
        return String(row.id_metode_parameter ||
            row.idMetodeParameter ||
            row.id_parameter_metode ||
            row.idParameterMetode ||
            '').trim();
    };
    getFallbackParameterKey = (row = {}) => {
        const explicitKey = String(row.detail_key || row.detailKey || row.key || '').trim();
        if (explicitKey)
            return explicitKey;
        const fpplParameterMetodeKey = this.getFpplParameterMetodeKey(row);
        if (fpplParameterMetodeKey)
            return fpplParameterMetodeKey;
        const methodKey = this.getParameterMethodKey(row);
        if (methodKey)
            return methodKey;
        return [
            row.id_parameter || row.idParameter,
            row.nama_parameter_snapshot || row.namaParameterSnapshot || row.nama_parameter || row.namaParameter,
            row.metode_snapshot || row.metodeSnapshot || row.nama_metode || row.namaMetode || row.metode,
            row.acuan_metode_snapshot || row.acuanMetodeSnapshot || row.acuan_metode || row.acuanMetode,
        ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean).join('|');
    };
    compareText = (a, b) => {
        return String(a || '').localeCompare(String(b || ''), 'id', {
            sensitivity: 'base',
            numeric: true,
        });
    };
    getDetailSortText = (row = {}, keys = []) => {
        for (const key of keys) {
            const value = row?.[key];
            if (value !== null && value !== undefined && String(value).trim() !== '') {
                return String(value).trim();
            }
        }
        return '';
    };
    compareDetailRowsForLhu = (a = {}, b = {}) => {
        const kategoriCompare = this.compareText(
            this.getDetailSortText(a, ['kategori_parameter', 'kategoriParameter', 'kategori_parameter_snapshot', 'kategoriParameterSnapshot']),
            this.getDetailSortText(b, ['kategori_parameter', 'kategoriParameter', 'kategori_parameter_snapshot', 'kategoriParameterSnapshot'])
        );
        if (kategoriCompare)
            return kategoriCompare;
        const parameterCompare = this.compareText(
            this.getDetailSortText(a, ['nama_parameter_snapshot', 'namaParameterSnapshot', 'nama_parameter', 'namaParameter']),
            this.getDetailSortText(b, ['nama_parameter_snapshot', 'namaParameterSnapshot', 'nama_parameter', 'namaParameter'])
        );
        if (parameterCompare)
            return parameterCompare;
        const metodeCompare = this.compareText(
            this.getDetailSortText(a, ['metode_snapshot', 'metodeSnapshot', 'nama_metode', 'namaMetode', 'metode']),
            this.getDetailSortText(b, ['metode_snapshot', 'metodeSnapshot', 'nama_metode', 'namaMetode', 'metode'])
        );
        if (metodeCompare)
            return metodeCompare;
        return this.compareText(this.getFallbackParameterKey(a), this.getFallbackParameterKey(b));
    };
    getDetailOrderDescriptor = (row = {}) => {
        return {
            key: this.getFallbackParameterKey(row),
            detailKey: row.detailKey || row.detail_key || row.key || null,
            idFpplParameterMetode: row.idFpplParameterMetode || row.id_fppl_parameter_metode || null,
            idMetodeParameter: row.idMetodeParameter || row.id_metode_parameter || row.idParameterMetode || row.id_parameter_metode || null,
            idParameter: row.idParameter || row.id_parameter || null,
            namaParameter: row.namaParameterSnapshot || row.nama_parameter_snapshot || row.namaParameter || row.nama_parameter || null,
            metode: row.metodeSnapshot || row.metode_snapshot || row.namaMetode || row.nama_metode || row.metode || null,
            acuanMetode: row.acuanMetodeSnapshot || row.acuan_metode_snapshot || row.acuanMetode || row.acuan_metode || null,
        };
    };
    getDetailOrderCandidateKeys = (row = {}) => {
        const descriptor = this.getDetailOrderDescriptor(row);
        const textKey = [descriptor.namaParameter, descriptor.metode, descriptor.acuanMetode]
            .map((value) => String(value || '').trim().toLowerCase())
            .filter(Boolean)
            .join('|');
        return [
            descriptor.detailKey,
            descriptor.key,
            descriptor.idFpplParameterMetode,
            descriptor.idMetodeParameter,
            descriptor.idParameter,
            textKey,
        ]
            .map((value) => String(value || '').trim())
            .filter(Boolean);
    };
    normalizeDetailOrderInput = (detailOrder = []) => {
        const items = Array.isArray(detailOrder) ? detailOrder : String(detailOrder || '').split(/[,\n]+/);
        const keys = [];
        items.forEach((item) => {
            if (item && typeof item === 'object') {
                keys.push(...this.getDetailOrderCandidateKeys(item));
                return;
            }
            const text = String(item || '').trim();
            if (text)
                keys.push(text);
        });
        const seen = new Set();
        return keys.filter((key) => {
            const normalized = key.toLowerCase();
            if (!normalized || seen.has(normalized))
                return false;
            seen.add(normalized);
            return true;
        });
    };
    sortDetailRowsForLhu = (rows = []) => {
        return (Array.isArray(rows) ? [...rows] : [])
            .sort(this.compareDetailRowsForLhu)
            .map((row, index) => ({
                ...row,
                // Kolom urutan_lhu tidak lagi disimpan di tabel detail_lhu.
                // Nilai ini hanya urutan virtual untuk tampilan dan generate PDF.
                urutanLhu: index + 1,
            }));
    };
    applyDetailOrder = (rows = [], detailOrder = []) => {
        const defaultRows = this.sortDetailRowsForLhu(rows);
        const orderKeys = this.normalizeDetailOrderInput(detailOrder);
        if (!orderKeys.length)
            return defaultRows;
        const orderIndexByKey = new Map(orderKeys.map((key, index) => [key.toLowerCase(), index]));
        const matched = [];
        const unmatched = [];
        defaultRows.forEach((row, defaultIndex) => {
            const candidateKeys = this.getDetailOrderCandidateKeys(row);
            const matchedIndex = candidateKeys
                .map((key) => orderIndexByKey.get(String(key).toLowerCase()))
                .find((index) => Number.isInteger(index));
            const data = { ...row, __matchedOrderIndex: matchedIndex, __defaultIndex: defaultIndex };
            if (Number.isInteger(matchedIndex))
                matched.push(data);
            else
                unmatched.push(data);
        });
        return [...matched.sort((a, b) => a.__matchedOrderIndex - b.__matchedOrderIndex || a.__defaultIndex - b.__defaultIndex), ...unmatched]
            .map(({ __matchedOrderIndex, __defaultIndex, ...row }, index) => ({
                ...row,
                urutanLhu: index + 1,
            }));
    };
    toTinyIntFlag = (value) => {
        if (value === true || value === 1)
            return 1;
        const text = String(value ?? '').trim().toLowerCase();
        return text === '1' || text === 'true' || text === 'yes' ? 1 : 0;
    };
    getSubkontrakSnapshot = (resultRow = {}) => {
        // Untuk LHU/QC, simbol subkontrak (**) mengikuti master parameter_metode.is_subkontrak.
        // status_kemampuan_lab tidak dipakai sebagai sumber simbol karena itu konteks kemampuan FPPL,
        // bukan definisi tampilan parameter-metode pada LHU.
        return this.toTinyIntFlag(resultRow.is_subkontrak_snapshot ??
            resultRow.isSubkontrakSnapshot ??
            resultRow.is_subkontrak ??
            resultRow.isSubkontrak);
    };
    getLkaHasilReviewStatus = (row = {}) => {
        return row.status_review_hasil || row.statusReviewHasil || null;
    };
    isResultApprovedByKasi = (row = {}) => {
        const statusReview = String(this.getLkaHasilReviewStatus(row) || '').trim();
        // QC hanya boleh menerima hasil yang benar-benar sudah diverifikasi Kasi Pengujian.
        // Status level LKA atau status Disetujui Penyelia tidak boleh dipakai sebagai pengganti,
        // karena itu masih belum melewati approval akhir Kasi Pengujian.
        return statusReview === 'Disetujui Kasi Pengujian';
    };
    getScheduleCreatedTime = (row = {}) => {
        const createdCandidates = [row.dibuat_pada, row.created_at, row.createdAt, row.updated_at, row.updatedAt];
        for (const value of createdCandidates) {
            if (!value)
                continue;
            const time = new Date(value).getTime();
            if (!Number.isNaN(time))
                return time;
        }
        return 0;
    };
    getScheduleDateTime = (row = {}) => {
        const time = new Date(`${row.tanggal_jadwal || '1900-01-01'} ${row.jam_jadwal || '00:00:00'}`).getTime();
        return Number.isNaN(time) ? 0 : time;
    };
    getScheduleIdOrder = (row = {}) => {
        const numeric = String(row.id_jadwal || '').match(/\d+/g)?.join('');
        return Number(numeric || 0);
    };
    getActiveJadwalFromFppl = (fppl = {}) => {
        const rows = this.pickArray(fppl, ['jadwal_sampels', 'JadwalSampels', 'jadwalSampel', 'jadwalSampels']);
        return rows
            .filter((row) => String(row?.status_jadwal || '').trim().toLowerCase() !== 'dibatalkan')
            .sort((a, b) => (this.getScheduleCreatedTime(b) - this.getScheduleCreatedTime(a) ||
            this.getScheduleIdOrder(b) - this.getScheduleIdOrder(a) ||
            this.getScheduleDateTime(b) - this.getScheduleDateTime(a)))[0] || null;
    };
}
module.exports = new LhuDataUtilsModule();
module.exports.LhuDataUtilsModule = LhuDataUtilsModule;
