const { User, Pegawai, PktBm, RegBm } = require('../../models/Associations');
const { isLhuEditableByQc } = require('../../constants/lhu-status.constant');
const {
  getPlain,
  pickObject,
  toDateOnly,
  buildAcuanBmSnapshot,
  getFpplParameterMetodeKey,
  getFallbackParameterKey,
  toTinyIntFlag,
  getSubkontrakSnapshot,
} = require('./lhu-data-utils');

function isEditableByQcStatus(status) {
  return isLhuEditableByQc(status);
}

function buildStandarLabel(sampleInfo = {}) {
  return [sampleInfo.reg_bm_instansi, sampleInfo.ref_reg].filter(Boolean).join(' - ');
}

function mapSamplePayload(sampleInfo = {}) {
  const standarLabel = buildStandarLabel(sampleInfo);

  return {
    no_sampel: sampleInfo.no_sampel,
    noSampel: sampleInfo.no_sampel,

    id_fppl_sampel: sampleInfo.id_fppl_sampel,
    idFpplSampel: sampleInfo.id_fppl_sampel,

    id_registrasi: sampleInfo.id_registrasi,
    idRegistrasi: sampleInfo.id_registrasi,

    id_jenis_sampel: sampleInfo.id_jenis_sampel,
    idJenisSampel: sampleInfo.id_jenis_sampel,

    jenis_sampel: sampleInfo.jenis_sampel,
    jenisSampel: sampleInfo.jenis_sampel,

    id_reg_bm: sampleInfo.id_reg_bm,
    idRegBm: sampleInfo.id_reg_bm,

    reg_bm: standarLabel,
    regBm: standarLabel,
    standar: standarLabel,

    jumlah_sampel: sampleInfo.jumlah_sampel,
    jumlahSampel: sampleInfo.jumlah_sampel,

    tanggal_pengambilan_sampel: sampleInfo.tanggal_pengambilan_sampel,
    tanggalPengambilanSampel: sampleInfo.tanggal_pengambilan_sampel,

    tanggal_jadwal: sampleInfo.tanggal_jadwal,
    tanggalJadwal: sampleInfo.tanggal_jadwal,

    jam_jadwal: sampleInfo.jam_jadwal,
    jamJadwal: sampleInfo.jam_jadwal,

    tanggal_penerimaan: sampleInfo.diterima_pada,
    tanggalPenerimaan: sampleInfo.diterima_pada,

    jam_penerimaan: (sampleInfo.diterima_pada ? new Date(sampleInfo.diterima_pada).toTimeString().slice(0, 8) : null),
    jamPenerimaan: (sampleInfo.diterima_pada ? new Date(sampleInfo.diterima_pada).toTimeString().slice(0, 8) : null),

    abnormalitas_sampel: sampleInfo.abnormalitas_sampel,
    abnormalitasSampel: sampleInfo.abnormalitas_sampel,

    acuan_pengambilan_sampel: sampleInfo.acuan_pengambilan_sampel,
    acuanPengambilanSampel: sampleInfo.acuan_pengambilan_sampel,

    lokasi_spesifik: sampleInfo.lokasi_spesifik || sampleInfo.lokasi_pengambilan_sampel || null,
    lokasiSpesifik: sampleInfo.lokasi_spesifik || sampleInfo.lokasi_pengambilan_sampel || null,
    lokasi_pengambilan_sampel: sampleInfo.lokasi_spesifik || sampleInfo.lokasi_pengambilan_sampel || null,
    lokasiPengambilanSampel: sampleInfo.lokasi_spesifik || sampleInfo.lokasi_pengambilan_sampel || null,

    koordinat: sampleInfo.koordinat,

    kondisi_sampel: sampleInfo.kondisi_sampel,
    kondisiSampel: sampleInfo.kondisi_sampel,

    status_sample: sampleInfo.status_sample,
    statusSample: sampleInfo.status_sample,

    nomor_lhu: sampleInfo.nomor_lhu || null,
    nomorLhu: sampleInfo.nomor_lhu || sampleInfo.nomorLhu || null,
    status_lhu: sampleInfo.status_lhu || null,
    statusLhu: sampleInfo.status_lhu || sampleInfo.statusLhu || null,
  };
}

