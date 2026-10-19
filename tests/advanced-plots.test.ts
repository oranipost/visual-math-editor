import assert from 'node:assert/strict';
import test from 'node:test';
import { compileExpression, DEFAULT_PLOT_SPEC, PLOT_LIMITS, type PlotSpec } from '../src/plot-engine';
import { createCalculusPlot, createPolarPlot, validateCalculusSpec, validatePolarSpec } from '../src/advanced-plots';

const spec = (extra: Partial<PlotSpec> = {}): PlotSpec => ({ ...DEFAULT_PLOT_SPEC, ...extra });
function near(actual: number, expected: number, tolerance = 1e-6): void {
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
}

test('safe compiler declares variables explicitly and adds real trig functions without code execution', () => {
  const surface = compileExpression('z = sin(x) + cos(y) + x*y', ['x', 'y']);
  assert.ok(surface.ok);
  near(surface.evaluate(Math.PI / 2, 2), 1 + Math.cos(2) + Math.PI);
  assert.ok(Number.isNaN(surface.evaluate(1, Infinity)));
  const polar = compileExpression('r=2*cos(θ)+sin(π/2)', ['theta']);
  assert.ok(polar.ok);
  near(polar.evaluate(0), 3);
  for (const expression of ['y+1', 'theta', 'θ', 'z', 'process.exit(1)', 'sin.constructor(x)']) assert.equal(compileExpression(expression).ok, false);
  assert.equal(compileExpression('x', []).ok, false);
  assert.equal(compileExpression('theta+x', ['x', 'theta']).ok, false);
  for (const [expression, expected] of [
    ['asin(1)', Math.PI / 2], ['arccos(0)', Math.PI / 2], ['atan(1)', Math.PI / 4],
    ['sinh(1)', Math.sinh(1)], ['cosh(1)', Math.cosh(1)], ['tanh(1)', Math.tanh(1)],
    ['asinh(1)', Math.asinh(1)], ['acosh(2)', Math.acosh(2)], ['atanh(0.5)', Math.atanh(0.5)],
    ['sec(0)', 1], ['csc(pi/2)', 1], ['cot(pi/4)', 1],
  ] as const) {
    const compiled = compileExpression(expression);
    assert.ok(compiled.ok, expression);
    near(compiled.evaluate(0), expected);
  }
  for (const expression of ['asin(2)', 'acosh(0)', 'atanh(1)', 'sec(pi/2)', 'csc(0)', 'cot(0)']) {
    const compiled = compileExpression(expression);
    assert.ok(compiled.ok);
    assert.ok(Number.isNaN(compiled.evaluate(0)), expression);
  }
});

test('two-variable guards follow diagonal edges across a denominator or trig pole', () => {
  for (const expression of ['1/(x-y)', '1/(x-y)^2', 'tan(x+y)', 'sec(x+y)', 'csc(x-y)', 'cot(x-y)']) {
    const compiled = compileExpression(expression, ['x', 'y']);
    assert.ok(compiled.ok);
    assert.equal(compiled.crossesDomainBoundary(0, Math.PI, 1, -1), true, expression);
  }
});

test('polar circles, roses and signed radii render with equal spatial scales and bounded points', () => {
  for (const expression of ['2', '3*cos(2*theta)', '-2', 'r=1+sin(θ)']) {
    const result = createPolarPlot(spec({ mode: 'polar', expression, xMin: -4, xMax: 4, yMin: -3, yMax: 3 }));
    assert.ok(result.ok, result.ok ? '' : result.error);
    assert.equal(result.spec.thetaMin, 0);
    near(result.spec.thetaMax!, 2 * Math.PI);
    assert.ok(result.sampleCount <= PLOT_LIMITS.evaluations);
    assert.match(result.svg, /data-vme-plot="polar"/);
    assert.match(result.svg, /<circle /);
    assert.match(result.svg, /equal scale/);
    assert.doesNotMatch(result.svg, /NaN|Infinity|<script/);
    const frame = /data-plot-frame="true" x="[\d.]+" y="[\d.]+" width="([\d.]+)" height="([\d.]+)"/.exec(result.svg)!;
    near(Number(frame[1]) / Number(frame[2]), 8 / 6, 1e-4);
    for (const segment of result.segments) for (const point of segment) {
      assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
      assert.ok(point.x >= -4 && point.x <= 4 && point.y >= -3 && point.y <= 3);
      if (expression === '2' || expression === '-2') near(Math.hypot(point.x, point.y), 2);
    }
  }
});

test('polar ranges reject invalid and excessive inputs; absent real domains give errors', () => {
  for (const patch of [{ thetaMin: 2, thetaMax: 1 }, { thetaMin: NaN }, { thetaMax: Infinity }, { thetaMax: 1000 }, { thetaMin: 0, thetaMax: 1e-12 }, { calculus: 'derivative' as const }]) {
    assert.equal(validatePolarSpec(spec({ mode: 'polar', expression: '1', ...patch })).ok, false, JSON.stringify(patch));
  }
  for (const expression of ['x', 'sqrt(-1)', '1/0', '<script>']) assert.equal(createPolarPlot(spec({ mode: 'polar', expression })).ok, false, expression);
});

