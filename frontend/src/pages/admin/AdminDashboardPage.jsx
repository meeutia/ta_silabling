import { FileCheck, Clock, Package, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { DashboardErrorBanner, DashboardMetricCard, ActivityFeed } from '../../components/common/DashboardWidgets';
import { useAdminDashboardData } from '../../components/dashboard/useAdminDashboardData';

const noopNavigate = () => {};

const navigateWithFilter = (onNavigate, tab, status = 'Semua') => {
  onNavigate('permohonan', {
    queryParams: { tab, status },
  });
};

export function AdminDashboardPage({ onNavigate = noopNavigate }) {
  const { loading, metrics, recentActivities } = useAdminDashboardData();

  const dashboardMetrics = [
    {
      label: 'Permohonan Baru',
      sublabel: 'Menunggu Validasi',
      value: metrics.newRequestCount,
      icon: FileCheck,
      color: 'bg-amber-100 text-amber-700',
      iconBg: 'bg-amber-50',
      trend: metrics.todayNewRequests > 0 ? `+${metrics.todayNewRequests} hari ini` : 'Tidak ada baru',
      onClick: () => navigateWithFilter(onNavigate, 'Aktif', 'Menunggu Verifikasi'),
    },
    {
      label: 'Menunggu Pembayaran',
      sublabel: 'Menunggu Pelanggan',
      value: metrics.waitingPaymentCount,
      icon: Clock,
      color: 'bg-blue-100 text-blue-700',
      iconBg: 'bg-blue-50',
      trend: 'Gateway / Bayar Nanti',
      onClick: () => navigateWithFilter(onNavigate, 'Aktif', 'Menunggu Pembayaran'),
    },
    {
      label: 'Menunggu Sampel',
      sublabel: 'Belum Diterima',
      value: metrics.waitingSampleCount,
      icon: Package,
      color: 'bg-purple-100 text-purple-700',
      iconBg: 'bg-purple-50',
      trend: `${metrics.todayPickup} pickup hari ini`,
      onClick: () => navigateWithFilter(onNavigate, 'Aktif', 'Menunggu Sampel'),
    },
    {
      label: 'Proses Pengujian',
      sublabel: 'Di Laboratorium',
      value: metrics.testingCount,
      icon: AlertCircle,
      color: 'bg-cyan-100 text-cyan-700',
      iconBg: 'bg-cyan-50',
      trend: 'Read-only',
      onClick: () => navigateWithFilter(onNavigate, 'Aktif', 'Proses Pengujian'),
    },
    {
      label: 'Selesai',
      sublabel: 'LHU Disahkan',
      value: metrics.completedCount,
      icon: CheckCircle2,
      color: 'bg-emerald-100 text-emerald-700',
      iconBg: 'bg-emerald-50',
      trend: 'Akumulasi',
      onClick: () => navigateWithFilter(onNavigate, 'Riwayat', 'Selesai'),
    },
  ];

  const quickActions = [
    {
      title: 'Validasi Permohonan Terbaru',
      description: `${metrics.newRequestCount} permohonan baru menunggu validasi`,
      action: 'Lihat & Validasi',
      page: 'permohonan',
      tab: 'Aktif',
      status: 'Menunggu Verifikasi',
      color: 'border-amber-200 bg-amber-50',
      buttonColor: 'bg-amber-600 hover:bg-amber-700',
    },
    {
      title: 'Terima Sampel & Generate Nomor Sampel',
      description: `${metrics.waitingSampleCount} permohonan menunggu sampel`,
      action: 'Kelola Sampel',
      page: 'permohonan',
      tab: 'Aktif',
      status: 'Menunggu Sampel',
      color: 'border-purple-200 bg-purple-50',
      buttonColor: 'bg-purple-600 hover:bg-purple-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {dashboardMetrics.map((metric) => (
            <DashboardMetricCard key={metric.label} metric={metric} loading={loading} />
          ))}
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {quickActions.map((item) => (
              <div key={item.title} className={`rounded-xl border-2 p-6 ${item.color}`}>
                <h3 className="mb-2 font-semibold text-gray-900">{item.title}</h3>
                <p className="mb-4 text-sm text-gray-600">{loading ? 'Memuat data...' : item.description}</p>
                <button
                  type="button"
                  onClick={() => navigateWithFilter(onNavigate, item.tab || 'Aktif', item.status || 'Semua')}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white transition-all ${item.buttonColor}`}
                >
                  {item.action}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Aktivitas Terbaru</h2>
          <ActivityFeed
            loading={loading}
            activities={recentActivities}
            loadingText="Memuat aktivitas..."
            emptyText="Belum ada aktivitas terbaru."
          />
        </div>
      </div>
    </div>
  );
}