function mapPelangganPayload(sampleInfo = {}) {
  return {
    id_pelanggan: sampleInfo.id_pelanggan,
    idPelanggan: sampleInfo.id_pelanggan,

    nama_instansi: sampleInfo.nama_instansi,
    namaInstansi: sampleInfo.nama_instansi,
    nama_pelanggan: sampleInfo.nama_instansi || sampleInfo.nama_pelanggan,
    namaPelanggan: sampleInfo.nama_instansi || sampleInfo.nama_pelanggan,

    pic: sampleInfo.pic,

    email_kontak: sampleInfo.email_kontak,
    emailKontak: sampleInfo.email_kontak,
    email: sampleInfo.email_kontak,

    no_telp: sampleInfo.no_telp,
    noTelp: sampleInfo.no_telp,

    alamat: sampleInfo.alamat,
  };
}

function mapRequestPayload(sampleInfo = {}) {
  return {
    id_registrasi: sampleInfo.id_registrasi,
    idRegistrasi: sampleInfo.id_registrasi,

    nomor_fppl: sampleInfo.nomor_fppl,
    nomorFppl: sampleInfo.nomor_fppl,

    tanggal_pendaftaran: sampleInfo.tanggal_pendaftaran,
    tanggalPendaftaran: sampleInfo.tanggal_pendaftaran,

    maksud_pengujian: sampleInfo.maksud_pengujian,
    maksudPengujian: sampleInfo.maksud_pengujian,

    lokasi_pengambilan_sampel: sampleInfo.lokasi_pengambilan_sampel,
    lokasiPengambilanSampel: sampleInfo.lokasi_pengambilan_sampel,

    jenis_pengambilan_sampel: sampleInfo.jenis_pengambilan_sampel,
    jenisPengambilanSampel: sampleInfo.jenis_pengambilan_sampel,

    tanggal_rencana_pengambilan_sampel: sampleInfo.tanggal_rencana_pengambilan_sampel,
    tanggalRencanaPengambilanSampel: sampleInfo.tanggal_rencana_pengambilan_sampel,

    jam_rencana_pengambilan_sampel: sampleInfo.jam_rencana_pengambilan_sampel,
    jamRencanaPengambilanSampel: sampleInfo.jam_rencana_pengambilan_sampel,

    tanggal_rencana_pengantaran_sampel: sampleInfo.tanggal_rencana_pengantaran_sampel,
    tanggalRencanaPengantaranSampel: sampleInfo.tanggal_rencana_pengantaran_sampel,

    status_fppl: sampleInfo.status_fppl,
    statusFppl: sampleInfo.status_fppl,
  };
}

function buildDefaultDetailRows(resultRows = [], sampleInfo = {}) {
  return resultRows.map((row, index) => ({
    no_sampel: row.no_sampel,
    id_fppl_parameter_metode: row.id_fppl_parameter_metode || null,
    idFpplParameterMetode: row.id_fppl_parameter_metode || null,
    id_parameter: row.id_parameter || null,
    id_metode_parameter: row.id_metode_parameter || null,
    nama_parameter: row.nama_parameter,
    metode: row.nama_metode,
    acuan_metode: row.acuan_metode,
    hasil: row.hasil,
    is_terakreditasi: Number(row.is_terakreditasi || 0),
    isTerakreditasi: Number(row.is_terakreditasi || 0),
    bm: null,
    satuan_bm: null,
    satuanBm: null,
    ada_di_bm: 0,
    adaDiBm: 0,
    urutan_lhu: index + 1,
    is_insitu: toTinyIntFlag(row.is_insitu),
    isInsitu: toTinyIntFlag(row.is_insitu),
    is_insitu_snapshot: toTinyIntFlag(row.is_insitu),
    isInsituSnapshot: toTinyIntFlag(row.is_insitu),
    is_subkontrak: getSubkontrakSnapshot(row),
    isSubkontrak: getSubkontrakSnapshot(row),
    is_subkontrak_snapshot: getSubkontrakSnapshot(row),
    isSubkontrakSnapshot: getSubkontrakSnapshot(row),
    tanggal_sampling: toDateOnly(sampleInfo.tanggal_pengambilan_sampel),
    catatan_hasil: row.catatan_hasil || null,
  }));
}

