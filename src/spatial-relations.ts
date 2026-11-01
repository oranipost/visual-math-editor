import type { PlotFailure, PlotSpec } from './plot-engine';

/** These fixed teaching scenes use infinite mathematical objects with finite display patches. */
export type SpatialShape = 'planes' | 'line-plane' | 'sphere-plane';
export interface SpatialRelationModel { shape: SpatialShape; angle?: number; offset: number; radius?: number; faces: boolean }
export interface SpatialPoint { x: number; y: number; z: number }
export type SpatialRelationState = 'planes-intersecting' | 'planes-parallel' | 'planes-coincident' | 'line-intersecting' | 'line-parallel' | 'line-contained' | 'sphere-circle' | 'sphere-tangent' | 'sphere-disjoint';
export interface SpatialAnalysis {
  ok: true; model: SpatialRelationModel; relation: SpatialRelationState; approximate: boolean; outsideView: boolean; patchExtent: number;
  intersection?: { kind: 'line' | 'point' | 'circle'; point?: SpatialPoint; direction?: SpatialPoint; radius?: number };
}
export interface SpatialLabels {
  title: string; planes: string; 'line-plane': string; 'sphere-plane': string; description: string;
  angle: string; offset: string; radius: string; view: string; approximate: string; outsideView: string; finitePatches: string;
  'planes-intersecting': string; 'planes-parallel': string; 'planes-coincident': string; 'line-intersecting': string; 'line-parallel': string; 'line-contained': string; 'sphere-circle': string; 'sphere-tangent': string; 'sphere-disjoint': string;
}
export type SpatialPlotResult = PlotFailure | { ok: true; spec: PlotSpec; svg: string; segments: []; sampleCount: number; analysis: SpatialAnalysis };
export const SPATIAL_LIMITS = Object.freeze({ minimumAngle: 0, maximumAngle: 90, minimumOffset: -4, maximumOffset: 4, minimumRadius: 0.1, maximumRadius: 4, nearAngleDegrees: 1e-6, nearRelativeDistance: 1e-9, sphereSectors: 24, sphereRings: 12 });
const LABELS: SpatialLabels = {
  title: 'Spatial relations', planes: 'Two planes', 'line-plane': 'Line and plane', 'sphere-plane': 'Sphere and plane', angle: 'Angle', offset: 'Offset', radius: 'Radius', view: 'View',
  description: 'Fixed spatial-relation teaching scene. Conclusions describe infinite planes and lines; the displayed patches and line segments are finite. Equal-scale orthographic view. Curved surfaces are polygonal approximations.',
  approximate: 'Near a critical case: the displayed relation is a numerical approximation; inputs were not snapped.',
  outsideView: 'The intersection lies outside the shown view.', finitePatches: 'Infinite planes and lines; finite displayed patches.',
  'planes-intersecting': 'Planes intersect in a line.', 'planes-parallel': 'Planes are parallel and distinct.', 'planes-coincident': 'Planes coincide.',
  'line-intersecting': 'The line intersects the plane at one point.', 'line-parallel': 'The line is parallel to and outside the plane.', 'line-contained': 'The line lies in the plane.',
  'sphere-circle': 'The plane cuts the sphere in a circle.', 'sphere-tangent': 'The plane is tangent to the sphere at one point.', 'sphere-disjoint': 'The plane and sphere do not intersect.',
};
const failure = (error: string): PlotFailure => ({ ok: false, error });
function dataObject(value: unknown, allowed: readonly string[]): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype) return undefined;
  const keys = Reflect.ownKeys(value);
  if (keys.length > allowed.length || keys.some(key => typeof key !== 'string' || !allowed.includes(key))) return undefined;
  const data: Record<string, unknown> = Object.create(null);
  for (const key of keys as string[]) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) return undefined;
    data[key] = descriptor.value;
  }
  return data;
}
export function validateSpatialRelationModel(input: unknown): { ok: true; model: SpatialRelationModel } | PlotFailure {
  try {
    const value = dataObject(input, ['shape', 'angle', 'offset', 'radius', 'faces']);
    if (!value || !['planes', 'line-plane', 'sphere-plane'].includes(value.shape as string)) return failure('Use a supported spatial-relation scene and its applicable settings.');
    const shape = value.shape as SpatialShape, sphere = shape === 'sphere-plane';
    if ((sphere && Object.hasOwn(value, 'angle')) || (!sphere && Object.hasOwn(value, 'radius')) || (value.faces !== undefined && typeof value.faces !== 'boolean')) return failure('Use a supported spatial-relation scene and its applicable settings.');
    const offset = value.offset === undefined ? shape === 'planes' ? 0 : sphere ? 0.5 : 1 : value.offset;
    if (typeof offset !== 'number' || !Number.isFinite(offset) || offset < -4 || offset > 4) return failure('Use a finite signed offset between -4 and 4.');
    const model: SpatialRelationModel = { shape, offset, faces: value.faces === undefined ? true : value.faces };
    if (sphere) {
      const radius = value.radius === undefined ? 1 : value.radius;
      if (typeof radius !== 'number' || !Number.isFinite(radius) || radius < 0.1 || radius > 4) return failure('Use a finite sphere radius between 0.1 and 4.');
      model.radius = radius;
    } else {
      const angle = value.angle === undefined ? shape === 'planes' ? 45 : 30 : value.angle;
      if (typeof angle !== 'number' || !Number.isFinite(angle) || angle < 0 || angle > 90) return failure('Use a finite angle between 0 and 90 degrees.');
      model.angle = angle;
    }
    return { ok: true, model };
  } catch { return failure('Use a supported spatial-relation scene and its applicable settings.'); }
}
function trig(angle: number): { sin: number; cos: number } {
  if (angle === 0) return { sin: 0, cos: 1 };
  if (angle === 90) return { sin: 1, cos: 0 };
  const radians = angle * Math.PI / 180;
  return { sin: Math.sin(radians), cos: Math.cos(radians) };
}

