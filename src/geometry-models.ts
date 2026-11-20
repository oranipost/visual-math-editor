import type { PlotFailure, PlotSpec } from './plot-engine';
import { validateSpatialRelationModel } from './spatial-relations';
import type {
  CompositeGeometryPart,
  CompositePartColor,
  CompositePartStyle,
  CompositeRotation,
  CompositeVector3,
  GeometryModel,
  SolidGeometryShape,
} from './geometry-types';
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
  title: string;
  sphere: string;
  hemisphere: string;
  cylinder: string;
  cone: string;
  frustum: string;
  pyramid: string;
  prism: string;
  cuboid: string;
  plane: string;
  composite: string;
  radius: string;
  bottomRadius: string;
  topRadius: string;
  width: string;
  depth: string;
  height: string;
  sides: string;
  parts: string;
  description: string;
  view: string;
}
export type GeometryPlotResult = PlotFailure | {
  ok: true; spec: GeometrySpec; svg: string; segments: []; sampleCount: number; mesh: GeometryMesh;
};

export const COMPOSITE_STYLES: readonly CompositePartStyle[] = Object.freeze(['solid', 'translucent', 'wireframe']);
export const COMPOSITE_COLORS: readonly CompositePartColor[] = Object.freeze(['indigo', 'teal', 'amber', 'rose', 'slate']);

export const GEOMETRY_LIMITS = Object.freeze({
  minimumLength: 0.001,
  maximumLength: 1000,
  maximumRatio: 1000,
  minimumSides: 3,
  maximumSides: 12,
  minimumZoom: 0.25,
  maximumZoom: 4,
  minimumParts: 2,
  maximumParts: 6,
  maximumOffset: 500,
  maximumRotation: 180,
  radialSegments: 32,
  sphereRings: 16,
});

export const DEFAULT_GEOMETRY_SPEC: Readonly<GeometrySpec> = Object.freeze({
  mode: 'geometry', expression: '', xMin: -1, xMax: 1, yMin: -1, yMax: 1,
  geometry: Object.freeze({ shape: 'sphere', radius: 1, faces: true }), azimuth: 45, elevation: 30, geometryZoom: 1,
});

const DEFAULT_LABELS: GeometryLabels = {
  title: 'Geometry',
  sphere: 'Sphere',
  hemisphere: 'Hemisphere',
  cylinder: 'Cylinder',
  cone: 'Cone',
  frustum: 'Frustum',
  pyramid: 'Regular pyramid',
  prism: 'Regular prism',
  cuboid: 'Cuboid',
  plane: 'Plane',
  composite: 'Composite solid',
  radius: 'Radius',
  bottomRadius: 'Bottom radius',
  topRadius: 'Top radius',
  width: 'Width',
  depth: 'Depth',
  height: 'Height',
  sides: 'Sides',
  parts: 'parts',
  view: 'View',
  description: 'Orthographic view with equal scale on X, Y and Z. Regular bases use the center-to-vertex radius. Curved surfaces are polygonal approximations.',
};

type DimensionKey = 'radius' | 'topRadius' | 'width' | 'depth' | 'height' | 'sides';

export const SHAPE_DIMENSIONS: Readonly<Record<SolidGeometryShape, readonly DimensionKey[]>> = {
  sphere: ['radius'],
  hemisphere: ['radius'],
  cylinder: ['radius', 'height'],
  cone: ['radius', 'height'],
  frustum: ['radius', 'topRadius', 'height', 'sides'],
  pyramid: ['radius', 'height', 'sides'],
  prism: ['radius', 'height', 'sides'],
  cuboid: ['width', 'depth', 'height'],
  plane: ['width', 'depth'],
};

const DIMENSION_DEFAULTS: Readonly<Record<DimensionKey, number>> = {
  radius: 1,
  topRadius: 0.6,
  width: 2,
  depth: 2,
  height: 2,
  sides: 4,
};

const FRUSTUM_RADIUS_DEFAULT = 1.4;
const FRUSTUM_TOP_RADIUS_DEFAULT = 0.8;

const COLOR_PALETTE: Readonly<Record<CompositePartColor, { base: [number, number, number]; delta: [number, number, number]; stroke: string }>> = {
  indigo: { base: [92, 80, 198], delta: [84, 88, 52], stroke: '#3f348f' },
  teal: { base: [32, 138, 132], delta: [76, 84, 76], stroke: '#155e59' },
  amber: { base: [198, 126, 36], delta: [54, 82, 72], stroke: '#854d0e' },
  rose: { base: [192, 76, 108], delta: [58, 84, 78], stroke: '#882947' },
  slate: { base: [92, 108, 130], delta: [76, 78, 76], stroke: '#334155' },
};

