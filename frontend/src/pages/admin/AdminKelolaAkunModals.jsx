import { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Key,
  Loader2,
  Lock,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react';
import {
  dash,
  EMPTY_STAFF_FORM,
  getStatus,
  initials,
  STAFF_ROLES,
  STATUS_OPTIONS,
} from './AdminKelolaAkun.helpers';
import { validatePasswordPolicy, validateUsernamePolicy } from '../../utils/passwordPolicy';

function StatusBadge({ status }) {
  const current = status || 'Nonaktif';
  const className = current === 'Aktif'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-gray-100 text-gray-700';

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${className}`}>
      {current}
    </span>
  );
}

export function StaffFormModal({ loading, onClose, onSubmit }) {
  const [hasAccount, setHasAccount] = useState(true);

  const [form, setForm] = useState(() => ({
    ...EMPTY_STAFF_FORM,
    hasAccount: true,
    status: 'Aktif',
  }));
  const [formError, setFormError] = useState('');

  const setValue = (key, value) => {
    setFormError('');
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleHasAccountChange = (checked) => {
    setFormError('');
    setHasAccount(checked);
    setForm((prev) => ({
      ...prev,
      hasAccount: checked,
      role: checked ? (prev.role === 'PCC' ? 'Analis' : prev.role) : 'PCC',
      ...(checked ? {} : { nik: '', email: '', username: '', password: '', confirmPassword: '' }),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (hasAccount) {
      if (!/^\d{16}$/.test(String(form.nik || '').trim())) {
        setFormError('NIK akun wajib 16 digit angka.');
        return;
      }

      const usernameCheck = validateUsernamePolicy(form.username);
      if (!usernameCheck.valid) {
        setFormError(usernameCheck.message);
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.email || '').trim().toLowerCase())) {
        setFormError('Format email tidak valid.');
        return;
      }

      if (form.passwordMode === 'manual') {
        const passwordCheck = validatePasswordPolicy(form.password);
        if (!passwordCheck.valid) {
          setFormError(passwordCheck.message);
          return;
        }

        if (form.password !== form.confirmPassword) {
          setFormError('Konfirmasi password tidak sesuai.');
          return;
        }
      }
    }

    setFormError('');
    onSubmit({ ...form, hasAccount });
  };

  return (
    <ModalShell title="Tambah Petugas" onClose={onClose} fullHeight>
      <form onSubmit={handleSubmit} className="flex max-h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 pb-4">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {formError}
            </div>
          )}

          <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50">
            <input
              type="checkbox"
              checked={hasAccount}
              onChange={(event) => handleHasAccountChange(event.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <div>
              <p className="text-sm font-semibold text-gray-900">Buat akun login untuk petugas</p>
              <p className="text-xs text-gray-500">
                Matikan opsi ini untuk PCC/pegawai yang hanya dicatat sebagai petugas tanpa akses sistem.
              </p>
            </div>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hasAccount && (
              <TextInput
                label="NIK"
                value={form.nik}
                required
                maxLength={16}
                onChange={(value) => setValue('nik', value.replace(/\D/g, '').slice(0, 16))}
              />
            )}
            <TextInput
              label="Nama Petugas"
              value={form.name}
              required
              onChange={(value) => setValue('name', value)}
            />
            <TextInput
              label="NIP"
              value={form.nip}
              maxLength={18}
              onChange={(value) => setValue('nip', value.replace(/\D/g, '').slice(0, 18))}
            />
            <TextInput
              label="No. WhatsApp"
              value={form.phone}
              maxLength={13}
              onChange={(value) => setValue('phone', value.replace(/\D/g, '').slice(0, 13))}
            />

            {hasAccount && (
              <>
                <TextInput
                  label="Email"
                  type="email"
                  value={form.email}
                  required
                  maxLength={50}
                  placeholder="nama@email.com"
                  autoComplete="email"
                  onChange={(value) => setValue('email', value)}
                />
                <TextInput
                  label="Username"
                  value={form.username}
                  required
                  maxLength={30}
                  placeholder="3-30 karakter, huruf/angka/._-"
                  autoComplete="username"
                  onChange={(value) => setValue('username', value)}
                />
              </>
            )}

            <SelectInput
              label="Role"
              value={form.role}
              options={hasAccount ? STAFF_ROLES.filter((role) => role !== 'PCC') : ['PCC']}
              disabled={!hasAccount}
              onChange={(value) => setValue('role', value)}
            />
            {hasAccount && (
              <SelectInput
                label="Status"
                value={form.status}
                options={STATUS_OPTIONS}
                onChange={(value) => setValue('status', value)}
              />
            )}
          </div>

          {hasAccount && (
            <PasswordFields form={form} setValue={setValue} />
          )}
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white pt-4">
          <ModalFooter
            loading={loading}
            onClose={onClose}
            submitText="Tambah Petugas"
          />
        </div>
      </form>
    </ModalShell>
  );
}

function PasswordFields({ form, setValue }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Lock className="w-4 h-4 text-emerald-600" />
        Password Awal
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer">
          <input
            type="radio"
            checked={form.passwordMode === 'generate'}
            onChange={() => setValue('passwordMode', 'generate')}
            className="mt-1"
          />
          <div>
            <p className="text-sm font-semibold text-gray-900">Generate otomatis</p>
            <p className="text-xs text-gray-500">Sistem akan membuat password sementara.</p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer">
          <input
            type="radio"
            checked={form.passwordMode === 'manual'}
            onChange={() => setValue('passwordMode', 'manual')}
            className="mt-1"
          />
          <div>
            <p className="text-sm font-semibold text-gray-900">Input manual</p>
            <p className="text-xs text-gray-500">Admin menentukan password sendiri.</p>
          </div>
        </label>
      </div>

      {form.passwordMode === 'manual' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="Password"
            type="password"
            value={form.password}
            required
            placeholder="Minimal 8 karakter, huruf dan angka"
            autoComplete="new-password"
            onChange={(value) => setValue('password', value)}
          />
          <TextInput
            label="Konfirmasi Password"
            type="password"
            value={form.confirmPassword}
            required
            placeholder="Ulangi password"
            autoComplete="new-password"
            onChange={(value) => setValue('confirmPassword', value)}
          />
        </div>
      )}
    </div>
  );
}

export function StaffDetailDrawer({ row, onClose, onResetPassword, onToggleStatus }) {
  const hasAccount = Boolean(row?.hasAccount ?? row?.has_account ?? row?.nik);
  const status = hasAccount ? getStatus(row) : 'Tanpa Akun';

  return (
    <DrawerShell title={hasAccount ? 'Detail Akun Petugas' : 'Detail Petugas'} onClose={onClose}>
      <ProfileHeader
        name={row.name || row.namaPegawai || row.nama_pegawai}
        subtitle={row.role}
        status={status}
      />

      {hasAccount && (
        <InfoBox title="Informasi Akun">
          <InfoItem label="Username" value={row.username} />
          <InfoItem label="Email" value={row.email} />
          <InfoItem label="Role" value={row.role} />
          <InfoItem label="Status" value={status} badge />
        </InfoBox>
      )}

      <InfoBox title="Informasi Pegawai">
        <InfoItem label="Nama" value={row.name || row.namaPegawai || row.nama_pegawai} />
        <InfoItem label="NIP" value={row.nip} />
        <InfoItem label="No. WA" value={row.phone || row.noWa || row.no_wa} />
        {!hasAccount && <InfoItem label="Akses Sistem" value="Tidak punya akun login" />}
      </InfoBox>

      <ActionStack>
        {hasAccount && (
          <>
            <SecondaryAction icon={<Key className="w-5 h-5" />} label="Reset Password" onClick={onResetPassword} tone="orange" />
            <SecondaryAction
              icon={status === 'Aktif' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              label={status === 'Aktif' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
              onClick={onToggleStatus}
              tone={status === 'Aktif' ? 'red' : 'emerald'}
            />
          </>
        )}
      </ActionStack>
    </DrawerShell>
  );
}

export function CustomerDetailDrawer({
  row,
  onClose,
  onResetPassword,
  onToggleStatus,
}) {
  const status = getStatus(row);
  const hasPortal = Boolean(row.hasPortalAccount || row.hasPortalAccess || row.portalUsername || row.username);

  return (
    <DrawerShell title="Detail Pelanggan" onClose={onClose}>
      <ProfileHeader
        name={row.company || row.namaInstansi || row.nama_instansi}
        subtitle={row.pic || row.name}
        status={status}
        icon="building"
      />

      <InfoBox title="Informasi Pelanggan">
        <InfoItem label="ID Pelanggan" value={row.idPelanggan || row.id_pelanggan || row.id} />
        <InfoItem label="Instansi" value={row.company || row.namaInstansi || row.nama_instansi} />
        <InfoItem label="PIC" value={row.pic || row.name} />
        <InfoItem label="Alamat" value={row.address || row.alamat} />
      </InfoBox>

      <InfoBox title="Kontak Pelanggan">
        <InfoItem label="Email Kontak" value={row.contactEmail || row.emailKontak || row.email_kontak || row.email} />
        <InfoItem label="No. Telepon" value={row.phone || row.noTelp || row.no_telp} />
      </InfoBox>

      <InfoBox title="Akun Portal">
        <InfoItem label="Portal" value={hasPortal ? 'Aktif' : 'Belum aktif'} />
        <InfoItem label="Username Portal" value={row.portalUsername || row.username} />
        <InfoItem label="Email Login" value={row.portalEmail || row.userEmail || row.user_email} />
        <InfoItem label="NIK Akun" value={row.userNik || row.user_nik || row.nik} />
        <InfoItem label="Status" value={status} badge />
      </InfoBox>

      {hasPortal && (
        <ActionStack>
          <SecondaryAction icon={<Key className="w-5 h-5" />} label="Reset Password" onClick={onResetPassword} tone="orange" />
          <SecondaryAction
            icon={status === 'Aktif' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            label={status === 'Aktif' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
            onClick={onToggleStatus}
            tone={status === 'Aktif' ? 'red' : 'emerald'}
          />
        </ActionStack>
      )}
    </DrawerShell>
  );
}

export function ConfirmModal({ action, loading, onClose, onConfirm }) {
  const detail = getConfirmDetail(action);

  return (
    <ModalShell title={detail.title} onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-5">
        <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 flex gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-900">{detail.subtitle}</p>
            <p className="text-sm text-orange-700 mt-1">{detail.description}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium flex items-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Ya, Proses
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function getConfirmDetail(action) {
  const target = action?.target || {};
  const name = target.name || target.namaPegawai || target.nama_pegawai || target.company || target.namaInstansi || target.nama_instansi || target.pic || 'akun ini';
  const status = getStatus(target);

  const map = {
    'reset-staff-password': {
      title: 'Reset Password Petugas',
      subtitle: `Reset password untuk ${name}?`,
      description: 'Sistem akan membuat password sementara baru dan sesi login lama akan diputus.',
    },
    'toggle-staff-status': {
      title: status === 'Aktif' ? 'Nonaktifkan Akun Petugas' : 'Aktifkan Akun Petugas',
      subtitle: `${status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'} akun ${name}?`,
      description: status === 'Aktif'
        ? 'Petugas tidak bisa login setelah akun dinonaktifkan.'
        : 'Petugas bisa login kembali setelah akun diaktifkan.',
    },
    'reset-customer-password': {
      title: 'Reset Password Pelanggan',
      subtitle: `Reset password untuk ${name}?`,
      description: 'Sistem akan membuat password sementara baru untuk akun portal pelanggan.',
    },
    'toggle-customer-status': {
      title: status === 'Aktif' ? 'Nonaktifkan Pelanggan' : 'Aktifkan Pelanggan',
      subtitle: `${status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'} akun ${name}?`,
      description: status === 'Aktif'
        ? 'Pelanggan tidak bisa login ke portal setelah akun dinonaktifkan.'
        : 'Pelanggan bisa login kembali setelah akun diaktifkan.',
    },
  };

  return map[action?.type] || {
    title: 'Konfirmasi Aksi',
    subtitle: 'Proses aksi ini?',
    description: 'Pastikan data yang dipilih sudah benar.',
  };
}

