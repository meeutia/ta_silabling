import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminParameterApi } from '../../../api/adminParameterApi';
import { normalizeBool, stripHtml } from './parameterFormatters';

const EMPTY_PAKET_PARAM_FORM = {
  id_parameter: '',
  satuan_bm: '',
  ket_bm: '',
  nilai_by_paket: {},
};

function assertBmLength(value, maxLength, label) {
  if (String(value || '').length > maxLength) {
    throw new Error(`${label} maksimal ${maxLength} karakter`);
  }
}

function getJenisSampelLabel(item = {}) {
  return item.jenis_sampel_row?.jenis_sampel || item.jenis_sampel?.jenis_sampel || item.jenis_sampel || item.nama_jenis_sampel || '-';
}

function getRegulasiLabel(item = {}) {
  return item.reg_bm?.ref_reg || item.ref_reg || item.id_reg_bm || '-';
}

function getGroupKey(item = {}) {
  return `${item.id_reg_bm || item.reg_bm?.id_reg_bm || ''}__${item.id_jenis_sampel || item.jenis_sampel?.id_jenis_sampel || ''}`;
}

function sortPaketItems(items = []) {
  return [...items].sort((a, b) => {
    const left = String(a.klasifikasi || '').localeCompare(String(b.klasifikasi || ''), 'id');
    if (left !== 0) return left;
    return String(a.id_pkt_bm || '').localeCompare(String(b.id_pkt_bm || ''), 'id');
  });
}

function buildPaketGroups(paketRows = []) {
  const groups = new Map();

  paketRows.forEach((paket) => {
    const groupKey = getGroupKey(paket);
    if (!groupKey || groupKey === '__') return;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        group_key: groupKey,
        id_reg_bm: paket.id_reg_bm || paket.reg_bm?.id_reg_bm || '',
        id_jenis_sampel: paket.id_jenis_sampel || paket.jenis_sampel?.id_jenis_sampel || '',
        reg_bm: paket.reg_bm || null,
        jenis_sampel: paket.jenis_sampel || paket.jenis_sampel_row || null,
        jenis_sampel_label: getJenisSampelLabel(paket),
        paket_items: [],
        is_locked: false,
        is_active: normalizeBool(paket.group_is_active ?? paket.is_active),
      });
    }

    const group = groups.get(groupKey);
    group.paket_items.push(paket);
    group.is_locked = group.is_locked || Boolean(paket.is_locked);
    group.is_active = normalizeBool(paket.group_is_active ?? paket.is_active ?? group.is_active);
  });

  return [...groups.values()]
    .map((group) => {
      const paketItems = sortPaketItems(group.paket_items);
      return {
        ...group,
        paket_items: paketItems,
        total_klasifikasi: paketItems.length,
        klasifikasi_labels: paketItems.map((item) => item.klasifikasi || item.id_pkt_bm).filter(Boolean),
      };
    })
    .sort((a, b) => {
      const regCompare = getRegulasiLabel(a).localeCompare(getRegulasiLabel(b), 'id');
      if (regCompare !== 0) return regCompare;
      return String(a.jenis_sampel_label || '').localeCompare(String(b.jenis_sampel_label || ''), 'id');
    });
}

function createMatrixRows(group, paketParameterResults) {
  const rowMap = new Map();
  const paketItems = group?.paket_items || [];

  paketParameterResults.forEach(({ paket, parameters }) => {
    (parameters || []).forEach((item) => {
      const idParameter = item.id_parameter || item.parameter?.id_parameter;
      if (!idParameter) return;

      if (!rowMap.has(idParameter)) {
        rowMap.set(idParameter, {
          id_parameter: idParameter,
          parameter: item.parameter || {
            id_parameter: idParameter,
            nama_parameter: item.nama_parameter,
            kategori_parameter: item.kategori_parameter,
          },
          nama_parameter: item.nama_parameter || item.parameter?.nama_parameter || '',
          kategori_parameter: item.kategori_parameter || item.parameter?.kategori_parameter || item.parameter?.kategori?.nama_kategori || '',
          satuan_bm: item.satuan_bm || '',
          ket_bm: item.ket_bm || '',
          nilai_by_paket: {},
          existing_by_paket: {},
          paket_items: paketItems,
        });
      }

      const row = rowMap.get(idParameter);
      if (!row.satuan_bm && item.satuan_bm) row.satuan_bm = item.satuan_bm;
      if (!row.ket_bm && item.ket_bm) row.ket_bm = item.ket_bm;
      row.nilai_by_paket[paket.id_pkt_bm] = item.nilai_bm ?? '';
      row.existing_by_paket[paket.id_pkt_bm] = true;
    });
  });

  return [...rowMap.values()].sort((a, b) => {
    const nameA = stripHtml(a.parameter?.nama_parameter || a.nama_parameter || '');
    const nameB = stripHtml(b.parameter?.nama_parameter || b.nama_parameter || '');
    return nameA.localeCompare(nameB, 'id');
  });
}

