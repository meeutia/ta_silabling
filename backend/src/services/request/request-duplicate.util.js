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

    // Sampel Key: JS|BM|JUMLAH
    const sampelKeysSet = new Set(
        validSampels.map(s => {
            const js = normalizeText(s.id_jenis_sampel || s.idJenisSampel);
            const bm = normalizeText(s.id_reg_bm || s.idRegBm);
            const qty = parseInt(s.jumlah_sampel || s.jumlahSampel, 10) || 1;
            return `${js}|${bm}|${qty}`;
        })
    );
    const sampelKeys = Array.from(sampelKeysSet).sort();

    // Param Key: JS|BM|PARAM
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
    
    const strA = serializeDuplicateFingerprint(a);
    const strB = serializeDuplicateFingerprint(b);
    
    return strA === strB;
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
