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
    applyDetailOrder = (rows = [], orderPayload = []) => {
        const orderMap = new Map();
        (Array.isArray(orderPayload) ? orderPayload : []).forEach((item, index) => {
            const key = this.getFallbackParameterKey(item);
            if (!key || orderMap.has(key))
                return;
            const rawOrder = Number(item?.urutanLhu || item?.urutan_lhu || item?.order || item?.urutan);
            orderMap.set(key, Number.isFinite(rawOrder) && rawOrder > 0 ? rawOrder : index + 1);
        });
        return rows
            .map((row, index) => ({
            ...row,
            urutan_lhu: orderMap.get(this.getFallbackParameterKey(row)) || row.urutan_lhu || index + 1,
        }))
            .sort((a, b) => Number(a.urutan_lhu || 0) - Number(b.urutan_lhu || 0) ||
            String(a.nama_parameter_snapshot || a.nama_parameter || '').localeCompare(String(b.nama_parameter_snapshot || b.nama_parameter || '')));
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
