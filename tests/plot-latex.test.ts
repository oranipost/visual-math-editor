import assert from 'node:assert/strict';
import test from 'node:test';
import { compileExpression } from '../src/plot-engine';
import {
  expressionFromLatex,
  graphFromLatex,
  latexFromPlotExpression,
  tryLatexFromPlotExpression,
} from '../src/plot-latex';

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
  assert.equal(at('|x|', -4), 4);
  assert.equal(at(String.raw`\left|x-1\right|`, -2), 3);
});

test('unfamiliar macros and structured or multivariable notation are never silently dropped', () => {
  for (const latex of [
    String.raw`\unknown{x}`, String.raw`\mathrm{x}`, String.raw`\text{x}`, String.raw`\operatorname{sin}(x)`,
    String.raw`\sum_{i=1}^{n}x`, String.raw`\int x\,dx`, String.raw`\ce{H2O}`, String.raw`\pu{1m}`,
    String.raw`\newcommand{\x}{1}`, String.raw`\begin{matrix}x\end{matrix}`,
    String.raw`x_1`, String.raw`a_{n}`, String.raw`\sqrt[0]{x}`, 'x[0]', '|x', 'x<1', 'x&y', 'x%2', 'x+y',
  ]) assert.throws(() => expressionFromLatex(latex), latex);
});

