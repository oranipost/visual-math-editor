import assert from 'node:assert/strict';
import test from 'node:test';
import type { GeometryModel } from '../src/geometry-types';
import type { PlotSpec } from '../src/plot-engine';
import { analyzeSpatialRelation, createSpatialRelationPlot, SPATIAL_LIMITS, validateSpatialRelationModel, type SpatialRelationModel, type SpatialRelationState } from '../src/spatial-relations';

const base: PlotSpec = { mode: 'geometry', expression: '', xMin: -1, xMax: 1, yMin: -1, yMax: 1, azimuth: 45, elevation: 30, geometryZoom: 1 };
function analyze(model: unknown) {
  const result = analyzeSpatialRelation(model); assert.ok(result.ok, result.ok ? '' : result.error); return result;
}
function draw(model: Partial<SpatialRelationModel> & { shape: SpatialRelationModel['shape'] }, extra: Partial<PlotSpec> = {}) {
  const result = createSpatialRelationPlot({ ...base, geometry: model as GeometryModel, ...extra });
  assert.ok(result.ok, result.ok ? '' : result.error); return result;
}
function near(actual: number, expected: number, relative = 1e-10): void { assert.ok(Math.abs(actual - expected) <= relative * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`); }

test('nine infinite-object relations are classified from the actual finite input values', () => {
  const cases: [unknown, SpatialRelationState][] = [
    [{ shape: 'planes', angle: 45, offset: 1 }, 'planes-intersecting'], [{ shape: 'planes', angle: 0, offset: 1 }, 'planes-parallel'], [{ shape: 'planes', angle: 0, offset: 0 }, 'planes-coincident'],
    [{ shape: 'line-plane', angle: 30, offset: 1 }, 'line-intersecting'], [{ shape: 'line-plane', angle: 0, offset: 1 }, 'line-parallel'], [{ shape: 'line-plane', angle: 0, offset: 0 }, 'line-contained'],
    [{ shape: 'sphere-plane', radius: 1, offset: 0.5 }, 'sphere-circle'], [{ shape: 'sphere-plane', radius: 1, offset: 1 }, 'sphere-tangent'], [{ shape: 'sphere-plane', radius: 1, offset: 2 }, 'sphere-disjoint'],
  ];
  for (const [input, state] of cases) { const result = analyze(input); assert.equal(result.relation, state); assert.equal(result.approximate, false); }
  assert.equal(analyze({ shape: 'planes' }).model.angle, 45); assert.equal(analyze({ shape: 'planes' }).model.offset, 0);
  assert.equal(analyze({ shape: 'line-plane' }).model.angle, 30); assert.equal(analyze({ shape: 'line-plane' }).model.offset, 1);
  assert.equal(analyze({ shape: 'sphere-plane' }).model.radius, 1); assert.equal(analyze({ shape: 'sphere-plane' }).model.offset, 0.5);
});

test('plane intersection anchors satisfy both planes, including exact perpendicular and signed offsets', () => {
  for (const angle of [1, 15, 45, 89, 90]) for (const offset of [-4, -1, 0, 1, 4]) {
    const result = analyze({ shape: 'planes', angle, offset });
    assert.equal(result.intersection?.kind, 'line');
    const point = result.intersection!.point!;
    near(point.z, 0); near(Math.sin(angle * Math.PI / 180) * point.x + Math.cos(angle * Math.PI / 180) * point.z, offset);
    assert.deepEqual(result.intersection?.direction, { x: 0, y: 1, z: 0 });
    if (angle === 90) near(point.x, offset);
  }
});

test('line-plane intersection is the actual point on the given parametric line, with no replacement by visible boundaries', () => {
  for (const angle of [1, 30, 45, 90]) for (const offset of [-4, -1, 0, 1, 4]) {
    const result = analyze({ shape: 'line-plane', angle, offset }), point = result.intersection!.point!;
    const sine = angle === 90 ? 1 : Math.sin(angle * Math.PI / 180), cosine = angle === 90 ? 0 : Math.cos(angle * Math.PI / 180);
    const t = -offset / sine;
    near(point.x, t * cosine); near(point.y, 0); near(point.z, offset + t * sine);
    if (angle === 90) near(point.x, 0);
  }
  const outside = draw({ shape: 'line-plane', angle: 1, offset: 4 });
  assert.equal(outside.analysis.relation, 'line-intersecting'); assert.equal(outside.analysis.outsideView, true);
  assert.doesNotMatch(outside.svg, /data-spatial-intersection="point"/);
  assert.match(outside.svg, /The intersection lies outside the shown view/);
  assert.ok(outside.analysis.intersection!.point!.x < -200);
});

test('sphere section radius uses a stable product and tangencies are shown at either pole', () => {
  for (const radius of [0.1, 1, 4]) for (const fraction of [-1, -0.5, 0, 0.5, 1]) {
    const offset = radius * fraction, result = analyze({ shape: 'sphere-plane', radius, offset });
    const intersection = result.intersection!;
    assert.equal(result.relation, Math.abs(fraction) === 1 ? 'sphere-tangent' : 'sphere-circle');
    assert.deepEqual(intersection.point, { x: 0, y: 0, z: offset });
    if (intersection.kind === 'circle') near(intersection.radius! ** 2 + offset ** 2, radius ** 2);
  }
  assert.match(draw({ shape: 'sphere-plane', radius: 1, offset: -1 }).svg, /data-spatial-intersection="point"/);
  assert.match(draw({ shape: 'sphere-plane', radius: 1, offset: 0 }).svg, /data-spatial-intersection="circle"/);
  assert.doesNotMatch(draw({ shape: 'sphere-plane', radius: 1, offset: 2 }).svg, /data-spatial-intersection=/);
});

test('critical tolerances warn without snapping near-parallel, near-coincident, or near-tangent inputs', () => {
  for (const shape of ['planes', 'line-plane'] as const) {
    const nearParallel = analyze({ shape, angle: 1e-8, offset: 1 });
    assert.equal(nearParallel.relation, shape === 'planes' ? 'planes-intersecting' : 'line-intersecting');
    assert.equal(nearParallel.approximate, true); assert.equal(nearParallel.outsideView, true); assert.equal(nearParallel.model.angle, 1e-8);
    const nearCoincident = analyze({ shape, angle: 0, offset: 1e-12 });
    assert.equal(nearCoincident.relation, shape === 'planes' ? 'planes-parallel' : 'line-parallel');
    assert.equal(nearCoincident.approximate, true); assert.equal(nearCoincident.model.offset, 1e-12);
    const underflow = draw({ shape, angle: Number.MIN_VALUE, offset: 1 });
    assert.equal(underflow.analysis.outsideView, true); assert.equal(underflow.analysis.approximate, true);
    assert.doesNotMatch(underflow.svg, /NaN|Infinity/);
  }
  for (const offset of [1 - 1e-12, 1 + 1e-12, -1 + 1e-12, -1 - 1e-12]) {
    const result = analyze({ shape: 'sphere-plane', radius: 1, offset });
    assert.equal(result.relation, Math.abs(offset) < 1 ? 'sphere-circle' : 'sphere-disjoint'); assert.equal(result.approximate, true); assert.equal(result.model.offset, offset);
  }
  assert.equal(analyze({ shape: 'sphere-plane', radius: 1, offset: 1 }).approximate, false);
  assert.match(draw({ shape: 'sphere-plane', radius: 1, offset: 1 - 1e-12 }).svg, /inputs were not snapped/);
});

test('finite plane patches do not redefine the infinite-plane conclusions or create fake intersections', () => {
  const result = draw({ shape: 'planes', angle: 1, offset: 4 });
  assert.equal(result.analysis.relation, 'planes-intersecting'); assert.equal(result.analysis.outsideView, true);
  assert.ok(result.analysis.intersection!.point!.x > result.analysis.patchExtent);
  assert.doesNotMatch(result.svg, /data-spatial-intersection="line"/);
  assert.match(result.svg, /Conclusions describe infinite planes and lines/);
  assert.match(result.svg, /finite displayed patches/);
  assert.match(draw({ shape: 'planes', angle: 90, offset: 1 }).svg, /data-spatial-intersection="line"/);
  assert.equal(draw({ shape: 'sphere-plane', offset: 4, radius: 0.1 }).analysis.relation, 'sphere-disjoint');
});

test('renderer is bounded, safe, locally captioned, and camera changes leave model and relation unchanged', () => {
  for (const shape of ['planes', 'line-plane', 'sphere-plane'] as const) for (const faces of [true, false]) {
    const result = draw({ shape, faces });
    assert.match(result.svg, /data-vme-plot="geometry"/); assert.match(result.svg, /data-plot-frame="true"/);
    assert.match(result.svg, /width="800" height="480"/); assert.match(result.svg, /data-relation-state=/);
    assert.match(result.svg, /data-vme-plot-caption="title"/); assert.match(result.svg, /data-vme-plot-caption="footer"/);
    assert.match(result.svg, /clip-path="url\(#vme-spatial-frame-\d+\)"/);
    assert.doesNotMatch(result.svg, /NaN|Infinity|<script|<foreignObject|onload=|https?:\/\/(?!www\.w3\.org)/);
    assert.ok(result.sampleCount >= 4 && result.sampleCount < 2000);
    const rotated = draw(result.analysis.model, { azimuth: 150, elevation: 70, geometryZoom: 0.5 });
    assert.deepEqual(rotated.analysis.model, result.analysis.model); assert.equal(rotated.analysis.relation, result.analysis.relation);
    assert.notEqual(rotated.svg, result.svg);
    if (!faces) assert.doesNotMatch(result.svg, /fill-opacity=/);
  }
  const first = draw({ shape: 'planes' }).svg.match(/<clipPath id="([^"]+)/)![1];
  const second = draw({ shape: 'planes' }).svg.match(/<clipPath id="([^"]+)/)![1]; assert.notEqual(first, second);
  const localized = createSpatialRelationPlot({ ...base, geometry: { shape: 'sphere-plane' } }, { title: '空间 / Relaciones', 'sphere-plane': '<b>Sphere</b>', description: 'A < B & C' });
  assert.ok(localized.ok); assert.match(localized.svg, /空间 \/ Relaciones: &lt;b&gt;Sphere&lt;\/b&gt;/); assert.match(localized.svg, /A &lt; B &amp; C/);
});

test('invalid or inapplicable fields, unsafe objects, and unbounded camera inputs fail without coercion', () => {
  const invalid: unknown[] = [null, [], {}, 'planes', { shape: 'sphere' }, { shape: 'planes', radius: 1 }, { shape: 'sphere-plane', angle: 45 }, { shape: 'planes', width: 2 }, { shape: 'line-plane', faces: 'yes' },
    ...[-1, 90.001, Infinity, NaN, '45', null].map(angle => ({ shape: 'planes', angle })), ...[-4.01, 4.01, Infinity, NaN, '1', null].map(offset => ({ shape: 'line-plane', offset })), ...[0, 0.099, 4.001, Infinity, NaN, '1', null].map(radius => ({ shape: 'sphere-plane', radius })),
    Object.assign(Object.create({ angle: 30 }), { shape: 'planes' }), JSON.parse('{"shape":"planes","__proto__":{"angle":0}}'), { shape: 'planes', [Symbol('unsafe')]: 1 },
  ];
  for (const input of invalid) assert.equal(validateSpatialRelationModel(input).ok, false, JSON.stringify(input));
  let getter = 0; const object = { shape: 'planes' }; Object.defineProperty(object, 'angle', { get() { getter++; return 45; } });
  assert.equal(validateSpatialRelationModel(object).ok, false); assert.equal(getter, 0);
  assert.equal(validateSpatialRelationModel(new Proxy(object, { getPrototypeOf() { throw new Error('bad'); } })).ok, false);
  for (const extra of [{ geometryZoom: 0 }, { geometryZoom: 5 }, { geometryZoom: NaN }, { elevation: 9 }, { elevation: 81 }, { azimuth: Infinity }, { xMin: -2 }, { expression: 'x+1' }, { zMin: -1 }]) assert.equal(createSpatialRelationPlot({ ...base, geometry: { shape: 'planes' }, ...extra }).ok, false);
  for (const angle of [SPATIAL_LIMITS.minimumAngle, SPATIAL_LIMITS.maximumAngle]) assert.ok(analyze({ shape: 'planes', angle }).ok);
  for (const offset of [-4, 4]) assert.ok(analyze({ shape: 'planes', offset }).ok);
  for (const radius of [0.1, 4]) assert.ok(analyze({ shape: 'sphere-plane', radius }).ok);
});

test('extreme signed offsets keep base objects within the fitted finite display patches', () => {
  for (const offset of [-4, 4]) for (const shape of ['planes', 'line-plane', 'sphere-plane'] as const) {
    const result = draw({ shape, offset, ...(shape !== 'sphere-plane' ? { angle: 0 } : { radius: 0.1 }) });
    assert.ok(result.analysis.patchExtent > Math.abs(offset));
    if (shape === 'sphere-plane') assert.equal(result.analysis.relation, 'sphere-disjoint');
    else assert.equal(result.analysis.relation, shape === 'planes' ? 'planes-parallel' : 'line-parallel');
    assert.match(result.svg, shape === 'line-plane' ? /stroke="#7c3aed"/ : shape === 'planes' ? /stroke="#f59e0b"/ : /stroke="#3b82f6"/);
    assert.equal(result.analysis.outsideView, false);
  }
});

test('default fit keeps all displayed patches and line coordinates inside the frame before user zoom', () => {
  for (const shape of ['planes', 'line-plane', 'sphere-plane'] as const) for (const azimuth of [0, 45, 135, 270]) for (const elevation of [10, 30, 80]) {
    const result = draw({ shape, offset: 4, ...(shape !== 'sphere-plane' ? { angle: 45 } : { radius: 4 }) }, { azimuth, elevation, geometryZoom: 1 });
    for (const path of result.svg.matchAll(/<path[^>]* d="([^"]*)"/g)) for (const coordinate of path[1].matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)) {
      const x = Number(coordinate[1]), y = Number(coordinate[2]);
      assert.ok(x >= 40 && x <= 760 && y >= 55 && y <= 355, `${shape} ${azimuth}/${elevation} has clipped default point ${x},${y}`);
    }
  }
});
