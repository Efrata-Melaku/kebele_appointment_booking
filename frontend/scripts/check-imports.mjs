import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');
const sharedRoot = path.join(root, 'shared/src');
const portals = [
  { name: 'management', dir: path.join(root, 'management-portal/src') },
  { name: 'resident', dir: path.join(root, 'resident-portal/src') },
  { name: 'shared', dir: sharedRoot },
];

const exts = ['.ts', '.tsx', '.js', '.jsx', '.css', '.png', '.svg', '.jpg', '.jpeg', '.webp', '.gif'];

function resolveFile(spec) {
  const candidates = [];
  if (/\.(tsx?|jsx?|css|png|svg|jpe?g|webp|gif)$/i.test(spec)) candidates.push(spec);
  else {
    for (const e of exts) {
      candidates.push(spec + e);
      candidates.push(path.join(spec, 'index' + e));
    }
  }
  for (const c of candidates) {
    const p = path.normalize(c);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

function resolveImport(fromFile, spec) {
  if (spec.startsWith('@kebele/shared/')) {
    return resolveFile(path.join(sharedRoot, spec.slice('@kebele/shared/'.length)));
  }
  if (spec.startsWith('@/')) {
    const portalSrc = portals.find((p) => fromFile.startsWith(p.dir))?.dir;
    if (!portalSrc) return null;
    return resolveFile(path.join(portalSrc, spec.slice(2)));
  }
  if (spec.startsWith('.')) {
    return resolveFile(path.resolve(path.dirname(fromFile), spec));
  }
  return 'external';
}

const importRe =
  /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+\s+from\s+)?['"]([^'"]+)['"]/g;

const missing = [];
for (const portal of portals) {
  for (const file of walk(portal.dir)) {
    if (!/\.(tsx?|jsx?)$/.test(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    let m;
    while ((m = importRe.exec(content))) {
      const spec = m[1];
      if (
        spec.startsWith('react') ||
        spec.startsWith('lucide') ||
        spec.startsWith('@radix') ||
        spec.startsWith('axios') ||
        spec.startsWith('zod') ||
        spec.startsWith('recharts') ||
        spec.startsWith('figma:') ||
        spec.startsWith('date-fns') ||
        spec.startsWith('@hookform') ||
        spec.startsWith('@mui') ||
        spec.startsWith('class-variance') ||
        spec.startsWith('react-') ||
        spec.startsWith('sonner') ||
        spec.startsWith('motion') ||
        spec.startsWith('next-themes') ||
        spec.startsWith('cmdk') ||
        spec.startsWith('embla') ||
        spec.startsWith('input-otp') ||
        spec.startsWith('vaul') ||
        spec.startsWith('canvas-confetti') ||
        spec.startsWith('tailwind') ||
        spec.startsWith('clsx') ||
        spec === 'vite/client'
      ) {
        continue;
      }
      if (!spec.startsWith('.') && !spec.startsWith('@/') && !spec.startsWith('@kebele/')) {
        continue;
      }
      const resolved = resolveImport(file, spec);
      if (resolved === null) missing.push({ file: path.relative(root, file), spec });
    }
  }
}

if (missing.length) {
  console.error('Missing imports:', missing.length);
  console.error(JSON.stringify(missing, null, 2));
  process.exit(1);
}
console.log('All relative/@ imports resolved');

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
