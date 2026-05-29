import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardList, FlaskRound, Loader2, Search } from 'lucide-react';
import { getApiErrorMessage } from '../../api/httpClient';
import { supervisionApi } from '../../api/supervisionApi';
import { DashboardErrorBanner, DashboardMetricCard } from '../../components/common/DashboardWidgets';

function getStatusBadgeClass(status) {
  const value = String(status || '').toLowerCase();

  if (value.includes('pending')) return 'bg-red-100 text-red-700';
  if (value.includes('sebagian')) return 'bg-amber-100 text-amber-700';
  if (value.includes('review')) return 'bg-violet-100 text-violet-700';
  if (value.includes('dikerjakan')) return 'bg-blue-100 text-blue-700';
  if (value.includes('selesai')) return 'bg-emerald-100 text-emerald-700';

  return 'bg-gray-100 text-gray-700';
}

function renderProgressLabel(row) {
  const done = Number(row.totalSelesai || 0);
  const total = Number(row.totalParameter || 0);

  if (!total) return '0/0';
  return `${done}/${total}`;
}

function getRowTimeValue(row = {}) {
  const dateCandidates = [
    row.latestActivityAt,
    row.latest_activity_at,
    row.updatedAt,
    row.updated_at,
    row.tanggalPelaporan,
    row.tanggal_pelaporan,
    row.tanggalTerima,
    row.tanggal_terima,
    row.createdAt,
    row.created_at,
  ];

  for (const value of dateCandidates) {
    if (!value) continue;

    const time = new Date(value).getTime();
    if (!Number.isNaN(time)) return time;
  }

  const numericText = String(row.noSampel || row.no_sampel || '')
    .match(/\d+/g)
    ?.join('');

  return Number(numericText || 0);
}

function isHistoryRow(row = {}) {
  const status = String(row.statusAgregat || row.status_agregat || '').toLowerCase();
  const done = Number(row.totalSelesai || row.total_selesai || 0);
  const total = Number(row.totalParameter || row.total_parameter || 0);

  return (
    status.includes('selesai') ||
    status.includes('disetujui') ||
    status.includes('final') ||
    (total > 0 && done >= total)
  );
}

export function PenyeliaReviewPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('aktif');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const data = await supervisionApi.getTestingOverview();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setRows([]);
      setErrorMessage(getApiErrorMessage(err, 'Gagal memuat overview pengujian.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => getRowTimeValue(b) - getRowTimeValue(a));
  }, [rows]);

  const tabRows = useMemo(() => {
    return sortedRows.filter((row) => {
      const isHistory = isHistoryRow(row);
      return activeTab === 'riwayat' ? isHistory : !isHistory;
    });
  }, [activeTab, sortedRows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tabRows;

    return tabRows.filter((row) => {
      const noSampel = String(row.noSampel || row.no_sampel || '').toLowerCase();
      const jenisSampel = String(row.jenisSampel || row.jenis_sampel || '').toLowerCase();
      const standar = String(row.standar || '').toLowerCase();
      const analisList = String(row.analisList || row.analis_list || '').toLowerCase();
      const statusAgregat = String(row.statusAgregat || row.status_agregat || '').toLowerCase();

      return (
        noSampel.includes(q) ||
        jenisSampel.includes(q) ||
        standar.includes(q) ||
        analisList.includes(q) ||
        statusAgregat.includes(q)
      );
    });
  }, [searchQuery, tabRows]);

  const activeRows = sortedRows.filter((row) => !isHistoryRow(row));
  const historyRows = sortedRows.filter(isHistoryRow);

  const totalRows = rows.length;
  const totalPending = rows.filter((row) =>
    ['Pending Penugasan', 'Sebagian Ditugaskan'].includes(row.statusAgregat)
  ).length;
  const totalReview = rows.filter((row) =>
    String(row.statusAgregat || '').toLowerCase().includes('review')
  ).length;
  const totalDone = historyRows.length;

  const metricCards = [
    {
      label: 'Total Sampel',
      sublabel: 'Seluruh sampel terdata',
      value: totalRows,
      icon: ClipboardList,
      color: 'bg-blue-100 text-blue-700',
      iconBg: 'bg-blue-50',
      trend: 'Overview',
      onClick: () => {
        setActiveTab('aktif');
        setSearchQuery('');
      },
    },
    {
      label: 'Butuh Penugasan',
      sublabel: 'Belum atau sebagian ditugaskan',
      value: totalPending,
      icon: AlertCircle,
      color: 'bg-red-100 text-red-700',
      iconBg: 'bg-red-50',
      trend: 'Prioritas',
      onClick: () => {
        setActiveTab('aktif');
        setSearchQuery('pending');
      },
    },
    {
      label: 'Menunggu Review',
      sublabel: 'Worksheet perlu dicek',
      value: totalReview,
      icon: FlaskRound,
      color: 'bg-violet-100 text-violet-700',
      iconBg: 'bg-violet-50',
      trend: 'Review',
      onClick: () => {
        setActiveTab('aktif');
        setSearchQuery('review');
      },
    },
    {
      label: 'Selesai',
      sublabel: 'Masuk riwayat',
      value: totalDone,
      icon: CheckCircle2,
      color: 'bg-emerald-100 text-emerald-700',
      iconBg: 'bg-emerald-50',
      trend: 'Riwayat',
      onClick: () => {
        setActiveTab('riwayat');
        setSearchQuery('');
      },
    },
  ];

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 md:p-8">

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {metricCards.map((metric) => (
            <DashboardMetricCard key={metric.label} metric={metric} loading={loading} />
          ))}
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nomor sampel, jenis sampel, standar, analis, atau status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="mb-6 flex overflow-x-auto border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('aktif')}
            className={`whitespace-nowrap border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'aktif'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Aktif ({activeRows.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('riwayat')}
            className={`whitespace-nowrap border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'riwayat'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Riwayat ({historyRows.length})
          </button>
        </div>

        <DashboardErrorBanner message={errorMessage} className="mb-6" />

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    No Sampel
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Jenis Sampel
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Standar
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Analis
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Progress
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-emerald-600" />
                      Memuat overview pengujian...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Tidak ada data pada tab ini.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.noSampel || row.no_sampel} className="transition-all hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {row.noSampel || row.no_sampel || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.jenisSampel || row.jenis_sampel || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.standar || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {row.analisList || row.analis_list || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {renderProgressLabel(row)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(row.statusAgregat || row.status_agregat)}`}
                        >
                          {row.statusAgregat || row.status_agregat || '-'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
