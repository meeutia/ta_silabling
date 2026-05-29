const express = require('express');
const router = express.Router();
const { register, login, refresh, getMe, logout, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth');
const { validateRegister, validateLogin } = require('../validators/auth.validator');
const { createRateLimit } = require('../middlewares/rate-limit');

const authWriteLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: 'auth-write',
  message: 'Terlalu banyak percobaan autentikasi. Silakan coba lagi beberapa saat.',
});

const authRefreshLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyPrefix: 'auth-refresh',
  message: 'Terlalu banyak percobaan refresh sesi. Silakan coba lagi beberapa saat.',
});

router.post('/register', authWriteLimiter, validateRegister, register);
router.post('/login', authWriteLimiter, validateLogin, login);
router.post('/refresh', authRefreshLimiter, refresh);
router.post('/logout', logout);
router.get('/me', verifyToken, getMe);
router.post('/forgot-password', authWriteLimiter, forgotPassword);
router.post('/reset-password', authWriteLimiter, resetPassword);

module.exports = router;