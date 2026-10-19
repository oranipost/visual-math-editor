import { compileExpression, PLOT_LIMITS, type CompiledExpression, type PlotFailure, type PlotSpec } from './plot-engine';
import { validPlotBounds, zoomPlotBounds } from './plot-interaction';

export interface SurfacePoint { x: number; y: number; z: number }
export type SurfaceSpec = PlotSpec & {
  mode: 'surface'; zMin: number; zMax: number; azimuth: number; elevation: number;
};
export type SurfacePlotResult = PlotFailure | {
  ok: true; spec: SurfaceSpec; svg: string; segments: SurfacePoint[][]; sampleCount: number;
};

export const DEFAULT_SURFACE_SPEC: Readonly<SurfaceSpec> = Object.freeze({
  mode: 'surface', expression: 'sin(sqrt(x^2+y^2))',
  xMin: -5, xMax: 5, yMin: -5, yMax: 5, zMin: -2, zMax: 2,
  azimuth: 45, elevation: 30,
});
export const SURFACE_LIMITS = Object.freeze({ meshIntervals: 28, minimumMeshIntervals: 6, refinementDepth: 6 });

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));
const wrapAngle = (value: number): number => ((value % 360) + 360) % 360;

function numericSurfaceSpec(input: PlotSpec): SurfaceSpec | undefined {
  if (!input || input.mode !== 'surface' || !validPlotBounds(input)) return undefined;
  const spec: SurfaceSpec = {
    ...input, mode: 'surface',
    zMin: input.zMin ?? DEFAULT_SURFACE_SPEC.zMin, zMax: input.zMax ?? DEFAULT_SURFACE_SPEC.zMax,
    azimuth: input.azimuth ?? DEFAULT_SURFACE_SPEC.azimuth, elevation: input.elevation ?? DEFAULT_SURFACE_SPEC.elevation,
  };
  if (!validPlotBounds({ xMin: spec.zMin, xMax: spec.zMax, yMin: spec.zMin, yMax: spec.zMax })
    || !Number.isFinite(spec.azimuth) || !Number.isFinite(spec.elevation)
    || spec.elevation < 10 || spec.elevation > 80) return undefined;
  return { ...spec, azimuth: wrapAngle(spec.azimuth) };
}

export function validateSurfaceSpec(input: PlotSpec): { ok: true; spec: SurfaceSpec } | PlotFailure {
  const spec = numericSurfaceSpec(input);
  if (!spec) return { ok: false, error: 'Use valid X, Y and Z ranges; the 3D elevation must be between 10 and 80 degrees.' };
  const compiled = compileExpression(spec.expression, ['x', 'y']);
  return compiled.ok ? { ok: true, spec: { ...spec, expression: compiled.expression } } : compiled;
}

/** Orbit the draft camera. Degrees are persisted with the graph, without changing its equation. */
export function rotateSurfaceCamera(input: PlotSpec, deltaAzimuth: number, deltaElevation: number): SurfaceSpec | undefined {
  const spec = numericSurfaceSpec(input);
  if (!spec || !Number.isFinite(deltaAzimuth) || !Number.isFinite(deltaElevation)) return undefined;
  return { ...spec, azimuth: wrapAngle(spec.azimuth + deltaAzimuth), elevation: clamp(spec.elevation + deltaElevation, 10, 80) };
}

/** Center zoom changes all three numeric ranges; factors below one zoom in. */
export function zoomSurfaceBounds(input: PlotSpec, factor: number): SurfaceSpec | undefined {
  const spec = numericSurfaceSpec(input);
  if (!spec || !Number.isFinite(factor) || factor <= 0) return undefined;
  const xy = zoomPlotBounds(spec, factor);
  const z = zoomPlotBounds({ xMin: spec.zMin, xMax: spec.zMax, yMin: spec.zMin, yMax: spec.zMax }, factor);
  return xy && z ? { ...spec, ...xy, zMin: z.xMin, zMax: z.xMax } : undefined;
}

class SurfaceSamplingError extends Error {}
function samePoint(a: SurfacePoint, b: SurfacePoint): boolean { return a.x === b.x && a.y === b.y && a.z === b.z; }

