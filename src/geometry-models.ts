import type { PlotFailure, PlotSpec } from './plot-engine';
import { validateSpatialRelationModel } from './spatial-relations';
import type { GeometryModel, SolidGeometryShape } from './geometry-types';
import { validPlotBounds } from './plot-interaction';

export interface GeometryPoint { x: number; y: number; z: number }
export interface GeometryMesh {
  vertices: GeometryPoint[];
  /** Outward oriented triangles; the plane uses its positive Z side. */
  triangles: [number, number, number][];
  /** Shape edges and curved-surface grid lines, excluding triangulation diagonals. */
  edges: [number, number][];
}
export type GeometrySpec = PlotSpec & {
  mode: 'geometry'; geometry: GeometryModel; azimuth: number; elevation: number; geometryZoom: number;
};
export interface GeometryLabels {
  title: string; sphere: string; cylinder: string; cone: string; pyramid: string; prism: string; cuboid: string; plane: string;
  radius: string; width: string; depth: string; height: string; sides: string; description: string; view: string;
}
export type GeometryPlotResult = PlotFailure | {
  ok: true; spec: GeometrySpec; svg: string; segments: []; sampleCount: number; mesh: GeometryMesh;
};

export const GEOMETRY_LIMITS = Object.freeze({ minimumLength: 0.001, maximumLength: 1000, maximumRatio: 1000, minimumSides: 3, maximumSides: 12, minimumZoom: 0.25, maximumZoom: 4, radialSegments: 32, sphereRings: 16 });
export const DEFAULT_GEOMETRY_SPEC: Readonly<GeometrySpec> = Object.freeze({
  mode: 'geometry', expression: '', xMin: -1, xMax: 1, yMin: -1, yMax: 1,
  geometry: Object.freeze({ shape: 'sphere', radius: 1, faces: true }), azimuth: 45, elevation: 30, geometryZoom: 1,
});
const DEFAULT_LABELS: GeometryLabels = {
  title: 'Geometry', sphere: 'Sphere', cylinder: 'Cylinder', cone: 'Cone', pyramid: 'Regular pyramid', prism: 'Regular prism', cuboid: 'Cuboid', plane: 'Plane',
  radius: 'Radius', width: 'Width', depth: 'Depth', height: 'Height', sides: 'Sides', view: 'View',
  description: 'Orthographic view with equal scale on X, Y and Z. Regular bases use the center-to-vertex radius. Curved surfaces are polygonal approximations.',
};
const SHAPE_DIMENSIONS: Record<SolidGeometryShape, readonly ('radius' | 'width' | 'depth' | 'height' | 'sides')[]> = {
  sphere: ['radius'], cylinder: ['radius', 'height'], cone: ['radius', 'height'], pyramid: ['radius', 'height', 'sides'],
  prism: ['radius', 'height', 'sides'], cuboid: ['width', 'depth', 'height'], plane: ['width', 'depth'],
};
const DIMENSION_DEFAULTS = { radius: 1, width: 2, depth: 2, height: 2, sides: 4 };
const wrapAngle = (angle: number): number => ((angle % 360) + 360) % 360;
const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));
const failure = (error: string): PlotFailure => ({ ok: false, error });

/** Inspect data descriptors without invoking getters or accepting prototype-bearing custom objects. */
function plainData(value: unknown, allowed: readonly string[]): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype) return undefined;
  const keys = Reflect.ownKeys(value);
  if (keys.length > allowed.length || keys.some(key => typeof key !== 'string' || !allowed.includes(key))) return undefined;
  const result: Record<string, unknown> = Object.create(null);
  for (const key of keys as string[]) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) return undefined;
    result[key] = descriptor.value;
  }
  return result;
}

