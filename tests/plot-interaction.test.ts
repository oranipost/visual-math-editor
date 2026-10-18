import assert from 'node:assert/strict';
import test from 'node:test';
import { panPlotBounds, plotPointerPosition, validPlotBounds, zoomPlotBounds, type PlotBounds } from '../src/plot-interaction';

const ordinary: PlotBounds = { xMin: -10, xMax: 10, yMin: -5, yMax: 15 };
const near = (actual: number, expected: number, tolerance = 1e-9): void => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
};
const required = (bounds: PlotBounds | undefined): PlotBounds => {
  assert.ok(bounds);
  assert.ok(validPlotBounds(bounds));
  return bounds;
};

test('drag fractions shift mathematical bounds without changing ordinary spans', () => {
  assert.deepEqual(required(panPlotBounds(ordinary, -0.25, 0.5)), { xMin: -15, xMax: 5, yMin: 5, yMax: 25 });
  assert.deepEqual(required(panPlotBounds(ordinary, 0, 0)), ordinary);
});

test('panning to coordinate limits retains span and clamps rather than overflowing', () => {
  assert.deepEqual(required(panPlotBounds(ordinary, 1e308, -1e308)), {
    xMin: 999980, xMax: 1000000, yMin: -1000000, yMax: -999980,
  });
  const full = { xMin: -1e6, xMax: 1e6, yMin: -1e6, yMax: 1e6 };
  assert.deepEqual(required(panPlotBounds(full, 1e308, 1e308)), full);
});

test('opposite ordinary pans restore the starting bounds', () => {
  const moved = required(panPlotBounds(ordinary, 0.12, -0.34));
  const restored = required(panPlotBounds(moved, -0.12, 0.34));
  for (const key of ['xMin', 'xMax', 'yMin', 'yMax'] as const) near(restored[key], ordinary[key]);
});

test('center zoom scales around the visible center', () => {
  assert.deepEqual(required(zoomPlotBounds(ordinary, 0.5)), { xMin: -5, xMax: 5, yMin: 0, yMax: 10 });
  assert.deepEqual(required(zoomPlotBounds(ordinary, 1)), ordinary);
});

test('pointer zoom retains its mathematical anchor away from boundary clamps', () => {
  const zoomed = required(zoomPlotBounds(ordinary, 0.25, 0.2, 0.8));
  near(zoomed.xMin + (zoomed.xMax - zoomed.xMin) * 0.2, -6);
  near(zoomed.yMin + (zoomed.yMax - zoomed.yMin) * 0.8, 11);
  near(zoomed.xMax - zoomed.xMin, 5);
  near(zoomed.yMax - zoomed.yMin, 5);
});

test('zooming in and out restores bounds and both edge anchors work', () => {
  for (const anchor of [0, 0.13, 0.5, 0.9, 1]) {
    const zoomed = required(zoomPlotBounds(ordinary, 0.4, anchor, 1 - anchor));
    const restored = required(zoomPlotBounds(zoomed, 2.5, anchor, 1 - anchor));
    for (const key of ['xMin', 'xMax', 'yMin', 'yMax'] as const) near(restored[key], ordinary[key]);
  }
});

test('huge zoom out is bounded and tiny zoom in keeps an adequate representable span', () => {
  assert.deepEqual(required(zoomPlotBounds(ordinary, 1e308)), { xMin: -1e6, xMax: 1e6, yMin: -1e6, yMax: 1e6 });
  const tiny = required(zoomPlotBounds(ordinary, 1e-300, 0.5, 0.5));
  assert.ok(tiny.xMax - tiny.xMin >= 1e-9);
  assert.ok(tiny.yMax - tiny.yMin >= 1e-9);
  const large = { xMin: 999999, xMax: 1000000, yMin: -1000000, yMax: -999999 };
  for (const anchor of [0, 0.5, 1]) required(zoomPlotBounds(large, 1e-300, anchor, anchor));
});

test('narrow center ranges remain valid after panning to a large offset', () => {
  const small = { xMin: 0, xMax: 1e-9, yMin: 0, yMax: 1e-9 };
  const far = required(panPlotBounds(small, 1e308, -1e308));
  assert.ok(far.xMax <= 1e6 && far.yMin >= -1e6);
  assert.ok(far.xMax - far.xMin > 1e-9);
});

test('malformed bounds, nonfinite gestures and invalid anchors are rejected', () => {
  const malformed = [
    null, undefined, {}, { ...ordinary, xMin: NaN }, { ...ordinary, yMax: Infinity },
    { ...ordinary, xMin: '0' }, { ...ordinary, xMin: -1e6 - 1 },
    { ...ordinary, xMax: -10 }, { ...ordinary, yMin: 15 },
    { ...ordinary, xMin: 0, xMax: 1e-10 },
    { ...ordinary, xMin: 999999, xMax: 999999 + 1e-8 },
  ];
  for (const value of malformed) {
    assert.equal(validPlotBounds(value as PlotBounds), false);
    assert.equal(panPlotBounds(value as PlotBounds, 0.1, 0.1), undefined);
    assert.equal(zoomPlotBounds(value as PlotBounds, 0.5), undefined);
  }
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.equal(panPlotBounds(ordinary, value, 0), undefined);
    assert.equal(panPlotBounds(ordinary, 0, value), undefined);
    assert.equal(zoomPlotBounds(ordinary, value), undefined);
    assert.equal(zoomPlotBounds(ordinary, 1, value), undefined);
    assert.equal(zoomPlotBounds(ordinary, 1, 0.5, value), undefined);
  }
  for (const factor of [0, -1]) assert.equal(zoomPlotBounds(ordinary, factor), undefined);
  for (const anchor of [-1, 2]) assert.equal(zoomPlotBounds(ordinary, 1, anchor), undefined);
});

test('viewport geometry excludes labels and reverses vertical screen coordinates', () => {
  const frame = { left: 100, top: 50, width: 600, height: 300 };
  assert.deepEqual(plotPointerPosition(100, 50, frame), { x: 0, y: 1 });
  assert.deepEqual(plotPointerPosition(700, 350, frame), { x: 1, y: 0 });
  assert.deepEqual(plotPointerPosition(250, 125, frame), { x: 0.25, y: 0.75 });
  assert.equal(plotPointerPosition(99, 100, frame), undefined);
  assert.equal(plotPointerPosition(150, 351, frame), undefined);
  assert.deepEqual(plotPointerPosition(40, 380, frame, true), { x: -0.1, y: -0.10000000000000009 });
  for (const invalid of [0, -1, NaN, Infinity]) {
    assert.equal(plotPointerPosition(100, 50, { ...frame, width: invalid }), undefined);
    assert.equal(plotPointerPosition(100, 50, { ...frame, height: invalid }), undefined);
  }
  assert.equal(plotPointerPosition(NaN, 50, frame), undefined);
});

test('repeated bounded pan and zoom never produce a renderer-invalid viewport', () => {
  let bounds = ordinary;
  for (let index = 0; index < 1500; index++) {
    bounds = required(panPlotBounds(bounds, Math.sin(index) * 10, Math.cos(index) * 10));
    bounds = required(zoomPlotBounds(bounds, index % 7 === 0 ? 20 : 0.8, (index % 11) / 10, (index % 17) / 16));
  }
});
