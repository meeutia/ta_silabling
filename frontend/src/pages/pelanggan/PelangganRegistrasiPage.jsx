import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useRegistrationPage } from '../../components/pelanggan/registration/useRegistrationPage';
import { RegistrationStepContent } from '../../components/pelanggan/registration/RegistrationStepContent';
import { RegistrationTariffModal } from '../../components/pelanggan/registration/RegistrationTariffModal';

export function PelangganRegistrasiPage({ onSubmit, onNavigate, userData, onSessionExpired }) {
  const {
    currentStep,
    totalSteps,
    showSuccess,
    isAgreed,
    setIsAgreed,
    submitting,
    submitError,
    showTariffModal,
    setShowTariffModal,
    waterTypes,
    entryStandardOptions,
    entryStandardErrors,
    entryParameterLists,
    entryParameterErrors,
    samplingTariffs,
    customerProfiles,
    timeOptions,
    formData,
    setFormData,
    isRequestEditDisabled,
    lockedSectionClass,
    lockedInputClass,
    dateErrors,
    minSelectableDate,
    minResultPickupDate,
    maxResultPickupDate,
    handleInputChange,
    handleRadioChange,
    handleMetodeChange,
    addSampleEntry,
    removeSampleEntry,
    updateSampleEntry,
    handleDateChange,
    handleNext,
    handleBack,
    handleSubmitForm,
    handleViewStatus,
    getRequestDetails,
  } = useRegistrationPage({
    onSubmit,
    onNavigate,
    userData,
    onSessionExpired,
  });

  if (showSuccess) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Permohonan Pengujian Terkirim
            </h2>
            <p className="text-gray-600 mb-2">
              Permohonan pengujian Anda telah dikirim.
            </p>
            <p className="text-gray-600 mb-8">
              Permohonan akan diverifikasi oleh kasi pengujian laboratorium sebelum dilakukan pembayaran.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">i</span>
                </div>
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-2">Langkah Selanjutnya:</p>
                  <ul className="space-y-1.5">
                    <li>• Setelah disetujui, Anda akan menerima invoice pembayaran</li>
                    <li>• Pengujian akan dimulai setelah pembayaran dikonfirmasi</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={handleViewStatus}
              className="w-full px-6 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium shadow-md"
            >
              Lihat Status Permohonan
            </button>

            <button
              onClick={() => onNavigate('dashboard')}
              className="mt-4 text-gray-600 hover:text-gray-900 text-sm"
            >
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Kembali ke Dashboard</span>
          </button>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Formulir Pendaftaran Pengujian
          </h1>
          <p className="text-gray-600">
            Lengkapi data pengujian laboratorium Anda
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} dari {totalSteps}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round((currentStep / totalSteps) * 100)}% Selesai
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-3">
            {['Data Pelanggan', 'Maksud', 'Data Sampel', 'Parameter', 'Ringkasan'].map((label, idx) => (
              <span
                key={label}
                className={`text-xs ${currentStep > idx ? 'text-emerald-600 font-medium' : 'text-gray-500'
                  }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmitForm}>
          <RegistrationStepContent
            currentStep={currentStep}
            isRequestEditDisabled={isRequestEditDisabled}
            lockedSectionClass={lockedSectionClass}
            lockedInputClass={lockedInputClass}
            customerProfiles={customerProfiles}
            setFormData={setFormData}
            userData={userData}
            formData={formData}
            handleInputChange={handleInputChange}
            handleRadioChange={handleRadioChange}
            handleMetodeChange={handleMetodeChange}
            handleDateChange={handleDateChange}
            dateErrors={dateErrors}
            timeOptions={timeOptions}
            setShowTariffModal={setShowTariffModal}
            minSelectableDate={minSelectableDate}
            minResultPickupDate={minResultPickupDate}
            maxResultPickupDate={maxResultPickupDate}
            waterTypes={waterTypes}
            updateSampleEntry={updateSampleEntry}
            entryStandardOptions={entryStandardOptions}
            entryStandardErrors={entryStandardErrors}
            entryParameterLists={entryParameterLists}
            entryParameterErrors={entryParameterErrors}
            addSampleEntry={addSampleEntry}
            removeSampleEntry={removeSampleEntry}
            getRequestDetails={getRequestDetails}
            isAgreed={isAgreed}
            setIsAgreed={setIsAgreed}
          />

          {submitError && (
            <div className="mt-6 mb-2 bg-red-50 border border-red-300 rounded-lg p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm font-medium text-red-800">{submitError}</p>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Kembali
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium shadow-md flex items-center gap-2"
              >
                Lanjutkan
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!isAgreed || submitting}
                className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Mengirim...
                  </>
                ) : 'Kirim Permohonan'}
              </button>
            )}
          </div>
        </form>

        <RegistrationTariffModal
          isOpen={showTariffModal}
          tariffs={samplingTariffs}
          onClose={() => setShowTariffModal(false)}
        />
      </div>
    </div>
  );
}
