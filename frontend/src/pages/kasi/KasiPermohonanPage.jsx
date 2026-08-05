import { useState, useEffect, useCallback, useRef } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useLocation } from 'react-router-dom';
import { X, CheckCircle, Loader2 } from 'lucide-react';
import { getApiErrorMessage } from '../../api/httpClient';
import { kasiRequestApi } from '../../api/kasiRequestApi';
import { showError, showSuccess, showWarning } from '../../utils/feedback';

import { formatInsituLabel, getFilteredMethods, getFpmKey, getMethodAcuan, getMethodId, getMethodName, getParamName, isMethodSubkontrak, normalizeInsituValue } from './kasiPermohonanUtils';
import { KasiPermohonanListSection } from './KasiPermohonanListSection.jsx';

export function KasiPermohonanPage({ initialRegistrationId = '', onDetailRouteChange = null }) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('Verifikasi Permintaan');
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Semua');

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestDetail, setRequestDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showMethodModal, setShowMethodModal] = useState(false);
  
  // mapKey = `${paramId}_${waterType}`
  const [selectedMethods, setSelectedMethods] = useState({});
  const [selectedCapabilities, setSelectedCapabilities] = useState({});
  const [capabilityNotes, setCapabilityNotes] = useState({});
  const [selectedInsitu, setSelectedInsitu] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const initialDetailOpenedRef = useRef('');

  const closeMethodModal = useCallback(() => {
    setShowMethodModal(false);
    setSelectedRequest(null);
    setRequestDetail(null);
    onDetailRouteChange?.('');
  }, [onDetailRouteChange]);

  const formatDateOnly = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const fetchRequests = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    if (!silent) setError('');
    const statusQuery = activeTab === 'Riwayat' ? 'Riwayat' : '';

    try {
      const data = await kasiRequestApi.getRequests(statusQuery);
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!silent) setError(getApiErrorMessage(err, 'Gagal memuat data permohonan.'));
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchRequests]);

  useAutoRefresh(fetchRequests);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const nextTab = params.get('tab');
    const nextFilter = params.get('filter');
    const nextSearch = params.get('q');

    if (['Verifikasi Permintaan', 'Riwayat'].includes(nextTab)) {
      setActiveTab(nextTab);
    }

    if (nextFilter) {
      const validFilters = (nextTab === 'Riwayat' || activeTab === 'Riwayat')
        ? ['Semua', 'Disetujui', 'Ditolak']
        : ['Semua', 'Menunggu', 'Disetujui', 'Ditolak'];

      setActiveFilter(validFilters.includes(nextFilter) ? nextFilter : 'Semua');
    }

    if (nextSearch !== null) {
      setSearchQuery(nextSearch);
    }
  }, [activeTab, location.search]);

  const filteredRequests = requests.filter((request) => {
    const noReg = String(request.noReg || '').toLowerCase();
    const customer = String(request.pelanggan || '').toLowerCase();
    const sample = String(request.jenisSampel || '').toLowerCase();
    const status = String(request.status || '').toLowerCase();
    const query = searchQuery.trim().toLowerCase();

    const matchesSearch = !query || noReg.includes(query) || customer.includes(query) || sample.includes(query) || status.includes(query);

    if (!matchesSearch) return false;
    if (activeFilter === 'Semua') return true;

    if (activeTab === 'Verifikasi Permintaan') {
      if (activeFilter === 'Menunggu') return status.includes('menunggu');
      if (activeFilter === 'Disetujui') return status.includes('disetujui');
      if (activeFilter === 'Ditolak') return status.includes('ditolak') || status.includes('dibatalkan');
      return true;
    }

    if (activeFilter === 'Disetujui') return status === 'disetujui';
    if (activeFilter === 'Ditolak') return status === 'ditolak';
    return true;
  });

  const handleViewDetail = async (request) => {
    const registrationId = String(
      request?.noReg ||
        request?.id_registrasi ||
        request?.idRegistrasi ||
        request?.nomorRegistrasi ||
        request?.nomor_fppl ||
        request?.nomorFppl ||
        ''
    ).trim();

    setSelectedRequest(request);
    setShowMethodModal(true);
    if (registrationId) onDetailRouteChange?.(registrationId);
    setDetailLoading(true);
    try {
      const raw = await kasiRequestApi.getMethods(request.noReg);
      setRequestDetail(raw);

      const initialMethods = {};
      const initialCapabilities = {};
      const initialCapabilityNotes = {};
      const initialInsitu = {};

      (raw?.kelompokSampel || []).forEach((group) => {
        (group.parameters || []).forEach((param) => {
          const key = getFpmKey(param);

          if (!key) return;

          initialMethods[key] =
            param.id_metode_parameter ||
            param.currentMethodId ||
            param.idMetodeParameter ||
            '';

          initialCapabilities[key] =
            param.status_kemampuan_lab ||
            param.capabilityStatus ||
            param.statusKemampuanLab ||
            '';

          initialCapabilityNotes[key] =
            param.catatan_kemampuan ||
            param.capabilityNote ||
            param.catatanKemampuan ||
            '';
          
          initialInsitu[key] = normalizeInsituValue(
            param.is_insitu ?? param.isInsitu
          );
        });
      });

      setSelectedMethods(initialMethods);
      setSelectedCapabilities(initialCapabilities);
      setCapabilityNotes(initialCapabilityNotes);
      setSelectedInsitu(initialInsitu);
    } catch (err) {
      showError(getApiErrorMessage(err, 'Terjadi kesalahan saat mengambil detail.'));
      closeMethodModal();
    } finally {
      setDetailLoading(false);
    }
  };


  useEffect(() => {
    const targetId = String(initialRegistrationId || '').trim();

    if (!targetId || isLoading || detailLoading) return;
    if (initialDetailOpenedRef.current === targetId) return;

    const matchedRequest = requests.find((item) => {
      const candidates = [
        item?.noReg,
        item?.id_registrasi,
        item?.idRegistrasi,
        item?.nomorRegistrasi,
        item?.nomor_fppl,
        item?.nomorFppl,
      ];

      return candidates.some((value) => String(value || '').trim() === targetId);
    });

    if (!matchedRequest) return;

    initialDetailOpenedRef.current = targetId;
    handleViewDetail(matchedRequest);
  // handleViewDetail sengaja tidak dimasukkan dependency agar auto-open tidak berulang saat state modal berubah.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailLoading, initialRegistrationId, isLoading, requests]);

  const handleMethodChange = (fpmId, methodId) => {
    setSelectedMethods((prev) => ({
      ...prev,
      [fpmId]: methodId,
    }));
  };

  const handleCapabilityChange = (fpmId, capabilityStatus) => {
    setSelectedCapabilities((prev) => ({
      ...prev,
      [fpmId]: capabilityStatus,
    }));

    setSelectedMethods((prev) => ({
      ...prev,
      [fpmId]: '',
    }));
  };

  const handleCapabilityNoteChange = (fpmId, value) => {
    setCapabilityNotes((prev) => ({
      ...prev,
      [fpmId]: value,
    }));
  };

  const handleInsituChange = (fpmId, value) => {
    setSelectedInsitu((prev) => ({
      ...prev,
      [fpmId]: value,
    }));
  };

  const handleVerify = async () => {
    let allSelected = true;
    const selections = [];

    (requestDetail?.kelompokSampel || []).forEach((group) => {
      (group.parameters || []).forEach((param) => {
        const fpmId = getFpmKey(param);

        if (!fpmId) {
          allSelected = false;
          return;
        }

        const capabilityStatus = selectedCapabilities[fpmId];
        const methodId = selectedMethods[fpmId];
        const insituValue = selectedInsitu[fpmId];

        if (!capabilityStatus) {
          allSelected = false;
        }

        // MAMPU dan TIDAK_MAMPU sama-sama wajib pilih metode.
        // Bedanya: MAMPU pilih metode internal, TIDAK_MAMPU pilih metode subkontrak.
        if (!methodId) {
          allSelected = false;
        }

        if (!['0', '1'].includes(String(insituValue))) {
          allSelected = false;
        }

        selections.push({
          fpmId,
          capabilityStatus,
          methodId,
          isInsitu: Number(insituValue),
          capabilityNote: capabilityNotes[fpmId] || null,
        });
      });
    });

    if (!allSelected) {
      showWarning(
        'Silakan pilih status kemampuan, status insitu, dan metode untuk semua parameter. Jika Tidak Mampu, pilih metode subkontrak.'
      );
      return;
    }

    setSubmitting(true);

    try {
      await kasiRequestApi.saveMethods(selectedRequest.noReg, selections);
      showSuccess('Permohonan berhasil diterima.');
      closeMethodModal();
      fetchRequests();
    } catch (err) {
      showError(getApiErrorMessage(err, 'Gagal memverifikasi.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestSubcontractData = async (fpmId) => {
    if (!fpmId) return;

    setSubmitting(true);
    try {
      await kasiRequestApi.createSubcontractRequest(
        selectedRequest.noReg,
        fpmId,
        capabilityNotes[fpmId] || ''
      );
      showSuccess('Permintaan subkontrak berhasil dikirim ke Admin.');
      await handleViewDetail(selectedRequest); // refresh
    } catch (err) {
      showError(getApiErrorMessage(err, 'Gagal mengirim permintaan subkontrak.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubcontractRequest = async (requestId) => {
    if (!requestId) return;

    setSubmitting(true);
    try {
      await kasiRequestApi.cancelSubcontractRequest(selectedRequest.noReg, requestId);
      showSuccess('Permintaan subkontrak berhasil dibatalkan.');
      await handleViewDetail(selectedRequest); // refresh
    } catch (err) {
      showError(getApiErrorMessage(err, 'Gagal membatalkan permintaan subkontrak.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 md:p-8">
        <KasiPermohonanListSection
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredRequests={filteredRequests}
          isLoading={isLoading}
          error={error}
          formatDateOnly={formatDateOnly}
          handleViewDetail={handleViewDetail}
        />

        {/* Method Selection Modal */}
        {showMethodModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-white">Detail Permohonan & Verifikasi</h3>
                  <p className="text-emerald-100 text-sm">No. Registrasi: {selectedRequest.noReg}</p>
                </div>
                <button
                  onClick={closeMethodModal}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                {detailLoading ? (
                   <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
                      <p className="text-gray-500">Memuat detail permohonan...</p>
                   </div>
                ) : requestDetail ? (
                  <>
                    {/* Customer Info */}
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Informasi Pelanggan</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Nama Pelanggan:</span>
                          <span className="ml-2 font-medium text-gray-900">{requestDetail.pelanggan}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">PIC:</span>
                          <span className="ml-2 font-medium text-gray-900">{requestDetail.pic}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">No Telp:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {requestDetail.noTelp || requestDetail.no_telp || requestDetail.telp || '-'}
                          </span>                        </div>
                        <div>
                          <span className="text-gray-600">Alamat:</span>
                          <span className="ml-2 font-medium text-gray-900">{requestDetail.alamat}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">Jenis Sampel:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {(requestDetail.kelompokSampel || [])
                              .map((item) => item.jenis_sampel)
                              .filter(Boolean)
                              .join(', ') || '-'}
                          </span>
                        </div>
                        {activeTab === 'Riwayat' && (
                          <div className="col-span-2">
                            <span className="text-gray-600">Status Keputusan Kasi:</span>
                            <span className="ml-2 font-semibold text-gray-900">{requestDetail.statusKeputusanKasi || '-'}</span>
                          </div>
                          
                        )}
                      </div>
                    </div>

                    {/* Catatan Verifikasi / Penolakan (khusus Riwayat) */}
                    {activeTab === 'Riwayat' && requestDetail.catatanPenolakan && (
                      <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 mb-6">
                        <h4 className="font-semibold text-amber-900 mb-2">Catatan Verifikasi / Alasan Penolakan</h4>
                        <p className="text-sm text-amber-800">{requestDetail.catatanPenolakan}</p>
                      </div>
                    )}

                    {/* Parameters & Capability + Method Selection */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4">Pilih Kemampuan Lab & Metode Pengujian</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Untuk setiap parameter, pilih status kemampuan lab. Jika Mampu, pilih metode internal. Jika Tidak Mampu, pilih metode subkontrak.
                      </p>

                      <div className="space-y-6">
                        {(requestDetail.kelompokSampel || []).map((group, groupIdx) => (
                          <div
                            key={group.id_fppl_sampel || groupIdx}
                            className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm"
                          >
                            <div className="mb-4 pb-3 border-b border-gray-200">
                              <h5 className="font-bold text-gray-900 text-lg">{group.jenis_sampel}</h5>
                              <p className="text-sm text-gray-600 mt-1">{group.reg_bm}</p>
                              <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full inline-block mt-2">
                                Jumlah Sampel: {group.jumlah_sampel || 1}
                              </p>
                              <p className="text-sm text-gray-600 mt-3">
                                Pilih metode untuk setiap parameter pada kelompok sampel ini:
                              </p>
                            </div>

                            <div className="space-y-6">
                              {(group.parameters || []).map((param, pIdx) => {
                                const fpmId = getFpmKey(param);
                                const currentCapability = selectedCapabilities[fpmId] || '';
                                const selectedMethod = selectedMethods[fpmId] || '';
                                const currentInsitu = selectedInsitu[fpmId] || '';
                                return (
                                  <div key={fpmId || `${groupIdx}-${pIdx}`} className="space-y-3">
                                    <div className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                                      <span className="font-semibold text-gray-900 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                                          {pIdx + 1}
                                        </span>
                                        {getParamName(param)}
                                      </span>
                                    </div>

                                    <div className="pl-4 border-l-2 border-gray-100 ml-3">
                                      {activeTab === 'Riwayat' ? (
                                        <>
                                          <p className="text-sm text-gray-700 mb-1">
                                            <span className="font-medium">Status Kemampuan Laboratorium:</span> {currentCapability || '-'}
                                          </p>
                                          <p className="text-sm text-gray-700 mb-1">
                                            <span className="font-medium">Status Insitu:</span>{' '}
                                            {formatInsituLabel(currentInsitu)}
                                          </p>

                                          {currentCapability === 'TIDAK_MAMPU' && (
                                            <p className="text-sm text-gray-700 mb-2">
                                              <span className="font-medium">Catatan Kemampuan:</span> {capabilityNotes[fpmId] || '-'}
                                            </p>
                                          )}

                                          {currentCapability && (() => {
                                            const filteredMethods = getFilteredMethods(param, currentCapability);
                                            const methodLabel = currentCapability === 'TIDAK_MAMPU'
                                              ? 'Pilih Metode Subkontrak:'
                                              : 'Pilih Metode Pengujian Internal:';

                                            return (
                                              <>
                                                <h6 className="text-sm font-medium text-gray-700 mb-2">
                                                  {methodLabel}
                                                </h6>

                                                {filteredMethods.length === 0 ? (
                                                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                                    Belum ada metode {currentCapability === 'TIDAK_MAMPU' ? 'subkontrak' : 'internal'} untuk parameter ini.
                                                  </p>
                                                ) : (
                                                  <div className="space-y-2">
                                                    {filteredMethods.map((method) => {
                                                      const methodId = getMethodId(method);
                                                      const methodName = getMethodName(method);
                                                      const acuanMetode = getMethodAcuan(method);
                                                      const isSubkontrak = isMethodSubkontrak(method);

                                                      return (
                                                        <label
                                                          key={methodId}
                                                          className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                                            String(selectedMethod) === String(methodId)
                                                              ? 'border-emerald-600 bg-emerald-50'
                                                              : 'border-gray-300 hover:border-emerald-400 bg-white'
                                                          }`}
                                                        >
                                                          <input
                                                            type="radio"
                                                            name={`method-${fpmId}`}
                                                            value={methodId}
                                                            checked={String(selectedMethod) === String(methodId)}
                                                            onChange={() => handleMethodChange(fpmId, methodId)}
                                                            className="mt-1 w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                                                          />

                                                          <span className="text-sm flex-1">
                                                            <span className="block font-semibold text-gray-900">
                                                              {methodName}

                                                              {isSubkontrak && (
                                                                <span className="ml-2 text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                                                                  Subkontrak
                                                                </span>
                                                              )}
                                                            </span>

                                                            {acuanMetode && (
                                                              <span className="mt-0.5 block text-xs text-gray-500">
                                                                {acuanMetode}
                                                              </span>
                                                            )}
                                                          </span>
                                                        </label>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </>
                                            );
                                          })()}
                                        </>
                                      ) : (
                                        <>
                                        <h6 className="text-sm font-medium text-gray-700 mb-2">
                                          Status Kemampuan Laboratorium:
                                        </h6>

                                        <select
                                          value={currentCapability}
                                          onChange={(e) => handleCapabilityChange(fpmId, e.target.value)}
                                          className="w-full max-w-xs mb-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                        >
                                          <option value="">Pilih status kemampuan</option>
                                          <option value="MAMPU">Mampu</option>
                                          <option value="TIDAK_MAMPU">Tidak Mampu / Subkontrak</option>
                                        </select>

                                        <h6 className="text-sm font-medium text-gray-700 mb-2">
                                          Status Insitu:
                                        </h6>

                                        <select
                                          value={currentInsitu}
                                          onChange={(e) => handleInsituChange(fpmId, e.target.value)}
                                          className="w-full max-w-xs mb-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                        >
                                          <option value="">Pilih status insitu</option>
                                          <option value="1">Ya, Insitu</option>
                                          <option value="0">Tidak, Bukan Insitu</option>
                                        </select>

                                          {currentCapability === 'TIDAK_MAMPU' && (
                                            <>
                                              <h6 className="text-sm font-medium text-gray-700 mb-2">
                                                Catatan Kemampuan:
                                              </h6>
                                              <textarea
                                                value={capabilityNotes[fpmId] || ''}
                                                onChange={(e) => handleCapabilityNoteChange(fpmId, e.target.value)}
                                                rows={2}
                                                placeholder="Contoh: alat tidak tersedia / kapasitas penuh"
                                                className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-y"
                                              />
                                            </>
                                          )}

                                          {currentCapability && (() => {
                                            const filteredMethods = getFilteredMethods(param, currentCapability);

                                            const methodLabel =
                                              currentCapability === 'TIDAK_MAMPU'
                                                ? 'Pilih Metode Subkontrak:'
                                                : 'Pilih Metode Pengujian Internal:';

                                            return (
                                              <>
                                                <h6 className="text-sm font-medium text-gray-700 mb-2">
                                                  {methodLabel}
                                                </h6>

                                                {filteredMethods.length === 0 ? (
                                                  <div className="space-y-3">
                                                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                                      Belum ada metode {currentCapability === 'TIDAK_MAMPU' ? 'subkontrak' : 'internal'} untuk parameter ini.
                                                    </p>
                                                    {currentCapability === 'TIDAK_MAMPU' && (() => {
                                                      const pendingRequest = (param.subcontractRequests || []).find(
                                                        (req) => req.status_permintaan === 'PENDING_ADMIN'
                                                      );
                                                      
                                                      if (pendingRequest) {
                                                        return (
                                                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-4">
                                                            <p className="text-sm text-amber-800">
                                                              <strong>Menunggu Admin:</strong> Permintaan data subkontrak sedang diproses.
                                                            </p>
                                                            <button
                                                              type="button"
                                                              onClick={() => handleCancelSubcontractRequest(pendingRequest.id_permintaan_subkontrak)}
                                                              disabled={submitting}
                                                              className="text-xs font-semibold px-3 py-1.5 bg-white text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
                                                            >
                                                              Batal
                                                            </button>
                                                          </div>
                                                        );
                                                      }

                                                      return (
                                                        <button
                                                          type="button"
                                                          onClick={() => handleRequestSubcontractData(fpmId)}
                                                          disabled={submitting}
                                                          className="text-sm font-semibold px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 w-full"
                                                        >
                                                          Kirim Permintaan Subkontrak ke Admin
                                                        </button>
                                                      );
                                                    })()}
                                                  </div>
                                                ) : (
                                                  <div className="space-y-2">
                                                    {filteredMethods.map((method) => {
                                                      const methodId = getMethodId(method);
                                                      const methodName = getMethodName(method);
                                                      const acuanMetode = getMethodAcuan(method);
                                                      const isSubkontrak = isMethodSubkontrak(method);

                                                      return (
                                                        <label
                                                          key={methodId}
                                                          className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                                            String(selectedMethod) === String(methodId)
                                                              ? 'border-emerald-600 bg-emerald-50'
                                                              : 'border-gray-300 hover:border-emerald-400 bg-white'
                                                          }`}
                                                        >
                                                          <input
                                                            type="radio"
                                                            name={`method-${fpmId}`}
                                                            value={methodId}
                                                            checked={String(selectedMethod) === String(methodId)}
                                                            onChange={() => handleMethodChange(fpmId, methodId)}
                                                            className="mt-1 w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                                                          />

                                                          <span className="text-sm flex-1">
                                                            <span className="block font-semibold text-gray-900">
                                                              {methodName}

                                                              {isSubkontrak && (
                                                                <span className="ml-2 text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                                                                  Subkontrak
                                                                </span>
                                                              )}
                                                            </span>

                                                            {acuanMetode && (
                                                              <span className="mt-0.5 block text-xs text-gray-500">
                                                                {acuanMetode}
                                                              </span>
                                                            )}
                                                          </span>
                                                        </label>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </>
                                            );
                                          })()}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {/* Modal Footer */}
              {!detailLoading && requestDetail && activeTab !== 'Riwayat' && (
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end items-center shrink-0">
                  <button
                    onClick={handleVerify}
                    disabled={submitting}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5" />}
                    Terima
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}