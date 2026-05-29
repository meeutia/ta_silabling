import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function LandingTariffSection({ tariffData }) {
  const [showMoreParams, setShowMoreParams] = useState(false);
  const rowsToShow = showMoreParams
    ? tariffData.selectedParameters
    : tariffData.selectedParameters.slice(0, 12);
  const hasMoreParameters = tariffData.selectedParameters.length > rowsToShow.length;

  return (
    <>
      {/* Tarif Pengujian Section */}
      <section id="tarif" className="bg-white px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <h3 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">
              Tarif Pengujian Berdasarkan Jenis Air
            </h3>
            <p className="mx-auto max-w-3xl text-base text-gray-600 md:text-xl">
              Pilih jenis air untuk melihat daftar parameter, metode, dan tarif dari data backend.
            </p>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-[#87A96B] p-4 text-white shadow-2xl md:p-8 lg:p-12">
            {tariffData.errorMessage ? (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {tariffData.errorMessage}
              </div>
            ) : null}

            <div className="mb-6 rounded-xl bg-white/10 p-4 backdrop-blur-sm md:p-6">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h4 className="text-2xl font-bold">Harga per Jenis Air</h4>
                  <p className="mt-1 text-sm text-emerald-50">
                    {tariffData.source === 'backend'
                      ? 'Data mengikuti referensi jenis sampel, parameter, metode, dan tarif backend.'
                      : 'Data tarif belum lengkap dari backend.'}
                  </p>
                </div>
                {tariffData.loadingInitial || tariffData.loadingParameters ? (
                  <span className="inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                    Memuat tarif...
                  </span>
                ) : null}
              </div>

              <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
                {tariffData.sampleTypes.length === 0 ? (
                  <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm">
                    Jenis air belum tersedia.
                  </div>
                ) : (
                  tariffData.sampleTypes.map((sampleType) => (
                    <button
                      key={sampleType.id}
                      type="button"
                      onClick={() => {
                        tariffData.setSelectedSampleTypeId(sampleType.id);
                        setShowMoreParams(false);
                      }}
                      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        tariffData.selectedSampleTypeId === sampleType.id
                          ? 'border-white bg-white text-emerald-700 shadow-sm'
                          : 'border-white/30 bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {sampleType.name}
                    </button>
                  ))
                )}
              </div>

              {tariffData.selectedSampleType && tariffData.selectedStandards.length === 0 ? (
                <div className="mb-6 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm">
                  Parameter untuk {tariffData.selectedSampleType.name} belum tersedia.
                </div>
              ) : null}

              <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-white/15">
                <table className="w-full table-fixed text-xs sm:text-sm">
                  <thead className="bg-white/10">
                    <tr className="border-b border-white/20">
                      <th className="w-[34%] px-3 py-3 text-left font-semibold md:px-4">Parameter</th>
                      <th className="w-[43%] px-3 py-3 text-left font-semibold md:px-4">Metode</th>
                      <th className="w-[23%] px-3 py-3 text-right font-semibold md:px-4">Tarif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsToShow.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-10 text-center text-sm text-emerald-50">
                          {tariffData.loadingInitial || tariffData.loadingParameters
                            ? 'Memuat parameter tarif...'
                            : 'Parameter tarif untuk pilihan ini belum tersedia.'}
                        </td>
                      </tr>
                    ) : (
                      rowsToShow.map((param, idx) => (
                        <tr
                          key={`${param.idParameter || param.name}-${param.idMetodeParameter || idx}`}
                          className="border-b border-white/10 last:border-0"
                        >
                          <td className="break-words px-3 py-2 align-top font-medium md:px-4">{param.name}</td>
                          <td className="break-words px-3 py-2 align-top md:px-4">{param.method}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-semibold align-top md:px-4">
                            {param.price && param.price !== '-' ? `Rp ${param.price}` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {hasMoreParameters || showMoreParams ? (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowMoreParams((prev) => !prev)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
                  >
                    <span>{showMoreParams ? 'Sembunyikan' : 'Lihat parameter lainnya'}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showMoreParams ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm md:p-6">
              <h4 className="mb-4 text-xl font-bold">Layanan Pengambilan Sampel</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {tariffData.pickupTariffs.length === 0 ? (
                  <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm">
                    Tarif pengambilan sampel belum tersedia.
                  </div>
                ) : (
                  tariffData.pickupTariffs.map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-col gap-2 rounded-lg bg-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span>{item.label}</span>
                      <span className="font-semibold">Rp {item.price}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>


    </>
  );
}
