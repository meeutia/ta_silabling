const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

const {
  sequelize,
  User,
  Role,
  Pegawai,
  Pelanggan,
  Fppl,
} = require('../models/Associations');

const { generateId } = require('../utils/id-generator');
const Roles = require('../constants/roles');
const {
  assertPasswordPolicy,
  assertUsernamePolicy,
  generateTemporaryPassword,
} = require('../utils/password-policy.util');

const STAFF_ROLE_LABEL_TO_ID = {
  Admin: Roles.ADMIN,
  'Petugas Pendaftaran': Roles.ADMIN,
  'Kasi Pengujian': Roles.KASI,
  Penyelia: Roles.PENYELIA,
  Analis: Roles.ANALIS,
  'Pengendalian Mutu': Roles.QC,
  'Kasi Pengendalian Mutu': Roles.QC,
  'Kepala Lab': Roles.KALAB,
  'Kepala Laboratorium': Roles.KALAB,
  PCC: Roles.ADMIN,
};

const ROLE_ID_TO_LABEL = {
  [Roles.ADMIN]: 'Admin',
  [Roles.KASI]: 'Kasi Pengujian',
  [Roles.PENYELIA]: 'Penyelia',
  [Roles.ANALIS]: 'Analis',
  [Roles.QC]: 'Pengendalian Mutu',
  [Roles.KALAB]: 'Kepala Lab',
  [Roles.CUSTOMER]: 'Pelanggan',
};

const STAFF_ROLE_ORDER = [
  Roles.ADMIN,
  Roles.KALAB,
  Roles.KASI,
  Roles.QC,
  Roles.PENYELIA,
  Roles.ANALIS,
];

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeStatus(value) {
  const status = normalizeText(value) || 'Aktif';
  return status === 'Nonaktif' ? 0 : 1;
}

function statusLabel(isActive) {
  return Number(isActive) === 1 ? 'Aktif' : 'Nonaktif';
}

function getPlain(instance) {
  return instance ? instance.get({ plain: true }) : null;
}

function pickObject(source, keys = []) {
  for (const key of keys) {
    if (source?.[key]) return source[key];
  }
  return {};
}

function pickArray(source, keys = []) {
  for (const key of keys) {
    if (Array.isArray(source?.[key])) return source[key];
  }
  return [];
}

function validateNik(nik) {
  const value = normalizeText(nik);
  if (!/^\d{16}$/.test(value)) throw new Error('NIK wajib 16 digit angka.');
  return value;
}

function validateUsername(username) {
  return assertUsernamePolicy(username);
}

function validateEmail(email) {
  const value = normalizeEmail(email);
  if (!value) throw new Error('Email wajib diisi.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Format email tidak valid.');
  return value;
}

