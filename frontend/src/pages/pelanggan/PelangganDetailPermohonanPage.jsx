import { DetailSampleScheduleSection } from '../../components/pelanggan/detail/DetailSampleScheduleSection';
import { DetailTimelineSection } from '../../components/pelanggan/detail/DetailTimelineSection';
import { DetailPermohonanHeader } from '../../components/pelanggan/detail/DetailPermohonanHeader';
import { DetailPaymentSection } from '../../components/pelanggan/detail/DetailPaymentSection';
import { getStatusBadge } from '../../components/pelanggan/detail/detailPermohonanStatusBadge.jsx';
import { DetailSignedLhuSection } from '../../components/pelanggan/detail/DetailSignedLhuSection';
import { useDetailPermohonanPage } from '../../components/pelanggan/detail/useDetailPermohonanPage';

const loaderStyles = `
  .detail-loader {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    position: relative;
    animation: loaderRotate 1s linear infinite;
  }
  
  .detail-loader::before,
  .detail-loader::after {
    content: "";
    box-sizing: border-box;
    position: absolute;
    inset: 0px;
    border-radius: 50%;
    border: 5px solid #fff;
    animation: loaderClip 2s linear infinite;
  }
  
  .detail-loader::after {
    transform: rotate3d(90, 90, 0, 180deg);
    border-color: #10b981;
  }

  @keyframes loaderRotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes loaderClip {
    0% { clip-path: polygon(50% 50%, 0 0, 0 0, 0 0, 0 0, 0 0); }
    50% { clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 0, 100% 0, 100% 0); }
    75%, 100% { clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 100% 100%, 100% 100%); }
  }
`;

