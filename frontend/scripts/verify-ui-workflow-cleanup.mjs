import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');

const allowedLegacyFiles = new Set([
  'src/constants/status.js',
  'src/utils/fpplStatus.js',
]);

const forbiddenPatterns = [
  {
    pattern: /confirmPayment\(|verifyPayment\(|uploadPaymentProof|paymentVerificationDecision|paymentVerificationNote|setPaymentVerificationDecision|setPaymentVerificationNote/gi,
    message: 'Sisa state/API verifikasi pembayaran lama masih terdeteksi.',
  },
  {
    pattern: /upload bukti|bukti pembayaran|verifikasi pembayaran/gi,
    message: 'Sisa teks alur unggah/verifikasi pembayaran lama masih terdeteksi.',
  },
  {
    pattern: /virtual account/gi,
    message: 'Istilah Virtual Account masih dipakai. Gunakan payment gateway/Xendit.',
  },
  {
    pattern: /Pembayaran di akhir|pembayaran di akhir/gi,
    message: 'Istilah pembayaran di akhir masih dipakai. Gunakan Bayar Nanti.',
  },
];

function listFiles(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Folder src tidak ditemukan: ${dir}`);
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') return [];
    if (entry.isDirectory()) return listFiles(fullPath);
    if (!entry.isFile()) return [];
    if (!/\.(js|jsx|ts|tsx|json)$/i.test(entry.name)) return [];
    return [fullPath];
  });
}

const violations = [];
for (const file of listFiles(srcDir)) {
  const relative = path.relative(root, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');

  for (const { pattern, message } of forbiddenPatterns) {
    pattern.lastIndex = 0;
    if (allowedLegacyFiles.has(relative) && String(pattern).includes('verifikasi pembayaran')) {
      continue;
    }

    let match;
    while ((match = pattern.exec(content))) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      violations.push(`${relative}:${line} - ${message} (${match[0]})`);
    }
  }

  if (!allowedLegacyFiles.has(relative)) {
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
  violations.push('package.json - dependency xlsx masih ada. Gunakan exceljs/backend export atau library lain yang aman.');
}

if (fs.existsSync(path.join(root, '.env'))) {
  violations.push('.env - file environment lokal tidak boleh ikut paket final. Gunakan .env.example.');
}

if (violations.length) {
  console.error('UI workflow cleanup check gagal:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('UI workflow cleanup check aman: tidak ada sisa UI aktif untuk alur pembayaran lama.');
