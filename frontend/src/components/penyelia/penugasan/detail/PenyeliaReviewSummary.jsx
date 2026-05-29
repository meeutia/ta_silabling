import { formatDateOnly, getStatusClass } from './penyeliaPenugasanDetailUtils';

export function PenyeliaReviewSummary({ detailData, summary }) {
  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-sm text-gray-500">ID Tugas</p>
          <p className="text-lg font-bold text-gray-900">
            {detailData.idPenugasan}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-sm text-gray-500">Analis</p>
          <p className="text-lg font-bold text-gray-900">
            {detailData.analis}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-sm text-gray-500">Worksheet Submit</p>
          <p className="text-lg font-bold text-amber-600">
            {summary.totalWorksheetSubmitted}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-sm text-gray-500">Disetujui</p>
          <p className="text-lg font-bold text-emerald-600">
            {summary.totalDisetujui}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-sm text-gray-500">Status Penugasan</p>

            <span
              className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(detailData.statusPenugasan)}`}
            >
              {detailData.statusPenugasan}
            </span>
          </div>

          <div>
            <p className="text-sm text-gray-500">Penyelia Penugasan</p>
            <p className="mt-2 font-medium text-gray-900">
              {detailData.penyeliaPenugasan ||
                detailData.penyelia ||
                detailData.penyeliaNama ||
                detailData.penyelia_nama ||
                '-'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Assigned At</p>
            <p className="mt-2 font-medium text-gray-900">
              {formatDateOnly(detailData.assignedAt)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Catatan Penugasan</p>
            <p className="mt-2 font-medium text-gray-900">
              {detailData.catatanPenugasan || '-'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
