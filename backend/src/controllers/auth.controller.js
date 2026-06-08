const AuthService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response');
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'refresh_token';
const REFRESH_TOKEN_EXPIRES_IN_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || 7);
class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    getRefreshCookieOptions = () => {
        const isProduction = process.env.NODE_ENV === 'production';
        return {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: '/auth',
            maxAge: REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
        };
    };
    clearRefreshCookieOptions = () => {
        const isProduction = process.env.NODE_ENV === 'production';
        return {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: '/auth',
        };
    };
    parseCookies = (cookieHeader = '') => {
        return cookieHeader.split(';').reduce((acc, current) => {
            const trimmed = current.trim();
            if (!trimmed)
                return acc;
            const separatorIndex = trimmed.indexOf('=');
            if (separatorIndex === -1)
                return acc;
            const key = trimmed.slice(0, separatorIndex).trim();
            const value = trimmed.slice(separatorIndex + 1).trim();
            if (!key)
                return acc;
            acc[key] = decodeURIComponent(value);
            return acc;
        }, {});
    };
    register = async (req, res) => {
        try {
            const { nik, username, email, password } = req.body;
            const result = await this.authService.register({
                nik,
                username,
                email,
                password,
            });
            res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, this.getRefreshCookieOptions());
            return successResponse(res, 'Registrasi berhasil.', {
                token: result.token,
                expiresIn: result.expiresIn,
                user: result.user,
            }, 201);
        }
        catch (error) {
            console.error('Register error:', error.message);
            let code = 500;
            if (error.message.includes('wajib diisi') ||
                error.message.includes('tidak boleh') ||
                error.message.includes('minimal') ||
                error.message.includes('harus')) {
                code = 400;
            }
            else if (error.message.includes('sudah terdaftar')) {
                code = 409;
            }
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', code);
        }
    };
    login = async (req, res) => {
        try {
            const { identifier, email, username, password } = req.body;
            const loginIdentifier = identifier || email || username;
            const result = await this.authService.login(loginIdentifier, password);
            res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, this.getRefreshCookieOptions());
            return successResponse(res, 'Login berhasil.', {
                token: result.token,
                expiresIn: result.expiresIn,
                user: result.user,
            }, 200);
        }
        catch (error) {
            console.error('Login error:', error.message);
            let code = 500;
            if (error.message.includes('tidak terdaftar')) {
                code = 404;
            }
            else if (error.message.includes('wajib diisi') ||
                error.message.includes('tidak ditemukan') ||
                error.message.includes('salah')) {
                code = 401;
            }
            else if (error.message.includes('dinonaktifkan')) {
                code = 403;
            }
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', code);
        }
    };
    refresh = async (req, res) => {
        try {
            const cookies = this.parseCookies(req.headers.cookie || '');
            const incomingRefreshToken = cookies[REFRESH_COOKIE_NAME];
            if (!incomingRefreshToken) {
                res.clearCookie(REFRESH_COOKIE_NAME, this.clearRefreshCookieOptions());
                return errorResponse(res, 'Refresh token tidak ditemukan.', 401);
            }
            const result = await this.authService.refresh(incomingRefreshToken);
            res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, this.getRefreshCookieOptions());
            return successResponse(res, 'Access token berhasil diperbarui.', {
                token: result.token,
                expiresIn: result.expiresIn,
                user: result.user,
            }, 200);
        }
        catch (error) {
            console.error('Refresh token error:', error.message);
            res.clearCookie(REFRESH_COOKIE_NAME, this.clearRefreshCookieOptions());
            const code = error.message.includes('dinonaktifkan') ? 403 : 401;
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', code);
        }
    };
    logout = async (req, res) => {
        try {
            const cookies = this.parseCookies(req.headers.cookie || '');
            const incomingRefreshToken = cookies[REFRESH_COOKIE_NAME];
            if (incomingRefreshToken) {
                await this.authService.logout(incomingRefreshToken);
            }
            res.clearCookie(REFRESH_COOKIE_NAME, this.clearRefreshCookieOptions());
            return successResponse(res, 'Logout berhasil.', null, 200);
        }
        catch (error) {
            console.error('Logout error:', error.message);
            res.clearCookie(REFRESH_COOKIE_NAME, this.clearRefreshCookieOptions());
            return errorResponse(res, 'Terjadi kesalahan pada server.', 500);
        }
    };
    getMe = async (req, res) => {
        try {
            const user = await this.authService.getMe(req.user.nik);
            return successResponse(res, 'Get user profile successful.', { user }, 200);
        }
        catch (error) {
            console.error('GetMe error:', error.message);
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 500);
        }
    };
    forgotPassword = async (req, res) => {
        try {
            const { email } = req.body;
            await this.authService.forgotPassword(email);
            return successResponse(res, 'Jika email terdaftar, link reset kata sandi telah dikirim ke email tersebut.', null, 200);
        }
        catch (error) {
            console.error('Forgot password error:', error.message);
            let code = 500;
            if (error.message.includes('Email') ||
                error.message.includes('Format email')) {
                code = 400;
            }
            else if (error.message.includes('dinonaktifkan')) {
                code = 403;
            }
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', code);
        }
    };
    resetPassword = async (req, res) => {
        try {
            const { token, password, confirmPassword } = req.body;
            await this.authService.resetPassword({
                token,
                password,
                confirmPassword,
            });
            return successResponse(res, 'Password berhasil diubah. Silakan login dengan password baru.', null, 200);
        }
        catch (error) {
            console.error('Reset password error:', error.message);
            return errorResponse(res, error.message || 'Gagal mengubah password.', 400);
        }
    };
}
module.exports = new AuthController(AuthService);
module.exports.AuthController = AuthController;
