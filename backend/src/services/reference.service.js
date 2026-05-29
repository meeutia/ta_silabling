const {
  JenisSampel,
  TarifPengambilan,
  RegBm,
  PktBm,
  PktBmParam,
  PktBmPm,
  Parameter,
  KategoriParameter,
  ParameterMetode,
  Metode,
  Pegawai,
  User,
  Role,
  sequelize,
} = require('../models/Associations');

const { Op } = require('sequelize');

function plain(row) {
  return row?.toJSON ? row.toJSON() : row;
}

function normalizeIndonesianWhatsAppNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');

  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;

  return digits;
}

function getParameterPayload(rowJson = {}) {
  const parameter = rowJson.parameter || rowJson.Parameter || {};
  const kategori = parameter.kategori || parameter.KategoriParameter || rowJson.kategori || rowJson.KategoriParameter || {};

  return {
    id_parameter: rowJson.id_parameter || parameter.id_parameter || null,
    nama_parameter: parameter.nama_parameter || rowJson.nama_parameter || null,
    kategori_parameter:
      parameter.kategori_parameter ||
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
}

function getParameterMetodePayload(rowJson = {}) {
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
}

function mapPaketMethodRow(row = {}) {
  const metodePayload = getParameterMetodePayload(row);

  return {
    id_pkt_bm_pm: `${row.id_pkt_bm_param || ''}::${row.id_metode_parameter || ''}`,
    id_pkt_bm_param: row.id_pkt_bm_param || null,
    id_metode_parameter: row.id_metode_parameter || metodePayload.id_metode_parameter || null,
    is_default: Number(row.is_default || 0),
    is_active: Number(row.is_active ?? 1),
    ...metodePayload,
  };
}

function mapPaketParameterRow(rowJson = {}) {
  const parameterPayload = getParameterPayload(rowJson);
  const metodeRows = rowJson.pkt_bm_pms || rowJson.PktBmPms || rowJson.pktBmPms || [];
  const methods = metodeRows.map(mapPaketMethodRow);

  let defaultMetode = methods.find((m) => Number(m.is_default) === 1);
  if (!defaultMetode) defaultMetode = methods[0];

  return {
    id_pkt_bm: rowJson.id_pkt_bm || rowJson.pkt_bm?.id_pkt_bm || rowJson.PktBm?.id_pkt_bm || null,
    id_pkt_bm_param: rowJson.id_pkt_bm_param,
    id_parameter: parameterPayload.id_parameter,
    nama_parameter: parameterPayload.nama_parameter,
    kategori_parameter: parameterPayload.kategori_parameter,
    parameter: parameterPayload.parameter,
    nilai_bm: rowJson.nilai_bm,
    satuan_bm: rowJson.satuan_bm,
    ket_bm: rowJson.ket_bm,
    is_in_bm: rowJson.is_in_bm,

    // Compatibility dengan frontend admin dan pelanggan.
    pkt_bm_pms: methods,
    methods,
    id_pkt_bm_pm_default: defaultMetode ? `${defaultMetode.id_pkt_bm_param || ''}::${defaultMetode.id_metode_parameter || ''}` : null,
    id_metode_parameter_default: defaultMetode?.id_metode_parameter || null,
    nama_metode_default: defaultMetode?.nama_metode || null,
    tarif_default: defaultMetode?.tarif ?? null,
  };
}

function mapSampleType(row) {
  const data = plain(row) || {};
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
}

function mapRegBm(row) {
  const data = plain(row) || {};
  const title = [data.instansi, data.ref_reg].filter(Boolean).join(' - ');

  return {
    ...data,
    nama_regulasi: data.ref_reg,
    title: title || data.id_reg_bm,
    label: title || data.ref_reg || data.id_reg_bm,
    value: data.id_reg_bm,
  };
}

function mapPaketBm(row) {
  const data = plain(row) || {};
  const reg = data.reg_bm || data.RegBm || {};
  const jenis = data.jenis_sampel || data.JenisSampel || {};

  return {
    ...data,
    reg_bm: reg,
    jenis_sampel_row: jenis,
    nama_regulasi: reg.ref_reg || null,
    instansi: reg.instansi || data.instansi || null,
    jenis_sampel: jenis.jenis_sampel || data.jenis_sampel || null,
    label: data.nama_pkt || data.teks_lhu || data.id_pkt_bm,
    value: data.id_pkt_bm,
  };
}

function mapPickupTariff(row) {
  const data = plain(row) || {};

  return {
    ...data,
    label: data.keterangan_jarak,
    keterangan: data.keterangan_jarak,
    harga: data.tarif,
    price: data.tarif,
    value: data.id_tarif_pengambilan,
  };
}

const getJenisSampel = async () => {
  const rows = await JenisSampel.findAll({
    order: [['jenis_sampel', 'ASC']],
  });

  return rows.map(mapSampleType);
};

const getPaketBmByJenisSampel = async (id_jenis_sampel) => {
  const rows = await PktBm.findAll({
    where: {
      id_jenis_sampel,
      is_active: 1,
    },
    attributes: ['id_pkt_bm', 'id_jenis_sampel', 'id_reg_bm', 'klasifikasi', 'nama_pkt', 'teks_lhu'],
    include: [
      { model: RegBm, attributes: ['id_reg_bm', 'instansi', 'ref_reg'], where: { is_active: 1 }, required: true },
      { model: JenisSampel, attributes: ['id_jenis_sampel', 'jenis_sampel'], required: false },
    ],
    order: [['nama_pkt', 'ASC']],
  });

  return rows.map(mapPaketBm);
};

const getBmStandards = async (id_jenis_sampel = null) => {
  if (id_jenis_sampel) {
    const paketRows = await PktBm.findAll({
      where: { id_jenis_sampel, is_active: 1 },
      attributes: ['id_reg_bm'],
    });

    const idRegBmList = [...new Set(paketRows.map((r) => r.id_reg_bm).filter(Boolean))];
    if (idRegBmList.length === 0) return [];

    const rows = await RegBm.findAll({
      where: { id_reg_bm: { [Op.in]: idRegBmList }, is_active: 1 },
      attributes: ['id_reg_bm', 'instansi', 'ref_reg'],
      order: [['instansi', 'ASC'], ['id_reg_bm', 'ASC']],
    });

    return rows.map(mapRegBm);
  }

  const rows = await RegBm.findAll({
    where: { is_active: 1 },
    attributes: ['id_reg_bm', 'instansi', 'ref_reg'],
    order: [['instansi', 'ASC'], ['id_reg_bm', 'ASC']],
  });

  return rows.map(mapRegBm);
};

const getTarifPengambilan = async () => {
  const rows = await TarifPengambilan.findAll({
    order: [['id_tarif_pengambilan', 'ASC']],
  });

  return rows.map(mapPickupTariff);
};

const getParameterIdsWithMethods = async (parameterIds = []) => {
  const uniqueIds = [
    ...new Set(
      parameterIds
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    ),
  ];

  if (uniqueIds.length === 0) {
    return new Set();
  }

  const rows = await ParameterMetode.findAll({
    where: {
      id_parameter: {
        [Op.in]: uniqueIds,
      },
    },
    attributes: ['id_parameter'],
    group: ['id_parameter'],
    raw: true,
  });

  return new Set(rows.map((row) => row.id_parameter));
};

const getParameterByPaketBm = async (id_pkt_bm) => {
  if (!id_pkt_bm) {
    throw new Error('id_pkt_bm wajib diisi.');
  }

  const rows = await PktBmParam.findAll({
    where: { id_pkt_bm },
    include: [
      {
        model: PktBmPm,
        required: false,
        include: [
          {
            model: ParameterMetode,
            attributes: [
              'id_metode_parameter',
              'id_parameter',
              'id_metode',
              'tarif',
              'acuan_metode',
              'is_terakreditasi',
              'is_subkontrak',
            ],
            include: [{ model: Metode, attributes: ['id_metode', 'nama_metode'], required: false }],
          },
        ],
      },
      {
        model: Parameter,
        attributes: ['id_parameter', 'id_kategori_parameter', 'nama_parameter'],
        include: [{ model: KategoriParameter, as: 'kategori', attributes: ['id_kategori_parameter', 'nama_kategori'], required: false }],
      },
    ],
    order: [[Parameter, 'nama_parameter', 'ASC']],
  });

  if (rows.length === 0) return [];

  const parameterIds = rows.map((row) => row.id_parameter).filter(Boolean);
  const parameterIdsWithMethods = await getParameterIdsWithMethods(parameterIds);

  return rows
    .filter((row) => parameterIdsWithMethods.has(row.id_parameter))
    .map((row) => mapPaketParameterRow(row.toJSON()));
};

const getPaketBm = async () => {
  const rows = await PktBm.findAll({
    where: { is_active: 1 },
    attributes: ['id_pkt_bm', 'id_jenis_sampel', 'id_reg_bm', 'klasifikasi', 'nama_pkt', 'teks_lhu'],
    include: [
      { model: RegBm, attributes: ['id_reg_bm', 'instansi', 'ref_reg'], where: { is_active: 1 }, required: true },
      { model: JenisSampel, attributes: ['id_jenis_sampel', 'jenis_sampel'], required: false },
    ],
    order: [['id_jenis_sampel', 'ASC'], ['nama_pkt', 'ASC']],
  });

  return rows.map(mapPaketBm);
};

const getParameterByJenisSampel = async (id_jenis_sampel, id_pkt_bm, id_reg_bm) => {
  if (!id_jenis_sampel) {
    throw new Error('id_jenis_sampel wajib diisi.');
  }

  if (id_pkt_bm) {
    const paket = await PktBm.findOne({
      where: { id_pkt_bm, id_jenis_sampel, is_active: 1 },
      include: [{ model: RegBm, where: { is_active: 1 }, required: true }],
    });

    if (!paket) {
      throw new Error('Paket baku mutu tidak valid untuk jenis sampel yang dipilih.');
    }

    return getParameterByPaketBm(id_pkt_bm);
  }

  if (!id_reg_bm) return [];

  const paketRows = await PktBm.findAll({
    where: { id_jenis_sampel, id_reg_bm, is_active: 1 },
    include: [{ model: RegBm, where: { is_active: 1 }, required: true }],
    attributes: ['id_pkt_bm'],
  });

  if (paketRows.length === 0) return [];

  const paketIds = paketRows.map((row) => row.id_pkt_bm);

  const rows = await PktBmParam.findAll({
    where: { id_pkt_bm: { [Op.in]: paketIds } },
    include: [
      {
        model: PktBm,
        attributes: ['id_pkt_bm', 'id_reg_bm', 'id_jenis_sampel', 'nama_pkt', 'klasifikasi'],
      },
      {
        model: PktBmPm,
        required: false,
        include: [
          {
            model: ParameterMetode,
            attributes: [
              'id_metode_parameter',
              'id_parameter',
              'id_metode',
              'tarif',
              'acuan_metode',
              'is_terakreditasi',
              'is_subkontrak',
            ],
            include: [{ model: Metode, attributes: ['id_metode', 'nama_metode'], required: false }],
          },
        ],
      },
      {
        model: Parameter,
        attributes: ['id_parameter', 'id_kategori_parameter', 'nama_parameter'],
        include: [{ model: KategoriParameter, as: 'kategori', attributes: ['id_kategori_parameter', 'nama_kategori'], required: false }],
      },
    ],
    order: [[Parameter, 'nama_parameter', 'ASC']],
  });

  if (rows.length === 0) return [];

  const parameterIds = rows.map((row) => row.id_parameter).filter(Boolean);
  const parameterIdsWithMethods = await getParameterIdsWithMethods(parameterIds);
  const uniqueByParameter = new Map();

  for (const row of rows) {
    const rowJson = row.toJSON();
    const parameterId = rowJson.id_parameter;

    if (!parameterIdsWithMethods.has(parameterId)) continue;
    if (uniqueByParameter.has(parameterId)) continue;

    uniqueByParameter.set(parameterId, mapPaketParameterRow(rowJson));
  }

  return Array.from(uniqueByParameter.values()).sort((a, b) =>
    String(a.nama_parameter || '').localeCompare(String(b.nama_parameter || ''))
  );
};

const getParameter = async () => {
  return await ParameterMetode.findAll({
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

const getParameterTariffs = async () => {
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
    };
  });
};

const getHariLibur = async () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error('API_KEY belum dikonfigurasi.');

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
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Timeout menghubungi Google Calendar API. Silakan coba lagi.');
    }
    throw error;
  }

  return holidays;
};


const getAdminContact = async () => {
  const adminRole = await Role.findOne({
    where: sequelize.where(
      sequelize.fn('LOWER', sequelize.col('nama_role')),
      'admin'
    ),
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
            sequelize.where(
              sequelize.fn('TRIM', sequelize.col('pegawai.no_wa')),
              { [Op.ne]: '' }
            ),
          ],
        },
      },
    ],
    order: [[Pegawai, 'nama_pegawai', 'ASC']],
  });

  const userJson = plain(adminUser) || null;
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

  const whatsappNumber = normalizeIndonesianWhatsAppNumber(pegawai.no_wa);

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

const getPccPegawai = async () => {
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

module.exports = {
  getJenisSampel,
  getBmStandards,
  getPaketBm,
  getPaketBmByJenisSampel,
  getParameter,
  getParameterTariffs,
  getTarifPengambilan,
  getParameterByPaketBm,
  getParameterByJenisSampel,
  getHariLibur,
  getAdminContact,
  getPccPegawai,
};