const wrapAngle = (angle: number): number => ((angle % 360) + 360) % 360;
const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));
const normalizeZero = (value: number): number => (Object.is(value, -0) ? 0 : value);
const failure = (error: string): PlotFailure => ({ ok: false, error });

/** Inspect data descriptors without invoking getters or accepting prototype-bearing custom objects. */
function plainData(value: unknown, allowed: readonly string[]): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype) return undefined;
  const keys = Reflect.ownKeys(value);
  if (keys.length > allowed.length || keys.some(key => typeof key !== 'string' || !allowed.includes(key))) return undefined;
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of keys as string[]) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) return undefined;
    result[key] = descriptor.value;
  }
  return result;
}

function plainArray(value: unknown, minLength: number, maxLength: number): unknown[] | undefined {
  if (!Array.isArray(value)) return undefined;
  if (Object.getPrototypeOf(value) !== Array.prototype) return undefined;
  if (value.length < minLength || value.length > maxLength) return undefined;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== value.length + 1) return undefined;
  const items: unknown[] = [];
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) return undefined;
    items.push(descriptor.value);
  }
  return items;
}

function validatePrimitiveDimensions(
  shape: SolidGeometryShape,
  source: Record<string, unknown>,
  target: { radius?: number; topRadius?: number; width?: number; depth?: number; height?: number; sides?: number },
): PlotFailure | null {
  const dimensions = SHAPE_DIMENSIONS[shape];
  const lengths: number[] = [];
  for (const key of dimensions) {
    if (key === 'sides' && shape === 'frustum' && source.sides === undefined) {
      continue;
    }
    const defaultValue = shape === 'frustum'
      ? (key === 'radius' ? FRUSTUM_RADIUS_DEFAULT : key === 'topRadius' ? FRUSTUM_TOP_RADIUS_DEFAULT : DIMENSION_DEFAULTS[key])
      : DIMENSION_DEFAULTS[key];
    const dimension = source[key] === undefined ? defaultValue : source[key];
    if (key === 'sides') {
      if (typeof dimension !== 'number' || !Number.isInteger(dimension) || dimension < GEOMETRY_LIMITS.minimumSides || dimension > GEOMETRY_LIMITS.maximumSides) {
        return failure(shape === 'frustum'
          ? 'Use 3 to 12 whole sides for a polygonal frustum.'
          : 'Use 3 to 12 whole sides for a regular pyramid or prism.');
      }
      target.sides = dimension;
    } else {
      if (typeof dimension !== 'number' || !Number.isFinite(dimension) || dimension < GEOMETRY_LIMITS.minimumLength || dimension > GEOMETRY_LIMITS.maximumLength) {
        return failure('Lengths must be finite numbers between 0.001 and 1000.');
      }
      const normalized = normalizeZero(dimension);
      lengths.push(normalized);
      target[key] = normalized;
    }
  }
  if (lengths.length > 0 && Math.max(...lengths) / Math.min(...lengths) > GEOMETRY_LIMITS.maximumRatio) {
    return failure('Dimension ratios above 1000:1 are not supported.');
  }
  return null;
}

const PART_ALLOWED_KEYS = ['shape', 'radius', 'topRadius', 'width', 'depth', 'height', 'sides', 'offset', 'rotation', 'style', 'color'] as const;

