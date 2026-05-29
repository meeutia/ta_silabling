import { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { authApi } from '../../api/authApi';
import { validatePasswordPolicy } from '../../utils/passwordPolicy';

export function ResetPasswordPage({ onBackToLogin }) {
  const token = new URLSearchParams(window.location.search).get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!token) {
      setError('Token reset password tidak ditemukan.');
      return;
    }

    const passwordValidation = validatePasswordPolicy(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message);
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak sesuai.');
      return;
    }

    setLoading(true);

    try {
      const data = await authApi.resetPassword({ token, password, confirmPassword });

      setSuccess(data.message || 'Password berhasil diubah. Silakan login dengan password baru.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err?.message || 'Tidak bisa menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">
          Reset Kata Sandi
        </h1>

        <p className="mb-6 text-sm text-gray-600">
          Masukkan password baru untuk akun Anda.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password Baru
            </label>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                autoComplete="new-password"
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-11 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                placeholder="Minimal 8 karakter, huruf dan angka"
                disabled={loading || Boolean(success)}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Konfirmasi Password
            </label>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                autoComplete="new-password"
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-11 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                placeholder="Ulangi password baru"
                disabled={loading || Boolean(success)}
              />

              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showConfirm ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {!success ? (
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 font-medium text-white shadow-md transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full rounded-lg bg-emerald-600 py-3 font-medium text-white shadow-md transition-all hover:bg-emerald-700"
            >
              Kembali ke Login
            </button>
          )}
        </form>
      </div>
    </div>
  );
}