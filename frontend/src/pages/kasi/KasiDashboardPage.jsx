import { ClipboardCheck, FileText, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { DashboardErrorBanner, DashboardMetricCard } from '../../components/common/DashboardWidgets';
import { useKasiDashboardData } from '../../components/dashboard/useKasiDashboardData';

const noopNavigate = (_page) => {};

const goPermohonan = (onNavigate, tab, filter = 'Semua') => {
  onNavigate('permohonan', { queryParams: { tab, filter } });
};

const goLhu = (onNavigate, tab, q = '') => {
  onNavigate('lhu', { queryParams: { tab, q } });
};

export function KasiDashboardPage({ onNavigate = noopNavigate }) {
  const dashboard = useKasiDashboardData();

  const metrics = [
    {
      label: 'Permohonan Pending',
      sublabel: 'Menunggu Verifikasi',
      value: dashboard.pendingRequests,
      icon: ClipboardCheck,
      color: 'bg-amber-100 text-amber-700',
      iconBg: 'bg-amber-50',
      trend: dashboard.errorMessage ? 'Dimuat sebagian' : 'Data backend',
      onClick: () => goPermohonan(onNavigate, 'Verifikasi Permintaan', 'Menunggu'),
    },
    {
      label: 'Permohonan Terverifikasi',
      sublabel: 'Sudah Disetujui',
      value: dashboard.verifiedRequests,
      icon: CheckCircle2,
      color: 'bg-emerald-100 text-emerald-700',
      iconBg: 'bg-emerald-50',
      trend: 'Aktif',
      onClick: () => goPermohonan(onNavigate, 'Riwayat', 'Disetujui'),
    },
    {
      label: 'LHU Pending',
      sublabel: 'Menunggu Verifikasi',
      value: dashboard.pendingLhu,
      icon: FileText,
      color: 'bg-blue-100 text-blue-700',
      iconBg: 'bg-blue-50',
      trend: 'Review Kasi',
      onClick: () => goLhu(onNavigate, 'antrean'),
    },
    {
      label: 'Total Pengujian',
      sublabel: 'Proses/Selesai',
      value: dashboard.totalTesting,
      icon: AlertCircle,
      color: 'bg-purple-100 text-purple-700',
      iconBg: 'bg-purple-50',
      trend: 'Backend',
      onClick: () => goLhu(onNavigate, 'riwayat'),
    },
  ];

  const quickActions = [
    {
      title: 'Verifikasi Permohonan',
      description: `${dashboard.pendingRequests} permohonan menunggu verifikasi`,
      action: 'Lihat & Verifikasi',
      page: 'permohonan',
      tab: 'Verifikasi Permintaan',
      filter: 'Menunggu',
      color: 'border-amber-200 bg-amber-50',
      buttonColor: 'bg-amber-600 hover:bg-amber-700',
    },
    {
      title: 'Verifikasi LHU Sementara',
      description: `${dashboard.pendingLhu} LHU perlu diverifikasi`,
      action: 'Verifikasi Sekarang',
      page: 'lhu',
      tab: 'antrean',
      filter: '',
      color: 'border-blue-200 bg-blue-50',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
    },
  ];


  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 md:p-8">
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Dashboard Kasi Pengujian</h1>
          <p className="text-gray-600">Selamat datang kembali! Berikut ringkasan aktivitas verifikasi Anda.</p>
          <DashboardErrorBanner message={dashboard.errorMessage} />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <DashboardMetricCard key={metric.label} metric={metric} loading={dashboard.loading} />
          ))}
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {quickActions.map((action) => (
            <div key={action.title} className={`rounded-xl border-2 p-6 ${action.color}`}>
              <h3 className="mb-2 font-bold text-gray-900">{action.title}</h3>
              <p className="mb-4 text-sm text-gray-600">{dashboard.loading ? 'Memuat data...' : action.description}</p>
              <button
                type="button"
                onClick={() => action.page === 'permohonan' ? goPermohonan(onNavigate, action.tab, action.filter) : goLhu(onNavigate, action.tab, action.filter)}
                className={`${action.buttonColor} flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all`}
              >
                {action.action}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
