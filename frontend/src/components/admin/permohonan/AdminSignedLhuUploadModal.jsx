import React, { useState, useRef } from 'react';
import { adminPermohonanApi } from '../../../api/adminPermohonanApi';
import { UploadCloud, Loader2 } from 'lucide-react';

const AdminSignedLhuUploadModal = ({
  open,
  onClose,
  nomorLhu,
  isReplace = false,
  onSuccess,
}) => {
  const [file, setFile] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  if (!open) return null;

  const handleFileChange = (e) => {
    setErrorMsg('');
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.type !== 'application/pdf') {
        setErrorMsg('File harus berformat PDF.');
        e.target.value = null;
        return;
      }
      if (selected.size > 10 * 1024 * 1024) {
        setErrorMsg('Ukuran file maksimal 10 MB.');
        e.target.value = null;
        return;
      }
      setFile(selected);
    }
  };

  const handleClose = () => {
    setFile(null);
    setConfirmed(false);
    setIsSubmitting(false);
    setErrorMsg('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!file) {
      setErrorMsg('Silakan pilih file PDF LHU terlebih dahulu.');
      return;
    }
    if (!confirmed) {
      setErrorMsg('Anda harus mengonfirmasi bahwa file tersebut sudah ditandatangani oleh Kepala Laboratorium.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('confirmedSignedByKalab', 'true');

      if (isReplace) {
        await adminPermohonanApi.replaceSignedLhu(nomorLhu, formData);
      } else {
        await adminPermohonanApi.uploadSignedLhu(nomorLhu, formData);
      }
      
      // We assume parent component handles the success message/toast
      onSuccess?.();
      handleClose();
    } catch (error) {
      setErrorMsg(error.message || 'Gagal mengunggah LHU bertanda tangan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {isReplace ? 'Ganti LHU Bertanda Tangan' : 'Unggah LHU Bertanda Tangan'}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <p className="text-sm text-gray-500 mb-4">
            Nomor LHU: <span className="font-semibold text-gray-900">{nomorLhu}</span>
          </p>

          <div 
            onClick={() => !isSubmitting && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              file ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <UploadCloud className={`w-12 h-12 mx-auto mb-3 ${file ? 'text-emerald-500' : 'text-gray-400'}`} />
            <p className="text-sm font-medium text-gray-900 mb-1">
              {file ? file.name : 'Klik untuk memilih file PDF'}
            </p>
            <p className="text-xs text-gray-500">
              (Maks. 10MB, hanya PDF)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="mt-6 flex items-start gap-3">
            <div className="flex items-center h-5">
              <input
                id="confirm-signed"
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={isSubmitting}
                className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
              />
            </div>
            <label htmlFor="confirm-signed" className="text-sm text-gray-700 cursor-pointer select-none leading-tight">
              Saya mengonfirmasi bahwa file ini sudah ditandatangani oleh Kepala Laboratorium secara fisik/digital.
            </label>
          </div>

          {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || !confirmed || isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengunggah...
              </>
            ) : (
              'Unggah'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSignedLhuUploadModal;
