const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];
const strictFinalPackage = process.argv.includes('--strict') || process.env.FINAL_PACKAGE_STRICT === 'true';

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) entries.push(...walk(full));
    else entries.push(full);
  }
  return entries;
}

function assertAbsent(relativePath, reason, { allowLocal = false } = {}) {
  if (!exists(relativePath)) return;

  if (allowLocal && !strictFinalPackage) {
    warnings.push(`${relativePath} terdeteksi untuk development lokal. Jangan ikutkan file ini saat membuat ZIP final. ${reason}`);
    return;
  }

  errors.push(`${relativePath} tidak boleh ikut paket final. ${reason}`);
}

function assertRuntimeFolderClean(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return;

  const files = walk(absolutePath)
    .map((file) => path.relative(absolutePath, file).replace(/\\/g, '/'))
    .filter((file) => path.basename(file) !== '.gitkeep');

  if (files.length > 0) {
    errors.push(`${relativePath} masih berisi file runtime: ${files.slice(0, 10).join(', ')}`);
  }
}

assertAbsent('.env', 'Gunakan .env.example untuk dokumentasi variabel environment.', { allowLocal: true });
// node_modules boleh ada saat development lokal setelah npm install.
// Jangan ikutkan node_modules saat membuat ZIP final, tapi checker tidak menggagalkan proses lokal.
assertAbsent('views', 'Backend API tidak memakai EJS view; folder ini sengaja tidak dipaketkan.');

assertRuntimeFolderClean('uploads');
assertRuntimeFolderClean('uploads/worksheets');
assertRuntimeFolderClean('public/invoices');
assertRuntimeFolderClean('public/lhu');
assertRuntimeFolderClean('public/worksheets');

if (!exists('.env.example')) {
  errors.push('.env.example wajib ada sebagai template environment.');
}

if (warnings.length > 0) {
  console.warn('Final package check peringatan lokal:');
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (errors.length > 0) {
  console.error('Final package check gagal:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Final package check backend aman.');
if (!strictFinalPackage) {
  console.log('Catatan: jalankan `node scripts/check-final-package.js --strict` sebelum membuat ZIP final untuk menolak .env secara keras.');
}