test('polar poles and missing domains do not acquire straight joins', () => {
  const pole = 0.1234567;
  const result = createPolarPlot(spec({ mode: 'polar', expression: `1/(theta-${pole})`, thetaMin: -0.5, thetaMax: 0.8 }));
  assert.ok(result.ok, result.ok ? '' : result.error);
  assert.ok(result.segments.length >= 2);
  // Near this angle the positive and negative branches lie in opposite half planes.
  for (const segment of result.segments) assert.ok(segment.every(p => p.x > 0) || segment.every(p => p.x < 0));
  const roots = createPolarPlot(spec({ mode: 'polar', expression: 'sqrt(theta)', thetaMin: -1, thetaMax: 1 }));
  assert.ok(roots.ok, roots.ok ? '' : roots.error);
  for (const segment of roots.segments) assert.ok(segment.every(p => p.y >= 0));
});

test('finite difference derivatives recover polynomial and trigonometric curves', () => {
  for (const [expression, calculus, expected] of [
    ['x^2', 'derivative', (x: number) => 2 * x],
    ['x^3', 'second-derivative', (x: number) => 6 * x],
    ['sin(x)', 'derivative', Math.cos],
    ['sin(x)', 'second-derivative', (x: number) => -Math.sin(x)],
  ] as const) {
    const result = createCalculusPlot(spec({ expression, calculus, xMin: -2, xMax: 2, yMin: -15, yMax: 15 }));
    assert.ok(result.ok, result.ok ? '' : result.error);
    assert.match(result.svg, /finite differences/);
    for (const segment of result.segments) for (const point of segment) near(point.y, expected(point.x), 2e-4);
  }
});

test('derivative plots omit cusps and poles rather than drawing across them', () => {
  const cusp = createCalculusPlot(spec({ expression: 'abs(x)', calculus: 'derivative', xMin: -2, xMax: 2 }));
  assert.ok(cusp.ok, cusp.ok ? '' : cusp.error);
  assert.ok(cusp.segments.length >= 2);
  for (const segment of cusp.segments) {
    assert.ok(segment.every(p => p.x < 0) || segment.every(p => p.x > 0));
    for (const point of segment) near(point.y, Math.sign(point.x), 1e-4);
  }
  const pole = createCalculusPlot(spec({ expression: '1/(x-0.12345)', calculus: 'derivative' }));
  assert.ok(pole.ok, pole.ok ? '' : pole.error);
  for (const segment of pole.segments) assert.ok(segment.every(p => p.x < 0.12345) || segment.every(p => p.x > 0.12345));
});

test('definite integrals compute signed values and shade the selected interval', () => {
  for (const [expression, minimum, maximum, expected] of [
    ['x^2', 0, 1, 1 / 3], ['sin(x)', 0, Math.PI, 2], ['-x', 0, 2, -2], ['x', -1, 1, 0], ['sqrt(x)', 0, 1, 2 / 3],
  ] as const) {
    const result = createCalculusPlot(spec({ expression, calculus: 'integral', integralMin: minimum, integralMax: maximum }));
    assert.ok(result.ok, result.ok ? '' : result.error);
    near(result.integralValue!, expected, 1e-6);
    assert.ok(Number.isFinite(result.integralError));
    assert.match(result.svg, /data-integral-shading="true" fill="#93c5fd"[^>]*><path d="M/);
    assert.match(result.svg, /numerical estimate/);
  }
});

test('quadrature cross-check prevents uniform-node oscillation aliasing from claiming a wrong integral', () => {
  const result = createCalculusPlot(spec({ expression: 'cos(1024*pi*x)', calculus: 'integral', integralMin: 0, integralMax: 1 }));
  if (result.ok) near(result.integralValue!, 0, 1e-5);
  else assert.match(result.error, /work limit|too complex/);
});

test('improper, unresolved or invalid calculus requests fail explicitly', () => {
  for (const expression of ['1/x', '1/(x-0.1234567)', '1/(x-0.1234567)^2', 'tan(x)', 'sqrt(-1)']) {
    const result = createCalculusPlot(spec({ expression, calculus: 'integral', integralMin: -2, integralMax: 2 }));
    assert.equal(result.ok, false, expression);
    if (!result.ok) assert.match(result.error, /undefined|improper|finite|converge/);
  }
  for (const patch of [{ integralMin: 2, integralMax: 1 }, { integralMin: NaN }, { integralMax: Infinity }]) {
    assert.equal(validateCalculusSpec(spec({ calculus: 'integral', ...patch })).ok, false);
  }
  assert.equal(validateCalculusSpec(spec({ mode: 'polar', calculus: 'derivative' })).ok, false);
});
