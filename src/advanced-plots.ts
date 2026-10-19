import {
  compileExpression, PLOT_LIMITS, renderSvg, sampleCurve, validatePlotSpec,
  type CompiledExpression, type PlotFailure, type PlotPoint, type PlotResult, type PlotSpec,
} from './plot-engine';

export type AdvancedPlotResult = PlotFailure | (Extract<PlotResult, { ok: true }> & {
  /** Numerical estimate only; this is not symbolic integration or a convergence proof. */
  integralValue?: number;
  integralError?: number;
});

export const ADVANCED_PLOT_LIMITS = Object.freeze({ maximumThetaSpan: 100 * Math.PI, integrationDepth: 24 });

function fail(error: string): never { throw new Error(error); }
function escaped(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function finiteRange(minimum: number, maximum: number): boolean {
  return Number.isFinite(minimum) && Number.isFinite(maximum)
    && Math.abs(minimum) <= PLOT_LIMITS.absoluteBound && Math.abs(maximum) <= PLOT_LIMITS.absoluteBound
    && maximum - minimum >= PLOT_LIMITS.minimumSpan
    && maximum - minimum >= Math.max(Math.abs(minimum), Math.abs(maximum)) * Number.EPSILON * 4096;
}

export function validatePolarSpec(input: PlotSpec): { ok: true; spec: PlotSpec } | PlotFailure {
  if (!input || input.mode !== 'polar') return { ok: false, error: 'Unsupported polar graph settings.' };
  if (input.calculus !== undefined && input.calculus !== 'none') return { ok: false, error: 'Calculus overlays are available for function graphs only.' };
  const axes = validatePlotSpec({ ...input, mode: 'function', expression: '0' });
  if (!axes.ok) return axes;
  const thetaMin = input.thetaMin ?? 0, thetaMax = input.thetaMax ?? 2 * Math.PI;
  if (!finiteRange(thetaMin, thetaMax) || thetaMax - thetaMin > ADVANCED_PLOT_LIMITS.maximumThetaSpan) {
    return { ok: false, error: 'Theta bounds must increase, be finite, and span no more than 100π radians.' };
  }
  const compiled = compileExpression(input.expression, ['theta']);
  if (!compiled.ok) return compiled;
  return { ok: true, spec: { ...input, mode: 'polar', expression: compiled.expression, thetaMin, thetaMax } };
}

/** Liang–Barsky clipping works for polar segments whose X coordinate is not monotonic. */
function clip(a: PlotPoint, b: PlotPoint, spec: PlotSpec): [PlotPoint, PlotPoint] | undefined {
  const dx = b.x - a.x, dy = b.y - a.y;
  let lower = 0, upper = 1;
  for (const [p, q] of [[-dx, a.x - spec.xMin], [dx, spec.xMax - a.x], [-dy, a.y - spec.yMin], [dy, spec.yMax - a.y]]) {
    if (p === 0) { if (q < 0) return undefined; continue; }
    const ratio = q / p;
    if (p < 0) lower = Math.max(lower, ratio); else upper = Math.min(upper, ratio);
    if (lower > upper) return undefined;
  }
  if (upper === lower) return undefined;
  // Interpolation rounding must not produce coordinates outside the serialized bounds.
  const point = (t: number): PlotPoint => ({
    x: Math.max(spec.xMin, Math.min(spec.xMax, a.x + t * dx)),
    y: Math.max(spec.yMin, Math.min(spec.yMax, a.y + t * dy)),
  });
  return [point(lower), point(upper)];
}

function samplePolar(compiled: CompiledExpression, spec: PlotSpec): { segments: PlotPoint[][]; sampleCount: number } {
  const cache = new Map<number, PlotPoint>();
  const limit = Math.min(PLOT_LIMITS.evaluations, Math.floor(PLOT_LIMITS.arithmeticWork / (compiled.evaluationCost + 8)));
  const segments: PlotPoint[][] = [];
  let current: PlotPoint[] | undefined;
  const tolerance = Math.min((spec.xMax - spec.xMin) / 614, (spec.yMax - spec.yMin) / 326) * 0.65;
  const at = (theta: number): PlotPoint => {
    const known = cache.get(theta);
    if (known) return known;
    if (cache.size >= limit) fail('The polar graph is too complex to sample. Simplify it or narrow the theta range.');
    const radius = compiled.evaluate(theta);
    const point = { x: radius * Math.cos(theta), y: radius * Math.sin(theta) };
    cache.set(theta, point);
    return point;
  };
  const finite = (p: PlotPoint): boolean => Number.isFinite(p.x) && Number.isFinite(p.y);
  const gap = (): void => { current = undefined; };
  const line = (a: PlotPoint, b: PlotPoint): void => {
    const pair = clip(a, b, spec);
    if (!pair) { gap(); return; }
    const end = current?.[current.length - 1];
    if (current && end?.x === pair[0].x && end.y === pair[0].y) current.push(pair[1]);
    else { current = [pair[0], pair[1]]; segments.push(current); }
    if (pair[1].x !== b.x || pair[1].y !== b.y) gap();
  };
  const interval = (from: number, to: number, a: PlotPoint, b: PlotPoint, depth: number): void => {
    const middle = from + (to - from) / 2, midpoint = at(middle);
    const valid = finite(a) && finite(b) && finite(midpoint);
    if (!finite(a) && !finite(b) && !finite(midpoint)) { gap(); return; }
    const boundary = compiled.crossesDomainBoundary(from, middle) || compiled.crossesDomainBoundary(middle, to);
    const error = valid && !boundary ? Math.hypot(midpoint.x - (a.x / 2 + b.x / 2), midpoint.y - (a.y / 2 + b.y / 2)) : Infinity;
    if (valid && !boundary && (
      (a.x < spec.xMin && b.x < spec.xMin && midpoint.x < spec.xMin)
      || (a.x > spec.xMax && b.x > spec.xMax && midpoint.x > spec.xMax)
      || (a.y < spec.yMin && b.y < spec.yMin && midpoint.y < spec.yMin)
      || (a.y > spec.yMax && b.y > spec.yMax && midpoint.y > spec.yMax))) { gap(); return; }
    if (error > tolerance && depth < 10) {
      interval(from, middle, a, midpoint, depth + 1);
      interval(middle, to, midpoint, b, depth + 1);
    } else if (!valid || boundary || error > tolerance * 4) gap();
    else { line(a, midpoint); line(midpoint, b); }
  };
  let previousTheta = spec.thetaMin!, previous = at(previousTheta);
  for (let i = 1; i <= 256; i++) {
    const theta = i === 256 ? spec.thetaMax! : spec.thetaMin! + (spec.thetaMax! - spec.thetaMin!) * i / 256;
    const point = at(theta);
    interval(previousTheta, theta, previous, point, 0);
    previousTheta = theta; previous = point;
  }
  return { segments, sampleCount: cache.size };
}

function polarSvg(spec: PlotSpec, segments: PlotPoint[][]): string {
  const xSpan = spec.xMax - spec.xMin, ySpan = spec.yMax - spec.yMin;
  const scale = Math.min(614 / xSpan, 326 / ySpan);
  const width = xSpan * scale, height = ySpan * scale;
  const left = 110 + (614 - width) / 2, top = 64 + (326 - height) / 2;
  const sx = (x: number): number => left + (x - spec.xMin) * scale;
  const sy = (y: number): number => top + (spec.yMax - y) * scale;
  const d = (n: number): string => n.toFixed(3).replace(/\.?0+$/, '');
  const maximumRadius = Math.max(...[spec.xMin, spec.xMax].flatMap(x => [spec.yMin, spec.yMax].map(y => Math.hypot(x, y))));
  const raw = maximumRadius / 5, power = 10 ** Math.floor(Math.log10(raw));
  const step = Math.ceil(raw / power) * power;
  const rings: string[] = [], spokes: string[] = [], labels: string[] = [];
  for (let radius = step, index = 0; radius <= maximumRadius && index < 8; radius += step, index++) {
    rings.push(`<circle cx="${d(sx(0))}" cy="${d(sy(0))}" r="${d(radius * scale)}"/>`);
    if (radius >= spec.xMin && radius <= spec.xMax && spec.yMin <= 0 && spec.yMax >= 0) {
      labels.push(`<text x="${d(sx(radius))}" y="${d(sy(0) - 9)}" text-anchor="middle">${escaped(Number(radius.toPrecision(5)).toString())}</text>`);
    }
  }
  for (let index = 0; index < 12; index++) {
    const theta = index * Math.PI / 6;
    spokes.push(`<line x1="${d(sx(0))}" y1="${d(sy(0))}" x2="${d(sx(maximumRadius * Math.cos(theta)))}" y2="${d(sy(maximumRadius * Math.sin(theta)))}"/>`);
  }
  const path = segments.map(segment => `<path d="${segment.map((point, index) => `${index ? 'L' : 'M'}${d(sx(point.x))},${d(sy(point.y))}`).join(' ')}"/>`).join('');
  const axes: string[] = [];
  if (spec.yMin <= 0 && spec.yMax >= 0) axes.push(`<line x1="${d(left)}" y1="${d(sy(0))}" x2="${d(left + width)}" y2="${d(sy(0))}"/>`);
  if (spec.xMin <= 0 && spec.xMax >= 0) axes.push(`<line x1="${d(sx(0))}" y1="${d(top)}" x2="${d(sx(0))}" y2="${d(top + height)}"/>`);
  const clipId = `vme-polar-${[left, top, width, height].map(n => d(n).replace('.', '-')).join('-')}`;
  const title = `Polar graph: r = ${spec.expression}`;
  const shortTitle = title.length > 68 ? `${title.slice(0, 65)}…` : title;
  return `<svg data-vme-plot="polar" xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480" role="img" aria-label="${escaped(title)}" style="max-width:100%;height:auto"><title>${escaped(title)}</title><desc>Approximate polar graph in radians. Equal distance has equal scale on X and Y. Domain gaps and unresolved discontinuities are omitted.</desc><defs><clipPath id="${clipId}"><rect x="${d(left)}" y="${d(top)}" width="${d(width)}" height="${d(height)}"/></clipPath></defs><rect width="800" height="480" rx="12" fill="#fff"/><g font-family="system-ui, sans-serif" fill="#1f2937"><text data-vme-plot-caption="title" x="110" y="31" font-size="17">${escaped(shortTitle)}</text><g clip-path="url(#${clipId})"><g stroke="#e5e7eb" stroke-width="1" fill="none">${rings.join('')}${spokes.join('')}</g><g stroke="#64748b" stroke-width="1.3">${axes.join('')}</g><g font-size="12" fill="#64748b">${labels.join('')}</g></g><rect data-plot-frame="true" x="${d(left)}" y="${d(top)}" width="${d(width)}" height="${d(height)}" fill="none" stroke="#cbd5e1"/><g font-size="22" font-weight="700"><text data-axis-label="X" x="774" y="418" text-anchor="middle">X</text><text data-axis-label="Y" x="38" y="35" text-anchor="middle">Y</text></g><g fill="none" stroke="#2563eb" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${path}</g><text data-vme-plot-caption="footer" x="110" y="455" font-size="12" fill="#64748b">≈ · θ ${escaped(Number(spec.thetaMin!.toPrecision(6)).toString())} to ${escaped(Number(spec.thetaMax!.toPrecision(6)).toString())} rad · equal scale</text></g></svg>`;
}

export function createPolarPlot(input: PlotSpec): AdvancedPlotResult {
  const validated = validatePolarSpec(input);
  if (!validated.ok) return validated;
  const compiled = compileExpression(validated.spec.expression, ['theta']);
  if (!compiled.ok) return compiled;
  try {
    const sampled = samplePolar(compiled, validated.spec);
    if (!sampled.segments.length) return { ok: false, error: 'No finite polar curve is visible in this range. Check the formula or adjust the axes.' };
    return { ok: true, spec: validated.spec, ...sampled, svg: polarSvg(validated.spec, sampled.segments) };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'The polar graph could not be generated.' }; }
}

