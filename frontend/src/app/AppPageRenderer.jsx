import { PelangganDashboardPage } from '../pages/pelanggan/PelangganDashboardPage';
import { PelangganRegistrasiPage } from '../pages/pelanggan/PelangganRegistrasiPage';
import { PelangganRiwayatPage } from '../pages/pelanggan/PelangganRiwayatPage';
import { PelangganDetailPermohonanPage } from '../pages/pelanggan/PelangganDetailPermohonanPage';

import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminPermohonanPage } from '../pages/admin/AdminPermohonanPage';
import { AdminKelolaAkunPage } from '../pages/admin/AdminKelolaAkunPage';
import { AdminKelolaParameterPage } from '../pages/admin/AdminKelolaParameterPage';

import { KasiDashboardPage } from '../pages/kasi/KasiDashboardPage';
import { KasiPermohonanPage } from '../pages/kasi/KasiPermohonanPage';
import { KasiLhuPage } from '../pages/kasi/KasiLhuPage';

import { PenyeliaReviewPage } from '../pages/penyelia/PenyeliaReviewPage';
import { PenyeliaPenugasanPage } from '../pages/penyelia/PenyeliaPenugasanPage';
import { PenyeliaPenugasanDetailPage } from '../pages/penyelia/PenyeliaPenugasanDetailPage';

import { AnalisPenugasanPage } from '../pages/analis/AnalisPenugasanPage';
import { AnalisDetailSampelPage } from '../pages/analis/AnalisDetailSampelPage';

import { QcLhuPage } from '../pages/qc/QcLhuPage';

import { KalabLhuPage } from '../pages/kalab/KalabLhuPage';

import { getDefaultPageForRole, isPageAllowedForRole } from './pageConfig';
import { RouteFallbackPage } from './RouteFallbackPage';

function MissingDetailFallback({ currentPage, onNavigateHome, type = 'detail' }) {
  return (
    <RouteFallbackPage
      title="Detail tidak tersedia"
      description={`Data ${type} belum dipilih atau state halaman sudah dibersihkan. Silakan kembali ke halaman utama role ini.`}
      currentPage={currentPage}
      onNavigateHome={onNavigateHome}
    />
  );
}

