import type { PlotSpec } from './plot-engine';
import type { CompositeGeometryPart, CompositePartColor, CompositePartStyle, GeometryModel, SolidGeometryShape } from './geometry-types';
import { validateGraphSpec } from './graph-render';
import { formatMath, isMathInsertionAllowed, type MathRange } from './math-ranges';
import { assertTopLevelBlockContext, DocumentChangedError, type WriteTarget } from './write-plan';

export interface PlotBlock { from: number; to: number; source: string; spec: PlotSpec }
const FIELDS = ['expression', 'xMin', 'xMax', 'yMin', 'yMax'] as const;
const EXTRA_FIELDS = ['thetaMin', 'thetaMax', 'calculus', 'integralMin', 'integralMax', 'zMin', 'zMax', 'azimuth', 'elevation', 'geometryZoom'] as const;
const GEOMETRY_NUMERIC_FIELDS = ['radius', 'topRadius', 'width', 'depth', 'height', 'sides', 'angle', 'offset'] as const;
const GEOMETRY_FIELDS = ['shape', ...GEOMETRY_NUMERIC_FIELDS, 'faces', 'parts'] as const;
const SOLID_SHAPES = ['sphere', 'hemisphere', 'cylinder', 'cone', 'frustum', 'pyramid', 'prism', 'cuboid', 'plane'] as const;
const GEOMETRY_SHAPES = [...SOLID_SHAPES, 'planes', 'line-plane', 'sphere-plane', 'composite'] as const;
const PART_NUMERIC_FIELDS = ['radius', 'topRadius', 'width', 'depth', 'height', 'sides'] as const;
const PART_FIELDS = ['shape', ...PART_NUMERIC_FIELDS, 'offset', 'rotation', 'style', 'color'] as const;
const PART_STYLES = ['solid', 'translucent', 'wireframe'] as const;
const PART_COLORS = ['indigo', 'teal', 'amber', 'rose', 'slate'] as const;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function parseVectorRecord(value: unknown, axes: readonly ('x' | 'y' | 'z')[]): Record<'x' | 'y' | 'z', number> {
  if (!isPlainRecord(value)) throw new Error('Invalid geometry vector.');
  const keys = Reflect.ownKeys(value);
  if (keys.some(key => typeof key !== 'string' || !axes.includes(key as 'x' | 'y' | 'z'))) throw new Error('Invalid geometry vector.');
  const out = { x: 0, y: 0, z: 0 };
  for (const axis of axes) {
    const raw = value[axis];
    if (raw === undefined) continue;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) throw new Error('Invalid geometry vector.');
    out[axis] = raw;
  }
  return out;
}

function parseCompositePart(value: unknown): CompositeGeometryPart {
  if (!isPlainRecord(value)) throw new Error('Invalid composite geometry part.');
  const keys = Reflect.ownKeys(value);
  if (keys.some(key => typeof key !== 'string' || !PART_FIELDS.includes(key as typeof PART_FIELDS[number]))) {
    throw new Error('Invalid composite geometry part.');
  }
  if (typeof value.shape !== 'string' || !SOLID_SHAPES.includes(value.shape as SolidGeometryShape)) {
    throw new Error('Invalid composite geometry part.');
  }
  const part: CompositeGeometryPart = { shape: value.shape as SolidGeometryShape };
  for (const key of PART_NUMERIC_FIELDS) {
    const num = value[key];
    if (num === undefined) continue;
    if (typeof num !== 'number' || !Number.isFinite(num)) throw new Error('Invalid composite geometry part.');
    part[key] = num;
  }
  if (value.offset !== undefined) part.offset = parseVectorRecord(value.offset, ['x', 'y', 'z']);
  if (value.rotation !== undefined) part.rotation = parseVectorRecord(value.rotation, ['x', 'y', 'z']);
  if (value.style !== undefined) {
    if (typeof value.style !== 'string' || !PART_STYLES.includes(value.style as CompositePartStyle)) throw new Error('Invalid composite geometry part.');
    part.style = value.style as CompositePartStyle;
  }
  if (value.color !== undefined) {
    if (typeof value.color !== 'string' || !PART_COLORS.includes(value.color as CompositePartColor)) throw new Error('Invalid composite geometry part.');
    part.color = value.color as CompositePartColor;
  }
  return part;
}

