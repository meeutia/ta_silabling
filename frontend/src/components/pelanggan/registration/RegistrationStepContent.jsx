import { RegistrationCustomerStep } from './RegistrationCustomerStep';
import { RegistrationPurposeStep } from './RegistrationPurposeStep';
import { RegistrationSamplingStep } from './RegistrationSamplingStep';
import { RegistrationSampleParameterStep } from './RegistrationSampleParameterStep';
import { RegistrationReviewStep } from './RegistrationReviewStep';

export function RegistrationStepContent({
  currentStep,
    lockedSectionClass,
  lockedInputClass,
  customerProfiles,
  setFormData,
  userData,
  formData,
  handleInputChange,
  handleRadioChange,
  handleMetodeChange,
  handleDateChange,
  dateErrors,
  timeOptions,
  setShowTariffModal,
  minSelectableDate,
  minResultPickupDate,
  maxResultPickupDate,
  waterTypes,
  updateSampleEntry,
  entryStandardOptions,
  entryStandardErrors,
  entryParameterLists,
  entryParameterErrors,
  addSampleEntry,
  removeSampleEntry,
  getRequestDetails,
  isAgreed,
  setIsAgreed,
}) {
  if (currentStep === 1) {
    return (
      <RegistrationCustomerStep
        lockedSectionClass={lockedSectionClass}
        customerProfiles={customerProfiles}
        setFormData={setFormData}
        userData={userData}
        formData={formData}
        handleInputChange={handleInputChange}
      />
    );
  }

  if (currentStep === 2) {
    return (
      <RegistrationPurposeStep
        lockedSectionClass={lockedSectionClass}
        lockedInputClass={lockedInputClass}
        formData={formData}
        handleInputChange={handleInputChange}
        handleRadioChange={handleRadioChange}
      />
    );
  }

  if (currentStep === 3) {
    return (
      <RegistrationSamplingStep
        lockedSectionClass={lockedSectionClass}
        formData={formData}
        handleInputChange={handleInputChange}
        handleMetodeChange={handleMetodeChange}
        handleDateChange={handleDateChange}
        dateErrors={dateErrors}
        timeOptions={timeOptions}
        setShowTariffModal={setShowTariffModal}
        minSelectableDate={minSelectableDate}
        minResultPickupDate={minResultPickupDate}
        maxResultPickupDate={maxResultPickupDate}
      />
    );
  }

  if (currentStep === 4) {
    return (
      <RegistrationSampleParameterStep
        formData={formData}
        waterTypes={waterTypes}
        updateSampleEntry={updateSampleEntry}
        entryStandardOptions={entryStandardOptions}
        entryStandardErrors={entryStandardErrors}
        entryParameterLists={entryParameterLists}
        entryParameterErrors={entryParameterErrors}
        addSampleEntry={addSampleEntry}
        removeSampleEntry={removeSampleEntry}
      />
    );
  }

  if (currentStep === 5) {
    return (
      <RegistrationReviewStep
        formData={formData}
        waterTypes={waterTypes}
        entryParameterLists={entryParameterLists}
        getRequestDetails={getRequestDetails}
        isAgreed={isAgreed}
        setIsAgreed={setIsAgreed}
      />
    );
  }

  return null;
}
