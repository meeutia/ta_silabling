import { requestData } from './httpClient';

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      query.set(key, value);
    }
  });

  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export const catalogApi = {
  getSampleTypes() {
    return requestData('/catalog/sample-types');
  },

  getBmStandards(idJenisSampel) {
    return requestData('/catalog/bm-standards' + buildQuery({ id_jenis_sampel: idJenisSampel }));
  },

  getParametersBySampleTypeAndStandard(idJenisSampel, idRegBm) {
    return requestData(
      `/catalog/sample-types/${encodeURIComponent(idJenisSampel)}/parameters` +
        buildQuery({ id_reg_bm: idRegBm })
    );
  },

  getParameterTariffs() {
    return requestData('/catalog/parameter-tariffs');
  },

  getPickupTariffs() {
    return requestData('/catalog/pickup-tariffs');
  },
};
