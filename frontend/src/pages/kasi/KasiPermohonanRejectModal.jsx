import { Loader2, X } from 'lucide-react';

export function KasiPermohonanRejectModal({
  showRejectModal,
  setShowRejectModal,
  rejectReason,
  setRejectReason,
  submitting,
  handleReject,
}) {
  if (!showRejectModal) return null;

  return (
    <>
{/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-red-600 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-lg font-bold text-white">Tolak Permohonan</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-white hover:bg-white/20 p-1 rounded transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Masukkan alasan penolakan untuk permohonan ini:
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Tulis alasan penolakan..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowRejectModal(false)}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleReject}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium disabled:opacity-50 flex items-center justify-center"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Tolak Permohonan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
