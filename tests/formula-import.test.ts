import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeFormulaImport, MAX_FORMULA_IMPORT_CHARS, MAX_FORMULA_IMPORT_DEPTH, MAX_FORMULA_IMPORT_COMMANDS, MAX_FORMULA_VISUAL_CHARS, formulaVisualBudgetIssue } from '../src/formula-import';

test('bare formula trims only outside whitespace and states no layout preference', () => {
  const original = ' \t\\frac{ a }{ b } + x\r\n + y \t';
  assert.deepEqual(analyzeFormulaImport(original), {
    original, candidate: '\\frac{ a }{ b } + x\r\n + y', wrapper: 'bare', issue: null,
  });
});

test('recognizes exactly one complete wrapper with inline/display intent', () => {
  for (const [original, candidate, wrapper, display] of [
    ['$\\frac{ a }{ b }$', String.raw`\frac{ a }{ b }`, 'inline', false],
    [' \t$$\r\n x + y \r\n$$ \n', '\r\n x + y \r\n', 'display', true],
    [String.raw`\( x_1 + x^2 \)`, ' x_1 + x^2 ', 'inline', false],
    [String.raw`\[\sqrt{x}\]`, String.raw`\sqrt{x}`, 'display', true],
  ] as const) {
    assert.deepEqual(analyzeFormulaImport(original), { original, candidate, wrapper, display, issue: null });
  }
});

test('preserves internal CRLF, row separators and escaped symbols without decoding escapes', () => {
  const body = '\r\n\\begin{pmatrix}a & \\$5 \\\\\r\n c & 100\\%\\end{pmatrix}\r\n';
  const original = ` $$${body}$$ `;
  const result = analyzeFormulaImport(original);
  assert.equal(result.original, original);
  assert.equal(result.candidate, body);
  assert.equal(result.issue, null);
  assert.equal(analyzeFormulaImport(String.raw`x\n+y`).candidate, String.raw`x\n+y`);
  assert.equal(analyzeFormulaImport(String.raw`x\n+y`).issue, null, 'unknown commands are classified by the caller');
});

test('does not remove another math wrapper or join multiple equations', () => {
  for (const original of [
    '$x$ $y$', '$$x$$\n$$y$$', String.raw`\(x\) + \(y\)`,
    String.raw`\[$x$\]`, '$$\\[x\\]$$', 'Here is $x$ and $y$', 'x + $y$',
    '```latex\nx+1\n```',
  ]) {
    const result = analyzeFormulaImport(original);
    assert.equal(result.original, original);
    assert.match(result.issue ?? '', /单条公式/, original);
  }
});

test('rejects mismatched wrappers without guessing their contents', () => {
  for (const original of [
    '$x', '$x$$', '$$x$', '$$x$$$', String.raw`\(x\]`, String.raw`\[x\)`,
    String.raw`\(x`, String.raw`\[x`, String.raw`$x\$`, String.raw`$$x\$$`,
    String.raw`\[x\\]`,
  ]) {
    const result = analyzeFormulaImport(original);
    assert.equal(result.original, original);
    assert.equal(result.candidate, original.trim());
    assert.match(result.issue ?? '', /分隔符不匹配/, original);
  }
});

test('escape parity distinguishes literal dollars, braces and escaped wrapper lookalikes', () => {
  for (const original of [String.raw`\text{Price: \$5; tax: 5\%}`, String.raw`\{x\}`, String.raw`\$x\$`]) {
    assert.equal(analyzeFormulaImport(original).issue, null, original);
  }
  assert.match(analyzeFormulaImport(String.raw`x\\$y`).issue ?? '', /单条公式/);
  for (const original of [String.raw`$x\$$`, String.raw`$$x\$$$`]) {
    const result = analyzeFormulaImport(original);
    assert.equal(result.candidate, String.raw`x\$`);
    assert.equal(result.issue, null, original);
  }
  const rowEnding = String.raw`$$x\\$$`;
  assert.equal(analyzeFormulaImport(rowEnding).candidate, String.raw`x\\`);
  assert.equal(analyzeFormulaImport(rowEnding).issue, null);
});

