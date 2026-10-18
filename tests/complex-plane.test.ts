import assert from 'node:assert/strict';
import test from 'node:test';
import {
  complexPlotFrame, COMPLEX_LIMITS, createComplexPlot, DEFAULT_COMPLEX_SPEC,
  fitComplexPoints, formatComplex, parseComplexNumbers, validateComplexSpec,
  type ComplexPlaneSpec,
} from '../src/complex-plane';

function parse(input: string) {
  const result = parseComplexNumbers(input);
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result;
}
function graph(expression: string, bounds: Partial<ComplexPlaneSpec> = {}) {
  const result = createComplexPlot({ ...DEFAULT_COMPLEX_SPEC, expression, ...bounds });
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result;
}
function near(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
}

test('complex literals support real, pure imaginary, signs, decimals, and scientific notation', () => {
  for (const [input, expected] of [
    ['3+2i', [3, 2]], ['3 - 2i', [3, -2]], ['-3+i', [-3, 1]], ['+3-i', [3, -1]],
    ['i', [0, 1]], ['-i', [0, -1]], ['+ i', [0, 1]], ['2 i', [0, 2]],
    ['- .25 i', [0, -.25]], ['−3 − 2i', [-3, -2]], ['.5+.25i', [.5, .25]],
    ['1e-3+2E+2i', [.001, 200]], ['-1e+3-2e-2i', [-1000, -.02]],
    ['3.', [3, 0]], ['0', [0, 0]], ['-0-0i', [0, 0]], ['1e6-1e6i', [1e6, -1e6]],
  ] as const) {
    const result = parse(input);
    assert.deepEqual([result.points[0].re, result.points[0].im], expected, input);
  }
});

test('complex input is parsed atomically with original nonempty lines and stable point labels', () => {
  const result = parse(' 3+2i \r\n\n -i\r4\n');
  assert.equal(result.expression, '3+2i\n-i\n4');
  assert.deepEqual(result.points.map(({ label, source }) => [label, source]), [['z1', '3+2i'], ['z2', '-i'], ['z3', '4']]);
  const failed = parseComplexNumbers('3+2i\n\n2+garbagei\n4');
  assert.equal(failed.ok, false);
  if (!failed.ok) assert.match(failed.error, /^Line 3:/);
  assert.ok(!('points' in failed), 'An invalid line must never produce a partial plotted result.');
});

test('strict complex parsing rejects expressions, labels, malformed exponents, and joined tokens', () => {
  for (const input of [
    '', ' ', '3++2i', '3+-2i', '--i', '3-+i', '3+2', '3+i+2i', '2i+3',
    '(3+2i)', 'z=3+2i', 'z1:3+2i', 'sqrt(4)+i', '3*2i', '2j', 'I', 'NaN',
    'Infinity', '1e', '1e-i', '1e+-2i', '1e--2+3i', '1 2+3i', '1 e2+i',
    '1. 2i', '0x20+i', '<svg onload="alert(1)">', 'globalThis.alert(1)', '1/2+i',
  ]) assert.equal(parseComplexNumbers(input).ok, false, input);
});

test('complex parser bounds input work and rejects unrepresentable or out-of-range values', () => {
  assert.equal(parseComplexNumbers('i'.repeat(COMPLEX_LIMITS.expressionLength + 1)).ok, false);
  assert.equal(parseComplexNumbers(Array(COMPLEX_LIMITS.points + 1).fill('i').join('\n')).ok, false);
  assert.equal(parseComplexNumbers(Array(COMPLEX_LIMITS.points).fill('i').join('\n')).ok, true);
  for (const input of ['1000001', '-1000001i', '1e999+2i', '1e-999', '1e-999i']) {
    assert.equal(parseComplexNumbers(input).ok, false, input);
  }
  assert.equal(parseComplexNumbers('0e-999+0i').ok, true);
});

