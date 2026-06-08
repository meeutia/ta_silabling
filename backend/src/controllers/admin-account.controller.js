const AdminAccountService = require('../services/admin-account.service');
const { successResponse, errorResponse } = require('../utils/response');
class AdminAccountController {
    constructor(adminAccountService) {
        this.adminAccountService = adminAccountService;
    }
    getErrorCode = (error) => {
        const message = error.message || '';
        if (message.includes('wajib') ||
            message.includes('tidak valid') ||
            message.includes('minimal') ||
            message.includes('tidak sesuai') ||
            message.includes('tidak boleh')) {
            return 400;
        }
        if (message.includes('tidak ditemukan')) {
            return 404;
        }
        if (message.includes('sudah terdaftar') ||
            message.includes('sudah digunakan')) {
            return 409;
        }
        return 500;
    };
    getRoles = async (req, res) => {
        try {
            const roles = await this.adminAccountService.listRoles();
            return successResponse(res, 'Daftar role berhasil dimuat.', { roles }, 200);
        }
        catch (error) {
            console.error('this.getRoles error:', error.message);
            return errorResponse(res, error.message, this.getErrorCode(error));
        }
    };
    getStaffAccounts = async (req, res) => {
        try {
            const staff = await this.adminAccountService.listStaff(req.query);
            return successResponse(res, 'Daftar akun petugas berhasil dimuat.', { staff }, 200);
        }
        catch (error) {
            console.error('this.getStaffAccounts error:', error.message);
            return errorResponse(res, error.message, this.getErrorCode(error));
        }
    };
    getStaffAccountDetail = async (req, res) => {
        try {
            const staff = await this.adminAccountService.getStaffByNik(req.params.nik);
            return successResponse(res, 'Detail akun petugas berhasil dimuat.', { staff }, 200);
        }
        catch (error) {
            console.error('this.getStaffAccountDetail error:', error.message);
            return errorResponse(res, error.message, this.getErrorCode(error));
        }
    };
    createStaffAccount = async (req, res) => {
        try {
            const result = await this.adminAccountService.createStaff(req.body);
            return successResponse(res, 'Akun petugas berhasil dibuat.', result, 201);
        }
        catch (error) {
            console.error('this.createStaffAccount error:', error.message);
            return errorResponse(res, error.message, this.getErrorCode(error));
        }
    };
    updateStaffStatus = async (req, res) => {
        try {
            const staff = await this.adminAccountService.setStaffStatus(req.params.nik, req.body.is_active ?? req.body.isActive);
            return successResponse(res, 'Status akun petugas berhasil diperbarui.', { staff }, 200);
        }
        catch (error) {
            console.error('this.updateStaffStatus error:', error.message);
            return errorResponse(res, error.message, this.getErrorCode(error));
        }
    };
    resetStaffPassword = async (req, res) => {
        try {
            const result = await this.adminAccountService.resetStaffPassword(req.params.nik, req.body);
            return successResponse(res, 'Password akun petugas berhasil direset.', result, 200);
        }
        catch (error) {
            console.error('this.resetStaffPassword error:', error.message);
            return errorResponse(res, error.message, this.getErrorCode(error));
        }
    };
    getCustomerAccounts = async (req, res) => {
        try {
            const customers = await this.adminAccountService.listCustomers(req.query);
            return successResponse(res, 'Daftar akun pelanggan berhasil dimuat.', { customers }, 200);
        }
        catch (error) {
            console.error('this.getCustomerAccounts error:', error.message);
            return errorResponse(res, error.message, this.getErrorCode(error));
        }
    };
    getCustomerAccountDetail = async (req, res) => {
        try {
            const customer = await this.adminAccountService.getCustomerById(req.params.idPelanggan);
            return successResponse(res, 'Detail pelanggan berhasil dimuat.', { customer }, 200);
        }
        catch (error) {
            console.error('this.getCustomerAccountDetail error:', error.message);
            return errorResponse(res, error.message, this.getErrorCode(error));
        }
    };
    updateCustomerStatus = async (req, res) => {
        try {
            const customer = await this.adminAccountService.setCustomerStatus(req.params.idPelanggan, req.body.is_active ?? req.body.isActive);
            return successResponse(res, 'Status pelanggan berhasil diperbarui.', { customer }, 200);
        }
        catch (error) {
            console.error('this.updateCustomerStatus error:', error.message);
            return errorResponse(res, error.message, this.getErrorCode(error));
        }
    };
    resetCustomerPassword = async (req, res) => {
        try {
            const result = await this.adminAccountService.resetCustomerPassword(req.params.idPelanggan, req.body);
            return successResponse(res, 'Password pelanggan berhasil direset.', result, 200);
        }
        catch (error) {
            console.error('this.resetCustomerPassword error:', error.message);
            return errorResponse(res, error.message, this.getErrorCode(error));
        }
    };
}
module.exports = new AdminAccountController(AdminAccountService);
module.exports.AdminAccountController = AdminAccountController;