test('uses the existing structural validation without repairing errors or deleting comments', () => {
  for (const [original, issue] of [
    [String.raw`\frac{x}{y`, /花括号/],
    [String.raw`\begin{matrix}x\end{pmatrix}`, /环境/],
    ['x % comment\n+y', /注释/],
    ['x\\', /反斜杠/],
  ] as const) {
    const result = analyzeFormulaImport(original);
    assert.equal(result.original, original);
    assert.equal(result.candidate, original);
    assert.match(result.issue ?? '', issue);
  }
});

test('accepts structural math environments but rejects document setup and file references', () => {
  for (const original of [
    String.raw`\begin{pmatrix}a&b\\c&d\end{pmatrix}`,
    String.raw`\begin{aligned}x&=1\\y&=2\end{aligned}`,
    String.raw`f(x)=\begin{cases}x^2&x\ge0\\-x&x<0\end{cases}`,
    String.raw`\sum_{n=1}^{\infty}\frac{1}{n^2}+\int_0^1x\,dx`,
  ]) assert.equal(analyzeFormulaImport(original).issue, null, original);
  for (const original of [
    String.raw`\documentclass{article}`, String.raw`\begin{document}x\end{document}`,
    String.raw`\usepackage{amsmath}x`, String.raw`\input{other}`, String.raw`\include{other}`,
    String.raw`\newcommand{\foo}{x}\foo`, String.raw`\def\foo{x}\foo`,
  ]) {
    const result = analyzeFormulaImport(original);
    assert.equal(result.original, original);
    assert.match(result.issue ?? '', /完整文档.*文件引用.*宏定义/, original);
  }
});

test('leaves bare letters, unknown macros and their arguments untouched for engine classification', () => {
  for (const original of [String.raw`\customMacro{ x }+1`, String.raw`\begin{custom}x\end{custom}`, 'xy', 'Here is x']) {
    const result = analyzeFormulaImport(original);
    assert.equal(result.original, original);
    assert.equal(result.candidate, original);
    assert.equal(result.issue, null, original);
  }
});

test('rejects active MathLive template parameters while preserving literal escaped forms', () => {
  for (const original of ['#0+x', '#1+x', '#9+x', 'x_{#?}', '#@', String.raw`x\\#0`]) {
    const result = analyzeFormulaImport(original);
    assert.equal(result.original, original);
    assert.match(result.issue ?? '', /模板参数/, original);
  }
  for (const original of [String.raw`\#0+x`, String.raw`\#?`, String.raw`\#@`, String.raw`\ce{C#C}`]) {
    assert.equal(analyzeFormulaImport(original).issue, null, original);
  }
});

test('rejects empty content and nonprinting controls without losing the exact input', () => {
  for (const original of ['', ' \r\n\t', '$$', '$$$$', '$ $', String.raw`\( \)`, String.raw`\[\]`, 'x\u0000+y']) {
    const result = analyzeFormulaImport(original);
    assert.equal(result.original, original);
    assert.ok(result.issue, JSON.stringify(original));
  }
});

test('checks UTF-16 capacity before parsing and retains the rejected source', () => {
  assert.equal(analyzeFormulaImport('x'.repeat(MAX_FORMULA_IMPORT_CHARS)).issue, null);
  for (const original of ['x'.repeat(MAX_FORMULA_IMPORT_CHARS + 1), '𝑥'.repeat(MAX_FORMULA_IMPORT_CHARS / 2 + 1)]) {
    const result = analyzeFormulaImport(original);
    assert.equal(result.original, original);
    assert.match(result.issue ?? '', /8192/);
  }
});

test('checks combined explicit group, environment and left/right depth before engine parsing', () => {
  const group = (depth: number) => '{'.repeat(depth) + 'x' + '}'.repeat(depth);
  const environment = (depth: number) => String.raw`\begin{matrix}`.repeat(depth) + 'x' + String.raw`\end{matrix}`.repeat(depth);
  const delimiters = (depth: number) => String.raw`\left(`.repeat(depth) + 'x' + String.raw`\right)`.repeat(depth);
  for (const create of [group, environment, delimiters]) {
    assert.equal(analyzeFormulaImport(create(MAX_FORMULA_IMPORT_DEPTH)).issue, null);
    const original = create(MAX_FORMULA_IMPORT_DEPTH + 1);
    const result = analyzeFormulaImport(original);
    assert.equal(result.original, original);
    assert.match(result.issue ?? '', /32 层/);
  }
  assert.match(analyzeFormulaImport('{'.repeat(16) + environment(17) + '}'.repeat(16)).issue ?? '', /32 层/);
  assert.match(analyzeFormulaImport(String.raw`\begin{ matrix }`.repeat(33) + 'x' + String.raw`\end{ matrix }`.repeat(33)).issue ?? '', /32 层/);
  const escapedGroups = String.raw`\{`.repeat(100) + 'x' + String.raw`\}`.repeat(100);
  assert.equal(analyzeFormulaImport(escapedGroups).issue, null, 'literal braces are not nesting');
});


