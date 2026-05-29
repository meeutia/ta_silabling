const {
  TipeNotifikasi,
  NotifikasiEmail,
  Pelanggan,
  User,
} = require('../../models/Associations');

const {
  NOTIFICATION_TYPE_DEFINITIONS,
  STATUS_PENGIRIMAN_EMAIL,
} = require('../../constants/notification.constant');

const { generateId } = require('../../utils/id-generator');
const mailer = require('../../utils/mailer');
const { safeString } = require('./notification-format.util');

function getPlain(instance) {
  if (!instance) return null;
  if (typeof instance.get === 'function') return instance.get({ plain: true });
  return instance;
}

function pickObject(source = {}, keys = []) {
  if (!source || typeof source !== 'object') return {};

  for (const key of keys) {
    const value = source[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  }

  return {};
}

function pickArray(source = {}, keys = []) {
  if (!source || typeof source !== 'object') return [];

  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return [value];
  }

  return [];
}

function toDateOnly(value) {
  const date = value ? new Date(value) : new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(value, days) {
  const date = value ? new Date(value) : new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfTomorrow() {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
}

async function findNotificationTypeById(idTipeNotifikasi) {
  const id = safeString(idTipeNotifikasi).trim();

  if (!id) {
    const err = new Error('ID tipe notifikasi wajib diisi.');
    err.statusCode = 400;
    throw err;
  }

  const existing = await TipeNotifikasi.findOne({
    where: { id_tipe_notifikasi: id },
  });

  if (existing) return existing;

  const definition = (NOTIFICATION_TYPE_DEFINITIONS || []).find((item) => item.id === id);

  if (definition) {
    return TipeNotifikasi.create({
      id_tipe_notifikasi: definition.id,
      deskripsi: definition.deskripsi,
      konteks: definition.konteks,
    });
  }

  const err = new Error(`Tipe notifikasi ${id} tidak ditemukan.`);
  err.statusCode = 404;
  throw err;
}

async function findOrCreateNotificationTypeById(idTipeNotifikasi, defaults = {}) {
  const id = safeString(idTipeNotifikasi).trim();

  if (!id) {
    const err = new Error('ID tipe notifikasi wajib diisi.');
    err.statusCode = 400;
    throw err;
  }

  const existing = await TipeNotifikasi.findOne({
    where: { id_tipe_notifikasi: id },
  });

  if (existing) return existing;

  const definition = (NOTIFICATION_TYPE_DEFINITIONS || []).find((item) => item.id === id);

  return TipeNotifikasi.create({
    id_tipe_notifikasi: id,
    deskripsi: defaults.deskripsi || definition?.deskripsi || `Notifikasi ${id}`,
    konteks: defaults.konteks || definition?.konteks || 'UMUM',
  });
}

async function createEmailLog({
  idTipeNotifikasi,
  penerimaUserNik = null,
  penerimaPelangganId = null,
  idRegistrasi = null,
  idJadwalLhu = null,
  nomorLhu = null,
  idPenugasan = null,
}) {
  const id = await generateId(
    NotifikasiEmail,
    'id_notifikasi_email',
    'NE',
    null,
    8
  );

  return NotifikasiEmail.create({
    id_notifikasi_email: id,
    id_tipe_notifikasi: idTipeNotifikasi,
    penerima_user_nik: penerimaUserNik,
    penerima_pelanggan_id: penerimaPelangganId,
    id_registrasi: idRegistrasi,
    id_jadwal_lhu: idJadwalLhu,
    nomor_lhu: nomorLhu,
    id_penugasan: idPenugasan,
    status_pengiriman: STATUS_PENGIRIMAN_EMAIL.MENUNGGU,
    pesan_error: null,
    dikirim_pada: null,
    dibuat_pada: new Date(),
    diperbarui_pada: new Date(),
  });
}

async function resolveRecipientEmail({ penerimaUserNik, penerimaPelangganId }) {
  if (penerimaUserNik) {
    const user = await User.findOne({ where: { nik: penerimaUserNik } });
    const email = user?.get('email');

    if (!email) {
      const err = new Error('Email penerima user tidak ditemukan.');
      err.statusCode = 400;
      throw err;
    }

    return email;
  }

  if (penerimaPelangganId) {
    const pelanggan = await Pelanggan.findOne({
      where: { id_pelanggan: penerimaPelangganId },
    });

    if (!pelanggan) {
      const err = new Error('Data pelanggan penerima tidak ditemukan.');
      err.statusCode = 400;
      throw err;
    }

    const pelangganEmail = pelanggan.get('email_kontak');
    const nik = pelanggan.get('nik');
    const user = nik ? await User.findOne({ where: { nik } }) : null;
    const userEmail = user?.get('email');
    const email = pelangganEmail || userEmail;

    if (!email) {
      const err = new Error('Email penerima tidak ditemukan pada pelanggan.email_kontak atau user.email.');
      err.statusCode = 400;
      throw err;
    }

    return email;
  }

  const err = new Error('Penerima notifikasi belum ditentukan.');
  err.statusCode = 400;
  throw err;
}

async function sendNotificationEmail({ to, subject, body, html = null }) {
  const text = safeString(body);
  const fallbackHtml = text
    .split('\n')
    .map((line) =>
      line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    )
    .join('<br/>');

  await mailer.sendMail({
    to,
    subject,
    text,
    html: html || fallbackHtml,
  });
}

async function markEmailSent(log) {
  await log.update({
    status_pengiriman: STATUS_PENGIRIMAN_EMAIL.TERKIRIM,
    pesan_error: null,
    dikirim_pada: new Date(),
    diperbarui_pada: new Date(),
  });

  return getPlain(log);
}

async function markEmailFailed(log, error) {
  await log.update({
    status_pengiriman: STATUS_PENGIRIMAN_EMAIL.GAGAL,
    pesan_error:
      safeString(error?.message).slice(0, 2000) ||
      'Gagal mengirim email.',
    dikirim_pada: null,
    diperbarui_pada: new Date(),
  });

  return getPlain(log);
}

module.exports = {
  addDays,
  createEmailLog,
  findNotificationTypeById,
  findOrCreateNotificationTypeById,
  getPlain,
  markEmailFailed,
  markEmailSent,
  pickArray,
  pickObject,
  resolveRecipientEmail,
  sendNotificationEmail,
  startOfToday,
  startOfTomorrow,
  toDateOnly,
};
