import { useState } from 'react';
import { Beaker, ChevronDown, ChevronUp, ClipboardCheck, Droplets, Leaf, Microscope, Shield } from 'lucide-react';

export function LandingServicesSection() {
  const [showMoreServices, setShowMoreServices] = useState(false);

  return (
    <>
      {/* Layanan Kami Section */}
      <section id="layanan" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">Layanan Kami</h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Layanan pengujian laboratorium yang komprehensif dengan standar internasional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Layanan 1 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-all hover:scale-105 duration-300">
              <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center mb-6 shadow-md">
                <ClipboardCheck className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">
                Layanan Pengambilan Sampel
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Kami menawarkan layanan pengambilan sampel dengan profesional yang bersertifikasi.
              </p>
            </div>

            {/* Layanan 2 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-all hover:scale-105 duration-300">
              <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center mb-6 shadow-md">
                <Microscope className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">
                Layanan Pengujian Laboratorium
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Pengujian lingkungan lainnya dengan metode yang sudah terakreditasi.
              </p>
            </div>
          </div>

          {/* Additional Services */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
            {/* Air Sungai */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <Droplets className="w-6 h-6 text-emerald-600" />
                <h5 className="font-semibold text-gray-900">Pengujian Air Sungai</h5>
              </div>
              <p className="text-sm text-gray-600">
                Pemeriksaan kualitas air sungai untuk pemantauan pencemaran dan kesesuaian pemanfaatan.
              </p>
            </div>

            {/* Air Danau */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <Droplets className="w-6 h-6 text-emerald-600" />
                <h5 className="font-semibold text-gray-900">Pengujian Air Danau</h5>
              </div>
              <p className="text-sm text-gray-600">
                Pemeriksaan kualitas air danau untuk pemantauan kualitas lingkungan dan ekosistem danau.
              </p>
            </div>

            {/* Air Laut */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <Droplets className="w-6 h-6 text-emerald-600" />
                <h5 className="font-semibold text-gray-900">Pengujian Air Laut</h5>
              </div>
              <p className="text-sm text-gray-600">
                Pemeriksaan kualitas air laut untuk mendukung pengelolaan wilayah pesisir dan ekosistem laut.
              </p>
            </div>

            {/* Hygiene Sanitasi */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-6 h-6 text-emerald-600" />
                <h5 className="font-semibold text-gray-900">Pengujian Bersih (AHS)</h5>
              </div>
              <p className="text-sm text-gray-600">
                Pengujian air untuk kolam renang, dapur, toilet, dan fasilitas umum terkait kebersihan dan kesehatan.
              </p>
            </div>

            {/* Layanan tambahan (disembunyikan dulu) */}
            {showMoreServices && (
              <>
                {/* Air Tanah / Sumur */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <Leaf className="w-6 h-6 text-emerald-600" />
                    <h5 className="font-semibold text-gray-900">Pengujian Air Tanah / Sumur Pantau</h5>
                  </div>
                  <p className="text-sm text-gray-600">
                    Analisis kualitas air tanah dan sumur pantau sebagai sumber air bersih rumah tangga maupun industri.
                  </p>
                </div>

                {/* Air Limbah */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <Beaker className="w-6 h-6 text-emerald-600" />
                    <h5 className="font-semibold text-gray-900">Pengujian Air Limbah</h5>
                  </div>
                  <p className="text-sm text-gray-600">
                    Pengujian air limbah domestik, TPA, dan industri untuk memastikan kesesuaian dengan baku mutu.
                  </p>
                </div>

                {/* Air Minum */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <Droplets className="w-6 h-6 text-emerald-600" />
                    <h5 className="font-semibold text-gray-900">Pengujian Air Minum</h5>
                  </div>
                  <p className="text-sm text-gray-600">
                    Pemeriksaan kualitas air minum (PDAM, depot, dan sumber lain) sesuai standar kesehatan.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="text-center mt-10">
            <button
              type="button"
              onClick={() => setShowMoreServices((prev) => !prev)}
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-emerald-600 text-emerald-600 rounded-xl transition-all shadow-lg hover:shadow-xl font-semibold"
            >
              <span>
                {showMoreServices ? "Sembunyikan" : "Lihat Semua Layanan"}
              </span>
              {showMoreServices ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>

        </div>
      </section>




    </>
  );
}
