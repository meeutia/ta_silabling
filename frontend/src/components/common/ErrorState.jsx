import { AlertCircle } from 'lucide-react';

export function ErrorState({
  title = 'Gagal memuat data',
  message = 'Terjadi kesalahan saat memuat data.',
  className = '',
}) {
  return (
    <div className={`rounded-xl border border-red-100 bg-red-50 p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-800">{title}</p>
          {message ? <p className="mt-1 text-sm leading-6 text-red-700">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default ErrorState;
