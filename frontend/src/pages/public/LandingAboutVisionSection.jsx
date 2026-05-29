import { useEffect, useState } from 'react';
import { CheckCircle, Eye, Target, Users } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import LogoSumbar from '../../assets/logo-sumbar.png';
import LogoUptd from '../../assets/logo-uptd.png';
import KanLogo from '../../assets/kan-logo.png';
import Galeri1 from '../../assets/1.jpeg';
import Galeri2 from '../../assets/2.jpeg';
import Galeri3 from '../../assets/3.jpeg';
import Galeri4 from '../../assets/4.jpeg';
import Galeri5 from '../../assets/5.jpeg';
import Galeri6 from '../../assets/6.jpeg';
import Galeri7 from '../../assets/7.jpeg';
import Galeri8 from '../../assets/8.jpeg';

export function LandingAboutVisionSection() {
  const images = [Galeri1, Galeri2, Galeri3, Galeri4, Galeri5, Galeri6, Galeri7, Galeri8];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <>
      {/* Tentang Kami Section */}
      <section id="tentang" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-4xl font-bold text-gray-900 mb-6">Tentang Kami</h3>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  UPTD Laboratorium Lingkungan merupakan unit operasional di bawah Dinas Lingkungan Hidup Provinsi Sumatera Barat yang dibentuk pada tahun 2017 dan telah mendapatkan akreditasi dari Komite Akreditasi Nasional (KAN).
                </p>
                <p>
                  Laboratorium ini memiliki akreditasi dari <strong>LP-1721-IDN</strong> untuk berbagai jenis pengujian dengan berbagai parameter kualitas air dan lingkungan.
                </p>
                <p>
                  Kami berkomitmen untuk melaksanakan kegiatan laboratorium yang sesuai dengan standar internasional ISO/IEC 17025, memberikan hasil pengujian yang akurat, cepat, dan terpercaya untuk mendukung pengelolaan lingkungan hidup yang berkelanjutan.
                </p>
                <p>
                  UPTD Laboratorium Lingkungan juga telah teregistrasi di Kementrian Lingkungan Hidup dengan nomor registrasi 00276/LPJ/LABLING-1/LRK/KLH.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 bg-[#87A96B]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <img
                      src={KanLogo}              
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Terakreditasi KAN</div>
                    <div className="text-sm text-gray-800">LP-1721-IDN</div>
                    <div className="text-sm text-gray-600">Sejak 2022</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 bg-[#87A96B]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-[#0B3D2E]" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Tim Profesional</div>
                    <div className="text-sm text-gray-600">Bersertifikasi</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <ImageWithFallback
                src={images[currentIndex]}
                alt="Modern Laboratory"
                className="w-full h-[400px] object-cover rounded-2xl shadow-2xl transition-all duration-700 ease-in-out"
              />


              {/* indikator titik di bawah gambar (opsional) */}
              <div className="mt-4 flex justify-center gap-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-3 h-3 rounded-full border ${
                      idx === currentIndex ? "bg-emerald-600" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visi dan Misi Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">Visi dan Misi</h3>
            <p className="text-gray-600">
              Berlandaskan komitmen pemerintah daerah dan dinas lingkungan hidup
            </p>
          </div>

          {/* LOGO BAR */}
          <div className="flex justify-center mb-12 bg-emerald-60">
            <div className="inline-flex items-center gap-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg px-8 py-4 border border-emerald-100">
              {/* Logo Sumbar */}
              <div className="flex items-center gap-3">
                <div className="w-32 h-32 bg-emerald-50 rounded-xl flex items-center justify-center shadow-sm">
                  <img
                    src={LogoSumbar}
                    alt="Logo Provinsi Sumatera Barat"
                    className="w-24 h-24 object-contain"
                  />
                </div>
                <div className="text-left">
                  <p className="text-[11px] uppercase tracking-wide text-emerald-700 font-semibold">
                    Pemerintah Provinsi
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    Sumatera Barat
                  </p>
                </div>
              </div>

              {/* Divider */}
              <span className="hidden sm:block h-10 w-px bg-emerald-100" />

              {/* Logo KAN */}
              <div className="flex items-center gap-3">
                <div className="w-32 h-32 bg-emerald-50 rounded-xl flex items-center justify-center shadow-sm">
                  <img
                    src={LogoUptd}
                    alt="Logo uptd"
                    className="w-24 h-24 object-contain"
                  />
                </div>
                <div className="text-left">
                  <p className="text-[11px] uppercase tracking-wide text-emerald-700 font-semibold">
                    UPTD Laboratorium Lingkungan
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    Dinas Lingkungan Hidup Provinsi Sumatera Barat
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* END LOGO BAR */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Visi */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-t-4 border-emerald-600">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-[#87A96B]/20 rounded-xl flex items-center justify-center">
                  <Eye className="w-7 h-7 text-emerald-700" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900">Visi</h4>
              </div>
              <p className="text-gray-700 leading-relaxed text-lg">
                Menjadi laboratorium yang handal, independen, dan terpercaya dalam mendukung pengelolaan lingkungan hidup yang berkelanjutan di Sumatera Barat dan Indonesia.
              </p>
            </div>

            {/* Misi */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-t-4 border-emerald-600">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-[#87A96B]/20 rounded-xl flex items-center justify-center">
                  <Target className="w-7 h-7 text-emerald-700" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900">Misi</h4>
              </div>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#0B3D2E] flex-shrink-0 mt-1" />
                  <span>
                    Menerapkan sistem manajemen mutu yang mengacu pada ISO 17025 termutakhir dalam melaksanakan kegiatan laboratorium.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#0B3D2E] flex-shrink-0 mt-1" />
                  <span>
                    Memberikan pelayanan pengujian parameter kualitas lingkungan melalui penyajian data dan informasi yang cepat dan akurat, dalam memenuhi kebutuhan dan kepuasan pelanggan.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>



    </>
  );
}
