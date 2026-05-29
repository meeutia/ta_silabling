import { AlertTriangle, Home } from 'lucide-react';

export function RouteFallbackPage({
  title = 'Halaman tidak ditemukan',
  description = 'Halaman yang diminta tidak tersedia untuk role ini.',
  currentPage = '',
  onNavigateHome,
}) {
  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-8">
      <div className="mx-auto flex min-h-[55vh] max-w-3xl items-center justify-center">
        <div className="w-full rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm md:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
          </div>

          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">{description}</p>

          {currentPage ? (
            <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              Kode halaman: <span className="font-semibold text-gray-700">{currentPage}</span>
            </p>
          ) : null}

          <button
            type="button"
            onClick={onNavigateHome}
            className="mx-auto mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Home className="h-4 w-4" />
            Kembali ke halaman utama
          </button>
        </div>
      </div>
    </div>
  );
}

export default RouteFallbackPage;
