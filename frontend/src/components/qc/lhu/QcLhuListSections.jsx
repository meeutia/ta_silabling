import {
  AlertCircle,
  Eye,
  FileText,
  Loader2,
  PackageCheck,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  formatDateTime,
  getFilePath,
  getNomorLhu,
  getNomorLhuDisplay,
  getNoSampel,
  getStatusBadge,
  getStatusLhu,
} from '../../lhu/lhuReviewUtils';
import { getLhuStatusDisplayLabel } from '../../../utils/workflowAccessRules';
import { dedupeTextList } from '../../lhu/lhuSampleDisplayUtils';

export function QcLhuSummaryCards({ summary }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 w-fit rounded-lg bg-blue-50 p-3 text-blue-700">
          <FileText className="h-6 w-6" />
        </div>
        <p className="mb-1 text-2xl font-bold text-gray-900">{summary.total}</p>
        <p className="mb-1 text-sm font-medium text-gray-900">Butuh Finalisasi</p>
        <p className="text-xs text-gray-600">Permohonan siap dibuat LHU</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 w-fit rounded-lg bg-amber-50 p-3 text-amber-700">
          <PackageCheck className="h-6 w-6" />
        </div>
        <p className="mb-1 text-2xl font-bold text-gray-900">{summary.belumDibuat}</p>
        <p className="mb-1 text-sm font-medium text-gray-900">Menunggu QC</p>
        <p className="text-xs text-gray-600">Belum dibuatkan LHU</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 w-fit rounded-lg bg-red-50 p-3 text-red-700">
          <AlertCircle className="h-6 w-6" />
        </div>
        <p className="mb-1 text-2xl font-bold text-gray-900">{summary.menungguKalab}</p>
        <p className="mb-1 text-sm font-medium text-gray-900">Menunggu Kepala Lab</p>
        <p className="text-xs text-gray-600">LHU menunggu pengesahan</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 w-fit rounded-lg bg-emerald-50 p-3 text-emerald-700">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <p className="mb-1 text-2xl font-bold text-gray-900">{summary.disahkan}</p>
        <p className="mb-1 text-sm font-medium text-gray-900">Disahkan</p>
        <p className="text-xs text-gray-600">LHU final</p>
      </div>
    </div>
  );
}

export function QcLhuSearchTabs({ activeTab, setActiveTab, search, setSearch }) {
  return (
    <>
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nomor FPPL, ID registrasi, sampel, jenis sampel, nomor LHU, atau status..."
            className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="mb-6 flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('finalisasi')}
          className={`border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'finalisasi'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          Butuh Finalisasi
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          Riwayat LHU
        </button>
      </div>
    </>
  );
}

export function QcLhuFinalizationTable({ loadingQueue, filteredQueue, openFinalizationDetail }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-base font-bold text-gray-900">Daftar Permohonan Siap Dibuat LHU</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Permohonan masuk QC setelah seluruh sampelnya disetujui Kasi Pengujian. QC dapat membagi sampel ke beberapa LHU.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1060px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Nomor FPPL</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Nomor Sampel</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Jenis Sampel</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Progress</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Status QC</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {loadingQueue ? (
              <tr>
                <td colSpan={6} className="px-6 py-14 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                    Memuat antrean finalisasi LHU...
                  </div>
                </td>
              </tr>
            ) : filteredQueue.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-14 text-center text-gray-500">
                  Tidak ada permohonan yang siap difinalisasi.
                </td>
              </tr>
            ) : (
              filteredQueue.map((item) => {
                const status = getStatusLhu(item);
                const displayStatus = getLhuStatusDisplayLabel(status, status || '-');
                const sampleNos = dedupeTextList(item.sampleNos || item.sample_nos || [])
                  .sort((a, b) => String(a).localeCompare(String(b), 'id', { numeric: true, sensitivity: 'base' }));

                return (
                  <tr key={item.idRegistrasi || item.id_registrasi || item.nomorFppl || item.nomor_fppl} className="transition-all hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{item.nomorFppl || item.nomor_fppl || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="space-y-1">
                        {sampleNos.map((noSampel) => (
                          <div key={noSampel} className="font-medium text-gray-900">{noSampel}</div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.jenisSampel || item.jenis_sampel || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">{item.totalSampelSiap || item.total_sampel_siap || 0}</span>
                      <span className="text-gray-500"> / {item.totalSampel || item.total_sampel || 0} sampel</span>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.totalSelesai || item.total_selesai || 0} / {item.totalParameter || item.total_parameter || 0} parameter
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(displayStatus)}`}>{displayStatus}</span>
                      {(item.statusQcLabel || item.status_qc_label) && (
                        <p className="mt-1 text-xs text-gray-500">{item.statusQcLabel || item.status_qc_label}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => openFinalizationDetail(item)}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-700"
                      >
                        <Eye className="h-4 w-4" />
                        Proses
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
          Menampilkan <span className="font-semibold">{filteredQueue.length}</span> permohonan
        </p>
      </div>
    </div>
  );
}

export function QcLhuHistoryTable({ loadingHistory, filteredHistoryRows, openHistoryDetail, openPdf }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-base font-bold text-gray-900">Riwayat Finalisasi LHU</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          LHU yang sudah dibuat QC, termasuk draft dan LHU yang sedang menunggu persetujuan Kepala Lab.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1150px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">ID Draft / Nomor LHU</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Daftar Sampel</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Nomor FPPL</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Finalisasi QC</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {loadingHistory ? (
              <tr>
                <td colSpan={8} className="px-6 py-14 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                    Memuat riwayat LHU...
                  </div>
                </td>
              </tr>
            ) : filteredHistoryRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-14 text-center text-gray-500">Belum ada riwayat LHU.</td>
              </tr>
            ) : (
              filteredHistoryRows.map((item) => {
                const nomorLhu = getNomorLhu(item);
                const filePath = getFilePath(item);
                const status = getStatusLhu(item);
                const displayStatus = getLhuStatusDisplayLabel(status, status || '-');

                return (
                  <tr key={nomorLhu} className="transition-all hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{getNomorLhuDisplay(item) || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{getNoSampel(item) || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.nomorFppl || item.nomor_fppl || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{formatDateTime(item.qcAt || item.qc_at)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(displayStatus)}`}>{displayStatus}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openHistoryDetail(item)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4" />
                          Detail
                        </button>
                        <button
                          type="button"
                          onClick={() => openPdf(item)}
                          disabled={!filePath && !nomorLhu}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FileText className="h-4 w-4" />
                          PDF
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

      <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
        <p className="text-sm text-gray-600">
          Menampilkan <span className="font-semibold">{filteredHistoryRows.length}</span> LHU
        </p>
      </div>
    </div>
  );
}