export function PelangganDetailPermohonanPage({ request, onBack }) {
  const page = useDetailPermohonanPage(request);

  // Show loading state when direct-link fallback only contains the registration number.
  if (page.detailRefreshing && !page.hasLoadedDetailPayload) {
    return (
      <>
        <style>{loaderStyles}</style>
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <div className="detail-loader" />
            <div className="text-center">
              <p className="font-semibold text-gray-900 text-lg">Memuat detail permohonan...</p>
              <p className="text-sm text-gray-500 mt-2">Mohon tunggu sebentar</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show error state if data fetch failed before the detail payload was available.
  if (page.detailError && !page.hasLoadedDetailPayload) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto mt-12">
          <div className="bg-red-50 border-l-4 border-red-600 rounded-lg p-6">
            <div className="flex gap-4">
              <div className="text-red-600 text-2xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-2">Gagal Memuat Data</h3>
                <p className="text-red-700 mb-4">{page.detailError}</p>
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                >
                  Kembali ke Riwayat
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <DetailPermohonanHeader
          onBack={onBack}
          officerWhatsAppLink={page.officerWhatsAppLink}
          activeSchedule={page.activeSchedule}
          normalizedRequest={page.normalizedRequest}
          customerProfile={page.customerProfile}
          requestData={page.requestData}
          statusAktif={page.statusAktif}
          shouldShowDecisionNote={page.shouldShowDecisionNote}
          cleanDecisionNote={page.cleanDecisionNote}
          progressSteps={page.progressSteps}
          formatDate={page.formatDate}
          formatDateTime={page.formatDateTime}
          getStatusBadge={getStatusBadge}
        />

        <div className="space-y-4">
          <DetailPaymentSection
            isAdminRejected={page.isAdminRejected}
            pembayaranRef={page.pembayaranRef}
            expandedSection={page.expandedSection}
            toggleSection={page.toggleSection}
            statusAktif={page.statusAktif}
            normalizedRequest={page.normalizedRequest}
            cleanDecisionNote={page.cleanDecisionNote}
            canShowInvoice={page.canShowInvoice}
            invoice={page.invoice}
            isPaymentDoneOrContinued={page.isPaymentDoneOrContinued}
            formatDate={page.formatDate}
            formatDateTime={page.formatDateTime}
            formatCurrency={page.formatCurrency}
            totalInvoice={page.totalInvoice}
            subtotalUji={page.subtotalUji}
            subtotalPengambilan={page.subtotalPengambilan}
            handleLihatInvoice={page.handleLihatInvoice}
            isInvoiceItemSubkontrak={page.isInvoiceItemSubkontrak}
            getInvoiceItemQty={page.getInvoiceItemQty}
            getInvoiceItemSubtotal={page.getInvoiceItemSubtotal}
            selectedPaymentMethod={page.selectedPaymentMethod}
            setSelectedPaymentMethod={page.setSelectedPaymentMethod}
            handleSetujuInvoice={page.handleSetujuInvoice}
            handleTidakSetujuInvoice={page.handleTidakSetujuInvoice}
            paymentActionLoading={page.paymentActionLoading}
            detailRefreshing={page.detailRefreshing}
            paymentGateway={page.paymentGateway}
            isGatewayExpired={page.isGatewayExpired}
            isPaymentRejected={page.isPaymentRejected}
            shouldCreateOrRefreshPayment={page.shouldCreateOrRefreshPayment}
            shouldShowGatewayPaymentPanel={page.shouldShowGatewayPaymentPanel}
            handleChatAdmin={page.handleChatAdmin}
          />

          <DetailTimelineSection
            timelineRef={page.timelineRef}
            expandedSection={page.expandedSection}
            toggleSection={page.toggleSection}
            timelineItems={page.timelineItems}
          />

          {!page.isAdminRejected && (
            <DetailSampleScheduleSection
              sampelRef={page.sampelRef}
              expandedSection={page.expandedSection}
              toggleSection={page.toggleSection}
              statusAktif={page.statusAktif}
              requestData={page.requestData}
              normalizedRequest={page.normalizedRequest}
              invoice={page.invoice}
              billing={page.billing}
              activeSchedule={page.activeSchedule}
              officerWhatsAppLink={page.officerWhatsAppLink}
              requestSamples={page.requestSamples}
              formatDateTime={page.formatDateTime}
              formatCurrency={page.formatCurrency}
              getSampleParameterMethods={page.getSampleParameterMethods}
              getSampleTypeName={page.getSampleTypeName}
              getRegBmLabel={page.getRegBmLabel}
              getParameterName={page.getParameterName}
              getMethodName={page.getMethodName}
              getParameterPrice={page.getParameterPrice}
              isParameterSubkontrak={page.isParameterSubkontrak}
              getKasiPengujianNote={page.getKasiPengujianNote}
              lhuPickupInfo={page.lhuPickupInfo}
              minScheduleDate={page.minScheduleDate}
              activeScheduleChangeType={page.activeScheduleChangeType}
              handleOpenScheduleChangeForm={page.handleOpenScheduleChangeForm}
              handleCancelScheduleChangeForm={page.handleCancelScheduleChangeForm}
              handleConfirmSchedule={page.handleConfirmSchedule}
              scheduleChangeForm={page.scheduleChangeForm}
              setScheduleChangeForm={page.setScheduleChangeForm}
              handleScheduleChangeDateChange={page.handleScheduleChangeDateChange}
              handleScheduleChangeTimeChange={page.handleScheduleChangeTimeChange}
              operationalTimeOptions={page.operationalTimeOptions}
              scheduleChangeLoading={page.scheduleChangeLoading}
              scheduleConfirmLoading={page.scheduleConfirmLoading}
              handleScheduleChangeSubmit={page.handleScheduleChangeSubmit}
              detailRefreshing={page.detailRefreshing}
            />
          )}

          <DetailSignedLhuSection 
            expandedSection={page.expandedSection}
            toggleSection={page.toggleSection}
            requestData={page.requestData}
            onDownloadSignedLhu={page.handleDownloadSignedLhu}
          />
        </div>
      </div>


    </div>
  );
}
