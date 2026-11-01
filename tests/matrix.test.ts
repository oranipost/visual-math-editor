import assert from 'node:assert/strict';
import test from 'node:test';
import { convertLatexToMarkup, validateLatex } from 'mathlive/ssr';
import { buildMatrix, parseMatrix, type MatrixData, type MatrixKind } from '../src/matrix';

const matrix = (cells: string[][], kind: MatrixKind = 'pmatrix'): MatrixData => ({ kind, rows: cells.length, columns: cells[0]?.length ?? 0, cells });

test('builds every supported bracket style without evaluating cell expressions', () => {
  for (const kind of ['pmatrix', 'bmatrix', 'matrix', 'Bmatrix', 'vmatrix', 'Vmatrix'] as const) {
    const data = matrix([['1+2', String.raw`\frac{ a }{ b }`], ['x_1', String.raw`\sqrt{2}`]], kind);
    const source = buildMatrix(data);
    assert.equal(source, `\\begin{${kind}}1+2 & \\frac{ a }{ b } \\\\ x_1 & \\sqrt{2}\\end{${kind}}`);
    assert.deepEqual(validateLatex(source), []);
    assert.equal(convertLatexToMarkup(source).includes('ML__error'), false);
    assert.deepEqual(parseMatrix(source), data);
  }
});

test('supports the explicit one by one and six by six boundaries', () => {
  for (const size of [1, 6]) {
    const data = matrix(Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, column) => `${row + column + 1}`)));
    const source = buildMatrix(data);
    assert.deepEqual(parseMatrix(source), data);
    assert.equal(convertLatexToMarkup(source).includes('ML__error'), false);
  }
});

test('parses only outer cell boundaries and preserves each cell interior exactly', () => {
  const source = '\n\\begin{bmatrix}\r\n  \\frac{ a }{ b } & x_1 & 2 \\\\\r\n 3 & \\sqrt{ y + 1 } & \\text{A \\& B} \r\n\\end{bmatrix}\n';
  assert.deepEqual(parseMatrix(source), matrix([
    [String.raw`\frac{ a }{ b }`, 'x_1', '2'],
    ['3', String.raw`\sqrt{ y + 1 }`, String.raw`\text{A \& B}`],
  ], 'bmatrix'));
});

test('nested supported matrix and cases environments remain a single editable cell', () => {
  const nested = String.raw`\begin{bmatrix}a&b\\c&d\end{bmatrix}`;
  const cases = String.raw`\begin{cases}x^2&x\ge0\\-x&x<0\end{cases}`;
  const data = matrix([[nested, cases], ['0', '1']]);
  const source = buildMatrix(data);
  assert.deepEqual(validateLatex(source), []);
  assert.deepEqual(parseMatrix(source), data);
});

test('escaped separators and braces never split a matrix cell', () => {
  const data = matrix([[String.raw`\text{A \& B}`, String.raw`\{x\mid x>0\}`]]);
  assert.deepEqual(parseMatrix(buildMatrix(data)), data);
});

test('building trims only cell outside whitespace and does not mutate the caller data', () => {
  const data = matrix([[' \t\\frac{ a }{ b }\r\n', ' x + y ']]);
  const before = structuredClone(data);
  const source = buildMatrix(data);
  assert.deepEqual(data, before);
  assert.equal(source, String.raw`\begin{pmatrix}\frac{ a }{ b } & x + y\end{pmatrix}`);
});

test('refuses invalid dimensions, shape, missing cells and automatic zero filling', () => {
  const base = matrix([['1']]);
  for (const patch of [{ rows: 0 }, { rows: 7 }, { rows: 1.5 }, { columns: 0 }, { columns: 7 }, { columns: NaN }]) {
    assert.throws(() => buildMatrix({ ...base, ...patch }), /1 至 6/);
  }
  for (const cells of [[], [[]], [['1'], ['2']], [['1', '2']]]) {
    assert.throws(() => buildMatrix({ ...base, cells }), /数量/);
  }
  for (const cell of ['', ' \r\n\t']) assert.throws(() => buildMatrix(matrix([[cell]])), /空单元格/);
  assert.throws(() => buildMatrix({ ...base, kind: 'array' as MatrixKind }), /类型/);
});

test('rejects cell delimiter, environment-escape and template injection', () => {
  for (const cell of [
    'a & b', String.raw`a\\b`, String.raw`a\\[3pt]b`,
    String.raw`\end{pmatrix}\begin{pmatrix}x`, String.raw`\hline x`,
    String.raw`\multicolumn{2}{c}{x}`, '#0+x', String.raw`x_{#?}`,
  ]) assert.throws(() => buildMatrix(matrix([[cell]])), Error, cell);
});

test('rejects unsupported custom macros, incomplete math, outer wrappers and comments', () => {
  for (const cell of [
    String.raw`\myMacro{x}`, String.raw`\frac{1}{}`, String.raw`\frac{1}{2`,
    '$x$', String.raw`\(x\)`, 'x % comment\n+y',
    String.raw`\newcommand{\foo}{x}\foo`, String.raw`\begin{array}{c}x\end{array}`,
  ]) assert.throws(() => buildMatrix(matrix([[cell]])), Error, cell);
  assert.equal(parseMatrix(String.raw`\begin{pmatrix}\myMacro{x}\end{pmatrix}`), null);
});

test('enforces per-cell and total source budgets before expensive rendering', () => {
  assert.ok(buildMatrix(matrix([['x'.repeat(512)]])));
  assert.throws(() => buildMatrix(matrix([['x'.repeat(513)]])), /512/);
  assert.throws(() => buildMatrix(matrix(Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 'x'.repeat(240))))), /8192/);
  assert.throws(() => buildMatrix(matrix([['{'.repeat(33) + 'x' + '}'.repeat(33)]])), /32 层/);
});

test('parsing rejects wrapped, mixed, multiple, unknown and mismatched outer environments', () => {
  const good = String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}`;
  for (const source of [
    '$$'+good+'$$', 'A='+good, good+'+1', good+' '+good,
    String.raw`\begin{array}{cc}1&2\\3&4\end{array}`,
    String.raw`\begin{pmatrix*}[r]1\end{pmatrix*}`,
    String.raw`\begin{pmatrix}1\end{bmatrix}`, String.raw`\begin{pmatrix}1`,
    String.raw`\begin{unknown}1\end{unknown}`, '',
  ]) assert.equal(parseMatrix(source), null, source);
});

test('parsing does not guess row spacing, ragged rows, empty cells or trailing row separators', () => {
  for (const body of [
    String.raw`1&2\\[3pt]3&4`, String.raw`1&2\\  [3pt]3&4`,
    String.raw`1&2\\3`, '1&&2', '&1', '1&', String.raw`1&2\\`,
    String.raw`\hline 1&2`, String.raw`1\cr 2`,
  ]) assert.equal(parseMatrix(`\\begin{matrix}${body}\\end{matrix}`), null, body);
  const tooManyRows = Array.from({ length: 7 }, () => '1').join(String.raw`\\`);
  assert.equal(parseMatrix(`\\begin{matrix}${tooManyRows}\\end{matrix}`), null);
});

test('parsing preserves unknown source by returning null without mutating input', () => {
  const source = String.raw`\begin{pmatrix}1 & \custom{x}{y}\\3&4\end{pmatrix}`;
  const before = source;
  assert.equal(parseMatrix(source), null);
  assert.equal(source, before);
});
