import { createSvgElement } from './dom';

export type PlotClipboardFormat = 'png' | 'svg';

export interface CopyPlotImageOptions {
  /** Rasterization scale factor for PNG output (default: 2 for crisp HiDPI). */
  scale?: number;
  /** Raw generated SVG markup used when running in minimal non-DOM test harnesses. */
  fallbackSvgMarkup?: string;
}

interface ClipboardLike {
  write?: (data: ClipboardItem[]) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
}

type ClipboardItemConstructor = new (items: Record<string, Blob>) => ClipboardItem;
type ImageConstructor = new () => HTMLImageElement;

const DEFAULT_PLOT_WIDTH = 800;
const DEFAULT_PLOT_HEIGHT = 480;

function parsePlotDimensions(svgElement: SVGElement, fallbackSvgMarkup?: string): { width: number; height: number } {
  const viewBox = svgElement.getAttribute('viewBox')
    ?? (fallbackSvgMarkup ? /\bviewBox="([^"]+)"/.exec(fallbackSvgMarkup)?.[1] ?? null : null);
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && Number.isFinite(parts[2]) && parts[2] > 0 && Number.isFinite(parts[3]) && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }
  const attrWidth = Number(svgElement.getAttribute('width') ?? (fallbackSvgMarkup ? /\bwidth="(\d+(?:\.\d+)?)"/.exec(fallbackSvgMarkup)?.[1] : NaN));
  const attrHeight = Number(svgElement.getAttribute('height') ?? (fallbackSvgMarkup ? /\bheight="(\d+(?:\.\d+)?)"/.exec(fallbackSvgMarkup)?.[1] : NaN));
  if (Number.isFinite(attrWidth) && attrWidth > 0 && Number.isFinite(attrHeight) && attrHeight > 0) {
    return { width: attrWidth, height: attrHeight };
  }
  return { width: DEFAULT_PLOT_WIDTH, height: DEFAULT_PLOT_HEIGHT };
}

function normalizeSvgOpenTag(svgMarkup: string, width: number, height: number, baseWidth: number, baseHeight: number): string {
  const openTagMatch = /^<svg\b[^>]*>/.exec(svgMarkup);
  if (!openTagMatch) return svgMarkup;
  let openTag = openTagMatch[0]
    .replace(/\s+style="[^"]*"/g, '')
    .replace(/\s+width="[^"]*"/g, '')
    .replace(/\s+height="[^"]*"/g, '');
  if (!/\bxmlns=/.test(openTag)) {
    openTag = openTag.replace(/^<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!/\bviewBox=/.test(openTag)) {
    openTag = openTag.replace(/^<svg\b/, `<svg viewBox="0 0 ${baseWidth} ${baseHeight}"`);
  }
  openTag = openTag.replace(/>$/, ` width="${width}" height="${height}">`);
  const rest = svgMarkup.slice(openTagMatch[0].length);
  const backdrop = `<rect data-vme-export-bg="true" width="${baseWidth}" height="${baseHeight}" fill="#ffffff"/>`;
  if (rest.includes('data-vme-export-bg="true"')) return openTag + rest;
  const insertAfterMeta = /^(?:\s*<(?:title|desc|defs)\b[\s\S]*?<\/(?:title|desc|defs)>)+/.exec(rest);
  if (insertAfterMeta) {
    const idx = insertAfterMeta[0].length;
    return openTag + rest.slice(0, idx) + backdrop + rest.slice(idx);
  }
  return openTag + backdrop + rest;
}

/**
 * Prepare a standalone, self-contained SVG string with explicit pixel dimensions
 * and an opaque crisp `#ffffff` backdrop so all chart colors and text remain
 * legible in both light and dark themes without external CSS rules.
 */
export function preparePlotSvgForExport(
  svgElement: SVGElement,
  scale = 1,
  fallbackSvgMarkup?: string,
): { markup: string; width: number; height: number } {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const { width: baseWidth, height: baseHeight } = parsePlotDimensions(svgElement, fallbackSvgMarkup);
  const targetWidth = Math.max(1, Math.round(baseWidth * safeScale));
  const targetHeight = Math.max(1, Math.round(baseHeight * safeScale));

  if (typeof svgElement.cloneNode === 'function' && typeof XMLSerializer !== 'undefined') {
    const clone = svgElement.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.removeAttribute('style');
    if (!clone.getAttribute('viewBox')) {
      clone.setAttribute('viewBox', `0 0 ${baseWidth} ${baseHeight}`);
    }
    clone.setAttribute('width', String(targetWidth));
    clone.setAttribute('height', String(targetHeight));
    if (!clone.querySelector('[data-vme-export-bg="true"]')) {
      const backdrop = createSvgElement('rect', svgElement.ownerDocument);
      backdrop.setAttribute('data-vme-export-bg', 'true');
      backdrop.setAttribute('width', String(baseWidth));
      backdrop.setAttribute('height', String(baseHeight));
      backdrop.setAttribute('fill', '#ffffff');
      const firstVisual = Array.from(clone.children).find(
        child => !['title', 'desc', 'defs'].includes(child.localName),
      );
      if (firstVisual) clone.insertBefore(backdrop, firstVisual);
      else clone.append(backdrop);
    }
    return {
      markup: new XMLSerializer().serializeToString(clone),
      width: targetWidth,
      height: targetHeight,
    };
  }

  const raw = fallbackSvgMarkup ?? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${baseWidth} ${baseHeight}"></svg>`;
  return {
    markup: normalizeSvgOpenTag(raw, targetWidth, targetHeight, baseWidth, baseHeight),
    width: targetWidth,
    height: targetHeight,
  };
}

async function rasterizeSvgToPngBlob(
  doc: Document,
  win: Record<string, unknown> | undefined,
  svgMarkup: string,
  width: number,
  height: number,
): Promise<Blob | null> {
  const ImageCtor = (win?.Image ?? (globalThis as Record<string, unknown>).Image) as ImageConstructor | undefined;
  if (typeof ImageCtor !== 'function' || typeof doc.createElement !== 'function') return null;

  const canvas = doc.createElement('canvas');
  if (typeof canvas.getContext !== 'function' || typeof canvas.toBlob !== 'function') return null;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  await new Promise<void>((resolve, reject) => {
    const image = new ImageCtor();
    image.onload = () => {
      try {
        ctx.drawImage(image, 0, 0, width, height);
        resolve();
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to draw SVG onto canvas.'));
      }
    };
    image.onerror = () => reject(new Error('Failed to decode SVG image for canvas export.'));
    image.src = dataUrl;
  });

  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(blob => resolve(blob), 'image/png');
  });
}

