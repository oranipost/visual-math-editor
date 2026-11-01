import assert from 'node:assert/strict';
import test from 'node:test';
import type { GeometryModel } from '../src/geometry-types';
import type { PlotSpec } from '../src/plot-engine';
import { DEFAULT_GEOMETRY_SPEC, validateGeometrySpec } from '../src/geometry-models';
import { createGraph, validateGraphSpec } from '../src/graph-render';
import { findPlotBlocks, parsePlotSpec, planGraphInsert, planGraphUpdate, serializePlot } from '../src/plot-markdown';
import { DocumentChangedError, type WriteTarget } from '../src/write-plan';

const models: GeometryModel[] = [
  { shape: 'sphere', radius: 2, faces: true },
  { shape: 'cylinder', radius: 1.5, height: 4, faces: false },
  { shape: 'cone', radius: 2.5, height: 3, faces: true },
  { shape: 'pyramid', radius: 2, height: 4.5, sides: 5, faces: false },
  { shape: 'prism', radius: 1.75, height: 2.5, sides: 6, faces: true },
  { shape: 'cuboid', width: 2.5, depth: 3.5, height: 4.5, faces: false },
  { shape: 'plane', width: 5, depth: 4, faces: true },
];
const geometry = (model = models[0], extra: Partial<PlotSpec> = {}): PlotSpec => ({
  ...DEFAULT_GEOMETRY_SPEC, geometry: { ...model }, azimuth: 137, elevation: 42, geometryZoom: 1.25, ...extra,
});
const payload = (spec: PlotSpec): string => JSON.stringify({ version: 1, ...spec });
const replace = (current: string, target: WriteTarget, replacement: string): string => current.slice(0, target.from) + replacement + current.slice(target.to);

