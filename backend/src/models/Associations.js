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
const PktBmKelompok = require('./PktBmKelompok');
const PktBmParam = require('./PktBmParam');
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

// AUTH, USER, PEGAWAI, PELANGGAN
Role.hasMany(User, { foreignKey: 'id_role' });
User.belongsTo(Role, { foreignKey: 'id_role' });
User.hasOne(Pegawai, { foreignKey: 'nik' });
Pegawai.belongsTo(User, { foreignKey: 'nik' });
User.hasMany(Pelanggan, { foreignKey: 'nik' });
Pelanggan.belongsTo(User, { foreignKey: 'nik' });

// PELANGGAN, FPPL, SAMPEL
Pelanggan.hasMany(Fppl, { foreignKey: 'id_pelanggan', as: 'permintaan' });
Fppl.belongsTo(Pelanggan, { foreignKey: 'id_pelanggan', as: 'pelanggan' });
TarifPengambilan.hasMany(Fppl, { foreignKey: 'id_tarif_pengambilan' });
Fppl.belongsTo(TarifPengambilan, { foreignKey: 'id_tarif_pengambilan' });
Fppl.hasMany(JadwalSampel, { foreignKey: 'id_registrasi', as: 'jadwal_sampels' });
JadwalSampel.belongsTo(Fppl, { foreignKey: 'id_registrasi' });
Pegawai.hasMany(JadwalSampel, { foreignKey: 'id_pegawai_pcc', as: 'jadwal_pcc' });
JadwalSampel.belongsTo(Pegawai, { foreignKey: 'id_pegawai_pcc', as: 'pegawai_pcc' });
Fppl.hasMany(FpplSampel, { foreignKey: 'id_registrasi', as: 'fppl_sampels' });
FpplSampel.belongsTo(Fppl, { foreignKey: 'id_registrasi', as: 'fppl' });
JenisSampel.hasMany(FpplSampel, { foreignKey: 'id_jenis_sampel' });
FpplSampel.belongsTo(JenisSampel, { foreignKey: 'id_jenis_sampel' });
RegBm.hasMany(FpplSampel, { foreignKey: 'id_reg_bm' });
FpplSampel.belongsTo(RegBm, { foreignKey: 'id_reg_bm' });
FpplSampel.hasMany(Sampel, { foreignKey: 'id_registrasi', sourceKey: 'id_registrasi', as: 'sampels', constraints: false });
Sampel.belongsTo(FpplSampel, { foreignKey: 'id_registrasi', targetKey: 'id_registrasi', as: 'fppl_sampel', constraints: false });
Fppl.hasMany(Sampel, { foreignKey: 'id_registrasi', sourceKey: 'id_registrasi', as: 'sampels_direct' });
Sampel.belongsTo(Fppl, { foreignKey: 'id_registrasi', targetKey: 'id_registrasi', as: 'fppl' });
JenisSampel.hasMany(Sampel, { foreignKey: 'id_jenis_sampel', as: 'sampel_rows' });
Sampel.belongsTo(JenisSampel, { foreignKey: 'id_jenis_sampel', as: 'jenis_sampel' });
RegBm.hasMany(Sampel, { foreignKey: 'id_reg_bm', as: 'sampel_rows' });
Sampel.belongsTo(RegBm, { foreignKey: 'id_reg_bm', as: 'reg_bm' });
User.hasMany(Sampel, { foreignKey: 'diterima_oleh', as: 'SampelDiterima' });
Sampel.belongsTo(User, { foreignKey: 'diterima_oleh', as: 'PenerimaSampel' });

