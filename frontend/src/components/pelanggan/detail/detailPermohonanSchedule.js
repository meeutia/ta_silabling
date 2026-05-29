import {
  combineDateTimeValue,
  formatDateTime,
  formatTimelineDateValue,
  getTimelineSortTimestamp,
  pickFirstDateValue,
  toDateTimestamp,
} from './detailPermohonanCore';
import { getActualSamplesFromRequest } from './detailPermohonanSampleLhu';

export const getScheduleTargetDate = (schedule) =>
  pickFirstDateValue(
    schedule?.tanggal_jadwal,
    schedule?.tanggalJadwal,
    schedule?.tanggal_pengambilan,
    schedule?.tanggalPengambilan,
    schedule?.tanggal_pengantaran,
    schedule?.tanggalPengantaran
  );

export const getScheduleTargetTime = (schedule) =>
  schedule?.jam_jadwal ||
  schedule?.jamJadwal ||
  schedule?.jam_pengambilan ||
  schedule?.jamPengambilan ||
  schedule?.jam_pengantaran ||
  schedule?.jamPengantaran ||
  '';

export const getScheduleDecisionDate = (schedule) =>
  pickFirstDateValue(
    schedule?.dibuat_pada,
    schedule?.dibuatPada
  );

export const getScheduleOfficer = (schedule) => {
  const pegawai =
    schedule?.pegawai_pcc ||
    schedule?.PegawaiPcc ||
    schedule?.Pegawai ||
    schedule?.pegawaiPcc ||
    null;

  return {
    nama_pegawai_pcc:
      schedule?.nama_pegawai_pcc ||
      schedule?.namaPegawaiPcc ||
      pegawai?.nama_pegawai ||
      pegawai?.namaPegawai ||
      '-',
    no_wa_pcc:
      schedule?.no_wa_pcc ||
      schedule?.noWaPcc ||
      pegawai?.no_wa ||
      pegawai?.noWa ||
      '-',
  };
};

export const getActiveScheduleFromRequest = (requestData) => {
  const directSchedule =
    requestData?.jadwal_sampel ||
    requestData?.jadwalSampel ||
    requestData?.JadwalSampel ||
    null;

  const schedules =
    requestData?.JadwalSampels ||
    requestData?.jadwal_sampels ||
    requestData?.jadwalSampels ||
    [];

  const scheduleRows = [
    directSchedule,
    ...(Array.isArray(schedules) ? schedules : []),
  ].filter(Boolean);

  const sortedRows = scheduleRows.sort((a, b) =>
    toDateTimestamp(b?.dibuat_pada || b?.dibuatPada || b?.tanggal_jadwal) -
    toDateTimestamp(a?.dibuat_pada || a?.dibuatPada || a?.tanggal_jadwal)
  );

  const activeScheduleStatuses = ['Terjadwal', 'Disetujui Pelanggan', 'Disetujui Admin', 'Selesai'];
  const activeRow =
    sortedRows.find((row) => activeScheduleStatuses.includes(row?.status_jadwal || row?.statusJadwal)) ||
    sortedRows[0] ||
    null;

  if (!activeRow) return null;

  return {
    ...activeRow,
    dibuat_pada: activeRow?.dibuat_pada || activeRow?.dibuatPada || null,
    dibuatPada: activeRow?.dibuatPada || activeRow?.dibuat_pada || null,
    ...getScheduleOfficer(activeRow),
  };
};

export const getLhuPickupInfoFromRequest = (request) => {
  const directSchedule =
    request?.jadwal_pengambilan_lhu ||
    request?.jadwalPengambilanLhu ||
    request?.JadwalPengambilanLhu ||
    null;

  const scheduleRows = [
    directSchedule,
    ...(Array.isArray(request?.jadwal_pengambilan_lhus) ? request.jadwal_pengambilan_lhus : []),
    ...(Array.isArray(request?.jadwalPengambilanLhus) ? request.jadwalPengambilanLhus : []),
    ...(Array.isArray(request?.JadwalPengambilanLhus) ? request.JadwalPengambilanLhus : []),
  ].filter(Boolean);

  if (scheduleRows.length === 0) return null;

  const activeRows = scheduleRows.filter((row) =>
    String(row?.status_pengambilan || row?.statusPengambilan || '').trim() !== 'Dibatalkan'
  );

  return (activeRows.length > 0 ? activeRows : scheduleRows).sort((a, b) =>
    toDateTimestamp(b?.dijadwalkan_pada || b?.dijadwalkanPada || b?.tanggal_pengambilan || b?.tanggalPengambilan) -
    toDateTimestamp(a?.dijadwalkan_pada || a?.dijadwalkanPada || a?.tanggal_pengambilan || a?.tanggalPengambilan)
  )[0] || null;
};

