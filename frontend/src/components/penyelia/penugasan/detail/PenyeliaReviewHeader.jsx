import { ArrowLeft } from 'lucide-react';

export function PenyeliaReviewHeader({ onBack }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>

        <h1 className="text-2xl font-bold text-gray-900">
          Review Penugasan Analis
        </h1>

        <p className="mt-1 text-gray-600">
          Periksa hasil kerja analis, status submit worksheet, dan file LKA per detail tugas.
        </p>
      </div>
    </div>
  );
}
