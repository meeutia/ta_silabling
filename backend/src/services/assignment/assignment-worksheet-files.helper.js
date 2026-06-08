const { Op } = require('sequelize');
const { Lka, Penugasan, PenugasanDetail } = require('../../models/Associations');
const { ROLE_ANALIS } = require('./assignment.constants');
const { getPlain } = require('./assignment-object.helper');
const { getFileNameFromPath } = require('../../utils/file-security.util');
const { buildSignedFileUrl } = require('../../utils/file-url.util');
class AssignmentWorksheetFilesHelper {
getFileExt = (value) => {
        const clean = String(value || '').split('?')[0];
        const fileName = clean.split('/').pop() || '';
        return fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
    };
    normalizeWorksheetFile = (file) => {
        const pathValue = file?.path ||
            file?.filePath ||
            file?.file_path ||
            '';
        const secureUrl = file?.secureUrl ||
            file?.secure_url ||
            file?.url ||
            (pathValue ? buildSignedFileUrl(pathValue) : '');
        const downloadUrl = file?.downloadUrl ||
            file?.download_url ||
            (pathValue ? buildSignedFileUrl(pathValue, { download: true }) : '');
        return {
            path: pathValue,
            secureUrl,
            secure_url: secureUrl,
            downloadUrl,
            download_url: downloadUrl,
            originalName: file?.originalName ||
                file?.original_name ||
                file?.name ||
                String(pathValue || '').split('/').pop() ||
                'File LKA',
            mimeType: file?.mimeType ||
                file?.mime_type ||
                null,
            size: file?.size ||
                file?.fileSize ||
                file?.file_size ||
                null,
            ext: file?.ext ||
                file?.fileExt ||
                file?.file_ext ||
                this.getFileExt(pathValue),
            uploadedAt: file?.uploadedAt ||
                file?.uploaded_at ||
                null,
        };
    };
    parseWorksheetFiles = (value) => {
        if (!value)
            return [];
        if (Array.isArray(value)) {
            return value.map(this.normalizeWorksheetFile).filter((item) => item.path);
        }
        if (typeof value === 'object') {
            const normalized = this.normalizeWorksheetFile(value);
            return normalized.path ? [normalized] : [];
        }
        const text = String(value || '').trim();
        if (!text)
            return [];
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                return parsed.map(this.normalizeWorksheetFile).filter((item) => item.path);
            }
            const normalized = this.normalizeWorksheetFile(parsed);
            return normalized.path ? [normalized] : [];
        }
        catch {
            return [
                {
                    path: text,
                    originalName: text.split('/').pop() || text,
                    mimeType: null,
                    size: null,
                    ext: this.getFileExt(text),
                    uploadedAt: null,
                },
            ];
        }
    };
    isFreshWorksheetUploadOwnedByUser = (fileName, user = {}) => {
        const currentNik = String(user?.nik || user?.id || user?.id_user || '').trim();
        if (!fileName || !currentNik)
            return false;
        const safeNik = currentNik.replace(/[^a-zA-Z0-9._-]/g, '');
        return Boolean(safeNik) && String(fileName).includes(`_${safeNik}_`);
    };
    assertWorksheetFileAccess = async (rawPath, user = {}, transaction = null) => {
        const fileName = getFileNameFromPath(rawPath);
        if (!fileName || !/^[a-zA-Z0-9._-]+$/.test(fileName)) {
            const error = new Error('Path file worksheet tidak valid.');
            error.statusCode = 400;
            throw error;
        }
        const role = user?.id_role;
        const currentNik = user?.nik || user?.id || user?.id_user || null;
        if (role === ROLE_ANALIS && this.isFreshWorksheetUploadOwnedByUser(fileName, user)) {
            return true;
        }
        const lka = await Lka.findOne({
            where: {
                file_worksheet_path: {
                    [Op.like]: `%${fileName}%`,
                },
            },
            include: [
                {
                    model: PenugasanDetail,
                    required: true,
                    include: [
                        {
                            model: Penugasan,
                            required: true,
                            attributes: ['id_penugasan', 'id_user_analis', 'assigned_by'],
                        },
                    ],
                },
            ],
            transaction,
        });
        if (!lka) {
            const error = new Error('File worksheet tidak terdaftar pada penugasan.');
            error.statusCode = 404;
            throw error;
        }
        const plain = getPlain(lka);
        const detail = plain.penugasan_detail || plain.PenugasanDetail || {};
        const penugasan = detail.penugasan || detail.Penugasan || {};
        if (role === ROLE_ANALIS && penugasan.id_user_analis !== currentNik) {
            const error = new Error('Anda tidak memiliki akses ke file worksheet ini.');
            error.statusCode = 403;
            throw error;
        }
        return true;
    };
    serializeWorksheetFiles = (value) => {
        const files = this.parseWorksheetFiles(value);
        if (!files.length)
            return null;
        return JSON.stringify(files);
    };
    getPrimaryWorksheetPath = (value) => {
        const files = this.parseWorksheetFiles(value);
        return files[0]?.path || null;
    };
}
module.exports = new AssignmentWorksheetFilesHelper();
module.exports.AssignmentWorksheetFilesHelper = AssignmentWorksheetFilesHelper;