/** Exact input comparisons determine the case. Tolerances only warn; they never snap a model. */
export function analyzeSpatialRelation(input: unknown): SpatialAnalysis | PlotFailure {
  const checked = validateSpatialRelationModel(input);
  if (!checked.ok) return checked;
  const model = checked.model, offset = model.offset, patchExtent = Math.max(2.5, Math.abs(offset) * 1.15, model.shape === 'sphere-plane' ? model.radius! * 1.3 : 0);
  const common = { ok: true as const, model, approximate: false, outsideView: false, patchExtent };
  if (model.shape === 'sphere-plane') {
    const radius = model.radius!, difference = radius - Math.abs(offset);
    const approximate = difference !== 0 && Math.abs(difference) <= SPATIAL_LIMITS.nearRelativeDistance * Math.max(1, radius, Math.abs(offset));
    if (difference < 0) return { ...common, approximate, relation: 'sphere-disjoint' };
    const point = { x: 0, y: 0, z: offset };
    if (difference === 0) return { ...common, relation: 'sphere-tangent', intersection: { kind: 'point', point } };
    return { ...common, approximate, relation: 'sphere-circle', intersection: { kind: 'circle', point, radius: Math.sqrt(difference * (radius + Math.abs(offset))) } };
  }
  const angle = model.angle!;
  if (angle === 0) {
    const approximate = offset !== 0 && Math.abs(offset) <= SPATIAL_LIMITS.nearRelativeDistance;
    return { ...common, approximate, relation: model.shape === 'planes' ? offset === 0 ? 'planes-coincident' : 'planes-parallel' : offset === 0 ? 'line-contained' : 'line-parallel' };
  }
  const { sin, cos } = trig(angle), approximate = angle <= SPATIAL_LIMITS.nearAngleDegrees;
  // A nonzero positive degree may underflow during radians conversion. Its mathematical
  // intersection remains outside this bounded view unless offset itself is zero.
  const x = offset === 0 ? 0 : model.shape === 'planes' ? offset / sin : -(offset / sin) * cos;
  const point = Number.isFinite(x) ? { x: x === 0 ? 0 : x, y: 0, z: 0 } : undefined;
  const relation = model.shape === 'planes' ? 'planes-intersecting' : 'line-intersecting';
  return { ...common, approximate, relation, outsideView: !point || Math.abs(point.x) > patchExtent,
    intersection: model.shape === 'planes' ? { kind: 'line', point, direction: { x: 0, y: 1, z: 0 } } : { kind: 'point', point } };
}

