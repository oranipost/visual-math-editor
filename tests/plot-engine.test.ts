import assert from 'node:assert/strict';
import test from 'node:test';
import { compileExpression, createPlot, DEFAULT_PLOT_SPEC, PLOT_LIMITS, validatePlotSpec, type PlotSpec } from '../src/plot-engine';

function value(expression: string, x = 0): number {
  const compiled = compileExpression(expression);
  assert.ok(compiled.ok, compiled.ok ? '' : compiled.error);
  return compiled.evaluate(x);
}
function near(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
}
function graph(expression: string, extra: Partial<PlotSpec> = {}) {
  const result = createPlot({ ...DEFAULT_PLOT_SPEC, expression, ...extra });
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result;
}

test('arithmetic obeys unary signs, right associative powers, and parentheses', () => {
  assert.equal(value('-x^2', 3), -9);
  assert.equal(value('(-x)^2', 3), 9);
  assert.equal(value('2^3^2'), 512);
  assert.equal(value('2^-2'), 0.25);
  assert.equal(value('-2^-2'), -0.25);
  assert.equal(value('(-2)^3'), -8);
  assert.ok(Number.isNaN(value('(-2)^0.5')));
  assert.equal(value('1+2*3-8/4'), 5);
  assert.equal(value('8/4/2'), 1);
  assert.equal(value('8/(4/2)'), 4);
  assert.equal(value('--x', 3), 3);
});

test('ordinary expressions support explicit functions and unambiguous adjacent multiplication', () => {
  assert.equal(value('y = 2x + 3(x+1)', 2), 13);
  assert.equal(value('(x+1)(x-1)', 3), 8);
  assert.equal(value('2(x+1)x', 3), 24);
  near(value('2pi'), 2 * Math.PI);
  near(value('π × 2 ÷ 4'), Math.PI / 2);
  near(value('ln(e)'), 1);
  near(value('log(1000)'), 3);
  near(value('exp(2)'), Math.exp(2));
  assert.equal(value('sqrt(9)+abs(-4)'), 7);
  near(value('sin(pi/2)+cos(0)+tan(pi/4)'), 3);
  assert.equal(value('2e3 + .5 - 1.2E-2'), 2000.488);
  assert.equal(value('x − 1', 3), 2);
});

test('the parser rejects code, unsupported names, ambiguous numbers and incomplete input', () => {
  for (const expression of [
    'globalThis.alert(1)', 'constructor.constructor("return1")()', 'x;alert(1)',
    '<script>alert(1)</script>', 'Math.sin(x)', 'sin x', 'sinx', 'z+1', 'x=2',
    'y=x=2', '\\frac{1}{x}', '1..2', '2 3', '1e3.4', '2**3', '(x', 'x)', 'x+',
    '', ' ', 'sqrt()', '2^', 'sin(x,2)', '1e999', 'Infinity', 'NaN', 'x[0]',
  ]) {
    const result = compileExpression(expression);
    assert.equal(result.ok, false, expression);
    if (!result.ok) assert.ok(result.error.length > 0);
  }
});

test('domain gaps and nonfinite input evaluate to NaN without throwing', () => {
  for (const expression of ['1/0', 'sqrt(-1)', 'ln(0)', 'ln(-1)', 'log(-5)', 'exp(1000)', 'x^1000']) {
    assert.ok(Number.isNaN(value(expression, 100)), expression);
  }
  assert.ok(Number.isNaN(value('tan(pi/2)')));
  assert.ok(Number.isNaN(value('x+1', Infinity)));
  assert.ok(Number.isNaN(value('x+1', NaN)));
  const compiled = compileExpression('sqrt(x)');
  assert.ok(compiled.ok);
  assert.ok(Number.isNaN(compiled.evaluate(-1)));
  assert.equal(compiled.evaluate(4), 2);
});

test('explicit reduced rational powers retain the real odd-root branch on negative bases', () => {
  near(value('x^(1/3)', -8), -2);
  near(value('x^(-1/3)', -8), -0.5);
  near(value('x^(2/3)', -8), 4);
  near(value('x^(2/6)', -8), -2);
  near(value('x^(-2/6)', -8), -0.5);
  near(value('x^(2/-6)', -8), -0.5);
  near(value('x^(-2/-6)', -8), -2);
  near(value('x^(-(1/3))', -8), -0.5);
  near(value('x^(+1/+3)', -8), -2);
  near(value('x^(4/6)', -8), 4);
  near(value('x^(0/3)', -8), 1);
  near(value('x^(6/3)', -8), 64);
  assert.ok(Number.isNaN(value('x^(1/2)', -8)));
  assert.ok(Number.isNaN(value('x^(3/6)', -8)));
  assert.ok(Number.isNaN(value('x^(-1/2)', -8)));
  assert.ok(Number.isNaN(value('x^0.3333333333333333', -8)));
  assert.ok(Number.isNaN(value('x^(1/0)', -8)));
  assert.ok(Number.isNaN(value('x^(1/9007199254740992)', -8)));
  assert.ok(Number.isNaN(value('x^(-1/3)', 0)), 'Negative powers retain the pole at zero.');
  assert.equal(value('x^(1/3)', 0), 0);
  near(value('x^(1/3)', 8), 2);
  const root = graph('x^(1/3)');
  assert.ok(root.segments.some((segment) => segment.some((point) => point.x < 0 && point.y < 0)));
  const reciprocalRoot = graph('x^(-1/3)');
  for (const segment of reciprocalRoot.segments) {
    assert.ok(!segment.some((point) => point.x < 0) || !segment.some((point) => point.x > 0));
  }
});