/** Bounded numeric data only. Geometry is never passed to the equation parser. */
export function validateGeometrySpec(input: PlotSpec): { ok: true; spec: GeometrySpec } | PlotFailure {
  try {
    const value = plainData(input, ['mode', 'expression', 'xMin', 'xMax', 'yMin', 'yMax', 'geometry', 'azimuth', 'elevation', 'geometryZoom']);
    if (!value || value.mode !== 'geometry') return failure('Use only supported geometry settings and dimensions.');
    if (value.expression !== '' || !validPlotBounds(value as unknown as PlotSpec) || value.xMin !== -1 || value.xMax !== 1 || value.yMin !== -1 || value.yMax !== 1) return failure('Use an empty geometry expression and valid X/Y bounds.');
    const model = plainData(value.geometry, ['shape', 'radius', 'width', 'depth', 'height', 'sides', 'faces', 'angle', 'offset']);
    if (!model) return failure('Use only supported geometry settings and dimensions.');
    let geometry: GeometryModel;
    if (model.shape === 'planes' || model.shape === 'line-plane' || model.shape === 'sphere-plane') {
      const spatial = validateSpatialRelationModel(model);
      if (!spatial.ok) return spatial;
      geometry = spatial.model;
    } else {
      if (typeof model.shape !== 'string' || !Object.hasOwn(SHAPE_DIMENSIONS, model.shape)) return failure('Choose a supported geometric solid or plane.');
      const shape = model.shape as SolidGeometryShape, dimensions = SHAPE_DIMENSIONS[shape];
      if (Object.keys(model).some(key => key !== 'shape' && key !== 'faces' && !dimensions.includes(key as typeof dimensions[number]))
        || (model.faces !== undefined && typeof model.faces !== 'boolean')) return failure('Use only supported geometry settings and dimensions.');
      geometry = { shape, faces: model.faces === undefined ? true : model.faces };
      const lengths: number[] = [];
      for (const key of dimensions) {
        const dimension = model[key] === undefined ? DIMENSION_DEFAULTS[key] : model[key];
        if (key === 'sides') {
          if (typeof dimension !== 'number' || !Number.isInteger(dimension) || dimension < GEOMETRY_LIMITS.minimumSides || dimension > GEOMETRY_LIMITS.maximumSides) return failure('Use 3 to 12 whole sides for a regular pyramid or prism.');
        } else {
          if (typeof dimension !== 'number' || !Number.isFinite(dimension) || dimension < GEOMETRY_LIMITS.minimumLength || dimension > GEOMETRY_LIMITS.maximumLength) return failure('Lengths must be finite numbers between 0.001 and 1000.');
          lengths.push(dimension);
        }
        geometry[key] = dimension;
      }
      if (Math.max(...lengths) / Math.min(...lengths) > GEOMETRY_LIMITS.maximumRatio) return failure('Dimension ratios above 1000:1 are not supported.');
    }
    const azimuth = value.azimuth === undefined ? DEFAULT_GEOMETRY_SPEC.azimuth : value.azimuth;
    const elevation = value.elevation === undefined ? DEFAULT_GEOMETRY_SPEC.elevation : value.elevation;
    const geometryZoom = value.geometryZoom === undefined ? DEFAULT_GEOMETRY_SPEC.geometryZoom : value.geometryZoom;
    if (typeof azimuth !== 'number' || !Number.isFinite(azimuth) || typeof elevation !== 'number' || !Number.isFinite(elevation) || elevation < 10 || elevation > 80
      || typeof geometryZoom !== 'number' || !Number.isFinite(geometryZoom) || geometryZoom < GEOMETRY_LIMITS.minimumZoom || geometryZoom > GEOMETRY_LIMITS.maximumZoom) return failure('Use a finite camera angle, elevation from 10 to 80 degrees, and zoom from 0.25 to 4.');
    return { ok: true, spec: { mode: 'geometry', expression: '', xMin: value.xMin as number, xMax: value.xMax as number, yMin: value.yMin as number, yMax: value.yMax as number, geometry, azimuth: wrapAngle(azimuth), elevation, geometryZoom } };
  } catch {
    return failure('Use only supported geometry settings and dimensions.');
  }
}

export function rotateGeometryCamera(input: PlotSpec, deltaAzimuth: number, deltaElevation: number): GeometrySpec | undefined {
  const checked = validateGeometrySpec(input);
  if (!checked.ok || !Number.isFinite(deltaAzimuth) || !Number.isFinite(deltaElevation)) return undefined;
  return { ...checked.spec, azimuth: wrapAngle(checked.spec.azimuth + deltaAzimuth % 360), elevation: clamp(checked.spec.elevation + deltaElevation, 10, 80) };
}

/** Factors below one zoom in. Lengths, shape, and the orthographic proportions stay unchanged. */
export function zoomGeometryView(input: PlotSpec, factor: number): GeometrySpec | undefined {
  const checked = validateGeometrySpec(input);
  if (!checked.ok || !Number.isFinite(factor) || factor <= 0) return undefined;
  return { ...checked.spec, geometryZoom: clamp(checked.spec.geometryZoom / factor, GEOMETRY_LIMITS.minimumZoom, GEOMETRY_LIMITS.maximumZoom) };
}

