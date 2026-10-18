import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));

test('the three-file community distribution retains complete required license notices', async () => {
  await run(process.execPath, ['scripts/build.mjs'], { cwd: root });
  const js = await readFile(new URL('../dist/main.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../dist/styles.css', import.meta.url), 'utf8');
  for (const notice of ['LICENSE', 'MATHLIVE-LICENSE.txt', 'CONVERT-LICENSE.txt', 'MHCHEM-LICENSE.txt', 'THIRD-PARTY-NOTICES.md']) {
    const original = await readFile(new URL(`../${notice}`, import.meta.url), 'utf8');
    assert.ok(js.includes(original), `main.js must retain the complete ${notice}`);
  }
  const fontNotice = await readFile(new URL('../KATEX-FONTS-LICENSE.txt', import.meta.url), 'utf8');
  assert.ok(css.includes(fontNotice), 'styles.css must retain the complete font notice');
  await run(process.execPath, ['--check', 'dist/main.js'], { cwd: root });
});