function ModalShell({ title, children, onClose, maxWidth = 'max-w-3xl', fullHeight = false }) {
  const heightClass = fullHeight ? 'h-[calc(100dvh-2rem)]' : 'max-h-[calc(100dvh-2rem)]';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} ${heightClass} overflow-hidden flex flex-col`}>
        <div className="shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 p-6 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

function DrawerShell({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  disabled = false,
  maxLength,
  placeholder = '',
  autoComplete,
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-500"
      />
    </label>
  );
}

function SelectInput({ label, value, options, onChange, disabled = false }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModalFooter({ loading, onClose, submitText }) {
  return (
    <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium"
      >
        Batal
      </button>
      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium flex items-center gap-2 disabled:opacity-60"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitText}
      </button>
    </div>
  );
}

function ProfileHeader({ name, subtitle, status, icon = 'user' }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-bold">
          {icon === 'building' ? <Building2 className="w-8 h-8" /> : initials(name)}
        </div>
        <div className="min-w-0">
          <h3 className="text-xl font-semibold break-words">{dash(name)}</h3>
          <p className="text-emerald-100 mt-1">{dash(subtitle)}</p>
          <div className="mt-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
              {dash(status)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InfoItem({ label, value, badge = false }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 last:border-b-0 pb-3 last:pb-0">
      <span className="text-sm text-gray-500">{label}</span>
      {badge ? (
        <StatusBadge status={value} />
      ) : (
        <span className="text-sm font-medium text-gray-900 text-right break-all">{dash(value)}</span>
      )}
    </div>
  );
}

function ActionStack({ children }) {
  return <div className="space-y-3">{children}</div>;
}

function SecondaryAction({ icon, label, onClick, tone = 'emerald' }) {
  const classMap = {
    emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    orange: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
    red: 'bg-red-50 text-red-700 hover:bg-red-100',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-5 py-3 rounded-lg transition-all font-semibold flex items-center justify-center gap-2 ${classMap[tone] || classMap.emerald}`}
    >
      {icon}
      {label}
    </button>
  );
}