function parseGeometryModel(value: unknown): GeometryModel {
  if (!isPlainRecord(value)) throw new Error('Invalid geometry settings.');
  const keys = Reflect.ownKeys(value);
  if (keys.some(key => typeof key !== 'string' || !GEOMETRY_FIELDS.includes(key as typeof GEOMETRY_FIELDS[number]))
    || typeof value.shape !== 'string' || !GEOMETRY_SHAPES.includes(value.shape as typeof GEOMETRY_SHAPES[number])
    || (value.faces !== undefined && typeof value.faces !== 'boolean')
    || GEOMETRY_NUMERIC_FIELDS.some(key => value[key] !== undefined && (typeof value[key] !== 'number' || !Number.isFinite(value[key])))) {
    throw new Error('Invalid geometry settings.');
  }
  const out: Record<string, unknown> = { shape: value.shape };
  for (const key of GEOMETRY_NUMERIC_FIELDS) {
    if (value[key] !== undefined) out[key] = value[key];
  }
  if (value.faces !== undefined) out.faces = value.faces;
  if (value.parts !== undefined) {
    if (value.shape !== 'composite' || !Array.isArray(value.parts) || value.parts.length < 2 || value.parts.length > 6) {
      throw new Error('Invalid geometry settings.');
    }
    out.parts = value.parts.map(parseCompositePart);
  }
  // Return only owned, explicitly supported fields. Shape-specific dimensions and
  // bounds are checked by the renderer, before any graph can be edited or saved.
  return out as unknown as GeometryModel;
}

export function parsePlotSpec(source: string): PlotSpec {
  if (source.length > 4096) throw new Error('Graph settings are too long.');
  const data: unknown = JSON.parse(source);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid graph settings.');
  const record = data as Record<string, unknown>;
  if (record.version !== 1 || Object.keys(record).some(key => key !== 'version' && key !== 'mode' && key !== 'geometry' && ![...FIELDS, ...EXTRA_FIELDS].includes(key as typeof FIELDS[number]))) throw new Error('Unsupported graph settings version.');
  if (record.mode !== undefined && (typeof record.mode !== 'string' || !['function', 'complex', 'polar', 'surface', 'geometry'].includes(record.mode))) throw new Error('Unsupported graph mode.');
  if (typeof record.expression !== 'string' || !FIELDS.slice(1).every(key => typeof record[key] === 'number' && Number.isFinite(record[key]))) throw new Error('Invalid graph settings.');
  const spec = Object.fromEntries(FIELDS.map(key => [key, record[key]])) as unknown as PlotSpec;
  if (record.mode !== undefined) spec.mode = record.mode as PlotSpec['mode'];
  if (spec.mode === 'geometry' && record.geometry === undefined) throw new Error('Missing geometry settings.');
  if (record.geometry !== undefined) {
    if (spec.mode !== 'geometry') throw new Error('Geometry settings do not match this graph type.');
    spec.geometry = parseGeometryModel(record.geometry);
  }
  for (const key of EXTRA_FIELDS) {
    if (record[key] === undefined) continue;
    if (key === 'calculus') {
      if (typeof record[key] !== 'string' || !['none', 'derivative', 'second-derivative', 'integral'].includes(record[key])) throw new Error('Invalid calculus settings.');
      spec.calculus = record[key] as PlotSpec['calculus'];
    } else {
      if (typeof record[key] !== 'number' || !Number.isFinite(record[key])) throw new Error('Invalid graph settings.');
      spec[key] = record[key];
    }
  }
  const allowed = spec.mode === 'geometry' ? ['azimuth', 'elevation', 'geometryZoom'] : spec.mode === 'surface' ? ['zMin', 'zMax', 'azimuth', 'elevation']
    : spec.mode === 'polar' ? ['thetaMin', 'thetaMax'] : spec.mode === 'complex' ? [] : ['calculus', 'integralMin', 'integralMax'];
  if (EXTRA_FIELDS.some(key => record[key] !== undefined && !allowed.includes(key))) throw new Error('Graph settings do not match this graph type.');
  const validated = validateGraphSpec(spec);
  if (!validated.ok) throw new Error(validated.error);
  return validated.spec;
}

