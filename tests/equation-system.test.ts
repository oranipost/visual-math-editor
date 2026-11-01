import assert from 'node:assert/strict';
import test from 'node:test';
import { convertLatexToMarkup, convertLatexToMathMl, validateLatex } from 'mathlive';
import { buildSystem, parseSystem, validateSystemLine, type SystemData } from '../src/equation-system';

const system = (lines: string[]): SystemData => ({ rows: lines.length, lines });

test('left-braced system renders two through six actual visual rows in one column', () => {
  for (let rows = 2; rows <= 6; rows++) {
    const data = system(Array.from({ length: rows }, (_, row) => `x_${row + 1}+y=${row + 2}`));
    const source = buildSystem(data);
    assert.deepEqual(validateLatex(source), []);
    assert.ok(!convertLatexToMarkup(source).includes('ML__error'));
    const mathml = convertLatexToMathMl(source);
    assert.ok(mathml.includes('<mo>{</mo>'));
    assert.equal((mathml.match(/<mtr>/g) ?? []).length, rows);
    assert.equal((mathml.match(/<mtd>/g) ?? []).length, rows);
    assert.deepEqual(parseSystem(source), data);
  }
});

test('systems preserve line interiors without solving or normalizing expressions', () => {
  const data = system([String.raw`\frac{ a }{ b }+x=3`, String.raw`\sqrt{x+1}-y\le 2`]);
  const before = structuredClone(data);
  const source = buildSystem(data);
  assert.equal(source, String.raw`\begin{cases}\frac{ a }{ b }+x=3 \\ \sqrt{x+1}-y\le 2\end{cases}`);
  assert.deepEqual(parseSystem(source), before);
  assert.deepEqual(data, before);
});

test('loading trims only outside row whitespace, keeping each math interior intact', () => {
  const source = '\r\n\\begin { cases } \r\n \\frac{ a }{ b } + y = 3 \\\\\r\n \\sqrt{ x }-y = 1 \r\n\\end { cases }\n';
  assert.deepEqual(parseSystem(source), system([String.raw`\frac{ a }{ b } + y = 3`, String.raw`\sqrt{ x }-y = 1`]));
});

test('nested supported structures and escaped characters stay in their original row', () => {
  const data = system([String.raw`A=\begin{bmatrix}a&b\\c&d\end{bmatrix}`, String.raw`\text{A \& B}=\{x\mid x>0\}`]);
  assert.deepEqual(parseSystem(buildSystem(data)), data);
});

test('refuses one or seven lines, noninteger dimensions and mismatched content', () => {
  for (const rows of [0, 1, 7, 2.5, NaN]) assert.throws(() => buildSystem({ rows, lines: ['x=1', 'y=2'] }), /2 至 6/);
  for (const lines of [[], ['x=1'], ['x=1', 'y=2', 'z=3']]) assert.throws(() => buildSystem({ rows: 2, lines }), /不一致/);
  assert.throws(() => buildSystem({ rows: 2, lines: ['x=1', undefined as unknown as string] }), /源码/);
});

test('empty lines and unfinished structures are never deleted or silently filled', () => {
  for (const line of ['', ' \r\n', String.raw`\frac{1}{}`, String.raw`x_{}`, String.raw`\placeholder{}`, '#0+x', '#?']) {
    assert.throws(() => buildSystem(system(['x=1', line])), Error, line);
  }
});

test('row separator, top-level column and row formatting injection are rejected', () => {
  for (const line of ['x&=1', String.raw`x=1\\y=2`, String.raw`x\\[2pt]y`, String.raw`\hline x`, String.raw`\multicolumn{2}{c}{x}`, String.raw`\end{cases}\begin{cases}x`]) {
    assert.throws(() => buildSystem(system(['x=1', line])), Error, line);
  }
});

test('unknown macros, wrappers and unsupported nested environments preserve source by refusing', () => {
  for (const line of [String.raw`\myMacro{x}`, '$x=1$', String.raw`\(x=1\)`, String.raw`\begin{aligned}x&=1\end{aligned}`, String.raw`\newcommand{\foo}{x}\foo`, 'x % comment\n+y']) {
    assert.throws(() => buildSystem(system(['x=1', line])), Error, line);
    const original = String.raw`\begin{cases}` + line + String.raw`\\y=2\end{cases}`;
    const before = original; assert.equal(parseSystem(original), null); assert.equal(original, before);
  }
});

test('line length limits apply before expensive visual parsing', () => {
  assert.equal(validateSystemLine('x'.repeat(512)).length, 512);
  assert.throws(() => validateSystemLine('x'.repeat(513)), /512/);
  assert.throws(() => buildSystem(system(['x=1', '{'.repeat(33) + 'x' + '}'.repeat(33)])), Error);
  assert.equal(parseSystem('x'.repeat(8193)), null);
});

test('single-column loading never reinterprets a piecewise function or aligned system', () => {
  for (const source of [
    String.raw`\begin{cases}x^2&x\ge0\\-x&x<0\end{cases}`,
    String.raw`\left\{\begin{aligned}x+y&=3\\x-y&=1\end{aligned}\right.`,
    String.raw`\begin{dcases}x=1\\y=2\end{dcases}`,
    String.raw`\begin{rcases}x=1\\y=2\end{rcases}`,
  ]) assert.equal(parseSystem(source), null, source);
});

test('load rejects mixed content, multiple systems, trailing rows and unknown row gaps', () => {
  const good = buildSystem(system(['x=1', 'y=2']));
  for (const source of ['A='+good, good+'+1', good+good, '$$'+good+'$$', String.raw`\begin{cases}x=1\\y=2\\\end{cases}`, String.raw`\begin{cases}x=1\\[2pt]y=2\end{cases}`, String.raw`\begin{cases}x=1\\y=2\end{matrix}`, String.raw`\begin{cases}x=1\end{cases}`]) {
    assert.equal(parseSystem(source), null, source);
  }
});

test('unknown macro is an actual unsupported visual error rather than accepted source retention', () => {
  const source = String.raw`\begin{cases}\unknown{x}=1\\y=2\end{cases}`;
  assert.ok(validateLatex(source).some(error => error.code === 'unknown-command'));
  assert.ok(convertLatexToMarkup(source).includes('ML__error'));
  assert.equal(parseSystem(source), null);
});
