const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const { User, Role, Pelanggan } = require('../models/Associations');
const Roles = require('../constants/roles');
const { sendMail } = require('../utils/mailer');
const { assertPasswordPolicy, assertUsernamePolicy } = require('../utils/password-policy.util');

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || 7);
const RESET_PASSWORD_EXPIRES_MINUTES = Number(process.env.RESET_PASSWORD_EXPIRES_MINUTES || 15);

const generateToken = (user) => {
  return jwt.sign(
    { nik: user.nik, id_role: user.id_role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(48).toString('hex');
};

const hashRefreshToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const hashResetToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const getRefreshExpiryDate = () => {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);
};

const getResetPasswordExpiryDate = () => {
  return new Date(Date.now() + RESET_PASSWORD_EXPIRES_MINUTES * 60 * 1000);
};

const escapeHtml = (value) => {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const getPlain = (instance) => {
  return instance && typeof instance.get === 'function'
    ? instance.get({ plain: true })
    : instance;
};

const getRoleFromUser = (user) => {
  return user?.role || user?.Role || null;
};

const getPelanggansFromUser = (user) => {
  if (Array.isArray(user?.pelanggans)) return user.pelanggans;
  if (Array.isArray(user?.Pelanggans)) return user.Pelanggans;
  if (Array.isArray(user?.pelanggan)) return user.pelanggan;
  if (Array.isArray(user?.Pelanggan)) return user.Pelanggan;
  return [];
};

const buildUserPayload = (userInstance) => {
  const user = getPlain(userInstance) || {};
  const role = getRoleFromUser(user);
  const pelanggans = getPelanggansFromUser(user);
  const pel = pelanggans.length > 0 ? pelanggans[0] : null;

  return {
    nik: user.nik,
    username: user.username,
    email: user.email,
    id_role: user.id_role,
    nama_role: role ? role.nama_role : null,

    id_pelanggan: pel ? pel.id_pelanggan : null,
    no_telp: pel ? pel.no_telp : null,
    alamat: pel ? pel.alamat : null,
    nama_instansi: pel ? pel.nama_instansi : null,
    pic: pel ? pel.pic : null,
    email_kontak: pel ? pel.email_kontak : null,
  };
};

const findUserWithProfile = async (where) => {
  return User.findOne({
    where,
    include: [
      {
        model: Role,
        attributes: ['nama_role'],
      },
      {
        model: Pelanggan,
        attributes: [
          'id_pelanggan',
          'no_telp',
          'alamat',
          'nama_instansi',
          'pic',
          'email_kontak',
        ],
      },
    ],
  });
};

const register = async (data) => {
  const { nik, username, email, password } = data;

  const normalizedNik = String(nik || '').trim();
  const normalizedUsername = String(username || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedNik || !/^\d{16}$/.test(normalizedNik)) {
    throw new Error('NIK harus 16 digit angka.');
  }

  assertUsernamePolicy(normalizedUsername);

  if (!normalizedEmail) {
    throw new Error('Email wajib diisi.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Format email tidak valid.');
  }

  const normalizedPassword = assertPasswordPolicy(password);

  const existingNik = await User.findByPk(normalizedNik);
  if (existingNik) {
    throw new Error('NIK sudah terdaftar.');
  }

  const existingEmail = await User.findOne({
    where: { email: normalizedEmail },
  });
  if (existingEmail) {
    throw new Error('Email sudah terdaftar.');
  }

  const existingUsername = await User.findOne({
    where: { username: normalizedUsername },
  });
  if (existingUsername) {
    throw new Error('Username sudah terdaftar.');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(normalizedPassword, salt);

  const newUser = await User.create({
    nik: normalizedNik,
    username: normalizedUsername,
    email: normalizedEmail,
    password: hashedPassword,
    id_role: Roles.CUSTOMER,
    is_active: 1,
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const refreshExpiresAt = getRefreshExpiryDate();

  await newUser.update({
    refresh_token_hash: refreshTokenHash,
    refresh_token_expires_at: refreshExpiresAt,
  });

  const userWithProfile = await findUserWithProfile({ nik: normalizedNik });
  const token = generateToken(userWithProfile);

  return {
    user: buildUserPayload(userWithProfile),
    token,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    refreshToken,
  };
};

const login = async (identifier, password) => {
  const normalizedIdentifier = String(identifier || '').trim();
  const normalizedEmail = normalizedIdentifier.toLowerCase();

  if (!normalizedIdentifier || !password) {
    throw new Error('Email/username dan password wajib diisi.');
  }

  const user = await User.findOne({
    where: {
      [Op.or]: [
        { email: normalizedEmail },
        { username: normalizedIdentifier },
        { nik: normalizedIdentifier },
      ],
    },
    include: [
      {
        model: Role,
        attributes: ['nama_role'],
      },
      {
        model: Pelanggan,
        attributes: [
          'id_pelanggan',
          'no_telp',
          'alamat',
          'nama_instansi',
          'pic',
          'email_kontak',
        ],
      },
    ],
  });

  if (!user) {
    throw new Error(`Username/email atas nama "${normalizedIdentifier}" tidak terdaftar. Silakan melakukan register.`);
  }

  if (!user.is_active) {
    throw new Error('Akun Anda telah dinonaktifkan.');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Email atau password salah.');
  }

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const refreshExpiresAt = getRefreshExpiryDate();

  await user.update({
    refresh_token_hash: refreshTokenHash,
    refresh_token_expires_at: refreshExpiresAt,
  });

  const token = generateToken(user);

  return {
    user: buildUserPayload(user),
    token,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    refreshToken,
  };
};

const forgotPassword = async (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Email wajib diisi.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Format email tidak valid.');
  }

  const user = await User.findOne({
    where: { email: normalizedEmail },
  });

  // Sengaja generic supaya tidak membocorkan email mana yang terdaftar.
  if (!user) {
    return { sent: true };
  }

  // Tetap generic juga supaya status akun tidak mudah ditebak dari luar.
  if (!user.is_active) {
    return { sent: true };
  }

  const resetToken = generateResetToken();
  const resetTokenHash = hashResetToken(resetToken);
  const expiresAt = getResetPasswordExpiryDate();

  await user.update({
    reset_password_token_hash: resetTokenHash,
    reset_password_expires_at: expiresAt,
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const safeUsername = escapeHtml(user.username || user.email || 'Pengguna');

  await sendMail({
    to: user.email,
    subject: 'Reset Kata Sandi Akun SILABLING',
    text:
      `Halo ${user.username || 'Pengguna'},\n\n` +
      `Kami menerima permintaan reset kata sandi untuk akun SILABLING Anda.\n\n` +
      `Klik link berikut untuk membuat kata sandi baru:\n${resetUrl}\n\n` +
      `Link ini berlaku selama ${RESET_PASSWORD_EXPIRES_MINUTES} menit.\n\n` +
      `Jika Anda tidak meminta reset kata sandi, abaikan email ini.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 12px;">Reset Kata Sandi SILABLING</h2>
        <p>Halo <strong>${safeUsername}</strong>,</p>
        <p>Kami menerima permintaan reset kata sandi untuk akun SILABLING Anda.</p>
        <p>Klik tombol berikut untuk membuat kata sandi baru:</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:bold;">
            Reset Kata Sandi
          </a>
        </p>
        <p>Link ini berlaku selama <strong>${RESET_PASSWORD_EXPIRES_MINUTES} menit</strong>.</p>
        <p>Jika tombol tidak bisa diklik, salin link berikut ke browser:</p>
        <p style="word-break:break-all;color:#374151;background:#f3f4f6;padding:12px;border-radius:8px;">${resetUrl}</p>
        <p>Jika Anda tidak meminta reset kata sandi, abaikan email ini.</p>
      </div>
    `,
  });

  return { sent: true };
};

const resetPassword = async ({ token, password, confirmPassword }) => {
  const resetToken = String(token || '').trim();
  const newPassword = String(password || '');
  const confirmation = String(confirmPassword || '');

  if (!resetToken) {
    throw new Error('Token reset tidak valid.');
  }

  const normalizedPassword = assertPasswordPolicy(newPassword, 'Password baru minimal 8 karakter dan harus mengandung huruf serta angka.');

  if (!confirmation) {
    throw new Error('Konfirmasi password wajib diisi.');
  }

  if (newPassword !== confirmation) {
    throw new Error('Konfirmasi password tidak sesuai.');
  }

  const resetTokenHash = hashResetToken(resetToken);

  const user = await User.findOne({
    where: {
      reset_password_token_hash: resetTokenHash,
      reset_password_expires_at: {
        [Op.gt]: new Date(),
      },
    },
  });

  if (!user) {
    throw new Error('Link reset password tidak valid atau sudah kedaluwarsa.');
  }

  if (!user.is_active) {
    throw new Error('Akun Anda telah dinonaktifkan.');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(normalizedPassword, salt);

  await user.update({
    password: hashedPassword,
    reset_password_token_hash: null,
    reset_password_expires_at: null,
    refresh_token_hash: null,
    refresh_token_expires_at: null,
  });

  return { success: true };
};

const refresh = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw new Error('Refresh token tidak ditemukan.');
  }

  const refreshTokenHash = hashRefreshToken(incomingRefreshToken);
  const user = await findUserWithProfile({ refresh_token_hash: refreshTokenHash });

  if (!user) {
    throw new Error('Refresh token tidak valid.');
  }

  if (!user.refresh_token_expires_at || new Date(user.refresh_token_expires_at) <= new Date()) {
    await user.update({
      refresh_token_hash: null,
      refresh_token_expires_at: null,
    });

    throw new Error('Refresh token sudah kadaluarsa.');
  }

  if (!user.is_active) {
    await user.update({
      refresh_token_hash: null,
      refresh_token_expires_at: null,
    });

    throw new Error('Akun Anda telah dinonaktifkan.');
  }

  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
  const refreshExpiresAt = getRefreshExpiryDate();

  await user.update({
    refresh_token_hash: newRefreshTokenHash,
    refresh_token_expires_at: refreshExpiresAt,
  });

  const token = generateToken(user);

  return {
    user: buildUserPayload(user),
    token,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    refreshToken: newRefreshToken,
  };
};

const logout = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    return;
  }

  const refreshTokenHash = hashRefreshToken(incomingRefreshToken);

  const user = await User.findOne({
    where: { refresh_token_hash: refreshTokenHash },
  });

  if (user) {
    await user.update({
      refresh_token_hash: null,
      refresh_token_expires_at: null,
    });
  }
};

const getMe = async (nik) => {
  const user = await findUserWithProfile({ nik });

  if (!user) {
    throw new Error('User tidak ditemukan.');
  }

  return buildUserPayload(user);
};

module.exports = {
  generateToken,
  generateRefreshToken,
  hashRefreshToken,
  getRefreshExpiryDate,
  buildUserPayload,
  findUserWithProfile,
  register,
  login,
  forgotPassword,
  resetPassword,
  refresh,
  logout,
  getMe,
};