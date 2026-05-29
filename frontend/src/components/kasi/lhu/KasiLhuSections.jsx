import {
  AlertCircle,
  CheckCircle,
  ClipboardCheck,
  Eye,
  FileText,
  Filter,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import {
  formatDate,
  formatDateTime,
  getCatatanRevisi,
  getNoSampel,
  getStatusBadgeClass,
  getStatusReview,
} from '../../lhu/lhuReviewUtils';
import { WorksheetFilesPreviewPane } from '../../penyelia/penugasan/detail/WorksheetFilesPreviewPane';

function StatCard({ title, subtitle, value, icon, iconBg, iconColor, onClick }) {
  const IconComponent = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={typeof onClick !== 'function'}
      className="w-full rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-default disabled:hover:translate-y-0"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className={`rounded-lg p-3 ${iconBg}`}>
          <IconComponent className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>

      <p className="mb-1 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mb-1 text-sm font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-600">{subtitle}</p>
    </button>
  );
}

export function KasiLhuHistoryTable({
  filteredHistoryRows,
  loadingHistory,
  onOpenDetail,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Riwayat Hasil Disetujui Kasi</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Sampel yang sudah pernah disetujui Kasi Pengujian dan diteruskan ke Pengendalian Mutu.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Nomor Sampel</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Nomor FPPL</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Disetujui Kasi</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Status Review</th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {loadingHistory ? (
              <tr>
                <td colSpan={5} className="px-6 py-14 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                    Memuat riwayat LHU...
                  </div>
                </td>
              </tr>
            ) : filteredHistoryRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-14 text-center text-gray-500">Belum ada riwayat hasil yang disetujui.</td>
              </tr>
            ) : (
              filteredHistoryRows.map((item, index) => {
                const noSampel = item.noSampel || item.no_sampel || '';
                const statusReview = item.statusReviewHasil || item.status_review_hasil || '-';
                const reviewTime = item.kasiPengujianReviewAt || item.kasi_pengujian_review_at || '';
                return (
                  <tr key={`${noSampel || item.nomorFppl || item.nomor_fppl || index}`} className="transition-all hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{noSampel || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.nomorFppl || item.nomor_fppl || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{reviewTime ? formatDateTime(reviewTime) : '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(statusReview)}`}>{statusReview}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenDetail?.(item)}
                        disabled={!noSampel}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Eye className="h-4 w-4" />
                        Buka
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
        <p className="text-sm text-gray-600">
          Menampilkan <span className="font-semibold">{filteredHistoryRows.length}</span> sampel
        </p>
      </div>
    </div>
  );
}

export function KasiLhuStats({ summary, onSelectContext }) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
      <StatCard
        title="Total Sampel"
        subtitle="Siap direview"
        value={summary.total}
        icon={FileText}
        iconBg="bg-blue-50"
        iconColor="text-blue-700"
        onClick={() => onSelectContext?.('semua')}
      />

      <StatCard
        title="Belum Direview"
        subtitle="Menunggu review"
        value={summary.menunggu}
        icon={ClipboardCheck}
        iconBg="bg-amber-50"
        iconColor="text-amber-700"
        onClick={() => onSelectContext?.('menunggu')}
      />

      <StatCard
        title="Perlu Revisi"
        subtitle="Dikembalikan ke analis"
        value={summary.revisi}
        icon={AlertCircle}
        iconBg="bg-red-50"
        iconColor="text-red-700"
        onClick={() => onSelectContext?.('revisi')}
      />

      <StatCard
        title="Total Parameter"
        subtitle="Semua parameter"
        value={summary.totalParameter}
        icon={Filter}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-700"
        onClick={() => onSelectContext?.('semua')}
      />
    </div>
  );
}

export function KasiLhuSearchTabs({ activeTab, setActiveTab, searchQuery, onSearchChange }) {
  return (
    <>
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Cari no sampel, nomor FPPL, jenis sampel, nomor LHU, atau status..."
            className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="mb-6 flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('antrean')}
          className={`border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'antrean'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          Butuh Review
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('riwayat')}
          className={`border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'riwayat'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          Riwayat Disetujui
        </button>
      </div>
    </>
  );
}

export function KasiLhuQueueSection({
  filteredRows,
  loadingQueue,
  onOpenModal,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Daftar Sampel Siap Direview
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Sampel muncul jika semua hasil LKA sudah lengkap dan disetujui Penyelia.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1250px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Nomor Sampel
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Nomor FPPL
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Registrasi
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Jenis Sampel
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Tanggal Terima
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Parameter
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Status Review
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {loadingQueue ? (
              <tr>
                <td colSpan={8} className="px-6 py-14 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                    Memuat antrean review hasil...
                  </div>
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-14 text-center text-gray-500">
                  Tidak ada sampel yang menunggu review Kasi Pengujian.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const noSampel = getNoSampel(row);
                const statusReview = getStatusReview(row);
                const catatanRevisi = getCatatanRevisi(row);

                return (
                  <tr key={noSampel} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {noSampel || '-'}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {row.nomorFppl || row.nomor_fppl || '-'}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {row.idRegistrasi || row.id_registrasi || '-'}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {row.jenisSampel || row.jenis_sampel || '-'}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(row.tanggalPenerimaan || row.tanggal_penerimaan)}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      <span className="font-medium text-gray-900">
                        {row.totalSelesai || row.total_selesai || 0}
                      </span>
                      <span className="text-gray-500">
                        {' '}
                        / {row.totalParameter || row.total_parameter || 0}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(
                          statusReview
                        )}`}
                      >
                        {statusReview}
                      </span>
                      {catatanRevisi ? (
                        <p className="mt-1 max-w-xs truncate text-xs text-red-600">
                          {catatanRevisi}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => onOpenModal(row)}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700"
                      >
                        <Eye className="h-4 w-4" />
                        Lihat Hasil
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


export function KasiApproveConfirmModal({ approveModal, actionLoading, onClose, onSubmit }) {
  if (!approveModal?.open) return null;

  const noSampel = approveModal.noSampel || '-';
  const isLoading = actionLoading === `approve-${noSampel}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle className="h-7 w-7" />
        </div>

        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900">Setujui Hasil Pengujian</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Konfirmasi persetujuan hasil sampel oleh Kasi Pengujian.
          </p>
        </div>

        <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center">
          <p className="text-sm text-gray-700">Sampel yang akan disetujui</p>
          <p className="mt-1 text-base font-bold text-emerald-800">{noSampel}</p>
        </div>

        <p className="mt-4 text-center text-sm leading-6 text-gray-600">
          Setelah disetujui, sampel akan keluar dari antrean review Kasi Pengendalian Mutu dan masuk ke riwayat disetujui.
        </p>

        <div className="mt-6 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Setujui Hasil
          </button>
        </div>
      </div>
    </div>
  );
}

export { KasiLhuReviewModal } from './KasiLhuReviewModal.jsx';