export function AppPageRenderer({
  userRole,
  currentPage,
  setCurrentPage,
  authToken,
  userName,
  userData,
  selectedRequest,
  selectedStatusRegistrationId,
  selectedAdminPermohonanRegistrationId,
  selectedKasiPermohonanRegistrationId,
  selectedQcLhuNumber,
  selectedKalabLhuNumber,
  selectedPenugasanDetailId,
  setSelectedPenugasanDetailId,
  selectedAssignmentId,
  setSelectedAssignmentId,
  selectedAnalisAssignmentId,
  setSelectedAnalisAssignmentId,
  onRegistrationSubmit,
  onViewDetail,
  onBackToList,
  onSessionExpired,
  paymentReturnInfo,
  onPaymentReturnConsumed,
}) {
  const goToDefaultPage = () => setCurrentPage(getDefaultPageForRole(userRole));

  if (!isPageAllowedForRole(userRole, currentPage)) {
    return (
      <RouteFallbackPage
        currentPage={currentPage}
        onNavigateHome={goToDefaultPage}
      />
    );
  }

  switch (userRole) {
    case 'admin': {
      if (currentPage === 'dashboard') return <AdminDashboardPage onNavigate={setCurrentPage} />;
      if (currentPage === 'permohonan') {
        return (
          <AdminPermohonanPage
            authToken={authToken}
            initialRegistrationId={selectedAdminPermohonanRegistrationId}
            onDetailRouteChange={(registrationId) => {
              setCurrentPage('permohonan', {
                pathSegments: registrationId ? [registrationId] : [],
                replace: !registrationId,
              });
            }}
          />
        );
      }
      if (currentPage === 'kelola-parameter') return <AdminKelolaParameterPage />;
      if (currentPage === 'kelola-akun') return <AdminKelolaAkunPage />;
      break;
    }

    case 'kasi': {
      if (currentPage === 'dashboard') return <KasiDashboardPage onNavigate={setCurrentPage} />;
      if (currentPage === 'permohonan') {
        return (
          <KasiPermohonanPage
            initialRegistrationId={selectedKasiPermohonanRegistrationId}
            onDetailRouteChange={(registrationId) => {
              setCurrentPage('permohonan', {
                pathSegments: registrationId ? [registrationId] : [],
                replace: !registrationId,
              });
            }}
          />
        );
      }
      if (currentPage === 'lhu') return <KasiLhuPage />;
      break;
    }

    case 'penyelia': {
      if (currentPage === 'pengujian') {
        return (
          <PenyeliaReviewPage
            onViewDetail={(idPenugasan) => {
              if (!idPenugasan) return;
              setSelectedAssignmentId(idPenugasan);
              setCurrentPage('detail-penugasan', {
                queryParams: { idPenugasan },
              });
            }}
          />
        );
      }

      if (currentPage === 'penugasan') {
        return (
          <PenyeliaPenugasanPage
            onViewDetail={(idPenugasan) => {
              setSelectedAssignmentId(idPenugasan);
              setCurrentPage('detail-penugasan', {
                queryParams: { idPenugasan },
              });
            }}
          />
        );
      }

      if (currentPage === 'detail-penugasan') {
        if (!selectedAssignmentId) {
          return (
            <MissingDetailFallback
              currentPage={currentPage}
              type="penugasan"
              onNavigateHome={goToDefaultPage}
            />
          );
        }

        return (
          <PenyeliaPenugasanDetailPage
            idPenugasan={selectedAssignmentId}
            idPenugasanDetail={selectedPenugasanDetailId}
            onBack={() => {
              setSelectedAssignmentId(null);
              setCurrentPage('penugasan');
            }}
          />
        );
      }

      break;
    }

    case 'analis': {
      if (currentPage === 'sampel') {
        return (
          <AnalisPenugasanPage
            initialSelectedAssignmentId={selectedAnalisAssignmentId}
            onClearInitialSelectedAssignment={() => setSelectedAnalisAssignmentId(null)}
            onCloseSelectedAssignment={() => {
              setSelectedAnalisAssignmentId(null);
              setSelectedPenugasanDetailId(null);
              setCurrentPage('sampel', { replace: true });
            }}
            onViewDetail={(idPenugasanDetail, parentAssignmentId) => {
              setSelectedAnalisAssignmentId(parentAssignmentId || null);
              setSelectedPenugasanDetailId(idPenugasanDetail);
              setCurrentPage('detail_sampel', {
                queryParams: {
                  idPenugasanDetail,
                  idPenugasan: parentAssignmentId || '',
                },
              });
            }}
          />
        );
      }

      if (currentPage === 'detail_sampel') {
        if (!selectedPenugasanDetailId) {
          return (
            <MissingDetailFallback
              currentPage={currentPage}
              type="sampel"
              onNavigateHome={goToDefaultPage}
            />
          );
        }

        return (
          <AnalisDetailSampelPage
            idPenugasanDetail={selectedPenugasanDetailId}
            onBack={() => {
              const parentAssignmentId = selectedAnalisAssignmentId || '';

              setSelectedPenugasanDetailId(null);
              if (parentAssignmentId) {
                setSelectedAnalisAssignmentId(parentAssignmentId);
              }
              setCurrentPage('sampel', {
                replace: true,
                queryParams: parentAssignmentId
                  ? { idPenugasan: parentAssignmentId }
                  : null,
              });
            }}
          />
        );
      }

      break;
    }

    case 'qc': {
      if (currentPage === 'verifikasi') return <QcLhuPage initialLhuNumber={selectedQcLhuNumber} />;
      break;
    }

    case 'kalab': {
      if (currentPage === 'lhu') return <KalabLhuPage initialLhuNumber={selectedKalabLhuNumber} />;
      break;
    }

    default: {
      if (currentPage === 'dashboard') {
        return (
          <PelangganDashboardPage
            userName={userName}
            onNavigate={setCurrentPage}
          />
        );
      }

      if (currentPage === 'register') {
        return (
          <PelangganRegistrasiPage
            key="create-request"
            onSubmit={onRegistrationSubmit}
            onNavigate={setCurrentPage}
            authToken={authToken}
            userData={userData}
            onSessionExpired={onSessionExpired}
          />
        );
      }

      if (currentPage === 'status') {
        const detailRequest = selectedRequest || (selectedStatusRegistrationId
          ? { id_registrasi: selectedStatusRegistrationId }
          : null);

        if (detailRequest) {
          const detailKey =
            detailRequest?.id_registrasi ||
            detailRequest?.idRegistrasi ||
            detailRequest?.nomorRegistrasi ||
            detailRequest?.id ||
            selectedStatusRegistrationId;

          return (
            <PelangganDetailPermohonanPage
              key={detailKey}
              request={detailRequest}
              onBack={onBackToList}
            />
          );
        }

        return (
          <PelangganRiwayatPage
            onViewDetail={onViewDetail}
            authToken={authToken}
            onSessionExpired={onSessionExpired}
            paymentReturnInfo={paymentReturnInfo}
            onPaymentReturnConsumed={onPaymentReturnConsumed}
          />
        );
      }
    }
  }

  return (
    <RouteFallbackPage
      currentPage={currentPage}
      onNavigateHome={goToDefaultPage}
    />
  );
}
