import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const errors = [];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) result.push(...collectFiles(full));
    else result.push(full);
  }
  return result;
}

const requiredPageFiles = [
  'src/pages/auth/LoginPage.jsx',
  'src/pages/auth/RegisterPage.jsx',
  'src/pages/auth/ResetPasswordPage.jsx',
  'src/pages/public/LandingPage.jsx',
  'src/pages/admin/AdminDashboardPage.jsx',
  'src/pages/admin/AdminPermohonanPage.jsx',
  'src/pages/admin/AdminKelolaAkunPage.jsx',
  'src/pages/admin/AdminKelolaParameterPage.jsx',
  'src/pages/pelanggan/PelangganDashboardPage.jsx',
  'src/pages/pelanggan/PelangganRegistrasiPage.jsx',
  'src/pages/pelanggan/PelangganDetailPermohonanPage.jsx',
  'src/pages/pelanggan/PelangganRiwayatPage.jsx',
  'src/pages/analis/AnalisPenugasanPage.jsx',
  'src/pages/analis/AnalisDetailSampelPage.jsx',
  'src/pages/penyelia/PenyeliaPenugasanPage.jsx',
  'src/pages/penyelia/PenyeliaPenugasanDetailPage.jsx',
  'src/pages/penyelia/PenyeliaReviewPage.jsx',
  'src/pages/kasi/KasiDashboardPage.jsx',
  'src/pages/kasi/KasiLhuPage.jsx',
  'src/pages/kasi/KasiPermohonanPage.jsx',
  'src/pages/kalab/KalabLhuPage.jsx',
  'src/pages/qc/QcLhuPage.jsx',
];

for (const file of requiredPageFiles) {
  if (!exists(file)) errors.push(`Page wajib tidak ditemukan: ${file}`);
}

const componentPageWrappers = collectFiles(path.join(root, 'src/components'))
  .filter((file) => file.endsWith('Page.jsx'))
  .map((file) => path.relative(root, file).replace(/\\/g, '/'));

for (const file of componentPageWrappers) {
  errors.push(`${file} tidak boleh lagi menjadi wrapper halaman. Simpan halaman utama di src/pages dan komponen kecil di src/components.`);
}

const disallowedBarrelFiles = [
  'src/api/index.js',
  'src/hooks/index.js',
  'src/utils/index.js',
  'src/constants/index.js',
];

for (const file of disallowedBarrelFiles) {
  if (exists(file)) {
    errors.push(`${file} tidak boleh menjadi wrapper/barrel. Import langsung ke file tujuan.`);
  }
}

if (exists('src/helpers')) {
  errors.push('Jangan pakai src/helpers global. Gunakan utils, hooks, atau helper lokal domain.');
}

if (errors.length > 0) {
  console.error('Frontend structure check gagal:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Frontend structure check aman.');