function cross(a: GeometryPoint, b: GeometryPoint): GeometryPoint { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }; }
function subtract(a: GeometryPoint, b: GeometryPoint): GeometryPoint { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
const dot = (a: GeometryPoint, b: GeometryPoint): number => a.x * b.x + a.y * b.y + a.z * b.z;
function normal(mesh: GeometryMesh, triangle: readonly number[]): GeometryPoint { return cross(subtract(mesh.vertices[triangle[1]], mesh.vertices[triangle[0]]), subtract(mesh.vertices[triangle[2]], mesh.vertices[triangle[0]])); }

/** The input must come from validateGeometrySpec. Mesh budgets are fixed and independent of lengths. */
export function buildGeometryMesh(spec: GeometrySpec): GeometryMesh {
  const mesh: GeometryMesh = { vertices: [], triangles: [], edges: [] };
  const model = spec.geometry, radius = model.radius ?? 1, halfHeight = (model.height ?? 2) / 2;
  if (!Object.hasOwn(SHAPE_DIMENSIONS, model.shape)) throw new Error('Spatial scenes use the spatial renderer.');
  const vertex = (x: number, y: number, z: number): number => mesh.vertices.push({ x, y, z }) - 1;
  const triangle = (a: number, b: number, c: number): void => { mesh.triangles.push([a, b, c]); };
  const edge = (a: number, b: number): void => { mesh.edges.push([a, b]); };
  if (model.shape === 'sphere') {
    const sectors = GEOMETRY_LIMITS.radialSegments, rings = GEOMETRY_LIMITS.sphereRings;
    const north = vertex(0, 0, radius);
    for (let row = 1; row < rings; row++) {
      const latitude = Math.PI * row / rings;
      for (let column = 0; column < sectors; column++) {
        const longitude = 2 * Math.PI * column / sectors;
        vertex(radius * Math.sin(latitude) * Math.cos(longitude), radius * Math.sin(latitude) * Math.sin(longitude), radius * Math.cos(latitude));
      }
    }
    const south = vertex(0, 0, -radius);
    const at = (row: number, column: number): number => 1 + row * sectors + (column + sectors) % sectors;
    for (let column = 0; column < sectors; column++) {
      triangle(north, at(0, column), at(0, column + 1));
      triangle(south, at(rings - 2, column + 1), at(rings - 2, column));
      edge(north, at(0, column)); edge(at(rings - 2, column), south);
    }
    for (let row = 0; row < rings - 1; row++) for (let column = 0; column < sectors; column++) {
      edge(at(row, column), at(row, column + 1));
      if (row < rings - 2) {
        triangle(at(row, column), at(row + 1, column), at(row + 1, column + 1));
        triangle(at(row, column), at(row + 1, column + 1), at(row, column + 1));
        edge(at(row, column), at(row + 1, column));
      }
    }
  } else if (model.shape === 'cylinder' || model.shape === 'cone' || model.shape === 'prism' || model.shape === 'pyramid') {
    const curved = model.shape === 'cylinder' || model.shape === 'cone';
    const pointed = model.shape === 'cone' || model.shape === 'pyramid';
    const sides = curved ? GEOMETRY_LIMITS.radialSegments : model.sides!;
    for (let index = 0; index < sides; index++) {
      const angle = 2 * Math.PI * index / sides;
      vertex(radius * Math.cos(angle), radius * Math.sin(angle), -halfHeight);
    }
    if (pointed) {
      const apex = vertex(0, 0, halfHeight), bottom = vertex(0, 0, -halfHeight);
      for (let index = 0; index < sides; index++) {
        const next = (index + 1) % sides;
        triangle(index, next, apex); triangle(bottom, next, index); edge(index, next);
        if (!curved || index % 4 === 0) edge(index, apex);
      }
    } else {
      for (let index = 0; index < sides; index++) {
        const base = mesh.vertices[index]; vertex(base.x, base.y, halfHeight);
      }
      const bottom = vertex(0, 0, -halfHeight), top = vertex(0, 0, halfHeight);
      for (let index = 0; index < sides; index++) {
        const next = (index + 1) % sides;
        triangle(index, next, sides + next); triangle(index, sides + next, sides + index);
        triangle(bottom, next, index); triangle(top, sides + index, sides + next);
        edge(index, next); edge(sides + index, sides + next);
        if (!curved || index % 4 === 0) edge(index, sides + index);
      }
    }
  } else {
    const halfWidth = model.width! / 2, halfDepth = model.depth! / 2;
    for (const z of model.shape === 'plane' ? [0] : [-halfHeight, halfHeight]) {
      vertex(-halfWidth, -halfDepth, z); vertex(halfWidth, -halfDepth, z); vertex(halfWidth, halfDepth, z); vertex(-halfWidth, halfDepth, z);
    }
    const faces = model.shape === 'plane' ? [[0, 1, 2, 3]] : [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
    for (const [a, b, c, d] of faces) { triangle(a, b, c); triangle(a, c, d); }
    for (let index = 0; index < 4; index++) {
      edge(index, (index + 1) % 4);
      if (model.shape !== 'plane') { edge(index + 4, (index + 1) % 4 + 4); edge(index, index + 4); }
    }
  }
  if (model.shape !== 'plane') for (const face of mesh.triangles) {
    const center = { x: 0, y: 0, z: 0 };
    for (const index of face) { const point = mesh.vertices[index]; center.x += point.x / 3; center.y += point.y / 3; center.z += point.z / 3; }
    if (dot(normal(mesh, face), center) < 0) [face[1], face[2]] = [face[2], face[1]];
  }
  return mesh;
}

/** A rigid camera transform. No independent X/Y/Z normalization can distort a sphere. */
export function projectGeometryPoint(point: GeometryPoint, azimuthDegrees: number, elevationDegrees: number): GeometryPoint {
  const azimuth = azimuthDegrees * Math.PI / 180, elevation = elevationDegrees * Math.PI / 180;
  const depth = point.x * Math.sin(azimuth) + point.y * Math.cos(azimuth);
  return { x: point.x * Math.cos(azimuth) - point.y * Math.sin(azimuth), y: point.z * Math.cos(elevation) - depth * Math.sin(elevation), z: point.z * Math.sin(elevation) + depth * Math.cos(elevation) };
}

const escapeXml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const decimal = (value: number): string => Number(value.toFixed(3)).toString();
const lengthLabel = (value: number): string => Number(value.toPrecision(6)).toString();
// SVG fragment IDs share the surrounding document namespace. Keep each render isolated.
let geometryRenderSequence = 0;
function renderGeometrySvg(spec: GeometrySpec, mesh: GeometryMesh, override: Partial<GeometryLabels>): string {
  const clipId = `vme-geometry-frame-${(++geometryRenderSequence).toString(36)}`;
  const labels = { ...DEFAULT_LABELS };
  // Ignore unknown/non-text presentation fields; never interpolate markup from labels.
  for (const key of Object.keys(labels) as (keyof GeometryLabels)[]) if (typeof override[key] === 'string') labels[key] = override[key]!.slice(0, 600);
  const model = spec.geometry, camera = (point: GeometryPoint): GeometryPoint => projectGeometryPoint(point, spec.azimuth, spec.elevation);
  const radius = Math.max(...mesh.vertices.map(point => Math.hypot(point.x, point.y, point.z)));
  const scale = 148 / radius * spec.geometryZoom;
  const screen = (point: GeometryPoint): GeometryPoint => { const p = camera(point); return { x: 400 + p.x * scale, y: 227 - p.y * scale, z: p.z }; };
  const projected = mesh.vertices.map(screen);
  const viewDirection = { x: Math.sin(spec.azimuth * Math.PI / 180) * Math.cos(spec.elevation * Math.PI / 180), y: Math.cos(spec.azimuth * Math.PI / 180) * Math.cos(spec.elevation * Math.PI / 180), z: Math.sin(spec.elevation * Math.PI / 180) };
  const normals = mesh.triangles.map(face => normal(mesh, face));
  const front = normals.map(n => dot(n, viewDirection) > 1e-12 * Math.hypot(n.x, n.y, n.z));
  const depth = mesh.triangles.map(face => face.reduce((sum, index) => sum + projected[index].z / 3, 0));
  const sorted = mesh.triangles.map((_, index) => index).filter(index => front[index]).sort((a, b) => depth[a] - depth[b]);
  const surfaces = model.faces ? sorted.map(index => {
    const n = normals[index], magnitude = Math.hypot(n.x, n.y, n.z);
    const light = clamp((n.x * -0.3 + n.y * -0.4 + n.z * 0.866) / magnitude, -1, 1);
    const shade = 0.65 + light * 0.2;
    const fill = `rgb(${Math.round(81 + shade * 76)},${Math.round(130 + shade * 74)},${Math.round(187 + shade * 57)})`;
    const points = mesh.triangles[index].map(vertex => `${decimal(projected[vertex].x)},${decimal(projected[vertex].y)}`).join(' ');
    return `<polygon data-geometry-face="${index}" points="${points}" fill="${fill}" stroke="${fill}" stroke-width="0.6" stroke-linejoin="round"/>`;
  }).join('') : '';
  const edgeKey = (a: number, b: number): string => a < b ? `${a}:${b}` : `${b}:${a}`;
  const visibleEdges = new Set<string>();
  for (let index = 0; index < mesh.triangles.length; index++) if (front[index]) {
    const face = mesh.triangles[index];
    for (let side = 0; side < 3; side++) visibleEdges.add(edgeKey(face[side], face[(side + 1) % 3]));
  }
  const lines = mesh.edges.filter(([a, b]) => !model.faces || visibleEdges.has(edgeKey(a, b))).map(([a, b]) => {
    const start = projected[a], end = projected[b];
    const hidden = !visibleEdges.has(edgeKey(a, b));
    return `<line x1="${decimal(start.x)}" y1="${decimal(start.y)}" x2="${decimal(end.x)}" y2="${decimal(end.y)}"${hidden ? ' stroke-opacity="0.25" stroke-dasharray="3 3"' : ''}/>`;
  }).join('');
  const dimensions = SHAPE_DIMENSIONS[model.shape as SolidGeometryShape].map(key => `${labels[key]} = ${lengthLabel(model[key]!)}`).join(' · ');
  const title = `${labels.title}: ${labels[model.shape as SolidGeometryShape]}`;
  const triad = [{ key: 'X', color: '#b91c1c', point: { x: 1, y: 0, z: 0 } }, { key: 'Y', color: '#15803d', point: { x: 0, y: 1, z: 0 } }, { key: 'Z', color: '#1d4ed8', point: { x: 0, y: 0, z: 1 } }].map(axis => {
    const point = camera(axis.point), x = 101 + point.x * 35, y = 345 - point.y * 35;
    const labelX = 101 + point.x * 52, labelY = 345 - point.y * 52;
    return `<g data-geometry-axis="${axis.key}" stroke="${axis.color}" fill="${axis.color}"><line x1="101" y1="345" x2="${decimal(x)}" y2="${decimal(y)}" stroke-width="2"/><text data-axis-label="${axis.key}" x="${decimal(labelX)}" y="${decimal(labelY + 5)}" stroke="none" font-size="16" font-weight="600" text-anchor="middle">${axis.key}</text></g>`;
  }).join('');
  return `<svg data-vme-plot="geometry" xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480" style="max-width:100%;height:auto" role="img" aria-label="${escapeXml(title)}"><title>${escapeXml(title)}</title><desc>${escapeXml(labels.description)}</desc><defs><clipPath id="${clipId}"><rect x="40" y="55" width="720" height="346" rx="4"/></clipPath></defs><rect width="800" height="480" rx="12" fill="#fff"/><g font-family="system-ui, sans-serif"><text data-vme-plot-caption="title" x="40" y="32" fill="#1f2937" font-size="18" font-weight="600">${escapeXml(title)}</text><rect data-plot-frame="true" x="40" y="55" width="720" height="346" rx="4" fill="#f8fafc" stroke="#e2e8f0"/><g data-geometry-mesh="true" data-geometry-scale="${decimal(scale)}" clip-path="url(#${clipId})">${surfaces}<g stroke="#334e68" stroke-width="${model.shape === 'sphere' ? '0.65' : '1.2'}" stroke-opacity="${model.shape === 'sphere' ? '0.48' : '0.82'}" stroke-linecap="round">${lines}</g></g>${triad}<text data-vme-plot-caption="footer" x="400" y="431" fill="#334155" font-size="14" text-anchor="middle">${escapeXml(dimensions)}</text><text data-vme-plot-caption="footer" x="400" y="458" fill="#64748b" font-size="12" text-anchor="middle">${escapeXml(labels.view)} ${decimal(spec.azimuth)}° / ${decimal(spec.elevation)}° · ${decimal(spec.geometryZoom)}×</text></g></svg>`;
}

export function createGeometryPlot(input: PlotSpec, labels: Partial<GeometryLabels> = {}): GeometryPlotResult {
  const checked = validateGeometrySpec(input);
  if (!checked.ok) return checked;
  if (!Object.hasOwn(SHAPE_DIMENSIONS, checked.spec.geometry.shape)) return failure('Spatial scenes use the spatial renderer.');
  const mesh = buildGeometryMesh(checked.spec);
  return { ok: true, spec: checked.spec, svg: renderGeometrySvg(checked.spec, mesh, labels), segments: [], sampleCount: mesh.vertices.length, mesh };
}
