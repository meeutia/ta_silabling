'use strict';

const jwt = require('jsonwebtoken');
const Roles = require('../../src/constants/roles');

const FUTURE_DATE = '2026-06-02';
const FUTURE_DATE_2 = '2026-06-03';
const VALID_TIME = '09:00';
const VALID_TIME_2 = '10:00';
const INVALID_TIME = '17:15';

const nikByRole = {
  [Roles.CUSTOMER]: '3171000000000001',
  [Roles.ADMIN]: '3171000000000002',
  [Roles.KASI]: '3171000000000003',
  [Roles.PENYELIA]: '3171000000000004',
  [Roles.ANALIS]: '3171000000000005',
  [Roles.QC]: '3171000000000006',
  [Roles.KALAB]: '3171000000000007',
};

function makeToken(idRole, nik = nikByRole[idRole] || '3171999999999999') {
  return jwt.sign({ nik, id_role: idRole }, process.env.JWT_SECRET, { expiresIn: '2h' });
}

function authHeader(idRole, nik) {
  return { Authorization: `Bearer ${makeToken(idRole, nik)}` };
}

function validRegisterPayload(overrides = {}) {
  return {
    nik: '3171000000000099',
    username: 'pelangganbaru',
    email: 'pelanggan.baru@example.com',
    password: 'Password123!',
    ...overrides,
  };
}

function validRequestPayload(overrides = {}) {
  return {
    namaInstansi: 'PT Uji Integrasi',
    pic: 'Dewi Integrasi',
    emailPic: 'dewi.integrasi@example.com',
    noTelp: '081234567890',
    alamat: 'Padang',
    maksudPengujian: 'Pemantauan kualitas lingkungan',
    metodePengambilan: 'laboratorium',
    tanggalPengambilan: FUTURE_DATE,
    jamPengambilan: VALID_TIME,
    alamatPengambilan: 'Jl. Contoh No. 1',
    sampleEntries: [
      {
        jenisSampel: 'AIR',
        idRegBm: 'RBM-001',
        jumlahSampel: 1,
        parameters: [{ id_parameter: 'PAR-001' }],
      },
    ],
    ...overrides,
  };
}

function validKirimRequestPayload(overrides = {}) {
  const base = validRequestPayload({
    metodePengambilan: 'kirim',
    tanggalPengambilan: undefined,
    jamPengambilan: undefined,
    alamatPengambilan: undefined,
    estimasiDiterima: FUTURE_DATE,
  });
  return { ...base, ...overrides };
}

function validMethodSelection(overrides = {}) {
  return {
    selections: [
      {
        fpmId: 'FPM-001',
        capabilityStatus: 'MAMPU',
        methodId: 'MET-001',
        isInsitu: 0,
      },
    ],
    ...overrides,
  };
}

function validReceiveSamplesPayload(overrides = {}) {
  return {
    sampels: [{
      no_sampel: '37/AM/VI/2026',
      tanggalPengambilanSampel: FUTURE_DATE,
      kondisiSampel: 'Baik',
      acuanPengambilanSampel: 'SNI 6989.57:2008',
      lokasiSpesifik: 'Titik Sungai 1',
      koordinat: 'S 00°18\'48.2" E 100°01\'49.3"',
    }],
    ...overrides,
  };
}

function validScheduleChangePayload(overrides = {}) {
  return {
    idRegistrasi: 'REG-001',
    jenisJadwal: 'SAMPEL',
    tanggalUsulan: FUTURE_DATE_2,
    jamUsulan: VALID_TIME_2,
    alasanPengajuan: 'Pelanggan meminta penyesuaian jadwal.',
    ...overrides,
  };
}

function validScheduleDecisionPayload(overrides = {}) {
  return {
    action: 'approve',
    catatanAdmin: 'Usulan jadwal disetujui.',
    ...overrides,
  };
}

function validScheduleConfirmationPayload(overrides = {}) {
  return {
    jenisJadwal: 'SAMPEL',
    keputusan: 'setuju',
    catatan: 'Jadwal disetujui pelanggan.',
    ...overrides,
  };
}