const DELETE_META = {
  param_metode: {
    title: 'Hapus Parameter & Metode',
    description: (item) => `${item.parameter?.nama_parameter || '-'} - ${item.metode?.nama_metode || '-'}`,
  },
  regulasi: {
    title: 'Hapus Regulasi',
    description: (item) => item.ref_reg || item.id_reg_bm,
  },
  paket: {
    title: 'Hapus Paket Baku Mutu',
    description: (item) => item.nama_pkt || item.id_pkt_bm,
  },
  paket_param: {
    title: 'Hapus Parameter dari Matrix Baku Mutu',
    description: (item) => item.parameter?.nama_parameter || item.nama_parameter || item.id_parameter || '-',
  },
  tarif: {
    title: 'Hapus Tarif Pengambilan',
    description: (item) => item.keterangan_jarak || item.id_tarif_pengambilan,
  },
};



const STATUS_META = {
  param_metode: {
    label: 'parameter metode',
    description: (item) => `${stripHtml(item?.parameter?.nama_parameter || item?.nama_parameter || '-')} - ${item?.metode?.nama_metode || '-'}`,
  },
  regulasi: {
    label: 'regulasi',
    description: (item) => item?.ref_reg || item?.id_reg_bm || '-',
  },
  paket_group: {
    label: 'kelompok baku mutu',
    description: (item) => `${item?.jenis_sampel_label || item?.id_jenis_sampel || '-'} - ${item?.reg_bm?.ref_reg || item?.id_reg_bm || '-'}`,
  },
  paket: {
    label: 'klasifikasi baku mutu',
    description: (item) => item?.klasifikasi || item?.id_pkt_bm || '-',
  },
};

function getInitialFormData(type, item) {
  if (type === 'add_param_metode' || type === 'edit_param_metode') {
    return item
      ? {
          id_metode_parameter: item.id_metode_parameter,
          id_parameter: item.id_parameter || item.parameter?.id_parameter || '',
          id_metode: item.id_metode || item.metode?.id_metode || '',
          acuan_metode: item.acuan_metode || '',
          tarif: item.tarif ?? '',
          is_terakreditasi: normalizeBool(item.is_terakreditasi),
          is_subkontrak: normalizeBool(item.is_subkontrak),
          is_active: normalizeBool(item.is_active ?? true),
          is_new_parameter: false,
          is_new_metode: false,
          nama_parameter: '',
          kategori_parameter: '',
          nama_metode: '',
        }
      : {
          id_parameter: '',
          id_metode: '',
          acuan_metode: '',
          tarif: '',
          is_terakreditasi: false,
          is_subkontrak: false,
          is_active: true,
          is_new_parameter: false,
          is_new_metode: false,
          nama_parameter: '',
          kategori_parameter: '',
          nama_metode: '',
        };
  }

  if (type === 'add_regulasi' || type === 'edit_regulasi') {
    return item
      ? {
          ...item,
          is_active: normalizeBool(item.is_active),
        }
      : {
          instansi: 'KEMENKES',
          ref_reg: '',
          is_active: true,
        };
  }

  if (type === 'add_paket' || type === 'edit_paket') {
    return item
      ? {
          ...item,
          id_reg_bm: item.id_reg_bm || item.reg_bm?.id_reg_bm || '',
          id_jenis_sampel: item.id_jenis_sampel || item.jenis_sampel?.id_jenis_sampel || '',
        }
      : {
          id_reg_bm: '',
          id_jenis_sampel: '',
          klasifikasi: '',
        };
  }

  if (type === 'add_tarif' || type === 'edit_tarif') {
    return item
      ? { ...item }
      : {
          keterangan_jarak: '',
          tarif: '',
        };
  }

  return {};
}

function isTruthyQueryParam(value) {
  return value === '1' || value === 'true' || value === 'yes';
}

