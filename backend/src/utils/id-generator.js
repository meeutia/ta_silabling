const { Op } = require('sequelize');

/**
 * Generate generic ID based on table prefix.
 * Cocok untuk:
 * PGW-001
 * PL-001
 * PNG-0001
 * PD-00001
 * LKA-00001
 */
const generateId = async (
  Model,
  field,
  prefix,
  transaction = null,
  pad = 3
) => {
  const last = await Model.findOne({
    where: {
      [field]: {
        [Op.like]: `${prefix}%`,
      },
    },
    attributes: [field],
    order: [[field, 'DESC']],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  if (!last) {
    return `${prefix}${String(1).padStart(pad, '0')}`;
  }

  const lastId = last.get(field);
  const lastNumber = Number(String(lastId || '').replace(prefix, ''));
  const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;

  return `${prefix}${String(nextNumber).padStart(pad, '0')}`;
};

function getRomanMonth(monthNumber) {
  const romans = [
    'I',
    'II',
    'III',
    'IV',
    'V',
    'VI',
    'VII',
    'VIII',
    'IX',
    'X',
    'XI',
    'XII',
  ];

  return romans[monthNumber - 1] || 'I';
}

function buildMatrixCode(jenisSampel) {
  const name = String(jenisSampel || '').trim().toLowerCase();

  if (name.includes('danau')) return 'DN';
  if (name.includes('sungai')) return 'SG';
  if (name.includes('limbah')) return 'LC';
  if (name.includes('laut')) return 'LT';
  if (name.includes('sumur')) return 'SM';
  if (name.includes('tanah')) return 'TN';
  if (name.includes('air')) return 'AR';

  const words = name
    .replace(/[^a-z0-9\s]/gi, '')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return String(jenisSampel || 'SP')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, 'X');
}

const getLastNoSampelSequenceForYear = async (
  SampelModel,
  year,
  transaction = null
) => {
  const rows = await SampelModel.findAll({
    where: {
      no_sampel: {
        [Op.like]: `%/${year}`,
      },
    },
    attributes: ['no_sampel'],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  let maxSeq = 0;

  rows.forEach((row) => {
    const noSampel = String(row.get('no_sampel') || '');
    const match = noSampel.match(/^(\d+)\//);
    const seq = match ? Number(match[1]) : 0;

    if (Number.isFinite(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  });

  return maxSeq;
};

/**
 * Build nomor sampel.
 * Format:
 * 1/DN/V/2026
 *
 * 1    = nomor urut sampel tahunan
 * DN   = kode matriks / jenis sampel
 * V    = bulan romawi
 * 2026 = tahun
 */
const buildNoSampel = (sequence, jenisSampel, date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const romanMonth = getRomanMonth(month);
  const matrixCode = buildMatrixCode(jenisSampel);

  return `${sequence}/${matrixCode}/${romanMonth}/${year}`;
};

/**
 * Generate nomor sampel berikutnya berdasarkan tahun berjalan.
 */
const generateNoSampel = async (
  SampelModel,
  jenisSampel,
  transaction = null,
  date = new Date()
) => {
  const year = date.getFullYear();

  const lastSeq = await getLastNoSampelSequenceForYear(
    SampelModel,
    year,
    transaction
  );

  const nextSeq = lastSeq + 1;

  return buildNoSampel(nextSeq, jenisSampel, date);
};

/**
 * Generate banyak nomor sampel sekaligus.
 * Dipakai supaya dalam 1 transaksi tidak query berulang-ulang.
 */
const generateNoSampelBatch = async (
  SampelModel,
  items,
  transaction = null,
  date = new Date()
) => {
  const year = date.getFullYear();

  let runningSeq = await getLastNoSampelSequenceForYear(
    SampelModel,
    year,
    transaction
  );

  return items.map((item) => {
    runningSeq += 1;

    return {
      ...item,
      no_sampel: buildNoSampel(runningSeq, item.jenis_sampel, date),
      noSampel: buildNoSampel(runningSeq, item.jenis_sampel, date),
    };
  });
};

/**
 * Generate Nomor LHU.
 * Format:
 * 01/LHU/VI/LAB-2026
 *
 * 01       = nomor urut surat dalam tahun berjalan
 * LHU      = kode dokumen
 * VI       = bulan terbit dalam romawi
 * LAB-2026 = pengujian lab tahun 2026
 */
const generateNomorLhu = async (LhuModel, transaction = null, date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const romanMonth = getRomanMonth(month);

  const startOfYear = new Date(year, 0, 1);
  const startOfNextYear = new Date(year + 1, 0, 1);

  const last = await LhuModel.findOne({
    where: {
      created_at: {
        [Op.gte]: startOfYear,
        [Op.lt]: startOfNextYear,
      },
    },
    attributes: ['nomor_lhu', 'created_at'],
    order: [
      ['created_at', 'DESC'],
      ['nomor_lhu', 'DESC'],
    ],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  let nextSeq = 1;

  if (last?.nomor_lhu) {
    const match = String(last.nomor_lhu).match(/^(\d+)\//);
    const lastSeq = match ? Number(match[1]) : 0;
    nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  }

  return `${String(nextSeq).padStart(2, '0')}/LHU/${romanMonth}/LAB-${year}`;
};

const parseNomorFpplSequence = (nomorFppl) => {
  const match = String(nomorFppl || '').match(/^(\d+)\/FPPL\/LAB\/[IVXLCDM]+\/\d{4}$/i);
  const sequence = match ? Number.parseInt(match[1], 10) : 0;

  return Number.isFinite(sequence) ? sequence : 0;
};

/**
 * Generate Nomor FPPL.
 * Format:
 * 09/FPPL/LAB/V/2026
 *
 * 09    = nomor urut FPPL pada bulan dan tahun penetapan
 * FPPL  = kode dokumen
 * LAB   = kode laboratorium
 * V     = bulan penetapan dalam romawi
 * 2026  = tahun penetapan
 */
const generateNomorFppl = async (
  FpplModel,
  transaction = null,
  date = new Date()
) => {
  const fpplDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(fpplDate.getTime())) {
    throw new Error('Tanggal penetapan FPPL tidak valid.');
  }

  const year = fpplDate.getFullYear();
  const month = fpplDate.getMonth() + 1;
  const romanMonth = getRomanMonth(month);
  const suffix = `/FPPL/LAB/${romanMonth}/${year}`;

  const rows = await FpplModel.findAll({
    where: {
      nomor_fppl: {
        [Op.like]: `%${suffix}`,
      },
    },
    attributes: ['nomor_fppl'],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  const lastSequence = rows.reduce((max, row) => {
    const nomorFppl =
      typeof row.get === 'function'
        ? row.get('nomor_fppl')
        : row.nomor_fppl;

    return Math.max(max, parseNomorFpplSequence(nomorFppl));
  }, 0);

  const nextSequence = lastSequence + 1;

  return `${String(nextSequence).padStart(2, '0')}${suffix}`;
};

module.exports = {
  generateId,
  generateNomorLhu,
  generateNomorFppl,
  getRomanMonth,
  buildMatrixCode,
  buildNoSampel,
  generateNoSampel,
  generateNoSampelBatch,
};