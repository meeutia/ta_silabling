import { useState } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { AppToastHost } from '../components/common/AppToastHost';
import { AppErrorBoundary } from '../components/common/AppErrorBoundary';
import { getDefaultPageForRole } from './pageConfig';
import { LogoutConfirmModal } from './LogoutConfirmModal';

export function AppLayout({
  role,
  currentPage,
  userName,
  onNavigate,
  onRequestLogout,
  onConfirmLogout,
  showLogoutModal,
  onCloseLogoutModal,
  children,
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleNavigate = (page) => {
    onNavigate(page);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-[100dvh] bg-gray-50">
      <div className="hidden lg:block">
        <Sidebar
          role={role}
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onLogout={onRequestLogout}
          userName={userName}
        />
      </div>

      <Sidebar
        mobile
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        role={role}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={onRequestLogout}
        userName={userName}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          role={role}
          currentPage={currentPage}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <AppErrorBoundary
            resetKey={`${role}:${currentPage}`}
            onReset={() => handleNavigate(getDefaultPageForRole(role))}
          >
            {children}
          </AppErrorBoundary>
        </main>
      </div>

      <AppToastHost />

      <LogoutConfirmModal
        open={showLogoutModal}
        onCancel={onCloseLogoutModal}
        onConfirm={onConfirmLogout}
      />
    </div>
  );
}
