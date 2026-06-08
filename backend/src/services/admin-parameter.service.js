const { sequelize, KategoriParameter, Parameter, Metode, ParameterMetode, RegBm, PktBm, PktBmKelompok, PktBmParam, PktBmNilai, JenisSampel, TarifPengambilan } = require('../models/Associations');
const { withPaketBmDisplayFields } = require('../utils/bm-format.util');
const { Op } = require('sequelize');
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
    mapPaketParameterRow = (row) => this.toPlainObject(row) || {};
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
    buildPaketParameterPayload = (data = {}, current = {}) => {
        const payload = {};
        const currentData = this.toPlainObject(current) || {};
        if (this.hasOwn(data, 'nilai_bm'))
            payload.nilai_bm = this.assertMaxLength(this.normalizeNullableText(data.nilai_bm), 30, 'Nilai baku mutu');
        else if (this.hasOwn(currentData, 'nilai_bm'))
            payload.nilai_bm = currentData.nilai_bm;
        if (this.hasOwn(data, 'satuan_bm'))
            payload.satuan_bm = this.assertMaxLength(this.normalizeNullableText(data.satuan_bm), 20, 'Satuan baku mutu');
        else if (this.hasOwn(currentData, 'satuan_bm'))
            payload.satuan_bm = currentData.satuan_bm;
        if (this.hasOwn(data, 'ket_bm'))
            payload.ket_bm = this.assertMaxLength(this.normalizeNullableText(data.ket_bm), 100, 'Keterangan baku mutu');
        else if (this.hasOwn(currentData, 'ket_bm'))
            payload.ket_bm = currentData.ket_bm;
        return payload;
    };
    hasChanged = (current, next) => {
        if (next === undefined)
            return false;
        return String(current ?? '') !== String(next ?? '');
    };
    withMasterUsage = (row, usage, options = {}) => {
        const data = this.toPlainObject(row);
        const totalUsage = getTotalUsage(usage);
        const lhuUsage = Number(usage?.lhu || usage?.lhu_dengan_paket_ini || 0);
        return {
            ...data,
            usage,
            usage_total: totalUsage,
            is_locked: options.lockedByLhu ? lhuUsage > 0 : totalUsage > 0,
            can_edit_master: options.lockedByLhu ? lhuUsage === 0 : totalUsage === 0,
            can_toggle_active: true,
            can_delete: options.lockedByLhu ? lhuUsage === 0 : totalUsage === 0,
        };
    };
    withParameterMetodeUsage = async (row) => {
        const usage = await getParameterMetodeUsage(row.id_metode_parameter);
        const totalUsage = getTotalUsage(usage);
        return {
            ...this.withSyncedKategoriOnParameterMetode(row),
            usage,
            usage_total: totalUsage,
            can_edit: true,
            can_edit_tarif: true,
            can_edit_master: totalUsage === 0,
            can_delete: totalUsage === 0,
            can_toggle_active: true,
        };
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
        return await KategoriParameter.findAll({
            order: [['nama_kategori', 'ASC']]
        });
    };
    getParameters = async () => {
        const rows = await Parameter.findAll({
            include: [{ model: KategoriParameter, as: 'kategori', attributes: ['id_kategori_parameter', 'nama_kategori'], required: false }],
            order: [['nama_parameter', 'ASC']]
        });
        return rows.map(this.withSyncedKategori);
    };
    getMethods = async () => {
        return await Metode.findAll({
            order: [['nama_metode', 'ASC']]
        });
    };
    getJenisSampel = async () => {
        return await JenisSampel.findAll({
            order: [['jenis_sampel', 'ASC']]
        });
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
            const payload = {
                id_metode_parameter: pmId,
                id_parameter: parameterId,
                id_metode: metodeId,
                tarif: data.tarif || 0,
                acuan_metode: data.acuan_metode || null,
                is_terakreditasi: data.is_terakreditasi ? 1 : 0,
                is_subkontrak: data.is_subkontrak ? 1 : 0,
                is_active: data.is_active === undefined ? 1 : this.normalizeActiveFlag(data.is_active, 1),
            };
            const pm = await ParameterMetode.create(payload, { transaction });
            await transaction.commit();
            return await ParameterMetode.findByPk(pm.id_metode_parameter, {
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
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    };
    updateParameterMetode = async (id, data) => {
        const pm = await ParameterMetode.findByPk(id);
        if (!pm) {
            throw new Error('Data Parameter Metode tidak ditemukan');
        }
        const hasMasterValueChange = data.acuan_metode !== undefined ||
            data.is_terakreditasi !== undefined ||
            data.is_subkontrak !== undefined;
        if (hasMasterValueChange) {
            await assertUnusedForMasterChange({
                label: 'Parameter metode',
                usageGetter: getParameterMetodeUsage,
                id,
                operation: 'diubah',
            });
        }
        const payload = {};
        if (data.acuan_metode !== undefined)
            payload.acuan_metode = data.acuan_metode || null;
        if (data.tarif !== undefined)
            payload.tarif = data.tarif || 0;
        if (data.is_terakreditasi !== undefined)
            payload.is_terakreditasi = data.is_terakreditasi ? 1 : 0;
        if (data.is_subkontrak !== undefined)
            payload.is_subkontrak = data.is_subkontrak ? 1 : 0;
        if (data.is_active !== undefined)
            payload.is_active = this.normalizeActiveFlag(data.is_active, pm.is_active);
        await pm.update(payload);
        return pm;
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
            return this.withMasterUsage(row, usage);
        }));
    };
    createRegulasi = async (data) => {
        const id = await this.generateNextCode({
            model: RegBm,
            column: 'id_reg_bm',
            prefix: 'RBM',
            padLength: 3,
        });
        return await RegBm.create({
            id_reg_bm: id,
            instansi: String(data.instansi || '').trim(),
            ref_reg: String(data.ref_reg || '').trim(),
            is_active: this.normalizeActiveFlag(data.is_active, 1),
        });
    };
    updateRegulasi = async (id, data) => {
        const reg = await RegBm.findByPk(id);
        if (!reg)
            throw new Error('Regulasi tidak ditemukan');
        const usage = await getRegBmUsage(id);
        const totalUsage = getTotalUsage(usage);
        const nextInstansi = this.hasOwn(data, 'instansi') ? String(data.instansi || '').trim() : undefined;
        const nextRefReg = this.hasOwn(data, 'ref_reg') ? String(data.ref_reg || '').trim() : undefined;
        const hasMasterChange = this.hasChanged(reg.instansi, nextInstansi) ||
            this.hasChanged(reg.ref_reg, nextRefReg);
        if (hasMasterChange && totalUsage > 0) {
            throw this.protectedMasterError('Regulasi baku mutu tidak dapat mengubah instansi/referensi karena sudah terhubung dengan paket, permohonan, atau LHU. Nonaktifkan regulasi lama lalu buat regulasi baru jika ada revisi acuan.', usage);
        }
        const payload = {};
        if (nextInstansi !== undefined)
            payload.instansi = nextInstansi;
        if (nextRefReg !== undefined)
            payload.ref_reg = nextRefReg;
        if (this.hasOwn(data, 'is_active'))
            payload.is_active = this.normalizeActiveFlag(data.is_active, reg.is_active);
        await reg.update(payload);
        const updated = await RegBm.findByPk(id);
        return this.withMasterUsage(updated, usage);
    };
    deleteRegulasi = async (id) => {
        const reg = await RegBm.findByPk(id);
        if (!reg)
            throw new Error('Regulasi tidak ditemukan');
        const usage = await getRegBmUsage(id);
        const totalUsage = getTotalUsage(usage);
        if (totalUsage > 0) {
            await reg.update({ is_active: 0 });
            return { deactivated: true, usages: usage };
        }
        await reg.destroy();
        return { deleted: true, usages: usage };
    };
    withPaketDisplay = (row, kelompok = null) => {
        const data = withPaketBmDisplayFields(this.toPlainObject(row) || {});
        const kelompokData = this.toPlainObject(kelompok) || null;
        const kelompokIsActive = kelompokData ? this.normalizeActiveFlag(kelompokData.is_active, 1) : 1;
        return {
            ...data,
            paket_is_active: this.normalizeActiveFlag(data.is_active, 1),
            group_is_active: kelompokIsActive,
            is_active: kelompokIsActive,
            bm_kelompok: kelompokData,
        };
    };
    getPaketInclude = () => ([
        { model: RegBm, attributes: ['id_reg_bm', 'ref_reg', 'instansi', 'is_active'] },
        { model: JenisSampel, attributes: ['id_jenis_sampel', 'jenis_sampel'] },
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
    buildPaketParameterMetaPayload = (data = {}, current = {}) => {
        const payload = {};
        const currentData = this.toPlainObject(current) || {};
        if (this.hasOwn(data, 'satuan_bm'))
            payload.satuan_bm = this.assertMaxLength(this.normalizeNullableText(data.satuan_bm), 20, 'Satuan baku mutu');
        else if (this.hasOwn(currentData, 'satuan_bm'))
            payload.satuan_bm = currentData.satuan_bm;
        if (this.hasOwn(data, 'ket_bm'))
            payload.ket_bm = this.assertMaxLength(this.normalizeNullableText(data.ket_bm), 100, 'Keterangan baku mutu');
        else if (this.hasOwn(currentData, 'ket_bm'))
            payload.ket_bm = currentData.ket_bm;
        return payload;
    };
    buildPaketNilaiPayload = (data = {}, current = {}) => {
        const payload = {};
        const currentData = this.toPlainObject(current) || {};
        if (this.hasOwn(data, 'nilai_bm'))
            payload.nilai_bm = this.assertMaxLength(this.normalizeNullableText(data.nilai_bm), 30, 'Nilai baku mutu');
        else if (this.hasOwn(currentData, 'nilai_bm'))
            payload.nilai_bm = currentData.nilai_bm;
        return payload;
    };
    mapPaketParameterData = (metaRow = {}, nilaiRow = {}, paket = {}) => {
        const meta = this.toPlainObject(metaRow) || {};
        const nilai = this.toPlainObject(nilaiRow) || {};
        const parameter = meta.parameter || meta.Parameter || nilai.parameter || nilai.Parameter || {};
        return {
            id_pkt_bm: paket.id_pkt_bm || nilai.id_pkt_bm || null,
            id_reg_bm: meta.id_reg_bm || paket.id_reg_bm || nilai.id_reg_bm || null,
            id_jenis_sampel: meta.id_jenis_sampel || paket.id_jenis_sampel || nilai.id_jenis_sampel || null,
            id_parameter: meta.id_parameter || nilai.id_parameter || parameter.id_parameter || null,
            nama_parameter: parameter.nama_parameter || meta.nama_parameter || null,
            kategori_parameter: parameter.kategori?.nama_kategori || parameter.KategoriParameter?.nama_kategori || meta.kategori_parameter || null,
            parameter,
            nilai_bm: nilai.nilai_bm ?? null,
            satuan_bm: meta.satuan_bm ?? null,
            ket_bm: meta.ket_bm ?? null,
        };
    };
    getAllPaket = async () => {
        const rows = await PktBm.findAll({
            include: this.getPaketInclude(),
            order: [['id_reg_bm', 'ASC'], ['id_jenis_sampel', 'ASC'], ['klasifikasi', 'ASC'], ['id_pkt_bm', 'ASC']],
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
            order: [['klasifikasi', 'ASC'], ['id_pkt_bm', 'ASC']],
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
            const idRegBm = String(data.id_reg_bm || '').trim();
            const idJenisSampel = String(data.id_jenis_sampel || '').trim();
            const klasifikasi = this.normalizeNullableText(data.klasifikasi);
            if (!idRegBm || !idJenisSampel || !klasifikasi)
                throw new Error('Regulasi, jenis sampel, dan klasifikasi wajib diisi.');
            await this.ensurePaketKelompok(idRegBm, idJenisSampel, { transaction });
            const duplicate = await PktBm.findOne({ where: { id_reg_bm: idRegBm, id_jenis_sampel: idJenisSampel, klasifikasi }, transaction });
            if (duplicate)
                throw new Error('Paket baku mutu dengan regulasi, jenis sampel, dan klasifikasi yang sama sudah ada.');
            const id = await this.generateNextCode({ model: PktBm, column: 'id_pkt_bm', prefix: 'PKBM', padLength: 4, transaction });
            const created = await PktBm.create({
                id_pkt_bm: id,
                id_reg_bm: idRegBm,
                id_jenis_sampel: idJenisSampel,
                klasifikasi,
                is_active: 1,
            }, { transaction });
            await transaction.commit();
            return await this.getPaketById(created.id_pkt_bm);
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    };
    updatePaket = async (id, data) => {
        const transaction = await sequelize.transaction();
        try {
            const pkt = await PktBm.findByPk(id, { transaction });
            if (!pkt)
                throw new Error('Paket tidak ditemukan');
            const usage = await getPktBmUsage(id, { transaction });
            const lhuUsage = Number(usage.lhu || 0);
            const nilaiUsage = Number(usage.pkt_bm_nilai || 0);
            const nextIdRegBm = this.hasOwn(data, 'id_reg_bm') ? String(data.id_reg_bm || '').trim() : undefined;
            const nextJenisSampel = this.hasOwn(data, 'id_jenis_sampel') ? String(data.id_jenis_sampel || '').trim() : undefined;
            const nextKlasifikasi = this.hasOwn(data, 'klasifikasi') ? this.normalizeNullableText(data.klasifikasi) : undefined;
            const hasIdentityChange = this.hasChanged(pkt.id_reg_bm, nextIdRegBm) ||
                this.hasChanged(pkt.id_jenis_sampel, nextJenisSampel);
            const hasStructureChange = hasIdentityChange || this.hasChanged(pkt.klasifikasi, nextKlasifikasi);
            if (hasStructureChange && lhuUsage > 0) {
                throw this.protectedMasterError('Paket baku mutu tidak dapat mengubah regulasi, jenis sampel, atau klasifikasi karena sudah dipakai pada LHU. Nonaktifkan paket lama lalu buat paket/versi baru.', usage);
            }
            if (hasIdentityChange && nilaiUsage > 0) {
                throw this.protectedMasterError('Paket baku mutu tidak dapat mengubah regulasi atau jenis sampel karena sudah memiliki nilai baku mutu. Hapus parameter paket dulu atau buat paket baru.', usage);
            }
            const payload = {};
            if (nextIdRegBm !== undefined)
                payload.id_reg_bm = nextIdRegBm;
            if (nextJenisSampel !== undefined)
                payload.id_jenis_sampel = nextJenisSampel;
            if (nextKlasifikasi !== undefined)
                payload.klasifikasi = nextKlasifikasi;
            if (payload.id_reg_bm || payload.id_jenis_sampel) {
                await this.ensurePaketKelompok(payload.id_reg_bm || pkt.id_reg_bm, payload.id_jenis_sampel || pkt.id_jenis_sampel, { transaction });
            }
            if (payload.id_reg_bm || payload.id_jenis_sampel || payload.klasifikasi) {
                const check = await PktBm.findOne({
                    where: {
                        id_reg_bm: payload.id_reg_bm || pkt.id_reg_bm,
                        id_jenis_sampel: payload.id_jenis_sampel || pkt.id_jenis_sampel,
                        klasifikasi: payload.klasifikasi !== undefined ? payload.klasifikasi : pkt.klasifikasi,
                        id_pkt_bm: { [Op.ne]: id },
                    },
                    transaction,
                });
                if (check)
                    throw new Error('Paket baku mutu dengan regulasi, jenis sampel, dan klasifikasi yang sama sudah ada.');
            }
            await pkt.update(payload, { transaction });
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
        return { deleted: true, usages: usage };
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
                ...this.buildPaketParameterMetaPayload(data),
            }, { transaction });
            const existingNilai = await PktBmNilai.findOne({ where: { id_pkt_bm, id_parameter: idParameter }, transaction });
            if (existingNilai)
                throw new Error('Parameter ini sudah ada di paket tersebut.');
            const nilai = await PktBmNilai.create({
                id_pkt_bm,
                id_reg_bm: paket.id_reg_bm,
                id_jenis_sampel: paket.id_jenis_sampel,
                id_parameter: idParameter,
                ...this.buildPaketNilaiPayload(data),
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
            const metaPayload = this.buildPaketParameterMetaPayload(data, meta);
            const nilaiPayload = this.buildPaketNilaiPayload(data, nilai || {});
            const hasMetaChange = this.hasChanged(meta.satuan_bm, metaPayload.satuan_bm) ||
                this.hasChanged(meta.ket_bm, metaPayload.ket_bm);
            const hasNilaiChange = !nilai || this.hasChanged(nilai.nilai_bm, nilaiPayload.nilai_bm);
            if (hasNilaiChange && Number(usage.lhu_dengan_paket_ini || 0) > 0) {
                throw this.protectedMasterError('Nilai baku mutu tidak dapat diubah karena paket sudah dipakai pada LHU. Nonaktifkan paket lama lalu buat paket/versi baru.', usage);
            }
            if (hasMetaChange && Number(usage.lhu_dengan_parameter_kelompok || 0) > 0) {
                throw this.protectedMasterError('Satuan atau keterangan baku mutu tidak dapat diubah karena parameter ini sudah dipakai pada LHU di salah satu klasifikasi dalam kelompok yang sama. Nonaktifkan paket lama lalu buat paket/versi baru.', usage);
            }
            await meta.update(metaPayload, { transaction });
            if (!nilai) {
                nilai = await PktBmNilai.create({
                    id_pkt_bm,
                    id_reg_bm: paket.id_reg_bm,
                    id_jenis_sampel: paket.id_jenis_sampel,
                    id_parameter,
                    ...nilaiPayload,
                }, { transaction });
            }
            else {
                await nilai.update(nilaiPayload, { transaction });
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
            const remaining = await PktBmNilai.count({ where: { id_reg_bm: paket.id_reg_bm, id_jenis_sampel: paket.id_jenis_sampel, id_parameter }, transaction });
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
        return await TarifPengambilan.findAll({
            order: [['tarif', 'ASC']]
        });
    };
    createTarifPengambilan = async (data) => {
        const count = await TarifPengambilan.count();
        const id = `TP${String(count + 1).padStart(3, '0')}`;
        return await TarifPengambilan.create({
            id_tarif_pengambilan: id,
            keterangan_jarak: data.keterangan_jarak,
            tarif: data.tarif || 0
        });
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
        return tp;
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
}
module.exports = new AdminParameterService();
module.exports.AdminParameterService = AdminParameterService;
