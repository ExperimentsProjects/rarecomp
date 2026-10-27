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

  // npm ci fails on Vercel when the lockfile is out of sync or metadata is missing.
  if (!pkg.version) errors.push('package.json must include a version field (npm ci requires it on Vercel).');
  else console.log(`✓ package version ${pkg.version}`);
  if ('workspaces' in pkg) errors.push('package.json must not declare a workspaces field for a single-project repo.');
  if (!pkg.engines?.node) errors.push('package.json should declare engines.node for Vercel.');
  else console.log(`✓ engines.node ${pkg.engines.node}`);
}

if (existsSync('package-lock.json')) {
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  const pkg = existsSync('package.json') ? JSON.parse(readFileSync('package.json', 'utf8')) : null;
  if (!lock.lockfileVersion) errors.push('package-lock.json is missing lockfileVersion.');
  else if (lock.lockfileVersion < 2) errors.push(`package-lock.json lockfileVersion ${lock.lockfileVersion} is too old for Vercel (needs >= 2).`);
  else console.log(`✓ package-lock.json lockfileVersion ${lock.lockfileVersion}`);

  if (pkg) {
    if (lock.name !== pkg.name) errors.push(`Lockfile name "${lock.name}" does not match package.json name "${pkg.name}".`);
    if (lock.version !== pkg.version) errors.push(`Lockfile version "${lock.version}" does not match package.json version "${pkg.version}".`);
    const lockRoot = lock.packages?.[''] || {};
    const lockDeps = Object.keys(lockRoot.dependencies || {}).sort();
    const pkgDeps = Object.keys(pkg.dependencies || {}).sort();
    if (JSON.stringify(lockDeps) !== JSON.stringify(pkgDeps))
      errors.push('package-lock.json dependencies are out of sync with package.json — run `npm install` and commit the lockfile.');
    else console.log('✓ Lockfile dependencies match package.json');
  }
} else {
  errors.push('package-lock.json is missing — Vercel `npm ci` cannot install without it.');
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
