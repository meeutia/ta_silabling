import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Eye,
  FlaskRound,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { DashboardMetricCard } from '../../common/DashboardWidgets';
import {
  formatRevisionDate,
  getRevisionItemsNote,
  getRevisionItemsText,
} from './penyeliaKasiRevisionUtils';

export function PenyeliaPenugasanHeader({ onOpenAssignModal }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Monitoring Penugasan</h1>
        <p className="text-gray-600">
          Pantau antrian kerja, penugasan aktif, dan hasil subkontrak dalam satu halaman.
        </p>
      </div>

      <button
        onClick={onOpenAssignModal}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emerald-700"
      >
        <UserPlus className="h-5 w-5" />
        Buat Penugasan
      </button>
    </div>
  );
}

export function PenyeliaPenugasanSummary({
  totalPendingItems,
  totalBelumDitugaskan,
  totalMonitorGroups = 0,
  totalSubkontrakGroups = 0,
  loading = false,
  onChangeTab = null,
}) {
  const metrics = [
    {
      label: 'Parameter-Metode Pending',
      sublabel: 'Belum masuk penugasan',
      value: totalPendingItems,
      icon: ClipboardList,
      color: 'bg-blue-100 text-blue-700',
      iconBg: 'bg-blue-50',
      trend: 'Antrian',
      onClick: () => onChangeTab?.('buat'),
    },
    {
      label: 'Sampel Belum Ditugaskan',
      sublabel: 'Perlu dibuatkan tugas',
      value: totalBelumDitugaskan,
      icon: AlertCircle,
      color: 'bg-red-100 text-red-700',
      iconBg: 'bg-red-50',
      trend: 'Prioritas',
      onClick: () => onChangeTab?.('buat'),
    },
    {
      label: 'Penugasan Aktif',
      sublabel: 'Belum selesai',
      value: totalMonitorGroups,
      icon: Users,
      color: 'bg-violet-100 text-violet-700',
      iconBg: 'bg-violet-50',
      trend: 'Aktif',
      onClick: () => onChangeTab?.('monitor'),
    },
    {
      label: 'Subkontrak',
      sublabel: 'Belum lengkap hasil',
      value: totalSubkontrakGroups,
      icon: FlaskRound,
      color: 'bg-amber-100 text-amber-700',
      iconBg: 'bg-amber-50',
      trend: 'Eksternal',
      onClick: () => onChangeTab?.('subkontrak'),
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <DashboardMetricCard key={metric.label} metric={metric} loading={loading} />
      ))}
    </div>
  );
}

export function PenyeliaPenugasanSearchPanel({ searchQuery, onSearchChange }) {
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cari no sampel, pelanggan, jenis sampel, parameter, atau metode..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
        />
      </div>
    </div>
  );
}

