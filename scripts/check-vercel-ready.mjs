import { existsSync, readFileSync } from 'node:fs';

const errors = [];
const required = [
  'package.json',
  'package-lock.json',
  'vercel.json',
  'next.config.ts',
  'tsconfig.json',
  'src/app/page.tsx',
  'src/app/layout.tsx',
  'src/db/schema.ts',
  'public',
  '.env.example',
  '.gitignore',
];

for (const path of required) {
  if (!existsSync(path)) errors.push(`Missing required path: ${path}`);
}

if (existsSync('package.json')) {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  if (!pkg.dependencies?.next) errors.push('package.json must list next in dependencies.');
  if (!pkg.dependencies?.react) errors.push('package.json must list react in dependencies.');
  if (pkg.scripts?.build !== 'next build') errors.push('package.json build script must run next build.');
  else console.log(`✓ Next.js ${pkg.dependencies.next} detected`);
}

if (existsSync('vercel.json')) {
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
  if (vercel.framework !== 'nextjs') errors.push('vercel.json framework must be nextjs.');
  else console.log('✓ Vercel framework preset: nextjs');
}

if (existsSync('.gitignore')) {
  const ignored = readFileSync('.gitignore', 'utf8');
  for (const path of ['node_modules/', '.next/', '.env']) {
    if (!ignored.includes(path)) errors.push(`.gitignore should exclude ${path}`);
  }
  if (ignored.split(/\r?\n/).some((line) => line.trim() === 'package-lock.json')) {
    errors.push('package-lock.json must not be ignored; Vercel needs the committed lockfile.');
  }
  if (ignored.split(/\r?\n/).some((line) => line.trim() === '.env.example')) {
    errors.push('.env.example must not be ignored.');
  }
  console.log('✓ Generated builds and secrets are excluded');
}

const unsafeFiles = ['.next/package.json', '.next/build/package.json'];
if (unsafeFiles.some(existsSync)) {
  console.log('ℹ Local .next build exists, but .gitignore/.vercelignore exclude it.');
}

if (errors.length) {
  console.error('\nVERCEL CHECK FAILED');
  for (const error of errors) console.error(`✗ ${error}`);
  process.exit(1);
}

console.log('✓ Repository root contains package.json and lockfile');
console.log('\nVERCEL READY');
console.log('Import this repository with Root Directory = ./ and Framework Preset = Next.js.');
