import assert from 'node:assert/strict';
import test from 'node:test';
import { PLOT_LIMITS, type PlotSpec } from '../src/plot-engine';
import { createSurfacePlot, DEFAULT_SURFACE_SPEC, rotateSurfaceCamera, validateSurfaceSpec, zoomSurfaceBounds, type SurfaceSpec } from '../src/surface-plot';

function surface(expression = DEFAULT_SURFACE_SPEC.expression, extra: Partial<PlotSpec> = {}) {
  const result = createSurfacePlot({ ...DEFAULT_SURFACE_SPEC, expression, ...extra });
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result;
}
function near(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), `${actual} differs from ${expected}`);
}

test('3D surfaces use the real bounded two-variable parser and an offline SVG wireframe', () => {
  const result = surface('z = sin(sqrt(x^2+y^2))');
  assert.equal(result.spec.mode, 'surface');
  assert.equal(result.spec.expression, 'sin(sqrt(x^2+y^2))');
  assert.ok(result.sampleCount > 1000 && result.sampleCount <= PLOT_LIMITS.evaluations);
  assert.ok(result.segments.length >= 40);
  assert.match(result.svg, /data-vme-plot="surface"/);
  assert.match(result.svg, /data-plot-frame="true"/);
  assert.match(result.svg, /<path d="M/);
  assert.match(result.svg, /Each axis is scaled independently/);
  assert.doesNotMatch(result.svg, /<script|<foreignObject|https?:\/\/(?!www\.w3\.org)|(?:NaN|Infinity)/);
  for (const axis of ['X', 'Y', 'Z']) {
    assert.match(result.svg, new RegExp(`data-axis-label="${axis}"[^>]*font-size="24"`));
    assert.match(result.svg, new RegExp(`data-surface-range="${axis}"`));
  }
  assert.notEqual(surface('x+y', { azimuth: 115 }).svg, surface('x+y').svg);
});

test('constant surfaces are visible, and every emitted point remains inside X/Y/Z ranges', () => {
  for (const expression of ['0', '1', 'x+y', 'x^2-y^2', 'sqrt(x*y)', 'exp(x+y)', 'x^100', '1e308*x', '1e308*(x+y)']) {
    const result = surface(expression);
    for (const segment of result.segments) {
      assert.ok(segment.length >= 2);
      for (const point of segment) {
        assert.ok(Object.values(point).every(Number.isFinite), expression);
        assert.ok(point.x >= result.spec.xMin - 1e-12 && point.x <= result.spec.xMax + 1e-12, expression);
        assert.ok(point.y >= result.spec.yMin - 1e-12 && point.y <= result.spec.yMax + 1e-12, expression);
        assert.ok(point.z >= result.spec.zMin && point.z <= result.spec.zMax, expression);
      }
    }
    if (expression === '0' || expression === '1') assert.ok(result.segments.every(line => line.every(point => point.z === Number(expression))));
  }
});

test('singular vertical, horizontal and diagonal planes do not become false connecting lines', () => {
  const offset = 0.1234567;
  for (const [expression, side] of [
    [`1/(x-${offset})`, (x: number, _y: number) => x - offset],
    [`1/(x-${offset})^2`, (x: number, _y: number) => x - offset],
    [`1/(y-${offset})`, (_x: number, y: number) => y - offset],
    [`1/(x+y-${offset})`, (x: number, y: number) => x + y - offset],
  ] as const) {
    const result = surface(expression, { zMin: -1e6, zMax: 1e6 });
    for (const segment of result.segments) {
      assert.ok(!segment.some(p => side(p.x, p.y) < 0) || !segment.some(p => side(p.x, p.y) > 0), expression);
    }
  }
  const tangent = surface('tan(y)', { yMin: -4, yMax: 4, zMin: -1e6, zMax: 1e6 });
  for (const pole of [-Math.PI / 2, Math.PI / 2]) for (const segment of tangent.segments) {
    assert.ok(!segment.some(p => p.y < pole) || !segment.some(p => p.y > pole));
  }
});

test('invalid domains, expressions, modes and numeric surface settings fail without unbounded work', () => {
  for (const expression of ['1/0', 'sqrt(-1)', '100', 'Math.sin(x)', 'globalThis.alert(1)', 'theta', '<svg onload=alert(1)>']) {
    const result = createSurfacePlot({ ...DEFAULT_SURFACE_SPEC, expression });
    assert.equal(result.ok, false, expression);
    if (!result.ok) assert.ok(result.error.length > 0);
  }
  for (const extra of [
    { mode: 'function' }, { zMin: NaN }, { zMax: Infinity }, { zMin: 2, zMax: 2 },
    { zMin: 3, zMax: -2 }, { zMax: 1e6 + 1 }, { zMin: 0, zMax: 1e-10 },
    { azimuth: NaN }, { elevation: 9 }, { elevation: 81 }, { xMin: 3, xMax: 2 },
  ]) assert.equal(validateSurfaceSpec({ ...DEFAULT_SURFACE_SPEC, ...extra } as PlotSpec).ok, false, JSON.stringify(extra));
  assert.equal(validateSurfaceSpec(null as unknown as PlotSpec).ok, false);
  const defaults = validateSurfaceSpec({ mode: 'surface', expression: 'x*y', xMin: -1, xMax: 1, yMin: -1, yMax: 1 });
  assert.ok(defaults.ok);
  assert.equal(defaults.spec.zMin, -2);
  assert.equal(defaults.spec.azimuth, 45);
  const complex = 'sin('.repeat(25) + 'x+y' + ')'.repeat(25);
  const bounded = createSurfacePlot({ ...DEFAULT_SURFACE_SPEC, expression: complex });
  if (bounded.ok) assert.ok(bounded.sampleCount <= PLOT_LIMITS.evaluations);
  else assert.match(bounded.error, /complex|deep/);
});

test('surface orbit is finite, wraps azimuth, clamps elevation, and preserves the equation and ranges', () => {
  const original = { ...DEFAULT_SURFACE_SPEC };
  const rotated = rotateSurfaceCamera(original, 720 + 90, 100)!;
  assert.equal(rotated.azimuth, 135);
  assert.equal(rotated.elevation, 80);
  assert.equal(rotateSurfaceCamera(rotated, -360 - 180, -100)!.azimuth, 315);
  assert.equal(rotateSurfaceCamera(rotated, 0, -100)!.elevation, 10);
  assert.equal(rotated.expression, original.expression);
  for (const key of ['xMin', 'xMax', 'yMin', 'yMax', 'zMin', 'zMax'] as const) assert.equal(rotated[key], original[key]);
  assert.deepEqual(original, DEFAULT_SURFACE_SPEC);
  assert.equal(rotateSurfaceCamera(original, Infinity, 0), undefined);
  assert.equal(rotateSurfaceCamera(original, 0, NaN), undefined);
  assert.equal(rotateSurfaceCamera({ ...original, zMax: Infinity }, 1, 1), undefined);
});

test('surface zoom scales three axes, remains finite at limits, and retains the persisted camera', () => {
  const original = { ...DEFAULT_SURFACE_SPEC, azimuth: 120, elevation: 42 };
  const zoomed = zoomSurfaceBounds(original, 0.5)!;
  assert.deepEqual([zoomed.xMin, zoomed.xMax, zoomed.yMin, zoomed.yMax, zoomed.zMin, zoomed.zMax], [-2.5, 2.5, -2.5, 2.5, -1, 1]);
  const restored = zoomSurfaceBounds(zoomed, 2)!;
  for (const key of ['xMin', 'xMax', 'yMin', 'yMax', 'zMin', 'zMax'] as const) near(restored[key], original[key]);
  assert.equal(zoomed.azimuth, 120);
  assert.equal(zoomed.elevation, 42);
  for (const factor of [1e308, 1e-300]) assert.ok(validateSurfaceSpec(zoomSurfaceBounds(original, factor)!).ok);
  for (const factor of [0, -1, NaN, Infinity]) assert.equal(zoomSurfaceBounds(original, factor), undefined);
  assert.equal(zoomSurfaceBounds({ ...original, zMin: 3 }, 0.5), undefined);
  let spec: SurfaceSpec = original;
  for (let index = 0; index < 300; index++) {
    spec = zoomSurfaceBounds(rotateSurfaceCamera(spec, index * 17, Math.sin(index) * 40)!, index % 7 === 0 ? 20 : 0.8)!;
    assert.ok(validateSurfaceSpec(spec).ok);
  }
});
