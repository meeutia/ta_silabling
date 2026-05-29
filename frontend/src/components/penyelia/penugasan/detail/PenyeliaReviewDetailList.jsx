import { AlertCircle, CalendarDays, CheckCircle, Eye, Loader2 } from 'lucide-react';
import {
  InfoRow,
  canApproveDetail,
  canEditDetailDeadline,
  canRequestRevisionToAnalyst,
  formatDateOnly,
  getAbnormalitasSampel,
  getAcuanPengambilanSampel,
  getKoordinatSampel,
  getKondisiSampel,
  getPenyeliaResponseNote,
  getSampleKasiPengujianRevisionNote,
  getSamplePenyeliaRevisionNote,
  getSampleReviewStatus,
  getStatusClass,
  getTanggalPenerimaanSampel,
  getTanggalPengambilanSampel,
  isWorksheetSubmitted,
} from './penyeliaPenugasanDetailUtils';

function getWorksheetRevisionNote(detail = {}) {
  return String(
    detail.worksheet?.lkaRevisionNote ||
      detail.worksheet?.lka_revision_note ||
      detail.worksheet?.catatanRevisiGlobal ||
      detail.worksheet?.catatan_revisi_global ||
      detail.worksheet?.catatanRevisiLka ||
      detail.worksheet?.catatan_revisi_lka ||
      detail.worksheet?.catatanRevisi ||
      detail.worksheet?.catatan_revisi ||
      detail.lkaRevisionNote ||
      detail.lka_revision_note ||
      detail.catatanRevisiGlobal ||
      detail.catatan_revisi_global ||
      detail.catatanRevisiLka ||
      detail.catatan_revisi_lka ||
      detail.catatanRevisi ||
      detail.catatan_revisi ||
      ''
  ).trim();
}

function isPerSampleRevisionAggregate(detail = {}, note = '') {
  const cleanNote = String(note || '').trim();

  if (!cleanNote) return false;

  const samples = detail.samples || detail.results || detail.sampels || [];
  const sampleNos = samples
    .map((sample) => sample.noSampel || sample.no_sampel)
    .filter(Boolean);

  const containsSampleLabel = sampleNos.some((noSampel) =>
    cleanNote.includes(`${noSampel}:`)
  );

  const hasSampleCodePattern = /\b\d+\/[A-Z]{2,}\/[IVXLCDM]+\/\d{4}\s*:/i.test(cleanNote);

  return containsSampleLabel || hasSampleCodePattern;
}

function getWholeLkaRevisionNote(detail = {}) {
  const note = getWorksheetRevisionNote(detail);

  if (!note || isPerSampleRevisionAggregate(detail, note)) {
    return '';
  }

  return note;
}

function getRevisionId(row = {}) {
  return row.idRevisiLka || row.id_revisi_lka || row.id || row.id_revisi || '';
}

function getRevisionKodeLka(row = {}) {
  return row.kodeLka || row.kode_lka || row.lka?.kode_lka || row.lka?.kodeLka || '';
}

function getDetailKodeLka(detail = {}) {
  return detail.worksheet?.kodeLka || detail.worksheet?.kode_lka || detail.kodeLka || detail.kode_lka || '';
}

function isPendingKasiRevision(row = {}) {
  const status = String(row.statusRevisi || row.status_revisi || '').trim().toLowerCase();
  return !status || status === 'menunggu persetujuan penyelia';
}

function getDetailPendingKasiRevisionRequests(detail = {}, pendingKasiRevisions = []) {
  const detailKodeLka = String(getDetailKodeLka(detail) || '').trim();
  const detailSampleNos = new Set(
    (detail.samples || [])
      .map((sample) => sample.noSampel || sample.no_sampel)
      .filter(Boolean)
      .map(String)
  );

  return (pendingKasiRevisions || []).filter((row) => {
    if (!isPendingKasiRevision(row)) return false;

    const revisionKodeLka = String(getRevisionKodeLka(row) || '').trim();
    if (detailKodeLka && revisionKodeLka && detailKodeLka === revisionKodeLka) return true;

    const items = Array.isArray(row.items) ? row.items : [];
    return items.some((item) => {
      const itemKodeLka = String(item.kodeLka || item.kode_lka || row.kodeLka || row.kode_lka || '').trim();
      const itemNoSampel = String(item.noSampel || item.no_sampel || '').trim();
      return (
        (!detailKodeLka || !itemKodeLka || itemKodeLka === detailKodeLka) &&
        itemNoSampel &&
        detailSampleNos.has(itemNoSampel)
      );
    });
  });
}


