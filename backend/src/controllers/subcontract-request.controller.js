const { successResponse, errorResponse } = require('../utils/response');
const SubcontractRequestService = require('../services/request/subcontract-request.service');

const createSubcontractRequest = async (req, res) => {
    try {
        const { fpmId } = req.body;

        const result = await SubcontractRequestService.createRequest({ fpmId });

        return successResponse(res, 'Permintaan subkontrak berhasil dibuat', result, 201);
    } catch (error) {
        if (error.status === 409 || error.message.includes('Sudah ada permintaan')) {
            return errorResponse(res, error.message, 409);
        }
        return errorResponse(res, error.message, 400);
    }
};

const getAdminSubcontractRequests = async (req, res) => {
    try {
        const { status } = req.query;
        const result = await SubcontractRequestService.listAdminRequests({ status });

        return successResponse(res, 'Data permintaan subkontrak', result);
    } catch (error) {
        return errorResponse(res, error.message, 400);
    }
};

const getAdminSubcontractRequestDetail = async (req, res) => {
    try {
        const { requestId } = req.params;
        const result = await SubcontractRequestService.getAdminRequestDetail(requestId);

        return successResponse(res, 'Detail permintaan subkontrak', result);
    } catch (error) {
        if (error.message.includes('tidak ditemukan')) {
            return errorResponse(res, error.message, 404);
        }
        return errorResponse(res, error.message, 400);
    }
};

const approveSubcontractRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const adminNik = req.user.nik;
        const { createMethodData, existingMethodId } = req.body;

        const result = await SubcontractRequestService.approveRequest({
            requestId,
            adminNik,
            createMethodData,
            existingMethodId,
        });

        return successResponse(res, 'Permintaan subkontrak disetujui', result);
    } catch (error) {
        return errorResponse(res, error.message, 400);
    }
};

const rejectSubcontractRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const adminNik = req.user.nik;

        const result = await SubcontractRequestService.rejectRequest({
            requestId,
            adminNik,
        });

        return successResponse(res, 'Permintaan subkontrak ditolak', result);
    } catch (error) {
        return errorResponse(res, error.message, 400);
    }
};

module.exports = {
    createSubcontractRequest,
    getAdminSubcontractRequests,
    getAdminSubcontractRequestDetail,
    approveSubcontractRequest,
    rejectSubcontractRequest
};
