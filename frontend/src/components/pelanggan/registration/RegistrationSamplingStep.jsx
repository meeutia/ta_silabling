import { Calendar } from 'lucide-react';
import { getSamplingLocationLabel, getSamplingLocationPlaceholder } from './registrationDateUtils';

export function RegistrationSamplingStep({
    lockedSectionClass,
  formData,
  handleInputChange,
  handleMetodeChange,
  handleDateChange,
  dateErrors,
  timeOptions,
  setShowTariffModal,
  minSelectableDate,
}) {
  return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <Calendar className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-semibold text-gray-900">Data Pengambilan Sampel</h2>
              </div>

              <fieldset  className={lockedSectionClass}>
              {/* Metode Pengambilan */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Metode Pengambilan Sampel <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label
                    className={`flex items-start gap-3 p-5 border-2 rounded-lg cursor-pointer transition-all ${formData.metodePengambilan === 'laboratorium'
                      ? 'border-emerald-600 bg-emerald-50'
                      : 'border-gray-200 hover:border-emerald-300'
                      }`}
                  >
                    <input
                      type="radio"
                      name="metodePengambilan"
                      value="laboratorium"
                      checked={formData.metodePengambilan === 'laboratorium'}
                      onChange={() => handleMetodeChange('laboratorium')}
                      className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                    />
                    <div>
                      <span className="font-medium text-gray-900 block mb-1">
                        Pengambilan sampel oleh laboratorium
                      </span>
                      <span className="text-sm text-gray-600">
                        Petugas kami akan mengambil sampel di lokasi Anda
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-5 border-2 rounded-lg cursor-pointer transition-all ${formData.metodePengambilan === 'kirim'
                      ? 'border-emerald-600 bg-emerald-50'
                      : 'border-gray-200 hover:border-emerald-300'
                      }`}
                  >
                    <input
                      type="radio"
                      name="metodePengambilan"
                      value="kirim"
                      checked={formData.metodePengambilan === 'kirim'}
                      onChange={() => handleMetodeChange('kirim')}
                      className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                    />
                    <div>
                      <span className="font-medium text-gray-900 block mb-1">
                        Sampel dikirim oleh pelanggan
                      </span>
                      <span className="text-sm text-gray-600">
                        Kirim sampel langsung ke laboratorium kami
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Conditional Fields - Pengambilan oleh Laboratorium */}
              {formData.metodePengambilan === 'laboratorium' && (
                <div className="space-y-6 bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                  <h3 className="font-medium text-gray-900 mb-4">Detail Jadwal Pengambilan</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tanggal Pengambilan Sampel <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="tanggalPengambilan"
                        value={formData.tanggalPengambilan}
                        onChange={handleDateChange}
                        required
                        min={minSelectableDate}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white ${dateErrors.tanggalPengambilan ? 'border-red-400' : 'border-gray-300'}`}
                      />
                      {dateErrors.tanggalPengambilan
                        ? <p className="text-xs text-red-600 mt-1">{dateErrors.tanggalPengambilan}</p>
                        : <p className="text-xs text-gray-500 mt-1">Hanya hari kerja (Senin–Jumat), bukan libur nasional</p>
                      }
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Jam Pengambilan Sampel <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="jamPengambilan"
                        value={formData.jamPengambilan}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white"
                      >
                        <option value="">Pilih jam...</option>
                        {timeOptions.map(t => (
                          <option key={t} value={t}>{t} WIB</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-600 mt-1">Jam operasional: 08.00 - 16.00 WIB</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Tanggal dan jam pengambilan dapat berubah sesuai dengan ketersediaan jadwal petugas.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setShowTariffModal(true)}
                      className="px-4 py-2 border border-emerald-300 text-emerald-700 bg-white rounded-lg hover:bg-emerald-50 transition-all text-sm font-medium"
                    >
                      Lihat Harga Pengambilan Sampel oleh Laboratorium
                    </button>
                  </div>
                </div>
              )}

              {/* Conditional Fields - Sampel Dikirim */}
              {formData.metodePengambilan === 'kirim' && (
                <div className="space-y-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-medium text-gray-900 mb-4">Instruksi Pengiriman Sampel</h3>

                  <div className="bg-white rounded-lg p-5 border border-blue-200">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 text-sm font-semibold">!</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 mb-2">Petunjuk Pengiriman:</p>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>Gunakan wadah bersih dan steril (botol kaca/plastik food grade)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>Isi wadah hingga penuh, hindari gelembung udara</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>Tutup wadah rapat dan beri label identitas sampel</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>Kirim maksimal 24 jam setelah pengambilan sampel</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4 mt-4">
                      <p className="font-medium text-gray-900 mb-2 text-sm">Alamat Laboratorium:</p>
                      <p className="text-sm text-gray-700">
                        UPTD Laboratorium DLH<br />
                        Jl. Khatib Sulaiman No.22,Lolong Belanti, Kec. Padang Utara,<br />
                        Padang, Sumatera Barat<br />
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rencana Tanggal Pengantaran Sampel <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="estimasiDiterima"
                      value={formData.estimasiDiterima}
                      onChange={handleDateChange}
                      required
                      min={minSelectableDate}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white ${dateErrors.estimasiDiterima ? 'border-red-400' : 'border-gray-300'}`}
                    />
                    {dateErrors.estimasiDiterima
                      ? <p className="text-xs text-red-600 mt-1">{dateErrors.estimasiDiterima}</p>
                      : <p className="text-xs text-gray-600 mt-1">Hanya hari kerja (Senin–Jumat), bukan libur nasional</p>
                    }
                  </div>
                </div>
              )}

              {formData.metodePengambilan && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {getSamplingLocationLabel(formData.metodePengambilan)}
                    <span className="text-red-500">*</span>
                  </label>

                  <div className="relative">
                    <textarea
                      name="alamatPengambilan"
                      value={formData.alamatPengambilan || ''}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      placeholder={getSamplingLocationPlaceholder(formData.metodePengambilan)}
                      className="w-full rounded-lg border border-gray-200 py-2.5 px-4 pl-10 pr-4 outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {!formData.metodePengambilan && (
                <div className="text-center py-8 text-gray-500">
                  Pilih metode pengambilan sampel untuk melanjutkan
                </div>
              )}

              </fieldset>
            
            </div>
  );
}