test('Desmos-style 2D LaTeX supports log_b, odd/nth roots, MathLive operatorname/exponentialE, and unparenthesized unary trig/log', () => {
  // Base-b logarithms (parenthesized & unparenthesized, braced & single-token)
  assert.ok(Math.abs(at(String.raw`\log_{2}(x)`, 8) - 3) < 1e-12);
  assert.ok(Math.abs(at(String.raw`\log_2(x)`, 8) - 3) < 1e-12);
  assert.ok(Math.abs(at(String.raw`\log_{10}\left(x+1\right)`, 99) - 2) < 1e-12);
  assert.ok(Math.abs(at(String.raw`\log_{2} x`, 16) - 4) < 1e-12);
  assert.ok(Math.abs(at(String.raw`\log_{e}(x)`, Math.E ** 3) - 3) < 1e-12);
  assert.ok(Number.isNaN(at(String.raw`\log_{0}(x)`, 4)), 'base-0 log must evaluate to NaN, never 0');
  assert.ok(Number.isNaN(at(String.raw`\log_{1}(x)`, 4)), 'base-1 log must evaluate to NaN');

  // Cube / odd / even nth roots (\sqrt[n]{x})
  assert.equal(at(String.raw`\sqrt[3]{x}`, -8), -2);
  assert.equal(at(String.raw`\sqrt[3]{x}`, 0), 0);
  assert.equal(at(String.raw`\sqrt[3]{x}`, 8), 2);
  assert.equal(at(String.raw`\sqrt[3]{x}^2`, -8), 4);
  assert.equal(at(String.raw`\sqrt[5]{x-1}`, -31), -2);
  assert.equal(at(String.raw`\sqrt[4]{x}`, 16), 2);
  assert.ok(Number.isNaN(at(String.raw`\sqrt[4]{x}`, -16)));

  // MathLive inline shortcuts: \operatorname{arsinh|arcosh|artanh}, \exponentialE, \mathrm{e}, \differentialD
  assert.ok(Math.abs(at(String.raw`\operatorname{arsinh}\left(x\right)`, 1.5) - Math.asinh(1.5)) < 1e-12);
  assert.ok(Math.abs(at(String.raw`\operatorname{arcosh}(x)`, 2) - Math.acosh(2)) < 1e-12);
  assert.ok(Math.abs(at(String.raw`\operatorname{artanh}(x)`, 0.5) - Math.atanh(0.5)) < 1e-12);
  assert.ok(Math.abs(at(String.raw`\exponentialE^{-x^2}`, 0.5) - Math.exp(-0.25)) < 1e-12);
  assert.ok(Math.abs(at(String.raw`2\exponentialE^{x}`, 1) - 2 * Math.E) < 1e-12);
  assert.ok(Math.abs(at(String.raw`\mathrm{e}^{x}`, 1) - Math.E) < 1e-12);
  // \differentialD is parsed rather than blocked by ALLOWED_LATEX_COMMANDS (and rejected cleanly as unknown variable d)
  assert.throws(() => expressionFromLatex(String.raw`x + \differentialD`), /Unknown name/);

  // Unparenthesized unary trig/log & trig powers
  assert.ok(Math.abs(at(String.raw`\sin x`, Math.PI / 2) - 1) < 1e-12);
  assert.ok(Math.abs(at(String.raw`\sin x + 1`, 0) - 1) < 1e-12);
  assert.ok(Math.abs(at(String.raw`\cos 2x`, Math.PI / 2) - -1) < 1e-12);
  assert.ok(Math.abs(at(String.raw`\sin \pi x`, 0.5) - 1) < 1e-12);
  assert.ok(Math.abs(at(String.raw`\sin^2 x + \cos^2 x`, 1.234) - 1) < 1e-12);
  assert.ok(Math.abs(at(String.raw`\sin^{2}\left(x\right)`, Math.PI / 4) - 0.5) < 1e-12);
  assert.ok(Math.abs(at(String.raw`\ln x`, Math.E ** 2) - 2) < 1e-12);
  assert.ok(Math.abs(at(String.raw`\ln |x|`, -Math.E) - 1) < 1e-12);
  assert.ok(Math.abs(at(String.raw`\sin x \cos x`, Math.PI / 4) - 0.5) < 1e-12);
  assert.ok(Math.abs(at(String.raw`\frac{\sin x}{x}`, 0.5) - Math.sin(0.5) / 0.5) < 1e-12);
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

test('latexFromPlotExpression and graphFromLatex round-trip 2D structures, presets, and all 20 plot functions', () => {
  const functionCases: ReadonlyArray<[string, string, number]> = [
    ['(x^2-1)/10', '\\frac{x^{2}-1}{10}', 3],
    ['-(x+1)/2', '-\\frac{x+1}{2}', 5],
    ['sqrt(x+4)', '\\sqrt{x+4}', 5],
    ['abs(x-3)', '\\left|x-3\\right|', -2],
    ['exp(-x^2)', '\\exp\\left(-x^{2}\\right)', 0.5],
    ['e^(-x^2)', 'e^{-x^{2}}', 0.5],
    ['sec(x)', '\\sec\\left(x\\right)', 0.4],
    ['csc(x)', '\\csc\\left(x\\right)', 0.4],
    ['cot(x)', '\\cot\\left(x\\right)', 0.4],
    ['arcsin(x)', '\\arcsin\\left(x\\right)', 0.5],
    ['asin(x)', '\\arcsin\\left(x\\right)', 0.5],
    ['arccos(x)', '\\arccos\\left(x\\right)', 0.5],
    ['acos(x)', '\\arccos\\left(x\\right)', 0.5],
    ['arctan(x)', '\\arctan\\left(x\\right)', 0.5],
    ['atan(x)', '\\arctan\\left(x\\right)', 0.5],
    ['sinh(x)', '\\sinh\\left(x\\right)', 0.7],
    ['cosh(x)', '\\cosh\\left(x\\right)', 0.7],
    ['tanh(x)', '\\tanh\\left(x\\right)', 0.7],
    ['arsinh(x)', '\\arsinh\\left(x\\right)', 0.7],
    ['asinh(x)', '\\arsinh\\left(x\\right)', 0.7],
    ['arcosh(x)', '\\arcosh\\left(x\\right)', 1.7],
    ['acosh(x)', '\\arcosh\\left(x\\right)', 1.7],
    ['artanh(x)', '\\artanh\\left(x\\right)', 0.4],
    ['atanh(x)', '\\artanh\\left(x\\right)', 0.4],
  ];

  for (const [expr, expectedLatex, sampleX] of functionCases) {
    const latex = latexFromPlotExpression(expr, 'function');
    assert.equal(latex, expectedLatex, expr);
    const roundTripped = graphFromLatex(latex, 'function');
    assert.equal(roundTripped.mode, 'function');
    const orig = compileExpression(expr);
    const back = compileExpression(roundTripped.expression);
    assert.ok(orig.ok && back.ok, expr);
    assert.ok(Math.abs(orig.evaluate(sampleX) - back.evaluate(sampleX)) < 1e-12, expr);
  }

  // Polar presets & defaultMode preservation (e.g. constant `2` in polar mode stays polar)
  assert.equal(latexFromPlotExpression('theta/3', 'polar'), '\\frac{\\theta}{3}');
  assert.deepEqual(graphFromLatex('\\frac{\\theta}{3}', 'polar'), { mode: 'polar', expression: 'theta/3' });
  assert.equal(latexFromPlotExpression('2*sin(3*theta)', 'polar'), '2\\sin\\left(3\\theta\\right)');
  assert.deepEqual(graphFromLatex('2', 'polar'), { mode: 'polar', expression: '2' });

  // Surface presets & multivariable juxtaposition safety
  const saddleLatex = latexFromPlotExpression('(x^2-y^2)/10', 'surface');
  assert.equal(saddleLatex, '\\frac{x^{2}-y^{2}}{10}');
  assert.deepEqual(graphFromLatex(saddleLatex, 'surface'), { mode: 'surface', expression: '(x^2-y^2)/10' });

  const fracTimesY = graphFromLatex('\\frac{1}{x}y', 'surface');
  const compiledFracTimesY = compileExpression(fracTimesY.expression, ['x', 'y']);
  assert.ok(compiledFracTimesY.ok);
  assert.equal(compiledFracTimesY.evaluate(2, 6), 3); // (1/2)*6 = 3, never 1/(2*6)

  assert.equal(at('2\\frac{3}{4}', 10), 1.5);
  assert.equal(tryLatexFromPlotExpression('x+', 'function'), undefined);
  assert.equal(tryLatexFromPlotExpression('unknown(x)', 'function'), undefined);
});
