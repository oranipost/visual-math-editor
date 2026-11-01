/** Reproducible input corpus, not a claim that every structure is visually supported. */
export interface FormulaImportCase {
  id: string;
  group: 'baseline' | 'long' | 'structure' | 'wrapper' | 'escaping' | 'unknown' | 'invalid' | 'outside-scope' | 'stress';
  origin: 'representative-example' | 'constructed-stress';
  source: string;
  intent: string;
}

/** Finite Taylor polynomial for exp(x), written out rather than abbreviated by a sum. */
export function expandedTaylor(terms: number): string {
  return 'P(x)=' + Array.from({ length: terms }, (_, n) => n === 0 ? '1' : n === 1 ? 'x' : `\\frac{x^{${n}}}{${n}!}`).join('+');
}

/** Human-constructed continued fraction. The depth is independent from string length. */
export function nestedFraction(depth: number): string {
  let value = 'x';
  for (let n = 0; n < depth; n++) value = `1+\\frac{1}{${value}}`;
  return value;
}

/** Human-constructed radical ladder. */
export function nestedRoot(depth: number): string {
  let value = 'x';
  for (let n = 0; n < depth; n++) value = `\\sqrt{1+${value}}`;
  return value;
}

const representative = (id: string, group: FormulaImportCase['group'], source: string, intent: string): FormulaImportCase => ({
  id, group, source, intent, origin: 'representative-example',
});
const stress = (id: string, source: string, intent: string): FormulaImportCase => ({
  id, group: 'stress', source, intent, origin: 'constructed-stress',
});