function generateRandomPassword() {
  return generateTemporaryPassword();
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

function getStaffRoleId(role) {
  const roleText = normalizeText(role);

  if (STAFF_ROLE_LABEL_TO_ID[roleText]) return STAFF_ROLE_LABEL_TO_ID[roleText];

  if (
    [
      Roles.ADMIN,
      Roles.KASI,
      Roles.PENYELIA,
      Roles.ANALIS,
      Roles.QC,
      Roles.KALAB,
    ].includes(roleText)
  ) {
    return roleText;
  }

  throw new Error('Role petugas tidak valid.');
}

function buildPasswordFromPayload(data = {}) {
  const passwordMode = normalizeText(data.passwordMode || data.password_mode || 'generate');

  if (passwordMode === 'manual') {
    const password = assertPasswordPolicy(data.password);
    const confirmPassword = String(data.confirmPassword || data.confirm_password || '');

    if (confirmPassword && password !== confirmPassword) {
      throw new Error('Konfirmasi password tidak sesuai.');
    }

    return { password, isGenerated: false };
  }

  return { password: generateRandomPassword(), isGenerated: true };
}

async function ensureUniqueUser({ nik, username, email, excludeNik = null }, transaction = null) {
  const or = [];

  if (nik) or.push({ nik });
  if (username) or.push({ username });
  if (email) or.push({ email });

  if (!or.length) return;

  const where = { [Op.or]: or };

  if (excludeNik) {
    where.nik = { [Op.ne]: excludeNik };
  }

  const duplicate = await User.findOne({
    where,
    attributes: ['nik', 'username', 'email'],
    transaction,
  });

  if (!duplicate) return;

  const row = getPlain(duplicate);

  if (nik && row.nik === nik) throw new Error('NIK sudah terdaftar.');
  if (username && row.username === username) throw new Error('Username sudah terdaftar.');
  if (email && row.email === email) throw new Error('Email sudah terdaftar.');

  throw new Error('Data akun sudah terdaftar.');
}

function mapStaffRow(row) {
  const hasAccount = Boolean(row.nik && row.username);
  const roleLabel = row.is_pcc ? 'PCC' : ROLE_ID_TO_LABEL[row.id_role] || row.nama_role || row.id_role || 'Petugas';

  return {
    id: row.id_pegawai || row.nik,
    nik: row.nik,
    id_pegawai: row.id_pegawai,
    name: row.nama_pegawai || row.username,
    nama_pegawai: row.nama_pegawai,
    username: row.username || null,
    role: roleLabel,
    id_role: row.id_role || null,
    email: row.email || null,
    phone: row.no_wa,
    no_wa: row.no_wa,
    status: hasAccount ? statusLabel(row.is_active) : 'Tanpa Akun',
    is_active: hasAccount ? Number(row.is_active || 0) : null,
    lastLogin: row.last_login_at || null,
    nip: row.nip,
    is_pcc: Number(row.is_pcc || 0),
    has_account: hasAccount,
    hasAccount,
  };
}

function mapCustomerRow(row) {
  const hasPortalAccount = Boolean(row.user_nik);
  const portalIsActive = hasPortalAccount ? Number(row.user_is_active ?? row.is_active ?? 0) : 0;

  return {
    id: row.id_pelanggan,
    id_pelanggan: row.id_pelanggan,
    nik: row.nik,
    name: row.pic || row.nama_instansi,
    company: row.nama_instansi,
    nama_instansi: row.nama_instansi,
    pic: row.pic,

    // Kontak pelanggan/instansi. Ini bukan selalu email login portal.
    email: row.email_kontak,
    email_kontak: row.email_kontak,
    contactEmail: row.email_kontak,
    phone: row.no_telp,
    no_telp: row.no_telp,

    // Status di halaman admin adalah status akun portal user yang terhubung ke NIK pelanggan.
    status: hasPortalAccount ? statusLabel(portalIsActive) : 'Belum aktif',
    is_active: portalIsActive,
    portalStatus: hasPortalAccount ? statusLabel(portalIsActive) : 'Belum aktif',
    hasPortalAccount,
    hasPortalAccess: hasPortalAccount,

    customerType: row.customer_type || '-',
    totalRequests: Number(row.total_requests || 0),
    linkedCustomerCount: Number(row.linked_customer_count || 1),
    address: row.alamat,
    alamat: row.alamat,
    city: row.city || null,
    province: row.province || null,

    portalUsername: row.username || null,
    username: row.username || null,
    portalEmail: row.user_email || null,
    user_email: row.user_email || null,
    userNik: row.user_nik || row.nik || null,
    user_nik: row.user_nik || row.nik || null,
    lastLogin: row.last_login_at || null,
  };
}

function flattenStaffUser(userInstance) {
  const user = getPlain(userInstance) || {};
  const role = pickObject(user, ['role', 'Role']);
  const pegawai = pickObject(user, ['pegawai', 'Pegawai']);

  return mapStaffRow({
    ...user,
    nama_role: role.nama_role,
    id_pegawai: pegawai.id_pegawai,
    nip: pegawai.nip,
    nama_pegawai: pegawai.nama_pegawai,
    no_wa: pegawai.no_wa,
    is_pcc: pegawai.is_pcc,
    last_login_at: null,
  });
}

function flattenStaffPegawai(pegawaiInstance) {
  const pegawai = getPlain(pegawaiInstance) || {};
  const user = pickObject(pegawai, ['user', 'User']);
  const role = pickObject(user, ['role', 'Role']);

  return mapStaffRow({
    ...user,
    nama_role: role.nama_role,
    id_pegawai: pegawai.id_pegawai,
    nik: pegawai.nik || user.nik || null,
    nip: pegawai.nip,
    nama_pegawai: pegawai.nama_pegawai,
    no_wa: pegawai.no_wa,
    is_pcc: pegawai.is_pcc,
    last_login_at: null,
  });
}

function flattenCustomer(customerInstance) {
  const customer = getPlain(customerInstance) || {};
  const user = pickObject(customer, ['user', 'User']);
  const requests = pickArray(customer, ['permintaan']);

  return mapCustomerRow({
    ...customer,
    user_nik: user.nik,
    username: user.username,
    user_email: user.email,
    user_is_active: user.is_active,
    last_login_at: null,
    total_requests: requests.length,
    customer_type: null,
    city: null,
    province: null,
  });
}

async function listRoles() {
  const rows = await Role.findAll({
    attributes: ['id_role', 'nama_role'],
    order: [['id_role', 'ASC']],
  });

  return rows.map((row) => row.get({ plain: true }));
}

async function listStaff(query = {}) {
  const search = normalizeText(query.search || query.q).toLowerCase();
  const role = normalizeText(query.role);
  const status = normalizeText(query.status);

  const pegawaiRows = await Pegawai.findAll({
    include: [
      {
        model: User,
        required: false,
        include: [{ model: Role, required: false }],
      },
    ],
  });

  let rows = pegawaiRows.map(flattenStaffPegawai);

  if (role && role !== 'Semua') {
    if (role === 'PCC') {
      rows = rows.filter((row) => Number(row.is_pcc || 0) === 1);
    } else {
      const roleId = getStaffRoleId(role);
      rows = rows.filter((row) => row.id_role === roleId);
    }
  }

  if (status && status !== 'Semua') {
    rows = rows.filter((row) => row.status === status);
  }

  if (search) {
    rows = rows.filter((row) =>
      [row.nik, row.username, row.email, row.nama_pegawai, row.nip, row.no_wa, row.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }

  return rows.sort((a, b) => {
    const roleDiff =
      STAFF_ROLE_ORDER.indexOf(a.id_role) - STAFF_ROLE_ORDER.indexOf(b.id_role);

    if (roleDiff !== 0) return roleDiff;

    return String(a.nama_pegawai || a.username || '').localeCompare(
      String(b.nama_pegawai || b.username || '')
    );
  });
}

async function getStaffByNik(identifier, transaction = null) {
  const value = normalizeText(identifier);
  if (!value) throw new Error('Identitas petugas wajib dikirim.');

  const isNik = /^\d{16}$/.test(value);

  if (isNik) {
    const user = await User.findOne({
      where: {
        nik: value,
        id_role: {
          [Op.ne]: Roles.CUSTOMER,
        },
      },
      include: [
        { model: Role, required: true },
        { model: Pegawai, required: false },
      ],
      transaction,
    });

    if (!user) throw new Error('Akun petugas tidak ditemukan.');

    return flattenStaffUser(user);
  }

  const pegawai = await Pegawai.findOne({
    where: { id_pegawai: value },
    include: [
      {
        model: User,
        required: false,
        include: [{ model: Role, required: false }],
      },
    ],
    transaction,
  });

  if (!pegawai) throw new Error('Petugas tidak ditemukan.');

  return flattenStaffPegawai(pegawai);
}

async function createStaff(data = {}) {
  return sequelize.transaction(async (transaction) => {
    const hasAccount = !(
      data.hasAccount === false ||
      data.has_account === false ||
      data.hasAccount === 'false' ||
      data.has_account === 'false' ||
      normalizeText(data.role) === 'PCC'
    );

    const name = normalizeText(data.name || data.nama_pegawai);
    if (!name) throw new Error('Nama petugas wajib diisi.');

    const phone = normalizeText(data.phone || data.no_wa).replace(/\D/g, '').slice(0, 13);
    const nip = normalizeText(data.nip).slice(0, 18);
    const isPcc = normalizeText(data.role) === 'PCC' || Number(data.is_pcc || 0) === 1 ? 1 : 0;

    if (!hasAccount) {
      const idPegawai =
        normalizeText(data.id_pegawai) ||
        await generateId(Pegawai, 'id_pegawai', 'PGW-', transaction, 3);

      await Pegawai.create(
        {
          id_pegawai: idPegawai,
          nik: null,
          nip: nip || null,
          nama_pegawai: name,
          no_wa: phone || null,
          is_pcc: isPcc || 1,
        },
        { transaction }
      );

      const pegawai = await Pegawai.findByPk(idPegawai, {
        include: [{ model: User, required: false, include: [{ model: Role, required: false }] }],
        transaction,
      });

      return {
        staff: flattenStaffPegawai(pegawai),
        temporaryPassword: null,
      };
    }

    const nik = validateNik(data.nik);
    const username = validateUsername(data.username);
    const email = validateEmail(data.email);
    const roleId = getStaffRoleId(data.role || data.id_role);

    await ensureUniqueUser({ nik, username, email }, transaction);

    const { password, isGenerated } = buildPasswordFromPayload(data);
    const hashedPassword = await hashPassword(password);

    await User.create(
      {
        nik,
        id_role: roleId,
        username,
        email,
        password: hashedPassword,
        is_active: normalizeStatus(data.status),
      },
      { transaction }
    );

    const idPegawai =
      normalizeText(data.id_pegawai) ||
      await generateId(Pegawai, 'id_pegawai', 'PGW-', transaction, 3);

    await Pegawai.create(
      {
        id_pegawai: idPegawai,
        nik,
        nip: nip || null,
        nama_pegawai: name,
        no_wa: phone || null,
        is_pcc: isPcc,
      },
      { transaction }
    );

    const staff = await getStaffByNik(nik, transaction);

    return {
      staff,
      temporaryPassword: isGenerated ? password : null,
    };
  });
}

async function setStaffStatus(nik, isActive) {
  const staff = await getStaffByNik(nik);
  if (!staff.has_account && !staff.hasAccount) throw new Error('Petugas ini tidak memiliki akun login.');

  const userNik = validateNik(staff.nik);
  const nextActive = Number(isActive) === 1 ? 1 : 0;

  if (nextActive === 0 && staff.id_role === Roles.ADMIN) {
    const activeAdminCount = await User.count({
      where: {
        id_role: Roles.ADMIN,
        is_active: 1,
      },
    });

    if (activeAdminCount <= 1) {
      throw new Error('Minimal harus ada 1 akun Admin aktif.');
    }
  }

  await User.update(
    {
      is_active: nextActive,
      refresh_token_hash: null,
      refresh_token_expires_at: null,
    },
    {
      where: { nik: userNik },
    }
  );

  return getStaffByNik(userNik);
}

async function resetStaffPassword(nik, data = {}) {
  const staff = await getStaffByNik(nik);
  if (!staff.has_account && !staff.hasAccount) throw new Error('Petugas ini tidak memiliki akun login.');
  const userNik = validateNik(staff.nik);

  const password = data.password
    ? assertPasswordPolicy(data.password)
    : generateRandomPassword();

  const hashedPassword = await hashPassword(password);

  await User.update(
    {
      password: hashedPassword,
      refresh_token_hash: null,
      refresh_token_expires_at: null,
    },
    {
      where: { nik: userNik },
    }
  );

  return {
    nik: userNik,
    temporaryPassword: password,
  };
}

async function listCustomers(query = {}) {
  const search = normalizeText(query.search || query.q).toLowerCase();
  const status = normalizeText(query.status);

  const customers = await Pelanggan.findAll({
    include: [
      { model: User, required: false },
      { model: Fppl, as: 'permintaan', required: false },
    ],
    order: [['id_pelanggan', 'DESC']],
  });

  let rows = customers.map(flattenCustomer);

  const customerCountByNik = rows.reduce((acc, row) => {
    const key = row.nik || row.user_nik || '';
    if (key) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  rows = rows.map((row) => ({
    ...row,
    linkedCustomerCount: customerCountByNik[row.nik || row.user_nik || ''] || 1,
  }));

  if (status && status !== 'Semua') {
    rows = rows.filter((row) => row.status === status);
  }

  if (search) {
    rows = rows.filter((row) =>
      [
        row.id_pelanggan,
        row.nik,
        row.nama_instansi,
        row.pic,
        row.no_telp,
        row.email_kontak,
        row.username,
        row.email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }

  return rows;
}

async function getCustomerById(idPelanggan, transaction = null) {
  const id = normalizeText(idPelanggan);
  if (!id) throw new Error('ID pelanggan wajib dikirim.');

  const customer = await Pelanggan.findOne({
    where: { id_pelanggan: id },
    include: [
      { model: User, required: false },
      { model: Fppl, as: 'permintaan', required: false },
    ],
    transaction,
  });

  if (!customer) throw new Error('Pelanggan tidak ditemukan.');

  return flattenCustomer(customer);
}

async function setCustomerStatus(idPelanggan, isActive) {
  const customer = await getCustomerById(idPelanggan);
  if (!customer.hasPortalAccount && !customer.hasPortalAccess) {
    throw new Error('Pelanggan ini belum memiliki akun portal mandiri.');
  }

  await User.update(
    {
      is_active: Number(isActive) === 1 ? 1 : 0,
      refresh_token_hash: null,
      refresh_token_expires_at: null,
    },
    {
      where: { nik: customer.nik },
    }
  );

  return getCustomerById(idPelanggan);
}

async function resetCustomerPassword(idPelanggan, data = {}) {
  const customer = await getCustomerById(idPelanggan);
  if (!customer.hasPortalAccount && !customer.hasPortalAccess) {
    throw new Error('Pelanggan ini belum memiliki akun portal mandiri.');
  }

  const password = data.password
    ? assertPasswordPolicy(data.password)
    : generateRandomPassword();

  const hashedPassword = await hashPassword(password);

  await User.update(
    {
      password: hashedPassword,
      refresh_token_hash: null,
      refresh_token_expires_at: null,
    },
    {
      where: { nik: customer.nik },
    }
  );

  return {
    id_pelanggan: customer.id_pelanggan,
    nik: customer.nik,
    temporaryPassword: password,
  };
}


module.exports = {
  listRoles,

  listStaff,
  getStaffByNik,
  createStaff,
  setStaffStatus,
  resetStaffPassword,

  listCustomers,
  getCustomerById,
  setCustomerStatus,
  resetCustomerPassword,
};