test('caps total control commands without expanding them', () => {
  assert.equal(analyzeFormulaImport(String.raw`\alpha `.repeat(MAX_FORMULA_IMPORT_COMMANDS)).issue, null);
  for (const original of [
    String.raw`\alpha `.repeat(MAX_FORMULA_IMPORT_COMMANDS + 1),
    String.raw`\sqrt{x}+`.repeat(MAX_FORMULA_IMPORT_COMMANDS + 1) + '1',
  ]) {
    const result = analyzeFormulaImport(original);
    assert.equal(result.original, original);
    assert.match(result.issue ?? '', /512 个命令/);
  }
});


test('caps consecutive unbraced known argument commands before invoking a visual parser', () => {
  for (const name of ['sqrt', 'frac', 'dfrac', 'tfrac', 'binom', 'overset', 'underset']) {
    const command = `\\${name} `;
    const boundary = command.repeat(MAX_FORMULA_IMPORT_DEPTH) + 'x';
    // This preflight checks resources, not the number or meaning of TeX arguments.
    assert.equal(analyzeFormulaImport(boundary).issue, null, name);
    const original = command.repeat(MAX_FORMULA_IMPORT_DEPTH + 1) + 'x';
    const result = analyzeFormulaImport(original);
    assert.equal(result.original, original);
    assert.equal(result.candidate, original);
    assert.match(result.issue ?? '', /32 层/, name);
  }
  const spaced = ('\\sqrt\t\r\n').repeat(MAX_FORMULA_IMPORT_DEPTH + 1) + 'x';
  assert.match(analyzeFormulaImport(spaced).issue ?? '', /32 层/, 'whitespace does not break a chain');
  assert.match(analyzeFormulaImport(String.raw`\sqrt `.repeat(64) + 'x').issue ?? '', /32 层/);
});

test('ordinary operands and explicit groups prevent unrelated commands from forming a chain', () => {
  const independentRoots = String.raw`\sqrt{x}+`.repeat(64) + '1';
  assert.equal(analyzeFormulaImport(independentRoots).issue, null);
  const nestedAtBoundary = String.raw`\sqrt{`.repeat(32) + 'x' + '}'.repeat(32);
  assert.equal(analyzeFormulaImport(nestedAtBoundary).issue, null);
  const nestedOverBoundary = String.raw`\sqrt{`.repeat(33) + 'x' + '}'.repeat(33);
  assert.match(analyzeFormulaImport(nestedOverBoundary).issue ?? '', /32 层/);
  const expandedTaylor = 'P(x)=1+x+' + Array.from({ length: 62 }, (_, index) => `\\frac{x^{${index + 2}}}{${index + 2}!}`).join('+');
  const result = analyzeFormulaImport(expandedTaylor);
  assert.equal(result.issue, null);
  assert.equal(result.candidate, expandedTaylor);
  assert.equal(result.original, expandedTaylor);
});


test('visual rendering has a separate UTF-16 budget without changing source import capacity', () => {
  assert.equal(MAX_FORMULA_VISUAL_CHARS, 4096);
  assert.equal(formulaVisualBudgetIssue('x'.repeat(4096)), null);
  assert.equal(formulaVisualBudgetIssue('𝑥'.repeat(2048)), null);
  for (const original of ['x'.repeat(4097), '𝑥'.repeat(2049)]) {
    assert.match(formulaVisualBudgetIssue(original) ?? '', /4096.*UTF-16/);
    const result = analyzeFormulaImport(original);
    assert.equal(result.issue, null);
    assert.equal(result.original, original);
    assert.equal(result.candidate, original);
  }
  assert.equal(MAX_FORMULA_IMPORT_CHARS, 8192);
});
