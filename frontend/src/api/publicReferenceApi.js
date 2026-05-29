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

export const publicReferenceApi = {
  getSampleTypes() {
    return requestData('/references/sample-types');
  },

  getBmStandards(idJenisSampel) {
    return requestData('/references/bm-standards' + buildQuery({ id_jenis_sampel: idJenisSampel }));
  },

  getParametersBySampleTypeAndStandard(idJenisSampel, idRegBm) {
    return requestData(
      `/references/sample-types/${encodeURIComponent(idJenisSampel)}/parameters` +
        buildQuery({ id_reg_bm: idRegBm })
    );
  },

  getParameterTariffs() {
    return requestData('/references/parameter-tariffs');
  },

  getPickupTariffs() {
    return requestData('/references/pickup-tariffs');
  },
};
