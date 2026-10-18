import { PLOT_LIMITS, type PlotFailure, type PlotSpec } from './plot-engine';

/** Complex plotting accepts literal Cartesian numbers only, never executable expressions. */
export interface ComplexPlaneSpec extends PlotSpec { mode: 'complex' }
export interface ComplexPoint { re: number; im: number; label: string; source: string }
export type ComplexPlotResult = PlotFailure | {
  ok: true;
  svg: string;
  spec: ComplexPlaneSpec;
  points: ComplexPoint[];
  visibleCount: number;
};
export interface ComplexPlotFrame { left: number; top: number; width: number; height: number }
export const COMPLEX_LIMITS = Object.freeze({ points: 20, expressionLength: 1000 });
export const DEFAULT_COMPLEX_SPEC: Readonly<ComplexPlaneSpec> = Object.freeze({
  mode: 'complex', expression: '3+2i\n-2+i', xMin: -5, xMax: 5, yMin: -5, yMax: 5,
});

const NUMBER = '(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
// Whitespace may separate a sign or an i, but never join two numeric tokens.
const REAL = new RegExp(`^([+-]?)\\s*(${NUMBER})$`);
const IMAGINARY = new RegExp(`^([+-]?)\\s*(${NUMBER})?\\s*i$`);
const CARTESIAN = new RegExp(`^([+-]?)\\s*(${NUMBER})\\s*([+-])\\s*(${NUMBER})?\\s*i$`);

function numberValue(text: string | undefined, sign: string): number | undefined {
  const magnitude = text === undefined ? 1 : Number(text);
  if (!Number.isFinite(magnitude) || magnitude > PLOT_LIMITS.absoluteBound) return undefined;
  // Do not silently turn an unrepresentable nonzero literal into the origin.
  if (magnitude === 0 && text && /[1-9]/.test(text.split(/[eE]/)[0])) return undefined;
  const value = sign === '-' ? -magnitude : magnitude;
  return Object.is(value, -0) ? 0 : value;
}

export function formatComplex(point: Pick<ComplexPoint, 're' | 'im'>): string {
  const real = Object.is(point.re, -0) ? 0 : point.re;
  const imaginary = Object.is(point.im, -0) ? 0 : point.im;
  if (imaginary === 0) return String(real);
  const coefficient = Math.abs(imaginary) === 1 ? '' : String(Math.abs(imaginary));
  if (real === 0) return `${imaginary < 0 ? '-' : ''}${coefficient}i`;
  return `${real} ${imaginary < 0 ? '-' : '+'} ${coefficient}i`;
}

export function parseComplexNumbers(input: string): { ok: true; points: ComplexPoint[]; expression: string } | PlotFailure {
  if (typeof input !== 'string') return { ok: false, error: 'Enter a complex number such as 3+2i, one per line.' };
  if (input.length > COMPLEX_LIMITS.expressionLength) return { ok: false, error: 'Complex-number input is too long (maximum 1000 characters).' };
  if (!input.trim()) return { ok: false, error: 'Enter a complex number such as 3+2i, one per line.' };
  const points: ComplexPoint[] = [];
  const sources: string[] = [];
  const lines = input.split(/\r\n|\n|\r/);
  for (let index = 0; index < lines.length; index++) {
    const source = lines[index].trim();
    if (!source) continue;
    if (points.length >= COMPLEX_LIMITS.points) return { ok: false, error: 'Use at most 20 complex numbers, one per line.' };
    const normalized = source.replace(/−/g, '-');
    let re: number | undefined = 0, im: number | undefined = 0;
    const cartesian = CARTESIAN.exec(normalized);
    const imaginary = !cartesian && IMAGINARY.exec(normalized);
    const real = !cartesian && !imaginary && REAL.exec(normalized);
    if (cartesian) {
      re = numberValue(cartesian[2], cartesian[1]);
      im = numberValue(cartesian[4], cartesian[3]);
    } else if (imaginary) im = numberValue(imaginary[2], imaginary[1]);
    else if (real) re = numberValue(real[2], real[1]);
    else return { ok: false, error: `Line ${index + 1}: enter a literal such as 3+2i, -i, or 4. Expressions and labels are not supported.` };
    if (re === undefined || im === undefined) return { ok: false, error: `Line ${index + 1}: real and imaginary parts must be representable finite numbers between -1000000 and 1000000.` };
    points.push({ re, im, label: `z${points.length + 1}`, source });
    sources.push(source);
  }
  return { ok: true, points, expression: sources.join('\n') };
}

