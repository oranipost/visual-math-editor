import type { MathfieldElement } from 'mathlive';

declare global {
  interface HTMLElementTagNameMap {
    'math-field': MathfieldElement;
  }
}

/** Prefer the target window's Obsidian helpers while retaining the offline browser preview. */
type HostDomWindow = Window & {
  createEl?: <K extends keyof HTMLElementTagNameMap>(tag: K) => HTMLElementTagNameMap[K];
  createSvg?: <K extends keyof SVGElementTagNameMap>(tag: K) => SVGElementTagNameMap[K];
};

/** The standard DOM subset available in a browser without Obsidian extensions. */
interface BrowserDomFactory {
  createElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K];
  createElementNS<K extends keyof SVGElementTagNameMap>(namespace: 'http://www.w3.org/2000/svg', tag: K): SVGElementTagNameMap[K];
}

export function createHtml<K extends keyof HTMLElementTagNameMap>(tag: K, documentRef: Document = document): HTMLElementTagNameMap[K] {
  const host = documentRef.defaultView as HostDomWindow | null;
  if (typeof host?.createEl === 'function') return host.createEl(tag);
  // The standalone component preview runs without Obsidian's injected DOM helpers.
  // Native creation also uses this document's registered custom elements.
  const browserDocument: BrowserDomFactory = documentRef;
  return browserDocument.createElement(tag);
}

export function createSvgElement<K extends keyof SVGElementTagNameMap>(tag: K, documentRef: Document = document): SVGElementTagNameMap[K] {
  const host = documentRef.defaultView as HostDomWindow | null;
  if (typeof host?.createSvg === 'function') return host.createSvg(tag);
  const browserDocument: BrowserDomFactory = documentRef;
  return browserDocument.createElementNS('http://www.w3.org/2000/svg', tag);
}
