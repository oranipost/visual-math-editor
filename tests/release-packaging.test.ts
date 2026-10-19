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
const projectLicense = 'GPL version 3 only with the Obsidian linking exception\n';
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
const archivedFile = (root: string, archive: string, file: string): string => {
  const result = spawnSync('unzip', ['-p', path.join(root, 'release', archive), file], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
};
async function fixture(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'vme-release-test-'));
  const manifest = { id: 'visual-math-editor', version, minAppVersion: '1.5.0' };
  await write(root, 'manifest.json', manifest);
  const license = 'SEE LICENSE IN LICENSING.md';
  const dependencies = { mathlive: '0.111.1', convert: '8.0.2' };
  const packages: Record<string, object> = { '': { version, license } };
  const archives = [];
  const sums = [];
  for (const [name, dependencyVersion] of Object.entries(dependencies)) {
    const commit = (name === 'mathlive' ? 'a' : 'b').repeat(40);
    const sourceRoot = `${name}-${commit}`;
    const sourceArchiveFile = `${name}-${dependencyVersion}-source.tar.gz`;
    const npmArchiveFile = `${name}-${dependencyVersion}-npm.tgz`;
    await write(root, `upstream/${sourceRoot}/package.json`, { name, version: dependencyVersion });
    await write(root, `upstream/${sourceRoot}/src/index.ts`, 'export const fixture = 1;');
    await write(root, `upstream/${sourceRoot}/LICENSE`, 'upstream MIT notice');
    await mkdir(path.join(root, 'third-party-sources'), { recursive: true });
    const tar = spawnSync('tar', ['-czf', path.join(root, 'third-party-sources', sourceArchiveFile), sourceRoot], { cwd: path.join(root, 'upstream'), encoding: 'utf8' });
    assert.equal(tar.status, 0, tar.stderr);
    await write(root, `third-party-sources/${npmArchiveFile}`, `${name} published distribution`);
    const sourceBytes = await readFile(path.join(root, 'third-party-sources', sourceArchiveFile));
    const npmBytes = await readFile(path.join(root, 'third-party-sources', npmArchiveFile));
    const sourceArchiveSha256 = createHash('sha256').update(sourceBytes).digest('hex');
    const npmArchiveSha256 = createHash('sha256').update(npmBytes).digest('hex');
    const npmIntegrity = `sha512-${createHash('sha512').update(npmBytes).digest('base64')}`;
    const npmArchiveUrl = `https://registry.npmjs.org/${name}/-/${name}-${dependencyVersion}.tgz`;
    packages[`node_modules/${name}`] = { version: dependencyVersion, resolved: npmArchiveUrl, integrity: npmIntegrity };
    archives.push({ package: name, version: dependencyVersion, sourceCommit: commit, sourceArchiveUrl: `https://codeload.github.com/example/${name}/tar.gz/${commit}`, sourceArchiveFile, sourceArchiveSha256, npmArchiveFile, npmArchiveSha256, npmArchiveUrl, npmIntegrity });
    sums.push(`${sourceArchiveSha256}  ${sourceArchiveFile}`, `${npmArchiveSha256}  ${npmArchiveFile}`);
  }
  await write(root, 'third-party-sources/sources.json', { archives });
  await write(root, 'third-party-sources/SHA256SUMS.txt', sums.join('\n') + '\n');
  await write(root, 'third-party-sources/README.md', 'Dependency source instructions');
  await write(root, 'package.json', { version, license, dependencies });
  await write(root, 'package-lock.json', { version, packages });
  await write(root, 'versions.json', { [version]: '1.5.0' });
  await write(root, 'dist/manifest.json', manifest);
  for (const file of ['main.js', 'styles.css', 'MATHLIVE-LICENSE.txt']) await write(root, `dist/${file}`, 'build fixture');
  for (const file of ['README.md', 'README.zh-CN.md', 'README.en.md', 'MVP.md', 'TEST-REPORT.md', 'LICENSE', 'MATHLIVE-LICENSE.txt', 'KATEX-FONTS-LICENSE.txt', 'MHCHEM-LICENSE.txt', 'CONVERT-LICENSE.txt', 'THIRD-PARTY-NOTICES.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md', 'RELEASING.md', 'LANGUAGE-SUPPORT.md', 'ELEMENT-DATA-SOURCES.json', 'tsconfig.json', 'styles.css', '.gitignore', 'docs/INSTALLATION.md', 'docs/COMMUNITY-SUBMISSION.md', 'docs/images/example.jpg']) {
    await write(root, file, 'source fixture');
  }
  await write(root, 'LICENSING.md', projectLicense);
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
    assert.match(sourceEntries, /third-party-sources\/mathlive-0\.111\.1-source\.tar\.gz/);
    assert.match(sourceEntries, /third-party-sources\/convert-8\.0\.2-npm\.tgz/);
    assert.equal(archivedFile(root, source, 'visual-math-editor-source/LICENSING.md'), projectLicense);
    assert.equal(archivedFile(root, installer, 'visual-math-editor/LICENSING.md'), projectLicense);
    assert.doesNotMatch(sourceEntries, /removed\.txt|private-note|data\.json|\.env|\.obsidian|node_modules/);
    assert.match(entries(root, installer), /README\.en\.md/);
    assert.match(entries(root, installer), /LANGUAGE-SUPPORT\.md/);
    assert.match(entries(root, installer), /README\.zh-CN\.md/);
    assert.match(entries(root, installer), /docs\/INSTALLATION\.md/);
    assert.match(entries(root, installer), /docs\/images\/example\.jpg/);
    assert.doesNotMatch(entries(root, installer), /private-note|data\.json|\.env|\.obsidian|node_modules/);
    assert.doesNotMatch(entries(root, installer), /third-party-sources|upstream\//);
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
  for (const file of ['src/private-link', 'dev/.obsidian/data.json', 'tests/data.json', 'scripts/.env.local', 'third-party-sources/.env.local']) {
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

test('packaging rejects missing license metadata, tampered archives and misleading dependency source records', async () => {
  for (const mutation of ['project-license', 'archive-bytes', 'dependency-version', 'npm-provenance', 'source-ref', 'checksum-list']) {
    const root = await fixture();
    try {
      const records = JSON.parse(await readFile(path.join(root, 'third-party-sources/sources.json'), 'utf8'));
      if (mutation === 'project-license') {
        const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
        pkg.license = 'MIT';
        await write(root, 'package.json', pkg);
      } else if (mutation === 'archive-bytes') {
        await write(root, `third-party-sources/${records.archives[0].sourceArchiveFile}`, 'tampered');
      } else if (mutation === 'dependency-version') records.archives[0].version = '9.0.0';
      else if (mutation === 'npm-provenance') records.archives[0].npmIntegrity = 'sha512-incorrect';
      else if (mutation === 'source-ref') records.archives[0].sourceArchiveUrl = 'https://example.com/main.tar.gz';
      else await write(root, 'third-party-sources/SHA256SUMS.txt', 'incorrect\n');
      await write(root, 'third-party-sources/sources.json', records);
      const result = run(root);
      assert.notEqual(result.status, 0, mutation);
      assert.match(result.stderr, /license metadata|checksum mismatch|source version|provenance disagrees|fixed source commit|checksum manifest/);
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
