// Runs every tests/*.test.ts with tsx and reports which ones failed.
import { spawnSync } from 'child_process';
import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here).filter(f => f.endsWith('.test.ts')).sort();
const failed = [];
for (const file of files) {
  // Relative path from the project root: the folder name has a space in it
  const run = spawnSync('npx', ['tsx', `tests/${file}`], { encoding: 'utf8', shell: true, cwd: join(here, '..') });
  const output = `${run.stdout}${run.stderr}`;
  const ok = run.status === 0 && output.includes('ALL PASSED');
  console.log(`${ok ? '✓' : '✗'} ${file}`);
  if (!ok) {
    failed.push(file);
    console.log(output.split('\n').filter(line => line.startsWith('FAIL') || /error/i.test(line)).join('\n'));
  }
}
console.log(failed.length ? `\n${failed.length} of ${files.length} test files failed` : `\nAll ${files.length} test files passed`);
process.exitCode = failed.length ? 1 : 0;
