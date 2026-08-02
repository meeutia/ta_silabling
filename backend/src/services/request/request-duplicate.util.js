/**
 * request-duplicate.util.js
 *
 * Helper untuk validasi anti-duplikasi permohonan pengujian.
 * Membandingkan kombinasi data utama permohonan agar permohonan identik
 * yang masih aktif tidak bisa dibuat ulang oleh pelanggan yang sama.
 */

const RequestStatus = require('../../constants/request-status');

/**
 * Daftar status yang dianggap "aktif" — permohonan dengan status ini
 * akan ikut dicek sebagai kandidat duplikat.
 */
const ACTIVE_REQUEST_STATUSES = [
    RequestStatus.WAITING_VERIFICATION,          // Menunggu Verifikasi
    RequestStatus.WAITING_REVISION,              // Perlu Revisi
    RequestStatus.WAITING_PARAMETER,             // Menunggu Penentuan Metode
    RequestStatus.WAITING_PAYMENT,               // Menunggu Pembayaran
    RequestStatus.WAITING_PAYMENT_VERIFICATION,  // Menunggu Verifikasi Pembayaran
    RequestStatus.WAITING_SAMPLE,                // Menunggu Sampel
    RequestStatus.WAITING_SAMPLE_PICKUP,         // Menunggu Pengambilan Sampel
    RequestStatus.WAITING_SAMPLE_DELIVERY,       // Menunggu Pengantaran Sampel
    RequestStatus.TESTING_PROCESS,               // Proses Pengujian
    RequestStatus.WAITING_LHU_SCHEDULING,        // Menunggu Penjadwalan LHU
    RequestStatus.WAITING_LHU_PICKUP,            // Menunggu Pengambilan LHU
];

/**
 * Normalisasi teks sebelum dibandingkan:
 * - lowercase
 * - trim spasi awal/akhir
 * - collapse spasi ganda menjadi satu
 *
 * @param {*} value
 * @returns {string}
 */
function normalizeText(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

/**
 * Normalisasi tanggal menjadi string YYYY-MM-DD.
 * Jika null/undefined, kembalikan string kosong.
 *
 * @param {*} value
 * @returns {string}
 */
function normalizeDate(value) {
    if (!value) return '';
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    } catch {
        return '';
    }
}

/**
 * Menyusun fingerprint dari data permohonan untuk dibandingkan.
 *
 * @param {Object} fppl              - Record Fppl (plain object)
 * @param {Array}  fpplSampels       - Array FpplSampel (plain object)
 * @param {Array}  fpplParamMetodes  - Array FpplParameterMetode (plain object)
 * @returns {Object} fingerprint
 */
function buildDuplicateFingerprint(fppl = {}, fpplSampels = [], fpplParamMetodes = []) {
    // --- Field utama dari FPPL ---
    const idPelanggan = normalizeText(fppl.id_pelanggan);
    const maksudPengujian = normalizeText(fppl.maksud_pengujian);
    const lokasiPengambilan = normalizeText(fppl.lokasi_pengambilan_sampel);
    const jenisPengambilan = normalizeText(fppl.jenis_pengambilan_sampel);
    const tanggalPengambilan = normalizeDate(fppl.tanggal_rencana_pengambilan_sampel);
    const tanggalPengantaran = normalizeDate(fppl.tanggal_rencana_pengantaran_sampel);

    // --- Kombinasi unik jenis sampel + baku mutu (sorted agar urutan tidak mempengaruhi) ---
    const sampelKeys = fpplSampels
        .map((s) => `${normalizeText(s.id_jenis_sampel)}|${normalizeText(s.id_reg_bm)}`)
        .sort();

    // --- Kombinasi unik parameter (sorted) ---
    const paramKeys = fpplParamMetodes
        .map((p) => `${normalizeText(p.id_jenis_sampel)}|${normalizeText(p.id_reg_bm)}|${normalizeText(p.id_parameter)}`)
        .sort();

    return {
        idPelanggan,
        maksudPengujian,
        lokasiPengambilan,
        jenisPengambilan,
        tanggalPengambilan,
        tanggalPengantaran,
        sampelKeys: sampelKeys.join(';;'),
        paramKeys: paramKeys.join(';;'),
    };
}

/**
 * Membandingkan dua fingerprint.
 * Mengembalikan true jika semua komponen utama identik.
 *
 * @param {Object} a
 * @param {Object} b
 * @returns {boolean}
 */
function isDuplicateRequest(a, b) {
    return (
        a.idPelanggan === b.idPelanggan &&
        a.maksudPengujian === b.maksudPengujian &&
        a.lokasiPengambilan === b.lokasiPengambilan &&
        a.jenisPengambilan === b.jenisPengambilan &&
        a.tanggalPengambilan === b.tanggalPengambilan &&
        a.tanggalPengantaran === b.tanggalPengantaran &&
        a.sampelKeys === b.sampelKeys &&
        a.paramKeys === b.paramKeys
    );
}

module.exports = {
    ACTIVE_REQUEST_STATUSES,
    normalizeText,
    normalizeDate,
    buildDuplicateFingerprint,
    isDuplicateRequest,
};