function buildDetailLhuCreateRow(row = {}) {
  return {
    nomor_lhu: row.nomor_lhu,
    id_fppl_parameter_metode: getFpplParameterMetodeKey(row),
    urutan_lhu: row.urutan_lhu,
  };
}
async function getPegawaiDisplayName(nik) {
  const userNik = String(nik || '').trim();

  if (!userNik) return null;

  const pegawai = await Pegawai.findOne({
    where: { nik: userNik },
    attributes: ['nik', 'nama_pegawai'],
  });

  if (pegawai?.nama_pegawai) return pegawai.nama_pegawai;

  const user = await User.findOne({
    where: { nik: userNik },
    attributes: ['nik', 'username'],
  });

  return user?.username || userNik;
}

async function getPktBmHeaderById(idPktBm) {
  if (!idPktBm) return {};

  const instance = await PktBm.findOne({
    where: { id_pkt_bm: idPktBm },
    include: [{ model: RegBm, required: false }],
  });

  if (!instance) return {};

  const row = getPlain(instance);
  const regBm = pickObject(row, ['reg_bm', 'RegBm']) || {};

  return {
    id_pkt_bm: row.id_pkt_bm,
    id_reg_bm: row.id_reg_bm,
    id_jenis_sampel: row.id_jenis_sampel,
    nama_pkt: row.nama_pkt,
    klasifikasi: row.klasifikasi,
    teks_lhu: row.teks_lhu,
    instansi: regBm.instansi || null,
    ref_reg: regBm.ref_reg || null,
  };
}

function countDetailStats(details = []) {
  const uniqueMap = new Map();
  (Array.isArray(details) ? details : []).forEach((row, index) => {
    const key = getFallbackParameterKey(row) || `row-${index}`;
    if (!uniqueMap.has(key)) uniqueMap.set(key, row);
  });
  const uniqueRows = Array.from(uniqueMap.values());
  const totalParameter = uniqueRows.length;
  const totalTerakreditasi = uniqueRows.filter((row) => Number(row.is_terakreditasi || row.isTerakreditasi || 0) === 1).length;
  const persentaseTerakreditasi = totalParameter > 0 ? Number(((totalTerakreditasi / totalParameter) * 100).toFixed(2)) : 0;

  return {
    totalParameter,
    total_parameter: totalParameter,
    totalTerakreditasi,
    total_terakreditasi: totalTerakreditasi,
    persentaseTerakreditasi,
    persentase_terakreditasi: persentaseTerakreditasi,
    showLogoKan: persentaseTerakreditasi >= 60,
    show_logo_kan: persentaseTerakreditasi >= 60,
  };
}

