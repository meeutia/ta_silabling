import { requestBlob, requestData, requestJson } from './httpClient';

export const customerRequestApi = {
  getHolidays() {
    return requestData('/requests/schedule/holidays', {}, { auth: true });
  },

  getAdminContact() {
    return requestData('/requests/support/admin-contact', {}, { auth: true });
  },

  getRequests() {
    return requestData('/requests', {}, { auth: true });
  },

  getDetail(registrationNumber) {
    return requestData(`/requests/${registrationNumber}`, {}, { auth: true });
  },

  submitPaymentDecision(registrationNumber, payload) {
    return requestJson(
      `/requests/${registrationNumber}/payment`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { auth: true }
    );
  },

  getInvoicePdfBlob(registrationNumber) {
    return requestBlob(
      `/requests/${registrationNumber}/invoice/pdf`,
      {},
      { auth: true }
    );
  },

  confirmSchedule(registrationNumber, payload) {
    return requestJson(
      `/requests/${registrationNumber}/schedule-confirmation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      { auth: true }
    );
  },

  requestScheduleChange(payload) {
    return requestJson(
      '/requests/schedule-changes',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      { auth: true }
    );
  },

  cancelScheduleChange(idPengajuan) {
    return requestJson(
      `/requests/schedule-changes/${idPengajuan}/cancel`,
      { method: 'POST' },
      { auth: true }
    );
  },

};
