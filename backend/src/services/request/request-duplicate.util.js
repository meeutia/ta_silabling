/**
 * request-duplicate.util.js
 *
 * Helper untuk validasi anti-duplikasi permohonan pengujian.
 * Membandingkan kombinasi data utama permohonan agar permohonan identik
 * yang masih aktif tidak bisa dibuat ulang oleh pelanggan yang sama.
 */

const crypto = require('crypto');
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
 * - unicode normalization (NFKC)
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
        .normalize('NFKC')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

/**
 * Normalisasi nama instansi/perusahaan.
 * - Tetap mempertahankan awalan badan usaha seperti pt, cv, dll.
 * - Menghilangkan tanda titik pada awalan (pt. -> pt)
 * - Penggunaan NIB/NPWP akan lebih akurat di masa depan.
 * 
 * @param {*} value 
 * @returns {string}
 */
function normalizeCompanyName(value) {
    let name = normalizeText(value);
    
    // Normalisasi awalan umum badan usaha: buang titik.
    // Misalnya "pt. sinar" -> "pt sinar", "cv. jaya" -> "cv jaya"
    name = name.replace(/^(pt|cv|ud|pd|fa|yayasan|koperasi)\s*\.\s*/, '$1 ');
    
    // Hapus sisa titik atau koma yang tidak membedakan identitas utama
    name = name.replace(/[.,]/g, ' ');
    
    // Collapse spasi lagi setelah penghapusan
    return name.replace(/\s+/g, ' ').trim();
}

/**
 * Normalisasi lokasi.
 * - Menyamakan titik, koma, singkatan (jl., jl, jln -> jl)
 * 
 * @param {*} value 
 * @returns {string}
 */
