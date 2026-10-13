import { cp, mkdir, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const sourceRoot = resolve('server-routes/app');
const appRoot = resolve('src/app');
const routeRoots = ['api/engine', 'healthz', 'readyz'];
const proxySource = resolve('server-routes/proxy.ts');
const proxyTarget = resolve('src/proxy.ts');
const commandArgs = process.argv.slice(2);

if (!commandArgs.length) {
  process.stderr.write('Usage: node scripts/with-server-routes.mjs <next arguments>\n');
  process.exit(2);
}

let result;
try {
  for (const routeRoot of routeRoots) {
    const target = resolve(appRoot, routeRoot);
    await mkdir(dirname(target), { recursive: true });
    await cp(resolve(sourceRoot, routeRoot), target, { recursive: true, force: false, errorOnExist: true });
  }
  await cp(proxySource, proxyTarget, { force: false, errorOnExist: true });
  result = spawnSync(resolve('node_modules/.bin/next'), commandArgs, {
    env: { ...process.env, STUDIO_BUILD_TARGET: 'server' },
    stdio: 'inherit',
  });
} finally {
  for (const routeRoot of routeRoots) await rm(resolve(appRoot, routeRoot), { recursive: true, force: true });
  await rmdir(resolve(appRoot, 'api')).catch((error) => {
    if (!error || typeof error !== 'object' || !('code' in error) || !['ENOENT', 'ENOTEMPTY'].includes(String(error.code))) throw error;
  });
  await rm(proxyTarget, { force: true });
}

if (result?.error) throw result.error;
if (result?.status !== 0) process.exit(result?.status ?? 1);

if (commandArgs[0] === 'build') {
  for (const routeRoot of routeRoots) {
    await rm(resolve('.next/types/app', routeRoot), { recursive: true, force: true });
  }
  const typegen = spawnSync(resolve('node_modules/.bin/next'), ['typegen'], {
    env: { ...process.env, STUDIO_BUILD_TARGET: 'demo' },
    stdio: 'inherit',
  });
  if (typegen.error) throw typegen.error;
  if (typegen.status !== 0) process.exit(typegen.status ?? 1);
}