export function validateCalculusSpec(input: PlotSpec): { ok: true; spec: PlotSpec } | PlotFailure {
  if (!input || (input.mode !== undefined && input.mode !== 'function')) return { ok: false, error: 'Calculus overlays are available for function graphs only.' };
  if (!['none', 'derivative', 'second-derivative', 'integral'].includes(input.calculus ?? 'none')) return { ok: false, error: 'Unsupported calculus graph mode.' };
  const validated = validatePlotSpec(input);
  if (!validated.ok) return validated;
  if (input.calculus === 'integral') {
    const integralMin = input.integralMin ?? 0, integralMax = input.integralMax ?? 1;
    if (!finiteRange(integralMin, integralMax)) return { ok: false, error: 'Integral bounds must be finite increasing numbers within the supported range.' };
    return { ok: true, spec: { ...validated.spec, integralMin, integralMax } };
  }
  return validated;
}

/** Symmetric finite differences, with a two-scale agreement check and a cusp guard. */
function differentiated(source: CompiledExpression, spec: PlotSpec): CompiledExpression {
  const second = spec.calculus === 'second-derivative';
  return {
    ...source,
    evaluationCost: source.evaluationCost * 12,
    evaluate: (x) => {
      const scale = Math.max(1, Math.abs(x));
      const h = Math.max(scale * Number.EPSILON * 64, Math.min((spec.xMax - spec.xMin) / 1024, scale * (second ? 1e-3 : 1e-4)));
      if (source.crossesDomainBoundary(x - h, x + h)) return NaN;
      const values = [source.evaluate(x - h), source.evaluate(x - h / 2), source.evaluate(x), source.evaluate(x + h / 2), source.evaluate(x + h)];
      if (!values.every(Number.isFinite)) return NaN;
      const [m, mh, c, ph, p] = values;
      const coarse = second ? (p - 2 * c + m) / (h * h) : (p - m) / (2 * h);
      const fine = second ? (ph - 2 * c + mh) * 4 / (h * h) : (ph - mh) / h;
      const difference = Math.abs(fine - coarse);
      if (!Number.isFinite(fine) || difference > Math.max(1e-4, Math.abs(fine) * 0.01)) return NaN;
      const coarseSides = Math.abs((p - c) / h - (c - m) / h);
      const fineSides = Math.abs((ph - c) * 2 / h - (c - mh) * 2 / h);
      // Smooth one-sided differences shrink with h; abs(x) at its cusp does not.
      if (fineSides > Math.max(1e-3, Math.abs(fine) * 1e-3) && fineSides > coarseSides * 0.8) return NaN;
      return fine + (fine - coarse) / 3;
    },
  };
}

