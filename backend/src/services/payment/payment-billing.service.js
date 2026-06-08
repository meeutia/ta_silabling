const { Fppl, Pelanggan, FpplSampel, FpplParameterMetode, JenisSampel, RegBm, ParameterMetode, Parameter, Metode, TarifPengambilan, Invoice, InvoiceItem, Payment, } = require('../../models/Associations');
const { generateId } = require('../../utils/id-generator');
const WorkflowLogService = require('../workflow/workflow-log.service');
const { INTERNAL_PAYMENT_METHOD, deriveCustomerDecisionStatus, getLatestPaymentRow, normalizeAmount, resolvePaymentMethod, } = require('./payment-policy.util');
const { buildPaymentGatewayPayload, } = require('./payment-session-payload.util');

const sameFpplSampelComposite = (a = {}, b = {}) => {
    const pick = (row, snake, camel) => String(row?.[snake] ?? row?.[camel] ?? '').trim();
    return pick(a, 'id_registrasi', 'idRegistrasi') === pick(b, 'id_registrasi', 'idRegistrasi') &&
        pick(a, 'id_jenis_sampel', 'idJenisSampel') === pick(b, 'id_jenis_sampel', 'idJenisSampel') &&
        pick(a, 'id_reg_bm', 'idRegBm') === pick(b, 'id_reg_bm', 'idRegBm');
};
const filterFpplSampelCompositeChildren = (row = {}) => {
    if (!row || typeof row !== 'object') {
        return row;
    }
    ['fppl_parameter_metodes', 'FpplParameterMetodes', 'fpplParameterMetodes', 'sampels', 'Sampels'].forEach((key) => {
        if (Array.isArray(row[key])) {
            row[key] = row[key].filter((child) => sameFpplSampelComposite(child, row));
        }
    });
    return row;
};
const normalizeRequestFpplSampelGraph = (requestJson = {}) => {
    ['fppl_sampels', 'FpplSampels', 'fpplSampels'].forEach((key) => {
        if (Array.isArray(requestJson[key])) {
            requestJson[key] = requestJson[key].map(filterFpplSampelCompositeChildren);
        }
    });
    return requestJson;
};
class PaymentBillingService {
toDateOnlyString = (value) => {
        if (!value)
            return null;
        if (typeof value === 'string') {
            return value.slice(0, 10);
        }
        if (value instanceof Date) {
            return value.toISOString().slice(0, 10);
        }
        return null;
    };
    buildSamplingLabel = (requestJson) => {
        const pickupType = requestJson.jenis_pengambilan_sampel;
        const tariff = requestJson.tarif_pengambilan || requestJson.TarifPengambilan || null;
        if (pickupType === 'Petugas') {
            const suffix = tariff?.keterangan_jarak ? ` (${tariff.keterangan_jarak})` : '';
            return `Pengambilan oleh petugas${suffix}`;
        }
        if (pickupType === 'Pelanggan' || pickupType === 'Kirim') {
            return 'Diantar pelanggan';
        }
        return pickupType || '-';
    };
    loadRequestForBilling = async (requestId, transaction = undefined) => {
        return Fppl.findByPk(requestId, {
            include: [
                {
                    model: Pelanggan,
                    as: 'pelanggan',
                    attributes: ['id_pelanggan', 'nik', 'nama_instansi', 'pic', 'no_telp', 'alamat', 'email_kontak']
                },
                {
                    model: TarifPengambilan,
                    attributes: ['id_tarif_pengambilan', 'keterangan_jarak', 'tarif']
                },
                {
                    model: FpplSampel,
                    as: 'fppl_sampels',
                    attributes: ['id_registrasi', 'id_jenis_sampel', 'id_reg_bm', 'jumlah_sampel'],
                    include: [
                        {
                            model: JenisSampel,
                            attributes: ['id_jenis_sampel', 'jenis_sampel']
                        },
                        {
                            model: RegBm,
                            attributes: ['id_reg_bm', 'ref_reg']
                        },
                        {
                            model: FpplParameterMetode,
                            attributes: [
                                'id_fppl_parameter_metode',
                                'id_registrasi',
                                'id_jenis_sampel',
                                'id_reg_bm',
                                'id_parameter',
                                'id_metode_parameter',
                                'is_insitu',
                                'status_kemampuan_lab',
                                'catatan_kemampuan',
                                'dipilih_pada'
                            ],
                            include: [
                                {
                                    model: Parameter,
                                    attributes: ['id_parameter', 'nama_parameter']
                                },
                                {
                                    model: ParameterMetode,
                                    required: false,
                                    attributes: ['id_metode_parameter', 'tarif', 'acuan_metode', 'is_subkontrak'],
                                    include: [
                                        { model: Metode, attributes: ['id_metode', 'nama_metode'] }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    model: Invoice,
                    required: false,
                    include: [
                        { model: Payment, required: false }
                    ]
                }
            ],
            order: [
                [Invoice, 'tanggal_invoice', 'DESC'],
                [{ model: FpplSampel, as: 'fppl_sampels' }, 'id_jenis_sampel', 'ASC'],
                [{ model: FpplSampel, as: 'fppl_sampels' }, 'id_reg_bm', 'ASC'],
                [{ model: FpplSampel, as: 'fppl_sampels' }, FpplParameterMetode, 'id_fppl_parameter_metode', 'ASC']
            ],
            transaction
        });
    };
    createOrRefreshInvoiceForRequest = async (requestId, transaction = undefined) => {
        const requestRecord = await this.loadRequestForBilling(requestId, transaction);
        if (!requestRecord) {
            throw new Error('Permohonan tidak ditemukan.');
        }
        const requestJson = normalizeRequestFpplSampelGraph(requestRecord.toJSON());
        const sampleRows = requestJson.fppl_sampels || requestJson.FpplSampels || [];
        const parameterItems = [];
        for (const sample of sampleRows) {
            const sampleType = sample.jenis_sampel?.jenis_sampel ||
                sample.JenisSampel?.jenis_sampel ||
                '-';
            const jumlahSampel = Number(sample.jumlah_sampel || sample.jumlahSampel || 1) || 1;
            const fpmRows = sample.fppl_parameter_metodes || sample.FpplParameterMetodes || [];
            for (const fpm of fpmRows) {
                const parameterName = fpm.parameter?.nama_parameter ||
                    fpm.Parameter?.nama_parameter ||
                    '-';
                const methodName = fpm.parameter_metode?.metode?.nama_metode ||
                    fpm.parameter_metode?.Metode?.nama_metode ||
                    fpm.ParameterMetode?.metode?.nama_metode ||
                    fpm.ParameterMetode?.Metode?.nama_metode ||
                    '-';
                const amount = normalizeAmount(fpm.parameter_metode?.tarif ?? fpm.ParameterMetode?.tarif ?? 0);
                const parameterMetode = fpm.parameter_metode || fpm.ParameterMetode || null;
                const isSubkontrak = Number(parameterMetode?.is_subkontrak) === 1 ||
                    parameterMetode?.is_subkontrak === true ||
                    parameterMetode?.is_subkontrak === '1';
                if (!fpm.id_metode_parameter) {
                    throw new Error(`Metode belum dipilih untuk parameter ${parameterName}.`);
                }
                if (!Number.isFinite(amount) || amount < 0) {
                    throw new Error(`Tarif belum valid untuk parameter ${parameterName}.`);
                }
                parameterItems.push({
                    id_fppl_parameter_metode: fpm.id_fppl_parameter_metode,
                    parameterName,
                    methodName,
                    amount,
                    qty: jumlahSampel,
                    subtotal: amount * jumlahSampel,
                    sampleType,
                    isSubkontrak,
                    catatanSubkontrak: isSubkontrak
                        ? (fpm.catatan_kemampuan || 'Parameter ini diproses sebagai subkontrak.')
                        : null
                });
            }
        }
        const subtotalUji = parameterItems.reduce((sum, item) => sum + item.subtotal, 0);
        const subtotalPengambilan = normalizeAmount(requestJson.tarif_pengambilan?.tarif || requestJson.TarifPengambilan?.tarif || 0);
        // total dihitung di application layer (tidak disimpan ke DB — bukan kolom di labling 15)
        let invoice = (requestJson.invoices || requestJson.Invoices || [])[0] || null;
        let invoiceLogAction = 'MEMPERBARUI_INVOICE';
        if (!invoice) {
            const invoiceId = await generateId(Invoice, 'id_invoice', 'INV-', transaction, 3);
            invoice = await Invoice.create({
                id_invoice: invoiceId,
                id_registrasi: requestJson.id_registrasi,
                tanggal_invoice: new Date(),
                subtotal_uji: subtotalUji,
                subtotal_pengambilan: subtotalPengambilan,
                // TIDAK insert total — kolom tidak ada di DB baru
                status_invoice: 'Belum Dibayar'
            }, { transaction });
            invoiceLogAction = 'MEMBUAT_INVOICE';
        }
        else {
            const persistedInvoice = await Invoice.findByPk(invoice.id_invoice, { transaction });
            if (!persistedInvoice) {
                throw new Error('Invoice tidak ditemukan.');
            }
            const lockedStatuses = ['Lunas', 'Bayar Nanti'];
            if (lockedStatuses.includes(persistedInvoice.status_invoice)) {
                return persistedInvoice;
            }
            await persistedInvoice.update({
                subtotal_uji: subtotalUji,
                subtotal_pengambilan: subtotalPengambilan,
                status_invoice: 'Belum Dibayar',
                file_invoice_path: null,
            }, { transaction });
            invoice = persistedInvoice;
            await InvoiceItem.destroy({
                where: { id_invoice: invoice.id_invoice },
                transaction,
            });
        }
        for (const item of parameterItems) {
            await InvoiceItem.create({
                id_invoice: invoice.id_invoice,
                id_fppl_parameter_metode: item.id_fppl_parameter_metode,
                qty: item.qty,
                tarif_invoice: item.amount
            }, { transaction });
        }
        await WorkflowLogService.logStatusTransition({
            entityType: 'INVOICE',
            entityId: invoice.id_invoice,
            action: invoiceLogAction,
            statusBefore: null,
            statusAfter: invoice.status_invoice || 'Belum Dibayar',
            source: 'Sistem',
            note: invoiceLogAction === 'MEMBUAT_INVOICE' ? 'Invoice dibuat untuk permohonan.' : 'Invoice diperbarui untuk permohonan.',
            actorNik: null,
            createdAt: invoice.tanggal_invoice || null,
            transaction,
        });
        return invoice;
    };
    buildInvoiceSummary = async (requestId, transaction = undefined) => {
        const requestRecord = await this.loadRequestForBilling(requestId, transaction);
        if (!requestRecord) {
            return null;
        }
        const requestJson = normalizeRequestFpplSampelGraph(requestRecord.toJSON());
        const invoices = requestJson.invoices || requestJson.Invoices || [];
        const latestInvoice = invoices[0] || null;
        const sampleRows = requestJson.fppl_sampels || requestJson.FpplSampels || [];
        const parameterItems = [];
        const requestDecisionStatus = deriveCustomerDecisionStatus(requestRecord.status_fppl);
        for (const sample of sampleRows) {
            const sampleType = sample.jenis_sampel?.jenis_sampel ||
                sample.JenisSampel?.jenis_sampel ||
                '-';
            const jumlahSampel = Number(sample.jumlah_sampel || sample.jumlahSampel || 1) || 1;
            const fpmRows = sample.fppl_parameter_metodes ||
                sample.FpplParameterMetodes ||
                [];
            for (const fpm of fpmRows) {
                const parameterName = fpm.parameter?.nama_parameter ||
                    fpm.Parameter?.nama_parameter ||
                    '-';
                const methodName = fpm.parameter_metode?.metode?.nama_metode ||
                    fpm.parameter_metode?.Metode?.nama_metode ||
                    fpm.ParameterMetode?.metode?.nama_metode ||
                    fpm.ParameterMetode?.Metode?.nama_metode ||
                    '-';
                const legacyApprovalStatus = fpm.status_keputusan_permohonan || 'Menunggu';
                const approvalStatus = requestDecisionStatus;
                const parameterMetode = fpm.parameter_metode || fpm.ParameterMetode || null;
                const isSubkontrak = Number(parameterMetode?.is_subkontrak) === 1 ||
                    parameterMetode?.is_subkontrak === true ||
                    parameterMetode?.is_subkontrak === '1';
                const harga = normalizeAmount(parameterMetode?.tarif ?? 0);
                parameterItems.push({
                    idFpplParameterMetode: fpm.id_fppl_parameter_metode,
                    id_fppl_parameter_metode: fpm.id_fppl_parameter_metode,
                    sampleType,
                    nama: parameterName,
                    parameterName,
                    metode: methodName,
                    methodName,
                    harga,
                    amount: harga,
                    qty: jumlahSampel,
                    jumlahSampel,
                    subtotal: harga * jumlahSampel,
                    statusPersetujuanPelanggan: approvalStatus,
                    status_keputusan_permohonan: approvalStatus,
                    legacyStatusPersetujuanPelanggan: legacyApprovalStatus,
                    legacy_status_persetujuan_pelanggan: legacyApprovalStatus,
                    statusKemampuanLab: fpm.status_kemampuan_lab || null,
                    catatanKemampuan: fpm.catatan_kemampuan || null,
                    catatan_kemampuan: fpm.catatan_kemampuan || null,
                    catatanSubkontrak: isSubkontrak
                        ? (fpm.catatan_kemampuan || 'Parameter ini diproses sebagai subkontrak.')
                        : null,
                    catatan_subkontrak: isSubkontrak
                        ? (fpm.catatan_kemampuan || 'Parameter ini diproses sebagai subkontrak.')
                        : null,
                    isSubkontrak,
                    is_subkontrak: isSubkontrak ? 1 : 0
                });
            }
        }
        if (!latestInvoice && parameterItems.length === 0) {
            return null;
        }
        const subtotalUji = latestInvoice
            ? normalizeAmount(latestInvoice.subtotal_uji)
            : parameterItems.reduce((sum, item) => sum + item.subtotal, 0);
        const subtotalPengambilan = latestInvoice
            ? normalizeAmount(latestInvoice.subtotal_pengambilan)
            : normalizeAmount(requestJson.tarif_pengambilan?.tarif ||
                requestJson.TarifPengambilan?.tarif ||
                0);
        const totalTagihan = subtotalUji + subtotalPengambilan;
        const paymentRows = latestInvoice?.payments || latestInvoice?.Payments || [];
        const latestPayment = getLatestPaymentRow(paymentRows);
        const paymentMethod = resolvePaymentMethod(latestPayment?.metode_bayar);
        const customerApprovalStatus = requestDecisionStatus;
        const tanggalInvoiceDateOnly = this.toDateOnlyString(latestInvoice?.tanggal_invoice);
        return {
            nomorInvoice: latestInvoice?.id_invoice || null,
            tanggalTerbit: tanggalInvoiceDateOnly,
            tanggal_terbit: tanggalInvoiceDateOnly,
            tanggalInvoice: tanggalInvoiceDateOnly,
            tanggal_invoice: tanggalInvoiceDateOnly,
            // Alias defensif untuk typo lama yang pernah muncul di beberapa payload/UI.
            tanggal_invoce: tanggalInvoiceDateOnly,
            status: latestInvoice?.status_invoice || 'Belum Dibayar',
            paidAt: latestPayment?.paid_at || null,
            paid_at: latestPayment?.paid_at || null,
            paymentPaidAt: latestPayment?.paid_at || null,
            payment_paid_at: latestPayment?.paid_at || null,
            fileInvoicePath: latestInvoice?.file_invoice_path || null,
            file_invoice_path: latestInvoice?.file_invoice_path || null,
            subtotalUji,
            subtotalPengambilan,
            totalTagihan,
            customerApprovalStatus,
            rincian: {
                parameters: parameterItems,
                metodeSampling: this.buildSamplingLabel(requestJson),
                metode_sampling: this.buildSamplingLabel(requestJson),
                biayaSampling: subtotalPengambilan,
                biaya_sampling: subtotalPengambilan,
                tarifPengambilan: requestJson.tarif_pengambilan || requestJson.TarifPengambilan || null,
                tarif_pengambilan: requestJson.tarif_pengambilan || requestJson.TarifPengambilan || null,
            },
            metodeSampling: this.buildSamplingLabel(requestJson),
            metode_sampling: this.buildSamplingLabel(requestJson),
            biayaSampling: subtotalPengambilan,
            biaya_sampling: subtotalPengambilan,
            tarifPengambilan: requestJson.tarif_pengambilan || requestJson.TarifPengambilan || null,
            tarif_pengambilan: requestJson.tarif_pengambilan || requestJson.TarifPengambilan || null,
            payment: latestPayment
                ? {
                    idPayment: latestPayment?.id_payment,
                    id_payment: latestPayment?.id_payment,
                    methodCode: paymentMethod?.code || latestPayment?.metode_bayar || null,
                    methodLabel: paymentMethod?.label || latestPayment?.metode_bayar || '-',
                    amount: totalTagihan,
                    paidAt: latestPayment?.paid_at || null,
                    paid_at: latestPayment?.paid_at || null,
                    isDeferredByAdmin: (paymentMethod?.code || latestPayment?.metode_bayar) === INTERNAL_PAYMENT_METHOD.code,
                    gateway: buildPaymentGatewayPayload(latestPayment)
                }
                : null
        };
    };
    ensureCustomerOwnsRequest = async (requestId, userNik, transaction = undefined) => {
        const requestRecord = await Fppl.findByPk(requestId, {
            include: [{ model: Pelanggan, as: 'pelanggan', attributes: ['id_pelanggan', 'nik'] }],
            transaction
        });
        if (!requestRecord) {
            throw new Error('Permohonan tidak ditemukan.');
        }
        const requestJson = normalizeRequestFpplSampelGraph(requestRecord.toJSON());
        const customerNik = requestJson.pelanggan?.nik || requestJson.Pelanggan?.nik;
        if (customerNik !== userNik) {
            throw new Error('FORBIDDEN');
        }
        return requestRecord;
    };
    updateCustomerApprovalStatus = async (requestId, status, transaction = undefined) => {
        // Keputusan pelanggan sekarang berada di level fppl.status_fppl.
        // Kolom per item fppl_parameter_metode.status_persetujuan_pelanggan sudah dipensiunkan.
        return;
    };
}
module.exports = new PaymentBillingService();
module.exports.PaymentBillingService = PaymentBillingService;
