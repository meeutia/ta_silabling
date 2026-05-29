const { 
  sequelize, 
  KategoriParameter,
  Parameter, 
  Metode, 
  ParameterMetode, 
  RegBm, 
  PktBm, 
  PktBmParam, 
  PktBmPm,
  JenisSampel,
  TarifPengambilan
} = require('../models/Associations');

const { Op } = require('sequelize');
const {
  assertUnusedForMasterChange,
  getParameterMetodeUsage,
  getRegBmUsage,
  getPktBmUsage,
  getPktBmParamUsage,
  getTarifPengambilanUsage,
  getTotalUsage,
} = require('./protected-master-guard.service');

async function generateNextCode({
  model,
  column,
  prefix,
  padLength,
  transaction,
}) {
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

    const numberPart = Number(
      String(rawValue || '').replace(prefix, '').replace(/\D/g, '')
    );

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

}

function normalizeCategoryName(value) {
  return String(value || '').trim();
}


function toPlainObject(row) {
  if (!row) return row;
  if (typeof row.toJSON === 'function') return row.toJSON();
  return { ...row };
}

function withSyncedKategori(parameterRow) {
  const parameter = toPlainObject(parameterRow);
  if (!parameter) return parameter;

  const kategoriRelasi = parameter.kategori || parameter.KategoriParameter || null;
  const namaRelasi = normalizeCategoryName(kategoriRelasi?.nama_kategori);
  const idRelasi = kategoriRelasi?.id_kategori_parameter || parameter.id_kategori_parameter || null;

  return {
    ...parameter,
    id_kategori_parameter: parameter.id_kategori_parameter || idRelasi || null,
    kategori_parameter: normalizeCategoryName(parameter.kategori_parameter) || namaRelasi || null,
    nama_kategori: normalizeCategoryName(parameter.kategori_parameter) || namaRelasi || null,
    kategori: kategoriRelasi
      ? {
          ...kategoriRelasi,
          id_kategori_parameter: kategoriRelasi.id_kategori_parameter || idRelasi || null,
          nama_kategori: namaRelasi || normalizeCategoryName(parameter.kategori_parameter) || null,
        }
      : null,
  };
}

function withSyncedKategoriOnParameterMetode(row) {
  const item = toPlainObject(row);
  if (!item) return item;

  return {
    ...item,
    parameter: withSyncedKategori(item.parameter),
  };
}

async function resolveKategoriParameter({ idKategoriParameter, namaKategori, transaction }) {
  const normalizedName = normalizeCategoryName(namaKategori);

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

  const newId = await generateNextCode({
    model: KategoriParameter,
    column: 'id_kategori_parameter',
    prefix: 'KP',
    padLength: 2,
    transaction,
  });

  const created = await KategoriParameter.create(
    {
      id_kategori_parameter: newId,
      nama_kategori: normalizedName,
    },
    { transaction }
  );

  return {
    id_kategori_parameter: created.id_kategori_parameter,
    nama_kategori: created.nama_kategori,
  };
}

function pickMethodId(method) {
  if (!method) return '';
  if (typeof method === 'string') return method.trim();
  return String(
    method.id_metode_parameter ||
    method.idMetodeParameter ||
    method.methodId ||
    method.value ||
    ''
  ).trim();
}

