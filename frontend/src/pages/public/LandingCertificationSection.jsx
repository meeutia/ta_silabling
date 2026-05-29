import { Award, Shield } from 'lucide-react';
import SertifikatImage from '../../assets/sertifikat.jpg';

export function LandingCertificationSection() {
  return (
    <>
      {/* Sertifikasi & Akreditasi Section */}
      <section id="sertifikasi" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">Sertifikasi dan Akreditasi</h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Komitmen kami terhadap standar kualitas tertinggi
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
                <img
                  src={SertifikatImage} 
                  alt="Accreditation Certificate"
                  className="w-[80%] h-[auto] object-cover rounded-2xl shadow-xl mx-auto"                
                  />
            </div>


            <div className="space-y-6">
              <div className="bg-gradient-to-br from-emerald-600 to-[#87A96B] rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <Shield className="w-12 h-12" />
                  <div>
                    <h4 className="text-xl font-bold">ISO/IEC 17025:2017</h4>
                    <p className="text-gray-100">Standar Internasional</p>
                  </div>
                </div>
                <p className="text-gray-100 text-sm leading-relaxed">
                  Laboratorium kami telah tersertifikasi ISO/IEC 17025:2017 untuk kompetensi laboratorium pengujian dan kalibrasi.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-emerald-600">
                <div className="flex items-center gap-4 mb-4">
                  <Award className="w-12 h-12 text-[#0B3D2E]" />
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">Akreditasi KAN</h4>
                    <p className="text-gray-600">LP-1721-IDN</p>
                  </div>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Terakreditasi oleh Komite Akreditasi Nasional (KAN) untuk berbagai parameter pengujian lingkungan.
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-emerald-600">
                <div className="flex items-center gap-4 mb-4">
                  <Award className="w-12 h-12 text-[#0B3D2E]" />
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">Teregistrasi Kementrian Lingkungan Hidup</h4>
                    <p className="text-gray-600">00276/LPJ/LABLING-1/LRK/KLH</p>
                  </div>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">
                  UPTD Laboratorium Lingkungan juga telah teregistrasi di Kementrian Lingkungan Hidup dengan nomor registrasi 00276/LPJ/LABLING-1/LRK/KLH
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>


    </>
  );
}
