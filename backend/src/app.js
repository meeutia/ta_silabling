const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const app = express();

app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

const configuredFrontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const allowedOrigins = configuredFrontendOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/i;
const allowAnyLocalhostOrigin = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      (allowAnyLocalhostOrigin && localhostOriginPattern.test(origin))
    ) {
      return callback(null, true);
    }
    return callback(new Error('Origin tidak diizinkan oleh CORS.'));
  },
  credentials: true
}));

const jsonBodyLimit = process.env.JSON_BODY_LIMIT || '2mb';
const urlEncodedBodyLimit = process.env.URLENCODED_BODY_LIMIT || '2mb';

app.use(cookieParser());
app.use(express.json({ limit: jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: urlEncodedBodyLimit }));
app.use('/assets', express.static(path.join(__dirname, '../public', 'assets')));


const authRoutes = require('./routes/auth');
const referenceRoutes = require('./routes/reference');
const requestRoutes = require('./routes/request');
const meRoutes = require('./routes/me');
const assignmentRoutes = require('./routes/assignment');
const lhuRoutes = require('./routes/lhu');
const lkaRevisionRoutes = require('./routes/lka-revision');
const adminParameterRoutes = require('./routes/admin-parameter');
const adminAccountRoutes = require('./routes/admin-account');
const fileRoutes = require('./routes/file');
const PaymentService = require('./services/payment/payment.service');
const { createRateLimit } = require('./middlewares/rate-limit');

app.use('/auth', authRoutes);
app.use('/references', referenceRoutes);
app.use('/requests', requestRoutes);
app.use('/me', meRoutes);
app.use('/assignments', assignmentRoutes);
app.use('/lhu', lhuRoutes);
app.use('/lka-revisions', lkaRevisionRoutes);
app.use('/admin/parameters', adminParameterRoutes);
app.use('/admin/accounts', adminAccountRoutes);
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

app.use('/files', fileAccessLimiter, fileRoutes);
app.post('/webhooks/xendit/payment-session', webhookLimiter, PaymentService.handleXenditPaymentSessionWebhook);

app.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'OK',
    data: { service: 'SILABLING API' },
  });
});

function parseBooleanEnv(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function legacyFileAccessBlocked(req, res) {
  return res.status(403).json({
    success: false,
    message: 'Akses file langsung sudah dinonaktifkan. Gunakan URL file aman dari endpoint /files.',
  });
}

const enableLegacyFileStatic = parseBooleanEnv(process.env.ENABLE_LEGACY_FILE_STATIC, false);

if (enableLegacyFileStatic) {
  app.use('/invoices', express.static(path.join(__dirname, '../public', 'invoices')));
  app.use('/lhu', express.static(path.join(__dirname, '../public', 'lhu')));
  app.use('/worksheets', express.static(path.join(__dirname, '../public', 'worksheets')));
  app.use('/worksheets', express.static(path.join(process.cwd(), 'uploads', 'worksheets')));
  app.use('/uploads/worksheets', express.static(path.join(process.cwd(), 'uploads', 'worksheets')));
} else {
  app.use('/invoices', legacyFileAccessBlocked);
  app.use('/worksheets', legacyFileAccessBlocked);
  app.use('/uploads/worksheets', legacyFileAccessBlocked);
}

function trimTrailingSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function getFrontendRedirectBaseUrl() {
  return trimTrailingSlash(
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    process.env.VITE_FRONTEND_URL ||
    allowedOrigins[0] ||
    'http://localhost:5173'
  );
}

function redirectPaymentReturn(status) {
  return async (req, res) => {
    const frontendBaseUrl = getFrontendRedirectBaseUrl();
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
      const syncResult = await PaymentService.syncXenditPaymentStatusFromReturn(req.query || {});
      if (syncResult?.status) {
        redirectUrl.searchParams.set('gateway_status', syncResult.status);
      }
    } catch (error) {
      console.error('syncXenditPaymentStatusFromReturn error:', error);
      redirectUrl.searchParams.set('payment_sync', 'failed');
    }

    redirectUrl.searchParams.set('payment', status);

    return res.redirect(302, redirectUrl.toString());
  };
}

app.get('/payment/return/success', redirectPaymentReturn('success'));
app.get('/payment/return/cancel', redirectPaymentReturn('failed'));

// Backward-compatible aliases for older Xendit return URL configuration.
app.get('/payment/success', redirectPaymentReturn('success'));
app.get('/payment/cancel', redirectPaymentReturn('failed'));

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan.',
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Ukuran payload request terlalu besar.',
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
});

module.exports = app;
