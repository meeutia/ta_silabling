const fs = require('fs');
const path = require('path');
const { Invoice, Fppl, Pelanggan, } = require('../models/Associations');
const Roles = require('../constants/roles');
const RequestService = require('../services/request/request.service');
const PaymentService = require('../services/payment/payment.service');
const { successResponse, errorResponse } = require('../utils/response');
const InvoicePdfService = require('../services/invoice-pdf.service');
const notificationService = require('../services/notification/notification.service');
const { secureKnownFileFields } = require('../utils/file-url.util');
const PUBLIC_DIR = path.join(__dirname, '../../public');
const INVOICE_DIR = path.join(PUBLIC_DIR, 'invoices');
class CustomerRequestController {
    constructor({ requestService, paymentService, invoicePdfService, notificationService }) {
        this.requestService = requestService;
        this.paymentService = paymentService;
        this.invoicePdfService = invoicePdfService;
        this.notificationService = notificationService;
    }
    createRequest = async (req, res) => {
        try {
            const data = await this.requestService.createRequest(req.user.nik, req.body);
            try {
                await this.notificationService.notifyAdminPermohonanBaru({
                    idRegistrasi: data?.id_registrasi || data?.idRegistrasi,
                });
            }
            catch (notifyError) {
                // Pembuatan permohonan tetap berhasil; kegagalan email dicatat di log server/notifikasi_email.
                console.error('notifyAdminPermohonanBaru this.createRequest error:', notifyError);
            }
            return successResponse(res, 'Permohonan pengujian berhasil dibuat.', data, 201);
        }
        catch (error) {
            console.error('this.createRequest error:', error);
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
        }
    };
    updateRequest = async (req, res) => {
        return errorResponse(res, 'Edit permohonan lama sudah tidak digunakan. Jika permohonan ditolak, silakan buat permohonan baru.', 410);
    };
    listRequests = async (req, res) => {
        try {
            const { status } = req.query;
            const data = await this.requestService.listRequests(req.user.nik, req.user.id_role, status);
            return successResponse(res, 'Berhasil mengambil daftar permohonan.', data);
        }
        catch (error) {
            console.error('this.listRequests error:', error);
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 500);
        }
    };
    detailRequest = async (req, res) => {
        try {
            const { id } = req.params;
            const data = await this.requestService.detailRequest(id, req.user.nik, req.user.id_role);
            return successResponse(res, 'Berhasil rincian mengambil permohonan.', secureKnownFileFields(data));
        }
        catch (error) {
            console.error('this.detailRequest error:', error);
            const code = error.message === 'FORBIDDEN' ? 403 : 404;
            const msg = error.message === 'FORBIDDEN' ? 'Anda tidak memiliki akses ke permohonan ini.' : error.message;
            return errorResponse(res, msg, code);
        }
    };
    getRequestActivityLogs = async (req, res) => {
        try {
            const { id } = req.params;
            const data = await this.requestService.getRequestActivityLogs(id, req.user.nik, req.user.id_role);
            return successResponse(res, 'Berhasil mengambil riwayat aktivitas permohonan.', data);
        }
        catch (error) {
            console.error('this.getRequestActivityLogs error:', error);
            const code = error.message === 'FORBIDDEN' ? 403 : 404;
            const msg = error.message === 'FORBIDDEN' ? 'Anda tidak memiliki akses ke permohonan ini.' : error.message;
            return errorResponse(res, msg || 'Gagal mengambil riwayat aktivitas permohonan.', code);
        }
    };
    processPaymentDecision = async (req, res) => {
        try {
            const { id } = req.params;
            const { action, paymentMethodCode, note, catatan, alasan, catatanPenolakan } = req.body;
            if (action === 'approve') {
                const data = await this.paymentService.createGatewayPayment(id, req.user.nik, paymentMethodCode);
                return successResponse(res, 'Persetujuan berhasil disimpan dan pembayaran Xendit berhasil dibuat.', data);
            }
            const rejectionNote = note || catatan || alasan || catatanPenolakan || null;
            const data = await this.paymentService.rejectInvoiceByCustomer(id, req.user.nik, rejectionNote);
            setImmediate(() => {
                const idRegistrasi = data?.id_registrasi || data?.idRegistrasi || id;
                Promise.allSettled([
                    this.notificationService.notifyCustomerRequestCancelledToAdmin({
                        idRegistrasi,
                        note: data?.note || rejectionNote || null,
                    }),
                    this.notificationService.notifyCustomerRequestCancelledToCustomer({
                        idRegistrasi,
                        note: data?.note || rejectionNote || null,
                    }),
                ]).then((results) => {
                    results.forEach((result, index) => {
                        if (result.status === 'rejected') {
                            const target = index === 0 ? 'Admin' : 'Pelanggan';
                            console.error(`notifyCustomerRequestCancelledTo${target} this.processPaymentDecision error:`, result.reason);
                        }
                    });
                });
            });
            return successResponse(res, 'Permohonan berhasil dibatalkan oleh pelanggan.', data);
        }
        catch (error) {
            console.error('this.processPaymentDecision error:', error);
            const code = error.message === 'FORBIDDEN' ? 403 : 400;
            const message = error.message === 'FORBIDDEN'
                ? 'Anda tidak memiliki akses ke permohonan ini.'
                : (error.message || 'Terjadi kesalahan pada server.');
            return errorResponse(res, message, code);
        }
    };
    getMyPelanggans = async (req, res) => {
        try {
            const data = await this.requestService.getMyPelanggans(req.user.nik);
            return successResponse(res, 'Berhasil mengambil daftar pelanggan user.', data);
        }
        catch (error) {
            console.error('this.getMyPelanggans error:', error);
            return errorResponse(res, 'Terjadi kesalahan pada server.');
        }
    };
    ensureInvoiceDir = () => {
        if (!fs.existsSync(INVOICE_DIR)) {
            fs.mkdirSync(INVOICE_DIR, { recursive: true });
        }
    };
    resolvePublicFilePath = (relativePath) => {
        if (!relativePath)
            return null;
        const normalized = String(relativePath).replace(/^\/+/, '');
        const cleanPath = normalized.replace(/^public[\\/]/, '');
        return path.join(PUBLIC_DIR, cleanPath);
    };
    safeInvoiceFileName = (value) => {
        return String(value || 'invoice')
            .replace(/[\\/:"*?<>|]+/g, '-')
            .replace(/\s+/g, '-')
            .trim();
    };
    getInvoiceWithAccess = async (idRegistrasi, user) => {
        const invoice = await Invoice.findOne({
            where: { id_registrasi: idRegistrasi },
        });
        if (!invoice) {
            const error = new Error('Invoice belum tersedia.');
            error.statusCode = 404;
            throw error;
        }
        const requestRecord = await Fppl.findByPk(idRegistrasi, {
            include: [
                {
                    model: Pelanggan,
                    as: 'pelanggan',
                    attributes: ['id_pelanggan', 'nik'],
                },
            ],
        });
        if (!requestRecord) {
            const error = new Error('Permohonan tidak ditemukan.');
            error.statusCode = 404;
            throw error;
        }
        const requestJson = requestRecord.toJSON();
        const pelanggan = requestJson.pelanggan || requestJson.Pelanggan || null;
        if (user?.id_role === Roles.CUSTOMER && pelanggan?.nik !== user?.nik) {
            const error = new Error('Anda tidak memiliki akses ke invoice ini.');
            error.statusCode = 403;
            throw error;
        }
        return invoice;
    };
    downloadInvoicePdf = async (req, res) => {
        try {
            const { id } = req.params;
            const invoice = await this.getInvoiceWithAccess(id, req.user);
            const disposition = req.query.download === '1' ? 'attachment' : 'inline';
            const savedPath = invoice.file_invoice_path;
            const absoluteSavedPath = this.resolvePublicFilePath(savedPath);
            if (absoluteSavedPath && fs.existsSync(absoluteSavedPath)) {
                const filename = path.basename(absoluteSavedPath);
                const buffer = fs.readFileSync(absoluteSavedPath);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
                res.setHeader('Content-Length', buffer.length);
                return res.send(buffer);
            }
            const { buffer, filename } = await this.invoicePdfService.generateInvoicePdf(id, req.user);
            this.ensureInvoiceDir();
            const safeName = this.safeInvoiceFileName(filename || `invoice-${id}.pdf`);
            const finalFilename = safeName.toLowerCase().endsWith('.pdf')
                ? safeName
                : `${safeName}.pdf`;
            const absolutePath = path.join(INVOICE_DIR, finalFilename);
            const relativePath = `/invoices/${finalFilename}`;
            fs.writeFileSync(absolutePath, buffer);
            await invoice.update({
                file_invoice_path: relativePath,
            });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `${disposition}; filename="${finalFilename}"`);
            res.setHeader('Content-Length', buffer.length);
            return res.send(buffer);
        }
        catch (error) {
            console.error('this.downloadInvoicePdf error:', error);
            return errorResponse(res, error.message || 'Gagal membuat invoice PDF.', error.statusCode || 400);
        }
    };
}
module.exports = new CustomerRequestController({
    requestService: RequestService,
    paymentService: PaymentService,
    invoicePdfService: InvoicePdfService,
    notificationService,
});
module.exports.CustomerRequestController = CustomerRequestController;
