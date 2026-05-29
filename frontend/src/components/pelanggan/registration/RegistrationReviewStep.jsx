import { Calendar, FlaskConical, User } from 'lucide-react';
import { getSamplingLocationLabel } from './registrationDateUtils';

export function RegistrationReviewStep({
  formData,
  waterTypes,
  entryParameterLists,
  getRequestDetails,
  isAgreed,
  setIsAgreed,
}) {
            // Hitung field yang masih kosong
            const missingFields = [];
            if (!formData.namaInstansi) missingFields.push('Nama Instansi/Perusahaan');
            if (!formData.pic) missingFields.push('PIC (Person In Charge)');
            if (!formData.emailPic) missingFields.push('Email PIC');
            if (!formData.noTelp) missingFields.push('No. Telepon');
            if (!formData.alamat) missingFields.push('Alamat');
            if (!formData.maksudPengujian) missingFields.push('Maksud Pengujian');
            if (formData.maksudPengujian === 'lainnya' && !formData.maksudLainnya) missingFields.push('Maksud Pengujian (Lainnya)');
            if (!formData.metodePengambilan) missingFields.push('Metode Pengambilan Sampel');
            if (formData.metodePengambilan) {
              if (!formData.alamatPengambilan) {
                missingFields.push(getSamplingLocationLabel(formData.metodePengambilan));
              }
            }

            if (formData.metodePengambilan === 'laboratorium') {
              if (!formData.tanggalPengambilan) missingFields.push('Tanggal Pengambilan');
              if (!formData.jamPengambilan) missingFields.push('Jam Pengambilan');
            }

            if (formData.metodePengambilan === 'kirim') {
              if (!formData.estimasiDiterima) {
                missingFields.push('Estimasi Tanggal Sampel Diterima');
              }
            }
            const hasValidSample = formData.sampleEntries.some(e => e.jenisSampel && e.idRegBm && e.parameters.length > 0);
            if (!hasValidSample) missingFields.push('Sampel & Parameter Uji');

            const maksudDisplay = formData.maksudPengujian === 'lainnya'
              ? formData.maksudLainnya
              : formData.maksudPengujian;

  return (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  Ringkasan & Konfirmasi
                </h2>
                <p className="text-gray-600 mb-8">
                  Periksa kembali data permohonan pengujian Anda sebelum mengirimkan
                </p>

                {/* Peringatan field kosong */}
                {missingFields.length > 0 && (
                  <div className="mb-6 bg-red-50 border border-red-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <h4 className="font-semibold text-red-800">Data belum lengkap!</h4>
                    </div>
                    <p className="text-sm text-red-700 mb-2">Silakan lengkapi field berikut sebelum mengirim permohonan:</p>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                      {missingFields.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Data Pelanggan */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-emerald-600" />
                      Data Pelanggan
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Nama Instansi/Perusahaan</p>
                        <p className={`font-medium ${formData.namaInstansi ? 'text-gray-900' : 'text-red-500'}`}>{formData.namaInstansi || 'Belum diisi'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">PIC</p>
                        <p className={`font-medium ${formData.pic ? 'text-gray-900' : 'text-red-500'}`}>{formData.pic || 'Belum diisi'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Email PIC</p>
                        <p className={`font-medium ${formData.emailPic ? 'text-gray-900' : 'text-red-500'}`}>{formData.emailPic || 'Belum diisi'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">No. Telepon</p>
                        <p className={`font-medium ${formData.noTelp ? 'text-gray-900' : 'text-red-500'}`}>{formData.noTelp || 'Belum diisi'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Alamat</p>
                        <p className={`font-medium ${formData.alamat ? 'text-gray-900' : 'text-red-500'}`}>{formData.alamat || 'Belum diisi'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Maksud Pengujian */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">Maksud Pengujian</h3>
                    <p className={`text-sm font-medium ${maksudDisplay ? 'text-gray-900' : 'text-red-500'}`}>
                      {maksudDisplay || 'Belum dipilih'}
                    </p>
                  </div>

                  {/* Data Pengambilan Sampel */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      Informasi Pengambilan Sampel
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Metode Pengambilan Sampel</p>
                        <p className={`font-medium ${formData.metodePengambilan ? 'text-gray-900' : 'text-red-500'}`}>
                          {formData.metodePengambilan === 'laboratorium'
                            ? 'Diambil oleh Petugas Laboratorium'
                            : formData.metodePengambilan === 'kirim'
                              ? 'Sampel Diantar / Pengambilan Mandiri'
                              : 'Belum diisi'}
                        </p>
                      </div>

                      {formData.metodePengambilan === 'laboratorium' && (
                        <>
                          <div>
                            <p className="text-gray-600">Rencana Tanggal Pengambilan</p>
                            <p className={`font-medium ${formData.tanggalPengambilan ? 'text-gray-900' : 'text-red-500'}`}>
                              {formData.tanggalPengambilan || 'Belum diisi'}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-600">Jam Pengambilan</p>
                            <p className={`font-medium ${formData.jamPengambilan ? 'text-gray-900' : 'text-red-500'}`}>
                              {formData.jamPengambilan ? `${formData.jamPengambilan} WIB` : 'Belum diisi'}
                            </p>
                          </div>
                        </>
                      )}

                      {formData.metodePengambilan === 'kirim' && (
                        <div>
                          <p className="text-gray-600">Rencana Tanggal Pengantaran Sampel</p>
                          <p className={`font-medium ${formData.estimasiDiterima ? 'text-gray-900' : 'text-red-500'}`}>
                            {formData.estimasiDiterima || 'Belum diisi'}
                          </p>
                        </div>
                      )}

                      {formData.metodePengambilan && (
                        <div className="md:col-span-2">
                          <p className="text-gray-600">
                            {getSamplingLocationLabel(formData.metodePengambilan)}
                          </p>
                          <p className={`font-medium whitespace-pre-wrap ${formData.alamatPengambilan ? 'text-gray-900' : 'text-red-500'}`}>
                            {formData.alamatPengambilan || 'Belum diisi'}
                          </p>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Sampel & Parameter yang Dipilih */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FlaskConical className="w-5 h-5 text-emerald-600" />
                      Jenis sampel & Parameter yang Dipilih
                    </h3>

                    <div className="space-y-4">
                      {getRequestDetails().map((entry, idx) => {
                        const sampelLabel = waterTypes.find(w => w.value === entry.jenisSampel)?.label || entry.jenisSampel;
                        const paramList = entryParameterLists[idx] || [];
                        return (
                          <div key={idx} className="text-sm">
                            <div className="flex justify-between items-start">
                              <p className="font-medium text-gray-900">Jenis sampel: {sampelLabel}</p>
                              <p className="text-gray-600">{entry.jumlahSampel} sampel</p>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {entry.parameters.map((p) => {
                                const paramLabel = paramList.find(pl => pl.value === p)?.label || p;
                                return (
                                  <span key={p} className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded border border-emerald-200">
                                    {paramLabel}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {getRequestDetails().length === 0 && (
                        <p className="text-sm text-red-500">⚠ Belum ada sampel & parameter yang dipilih</p>
                      )}
                    </div>

                  </div>


                  {/* Checkbox Persetujuan */}
                  <div className="bg-white rounded-lg p-6 border-2 border-gray-300">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAgreed}
                        onChange={(e) => setIsAgreed(e.target.checked)}
                        className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 mt-0.5 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700">
                        Saya memahami bahwa permohonan yang dibuat telah sesuai dan akan menunggu persetujuan parameter yang diajukan
                        terlebih dahulu sebelum dilakukan pembayaran.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
  );
}
