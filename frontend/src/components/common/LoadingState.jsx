import { Loader2 } from 'lucide-react';

export function LoadingState({
  title = 'Memuat data...',
  description = '',
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-8 text-center ${className}`}>
      <Loader2 className="mb-3 h-8 w-8 animate-spin text-emerald-600" />
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
    </div>
  );
}

export default LoadingState;