function validateParameterMetode(body) {
  if (body.is_new_parameter && !body.nama_parameter?.trim()) {
    throw new Error('Nama parameter baru harus diisi');
  }

  if (body.is_new_metode && !body.nama_metode?.trim()) {
    throw new Error('Nama metode baru harus diisi');
  }

  if (!body.is_new_parameter && !body.id_parameter) {
    throw new Error('Pilih parameter');
  }

  if (!body.is_new_metode && !body.id_metode) {
    throw new Error('Pilih metode');
  }
}

function validateMatrixPayload(formValue, paketItems) {
  if (!String(formValue.satuan_bm || '').trim()) {
    throw new Error('Satuan baku mutu wajib dipilih atau diisi');
  }

  assertBmLength(formValue.satuan_bm, 20, 'Satuan baku mutu');
  assertBmLength(formValue.ket_bm, 100, 'Keterangan baku mutu');

  const nilaiMap = formValue.nilai_by_paket || {};
  const hasAtLeastOneValue = paketItems.some((paket) => String(nilaiMap[paket.id_pkt_bm] ?? '').trim());

  if (!hasAtLeastOneValue) {
    throw new Error('Isi minimal satu nilai baku mutu pada salah satu klasifikasi');
  }

  paketItems.forEach((paket) => {
    assertBmLength(nilaiMap[paket.id_pkt_bm], 30, `Nilai baku mutu ${paket.klasifikasi || paket.id_pkt_bm}`);
  });
}

async function saveByModalType(modalType, body, selectedItem) {
  if (modalType === 'add_param_metode' || modalType === 'edit_param_metode') {
    validateParameterMetode(body);
    const payload = selectedItem
      ? {
          tarif: body.tarif ? Number(body.tarif) : 0,
          is_active: body.is_active,
        }
      : body;
    return adminParameterApi.saveParameterMetode(payload, selectedItem);
  }

  if (modalType === 'add_regulasi' || modalType === 'edit_regulasi') {
    return adminParameterApi.saveRegulasi(body, selectedItem);
  }

  if (modalType === 'add_paket' || modalType === 'edit_paket') {
    return adminParameterApi.savePaket(body, selectedItem);
  }

  if (modalType === 'add_tarif' || modalType === 'edit_tarif') {
    return adminParameterApi.saveTarifPengambilan({ ...body, tarif: body.tarif ? Number(body.tarif) : 0 }, selectedItem);
  }

  throw new Error('Jenis form tidak valid.');
}

async function deleteByType(type, item) {
  if (type === 'param_metode') return adminParameterApi.deleteParameterMetode(item);
  if (type === 'regulasi') return adminParameterApi.deleteRegulasi(item);
  if (type === 'paket') return adminParameterApi.deletePaket(item);
  if (type === 'tarif') return adminParameterApi.deleteTarifPengambilan(item);

  if (type === 'paket_param') {
    const paketItems = item?.paket_items || [];
    const existingMap = item?.existing_by_paket || {};
    const nilaiMap = item?.nilai_by_paket || {};
    const targetPaketItems = paketItems.filter((paket) => existingMap[paket.id_pkt_bm] || String(nilaiMap[paket.id_pkt_bm] ?? '').trim());

    for (const paket of targetPaketItems) {
      await adminParameterApi.deletePaketParameter({
        id_pkt_bm: paket.id_pkt_bm,
        id_parameter: item.id_parameter,
      });
    }

    return { message: 'Parameter berhasil dihapus dari matrix baku mutu' };
  }

  throw new Error('Jenis data tidak valid.');
}

