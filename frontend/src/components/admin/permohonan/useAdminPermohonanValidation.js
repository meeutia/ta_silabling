import { useState } from 'react';
import { FPPL_STATUSES } from '../../../utils/fpplStatus';
import { adminPermohonanApi } from '../../../api/adminPermohonanApi';
import { showError, showSuccess, showWarning } from '../../../utils/feedback';
import {
  cleanAdminNote,
  validateAdminRequestDecision,
} from './adminPermohonanValidators';

export function useAdminPermohonanValidation({
  selectedRequest,
  setSelectedRequest,
  setSaving,
  fetchData,
}) {
  const [validationDecision, setValidationDecision] = useState('');
  const [validationNote, setValidationNote] = useState('');
  const [selectedSamplingTariffId, setSelectedSamplingTariffId] = useState('');

  const [showDeferredPaymentModal, setShowDeferredPaymentModal] = useState(false);
  const [deferredPaymentNote, setDeferredPaymentNote] = useState('');

  const handleDeferredPaymentByAdmin = async () => {
    if (!selectedRequest) return;

    const cleanDeferredPaymentNote = cleanAdminNote(deferredPaymentNote);

    if (!cleanDeferredPaymentNote) {
      showWarning('Catatan Bayar Nanti wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      const data = await adminPermohonanApi.deferPayment(
        selectedRequest.id_registrasi,
        cleanDeferredPaymentNote
      );

      if (data.success) {
        await fetchData();

        setSelectedRequest((prev) =>
          prev
            ? {
                ...prev,
                status_fppl: FPPL_STATUSES.MENUNGGU_SAMPEL,
              }
            : prev
        );

        setShowDeferredPaymentModal(false);
        setDeferredPaymentNote('');

        showSuccess('Bayar Nanti berhasil dicatat. Permohonan dilanjutkan ke tahap pengambilan sampel.');
      } else {
        showError(data.message || 'Gagal mencatat Bayar Nanti.');
      }
    } catch {
      showError('Gagal terhubung ke server.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveValidation = async () => {
    const validationMessage = validateAdminRequestDecision({
      selectedRequest,
      decision: validationDecision,
      note: validationNote,
      selectedSamplingTariffId,
    });

    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    const cleanValidationNote = cleanAdminNote(validationNote);

    setSaving(true);
    try {
      const action = validationDecision === 'setujui' ? 'approve' : 'reject';
      const data = await adminPermohonanApi.verifyRequest(selectedRequest.id_registrasi, {
        action,
        note: cleanValidationNote,
        id_tarif_pengambilan:
          selectedRequest.jenis_pengambilan_sampel === 'Petugas'
            ? selectedSamplingTariffId
            : null,
      });

      if (data.success) {
        await fetchData();
        setSelectedRequest((prev) => ({
          ...prev,
          status_fppl: action === 'approve' ? 'Menunggu Penentuan Metode' : 'Dibatalkan',
          id_tarif_pengambilan: data.data?.id_tarif_pengambilan || prev?.id_tarif_pengambilan,
          catatan_penolakan:
            action === 'reject' ? data.data?.catatan_penolakan || cleanValidationNote : null,
        }));
        setValidationDecision('');
        setValidationNote('');
        setSelectedSamplingTariffId('');
      } else {
        showError(data.message || 'Gagal menyimpan keputusan.');
      }
    } catch {
      showError('Gagal terhubung ke server.');
    } finally {
      setSaving(false);
    }
  };

  return {
    validationDecision,
    setValidationDecision,
    validationNote,
    setValidationNote,
    selectedSamplingTariffId,
    setSelectedSamplingTariffId,
    showDeferredPaymentModal,
    setShowDeferredPaymentModal,
    deferredPaymentNote,
    setDeferredPaymentNote,
    handleDeferredPaymentByAdmin,
    handleSaveValidation,
  };
}
