const { JenisSampel, TarifPengambilan, RegBm, PktBm, PktBmKelompok, PktBmParam, PktBmNilai, Parameter, KategoriParameter, ParameterMetode, Metode, Pegawai, User, Role, sequelize, } = require('../models/Associations');
const { withPaketBmDisplayFields } = require('../utils/bm-format.util');
const { Op } = require('sequelize');
class ReferenceService {
plain = (row) => {
        return row?.toJSON ? row.toJSON() : row;
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
    getParameterPayload = (rowJson = {}) => {
        const parameter = rowJson.parameter || rowJson.Parameter || {};
        const kategori = parameter.kategori || parameter.KategoriParameter || rowJson.kategori || rowJson.KategoriParameter || {};
        return {
            id_parameter: rowJson.id_parameter || parameter.id_parameter || null,
            nama_parameter: parameter.nama_parameter || rowJson.nama_parameter || null,
            kategori_parameter: parameter.kategori_parameter ||
                kategori.nama_kategori ||
                rowJson.kategori_parameter ||
                rowJson.nama_kategori ||
                null,
            parameter: {
                ...parameter,
                kategori_parameter: parameter.kategori_parameter || kategori.nama_kategori || null,
                nama_kategori: parameter.nama_kategori || kategori.nama_kategori || null,
            },
        };
    };
    getParameterMetodePayload = (rowJson = {}) => {
        const parameterMetode = rowJson.parameter_metode || rowJson.ParameterMetode || rowJson.parameterMetode || {};
        const metode = parameterMetode.metode || parameterMetode.Metode || rowJson.metode || rowJson.Metode || {};
        return {
            id_metode_parameter: parameterMetode.id_metode_parameter || rowJson.id_metode_parameter || null,
            id_metode: parameterMetode.id_metode || rowJson.id_metode || metode.id_metode || null,
            nama_metode: metode.nama_metode || rowJson.nama_metode || null,
            tarif: parameterMetode.tarif ?? rowJson.tarif ?? null,
            acuan_metode: parameterMetode.acuan_metode || rowJson.acuan_metode || null,
            is_terakreditasi: parameterMetode.is_terakreditasi ?? rowJson.is_terakreditasi ?? null,
            is_subkontrak: parameterMetode.is_subkontrak ?? rowJson.is_subkontrak ?? null,
            metode,
            parameter_metode: parameterMetode,
        };
    };
    mapPaketParameterRow = (rowJson = {}) => {
        const parameterPayload = this.getParameterPayload(rowJson);
        return {
            id_pkt_bm: rowJson.id_pkt_bm || rowJson.pkt_bm?.id_pkt_bm || rowJson.PktBm?.id_pkt_bm || null,
            id_parameter: parameterPayload.id_parameter,
            nama_parameter: parameterPayload.nama_parameter,
            kategori_parameter: parameterPayload.kategori_parameter,
            parameter: parameterPayload.parameter,
            nilai_bm: rowJson.nilai_bm,
            satuan_bm: rowJson.satuan_bm,
            ket_bm: rowJson.ket_bm,
        };
    };
    mapSampleType = (row) => {
        const data = this.plain(row) || {};
        const name = data.jenis_sampel || data.nama_jenis_sampel || data.nama || '';
        return {
            ...data,
            id_jenis_sampel: data.id_jenis_sampel,
            jenis_sampel: name,
            nama_jenis_sampel: name,
            nama: name,
            name,
            label: name,
            value: data.id_jenis_sampel,
        };
    };
    mapRegBm = (row) => {
        const data = this.plain(row) || {};
        const title = [data.instansi, data.ref_reg].filter(Boolean).join(' - ');
        return {
            ...data,
            nama_regulasi: data.ref_reg,
            title: title || data.id_reg_bm,
            label: title || data.ref_reg || data.id_reg_bm,
            value: data.id_reg_bm,
        };
    };
    mapPaketBm = (row) => {
        const data = withPaketBmDisplayFields(this.plain(row) || {});
        const reg = data.reg_bm || data.RegBm || {};
        const jenis = data.jenis_sampel || data.JenisSampel || {};
        return {
            ...data,
            reg_bm: reg,
            jenis_sampel_row: jenis,
            nama_regulasi: reg.ref_reg || null,
            instansi: reg.instansi || data.instansi || null,
            jenis_sampel: jenis.jenis_sampel || data.jenis_sampel || null,
            label: data.nama_pkt || data.id_pkt_bm,
            value: data.id_pkt_bm,
        };
    };
    mapPickupTariff = (row) => {
        const data = this.plain(row) || {};
        return {
            ...data,
            label: data.keterangan_jarak,
            keterangan: data.keterangan_jarak,
            harga: data.tarif,
            price: data.tarif,
            value: data.id_tarif_pengambilan,
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
    getJenisSampel = async () => {
        const rows = await JenisSampel.findAll({
            order: [['jenis_sampel', 'ASC']],
        });
        return rows.map(this.mapSampleType);
    };
    getPaketBmByJenisSampel = async (id_jenis_sampel) => {
        const idRegBmList = await this.getActiveGroupRegIdsByJenisSampel(id_jenis_sampel);
        if (idRegBmList.length === 0)
            return [];
        const rows = await PktBm.findAll({
            where: {
                id_jenis_sampel,
                id_reg_bm: { [Op.in]: idRegBmList },
            },
            attributes: ['id_pkt_bm', 'id_jenis_sampel', 'id_reg_bm', 'klasifikasi'],
            include: [
                { model: RegBm, attributes: ['id_reg_bm', 'instansi', 'ref_reg'], where: { is_active: 1 }, required: true },
                { model: JenisSampel, attributes: ['id_jenis_sampel', 'jenis_sampel'], required: false },
            ],
            order: [['klasifikasi', 'ASC'], ['id_pkt_bm', 'ASC']],
        });
        return rows.map(this.mapPaketBm);
    };
    getBmStandards = async (id_jenis_sampel = null) => {
        if (id_jenis_sampel) {
            const idRegBmList = await this.getActiveGroupRegIdsByJenisSampel(id_jenis_sampel);
            if (idRegBmList.length === 0)
                return [];
            const rows = await RegBm.findAll({
                where: { id_reg_bm: { [Op.in]: idRegBmList }, is_active: 1 },
                attributes: ['id_reg_bm', 'instansi', 'ref_reg'],
                order: [['instansi', 'ASC'], ['id_reg_bm', 'ASC']],
            });
            return rows.map(this.mapRegBm);
        }
        const kelompokRows = await PktBmKelompok.findAll({
            where: { is_active: 1 },
            attributes: ['id_reg_bm'],
        });
        const idRegBmList = [...new Set(kelompokRows.map((row) => row.id_reg_bm).filter(Boolean))];
        if (idRegBmList.length === 0)
            return [];
        const rows = await RegBm.findAll({
            where: { id_reg_bm: { [Op.in]: idRegBmList }, is_active: 1 },
            attributes: ['id_reg_bm', 'instansi', 'ref_reg'],
            order: [['instansi', 'ASC'], ['id_reg_bm', 'ASC']],
        });
        return rows.map(this.mapRegBm);
    };
    getTarifPengambilan = async () => {
        const rows = await TarifPengambilan.findAll({
            order: [['id_tarif_pengambilan', 'ASC']],
        });
        return rows.map(this.mapPickupTariff);
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
    getParameterByPaketBm = async (id_pkt_bm) => {
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
        });
        const metaMap = new Map(metaRows.map((row) => [String(row.id_parameter), row.toJSON ? row.toJSON() : row]));
        return nilaiRows
            .filter((row) => activeMethodParameterIds.has(String(row.id_parameter)) || activeMethodParameterIds.has(row.id_parameter))
            .map((row) => {
                const nilai = row.toJSON ? row.toJSON() : row;
                const meta = metaMap.get(String(nilai.id_parameter)) || {};
                const parameter = nilai.parameter || nilai.Parameter || meta.parameter || meta.Parameter || {};
                return this.mapPaketParameterRow({
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
    getPaketBm = async () => {
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
            attributes: ['id_pkt_bm', 'id_jenis_sampel', 'id_reg_bm', 'klasifikasi'],
            include: [
                { model: RegBm, attributes: ['id_reg_bm', 'instansi', 'ref_reg'], where: { is_active: 1 }, required: true },
                { model: JenisSampel, attributes: ['id_jenis_sampel', 'jenis_sampel'], required: false },
            ],
            order: [['id_jenis_sampel', 'ASC'], ['klasifikasi', 'ASC'], ['id_pkt_bm', 'ASC']],
        });
        return rows.map(this.mapPaketBm);
    };
    getParameterByJenisSampel = async (id_jenis_sampel, id_pkt_bm, id_reg_bm) => {
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
            return this.getParameterByPaketBm(id_pkt_bm);
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
            }],
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
            .map((row) => this.mapPaketParameterRow(row.toJSON ? row.toJSON() : row));
    };
    getParameter = async () => {
        return await ParameterMetode.findAll({
            where: { is_active: 1 },
            include: [
                {
                    model: Parameter,
                    attributes: ['id_parameter', 'id_kategori_parameter', 'nama_parameter'],
                    include: [{ model: KategoriParameter, as: 'kategori', attributes: ['id_kategori_parameter', 'nama_kategori'], required: false }],
                },
            ],
            order: [[Parameter, 'nama_parameter', 'ASC']],
        });
    };
    getParameterTariffs = async () => {
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
            return {
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
            };
        });
    };
    getHariLibur = async () => {
        const apiKey = process.env.API_KEY;
        if (!apiKey)
            throw new Error('API_KEY belum dikonfigurasi.');
        const calendarId = 'id.indonesian%23holiday%40group.v.calendar.google.com';
        const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&maxResults=2500`;
        let url = baseUrl;
        const holidays = [];
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            while (url) {
                const response = await fetch(url, { signal: controller.signal });
                if (!response.ok) {
                    throw new Error(`Google Calendar API error: ${response.status}`);
                }
                const data = await response.json();
                (data.items || []).forEach((item) => {
                    const date = item.start?.date;
                    if (date) {
                        holidays.push({ date, nama: item.summary || 'Hari libur nasional' });
                    }
                });
                url = data.nextPageToken ? `${baseUrl}&pageToken=${data.nextPageToken}` : null;
            }
            clearTimeout(timeoutId);
        }
        catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Timeout menghubungi Google Calendar API. Silakan coba lagi.');
            }
            throw error;
        }
        return holidays;
    };
    getAdminContact = async () => {
        const adminRole = await Role.findOne({
            where: sequelize.where(sequelize.fn('LOWER', sequelize.col('nama_role')), 'admin'),
        });
        if (!adminRole) {
            return {
                found: false,
                id_pegawai: null,
                nama_pegawai: null,
                no_wa: null,
                whatsapp_number: null,
                whatsapp_url: null,
            };
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
        const userJson = this.plain(adminUser) || null;
        const pegawai = userJson?.pegawai || userJson?.Pegawai || null;
        if (!adminUser || !pegawai) {
            return {
                found: false,
                id_pegawai: null,
                nama_pegawai: null,
                no_wa: null,
                whatsapp_number: null,
                whatsapp_url: null,
            };
        }
        const whatsappNumber = this.normalizeIndonesianWhatsAppNumber(pegawai.no_wa);
        return {
            found: Boolean(whatsappNumber),
            id_pegawai: pegawai.id_pegawai,
            nama_pegawai: pegawai.nama_pegawai,
            no_wa: pegawai.no_wa,
            nik: userJson.nik,
            email: userJson.email,
            whatsapp_number: whatsappNumber || null,
            whatsapp_url: whatsappNumber ? `https://wa.me/${whatsappNumber}` : null,
        };
    };
    getPccPegawai = async () => {
        const rows = await Pegawai.findAll({
            where: { is_pcc: 1 },
            order: [['nama_pegawai', 'ASC']],
        });
        return rows.map((row) => ({
            id_pegawai: row.id_pegawai,
            nama_pegawai: row.nama_pegawai,
            no_wa: row.no_wa,
            is_pcc: Boolean(row.is_pcc),
        }));
    };
}
module.exports = new ReferenceService();
module.exports.ReferenceService = ReferenceService;
