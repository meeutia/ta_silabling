const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');
const EXTENSIONS = ['.js', '.json', '.ejs'];

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return entry.isFile() && /\.(js|json)$/i.test(entry.name) ? [full] : [];
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
const requireRegex = /require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
const importRegex = /(?:import|export)\s+(?:[^'";]+\s+from\s+)?['"](\.{1,2}\/[^'"]+)['"]/g;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const checks = [requireRegex, importRegex];
  for (const regex of checks) {
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
  console.error('Import check backend gagal: relative import/require tidak ditemukan.');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`Import check backend aman: ${files.length} file diperiksa.`);