export function PenyeliaPenugasanTabs({ activeTab, onChangeTab }) {
  const tabs = [
    { key: 'buat', label: 'Butuh Penugasan' },
    { key: 'monitor', label: 'Monitoring Penugasan' },
    { key: 'subkontrak', label: 'Hasil Subkontrak' },
  ];

  return (
    <div className="mb-6 flex border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChangeTab(tab.key)}
          className={`border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === tab.key
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function MonitorAssignmentTable({
  loadingMonitor,
  groupedMonitorRows,
  onViewDetail,
  formatDateOnly,
  getMonitorStatusClass,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <h2 className="text-base font-semibold text-gray-900">Monitoring Penugasan</h2>
        <p className="mt-1 text-sm text-gray-600">
          Daftar penugasan aktif yang sedang dipantau penyelia.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                No
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Analis
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Tanggal Penugasan
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {loadingMonitor ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-emerald-600" />
                  Memuat monitoring...
                </td>
              </tr>
            ) : groupedMonitorRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  Belum ada penugasan.
                </td>
              </tr>
            ) : (
              groupedMonitorRows.map((group, index) => (
                <tr key={group.idPenugasan} className="transition-all hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{group.analis}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {formatDateOnly(group.assignedAt)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getMonitorStatusClass(group.statusRingkas)}`}
                    >
                      {group.statusRingkas}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        const idPenugasan = group.idPenugasan || group.id_penugasan;
                        if (!idPenugasan || typeof onViewDetail !== 'function') return;
                        onViewDetail(idPenugasan);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 font-medium transition-all hover:bg-gray-100"
                    >
                      <Eye className="h-4 w-4" />
                      Detail
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PendingAssignmentTable({
  loadingPending,
  errorPending,
  filteredPendingItems,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <h2 className="text-base font-semibold text-gray-900">Butuh Penugasan</h2>
        <p className="mt-1 text-sm text-gray-600">
          Sampel yang masih menunggu dibuatkan penugasan analis.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                No Sampel
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Pelanggan
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Jenis Sampel
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Parameter
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Metode
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {loadingPending ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-emerald-600" />
                  Memuat antrian penugasan...
                </td>
              </tr>
            ) : errorPending ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-red-500">
                  {errorPending}
                </td>
              </tr>
            ) : filteredPendingItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  Tidak ada sampel yang menunggu penugasan.
                </td>
              </tr>
            ) : (
              filteredPendingItems.map((item) => {
                const rowKey = item.rowKey || `${item.id_fppl_parameter_metode || 'pending'}-${item.noSampel || item.no_sampel || ''}`;

                return (
                  <tr key={rowKey} className="transition-all hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {item.noSampel || item.no_sampel || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {item.pelanggan || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {item.jenis_sampel || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {item.nama_parameter || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {item.nama_metode || '-'}
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



export function KasiRevisionReviewTable({
  loadingKasiRevisions,
  errorKasiRevisions,
  pendingKasiRevisions,
  reviewingKasiRevisionId,
  onReviewKasiRevision,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <h2 className="text-base font-semibold text-gray-900">Permintaan Revisi dari Kasi Pengujian</h2>
        <p className="mt-1 text-sm text-gray-600">
          Penyelia meninjau permintaan revisi sebelum hasil dikembalikan ke analis.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                ID Revisi
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Kode LKA
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Sampel/Hasil
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Catatan Kasi
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Diajukan
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {loadingKasiRevisions ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-emerald-600" />
                  Memuat permintaan revisi Kasi...
                </td>
              </tr>
            ) : errorKasiRevisions ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-red-500">
                  {errorKasiRevisions}
                </td>
              </tr>
            ) : pendingKasiRevisions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Tidak ada permintaan revisi Kasi yang menunggu tinjauan penyelia.
                </td>
              </tr>
            ) : (
              pendingKasiRevisions.map((row) => {
                const id = row.id_revisi_lka || row.idRevisiLka;
                const isReviewing = reviewingKasiRevisionId === id;
                const pengaju = row.PengajuRevisi || row.pengajuRevisi || {};

                return (
                  <tr key={id} className="transition-all hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {row.kode_lka || row.kodeLka || row.lka?.kode_lka || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="max-w-[360px] whitespace-pre-line">
                        {getRevisionItemsText(row)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="max-w-[360px] whitespace-pre-line rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
                        {getRevisionItemsNote(row)}
                      </div>
                      {pengaju.username && (
                        <div className="mt-1 text-xs text-gray-500">Oleh: {pengaju.username}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatRevisionDate(row.diajukan_pada || row.diajukanPada)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onReviewKasiRevision(id, 'approve')}
                          disabled={isReviewing}
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isReviewing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Setujui
                        </button>

                        <button
                          type="button"
                          onClick={() => onReviewKasiRevision(id, 'reject')}
                          disabled={isReviewing}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 font-medium text-red-600 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isReviewing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Tolak
                        </button>
                      </div>
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

export function SubkontrakAssignmentTable({
  loadingSubkontrak,
  groupedSubkontrakRows,
  getMonitorStatusClass,
  onOpenDetail,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Parameter - Metode
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Nomor Sampel
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Total Sampel
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {loadingSubkontrak ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-emerald-600" />
                  Memuat hasil subkontrak...
                </td>
              </tr>
            ) : groupedSubkontrakRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  Tidak ada item subkontrak.
                </td>
              </tr>
            ) : (
              groupedSubkontrakRows.map((group) => (
                <tr key={group.id} className="transition-all hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="font-medium">{group.parameter}</div>
                    <div className="text-xs text-gray-500">{group.metode}</div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div className="flex max-w-[280px] flex-wrap gap-1.5">
                      {(group.nomorSampelList || []).slice(0, 5).map((noSampel) => (
                        <span
                          key={noSampel}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                        >
                          {noSampel}
                        </span>
                      ))}
                      {(group.nomorSampelList || []).length > 5 && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          +{group.nomorSampelList.length - 5}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-700">
                    {group.totalSampel}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getMonitorStatusClass(group.statusRingkas)}`}
                    >
                      {group.statusRingkas}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-700">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(group)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 font-medium transition-all hover:bg-gray-100"
                    >
                      <Eye className="h-4 w-4" />
                      Detail
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { SubkontrakDetailModal, AssignAnalystModal } from './PenyeliaPenugasanModals';