function integrate(source: CompiledExpression, minimum: number, maximum: number): { value: number; error: number; sampleCount: number } {
  const cache = new Map<number, number>();
  const limit = Math.min(PLOT_LIMITS.evaluations, Math.floor(PLOT_LIMITS.arithmeticWork / source.evaluationCost));
  const at = (x: number): number => {
    const prior = cache.get(x);
    if (prior !== undefined) return prior;
    if (cache.size >= limit) fail('The integral did not converge within the work limit. Narrow the interval or simplify the formula.');
    const value = source.evaluate(x);
    if (!Number.isFinite(value)) fail('The integral crosses an undefined or improper domain. Use a finite continuous interval.');
    cache.set(x, value);
    return value;
  };
  const simpson = (a: number, b: number, fa: number, fm: number, fb: number): number => (b - a) * (fa + 4 * fm + fb) / 6;
  const refine = (a: number, b: number, fa: number, fm: number, fb: number, whole: number, tolerance: number, depth: number): { value: number; error: number } => {
    const middle = a + (b - a) / 2;
    const boundary = source.crossesDomainBoundary(a, middle) || source.crossesDomainBoundary(middle, b);
    const leftMiddle = at(a + (b - a) / 4), rightMiddle = at(a + (b - a) * 3 / 4);
    const left = simpson(a, middle, fa, leftMiddle, fm), right = simpson(middle, b, fm, rightMiddle, fb);
    // A non-dyadic Gauss cross-check catches oscillations that alias every uniform
    // Simpson node. As with any finite quadrature this is a check, not a proof.
    const gaussOffset = (b - a) / (2 * Math.sqrt(3));
    const gauss = (b - a) * (at(middle - gaussOffset) + at(middle + gaussOffset)) / 2;
    const delta = left + right - whole;
    const error = Math.max(Math.abs(delta) / 15, Math.abs(gauss - left - right) / 15);
    if (!Number.isFinite(left + right)) fail('The integral is outside the finite numerical range.');
    if (!boundary && error <= tolerance) return { value: left + right + delta / 15, error };
    if (depth >= ADVANCED_PLOT_LIMITS.integrationDepth) {
      if (boundary) fail('The integral crosses an undefined or improper domain. Use a finite continuous interval.');
      fail('The integral did not converge within the work limit. Narrow the interval or simplify the formula.');
    }
    const first = refine(a, middle, fa, leftMiddle, fm, left, tolerance / 2, depth + 1);
    const last = refine(middle, b, fm, rightMiddle, fb, right, tolerance / 2, depth + 1);
    return { value: first.value + last.value, error: first.error + last.error };
  };
  // A uniform initial partition reduces the chance of Simpson aliasing oscillations.
  let value = 0, error = 0;
  for (let index = 0; index < 128; index++) {
    const a = minimum + (maximum - minimum) * index / 128, b = minimum + (maximum - minimum) * (index + 1) / 128;
    const fa = at(a), fm = at(a + (b - a) / 2), fb = at(b);
    const whole = simpson(a, b, fa, fm, fb);
    const part = refine(a, b, fa, fm, fb, whole, (1e-7 + Math.abs(whole) * 1e-7) / 128, 0);
    value += part.value; error += part.error;
  }
  if (!Number.isFinite(value)) fail('The integral is outside the finite numerical range.');
  return { value, error, sampleCount: cache.size };
}