async function resolvePaketParameterMethods({ idParameter, methods, autoUseAll = false, transaction }) {
  let methodIds = [];
  const defaultIds = new Set();

  const methodList = Array.isArray(methods) ? methods : (methods ? [methods] : []);

  for (const method of methodList) {
    const id = pickMethodId(method);
    if (!id || methodIds.includes(id)) continue;
    methodIds.push(id);

    if (method?.is_default || method?.isDefault || method?.default) {
      defaultIds.add(id);
    }
  }

  if (autoUseAll && methodIds.length === 0) {
    const rows = await ParameterMetode.findAll({
      where: { id_parameter: idParameter },
      attributes: ['id_metode_parameter'],
      order: [['id_metode_parameter', 'ASC']],
      transaction,
    });

    methodIds = rows.map((row) => row.id_metode_parameter).filter(Boolean);
  }

  if (methodIds.length === 0) {
    return [];
  }

  const validRows = await ParameterMetode.findAll({
    where: {
      id_parameter: idParameter,
      id_metode_parameter: { [Op.in]: methodIds },
    },
    attributes: ['id_metode_parameter'],
    transaction,
  });

  const validIds = new Set(validRows.map((row) => String(row.id_metode_parameter)));
  const invalidIds = methodIds.filter((id) => !validIds.has(String(id)));

  if (invalidIds.length > 0) {
    throw new Error(`Metode parameter tidak valid untuk parameter ${idParameter}: ${invalidIds.join(', ')}`);
  }

  const fallbackDefaultId = methodIds[0];
  const hasExplicitDefault = methodIds.some((id) => defaultIds.has(id));

  return methodIds.map((id) => ({
    id_metode_parameter: id,
    is_default: hasExplicitDefault ? (defaultIds.has(id) ? 1 : 0) : (id === fallbackDefaultId ? 1 : 0),
  }));
}

async function createPaketMethodRows({ idPktBmParam, methods, transaction }) {
  for (const method of methods) {
    await PktBmPm.findOrCreate({
      where: {
        id_pkt_bm_param: idPktBmParam,
        id_metode_parameter: method.id_metode_parameter,
      },
      defaults: {
        id_pkt_bm_param: idPktBmParam,
        id_metode_parameter: method.id_metode_parameter,
        is_default: method.is_default ? 1 : 0,
      },
      transaction,
    });
  }
}

function hasOwn(data, key) {
  return Object.prototype.hasOwnProperty.call(data || {}, key);
}

function normalizeActiveFlag(value, fallback = 1) {
  if (value === undefined || value === null || value === '') return Number(fallback || 0) ? 1 : 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'aktif', 'active', 'ya', 'yes'].includes(normalized)) return 1;
  if (['0', 'false', 'nonaktif', 'inactive', 'tidak', 'no'].includes(normalized)) return 0;
  return Number(value) ? 1 : 0;
}

function normalizeNullableText(value) {
  if (value === undefined) return undefined;
  const text = String(value ?? '').trim();
  return text || null;
}

function hasChanged(current, next) {
  if (next === undefined) return false;
  return String(current ?? '') !== String(next ?? '');
}

function withMasterUsage(row, usage, options = {}) {
  const data = toPlainObject(row);
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
}

function protectedMasterError(message, usages) {
  const error = new Error(message);
  error.code = 'PROTECTED_MASTER_IN_USE';
  error.usages = usages;
  return error;
}

class AdminParameterService {
  // ==========================================
  // 1. Parameter & Metode Uji (parameter_metode)
  // ==========================================
  
