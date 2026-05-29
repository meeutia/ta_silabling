export function RegistrationPurposeStep({
    lockedSectionClass,
  lockedInputClass,
  formData,
  handleInputChange,
  handleRadioChange,
}) {
  return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Maksud Pengujian Laboratorium
              </h2>

              <fieldset  className={lockedSectionClass}>
                <div className="space-y-3">
                  {[
                    { value: 'Mencukupi persyaratan persetujuan lingkungan', label: 'Mencukupi persyaratan persetujuan lingkungan' },
                    { value: 'Pemantauan rutin kualitas lingkungan', label: 'Pemantauan rutin kualitas lingkungan' },
                    { value: 'Pengawasan kualitas lingkungan', label: 'Pengawasan kualitas lingkungan' },
                    { value: 'Menindaklanjuti pengaduan', label: 'Menindaklanjuti pengaduan' },
                    { value: 'lainnya', label: 'Lainnya' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-emerald-500 transition-all"
                    >
                      <input
                        type="radio"
                        name="maksudPengujian"
                        value={option.value}
                        checked={formData.maksudPengujian === option.value}
                        onChange={() => handleRadioChange(option.value)}
                        className="w-5 h-5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-gray-700">{option.label}</span>
                    </label>
                  ))}

                  {formData.maksudPengujian === 'lainnya' && (
                    <input
                      type="text"
                      name="maksudLainnya"
                      value={formData.maksudLainnya}
                      onChange={handleInputChange}
                      placeholder="Sebutkan maksud lainnya..."
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none mt-2 ${lockedInputClass}`}
                    />
                  )}
                </div>
              </fieldset>
            </div>
  );
}