export function validateComplexSpec(input: ComplexPlaneSpec): { ok: true; spec: ComplexPlaneSpec; points: ComplexPoint[] } | PlotFailure {
  if (!input || typeof input !== 'object' || input.mode !== 'complex') return { ok: false, error: 'Complex-plane settings are missing.' };
  for (const key of ['xMin', 'xMax', 'yMin', 'yMax'] as const) {
    if (!Number.isFinite(input[key]) || Math.abs(input[key]) > PLOT_LIMITS.absoluteBound) {
      return { ok: false, error: 'Axis bounds must be finite numbers between -1000000 and 1000000.' };
    }
  }
  for (const [minimum, maximum] of [[input.xMin, input.xMax], [input.yMin, input.yMax]]) {
    if (!(maximum > minimum)) return { ok: false, error: 'Each axis minimum must be smaller than its maximum.' };
    if (maximum - minimum < PLOT_LIMITS.minimumSpan) return { ok: false, error: 'Each axis range must span at least 0.000000001.' };
    if (maximum - minimum < Math.max(Math.abs(minimum), Math.abs(maximum)) * Number.EPSILON * 4096) {
      return { ok: false, error: 'Axis ranges are too narrow for their magnitude.' };
    }
  }
  const parsed = parseComplexNumbers(input.expression);
  if (!parsed.ok) return parsed;
  return { ok: true, spec: { mode: 'complex', expression: parsed.expression, xMin: input.xMin, xMax: input.xMax, yMin: input.yMin, yMax: input.yMax }, points: parsed.points };
}

