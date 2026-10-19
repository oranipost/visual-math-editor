import { createPlot, validatePlotSpec, type PlotSpec } from './plot-engine';
import { createComplexPlot, validateComplexSpec, type ComplexPlaneSpec } from './complex-plane';
import { createPolarPlot, validatePolarSpec, createCalculusPlot, validateCalculusSpec } from './advanced-plots';
import { createSurfacePlot, validateSurfaceSpec } from './surface-plot';

export function validateGraphSpec(spec: PlotSpec) {
  if (!spec || (spec.mode !== undefined && !['function','complex','polar','surface'].includes(spec.mode))) return { ok: false as const, error: 'Unsupported graph mode.' };
  if (spec?.mode === 'complex') return validateComplexSpec(spec as ComplexPlaneSpec);
  if (spec?.mode === 'polar') return validatePolarSpec(spec);
  if (spec?.mode === 'surface') return validateSurfaceSpec(spec);
  if (spec?.calculus && spec.calculus !== 'none') return validateCalculusSpec(spec);
  const validated = validatePlotSpec(spec);
  if (!validated.ok) return validated;
  const { mode: _mode, ...normalized } = validated.spec;
  return { ok: true as const, spec: normalized };
}

export function createGraph(spec: PlotSpec) {
  const valid = validateGraphSpec(spec);
  if (!valid.ok) return valid;
  if (spec?.mode === 'complex') return createComplexPlot(spec as ComplexPlaneSpec);
  if (spec?.mode === 'polar') return createPolarPlot(spec);
  if (spec?.mode === 'surface') return createSurfacePlot(spec);
  if (spec?.calculus && spec.calculus !== 'none') return createCalculusPlot(spec);
  return createPlot(spec);
}