function validateCompositePart(rawPart: unknown, index: number): { ok: true; part: CompositeGeometryPart } | PlotFailure {
  const partData = plainData(rawPart, PART_ALLOWED_KEYS);
  if (!partData || typeof partData.shape !== 'string' || !Object.hasOwn(SHAPE_DIMENSIONS, partData.shape)) {
    return failure('Each composite part must use a supported primitive solid or plane.');
  }
  const shape = partData.shape as SolidGeometryShape;
  const dimensions = SHAPE_DIMENSIONS[shape];
  const allowedKeys = new Set<string>(['shape', 'offset', 'rotation', 'style', 'color', ...dimensions]);
  if (Object.keys(partData).some(key => !allowedKeys.has(key))) {
    return failure('Use only supported geometry settings and dimensions.');
  }
  const part: CompositeGeometryPart = { shape };
  const dimError = validatePrimitiveDimensions(shape, partData, part);
  if (dimError) return dimError;

  let offset: CompositeVector3 = { x: 0, y: 0, z: 0 };
  if (partData.offset !== undefined) {
    const rawOffset = plainData(partData.offset, ['x', 'y', 'z']);
    if (!rawOffset) return failure('Part offsets must be finite numbers between -500 and 500.');
    const nextOffset: CompositeVector3 = { x: 0, y: 0, z: 0 };
    for (const axis of ['x', 'y', 'z'] as const) {
      const val = rawOffset[axis] === undefined ? 0 : rawOffset[axis];
      if (typeof val !== 'number' || !Number.isFinite(val) || val < -GEOMETRY_LIMITS.maximumOffset || val > GEOMETRY_LIMITS.maximumOffset) {
        return failure('Part offsets must be finite numbers between -500 and 500.');
      }
      nextOffset[axis] = normalizeZero(val);
    }
    offset = nextOffset;
  }
  part.offset = offset;

  let rotation: CompositeRotation = { x: 0, y: 0, z: 0 };
  if (partData.rotation !== undefined) {
    const rawRot = plainData(partData.rotation, ['x', 'y', 'z']);
    if (!rawRot) return failure('Part rotation angles must be finite numbers between -180 and 180 degrees.');
    const nextRot: CompositeRotation = { x: 0, y: 0, z: 0 };
    for (const axis of ['x', 'y', 'z'] as const) {
      const val = rawRot[axis] === undefined ? 0 : rawRot[axis];
      if (typeof val !== 'number' || !Number.isFinite(val) || val < -GEOMETRY_LIMITS.maximumRotation || val > GEOMETRY_LIMITS.maximumRotation) {
        return failure('Part rotation angles must be finite numbers between -180 and 180 degrees.');
      }
      nextRot[axis] = normalizeZero(val);
    }
    rotation = nextRot;
  }
  part.rotation = rotation;

  const style = partData.style === undefined ? 'solid' : partData.style;
  if (typeof style !== 'string' || !COMPOSITE_STYLES.includes(style as CompositePartStyle)) {
    return failure('Part style must be solid, translucent, or wireframe.');
  }
  part.style = style as CompositePartStyle;

  const defaultColor = COMPOSITE_COLORS[index % COMPOSITE_COLORS.length];
  const color = partData.color === undefined ? defaultColor : partData.color;
  if (typeof color !== 'string' || !COMPOSITE_COLORS.includes(color as CompositePartColor)) {
    return failure('Choose a supported part color.');
  }
  part.color = color as CompositePartColor;

  return { ok: true, part };
}

