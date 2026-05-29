import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');
const EXTENSIONS = ['.js', '.jsx', '.mjs', '.json', '.css'];

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return entry.isFile() && /\.(js|jsx|mjs)$/i.test(entry.name) ? [full] : [];
  });
}

function resolveRelativeImport(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
    for (const ext of EXTENSIONS) {
      const candidate = path.join(base, `index${ext}`);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
  }
  return null;
}

const files = listFiles(srcDir);
const failures = [];
const importRegex = /(?:import|export)\s+(?:[^'";]+\s+from\s+)?['"](\.{1,2}\/[^'"]+)['"]/g;
const dynamicRegex = /import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const regex of [importRegex, dynamicRegex]) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text))) {
      const specifier = match[1];
      if (!resolveRelativeImport(file, specifier)) {
        const line = text.slice(0, match.index).split(/\r?\n/).length;
        failures.push(`${path.relative(root, file)}:${line} -> ${specifier}`);
      }
    }
  }
}

if (failures.length) {
  console.error('Import check frontend gagal: relative import tidak ditemukan.');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`Import check frontend aman: ${files.length} file diperiksa.`);