test('parser and range work limits reject input before excessive work', () => {
  assert.equal(compileExpression('x'.repeat(PLOT_LIMITS.expressionLength + 1)).ok, false);
  assert.equal(compileExpression('('.repeat(50) + 'x' + ')'.repeat(50)).ok, false);
  assert.equal(compileExpression('x+'.repeat(150) + 'x').ok, false);
  assert.equal(compileExpression('2^'.repeat(80) + '2').ok, false);
  for (const extra of [
    { xMin: NaN }, { yMax: Infinity }, { xMax: 1e7 }, { yMin: -1e7 },
    { xMin: 2, xMax: 1 }, { yMin: 0, yMax: 0 }, { xMin: 0, xMax: 1e-10 },
    { xMin: 999999, xMax: 999999 + 1e-9 },
  ]) {
    assert.equal(validatePlotSpec({ ...DEFAULT_PLOT_SPEC, ...extra }).ok, false, JSON.stringify(extra));
  }
  assert.equal(validatePlotSpec({ ...DEFAULT_PLOT_SPEC, xMin: 0, xMax: 1e-9 }).ok, true);
});

test('zero and constant functions remain visible; off-window and absent real domains give useful errors', () => {
  for (const expression of ['0', '3', 'x-x']) {
    const result = graph(expression);
    assert.equal(result.segments.length, 1);
    assert.equal(result.segments[0][0].x, -10);
    assert.equal(result.segments[0].at(-1)?.x, 10);
    assert.ok(result.segments[0].every((point) => point.y === (expression === '3' ? 3 : 0)));
    assert.match(result.svg, /<path d="M/);
  }
  for (const expression of ['100', 'sqrt(-1)', '1/0']) {
    const result = createPlot({ ...DEFAULT_PLOT_SPEC, expression });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /No finite curve/);
  }
});

test('sampled curves clip at the viewport and every emitted point is finite and bounded', () => {
  for (const expression of ['x^2', 'sin(x)', 'sqrt(x)', 'ln(x)', 'x^100', '100000x']) {
    const result = graph(expression);
    assert.ok(result.sampleCount <= PLOT_LIMITS.evaluations);
    for (const segment of result.segments) for (const point of segment) {
      assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y), expression);
      assert.ok(point.x >= -10 && point.x <= 10, `${expression}: x=${point.x}`);
      assert.ok(point.y >= -10 && point.y <= 10, `${expression}: y=${point.y}`);
    }
  }
  const steep = graph('100000x');
  near(steep.segments[0][0].x, -0.0001);
  near(steep.segments[0].at(-1)!.x, 0.0001);
});

test('reciprocal and tangent poles do not acquire a fake vertical connecting line', () => {
  for (const pole of [0, 0.1234567, -0.71319, 2.1]) {
    for (const exponent of [1, 2]) {
      const result = graph(`1/(x-(${pole}))^${exponent}`);
      assert.ok(result.segments.length >= 2, `${pole}: ${exponent}`);
      for (const segment of result.segments) {
        assert.ok(!segment.some((point) => point.x < pole) || !segment.some((point) => point.x > pole), `${pole}: ${exponent} bridge`);
      }
    }
  }
  const shift = 0.1234567;
  const result = graph(`tan(x-${shift})`, { xMin: -4, xMax: 4 });
  for (const pole of [-Math.PI / 2 + shift, Math.PI / 2 + shift]) {
    for (const segment of result.segments) {
      assert.ok(!segment.some((point) => point.x < pole) || !segment.some((point) => point.x > pole), `${pole} tangent bridge`);
    }
  }
});

test('domain guards retain pole gaps even when wide y ranges hide numerical curvature', () => {
  const offset = 0.1234567;
  for (const expression of [
    `1/(x-${offset})`, `1/(x-${offset})^2`, `(x-${offset})^-2`,
    `1/abs(x-${offset})`, `1/sqrt((x-${offset})^2)`,
  ]) {
    const result = graph(expression, { yMin: -1e6, yMax: 1e6 });
    assert.ok(result.segments.length >= 2, expression);
    for (const segment of result.segments) {
      assert.ok(!segment.some((point) => point.x < offset) || !segment.some((point) => point.x > offset), expression);
    }
  }
  const tangent = graph(`tan(x-${offset})`, { xMin: -4, xMax: 4, yMin: -1e6, yMax: 1e6 });
  for (const pole of [-Math.PI / 2 + offset, Math.PI / 2 + offset]) {
    for (const segment of tangent.segments) {
      assert.ok(!segment.some((point) => point.x < pole) || !segment.some((point) => point.x > pole));
    }
  }
  const expandedPole = 0.01953125;
  const expanded = graph(`1/(x*x-${2 * expandedPole}*x+${expandedPole * expandedPole})`, { yMin: -1e6, yMax: 1e6 });
  for (const segment of expanded.segments) {
    assert.ok(!segment.some((point) => point.x < expandedPole) || !segment.some((point) => point.x > expandedPole));
  }
  const finitePeak = graph(`1/((x-${offset})^2+0.00001)`, { yMin: -1e6, yMax: 1e6 });
  assert.equal(finitePeak.segments.length, 1, 'A finite narrow peak must remain connected.');
});

