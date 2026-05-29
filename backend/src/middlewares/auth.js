const jwt = require('jsonwebtoken');

/**
 * Middleware: Verifikasi JWT token
 * Ambil token dari header Authorization: Bearer <token>
 */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Akses ditolak. Access token tidak ditemukan.'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { nik, id_role, iat, exp }
        next();
    } catch (err) {
        const isExpired = err && err.name === 'TokenExpiredError';
        return res.status(401).json({
            success: false,
            message: isExpired ? 'Access token sudah kadaluarsa.' : 'Access token tidak valid.'
        });
    }
};

/**
 * Middleware: Otorisasi berdasarkan role
 * Contoh: authorizeRoles('RL-002', 'RL-003')
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.id_role)) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses ke resource ini.'
            });
        }
        next();
    };
};

module.exports = { verifyToken, authorizeRoles };