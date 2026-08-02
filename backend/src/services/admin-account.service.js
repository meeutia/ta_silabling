const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize, User, Role, Pegawai, Pelanggan, Fppl, } = require('../models/Associations');
const { generateId } = require('../utils/id-generator');
const Roles = require('../constants/roles');
const { assertPasswordPolicy, assertUsernamePolicy, generateTemporaryPassword, } = require('../utils/password-policy.util');
const STAFF_ROLE_LABEL_TO_ID = {
    Admin: Roles.ADMIN,
    'Petugas Pendaftaran': Roles.ADMIN,
    'Kasi Pengujian': Roles.KASI,
    Penyelia: Roles.PENYELIA,
    Analis: Roles.ANALIS,
    'Pengendalian Mutu': Roles.QC,
    'Kasi Pengendalian Mutu': Roles.QC,
    PCC: Roles.ADMIN,
};
const ROLE_ID_TO_LABEL = {
    [Roles.ADMIN]: 'Admin',
    [Roles.KASI]: 'Kasi Pengujian',
    [Roles.PENYELIA]: 'Penyelia',
    [Roles.ANALIS]: 'Analis',
    [Roles.QC]: 'Pengendalian Mutu',
    [Roles.CUSTOMER]: 'Pelanggan',
};
const STAFF_ROLE_ORDER = [
    Roles.ADMIN,
    Roles.KASI,
    Roles.QC,
    Roles.PENYELIA,
    Roles.ANALIS,
];
class AdminAccountService {
normalizeText = (value) => {
        return String(value || '').trim();
    };
    normalizeEmail = (value) => {
        return this.normalizeText(value).toLowerCase();
    };
    normalizeStatus = (value) => {
        const status = this.normalizeText(value) || 'Aktif';
        return status === 'Nonaktif' ? 0 : 1;
    };
    statusLabel = (isActive) => {
        return Number(isActive) === 1 ? 'Aktif' : 'Nonaktif';
    };
    getPlain = (instance) => {
        return instance ? instance.get({ plain: true }) : null;
    };
    pickObject = (source, keys = []) => {
        for (const key of keys) {
            if (source?.[key])
                return source[key];
        }
        return {};
    };
    pickArray = (source, keys = []) => {
        for (const key of keys) {
            if (Array.isArray(source?.[key]))
                return source[key];
        }
        return [];
    };
    validateNik = (nik) => {
        const value = this.normalizeText(nik);
        if (!/^\d{16}$/.test(value))
            throw new Error('NIK wajib 16 digit angka.');
        return value;
    };
    validateUsername = (username) => {
        return assertUsernamePolicy(username);
    };
    validateEmail = (email) => {
        const value = this.normalizeEmail(email);
        if (!value)
            throw new Error('Email wajib diisi.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
            throw new Error('Format email tidak valid.');
        return value;
    };
    generateRandomPassword = () => {
        return generateTemporaryPassword();
    };
    hashPassword = async (password) => {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    };
    getStaffRoleId = (role) => {
        const roleText = this.normalizeText(role);
        if (STAFF_ROLE_LABEL_TO_ID[roleText])
            return STAFF_ROLE_LABEL_TO_ID[roleText];
        if ([
            Roles.ADMIN,
            Roles.KASI,
            Roles.PENYELIA,
            Roles.ANALIS,
            Roles.QC,
                ].includes(roleText)) {
            return roleText;
        }
        throw new Error('Role petugas tidak valid.');
    };
    buildPasswordFromRequestData = (data = {}) => {
        const passwordMode = this.normalizeText(data.passwordMode || data.password_mode || 'generate');
        if (passwordMode === 'manual') {
            const password = assertPasswordPolicy(data.password);
            const confirmPassword = String(data.confirmPassword || data.confirm_password || '');
            if (confirmPassword && password !== confirmPassword) {
                throw new Error('Konfirmasi password tidak sesuai.');
            }
            return { password, isGenerated: false };
        }
        return { password: this.generateRandomPassword(), isGenerated: true };
    };
    ensureUniqueUser = async ({ nik, username, email, excludeNik = null }, transaction = null) => {
        const or = [];
        if (nik)
            or.push({ nik });
        if (username)
            or.push({ username });
        if (email)
            or.push({ email });
        if (!or.length)
            return;
        const where = { [Op.or]: or };
        if (excludeNik) {
            where.nik = { [Op.ne]: excludeNik };
        }
        const duplicate = await User.findOne({
            where,
            attributes: ['nik', 'username', 'email'],
            transaction,
        });
        if (!duplicate)
            return;
        const row = this.getPlain(duplicate);
        if (nik && row.nik === nik)
            throw new Error('NIK sudah terdaftar.');
        if (username && row.username === username)
            throw new Error('Username sudah terdaftar.');
        if (email && row.email === email)
            throw new Error('Email sudah terdaftar.');
        throw new Error('Data akun sudah terdaftar.');
    };
    mapStaffRow = (row) => {
        const hasAccount = Boolean(row.nik && row.username);
        const roleLabel = row.is_pcc ? 'PCC' : ROLE_ID_TO_LABEL[row.id_role] || row.nama_role || row.id_role || 'Petugas';
        return {
            id: row.id_pegawai || row.nik,
            nik: row.nik,
            idPegawai: row.id_pegawai,
            name: row.nama_pegawai || row.username,
            namaPegawai: row.nama_pegawai,
            username: row.username || null,
            role: roleLabel,
            idRole: row.id_role || null,
            email: row.email || null,
            phone: row.no_wa,
            noWa: row.no_wa,
            status: hasAccount ? this.statusLabel(row.is_active) : 'Tanpa Akun',
            isActive: hasAccount ? Number(row.is_active || 0) : null,
            lastLogin: row.last_login_at || null,
            nip: row.nip,
            isPcc: Number(row.is_pcc || 0),
            hasAccount,
        };
    };
    mapCustomerRow = (row) => {
        const hasPortalAccount = Boolean(row.user_nik);
        const portalIsActive = hasPortalAccount ? Number(row.user_is_active ?? row.is_active ?? 0) : 0;
        return {
            id: row.id_pelanggan,
            idPelanggan: row.id_pelanggan,
            nik: row.nik,
            name: row.pic || row.nama_instansi,
            company: row.nama_instansi,
            namaInstansi: row.nama_instansi,
            pic: row.pic,
            email: row.email_kontak,
            emailKontak: row.email_kontak,
            contactEmail: row.email_kontak,
            phone: row.no_telp,
            noTelp: row.no_telp,
            status: hasPortalAccount ? this.statusLabel(portalIsActive) : 'Belum aktif',
            isActive: portalIsActive,
            portalStatus: hasPortalAccount ? this.statusLabel(portalIsActive) : 'Belum aktif',
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
            userNik: row.user_nik || row.nik || null,
            lastLogin: row.last_login_at || null,
        };
    };
    flattenStaffUser = (userInstance) => {
        const user = this.getPlain(userInstance) || {};
        const role = this.pickObject(user, ['role', 'Role']);
        const pegawai = this.pickObject(user, ['pegawai', 'Pegawai']);
        return this.mapStaffRow({
            ...user,
            nama_role: role.nama_role,
            id_pegawai: pegawai.id_pegawai,
            nip: pegawai.nip,
            nama_pegawai: pegawai.nama_pegawai,
            no_wa: pegawai.no_wa,
            is_pcc: pegawai.is_pcc,
            last_login_at: null,
        });
    };
    flattenStaffPegawai = (pegawaiInstance) => {
        const pegawai = this.getPlain(pegawaiInstance) || {};
        const user = this.pickObject(pegawai, ['user', 'User']);
        const role = this.pickObject(user, ['role', 'Role']);
        return this.mapStaffRow({
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
    };
    flattenCustomer = (customerInstance) => {
        const customer = this.getPlain(customerInstance) || {};
        const user = this.pickObject(customer, ['user', 'User']);
        const requests = this.pickArray(customer, ['permintaan']);
        return this.mapCustomerRow({
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
    };
    listRoles = async () => {
        const rows = await Role.findAll({
            attributes: ['id_role', 'nama_role'],
            order: [['id_role', 'ASC']],
        });
        return rows.map((row) => row.get({ plain: true }));
    };
    listStaff = async (query = {}) => {
        const search = this.normalizeText(query.search || query.q).toLowerCase();
        const role = this.normalizeText(query.role);
        const status = this.normalizeText(query.status);
        const pegawaiRows = await Pegawai.findAll({
            include: [
                {
                    model: User,
                    required: false,
                    include: [{ model: Role, required: false }],
                },
            ],
        });
        let rows = pegawaiRows.map(this.flattenStaffPegawai);
        if (role && role !== 'Semua') {
            if (role === 'PCC') {
                rows = rows.filter((row) => Number(row.isPcc || 0) === 1);
            }
            else {
                const roleId = this.getStaffRoleId(role);
                rows = rows.filter((row) => row.idRole === roleId);
            }
        }
        if (status && status !== 'Semua') {
            rows = rows.filter((row) => row.status === status);
        }
        if (search) {
            rows = rows.filter((row) => [row.nik, row.username, row.email, row.namaPegawai, row.nip, row.noWa, row.role]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(search)));
        }
        return rows.sort((a, b) => {
            const roleDiff = STAFF_ROLE_ORDER.indexOf(a.idRole) - STAFF_ROLE_ORDER.indexOf(b.idRole);
            if (roleDiff !== 0)
                return roleDiff;
            return String(a.namaPegawai || a.username || '').localeCompare(String(b.namaPegawai || b.username || ''));
        });
    };
    getStaffByNik = async (identifier, transaction = null) => {
        const value = this.normalizeText(identifier);
        if (!value)
            throw new Error('Identitas petugas wajib dikirim.');
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
            if (!user)
                throw new Error('Akun petugas tidak ditemukan.');
            return this.flattenStaffUser(user);
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
        if (!pegawai)
            throw new Error('Petugas tidak ditemukan.');
        return this.flattenStaffPegawai(pegawai);
    };
    createStaff = async (data = {}) => {
        return sequelize.transaction(async (transaction) => {
            const hasAccount = !(data.hasAccount === false ||
                data.has_account === false ||
                data.hasAccount === 'false' ||
                data.has_account === 'false' ||
                this.normalizeText(data.role) === 'PCC');
            const name = this.normalizeText(data.name || data.nama_pegawai);
            if (!name)
                throw new Error('Nama petugas wajib diisi.');
            const phone = this.normalizeText(data.phone || data.no_wa).replace(/\D/g, '').slice(0, 13);
            const nip = this.normalizeText(data.nip).slice(0, 18);
            const isPcc = this.normalizeText(data.role) === 'PCC' || Number(data.is_pcc || 0) === 1 ? 1 : 0;
            if (!hasAccount) {
                const idPegawai = this.normalizeText(data.id_pegawai) ||
                    await generateId(Pegawai, 'id_pegawai', 'PGW-', transaction, 3);
                await Pegawai.create({
                    id_pegawai: idPegawai,
                    nik: null,
                    nip: nip || null,
                    nama_pegawai: name,
                    no_wa: phone || null,
                    is_pcc: isPcc || 1,
                }, { transaction });
                const pegawai = await Pegawai.findByPk(idPegawai, {
                    include: [{ model: User, required: false, include: [{ model: Role, required: false }] }],
                    transaction,
                });
                return {
                    staff: this.flattenStaffPegawai(pegawai),
                    temporaryPassword: null,
                };
            }
            const nik = this.validateNik(data.nik);
            const username = this.validateUsername(data.username);
            const email = this.validateEmail(data.email);
            const roleId = this.getStaffRoleId(data.role || data.id_role);
            await this.ensureUniqueUser({ nik, username, email }, transaction);
            const { password, isGenerated } = this.buildPasswordFromRequestData(data);
            const hashedPassword = await this.hashPassword(password);
            await User.create({
                nik,
                id_role: roleId,
                username,
                email,
                password: hashedPassword,
                is_active: this.normalizeStatus(data.status),
            }, { transaction });
            const idPegawai = this.normalizeText(data.id_pegawai) ||
                await generateId(Pegawai, 'id_pegawai', 'PGW-', transaction, 3);
            await Pegawai.create({
                id_pegawai: idPegawai,
                nik,
                nip: nip || null,
                nama_pegawai: name,
                no_wa: phone || null,
                is_pcc: isPcc,
            }, { transaction });
            const staff = await this.getStaffByNik(nik, transaction);
            return {
                staff,
                temporaryPassword: isGenerated ? password : null,
            };
        });
    };
    setStaffStatus = async (nik, isActive) => {
        const staff = await this.getStaffByNik(nik);
        if (!!staff.hasAccount)
            throw new Error('Petugas ini tidak memiliki akun login.');
        const userNik = this.validateNik(staff.nik);
        const nextActive = Number(isActive) === 1 ? 1 : 0;
        if (nextActive === 0 && staff.idRole === Roles.ADMIN) {
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
        await User.update({
            is_active: nextActive,
            refresh_token_hash: null,
            refresh_token_expires_at: null,
        }, {
            where: { nik: userNik },
        });
        return this.getStaffByNik(userNik);
    };
    resetStaffPassword = async (nik, data = {}) => {
        const staff = await this.getStaffByNik(nik);
        if (!!staff.hasAccount)
            throw new Error('Petugas ini tidak memiliki akun login.');
        const userNik = this.validateNik(staff.nik);
        const password = data.password
            ? assertPasswordPolicy(data.password)
            : this.generateRandomPassword();
        const hashedPassword = await this.hashPassword(password);
        await User.update({
            password: hashedPassword,
            refresh_token_hash: null,
            refresh_token_expires_at: null,
        }, {
            where: { nik: userNik },
        });
        return {
            nik: userNik,
            temporaryPassword: password,
        };
    };
    listCustomers = async (query = {}) => {
        const search = this.normalizeText(query.search || query.q).toLowerCase();
        const status = this.normalizeText(query.status);
        const customers = await Pelanggan.findAll({
            include: [
                { model: User, required: false },
                { model: Fppl, as: 'permintaan', required: false },
            ],
            order: [['id_pelanggan', 'DESC']],
        });
        let rows = customers.map(this.flattenCustomer);
        const customerCountByNik = rows.reduce((acc, row) => {
            const key = row.nik || row.userNik || '';
            if (key)
                acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        rows = rows.map((row) => ({
            ...row,
            linkedCustomerCount: customerCountByNik[row.nik || row.userNik || ''] || 1,
        }));
        if (status && status !== 'Semua') {
            rows = rows.filter((row) => row.status === status);
        }
        if (search) {
            rows = rows.filter((row) => [
                row.idPelanggan,
                row.nik,
                row.namaInstansi,
                row.pic,
                row.noTelp,
                row.emailKontak,
                row.username,
                row.email,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(search)));
        }
        return rows;
    };
    getCustomerById = async (idPelanggan, transaction = null) => {
        const id = this.normalizeText(idPelanggan);
        if (!id)
            throw new Error('ID pelanggan wajib dikirim.');
        const customer = await Pelanggan.findOne({
            where: { id_pelanggan: id },
            include: [
                { model: User, required: false },
                { model: Fppl, as: 'permintaan', required: false },
            ],
            transaction,
        });
        if (!customer)
            throw new Error('Pelanggan tidak ditemukan.');
        return this.flattenCustomer(customer);
    };
    setCustomerStatus = async (idPelanggan, isActive) => {
        const customer = await this.getCustomerById(idPelanggan);
        if (!customer.hasPortalAccount && !customer.hasPortalAccess) {
            throw new Error('Pelanggan ini belum memiliki akun portal mandiri.');
        }
        await User.update({
            is_active: Number(isActive) === 1 ? 1 : 0,
            refresh_token_hash: null,
            refresh_token_expires_at: null,
        }, {
            where: { nik: customer.nik },
        });
        return this.getCustomerById(idPelanggan);
    };
    resetCustomerPassword = async (idPelanggan, data = {}) => {
        const customer = await this.getCustomerById(idPelanggan);
        if (!customer.hasPortalAccount && !customer.hasPortalAccess) {
            throw new Error('Pelanggan ini belum memiliki akun portal mandiri.');
        }
        const password = data.password
            ? assertPasswordPolicy(data.password)
            : this.generateRandomPassword();
        const hashedPassword = await this.hashPassword(password);
        await User.update({
            password: hashedPassword,
            refresh_token_hash: null,
            refresh_token_expires_at: null,
        }, {
            where: { nik: customer.nik },
        });
        return {
            idPelanggan: customer.idPelanggan,
            nik: customer.nik,
            temporaryPassword: password,
        };
    };
    normalizeIndonesianWhatsAppNumber = (value) => {
        const digits = String(value || '').replace(/\D/g, '');
        if (!digits)
            return '';
        if (digits.startsWith('62'))
            return digits;
        if (digits.startsWith('0'))
            return `62${digits.slice(1)}`;
        if (digits.startsWith('8'))
            return `62${digits}`;
        return digits;
    };

    getAdminContact = async () => {
        const adminRole = await Role.findOne({
            where: sequelize.where(sequelize.fn('LOWER', sequelize.col('nama_role')), 'admin'),
        });
        const emptyResponse = {
            found: false,
            idPegawai: null,
            namaPegawai: null,
            noWa: null,
            whatsappNumber: null,
            whatsappUrl: null,
        };
        if (!adminRole) {
            return emptyResponse;
        }
        const adminUser = await User.findOne({
            where: {
                id_role: adminRole.id_role,
                is_active: 1,
            },
            include: [
                {
                    model: Pegawai,
                    required: true,
                    where: {
                        [Op.and]: [
                            { no_wa: { [Op.ne]: null } },
                            sequelize.where(sequelize.fn('TRIM', sequelize.col('pegawai.no_wa')), { [Op.ne]: '' }),
                        ],
                    },
                },
            ],
            order: [[Pegawai, 'nama_pegawai', 'ASC']],
        });
        const userJson = this.getPlain(adminUser) || null;
        const pegawai = userJson?.pegawai || userJson?.Pegawai || null;
        if (!adminUser || !pegawai) {
            return emptyResponse;
        }
        const whatsappNumber = this.normalizeIndonesianWhatsAppNumber(pegawai.no_wa);
        return {
            found: Boolean(whatsappNumber),
            idPegawai: pegawai.id_pegawai,
            namaPegawai: pegawai.nama_pegawai,
            noWa: pegawai.no_wa,
            nik: userJson.nik,
            email: userJson.email,
            whatsappNumber: whatsappNumber || null,
            whatsappUrl: whatsappNumber ? `https://wa.me/${whatsappNumber}` : null,
        };
    };

    getPccPegawai = async () => {
        const rows = await Pegawai.findAll({
            where: { is_pcc: 1 },
            order: [['nama_pegawai', 'ASC']],
        });
        return rows.map((row) => {
            const data = this.getPlain(row) || {};
            return {
                idPegawai: data.id_pegawai,
                namaPegawai: data.nama_pegawai,
                noWa: data.no_wa,
                isPcc: Boolean(data.is_pcc),
            };
        });
    };
}
module.exports = new AdminAccountService();
module.exports.AdminAccountService = AdminAccountService;
