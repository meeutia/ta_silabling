import { requestData, requestJson } from './httpClient';

const authConfig = { auth: true };
const jsonHeaders = { 'Content-Type': 'application/json' };

const asArray = (value) => (Array.isArray(value) ? value : []);

const jsonRequest = (path, method, body) => requestJson(
  path,
  {
    method,
    headers: jsonHeaders,
    body: JSON.stringify(body),
  },
  authConfig
);

export const adminPermohonanApi = {
  async getRequests() {
    const rows = await requestData('/requests', {}, authConfig);
    return asArray(rows);
  },

  async getRequestDetail(idRegistrasi) {
    return requestData(`/requests/${idRegistrasi}`, {}, authConfig);
  },

  async getPickupQueue() {
    const rows = await requestData('/lhu/pickup/queue', {}, authConfig);
    return asArray(rows);
  },

  async getScheduleReferences() {
    const [holidays, pccEmployees, pickupTariffs] = await Promise.all([
      requestData('/references/holidays', {}, authConfig),
      requestData('/references/pcc-employees', {}, authConfig),
      requestData('/references/pickup-tariffs', {}, authConfig),
    ]);

    return {
      holidays: asArray(holidays),
      pccEmployees: asArray(pccEmployees),
      pickupTariffs: asArray(pickupTariffs),
    };
  },

  deferPayment(idRegistrasi, note) {
    return jsonRequest(`/requests/${idRegistrasi}/payment/deferred`, 'POST', { note });
  },

  saveSamplingSchedule(idRegistrasi, isUpdate, body) {
    return jsonRequest(
      `/requests/${idRegistrasi}/sampling-schedule`,
      isUpdate ? 'PUT' : 'POST',
      body
    );
  },

  receiveSamples(idRegistrasi, body) {
    return jsonRequest(`/requests/${idRegistrasi}/samples/receive`, 'POST', body);
  },

  verifyRequest(idRegistrasi, body) {
    return jsonRequest(`/requests/${idRegistrasi}/verify`, 'PUT', body);
  },

  savePickupSchedule(body) {
    return jsonRequest('/lhu/pickup/schedule', 'POST', body);
  },

  completePickup(body) {
    return jsonRequest('/lhu/pickup/complete', 'POST', body);
  },

  getScheduleChangeRequests(params = {}) {
    const query = new URLSearchParams(params).toString();
    return requestData(`/requests/schedule-changes${query ? `?${query}` : ''}`, {}, authConfig);
  },

  decideScheduleChange(idPengajuan, body) {
    return jsonRequest(`/requests/schedule-changes/${idPengajuan}/decision`, 'POST', body);
  },

};