function clipEdge(a: SurfacePoint, b: SurfacePoint, spec: SurfaceSpec): [SurfacePoint, SurfacePoint] | undefined {
  if ((a.z < spec.zMin && b.z < spec.zMin) || (a.z > spec.zMax && b.z > spec.zMax)) return undefined;
  const clip = (point: SurfacePoint): SurfacePoint => {
    if (point.z >= spec.zMin && point.z <= spec.zMax) return point;
    const z = clamp(point.z, spec.zMin, spec.zMax);
    // Scaling before subtraction keeps opposite finite values near 1e308 from
    // overflowing their difference and producing an invalid clipping fraction.
    const magnitude = Math.max(Math.abs(a.z), Math.abs(b.z), Math.abs(z));
    const fraction = ((z / magnitude) - (a.z / magnitude)) / ((b.z / magnitude) - (a.z / magnitude));
    return { x: a.x + fraction * (b.x - a.x), y: a.y + fraction * (b.y - a.y), z };
  };
  const start = clip(a), end = clip(b);
  return samePoint(start, end) ? undefined : [start, end];
}

function sampleSurface(compiled: CompiledExpression, spec: SurfaceSpec): { segments: SurfacePoint[][]; sampleCount: number } {
  const cache = new Map<string, SurfacePoint>();
  const segments: SurfacePoint[][] = [];
  let current: SurfacePoint[] | undefined, work = 0;
  const reserve = (): void => {
    work += compiled.evaluationCost;
    if (work > PLOT_LIMITS.arithmeticWork) throw new SurfaceSamplingError('The surface is too complex. Simplify the equation or narrow its ranges.');
  };
  const point = (x: number, y: number): SurfacePoint => {
    const key = `${x},${y}`, prior = cache.get(key);
    if (prior) return prior;
    if (cache.size >= PLOT_LIMITS.evaluations) throw new SurfaceSamplingError('The surface is too complex. Simplify the equation or narrow its ranges.');
    reserve();
    const result = { x, y, z: compiled.evaluate(x, y) };
    cache.set(key, result);
    return result;
  };
  const gap = (): void => { current = undefined; };
  const line = (a: SurfacePoint, b: SurfacePoint): void => {
    const pair = clipEdge(a, b, spec);
    if (!pair) { gap(); return; }
    if (current && samePoint(current[current.length - 1], pair[0])) current.push(pair[1]);
    else { current = [pair[0], pair[1]]; segments.push(current); }
    if (!samePoint(pair[1], b)) gap();
  };
  const tolerance = (spec.zMax - spec.zMin) / 220;
  const interval = (a: SurfacePoint, b: SurfacePoint, depth: number): void => {
    const middle = point(a.x + (b.x - a.x) / 2, a.y + (b.y - a.y) / 2);
    const finite = [a.z, middle.z, b.z].every(Number.isFinite);
    if ([a.z, middle.z, b.z].every(value => !Number.isFinite(value))) { gap(); return; }
    if (finite && ((a.z < spec.zMin && middle.z < spec.zMin && b.z < spec.zMin)
      || (a.z > spec.zMax && middle.z > spec.zMax && b.z > spec.zMax))) { gap(); return; }
    reserve();
    const boundary = compiled.crossesDomainBoundary(a.x, middle.x, a.y, middle.y)
      || compiled.crossesDomainBoundary(middle.x, b.x, middle.y, b.y);
    const error = finite && !boundary ? Math.abs(middle.z - (a.z / 2 + b.z / 2)) : Infinity;
    if ((!finite || error > tolerance) && depth < SURFACE_LIMITS.refinementDepth) {
      interval(a, middle, depth + 1);
      interval(middle, b, depth + 1);
      return;
    }
    if (!finite || error > tolerance * 4) { gap(); return; }
    line(a, middle);
    line(middle, b);
  };
  // Reserve room for midpoint checks, domain guards and local refinement. A costly
  // valid expression gets a coarser mesh instead of unbounded synchronous work.
  const budget = Math.min(PLOT_LIMITS.evaluations, PLOT_LIMITS.arithmeticWork / compiled.evaluationCost);
  const steps = Math.min(SURFACE_LIMITS.meshIntervals, Math.floor(Math.sqrt(budget / 10)));
  if (steps < SURFACE_LIMITS.minimumMeshIntervals) throw new SurfaceSamplingError('The surface is too complex. Simplify the equation before plotting it.');
  const axisValue = (minimum: number, maximum: number, index: number): number => index === steps ? maximum : minimum + (maximum - minimum) * index / steps;
  for (const alongX of [true, false]) for (let row = 0; row <= steps; row++) {
    gap();
    const fixed = alongX ? axisValue(spec.yMin, spec.yMax, row) : axisValue(spec.xMin, spec.xMax, row);
    let left = alongX ? point(spec.xMin, fixed) : point(fixed, spec.yMin);
    for (let column = 1; column <= steps; column++) {
      const varying = alongX ? axisValue(spec.xMin, spec.xMax, column) : axisValue(spec.yMin, spec.yMax, column);
      const right = alongX ? point(varying, fixed) : point(fixed, varying);
      interval(left, right, 0);
      left = right;
    }
  }
  return { segments, sampleCount: cache.size };
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
const decimal = (value: number): string => Number(value.toFixed(3)).toString();
const tickLabel = (value: number, span?: number): string => {
  const precision = span ? Math.max(7, Math.min(15, Math.ceil(Math.log10(Math.abs(value) / span)) + 3)) : 7;
  return value === 0 ? '0' : Number(value.toPrecision(precision)).toString();
};

function renderSurfaceSvg(spec: SurfaceSpec, segments: SurfacePoint[][]): string {
  const azimuth = spec.azimuth * Math.PI / 180, elevation = spec.elevation * Math.PI / 180;
  const project = (point: SurfacePoint): { x: number; y: number; depth: number } => {
    const x = 2 * (point.x - spec.xMin) / (spec.xMax - spec.xMin) - 1;
    const y = 2 * (point.y - spec.yMin) / (spec.yMax - spec.yMin) - 1;
    const z = 2 * (point.z - spec.zMin) / (spec.zMax - spec.zMin) - 1;
    const depth = x * Math.sin(azimuth) + y * Math.cos(azimuth);
    return { x: x * Math.cos(azimuth) - y * Math.sin(azimuth), y: z * Math.cos(elevation) - depth * Math.sin(elevation), depth: z * Math.sin(elevation) + depth * Math.cos(elevation) };
  };
  const corners: SurfacePoint[] = [];
  for (const x of [spec.xMin, spec.xMax]) for (const y of [spec.yMin, spec.yMax]) for (const z of [spec.zMin, spec.zMax]) corners.push({ x, y, z });
  const projected = corners.map(project);
  const minX = Math.min(...projected.map(p => p.x)), maxX = Math.max(...projected.map(p => p.x));
  const minY = Math.min(...projected.map(p => p.y)), maxY = Math.max(...projected.map(p => p.y));
  const scale = Math.min(580 / (maxX - minX), 290 / (maxY - minY));
  const screen = (point: SurfacePoint): { x: number; y: number; depth: number } => {
    const p = project(point);
    return { x: 400 + (p.x - (minX + maxX) / 2) * scale, y: 229 - (p.y - (minY + maxY) / 2) * scale, depth: p.depth };
  };
  const svgLine = (a: SurfacePoint, b: SurfacePoint): string => {
    const from = screen(a), to = screen(b);
    return `<line x1="${decimal(from.x)}" y1="${decimal(from.y)}" x2="${decimal(to.x)}" y2="${decimal(to.y)}"/>`;
  };
  const grid: string[] = [];
  for (let index = 0; index <= 5; index++) {
    const x = spec.xMin + (spec.xMax - spec.xMin) * index / 5, y = spec.yMin + (spec.yMax - spec.yMin) * index / 5;
    grid.push(svgLine({ x, y: spec.yMin, z: spec.zMin }, { x, y: spec.yMax, z: spec.zMin }));
    grid.push(svgLine({ x: spec.xMin, y, z: spec.zMin }, { x: spec.xMax, y, z: spec.zMin }));
  }
  const sorted = [...segments].sort((a, b) => {
    const depth = (segment: SurfacePoint[]): number => segment.reduce((sum, p) => sum + project(p).depth, 0) / segment.length;
    return depth(a) - depth(b);
  });
  const paths = sorted.map(segment => {
    const z = segment.reduce((sum, point) => sum + point.z, 0) / segment.length;
    const level = clamp((z - spec.zMin) / (spec.zMax - spec.zMin), 0, 1);
    const color = `hsl(${decimal(222 - level * 45)}, 72%, ${decimal(50 - level * 10)}%)`;
    return `<path d="${segment.map((point, index) => { const p = screen(point); return `${index ? 'L' : 'M'}${decimal(p.x)},${decimal(p.y)}`; }).join(' ')}" stroke="${color}"/>`;
  }).join('');
  const origin = { x: clamp(0, spec.xMin, spec.xMax), y: clamp(0, spec.yMin, spec.yMax), z: clamp(0, spec.zMin, spec.zMax) };
  const axes: Array<{ name: 'X' | 'Y' | 'Z'; key: 'x' | 'y' | 'z'; min: number; max: number; color: string }> = [
    { name: 'X', key: 'x', min: spec.xMin, max: spec.xMax, color: '#b91c1c' },
    { name: 'Y', key: 'y', min: spec.yMin, max: spec.yMax, color: '#047857' },
    { name: 'Z', key: 'z', min: spec.zMin, max: spec.zMax, color: '#6d28d9' },
  ];
  type LabelBox = { left: number; right: number; top: number; bottom: number };
  const occupied: LabelBox[] = [];
  const overlaps = (a: LabelBox, b: LabelBox): boolean => a.left < b.right + 10 && a.right > b.left - 10 && a.top < b.bottom + 8 && a.bottom > b.top - 8;
  const placeLabel = (text: string, p: { x: number; y: number }, size: number, attribute: string, color: string): string => {
    const width = Math.max(size, text.length * size * 0.59), height = size * 1.2;
    for (const [dx, dy] of [[0, -22], [24, 0], [-24, 0], [0, 23], [35, -26], [-35, 26], [45, 25], [-45, -25]]) {
      const x = clamp(p.x + dx, 36 + width / 2, 764 - width / 2), y = clamp(p.y + dy, 65 + height / 2, 396 - height / 2);
      const box = { left: x - width / 2, right: x + width / 2, top: y - height / 2, bottom: y + height / 2 };
      if (occupied.some(prior => overlaps(prior, box))) continue;
      occupied.push(box);
      return `<text ${attribute} x="${decimal(x)}" y="${decimal(y)}" text-anchor="middle" dominant-baseline="middle" fill="${color}" font-size="${size}"${size > 20 ? ' font-weight="700"' : ''}>${escapeXml(text)}</text>`;
    }
    return '';
  };
  const axisLines: string[] = [], axisLabels: string[] = [], tickLabels: string[] = [];
  for (const axis of axes) {
    const from = { ...origin, [axis.key]: axis.min }, to = { ...origin, [axis.key]: axis.max };
    axisLines.push(`<g data-surface-axis="${axis.name}" stroke="${axis.color}">${svgLine(from, to)}</g>`);
    axisLabels.push(placeLabel(axis.name, screen(to), 24, `data-axis-label="${axis.name}"`, axis.color));
  }
  for (const axis of axes) for (const value of [axis.min, axis.max]) {
    tickLabels.push(placeLabel(tickLabel(value, axis.max - axis.min), screen({ ...origin, [axis.key]: value }), 14, `data-axis-tick="${axis.name}"`, '#475569'));
  }
  const expression = spec.expression, shortExpression = expression.length > 65 ? `${expression.slice(0, 62)}…` : expression;
  const legend = axes.map((axis, index) => {
    const range = `${tickLabel(axis.min, axis.max - axis.min)} … ${tickLabel(axis.max, axis.max - axis.min)}`;
    const x = 141 + index * 259, fontSize = Math.min(13, 235 / (range.length * 0.59));
    return `<g data-surface-range="${axis.name}" fill="${axis.color}" text-anchor="middle"><text x="${x}" y="423" font-size="16" font-weight="700">${axis.name}</text><text x="${x}" y="444" font-size="${decimal(fontSize)}">${escapeXml(range)}</text></g>`;
  }).join('');
  const title = `3D surface: z = ${expression}; X, Y and Z axes`;
  return `<svg data-vme-plot="surface" xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480" style="max-width:100%;height:auto" role="img" aria-label="${escapeXml(title)}"><title>${escapeXml(title)}</title><desc>Approximate numerical wireframe of z = f(x,y). Each axis is scaled independently to its displayed range. Trigonometric arguments use radians. Missing real values and unresolved discontinuities are omitted.</desc><rect width="800" height="480" rx="12" fill="#fff"/><g font-family="system-ui, sans-serif"><text x="48" y="31" fill="#1f2937" font-size="17">${escapeXml(`z = ${shortExpression}`)}</text><rect data-plot-frame="true" x="40" y="51" width="720" height="350" fill="transparent"/><g fill="none" stroke="#e2e8f0" stroke-width="1">${grid.join('')}</g><g fill="none" stroke-width="1.1" stroke-opacity="0.82" stroke-linecap="round" stroke-linejoin="round">${paths}</g><g fill="none" stroke-width="2">${axisLines.join('')}</g><g paint-order="stroke" stroke="#fff" stroke-width="4" stroke-linejoin="round">${axisLabels.join('')}${tickLabels.join('')}</g>${legend}<text x="48" y="462" font-size="12" fill="#64748b">≈ · rad · ${escapeXml(`${tickLabel(spec.azimuth)}° / ${tickLabel(spec.elevation)}°`)}</text></g></svg>`;
}

export function createSurfacePlot(input: PlotSpec): SurfacePlotResult {
  const validated = validateSurfaceSpec(input);
  if (!validated.ok) return validated;
  const compiled = compileExpression(validated.spec.expression, ['x', 'y']);
  if (!compiled.ok) return compiled;
  try {
    const sampled = sampleSurface(compiled, validated.spec);
    if (!sampled.segments.length) return { ok: false, error: 'No finite surface is visible. Check the equation or adjust the X, Y and Z ranges.' };
    return { ok: true, ...sampled, spec: validated.spec, svg: renderSurfaceSvg(validated.spec, sampled.segments) };
  } catch (error) {
    return { ok: false, error: error instanceof SurfaceSamplingError ? error.message : 'The surface could not be generated.' };
  }
}

export interface SurfaceInteractionOptions {
  getSpec: () => PlotSpec;
  onChange: (spec: SurfaceSpec) => void;
  onReset?: () => void;
}

/** Gestures update an editor draft; this helper never writes to a note. */
export function mountSurfaceInteraction(host: HTMLElement, options: SurfaceInteractionOptions): {
  destroy: () => void; setDisabled: (disabled: boolean) => void;
} {
  const win = host.ownerDocument.defaultView;
  const classes = ['vme-plot-interactive', 'vme-plot-enabled', 'vme-plot-dragging'];
  const original = new Set(classes.filter(name => host.classList.contains(name)));
  host.classList.add('vme-plot-interactive', 'vme-plot-enabled');
  const pointers = new Map<number, { x: number; y: number }>();
  let destroyed = false, disabled = false, animation: number | undefined, pending: SurfaceSpec | undefined;
  let baseline: { spec: SurfaceSpec; positions: Array<{ x: number; y: number }>; width: number; height: number; moved: boolean } | undefined;
  const available = (): boolean => !destroyed && !disabled && host.isConnected && Boolean(win);
  const getSpec = (): SurfaceSpec | undefined => numericSurfaceSpec(pending ?? options.getSpec());
  const ignored = (target: EventTarget | null): boolean => {
    const candidate = target as Element | null;
    const control = typeof candidate?.closest === 'function' ? candidate.closest('button, input, select, textarea, a, [contenteditable="true"], [data-plot-ignore]') : undefined;
    return Boolean(control && host.contains(control));
  };
  const frame = (): DOMRect | undefined => {
    const rect = host.querySelector<SVGGraphicsElement>('svg [data-plot-frame]')?.getBoundingClientRect();
    return rect && Number.isFinite(rect.width) && Number.isFinite(rect.height) && rect.width > 0 && rect.height > 0 ? rect : undefined;
  };
  const inside = (x: number, y: number, rect: DOMRect): boolean => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  const schedule = (spec: SurfaceSpec | undefined): boolean => {
    if (!available() || !spec) return false;
    const prior = getSpec();
    if (prior && (['xMin', 'xMax', 'yMin', 'yMax', 'zMin', 'zMax', 'azimuth', 'elevation'] as const).every(key => prior[key] === spec[key])) return false;
    pending = spec;
    if (animation === undefined) animation = win!.requestAnimationFrame(() => {
      animation = undefined;
      const value = pending;
      pending = undefined;
      if (available() && value) options.onChange(value);
    });
    return true;
  };
  const release = (id: number): void => { try { if (host.hasPointerCapture(id)) host.releasePointerCapture(id); } catch { /* Browser already released capture. */ } };
  const clear = (dropPending: boolean): void => {
    const ids = [...pointers.keys()];
    pointers.clear(); baseline = undefined;
    for (const id of ids) release(id);
    host.classList.remove('vme-plot-dragging');
    if (dropPending) {
      pending = undefined;
      if (animation !== undefined && win) win.cancelAnimationFrame(animation);
      animation = undefined;
    }
  };
  const start = (): void => {
    const spec = getSpec(), rect = frame();
    baseline = spec && rect ? { spec, width: rect.width, height: rect.height, positions: [...pointers.values()].map(p => ({ ...p })), moved: false } : undefined;
  };
  const pointerDown = (event: PointerEvent): void => {
    const rect = frame();
    if (!available() || event.button !== 0 || pointers.size >= 2 || ignored(event.target) || !rect || !inside(event.clientX, event.clientY, rect) || !getSpec()) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); start();
    try { host.setPointerCapture(event.pointerId); } catch { clear(true); return; }
    event.preventDefault(); event.stopPropagation();
  };
  const pointerMove = (event: PointerEvent): void => {
    if (!available() || !baseline || !pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const positions = [...pointers.values()], initial = baseline.positions;
    if (positions.length !== initial.length || !positions.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))) return;
    let spec: SurfaceSpec | undefined;
    if (positions.length === 1) {
      const dx = positions[0].x - initial[0].x, dy = positions[0].y - initial[0].y;
      if (!baseline.moved && Math.hypot(dx, dy) < 4) return;
      baseline.moved = true;
      spec = rotateSurfaceCamera(baseline.spec, -dx / baseline.width * 360, dy / baseline.height * 120);
    } else {
      const before = Math.hypot(initial[0].x - initial[1].x, initial[0].y - initial[1].y);
      const after = Math.hypot(positions[0].x - positions[1].x, positions[0].y - positions[1].y);
      if (before < 1 || after < 1 || (!baseline.moved && Math.abs(before - after) < 4)) return;
      baseline.moved = true;
      spec = zoomSurfaceBounds(baseline.spec, before / after);
    }
    if (schedule(spec)) { host.classList.add('vme-plot-dragging'); event.preventDefault(); event.stopPropagation(); }
  };
  const pointerUp = (event: PointerEvent): void => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId); release(event.pointerId);
    if (pointers.size) start(); else clear(false);
  };
  const pointerCancel = (event: PointerEvent): void => { if (pointers.has(event.pointerId)) clear(true); };
  const wheel = (event: WheelEvent): void => {
    if (!available() || pointers.size || ignored(event.target) || !Number.isFinite(event.deltaY) || event.deltaY === 0) return;
    const rect = frame(), spec = getSpec();
    if (!rect || !spec || !inside(event.clientX, event.clientY, rect)) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
    if (schedule(zoomSurfaceBounds(spec, Math.exp(clamp(event.deltaY * unit, -100, 100) * 0.002)))) {
      event.preventDefault(); event.stopPropagation();
    }
  };
  host.addEventListener('pointerdown', pointerDown);
  host.addEventListener('pointermove', pointerMove);
  host.addEventListener('pointerup', pointerUp);
  host.addEventListener('pointercancel', pointerCancel);
  host.addEventListener('lostpointercapture', pointerCancel);
  host.addEventListener('wheel', wheel, { passive: false });
  return {
    setDisabled(value) { if (destroyed) return; disabled = value; if (value) clear(true); host.classList.toggle('vme-plot-enabled', !value); },
    destroy() {
      if (destroyed) return; destroyed = true; clear(true);
      host.removeEventListener('pointerdown', pointerDown); host.removeEventListener('pointermove', pointerMove);
      host.removeEventListener('pointerup', pointerUp); host.removeEventListener('pointercancel', pointerCancel);
      host.removeEventListener('lostpointercapture', pointerCancel); host.removeEventListener('wheel', wheel);
      for (const name of classes) host.classList.toggle(name, original.has(name));
    },
  };
}
