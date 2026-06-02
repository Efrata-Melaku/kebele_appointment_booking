import fs from 'fs';
import path from 'path';

const backendSrc = path.resolve(import.meta.dirname, '../../backend/src');

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (p.endsWith('.js')) acc.push(p);
  }
  return acc;
}

function resolveRequire(fromFile, spec) {
  if (!spec.startsWith('.')) return 'external';
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, base + '.js', path.join(base, 'index.js')];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

const requireRe = /require\(['"]([^'"]+)['"]\)/g;
const missing = [];

for (const file of walk(backendSrc)) {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = requireRe.exec(content))) {
    const spec = m[1];
    const resolved = resolveRequire(file, spec);
    if (resolved === null) missing.push({ file: path.relative(backendSrc, file), spec });
  }
}

if (missing.length) {
  console.error('Missing requires:', missing.length);
  console.error(JSON.stringify(missing, null, 2));
  process.exit(1);
}
console.log('All backend relative requires resolved');
