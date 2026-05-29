import { Instagram, Mail, MapPin, Phone } from 'lucide-react';

const GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/bKqhEqGw5gtKDrDeA';
const GOOGLE_MAPS_EMBED_URL = 'https://www.google.com/maps?q=Jl.%20Khatib%20Sulaiman%20No.22%2C%20Lolong%20Belanti%2C%20Kec.%20Padang%20Utara%2C%20Kota%20Padang%2C%20Sumatera%20Barat&output=embed';

export function LandingContactSection() {
  return (
    <>
      {/* Kontak Kami Section */}
      <section id="kontak" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">Kontak Kami</h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Hubungi kami untuk konsultasi dan informasi lebih lanjut
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h4 className="text-2xl font-bold text-gray-900 mb-6">Informasi Kontak</h4>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#87A96B]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-[#0B3D2E]" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Telepon</div>
                      <div className="text-gray-600">08126768199 (Yola)</div>
                      <div className="text-gray-600">081363467484 (Wan)</div>
                      <div className="text-gray-600">081363263543 (Luce)</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#87A96B]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-[#0B3D2E]" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Email</div>
                      <div className="text-gray-600">lablingprovsumbar@gmail.com</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#87A96B]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Instagram className="w-6 h-6 text-[#0B3D2E]" /> 
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Instagram</div> {/* Sesuaikan label menjadi Instagram */}
                      <div className="text-gray-600">labling_dlhprovsumbar</div> {/* Ganti dengan username Instagram Anda */}
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#87A96B]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-[#0B3D2E]" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Alamat</div>
                      <div className="text-gray-600">
                        Jl. Khatib Sulaiman No.22,<br />
                        Lolong Belanti, Kec. Padang Utara,<br />
                        Kota Padang, Sumatera Barat
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg md:p-8">
              <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-lg">
                <iframe
                  title="Lokasi UPTD Laboratorium Lingkungan Sumatera Barat"
                  src={GOOGLE_MAPS_EMBED_URL}
                  className="h-72 w-full border-0 md:h-80"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold text-gray-900">Lokasi Laboratorium</div>
                  <p className="text-sm text-gray-600">Buka rute lokasi melalui Google Maps.</p>
                </div>
                <a
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <MapPin className="h-4 w-4" />
                  Buka Google Maps
                </a>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="font-semibold text-gray-900 mb-3">Jam Operasional</div>
                  <div className="space-y-2 text-gray-600">
                    <div className="flex justify-between">
                      <span>Senin - Kamis</span>
                      <span className="font-medium">07.30 - 16.00 WIB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Jumat</span>
                      <span className="font-medium">07.30 - 16.30 WIB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sabtu & Minggu</span>
                      <span className="font-medium text-red-600">Tutup</span>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </section>


    </>
  );
}