// PARAMETER, METODE, BAKU MUTU
RegBm.hasMany(PktBmKelompok, { foreignKey: 'id_reg_bm' });
PktBmKelompok.belongsTo(RegBm, { foreignKey: 'id_reg_bm' });
JenisSampel.hasMany(PktBmKelompok, { foreignKey: 'id_jenis_sampel' });
PktBmKelompok.belongsTo(JenisSampel, { foreignKey: 'id_jenis_sampel' });
RegBm.hasMany(PktBm, { foreignKey: 'id_reg_bm' });
PktBm.belongsTo(RegBm, { foreignKey: 'id_reg_bm' });
JenisSampel.hasMany(PktBm, { foreignKey: 'id_jenis_sampel' });
PktBm.belongsTo(JenisSampel, { foreignKey: 'id_jenis_sampel' });
RegBm.hasMany(PktBmParam, { foreignKey: 'id_reg_bm' });
PktBmParam.belongsTo(RegBm, { foreignKey: 'id_reg_bm' });
JenisSampel.hasMany(PktBmParam, { foreignKey: 'id_jenis_sampel' });
PktBmParam.belongsTo(JenisSampel, { foreignKey: 'id_jenis_sampel' });
Parameter.hasMany(PktBmParam, { foreignKey: 'id_parameter' });
PktBmParam.belongsTo(Parameter, { foreignKey: 'id_parameter' });
PktBm.hasMany(PktBmNilai, { foreignKey: 'id_pkt_bm' });
PktBmNilai.belongsTo(PktBm, { foreignKey: 'id_pkt_bm' });
Parameter.hasMany(PktBmNilai, { foreignKey: 'id_parameter' });
PktBmNilai.belongsTo(Parameter, { foreignKey: 'id_parameter' });
KategoriParameter.hasMany(Parameter, { foreignKey: 'id_kategori_parameter', as: 'parameters' });
Parameter.belongsTo(KategoriParameter, { foreignKey: 'id_kategori_parameter', as: 'kategori' });
Parameter.hasMany(ParameterMetode, { foreignKey: 'id_parameter' });
ParameterMetode.belongsTo(Parameter, { foreignKey: 'id_parameter' });
Metode.hasMany(ParameterMetode, { foreignKey: 'id_metode' });
ParameterMetode.belongsTo(Metode, { foreignKey: 'id_metode' });
FpplSampel.hasMany(FpplParameterMetode, { foreignKey: 'id_registrasi', sourceKey: 'id_registrasi', constraints: false });
FpplParameterMetode.belongsTo(FpplSampel, { foreignKey: 'id_registrasi', targetKey: 'id_registrasi', constraints: false });
Fppl.hasMany(FpplParameterMetode, { foreignKey: 'id_registrasi', sourceKey: 'id_registrasi', as: 'fppl_parameter_metodes_direct' });
FpplParameterMetode.belongsTo(Fppl, { foreignKey: 'id_registrasi', targetKey: 'id_registrasi', as: 'fppl' });
JenisSampel.hasMany(FpplParameterMetode, { foreignKey: 'id_jenis_sampel', as: 'fppl_parameter_metodes' });
FpplParameterMetode.belongsTo(JenisSampel, { foreignKey: 'id_jenis_sampel', as: 'jenis_sampel' });
RegBm.hasMany(FpplParameterMetode, { foreignKey: 'id_reg_bm', as: 'fppl_parameter_metodes' });
FpplParameterMetode.belongsTo(RegBm, { foreignKey: 'id_reg_bm', as: 'reg_bm' });
Parameter.hasMany(FpplParameterMetode, { foreignKey: 'id_parameter' });
FpplParameterMetode.belongsTo(Parameter, { foreignKey: 'id_parameter' });
ParameterMetode.hasMany(FpplParameterMetode, { foreignKey: 'id_metode_parameter' });
FpplParameterMetode.belongsTo(ParameterMetode, { foreignKey: 'id_metode_parameter' });
User.hasMany(FpplParameterMetode, { foreignKey: 'dipilih_oleh', as: 'PilihFpplParameterMetode' });
FpplParameterMetode.belongsTo(User, { foreignKey: 'dipilih_oleh', as: 'PemilihUser' });

// SAMPEL PARAMETER
Sampel.hasMany(SampelParameter, { foreignKey: 'no_sampel', as: 'sampel_parameters' });
SampelParameter.belongsTo(Sampel, { foreignKey: 'no_sampel', as: 'sampel' });
FpplParameterMetode.hasMany(SampelParameter, { foreignKey: 'id_fppl_parameter_metode', as: 'sampel_parameters' });
SampelParameter.belongsTo(FpplParameterMetode, { foreignKey: 'id_fppl_parameter_metode', as: 'fppl_parameter_metode' });
Sampel.belongsToMany(FpplParameterMetode, { through: SampelParameter, foreignKey: 'no_sampel', otherKey: 'id_fppl_parameter_metode', as: 'parameter_metodes' });
FpplParameterMetode.belongsToMany(Sampel, { through: SampelParameter, foreignKey: 'id_fppl_parameter_metode', otherKey: 'no_sampel', as: 'sampels' });