test('arithmetic work bound includes repeated nested domain guards', () => {
  let expression = 'sin(50*x)';
  for (let index = 0; index < 14; index++) expression = `1/(${expression})`;
  const compiled = compileExpression(expression);
  assert.ok(compiled.ok);
  assert.ok(compiled.evaluationCost > 1000);
  const result = createPlot({ ...DEFAULT_PLOT_SPEC, expression });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /too complex to sample/);
});

test('partial real domains split cleanly without adding points in the missing domain', () => {
  const root = graph('sqrt(x)');
  assert.ok(root.segments.every((segment) => segment.every((point) => point.x >= 0)));
  const logarithm = graph('ln(x)');
  assert.ok(logarithm.segments.every((segment) => segment.every((point) => point.x > 0)));
  const holes = graph('sqrt(x^2-1)');
  for (const segment of holes.segments) {
    assert.ok(segment.every((point) => Math.abs(point.x) >= 1));
    assert.ok(segment.every((point) => point.x <= -1) || segment.every((point) => point.x >= 1));
  }
});

test('generated SVG is standalone, accessible, finite and contains no executable user content', () => {
  const result = graph('y=sin(x)+x/2');
  assert.match(result.svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(result.svg, /viewBox="0 0 800 480"/);
  assert.match(result.svg, /max-width:100%/);
  assert.match(result.svg, /<title>Equation graph: y = sin\(x\)\+x\/2<\/title>/);
  assert.match(result.svg, /≈ · rad/);
  assert.match(result.svg, /Approximate numerical graph/);
  assert.match(result.svg, /radians/);
  assert.doesNotMatch(result.svg, /(?:NaN|Infinity|<script|onload=|href=|foreignObject)/);
  assert.equal(createPlot({ ...DEFAULT_PLOT_SPEC, expression: 'x"><svg onload="alert(1)">' }).ok, false);
  assert.deepEqual(result.spec, { ...DEFAULT_PLOT_SPEC, expression: 'sin(x)+x/2' });
});

test('uppercase axis names have separate space and long tick labels remain bounded and separated', () => {
  for (const result of [
    graph('x^2'),
    graph('999999.000004', { xMin: 999999, xMax: 999999.000008, yMin: 999999, yMax: 999999.000008 }),
    graph('-999999.000004', { xMin: -999999.000008, xMax: -999999, yMin: -999999.000008, yMax: -999999 }),
    graph('x-1000000', { xMin: 999999.9999, xMax: 1000000, yMin: -0.0001, yMax: 0 }),
  ]) {
    const frame = /data-plot-frame="true" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/.exec(result.svg)!;
    const xAxis = /data-axis-label="X" x="([\d.]+)" y="([\d.]+)"[^>]*>X<\/text>/.exec(result.svg)!;
    const yAxis = /data-axis-label="Y" x="([\d.]+)" y="([\d.]+)"[^>]*>Y<\/text>/.exec(result.svg)!;
    assert.ok(frame && xAxis && yAxis);
    assert.ok(Number(xAxis[1]) - Number(frame[1]) - Number(frame[3]) >= 45, 'X is outside the final grid/tick position.');
    assert.ok(Number(frame[2]) - Number(yAxis[2]) >= 25, 'Y sits above the highest numeric tick.');
    assert.match(result.svg, /font-size="22" font-weight="700"/);
    assert.match(result.svg, /font-size="16"/);
    let previousRight = -Infinity;
    let labelCount = 0;
    for (const tick of result.svg.matchAll(/data-axis-tick="X" x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]+)<\/text>/g)) {
      const halfWidth = tick[3].length * 9.7 / 2;
      const left = Number(tick[1]) - halfWidth, right = Number(tick[1]) + halfWidth;
      assert.ok(left >= 13.99 && right <= Number(xAxis[1]) - 27.99);
      assert.ok(left >= previousRight + 15.99, 'X tick labels do not overlap.');
      previousRight = right;
      labelCount++;
    }
    assert.ok(labelCount >= 2);
    for (const tick of result.svg.matchAll(/data-axis-tick="Y" x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]+)<\/text>/g)) {
      assert.ok(Number(tick[1]) - tick[3].length * 9.7 >= 13.99, 'Y tick labels fit inside the left margin.');
      assert.ok(Number(tick[2]) > Number(yAxis[2]) + 25);
    }
    assert.match(result.svg, /horizontal axis X, vertical axis Y/);
  }
});