function normalizeSamplingLocation(value) {
    let location = normalizeText(value);
    
    // Hapus titik dan koma
    location = location.replace(/[.,]/g, ' ');
    
    // Standarisasi "jalan" atau "jln" menjadi "jl"
    location = location.replace(/\b(jalan|jln)\b/g, 'jl');
    
    // Standarisasi "nomor" menjadi "no"
    location = location.replace(/\b(nomor)\b/g, 'no');
    
    return location.replace(/\s+/g, ' ').trim();
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
 * Normalisasi jam menjadi HH:mm.
 *
 * @param {*} value
 * @returns {string}
 */
function normalizeTime(value) {
    const text = normalizeText(value);
    if (!text) return '';
    
    // Cocokkan pola HH:mm atau HH:mm:ss
    const match = text.match(/^(\d{2}):(\d{2})/);
    if (match) {
        return `${match[1]}:${match[2]}`;
    }
    return '';
}

/**
 * Menyusun fingerprint dari data permohonan untuk dibandingkan.
 * Tidak menggunakan id_pelanggan sebagai komponen.
 *
 * @param {string} companyName       - Nama instansi/perusahaan
 * @param {Object} fppl              - Record Fppl (plain object)
 * @param {Array}  fpplSampels       - Array FpplSampel (plain object)
 * @param {Array}  fpplParamMetodes  - Array FpplParameterMetode (plain object)
 * @returns {Object} fingerprint
 */
function buildDuplicateFingerprint(companyName, fppl = {}, fpplSampels = [], fpplParamMetodes = []) {
    const companyKey = normalizeCompanyName(companyName);
    const lokasiPengambilan = normalizeSamplingLocation(fppl.lokasi_pengambilan_sampel);
    const jenisPengambilan = normalizeText(fppl.jenis_pengambilan_sampel);
    const tanggalPengambilan = normalizeDate(fppl.tanggal_rencana_pengambilan_sampel);
    const jamPengambilan = normalizeTime(fppl.jam_rencana_pengambilan_sampel);
    const tanggalPengantaran = normalizeDate(fppl.tanggal_rencana_pengantaran_sampel);

    // Filter data tidak valid dan buat unique key
    const validSampels = fpplSampels.filter(s => {
        const js = s.id_jenis_sampel || s.idJenisSampel;
        const bm = s.id_reg_bm || s.idRegBm;
        return js && bm;
    });

    const validParams = fpplParamMetodes.filter(p => {
        const js = p.id_jenis_sampel || p.idJenisSampel;
        const bm = p.id_reg_bm || p.idRegBm;
        const param = p.id_parameter || p.idParameter;
        return js && bm && param;
    });

    // Sampel Key: JS|BM|JUMLAH — mencakup jenis air, standar baku mutu, dan jumlah sampel
    const sampelKeysSet = new Set(
        validSampels.map(s => {
            const js = normalizeText(s.id_jenis_sampel || s.idJenisSampel);
            const bm = normalizeText(s.id_reg_bm || s.idRegBm);
            const qty = parseInt(s.jumlah_sampel || s.jumlahSampel, 10) || 1;
            return `${js}|${bm}|${qty}`;
        })
    );
    const sampelKeys = Array.from(sampelKeysSet).sort();

    // Param Key: JS|BM|PARAM — mencakup parameter uji per jenis sampel dan standar
    const paramKeysSet = new Set(
        validParams.map(p => {
            const js = normalizeText(p.id_jenis_sampel || p.idJenisSampel);
            const bm = normalizeText(p.id_reg_bm || p.idRegBm);
            const param = normalizeText(p.id_parameter || p.idParameter);
            return `${js}|${bm}|${param}`;
        })
    );
    const parameterKeys = Array.from(paramKeysSet).sort();

    return {
        companyKey,
        lokasiPengambilan,
        jenisPengambilan,
        schedule: {
            tanggalPengambilan,
            jamPengambilan,
            tanggalPengantaran,
        },
        // Komposisi sampel: jenis air + standar + jumlah + parameter
        sampelKeys,
        parameterKeys,
    };
}

/**
 * Serialize fingerprint menjadi string yang bisa di-hash.
 * Hanya melibatkan komponen substansial (identitas utama duplikasi).
 * Jadwal tidak dimasukkan sebagai pembeda utama duplikasi agar
 * perubahan kecil jam/tanggal tidak otomatis lolos jika masih aktif.
 * Aturan bisnis: Jadwal hanya metadata, bukan pembeda identitas utama
 * dari kegiatan pengujian yang sama untuk perusahaan yang sama.
 * 
 * @param {Object} fingerprint 
 * @returns {string}
 */
function serializeDuplicateFingerprint(fingerprint) {
    const data = {
        companyKey: fingerprint.companyKey,
        lokasiPengambilan: fingerprint.lokasiPengambilan,
        jenisPengambilan: fingerprint.jenisPengambilan,
        schedule: fingerprint.schedule,
        // Komposisi pengujian: jenis air, standar, jumlah, dan parameter
        sampelKeys: fingerprint.sampelKeys || [],
        parameterKeys: fingerprint.parameterKeys || [],
    };
    return JSON.stringify(data);
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
    if (!a || !b) return false;

    // Bandingkan data dasar (perusahaan, lokasi, jenis pengambilan, jadwal)
    if (a.companyKey !== b.companyKey) return false;
    if (a.lokasiPengambilan !== b.lokasiPengambilan) return false;
    if (a.jenisPengambilan !== b.jenisPengambilan) return false;

    const scheduleA = JSON.stringify(a.schedule || {});
    const scheduleB = JSON.stringify(b.schedule || {});
    if (scheduleA !== scheduleB) return false;

    // Bandingkan komposisi sampel (jenis air + standar + jumlah)
    // hanya jika kedua sisi memiliki data sampel
    const sampelA = (a.sampelKeys || []).slice().sort();
    const sampelB = (b.sampelKeys || []).slice().sort();
    if (sampelA.length > 0 && sampelB.length > 0) {
        if (JSON.stringify(sampelA) !== JSON.stringify(sampelB)) return false;
    }

    // Bandingkan komposisi parameter
    // hanya jika kedua sisi memiliki data parameter
    const paramA = (a.parameterKeys || []).slice().sort();
    const paramB = (b.parameterKeys || []).slice().sort();
    if (paramA.length > 0 && paramB.length > 0) {
        if (JSON.stringify(paramA) !== JSON.stringify(paramB)) return false;
    }

    return true;
}

module.exports = {
    ACTIVE_REQUEST_STATUSES,
    normalizeText,
    normalizeCompanyName,
    normalizeSamplingLocation,
    normalizeDate,
    normalizeTime,
    buildDuplicateFingerprint,
    serializeDuplicateFingerprint,
    isDuplicateRequest,
};
