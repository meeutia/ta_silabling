const sequelize = require('../config/database');

const Role = require('./Role');
const User = require('./User');
const Pelanggan = require('./Pelanggan');
const Pegawai = require('./Pegawai');
const TarifPengambilan = require('./TarifPengambilan');
const Fppl = require('./Fppl');
const JadwalSampel = require('./JadwalSampel');
const JenisSampel = require('./JenisSampel');
const FpplSampel = require('./FpplSampel');
const KategoriParameter = require('./KategoriParameter');
const Parameter = require('./Parameter');
const Metode = require('./Metode');
const ParameterMetode = require('./ParameterMetode');
const FpplParameterMetode = require('./FpplParameterMetode');
const RegBm = require('./RegBm');
const PktBm = require('./PktBm');
const Klasifikasi = require('./Klasifikasi');
const PktBmKelompok = require('./PktBmKelompok');
const PktBmParam = require('./PktBmParam');
const Satuan = require('./Satuan');
const PktBmNilai = require('./PktBmNilai');
const Sampel = require('./Sampel');
const SampelParameter = require('./SampelParameter');
const Penugasan = require('./Penugasan');
const PenugasanDetail = require('./PenugasanDetail');
const PenugasanItem = require('./PenugasanItem');
const Lka = require('./Lka');
const LkaHasil = require('./LkaHasil');
const LkaRevisi = require('./LkaRevisi');
const Lhu = require('./Lhu');
const Invoice = require('./Invoice');
const InvoiceItem = require('./InvoiceItem');
const Payment = require('./Payment');
const JadwalPengambilanLhu = require('./JadwalPengambilanLhu');
const PengajuanPerubahanJadwal = require('./PengajuanPerubahanJadwal');
const NotifikasiEmail = require('./NotifikasiEmail');
const AktivitasSistemLog = require('./AktivitasSistemLog');

const models = { Role, User, Pelanggan, Pegawai, TarifPengambilan, Fppl, JadwalSampel, JenisSampel, FpplSampel, KategoriParameter, Parameter, Metode, ParameterMetode, FpplParameterMetode, RegBm, PktBm, Klasifikasi, PktBmKelompok, PktBmParam, Satuan, PktBmNilai, Sampel, SampelParameter, Penugasan, PenugasanDetail, PenugasanItem, Lka, LkaHasil, LkaRevisi, Lhu, Invoice, InvoiceItem, Payment, JadwalPengambilanLhu, PengajuanPerubahanJadwal, NotifikasiEmail, AktivitasSistemLog };

Object.values(models).forEach((model) => {
  if (model && typeof model.associate === 'function') {
    model.associate(models);
  }
});

module.exports = { sequelize, Role, User, Pelanggan, Pegawai, TarifPengambilan, Fppl, JadwalSampel, JenisSampel, FpplSampel, KategoriParameter, Parameter, Metode, ParameterMetode, FpplParameterMetode, RegBm, PktBm, Klasifikasi, PktBmKelompok, PktBmParam, Satuan, PktBmNilai, Sampel, SampelParameter, Penugasan, PenugasanDetail, PenugasanItem, Lka, LkaHasil, LkaRevisi, Lhu, Invoice, InvoiceItem, Payment, JadwalPengambilanLhu, PengajuanPerubahanJadwal, NotifikasiEmail, AktivitasSistemLog };
