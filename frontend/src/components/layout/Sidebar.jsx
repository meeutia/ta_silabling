import { LogOut, X } from 'lucide-react';
import {
  getActiveMenuPage,
  getRoleLabel,
  getRoleMenuItems,
  getRolePortalConfig,
} from '../../app/pageConfig';

/**
 * Sidebar — 1 komponen untuk semua role.
 * Desktop: static sidebar. Mobile: drawer dari kiri.
 */
export function Sidebar({
  role,
  currentPage,
  onNavigate,
  onLogout,
  userName,
  mobile = false,
  open = false,
  onClose,
}) {
  const portal = getRolePortalConfig(role);
  const roleLabel = getRoleLabel(role);
  const menuItems = getRoleMenuItems(role);
  const activePage = getActiveMenuPage(role, currentPage);

  const handleNavigate = (pageId) => {
    onNavigate(pageId);
    onClose?.();
  };

  const content = (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      <div className="p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-white shadow-sm">
              <img
                src={portal.portalLogo}
                alt="Logo UPTD"
                className="h-9 w-9 object-contain"
              />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-semibold text-gray-900">{portal.portalTitle}</h1>
              <p className="truncate text-xs text-gray-600">{portal.portalSubtitle}</p>
            </div>
          </div>

          {mobile ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 lg:hidden"
              aria-label="Tutup menu"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-all ${
                    isActive
                      ? 'bg-emerald-50 font-medium text-emerald-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600' : 'text-gray-500'}`} />
                  <span className="flex-1 text-left text-sm">{item.menuLabel}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-200 p-4">
        <div className="mb-2 flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <span className="text-sm font-semibold text-emerald-700">
              {userName ? userName.split(' ').map((name) => name[0]).join('').slice(0, 2) : '?'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{userName}</p>
            <p className="truncate text-xs text-gray-600">{roleLabel}</p>
          </div>
        </div>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-gray-700 transition-all hover:bg-red-50 hover:text-red-600"
          onClick={() => {
            onClose?.();
            onLogout();
          }}
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm">Keluar</span>
        </button>
      </div>
    </aside>
  );

  if (!mobile) return content;

  return (
    <div className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <button
        type="button"
        aria-label="Tutup menu"
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        className={`relative h-full transform transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {content}
      </div>
    </div>
  );
}