function getSampleNumber(row = {}) {
  return String(row.noSampel || row.no_sampel || '').trim();
}

function getPendingKasiRevisionForSample(detail = {}, sample = {}, pendingKasiRevisionRequests = []) {
  const sampleNo = getSampleNumber(sample);
  const detailKodeLka = String(getDetailKodeLka(detail) || '').trim();

  if (!sampleNo) return null;

  return (pendingKasiRevisionRequests || []).find((revision) => {
    if (!isPendingKasiRevision(revision)) return false;

    const revisionKodeLka = String(getRevisionKodeLka(revision) || '').trim();
    const items = Array.isArray(revision.items) ? revision.items : [];

    const itemMatch = items.some((item) => {
      const itemNoSampel = String(item.noSampel || item.no_sampel || '').trim();
      const itemKodeLka = String(item.kodeLka || item.kode_lka || revision.kodeLka || revision.kode_lka || '').trim();

      return (
        itemNoSampel === sampleNo &&
        (!detailKodeLka || !itemKodeLka || itemKodeLka === detailKodeLka)
      );
    });

    if (itemMatch) return true;

    return (
      items.length === 0 &&
      detailKodeLka &&
      revisionKodeLka &&
      revisionKodeLka === detailKodeLka
    );
  }) || null;
}

