import { createPlot, validatePlotSpec, type PlotSpec } from './plot-engine';
import { createComplexPlot, validateComplexSpec, type ComplexPlaneSpec } from './complex-plane';

export function validateGraphSpec(spec: PlotSpec) {
  if (spec?.mode === 'complex') return validateComplexSpec(spec as ComplexPlaneSpec);
  const validated = validatePlotSpec(spec);
  if (!validated.ok) return validated;
  const { mode: _mode, ...normalized } = validated.spec;
  return { ok: true as const, spec: normalized };
}

export function createGraph(spec: PlotSpec) {
  if (spec?.mode === 'complex') return createComplexPlot(spec as ComplexPlaneSpec);
  return createPlot(spec);
}
