import logoUptd from '../../assets/logo-uptd.png';
import logoSumbar from '../../assets/logo-sumbar.png';
import logoKan from '../../assets/kan-logo.png';

function InstitutionLogoCard({ src, alt, title, subtitle }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white p-4 text-center shadow-sm text-emerald-600 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-white/15">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
        <img src={src} alt={alt} className="max-h-12 max-w-12 object-contain" />
      </div>
      <p className="mt-3 text-sm font-semibold text-emerald-600">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-emerald-50/85">{subtitle}</p>
    </div>
  );
}

function TrustItem({ children }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-50 backdrop-blur">
      <span className="h-1.5 w-1.5 rounded-full bg-white" />
      <span>{children}</span>
    </div>
  );
}

export function AuthLogoPanel() {
  return (
    <aside className="relative isolate flex min-h-[520px] overflow-hidden bg-emerald-600 px-8 py-10 text-white sm:px-10 lg:min-h-full">
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-teal-200/20 blur-3xl" />
      <div className="pointer-events-none absolute right-8 top-10 h-28 w-28 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute right-20 top-24 h-14 w-14 rounded-full border border-white/10" />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col justify-center gap-8">
        <div>
          <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-50 backdrop-blur">
            SILABLING
          </div>

          <div className="mt-7 border-l-4 border-white/70 pl-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-emerald-100">
              Dikelola oleh
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-white lg:text-[34px]">
              UPTD Laboratorium
              <span className="block">Lingkungan Hidup</span>
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-50/90">
              Portal layanan pengujian lingkungan untuk pendaftaran, pemantauan sampel, dan pengambilan LHU secara terintegrasi.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InstitutionLogoCard
              src={logoUptd}
              alt="Logo UPTD Laboratorium Lingkungan"
              title="UPTD"
              subtitle="Laboratorium Lingkungan"
            />
            <InstitutionLogoCard
              src={logoSumbar}
              alt="Logo Pemerintah Provinsi Sumatera Barat"
              title="Sumbar"
              subtitle="Pemprov Sumatera Barat"
            />
          </div>

          <div className="mx-auto flex w-fit max-w-full items-center gap-3 rounded-2xl border border-white/15 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-11 w-24 shrink-0 items-center justify-center rounded-xl bg-slate-50 px-3 ring-1 ring-slate-100">
              <img src={logoKan} alt="Logo Komite Akreditasi Nasional" className="max-h-8 max-w-full object-contain" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
