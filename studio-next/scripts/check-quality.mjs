import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const cwd = process.cwd();
const baseline = JSON.parse(readFileSync(resolve(cwd, 'quality-baseline.json'), 'utf8'));
const trackedRules = new Set(['@typescript-eslint/no-explicit-any', '@typescript-eslint/no-unused-vars']);

function run(command, args) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0 && !result.stdout) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}

function key(issue) {
  return `${issue.tool}:${issue.rule}:${issue.file}`;
}

const eslintReport = JSON.parse(run(resolve(cwd, 'node_modules/.bin/eslint'), ['src', '--format', 'json']));
const actual = new Map();

for (const result of eslintReport) {
  const file = relative(cwd, result.filePath);
  for (const message of result.messages) {
    if (!message.ruleId || !trackedRules.has(message.ruleId)) continue;
    const issue = { tool: 'eslint', rule: message.ruleId, file, count: 1 };
    const issueKey = key(issue);
    actual.set(issueKey, { ...issue, count: (actual.get(issueKey)?.count ?? 0) + 1 });
  }
}

const knipReport = JSON.parse(run(resolve(cwd, 'node_modules/.bin/knip'), ['--reporter', 'json', '--no-exit-code']));
for (const result of knipReport.issues) {
  const categories = [
    ['unused-file', result.files],
    ['unused-export', result.exports],
    ['unused-type', result.types],
  ];
  for (const [rule, entries] of categories) {
    if (!entries.length) continue;
    const issue = { tool: 'knip', rule, file: result.file, count: entries.length };
    actual.set(key(issue), issue);
  }
}

const allowed = new Map(baseline.issues.map((issue) => [key(issue), issue.count]));
const regressions = [...actual.values()].filter((issue) => issue.count > (allowed.get(key(issue)) ?? 0));
if (regressions.length) {
  process.stderr.write('Quality baseline regressed:\n');
  for (const issue of regressions) {
    process.stderr.write(`- ${issue.tool} ${issue.rule} ${issue.file}: ${issue.count} (allowed ${allowed.get(key(issue)) ?? 0})\n`);
  }
  process.exit(1);
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(tsx|ts)$/.test(entry.name) ? [path] : [];
  });
}

const componentRoot = resolve(cwd, 'src/components');
const largest = sourceFiles(componentRoot)
  .map((file) => ({ file: relative(cwd, file), lines: readFileSync(file, 'utf8').split('\n').length }))
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 10);
const totals = [...actual.values()].reduce((sum, issue) => sum + issue.count, 0);
const strict = JSON.parse(readFileSync(resolve(cwd, 'tsconfig.json'), 'utf8')).compilerOptions?.strict === true;

if (!strict) {
  process.stderr.write('TypeScript strict mode must remain enabled.\n');
  process.exit(1);
}

process.stdout.write(`Quality baseline passed: ${totals} tracked issue(s), ${regressions.length} regression(s).\n`);
process.stdout.write('10 largest component modules:\n');
for (const item of largest) process.stdout.write(`- ${item.lines} ${item.file}\n`);
