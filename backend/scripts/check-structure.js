const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) result.push(...walk(full));
    else result.push(full);
  }
  return result;
}

const requiredServiceDomains = [
  'src/services/assignment',
  'src/services/lhu',
  'src/services/payment',
  'src/services/notification',
  'src/services/schedule',
  'src/services/workflow',
];

for (const dir of requiredServiceDomains) {
  if (!exists(dir)) errors.push(`Folder service domain wajib ada: ${dir}`);
}

const forbiddenIndexBarrels = [
  'src/constants/index.js',
  'src/services/lhu/index.js',
  'src/services/payment/index.js',
  'src/services/notification/index.js',
  'src/services/schedule/index.js',
  'src/services/workflow/index.js',
];

for (const file of forbiddenIndexBarrels) {
  if (exists(file)) errors.push(`Index/barrel tidak dipakai dan harus dihapus: ${file}`);
}

if (exists('src/helpers')) {
  errors.push('Jangan pakai src/helpers global. Gunakan src/utils atau services/<domain>/*.helper.js.');
}

const forbiddenRootWrappers = [
  'src/services/payment.service.js',
  'src/services/xendit.service.js',
  'src/services/lhu.service.js',
  'src/services/lhu-pdf.service.js',
  'src/services/lhu-pickup.service.js',
  'src/services/notification.service.js',
  'src/services/schedule-change.service.js',
];

for (const file of forbiddenRootWrappers) {
  if (exists(file)) {
    errors.push(`Wrapper root lama sebaiknya sudah dihapus setelah import diarahkan ke service domain: ${file}`);
  }
}

const wrapperLikeFiles = walk(path.join(root, 'src/services'))
  .filter((file) => file.endsWith('.js'))
  .filter((file) => /^\s*module\.exports\s*=\s*require\(/.test(fs.readFileSync(file, 'utf8')));

for (const file of wrapperLikeFiles) {
  errors.push(`Wrapper satu-baris masih ditemukan: ${path.relative(root, file).replace(/\\/g, '/')}. Pindahkan implementasi asli ke domain atau update import pemanggil.`);
}

const workflowLogPath = path.join(root, 'src/services/workflow/workflow-log.service.js');
const serviceFiles = walk(path.join(root, 'src/services'))
  .filter((file) => file.endsWith('.js'))
  .filter((file) => file !== workflowLogPath)
  .filter((file) => !file.endsWith(path.join('src', 'services', 'activity-log.service.js')));

for (const file of serviceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('.logStatusChange(') || content.includes('.createActivityLogIfMissing(')) {
    errors.push(`${path.relative(root, file).replace(/\\/g, '/')} masih menulis histori status langsung. Pakai workflow-log.service.js.`);
  }
}

if (errors.length > 0) {
  console.error('Backend structure check gagal:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Backend structure check aman.');