export function serializePlot(spec: PlotSpec): string {
  const normalized = parsePlotSpec(JSON.stringify({ version: 1, ...spec }));
  const source = JSON.stringify({ version: 1, ...normalized });
  return '```vme-plot\n' + source + '\n```';
}

export function findPlotBlocks(markdown: string): PlotBlock[] {
  const blocks: PlotBlock[] = [];
  const opening = /^(`{3,}|~{3,})vme-plot[ \t]*\r?$/gm;
  for (const match of markdown.matchAll(opening)) {
    if (blocks.some(block => match.index < block.to)) continue;
    const from = match.index;
    const contentFrom = from + match[0].length + 1;
    const closing = new RegExp('^' + match[1][0] + '{' + match[1].length + ',}[ \\t]*\\r?$', 'gm');
    closing.lastIndex = contentFrom;
    const end = closing.exec(markdown);
    if (!end) continue;
    // A block excludes its following line ending for both LF and CRLF. Retaining
    // a trailing CR in the replacement range would silently convert CRLF to LF.
    const to = end.index + end[0].replace(/\r$/, '').length;
    const source = markdown.slice(contentFrom, end.index).replace(/\r?\n$/, '');
    // Mask this candidate alone, retaining other fences, YAML and comments.
    const masked = markdown.slice(0, from) + markdown.slice(from, to).replace(/[^\r\n]/g, 'x') + markdown.slice(to);
    if (!isMathInsertionAllowed(masked, from)) continue;
    try {
      assertTopLevelBlockContext(masked, { snapshot: masked, from, to });
      blocks.push({ from, to, source, spec: parsePlotSpec(source) });
    } catch { /* Unsupported/nested blocks are left unchanged. */ }
  }
  return blocks;
}

/** A complete graph at EOF is safe to append after, even without a final newline. */
export function canAppendAfterGraph(markdown: string, offset: number): boolean {
  return offset === markdown.length && findPlotBlocks(markdown).some(block => block.to === offset);
}

function checkTarget(current: string, target: WriteTarget): void {
  if (current !== target.snapshot) throw new DocumentChangedError();
  if (!Number.isInteger(target.from) || !Number.isInteger(target.to) || target.from < 0 || target.to < target.from || target.to > current.length) throw new Error('The graph location is invalid. Reopen it.');
}

/** Graphs are top-level Markdown blocks, never inserted into a list or table. */
export function planGraphInsert(current: string, target: WriteTarget, spec: PlotSpec, latex: string, display: boolean, original?: MathRange): string {
  checkTarget(current, target);
  if (!isMathInsertionAllowed(current, target.from) && !(target.from === target.to && canAppendAfterGraph(current, target.from))) throw new Error('Insert the graph in ordinary note text, outside code or properties.');
  assertTopLevelBlockContext(current, target); // Graphs remain top-level blocks.
  const math = latex.trim() ? original && latex === original.latex && display === original.display
    ? current.slice(target.from, target.to) : formatMath(latex, display) : '';
  const core = (math ? math + '\n\n' : '') + serializePlot(spec);
  const before = current.slice(0, target.from);
  const after = current.slice(target.to);
  return (before && !before.endsWith('\n\n') ? before.endsWith('\n') ? '\n' : '\n\n' : '')
    + core + (!after ? '\n\n' : !after.startsWith('\n\n') ? after.startsWith('\n') ? '\n' : '\n\n' : '');
}

export function planGraphUpdate(current: string, target: WriteTarget, spec: PlotSpec): string {
  checkTarget(current, target);
  const serialized = serializePlot(spec);
  const next = parsePlotSpec(serialized.split('\n')[1]);
  const block = findPlotBlocks(current).find(value => value.from === target.from && value.to === target.to);
  if (!block) throw new Error('The original graph is no longer at this position. Reopen it.');
  if (JSON.stringify(block.spec) === JSON.stringify(next)) return current.slice(target.from, target.to);
  return serialized;
}
