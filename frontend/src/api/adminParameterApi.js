import { requestData, requestJson } from './httpClient';


function normalizeParameterCategory(parameter) {
  if (!parameter || typeof parameter !== 'object') return parameter;
  const kategoriRelasi = parameter.kategori?.nama_kategori || parameter.nama_kategori || '';
  const kategori = parameter.kategori_parameter || kategoriRelasi || '';
  return {
    ...parameter,
    kategori_parameter: kategori,
    nama_kategori: kategori,
    kategori: parameter.kategori || (kategori ? { nama_kategori: kategori } : parameter.kategori),
  };
}

function normalizeParameterMetode(item) {
  if (!item || typeof item !== 'object') return item;
  return {
    ...item,
    is_active: item.is_active ?? true,
    parameter: normalizeParameterCategory(item.parameter),
  };
}

const jsonHeaders = { 'Content-Type': 'application/json' };

function normalizeBool(value) {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}


export const adminParameterApi = {
  async getParameterMethodTabData() {
    const [parameterMetode, parameters, methods, kategoriParameters] = await Promise.all([
      requestData('/admin/parameters', {}, { auth: true }),
      requestData('/admin/parameters/list-parameters', {}, { auth: true }),
      requestData('/admin/parameters/list-methods', {}, { auth: true }),
      requestData('/admin/parameters/list-kategori-parameter', {}, { auth: true }).catch(() => []),
    ]);

    return {
      parameterMetode: Array.isArray(parameterMetode) ? parameterMetode.map(normalizeParameterMetode) : [],
      parameters: Array.isArray(parameters) ? parameters.map(normalizeParameterCategory) : [],
      methods: Array.isArray(methods) ? methods : [],
      kategoriParameters: Array.isArray(kategoriParameters) ? kategoriParameters : [],
    };
  },

  async getRegulasi() {
    const regulasi = await requestData('/admin/parameters/regulasi', {}, { auth: true });
    return Array.isArray(regulasi) ? regulasi : [];
  },

  async getPaketTabData() {
    const [paket, regulasi, jenisSampel, parameters, satuan] = await Promise.all([
      requestData('/admin/parameters/paket', {}, { auth: true }),
      requestData('/admin/parameters/regulasi', {}, { auth: true }),
      requestData('/admin/parameters/list-jenis-sampel', {}, { auth: true }),
      requestData('/admin/parameters/list-parameters', {}, { auth: true }),
      requestData('/admin/parameters/list-satuan', {}, { auth: true }).catch(() => []),
    ]);

    return {
      paket: Array.isArray(paket) ? paket : [],
      regulasi: Array.isArray(regulasi) ? regulasi : [],
      jenisSampel: Array.isArray(jenisSampel) ? jenisSampel : [],
      parameters: Array.isArray(parameters) ? parameters.map(normalizeParameterCategory) : [],
      satuan: Array.isArray(satuan) ? satuan : [],
    };
  },

  async getTarifPengambilan() {
    const tarifPengambilan = await requestData('/admin/parameters/tarif-pengambilan', {}, { auth: true });
    return Array.isArray(tarifPengambilan) ? tarifPengambilan : [];
  },

  async saveParameterMetode(body, selectedItem) {
    return requestJson(
      `/admin/parameters${selectedItem ? `/${selectedItem.id_metode_parameter}` : ''}`,
      {
        method: selectedItem ? 'PUT' : 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(body),
      },
      { auth: true }
    );
  },

  async saveRegulasi(body, selectedItem) {
    return requestJson(
      `/admin/parameters/regulasi${selectedItem ? `/${selectedItem.id_reg_bm}` : ''}`,
      {
        method: selectedItem ? 'PUT' : 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(body),
      },
      { auth: true }
    );
  },

  async savePaket(body, selectedItem) {
    return requestJson(
      `/admin/parameters/paket${selectedItem ? `/${selectedItem.id_pkt_bm}` : ''}`,
      {
        method: selectedItem ? 'PUT' : 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(body),
      },
      { auth: true }
    );
  },

  async saveTarifPengambilan(body, selectedItem) {
    const payload = { ...(body || {}) };
    delete payload.satuan;

    return requestJson(
      `/admin/parameters/tarif-pengambilan${selectedItem ? `/${selectedItem.id_tarif_pengambilan}` : ''}`,
      {
        method: selectedItem ? 'PUT' : 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      },
      { auth: true }
    );
  },


  async toggleParameterMetodeStatus(item) {
    const nextStatus = !normalizeBool(item?.is_active ?? true);
    return requestJson(
      `/admin/parameters/${item.id_metode_parameter}`,
      {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({ is_active: nextStatus }),
      },
      { auth: true }
    );
  },

  async deleteParameterMetode(item) {
    return requestJson(`/admin/parameters/${item.id_metode_parameter}`, { method: 'DELETE' }, { auth: true });
  },

  async deleteRegulasi(item) {
    return requestJson(`/admin/parameters/regulasi/${item.id_reg_bm}`, { method: 'DELETE' }, { auth: true });
  },

  async deletePaket(item) {
    return requestJson(`/admin/parameters/paket/${item.id_pkt_bm}`, { method: 'DELETE' }, { auth: true });
  },


  async toggleRegulasiStatus(item) {
    const nextStatus = !normalizeBool(item?.is_active);
    return requestJson(
      `/admin/parameters/regulasi/${item.id_reg_bm}`,
      {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({ is_active: nextStatus }),
      },
      { auth: true }
    );
  },

  async togglePaketStatus(item) {
    const nextStatus = !normalizeBool(item?.is_active);
    return requestJson(
      `/admin/parameters/paket/${item.id_pkt_bm}`,
      {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({ is_active: nextStatus }),
      },
      { auth: true }
    );
  },

  async togglePaketGroupStatus(item) {
    const nextStatus = !normalizeBool(item?.is_active);
    return requestJson(
      `/admin/parameters/paket-groups/${encodeURIComponent(item.id_reg_bm)}/${encodeURIComponent(item.id_jenis_sampel)}/status`,
      {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({ is_active: nextStatus }),
      },
      { auth: true }
    );
  },

  async deletePaketParameter(item) {
    return requestJson(`/admin/parameters/paket/${encodeURIComponent(item.id_pkt_bm)}/parameters/${encodeURIComponent(item.id_parameter)}`, { method: 'DELETE' }, { auth: true });
  },

  async deleteTarifPengambilan(item) {
    return requestJson(
      `/admin/parameters/tarif-pengambilan/${item.id_tarif_pengambilan}`,
      { method: 'DELETE' },
      { auth: true }
    );
  },

  async getPaketParameters(idPktBm) {
    const parameters = await requestData(`/admin/parameters/paket/${encodeURIComponent(idPktBm)}/parameters`, {}, { auth: true });
    return Array.isArray(parameters) ? parameters : [];
  },

  async addPaketParameter(idPktBm, body) {
    return requestJson(
      `/admin/parameters/paket/${encodeURIComponent(idPktBm)}/parameters`,
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(body),
      },
      { auth: true }
    );
  },

  async updatePaketParameter(item, body) {
    return requestJson(
      `/admin/parameters/paket/${encodeURIComponent(item.id_pkt_bm)}/parameters/${encodeURIComponent(item.id_parameter)}`,
      {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify(body),
      },
      { auth: true }
    );
  },
};
