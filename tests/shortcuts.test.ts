import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_SHORTCUTS, mergeShortcutChanges, normalizeShortcuts, shortcutConflict, validShortcutFormula, validShortcutName } from '../src/shortcuts';

test('formula shortcuts accept bounded names and complete renderable equations', () => {
  assert.ok(validShortcutName('myfrac'));
  assert.ok(validShortcutName('energy2'));
  for (const name of ['a', '1abc', 'hello world', 'constructor', '__proto__', 'toString', 'valueOf', 'a'.repeat(25)]) assert.equal(validShortcutName(name), false, name);
  assert.ok(validShortcutFormula(String.raw`\frac{3}{4}+\sqrt{x}`));
  for (const formula of ['', '#0', '#1', '#?', '#@', String.raw`\frac{}{x}`, String.raw`\unknown{x}`, '$x$', 'x^{', 'x^{}', 'x'.repeat(2049)]) assert.equal(validShortcutFormula(formula), false, formula);
  assert.ok(validShortcutFormula(String.raw`\#0`));
});

test('all MathLive interpolation parameters are rejected without blocking literal chemistry triple bonds', () => {
  for (const parameter of '0123456789?@') {
    for (const formula of [`#${parameter}`, `x+#${parameter}`, `\\frac{#${parameter}}{x}`, `#${parameter}x`]) {
      assert.equal(validShortcutFormula(formula), false, formula);
    }
  }
  assert.ok(validShortcutFormula(String.raw`\ce{C#N}`));
  assert.ok(validShortcutFormula(String.raw`\ce{HC#CH}`));
  assert.ok(validShortcutFormula(String.raw`\#0`));
  assert.equal(validShortcutFormula(String.raw`\\#0`), false);
});

test('malformed stored shortcut data cannot inject inherited keys or unbounded definitions', () => {
  assert.equal(Object.getPrototypeOf(normalizeShortcuts({})), null);
  const data = JSON.parse('{"__proto__":"x","constructor":"x","mine":"x^2","broken":"x^{"}');
  assert.deepEqual(Object.entries(normalizeShortcuts(data)), [['mine', 'x^2']]);
  assert.deepEqual(Object.entries(normalizeShortcuts(null)), []);
  assert.deepEqual(Object.entries(normalizeShortcuts(['x'])), []);
  assert.equal(Object.keys(normalizeShortcuts(Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`test${i}`, 'x'])))).length, MAX_SHORTCUTS);
});

test('ambiguous shortcut prefixes are rejected without replacing existing formulas', () => {
  assert.ok(shortcutConflict('sqrtmine', ['sqrt']));
  assert.ok(shortcutConflict('mys', ['myslope']));
  assert.ok(shortcutConflict('mysinextra', ['sin']));
  assert.equal(shortcutConflict('mine', ['other']), false);
  assert.equal(shortcutConflict('mine', ['mine']), false);
});

test('concurrent editors preserve unrelated shortcut changes and reject conflicting edits', () => {
  const merged = mergeShortcutChanges({ first: 'x' }, {}, { second: 'y' });
  assert.deepEqual(Object.entries(merged), [['first', 'x'], ['second', 'y']]);
  assert.throws(() => mergeShortcutChanges({ first: 'x^2' }, { first: 'x' }, {}), /changed/);
  assert.throws(() => mergeShortcutChanges({ myfrac: 'x' }, {}, { myfraction: 'y' }), /conflict/);
  assert.deepEqual(Object.entries(mergeShortcutChanges({ first: 'x', second: 'y' }, { first: 'x' }, {})), [['second', 'y']]);
});