export function useAdminKelolaParameter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const initialTab = urlTab === 'subkontrak' ? 'subcontract_request' : (urlTab || 'parameter_metode');
  const [activeTab, setActiveTab] = useState(initialTab);
  
  useEffect(() => {
    if (urlTab) {
      const targetTab = urlTab === 'subkontrak' ? 'subcontract_request' : urlTab;
      setActiveTab(targetTab);
    }
  }, [urlTab]);

  const [isLoading, setIsLoading] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');

  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success',
  });

  const [parameterMetodeData, setParameterMetodeData] = useState([]);
  const [regulasiData, setRegulasiData] = useState([]);
  const [paketData, setPaketData] = useState([]);
  const [paketParameters, setPaketParameters] = useState([]);
  const [tarifPengambilanData, setTarifPengambilanData] = useState([]);
  const [subcontractRequestsData, setSubcontractRequestsData] = useState([]);

  const [jenisSampelOptions, setJenisSampelOptions] = useState([]);
  const [parametersOption, setParametersOption] = useState([]);
  const [methodsOption, setMethodsOption] = useState([]);
  const [kategoriParameterOptions, setKategoriParameterOptions] = useState([]);
  const [satuanOptions, setSatuanOptions] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitError, setSubmitError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmStatusChange, setConfirmStatusChange] = useState(null);
  const [paketParamForm, setPaketParamForm] = useState(EMPTY_PAKET_PARAM_FORM);
  const [editingPaketParam, setEditingPaketParam] = useState(null);

  const clearModalRouteParams = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    let changed = false;

    ['modal', 'id_parameter', 'is_subkontrak', 'requestId'].forEach((key) => {
      if (nextParams.has(key)) {
        nextParams.delete(key);
        changed = true;
      }
    });

    if (changed) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });

    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    try {
      if (activeTab === 'parameter_metode') {
        const { parameterMetode, parameters, methods, kategoriParameters } = await adminParameterApi.getParameterMethodTabData();

        setParameterMetodeData(parameterMetode);
        setParametersOption(parameters);
        setMethodsOption(methods);
        setKategoriParameterOptions(kategoriParameters);
      }

      if (activeTab === 'regulasi') {
        const regulasi = await adminParameterApi.getRegulasi();
        setRegulasiData(regulasi);
      }

      if (activeTab === 'paket_baku_mutu') {
        const { paket, regulasi, jenisSampel, parameters, satuan } = await adminParameterApi.getPaketTabData();

        setPaketData(paket);
        setRegulasiData(regulasi);
        setJenisSampelOptions(jenisSampel);
        setParametersOption(parameters);
        setSatuanOptions(satuan);
      }

      if (activeTab === 'tarif_pengambilan') {
        const tarifPengambilan = await adminParameterApi.getTarifPengambilan();
        setTarifPengambilanData(tarifPengambilan);
      }

      if (activeTab === 'subcontract_request') {
        const requests = await adminParameterApi.getSubcontractRequests();
        setSubcontractRequestsData(requests);
      }
    } catch (error) {
      showToast(error.message || 'Gagal memuat data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchPaketMatrix = useCallback(
    async (group) => {
      const paketItems = group?.paket_items || [];
      setIsModalLoading(true);

      try {
        const results = [];

        for (const paket of paketItems) {
          const parameters = await adminParameterApi.getPaketParameters(paket.id_pkt_bm);
          results.push({ paket, parameters });
        }

        setPaketParameters(createMatrixRows(group, results));
      } catch (error) {
        showToast(error.message || 'Gagal memuat matrix baku mutu', 'error');
      } finally {
        setIsModalLoading(false);
      }
    },
    [showToast]
  );

  const handleChangeTab = useCallback((tabKey) => {
    setActiveTab(tabKey);
    setSearchQuery('');
    setFilterStatus('Semua');
    if (tabKey !== 'paket_baku_mutu') {
      setPaketParamForm(EMPTY_PAKET_PARAM_FORM);
      setEditingPaketParam(null);
      setPaketParameters([]);
    }
  }, []);

  const handleOpenModal = useCallback(async (type, item = null, initialOverride = null) => {
    if (type === 'review_subcontract' && item?.id_permintaan_subkontrak) {
      setIsModalLoading(true);

      try {
        const detail = await adminParameterApi.getSubcontractRequestDetail(item.id_permintaan_subkontrak);
        setModalType(type);
        setSelectedItem(detail || item);
        setFormData({});
        setSubmitError('');
        setIsModalOpen(true);
      } catch (err) {
        console.error('Gagal memuat detail permintaan subkontrak:', err);
        setModalType(type);
        setSelectedItem(item);
        setFormData({});
        setSubmitError('');
        setIsModalOpen(true);
      } finally {
        setIsModalLoading(false);
      }

      return;
    }

    if (type === 'add_param_metode' && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }

    setModalType(type);
    setSelectedItem(item);
    const baseForm = getInitialFormData(type, item);
    setFormData(initialOverride ? { ...baseForm, ...initialOverride } : baseForm);
    setSubmitError('');
    setIsModalOpen(true);

    if (type === 'add_param_metode' && parametersOption.length === 0) {
      try {
        const { parameterMetode, parameters, methods, kategoriParameters } = await adminParameterApi.getParameterMethodTabData();
        setParameterMetodeData(parameterMetode);
        setParametersOption(parameters);
        setMethodsOption(methods);
        setKategoriParameterOptions(kategoriParameters);
      } catch (err) {
        console.error('Gagal memuat opsi parameter & metode:', err);
      }
    }
  }, [parametersOption.length]);

  const openAddParameterModalForSubcontract = useCallback((paramInfo = {}) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }

    setIsModalOpen(false);
    setModalType(null);
    setSelectedItem(null);
    setFormData({});
    setPaketParamForm(EMPTY_PAKET_PARAM_FORM);
    setEditingPaketParam(null);
    setSubmitError('');
    setActiveTab('parameter_metode');
    setSearchQuery('');
    setFilterStatus('Semua');
    clearModalRouteParams();

    handleOpenModal('add_param_metode', null, {
      id_parameter: String(paramInfo.id_parameter || '').trim(),
      is_subkontrak: true,
      subcontract_request_id: String(paramInfo.requestId || '').trim(),
    });
  }, [clearModalRouteParams, handleOpenModal]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setModalType(null);
    setSelectedItem(null);
    setFormData({});
    setSubmitError('');
    setPaketParamForm(EMPTY_PAKET_PARAM_FORM);
    setEditingPaketParam(null);
    setPaketParameters([]);
    clearModalRouteParams();
  }, [clearModalRouteParams]);

  const handleFormChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;

    if (name === 'is_new_parameter') {
      setSubmitError('');
      setFormData((prev) => ({
        ...prev,
        is_new_parameter: checked,
        id_parameter: checked ? '' : prev.id_parameter,
        nama_parameter: checked ? prev.nama_parameter || '' : '',
        kategori_parameter: checked ? prev.kategori_parameter || '' : '',
      }));
      return;
    }

    if (name === 'is_new_metode') {
      setSubmitError('');
      setFormData((prev) => ({
        ...prev,
        is_new_metode: checked,
        id_metode: checked ? '' : prev.id_metode,
        nama_metode: checked ? prev.nama_metode || '' : '',
      }));
      return;
    }

    setSubmitError('');
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  const handlePaketParamFormChange = useCallback((event) => {
    const { name, value } = event.target;

    if (name.startsWith('nilai_by_paket.')) {
      const idPktBm = name.replace('nilai_by_paket.', '');
      setPaketParamForm((prev) => ({
        ...prev,
        nilai_by_paket: {
          ...(prev.nilai_by_paket || {}),
          [idPktBm]: value,
        },
      }));
      return;
    }

    setPaketParamForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      try {
        const body = { ...formData };

        const savedData = await saveByModalType(modalType, body, selectedItem);
        const savedMethodId = savedData?.data?.id_metode_parameter || savedData?.id_metode_parameter || savedData?.data?.idMetodeParameter || savedData?.idMetodeParameter;

        if (modalType === 'add_param_metode' && formData.subcontract_request_id) {
          await adminParameterApi.approveSubcontractRequest(formData.subcontract_request_id, {
            existingMethodId: savedMethodId,
          });

          setActiveTab('parameter_metode');
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set('tab', 'parameter_metode');
          setSearchParams(nextParams, { replace: true });
        }

        setSubmitError('');

        showToast(
          modalType === 'add_param_metode' && formData.subcontract_request_id
            ? 'Berhasil menambahkan metode dan menyelesaikan permintaan subkontrak'
            : `Berhasil ${selectedItem ? 'mengubah' : 'menambahkan'} data`
        );
        handleCloseModal();
        fetchData();

        if (modalType === 'add_param_metode' && formData.subcontract_request_id) {
          const refreshedRequests = await adminParameterApi.getSubcontractRequests();
          setSubcontractRequestsData(refreshedRequests);
        }
      } catch (error) {
        const message = error?.message || 'Terjadi kesalahan';
        const looksLikeDuplicate = modalType === 'add_param_metode' && !selectedItem && /sudah ada|duplicate|unik|kombinasi/i.test(message);

        if (looksLikeDuplicate) {
          setSubmitError('Parameter, metode, dan acuan ini sudah ada dan masih aktif. Silakan pilih kombinasi lain.');
          return;
        }

        setSubmitError('');
        showToast(message, 'error');
      }
    },
    [fetchData, formData, handleCloseModal, modalType, searchParams, selectedItem, setSearchParams, showToast]
  );

  const openDeleteConfirm = useCallback((type, item) => {
    const meta = DELETE_META[type] || {};
    const willDeactivate = item?.can_delete === false;

    setConfirmDelete({
      type,
      item,
      title: willDeactivate ? (meta.title || 'Data').replace('Hapus', 'Nonaktifkan') : (meta.title || 'Hapus Data'),
      description: meta.description ? meta.description(item) : '',
    });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDelete) return;

    try {
      const result = await deleteByType(confirmDelete.type, confirmDelete.item);

      showToast(result?.message || 'Data berhasil diproses');

      if (confirmDelete.type === 'paket_param' && selectedItem?.group_key) {
        fetchPaketMatrix(selectedItem);
      } else {
        fetchData();
      }

      setConfirmDelete(null);
    } catch (error) {
      showToast(error.message || 'Gagal menghapus data', 'error');
    }
  }, [confirmDelete, fetchData, fetchPaketMatrix, selectedItem, showToast]);

  const handleToggleMasterStatus = useCallback((type, item) => {
    const meta = STATUS_META[type] || { label: 'data', description: () => '' };
    const isCurrentlyActive = normalizeBool(item?.is_active);

    setConfirmStatusChange({
      type,
      item,
      label: meta.label,
      description: meta.description ? meta.description(item) : '',
      isCurrentlyActive,
    });
  }, []);

  const handleConfirmToggleStatus = useCallback(
    async () => {
      if (!confirmStatusChange) return;

      const { type, item, isCurrentlyActive } = confirmStatusChange;

      try {
        let result;
        let label = 'data';

        if (type === 'param_metode') {
          result = await adminParameterApi.toggleParameterMetodeStatus(item);
          label = 'parameter metode';
        } else if (type === 'regulasi') {
          result = await adminParameterApi.toggleRegulasiStatus(item);
          label = 'regulasi';
        } else if (type === 'paket_group') {
          result = await adminParameterApi.togglePaketGroupStatus(item);
          label = 'kelompok baku mutu';
        } else {
          result = await adminParameterApi.togglePaketStatus(item);
          label = 'klasifikasi baku mutu';
        }

        showToast(result?.message || `Berhasil ${isCurrentlyActive ? 'menonaktifkan' : 'mengaktifkan'} ${label}`);
        setConfirmStatusChange(null);
        fetchData();
      } catch (error) {
        showToast(error.message || 'Gagal mengubah status data', 'error');
      }
    },
    [confirmStatusChange, fetchData, showToast]
  );

  const handleKelolaPaket = useCallback(
    async (group) => {
      setSelectedItem(group);
      setModalType('manage_paket_param');
      setIsModalOpen(false);
      setPaketParamForm(EMPTY_PAKET_PARAM_FORM);
      setEditingPaketParam(null);

      await fetchPaketMatrix(group);
    },
    [fetchPaketMatrix]
  );

  const handleAddPaketParameter = useCallback(
    async (event) => {
      event.preventDefault();

      try {
        if (selectedItem?.is_locked) {
          throw new Error('Matrix baku mutu dikunci karena salah satu klasifikasi sudah dipakai pada LHU');
        }

        if (!paketParamForm.id_parameter) {
          throw new Error('Pilih parameter terlebih dahulu');
        }

        const paketItems = selectedItem?.paket_items || [];
        validateMatrixPayload(paketParamForm, paketItems);

        for (const paket of paketItems) {
          const nilaiBm = String(paketParamForm.nilai_by_paket?.[paket.id_pkt_bm] ?? '').trim();
          if (!nilaiBm) continue;

          await adminParameterApi.addPaketParameter(paket.id_pkt_bm, {
            id_parameter: paketParamForm.id_parameter,
            nilai_bm: nilaiBm,
            satuan_bm: paketParamForm.satuan_bm,
            ket_bm: paketParamForm.ket_bm,
          });
        }

        showToast('Berhasil menambahkan parameter matrix');
        setPaketParamForm(EMPTY_PAKET_PARAM_FORM);
        fetchPaketMatrix(selectedItem);
        return true;
      } catch (error) {
        showToast(error.message || 'Gagal menambahkan parameter matrix', 'error');
        return false;
      }
    },
    [fetchPaketMatrix, paketParamForm, selectedItem, showToast]
  );

  const handleStartEditPaketParameter = useCallback((item) => {
    setEditingPaketParam({
      ...item,
      satuan_bm: item.satuan_bm || '',
      ket_bm: item.ket_bm || '',
      nilai_by_paket: { ...(item.nilai_by_paket || {}) },
      existing_by_paket: { ...(item.existing_by_paket || {}) },
    });
  }, []);

  const handleUpdatePaketParameter = useCallback(
    async (event) => {
      event.preventDefault();

      try {
        if (selectedItem?.is_locked) {
          throw new Error('Matrix baku mutu dikunci karena salah satu klasifikasi sudah dipakai pada LHU');
        }

        const paketItems = selectedItem?.paket_items || [];
        validateMatrixPayload(editingPaketParam || {}, paketItems);

        for (const paket of paketItems) {
          const idPktBm = paket.id_pkt_bm;
          const nextValue = String(editingPaketParam?.nilai_by_paket?.[idPktBm] ?? '').trim();
          const existedBefore = Boolean(editingPaketParam?.existing_by_paket?.[idPktBm]);

          if (nextValue) {
            const payload = {
              nilai_bm: nextValue,
              satuan_bm: editingPaketParam.satuan_bm,
              ket_bm: editingPaketParam.ket_bm,
            };

            if (existedBefore) {
              await adminParameterApi.updatePaketParameter(
                { id_pkt_bm: idPktBm, id_parameter: editingPaketParam.id_parameter },
                payload
              );
            } else {
              await adminParameterApi.addPaketParameter(idPktBm, {
                id_parameter: editingPaketParam.id_parameter,
                ...payload,
              });
            }
          } else if (existedBefore) {
            await adminParameterApi.deletePaketParameter({
              id_pkt_bm: idPktBm,
              id_parameter: editingPaketParam.id_parameter,
            });
          }
        }

        showToast('Berhasil mengubah matrix baku mutu');
        setEditingPaketParam(null);
        fetchPaketMatrix(selectedItem);
        return true;
      } catch (error) {
        showToast(error.message || 'Gagal mengubah matrix baku mutu', 'error');
        return false;
      }
    },
    [editingPaketParam, fetchPaketMatrix, selectedItem, showToast]
  );

  const handleEditPaketParamChange = useCallback((event) => {
    const { name, value } = event.target;

    if (name.startsWith('nilai_by_paket.')) {
      const idPktBm = name.replace('nilai_by_paket.', '');
      setEditingPaketParam((prev) => ({
        ...prev,
        nilai_by_paket: {
          ...(prev?.nilai_by_paket || {}),
          [idPktBm]: value,
        },
      }));
      return;
    }

    setEditingPaketParam((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const currentFilterOptions = useMemo(() => {
    if (activeTab === 'parameter_metode') {
      return ['Semua', 'Aktif', 'Nonaktif', 'Terakreditasi', 'Non-akreditasi'];
    }

    if (activeTab === 'subcontract_request') {
      return ['Semua', 'Pending', 'Disetujui', 'Ditolak'];
    }

    return [];
  }, [activeTab]);

  const filteredParameterMetode = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return parameterMetodeData.filter((item) => {
      const text = [
        item.id_metode_parameter,
        item.parameter?.id_parameter,
        stripHtml(item.parameter?.nama_parameter),
        item.parameter?.kategori_parameter || item.parameter?.kategori?.nama_kategori,
        item.metode?.nama_metode,
        item.acuan_metode,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchSearch = !query || text.includes(query);

      const isAccredited = normalizeBool(item.is_terakreditasi);
      const isActive = normalizeBool(item.is_active ?? true);
      const matchFilter =
        filterStatus === 'Semua' ||
        (filterStatus === 'Aktif' && isActive) ||
        (filterStatus === 'Nonaktif' && !isActive) ||
        (filterStatus === 'Terakreditasi' && isAccredited) ||
        (filterStatus === 'Non-akreditasi' && !isAccredited);

      return matchSearch && matchFilter;
    });
  }, [parameterMetodeData, searchQuery, filterStatus]);

  const filteredRegulasi = useMemo(() => regulasiData, [regulasiData]);

  const paketGroups = useMemo(() => buildPaketGroups(paketData), [paketData]);

  const filteredPaket = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return paketGroups;

    return paketGroups.filter((group) => {
      const text = [
        group.id_reg_bm,
        group.id_jenis_sampel,
        group.reg_bm?.instansi,
        group.reg_bm?.ref_reg,
        group.jenis_sampel_label,
        ...(group.klasifikasi_labels || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(query);
    });
  }, [paketGroups, searchQuery]);

  const filteredTarifPengambilan = useMemo(() => tarifPengambilanData, [tarifPengambilanData]);

  const filteredSubcontractRequests = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return subcontractRequestsData.filter((item) => {
      const paramName = item.parameter?.nama_parameter || '';
      const noReg = item.fppl?.no_surat || '';
      const text = `${paramName} ${noReg}`.toLowerCase();
      const matchSearch = !query || text.includes(query);

      const status = item.status_permintaan;
      const matchFilter = 
        filterStatus === 'Semua' ||
        (filterStatus === 'Pending' && status === 'PENDING_ADMIN') ||
        (filterStatus === 'Disetujui' && status === 'DISETUJUI') ||
        (filterStatus === 'Ditolak' && status === 'DITOLAK');
        
      return matchSearch && matchFilter;
    });
  }, [subcontractRequestsData, searchQuery, filterStatus]);

  const currentRowsCount = useMemo(() => {
    if (activeTab === 'parameter_metode') return filteredParameterMetode.length;
    if (activeTab === 'regulasi') return filteredRegulasi.length;
    if (activeTab === 'tarif_pengambilan') return filteredTarifPengambilan.length;
    if (activeTab === 'subcontract_request') return filteredSubcontractRequests.length;
    return filteredPaket.length;
  }, [
    activeTab,
    filteredParameterMetode.length,
    filteredRegulasi.length,
    filteredPaket.length,
    filteredTarifPengambilan.length,
    filteredSubcontractRequests.length,
  ]);

  const rowsByTab = useMemo(
    () => ({
      parameterMetode: filteredParameterMetode,
      regulasi: filteredRegulasi,
      paket: filteredPaket,
      tarifPengambilan: filteredTarifPengambilan,
      subcontractRequests: filteredSubcontractRequests,
    }),
    [filteredParameterMetode, filteredRegulasi, filteredPaket, filteredTarifPengambilan, filteredSubcontractRequests]
  );

  const handleAddCurrentTab = useCallback(() => {
    if (activeTab === 'parameter_metode') handleOpenModal('add_param_metode');
    if (activeTab === 'regulasi') handleOpenModal('add_regulasi');
    if (activeTab === 'paket_baku_mutu') handleOpenModal('add_paket');
    if (activeTab === 'tarif_pengambilan') handleOpenModal('add_tarif');
  }, [activeTab, handleOpenModal]);

  const addButtonLabel = useMemo(() => {
    if (activeTab === 'parameter_metode') return 'Tambah Parameter';
    if (activeTab === 'regulasi') return 'Tambah Regulasi';
    if (activeTab === 'tarif_pengambilan') return 'Tambah Tarif';
    return 'Tambah Klasifikasi';
  }, [activeTab]);

  const searchPlaceholder = useMemo(() => {
    if (activeTab === 'parameter_metode') {
      return 'Cari parameter, metode, acuan, atau satuan...';
    }

    if (activeTab === 'regulasi') {
      return 'Cari instansi atau referensi regulasi...';
    }

    if (activeTab === 'tarif_pengambilan') {
      return 'Cari jarak atau keterangan...';
    }

    return 'Cari regulasi, jenis sampel, atau klasifikasi...';
  }, [activeTab]);

  return {
    activeTab,
    isLoading,
    isModalLoading,
    searchQuery,
    searchPlaceholder,
    filterStatus,
    currentFilterOptions,
    currentRowsCount,
    addButtonLabel,
    rowsByTab,
    toast,
    isModalOpen,
    modalType,
    selectedItem,
    formData,
    submitError,
    confirmDelete,
    confirmStatusChange,
    paketParamForm,
    editingPaketParam,
    paketParameters,
    parametersOption,
    methodsOption,
    kategoriParameterOptions,
    satuanOptions,
    regulasiData,
    jenisSampelOptions,
    handleChangeTab,
    handleOpenModal,
    handleCloseModal,
    handleFormChange,
    handleSubmit,
    handleAddCurrentTab,
    handleKelolaPaket,
    handleToggleMasterStatus,
    handleConfirmToggleStatus,
    handlePaketParamFormChange,
    handleAddPaketParameter,
    handleEditPaketParamChange,
    handleStartEditPaketParameter,
    handleUpdatePaketParameter,
    openAddParameterModalForSubcontract,
    openDeleteConfirm,
    handleConfirmDelete,
    setSearchQuery,
    setFilterStatus,
    setConfirmDelete,
    setConfirmStatusChange,
    setEditingPaketParam,
    subcontractRequestsData,
    fetchData,
  };
}
