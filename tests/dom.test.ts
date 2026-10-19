import assert from 'node:assert/strict';
import test from 'node:test';
import { createHtml, createSvgElement } from '../src/dom';

test('DOM factories use helpers from the requested Obsidian window, including custom elements', () => {
  const calls: string[] = [];
  const html = { localName: 'math-field' } as HTMLElement;
  const svg = { localName: 'path' } as SVGPathElement;
  const host = {
    createEl(this: unknown, tag: string) { assert.equal(this, host); calls.push(tag); return html; },
    createSvg(this: unknown, tag: string) { assert.equal(this, host); calls.push(tag); return svg; },
  };
  const documentRef = {
    defaultView: host,
    createElement() { throw new Error('Native HTML factory must not run in the host'); },
    createElementNS() { throw new Error('Native SVG factory must not run in the host'); },
  } as unknown as Document;
  assert.equal(createHtml('math-field', documentRef), html);
  assert.equal(createSvgElement('path', documentRef), svg);
  assert.deepEqual(calls, ['math-field', 'path']);
});

test('standalone preview factories preserve their document receiver and SVG namespace', () => {
  const calls: string[][] = [];
  const html = { localName: 'div' } as HTMLDivElement;
  const svg = { localName: 'svg' } as SVGSVGElement;
  const documentRef = {
    defaultView: {},
    createElement(this: unknown, tag: string) { assert.equal(this, documentRef); calls.push([tag]); return html; },
    createElementNS(this: unknown, namespace: string, tag: string) { assert.equal(this, documentRef); calls.push([namespace, tag]); return svg; },
  } as unknown as Document;
  assert.equal(createHtml('div', documentRef), html);
  assert.equal(createSvgElement('svg', documentRef), svg);
  assert.deepEqual(calls, [['div'], ['http://www.w3.org/2000/svg', 'svg']]);
});

test('detached documents without a window still support the native preview path', () => {
  const html = { localName: 'span' } as HTMLSpanElement;
  const documentRef = { defaultView: null, createElement: () => html } as unknown as Document;
  assert.equal(createHtml('span', documentRef), html);
});
