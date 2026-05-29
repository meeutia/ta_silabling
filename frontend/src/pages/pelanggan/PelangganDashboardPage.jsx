import { CheckCircle, Clock, FileText } from 'lucide-react';
import { usePelangganDashboardData } from '../../components/dashboard/usePelangganDashboardData';
import { useLandingTariffs } from '../../components/landing/useLandingTariffs';
import {
  PelangganCreateRequestCta,
  PelangganRecentActivities,
  PelangganStatsCards,
  PelangganTariffPreview,
  PelangganWelcomeHeader,
} from '../../components/pelanggan/dashboard/PelangganDashboardSections';

export function PelangganDashboardPage({ userName, onNavigate }) {
  const {
    loading,
    errorMessage,
    totalTesting,
    inProcessCount,
    completedCount,
    monthlyCount,
    recentActivities,
  } = usePelangganDashboardData();
  const tariffData = useLandingTariffs();

  const infoCards = [
    {
      title: 'Total Pengujian',
      value: loading ? '...' : totalTesting,
      icon: FileText,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      trend: `+${monthlyCount} bulan ini`,
      filter: 'Semua',
    },
    {
      title: 'Sampel Dalam Proses',
      value: loading ? '...' : inProcessCount,
      icon: Clock,
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      trend: 'Sedang diuji',
      filter: 'Aktif',
    },
    {
      title: 'LHU Selesai',
      value: loading ? '...' : completedCount,
      icon: CheckCircle,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      trend: 'Siap diunduh',
      filter: 'Selesai',
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <PelangganWelcomeHeader userName={userName} errorMessage={errorMessage} />
        <PelangganStatsCards infoCards={infoCards} onNavigate={onNavigate} />
        <PelangganCreateRequestCta onNavigate={onNavigate} />
        <PelangganTariffPreview tariffData={tariffData} />
        <PelangganRecentActivities
          loading={loading}
          recentActivities={recentActivities}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}
