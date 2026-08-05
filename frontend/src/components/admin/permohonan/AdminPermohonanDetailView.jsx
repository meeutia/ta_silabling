import { ArrowLeft, CalendarClock, CheckCircle, XCircle } from 'lucide-react';
import { FPPL_STATUSES, normalizeFpplStatus } from '../../../utils/fpplStatus';
import { getPaymentTimelineDescription } from './adminPermohonanTimeline';
import { getCustomerProfile, getRequestSamples } from './adminPermohonanHelpers';
import {
  LhuDocumentSection,
  LhuPickupInfoSection,
  SampleParameterDetailSection,
  TimelineStatusSection,
} from './AdminPermohonanDetailSections';
import { AdminPermohonanValidationSection } from './AdminPermohonanValidationSection';
import { AdminPermohonanScheduleSection } from './AdminPermohonanScheduleSection';
import { AdminPermohonanSampleReceiptSection } from './AdminPermohonanSampleReceiptSection';


import {
  buildKasiRevisionReviewTimelineItems,
  buildLhuTimelineGroupsFromActivityLogs,
  buildLhuTimelineGroupsFromAdminSampleRows,
  buildParameterNameByMethodId,
  collectLkaHasilTimelineRows,
  getLhuApprovedDateValue,
  getLhuCreatedDateValue,
  getMethodDecisionDate,
  getPaymentConfirmedDate,
  getSampleDisplayLabel,
  getScheduleDecisionDate,
  getScheduleOfficerName,
  getScheduleTargetDate,
  getScheduleTargetTime,
  getTimestamp,
  hasTestingFlow,
  joinLabels,
  mergeLhuTimelineGroups,
  pickFirstFilledValue,
  pickLatestDateTime,
  stripRevisionPrefix,
  withOnePeriod,
  removeTrailingPeriod,
} from './adminPermohonanDetailWorkflow';