test('complex formatting distinguishes signs, omits unit coefficients, and normalizes signed zero', () => {
  for (const [point, expected] of [
    [{ re: 3, im: 2 }, '3 + 2i'], [{ re: -3, im: -1 }, '-3 - i'],
    [{ re: 0, im: 1 }, 'i'], [{ re: 0, im: -2 }, '-2i'],
    [{ re: -0, im: -0 }, '0'], [{ re: 2, im: -0 }, '2'],
  ] as const) assert.equal(formatComplex(point), expected);
});

test('complex ranges enforce finite bounds, ordering, minimum span, and numeric resolution', () => {
  for (const extra of [
    { xMin: NaN }, { yMax: Infinity }, { xMax: 1e7 }, { yMin: -1e7 },
    { xMin: 2, xMax: 1 }, { yMin: 0, yMax: 0 }, { xMin: 0, xMax: 1e-10 },
    { xMin: 999999, xMax: 999999 + 1e-9 },
  ]) assert.equal(validateComplexSpec({ ...DEFAULT_COMPLEX_SPEC, ...extra }).ok, false, JSON.stringify(extra));
  assert.equal(validateComplexSpec({ ...DEFAULT_COMPLEX_SPEC, xMin: 0, xMax: 1e-9 }).ok, true);
  assert.equal(validateComplexSpec({ ...DEFAULT_COMPLEX_SPEC, mode: 'function' } as unknown as ComplexPlaneSpec).ok, false);
  assert.equal(validateComplexSpec(null as unknown as ComplexPlaneSpec).ok, false);
});

test('complex graph uses Re and Im, larger separated axis names, safe literals, and visible point values', () => {
  const result = graph('3+2i\n-2-i');
  assert.equal(result.visibleCount, 2);
  assert.match(result.svg, /data-axis-label="Re"[^>]*>Re<\/text>/);
  assert.match(result.svg, /data-axis-label="Im"[^>]*>Im<\/text>/);
  assert.match(result.svg, /font-size="22" font-weight="700"/);
  assert.match(result.svg, /<g font-size="16">/);
  assert.match(result.svg, /data-complex-point="z1"/);
  assert.match(result.svg, /z1 = 3 \+ 2i/);
  assert.match(result.svg, /data-plot-frame="true"/);
  assert.match(result.svg, /Equal unit lengths/);
  assert.ok(!/(?:NaN|Infinity|<script|onload=|foreignObject|href=)/.test(result.svg));
  assert.equal(createComplexPlot({ ...DEFAULT_COMPLEX_SPEC, expression: '3+2i\n<script>' }).ok, false);
});

