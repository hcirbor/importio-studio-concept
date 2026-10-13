import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const roots = [resolve('.next/static'), resolve('out/_next/static')];
const forbidden = [
  'CITEOTTER_UPSTREAM_URL',
  'CITEOTTER_BASIC_AUTH_FILE',
  'CITEOTTER_TIMEOUT_MS',
  'IAP_AUDIENCE',
  'phase4-client-secret-test',
];

async function files(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
  const nested = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  }));
  return nested.flat();
}

const matches = [];
for (const root of roots) {
  for (const file of await files(root)) {
    const text = (await readFile(file)).toString('utf8');
    for (const value of forbidden) {
      if (text.includes(value)) matches.push(`${file}: ${value}`);
    }
  }
}

if (matches.length) {
  process.stderr.write(`Server configuration leaked into the client bundle:\n${matches.join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(`Client bundle contains none of ${forbidden.length} server-only names or test values.\n`);
