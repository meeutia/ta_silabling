const { Op } = require('sequelize');
const { Invoice, Payment, Sampel } = require('../../models/Associations');
const RequestStatus = require('../../constants/request-status');
class RequestSampleCodeUtil {
monthToRoman = (month) => {
        const romanMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII' };
        return romanMap[month] || 'I';
    };
    normalizeDateOnly = (value) => {
        if (!value)
            return null;
        if (value instanceof Date)
            return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
        const text = String(value).trim();
        if (!text)
            return null;
        return text.slice(0, 10);
    };
    formatLocalYmd = (dateValue = new Date()) => {
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    formatLocalHms = (dateValue = new Date()) => {
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        const second = String(date.getSeconds()).padStart(2, '0');
        return `${hour}:${minute}:${second}`;
    };
    isPetugasSampling = (value) => {
        return String(value || '').toLowerCase() === 'petugas';
    };
    resolveTanggalPengambilanSampel = ({ itemPayload = {}, payload = {}, request = {}, jadwal = null }) => {
        const explicitDate = itemPayload.tanggal_pengambilan_sampel ||
            itemPayload.tanggalPengambilanSampel ||
            payload.tanggal_pengambilan_sampel ||
            payload.tanggalPengambilanSampel ||
            null;
        if (explicitDate)
            return this.normalizeDateOnly(explicitDate);
        if (this.isPetugasSampling(request.jenis_pengambilan_sampel))
            return this.normalizeDateOnly(jadwal?.tanggal_jadwal);
        return null;
    };
    generateSampleAbbreviation = (jenisSampelName, idJenisSampel = null) => {
        const normalizedId = String(idJenisSampel || '').trim().toUpperCase();
        // Mapping utama mengikuti master jenis_sampel di DB.
        // Ini mencegah kode salah kalau nama jenis sampel berubah labelnya,
        // misalnya JS06 = "Air Higiene Sanitasi (AHS)".
        const sampleAbbreviationById = {
            JS01: 'SG',
            JS02: 'DN',
            JS03: 'LT',
            JS04: 'LMB',
            JS05: 'SPT',
            JS06: 'AHS',
            JS08: 'AM'
        };
        if (sampleAbbreviationById[normalizedId])
            return sampleAbbreviationById[normalizedId];
        if (!jenisSampelName)
            return 'SMP';
        const rawName = String(jenisSampelName).trim();
        // Kalau nama master sudah mencantumkan singkatan resmi di dalam kurung,
        // pakai singkatan itu. Contoh: "Air Higiene Sanitasi (AHS)" -> AHS.
        const acronymMatch = rawName.match(/\(([A-Z0-9]{2,8})\)/i);
        if (acronymMatch?.[1])
            return acronymMatch[1].toUpperCase();
        const normalized = rawName
            .toLowerCase()
            .replace(/\([^)]*\)/g, '')
            .replace(/[^a-z0-9/ ]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const sampleAbbreviationMap = {
            sungai: 'SG',
            'air sungai': 'SG',
            danau: 'DN',
            'air danau': 'DN',
            limbah: 'LMB',
            'air limbah': 'LMB',
            sumur: 'SMR',
            'air sumur': 'SMR',
            'sumur pantau': 'SPT',
            'sumur pantau/tanah': 'SPT',
            'air sumur pantau': 'SPT',
            tanah: 'SPT',
            laut: 'LT',
            'air laut': 'LT',
            'higiene sinitasi': 'AHS',
            'higiene sanitasi': 'AHS',
            'air higiene sinitasi': 'AHS',
            'air higiene sanitasi': 'AHS',
            minum: 'AM',
            'air minum': 'AM'
        };
        return sampleAbbreviationMap[normalized] || 'SMP';
    };
    normalizeSampleCondition = (condition = '') => {
        const value = String(condition).trim().toLowerCase();
        if (value === 'tidak sesuai' || value === 'rusak' || value === 'rejected' || value === 'not suitable')
            return 'Tidak Sesuai';
        return 'Sesuai';
    };
    buildNoSampel = (sequenceNumber, jenisSampelName, dateValue = new Date(), idJenisSampel = null) => {
        const date = dateValue ? new Date(dateValue) : new Date();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const romanMonth = this.monthToRoman(month);
        const sampleCode = this.generateSampleAbbreviation(jenisSampelName, idJenisSampel);
        return `${sequenceNumber}/${sampleCode}/${romanMonth}/${year}`;
    };
    getNextSampleSequence = async (transaction) => {
        const rows = await Sampel.findAll({
            attributes: ['no_sampel'],
            where: {
                no_sampel: { [Op.regexp]: '^[0-9]+/' },
            },
            transaction,
            lock: transaction?.LOCK?.UPDATE,
        });
        const lastSequence = rows
            .map((row) => Number(String(row.no_sampel || '').split('/')[0]))
            .filter((value) => Number.isFinite(value))
            .reduce((max, value) => Math.max(max, value), 0);
        return lastSequence + 1;
    };
    getLatestInvoiceForSampleReceipt = async (idRegistrasi, transaction) => {
        return Invoice.findOne({
            where: { id_registrasi: idRegistrasi },
            include: [{ model: Payment, required: false }],
            order: [['tanggal_invoice', 'DESC'], [Payment, 'id_payment', 'DESC']],
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
    };
    isSettledInvoiceStatus = (status) => {
        return ['Lunas', 'Bayar Nanti'].includes(String(status || '').trim());
    };
    normalizeLegacyPaymentVerificationIfSettled = async (request, transaction) => {
        if (request.status_fppl !== RequestStatus.WAITING_PAYMENT_VERIFICATION) {
            return { invoice: null, normalized: false };
        }
        const invoice = await this.getLatestInvoiceForSampleReceipt(request.id_registrasi, transaction);
        if (invoice && this.isSettledInvoiceStatus(invoice.status_invoice)) {
            const nextWaitingSampleStatus = RequestStatus.getWaitingSampleStatusBySamplingType(request.jenis_pengambilan_sampel);
            await request.update({ status_fppl: nextWaitingSampleStatus }, { transaction });
            request.status_fppl = nextWaitingSampleStatus;
            return { invoice, normalized: true };
        }
        return { invoice, normalized: false };
    };
    assertRequestReadyForSampleReceipt = async (request, transaction) => {
        const legacyNormalization = await this.normalizeLegacyPaymentVerificationIfSettled(request, transaction);
        if (!RequestStatus.isWaitingSampleStatus(request.status_fppl)) {
            if (request.status_fppl === RequestStatus.WAITING_PAYMENT) {
                throw new Error('Sampel belum dapat diterima karena pembayaran belum selesai. Tunggu callback payment gateway atau pilih opsi Bayar Nanti melalui admin terlebih dahulu.');
            }
            if (request.status_fppl === RequestStatus.WAITING_PAYMENT_VERIFICATION) {
                throw new Error('Sampel belum dapat diterima karena data lama masih berstatus verifikasi pembayaran dan invoice belum Lunas/Bayar Nanti. Buat pembayaran Xendit baru atau catat Bayar Nanti dari admin.');
            }
            throw new Error(`Sampel hanya dapat diterima saat status permohonan sudah menunggu pengambilan/pengantaran sampel. Status saat ini: ${request.status_fppl}`);
        }
        const invoice = legacyNormalization.invoice || await this.getLatestInvoiceForSampleReceipt(request.id_registrasi, transaction);
        if (!invoice) {
            throw new Error('Invoice belum tersedia. Sampel belum dapat diterima.');
        }
        const invoiceStatus = String(invoice.status_invoice || '').trim();
        if (this.isSettledInvoiceStatus(invoiceStatus)) {
            return invoice;
        }
        throw new Error(`Sampel belum dapat diterima karena status invoice masih "${invoiceStatus || 'Belum Dibayar'}".`);
    };
}
module.exports = new RequestSampleCodeUtil();
module.exports.RequestSampleCodeUtil = RequestSampleCodeUtil;
