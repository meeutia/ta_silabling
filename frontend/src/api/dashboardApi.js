import { requestData } from './httpClient';

const authConfig = { auth: true };

export const dashboardApi = {
  getRequests(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    ).toString();

    return requestData(`/requests${query ? `?${query}` : ''}`, {}, authConfig);
  },

  getParameterTariffs() {
    return requestData('/references/parameter-tariffs', {}, authConfig);
  },

  getPickupTariffs() {
    return requestData('/references/pickup-tariffs', {}, authConfig);
  },

  getLhuPickupQueue() {
    return requestData('/lhu/pickup/queue', {}, authConfig);
  },

  getKasiLhuQueue() {
    return requestData('/assignments/kasi-review/queue', {}, authConfig);
  },

  getPenyeliaAnalysts() {
    return requestData('/assignments/references/analysts', {}, authConfig);
  },

  getPenyeliaPendingItems() {
    return requestData('/assignments/pending-items', {}, authConfig);
  },

  getPenyeliaMonitorRows() {
    return requestData('/assignments/monitor', {}, authConfig);
  },

  getAnalisAssignments() {
    return requestData('/assignments/my', {}, authConfig);
  },

  getQcFinalizationQueue() {
    return requestData('/lhu/finalization-queue', {}, authConfig);
  },

  getLhuFinalizationHistory() {
    return requestData('/lhu/finalization/history', {}, authConfig);
  },

  getKalabQueue() {
    return requestData('/lhu/kalab/queue', {}, authConfig);
  },

};
