import { Menu } from 'lucide-react';
import { getPageTitle } from '../../app/pageConfig';

/**
 * Topbar ringkas untuk semua role.
 * Aksi notifikasi dan profile kanan atas sengaja dihapus supaya layout mobile bersih.
 */
export function Topbar({ role, currentPage, onOpenSidebar }) {
  const pageTitle = getPageTitle(role, currentPage);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3 px-4 py-3 md:px-8 md:py-4">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:bg-gray-50 lg:hidden"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-gray-900 md:text-lg">
            {pageTitle}
          </h2>
        </div>
      </div>
    </header>
  );
}