function project(point: SpatialPoint, azimuth: number, elevation: number): SpatialPoint {
  const a = azimuth * Math.PI / 180, e = elevation * Math.PI / 180, d = point.x * Math.sin(a) + point.y * Math.cos(a);
  return { x: point.x * Math.cos(a) - point.y * Math.sin(a), y: point.z * Math.cos(e) - d * Math.sin(e), z: point.z * Math.sin(e) + d * Math.cos(e) };
}
function pointLerp(a: SpatialPoint, b: SpatialPoint, t: number): SpatialPoint { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }; }
function planePatch(normal: SpatialPoint, offset: number, extent: number): SpatialPoint[] {
  const vertices: SpatialPoint[] = [];
  for (const x of [-extent, extent]) for (const y of [-extent, extent]) for (const z of [-extent, extent]) vertices.push({ x, y, z });
  const result: SpatialPoint[] = [];
  const add = (p: SpatialPoint): void => { if (!result.some(q => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < extent * 1e-10)) result.push(p); };
  const distance = (p: SpatialPoint): number => normal.x * p.x + normal.y * p.y + normal.z * p.z - offset;
  for (let i = 0; i < vertices.length; i++) for (let j = i + 1; j < vertices.length; j++) {
    const a = vertices[i], b = vertices[j];
    if ([a.x !== b.x, a.y !== b.y, a.z !== b.z].filter(Boolean).length !== 1) continue;
    const da = distance(a), db = distance(b);
    if (da === 0) add(a); if (db === 0) add(b);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) add(pointLerp(a, b, da / (da - db)));
  }
  if (result.length < 3) return [];
  const center = result.reduce((p, q) => ({ x: p.x + q.x / result.length, y: p.y + q.y / result.length, z: p.z + q.z / result.length }), { x: 0, y: 0, z: 0 });
  // Normals lie in XZ, so Y and (-nz,0,nx) give an orthogonal basis on the plane.
  return result.sort((a, b) => Math.atan2(a.y - center.y, -(a.x - center.x) * normal.z + (a.z - center.z) * normal.x) - Math.atan2(b.y - center.y, -(b.x - center.x) * normal.z + (b.z - center.z) * normal.x));
}
function linePatch(origin: SpatialPoint, direction: SpatialPoint, extent: number): SpatialPoint[] {
  let minimum = -Infinity, maximum = Infinity;
  for (const key of ['x', 'y', 'z'] as const) {
    if (direction[key] === 0) { if (Math.abs(origin[key]) > extent) return []; continue; }
    const a = (-extent - origin[key]) / direction[key], b = (extent - origin[key]) / direction[key];
    minimum = Math.max(minimum, Math.min(a, b)); maximum = Math.min(maximum, Math.max(a, b));
  }
  if (minimum > maximum || !Number.isFinite(minimum) || !Number.isFinite(maximum)) return [];
  return [minimum, maximum].map(t => ({ x: origin.x + direction.x * t, y: origin.y + direction.y * t, z: origin.z + direction.z * t }));
}
const xml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const decimal = (number: number): string => Number(number.toFixed(3)).toString();
const displayNumber = (number: number): string => Number(number.toPrecision(6)).toString();
function segmentVisible(a: SpatialPoint, b: SpatialPoint): boolean {
  let start = 0, end = 1;
  for (const [key, low, high] of [['x', 40, 760], ['y', 55, 355]] as const) {
    const delta = b[key] - a[key];
    if (delta === 0) { if (a[key] < low || a[key] > high) return false; continue; }
    const first = (low - a[key]) / delta, second = (high - a[key]) / delta;
    start = Math.max(start, Math.min(first, second)); end = Math.min(end, Math.max(first, second));
    if (start > end) return false;
  }
  return true;
}

let nextSpatialFrame = 0;

