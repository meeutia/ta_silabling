import { AlertTriangle } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

export function DashboardErrorBanner({ message, className = '' }) {
  if (!message) return null;

  return (
    <div className={`mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="leading-6">{message}</p>
      </div>
    </div>
  );
}

export function DashboardMetricCard({ metric, loading = false }) {
  const Icon = metric.icon;
  const value = loading ? '...' : formatNumber(metric.value ?? 0, '0');
  const clickable = typeof metric.onClick === 'function' && !loading;
  const Root = clickable ? 'button' : 'div';
  const rootProps = clickable
    ? { type: 'button', onClick: metric.onClick }
    : {};

  return (
    <Root
      {...rootProps}
      className={`w-full rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:shadow-md ${
        clickable
          ? 'cursor-pointer hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2'
          : ''
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-sm text-gray-600">{metric.label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        {Icon ? (
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${metric.iconBg || 'bg-gray-50'}`}>
            <Icon className={`h-6 w-6 ${metric.iconColor || metric.color?.split(' ')[1] || 'text-gray-600'}`} />
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-600">{metric.sublabel}</p>
        {metric.trend ? (
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${metric.color || 'bg-gray-100 text-gray-700'}`}>
            {loading ? 'Memuat' : metric.trend}
          </span>
        ) : null}
      </div>
    </Root>
  );
}

export function TableStateRow({ colSpan, loading = false, loadingText = 'Memuat data...', emptyText = 'Belum ada data.' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-10 text-center text-sm text-gray-500">
        {loading ? loadingText : emptyText}
      </td>
    </tr>
  );
}

export function ActivityFeed({ loading = false, activities = [], loadingText = 'Memuat aktivitas...', emptyText = 'Belum ada aktivitas terbaru.' }) {
  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
        {loading ? loadingText : emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, idx) => (
        <div key={`${activity.action || activity.title || 'activity'}-${idx}`} className="flex gap-3">
          <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-900">{activity.action || activity.title || '-'}</p>
            <p className="mt-1 text-xs text-gray-600">
              {[activity.time, activity.user ? `oleh ${activity.user}` : ''].filter(Boolean).join(' • ')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
