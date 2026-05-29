import React from 'react';
import { AlertCircle } from 'lucide-react';
import { scientificPresets, scientificSymbols } from './parameterConstants';

function ScientificInsertMenu({ insertText }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
      >
        {open ? 'Tutup simbol & rumus' : 'Sisipkan simbol & rumus'}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Simbol cepat
          </p>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {scientificSymbols.map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => insertText(symbol)}
                className="min-w-8 px-2 py-1 text-sm font-medium bg-white border border-gray-200 rounded-md text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
              >
                {symbol}
              </button>
            ))}
          </div>

          <p className="text-xs font-medium text-gray-500 mb-2">
            Rumus umum
          </p>

          <div className="flex flex-wrap gap-1.5">
            {scientificPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => insertText(preset)}
                className="px-2.5 py-1 text-xs font-medium bg-white border border-gray-200 rounded-md text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScientificInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  type = 'text',
}) {
  const inputRef = React.useRef(null);

  const insertText = (text) => {
    const input = inputRef.current;
    const currentValue = value || '';

    if (!input) {
      onChange({
        target: {
          name,
          value: currentValue + text,
        },
      });
      return;
    }

    const start = input.selectionStart ?? currentValue.length;
    const end = input.selectionEnd ?? currentValue.length;

    const nextValue =
      currentValue.slice(0, start) + text + currentValue.slice(end);

    onChange({
      target: {
        name,
        value: nextValue,
      },
    });

    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + text.length, start + text.length);
    });
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <input
        ref={inputRef}
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-500"
      />

      {!disabled && <ScientificInsertMenu insertText={insertText} />}
    </div>
  );
}

function ScientificTextarea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  rows = 3,
}) {
  const textareaRef = React.useRef(null);

  const insertText = (text) => {
    const textarea = textareaRef.current;
    const currentValue = value || '';

    if (!textarea) {
      onChange(currentValue + text);
      return;
    }

    const start = textarea.selectionStart ?? currentValue.length;
    const end = textarea.selectionEnd ?? currentValue.length;

    const nextValue =
      currentValue.slice(0, start) + text + currentValue.slice(end);

    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    });
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <textarea
        ref={textareaRef}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-y min-h-[96px] disabled:bg-gray-100 disabled:text-gray-500"
      />

      {!disabled && <ScientificInsertMenu insertText={insertText} />}
    </div>
  );
}

function ConfirmDeleteModal({ confirmDelete, onClose, onConfirm }) {
  const willDeactivate = confirmDelete?.item?.can_delete === false;
  const actionLabel = willDeactivate ? 'Nonaktifkan' : 'Hapus';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {confirmDelete.title}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {willDeactivate ? 'Konfirmasi penonaktifan data' : 'Konfirmasi penghapusan data'}
              </p>
            </div>
          </div>

          <p className="text-gray-600 mb-5">
            Yakin ingin {willDeactivate ? 'menonaktifkan' : 'menghapus'} <strong>{confirmDelete.description}</strong>?
            <br />
            <span className="text-sm text-gray-500">
              {willDeactivate
                ? 'Data sudah dipakai, jadi tidak dihapus permanen dan hanya disembunyikan dari pilihan baru.'
                : 'Data yang belum terhubung transaksi akan dihapus permanen.'}
            </span>
          </p>

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium shadow-sm"
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { ConfirmDeleteModal, ScientificInput, ScientificTextarea };