export function AdminPermohonanDetailView({
  selectedRequest,
  expandedSection,
  setSelectedRequest,
  setValidationDecision,
  setValidationNote,
  setShowDeferredPaymentModal,
  setDeferredPaymentNote,
  getSampleTypeList,
  getParameterList,
  getActiveSchedule,
  getAdminSampleRows,
  getRequestPickupInfo,
  getRequestTrackingSteps,
  formatTimelineDate,
  formatDate,
  formatDateTime,
  getStatusBadge,
  toggleSection,
  validationDecision,
  validationNote,
  selectedSamplingTariffId,
  setSelectedSamplingTariffId,
  samplingTariffList,
  handleSaveValidation,
  saving,
  showDeferredPaymentModal,
  deferredPaymentNote,
  handleDeferredPaymentByAdmin,
  setExpandedSection,
  sampelRef,
  sampleDetailRef,
  showScheduleInputs,
  setShowScheduleInputs,
  scheduleForm,
  setScheduleForm,
  isBusinessDay,
  scheduleError,
  setScheduleError,
  timeOptions = [],
  pccOptions,
  handleSaveSamplingSchedule,
  sampelFormList,
  setSampelFormList,
  setSampleReceiptError,
  sampleReceiptError,
  generateSampleIds,
  getLhuFilePath,
  getLhuStatusBadge,
  openGeneratedFile,
  onOpenSignedLhu,
  onOpenUploadSignedModal,
  getPickupStatusBadge,
  handleDecideScheduleChange,
  scheduleDecisionNotes = {},
  onScheduleDecisionNoteChange,
  onBackToList,
}) {
    const customer = getCustomerProfile(selectedRequest);
    const sampleTypes = getSampleTypeList(selectedRequest);
    const parameters = getParameterList(selectedRequest);
    const requestSamplesForDetail = getRequestSamples(selectedRequest);

    const activeSchedule = getActiveSchedule(selectedRequest);

    const adminSampleRows = getAdminSampleRows(selectedRequest);
    const pickupInfo = getRequestPickupInfo(selectedRequest);
    const normalizedStatus = normalizeFpplStatus(selectedRequest?.status_fppl || selectedRequest?.statusFppl || selectedRequest?.status || '');
    const rejectedOrCancelledStatuses = new Set([
      FPPL_STATUSES.DIBATALKAN,
      FPPL_STATUSES.DIBATALKAN_PELANGGAN,
      FPPL_STATUSES.DITOLAK_ADMIN,
      FPPL_STATUSES.DITOLAK_KASI,
      FPPL_STATUSES.DITOLAK_PENYELIA,
    ]);
    const isStoppedRequest = rejectedOrCancelledStatuses.has(normalizedStatus);
    const isRejectedByAdmin = normalizedStatus === FPPL_STATUSES.DITOLAK_ADMIN || normalizedStatus === FPPL_STATUSES.DIBATALKAN;
    const isRejectedByKasi = normalizedStatus === FPPL_STATUSES.DITOLAK_KASI;
    const lhuTimelineGroups = mergeLhuTimelineGroups(
      buildLhuTimelineGroupsFromAdminSampleRows(adminSampleRows),
      buildLhuTimelineGroupsFromActivityLogs(selectedRequest)
    );
    const invoiceInfo = selectedRequest?.invoice || selectedRequest?.Invoice || selectedRequest?.invoiceSummary || null;
    const isOfficerSampling = selectedRequest?.jenis_pengambilan_sampel === 'Petugas';
    const sampleReceiptDateTime = pickLatestDateTime(
      adminSampleRows.map(({ actualSample }) => ({
        date: pickFirstFilledValue(
          actualSample?.diterima_pada,
          actualSample?.diterimaPada,
          actualSample?.tanggal_penerimaan,
          actualSample?.tanggalPenerimaan,
          actualSample?.tanggal_terima,
          actualSample?.tanggalTerima,
          actualSample?.tanggal_diterima,
          actualSample?.tanggalDiterima
        ),
        time: pickFirstFilledValue(actualSample?.jam_penerimaan, actualSample?.jamPenerimaan, actualSample?.jam_terima, actualSample?.jamTerima),
      }))
    );
    const scheduleTargetDate = getScheduleTargetDate(activeSchedule);
    const scheduleTargetTime = getScheduleTargetTime(activeSchedule);
    const scheduleDecisionDate = getScheduleDecisionDate(activeSchedule);
    const scheduleOfficerName = getScheduleOfficerName(activeSchedule);
    const scheduleChangeRows = Array.isArray(selectedRequest?.pengajuan_perubahan_jadwal)
      ? selectedRequest.pengajuan_perubahan_jadwal
      : Array.isArray(selectedRequest?.pengajuanPerubahanJadwal)
      ? selectedRequest.pengajuanPerubahanJadwal
      : [];
    const requestIsCompleted = String(selectedRequest?.status_fppl || selectedRequest?.statusFppl || '').trim() === 'Selesai';
    const pendingScheduleChanges = requestIsCompleted
      ? []
      : scheduleChangeRows.filter((row) => row.status_pengajuan === 'Menunggu Persetujuan Admin' || row.statusPengajuan === 'Menunggu Persetujuan Admin');
    const parameterNameByMethodId = buildParameterNameByMethodId(selectedRequest);
    const methodDecisionDate = getMethodDecisionDate(selectedRequest);
    const hasMethodDecision = Boolean(methodDecisionDate) || parameterNameByMethodId.size > 0;
    const hasGeneratedSamples = adminSampleRows.some(({ actualSample }) => Boolean(actualSample?.no_sampel || actualSample?.noSampel));
    const hasSampleReceipt = Boolean(sampleReceiptDateTime?.date) || hasGeneratedSamples;
    const hasLhuData = lhuTimelineGroups.length > 0 || adminSampleRows.some((row) => Boolean(row?.lhu));
    const hasPickupData = Boolean(pickupInfo);
    const canProceedAfterAdminValidation = !isRejectedByAdmin && normalizedStatus !== FPPL_STATUSES.MENUNGGU_VERIFIKASI;
    const canProceedAfterKasiDecision = canProceedAfterAdminValidation && !isRejectedByKasi;
    const paymentIsCleared = [
      FPPL_STATUSES.MENUNGGU_SAMPEL,
      FPPL_STATUSES.PROSES_PENGUJIAN,
      FPPL_STATUSES.SELESAI,
    ].includes(normalizedStatus) || hasSampleReceipt || hasGeneratedSamples || hasLhuData;
    const scheduleStageIsRelevant = paymentIsCleared || activeSchedule || pendingScheduleChanges.length > 0;
    const sampleReceiptStageIsRelevant = paymentIsCleared || hasSampleReceipt || hasGeneratedSamples;
    const lhuStageIsRelevant = hasLhuData || [FPPL_STATUSES.PROSES_PENGUJIAN, FPPL_STATUSES.SELESAI].includes(normalizedStatus);
    const lhuPickupStageIsRelevant = hasPickupData || normalizedStatus === FPPL_STATUSES.SELESAI;

    const showScheduleSection = canProceedAfterKasiDecision && !isStoppedRequest && scheduleStageIsRelevant;
    const showSampleReceiptSection = canProceedAfterKasiDecision && !isStoppedRequest && sampleReceiptStageIsRelevant;
    const showSampleParameterSection = requestSamplesForDetail.length > 0 || (canProceedAfterAdminValidation && (hasMethodDecision || hasGeneratedSamples || [
      FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER,
      FPPL_STATUSES.MENUNGGU_PEMBAYARAN,
      FPPL_STATUSES.MENUNGGU_SAMPEL,
      FPPL_STATUSES.PROSES_PENGUJIAN,
      FPPL_STATUSES.SELESAI,
      FPPL_STATUSES.DITOLAK_ADMIN,
      FPPL_STATUSES.DITOLAK_KASI,
      FPPL_STATUSES.DITOLAK_PENYELIA,
    ].includes(normalizedStatus)));
    const showLhuDocumentSection = !isRejectedByAdmin && !isRejectedByKasi && lhuStageIsRelevant;
    const showLhuPickupSection = !isStoppedRequest && lhuPickupStageIsRelevant;
    const hiddenStageNotice = isRejectedByAdmin
      ? 'Permohonan ini ditolak/dibatalkan pada tahap validasi admin, sehingga jadwal sampel, penerimaan sampel, LHU, dan pengambilan LHU tidak ditampilkan.'
      : isRejectedByKasi
        ? 'Permohonan ini ditolak pada tahap penentuan metode Kasi, sehingga jadwal sampel, penerimaan sampel, LHU, dan pengambilan LHU tidak ditampilkan.'
        : isStoppedRequest
          ? 'Permohonan ini sudah berhenti pada status akhir, sehingga tahapan lanjutan hanya ditampilkan jika datanya memang sudah pernah terbentuk.'
          : '';
    const requestTrackingSteps = getRequestTrackingSteps(selectedRequest);
    const formatTimelineDateOrEmpty = (dateValue, timeValue = null) => (
      dateValue ? formatTimelineDate(dateValue, timeValue) : ''
    );
    const makeTimelineItem = ({ status, note, dateValue = null, timeValue = null, type, sortOrder, sortTimestamp = null }) => ({
      status,
      note,
      date: formatTimelineDateOrEmpty(dateValue, timeValue),
      type,
      sortOrder,
      sortTimestamp: sortTimestamp ?? getTimestamp(dateValue, timeValue),
    });

    const enrichedRequestTrackingSteps = requestTrackingSteps.map((step) => {
      if (step.key === 'method') {
        return {
          ...step,
          date: methodDecisionDate,
        };
      }

      if (step.key === 'payment') {
        return {
          ...step,
          date: pickFirstFilledValue(step.date, getPaymentConfirmedDate(invoiceInfo)),
          description: getPaymentTimelineDescription(invoiceInfo, 'admin'),
        };
      }

      return step;
    });

    const baseRequestTimelineItems = enrichedRequestTrackingSteps
      .filter((step) => step.state !== 'pending' && ['created', 'verified', 'method', 'payment'].includes(step.key))
      .map((step) => {
        const orderMap = {
          created: 10,
          verified: 20,
          method: 30,
          payment: 50,
        };

        return makeTimelineItem({
          status: step.label,
          note: step.description,
          dateValue: step.date,
          timeValue: step.time,
          type: 'Permohonan',
          sortOrder: orderMap[step.key] || 999,
        });
      });

    const sampleScheduleTimelineItems = activeSchedule
      ? [
          makeTimelineItem({
            status: isOfficerSampling ? 'Jadwal pengambilan sampel ditetapkan' : 'Jadwal pengantaran sampel ditetapkan',
            note: `${isOfficerSampling ? 'Jadwal pengambilan sampel' : 'Jadwal pengantaran sampel'} telah ditentukan admin untuk ${formatDateTime(scheduleTargetDate, scheduleTargetTime)}${isOfficerSampling && scheduleOfficerName ? ` oleh Petugas ${scheduleOfficerName}` : ''}.`,
            dateValue: scheduleDecisionDate,
            timeValue: scheduleDecisionDate === scheduleTargetDate ? scheduleTargetTime : null,
            type: 'Jadwal Sampel',
            sortOrder: 60,
          }),
        ]
      : [];

    const scheduleChangeTimelineItems = scheduleChangeRows.map((row) => {
      const jenisJadwal = row.jenis_jadwal === 'LHU' ? 'LHU' : 'sampel';
      const statusPengajuan = row.status_pengajuan || row.statusPengajuan;
      const jadwalLama = row.tanggal_sebelumnya
        ? formatDateTime(row.tanggal_sebelumnya, row.jam_sebelumnya)
        : 'Belum ada jadwal lama';
      const jadwalUsulan = row.tanggal_usulan
        ? formatDateTime(row.tanggal_usulan, row.jam_usulan)
        : '-';
      const decisionDate = statusPengajuan === 'Menunggu Persetujuan Admin'
        ? row.diajukan_pada
        : (row.updated_at || row.diajukan_pada);
      const noteParts = [
        statusPengajuan === 'Disetujui'
          ? `Rentang jadwal: ${jadwalLama} → jadwal baru ${jadwalUsulan}.`
          : `Rentang jadwal: ${jadwalLama} → usulan ${jadwalUsulan}.`,
        row.alasan_pengajuan ? `Alasan pelanggan: ${withOnePeriod(row.alasan_pengajuan)}` : null,
        row.catatan_admin ? `Catatan admin: ${withOnePeriod(row.catatan_admin)}` : null,
      ].filter(Boolean);

      const status = statusPengajuan === 'Disetujui'
        ? `Jadwal ulang ${jenisJadwal} disetujui`
        : statusPengajuan === 'Ditolak'
          ? `Jadwal ulang ${jenisJadwal} ditolak`
          : `Pengajuan jadwal ulang ${jenisJadwal}`;

      return makeTimelineItem({
        status,
        note: noteParts.join(' '),
        dateValue: decisionDate,
        type: 'Pengajuan Jadwal',
        sortOrder: 55,
      });
    });

    const sampleReceivedGroups = new Map();
    adminSampleRows.forEach(({ actualSample, sampleTypeName }) => {
      if (!actualSample?.no_sampel) return;

      const dateValue = pickFirstFilledValue(
        actualSample?.diterima_pada,
        actualSample?.diterimaPada,
        actualSample?.tanggal_penerimaan,
        actualSample?.tanggalPenerimaan,
        actualSample?.tanggal_terima,
        actualSample?.tanggalTerima,
        actualSample?.tanggal_diterima,
        actualSample?.tanggalDiterima
      );
      const timeValue = pickFirstFilledValue(actualSample?.jam_penerimaan, actualSample?.jamPenerimaan, actualSample?.jam_terima, actualSample?.jamTerima);
      const key = `${dateValue || 'tanpa-tanggal'}__${timeValue || ''}`;

      if (!sampleReceivedGroups.has(key)) {
        sampleReceivedGroups.set(key, { dateValue, timeValue, labels: [] });
      }

      sampleReceivedGroups.get(key).labels.push(getSampleDisplayLabel(actualSample.no_sampel, sampleTypeName));
    });

    const sampleReceivedTimelineItems = Array.from(sampleReceivedGroups.values()).map((group) => makeTimelineItem({
      status: 'Sampel diterima',
      note: `${joinLabels(group.labels)} telah diterima oleh admin.`,
      dateValue: group.dateValue,
      timeValue: group.timeValue,
      type: 'Sampel',
      sortOrder: 70,
    }));

    const sampleTestingRows = adminSampleRows
      .filter(({ actualSample, lhu }) => actualSample?.no_sampel && hasTestingFlow(actualSample, lhu));
    const sampleTestingTimestamp = sampleReceiptDateTime.date
      ? getTimestamp(sampleReceiptDateTime.date, sampleReceiptDateTime.time) + 1
      : 0;
    const sampleTestingTimelineItems = sampleTestingRows.length
      ? [
          makeTimelineItem({
            status: 'Sampel masuk pengujian',
            note: `${joinLabels(sampleTestingRows.map(({ actualSample, sampleTypeName }) => getSampleDisplayLabel(actualSample.no_sampel, sampleTypeName)))} masuk ke alur penugasan dan pengujian analis.`,
            type: 'Sampel',
            sortOrder: 80,
            sortTimestamp: sampleTestingTimestamp,
          }),
        ]
      : [];

    const revisionTimelineItems = adminSampleRows.flatMap(({ actualSample, sampleTypeName }) => {
      const noSampel = actualSample?.no_sampel || '-';
      const sampleLabel = getSampleDisplayLabel(noSampel, sampleTypeName);

      return collectLkaHasilTimelineRows(actualSample, parameterNameByMethodId).flatMap(({ row, parameterName }) => {
        const parameterText = parameterName ? ` pada parameter ${parameterName}` : '';
        const penyeliaDate = pickFirstFilledValue(row?.revisi_penyelia_at, row?.revisiPenyeliaAt);
        const kasiDate = pickFirstFilledValue(row?.revisi_kasi_pengujian_at, row?.revisiKasiPengujianAt);
        const penyeliaNote = stripRevisionPrefix(row?.catatan_revisi_hasil_penyelia || row?.catatanRevisiHasilPenyelia);
        const kasiNote = stripRevisionPrefix(row?.catatan_revisi_hasil_kasi_pengujian || row?.catatanRevisiHasilKasiPengujian);
        const rows = [];

        if (penyeliaDate || penyeliaNote) {
          rows.push(makeTimelineItem({
            status: 'Revisi dari Penyelia',
            note: `${sampleLabel} — Penyelia meminta revisi${parameterText}.${penyeliaNote ? ` Catatan: ${withOnePeriod(penyeliaNote)}` : ''}`,
            dateValue: penyeliaDate,
            type: 'Sampel',
            sortOrder: 90,
          }));
        }

        if (kasiDate || kasiNote) {
          rows.push(makeTimelineItem({
            status: 'Revisi dari Kasi',
            note: `${sampleLabel} — Kasi Pengujian meminta revisi${parameterText}.${kasiNote ? ` Catatan: ${withOnePeriod(kasiNote)}` : ''}`,
            dateValue: kasiDate,
            type: 'Sampel',
            sortOrder: 90,
          }));
        }

        return rows;
      });
    });

    const kasiRevisionReviewTimelineItems = buildKasiRevisionReviewTimelineItems(selectedRequest, makeTimelineItem);

    const lhuTimelineItems = lhuTimelineGroups.flatMap(({ nomorLhu, lhu, sampleText }) => {
      const items = [];
      const createdDate = getLhuCreatedDateValue(lhu);
      const approvedDate = getLhuApprovedDateValue(lhu);
      const acuanText = removeTrailingPeriod(lhu?.acuan_bm);

      if (nomorLhu && createdDate) {
        items.push(makeTimelineItem({
          status: 'LHU telah difinalisasi QC',
          note: `LHU ${nomorLhu} untuk sampel ${sampleText} telah difinalisasi QC dan telah disahkan melalui finalisasi QC.${acuanText ? ` Acuan: ${acuanText}.` : ''}`,
          dateValue: createdDate,
          type: 'LHU',
          sortOrder: 100,
        }));
      }

      if (String(lhu?.status_lhu || lhu?.statusLhu || '') === 'Disahkan' || approvedDate) {
        items.push(makeTimelineItem({
          status: 'LHU disahkan',
          note: `LHU ${nomorLhu} untuk sampel ${sampleText} telah disahkan melalui finalisasi QC.`,
          dateValue: approvedDate || createdDate,
          type: 'LHU',
          sortOrder: 110,
        }));
      }

      return items;
    });

    const pickupScheduleDate = pickupInfo?.dijadwalkan_pada || pickupInfo?.dijadwalkanPada || pickupInfo?.created_at || pickupInfo?.createdAt || pickupInfo?.tanggal_pengambilan;
    const pickupTimelineItems = pickupInfo
      ? [
          makeTimelineItem({
            status: 'Jadwal pengambilan LHU',
            note: 'LHU selesai. Admin sudah membuat jadwal pengambilan LHU.',
            dateValue: pickupScheduleDate,
            timeValue: pickupScheduleDate === pickupInfo.tanggal_pengambilan ? pickupInfo.jam_pengambilan : null,
            type: 'Pengambilan LHU',
            sortOrder: 120,
          }),
          makeTimelineItem({
            status: 'LHU siap diambil',
            note: 'LHU sudah dijadwalkan dan siap diambil sesuai jadwal pengambilan.',
            dateValue: pickupScheduleDate,
            timeValue: pickupScheduleDate === pickupInfo.tanggal_pengambilan ? pickupInfo.jam_pengambilan : null,
            type: 'Pengambilan LHU',
            sortOrder: 121,
          }),
          ...(pickupInfo.status_pengambilan === 'Sudah Diambil'
            ? [
                makeTimelineItem({
                  status: 'Selesai',
                  note: `LHU sudah diambil oleh ${pickupInfo.nama_pengambil || 'pelanggan'}.`,
                  dateValue: pickupInfo.diambil_pada,
                  type: 'Pengambilan LHU',
                  sortOrder: 130,
                }),
              ]
            : []),
        ]
      : [];

    const timelineItems = [
      ...baseRequestTimelineItems,
      ...scheduleChangeTimelineItems,
      ...sampleScheduleTimelineItems,
      ...sampleReceivedTimelineItems,
      ...sampleTestingTimelineItems,
      ...revisionTimelineItems,
      ...kasiRevisionReviewTimelineItems,
      ...lhuTimelineItems,
      ...pickupTimelineItems,
    ]
      .filter((item) => item.status && item.note)
      .sort((a, b) => {
        const orderA = Number(a.sortOrder || 999);
        const orderB = Number(b.sortOrder || 999);
        const timeA = Number(a.sortTimestamp || 0);
        const timeB = Number(b.sortTimestamp || 0);

        if (timeA && timeB && timeA !== timeB) return timeA - timeB;
        if (orderA !== orderB) return orderA - orderB;
        return 0;
      });

    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
              <button
                onClick={() => {
                  if (typeof onBackToList === 'function') {
                    onBackToList();
                    return;
                  }

                  setSelectedRequest(null);
                  setValidationDecision('');
                  setValidationNote('');
                  setShowDeferredPaymentModal(false);
                  setDeferredPaymentNote('');
                }}                
                className="flex items-center gap-2 py-4  text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Daftar
              </button>
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <h1 className="text-2xl font-semibold text-gray-900">{selectedRequest.id_registrasi}</h1>
                  {getStatusBadge(selectedRequest.status_fppl)}
                </div>
                <p className="text-lg font-medium text-gray-900 mb-1">
                  {customer?.nama_instansi || '-'}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  PIC: {customer?.pic || '-'} • Tel: {customer?.no_telp || '-'}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{sampleTypes}</span>
                  <span>•</span>
                  <span>{formatDate(selectedRequest.tanggal_pendaftaran)}</span>
                </div>
              </div>

            </div>
          </div>

          {pendingScheduleChanges.length > 0 && (
            <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all">
              <div className="border-b border-gray-100 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <CalendarClock className="mt-0.5 h-6 w-6 text-emerald-600" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Pengajuan Perubahan Jadwal</h2>
                      <p className="mt-1 text-sm text-gray-600">
                        Pelanggan mengajukan perubahan jadwal. Admin dapat menyetujui atau menolak langsung dari detail ini.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                    Menunggu Persetujuan Admin
                  </span>
                </div>
              </div>

              <div className="space-y-4 px-6 pb-6 pt-4">
                {pendingScheduleChanges.map((row) => {
                  const idPengajuan = row.id_pengajuan_jadwal || row.idPengajuanJadwal;
                  const catatanValue = scheduleDecisionNotes[idPengajuan] || '';

                  return (
                    <div key={idPengajuan} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="space-y-4">
                          <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-emerald-700">
                                  {row.jenis_jadwal === 'LHU' ? 'Jadwal Pengambilan LHU' : 'Jadwal Pengambilan/Pengantaran Sampel'}
                                </p>
                                <p className="mt-1 text-base font-semibold text-gray-900">
                                  Pengajuan #{idPengajuan}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Jadwal lama</p>
                              <p className="mt-1 text-sm font-semibold text-gray-900">
                                {formatDateTime(row.tanggal_sebelumnya, row.jam_sebelumnya)}
                              </p>
                            </div>
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Usulan baru</p>
                              <p className="mt-1 text-sm font-semibold text-emerald-900">
                                {formatDateTime(row.tanggal_usulan, row.jam_usulan)}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Alasan pelanggan</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{row.alasan_pengajuan || '-'}</p>
                          </div>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                          <div className="space-y-4">
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-gray-800">
                                Catatan admin
                                <span className="block text-xs font-normal text-gray-500">
                                  Opsional untuk setujui, wajib untuk tolak.
                                </span>
                              </label>
                              <textarea
                                rows={5}
                                value={catatanValue}
                                onChange={(event) => onScheduleDecisionNoteChange?.(idPengajuan, event.target.value)}
                                placeholder="Tulis catatan admin di sini."
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                                disabled={saving}
                              />
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                              <button
                                type="button"
                                onClick={() => handleDecideScheduleChange?.(idPengajuan, 'approve')}
                                disabled={saving}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Setujui
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDecideScheduleChange?.(idPengajuan, 'reject')}
                                disabled={saving}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <XCircle className="h-4 w-4" />
                                Tolak
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {hiddenStageNotice && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {hiddenStageNotice}
            </div>
          )}

          <TimelineStatusSection
            expandedSection={expandedSection}
            toggleSection={toggleSection}
            timelineItems={timelineItems}
          />

          <AdminPermohonanValidationSection
            expandedSection={expandedSection}
            toggleSection={toggleSection}
            customer={customer}
            selectedRequest={selectedRequest}
            sampleTypes={sampleTypes}
            parameters={parameters}
            validationDecision={validationDecision}
            setValidationDecision={setValidationDecision}
            validationNote={validationNote}
            setValidationNote={setValidationNote}
            selectedSamplingTariffId={selectedSamplingTariffId}
            setSelectedSamplingTariffId={setSelectedSamplingTariffId}
            samplingTariffList={samplingTariffList}
            handleSaveValidation={handleSaveValidation}
            saving={saving}
            setShowDeferredPaymentModal={setShowDeferredPaymentModal}
            showDeferredPaymentModal={showDeferredPaymentModal}
            deferredPaymentNote={deferredPaymentNote}
            setDeferredPaymentNote={setDeferredPaymentNote}
            handleDeferredPaymentByAdmin={handleDeferredPaymentByAdmin}
          />

        {showScheduleSection && (
        <AdminPermohonanScheduleSection
          selectedRequest={selectedRequest}
          expandedSection={expandedSection}
          toggleSection={toggleSection}
          activeSchedule={activeSchedule}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          setExpandedSection={setExpandedSection}
          sampelRef={sampelRef}
          showScheduleInputs={showScheduleInputs}
          setShowScheduleInputs={setShowScheduleInputs}
          scheduleForm={scheduleForm}
          setScheduleForm={setScheduleForm}
          isBusinessDay={isBusinessDay}
          scheduleError={scheduleError}
          setScheduleError={setScheduleError}
          timeOptions={timeOptions}
          pccOptions={pccOptions}
          handleSaveSamplingSchedule={handleSaveSamplingSchedule}
          saving={saving}
        />
        )}

          {showSampleReceiptSection && (
          <AdminPermohonanSampleReceiptSection
            selectedRequest={selectedRequest}
            expandedSection={expandedSection}
            toggleSection={toggleSection}
            sampelRef={sampelRef}
            sampelFormList={sampelFormList}
            setSampelFormList={setSampelFormList}
                setSampleReceiptError={setSampleReceiptError}
            sampleReceiptError={sampleReceiptError}
            generateSampleIds={generateSampleIds}
            saving={saving}
          />
          )}

          {showSampleParameterSection && (
          <SampleParameterDetailSection
            sectionRef={sampleDetailRef}
            selectedRequest={selectedRequest}
            expandedSection={expandedSection}
            toggleSection={toggleSection}
            formatDate={formatDate}
            formatDateTime={formatDateTime}
          />
          )}

          {showLhuDocumentSection && (
          <LhuDocumentSection
            expandedSection={expandedSection}
            toggleSection={toggleSection}
            adminSampleRows={adminSampleRows}
            getLhuFilePath={getLhuFilePath}
            getLhuStatusBadge={getLhuStatusBadge}
            formatDate={formatDate}
            openGeneratedFile={openGeneratedFile}
            onOpenSignedLhu={onOpenSignedLhu}
            onOpenUploadSignedModal={onOpenUploadSignedModal}
          />
          )}

          {showLhuPickupSection && (
          <LhuPickupInfoSection
            expandedSection={expandedSection}
            toggleSection={toggleSection}
            pickupInfo={pickupInfo}
            getPickupStatusBadge={getPickupStatusBadge}
            formatDate={formatDate}
            formatDateTime={formatDateTime}
          />
          )}

        </div>
      </div>
    );
}