/**
 * Copy a rendered plot SVG to the system clipboard as a 2x high-DPI PNG image
 * entirely offline via an offscreen Canvas, gracefully falling back to copying
 * standalone SVG source when `ClipboardItem` or offscreen rasterization is unavailable.
 */
export async function copyPlotImage(
  svgElement: SVGElement,
  options: CopyPlotImageOptions = {},
): Promise<PlotClipboardFormat> {
  const scale = options.scale ?? 2;
  const doc = svgElement.ownerDocument;
  const win = (doc?.defaultView ?? (typeof window !== 'undefined' ? window : undefined)) as unknown as Record<string, unknown> | undefined;
  const nav = (win?.navigator ?? (typeof navigator !== 'undefined' ? navigator : undefined)) as { clipboard?: ClipboardLike } | undefined;
  const clipboard = nav?.clipboard;
  if (!clipboard || (typeof clipboard.write !== 'function' && typeof clipboard.writeText !== 'function')) {
    throw new Error('Clipboard API is unavailable.');
  }

  const ClipboardItemCtor = (win?.ClipboardItem ?? (globalThis as Record<string, unknown>).ClipboardItem) as ClipboardItemConstructor | undefined;
  if (typeof ClipboardItemCtor === 'function' && typeof clipboard.write === 'function' && doc) {
    try {
      const scaled = preparePlotSvgForExport(svgElement, scale, options.fallbackSvgMarkup);
      const pngBlob = await rasterizeSvgToPngBlob(doc, win, scaled.markup, scaled.width, scaled.height);
      if (pngBlob) {
        await clipboard.write([new ClipboardItemCtor({ 'image/png': pngBlob })]);
        return 'png';
      }
    } catch (pngError) {
      if (typeof clipboard.writeText !== 'function') throw pngError;
    }
  }

  if (typeof clipboard.writeText === 'function') {
    const standalone = preparePlotSvgForExport(svgElement, 1, options.fallbackSvgMarkup);
    await clipboard.writeText(standalone.markup);
    return 'svg';
  }

  throw new Error('Clipboard image copy failed.');
}