function PenyeliaReviewSamplesTable({
  detail,
  pendingKasiRevisionRequests = [],
  reviewingKasiRevisionId = '',
  onOpenKasiRevisionReview = () => {},
}) {
  return (
    <div className="overflow-x-auto">
      <table style={{ width: '100%', minWidth: '1840px', fontSize: '0.875rem' }}>
        <thead className="border-b border-gray-200 bg-white">
          <tr>
            <th className="w-[150px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              No Sampel
            </th>
            <th className="w-[160px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Tgl Pengambilan
            </th>
            <th className="w-[170px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Tgl Penerimaan
            </th>
            <th className="w-[230px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Acuan Pengambilan
            </th>
            <th className="w-[190px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Kondisi Sampel
            </th>
            <th className="w-[220px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Abnormalitas Sampel
            </th>
            <th className="w-[260px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Koordinat Sampel
            </th>
            <th className="w-[170px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Hasil
            </th>
            <th className="w-[270px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Catatan Hasil
            </th>
            <th style={{ width: '200px' }} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Status
            </th>
            <th style={{ width: '360px' }} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
              Catatan Revisi
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {(detail.samples || []).length === 0 ? (
            <tr>
              <td
                colSpan={11}
                className="px-4 py-8 text-center text-sm text-gray-500"
              >
                Belum ada sampel pada detail ini.
              </td>
            </tr>
          ) : (
            (detail.samples || []).map((sample) => {
              const rowStatus = getSampleReviewStatus(sample, detail);
              const penyeliaRevisionNote = getSamplePenyeliaRevisionNote(sample, detail);
              const kasiRevisionNote = getSampleKasiPengujianRevisionNote(sample, detail);
              const penyeliaResponseNote = getPenyeliaResponseNote(sample);
              const pendingKasiRevision = getPendingKasiRevisionForSample(
                detail,
                sample,
                pendingKasiRevisionRequests
              );
              const pendingKasiRevisionId = getRevisionId(pendingKasiRevision || {});
              const canReviewKasiRevision = Boolean(pendingKasiRevisionId);
              const isReviewingKasiRevision =
                canReviewKasiRevision && reviewingKasiRevisionId === pendingKasiRevisionId;

              return (
                <tr
                  key={`${detail.idPenugasanDetail}-${sample.noSampel || sample.no_sampel}`}
                  className="hover:bg-gray-50"
                >
                  <td className="w-[150px] px-4 py-3 text-sm font-medium text-gray-900">
                    {sample.noSampel || sample.no_sampel}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700 align-top">
                    {formatDateOnly(getTanggalPengambilanSampel(sample))}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700 align-top">
                    {formatDateOnly(getTanggalPenerimaanSampel(sample))}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700 align-top">
                    {getAcuanPengambilanSampel(sample)}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700 align-top">
                    {getKondisiSampel(sample)}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700 align-top">
                    {getAbnormalitasSampel(sample)}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700 align-top">
                    {getKoordinatSampel(sample)}
                  </td>

                  <td className="bg-emerald-50/50 px-4 py-3 text-sm font-semibold text-gray-900 align-top">
                    {sample.hasHasil || sample.has_hasil ? sample.hasil : '-'}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700 align-top">
                    {sample.catatanHasil || sample.catatan_hasil || '-'}
                  </td>

                  <td style={{ width: '200px' }} className="px-4 py-3 align-top">
                    <span
                      style={{ display: 'inline-flex', width: '100%', textAlign: 'center' }}
                      className={`items-center justify-center whitespace-normal rounded-full px-3 py-1 text-xs font-semibold leading-relaxed ${getStatusClass(rowStatus)}`}
                    >
                      {rowStatus}
                    </span>
                  </td>

                  <td style={{ width: '360px' }} className="px-4 py-3 text-sm text-gray-700 align-top">
                    {penyeliaRevisionNote || kasiRevisionNote || penyeliaResponseNote ? (
                      <div style={{ maxHeight: '160px', width: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem', lineHeight: '1.625' }}>
                        {penyeliaRevisionNote && (
                          <div className="whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                            <p className="font-semibold">Catatan Revisi Penyelia</p>
                            <p className="mt-1 font-normal">{penyeliaRevisionNote}</p>
                          </div>
                        )}

                        {kasiRevisionNote && (
                          <button
                            type="button"
                            disabled={!canReviewKasiRevision || isReviewingKasiRevision}
                            onClick={() => onOpenKasiRevisionReview(pendingKasiRevision)}
                            className={`block w-full whitespace-pre-wrap rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs leading-relaxed text-amber-700 transition-all ${
                              canReviewKasiRevision
                                ? 'cursor-pointer hover:border-amber-300 hover:bg-amber-100'
                                : 'cursor-default'
                            } disabled:opacity-70`}
                            title={
                              canReviewKasiRevision
                                ? 'Klik untuk memberi tanggapan penyelia'
                                : 'Tidak ada permintaan revisi Kasi yang menunggu tanggapan'
                            }
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold">Catatan Revisi Kasi Pengujian</p>
                              {canReviewKasiRevision && (
                                <span className="shrink-0 font-semibold text-blue-600 underline underline-offset-2">
                                  Tanggapi
                                </span>
                              )}
                            </div>
                            <p className="mt-1 font-normal">{kasiRevisionNote}</p>
                          </button>
                        )}

                        {penyeliaResponseNote && (
                          <div className="whitespace-pre-wrap rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-700">
                            <p className="font-semibold">Respon Penyelia</p>
                            <p className="mt-1 font-normal">{penyeliaResponseNote}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function PenyeliaReviewDetailCard({
  detail,
  detailData,
  actionLoadingId,
  pendingKasiRevisions,
  reviewingKasiRevisionId,
  onOpenKasiRevisionReview,
  onOpenWorksheet,
  onOpenRevision,
  onOpenDeadline,
  onApprove,
}) {
  const worksheetSubmitted = isWorksheetSubmitted(detail);

  const namaParameter =
    detail.parameter ||
    detail.namaParameter ||
    detail.nama_parameter ||
    '-';

  const namaMetode =
    detail.namaMetode ||
    detail.nama_metode ||
    '-';

  const acuanMetode =
    detail.acuanMetode ||
    detail.acuan_metode ||
    '';

  const metodeText = [
    namaMetode,
    acuanMetode && acuanMetode !== '-' ? acuanMetode : '',
  ]
    .filter(Boolean)
    .join(', ');

  const totalHasil = Number(
    detail.totalHasil ??
      detail.total_hasil ??
      detail.summary?.totalHasil ??
      detail.summary?.total_hasil ??
      0
  );
  const totalSampel = Number(
    detail.totalSampel ??
      detail.total_sampel ??
      detail.summary?.totalSampel ??
      detail.summary?.total_sampel ??
      detail.samples?.length ??
      0
  );
  const pendingKasiRevisionRequests = getDetailPendingKasiRevisionRequests(detail, pendingKasiRevisions);
  const lkaRevisionNote = getWholeLkaRevisionNote(detail);
  const shouldShowLkaRevisionNote = Boolean(lkaRevisionNote);

  return (
    <div
      key={detail.idPenugasanDetail}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1">
            <InfoRow label="Parameter">
              {namaParameter}
            </InfoRow>

            <InfoRow label="Metode">
              {metodeText || '-'}
            </InfoRow>

            <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-600">
              <span>Deadline: {formatDateOnly(detail.deadline)}</span>
              <span>•</span>
              <span>Hasil: {totalHasil}/{totalSampel}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(detail.statusDetail)}`}
            >
              {detail.statusDetail}
            </span>

            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                worksheetSubmitted
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {worksheetSubmitted ? 'Worksheet Submitted' : 'Worksheet Belum Submit'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {shouldShowLkaRevisionNote && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">Keterangan Revisi LKA</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-red-700">
              {lkaRevisionNote}
            </p>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="space-y-1">
                <InfoRow label="Tanggal pengerjaan">
                  {formatDateOnly(
                    detail.worksheet?.tanggalMulaiPengujian ||
                      detail.worksheet?.tanggal_mulai_pengujian
                  )}
                </InfoRow>

                <InfoRow label="Tanggal selesai">
                  {formatDateOnly(
                    detail.worksheet?.tanggalSelesaiPengujian ||
                      detail.worksheet?.tanggal_selesai_pengujian
                  )}
                </InfoRow>

                <InfoRow label="DHL akuades">
                  {detail.worksheet?.dhlAkuades ||
                    detail.worksheet?.dhl_akuades ||
                    '-'}
                </InfoRow>

                <InfoRow label="Dilaporkan oleh">
                  {(detail.worksheet?.dilaporkanOlehNama ||
                    detail.worksheet?.dilaporkan_oleh_nama ||
                    detailData?.analis ||
                    '-') +
                    ' / ' +
                    formatDateOnly(
                      detail.worksheet?.tanggalPelaporan ||
                        detail.worksheet?.tanggal_pelaporan
                    )}
                </InfoRow>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button
                  type="button"
                  onClick={() => onOpenWorksheet(detail)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-100"
                >
                  <Eye className="h-4 w-4" />
                  Lihat File Worksheet
                </button>

                <button
                  type="button"
                  disabled={
                    !canEditDetailDeadline(detail) ||
                    actionLoadingId === detail.idPenugasanDetail
                  }
                  onClick={() => onOpenDeadline(detail)}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-all hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  title={
                    canEditDetailDeadline(detail)
                      ? 'Ubah deadline penugasan analis'
                      : 'Deadline terkunci karena LKA sudah disetujui Penyelia'
                  }
                >
                  <CalendarDays className="h-4 w-4" />
                  Edit Deadline
                </button>

                <button
                  type="button"
                  disabled={
                    !canRequestRevisionToAnalyst(detail) ||
                    actionLoadingId === detail.idPenugasanDetail
                  }
                  onClick={() => onOpenRevision(detail)}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-all hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <AlertCircle className="h-4 w-4" />
                  Minta Revisi
                </button>

                <button
                  type="button"
                  disabled={
                    !canApproveDetail(detail) ||
                    actionLoadingId === detail.idPenugasanDetail
                  }
                  onClick={() => onApprove(detail)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoadingId === detail.idPenugasanDetail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Setujui
                </button>
              </div>
            </div>


          </div>
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h3 className="font-semibold text-gray-700">
              Hasil Pengujian per Sampel
            </h3>

            <span className="text-xs font-medium text-gray-500">
              Data diinput oleh Analis
            </span>
          </div>

          <PenyeliaReviewSamplesTable
            detail={detail}
            pendingKasiRevisionRequests={pendingKasiRevisionRequests}
            reviewingKasiRevisionId={reviewingKasiRevisionId}
            onOpenKasiRevisionReview={onOpenKasiRevisionReview}
          />
        </div>

        {detail.catatanDetail && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-semibold text-gray-700">
              Catatan Detail
            </p>

            <p className="mt-1 text-sm text-gray-700">
              {detail.catatanDetail}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function PenyeliaReviewDetailList({
  detailData,
  actionLoadingId,
  pendingKasiRevisions = [],
  reviewingKasiRevisionId = '',
  onOpenKasiRevisionReview = () => {},
  onOpenWorksheet,
  onOpenRevision,
  onOpenDeadline,
  onApprove,
}) {
  return (
    <div className="space-y-6">
      {(detailData.details || []).map((detail) => (
        <PenyeliaReviewDetailCard
          key={detail.idPenugasanDetail}
          detail={detail}
          detailData={detailData}
          actionLoadingId={actionLoadingId}
          pendingKasiRevisions={pendingKasiRevisions}
          reviewingKasiRevisionId={reviewingKasiRevisionId}
          onOpenKasiRevisionReview={onOpenKasiRevisionReview}
          onOpenWorksheet={onOpenWorksheet}
          onOpenRevision={onOpenRevision}
          onOpenDeadline={onOpenDeadline}
          onApprove={onApprove}
        />
      ))}
    </div>
  );
}
