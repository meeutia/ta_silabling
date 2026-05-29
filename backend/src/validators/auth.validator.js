const { errorResponse } = require('../utils/response');
const { validatePasswordPolicy, validateUsernamePolicy } = require('../utils/password-policy.util');

const validateRegister = (req, res, next) => {
    const { nik, username, email, password } = req.body;

    const normalizedNik = String(nik || '').trim();
    const normalizedUsername = String(username || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedNik || !normalizedUsername || !normalizedEmail || !password) {
        return errorResponse(res, 'NIK, username, email, dan password wajib diisi.', 400);
    }

    if (!/^\d{16}$/.test(normalizedNik)) {
        return errorResponse(res, 'NIK harus 16 digit angka.', 400);
    }

    const usernameValidation = validateUsernamePolicy(normalizedUsername);
    if (!usernameValidation.valid) {
        return errorResponse(res, usernameValidation.message, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
        return errorResponse(res, 'Format email tidak valid.', 400);
    }

    const passwordValidation = validatePasswordPolicy(password);
    if (!passwordValidation.valid) {
        return errorResponse(res, passwordValidation.message, 400);
    }

    req.body.nik = normalizedNik;
    req.body.username = normalizedUsername;
    req.body.email = normalizedEmail;

    next();
};

const validateLogin = (req, res, next) => {
    const { identifier, email, username, password } = req.body;
    const loginIdentifier = identifier || email || username;

    if (!loginIdentifier || !password) {
        return errorResponse(res, 'Email/username dan password wajib diisi.', 400);
    }

    next();
};

module.exports = {
    validateRegister,
    validateLogin
};