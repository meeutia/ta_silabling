const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const scanRoots = ['src', 'package.json'];
const allowedLegacyStatusFiles = new Set([
  'src/constants/request-status.js',
  'src/models/Fppl.js',
]);

const forbiddenPatterns = [
  {
    pattern: /confirmPaymentSubmitted|verifyPaymentByAdmin|upload\.single\(['"]bukti|bukti[_-]bayar|bukti pembayaran/gi,
    message: 'Sisa flow upload/verifikasi bukti pembayaran lama masih terdeteksi.',
  },
  {
    pattern: /payment-verification-result|notifyPaymentVerificationResult|buildPaymentVerificationResultEmail/gi,
    message: 'Sisa notifikasi verifikasi pembayaran lama masih terdeteksi.',
  },
  {
    pattern: /virtual account/gi,
    message: 'Istilah Virtual Account masih dipakai. Gunakan istilah payment gateway/Xendit.',
  },
  {
    pattern: /Pembayaran di akhir|pembayaran di akhir/gi,
    message: 'Istilah pembayaran di akhir masih dipakai. Gunakan Bayar Nanti.',
  },
];

function listFiles(target) {
  const fullPath = path.join(root, target);
  if (!fs.existsSync(fullPath)) return [];
  const stat = fs.statSync(fullPath);
  if (stat.isFile()) return [fullPath];

  const entries = fs.readdirSync(fullPath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(fullPath, entry.name);
    if (entry.name === 'node_modules' || entry.name === '.git') return [];
    if (entry.isDirectory()) return listFiles(path.relative(root, entryPath));
    if (!entry.isFile()) return [];
    if (!/\.(js|json|ejs)$/i.test(entry.name)) return [];
    return [entryPath];
  });
}

const violations = [];
const warnings = [];
const strictFinalPackage = process.argv.includes('--strict') || process.env.FINAL_PACKAGE_STRICT === 'true';
for (const file of scanRoots.flatMap(listFiles)) {
  const relative = path.relative(root, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');

  for (const { pattern, message } of forbiddenPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content))) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      violations.push(`${relative}:${line} - ${message} (${match[0]})`);
    }
  }

  if (!allowedLegacyStatusFiles.has(relative)) {
    const legacyRegex = /Menunggu Verifikasi Pembayaran/g;
    let match;
    while ((match = legacyRegex.exec(content))) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      violations.push(`${relative}:${line} - Status legacy pembayaran dipakai di luar allowlist.`);
    }
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
if (deps.xlsx) {
  violations.push('package.json - dependency xlsx masih ada. Gunakan exceljs.');
}

if (!deps.sequelize || !/\^?6\.37\.[89]|\^?6\.(3[8-9]|[4-9]\d)\./.test(String(deps.sequelize))) {
  violations.push(`package.json - sequelize harus 6.37.8 atau lebih baru. Nilai sekarang: ${deps.sequelize || '-'}`);
}

if (fs.existsSync(path.join(root, '.env'))) {
  if (strictFinalPackage) {
    violations.push('.env - file secret tidak boleh ikut paket final. Gunakan .env.example.');
  } else {
    warnings.push('.env terdeteksi untuk development lokal. Jangan ikutkan file ini saat membuat ZIP final.');
  }
}

if (warnings.length) {
  console.warn('Workflow cleanup check peringatan lokal:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (violations.length) {
  console.error('Workflow cleanup check gagal:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Workflow cleanup check aman: tidak ada sisa flow upload bukti/verifikasi pembayaran aktif.');
if (!strictFinalPackage) {
  console.log('Catatan: jalankan `node scripts/verify-workflow-cleanup.js --strict` sebelum membuat ZIP final untuk menolak .env secara keras.');
}
