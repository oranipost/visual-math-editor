/** Small original SVG controls, with visible text labels supplied by the caller. */
export type ControlIcon = 'preview' | 'insert' | 'save' | 'zoom-in' | 'zoom-out' | 'reset' | 'fit' | 'edit';
const paths: Record<ControlIcon, string> = {
  preview: 'M3 17V4 M3 17H20 M6 13L10 8L14 11L19 5',
  insert: 'M12 4V20 M4 12H20',
  save: 'M4 3H17L21 7V21H3V3H4 M7 3V9H17V3 M7 21V14H17V21',
  'zoom-in': 'M15.5 15.5L21 21 M8 10H14 M11 7V13 M18 10A8 8 0 1 1 2 10A8 8 0 1 1 18 10',
  'zoom-out': 'M15.5 15.5L21 21 M8 10H14 M18 10A8 8 0 1 1 2 10A8 8 0 1 1 18 10',
  reset: 'M4 10A8 8 0 1 1 5 17 M4 4V10H10',
  fit: 'M8 3H3V8 M16 3H21V8 M3 16V21H8 M21 16V21H16 M9 12H15 M12 9V15',
  edit: 'M14 5L19 10 M4 16L3 21L8 20L21 7L17 3L4 16Z',
};
export function controlIcon(name: ControlIcon, documentRef: Document = document): SVGSVGElement {
  const svg = documentRef.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'vme-control-icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = documentRef.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', paths[name]);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.7');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}