// PENUGASAN DAN LKA

ParameterMetode.hasMany(PenugasanDetail, {foreignKey: 'id_metode_parameter',});
PenugasanDetail.belongsTo(ParameterMetode, {foreignKey: 'id_metode_parameter',});
Penugasan.hasMany(PenugasanDetail, { foreignKey: 'id_penugasan' });
PenugasanDetail.belongsTo(Penugasan, { foreignKey: 'id_penugasan' });
User.hasMany(Penugasan, { foreignKey: 'id_user_analis', as: 'PenugasanAnalis' });
Penugasan.belongsTo(User, { foreignKey: 'id_user_analis', as: 'Analis' });
Sampel.hasMany(PenugasanItem, { foreignKey: 'no_sampel', as: 'penugasan_items' });
PenugasanItem.belongsTo(Sampel, { foreignKey: 'no_sampel' });
PenugasanDetail.hasMany(PenugasanItem, { foreignKey: 'id_penugasan_detail' });
PenugasanItem.belongsTo(PenugasanDetail, { foreignKey: 'id_penugasan_detail' });
PenugasanDetail.hasOne(Lka, { foreignKey: 'id_penugasan_detail' });
Lka.belongsTo(PenugasanDetail, { foreignKey: 'id_penugasan_detail' });
User.hasMany(Lka, { foreignKey: 'dilaporkan_oleh', as: 'LkaDilaporkan' });
Lka.belongsTo(User, { foreignKey: 'dilaporkan_oleh', as: 'Pelapor' });
User.hasMany(Lka, { foreignKey: 'diperiksa_oleh', as: 'LkaDiperiksa' });
Lka.belongsTo(User, { foreignKey: 'diperiksa_oleh', as: 'Pemeriksa' });
Lka.hasMany(LkaHasil, { foreignKey: 'kode_lka' });
LkaHasil.belongsTo(Lka, { foreignKey: 'kode_lka' });
Sampel.hasMany(LkaHasil, { foreignKey: 'no_sampel' });
LkaHasil.belongsTo(Sampel, { foreignKey: 'no_sampel' });

// RIWAYAT REVISI LKA
Lka.hasMany(LkaRevisi, { foreignKey: 'kode_lka', as: 'revisi_lka' });
LkaRevisi.belongsTo(Lka, { foreignKey: 'kode_lka', as: 'lka' });
LkaRevisi.belongsTo(LkaRevisi, { foreignKey: 'id_revisi_sebelumnya', as: 'RevisiSebelumnya' });
LkaRevisi.hasMany(LkaRevisi, { foreignKey: 'id_revisi_sebelumnya', as: 'RevisiBerikutnya' });
User.hasMany(LkaRevisi, { foreignKey: 'diajukan_oleh', as: 'RevisiLkaDiajukan' });
LkaRevisi.belongsTo(User, { foreignKey: 'diajukan_oleh', as: 'PengajuRevisi' });
User.hasMany(LkaRevisi, { foreignKey: 'ditinjau_oleh', as: 'RevisiLkaDitinjau' });
LkaRevisi.belongsTo(User, { foreignKey: 'ditinjau_oleh', as: 'PeninjauRevisi' });
Sampel.hasMany(LkaRevisi, { foreignKey: 'no_sampel', as: 'revisi_lka_sampel' });
LkaRevisi.belongsTo(Sampel, { foreignKey: 'no_sampel', as: 'sampel' });

// LHU
Fppl.hasMany(Lhu, { foreignKey: 'id_registrasi', as: 'lhus' });
Lhu.belongsTo(Fppl, { foreignKey: 'id_registrasi', as: 'fppl' });
PktBm.hasMany(Lhu, { foreignKey: 'id_pkt_bm' });
Lhu.belongsTo(PktBm, { foreignKey: 'id_pkt_bm' });
Lhu.hasMany(Sampel, { foreignKey: 'nomor_lhu', as: 'sampels' });
Sampel.belongsTo(Lhu, { foreignKey: 'nomor_lhu', as: 'lhu' });

