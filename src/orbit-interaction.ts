import type { PlotSpec } from './plot-engine';
import { rotateSurfaceCamera, zoomSurfaceBounds } from './surface-plot';
import { validateGeometrySpec, rotateGeometryCamera, zoomGeometryView } from './geometry-models';

import { mountOrbitGestures } from './orbit-gestures';
function numericOrbitSpec(input: PlotSpec): PlotSpec | undefined {
  if (input?.mode === 'surface') return rotateSurfaceCamera(input, 0, 0);
  const result = input?.mode === 'geometry' ? validateGeometrySpec(input) : undefined;
  return result?.ok ? result.spec : undefined;
}
export function rotateOrbitCamera(input: PlotSpec, deltaAzimuth: number, deltaElevation: number): PlotSpec | undefined {
  return input?.mode === 'geometry' ? rotateGeometryCamera(input, deltaAzimuth, deltaElevation) : rotateSurfaceCamera(input, deltaAzimuth, deltaElevation);
}
export function zoomOrbitView(input: PlotSpec, factor: number): PlotSpec | undefined {
  return input?.mode === 'geometry' ? zoomGeometryView(input, factor) : zoomSurfaceBounds(input, factor);
}

export interface OrbitInteractionOptions {
  getSpec: () => PlotSpec;
  onChange: (spec: PlotSpec) => void;
}
/** One gesture recognizer shared with XYZ; only the bounded camera math differs. */
export function mountOrbitInteraction(host: HTMLElement, options: OrbitInteractionOptions) {
  return mountOrbitGestures(host, {
    getSpec: () => numericOrbitSpec(options.getSpec()), onChange: options.onChange,
    rotate: rotateOrbitCamera, zoom: zoomOrbitView,
  });
}
