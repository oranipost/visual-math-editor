import { PLOT_LIMITS } from './plot-engine';

/** Viewport changes are drafts. This module never writes a note or evaluates expressions. */
export interface PlotBounds { xMin: number; xMax: number; yMin: number; yMax: number }
export interface PlotViewport { left: number; top: number; width: number; height: number }
export interface PlotPosition { x: number; y: number }

const RELATIVE_SPAN = Number.EPSILON * 4096;
const MAXIMUM_SPAN = PLOT_LIMITS.absoluteBound * 2;
const BOUND_KEYS = ['xMin', 'xMax', 'yMin', 'yMax'] as const;

export function validPlotBounds(bounds: PlotBounds): boolean {
  if (!bounds || typeof bounds !== 'object') return false;
  if (!BOUND_KEYS.every(key => typeof bounds[key] === 'number' && Number.isFinite(bounds[key])
    && Math.abs(bounds[key]) <= PLOT_LIMITS.absoluteBound)) return false;
  return [[bounds.xMin, bounds.xMax], [bounds.yMin, bounds.yMax]].every(([minimum, maximum]) => {
    const span = maximum - minimum;
    return maximum > minimum && span >= PLOT_LIMITS.minimumSpan
      && span >= Math.max(Math.abs(minimum), Math.abs(maximum)) * RELATIVE_SPAN;
  });
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

/** Leave a few representable values of slack so subtracting large bounds cannot erase a narrow span. */
function fitAxis(anchor: number, requestedSpan: number, fraction: number): [number, number] {
  const relativeMinimum = Math.abs(anchor) * RELATIVE_SPAN / (1 - Math.max(fraction, 1 - fraction) * RELATIVE_SPAN);
  const roundingSlack = Math.max(1, Math.abs(anchor)) * Number.EPSILON * 8;
  const span = clamp(requestedSpan, Math.max(PLOT_LIMITS.minimumSpan, relativeMinimum + roundingSlack), MAXIMUM_SPAN);
  let minimum = anchor - span * fraction;
  let maximum = minimum + span;
  if (minimum < -PLOT_LIMITS.absoluteBound) {
    maximum += -PLOT_LIMITS.absoluteBound - minimum;
    minimum = -PLOT_LIMITS.absoluteBound;
  }
  if (maximum > PLOT_LIMITS.absoluteBound) {
    minimum -= maximum - PLOT_LIMITS.absoluteBound;
    maximum = PLOT_LIMITS.absoluteBound;
  }
  // The full-span limit must have exact endpoints, including floating-point rounding at its edges.
  return [Math.max(-PLOT_LIMITS.absoluteBound, minimum), Math.min(PLOT_LIMITS.absoluteBound, maximum)];
}

/** Shift the viewport by fractions of the current spans; positive Y means up in mathematical coordinates. */
export function panPlotBounds(bounds: PlotBounds, dxFraction: number, dyFraction: number): PlotBounds | undefined {
  if (!validPlotBounds(bounds) || !Number.isFinite(dxFraction) || !Number.isFinite(dyFraction)) return undefined;
  const move = (minimum: number, maximum: number, fraction: number): [number, number] => {
    if (fraction === 0) return [minimum, maximum];
    const span = maximum - minimum;
    const shift = clamp(fraction, (-PLOT_LIMITS.absoluteBound - minimum) / span, (PLOT_LIMITS.absoluteBound - maximum) / span);
    return fitAxis(minimum + span / 2 + shift * span, span, 0.5);
  };
  const [xMin, xMax] = move(bounds.xMin, bounds.xMax, dxFraction);
  const [yMin, yMax] = move(bounds.yMin, bounds.yMax, dyFraction);
  const result = { xMin, xMax, yMin, yMax };
  return validPlotBounds(result) ? result : undefined;
}

/** Scale about a normalized plot position (Y is measured from the bottom). Factor below one zooms in. */
export function zoomPlotBounds(bounds: PlotBounds, factor: number, anchorX = 0.5, anchorY = 0.5): PlotBounds | undefined {
  if (!validPlotBounds(bounds) || !Number.isFinite(factor) || factor <= 0
    || !Number.isFinite(anchorX) || !Number.isFinite(anchorY)
    || anchorX < 0 || anchorX > 1 || anchorY < 0 || anchorY > 1) return undefined;
  if (factor === 1) return { ...bounds };
  const zoom = (minimum: number, maximum: number, fraction: number): [number, number] => {
    const span = maximum - minimum;
    const requestedSpan = span * Math.min(factor, MAXIMUM_SPAN / span);
    return fitAxis(minimum + span * fraction, requestedSpan, fraction);
  };
  const [xMin, xMax] = zoom(bounds.xMin, bounds.xMax, anchorX);
  const [yMin, yMax] = zoom(bounds.yMin, bounds.yMax, anchorY);
  const result = { xMin, xMax, yMin, yMax };
  return validPlotBounds(result) ? result : undefined;
}

/** Convert browser pixels into normalized chart coordinates, excluding labels and margins. */
export function plotPointerPosition(clientX: number, clientY: number, viewport: PlotViewport, allowOutside = false): PlotPosition | undefined {
  if (![clientX, clientY, viewport?.left, viewport?.top, viewport?.width, viewport?.height].every(Number.isFinite)
    || viewport.width <= 0 || viewport.height <= 0) return undefined;
  const x = (clientX - viewport.left) / viewport.width;
  const y = 1 - (clientY - viewport.top) / viewport.height;
  if (!Number.isFinite(x) || !Number.isFinite(y) || (!allowOutside && (x < 0 || x > 1 || y < 0 || y > 1))) return undefined;
  return { x, y };
}

export interface PlotInteractionOptions {
  getBounds: () => PlotBounds;
  onChange: (bounds: PlotBounds) => void;
  onReset?: () => void;
}

/** Attach to a stable preview container; its generated SVG may be replaced after every callback. */
export function mountPlotInteraction(host: HTMLElement, options: PlotInteractionOptions): {
  destroy: () => void;
  setDisabled: (disabled: boolean) => void;
} {
  const win = host.ownerDocument.defaultView;
  const pointers = new Map<number, PlotPosition>();
  const interactionClasses = ['vme-plot-interactive', 'vme-plot-enabled', 'vme-plot-dragging'];
  const originalClasses = new Set(interactionClasses.filter(name => host.classList.contains(name)));
  // Touch gestures belong to this chart; its surrounding note remains scrollable.
  host.classList.add('vme-plot-interactive', 'vme-plot-enabled');
  let destroyed = false;
  let disabled = false;
  let animation: number | undefined;
  let pending: PlotBounds | undefined;
  let baseline: { bounds: PlotBounds; viewport: PlotViewport; positions: PlotPosition[]; moved: boolean } | undefined;

  const available = (): boolean => !destroyed && !disabled && host.isConnected && Boolean(win);
  const sameBounds = (a: PlotBounds, b: PlotBounds): boolean => BOUND_KEYS.every(key => a[key] === b[key]);
  const currentBounds = (): PlotBounds | undefined => {
    const value = pending ?? options.getBounds();
    return validPlotBounds(value) ? { ...value } : undefined;
  };
  const viewport = (): PlotViewport | undefined => {
    const frame = host.querySelector<SVGGraphicsElement>('svg [data-plot-frame]');
    if (!frame?.isConnected) return undefined;
    const rect = frame.getBoundingClientRect();
    return plotPointerPosition(rect.left, rect.top, rect) ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : undefined;
  };
  const ignoredTarget = (target: EventTarget | null): boolean => {
    const candidate = target as Element | null;
    if (typeof candidate?.closest !== 'function') return false;
    const control = candidate.closest('button, input, select, textarea, a, [contenteditable="true"], [data-plot-ignore]');
    // CodeMirror's editable ancestor sits outside this host and must not disable chart gestures.
    return Boolean(control && host.contains(control));
  };
  const schedule = (next: PlotBounds | undefined): boolean => {
    if (!available() || !next || !validPlotBounds(next)) return false;
    const prior = currentBounds();
    if (prior && sameBounds(prior, next)) return false;
    pending = next;
    if (animation === undefined) animation = win!.requestAnimationFrame(() => {
      animation = undefined;
      const value = pending;
      pending = undefined;
      if (available() && value) options.onChange(value);
    });
    return true;
  };
  const release = (id: number): void => {
    try { if (host.hasPointerCapture(id)) host.releasePointerCapture(id); } catch { /* Already released by the browser. */ }
  };
  const clearGesture = (dropPending: boolean): void => {
    const ids = [...pointers.keys()];
    pointers.clear();
    baseline = undefined;
    for (const id of ids) release(id);
    host.classList.remove('vme-plot-dragging');
    if (dropPending) {
      pending = undefined;
      if (animation !== undefined && win) win.cancelAnimationFrame(animation);
      animation = undefined;
    }
  };
  const startBaseline = (frame: PlotViewport): void => {
    const bounds = currentBounds();
    baseline = bounds ? { bounds, viewport: frame, positions: [...pointers.values()].map(value => ({ ...value })), moved: false } : undefined;
  };
  const pointerDown = (event: PointerEvent): void => {
    if (!available() || event.button !== 0 || ignoredTarget(event.target) || pointers.size >= 2) return;
    const frame = viewport();
    if (!frame || !plotPointerPosition(event.clientX, event.clientY, frame) || !currentBounds()) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    startBaseline(frame);
    try { host.setPointerCapture(event.pointerId); } catch { clearGesture(true); return; }
    // Prevent CodeMirror from interpreting the graph gesture as a text-selection action.
    event.preventDefault();
    event.stopPropagation();
  };
  const pointerMove = (event: PointerEvent): void => {
    if (!available() || !baseline || !pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const positions = [...pointers.values()];
    const start = baseline.positions;
    if (positions.length !== start.length) return;
    let next: PlotBounds | undefined;
    if (positions.length === 1) {
      const dx = positions[0].x - start[0].x, dy = positions[0].y - start[0].y;
      if (!baseline.moved && Math.hypot(dx, dy) < 4) return;
      baseline.moved = true;
      next = panPlotBounds(baseline.bounds, -dx / baseline.viewport.width, dy / baseline.viewport.height);
    } else {
      const startMiddle = { x: (start[0].x + start[1].x) / 2, y: (start[0].y + start[1].y) / 2 };
      const middle = { x: (positions[0].x + positions[1].x) / 2, y: (positions[0].y + positions[1].y) / 2 };
      const startDistance = Math.hypot(start[0].x - start[1].x, start[0].y - start[1].y);
      const distance = Math.hypot(positions[0].x - positions[1].x, positions[0].y - positions[1].y);
      if (distance < 1 || startDistance < 1) return;
      if (!baseline.moved && Math.max(Math.abs(startDistance - distance), Math.hypot(middle.x - startMiddle.x, middle.y - startMiddle.y)) < 4) return;
      baseline.moved = true;
      const anchor = plotPointerPosition(startMiddle.x, startMiddle.y, baseline.viewport);
      const zoomed = anchor && zoomPlotBounds(baseline.bounds, startDistance / distance, anchor.x, anchor.y);
      next = zoomed ? panPlotBounds(zoomed, (startMiddle.x - middle.x) / baseline.viewport.width, (middle.y - startMiddle.y) / baseline.viewport.height) : undefined;
    }
    if (schedule(next)) {
      host.classList.add('vme-plot-dragging');
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const pointerUp = (event: PointerEvent): void => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    release(event.pointerId);
    if (pointers.size && baseline) startBaseline(baseline.viewport);
    else clearGesture(false);
  };
  const pointerCancel = (event: PointerEvent): void => {
    if (pointers.has(event.pointerId)) clearGesture(true);
  };
  const wheel = (event: WheelEvent): void => {
    if (!available() || pointers.size || ignoredTarget(event.target)) return;
    const frame = viewport();
    const bounds = currentBounds();
    const anchor = frame && plotPointerPosition(event.clientX, event.clientY, frame);
    if (!bounds || !anchor || !Number.isFinite(event.deltaY) || event.deltaY === 0) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? frame.height : 1;
    const delta = clamp(event.deltaY * unit, -100, 100);
    if (schedule(zoomPlotBounds(bounds, Math.exp(delta * 0.002), anchor.x, anchor.y))) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  host.addEventListener('pointerdown', pointerDown);
  host.addEventListener('pointermove', pointerMove);
  host.addEventListener('pointerup', pointerUp);
  host.addEventListener('pointercancel', pointerCancel);
  host.addEventListener('lostpointercapture', pointerCancel);
  host.addEventListener('wheel', wheel, { passive: false });
  return {
    setDisabled(value) {
      if (destroyed) return;
      disabled = value;
      if (value) clearGesture(true);
      host.classList.toggle('vme-plot-enabled', !value);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearGesture(true);
      host.removeEventListener('pointerdown', pointerDown);
      host.removeEventListener('pointermove', pointerMove);
      host.removeEventListener('pointerup', pointerUp);
      host.removeEventListener('pointercancel', pointerCancel);
      host.removeEventListener('lostpointercapture', pointerCancel);
      host.removeEventListener('wheel', wheel);
      for (const name of interactionClasses) host.classList.toggle(name, originalClasses.has(name));
    },
  };
}
