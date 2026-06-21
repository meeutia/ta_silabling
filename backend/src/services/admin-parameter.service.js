const { sequelize, KategoriParameter, Parameter, Metode, ParameterMetode, RegBm, PktBm, Klasifikasi, PktBmKelompok, PktBmParam, Satuan, PktBmNilai, JenisSampel, TarifPengambilan } = require('../models/Associations');
const { withPaketBmDisplayFields } = require('../utils/bm-format.util');
const { toCamelCaseDeep } = require('../utils/case-transform.util');
const { Op, literal } = require('sequelize');
const { assertUnusedForMasterChange, getParameterMetodeUsage, getRegBmUsage, getPktBmUsage, getPktBmParamUsage, getTarifPengambilanUsage, getTotalUsage, } = require('./protected-master-guard.service');
class AdminParameterService {
generateNextCode = async ({ model, column, prefix, padLength, transaction, }) => {
        const rows = await model.findAll({
            attributes: [column],
            where: {
                [column]: {
                    [Op.like]: `${prefix}%`,
                },
            },
            order: [[column, 'ASC']],
            transaction,
        });
        let maxNumber = 0;
        for (const row of rows) {
            const rawValue = row[column];
            const numberPart = Number(String(rawValue || '').replace(prefix, '').replace(/\D/g, ''));
            if (!Number.isNaN(numberPart) && numberPart > maxNumber) {
                maxNumber = numberPart;
            }
        }
        let nextNumber = maxNumber + 1;
        let nextCode = `${prefix}${String(nextNumber).padStart(padLength, '0')}`;
        while (true) {
            const existing = await model.findOne({
                where: {
                    [column]: nextCode,
                },
                transaction,
            });
            if (!existing) {
                return nextCode;
            }
            nextNumber += 1;
            nextCode = `${prefix}${String(nextNumber).padStart(padLength, '0')}`;
        }
    };
    normalizeCategoryName = (value) => {
        return String(value || '').trim();
    };
    toPlainObject = (row) => {
        if (!row)
            return row;
        if (typeof row.toJSON === 'function')
            return row.toJSON();
        return { ...row };
    };
    toApiData = (data) => toCamelCaseDeep(data);
    withSyncedKategori = (parameterRow) => {
        const parameter = this.toPlainObject(parameterRow);
        if (!parameter)
            return parameter;
        const kategoriRelasi = parameter.kategori || parameter.KategoriParameter || null;
        const namaRelasi = this.normalizeCategoryName(kategoriRelasi?.nama_kategori);
        const idRelasi = kategoriRelasi?.id_kategori_parameter || parameter.id_kategori_parameter || null;
        return {
            ...parameter,
            id_kategori_parameter: parameter.id_kategori_parameter || idRelasi || null,
            kategori_parameter: this.normalizeCategoryName(parameter.kategori_parameter) || namaRelasi || null,
            nama_kategori: this.normalizeCategoryName(parameter.kategori_parameter) || namaRelasi || null,
            kategori: kategoriRelasi
                ? {
                    ...kategoriRelasi,
                    id_kategori_parameter: kategoriRelasi.id_kategori_parameter || idRelasi || null,
                    nama_kategori: namaRelasi || this.normalizeCategoryName(parameter.kategori_parameter) || null,
                }
                : null,
        };
    };
    withSyncedKategoriOnParameterMetode = (row) => {
        const item = this.toPlainObject(row);
        if (!item)
            return item;
        return {
            ...item,
            parameter: this.withSyncedKategori(item.parameter),
        };
    };
    resolveKategoriParameter = async ({ idKategoriParameter, namaKategori, transaction }) => {
        const normalizedName = this.normalizeCategoryName(namaKategori);
        if (idKategoriParameter) {
            const existingById = await KategoriParameter.findByPk(idKategoriParameter, { transaction });
            if (existingById) {
                return {
                    id_kategori_parameter: existingById.id_kategori_parameter,
                    nama_kategori: existingById.nama_kategori,
                };
            }
        }
        if (!normalizedName) {
            return {
                id_kategori_parameter: null,
                nama_kategori: null,
            };
        }
        const existingByName = await KategoriParameter.findOne({
            where: { nama_kategori: normalizedName },
            transaction,
        });
        if (existingByName) {
            return {
                id_kategori_parameter: existingByName.id_kategori_parameter,
                nama_kategori: existingByName.nama_kategori,
            };
        }
        const newId = await this.generateNextCode({
            model: KategoriParameter,
            column: 'id_kategori_parameter',
            prefix: 'KP',
            padLength: 2,
            transaction,
        });
        const created = await KategoriParameter.create({
            id_kategori_parameter: newId,
            nama_kategori: normalizedName,
        }, { transaction });
        return {
            id_kategori_parameter: created.id_kategori_parameter,
            nama_kategori: created.nama_kategori,
        };
    };
    resolveKlasifikasi = async ({ idKlasifikasi, klasifikasi, transaction }) => {
        const normalizedId = String(idKlasifikasi || '').trim();
        const normalizedName = this.normalizeNullableText(klasifikasi);
        if (normalizedId) {
            const found = await Klasifikasi.findByPk(normalizedId, { transaction });
            if (!found) throw new Error('Klasifikasi tidak ditemukan.');
            return found;
        }
        if (!normalizedName) throw new Error('Klasifikasi wajib diisi.');
        const existing = await Klasifikasi.findOne({ where: { klasifikasi: normalizedName }, transaction });
        if (existing) return existing;
        const id = await this.generateNextCode({ model: Klasifikasi, column: 'id_klasifikasi', prefix: 'KLS', padLength: 3, transaction });
        return await Klasifikasi.create({ id_klasifikasi: id, klasifikasi: normalizedName }, { transaction });
    };
    resolveSatuan = async ({ idSatuan, satuan, transaction }) => {
        const normalizedId = String(idSatuan || '').trim();
        const normalizedName = this.normalizeNullableText(satuan);
        if (normalizedId) {
            const found = await Satuan.findByPk(normalizedId, { transaction });
            if (!found) throw new Error('Satuan tidak ditemukan.');
            return found;
        }
        if (!normalizedName) throw new Error('Satuan baku mutu wajib diisi.');
        const existing = await Satuan.findOne({ where: { satuan: normalizedName }, transaction });
        if (existing) return existing;
        const id = await this.generateNextCode({ model: Satuan, column: 'id_satuan', prefix: 'SAT', padLength: 3, transaction });
        return await Satuan.create({ id_satuan: id, satuan: normalizedName }, { transaction });
    };
    getAllKlasifikasi = async () => {
        const rows = await Klasifikasi.findAll({ order: [['klasifikasi', 'ASC'], ['id_klasifikasi', 'ASC']] });
        return rows.map((row) => this.toApiData(this.toPlainObject(row)));
    };
    getAllSatuan = async () => {
        const rows = await Satuan.findAll({ order: [['satuan', 'ASC'], ['id_satuan', 'ASC']] });
        return rows.map((row) => this.toApiData(this.toPlainObject(row)));
    };
    mapPaketParameterRow = (row) => this.toApiData(this.toPlainObject(row) || {});
    hasOwn = (data, key) => {
        return Object.prototype.hasOwnProperty.call(data || {}, key);
    };
    normalizeActiveFlag = (value, fallback = 1) => {
        if (value === undefined || value === null || value === '')
            return Number(fallback || 0) ? 1 : 0;
        if (typeof value === 'boolean')
            return value ? 1 : 0;
        const normalized = String(value).trim().toLowerCase();
        if (['1', 'true', 'aktif', 'active', 'ya', 'yes'].includes(normalized))
            return 1;
        if (['0', 'false', 'nonaktif', 'inactive', 'tidak', 'no'].includes(normalized))
            return 0;
        return Number(value) ? 1 : 0;
    };
    normalizeNullableText = (value) => {
        if (value === undefined)
            return undefined;
        const text = String(value ?? '').trim();
        return text || null;
    };
    assertMaxLength = (value, maxLength, label) => {
        if (value !== null && value !== undefined && String(value).length > maxLength) {
            throw new Error(`${label} maksimal ${maxLength} karakter.`);
        }
        return value;
    };
    buildPaketParameterData = (inputData = {}, current = {}) => {
        const nextData = {};
        const currentData = this.toPlainObject(current) || {};
        if (this.hasOwn(inputData, 'nilai_bm'))
            nextData.nilai_bm = this.assertMaxLength(this.normalizeNullableText(inputData.nilai_bm), 30, 'Nilai baku mutu');
        else if (this.hasOwn(currentData, 'nilai_bm'))
            nextData.nilai_bm = currentData.nilai_bm;
        if (this.hasOwn(inputData, 'id_satuan'))
            nextData.id_satuan = this.assertMaxLength(this.normalizeNullableText(inputData.id_satuan), 10, 'ID satuan baku mutu');
        else if (this.hasOwn(currentData, 'id_satuan'))
            nextData.id_satuan = currentData.id_satuan;
        if (this.hasOwn(inputData, 'ket_bm'))
            nextData.ket_bm = this.assertMaxLength(this.normalizeNullableText(inputData.ket_bm), 100, 'Keterangan baku mutu');
        else if (this.hasOwn(currentData, 'ket_bm'))
            nextData.ket_bm = currentData.ket_bm;
        return nextData;
    };
    hasChanged = (current, next) => {
        if (next === undefined)
            return false;
        return String(current ?? '') !== String(next ?? '');
    };
    normalizeLookupText = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    isOfficialRegulasi = (row) => {
        const data = this.toPlainObject(row) || {};
        const ref = this.normalizeLookupText(data.ref_reg);
        const instansi = this.normalizeLookupText(data.instansi);

        if (!ref)
            return false;

        const officialPatterns = [
            'pp ri no 22 tahun 2021 lampiran vi',
            'pp ri no 22 tahun 2021 lampiran viii',
            'permenkes ri no 2 tahun 2023',
            'permenkes no 2 tahun 2023',
            'permen lh no 5 tahun 2014',
            'permen lh no 5 tahun 2014 lampiran xlvii',
            'permen lhk p 59 menlhk setjen kum 1 7 2016',
            'permenlhk p 59 menlhk setjen kum 1 7 2016',
            'permen lh bplh no 11 tahun 2025',
            'permen lhbph no 11 tahun 2025',
        ];

        const isOfficialRef = officialPatterns.some((pattern) => ref.includes(pattern));
        const isOfficialInstitution = ['klh', 'klhk', 'klh bplh', 'kemenkes'].some((pattern) => instansi.includes(pattern));
        return isOfficialRef && isOfficialInstitution;
    };
    withMasterUsage = (row, usage, options = {}) => {
        const data = this.toPlainObject(row);
        const totalUsage = getTotalUsage(usage);
        const lhuUsage = Number(usage?.lhu || usage?.lhu_dengan_regulasi_ini || usage?.lhu_dengan_paket_ini || 0);
        const historicalUsage = Number(usage?.fppl_sampel || 0) + Number(usage?.lhu || 0) + Number(usage?.lhu_dengan_regulasi_ini || 0) + Number(usage?.lhu_dengan_paket_ini || 0) + Number(usage?.lhu_dengan_parameter_kelompok || 0);
        const isSystemReference = options.systemReferenceChecker ? Boolean(options.systemReferenceChecker(data)) : false;
        const isLocked = options.lockedByLhu ? lhuUsage > 0 : (isSystemReference || historicalUsage > 0);
        const canEditMaster = options.lockedByLhu ? lhuUsage === 0 : (!isSystemReference && historicalUsage === 0);

        return this.toApiData({
            ...data,
            usage,
            usage_total: totalUsage,
            usage_lhu: lhuUsage,
            is_system_reference: isSystemReference,
            is_locked: isLocked,
            can_edit_master: canEditMaster,
            can_toggle_active: true,
            can_delete: totalUsage === 0,
        });
    };
    withParameterMetodeUsage = async (row) => {
        const usage = await getParameterMetodeUsage(row.id_metode_parameter);
        const totalUsage = getTotalUsage(usage);
        return this.toApiData({
            ...this.withSyncedKategoriOnParameterMetode(row),
            usage,
            usage_total: totalUsage,
            can_edit: true,
            can_edit_tarif: true,
            can_edit_master: totalUsage === 0,
            can_delete: totalUsage === 0,
            can_toggle_active: true,
        });
    };
    protectedMasterError = (message, usages) => {
        const error = new Error(message);
        error.code = 'PROTECTED_MASTER_IN_USE';
        error.usages = usages;
        return error;
    };
    getAllParameterMetode = async () => {
        const rows = await ParameterMetode.findAll({
            attributes: [
                'id_metode_parameter',
                'id_parameter',
                'id_metode',
                'tarif',
                'acuan_metode',
                'is_terakreditasi',
                'is_subkontrak',
                'is_active',
            ],
            include: [
                {
                    model: Parameter,
                    attributes: ['id_parameter', 'id_kategori_parameter', 'nama_parameter'],
                    include: [{ model: KategoriParameter, as: 'kategori', attributes: ['id_kategori_parameter', 'nama_kategori'], required: false }],
                },
                {
                    model: Metode,
                    attributes: ['id_metode', 'nama_metode'],
                },
            ],
            order: [
                [{ model: Parameter }, 'nama_parameter', 'ASC'],
                [{ model: Metode }, 'nama_metode', 'ASC'],
            ],
        });
        return Promise.all(rows.map((row) => this.withParameterMetodeUsage(row)));
    };
    getKategoriParameters = async () => {
        const rows = await KategoriParameter.findAll({
            order: [['nama_kategori', 'ASC']]
        });
        return rows.map((row) => this.toApiData(this.toPlainObject(row)));
    };
    getParameters = async () => {
        const rows = await Parameter.findAll({
            include: [{ model: KategoriParameter, as: 'kategori', attributes: ['id_kategori_parameter', 'nama_kategori'], required: false }],
            order: [['nama_parameter', 'ASC']]
        });
        return rows.map((row) => this.toApiData(this.withSyncedKategori(row)));
    };
    getMethods = async () => {
        const rows = await Metode.findAll({
            order: [['nama_metode', 'ASC']]
        });
        return rows.map((row) => this.toApiData(this.toPlainObject(row)));
    };
    getJenisSampel = async () => {
        const rows = await JenisSampel.findAll({
            order: [['jenis_sampel', 'ASC']]
        });
        return rows.map((row) => this.toApiData(this.toPlainObject(row)));
    };
    createParameterMetode = async (data) => {
        const transaction = await sequelize.transaction();
        try {
            let parameterId = data.id_parameter;
            let metodeId = data.id_metode;
            if (data.is_new_parameter) {
                if (!data.nama_parameter || !data.nama_parameter.trim()) {
                    throw new Error('Nama parameter baru harus diisi');
                }
                parameterId = await this.generateNextCode({
                    model: Parameter,
                    column: 'id_parameter',
                    prefix: 'PR',
                    padLength: 4,
                    transaction,
                });
                const resolvedKategori = await this.resolveKategoriParameter({
                    idKategoriParameter: data.id_kategori_parameter || data.idKategoriParameter,
                    namaKategori: data.kategori_parameter || data.nama_kategori || data.namaKategori,
                    transaction,
                });
                await Parameter.create({
                    id_parameter: parameterId,
                    id_kategori_parameter: resolvedKategori.id_kategori_parameter,
                    nama_parameter: data.nama_parameter.trim(),
                }, { transaction });
            }
            if (data.is_new_metode) {
                if (!data.nama_metode || !data.nama_metode.trim()) {
                    throw new Error('Nama metode baru harus diisi');
                }
                metodeId = await this.generateNextCode({
                    model: Metode,
                    column: 'id_metode',
                    prefix: 'M',
                    padLength: 2,
                    transaction,
                });
                await Metode.create({
                    id_metode: metodeId,
                    nama_metode: data.nama_metode.trim(),
                }, { transaction });
            }
            if (!parameterId) {
                throw new Error('Parameter harus dipilih atau dibuat baru');
            }
            if (!metodeId) {
                throw new Error('Metode harus dipilih atau dibuat baru');
            }
            const existingCombination = await ParameterMetode.findOne({
                where: {
                    id_parameter: parameterId,
                    id_metode: metodeId,
                },
                transaction,
            });
            if (existingCombination) {
                throw new Error('Kombinasi Parameter dan Metode ini sudah ada.');
            }
            const pmId = await this.generateNextCode({
                model: ParameterMetode,
                column: 'id_metode_parameter',
                prefix: 'MP',
                padLength: 4,
                transaction,
            });
            const data = {
                id_metode_parameter: pmId,
                id_parameter: parameterId,
                id_metode: metodeId,
                tarif: data.tarif || 0,
                acuan_metode: data.acuan_metode || null,
                is_terakreditasi: data.is_terakreditasi ? 1 : 0,
                is_subkontrak: data.is_subkontrak ? 1 : 0,
                is_active: data.is_active === undefined ? 1 : this.normalizeActiveFlag(data.is_active, 1),
            };
            const pm = await ParameterMetode.create(data, { transaction });
            await transaction.commit();
            const createdParameterMetode = await ParameterMetode.findByPk(pm.id_metode_parameter, {
                include: [
                    {
                        model: Parameter,
                        attributes: ['id_parameter', 'id_kategori_parameter', 'nama_parameter'],
                        include: [{ model: KategoriParameter, as: 'kategori', attributes: ['id_kategori_parameter', 'nama_kategori'], required: false }],
                    },
                    {
                        model: Metode,
                        attributes: ['id_metode', 'nama_metode'],
                    },
                ],
            });
            return this.toApiData(this.toPlainObject(createdParameterMetode));
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    };
    updateParameterMetode = async (id, inputData) => {
        const pm = await ParameterMetode.findByPk(id);
        if (!pm) {
            throw new Error('Data Parameter Metode tidak ditemukan');
        }
        const hasMasterValueChange = inputData.acuan_metode !== undefined ||
            inputData.is_terakreditasi !== undefined ||
            inputData.is_subkontrak !== undefined;
        if (hasMasterValueChange) {
            await assertUnusedForMasterChange({
                label: 'Parameter metode',
                usageGetter: getParameterMetodeUsage,
                id,
                operation: 'diubah',
            });
        }
        const updateData = {};
        if (inputData.acuan_metode !== undefined)
            updateData.acuan_metode = inputData.acuan_metode || null;
        if (inputData.tarif !== undefined)
            updateData.tarif = inputData.tarif || 0;
        if (inputData.is_terakreditasi !== undefined)
            updateData.is_terakreditasi = inputData.is_terakreditasi ? 1 : 0;
        if (inputData.is_subkontrak !== undefined)
            updateData.is_subkontrak = inputData.is_subkontrak ? 1 : 0;
        if (inputData.is_active !== undefined)
            updateData.is_active = this.normalizeActiveFlag(inputData.is_active, pm.is_active);
        await pm.update(updateData);
        return this.toApiData(this.toPlainObject(pm));
    };
    deleteParameterMetode = async (id) => {
        const pm = await ParameterMetode.findByPk(id);
        if (!pm) {
            throw new Error('Data Parameter Metode tidak ditemukan');
        }
        await assertUnusedForMasterChange({
            label: 'Parameter metode',
            usageGetter: getParameterMetodeUsage,
            id,
            operation: 'dihapus',
        });
        await pm.destroy();
        return true;
    };
    getAllRegulasi = async () => {
        const rows = await RegBm.findAll({
            order: [['is_active', 'DESC'], ['instansi', 'ASC'], ['id_reg_bm', 'ASC']],
        });
        return Promise.all(rows.map(async (row) => {
            const usage = await getRegBmUsage(row.id_reg_bm);
            return this.withMasterUsage(row, usage, { lockedByLhu: true });
        }));
    };
    createRegulasi = async (data) => {
        const id = await this.generateNextCode({
            model: RegBm,
            column: 'id_reg_bm',
            prefix: 'RBM',
            padLength: 3,
        });
        const createdRegulasi = await RegBm.create({
            id_reg_bm: id,
            instansi: String(data.instansi || '').trim(),
            ref_reg: String(data.ref_reg || '').trim(),
            is_active: this.normalizeActiveFlag(data.is_active, 1),
        });
        return this.toApiData(this.toPlainObject(createdRegulasi));
    };
    updateRegulasi = async (id, inputData) => {
        const reg = await RegBm.findByPk(id);
        if (!reg)
            throw new Error('Regulasi tidak ditemukan');
        const usage = await getRegBmUsage(id);
        const lhuUsage = Number(usage?.lhu || usage?.lhu_dengan_regulasi_ini || 0);
        const nextInstansi = this.hasOwn(inputData, 'instansi') ? String(inputData.instansi || '').trim() : undefined;
        const nextRefReg = this.hasOwn(inputData, 'ref_reg') ? String(inputData.ref_reg || '').trim() : undefined;
        const hasMasterChange = this.hasChanged(reg.instansi, nextInstansi) ||
            this.hasChanged(reg.ref_reg, nextRefReg);
        if (hasMasterChange && lhuUsage > 0) {
            throw this.protectedMasterError('Regulasi baku mutu tidak dapat mengubah instansi/referensi karena sudah digunakan pada LHU. Nonaktifkan regulasi lama lalu buat regulasi baru jika ada revisi acuan.', usage);
        }
        const updateData = {};
        if (nextInstansi !== undefined)
            updateData.instansi = nextInstansi;
        if (nextRefReg !== undefined)
            updateData.ref_reg = nextRefReg;
        if (this.hasOwn(inputData, 'is_active'))
            updateData.is_active = this.normalizeActiveFlag(inputData.is_active, reg.is_active);
        await reg.update(updateData);
        const updated = await RegBm.findByPk(id);
        return this.withMasterUsage(updated, usage, { lockedByLhu: true });
    };
    deleteRegulasi = async (id) => {
        const reg = await RegBm.findByPk(id);
        if (!reg)
            throw new Error('Regulasi tidak ditemukan');
        const usage = await getRegBmUsage(id);
        const totalUsage = getTotalUsage(usage);
        if (totalUsage > 0) {
            await reg.update({ is_active: 0 });
            return this.toApiData({ deactivated: true, usages: usage });
        }
        await reg.destroy();
        return this.toApiData({ deleted: true, usages: usage });
    };
    withPaketDisplay = (row, kelompok = null) => {
        const data = withPaketBmDisplayFields(this.toPlainObject(row) || {});
        const kelompokData = this.toPlainObject(kelompok) || null;
        const kelompokIsActive = kelompokData ? this.normalizeActiveFlag(kelompokData.is_active, 1) : 1;
        return this.toApiData({
            ...data,
            paket_is_active: this.normalizeActiveFlag(data.is_active, 1),
            group_is_active: kelompokIsActive,
            is_active: kelompokIsActive,
            bm_kelompok: kelompokData,
        });
    };
    getPaketInclude = () => ([
        { model: RegBm, attributes: ['id_reg_bm', 'ref_reg', 'instansi', 'is_active'] },
        { model: JenisSampel, attributes: ['id_jenis_sampel', 'jenis_sampel'] },
        { model: Klasifikasi, attributes: ['id_klasifikasi', 'klasifikasi'], required: false },
    ]);
    getKelompokKey = (id_reg_bm, id_jenis_sampel) => `${id_reg_bm || ''}__${id_jenis_sampel || ''}`;
    getKelompokMapForPaketRows = async (rows = [], options = {}) => {
        const keys = [...new Set(rows.map((row) => this.getKelompokKey(row.id_reg_bm, row.id_jenis_sampel)).filter((key) => key !== '__'))];
        if (keys.length === 0)
            return new Map();
        const clauses = keys.map((key) => {
            const [id_reg_bm, id_jenis_sampel] = key.split('__');
            return { id_reg_bm, id_jenis_sampel };
        });
        const kelompokRows = await PktBmKelompok.findAll({
            where: { [Op.or]: clauses },
            ...options,
        });
        return new Map(kelompokRows.map((row) => [this.getKelompokKey(row.id_reg_bm, row.id_jenis_sampel), row]));
    };
    getPaketKelompok = async (id_reg_bm, id_jenis_sampel, options = {}) => {
        return await PktBmKelompok.findOne({
            where: { id_reg_bm, id_jenis_sampel },
            ...options,
        });
    };
    ensurePaketKelompok = async (id_reg_bm, id_jenis_sampel, options = {}) => {
        const idRegBm = String(id_reg_bm || '').trim();
        const idJenisSampel = String(id_jenis_sampel || '').trim();
        if (!idRegBm || !idJenisSampel)
            throw new Error('Regulasi dan jenis sampel wajib diisi.');
        const [reg, jenis] = await Promise.all([
            RegBm.findByPk(idRegBm, options),
            JenisSampel.findByPk(idJenisSampel, options),
        ]);
        if (!reg)
            throw new Error('Regulasi tidak ditemukan.');
        if (!jenis)
            throw new Error('Jenis sampel tidak ditemukan.');
        const existing = await PktBmKelompok.findOne({ where: { id_reg_bm: idRegBm, id_jenis_sampel: idJenisSampel }, ...options });
        if (existing)
            return existing;
        return await PktBmKelompok.create({ id_reg_bm: idRegBm, id_jenis_sampel: idJenisSampel, is_active: 1 }, options);
    };
    buildPaketParameterMetaData = async (inputData = {}, current = {}, transaction = null) => {
        const nextData = {};
        const currentData = this.toPlainObject(current) || {};
        const hasSatuanInput = this.hasOwn(inputData, 'id_satuan') || this.hasOwn(inputData, 'satuan') || this.hasOwn(inputData, 'satuan_bm');

        if (hasSatuanInput) {
            const satuanRow = await this.resolveSatuan({
                idSatuan: inputData.id_satuan,
                satuan: inputData.satuan ?? inputData.satuan_bm,
                transaction,
            });
            nextData.id_satuan = this.assertMaxLength(satuanRow.id_satuan, 10, 'ID satuan baku mutu');
        }
        else if (this.hasOwn(currentData, 'id_satuan'))
            nextData.id_satuan = currentData.id_satuan;
        if (this.hasOwn(inputData, 'ket_bm'))
            nextData.ket_bm = this.assertMaxLength(this.normalizeNullableText(inputData.ket_bm), 100, 'Keterangan baku mutu');
        else if (this.hasOwn(currentData, 'ket_bm'))
            nextData.ket_bm = currentData.ket_bm;
        return nextData;
    };
    buildPaketNilaiData = (inputData = {}, current = {}) => {
        const nextData = {};
        const currentData = this.toPlainObject(current) || {};
        if (this.hasOwn(inputData, 'nilai_bm'))
            nextData.nilai_bm = this.assertMaxLength(this.normalizeNullableText(inputData.nilai_bm), 30, 'Nilai baku mutu');
        else if (this.hasOwn(currentData, 'nilai_bm'))
            nextData.nilai_bm = currentData.nilai_bm;
        return nextData;
    };
    mapPaketParameterData = (metaRow = {}, nilaiRow = {}, paket = {}) => {
        const meta = this.toPlainObject(metaRow) || {};
        const nilai = this.toPlainObject(nilaiRow) || {};
        const parameter = meta.parameter || meta.Parameter || nilai.parameter || nilai.Parameter || {};
        const satuanRow = meta.satuan || meta.Satuan || {};
        const satuanLabel = satuanRow.satuan || meta.satuan || meta.satuan_bm || null;
        return this.toApiData({
            id_pkt_bm: paket.id_pkt_bm || nilai.id_pkt_bm || null,
            id_reg_bm: meta.id_reg_bm || paket.id_reg_bm || null,
            id_jenis_sampel: meta.id_jenis_sampel || paket.id_jenis_sampel || null,
            id_parameter: meta.id_parameter || nilai.id_parameter || parameter.id_parameter || null,
            nama_parameter: parameter.nama_parameter || meta.nama_parameter || null,
            kategori_parameter: parameter.kategori?.nama_kategori || parameter.KategoriParameter?.nama_kategori || meta.kategori_parameter || null,
            parameter,
            nilai_bm: nilai.nilai_bm ?? null,
            id_satuan: meta.id_satuan || satuanRow.id_satuan || null,
            satuan: satuanLabel,
            satuan_bm: satuanLabel,
            ket_bm: meta.ket_bm ?? null,
        });
    };
    getAllPaket = async () => {
        const rows = await PktBm.findAll({
            include: this.getPaketInclude(),
            order: [['id_reg_bm', 'ASC'], ['id_jenis_sampel', 'ASC'], [Klasifikasi, 'klasifikasi', 'ASC'], ['id_pkt_bm', 'ASC']],
        });
        const kelompokMap = await this.getKelompokMapForPaketRows(rows);
        return Promise.all(rows.map(async (row) => {
            const usage = await getPktBmUsage(row.id_pkt_bm);
            const kelompok = kelompokMap.get(this.getKelompokKey(row.id_reg_bm, row.id_jenis_sampel));
            return this.withMasterUsage(this.withPaketDisplay(row, kelompok), usage, { lockedByLhu: true });
        }));
    };
    getPaketById = async (id) => {
        const row = await PktBm.findByPk(id, { include: this.getPaketInclude() });
        if (!row)
            return null;
        const usage = await getPktBmUsage(id);
        const kelompok = await this.getPaketKelompok(row.id_reg_bm, row.id_jenis_sampel);
        return this.withMasterUsage(this.withPaketDisplay(row, kelompok), usage, { lockedByLhu: true });
    };
    updatePaketKelompokStatus = async (id_reg_bm, id_jenis_sampel, data = {}) => {
        const kelompok = await this.ensurePaketKelompok(id_reg_bm, id_jenis_sampel);
        const nextActive = this.normalizeActiveFlag(data.is_active, kelompok.is_active);
        await kelompok.update({ is_active: nextActive });
        const paketRows = await PktBm.findAll({
            where: { id_reg_bm, id_jenis_sampel },
            include: this.getPaketInclude(),
            order: [[Klasifikasi, 'klasifikasi', 'ASC'], ['id_pkt_bm', 'ASC']],
        });
        return {
            id_reg_bm,
            id_jenis_sampel,
            is_active: nextActive,
            paket_items: paketRows.map((row) => this.withPaketDisplay(row, kelompok)),
        };
    };
    createPaket = async (data) => {
        const transaction = await sequelize.transaction();
        try {
            const idRegBm = String(inputData.id_reg_bm || '').trim();
            const idJenisSampel = String(inputData.id_jenis_sampel || '').trim();
            const rawKlasifikasiList = Array.isArray(data.klasifikasi_list)
                ? data.klasifikasi_list
                : (Array.isArray(data.klasifikasi) ? data.klasifikasi : [data.klasifikasi]);
            const klasifikasiList = rawKlasifikasiList
                .map((value) => this.normalizeNullableText(value))
                .filter(Boolean);
            if (!idRegBm || !idJenisSampel || klasifikasiList.length === 0)
                throw new Error('Regulasi, jenis sampel, dan minimal satu klasifikasi wajib diisi.');
            const duplicateInput = new Set();
            for (const klasifikasiName of klasifikasiList) {
                const key = klasifikasiName.toLowerCase();
                if (duplicateInput.has(key))
                    throw new Error(`Klasifikasi ${klasifikasiName} diinput lebih dari satu kali.`);
                duplicateInput.add(key);
            }
            await this.ensurePaketKelompok(idRegBm, idJenisSampel, { transaction });
            const createdIds = [];
            for (const klasifikasiName of klasifikasiList) {
                const klasifikasiRow = await this.resolveKlasifikasi({
                    klasifikasi: klasifikasiName,
                    transaction,
                });
                if (!klasifikasiRow?.id_klasifikasi)
                    throw new Error('Klasifikasi tidak valid.');
                const duplicate = await PktBm.findOne({
                    where: {
                        id_reg_bm: idRegBm,
                        id_jenis_sampel: idJenisSampel,
                        id_klasifikasi: klasifikasiRow.id_klasifikasi,
                    },
                    transaction,
                });
                if (duplicate)
                    throw new Error(`Paket baku mutu untuk klasifikasi ${klasifikasiName} sudah ada.`);
                const id = await this.generateNextCode({ model: PktBm, column: 'id_pkt_bm', prefix: 'PKBM', padLength: 4, transaction });
                const created = await PktBm.create({
                    id_pkt_bm: id,
                    id_reg_bm: idRegBm,
                    id_jenis_sampel: idJenisSampel,
                    id_klasifikasi: klasifikasiRow.id_klasifikasi,
                    is_active: 1,
                }, { transaction });
                createdIds.push(created.id_pkt_bm);
            }
            await transaction.commit();
            const createdRows = [];
            for (const id of createdIds) {
                createdRows.push(await this.getPaketById(id));
            }
            return createdRows.length === 1 ? createdRows[0] : createdRows;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    };

    updatePaket = async (id, inputData) => {
        const transaction = await sequelize.transaction();
        try {
            const pkt = await PktBm.findByPk(id, { transaction });
            if (!pkt)
                throw new Error('Paket tidak ditemukan');
            const usage = await getPktBmUsage(id, { transaction });
            const lhuUsage = Number(usage.lhu || 0);
            const nilaiUsage = Number(usage.pkt_bm_nilai || 0);
            const nextIdRegBm = this.hasOwn(inputData, 'id_reg_bm') ? String(inputData.id_reg_bm || '').trim() : undefined;
            const nextJenisSampel = this.hasOwn(inputData, 'id_jenis_sampel') ? String(inputData.id_jenis_sampel || '').trim() : undefined;
            const nextKlasifikasiRow = (this.hasOwn(inputData, 'id_klasifikasi') || this.hasOwn(inputData, 'klasifikasi'))
                ? await this.resolveKlasifikasi({ idKlasifikasi: inputData.id_klasifikasi, klasifikasi: inputData.klasifikasi, transaction })
                : null;
            const nextIdKlasifikasi = nextKlasifikasiRow ? nextKlasifikasiRow.id_klasifikasi : undefined;
            const hasIdentityChange = this.hasChanged(pkt.id_reg_bm, nextIdRegBm) ||
                this.hasChanged(pkt.id_jenis_sampel, nextJenisSampel);
            const hasStructureChange = hasIdentityChange || this.hasChanged(pkt.id_klasifikasi, nextIdKlasifikasi);
            if (hasStructureChange && lhuUsage > 0) {
                throw this.protectedMasterError('Paket baku mutu tidak dapat mengubah regulasi, jenis sampel, atau klasifikasi karena sudah dipakai pada LHU. Nonaktifkan paket lama lalu buat paket/versi baru.', usage);
            }
            if (hasIdentityChange && nilaiUsage > 0) {
                throw this.protectedMasterError('Paket baku mutu tidak dapat mengubah regulasi atau jenis sampel karena sudah memiliki nilai baku mutu. Hapus parameter paket dulu atau buat paket baru.', usage);
            }
            const data = {};
            if (nextIdRegBm !== undefined)
                inputData.id_reg_bm = nextIdRegBm;
            if (nextJenisSampel !== undefined)
                inputData.id_jenis_sampel = nextJenisSampel;
            if (nextIdKlasifikasi !== undefined)
                data.id_klasifikasi = nextIdKlasifikasi;
            if (inputData.id_reg_bm || inputData.id_jenis_sampel) {
                await this.ensurePaketKelompok(inputData.id_reg_bm || pkt.id_reg_bm, inputData.id_jenis_sampel || pkt.id_jenis_sampel, { transaction });
            }
            if (inputData.id_reg_bm || inputData.id_jenis_sampel || data.id_klasifikasi) {
                const check = await PktBm.findOne({
                    where: {
                        id_reg_bm: inputData.id_reg_bm || pkt.id_reg_bm,
                        id_jenis_sampel: inputData.id_jenis_sampel || pkt.id_jenis_sampel,
                        id_klasifikasi: data.id_klasifikasi !== undefined ? data.id_klasifikasi : pkt.id_klasifikasi,
                        id_pkt_bm: { [Op.ne]: id },
                    },
                    transaction,
                });
                if (check)
                    throw new Error('Paket baku mutu dengan regulasi, jenis sampel, dan klasifikasi yang sama sudah ada.');
            }
            await pkt.update(updateData, { transaction });
            await transaction.commit();
            return await this.getPaketById(id);
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    };
    deletePaket = async (id) => {
        const pkt = await PktBm.findByPk(id);
        if (!pkt)
            throw new Error('Paket tidak ditemukan');
        const usage = await getPktBmUsage(id);
        const lhuUsage = Number(usage.lhu || 0);
        if (lhuUsage > 0) {
            throw this.protectedMasterError('Klasifikasi baku mutu tidak dapat dihapus karena sudah dipakai pada LHU. Nonaktifkan kelompok baku mutu jika tidak ingin dipakai untuk pendaftaran baru.', usage);
        }
        await PktBmNilai.destroy({ where: { id_pkt_bm: id } });
        await pkt.destroy();
        return this.toApiData({ deleted: true, usages: usage });
    };
    getPaketParameters = async (id_pkt_bm) => {
        const paket = await PktBm.findByPk(id_pkt_bm);
        if (!paket)
            throw new Error('Paket baku mutu tidak ditemukan.');
        const nilaiRows = await PktBmNilai.findAll({
            where: { id_pkt_bm },
            include: [{
                model: Parameter,
                attributes: ['id_parameter', 'nama_parameter', 'id_kategori_parameter'],
                include: [{ model: KategoriParameter, as: 'kategori', attributes: ['id_kategori_parameter', 'nama_kategori'], required: false }],
            }],
            order: [[{ model: Parameter }, 'nama_parameter', 'ASC']],
        });
        if (nilaiRows.length === 0)
            return [];
        const parameterIds = nilaiRows.map((row) => row.id_parameter).filter(Boolean);
        const metaRows = await PktBmParam.findAll({
            where: {
                id_reg_bm: paket.id_reg_bm,
                id_jenis_sampel: paket.id_jenis_sampel,
                id_parameter: { [Op.in]: parameterIds },
            },
            include: [{ model: Satuan, attributes: ['id_satuan', 'satuan'], required: false }],
        });
        const metaMap = new Map(metaRows.map((row) => [String(row.id_parameter), row]));
        return nilaiRows.map((nilai) => {
            const nilaiData = this.toPlainObject(nilai) || {};
            const meta = metaMap.get(String(nilaiData.id_parameter)) || {
                id_reg_bm: paket.id_reg_bm,
                id_jenis_sampel: paket.id_jenis_sampel,
                id_parameter: nilaiData.id_parameter,
                parameter: nilaiData.parameter || nilaiData.Parameter || null,
            };
            return this.mapPaketParameterData(meta, nilai, paket);
        });
    };
    addPaketParameter = async (id_pkt_bm, data) => {
        const transaction = await sequelize.transaction();
        try {
            const idParameter = String(data?.id_parameter || '').trim();
            if (!idParameter)
                throw new Error('Parameter harus dipilih.');
            const [paket, parameter] = await Promise.all([
                PktBm.findByPk(id_pkt_bm, { transaction }),
                Parameter.findByPk(idParameter, { transaction }),
            ]);
            if (!paket)
                throw new Error('Paket baku mutu tidak ditemukan.');
            if (!parameter)
                throw new Error('Parameter tidak ditemukan.');
            const usage = await getPktBmUsage(id_pkt_bm, { transaction });
            if (Number(usage.lhu || 0) > 0) {
                throw this.protectedMasterError('Detail parameter paket tidak dapat ditambah karena paket baku mutu sudah dipakai pada LHU. Nonaktifkan paket lama lalu buat paket/versi baru.', usage);
            }
            await this.ensurePaketKelompok(paket.id_reg_bm, paket.id_jenis_sampel, { transaction });
            const meta = await PktBmParam.findOne({
                where: { id_reg_bm: paket.id_reg_bm, id_jenis_sampel: paket.id_jenis_sampel, id_parameter: idParameter },
                transaction,
            }) || await PktBmParam.create({
                id_reg_bm: paket.id_reg_bm,
                id_jenis_sampel: paket.id_jenis_sampel,
                id_parameter: idParameter,
                ...await this.buildPaketParameterMetaData(data, {}, transaction),
            }, { transaction });
            const existingNilai = await PktBmNilai.findOne({ where: { id_pkt_bm, id_parameter: idParameter }, transaction });
            if (existingNilai)
                throw new Error('Parameter ini sudah ada di paket tersebut.');
            const nilai = await PktBmNilai.create({
                id_pkt_bm,
                id_parameter: idParameter,
                ...this.buildPaketNilaiData(data),
            }, { transaction });
            await transaction.commit();
            return this.mapPaketParameterData(meta, nilai, paket);
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    };
    updatePaketParameter = async (id_pkt_bm, id_parameter, data) => {
        const transaction = await sequelize.transaction();
        try {
            const paket = await PktBm.findByPk(id_pkt_bm, { transaction });
            if (!paket)
                throw new Error('Paket baku mutu tidak ditemukan.');
            const key = { id_reg_bm: paket.id_reg_bm, id_jenis_sampel: paket.id_jenis_sampel, id_parameter };
            const meta = await PktBmParam.findOne({ where: key, transaction });
            if (!meta)
                throw new Error('Detail Parameter Paket tidak ditemukan');
            const usage = await getPktBmParamUsage({ id_pkt_bm, id_parameter, id_reg_bm: paket.id_reg_bm, id_jenis_sampel: paket.id_jenis_sampel }, { transaction });
            let nilai = await PktBmNilai.findOne({ where: { id_pkt_bm, id_parameter }, transaction });
            const metaData = await this.buildPaketParameterMetaData(data, meta, transaction);
            const nilaiData = this.buildPaketNilaiData(data, nilai || {});
            const hasMetaChange = this.hasChanged(meta.id_satuan, metaData.id_satuan) ||
                this.hasChanged(meta.ket_bm, metaData.ket_bm);
            const hasNilaiChange = !nilai || this.hasChanged(nilai.nilai_bm, nilaiData.nilai_bm);
            if (hasNilaiChange && Number(usage.lhu_dengan_paket_ini || 0) > 0) {
                throw this.protectedMasterError('Nilai baku mutu tidak dapat diubah karena paket sudah dipakai pada LHU. Nonaktifkan paket lama lalu buat paket/versi baru.', usage);
            }
            if (hasMetaChange && Number(usage.lhu_dengan_parameter_kelompok || 0) > 0) {
                throw this.protectedMasterError('Satuan atau keterangan baku mutu tidak dapat diubah karena parameter ini sudah dipakai pada LHU di salah satu klasifikasi dalam kelompok yang sama. Nonaktifkan paket lama lalu buat paket/versi baru.', usage);
            }
            await meta.update(metaData, { transaction });
            if (!nilai) {
                nilai = await PktBmNilai.create({
                    id_pkt_bm,
                    id_parameter,
                    ...nilaiData,
                }, { transaction });
            }
            else {
                await nilai.update(nilaiData, { transaction });
            }
            await transaction.commit();
            return this.mapPaketParameterData(meta, nilai, paket);
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    };
    deletePaketParameter = async (id_pkt_bm, id_parameter) => {
        const transaction = await sequelize.transaction();
        try {
            const paket = await PktBm.findByPk(id_pkt_bm, { transaction });
            if (!paket)
                throw new Error('Paket baku mutu tidak ditemukan.');
            const usage = await getPktBmParamUsage({ id_pkt_bm, id_parameter, id_reg_bm: paket.id_reg_bm, id_jenis_sampel: paket.id_jenis_sampel }, { transaction });
            if (Number(usage.lhu_dengan_paket_ini || 0) > 0) {
                throw this.protectedMasterError('Detail parameter baku mutu tidak dapat dihapus karena paket sudah dipakai pada LHU. Nonaktifkan paket lama lalu buat paket/versi baru.', usage);
            }
            await PktBmNilai.destroy({ where: { id_pkt_bm, id_parameter }, transaction });
            const paketIdsInGroup = (await PktBm.findAll({
                where: { id_reg_bm: paket.id_reg_bm, id_jenis_sampel: paket.id_jenis_sampel },
                attributes: ['id_pkt_bm'],
                transaction,
            })).map((row) => row.id_pkt_bm);
            const remaining = await PktBmNilai.count({ where: { id_pkt_bm: { [Op.in]: paketIdsInGroup }, id_parameter }, transaction });
            if (remaining === 0) {
                await PktBmParam.destroy({ where: { id_reg_bm: paket.id_reg_bm, id_jenis_sampel: paket.id_jenis_sampel, id_parameter }, transaction });
            }
            await transaction.commit();
            return true;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    };
    getAllTarifPengambilan = async () => {
        const rows = await TarifPengambilan.findAll({
            order: [['tarif', 'ASC']]
        });
        return rows.map((row) => this.toApiData(this.toPlainObject(row)));
    };
    createTarifPengambilan = async (data) => {
        const count = await TarifPengambilan.count();
        const id = `TP${String(count + 1).padStart(3, '0')}`;
        const createdTarif = await TarifPengambilan.create({
            id_tarif_pengambilan: id,
            keterangan_jarak: data.keterangan_jarak,
            tarif: data.tarif || 0
        });
        return this.toApiData(this.toPlainObject(createdTarif));
    };
    updateTarifPengambilan = async (id, data) => {
        const tp = await TarifPengambilan.findByPk(id);
        if (!tp)
            throw new Error('Tarif Pengambilan tidak ditemukan');
        await assertUnusedForMasterChange({
            label: 'Tarif pengambilan',
            usageGetter: getTarifPengambilanUsage,
            id,
            operation: 'diubah',
        });
        await tp.update({
            keterangan_jarak: data.keterangan_jarak || tp.keterangan_jarak,
            tarif: data.tarif !== undefined ? data.tarif : tp.tarif
        });
        return this.toApiData(this.toPlainObject(tp));
    };
    deleteTarifPengambilan = async (id) => {
        const tp = await TarifPengambilan.findByPk(id);
        if (!tp)
            throw new Error('Tarif Pengambilan tidak ditemukan');
        await assertUnusedForMasterChange({
            label: 'Tarif pengambilan',
            usageGetter: getTarifPengambilanUsage,
            id,
            operation: 'dihapus',
        });
        await tp.destroy();
        return true;
    };
    publicPlain = (row) => {
        return row?.toJSON ? row.toJSON() : row;
    };

    mapPublicSampleType = (row) => {
        const data = this.publicPlain(row) || {};
        const name = data.jenis_sampel || data.nama_jenis_sampel || data.nama || '';
        return {
            ...toCamelCaseDeep(data),
            idJenisSampel: data.id_jenis_sampel,
            jenisSampel: name,
            namaJenisSampel: name,
            nama: name,
            name,
            label: name,
            value: data.id_jenis_sampel,
        };
    };

    mapPublicRegBm = (row) => {
        const data = this.publicPlain(row) || {};
        const title = [data.instansi, data.ref_reg].filter(Boolean).join(' - ');
        return {
            ...toCamelCaseDeep(data),
            namaRegulasi: data.ref_reg,
            title: title || data.id_reg_bm,
            label: title || data.ref_reg || data.id_reg_bm,
            value: data.id_reg_bm,
        };
    };

    mapPublicPaketBm = (row) => {
        const data = withPaketBmDisplayFields(this.publicPlain(row) || {});
        const reg = data.reg_bm || data.RegBm || {};
        const jenis = data.jenis_sampel || data.JenisSampel || {};
        return {
            ...toCamelCaseDeep(data),
            regBm: toCamelCaseDeep(reg),
            jenisSampelRow: toCamelCaseDeep(jenis),
            namaRegulasi: reg.ref_reg || null,
            instansi: reg.instansi || data.instansi || null,
            jenisSampel: jenis.jenis_sampel || data.jenis_sampel || null,
            label: data.nama_pkt || data.id_pkt_bm,
            value: data.id_pkt_bm,
        };
    };

    mapPublicPickupTariff = (row) => {
        const data = this.publicPlain(row) || {};
        return {
            ...toCamelCaseDeep(data),
            label: data.keterangan_jarak,
            keterangan: data.keterangan_jarak,
            harga: data.tarif,
            price: data.tarif,
            value: data.id_tarif_pengambilan,
        };
    };

    getPublicParameterRequestData = (rowJson = {}) => {
        const parameter = rowJson.parameter || rowJson.Parameter || {};
        const kategori = parameter.kategori || parameter.KategoriParameter || rowJson.kategori || rowJson.KategoriParameter || {};
        const kategoriParameter = parameter.kategori_parameter || kategori.nama_kategori || rowJson.kategori_parameter || rowJson.nama_kategori || null;
        return {
            idParameter: rowJson.id_parameter || parameter.id_parameter || null,
            namaParameter: parameter.nama_parameter || rowJson.nama_parameter || null,
            kategoriParameter,
            parameter: {
                ...toCamelCaseDeep(parameter),
                kategoriParameter,
                namaKategori: parameter.nama_kategori || kategori.nama_kategori || null,
            },
        };
    };

    mapPublicPaketParameterRow = (rowJson = {}) => {
        const parameterData = this.getPublicParameterRequestData(rowJson);
        const satuanLabel = rowJson.satuan?.satuan || rowJson.Satuan?.satuan || rowJson.satuan || rowJson.satuan_bm || null;
        return {
            idPktBm: rowJson.id_pkt_bm || rowJson.pkt_bm?.id_pkt_bm || rowJson.PktBm?.id_pkt_bm || null,
            idParameter: parameterData.idParameter,
            namaParameter: parameterData.namaParameter,
            kategoriParameter: parameterData.kategoriParameter,
            parameter: parameterData.parameter,
            nilaiBm: rowJson.nilai_bm,
            idSatuan: rowJson.id_satuan || rowJson.satuan?.id_satuan || rowJson.Satuan?.id_satuan || null,
            satuan: satuanLabel,
            satuanBm: satuanLabel,
            ketBm: rowJson.ket_bm,
        };
    };

    getActiveBmGroup = async (id_reg_bm, id_jenis_sampel) => {
        if (!id_reg_bm || !id_jenis_sampel)
            return null;
        return await PktBmKelompok.findOne({
            where: { id_reg_bm, id_jenis_sampel, is_active: 1 },
        });
    };

    getActiveGroupRegIdsByJenisSampel = async (id_jenis_sampel) => {
        const kelompokRows = await PktBmKelompok.findAll({
            where: { id_jenis_sampel, is_active: 1 },
            attributes: ['id_reg_bm'],
        });
        return [...new Set(kelompokRows.map((row) => row.id_reg_bm).filter(Boolean))];
    };

    getPublicJenisSampel = async () => {
        const rows = await JenisSampel.findAll({
            order: [['jenis_sampel', 'ASC']],
        });
        return rows.map(this.mapPublicSampleType);
    };

    getPublicPaketBmByJenisSampel = async (id_jenis_sampel) => {
        const idRegBmList = await this.getActiveGroupRegIdsByJenisSampel(id_jenis_sampel);
        if (idRegBmList.length === 0)
            return [];
        const rows = await PktBm.findAll({
            where: {
                id_jenis_sampel,
                id_reg_bm: { [Op.in]: idRegBmList },
            },
            attributes: ['id_pkt_bm', 'id_jenis_sampel', 'id_reg_bm', 'id_klasifikasi'],
            include: [
                { model: RegBm, attributes: ['id_reg_bm', 'instansi', 'ref_reg'], where: { is_active: 1 }, required: true },
                { model: JenisSampel, attributes: ['id_jenis_sampel', 'jenis_sampel'], required: false },
                { model: Klasifikasi, attributes: ['id_klasifikasi', 'klasifikasi'], required: false },
            ],
            order: [[literal('`klasifikasi`.`klasifikasi`'), 'ASC'], ['id_pkt_bm', 'ASC']],
        });
        return rows.map(this.mapPublicPaketBm);
    };

    getPublicBmStandards = async (id_jenis_sampel = null) => {
        let idRegBmList = [];
        if (id_jenis_sampel) {
            idRegBmList = await this.getActiveGroupRegIdsByJenisSampel(id_jenis_sampel);
        }
        else {
            const kelompokRows = await PktBmKelompok.findAll({
                where: { is_active: 1 },
                attributes: ['id_reg_bm'],
            });
            idRegBmList = [...new Set(kelompokRows.map((row) => row.id_reg_bm).filter(Boolean))];
        }
        if (idRegBmList.length === 0)
            return [];
        const rows = await RegBm.findAll({
            where: { id_reg_bm: { [Op.in]: idRegBmList }, is_active: 1 },
            attributes: ['id_reg_bm', 'instansi', 'ref_reg'],
            order: [['instansi', 'ASC'], ['id_reg_bm', 'ASC']],
        });
        return rows.map(this.mapPublicRegBm);
    };

    getPublicTarifPengambilan = async () => {
        const rows = await TarifPengambilan.findAll({
            order: [['id_tarif_pengambilan', 'ASC']],
        });
        return rows.map(this.mapPublicPickupTariff);
    };

    getParameterIdsWithActiveMethods = async (parameterIds = []) => {
        const uniqueIds = [
            ...new Set(parameterIds
                .map((id) => String(id || '').trim())
                .filter(Boolean)),
        ];
        if (uniqueIds.length === 0) {
            return new Set();
        }
        const rows = await ParameterMetode.findAll({
            where: {
                id_parameter: {
                    [Op.in]: uniqueIds,
                },
                is_active: 1,
            },
            attributes: ['id_parameter'],
            group: ['id_parameter'],
            raw: true,
        });
        return new Set(rows.map((row) => row.id_parameter));
    };

    getPublicParameterByPaketBm = async (id_pkt_bm) => {
        if (!id_pkt_bm) {
            throw new Error('id_pkt_bm wajib diisi.');
        }
        const paket = await PktBm.findOne({
            where: { id_pkt_bm },
            include: [{ model: RegBm, where: { is_active: 1 }, required: true }],
        });
        if (!paket)
            return [];
        const kelompok = await this.getActiveBmGroup(paket.id_reg_bm, paket.id_jenis_sampel);
        if (!kelompok)
            return [];
        const nilaiRows = await PktBmNilai.findAll({
            where: { id_pkt_bm },
            include: [{
                model: Parameter,
                attributes: ['id_parameter', 'id_kategori_parameter', 'nama_parameter'],
                include: [{ model: KategoriParameter, as: 'kategori', attributes: ['id_kategori_parameter', 'nama_kategori'], required: false }],
            }],
            order: [[Parameter, 'nama_parameter', 'ASC']],
        });
        if (nilaiRows.length === 0)
            return [];
        const parameterIds = nilaiRows.map((row) => row.id_parameter).filter(Boolean);
        const activeMethodParameterIds = await this.getParameterIdsWithActiveMethods(parameterIds);
        if (activeMethodParameterIds.size === 0)
            return [];
        const visibleParameterIds = parameterIds.filter((id) => activeMethodParameterIds.has(String(id)) || activeMethodParameterIds.has(id));
        if (visibleParameterIds.length === 0)
            return [];
        const metaRows = await PktBmParam.findAll({
            where: {
                id_reg_bm: paket.id_reg_bm,
                id_jenis_sampel: paket.id_jenis_sampel,
                id_parameter: { [Op.in]: visibleParameterIds },
            },
            include: [{ model: Satuan, attributes: ['id_satuan', 'satuan'], required: false }],
        });
        const metaMap = new Map(metaRows.map((row) => [String(row.id_parameter), row.toJSON ? row.toJSON() : row]));
        return nilaiRows
            .filter((row) => activeMethodParameterIds.has(String(row.id_parameter)) || activeMethodParameterIds.has(row.id_parameter))
            .map((row) => {
                const nilai = row.toJSON ? row.toJSON() : row;
                const meta = metaMap.get(String(nilai.id_parameter)) || {};
                const parameter = nilai.parameter || nilai.Parameter || meta.parameter || meta.Parameter || {};
                return this.mapPublicPaketParameterRow({
                    ...meta,
                    id_pkt_bm,
                    id_reg_bm: paket.id_reg_bm,
                    id_jenis_sampel: paket.id_jenis_sampel,
                    id_parameter: nilai.id_parameter,
                    parameter,
                    nilai_bm: nilai.nilai_bm ?? null,
                });
            });
    };

    getPublicPaketBm = async () => {
        const kelompokRows = await PktBmKelompok.findAll({
            where: { is_active: 1 },
            attributes: ['id_reg_bm', 'id_jenis_sampel'],
        });
        if (kelompokRows.length === 0)
            return [];
        const rows = await PktBm.findAll({
            where: {
                [Op.or]: kelompokRows.map((row) => ({
                    id_reg_bm: row.id_reg_bm,
                    id_jenis_sampel: row.id_jenis_sampel,
                })),
            },
            attributes: ['id_pkt_bm', 'id_jenis_sampel', 'id_reg_bm', 'id_klasifikasi'],
            include: [
                { model: RegBm, attributes: ['id_reg_bm', 'instansi', 'ref_reg'], where: { is_active: 1 }, required: true },
                { model: JenisSampel, attributes: ['id_jenis_sampel', 'jenis_sampel'], required: false },
                { model: Klasifikasi, attributes: ['id_klasifikasi', 'klasifikasi'], required: false },
            ],
            order: [['id_jenis_sampel', 'ASC'], [Klasifikasi, 'klasifikasi', 'ASC'], ['id_pkt_bm', 'ASC']],
        });
        return rows.map(this.mapPublicPaketBm);
    };

    getPublicParameterByJenisSampel = async (id_jenis_sampel, id_pkt_bm, id_reg_bm) => {
        if (!id_jenis_sampel) {
            throw new Error('id_jenis_sampel wajib diisi.');
        }
        if (id_pkt_bm) {
            const paket = await PktBm.findOne({
                where: { id_pkt_bm, id_jenis_sampel },
                include: [{ model: RegBm, where: { is_active: 1 }, required: true }],
            });
            if (!paket) {
                throw new Error('Paket baku mutu tidak valid untuk jenis sampel yang dipilih.');
            }
            const kelompok = await this.getActiveBmGroup(paket.id_reg_bm, paket.id_jenis_sampel);
            if (!kelompok) {
                throw new Error('Kelompok baku mutu tidak aktif untuk jenis sampel yang dipilih.');
            }
            return this.getPublicParameterByPaketBm(id_pkt_bm);
        }
        if (!id_reg_bm)
            return [];
        const kelompok = await this.getActiveBmGroup(id_reg_bm, id_jenis_sampel);
        if (!kelompok)
            return [];
        const rows = await PktBmParam.findAll({
            where: { id_jenis_sampel, id_reg_bm },
            include: [{
                model: Parameter,
                attributes: ['id_parameter', 'id_kategori_parameter', 'nama_parameter'],
                include: [{ model: KategoriParameter, as: 'kategori', attributes: ['id_kategori_parameter', 'nama_kategori'], required: false }],
            }, { model: Satuan, attributes: ['id_satuan', 'satuan'], required: false }],
            order: [[Parameter, 'nama_parameter', 'ASC']],
        });
        if (rows.length === 0)
            return [];
        const parameterIds = rows.map((row) => row.id_parameter).filter(Boolean);
        const activeMethodParameterIds = await this.getParameterIdsWithActiveMethods(parameterIds);
        if (activeMethodParameterIds.size === 0)
            return [];
        return rows
            .filter((row) => activeMethodParameterIds.has(String(row.id_parameter)) || activeMethodParameterIds.has(row.id_parameter))
            .map((row) => this.mapPublicPaketParameterRow(row.toJSON ? row.toJSON() : row));
    };

    getPublicParameterTariffs = async () => {
        const rows = await ParameterMetode.findAll({
            where: { is_active: 1 },
            attributes: [
                'id_metode_parameter',
                'id_parameter',
                'id_metode',
                'tarif',
                'acuan_metode',
                'is_terakreditasi',
                'is_subkontrak',
                'is_active',
            ],
            include: [
                {
                    model: Parameter,
                    attributes: ['id_parameter', 'id_kategori_parameter', 'nama_parameter'],
                    include: [{ model: KategoriParameter, as: 'kategori', attributes: ['id_kategori_parameter', 'nama_kategori'], required: false }],
                },
                {
                    model: Metode,
                    attributes: ['id_metode', 'nama_metode'],
                },
            ],
            order: [
                [{ model: Parameter }, 'nama_parameter', 'ASC'],
                [{ model: Metode }, 'nama_metode', 'ASC'],
            ],
        });
        return rows.map((row) => {
            const json = row.toJSON();
            const parameter = json.parameter || json.Parameter || {};
            const metode = json.metode || json.Metode || {};
            return toCamelCaseDeep({
                id_metode_parameter: json.id_metode_parameter,
                id_parameter: json.id_parameter,
                id_metode: json.id_metode,
                nama_parameter: parameter.nama_parameter || null,
                kategori_parameter: parameter.kategori_parameter || null,
                nama_metode: metode.nama_metode || null,
                metode,
                parameter,
                tarif: json.tarif,
                harga: json.tarif,
                price: json.tarif,
                acuan_metode: json.acuan_metode,
                is_terakreditasi: json.is_terakreditasi,
                is_subkontrak: json.is_subkontrak,
                is_active: json.is_active,
            });
        });
    };
}
module.exports = new AdminParameterService();
module.exports.AdminParameterService = AdminParameterService;
