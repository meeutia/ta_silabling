import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

// options: [{value, label}] or [string]
// selected: [value] — stores value identifiers
export function MultiSelectDropdown({ options, selected, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizedOpts = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt);

  const filtered = normalizedOpts.filter(
    (opt) => opt.label.toLowerCase().includes(search.toLowerCase()) && !selected.includes(opt.value)
  );

  const getLabel = (val) => {
    const found = normalizedOpts.find(o => o.value === val);
    return found ? found.label : val;
  };

  const toggleOption = (val) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const removeTag = (val, e) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== val));
  };

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[48px] px-3 py-2 pr-10 border border-gray-300 rounded-lg cursor-pointer flex items-center flex-wrap gap-1.5 bg-white hover:border-emerald-400 transition-colors relative"
      >
        {selected.length === 0 && (
          <span className="text-gray-400 text-sm">{placeholder}</span>
        )}
        {selected.map((val) => (
          <span
            key={val}
            className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-1 rounded-full"
          >
            {getLabel(val)}
            <button
              type="button"
              onClick={(e) => removeTag(val, e)}
              className="hover:bg-emerald-200 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col" style={{ maxHeight: '280px' }}>
          <div className="p-2 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2 border border-gray-200 rounded-md px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari parameter..."
                className="w-full text-sm outline-none bg-transparent"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">Tidak ada parameter ditemukan</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleOption(opt.value)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 transition-colors"
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t border-gray-100 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Hapus semua
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