export function createCalculusPlot(input: PlotSpec): AdvancedPlotResult {
  const validated = validateCalculusSpec(input);
  if (!validated.ok) return validated;
  const spec = validated.spec, source = compileExpression(spec.expression);
  if (!source.ok) return source;
  try {
    if (spec.calculus === 'integral') {
      const integral = integrate(source, spec.integralMin!, spec.integralMax!);
      const sampled = sampleCurve(source, spec);
      if (!sampled.segments.length) return { ok: false, error: 'No finite curve is visible in this range. Check the formula or adjust the axes.' };
      const minimum = Math.max(spec.xMin, spec.integralMin!), maximum = Math.min(spec.xMax, spec.integralMax!);
      const shading = maximum > minimum ? sampleCurve(source, { ...spec, xMin: minimum, xMax: maximum }).segments : [];
      const estimate = Number(integral.value.toPrecision(9)).toString();
      return { ok: true, spec, ...sampled, integralValue: integral.value, integralError: integral.error,
        svg: renderSvg(spec, sampled.segments, {
          mode: 'integral', title: `Definite integral: ${spec.expression}`,
          description: 'Approximate signed definite integral of a real continuous function. Shading marks the selected interval within the viewport. Numerical estimates are not symbolic results or convergence proofs.',
          annotation: `∫ [${spec.integralMin}, ${spec.integralMax}] ≈ ${estimate} · numerical estimate · rad`, filledSegments: shading,
        }),
      };
    }
    const derivative = spec.calculus === 'derivative' || spec.calculus === 'second-derivative';
    const compiled = derivative ? differentiated(source, spec) : source;
    const sampled = sampleCurve(compiled, spec);
    if (!sampled.segments.length) return { ok: false, error: 'No finite curve is visible in this range. Check the formula or adjust the axes.' };
    return { ok: true, spec, ...sampled, svg: derivative ? renderSvg(spec, sampled.segments, {
      mode: spec.calculus, title: `${spec.calculus === 'second-derivative' ? 'Second derivative' : 'Derivative'}: ${spec.expression}`,
      description: 'Approximate numerical derivative from finite differences. Undefined points, detected cusps and unresolved discontinuities are omitted. This is not symbolic differentiation.',
      annotation: '≈ · finite differences · rad',
    }) : renderSvg(spec, sampled.segments) };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'The calculus graph could not be generated.' }; }
}