function mapLhuHeaderPayload(lhu = {}, sample = {}, pktBm = {}, names = {}) {
  const standarLabel = buildAcuanBmSnapshot(pktBm) || buildStandarLabel(sample);

  return {
    ...lhu,

    tanggal_pengambilan_sampel: sample.tanggal_pengambilan_sampel || null,
    tanggalPengambilanSampel: sample.tanggal_pengambilan_sampel || null,

    tanggal_jadwal: sample.tanggal_jadwal || null,
    tanggalJadwal: sample.tanggal_jadwal || null,

    jam_jadwal: sample.jam_jadwal || null,
    jamJadwal: sample.jam_jadwal || null,

    tanggal_penerimaan: sample.diterima_pada || null,
    tanggalPenerimaan: sample.diterima_pada || null,

    jam_penerimaan: (sample.diterima_pada ? new Date(sample.diterima_pada).toTimeString().slice(0, 8) : null) || null,
    jamPenerimaan: (sample.diterima_pada ? new Date(sample.diterima_pada).toTimeString().slice(0, 8) : null) || null,

    kondisi_sampel: sample.kondisi_sampel || null,
    kondisiSampel: sample.kondisi_sampel || null,

    abnormalitas_sampel: sample.abnormalitas_sampel || null,
    abnormalitasSampel: sample.abnormalitas_sampel || null,

    koordinat: sample.koordinat || null,

    acuan_pengambilan_sampel: sample.acuan_pengambilan_sampel || null,
    acuanPengambilanSampel: sample.acuan_pengambilan_sampel || null,

    id_registrasi: sample.id_registrasi || null,
    idRegistrasi: sample.id_registrasi || null,

    id_jenis_sampel: sample.id_jenis_sampel || null,
    idJenisSampel: sample.id_jenis_sampel || null,

    id_reg_bm: sample.id_reg_bm || null,
    idRegBm: sample.id_reg_bm || null,

    reg_bm_instansi: sample.reg_bm_instansi || pktBm.instansi || null,
    regBmInstansi: sample.reg_bm_instansi || pktBm.instansi || null,

    ref_reg: sample.ref_reg || pktBm.ref_reg || null,
    refReg: sample.ref_reg || pktBm.ref_reg || null,

    reg_bm: standarLabel || null,
    regBm: standarLabel || null,
    standar: standarLabel || null,

    jenis_sampel: sample.jenis_sampel || null,
    jenisSampel: sample.jenis_sampel || null,

    nomor_fppl: sample.nomor_fppl || null,
    nomorFppl: sample.nomor_fppl || null,

    tanggal_pendaftaran: sample.tanggal_pendaftaran || null,
    tanggalPendaftaran: sample.tanggal_pendaftaran || null,

    maksud_pengujian: sample.maksud_pengujian || null,
    maksudPengujian: sample.maksud_pengujian || null,

    lokasi_pengambilan_sampel: sample.lokasi_pengambilan_sampel || null,
    lokasiPengambilanSampel: sample.lokasi_pengambilan_sampel || null,

    jenis_pengambilan_sampel: sample.jenis_pengambilan_sampel || null,
    jenisPengambilanSampel: sample.jenis_pengambilan_sampel || null,

    id_pelanggan: sample.id_pelanggan || null,
    idPelanggan: sample.id_pelanggan || null,

    nama_pelanggan: sample.nama_pelanggan || sample.nama_instansi || null,
    namaPelanggan: sample.nama_pelanggan || sample.nama_instansi || null,

    alamat_pelanggan: sample.alamat_pelanggan || sample.alamat || null,
    alamatPelanggan: sample.alamat_pelanggan || sample.alamat || null,

    pic_pelanggan: sample.pic_pelanggan || sample.pic || null,
    picPelanggan: sample.pic_pelanggan || sample.pic || null,

    telp_pelanggan: sample.telp_pelanggan || sample.no_telp || null,
    telpPelanggan: sample.telp_pelanggan || sample.no_telp || null,

    email_pelanggan: sample.email_pelanggan || sample.email_kontak || null,
    emailPelanggan: sample.email_pelanggan || sample.email_kontak || null,

    nama_pkt: pktBm.nama_pkt || null,
    namaPkt: pktBm.nama_pkt || null,

    klasifikasi: pktBm.klasifikasi || null,

    teks_lhu: pktBm.teks_lhu || null,
    teksLhu: pktBm.teks_lhu || null,

    qc_nama: names.qcNama || null,
    qcNama: names.qcNama || null,

    kalab_nama: names.kalabNama || null,
    kalabNama: names.kalabNama || null,
  };
}

module.exports = {
  isEditableByQcStatus,
  buildStandarLabel,
  mapSamplePayload,
  mapPelangganPayload,
  mapRequestPayload,
  buildDefaultDetailRows,
  buildDetailLhuCreateRow,
  getPegawaiDisplayName,
  getPktBmHeaderById,
  countDetailStats,
  mapLhuHeaderPayload,
};
