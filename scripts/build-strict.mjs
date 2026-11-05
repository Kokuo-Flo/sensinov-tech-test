// Production build that fails on any warning (budgets, bundler, Angular compiler).
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['ng', 'build'], {
  encoding: 'utf8',
  env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
});
const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
process.stdout.write(output);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
if (/\bWARNING\b|▲/.test(output)) {
  console.error('\n✖ build:strict — the build produced warnings. Warnings are treated as errors.');
  process.exit(1);
}
console.log('\n✔ build:strict — no warning.');