test('all seven geometry models preserve dimensions, faces, camera and zoom through vme-plot', () => {
  for (const model of models) {
    const spec = geometry(model);
    const validation = validateGeometrySpec(spec);
    assert.equal(validation.ok, true, model.shape);
    if (!validation.ok) continue;
    const encoded = serializePlot(spec);
    assert.match(encoded, /^```vme-plot\n\{"version":1,/);
    assert.deepEqual(parsePlotSpec(encoded.split('\n')[1]), validation.spec, model.shape);
    assert.deepEqual(findPlotBlocks(encoded)[0].spec, validation.spec, model.shape);
    assert.deepEqual(parsePlotSpec(payload(spec)).geometry, model, model.shape);
    const rendered = createGraph(parsePlotSpec(payload(spec)));
    assert.equal(rendered.ok, true, model.shape);
    if (rendered.ok) assert.match(rendered.svg, /^<svg\b/);
  }
});

test('saving an unchanged geometry graph preserves unusual JSON, CRLF and fence bytes exactly', () => {
  const spec = geometry(models[4]);
  const { geometryZoom, geometry: model, ...rest } = spec;
  const raw = '~~~~vme-plot \r\n' + JSON.stringify({ geometryZoom, geometry: model, ...rest, version: 1 }, null, 2).replace(/\n/g, '\r\n') + '\r\n~~~~~';
  const snapshot = '中文 🧮 before\r\n\r\n' + raw + '\r\n\r\nafter α 🚀\r\n';
  const [block] = findPlotBlocks(snapshot);
  assert.ok(block);
  const target = { snapshot, from: block.from, to: block.to };
  assert.equal(snapshot.slice(block.from, block.to), raw);
  assert.equal(planGraphUpdate(snapshot, target, block.spec), raw);
  assert.equal(replace(snapshot, target, planGraphUpdate(snapshot, target, spec)), snapshot);
  const changed = { ...spec, geometryZoom: 2 };
  assert.equal(replace(snapshot, target, planGraphUpdate(snapshot, target, changed)), '中文 🧮 before\r\n\r\n' + serializePlot(changed) + '\r\n\r\nafter α 🚀\r\n');
});

test('changing one geometry view preserves surrounding prose and a second graph independently', () => {
  const first = geometry(models[0]);
  const second = geometry(models[5]);
  const prefix = '前文 α 😀\n\n';
  const suffix = '\n\n尾文\n';
  const snapshot = prefix + serializePlot(first) + '\n\n' + serializePlot(second) + suffix;
  const [block] = findPlotBlocks(snapshot);
  const target = { snapshot, from: block.from, to: block.to };
  const rotated = { ...block.spec, azimuth: 241, elevation: 63, geometryZoom: 0.75 };
  const result = replace(snapshot, target, planGraphUpdate(snapshot, target, rotated));
  const reopened = findPlotBlocks(result);
  assert.equal(result, prefix + serializePlot(rotated) + '\n\n' + serializePlot(second) + suffix);
  assert.equal(reopened[0].spec.azimuth, 241);
  assert.equal(reopened[0].spec.elevation, 63);
  assert.equal(reopened[0].spec.geometryZoom, 0.75);
  assert.deepEqual(reopened[1].spec, parsePlotSpec(payload(second)));
  assert.deepEqual(reopened[0].spec.geometry, models[0]);
});

test('geometry insertion remains one guarded replacement and refuses stale notes', () => {
  const snapshot = 'BeforeAfter 🚀';
  const target = { snapshot, from: 6, to: 6 };
  const spec = geometry(models[1]);
  const insertion = planGraphInsert(snapshot, target, spec, '', true);
  assert.equal(replace(snapshot, target, insertion), 'Before\n\n' + serializePlot(spec) + '\n\nAfter 🚀');
  assert.throws(() => planGraphInsert(snapshot + '!', target, spec, '', true), DocumentChangedError);
  const current = serializePlot(spec);
  const [block] = findPlotBlocks(current);
  const graphTarget = { snapshot: current, from: block.from, to: block.to };
  assert.throws(() => planGraphUpdate(current + '\nExternal change', graphTarget, geometry(models[2])), DocumentChangedError);
  assert.throws(() => planGraphUpdate(current, { ...graphTarget, from: block.from + 1 }, spec), /original graph/);
});

test('geometry persistence rejects malformed nested data, unknown keys and invalid dimensions', () => {
  const base = geometry();
  const badModels: unknown[] = [
    null, [], 'sphere', true, 1, {}, { shape: null }, { shape: ['sphere'] }, { shape: 'unknown' },
    { shape: 'sphere', radius: '2' }, { shape: 'sphere', radius: null }, { shape: 'sphere', radius: 0 },
    { shape: 'sphere', radius: -1 }, { shape: 'sphere', radius: 1e8 }, { shape: 'sphere', radius: { value: 2 } },
    { shape: 'sphere', radius: 1, faces: 'false' }, { shape: 'sphere', radius: 1, faces: null },
    { shape: 'sphere', radius: 1, unknown: true }, { shape: 'sphere', radius: 1, width: 2 },
    { shape: 'prism', radius: 1, height: 2, sides: 2 }, { shape: 'pyramid', radius: 1, height: 2, sides: 3.5 },
    { shape: 'cuboid', width: 2, depth: -1, height: 3 }, { shape: 'plane', width: 2, depth: 3, height: 1 },
  ];
  const { geometry: _geometry, ...withoutGeometry } = base;
  assert.throws(() => parsePlotSpec(payload(withoutGeometry)));
  for (const model of badModels) assert.throws(() => parsePlotSpec(JSON.stringify({ version: 1, ...base, geometry: model })), JSON.stringify(model));
  assert.throws(() => parsePlotSpec(payload(base).replace('"radius":2', '"radius":1e999')));
  assert.throws(() => parsePlotSpec(payload(base).replace('"radius":2', '"radius":-1e999')));
  assert.throws(() => parsePlotSpec(payload(base).replace('"shape":"sphere"', '"shape":"sphere","__proto__":{"polluted":true}')));
  assert.equal(({} as { polluted?: boolean }).polluted, undefined);
});

test('geometry rejects invalid zoom/camera, bounds, expressions and cross-mode settings', () => {
  const base = geometry();
  const badPatches: Record<string, unknown>[] = [
    { geometryZoom: null }, { geometryZoom: '1' }, { geometryZoom: 0 }, { geometryZoom: -1 }, { geometryZoom: 1e8 },
    { azimuth: null }, { azimuth: '45' }, { elevation: -90 }, { elevation: 100 },
    { xMin: -2 }, { yMax: 2 }, { expression: 'x^2' },
    { thetaMin: 0 }, { thetaMax: 6 }, { calculus: 'none' }, { integralMin: 0 }, { integralMax: 1 },
    { zMin: -1 }, { zMax: 1 }, { arbitrary: true },
  ];
  for (const patch of badPatches) assert.throws(() => parsePlotSpec(JSON.stringify({ version: 1, ...base, ...patch })), JSON.stringify(patch));
  assert.throws(() => parsePlotSpec(payload(base).replace('"geometryZoom":1.25', '"geometryZoom":1e999')));
  assert.throws(() => parsePlotSpec(payload(base).replace('"azimuth":137', '"azimuth":1e999')));
  for (const mode of [undefined, 'function', 'complex', 'polar', 'surface'] as const) {
    const spec: PlotSpec = { expression: mode === 'complex' ? '3+2i' : mode === 'surface' ? 'x+y' : mode === 'polar' ? '2*sin(theta)' : 'x', xMin: -1, xMax: 1, yMin: -1, yMax: 1, mode };
    for (const patch of [{ geometry: models[0] }, { geometryZoom: 1 }]) {
      assert.throws(() => parsePlotSpec(payload({ ...spec, ...patch })), `${mode} ${JSON.stringify(patch)}`);
      assert.equal(validateGraphSpec({ ...spec, ...patch }).ok, false, `${mode} direct renderer`);
      assert.equal(createGraph({ ...spec, ...patch }).ok, false, `${mode} render`);
    }
  }
});

test('previous version-1 graph types keep their format, unchanged saves and invalid-block protection', () => {
  const old: PlotSpec[] = [
    { expression: 'x^2', xMin: -3, xMax: 3, yMin: -1, yMax: 10 },
    { mode: 'function', expression: 'sin(x)', xMin: -3, xMax: 3, yMin: -1, yMax: 1, calculus: 'derivative' },
    { mode: 'complex', expression: '3+2i', xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
    { mode: 'polar', expression: '2*sin(theta)', xMin: -3, xMax: 3, yMin: -3, yMax: 3, thetaMin: 0, thetaMax: 2 * Math.PI },
    { mode: 'surface', expression: 'x+y', xMin: -2, xMax: 2, yMin: -2, yMax: 2, zMin: -4, zMax: 4, azimuth: 45, elevation: 30 },
  ];
  for (const spec of old) {
    const parsed = parsePlotSpec(payload(spec));
    const raw = '~~~vme-plot\r\n' + JSON.stringify({ version: 1, ...spec }, null, 1).replace(/\n/g, '\r\n') + '\r\n~~~~';
    const [block] = findPlotBlocks(raw);
    assert.ok(block, String(spec.mode));
    assert.deepEqual(block.spec, parsed);
    assert.equal(planGraphUpdate(raw, { snapshot: raw, from: block.from, to: block.to }, block.spec), raw);
    const crlfNote = 'Before\r\n\r\n' + raw + '\r\n\r\nAfter';
    const [crlfBlock] = findPlotBlocks(crlfNote);
    assert.equal(crlfNote.slice(crlfBlock.from, crlfBlock.to), raw);
    assert.equal(planGraphUpdate(crlfNote, { snapshot: crlfNote, from: crlfBlock.from, to: crlfBlock.to }, crlfBlock.spec), raw);
    assert.equal(createGraph(parsed).ok, true);
  }
  const invalid = '```vme-plot\n' + payload({ ...geometry(), mode: 'future-geometry' as PlotSpec['mode'] }) + '\n```';
  const snapshot = 'Before\n\n' + invalid + '\n\nAfter';
  assert.deepEqual(findPlotBlocks(snapshot), []);
  const target = { snapshot, from: snapshot.indexOf('```'), to: snapshot.lastIndexOf('```') + 3 };
  assert.throws(() => planGraphUpdate(snapshot, target, geometry()), /original graph/);
  assert.equal(snapshot, 'Before\n\n' + invalid + '\n\nAfter');
});


test('basic spatial relation states preserve signed offsets, angle/radius, faces and view', () => {
  const spatialModels: GeometryModel[] = [
    { shape: 'planes', angle: 0, offset: 0, faces: true },
    { shape: 'planes', angle: 0, offset: -1.5, faces: false },
    { shape: 'planes', angle: 45, offset: 1, faces: true },
    { shape: 'planes', angle: 90, offset: -2, faces: false },
    { shape: 'line-plane', angle: 0, offset: 0, faces: true },
    { shape: 'line-plane', angle: 0, offset: -1, faces: false },
    { shape: 'line-plane', angle: 30, offset: 1, faces: true },
    { shape: 'line-plane', angle: 90, offset: 0, faces: false },
    { shape: 'sphere-plane', radius: 1, offset: 0, faces: true },
    { shape: 'sphere-plane', radius: 1, offset: 1, faces: false },
    { shape: 'sphere-plane', radius: 1, offset: -1, faces: true },
    { shape: 'sphere-plane', radius: 1, offset: 2, faces: false },
    { shape: 'sphere-plane', radius: 0.1, offset: -4, faces: true },
    { shape: 'sphere-plane', radius: 4, offset: 4, faces: true },
  ];
  for (const model of spatialModels) {
    const spec = geometry(model, { azimuth: 222, elevation: 65, geometryZoom: 2.25 });
    const data = parsePlotSpec(payload(spec));
    assert.deepEqual(data.geometry, model);
    assert.equal(data.azimuth, 222); assert.equal(data.elevation, 65); assert.equal(data.geometryZoom, 2.25);
    const encoded = serializePlot(data);
    assert.deepEqual(findPlotBlocks(encoded)[0].spec, data);
    const rendered = createGraph(data);
    assert.equal(rendered.ok, true, JSON.stringify(model));
    if (rendered.ok) assert.match(rendered.svg, /^<svg\b/);
  }
});

test('spatial relation edits and saved view replace only their target and unchanged saves preserve raw bytes', () => {
  const first = geometry({ shape: 'sphere-plane', radius: 2, offset: -1, faces: false });
  const raw = '~~~~vme-plot \r\n' + JSON.stringify({ version: 1, ...first }, null, 2).replace(/\n/g, '\r\n') + '\r\n~~~~~';
  const second = serializePlot(geometry({ shape: 'planes', angle: 45, offset: -2, faces: true }));
  const prefix = '前文 α 😀\r\n\r\n', separator = '\r\n\r\nMiddle\r\n\r\n', suffix = '\r\n\r\n后文\r\n';
  const snapshot = prefix + raw + separator + second + suffix;
  const [block] = findPlotBlocks(snapshot);
  const target = { snapshot, from: block.from, to: block.to };
  assert.equal(replace(snapshot, target, planGraphUpdate(snapshot, target, block.spec)), snapshot);
  const edited = { ...block.spec, geometry: { shape: 'sphere-plane' as const, radius: 3, offset: -3, faces: true }, azimuth: 71, elevation: 55, geometryZoom: 0.8 };
  const changed = replace(snapshot, target, planGraphUpdate(snapshot, target, edited));
  assert.equal(changed, prefix + serializePlot(edited) + separator + second + suffix);
  assert.deepEqual(findPlotBlocks(changed)[0].spec, parsePlotSpec(payload(edited)));
  assert.deepEqual(findPlotBlocks(changed)[1].spec, findPlotBlocks(snapshot)[1].spec);
  assert.throws(() => planGraphUpdate(snapshot + 'EXTERNAL', target, edited), DocumentChangedError);
});

test('spatial schemas reject unrelated fields, malformed values and out-of-bounds parameters without replacing a note', () => {
  const models: Record<string, unknown>[] = [
    { shape: 'planes', angle: -1, offset: 0 }, { shape: 'planes', angle: 91, offset: 0 },
    { shape: 'planes', angle: '45', offset: 0 }, { shape: 'planes', angle: null, offset: 0 },
    { shape: 'planes', angle: 45, offset: -4.001 }, { shape: 'planes', angle: 45, offset: 4.001 },
    { shape: 'planes', angle: 45, offset: '0' }, { shape: 'planes', angle: 45, offset: null },
    { shape: 'planes', angle: 45, offset: 0, radius: 1 }, { shape: 'planes', angle: 45, offset: 0, width: 2 },
    { shape: 'line-plane', angle: 30, offset: 0, height: 2 }, { shape: 'line-plane', angle: 30, offset: 0, sides: 3 },
    { shape: 'sphere-plane', radius: 0.099, offset: 0 }, { shape: 'sphere-plane', radius: 4.001, offset: 0 },
    { shape: 'sphere-plane', radius: 1, offset: 0, angle: 45 }, { shape: 'sphere-plane', radius: 1, offset: 0, random: true },
    { shape: 'sphere', radius: 1, offset: 0 }, { shape: 'plane', width: 2, depth: 2, angle: 45 },
  ];
  for (const model of models) {
    const source = JSON.stringify({ version: 1, ...geometry(), geometry: model });
    assert.throws(() => parsePlotSpec(source), JSON.stringify(model));
    const raw = '```vme-plot\n' + source + '\n```';
    const snapshot = 'Before\n\n' + raw + '\n\nAfter';
    assert.deepEqual(findPlotBlocks(snapshot), []);
    const target = { snapshot, from: snapshot.indexOf('```'), to: snapshot.lastIndexOf('```') + 3 };
    assert.throws(() => planGraphUpdate(snapshot, target, geometry()), /original graph/);
    assert.equal(snapshot, 'Before\n\n' + raw + '\n\nAfter');
  }
  for (const replacement of ['"angle":1e999', '"angle":-1e999']) assert.throws(() => parsePlotSpec(payload(geometry({ shape: 'planes', angle: 45, offset: 0 })).replace('"angle":45', replacement)));
  for (const replacement of ['"offset":1e999', '"offset":-1e999']) assert.throws(() => parsePlotSpec(payload(geometry({ shape: 'planes', angle: 45, offset: 0 })).replace('"offset":0', replacement)));
});