/** Bounded numeric data only. Geometry is never passed to the equation parser. */
export function validateGeometrySpec(input: PlotSpec): { ok: true; spec: GeometrySpec } | PlotFailure {
  try {
    const value = plainData(input, ['mode', 'expression', 'xMin', 'xMax', 'yMin', 'yMax', 'geometry', 'azimuth', 'elevation', 'geometryZoom']);
    if (!value || value.mode !== 'geometry') return failure('Use only supported geometry settings and dimensions.');
    if (value.expression !== '' || !validPlotBounds(value as unknown as PlotSpec) || value.xMin !== -1 || value.xMax !== 1 || value.yMin !== -1 || value.yMax !== 1) {
      return failure('Use an empty geometry expression and valid X/Y bounds.');
    }
    const model = plainData(value.geometry, ['shape', 'radius', 'topRadius', 'width', 'depth', 'height', 'sides', 'faces', 'angle', 'offset', 'parts']);
    if (!model) return failure('Use only supported geometry settings and dimensions.');
    let geometry: GeometryModel;
    if (model.shape === 'planes' || model.shape === 'line-plane' || model.shape === 'sphere-plane') {
      if (model.topRadius !== undefined || model.parts !== undefined) return failure('Use a supported spatial-relation scene and its applicable settings.');
      const spatial = validateSpatialRelationModel(model);
      if (!spatial.ok) return spatial;
      geometry = spatial.model;
    } else if (model.shape === 'composite') {
      if (Object.keys(model).some(key => key !== 'shape' && key !== 'parts' && key !== 'faces')
        || (model.faces !== undefined && typeof model.faces !== 'boolean')) {
        return failure('Use only supported geometry settings and dimensions.');
      }
      const rawParts = plainArray(model.parts, GEOMETRY_LIMITS.minimumParts, GEOMETRY_LIMITS.maximumParts);
      if (!rawParts) return failure('Composite solids require between 2 and 6 parts.');
      const parts: CompositeGeometryPart[] = [];
      for (let index = 0; index < rawParts.length; index++) {
        const checkedPart = validateCompositePart(rawParts[index], index);
        if (!checkedPart.ok) return checkedPart;
        parts.push(checkedPart.part);
      }
      geometry = { shape: 'composite', faces: model.faces === undefined ? true : model.faces, parts };
    } else {
      if (typeof model.shape !== 'string' || !Object.hasOwn(SHAPE_DIMENSIONS, model.shape)) return failure('Choose a supported geometric solid or plane.');
      const shape = model.shape as SolidGeometryShape, dimensions = SHAPE_DIMENSIONS[shape];
      if (Object.keys(model).some(key => key !== 'shape' && key !== 'faces' && !dimensions.includes(key as DimensionKey))
        || (model.faces !== undefined && typeof model.faces !== 'boolean')) return failure('Use only supported geometry settings and dimensions.');
      geometry = { shape, faces: model.faces === undefined ? true : model.faces };
      const dimError = validatePrimitiveDimensions(shape, model, geometry);
      if (dimError) return dimError;
    }
    const azimuth = value.azimuth === undefined ? DEFAULT_GEOMETRY_SPEC.azimuth : value.azimuth;
    const elevation = value.elevation === undefined ? DEFAULT_GEOMETRY_SPEC.elevation : value.elevation;
    const geometryZoom = value.geometryZoom === undefined ? DEFAULT_GEOMETRY_SPEC.geometryZoom : value.geometryZoom;
    if (typeof azimuth !== 'number' || !Number.isFinite(azimuth) || typeof elevation !== 'number' || !Number.isFinite(elevation) || elevation < 10 || elevation > 80
      || typeof geometryZoom !== 'number' || !Number.isFinite(geometryZoom) || geometryZoom < GEOMETRY_LIMITS.minimumZoom || geometryZoom > GEOMETRY_LIMITS.maximumZoom) {
      return failure('Use a finite camera angle, elevation from 10 to 80 degrees, and zoom from 0.25 to 4.');
    }
    return {
      ok: true,
      spec: {
        mode: 'geometry',
        expression: '',
        xMin: value.xMin,
        xMax: value.xMax,
        yMin: value.yMin,
        yMax: value.yMax,
        geometry,
        azimuth: wrapAngle(azimuth),
        elevation,
        geometryZoom,
      },
    };
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

export function rotatePoint3D(point: GeometryPoint, rotation?: CompositeRotation): GeometryPoint {
  const rx = (rotation?.x ?? 0) * Math.PI / 180;
  const ry = (rotation?.y ?? 0) * Math.PI / 180;
  const rz = (rotation?.z ?? 0) * Math.PI / 180;
  let { x, y, z } = point;
  if (rx !== 0) {
    const c = Math.cos(rx), s = Math.sin(rx);
    const ny = y * c - z * s, nz = y * s + z * c;
    y = ny; z = nz;
  }
  if (ry !== 0) {
    const c = Math.cos(ry), s = Math.sin(ry);
    const nx = x * c + z * s, nz = -x * s + z * c;
    x = nx; z = nz;
  }
  if (rz !== 0) {
    const c = Math.cos(rz), s = Math.sin(rz);
    const nx = x * c - y * s, ny = x * s + y * c;
    x = nx; y = ny;
  }
  return { x, y, z };
}

export function buildPrimitiveMesh(model: {
  shape: SolidGeometryShape;
  radius?: number;
  topRadius?: number;
  width?: number;
  depth?: number;
  height?: number;
  sides?: number;
}): GeometryMesh {
  const mesh: GeometryMesh = { vertices: [], triangles: [], edges: [] };
  const radius = model.radius ?? (model.shape === 'frustum' ? FRUSTUM_RADIUS_DEFAULT : 1);
  const topRadius = model.topRadius ?? FRUSTUM_TOP_RADIUS_DEFAULT;
  const halfHeight = (model.height ?? 2) / 2;
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
  } else if (model.shape === 'hemisphere') {
    const sectors = GEOMETRY_LIMITS.radialSegments;
    const ringsHalf = Math.max(4, Math.floor(GEOMETRY_LIMITS.sphereRings / 2));
    const baseZ = -radius / 2;
    const north = vertex(0, 0, baseZ + radius);
    for (let row = 1; row <= ringsHalf; row++) {
      const latitude = (Math.PI / 2) * (row / ringsHalf);
      for (let column = 0; column < sectors; column++) {
        const longitude = 2 * Math.PI * column / sectors;
        vertex(
          radius * Math.sin(latitude) * Math.cos(longitude),
          radius * Math.sin(latitude) * Math.sin(longitude),
          baseZ + radius * Math.cos(latitude),
        );
      }
    }
    const bottomCenter = vertex(0, 0, baseZ);
    const at = (row: number, column: number): number => 1 + row * sectors + (column + sectors) % sectors;
    for (let column = 0; column < sectors; column++) {
      triangle(north, at(0, column), at(0, column + 1));
      triangle(bottomCenter, at(ringsHalf - 1, column + 1), at(ringsHalf - 1, column));
      edge(north, at(0, column));
    }
    for (let row = 0; row < ringsHalf; row++) for (let column = 0; column < sectors; column++) {
      edge(at(row, column), at(row, column + 1));
      if (row < ringsHalf - 1) {
        triangle(at(row, column), at(row + 1, column), at(row + 1, column + 1));
        triangle(at(row, column), at(row + 1, column + 1), at(row, column + 1));
        edge(at(row, column), at(row + 1, column));
      }
    }
  } else if (model.shape === 'frustum') {
    const curved = model.sides === undefined;
    const sides = curved ? GEOMETRY_LIMITS.radialSegments : (model.sides ?? 4);
    for (let index = 0; index < sides; index++) {
      const angle = 2 * Math.PI * index / sides;
      vertex(radius * Math.cos(angle), radius * Math.sin(angle), -halfHeight);
    }
    for (let index = 0; index < sides; index++) {
      const angle = 2 * Math.PI * index / sides;
      vertex(topRadius * Math.cos(angle), topRadius * Math.sin(angle), halfHeight);
    }
    const bottom = vertex(0, 0, -halfHeight), top = vertex(0, 0, halfHeight);
    for (let index = 0; index < sides; index++) {
      const next = (index + 1) % sides;
      triangle(index, next, sides + next);
      triangle(index, sides + next, sides + index);
      triangle(bottom, next, index);
      triangle(top, sides + index, sides + next);
      edge(index, next);
      edge(sides + index, sides + next);
      if (!curved || index % 4 === 0) edge(index, sides + index);
    }
  } else if (model.shape === 'cylinder' || model.shape === 'cone' || model.shape === 'prism' || model.shape === 'pyramid') {
    const curved = model.shape === 'cylinder' || model.shape === 'cone';
    const pointed = model.shape === 'cone' || model.shape === 'pyramid';
    const sides = curved ? GEOMETRY_LIMITS.radialSegments : (model.sides ?? 4);
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
    const halfWidth = (model.width ?? 2) / 2, halfDepth = (model.depth ?? 2) / 2;
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

function transformPartMesh(part: CompositeGeometryPart): GeometryMesh {
  const base = buildPrimitiveMesh(part);
  const ox = part.offset?.x ?? 0, oy = part.offset?.y ?? 0, oz = part.offset?.z ?? 0;
  const vertices = base.vertices.map((pt) => {
    const r = rotatePoint3D(pt, part.rotation);
    return { x: r.x + ox, y: r.y + oy, z: r.z + oz };
  });
  return {
    vertices,
    triangles: base.triangles.map(([a, b, c]) => [a, b, c]),
    edges: base.edges.map(([a, b]) => [a, b]),
  };
}

/** Compute the Z offset for `above` so its lowest rotated vertex rests flush on top of `below`. */
export function computeCompositeStackOffsetZ(below: CompositeGeometryPart, above: CompositeGeometryPart): number {
  const belowMesh = transformPartMesh(below);
  const aboveLocal = buildPrimitiveMesh(above).vertices.map(pt => rotatePoint3D(pt, above.rotation));
  if (!belowMesh.vertices.length || !aboveLocal.length) return 0;
  const belowTopZ = Math.max(...belowMesh.vertices.map(v => v.z));
  const aboveMinLocalZ = Math.min(...aboveLocal.map(v => v.z));
  return clamp(Number((belowTopZ - aboveMinLocalZ).toFixed(4)), -GEOMETRY_LIMITS.maximumOffset, GEOMETRY_LIMITS.maximumOffset);
}

/** The input must come from validateGeometrySpec. Mesh budgets are fixed and independent of lengths. */
export function buildGeometryMesh(spec: GeometrySpec): GeometryMesh {
  const model = spec.geometry;
  if (model.shape === 'composite') {
    const merged: GeometryMesh = { vertices: [], triangles: [], edges: [] };
    for (const part of model.parts ?? []) {
      const partMesh = transformPartMesh(part);
      const baseIndex = merged.vertices.length;
      merged.vertices.push(...partMesh.vertices);
      for (const [a, b, c] of partMesh.triangles) merged.triangles.push([baseIndex + a, baseIndex + b, baseIndex + c]);
      for (const [a, b] of partMesh.edges) merged.edges.push([baseIndex + a, baseIndex + b]);
    }
    return merged;
  }
  if (!Object.hasOwn(SHAPE_DIMENSIONS, model.shape)) throw new Error('Spatial scenes use the spatial renderer.');
  return buildPrimitiveMesh(model as GeometryModel & { shape: SolidGeometryShape });
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

function formatSingleShapeDimensions(model: GeometryModel, shape: SolidGeometryShape, labels: GeometryLabels): string {
  if (shape === 'frustum') {
    const entries = [
      `${labels.bottomRadius} = ${lengthLabel(model.radius!)}`,
      `${labels.topRadius} = ${lengthLabel(model.topRadius!)}`,
      `${labels.height} = ${lengthLabel(model.height!)}`,
    ];
    if (model.sides !== undefined) entries.push(`${labels.sides} = ${lengthLabel(model.sides)}`);
    return entries.join(' · ');
  }
  return SHAPE_DIMENSIONS[shape]
    .filter(key => model[key] !== undefined)
    .map(key => `${labels[key]} = ${lengthLabel(model[key]!)}`)
    .join(' · ');
}

function renderCompositeSceneMarkup(
  spec: GeometrySpec,
  camera: (point: GeometryPoint) => GeometryPoint,
): { markup: string; scale: number } {
  const parts = spec.geometry.parts ?? [];
  const partMeshes = parts.map(part => ({ part, mesh: transformPartMesh(part) }));
  const allVertices = partMeshes.flatMap(entry => entry.mesh.vertices);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const v of allVertices) {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
    if (v.z < minZ) minZ = v.z;
    if (v.z > maxZ) maxZ = v.z;
  }
  const center = allVertices.length
    ? { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 }
    : { x: 0, y: 0, z: 0 };
  const radius = Math.max(0.001, ...allVertices.map(v => Math.hypot(v.x - center.x, v.y - center.y, v.z - center.z)));
  const scale = 148 / radius * spec.geometryZoom;
  const screen = (point: GeometryPoint): GeometryPoint => {
    const p = camera({ x: point.x - center.x, y: point.y - center.y, z: point.z - center.z });
    return { x: 400 + p.x * scale, y: 227 - p.y * scale, z: p.z };
  };
  const viewDirection = {
    x: Math.sin(spec.azimuth * Math.PI / 180) * Math.cos(spec.elevation * Math.PI / 180),
    y: Math.cos(spec.azimuth * Math.PI / 180) * Math.cos(spec.elevation * Math.PI / 180),
    z: Math.sin(spec.elevation * Math.PI / 180),
  };

  type RenderItem = { depth: number; order: number; svg: string };
  const renderItems: RenderItem[] = [];
  let faceCounter = 0;
  let orderCounter = 0;
  const edgeKey = (a: number, b: number): string => (a < b ? `${a}:${b}` : `${b}:${a}`);

  partMeshes.forEach(({ part, mesh }, partIndex) => {
    const style: CompositePartStyle = spec.geometry.faces === false ? 'wireframe' : (part.style ?? 'solid');
    const colorKey: CompositePartColor = part.color ?? COMPOSITE_COLORS[partIndex % COMPOSITE_COLORS.length];
    const palette = COLOR_PALETTE[colorKey];
    const projected = mesh.vertices.map(screen);
    const partMaxZ = projected.length ? Math.max(...projected.map(p => p.z)) : 0;
    const isPlane = part.shape === 'plane';
    const isDenseCurved = part.shape === 'sphere' || part.shape === 'hemisphere';

    const normals = mesh.triangles.map(face => normal(mesh, face));
    const front = normals.map(n => isPlane
      ? Math.hypot(n.x, n.y, n.z) > 0
      : dot(n, viewDirection) > 1e-12 * Math.hypot(n.x, n.y, n.z));

    if (style !== 'wireframe') {
      mesh.triangles.forEach((face, triIndex) => {
        if (!front[triIndex]) return;
        const n = normals[triIndex];
        const magnitude = Math.hypot(n.x, n.y, n.z) || 1;
        const rawLight = (n.x * -0.3 + n.y * -0.4 + n.z * 0.866) / magnitude;
        const light = clamp(isPlane ? Math.abs(rawLight) : rawLight, -1, 1);
        const shade = 0.65 + light * 0.2;
        const fill = `rgb(${Math.round(palette.base[0] + shade * palette.delta[0])},${Math.round(palette.base[1] + shade * palette.delta[1])},${Math.round(palette.base[2] + shade * palette.delta[2])})`;
        const points = face.map(idx => `${decimal(projected[idx].x)},${decimal(projected[idx].y)}`).join(' ');
        const avgZ = (projected[face[0]].z + projected[face[1]].z + projected[face[2]].z) / 3;
        const opacityAttr = style === 'translucent' ? ' fill-opacity="0.22" stroke-opacity="0.22"' : '';
        renderItems.push({
          depth: avgZ,
          order: orderCounter++,
          svg: `<polygon data-geometry-face="${faceCounter++}" data-geometry-part="${partIndex}" data-part-style="${style}" data-part-color="${colorKey}" points="${points}" fill="${fill}" stroke="${fill}" stroke-width="0.55"${opacityAttr} stroke-linejoin="round"/>`,
        });
      });
    }

    const visibleEdges = new Set<string>();
    mesh.triangles.forEach((face, triIndex) => {
      if (!front[triIndex]) return;
      for (let side = 0; side < 3; side++) visibleEdges.add(edgeKey(face[side], face[(side + 1) % 3]));
    });

    const strokeWidth = isDenseCurved ? '0.65' : '1.2';
    for (const [a, b] of mesh.edges) {
      const start = projected[a], end = projected[b];
      const isVisible = visibleEdges.has(edgeKey(a, b));
      if (!isVisible && isDenseCurved && style !== 'wireframe') continue;
      if (isVisible) {
        const visOpacity = isDenseCurved
          ? (style === 'translucent' ? '0.32' : '0.46')
          : (style === 'translucent' ? '0.68' : '0.86');
        renderItems.push({
          depth: Math.max(start.z, end.z) + 1e-4,
          order: orderCounter++,
          svg: `<line data-geometry-part="${partIndex}" data-part-color="${colorKey}" x1="${decimal(start.x)}" y1="${decimal(start.y)}" x2="${decimal(end.x)}" y2="${decimal(end.y)}" stroke="${palette.stroke}" stroke-width="${strokeWidth}" stroke-opacity="${visOpacity}" stroke-linecap="round"/>`,
        });
      } else {
        const hiddenDepth = style === 'solid' ? partMaxZ + 0.5e-4 : (start.z + end.z) / 2;
        renderItems.push({
          depth: hiddenDepth,
          order: orderCounter++,
          svg: `<line data-geometry-part="${partIndex}" data-part-color="${colorKey}" x1="${decimal(start.x)}" y1="${decimal(start.y)}" x2="${decimal(end.x)}" y2="${decimal(end.y)}" stroke="${palette.stroke}" stroke-width="${strokeWidth}" stroke-opacity="0.25" stroke-dasharray="3 3" stroke-linecap="round"/>`,
        });
      }
    }
  });

  renderItems.sort((a, b) => (a.depth - b.depth) || (a.order - b.order));
  return { markup: renderItems.map(item => item.svg).join(''), scale };
}

function renderGeometrySvg(spec: GeometrySpec, mesh: GeometryMesh, override: Partial<GeometryLabels>): string {
  const clipId = `vme-geometry-frame-${(++geometryRenderSequence).toString(36)}`;
  const labels = { ...DEFAULT_LABELS };
  // Ignore unknown/non-text presentation fields; never interpolate markup from labels.
  for (const key of Object.keys(labels) as (keyof GeometryLabels)[]) if (typeof override[key] === 'string') labels[key] = override[key].slice(0, 600);
  const model = spec.geometry, camera = (point: GeometryPoint): GeometryPoint => projectGeometryPoint(point, spec.azimuth, spec.elevation);

  const triad = [{ key: 'X', color: '#b91c1c', point: { x: 1, y: 0, z: 0 } }, { key: 'Y', color: '#15803d', point: { x: 0, y: 1, z: 0 } }, { key: 'Z', color: '#1d4ed8', point: { x: 0, y: 0, z: 1 } }].map(axis => {
    const point = camera(axis.point), x = 101 + point.x * 35, y = 345 - point.y * 35;
    const labelX = 101 + point.x * 52, labelY = 345 - point.y * 52;
    return `<g data-geometry-axis="${axis.key}" stroke="${axis.color}" fill="${axis.color}"><line x1="101" y1="345" x2="${decimal(x)}" y2="${decimal(y)}" stroke-width="2"/><text data-axis-label="${axis.key}" x="${decimal(labelX)}" y="${decimal(labelY + 5)}" stroke="none" font-size="16" font-weight="600" text-anchor="middle">${axis.key}</text></g>`;
  }).join('');

  if (model.shape === 'composite') {
    const partList = model.parts ?? [];
    const { markup, scale } = renderCompositeSceneMarkup(spec, camera);
    const title = `${labels.title}: ${labels.composite} (${partList.length} ${labels.parts})`;
    const partNames = partList.map(part => labels[part.shape]).join(' + ');
    return `<svg data-vme-plot="geometry" data-geometry-composite="true" xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480" style="max-width:100%;height:auto" role="img" aria-label="${escapeXml(title)}"><title>${escapeXml(title)}</title><desc>${escapeXml(labels.description)}</desc><defs><clipPath id="${clipId}"><rect x="40" y="55" width="720" height="346" rx="4"/></clipPath></defs><rect width="800" height="480" rx="12" fill="#fff"/><g font-family="system-ui, sans-serif"><text data-vme-plot-caption="title" x="40" y="32" fill="#1f2937" font-size="18" font-weight="600">${escapeXml(title)}</text><rect data-plot-frame="true" x="40" y="55" width="720" height="346" rx="4" fill="#f8fafc" stroke="#e2e8f0"/><g data-geometry-mesh="true" data-geometry-scale="${decimal(scale)}" clip-path="url(#${clipId})">${markup}</g>${triad}<text data-vme-plot-caption="footer" x="400" y="431" fill="#334155" font-size="14" text-anchor="middle">${escapeXml(partNames)}</text><text data-vme-plot-caption="footer" x="400" y="458" fill="#64748b" font-size="12" text-anchor="middle">${escapeXml(labels.view)} ${decimal(spec.azimuth)}° / ${decimal(spec.elevation)}° · ${decimal(spec.geometryZoom)}×</text></g></svg>`;
  }

  const radius = Math.max(...mesh.vertices.map(point => Math.hypot(point.x, point.y, point.z)));
  const scale = 148 / radius * spec.geometryZoom;
  const screen = (point: GeometryPoint): GeometryPoint => { const p = camera(point); return { x: 400 + p.x * scale, y: 227 - p.y * scale, z: p.z }; };
  const projected = mesh.vertices.map(screen);
  const viewDirection = { x: Math.sin(spec.azimuth * Math.PI / 180) * Math.cos(spec.elevation * Math.PI / 180), y: Math.cos(spec.azimuth * Math.PI / 180) * Math.cos(spec.elevation * Math.PI / 180), z: Math.sin(spec.elevation * Math.PI / 180) };
  const normals = mesh.triangles.map(face => normal(mesh, face));
  const front = normals.map(n => dot(n, viewDirection) > 1e-12 * Math.hypot(n.x, n.y, n.z));
  const depth = mesh.triangles.map(face => face.reduce((sum, index) => sum + projected[index].z / 3, 0));
  const sorted = mesh.triangles.map((_, index) => index).filter(index => front[index]).sort((a, b) => depth[a] - depth[b]);
  const singlePalette = COLOR_PALETTE.indigo;
  const surfaces = model.faces ? sorted.map(index => {
    const n = normals[index], magnitude = Math.hypot(n.x, n.y, n.z);
    const light = clamp((n.x * -0.3 + n.y * -0.4 + n.z * 0.866) / magnitude, -1, 1);
    const shade = 0.65 + light * 0.2;
    const fill = `rgb(${Math.round(singlePalette.base[0] + shade * singlePalette.delta[0])},${Math.round(singlePalette.base[1] + shade * singlePalette.delta[1])},${Math.round(singlePalette.base[2] + shade * singlePalette.delta[2])})`;
    const points = mesh.triangles[index].map(vertex => `${decimal(projected[vertex].x)},${decimal(projected[vertex].y)}`).join(' ');
    return `<polygon data-geometry-face="${index}" data-part-color="indigo" points="${points}" fill="${fill}" stroke="${fill}" stroke-width="0.6" stroke-linejoin="round"/>`;
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
  const shapeKey = model.shape as SolidGeometryShape;
  const dimensions = formatSingleShapeDimensions(model, shapeKey, labels);
  const isDenseCurved = shapeKey === 'sphere' || shapeKey === 'hemisphere';
  const title = `${labels.title}: ${labels[shapeKey]}`;
  return `<svg data-vme-plot="geometry" xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480" style="max-width:100%;height:auto" role="img" aria-label="${escapeXml(title)}"><title>${escapeXml(title)}</title><desc>${escapeXml(labels.description)}</desc><defs><clipPath id="${clipId}"><rect x="40" y="55" width="720" height="346" rx="4"/></clipPath></defs><rect width="800" height="480" rx="12" fill="#fff"/><g font-family="system-ui, sans-serif"><text data-vme-plot-caption="title" x="40" y="32" fill="#1f2937" font-size="18" font-weight="600">${escapeXml(title)}</text><rect data-plot-frame="true" x="40" y="55" width="720" height="346" rx="4" fill="#f8fafc" stroke="#e2e8f0"/><g data-geometry-mesh="true" data-geometry-scale="${decimal(scale)}" clip-path="url(#${clipId})">${surfaces}<g data-part-color="indigo" stroke="${singlePalette.stroke}" stroke-width="${isDenseCurved ? '0.65' : '1.2'}" stroke-opacity="${isDenseCurved ? '0.48' : '0.82'}" stroke-linecap="round">${lines}</g></g>${triad}<text data-vme-plot-caption="footer" x="400" y="431" fill="#334155" font-size="14" text-anchor="middle">${escapeXml(dimensions)}</text><text data-vme-plot-caption="footer" x="400" y="458" fill="#64748b" font-size="12" text-anchor="middle">${escapeXml(labels.view)} ${decimal(spec.azimuth)}° / ${decimal(spec.elevation)}° · ${decimal(spec.geometryZoom)}×</text></g></svg>`;
}

export function createGeometryPlot(input: PlotSpec, labels: Partial<GeometryLabels> = {}): GeometryPlotResult {
  const checked = validateGeometrySpec(input);
  if (!checked.ok) return checked;
  if (checked.spec.geometry.shape !== 'composite' && !Object.hasOwn(SHAPE_DIMENSIONS, checked.spec.geometry.shape)) {
    return failure('Spatial scenes use the spatial renderer.');
  }
  const mesh = buildGeometryMesh(checked.spec);
  return { ok: true, spec: checked.spec, svg: renderGeometrySvg(checked.spec, mesh, labels), segments: [], sampleCount: mesh.vertices.length, mesh };
}
