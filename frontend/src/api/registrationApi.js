import { requestData, requestJson } from './httpClient';

export const registrationApi = {
  getSampleTypes() {
    return requestData('/references/sample-types');
  },

  getBmStandards(params = {}) {
    const search = new URLSearchParams();

    if (params.idJenisSampel) {
      search.set('id_jenis_sampel', params.idJenisSampel);
    }

    const query = search.toString();
    return requestData(`/references/bm-standards${query ? `?${query}` : ''}`);
  },

  getPickupTariffs() {
    return requestData('/references/pickup-tariffs');
  },

  getHolidays() {
    return requestData('/references/holidays');
  },

  getCustomerProfiles() {
    return requestData('/me/customers', {}, { auth: true });
  },

  getParametersBySampleTypeAndStandard(jenisSampelId, idRegBm) {
    return requestData(
      `/references/sample-types/${encodeURIComponent(jenisSampelId)}/parameters?id_reg_bm=${encodeURIComponent(idRegBm)}`
    );
  },

  createRequest(payload) {
    return requestJson('/requests', {
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