  static async getAllParameterMetode() {
    const rows = await ParameterMetode.findAll({
      attributes: [
        'id_metode_parameter',
        'id_parameter',
        'id_metode',
        'tarif',
        'acuan_metode',
        'is_terakreditasi',
        'is_subkontrak',
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

    return rows.map(withSyncedKategoriOnParameterMetode);
  }

  static async getKategoriParameters() {
    return await KategoriParameter.findAll({
      order: [['nama_kategori', 'ASC']]
    });
  }

  static async getParameters() {
    const rows = await Parameter.findAll({
      include: [{ model: KategoriParameter, as: 'kategori', attributes: ['id_kategori_parameter', 'nama_kategori'], required: false }],
      order: [['nama_parameter', 'ASC']]
    });

    return rows.map(withSyncedKategori);
  }

  static async getMethods() {
    return await Metode.findAll({
      order: [['nama_metode', 'ASC']]
    });
  }

  static async getJenisSampel() {
    return await JenisSampel.findAll({
      order: [['jenis_sampel', 'ASC']]
    });
  }

  static async createParameterMetode(data) {
    const transaction = await sequelize.transaction();

    try {
      let parameterId = data.id_parameter;
      let metodeId = data.id_metode;

      if (data.is_new_parameter) {
        if (!data.nama_parameter || !data.nama_parameter.trim()) {
          throw new Error('Nama parameter baru harus diisi');
        }

        parameterId = await generateNextCode({
          model: Parameter,
          column: 'id_parameter',
          prefix: 'PR',
          padLength: 4,
          transaction,
        });

        const resolvedKategori = await resolveKategoriParameter({
          idKategoriParameter: data.id_kategori_parameter || data.idKategoriParameter,
          namaKategori: data.kategori_parameter || data.nama_kategori || data.namaKategori,
          transaction,
        });

        await Parameter.create(
          {
            id_parameter: parameterId,
            id_kategori_parameter: resolvedKategori.id_kategori_parameter,
            nama_parameter: data.nama_parameter.trim(),
          },
          { transaction }
        );
      }

      if (data.is_new_metode) {
        if (!data.nama_metode || !data.nama_metode.trim()) {
          throw new Error('Nama metode baru harus diisi');
        }

        metodeId = await generateNextCode({
          model: Metode,
          column: 'id_metode',
          prefix: 'M',
          padLength: 2,
          transaction,
        });

        await Metode.create(
          {
            id_metode: metodeId,
            nama_metode: data.nama_metode.trim(),
          },
          { transaction }
        );
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

      const pmId = await generateNextCode({
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
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  static async updateParameterMetode(id, data) {
    const pm = await ParameterMetode.findByPk(id);

    if (!pm) {
      throw new Error('Data Parameter Metode tidak ditemukan');
    }

    const hasMasterValueChange =
      data.acuan_metode !== undefined ||
      data.tarif !== undefined ||
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

    await pm.update({
      acuan_metode: data.acuan_metode !== undefined ? data.acuan_metode : pm.acuan_metode,
      tarif: data.tarif !== undefined ? data.tarif : pm.tarif,
      is_terakreditasi:
        data.is_terakreditasi !== undefined
          ? data.is_terakreditasi
            ? 1
            : 0
          : pm.is_terakreditasi,
      is_subkontrak:
        data.is_subkontrak !== undefined
          ? data.is_subkontrak
            ? 1
            : 0
          : pm.is_subkontrak,
    });

    return pm;
  }

  static async deleteParameterMetode(id) {
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
  }

  // ==========================================
  // 2. Regulasi (reg_bm)
  // ==========================================

  static async getAllRegulasi() {
    const rows = await RegBm.findAll({
      order: [['is_active', 'DESC'], ['instansi', 'ASC'], ['id_reg_bm', 'ASC']],
    });

    return Promise.all(
      rows.map(async (row) => {
        const usage = await getRegBmUsage(row.id_reg_bm);
        return withMasterUsage(row, usage);
      })
    );
  }

  static async createRegulasi(data) {
    const id = await generateNextCode({
      model: RegBm,
      column: 'id_reg_bm',
      prefix: 'RBM',
      padLength: 3,
    });

    return await RegBm.create({
      id_reg_bm: id,
      instansi: String(data.instansi || '').trim(),
      ref_reg: String(data.ref_reg || '').trim(),
      is_active: normalizeActiveFlag(data.is_active, 1),
    });
  }

  static async updateRegulasi(id, data) {
    const reg = await RegBm.findByPk(id);
    if (!reg) throw new Error('Regulasi tidak ditemukan');

    const usage = await getRegBmUsage(id);
    const totalUsage = getTotalUsage(usage);
    const nextInstansi = hasOwn(data, 'instansi') ? String(data.instansi || '').trim() : undefined;
    const nextRefReg = hasOwn(data, 'ref_reg') ? String(data.ref_reg || '').trim() : undefined;
    const hasMasterChange =
      hasChanged(reg.instansi, nextInstansi) ||
      hasChanged(reg.ref_reg, nextRefReg);

    if (hasMasterChange && totalUsage > 0) {
      throw protectedMasterError(
        'Regulasi baku mutu tidak dapat mengubah instansi/referensi karena sudah terhubung dengan paket, permohonan, atau LHU. Nonaktifkan regulasi lama lalu buat regulasi baru jika ada revisi acuan.',
        usage
      );
    }

    const payload = {};
    if (nextInstansi !== undefined) payload.instansi = nextInstansi;
    if (nextRefReg !== undefined) payload.ref_reg = nextRefReg;
    if (hasOwn(data, 'is_active')) payload.is_active = normalizeActiveFlag(data.is_active, reg.is_active);

    await reg.update(payload);

    const updated = await RegBm.findByPk(id);
    return withMasterUsage(updated, usage);
  }

  static async deleteRegulasi(id) {
    const reg = await RegBm.findByPk(id);
    if (!reg) throw new Error('Regulasi tidak ditemukan');

    const usage = await getRegBmUsage(id);
    const totalUsage = getTotalUsage(usage);

    if (totalUsage > 0) {
      await reg.update({ is_active: 0 });
      return { deactivated: true, usages: usage };
    }

    await reg.destroy();
    return { deleted: true, usages: usage };
  }


  // ==========================================
  // 3. Paket Baku Mutu (pkt_bm)
  // ==========================================

  static async getAllPaket() {
    const rows = await PktBm.findAll({
      include: [
        { model: RegBm, attributes: ['id_reg_bm', 'ref_reg', 'instansi', 'is_active'] },
        { model: JenisSampel, attributes: ['id_jenis_sampel', 'jenis_sampel'] },
      ],
      order: [['is_active', 'DESC'], ['id_reg_bm', 'ASC'], ['id_jenis_sampel', 'ASC']],
    });

    return Promise.all(
      rows.map(async (row) => {
        const usage = await getPktBmUsage(row.id_pkt_bm);
        return withMasterUsage(row, usage, { lockedByLhu: true });
      })
    );
  }

  static async getPaketById(id) {
    const row = await PktBm.findByPk(id, {
      include: [
        { model: RegBm, attributes: ['id_reg_bm', 'ref_reg', 'instansi', 'is_active'] },
        { model: JenisSampel, attributes: ['id_jenis_sampel', 'jenis_sampel'] },
      ],
    });

    if (!row) return null;

    const usage = await getPktBmUsage(id);
    return withMasterUsage(row, usage, { lockedByLhu: true });
  }

  static async createPaket(data) {
    const id = await generateNextCode({
      model: PktBm,
      column: 'id_pkt_bm',
      prefix: 'PKBM',
      padLength: 4,
    });

    return await PktBm.create({
      id_pkt_bm: id,
      id_reg_bm: data.id_reg_bm,
      id_jenis_sampel: data.id_jenis_sampel,
      klasifikasi: normalizeNullableText(data.klasifikasi),
      nama_pkt: String(data.nama_pkt || '').trim(),
      teks_lhu: normalizeNullableText(data.teks_lhu),
      is_active: normalizeActiveFlag(data.is_active, 1),
    });
  }

  static async updatePaket(id, data) {
    const pkt = await PktBm.findByPk(id);
    if (!pkt) throw new Error('Paket tidak ditemukan');

    const usage = await getPktBmUsage(id);
    const lhuUsage = Number(usage.lhu || 0);

    const nextIdRegBm = hasOwn(data, 'id_reg_bm') ? String(data.id_reg_bm || '').trim() : undefined;
    const nextJenisSampel = hasOwn(data, 'id_jenis_sampel') ? String(data.id_jenis_sampel || '').trim() : undefined;
    const nextKlasifikasi = hasOwn(data, 'klasifikasi') ? normalizeNullableText(data.klasifikasi) : undefined;
    const nextNamaPkt = hasOwn(data, 'nama_pkt') ? String(data.nama_pkt || '').trim() : undefined;
    const nextTeksLhu = hasOwn(data, 'teks_lhu') ? normalizeNullableText(data.teks_lhu) : undefined;

    const hasStructureChange =
      hasChanged(pkt.id_reg_bm, nextIdRegBm) ||
      hasChanged(pkt.id_jenis_sampel, nextJenisSampel) ||
      hasChanged(pkt.klasifikasi, nextKlasifikasi) ||
      hasChanged(pkt.nama_pkt, nextNamaPkt) ||
      hasChanged(pkt.teks_lhu, nextTeksLhu);

    if (hasStructureChange && lhuUsage > 0) {
      throw protectedMasterError(
        'Paket baku mutu tidak dapat mengubah regulasi, jenis sampel, klasifikasi, nama, atau teks LHU karena sudah dipakai pada LHU. Nonaktifkan paket lama lalu buat paket/versi baru.',
        usage
      );
    }

    const payload = {};
    if (nextIdRegBm !== undefined) payload.id_reg_bm = nextIdRegBm;
    if (nextJenisSampel !== undefined) payload.id_jenis_sampel = nextJenisSampel;
    if (nextKlasifikasi !== undefined) payload.klasifikasi = nextKlasifikasi;
    if (nextNamaPkt !== undefined) payload.nama_pkt = nextNamaPkt;
    if (nextTeksLhu !== undefined) payload.teks_lhu = nextTeksLhu;
    if (hasOwn(data, 'is_active')) payload.is_active = normalizeActiveFlag(data.is_active, pkt.is_active);

    await pkt.update(payload);

    const updated = await this.getPaketById(id);
    return updated;
  }

  static async deletePaket(id) {
    const pkt = await PktBm.findByPk(id);
    if (!pkt) throw new Error('Paket tidak ditemukan');

    const usage = await getPktBmUsage(id);
    const lhuUsage = Number(usage.lhu || 0);

    if (lhuUsage > 0) {
      await pkt.update({ is_active: 0 });
      return { deactivated: true, usages: usage };
    }

    await pkt.destroy();
    return { deleted: true, usages: usage };
  }

  // ==========================================
  // 4. Detail Paket Baku Mutu (pkt_bm_param & pkt_bm_pm)
  // ==========================================

  static async getPaketParameters(id_pkt_bm) {
    return await PktBmParam.findAll({
      where: { id_pkt_bm },
      include: [
        {
          model: Parameter,
          attributes: ['id_parameter', 'nama_parameter', 'id_kategori_parameter'],
          include: [{ model: KategoriParameter, as: 'kategori', attributes: ['id_kategori_parameter', 'nama_kategori'], required: false }],
        },
        { 
          model: PktBmPm,
          include: [
            { 
              model: ParameterMetode,
              include: [{ model: Metode, attributes: ['nama_metode'] }]
            }
          ]
        }
      ],
      order: [[{ model: Parameter }, 'nama_parameter', 'ASC']]
    });
  }

  static async addPaketParameter(id_pkt_bm, data) {
    const transaction = await sequelize.transaction();
    try {
      const usage = await getPktBmUsage(id_pkt_bm, { transaction });
      if (Number(usage.lhu || 0) > 0) {
        throw protectedMasterError(
          'Detail parameter paket tidak dapat ditambah karena paket baku mutu sudah dipakai pada LHU. Nonaktifkan paket lama lalu buat paket/versi baru.',
          usage
        );
      }

      const existing = await PktBmParam.findOne({
        where: { id_pkt_bm, id_parameter: data.id_parameter },
        transaction
      });

      if (existing) throw new Error('Parameter ini sudah ada di paket tersebut.');

      const paramId = await generateNextCode({
        model: PktBmParam,
        column: 'id_pkt_bm_param',
        prefix: 'PBI',
        padLength: 6,
        transaction
      });

      const pktParam = await PktBmParam.create({
        id_pkt_bm_param: paramId,
        id_pkt_bm,
        id_parameter: data.id_parameter,
        nilai_bm: data.nilai_bm || null,
        satuan_bm: data.satuan_bm || null,
        ket_bm: data.ket_bm || null,
        is_in_bm: data.is_in_bm !== undefined ? data.is_in_bm : 1
      }, { transaction });

      const resolvedMethods = await resolvePaketParameterMethods({
        idParameter: data.id_parameter,
        methods: data.methods || data.methodIds || data.id_metode_parameter || data.idMetodeParameter,
        autoUseAll: true,
        transaction,
      });

      if (resolvedMethods.length === 0) {
        throw new Error('Parameter ini belum memiliki metode. Tambahkan metode pada menu Parameter & Metode terlebih dahulu.');
      }

      await createPaketMethodRows({
        idPktBmParam: paramId,
        methods: resolvedMethods,
        transaction,
      });

      await transaction.commit();
      return pktParam;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async updatePaketParameter(id_pkt_bm_param, data) {
    const transaction = await sequelize.transaction();
    try {
      const pktParam = await PktBmParam.findByPk(id_pkt_bm_param, { transaction });
      if (!pktParam) throw new Error('Detail Parameter Paket tidak ditemukan');

      const usage = await getPktBmParamUsage(id_pkt_bm_param, { transaction });
      if (Number(usage.lhu_dengan_paket_ini || 0) > 0) {
        throw protectedMasterError(
          'Detail parameter baku mutu tidak dapat diubah karena paket sudah dipakai pada LHU. Nonaktifkan paket lama lalu buat paket/versi baru.',
          usage
        );
      }

      await pktParam.update({
        nilai_bm: data.nilai_bm !== undefined ? data.nilai_bm : pktParam.nilai_bm,
        satuan_bm: data.satuan_bm !== undefined ? data.satuan_bm : pktParam.satuan_bm,
        ket_bm: data.ket_bm !== undefined ? data.ket_bm : pktParam.ket_bm,
        is_in_bm: data.is_in_bm !== undefined ? data.is_in_bm : pktParam.is_in_bm
      }, { transaction });

      const hasMethodsPayload = data.methods !== undefined || data.methodIds !== undefined || data.id_metode_parameter !== undefined || data.idMetodeParameter !== undefined;

      if (hasMethodsPayload) {
        const resolvedMethods = await resolvePaketParameterMethods({
          idParameter: pktParam.id_parameter,
          methods: data.methods || data.methodIds || data.id_metode_parameter || data.idMetodeParameter,
          autoUseAll: false,
          transaction,
        });

        if (resolvedMethods.length === 0) {
          throw new Error('Minimal satu metode harus dipilih untuk parameter paket.');
        }

        await PktBmPm.destroy({ where: { id_pkt_bm_param }, transaction });
        await createPaketMethodRows({
          idPktBmParam: id_pkt_bm_param,
          methods: resolvedMethods,
          transaction,
        });
      }

      await transaction.commit();
      return pktParam;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async deletePaketParameter(id_pkt_bm_param) {
    const transaction = await sequelize.transaction();
    try {
      const usage = await getPktBmParamUsage(id_pkt_bm_param, { transaction });
      if (Number(usage.lhu_dengan_paket_ini || 0) > 0) {
        throw protectedMasterError(
          'Detail parameter baku mutu tidak dapat dihapus karena paket sudah dipakai pada LHU. Nonaktifkan paket lama lalu buat paket/versi baru.',
          usage
        );
      }

      await PktBmPm.destroy({ where: { id_pkt_bm_param }, transaction });
      await PktBmParam.destroy({ where: { id_pkt_bm_param }, transaction });
      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  // ==========================================
  // 5. Tarif Pengambilan (tarif_pengambilan)
  // ==========================================

  static async getAllTarifPengambilan() {
    return await TarifPengambilan.findAll({
      order: [['tarif', 'ASC']]
    });
  }

  static async createTarifPengambilan(data) {
    const count = await TarifPengambilan.count();
    const id = `TP${String(count + 1).padStart(3, '0')}`;
    return await TarifPengambilan.create({
      id_tarif_pengambilan: id,
      keterangan_jarak: data.keterangan_jarak,
      tarif: data.tarif || 0
    });
  }

  static async updateTarifPengambilan(id, data) {
    const tp = await TarifPengambilan.findByPk(id);
    if (!tp) throw new Error('Tarif Pengambilan tidak ditemukan');
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
  }

  static async deleteTarifPengambilan(id) {
    const tp = await TarifPengambilan.findByPk(id);
    if (!tp) throw new Error('Tarif Pengambilan tidak ditemukan');
    await assertUnusedForMasterChange({
      label: 'Tarif pengambilan',
      usageGetter: getTarifPengambilanUsage,
      id,
      operation: 'dihapus',
    });
    await tp.destroy();
    return true;
  }
}

module.exports = AdminParameterService;
