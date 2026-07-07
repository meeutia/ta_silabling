const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const catalogRoutes = require('./routes/catalog');
const requestRoutes = require('./routes/request');
const meRoutes = require('./routes/me');
const assignmentRoutes = require('./routes/assignment');
const lhuRoutes = require('./routes/lhu');
const lkaRevisionRoutes = require('./routes/lka-revision');
const adminParameterRoutes = require('./routes/admin-parameter');
const adminAccountRoutes = require('./routes/admin-account');
const notificationEmailRoutes = require('./routes/notification-email');
const notificationRoutes = require('./routes/notification');
const fileRoutes = require('./routes/file');
const PaymentService = require('./services/payment/payment.service');
const { createRateLimit } = require('./middlewares/rate-limit');
class SilablingApplication {
    constructor({ paymentService = PaymentService } = {}) {
        this.app = express();
        this.paymentService = paymentService;
        this.configuredFrontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
        this.allowedOrigins = this.configuredFrontendOrigin
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean);
        this.localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/i;
        this.allowAnyLocalhostOrigin = process.env.NODE_ENV !== 'production';
        this.jsonBodyLimit = process.env.JSON_BODY_LIMIT || '2mb';
        this.urlEncodedBodyLimit = process.env.URLENCODED_BODY_LIMIT || '2mb';
        this.enableLegacyFileStatic = this.parseBooleanEnv(process.env.ENABLE_LEGACY_FILE_STATIC, false);
        this.configure();
    }
    configure = () => {
        this.app.disable('x-powered-by');
        this.registerSecurityMiddleware();
        this.registerCorsMiddleware();
        this.registerBodyMiddleware();
        this.registerStaticAssets();
        this.registerRoutes();
        this.registerProtectedFileRoutes();
        this.registerPaymentReturnRoutes();
        this.registerFallbackHandlers();
    };
    getApp = () => {
        return this.app;
    };
    registerSecurityMiddleware = () => {
        this.app.use(this.applySecurityHeaders);
    };
    applySecurityHeaders = (req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('X-Frame-Options', 'DENY');
        next();
    };
    registerCorsMiddleware = () => {
        this.app.use(cors({
            origin: (origin, callback) => {
                if (this.isAllowedOrigin(origin)) {
                    return callback(null, true);
                }
                return callback(new Error('Origin tidak diizinkan oleh CORS.'));
            },
            credentials: true,
        }));
    };
    isAllowedOrigin = (origin) => {
        return (!origin ||
            this.allowedOrigins.includes(origin) ||
            (this.allowAnyLocalhostOrigin && this.localhostOriginPattern.test(origin)));
    };
    registerBodyMiddleware = () => {
        this.app.use(cookieParser());
        this.app.use(express.json({ limit: this.jsonBodyLimit }));
        this.app.use(express.urlencoded({ extended: true, limit: this.urlEncodedBodyLimit }));
    };
    registerStaticAssets = () => {
        this.app.use('/assets', express.static(path.join(__dirname, '../public', 'assets')));
    };
    registerRoutes = () => {
        this.app.use('/auth', authRoutes);
        this.app.use('/catalog', catalogRoutes);
        this.app.use('/requests', requestRoutes);
        this.app.use('/me', meRoutes);
        this.app.use('/assignments', assignmentRoutes);
        this.app.use('/lhu', lhuRoutes);
        this.app.use('/lka-revisions', lkaRevisionRoutes);
        this.app.use('/admin/parameters', adminParameterRoutes);
        this.app.use('/admin/accounts', adminAccountRoutes);
        this.app.use('/admin/email-notifications', notificationEmailRoutes);
        this.app.use('/notifications', notificationRoutes);
    };
    registerProtectedFileRoutes = () => {
        const fileAccessLimiter = createRateLimit({
            windowMs: 60 * 1000,
            max: 120,
            keyPrefix: 'files',
            message: 'Terlalu banyak akses file. Silakan coba lagi beberapa saat.',
        });
        const webhookLimiter = createRateLimit({
            windowMs: 60 * 1000,
            max: 120,
            keyPrefix: 'webhook-xendit',
            message: 'Terlalu banyak request webhook.',
        });
        this.app.use('/files', fileAccessLimiter, fileRoutes);
        this.app.post('/webhooks/xendit/payment-session', webhookLimiter, this.paymentService.handleXenditPaymentSessionWebhook);
        this.app.get('/health', this.healthCheck);
        this.registerLegacyFileRoutes();
    };
    healthCheck = (req, res) => {
        return res.status(200).json({
            success: true,
            message: 'OK',
            data: { service: 'SILABLING API' },
        });
    };
    parseBooleanEnv = (value, defaultValue = false) => {
        if (value === undefined || value === null || value === '')
            return defaultValue;
        return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
    };
    legacyFileAccessBlocked = (req, res) => {
        return res.status(403).json({
            success: false,
            message: 'Akses file langsung sudah dinonaktifkan. Gunakan URL file aman dari endpoint /files.',
        });
    };
    registerLegacyFileRoutes = () => {
        if (this.enableLegacyFileStatic) {
            this.app.use('/invoices', express.static(path.join(__dirname, '../public', 'invoices')));
            this.app.use('/lhu', express.static(path.join(__dirname, '../public', 'lhu')));
            this.app.use('/worksheets', express.static(path.join(__dirname, '../public', 'worksheets')));
            this.app.use('/worksheets', express.static(path.join(process.cwd(), 'uploads', 'worksheets')));
            this.app.use('/uploads/worksheets', express.static(path.join(process.cwd(), 'uploads', 'worksheets')));
            return;
        }
        this.app.use('/invoices', this.legacyFileAccessBlocked);
        this.app.use('/worksheets', this.legacyFileAccessBlocked);
        this.app.use('/uploads/worksheets', this.legacyFileAccessBlocked);
    };
    trimTrailingSlash = (value) => {
        return String(value || '').trim().replace(/\/+$/, '');
    };
    getFrontendRedirectBaseUrl = () => {
        return this.trimTrailingSlash(process.env.FRONTEND_URL ||
            process.env.CLIENT_URL ||
            process.env.VITE_FRONTEND_URL ||
            this.allowedOrigins[0] ||
            'http://localhost:5173');
    };
    redirectPaymentReturn = (status) => {
        return async (req, res) => {
            const frontendBaseUrl = this.getFrontendRedirectBaseUrl();
            const redirectUrl = new URL('/pelanggan/status', `${frontendBaseUrl}/`);
            Object.entries(req.query || {}).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach((item) => {
                        if (item !== undefined && item !== null && String(item).trim() !== '') {
                            redirectUrl.searchParams.append(key, String(item));
                        }
                    });
                    return;
                }
                if (value !== undefined && value !== null && String(value).trim() !== '') {
                    redirectUrl.searchParams.set(key, String(value));
                }
            });
            try {
                const syncResult = await this.paymentService.syncXenditPaymentStatusFromReturn(req.query || {});
                if (syncResult?.status) {
                    redirectUrl.searchParams.set('gateway_status', syncResult.status);
                }
            }
            catch (error) {
                console.error('syncXenditPaymentStatusFromReturn error:', error);
                redirectUrl.searchParams.set('payment_sync', 'failed');
            }
            redirectUrl.searchParams.set('payment', status);
            return res.redirect(302, redirectUrl.toString());
        };
    };
    registerPaymentReturnRoutes = () => {
        this.app.get('/payment/return/success', this.redirectPaymentReturn('success'));
        this.app.get('/payment/return/cancel', this.redirectPaymentReturn('failed'));
        // Backward-compatible aliases for older Xendit return URL configuration.
        this.app.get('/payment/success', this.redirectPaymentReturn('success'));
        this.app.get('/payment/cancel', this.redirectPaymentReturn('failed'));
    };
    registerFallbackHandlers = () => {
        this.app.use(this.notFoundHandler);
        this.app.use(this.errorHandler);
    };
    notFoundHandler = (req, res) => {
        return res.status(404).json({
            success: false,
            message: 'Endpoint tidak ditemukan.',
        });
    };
    errorHandler = (err, req, res, next) => {
        if (res.headersSent)
            return next(err);
        if (err?.type === 'entity.too.large') {
            return res.status(413).json({
                success: false,
                message: 'Ukuran requestData request terlalu besar.',
            });
        }
        if (err?.message === 'Origin tidak diizinkan oleh CORS.') {
            return res.status(403).json({
                success: false,
                message: 'Origin tidak diizinkan oleh CORS.',
            });
        }
        if (process.env.NODE_ENV !== 'production') {
            console.error('Unhandled app error:', err);
        }
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server.',
        });
    };
}
const silablingApplication = new SilablingApplication({ paymentService: PaymentService });
module.exports = silablingApplication.getApp();
module.exports.SilablingApplication = SilablingApplication;
module.exports.silablingApplication = silablingApplication;
