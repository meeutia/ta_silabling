import { requestData, requestJson } from './httpClient';

export const registrationApi = {
  getSampleTypes() {
    return requestData('/catalog/sample-types');
  },

  getBmStandards(params = {}) {
    const search = new URLSearchParams();

    if (params.idJenisSampel) {
      search.set('id_jenis_sampel', params.idJenisSampel);
    }

    const query = search.toString();
    return requestData(`/catalog/bm-standards${query ? `?${query}` : ''}`);
  },

  getPickupTariffs() {
    return requestData('/catalog/pickup-tariffs');
  },

  getHolidays() {
    return requestData('/requests/schedule/holidays');
  },

  getCustomerProfiles() {
    return requestData('/me/customers', {}, { auth: true });
  },

  getParametersBySampleTypeAndStandard(jenisSampelId, idRegBm) {
    return requestData(
      `/catalog/sample-types/${encodeURIComponent(jenisSampelId)}/parameters?id_reg_bm=${encodeURIComponent(idRegBm)}`
    );
  },

  createRequest(payload) {
    return requestJson('/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, { auth: true });
  },

  validateStep1(payload) {
    return requestJson('/requests/validate-step1', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, { auth: true });
  },

  updateRequest(id, payload) {
    return requestJson(`/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, { auth: true });
  },
};
