import { ArrowLeft } from 'lucide-react';
import { StatusBadge } from './analisDetailUtils';

export function AnalisDetailHeader({ detail, onBack }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 rounded-lg  px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Worksheet Pengujian
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={detail.statusDetail || detail.status_detail} />
      </div>
    </div>
  );
}
