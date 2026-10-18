import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const script = fileURLToPath(new URL('../scripts/package.mjs', import.meta.url));
const version = '0.6.1';
const installer = `visual-math-editor-${version}.zip`;
const source = `visual-math-editor-source-${version}.zip`;
const write = async (root: string, file: string, data: string | object) => {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), typeof data === 'string' ? data : JSON.stringify(data));
};
const run = (root: string) => spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
const entries = (root: string, archive: string): string => {
  const result = spawnSync('unzip', ['-Z1', path.join(root, 'release', archive)], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
};
async function fixture(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'vme-release-test-'));
  const manifest = { id: 'visual-math-editor', version, minAppVersion: '1.5.0' };
  await write(root, 'manifest.json', manifest);
  await write(root, 'package.json', { version });
  await write(root, 'package-lock.json', { version, packages: { '': { version } } });
  await write(root, 'versions.json', { [version]: '1.5.0' });
  await write(root, 'dist/manifest.json', manifest);
  for (const file of ['main.js', 'styles.css', 'MATHLIVE-LICENSE.txt']) await write(root, `dist/${file}`, 'build fixture');
  for (const file of ['README.md', 'README.zh-CN.md', 'README.en.md', 'MVP.md', 'TEST-REPORT.md', 'LICENSE', 'MATHLIVE-LICENSE.txt', 'KATEX-FONTS-LICENSE.txt', 'MHCHEM-LICENSE.txt', 'CONVERT-LICENSE.txt', 'THIRD-PARTY-NOTICES.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md', 'RELEASING.md', 'LANGUAGE-SUPPORT.md', 'ELEMENT-DATA-SOURCES.json', 'tsconfig.json', 'styles.css', '.gitignore', 'docs/INSTALLATION.md', 'docs/COMMUNITY-SUBMISSION.md', 'docs/images/example.jpg']) {
    await write(root, file, 'source fixture');
  }
  for (const folder of ['src', 'scripts', 'dev', 'tests']) await write(root, `${folder}/example.txt`, 'source fixture');
  await write(root, '.github/workflows/ci.yml', 'name: check');
  return root;
}

test('release archives include GitHub sources and licenses, exclude vault/settings, and report exact checksums', async () => {
  const root = await fixture();
  try {
    await write(root, 'work/test-vault/private-note.md', 'never package');
    await write(root, '.obsidian/plugins/plugin/data.json', 'never package');
    await write(root, 'data.json', 'never package');
    await write(root, '.env', 'never package');
    await write(root, 'src/removed.txt', 'old source');
    let result = run(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(entries(root, source), /src\/removed\.txt/);
    await rm(path.join(root, 'src/removed.txt'));
    result = run(root);
    assert.equal(result.status, 0, result.stderr);
    const sourceEntries = entries(root, source);
    assert.match(sourceEntries, /\.github\/workflows\/ci\.yml/);
    assert.match(sourceEntries, /MATHLIVE-LICENSE\.txt/);
    assert.match(sourceEntries, /README\.en\.md/);
    assert.doesNotMatch(sourceEntries, /removed\.txt|private-note|data\.json|\.env|\.obsidian|node_modules/);
    assert.match(entries(root, installer), /README\.en\.md/);
    assert.match(entries(root, installer), /LANGUAGE-SUPPORT\.md/);
    assert.match(entries(root, installer), /README\.zh-CN\.md/);
    assert.match(entries(root, installer), /docs\/INSTALLATION\.md/);
    assert.match(entries(root, installer), /docs\/images\/example\.jpg/);
    assert.doesNotMatch(entries(root, installer), /private-note|data\.json|\.env|\.obsidian|node_modules/);
    const expected = await Promise.all([installer, source].map(async name => `${createHash('sha256').update(await readFile(path.join(root, 'release', name))).digest('hex')}  ${name}`));
    assert.equal(await readFile(path.join(root, 'release/SHA256SUMS.txt'), 'utf8'), expected.join('\n') + '\n');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('release packaging rejects mismatched package, lockfile and minimum-version metadata', async () => {
  for (const [file, replacement] of [
    ['package.json', { version: '9.0.0' }],
    ['package-lock.json', { version: '9.0.0', packages: { '': { version } } }],
    ['package-lock.json', { version, packages: { '': { version: '9.0.0' } } }],
    ['versions.json', { [version]: '9.0.0' }],
  ] as const) {
    const root = await fixture();
    try {
      await write(root, file, replacement);
      const result = run(root);
      assert.notEqual(result.status, 0, file);
      assert.match(result.stderr, /versions disagree|versions\.json must map/);
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});

test('release packaging rejects stale build metadata and missing runtime content', async () => {
  for (const [file, replacement] of [['dist/manifest.json', '{}'], ['dist/main.js', ''], ['dist/styles.css', '']] as const) {
    const root = await fixture();
    try {
      await write(root, file, replacement);
      const result = run(root);
      assert.notEqual(result.status, 0, file);
      assert.match(result.stderr, /Built manifest is stale|Missing build content/);
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});

test('release source inputs reject symbolic links and nested private/generated files', async () => {
  for (const file of ['src/private-link', 'dev/.obsidian/data.json', 'tests/data.json', 'scripts/.env.local']) {
    const root = await fixture();
    try {
      if (file === 'src/private-link') {
        await write(root, 'private-note.md', 'never package');
        await symlink('../private-note.md', path.join(root, file));
      } else await write(root, file, 'never package');
      const result = run(root);
      assert.notEqual(result.status, 0, file);
      assert.match(result.stderr, /refuses symbolic link|Private or generated source input/);
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});

test('release version cannot become an output path', async () => {
  const root = await fixture();
  try {
    await write(root, 'manifest.json', { version: '../../outside', minAppVersion: '1.5.0' });
    const result = run(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Release version must use x.y.z/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