export function createSpatialRelationPlot(input: PlotSpec, customLabels: Partial<SpatialLabels> = {}): SpatialPlotResult {
  try {
    const values = dataObject(input, ['mode', 'expression', 'xMin', 'xMax', 'yMin', 'yMax', 'geometry', 'azimuth', 'elevation', 'geometryZoom']);
    if (!values || values.mode !== 'geometry' || values.expression !== '' || values.xMin !== -1 || values.xMax !== 1 || values.yMin !== -1 || values.yMax !== 1) return failure('Use only supported geometry settings and dimensions.');
    const analysis = analyzeSpatialRelation(values.geometry);
    if (!analysis.ok) return analysis;
    const azimuth = values.azimuth === undefined ? 45 : values.azimuth, elevation = values.elevation === undefined ? 30 : values.elevation, zoom = values.geometryZoom === undefined ? 1 : values.geometryZoom;
    if (typeof azimuth !== 'number' || !Number.isFinite(azimuth) || typeof elevation !== 'number' || !Number.isFinite(elevation) || elevation < 10 || elevation > 80 || typeof zoom !== 'number' || !Number.isFinite(zoom) || zoom < 0.25 || zoom > 4) return failure('Use a finite camera angle, elevation from 10 to 80 degrees, and zoom from 0.25 to 4.');
    const normalizedAzimuth = ((azimuth % 360) + 360) % 360;
    const spec: PlotSpec = { mode: 'geometry', expression: '', xMin: -1, xMax: 1, yMin: -1, yMax: 1, geometry: { ...analysis.model }, azimuth: normalizedAzimuth, elevation, geometryZoom: zoom };
    const labels = { ...LABELS };
    for (const key of Object.keys(labels) as (keyof SpatialLabels)[]) if (typeof customLabels[key] === 'string') labels[key] = customLabels[key]!.slice(0, 600);
    const extent = analysis.patchExtent, scale = 82 / extent * zoom, model = analysis.model;
    const screen = (point: SpatialPoint): SpatialPoint => { const p = project(point, normalizedAzimuth, elevation); return { x: 400 + p.x * scale, y: 207 - p.y * scale, z: p.z }; };
    const inside = (p: SpatialPoint): boolean => p.x >= 40 && p.x <= 760 && p.y >= 55 && p.y <= 355;
    const polygons: { points: SpatialPoint[]; color: string; opacity: number }[] = [];
    const outlines: { points: SpatialPoint[]; color: string; closed: boolean; width: number }[] = [];
    let sampleCount = 0;
    const addPlane = (normal: SpatialPoint, offset: number, color: string): void => {
      const points = planePatch(normal, offset, extent); sampleCount += points.length;
      if (!points.length) return;
      if (model.faces) polygons.push({ points, color, opacity: 0.27 });
      outlines.push({ points, color, closed: true, width: 1.5 });
    };
    addPlane({ x: 0, y: 0, z: 1 }, model.shape === 'sphere-plane' ? model.offset : 0, '#3b82f6');
    if (model.shape === 'planes') {
      const angle = trig(model.angle!); addPlane({ x: angle.sin, y: 0, z: angle.cos }, model.offset, '#f59e0b');
    } else if (model.shape === 'line-plane') {
      const angle = trig(model.angle!), points = linePatch({ x: 0, y: 0, z: model.offset }, { x: angle.cos, y: 0, z: angle.sin }, extent);
      sampleCount += points.length; if (points.length) outlines.push({ points, color: '#7c3aed', closed: false, width: 3 });
    } else {
      const radius = model.radius!, sectors = SPATIAL_LIMITS.sphereSectors, rings = SPATIAL_LIMITS.sphereRings;
      const at = (row: number, column: number): SpatialPoint => {
        if (row === 0) return { x: 0, y: 0, z: radius };
        if (row === rings) return { x: 0, y: 0, z: -radius };
        const a = row * Math.PI / rings, b = column * Math.PI * 2 / sectors;
        return { x: radius * Math.sin(a) * Math.cos(b), y: radius * Math.sin(a) * Math.sin(b), z: radius * Math.cos(a) };
      };
      for (let row = 0; row < rings; row++) for (let column = 0; column < sectors; column++) {
        const a = at(row, column), b = at(row + 1, column), c = at(row + 1, column + 1), d = at(row, column + 1);
        sampleCount += 4;
        if (model.faces) {
          if (row > 0) polygons.push({ points: [a, b, d], color: '#64748b', opacity: 0.12 });
          if (row < rings - 1) polygons.push({ points: [d, b, c], color: '#64748b', opacity: 0.12 });
        }
      }
      for (let row = 1; row < rings; row += 2) outlines.push({ points: Array.from({ length: sectors }, (_, column) => at(row, column)), color: '#64748b', closed: true, width: 0.7 });
      for (let column = 0; column < sectors; column += 3) outlines.push({ points: Array.from({ length: rings + 1 }, (_, row) => at(row, column)), color: '#64748b', closed: false, width: 0.7 });
    }
    const shapePath = (points: SpatialPoint[], closed: boolean): string => points.map((point, index) => { const p = screen(point); return `${index === 0 ? 'M' : 'L'}${decimal(p.x)},${decimal(p.y)}`; }).join(' ') + (closed ? ' Z' : '');
    const filled = polygons.map(polygon => ({ ...polygon, projected: polygon.points.map(screen) })).sort((a, b) => a.projected.reduce((sum, point) => sum + point.z / a.projected.length, 0) - b.projected.reduce((sum, point) => sum + point.z / b.projected.length, 0)).map(polygon => `<path d="${shapePath(polygon.points, true)}" fill="${polygon.color}" fill-opacity="${polygon.opacity}" stroke="none"/>`).join('');
    const edges = outlines.map(line => `<path d="${shapePath(line.points, line.closed)}" fill="none" stroke="${line.color}" stroke-width="${line.width}" stroke-opacity="0.8"/>`).join('');
    const highlighted: string[] = [];
    const intersection = analysis.intersection;
    if (intersection?.point && !analysis.outsideView) {
      if (intersection.kind === 'line') {
        const line = linePatch(intersection.point, intersection.direction!, extent), projected = line.map(screen);
        analysis.outsideView = projected.length < 2 || !segmentVisible(projected[0], projected[1]);
        if (!analysis.outsideView) highlighted.push(`<path data-spatial-intersection="line" d="${shapePath(line, false)}" fill="none" stroke="#b91c1c" stroke-width="3.5"/>`);
      } else if (intersection.kind === 'circle') {
        const points = Array.from({ length: 129 }, (_, index) => ({ x: intersection.radius! * Math.cos(index * Math.PI / 64), y: intersection.radius! * Math.sin(index * Math.PI / 64), z: intersection.point!.z }));
        sampleCount += points.length; const projected = points.map(screen);
        analysis.outsideView = !projected.some(inside) && !projected.slice(1).some((point, index) => segmentVisible(projected[index], point));
        if (!analysis.outsideView) highlighted.push(`<path data-spatial-intersection="circle" d="${shapePath(points, true)}" fill="none" stroke="#b91c1c" stroke-width="3"/>`);
      } else {
        const p = screen(intersection.point); analysis.outsideView = !inside(p);
        if (!analysis.outsideView) highlighted.push(`<circle data-spatial-intersection="point" cx="${decimal(p.x)}" cy="${decimal(p.y)}" r="5.5" fill="#dc2626" stroke="#fff" stroke-width="1.5"/>`);
      }
    }
    const title = `${labels.title}: ${labels[model.shape]}`, id = `vme-spatial-frame-${++nextSpatialFrame}`;
    const parameters = model.shape === 'sphere-plane' ? `${labels.radius} = ${displayNumber(model.radius!)} · ${labels.offset} = ${displayNumber(model.offset)}` : `${labels.angle} = ${displayNumber(model.angle!)}° · ${labels.offset} = ${displayNumber(model.offset)}`;
    const triad = [{ label: 'X', point: { x: 1, y: 0, z: 0 }, color: '#b91c1c' }, { label: 'Y', point: { x: 0, y: 1, z: 0 }, color: '#15803d' }, { label: 'Z', point: { x: 0, y: 0, z: 1 }, color: '#1d4ed8' }].map(axis => {
      const p = project(axis.point, normalizedAzimuth, elevation);
      return `<g stroke="${axis.color}" fill="${axis.color}"><line x1="95" y1="306" x2="${decimal(95 + 28 * p.x)}" y2="${decimal(306 - 28 * p.y)}" stroke-width="2"/><text x="${decimal(95 + 43 * p.x)}" y="${decimal(311 - 43 * p.y)}" text-anchor="middle" font-size="15" stroke="none">${axis.label}</text></g>`;
    }).join('');
    const caption = (text: string, y: number, size = 13, color = '#334155'): string => `<text data-vme-plot-caption="footer" x="400" y="${y}" text-anchor="middle" font-size="${size}" fill="${color}">${xml(text)}</text>`;
    const svg = `<svg data-vme-plot="geometry" data-relation-state="${analysis.relation}" data-relation-approximate="${analysis.approximate}" data-relation-outside="${analysis.outsideView}" xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480" style="max-width:100%;height:auto" role="img" aria-label="${xml(title)}"><title>${xml(title)}</title><desc>${xml(labels.description)}</desc><defs><clipPath id="${id}"><rect x="40" y="55" width="720" height="300" rx="4"/></clipPath></defs><rect width="800" height="480" rx="12" fill="#fff"/><g font-family="system-ui,sans-serif"><text data-vme-plot-caption="title" x="40" y="32" font-size="18" fill="#1f2937" font-weight="600">${xml(title)}</text><rect data-plot-frame="true" x="40" y="55" width="720" height="300" rx="4" fill="#f8fafc" stroke="#e2e8f0"/><g clip-path="url(#${id})">${filled}${edges}${highlighted.join('')}</g>${triad}${caption(labels[analysis.relation], 382, 14)}${caption(parameters, 407)}${analysis.approximate ? caption(labels.approximate, 430, 11, '#92400e') : ''}${analysis.outsideView ? caption(labels.outsideView, 447, 12, '#92400e') : ''}${caption(labels.finitePatches, 462, 10, '#64748b')}${caption(`${labels.view} ${displayNumber(normalizedAzimuth)}° / ${displayNumber(elevation)}° · ${displayNumber(zoom)}×`, 476, 10, '#64748b')}</g></svg>`;
    return { ok: true, spec, svg, segments: [], sampleCount, analysis };
  } catch { return failure('The spatial-relation scene could not be generated.'); }
}
