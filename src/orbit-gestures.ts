import type { PlotSpec } from './plot-engine';
const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));

export interface OrbitGestureOptions {
  getSpec: () => PlotSpec | undefined;
  rotate: (spec: PlotSpec, azimuth: number, elevation: number) => PlotSpec | undefined;
  zoom: (spec: PlotSpec, factor: number) => PlotSpec | undefined;
  onChange: (spec: PlotSpec) => void;
  onReset?: () => void;
}

/** Gestures update an editor draft; this helper never writes to a note. */
export function mountOrbitGestures(host: HTMLElement, options: OrbitGestureOptions): {
  destroy: () => void; setDisabled: (disabled: boolean) => void;
} {
  const win = host.ownerDocument.defaultView;
  const classes = ['vme-plot-interactive', 'vme-plot-enabled', 'vme-plot-dragging'];
  const original = new Set(classes.filter(name => host.classList.contains(name)));
  host.classList.add('vme-plot-interactive', 'vme-plot-enabled');
  const pointers = new Map<number, { x: number; y: number }>();
  let destroyed = false, disabled = false, animation: number | undefined, pending: PlotSpec | undefined;
  let baseline: { spec: PlotSpec; positions: Array<{ x: number; y: number }>; width: number; height: number; moved: boolean } | undefined;
  const available = (): boolean => !destroyed && !disabled && host.isConnected && Boolean(win);
  const getSpec = (): PlotSpec | undefined => pending ?? options.getSpec();
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
  const schedule = (spec: PlotSpec | undefined): boolean => {
    if (!available() || !spec) return false;
    const prior = getSpec();
    if (prior && (['xMin', 'xMax', 'yMin', 'yMax', 'zMin', 'zMax', 'azimuth', 'elevation', 'geometryZoom'] as const).every(key => prior[key] === spec[key])) return false;
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
    let spec: PlotSpec | undefined;
    if (positions.length === 1) {
      const dx = positions[0].x - initial[0].x, dy = positions[0].y - initial[0].y;
      if (!baseline.moved && Math.hypot(dx, dy) < 4) return;
      baseline.moved = true;
      spec = options.rotate(baseline.spec, -dx / baseline.width * 360, dy / baseline.height * 120);
    } else {
      const before = Math.hypot(initial[0].x - initial[1].x, initial[0].y - initial[1].y);
      const after = Math.hypot(positions[0].x - positions[1].x, positions[0].y - positions[1].y);
      if (before < 1 || after < 1 || (!baseline.moved && Math.abs(before - after) < 4)) return;
      baseline.moved = true;
      spec = options.zoom(baseline.spec, before / after);
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
    if (schedule(options.zoom(spec, Math.exp(clamp(event.deltaY * unit, -100, 100) * 0.002)))) {
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