export const getScheduleChangeRowsFromRequest = (request) => {
  const rows = request?.pengajuan_perubahan_jadwal || request?.pengajuanPerubahanJadwal || request?.PengajuanPerubahanJadwals || [];
  return Array.isArray(rows) ? rows : [];
};

export const getTestingStartedDate = (request) => {
  const actualSamples = getActualSamplesFromRequest(request);
  return pickFirstDateValue(
    request?.mulai_pengujian_pada,
    request?.mulaiPengujianPada,
    actualSamples.map((sample) =>
      pickFirstDateValue(
        sample?.mulai_pengujian_pada,
        sample?.mulaiPengujianPada,
        sample?.tanggal_mulai_pengujian,
        sample?.tanggalMulaiPengujian,
        sample?.kasiPengujianReviewAt,
        sample?.kasiPengujianReviewAt,
        (sample?.penugasan_items || sample?.penugasanItems || sample?.PenugasanItems || []).map((item) =>
          pickFirstDateValue(
            item?.tanggal_penugasan,
            item?.tanggalPenugasan,
            item?.penugasan_detail?.penugasan?.assigned_at,
            item?.penugasanDetail?.penugasan?.assignedAt,
            item?.PenugasanDetail?.Penugasan?.assigned_at
          )
        )
      )
    )
  );
};

export const buildScheduleChangeTimelineItems = (requestData) => {
  return getScheduleChangeRowsFromRequest(requestData).map((row) => {
    const jenis = String(row.jenis_jadwal || row.jenisJadwal || '').toUpperCase();
    const status = row.status_pengajuan || row.statusPengajuan || '';
    const isLhu = jenis === 'LHU';
    const tanggal = row.tanggal_usulan || row.tanggalUsulan;
    const jam = row.jam_usulan || row.jamUsulan;
    const decisionDate = row.updated_at || row.updatedAt || row.diajukan_pada || row.diajukanPada;
    const submittedDate = row.diajukan_pada || row.diajukanPada;
    const scheduleText = tanggal
      ? formatDateTime(combineDateTimeValue(tanggal, jam))
      : '-';

    if (status === 'Disetujui') {
      return {
        date: formatTimelineDateValue(decisionDate),
        sortTimestamp: getTimelineSortTimestamp(decisionDate),
        status: isLhu ? 'Jadwal Ulang LHU Disetujui Admin' : 'Jadwal Ulang Sampel Disetujui Admin',
        note: `Admin menyetujui jadwal baru untuk ${scheduleText}.`,
        show: false,
      };
    }

    if (status === 'Ditolak') {
      return {
        date: formatTimelineDateValue(decisionDate),
        sortTimestamp: getTimelineSortTimestamp(decisionDate),
        status: isLhu ? 'Pengajuan Jadwal Ulang LHU Ditolak' : 'Pengajuan Jadwal Ulang Sampel Ditolak',
        note: row.catatan_admin || row.catatanAdmin || 'Admin menolak pengajuan perubahan jadwal.',
        show: true,
      };
    }

    if (status === 'Dibatalkan Pelanggan') {
      return {
        date: formatTimelineDateValue(decisionDate),
        sortTimestamp: getTimelineSortTimestamp(decisionDate),
        status: isLhu ? 'Pengajuan Jadwal Ulang LHU Dibatalkan' : 'Pengajuan Jadwal Ulang Sampel Dibatalkan',
        note: 'Pelanggan membatalkan pengajuan perubahan jadwal.',
        show: true,
      };
    }

    return {
      date: formatTimelineDateValue(submittedDate),
      sortTimestamp: getTimelineSortTimestamp(submittedDate),
      status: isLhu ? 'Pengajuan Jadwal Ulang LHU Dikirim' : 'Pengajuan Jadwal Ulang Sampel Dikirim',
      note: row.alasan_pengajuan || row.alasanPengajuan || 'Pelanggan mengajukan perubahan jadwal.',
      show: true,
    };
  });
};