/** A square numeric window includes the origin and every valid point, plus padding when possible. */
export function fitComplexPoints(points: readonly Pick<ComplexPoint, 're' | 'im'>[]): Pick<PlotSpec, 'xMin' | 'xMax' | 'yMin' | 'yMax'> {
  if (!points.length || points.some(point => !Number.isFinite(point.re) || !Number.isFinite(point.im)
    || Math.abs(point.re) > PLOT_LIMITS.absoluteBound || Math.abs(point.im) > PLOT_LIMITS.absoluteBound)) {
    return { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
  }
  const xMin = Math.min(0, ...points.map(point => point.re)), xMax = Math.max(0, ...points.map(point => point.re));
  const yMin = Math.min(0, ...points.map(point => point.im)), yMax = Math.max(0, ...points.map(point => point.im));
  const span = Math.max(xMax - xMin, yMax - yMin);
  // A zero-only set needs a useful default window. Nonzero values, including
  // micro-scale values, fit to their own magnitude instead of collapsing onto
  // a visually indistinguishable point at the origin. Twice the minimum span
  // gives endpoint rounding room at the numerical zoom limit.
  const side = span === 0 ? 2 : Math.min(PLOT_LIMITS.absoluteBound * 2, Math.max(PLOT_LIMITS.minimumSpan * 2, span * 1.3));
  const fit = (minimum: number, maximum: number): [number, number] => {
    let from = (minimum + maximum) / 2 - side / 2;
    from = Math.max(-PLOT_LIMITS.absoluteBound, Math.min(PLOT_LIMITS.absoluteBound - side, from));
    return [from, from + side];
  };
  const [fromX, toX] = fit(xMin, xMax), [fromY, toY] = fit(yMin, yMax);
  return { xMin: fromX, xMax: toX, yMin: fromY, yMax: toY };
}

function ticks(minimum: number, maximum: number): number[] {
  const raw = (maximum - minimum) / 7;
  const power = 10 ** Math.floor(Math.log10(raw));
  const scaled = raw / power;
  const step = (scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10) * power;
  const first = Math.ceil(minimum / step), last = Math.floor(maximum / step);
  const values: number[] = [];
  for (let index = first; index <= last && values.length < 16; index++) values.push(index * step);
  return values;
}
function formatTick(value: number, span: number): string {
  if (value === 0) return '0';
  const precision = Math.max(6, Math.min(15, Math.ceil(Math.log10(Math.abs(value) / span)) + 3));
  return Number(value.toPrecision(precision)).toString();
}
function labelWidth(text: string): number { return text.length * 9.7; }

/** Shared by the renderer and pointer gestures. Pixel lengths preserve complex angles. */
export function complexPlotFrame(spec: PlotSpec): ComplexPlotFrame {
  const longestTick = Math.max(0, ...ticks(spec.yMin, spec.yMax).map(value => labelWidth(formatTick(value, spec.yMax - spec.yMin))));
  const availableLeft = Math.max(110, 30 + longestTick), availableRight = 724;
  const availableWidth = availableRight - availableLeft, availableHeight = 326;
  const scale = Math.min(availableWidth / (spec.xMax - spec.xMin), availableHeight / (spec.yMax - spec.yMin));
  const width = (spec.xMax - spec.xMin) * scale, height = (spec.yMax - spec.yMin) * scale;
  return { left: availableLeft + (availableWidth - width) / 2, top: 64 + (availableHeight - height) / 2, width, height };
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function coordinate(value: number): string { return Number(value.toPrecision(12)).toString(); }
interface LabelBox { left: number; top: number; right: number; bottom: number }
function intersects(a: LabelBox, b: LabelBox): boolean { return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; }

function renderComplexSvg(spec: ComplexPlaneSpec, points: ComplexPoint[]): { svg: string; visibleCount: number } {
  const frame = complexPlotFrame(spec);
  const { left, top, width, height } = frame, right = left + width, bottom = top + height;
  const sx = (real: number): number => left + (real - spec.xMin) / (spec.xMax - spec.xMin) * width;
  const sy = (imaginary: number): number => top + (spec.yMax - imaginary) / (spec.yMax - spec.yMin) * height;
  const grid: string[] = [], labels: string[] = [], axes: string[] = [];
  const horizontalTicks = ticks(spec.xMin, spec.xMax).map(value => ({ value, tick: formatTick(value, spec.xMax - spec.xMin) }));
  const realAxisLabelX = Math.min(774, right + Math.max(44, 36 + Math.max(0, ...horizontalTicks.map(({ tick }) => labelWidth(tick) / 2))));
  let previousLabelRight = -Infinity;
  for (const { value, tick } of horizontalTicks) {
    const x = sx(value), half = labelWidth(tick) / 2;
    grid.push(`<line x1="${coordinate(x)}" y1="${coordinate(top)}" x2="${coordinate(x)}" y2="${coordinate(bottom)}"/>`);
    if (x - half >= 14 && x + half <= realAxisLabelX - 30 && x - half >= previousLabelRight + 16) {
      labels.push(`<text data-axis-tick="Re" x="${coordinate(x)}" y="${coordinate(bottom + 28)}" text-anchor="middle">${escapeXml(tick)}</text>`);
      previousLabelRight = x + half;
    }
  }
  let previousLabelBottom = -Infinity;
  for (const value of ticks(spec.yMin, spec.yMax).reverse()) {
    const y = sy(value), tick = formatTick(value, spec.yMax - spec.yMin);
    grid.push(`<line x1="${coordinate(left)}" y1="${coordinate(y)}" x2="${coordinate(right)}" y2="${coordinate(y)}"/>`);
    if (y - 8 >= previousLabelBottom + 8) {
      labels.push(`<text data-axis-tick="Im" x="${coordinate(left - 16)}" y="${coordinate(y)}" text-anchor="end" dominant-baseline="middle">${escapeXml(tick)}</text>`);
      previousLabelBottom = y + 8;
    }
  }
  if (spec.xMin <= 0 && spec.xMax >= 0) axes.push(`<line data-axis="Im" x1="${coordinate(sx(0))}" y1="${coordinate(top)}" x2="${coordinate(sx(0))}" y2="${coordinate(bottom)}"/>`);
  if (spec.yMin <= 0 && spec.yMax >= 0) axes.push(`<line data-axis="Re" x1="${coordinate(left)}" y1="${coordinate(sy(0))}" x2="${coordinate(right)}" y2="${coordinate(sy(0))}"/>`);
  const visible = points.filter(point => point.re >= spec.xMin && point.re <= spec.xMax && point.im >= spec.yMin && point.im <= spec.yMax);
  const markerBoxes: LabelBox[] = visible.map(point => ({ left: sx(point.re) - 9, right: sx(point.re) + 9, top: sy(point.im) - 9, bottom: sy(point.im) + 9 }));
  const labelBoxes: LabelBox[] = [];
  const pointShapes: string[] = [], projectionShapes: string[] = [];
  visible.forEach(point => {
    const x = sx(point.re), y = sy(point.im);
    if (spec.yMin <= 0 && spec.yMax >= 0 && point.im !== 0) projectionShapes.push(`<line x1="${coordinate(x)}" y1="${coordinate(y)}" x2="${coordinate(x)}" y2="${coordinate(sy(0))}"/>`);
    if (spec.xMin <= 0 && spec.xMax >= 0 && point.re !== 0) projectionShapes.push(`<line x1="${coordinate(x)}" y1="${coordinate(y)}" x2="${coordinate(sx(0))}" y2="${coordinate(y)}"/>`);
    const description = `${point.label} = ${formatComplex(point)}`;
    pointShapes.push(`<circle data-complex-point="${point.label}" cx="${coordinate(x)}" cy="${coordinate(y)}" r="5.5"><title>${escapeXml(description)}</title></circle>`);
    // Try complete values first. Crowded points retain short numbered labels and
    // SVG titles; the editor's point list always contains their complete values.
    for (const text of [description, point.label]) {
      const textWidth = text.length * 8.1, textHeight = 19;
      const candidates = [[12, -25], [12, 12], [-textWidth - 12, -25], [-textWidth - 12, 12], [-textWidth / 2, -35], [-textWidth / 2, 18]];
      let placed = false;
      for (const [dx, dy] of candidates) {
        const textLeft = Math.max(left + 3, Math.min(right - textWidth - 3, x + dx));
        const textTop = Math.max(top + 3, Math.min(bottom - textHeight - 3, y + dy));
        const box = { left: textLeft - 3, right: textLeft + textWidth + 3, top: textTop - 2, bottom: textTop + textHeight + 2 };
        if (box.left < left || box.right > right || box.top < top || box.bottom > bottom || markerBoxes.some(marker => intersects(box, marker)) || labelBoxes.some(prior => intersects(box, prior))) continue;
        labelBoxes.push(box);
        pointShapes.push(`<text data-complex-label="${point.label}" x="${coordinate(textLeft)}" y="${coordinate(textTop + 15)}" font-size="15" fill="#1e40af" stroke="#fff" stroke-width="3.5" paint-order="stroke">${escapeXml(text)}</text>`);
        placed = true;
        break;
      }
      if (placed) break;
    }
  });
  const title = 'Complex plane';
  const description = `Horizontal real axis Re; vertical imaginary axis Im. Equal unit lengths on both axes. ${visible.length} of ${points.length} points visible. ${points.map(point => `${point.label} = ${formatComplex(point)}`).join('; ')}.`;
  const footer = `${visible.length}/${points.length} points · equal units`;
  return { visibleCount: visible.length, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480" style="max-width:100%;height:auto" role="img" aria-label="${escapeXml(description)}"><title>${title}</title><desc>${escapeXml(description)}</desc><rect width="800" height="480" rx="12" fill="#fff"/><g font-family="system-ui, sans-serif" fill="#1f2937"><text x="${coordinate(left)}" y="31" font-size="17">${title}</text><g stroke="#e5e7eb" stroke-width="1">${grid.join('')}</g><rect data-plot-frame="true" x="${coordinate(left)}" y="${coordinate(top)}" width="${coordinate(width)}" height="${coordinate(height)}" fill="none" stroke="#cbd5e1"/><g stroke="#64748b" stroke-width="1.3">${axes.join('')}</g><g font-size="16">${labels.join('')}</g><g font-size="22" font-weight="700"><text data-axis-label="Re" x="${coordinate(realAxisLabelX)}" y="${coordinate(bottom + 28)}" text-anchor="middle">Re</text><text data-axis-label="Im" x="${coordinate(left - 62)}" y="35" text-anchor="middle">Im</text></g><g stroke="#93c5fd" stroke-width="1.2" stroke-dasharray="4 4">${projectionShapes.join('')}</g><g fill="#2563eb" stroke="#fff" stroke-width="1.5">${pointShapes.join('')}</g><text x="${coordinate(left)}" y="455" font-size="12" fill="#64748b">${footer}</text></g></svg>` };
}

export function createComplexPlot(input: ComplexPlaneSpec): ComplexPlotResult {
  const validated = validateComplexSpec(input);
  if (!validated.ok) return validated;
  return { ok: true, spec: validated.spec, points: validated.points, ...renderComplexSvg(validated.spec, validated.points) };
}
