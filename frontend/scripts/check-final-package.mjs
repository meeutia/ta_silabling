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

function assertAbsent(relativePath, reason) {
  if (exists(relativePath)) {
    errors.push(`${relativePath} tidak boleh ikut paket final. ${reason}`);
  }
}

assertAbsent('.env', 'Gunakan .env.example untuk dokumentasi variabel Vite. Untuk lokal, pakai .env.local dan jangan ikutkan ke zip final.');
// node_modules boleh ada saat development lokal setelah npm install.
// Jangan ikutkan node_modules saat membuat ZIP final, tapi checker tidak menggagalkan proses lokal.
assertAbsent('dist', 'Build ulang dist di mesin lokal/deployment.');

const requiredDirectories = [
  'src/app',
  'src/api',
  'src/pages',
  'src/components',
  'src/hooks',
  'src/constants',
  'src/utils',
  'src/assets',
];

for (const dir of requiredDirectories) {
  if (!exists(dir)) {
    errors.push(`Struktur frontend belum lengkap: ${dir} tidak ditemukan.`);
  }
}

const helperFiles = collectFiles(path.join(root, 'src'))
  .map((file) => path.relative(root, file).replace(/\\/g, '/'))
  .filter((file) => file.includes('/helpers/') || file.startsWith('src/helpers/'));

if (helperFiles.length > 0) {
  errors.push(`Helper global/domain tidak terkontrol ditemukan: ${helperFiles.slice(0, 10).join(', ')}`);
}

if (!exists('.env.example')) {
  errors.push('.env.example wajib ada sebagai template environment.');
}

if (errors.length > 0) {
  console.error('Final package check frontend gagal:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Final package check frontend aman.');