test('complex plot preserves equal horizontal and vertical units for square and rectangular numeric ranges', () => {
  for (const bounds of [
    { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
    { xMin: -20, xMax: 20, yMin: -2, yMax: 4 },
    { xMin: -1, xMax: 1, yMin: -200, yMax: 400 },
  ]) {
    const result = graph('0\n1+i', bounds), frame = complexPlotFrame(result.spec);
    near(frame.width / (bounds.xMax - bounds.xMin), frame.height / (bounds.yMax - bounds.yMin));
    const circles = [...result.svg.matchAll(/data-complex-point="z\d+" cx="([\d.e+-]+)" cy="([\d.e+-]+)"/g)];
    assert.equal(circles.length, 2);
    near(Number(circles[1][1]) - Number(circles[0][1]), Number(circles[0][2]) - Number(circles[1][2]));
    assert.ok(frame.left >= 110 && frame.top >= 64);
    assert.ok(frame.left + frame.width <= 724 + 1e-10 && frame.top + frame.height <= 390 + 1e-10);
  }
});

test('out-of-view complex numbers retain input and count while the saved graph remains valid', () => {
  const result = graph('3+2i\n99i', { xMin: -1, xMax: 1, yMin: -1, yMax: 1 });
  assert.equal(result.visibleCount, 0);
  assert.equal(result.points.length, 2);
  assert.ok(!/data-complex-point=/.test(result.svg));
  assert.match(result.svg, /0\/2 points/);
  assert.match(result.svg, /z2 = 99i/);
  assert.match(result.svg, /data-axis="Re"/);
  assert.match(result.svg, /data-axis="Im"/);
});

test('fit includes the origin and all points, keeps square ranges, and safely handles zero and limits', () => {
  for (const input of ['0', '3+2i\n-2-i', '1e6-1e6i', '-1e6+1e6i\n1e6-1e6i', '.00001i']) {
    const parsed = parse(input), fit = fitComplexPoints(parsed.points);
    assert.ok(fit.xMin <= 0 && fit.xMax >= 0 && fit.yMin <= 0 && fit.yMax >= 0);
    near(fit.xMax - fit.xMin, fit.yMax - fit.yMin);
    assert.ok(fit.xMax > fit.xMin && fit.yMax > fit.yMin);
    assert.ok(Math.min(fit.xMin, fit.yMin) >= -1e6 && Math.max(fit.xMax, fit.yMax) <= 1e6);
    for (const point of parsed.points) assert.ok(point.re >= fit.xMin && point.re <= fit.xMax && point.im >= fit.yMin && point.im <= fit.yMax);
    assert.equal(graph(input, fit).visibleCount, parsed.points.length);
  }
  assert.deepEqual(fitComplexPoints([]), { xMin: -5, xMax: 5, yMin: -5, yMax: 5 });
});

test('fit visibly separates small nonzero values from the origin and respects the numeric zoom limit', () => {
  const parsed = parse('1e-6+2e-6i'), bounds = fitComplexPoints(parsed.points);
  assert.ok(bounds.xMax - bounds.xMin < 3e-6, 'Fit must zoom to micro-scale values rather than retaining a unit-scale window.');
  const result = graph(parsed.expression, bounds), frame = complexPlotFrame(result.spec);
  const point = result.points[0];
  const offsetX = point.re / (bounds.xMax - bounds.xMin) * frame.width;
  const offsetY = point.im / (bounds.yMax - bounds.yMin) * frame.height;
  assert.ok(offsetX > 100 && offsetY > 200, 'The small point is visibly separate from the origin in both directions.');
  for (const expression of ['1e-12i', '1e-300+1e-300i', '0', '0\n0']) {
    const values = parse(expression), fit = fitComplexPoints(values.points);
    assert.ok(fit.xMax - fit.xMin >= 1e-9 && fit.yMax - fit.yMin >= 1e-9);
    assert.equal(validateComplexSpec({ ...DEFAULT_COMPLEX_SPEC, expression, ...fit }).ok, true, expression);
    assert.equal(graph(expression, fit).visibleCount, values.points.length);
  }
  assert.deepEqual(fitComplexPoints(parse('0').points), { xMin: -1, xMax: 1, yMin: -1, yMax: 1 });
});

test('crowded and boundary points keep exact markers without emitting clipped or overlapping label rectangles', () => {
  const result = graph('5+5i\n5+5i\n5+4.999i\n-5-5i\n0\n0\n0');
  assert.equal(result.visibleCount, 7);
  assert.equal([...result.svg.matchAll(/data-complex-point=/g)].length, 7);
  // A point at the corner remains at that corner, rather than moving to fit text.
  const frame = complexPlotFrame(result.spec);
  const first = /data-complex-point="z1" cx="([\d.e+-]+)" cy="([\d.e+-]+)"/.exec(result.svg)!;
  near(Number(first[1]), frame.left + frame.width);
  near(Number(first[2]), frame.top);
  const boxes = [...result.svg.matchAll(/data-complex-label="[^"]+" x="([\d.e+-]+)" y="([\d.e+-]+)"[^>]*>([^<]+)<\/text>/g)].map(match => ({
    left: Number(match[1]) - 3, top: Number(match[2]) - 17, right: Number(match[1]) + match[3].length * 8.1 + 3, bottom: Number(match[2]) + 6,
  }));
  for (let index = 0; index < boxes.length; index++) {
    const box = boxes[index];
    assert.ok(box.left >= frame.left - 1e-8 && box.right <= frame.left + frame.width + 1e-8);
    assert.ok(box.top >= frame.top - 1e-8 && box.bottom <= frame.top + frame.height + 1e-8);
    for (const other of boxes.slice(index + 1)) assert.ok(!(box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top));
  }
});
