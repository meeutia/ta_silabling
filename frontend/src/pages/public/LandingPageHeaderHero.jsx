import { useState } from 'react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import LogoUptd from '../../assets/logo-uptd.png';

export function LandingPageHeader({ onNavigate, scrollToSection }) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleMobileNav = (id) => {
    setShowMobileMenu(false);
    scrollToSection(id);
  };

  return (
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center md:w-12 md:h-12">
                <img
                  src={LogoUptd}
                  alt="Logo Provinsi Sumatera Barat"
                  className="w-9 h-9 object-contain md:w-10 md:h-10"
                />
              </div>

              <div>
                <h1 className="text-sm font-semibold text-gray-900 md:text-base">UPTD Laboratorium Lingkungan</h1>
                <p className="hidden text-xs text-gray-600 sm:block">Dinas Lingkungan Hidup Provinsi Sumatera Barat</p>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="hidden lg:flex items-center gap-6">
              <button 
                onClick={() => scrollToSection('home')} 
                className="text-gray-700 hover:text-[#0B3D2E] transition-colors font-medium"
              >
                Home
              </button>
              <button 
                onClick={() => scrollToSection('tentang')} 
                className="text-gray-700 hover:text-[#0B3D2E] transition-colors font-medium"
              >
                Tentang Kami
              </button>
              <button 
                onClick={() => scrollToSection('sertifikasi')} 
                className="text-gray-700 hover:text-[#0B3D2E] transition-colors font-medium"
              >
                Sertifikasi & Akreditasi
              </button>
              <button 
                onClick={() => scrollToSection('layanan')} 
                className="text-gray-700 hover:text-[#0B3D2E] transition-colors font-medium"
              >
                Layanan
              </button>
              <button 
                onClick={() => scrollToSection('alur')} 
                className="text-gray-700 hover:text-[#0B3D2E] transition-colors font-medium"
              >
                Alur
              </button>
              <button 
                onClick={() => scrollToSection('tarif')} 
                className="text-gray-700 hover:text-[#0B3D2E] transition-colors font-medium"
              >
                Tarif
              </button>
              <button 
                onClick={() => scrollToSection('kontak')} 
                className="text-gray-700 hover:text-[#0B3D2E] transition-colors font-medium"
              >
                Kontak Kami
              </button>
              
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-300">
                <button
                  onClick={() => onNavigate('register')}
                  className="px-5 py-2 border-2 border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-700 hover:text-white transition-all font-medium"
                >
                  Registrasi
                </button>
                <button
                  onClick={() => onNavigate('login')}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md font-medium"
                >
                  Login
                </button>
              </div>
            </nav>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setShowMobileMenu((prev) => !prev)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white lg:hidden"
            >
              Menu
            </button>
          </div>

          {showMobileMenu ? (
            <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-3 shadow-lg lg:hidden">
              <div className="grid gap-1">
                {[
                  ['home', 'Home'],
                  ['tentang', 'Tentang Kami'],
                  ['sertifikasi', 'Sertifikasi'],
                  ['layanan', 'Layanan'],
                  ['alur', 'Alur'],
                  ['tarif', 'Tarif'],
                  ['kontak', 'Kontak'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleMobileNav(id)}
                    className="rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="rounded-lg border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-700"
                >
                  Registrasi
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  Login
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </header>
  );
}

export function LandingPageHero({ scrollToSection }) {
  return (
      <section id="home" className="relative flex min-h-screen items-center justify-center overflow-hidden md:h-[600px]">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <ImageWithFallback 
            src="https://images.unsplash.com/photo-1766297247072-93fd815afef3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYWJvcmF0b3J5JTIwZXF1aXBtZW50JTIwc2NpZW5jZXxlbnwxfHx8fDE3Njg1NTQzNDh8MA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Laboratory Equipment"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-800 bg-opacity-80"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center text-white">
          <h2 className="mb-6 text-3xl font-bold leading-tight md:text-6xl">
            Laboratorium Lingkungan yang Handal<br />dan Terpercaya di Sumatera Barat
          </h2>
          <p className="mx-auto mb-8 max-w-3xl text-base text-gray-100 md:text-2xl">
            Menyediakan layanan pengujian air sungai, danau, laut, AHS, sumur pantau, limbah dan minum dengan akreditasi nasional
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => scrollToSection('layanan')}
              className="px-8 py-4 bg-white text-emerald-700 rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl font-semibold text-lg"
            >
              Lihat Layanan Kami
            </button>
            <button
              onClick={() => scrollToSection('kontak')}
              className="px-8 py-4 border-2 border-white text-white rounded-xl hover:bg-white hover:text-emerald-700 transition-all font-semibold text-lg"
            >
              Hubungi Kami untuk Konsultasi
            </button>
          </div>
        </div>
      </section>
  );
}
