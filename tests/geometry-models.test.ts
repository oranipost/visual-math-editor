import assert from 'node:assert/strict';
import test from 'node:test';
import type { PlotSpec } from '../src/plot-engine';
import type { GeometryModel, GeometryShape } from '../src/geometry-types';
import { buildGeometryMesh, createGeometryPlot, DEFAULT_GEOMETRY_SPEC, GEOMETRY_LIMITS, projectGeometryPoint, rotateGeometryCamera, validateGeometrySpec, zoomGeometryView, type GeometryMesh } from '../src/geometry-models';

const shapes: GeometryShape[] = ['sphere', 'cylinder', 'cone', 'pyramid', 'prism', 'cuboid', 'plane'];
function geometry(shape: GeometryShape = 'sphere', dimensions: Partial<GeometryModel> = {}, extra: Partial<PlotSpec> = {}) {
  const result = createGeometryPlot({ ...DEFAULT_GEOMETRY_SPEC, geometry: { shape, ...dimensions }, ...extra });
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result;
}
function near(actual: number, expected: number, tolerance = 1e-10): void { assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`); }
function triangleEdges(mesh: GeometryMesh): Map<string, number> {
  const edges = new Map<string, number>();
  for (const face of mesh.triangles) for (let index = 0; index < 3; index++) {
    const a = face[index], b = face[(index + 1) % 3], key = a < b ? `${a}:${b}` : `${b}:${a}`;
    edges.set(key, (edges.get(key) ?? 0) + 1);
  }
  return edges;
}
function volume(mesh: GeometryMesh): number {
  return mesh.triangles.reduce((sum, [a, b, c]) => {
    const p = mesh.vertices[a], q = mesh.vertices[b], r = mesh.vertices[c];
    return sum + (p.x * (q.y * r.z - q.z * r.y) - p.y * (q.x * r.z - q.z * r.x) + p.z * (q.x * r.y - q.y * r.x)) / 6;
  }, 0);
}

test('all seven offline shapes have bounded nondegenerate meshes, labels, fixed frame, and safe SVG', () => {
  for (const shape of shapes) {
    const result = geometry(shape);
    assert.equal(result.spec.mode, 'geometry');
    assert.equal(result.spec.expression, '');
    assert.equal(result.sampleCount, result.mesh.vertices.length);
    assert.deepEqual(result.segments, []);
    assert.ok(result.sampleCount > 0 && result.sampleCount <= 500);
    assert.ok(result.mesh.triangles.length > 0 && result.mesh.triangles.length <= 1000);
    assert.ok(result.mesh.edges.length > 0 && result.mesh.edges.length <= 1000);
    assert.match(result.svg, /data-vme-plot="geometry"/);
    assert.match(result.svg, /data-plot-frame="true"/);
    assert.match(result.svg, /width="800" height="480"/);
    assert.match(result.svg, /clip-path="url\(#vme-geometry-frame-[a-z0-9]+\)"/);
    assert.match(result.svg, /equal scale on X, Y and Z/);
    assert.match(result.svg, /<polygon data-geometry-face=/);
    assert.doesNotMatch(result.svg, /NaN|Infinity|<script|<foreignObject|onload=|https?:\/\/(?!www\.w3\.org)/);
    for (const axis of ['X', 'Y', 'Z']) assert.match(result.svg, new RegExp(`data-axis-label="${axis}"`));
    for (const p of result.mesh.vertices) assert.ok(Object.values(p).every(Number.isFinite));
    for (const face of result.mesh.triangles) {
      assert.equal(new Set(face).size, 3);
      assert.ok(face.every(index => Number.isInteger(index) && index >= 0 && index < result.mesh.vertices.length));
      const [a, b, c] = face.map(index => result.mesh.vertices[index]);
      const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
      assert.ok(Math.hypot(u.y * v.z - u.z * v.y, u.z * v.x - u.x * v.z, u.x * v.y - u.y * v.x) > 0, shape);
    }
  }
});

test('every solid is a closed outward-oriented manifold, including sphere seam and capped cylinders/cones', () => {
  for (const shape of shapes.filter(shape => shape !== 'plane')) {
    const { mesh } = geometry(shape);
    const edges = triangleEdges(mesh);
    assert.ok([...edges.values()].every(count => count === 2), `${shape} has open or multiply joined edges`);
    assert.equal(mesh.vertices.length - edges.size + mesh.triangles.length, 2, `${shape} Euler topology`);
    assert.ok(volume(mesh) > 0, `${shape} normals must face outward`);
  }
  near(volume(geometry('cuboid', { width: 2, depth: 3, height: 5 }).mesh), 30);
  near(volume(geometry('prism', { radius: 2, height: 3, sides: 4 }).mesh), 24);
  near(volume(geometry('pyramid', { radius: 2, height: 3, sides: 4 }).mesh), 8);
  near(volume(geometry('sphere', { radius: 2 }).mesh), 4 / 3 * Math.PI * 8, 0.02);
  near(volume(geometry('cylinder', { radius: 2, height: 3 }).mesh), Math.PI * 12, 0.01);
  near(volume(geometry('cone', { radius: 2, height: 3 }).mesh), Math.PI * 4, 0.01);
});

test('dimensions control real world geometry and regular bases use center-to-vertex radius', () => {
  const sphere = geometry('sphere', { radius: 2.5 });
  for (const p of sphere.mesh.vertices) near(Math.hypot(p.x, p.y, p.z), 2.5);
  for (const shape of ['prism', 'pyramid', 'cylinder', 'cone'] as const) {
    const result = geometry(shape, { radius: 3, height: 7, ...(['prism', 'pyramid'].includes(shape) ? { sides: 7 } : {}) });
    near(Math.max(...result.mesh.vertices.map(p => p.z)) - Math.min(...result.mesh.vertices.map(p => p.z)), 7);
    const base = result.mesh.vertices.filter(p => p.z === -3.5 && Math.hypot(p.x, p.y) > 0);
    for (const p of base) near(Math.hypot(p.x, p.y), 3);
    if (shape === 'prism' || shape === 'pyramid') assert.equal(base.length, 7);
  }
  const cuboid = geometry('cuboid', { width: 2, depth: 3, height: 5 });
  for (const [key, expected] of [['x', 2], ['y', 3], ['z', 5]] as const) near(Math.max(...cuboid.mesh.vertices.map(p => p[key])) - Math.min(...cuboid.mesh.vertices.map(p => p[key])), expected);
  const plane = geometry('plane', { width: 4, depth: 6 });
  assert.equal(plane.mesh.vertices.length, 4);
  assert.equal(plane.mesh.triangles.length, 2);
  assert.ok(plane.mesh.vertices.every(p => p.z === 0));
  assert.equal([...triangleEdges(plane.mesh).values()].filter(count => count === 1).length, 4);
});

test('orthographic camera is rigid and preserves lengths and sphere proportions at every tested orientation', () => {
  for (const azimuth of [0, 17, 45, 90, 180, 315]) for (const elevation of [10, 30, 55, 80]) {
    for (const point of [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 3, y: -2, z: 7 }]) {
      const projected = projectGeometryPoint(point, azimuth, elevation);
      near(Math.hypot(projected.x, projected.y, projected.z), Math.hypot(point.x, point.y, point.z));
    }
    const points = geometry('sphere', { radius: 3 }, { azimuth, elevation }).mesh.vertices.map(point => projectGeometryPoint(point, azimuth, elevation));
    const width = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x));
    const height = Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y));
    near(width, 6, 0.01); near(height, 6, 0.01); near(width / height, 1, 0.01);
  }
});

test('faces hide back edges; wireframe retains hidden lines as subdued dashed edges', () => {
  const solid = geometry('cuboid'), wire = geometry('cuboid', { faces: false });
  assert.match(solid.svg, /data-geometry-face=/);
  assert.doesNotMatch(solid.svg, /stroke-dasharray="3 3"/);
  assert.doesNotMatch(wire.svg, /<polygon/);
  assert.match(wire.svg, /stroke-dasharray="3 3"/);
  assert.deepEqual(solid.mesh, wire.mesh);
  assert.ok((solid.svg.match(/<line /g) ?? []).length < (wire.svg.match(/<line /g) ?? []).length);
  for (const zoom of [0.25, 1, 4]) for (const radius of [0.001, 1, 1000]) assert.equal(geometry('sphere', { radius }, { geometryZoom: zoom }).spec.geometry.radius, radius);
});

test('validation uses shape-specific dimensions, bounded lengths/sides/camera and no coercion or expression evaluation', () => {
  for (const shape of shapes) {
    const checked = validateGeometrySpec({ ...DEFAULT_GEOMETRY_SPEC, geometry: { shape } });
    assert.ok(checked.ok); assert.equal(checked.spec.geometry.faces, true);
    assert.ok(Object.values(checked.spec.geometry).every(value => value !== undefined));
  }
  const invalid: unknown[] = [null, undefined, [], 'sphere', {}, { ...DEFAULT_GEOMETRY_SPEC, expression: 'x+1' }, { ...DEFAULT_GEOMETRY_SPEC, mode: 'surface' }, { ...DEFAULT_GEOMETRY_SPEC, zMin: -1 }, { ...DEFAULT_GEOMETRY_SPEC, calculus: 'none' }, { ...DEFAULT_GEOMETRY_SPEC, xMin: 1 }, { ...DEFAULT_GEOMETRY_SPEC, xMin: -2 }, { ...DEFAULT_GEOMETRY_SPEC, yMax: 2 },
    ...[NaN, Infinity, -Infinity, 0, -1, 0.0009, 1000.1, '2', null].map(radius => ({ ...DEFAULT_GEOMETRY_SPEC, geometry: { shape: 'sphere', radius } })),
    ...[{ shape: 'sphere', width: 2 }, { shape: 'plane', height: 2 }, { shape: 'sphere', sides: 4 }, { shape: 'cuboid', radius: 2 }, { shape: '__proto__' }, { shape: '<svg onload=alert(1)>' }, { shape: 'sphere', faces: 'yes' }, { shape: 'sphere', unexpected: 1 }, { shape: 'cylinder', radius: 0.001, height: 1000 }, { shape: 'prism', sides: 2 }, { shape: 'prism', sides: 13 }, { shape: 'pyramid', sides: 3.5 }].map(geometry => ({ ...DEFAULT_GEOMETRY_SPEC, geometry })),
    ...[NaN, Infinity, 9, 81, '30'].map(elevation => ({ ...DEFAULT_GEOMETRY_SPEC, elevation })),
    ...[NaN, Infinity, -1, 0, 0.249, 4.001, '1'].map(geometryZoom => ({ ...DEFAULT_GEOMETRY_SPEC, geometryZoom })),
    ...[NaN, Infinity, '45'].map(azimuth => ({ ...DEFAULT_GEOMETRY_SPEC, azimuth })),
  ];
  for (const input of invalid) assert.equal(validateGeometrySpec(input as PlotSpec).ok, false, JSON.stringify(input));
  for (const sides of [3, 12]) assert.equal(geometry('prism', { sides }).spec.geometry.sides, sides);
  for (const shape of ['sphere', 'cylinder', 'cone', 'prism', 'pyramid'] as const) for (const size of [0.001, 1000]) assert.ok(geometry(shape, { radius: size, ...(shape !== 'sphere' ? { height: size } : {}) }).ok);
});

test('malicious descriptors, symbols, prototypes, and thrown proxy access cannot execute object getters', () => {
  let executed = 0;
  const source = { ...DEFAULT_GEOMETRY_SPEC };
  Object.defineProperty(source, 'azimuth', { get() { executed++; return 45; }, enumerable: true });
  assert.equal(validateGeometrySpec(source).ok, false);
  const geometryGetter = { shape: 'sphere' };
  Object.defineProperty(geometryGetter, 'radius', { get() { executed++; return 1; }, enumerable: true });
  assert.equal(validateGeometrySpec({ ...DEFAULT_GEOMETRY_SPEC, geometry: geometryGetter as GeometryModel }).ok, false);
  assert.equal(executed, 0);
  for (const model of [Object.assign(Object.create({ radius: 3 }), { shape: 'sphere' }), { shape: 'sphere', [Symbol('x')]: 1 }, JSON.parse('{"shape":"sphere","__proto__":{"radius":1}}')]) assert.equal(validateGeometrySpec({ ...DEFAULT_GEOMETRY_SPEC, geometry: model }).ok, false);
  assert.equal(validateGeometrySpec(new Proxy(source, { getPrototypeOf() { throw new Error('bad'); } })).ok, false);
});

test('localized SVG text is escaped without external assets or user markup execution', () => {
  const result = createGeometryPlot(DEFAULT_GEOMETRY_SPEC, { title: '几何 / Geometría', sphere: '<b>Sphere</b>', radius: '半径 / Radio', description: 'Equal "X" & Y < Z' });
  assert.ok(result.ok);
  assert.match(result.svg, /几何 \/ Geometría: &lt;b&gt;Sphere&lt;\/b&gt;/);
  assert.match(result.svg, /半径 \/ Radio = 1/);
  assert.match(result.svg, /Equal &quot;X&quot; &amp; Y &lt; Z/);
  assert.doesNotMatch(result.svg, /<b>|<script|<foreignObject/);
});

test('camera orbit and zoom preserve exact model dimensions, bound camera values, and never mutate input', () => {
  const source = geometry('prism', { radius: 3, height: 7, sides: 5, faces: false }).spec;
  const snapshot = structuredClone(source);
  const rotated = rotateGeometryCamera(source, 810, 100)!;
  assert.equal(rotated.azimuth, 135); assert.equal(rotated.elevation, 80);
  assert.equal(rotateGeometryCamera(rotated, -540, -100)!.azimuth, 315);
  assert.equal(rotateGeometryCamera(rotated, 0, -100)!.elevation, 10);
  assert.deepEqual(rotated.geometry, source.geometry);
  assert.equal(zoomGeometryView(source, 0.5)!.geometryZoom, 2);
  assert.equal(zoomGeometryView(zoomGeometryView(source, 0.5)!, 2)!.geometryZoom, 1);
  for (const factor of [1e308, 1e-308]) assert.ok(validateGeometrySpec(zoomGeometryView(source, factor)!).ok);
  for (const factor of [NaN, Infinity, 0, -1]) assert.equal(zoomGeometryView(source, factor), undefined);
  assert.equal(rotateGeometryCamera(source, NaN, 0), undefined); assert.equal(rotateGeometryCamera(source, 0, Infinity), undefined);
  assert.deepEqual(source, snapshot);
  assert.deepEqual(zoomGeometryView(source, 0.5)!.geometry, source.geometry);
  assert.deepEqual(buildGeometryMesh(rotated), buildGeometryMesh(source));
  const coordinates = (svg: string) => [...svg.matchAll(/<polygon[^>]* points="([^"]+)"/g)].map(match => match[1]);
  assert.notDeepEqual(coordinates(geometry('prism', { ...source.geometry, faces: true }, { azimuth: 45 }).svg), coordinates(geometry('prism', { ...source.geometry, faces: true }, { azimuth: 100 }).svg), 'changing camera must change projected face coordinates independently of SVG IDs');
  const wrapped = validateGeometrySpec({ ...source, azimuth: -360 * 3 - 5 });
  assert.ok(wrapped.ok); assert.equal(wrapped.spec.azimuth, 355);
  for (let index = 0, spec = source; index < 200; index++) {
    spec = zoomGeometryView(rotateGeometryCamera(spec, index * 17, Math.sin(index) * 40)!, index % 7 ? 0.8 : 20)!;
    assert.ok(validateGeometrySpec(spec).ok); assert.deepEqual(spec.geometry, source.geometry);
  }
});


test('separate geometry SVGs own distinct safe clip paths and reference only their own fragment', () => {
  const sphere = geometry('sphere').svg;
  const cylinder = geometry('cylinder').svg;
  const renderedAgain = geometry('sphere').svg;
  const ids = [] as string[];
  for (const svg of [sphere, cylinder, renderedAgain]) {
    const declarations = [...svg.matchAll(/<clipPath id="([^"]+)"/g)].map(match => match[1]);
    assert.equal(declarations.length, 1);
    const [id] = declarations;
    assert.match(id, /^[A-Za-z][A-Za-z0-9_-]*$/);
    ids.push(id);
    const references = [...svg.matchAll(/clip-path="url\(#([^)]*)\)"/g)].map(match => match[1]);
    assert.deepEqual(references, [id]);
    assert.doesNotMatch(svg, /url\((?:https?:|data:|javascript:)/i);
  }
  assert.equal(new Set(ids).size, 3, 'two different shapes and a rerender must not share a document fragment ID');
});
