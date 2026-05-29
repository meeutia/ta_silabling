import { Inbox } from 'lucide-react';

export function EmptyState({
  icon = Inbox,
  title = 'Data belum tersedia',
  description = 'Belum ada data yang dapat ditampilkan.',
  action = null,
  className = '',
}) {
  const IconComponent = icon;

  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center ${className}`}>
      <div className="mb-3 rounded-full bg-gray-100 p-3">
        <IconComponent className="h-6 w-6 text-gray-500" />
      </div>
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-gray-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