/** All source strings deliberately retain their exact line endings and escapes. */
export const FORMULA_IMPORT_CASES: readonly FormulaImportCase[] = [
  representative('fraction', 'baseline', String.raw`\frac{5}{8}`, 'Baseline fraction; edit numerator and denominator.'),
  representative('radical-scripts', 'baseline', String.raw`\sqrt{x_1^2+y_2^2}+a^{n+1}`, 'Baseline nested radical and scripts.'),
  representative('taylor-4', 'long', expandedTaylor(4), 'Finite four-term expansion; no algebraic simplification.'),
  representative('taylor-16', 'long', expandedTaylor(16), 'Finite sixteen-term expansion with factorial denominators.'),
  representative('taylor-64', 'long', expandedTaylor(64), 'Finite sixty-four-term expansion, over normal graph conversion limits.'),
  representative('gaussian-integral', 'structure', String.raw`\int_{-\infty}^{\infty}e^{-x^2}\,\mathrm{d}x=\sqrt{\pi}`, 'Integral, infinity limits, roman differential, and radical.'),
  representative('sum-product', 'structure', String.raw`\sum_{n=1}^{\infty}\frac{(-1)^{n+1}}{n^2}=\frac{\pi^2}{12},\qquad\prod_{k=1}^{m}(1+a_k)`, 'Summation and product with subexpressions.'),
  representative('matrix', 'structure', String.raw`A=\begin{pmatrix}1&\frac{1}{2}&0\\0&1&\sqrt{2}\\a_1&a_2&a_3\end{pmatrix}`, 'Three by three matrix; preserve each cell and row.'),
  representative('cases', 'structure', String.raw`f(x)=\begin{cases}x^2&x\ge0\\-x&x<0\end{cases}`, 'Piecewise conditions and row separator.'),
  representative('aligned-lf', 'structure', String.raw`\begin{aligned}E&=mc^2\\`+'\n'+String.raw`F&=ma\end{aligned}`, 'Two aligned rows with LF source formatting.'),
  representative('aligned-crlf', 'escaping', String.raw`\begin{aligned}E&=mc^2\\`+'\r\n'+String.raw`F&=ma\end{aligned}`, 'Same aligned source with CRLF; distinguish from literal backslash-n.'),
  representative('align-star', 'structure', String.raw`\begin{align*}x+y&=3\\x-y&=1\end{align*}`, 'Top-level multiline environment; engine support needs independent observation.'),
  representative('nested-environments', 'structure', String.raw`\begin{aligned}A&=\begin{pmatrix}1&2\\3&4\end{pmatrix}\\\det A&=-2\end{aligned}`, 'Environment nesting and row scope.'),
  representative('inline-wrapper', 'wrapper', String.raw`$\frac{5}{8}$`, 'Recognize a complete single inline wrapper explicitly.'),
  representative('display-wrapper', 'wrapper', '$$\n'+String.raw`\frac{5}{8}`+'\n$$', 'Recognize display wrapper and its display intent.'),
  representative('tex-inline-wrapper', 'wrapper', String.raw`\(\frac{5}{8}\)`, 'Recognize TeX inline delimiters without global slash removal.'),
  representative('tex-display-wrapper', 'wrapper', String.raw`\[\frac{5}{8}\]`, 'Recognize TeX display delimiters.'),
  representative('outer-whitespace', 'escaping', ' \t'+String.raw`\frac{ a }{ b }`+'\n ', 'Only outer whitespace may be trimmed; internal source stays exact until visual edits.'),
  representative('escaped-specials', 'escaping', String.raw`\text{Cost: \$5; tax: 5\%}+\{x\mid x>0\}`, 'Literal dollars, percent signs, braces, and text must stay meaningful.'),
  representative('literal-backslash-n', 'escaping', String.raw`x+\n+y`, 'Literal unknown command backslash-n is not a newline.'),
  representative('comment-lf', 'escaping', 'x % retain this comment\n+y', 'Comment must not silently swallow terms or Markdown delimiter.'),
  representative('comment-crlf', 'escaping', 'x % retain this comment\r\n+y', 'CRLF comment has the same preservation requirement.'),
  representative('unknown-macro', 'unknown', String.raw`\customMacro{x}{y}+\frac{1}{2}`, 'Preserve unknown macro and arguments; not complete visual support.'),
  representative('unknown-environment', 'unknown', String.raw`\begin{myMatrix}a&b\\c&d\end{myMatrix}`, 'Preserve unknown environment and distinguish from malformed scope.'),
  representative('missing-brace', 'invalid', String.raw`\frac{1}{2`, 'Reject without replacing the current equation.'),
  representative('unclosed-environment', 'invalid', String.raw`\begin{pmatrix}1&2\\3&4`, 'Reject incomplete environment; original text retrievable.'),
  representative('mismatched-wrapper', 'invalid', String.raw`\[x+1\)`, 'Reject mismatched outer delimiters.'),
  representative('empty', 'invalid', '', 'An empty paste/input must not erase existing content silently.'),
  representative('mixed-text', 'outside-scope', 'The answer is $x+1$ because x is positive.', 'Do not guess that prose plus math is a single formula.'),
  representative('multiple-inline', 'outside-scope', '$x$ and $y$', 'Do not strip outer dollars and merge multiple formulas.'),
  representative('multiple-display', 'outside-scope', '$$x$$\n\n$$y$$', 'Do not merge two display formulas.'),
  representative('template-selection', 'invalid', String.raw`\frac{#0}{2}`, 'MathLive template selection token is not literal formula source.'),
  representative('template-placeholder', 'invalid', String.raw`\sqrt{#?}`, 'MathLive template placeholder token must not be expanded from pasted source.'),
  representative('template-cursor', 'invalid', String.raw`\frac{1}{#@}`, 'MathLive cursor token must not alter selection or formula meaning.'),
  representative('length-8193', 'invalid', 'x'.repeat(8193), 'One character over the provisional import budget; reject before engine parsing.'),
  representative('depth-33', 'invalid', nestedRoot(33), 'One explicit group beyond the provisional depth budget; preserve original.'),
  representative('tex-document', 'outside-scope', String.raw`\documentclass{article}\begin{document}\[x+1\]\end{document}`, 'Full TeX documents are outside this single-formula task.'),
];

/** Moderate, bounded levels only. Browser runner stops escalation after an expensive level. */
export function formulaImportStressCases(): FormulaImportCase[] {
  const result: FormulaImportCase[] = [];
  for (const depth of [8, 16, 24, 32]) {
    result.push(stress(`fraction-depth-${depth}`, nestedFraction(depth), `Constructed continued fraction depth ${depth}.`));
    result.push(stress(`root-depth-${depth}`, nestedRoot(depth), `Constructed radical depth ${depth}.`));
  }
  for (const terms of [64, 128, 256]) {
    const source = expandedTaylor(terms);
    if (source.length <= 8192) result.push(stress(`taylor-terms-${terms}`, source, `Constructed finite expansion with ${terms} terms.`));
  }
  for (const rows of [4, 8, 16, 32]) {
    const source = '\\begin{aligned}' + Array.from({ length: rows }, (_, i) => `y_{${i}}&=x^{${i + 1}}+${i}`).join('\\\\\n') + '\\end{aligned}';
    if (source.length <= 8192) result.push(stress(`aligned-rows-${rows}`, source, `Constructed ${rows} aligned rows.`));
  }
  return result;
}