// INVOICE DAN PAYMENT
Fppl.hasMany(Invoice, { foreignKey: 'id_registrasi' });
Invoice.belongsTo(Fppl, { foreignKey: 'id_registrasi' });
Invoice.hasMany(InvoiceItem, { foreignKey: 'id_invoice' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'id_invoice' });
FpplParameterMetode.hasMany(InvoiceItem, { foreignKey: 'id_fppl_parameter_metode' });
InvoiceItem.belongsTo(FpplParameterMetode, { foreignKey: 'id_fppl_parameter_metode' });
Invoice.belongsToMany(FpplParameterMetode, { through: InvoiceItem, foreignKey: 'id_invoice', otherKey: 'id_fppl_parameter_metode', as: 'ItemParameter' });
FpplParameterMetode.belongsToMany(Invoice, { through: InvoiceItem, foreignKey: 'id_fppl_parameter_metode', otherKey: 'id_invoice', as: 'InvoiceList' });
Invoice.hasMany(Payment, { foreignKey: 'id_invoice' });
Payment.belongsTo(Invoice, { foreignKey: 'id_invoice' });

Fppl.hasOne(JadwalPengambilanLhu, {
  foreignKey: 'id_registrasi',
  sourceKey: 'id_registrasi',
  as: 'jadwal_pengambilan_lhu',
});

JadwalPengambilanLhu.belongsTo(Fppl, {
  foreignKey: 'id_registrasi',
  targetKey: 'id_registrasi',
  as: 'fppl',
});


Fppl.hasMany(PengajuanPerubahanJadwal, {
  foreignKey: 'id_registrasi',
  sourceKey: 'id_registrasi',
  as: 'pengajuan_perubahan_jadwal',
});

PengajuanPerubahanJadwal.belongsTo(Fppl, {
  foreignKey: 'id_registrasi',
  targetKey: 'id_registrasi',
  as: 'fppl',
});

JadwalSampel.hasMany(PengajuanPerubahanJadwal, {
  foreignKey: 'id_jadwal_sampel',
  sourceKey: 'id_jadwal',
  as: 'pengajuan_perubahan',
});

PengajuanPerubahanJadwal.belongsTo(JadwalSampel, {
  foreignKey: 'id_jadwal_sampel',
  targetKey: 'id_jadwal',
  as: 'jadwal_sampel',
});

JadwalPengambilanLhu.hasMany(PengajuanPerubahanJadwal, {
  foreignKey: 'id_jadwal_lhu',
  sourceKey: 'id_jadwal_lhu',
  as: 'pengajuan_perubahan',
});

PengajuanPerubahanJadwal.belongsTo(JadwalPengambilanLhu, {
  foreignKey: 'id_jadwal_lhu',
  targetKey: 'id_jadwal_lhu',
  as: 'jadwal_pengambilan_lhu',
});


// notifikasi_email memakai FK ke user untuk penerima.
// Alamat email aktual tetap diselesaikan backend dan disimpan sebagai snapshot
// pada email_tujuan/nama_penerima. Referensi objek tetap polymorphic melalui
// referensi_tipe + referensi_id, sehingga tidak dibuat relasi FK ke objek bisnis.
User.hasMany(NotifikasiEmail, {
  foreignKey: 'nik_penerima',
  as: 'notifikasi_email',
});

NotifikasiEmail.belongsTo(User, {
  foreignKey: 'nik_penerima',
  as: 'penerima_user',
});

User.hasMany(AktivitasSistemLog, {
  foreignKey: 'dibuat_oleh',
  as: 'aktivitas_sistem_log',
});

AktivitasSistemLog.belongsTo(User, {
  foreignKey: 'dibuat_oleh',
  as: 'pembuat_aktivitas',
});

module.exports = { sequelize, Role, User, Pelanggan, Pegawai, TarifPengambilan, Fppl, JadwalSampel, JenisSampel, FpplSampel, RegBm, PktBm, PktBmKelompok, PktBmParam, PktBmNilai, KategoriParameter, Parameter, Metode, ParameterMetode, FpplParameterMetode, Sampel, SampelParameter, Penugasan, PenugasanDetail, PenugasanItem, Lka, LkaHasil, LkaRevisi, Lhu, Invoice, InvoiceItem, Payment, JadwalPengambilanLhu, PengajuanPerubahanJadwal, NotifikasiEmail, AktivitasSistemLog };