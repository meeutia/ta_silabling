import { useState } from 'react';
import {
  UserRoundPlus,
  ClipboardList,
  CreditCard,
  CalendarCheck,
  FlaskConical,
  FileCheck2,
  PackageCheck,
  CheckCircle2,
  FileText,
  Clock,
} from 'lucide-react';

const usageSteps = [
  {
    title: 'Buat akun pelanggan',
    description:
      'Registrasi akun menggunakan NIK, username, email, dan password untuk mengakses layanan SILABLING.',
    icon: UserRoundPlus,
  },
  {
    title: 'Ajukan permohonan pengujian',
    description:
      'Isi data permohonan, pilih jenis sampel, parameter uji, metode, dan informasi pendukung lainnya.',
    icon: ClipboardList,
  },
  {
    title: 'Lakukan pembayaran',
    description:
      'Setelah permohonan diverifikasi, pelanggan menerima tagihan dan melakukan pembayaran sesuai instruksi sistem.',
    icon: CreditCard,
  },
  {
    title: 'Konfirmasi jadwal sampel',
    description:
      'Admin menetapkan jadwal pengambilan atau pengantaran sampel. Pelanggan dapat menyetujui atau mengajukan perubahan jadwal.',
    icon: CalendarCheck,
  },
  {
    title: 'Pantau proses pengujian',
    description:
      'Sampel diproses oleh analis dan diverifikasi bertahap oleh penyelia, Kasi Pengujian, dan Pengendalian Mutu.',
    icon: FlaskConical,
  },
  {
    title: 'Ambil LHU selesai',
    description:
      'Setelah LHU disahkan dan diberi nomor, pelanggan menerima informasi jadwal pengambilan LHU.',
    icon: FileCheck2,
  },
];

const serviceTimeline = [
  {
    day: 'Hari ke-1',
    title: 'Penerimaan Sampel',
    icon: PackageCheck,
  },
  {
    day: 'Hari ke-2 – 9',
    title: 'Pengujian Laboratorium',
    icon: FlaskConical,
  },
  {
    day: 'Hari ke-10 – 11',
    title: 'Verifikasi Hasil Uji',
    icon: CheckCircle2,
  },
  {
    day: 'Hari ke-12',
    title: 'Pengesahan & Penerbitan LHU',
    icon: FileText,
  },
];

function SectionBadge({ children }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-700">
      {children}
    </div>
  );
}

function StepCard({ step, index, isActive, onClick }) {
  const Icon = step.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full rounded-2xl border p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-900/5 ${
        isActive
          ? 'border-emerald-400 bg-emerald-50 shadow-md shadow-emerald-900/5'
          : 'border-gray-100 bg-white'
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
            isActive ? 'bg-emerald-600' : 'bg-emerald-50 group-hover:bg-emerald-600'
          }`}
        >
          <Icon
            className={`h-5 w-5 transition-colors ${
              isActive ? 'text-white' : 'text-emerald-600 group-hover:text-white'
            }`}
          />
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-900">{step.title}</p>
      <p className="mt-2 text-xs leading-5 text-gray-500">{step.description}</p>
    </button>
  );
}

// Ganti komponen TimelineFlow yang lama dengan ini.
// Hapus juga bagian Mobile (md:hidden) karena sudah tidak diperlukan.

function TimelineFlow({ phases }) {
  return (
    <div className="mt-12 overflow-x-auto">
      <div className="flex min-w-[500px]">
        {phases.map((phase, index) => {
          const Icon = phase.icon;
          const isLast = index === phases.length - 1;

          return (
            <div key={phase.day} className="relative flex flex-1 flex-col items-center text-center">
              {/* Garis penghubung ke kanan */}
              {!isLast && (
                <div className="absolute left-1/2 top-6 z-0 h-0.5 w-full bg-emerald-500" />
              )}

              {/* Lingkaran */}
              <div
                className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-100 ${
                  isLast ? 'ring-8 ring-emerald-100' : ''
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>

              {/* Label */}
              <div className="mt-5 px-3">
                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                  {phase.day}
                </span>
                <p className="mt-3 text-sm font-semibold leading-5 text-gray-900">
                  {phase.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LandingUsageTimelineSection() {
  const [activeStep, setActiveStep] = useState(null);

  const handleStepClick = (index) => {
    setActiveStep((prev) => (prev === index ? null : index));
  };

  return (
    <section id="alur" className="bg-white px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <SectionBadge>Alur Layanan</SectionBadge>
          <h3 className="mt-4 text-3xl font-bold text-gray-900 md:text-4xl">
            Langkah Penggunaan SILABLING
          </h3>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-gray-500 md:text-base">
            Proses layanan dibuat bertahap agar pelanggan dapat mendaftar, memantau sampel, dan mengambil LHU secara lebih transparan.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {usageSteps.map((step, index) => (
            <StepCard
              key={step.title}
              step={step}
              index={index}
              isActive={activeStep === index}
              onClick={() => handleStepClick(index)}
            />
          ))}
        </div>

        {activeStep !== null && (
          <div className="mt-5 flex items-start gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 transition-all">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              {(() => {
                const Icon = usageSteps[activeStep].icon;
                return <Icon className="h-5 w-5" />;
              })()}
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                {usageSteps[activeStep].title}
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-700">
                {usageSteps[activeStep].description}
              </p>
            </div>
          </div>
        )}

      <div className="mt-8 border-t border-gray-100" />

        <div className="rounded-2xl border border-emerald-100 bg-white p-6 md:p-8">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <SectionBadge>Timeline Proses</SectionBadge>
              <h3 className="mt-4 text-2xl font-bold text-gray-900 md:text-3xl">
                Estimasi Timeline Pengujian sampai LHU
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Gambaran tahapan layanan mulai dari penerimaan sampel sampai LHU siap diterbitkan.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              <Clock className="h-4 w-4 text-emerald-600" />
              Estimasi selesai: 12 hari kerja
            </div>
          </div>

          <TimelineFlow phases={serviceTimeline} />
        </div>
      </div>
    </section>
  );
}