function validAssignmentPayload(overrides = {}) {
  return {
    idUserAnalis: nikByRole[Roles.ANALIS],
    catatanPenugasan: 'Uji parameter sesuai metode.',
    assignments: [
      {
        id_fppl_parameter_metode: 'FPM-001',
        no_sampel: ['37/AM/VI/2026'],
        tanggal_tenggat: FUTURE_DATE_2,
        catatan_detail: 'Prioritas normal.',
      },
    ],
    ...overrides,
  };
}

function validWorksheetDraftPayload(overrides = {}) {
  return {
    tanggalMulaiPengujian: FUTURE_DATE,
    tanggalSelesaiPengujian: FUTURE_DATE_2,
    dhlAkuades: '1,2',
    catatan: 'Draft hasil pengujian awal.',
    ...overrides,
  };
}

function validResultsPayload(overrides = {}) {
  return {
    results: [
      {
        noSampel: '37/AM/VI/2026',
        hasil: '7,5',
        catatanHasil: 'Sesuai metode uji.',
      },
    ],
    ...overrides,
  };
}

function validSubmitPayload(overrides = {}) {
  return {
    worksheet: {
      tanggalMulaiPengujian: FUTURE_DATE,
      tanggalSelesaiPengujian: FUTURE_DATE_2,
      dhlAkuades: '1,2',
      fileWorksheetPath: '/worksheets/worksheet-test.xlsx',
    },
    results: [
      {
        noSampel: '37/AM/VI/2026',
        hasil: '7,5',
      },
    ],
    ...overrides,
  };
}

function validPenyeliaRevisionPayload(overrides = {}) {
  return {
    revisions: [
      {
        kodeLka: 'LKA-001',
        noSampel: '37/AM/VI/2026',
        catatanRevisi: 'Periksa ulang hasil parameter pH.',
      },
    ],
    ...overrides,
  };
}

function validKasiRevisionPayload(overrides = {}) {
  return {
    noSampel: '37/AM/VI/2026',
    revisions: [
      {
        kodeLka: 'LKA-001',
        noSampel: '37/AM/VI/2026',
        catatanRevisi: 'Hasil perlu dikonfirmasi ulang sebelum LHU.',
      },
    ],
    ...overrides,
  };
}

function validSubkontrakResultsPayload(overrides = {}) {
  return {
    results: [{
      noSampel: '37/AM/VI/2026',
      idFpplParameterMetode: 'FPM-002',
      hasil: '0,05',
      tanggalTerimaHasil: FUTURE_DATE_2,
    }],
    ...overrides,
  };
}

function validFinalizeLhuPayload(overrides = {}) {
  return {
    idRegistrasi: 'REG-001',
    idPktBm: 'PKT-001',
    noSampelList: ['37/AM/VI/2026'],
    ...overrides,
  };
}

function validPickupSchedulePayload(overrides = {}) {
  return {
    idRegistrasi: 'REG-001',
    tanggalPengambilan: FUTURE_DATE_2,
    jamPengambilan: VALID_TIME,
    catatan: 'Pelanggan mengambil LHU sesuai jadwal.',
    ...overrides,
  };
}

function validPickupCompletePayload(overrides = {}) {
  return {
    idRegistrasi: 'REG-001',
    namaPengambil: 'Dewi Pelanggan',
    ...overrides,
  };
}

module.exports = {
  FUTURE_DATE,
  FUTURE_DATE_2,
  INVALID_TIME,
  VALID_TIME,
  VALID_TIME_2,
  Roles,
  authHeader,
  makeToken,
  nikByRole,
  validAssignmentPayload,
  validFinalizeLhuPayload,
  validKasiRevisionPayload,
  validKirimRequestPayload,
  validMethodSelection,
  validPickupCompletePayload,
  validPickupSchedulePayload,
  validPenyeliaRevisionPayload,
  validReceiveSamplesPayload,
  validRegisterPayload,
  validRequestPayload,
  validResultsPayload,
  validScheduleChangePayload,
  validScheduleConfirmationPayload,
  validScheduleDecisionPayload,
  validSubkontrakResultsPayload,
  validSubmitPayload,
  validWorksheetDraftPayload,
};
