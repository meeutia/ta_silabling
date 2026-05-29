import { Mail, Phone, User } from 'lucide-react';

export function RegistrationCustomerStep({
    lockedSectionClass,
  customerProfiles,
  setFormData,
  userData,
  formData,
  handleInputChange,
}) {
  return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <User className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-semibold text-gray-900">Data Pelanggan</h2>
              </div>
              <fieldset  className={lockedSectionClass}>
              {/* Pilih data pelanggan sebelumnya */}
              {customerProfiles.length > 0 && (
                <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gunakan data sebelumnya:
                  </label>
                  <select 
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white"
                    defaultValue=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setFormData(prev => ({
                          ...prev,
                          id_pelanggan: '',
                          namaInstansi: '',
                          pic: prev.pic || userData?.username || userData?.nama_user || '',                          emailPic: prev.emailPic || userData?.email || '',
                          noTelp: prev.noTelp || userData?.no_telp || '',
                          alamat: prev.alamat || userData?.alamat || '',
                        }));
                        return;
                      }
                      const selected = customerProfiles.find((profile) => profile.id_pelanggan === val);
                      if (selected) {
                        setFormData(prev => ({
                          ...prev,
                          id_pelanggan: selected.id_pelanggan,
                          namaInstansi: selected.nama_instansi || '',
                          pic: selected.pic || '',
                          emailPic: selected.email_kontak || '',
                          noTelp: selected.no_telp || '',
                          alamat: selected.alamat || '',
                        }));
                      }
                    }}
                  >
                    <option value="">-- Pilih data pelanggan atau isi manual --</option>
                    {customerProfiles.map((profile) => (
                      <option key={profile.id_pelanggan} value={profile.id_pelanggan}>
                        {profile.nama_instansi}{profile.pic ? `, ${profile.pic}` : ''}{profile.no_telp ? `, ${profile.no_telp}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-1">Pilih salah satu atau isi data secara manual di bawah</p>
                </div>
              )}
              

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Instansi/Perusahaan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="namaInstansi"
                    value={formData.namaInstansi}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="Nama Instansi/Perusahaan"
                  />
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PIC (Penanggung Jawab) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="pic"
                        value={formData.pic}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        placeholder="Nama Lengkap penanggung jawab"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email PIC <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        name="emailPic"
                        value={formData.emailPic}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        placeholder="nama.pic@instansi.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      No. Telp / HP <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        name="noTelp"
                        value={formData.noTelp}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        placeholder="08xx-xxxx-xxxx"
                      />
                    </div>
                  </div>

                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alamat Kantor <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="alamat"
                    value={formData.alamat}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                    placeholder="Alamat lengkap kantor / perusahaan"
                  />
                </div>
              </div>
            </fieldset>
            </div>
  );
}
