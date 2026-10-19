import assert from 'node:assert/strict';
import test from 'node:test';
import { compileExpression } from '../src/plot-engine';
import { expressionFromLatex } from '../src/plot-latex';

function at(latex: string, x: number): number {
  const compiled = compileExpression(expressionFromLatex(latex));
  if (!compiled.ok) assert.fail(compiled.error);
  return compiled.evaluate(x);
}

test('supported LaTeX powers, fractions, roots and trig preserve their mathematical value', () => {
  assert.equal(at('x^2', 3), 9);
  assert.equal(at(String.raw`\frac{1}{x}`, 4), 0.25);
  assert.equal(at(String.raw`\dfrac{x+1}{2}`, 5), 3);
  assert.equal(at(String.raw`\tfrac{1}{2}x`, 6), 3);
  assert.equal(at(String.raw`\sqrt{x}`, 9), 3);
  assert.equal(at(String.raw`y=\sin(x)`, Math.PI / 2), 1);
  assert.equal(at(String.raw`\cos\left(x\right)`, 0), 1);
  assert.equal(at(String.raw`\left(x+1\right)^2`, 2), 9);
  assert.equal(at(String.raw`2\cdot x + \frac{1}{2}`, 3), 6.5);
  assert.equal(at(String.raw`x +\, 1`, 2), 3);
  assert.ok(Math.abs(at(String.raw`\sin(\pi x)`, 0.5) - 1) < 1e-14);
  assert.equal(at(String.raw`\ln(x)`, Math.E), 1);
  assert.equal(at(String.raw`\log(x)`, 100), 2);
  assert.equal(at(String.raw`\exp(x)`, 0), 1);
});

test('unfamiliar macros and structured or multivariable notation are never silently dropped', () => {
  for (const latex of [
    String.raw`\unknown{x}`, String.raw`\mathrm{x}`, String.raw`\text{x}`, String.raw`\operatorname{sin}(x)`,
    String.raw`\sum_{i=1}^{n}x`, String.raw`\int x\,dx`, String.raw`\ce{H2O}`, String.raw`\pu{1m}`,
    String.raw`\newcommand{\x}{1}`, String.raw`\begin{matrix}x\end{matrix}`,
    String.raw`x_1`, String.raw`\log_{2}(x)`, String.raw`\sqrt[3]{x}`, '|x|', 'x<1', 'x&y', 'x%2', 'x+y',
  ]) assert.throws(() => expressionFromLatex(latex), latex);
});

test('partial formula structures cannot turn into a different drawable expression', () => {
  for (const latex of [
    '', '   ', 'x^', 'x^{', 'x^{}', String.raw`\frac{}{x}`, String.raw`\frac{1}{}`,
    String.raw`\frac{1}{x}^`, String.raw`\sqrt{}`, String.raw`\left(x`, 'x+', 'x'.repeat(1025),
  ]) assert.throws(() => expressionFromLatex(latex), latex);
});

test('equation-linked graphs accept explicit functions and constants without solving other equations', () => {
  assert.equal(expressionFromLatex('y=x^2'), 'x^2');
  assert.equal(expressionFromLatex('y=3'), '3');
  assert.equal(at('3', 25), 3);
  assert.equal(at(String.raw`y=\frac{x+1}{2}`, 7), 4);
  for (const latex of ['x=2', 'y^2=x', 'x^2+y^2=1', 'y=x=2', 'y=y+1', 'y=x+z', 'f(x)=x^2']) {
    assert.throws(() => expressionFromLatex(latex), latex);
  }
});
