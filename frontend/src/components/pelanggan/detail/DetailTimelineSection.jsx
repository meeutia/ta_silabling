import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

export function DetailTimelineSection({
  timelineRef,
  expandedSection,
  toggleSection,
  timelineItems,
}) {
  return (
    <div
      ref={timelineRef}
      className="bg-white rounded-xl shadow-sm border border-gray-100 transition-all"
    >
      <button
        onClick={() => toggleSection('timeline')}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Timeline Status
          </h2>
        </div>
        {expandedSection === 'timeline' ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {expandedSection === 'timeline' && (
        <div className="px-6 pb-6">
          <div className="space-y-4">
            {timelineItems.map((item, idx) => (
              <div key={`${item.status}-${idx}`} className="flex gap-4 items-start">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                  {idx !== timelineItems.length - 1 && (
                    <div className="w-0.5 h-12 bg-emerald-200" />
                  )}
                </div>

                <div className="flex-1 pb-4">
                  <p className="font-medium text-gray-900">{item.status}</p>
                  <p className="text-sm text-gray-600 mt-1">{item.note}</p>
                  {item.date ? (
                    <p className="text-xs text-gray-500 mt-1">{item.date}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
