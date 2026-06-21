const RequestService = require('../services/request/request.service');
const RequestListService = require('../services/request/request-list.service');
const AdminAccountService = require('../services/admin-account.service');
const PaymentService = require('../services/payment/payment.service');
const { successResponse, errorResponse } = require('../utils/response');
const InvoicePdfService = require('../services/invoice-pdf.service');
const notificationService = require('../services/notification/notification.service');
const { secureKnownFileFields } = require('../utils/file-url.util');
class CustomerRequestController {
    constructor({ requestService, requestListService, adminAccountService, paymentService, invoicePdfService, notificationService }) {
        this.requestService = requestService;
        this.requestListService = requestListService;
        this.adminAccountService = adminAccountService;
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
            const data = await this.requestListService.listRequests(req.user.nik, req.user.id_role, status);
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
    getAdminContact = async (req, res) => {
        try {
            const data = await this.adminAccountService.getAdminContact();
            return successResponse(res, 'Berhasil mengambil kontak admin', data);
        }
        catch (error) {
            console.error('this.getAdminContact error:', error);
            return errorResponse(res, error.message || 'Gagal mengambil kontak admin.');
        }
    };

    downloadInvoicePdf = async (req, res) => {
        try {
            const { id } = req.params;
            const disposition = req.query.download === '1' ? 'attachment' : 'inline';
            const { buffer, filename } = await this.invoicePdfService.getOrCreateInvoicePdf(id, req.user);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
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
    requestListService: RequestListService,
    adminAccountService: AdminAccountService,
    paymentService: PaymentService,
    invoicePdfService: InvoicePdfService,
    notificationService,
});
module.exports.CustomerRequestController = CustomerRequestController;
