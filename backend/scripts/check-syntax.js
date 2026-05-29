const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');

function listJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listJsFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

const files = listJsFiles(srcDir);
const failures = [];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    failures.push({ file: path.relative(root, file), stderr: result.stderr || result.stdout });
  }
}

if (failures.length) {
  console.error(`Syntax check gagal pada ${failures.length} file.`);
  for (const failure of failures) {
    console.error(`\n[${failure.file}]`);
    console.error(failure.stderr.trim());
  }
  process.exit(1);
}

console.log(`Syntax check backend aman: ${files.length} file JS valid.`);
