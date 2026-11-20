import assert from 'node:assert/strict';
import test from 'node:test';
import { validateLatex } from 'mathlive';
import { mountEditor } from '../src/editor-ui';
import { localizeEditor, translateUiText } from '../src/i18n';
import { findMathRanges } from '../src/math-ranges';
import { mountMatrixTools } from '../src/matrix-ui';
import { copyPlotImage, preparePlotSvgForExport } from '../src/plot-clipboard';
import type { PlotSpec } from '../src/plot-engine';
import { findPlotBlocks, planGraphInsert } from '../src/plot-markdown';
import { COMPOSITE_TEMPLATES, graphDraftFromSpec, mountPlotTools } from '../src/plot-ui';
import { PluginSettingsStore } from '../src/settings';

// --- Lightweight Node DOM harness for component-level verification ---

type ListenerRecord = { listener: (event: FakeEvent) => void; capture: boolean };

class FakeEvent {
  defaultPrevented = false;
  propagationStopped = false;
  immediateStopped = false;
  target: unknown = null;
  key = '';
  ctrlKey = false;
  metaKey = false;
  altKey = false;
  shiftKey = false;
  isComposing = false;
  data: string | null = null;
  inputType = '';
  clipboardData: { getData: (type: string) => string } | null = null;
  readonly bubbles: boolean;
  readonly cancelable: boolean;

  constructor(
    public readonly type: string,
    init: {
      bubbles?: boolean;
      cancelable?: boolean;
      key?: string;
      ctrlKey?: boolean;
      metaKey?: boolean;
      altKey?: boolean;
      shiftKey?: boolean;
    } = {},
  ) {
    this.bubbles = Boolean(init.bubbles);
    this.cancelable = Boolean(init.cancelable ?? true);
    if (init.key !== undefined) this.key = init.key;
    if (init.ctrlKey !== undefined) this.ctrlKey = init.ctrlKey;
    if (init.metaKey !== undefined) this.metaKey = init.metaKey;
    if (init.altKey !== undefined) this.altKey = init.altKey;
    if (init.shiftKey !== undefined) this.shiftKey = init.shiftKey;
  }

  preventDefault(): void { if (this.cancelable) this.defaultPrevented = true; }
  stopPropagation(): void { this.propagationStopped = true; }
  stopImmediatePropagation(): void { this.immediateStopped = true; this.propagationStopped = true; }
  composedPath(): unknown[] { return this.target ? [this.target] : []; }
}

type FakeMutationRecord = {
  type: 'childList' | 'characterData' | 'attributes';
  target: FakeNode;
  addedNodes: FakeNode[];
};

type ActiveObserverEntry = {
  root: FakeNode;
  callback: (records: FakeMutationRecord[]) => void;
  pending: FakeMutationRecord[];
  scheduled: boolean;
};

const activeObservers = new Set<ActiveObserverEntry>();

function emitMutation(record: FakeMutationRecord): void {
  for (const observer of activeObservers) {
    let cursor: FakeNode | null = record.target;
    while (cursor) {
      if (cursor === observer.root) {
        observer.pending.push(record);
        if (!observer.scheduled) {
          observer.scheduled = true;
          queueMicrotask(() => {
            observer.scheduled = false;
            if (!activeObservers.has(observer) || observer.pending.length === 0) return;
            const batch = observer.pending.splice(0);
            observer.callback(batch);
          });
        }
        break;
      }
      cursor = cursor.parentNode;
    }
  }
}

class FakeMutationObserver {
  private entry?: ActiveObserverEntry;
  constructor(private readonly callback: (records: FakeMutationRecord[]) => void) {}
  observe(root: FakeNode): void {
    this.disconnect();
    this.entry = { root, callback: this.callback, pending: [], scheduled: false };
    activeObservers.add(this.entry);
  }
  disconnect(): void {
    if (this.entry) {
      this.entry.pending.length = 0;
      activeObservers.delete(this.entry);
      this.entry = undefined;
    }
  }
}

abstract class FakeNode {
  abstract readonly nodeType: number;
  abstract textContent: string;
  parentNode: FakeElement | null = null;
  childNodes: FakeNode[] = [];
  ownerDocument!: FakeDocument;

  get parentElement(): FakeElement | null { return this.parentNode; }
  get isConnected(): boolean {
    let cursor: FakeNode | null = this;
    while (cursor) {
      if (cursor === this.ownerDocument.body) return true;
      cursor = cursor.parentNode;
    }
    return false;
  }

  contains(other: FakeNode | null): boolean {
    let cursor: FakeNode | null = other;
    while (cursor) {
      if (cursor === this) return true;
      cursor = cursor.parentNode;
    }
    return false;
  }
}

class FakeText extends FakeNode {
  readonly nodeType = 3;
  private value: string;
  constructor(doc: FakeDocument, text: string) {
    super();
    this.ownerDocument = doc;
    this.value = text;
  }
  get data(): string { return this.value; }
  set data(next: string) {
    this.value = next;
    emitMutation({ type: 'characterData', target: this, addedNodes: [] });
  }
  get textContent(): string { return this.value; }
  set textContent(next: string) { this.data = next; }
}

function camelToDash(key: string): string {
  return 'data-' + key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
}

function dashToCamel(attr: string): string {
  return attr.slice(5).replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

function matchesSimpleSelector(el: FakeElement, part: string): boolean {
  let rest = part.trim();
  if (!rest) return false;
  const notMatches: string[] = [];
  rest = rest.replace(/:not\(([^)]+)\)/g, (_, inner: string) => {
    notMatches.push(inner);
    return '';
  });
  for (const neg of notMatches) {
    if (matchesSimpleSelector(el, neg)) return false;
  }
  rest = rest.replace(/:where\(([^)]+)\)/g, (_, inner: string) => inner);
  const attrPattern = /\[([a-zA-Z0-9_-]+)(?:(\^=|=)"([^"]*)")?\]/g;
  let attrMatch: RegExpExecArray | null;
  while ((attrMatch = attrPattern.exec(rest)) !== null) {
    const [, attrName, op, expected] = attrMatch;
    const actual = el.getAttribute(attrName);
    if (!op) {
      if (actual === null) return false;
    } else if (op === '=') {
      if (actual !== expected) return false;
    } else if (op === '^=') {
      if (actual === null || !actual.startsWith(expected)) return false;
    }
  }
  rest = rest.replace(attrPattern, '');
  const idMatch = /#([a-zA-Z0-9_-]+)/.exec(rest);
  if (idMatch && el.id !== idMatch[1]) return false;
  rest = rest.replace(/#[a-zA-Z0-9_-]+/g, '');
  const classes = [...rest.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map(m => m[1]);
  const elementClasses = el.className ? el.className.split(/\s+/).filter(Boolean) : [];
  for (const cls of classes) {
    if (!elementClasses.includes(cls)) return false;
  }
  rest = rest.replace(/\.[a-zA-Z0-9_-]+/g, '').trim();
  if (rest && rest !== '*' && el.localName !== rest.toLowerCase()) return false;
  return true;
}

function matchesSelectorChain(el: FakeElement, chain: string): boolean {
  const tokens = chain.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  if (!matchesSimpleSelector(el, tokens[tokens.length - 1])) return false;
  let current: FakeElement | null = el.parentElement;
  for (let index = tokens.length - 2; index >= 0; index--) {
    while (current && !matchesSimpleSelector(current, tokens[index])) {
      current = current.parentElement;
    }
    if (!current) return false;
    current = current.parentElement;
  }
  return true;
}

function splitTopLevelCommas(selector: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) {
      parts.push(selector.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(selector.slice(start));
  return parts.map(s => s.trim()).filter(Boolean);
}

class FakeElement extends FakeNode {
  readonly nodeType = 1;
  readonly localName: string;
  readonly tagName: string;
  private attributes = new Map<string, string>();
  private listeners = new Map<string, ListenerRecord[]>();
  readonly dataset: Record<string, string | undefined>;
  readonly style: Record<string, string> & { setProperty: (k: string, v: string) => void };
  readonly classList: {
    add: (...tokens: string[]) => void;
    remove: (...tokens: string[]) => void;
    contains: (token: string) => boolean;
    toggle: (token: string, force?: boolean) => boolean;
  };
  disabled = false;
  readOnly = false;
  checked = false;
  inert = false;
  tabIndex = 0;
  rows = 2;
  spellcheck = false;
  autocomplete = '';
  inputMode = '';
  placeholder = '';
  wrap = '';
  type = '';
  htmlFor = '';
  selectedIndex = 0;
  selectionStart = 0;
  selectionEnd = 0;
  clientWidth = 800;
  clientHeight = 600;
  private internalValue = '';

  constructor(doc: FakeDocument, tag: string) {
    super();
    this.ownerDocument = doc;
    this.localName = tag.toLowerCase();
    this.tagName = tag.toUpperCase();
    const self = this;
    this.dataset = new Proxy<Record<string, string | undefined>>({}, {
      get(_, prop: string) {
        return self.getAttribute(camelToDash(prop)) ?? undefined;
      },
      set(_, prop: string, val: string | undefined) {
        if (val === undefined) self.removeAttribute(camelToDash(prop));
        else self.setAttribute(camelToDash(prop), String(val));
        return true;
      },
      deleteProperty(_, prop: string) {
        self.removeAttribute(camelToDash(prop));
        return true;
      },
      ownKeys() {
        return [...self.attributes.keys()].filter(k => k.startsWith('data-')).map(dashToCamel);
      },
      getOwnPropertyDescriptor(_, prop: string) {
        const val = self.getAttribute(camelToDash(prop));
        return val === null ? undefined : { configurable: true, enumerable: true, value: val };
      },
    });
    const styleStore: Record<string, string> = {};
    this.style = Object.assign(styleStore, {
      setProperty(k: string, v: string) { styleStore[k] = v; },
    });
    this.classList = {
      add: (...tokens: string[]) => {
        const set = new Set((this.className || '').split(/\s+/).filter(Boolean));
        for (const t of tokens) set.add(t);
        this.className = [...set].join(' ');
      },
      remove: (...tokens: string[]) => {
        const set = new Set((this.className || '').split(/\s+/).filter(Boolean));
        for (const t of tokens) set.delete(t);
        this.className = [...set].join(' ');
      },
      contains: (token: string) => (this.className || '').split(/\s+/).includes(token),
      toggle: (token: string, force?: boolean) => {
        const present = this.classList.contains(token);
        const shouldAdd = force ?? !present;
        if (shouldAdd) this.classList.add(token);
        else this.classList.remove(token);
        return shouldAdd;
      },
    };
  }

  get id(): string { return this.getAttribute('id') ?? ''; }
  set id(v: string) { if (v) this.setAttribute('id', v); else this.removeAttribute('id'); }

  get className(): string { return this.getAttribute('class') ?? ''; }
  set className(v: string) { if (v) this.setAttribute('class', v); else this.removeAttribute('class'); }

  get title(): string { return this.getAttribute('title') ?? ''; }
  set title(v: string) { this.setAttribute('title', v); }

  get lang(): string { return this.getAttribute('lang') ?? ''; }
  set lang(v: string) { this.setAttribute('lang', v); }

  get hidden(): boolean { return this.hasAttribute('hidden'); }
  set hidden(v: boolean) {
    if (v) this.setAttribute('hidden', '');
    else this.removeAttribute('hidden');
  }

  get open(): boolean { return this.hasAttribute('open'); }
  set open(v: boolean) {
    const changed = this.open !== v;
    if (v) this.setAttribute('open', '');
    else this.removeAttribute('open');
    if (changed && this.localName === 'details') {
      this.dispatchEvent(new FakeEvent('toggle'));
    }
  }

  get options(): FakeElement[] {
    return this.querySelectorAll('option');
  }

  get childElementCount(): number {
    return this.children.length;
  }

  get value(): string {
    if (this.localName === 'select') {
      if (this.internalValue) return this.internalValue;
      const chosen = this.options[this.selectedIndex] ?? this.options[0];
      return chosen ? chosen.value : '';
    }
    return this.internalValue;
  }

  set value(v: string) {
    this.internalValue = String(v);
    this.selectionStart = this.selectionEnd = this.internalValue.length;
    if (this.localName === 'option') this.setAttribute('value', this.internalValue);
  }

  get children(): FakeElement[] {
    return this.childNodes.filter((n): n is FakeElement => n instanceof FakeElement);
  }

  get textContent(): string {
    return this.childNodes.map(c => c.textContent).join('');
  }

  set textContent(v: string) {
    for (const c of this.childNodes) c.parentNode = null;
    this.childNodes = v ? [new FakeText(this.ownerDocument, v)] : [];
    for (const c of this.childNodes) c.parentNode = this;
    emitMutation({ type: 'childList', target: this, addedNodes: [...this.childNodes] });
  }

  setSelectionRange(start: number, end: number): void {
    this.selectionStart = start;
    this.selectionEnd = end;
  }

  setRangeText(replacement: string, start?: number, end?: number, selectionMode?: string): void {
    const s = start ?? this.selectionStart;
    const e = end ?? this.selectionEnd;
    this.internalValue = this.internalValue.slice(0, s) + replacement + this.internalValue.slice(e);
    if (selectionMode === 'end') {
      this.selectionStart = this.selectionEnd = s + replacement.length;
    }
  }

  getBoundingClientRect(): { left: number; top: number; right: number; bottom: number; width: number; height: number } {
    return { left: 20, top: 20, right: 320, bottom: 120, width: 300, height: 100 };
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
    emitMutation({ type: 'attributes', target: this, addedNodes: [] });
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
    emitMutation({ type: 'attributes', target: this, addedNodes: [] });
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  private coerceNode(item: FakeNode | string): FakeNode {
    return typeof item === 'string' ? new FakeText(this.ownerDocument, item) : item;
  }

  append(...items: (FakeNode | string)[]): void {
    const added: FakeNode[] = [];
    for (const raw of items) {
      const node = this.coerceNode(raw);
      if (node.parentNode) node.parentNode.removeChild(node);
      node.parentNode = this;
      this.childNodes.push(node);
      added.push(node);
    }
    if (added.length) emitMutation({ type: 'childList', target: this, addedNodes: added });
  }

  prepend(...items: (FakeNode | string)[]): void {
    const added: FakeNode[] = [];
    for (const raw of items) {
      const node = this.coerceNode(raw);
      if (node.parentNode) node.parentNode.removeChild(node);
      node.parentNode = this;
      added.push(node);
    }
    this.childNodes.unshift(...added);
    if (added.length) emitMutation({ type: 'childList', target: this, addedNodes: added });
  }

  appendChild<T extends FakeNode>(node: T): T {
    this.append(node);
    return node;
  }

  insertBefore<T extends FakeNode>(node: T, reference: FakeNode | null): T {
    if (!reference) return this.appendChild(node);
    if (node.parentNode) node.parentNode.removeChild(node);
    const idx = this.childNodes.indexOf(reference);
    node.parentNode = this;
    if (idx === -1) this.childNodes.push(node);
    else this.childNodes.splice(idx, 0, node);
    emitMutation({ type: 'childList', target: this, addedNodes: [node] });
    return node;
  }

  removeChild<T extends FakeNode>(node: T): T {
    const idx = this.childNodes.indexOf(node);
    if (idx !== -1) {
      this.childNodes.splice(idx, 1);
      node.parentNode = null;
    }
    return node;
  }

  replaceChildren(...items: (FakeNode | string)[]): void {
    for (const c of this.childNodes) c.parentNode = null;
    this.childNodes = [];
    this.append(...items);
  }

  before(...items: (FakeNode | string)[]): void {
    const parent = this.parentNode;
    if (!parent) return;
    for (const item of items) parent.insertBefore(this.coerceNode(item), this);
  }

  remove(): void {
    this.parentNode?.removeChild(this);
  }

  matches(selector: string): boolean {
    return splitTopLevelCommas(selector).some(chain => matchesSelectorChain(this, chain));
  }

  closest(selector: string): FakeElement | null {
    let cursor: FakeElement | null = this;
    while (cursor) {
      if (cursor.matches(selector)) return cursor;
      cursor = cursor.parentElement;
    }
    return null;
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const results: FakeElement[] = [];
    const visit = (el: FakeElement) => {
      for (const child of el.children) {
        if (child.matches(selector)) results.push(child);
        visit(child);
      }
    };
    visit(this);
    return results;
  }

  addEventListener(type: string, listener: (event: FakeEvent) => void, options?: boolean | { capture?: boolean }): void {
    const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
    const list = this.listeners.get(type) ?? [];
    list.push({ listener, capture });
    this.listeners.set(type, list);
  }

  removeEventListener(type: string, listener: (event: FakeEvent) => void, options?: boolean | { capture?: boolean }): void {
    const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
    const list = this.listeners.get(type);
    if (!list) return;
    this.listeners.set(type, list.filter(item => !(item.listener === listener && item.capture === capture)));
  }

  dispatchEvent(event: FakeEvent): boolean {
    if (!event.target) event.target = this;
    const path: FakeElement[] = [];
    let cursor: FakeElement | null = this;
    while (cursor) {
      path.push(cursor);
      cursor = cursor.parentElement;
    }
    for (let i = path.length - 1; i >= 1; i--) {
      if (event.propagationStopped) break;
      for (const rec of [...(path[i].listeners.get(event.type) ?? [])]) {
        if (rec.capture) rec.listener(event);
        if (event.immediateStopped) break;
      }
    }
    if (!event.propagationStopped) {
      for (const rec of [...(this.listeners.get(event.type) ?? [])]) {
        rec.listener(event);
        if (event.immediateStopped) break;
      }
    }
    if (event.bubbles && !event.propagationStopped) {
      for (let i = 1; i < path.length; i++) {
        if (event.propagationStopped) break;
        for (const rec of [...(path[i].listeners.get(event.type) ?? [])]) {
          if (!rec.capture) rec.listener(event);
          if (event.immediateStopped) break;
        }
      }
    }
    return !event.defaultPrevented;
  }

  click(): void {
    if (this.disabled) return;
    if (this.localName === 'input' && this.type === 'checkbox') {
      this.checked = !this.checked;
      this.dispatchEvent(new FakeEvent('click', { bubbles: true, cancelable: true }));
      this.dispatchEvent(new FakeEvent('change', { bubbles: true }));
      return;
    }
    if (this.localName === 'summary' && this.parentElement?.localName === 'details') {
      this.parentElement.open = !this.parentElement.open;
    }
    this.dispatchEvent(new FakeEvent('click', { bubbles: true, cancelable: true }));
  }

  focus(): void {
    if (this.disabled || this.hidden) return;
    this.ownerDocument.activeElement = this;
    this.dispatchEvent(new FakeEvent('focus'));
  }
}

class FakeMathfieldElement extends FakeElement {
  defaultMode = 'math';
  smartMode = false;
  smartSuperscript = false;
  popoverPolicy = 'off';
  mathVirtualKeyboardPolicy = 'manual';
  environmentPopoverPolicy = 'off';
  menuItems: unknown[] = [];
  keybindings: { key: string; command: string | string[] }[] = [];
  mode = 'math';
  selectionIsCollapsed = true;
  position = 0;
  private latex = '';

  get lastOffset(): number { return this.latex.length; }

  get errors(): ReturnType<typeof validateLatex> {
    return this.latex ? validateLatex(this.latex) : [];
  }

  getValue(_format?: string): string {
    return this.latex;
  }

  setValue(next: string, options?: { silenceNotifications?: boolean }): void {
    this.latex = next;
    this.position = next.length;
    if (!options?.silenceNotifications) {
      this.dispatchEvent(new FakeEvent('input', { bubbles: true }));
    }
  }

  insert(snippet: string): boolean {
    const normalized = snippet.replace(/#\?/g, '\\placeholder{}').replace(/#0/g, '');
    this.latex += normalized;
    this.position = this.latex.length;
    this.dispatchEvent(new FakeEvent('input', { bubbles: true }));
    return true;
  }

  executeCommand(command: string): boolean {
    if (command === 'selectAll') this.selectionIsCollapsed = false;
    else if (command === 'moveToMathfieldEnd' || command === 'moveToGroupEnd') this.position = this.latex.length;
    else if (command === 'moveToMathfieldStart' || command === 'moveToGroupStart') this.position = 0;
    else if (command === 'addRowAfter') this.latex = `\\displaylines{${this.latex}\\\\ }`;
    return true;
  }
}

class FakeDocument {
  readonly defaultView: Record<string, unknown>;
  readonly documentElement: FakeElement;
  readonly body: FakeElement;
  activeElement: FakeElement | null = null;

  constructor(locale = 'zh-CN') {
    this.defaultView = {
      innerHeight: 800,
      innerWidth: 1024,
      navigator: { language: locale },
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
      requestAnimationFrame: (cb: () => void) => Number(globalThis.setTimeout(cb, 0)),
      cancelAnimationFrame: (id: number) => globalThis.clearTimeout(id),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
    this.documentElement = new FakeElement(this, 'html');
    this.body = new FakeElement(this, 'body');
    this.documentElement.append(this.body);
  }

  addEventListener(type: string, listener: (event: FakeEvent) => void, options?: boolean | { capture?: boolean }): void {
    this.body.addEventListener(type, listener, options);
  }

  removeEventListener(type: string, listener: (event: FakeEvent) => void, options?: boolean | { capture?: boolean }): void {
    this.body.removeEventListener(type, listener, options);
  }

  createElement(tag: string): FakeElement {
    return tag.toLowerCase() === 'math-field' ? new FakeMathfieldElement(this, 'math-field') : new FakeElement(this, tag);
  }

  createElementNS(_ns: string, tag: string): FakeElement {
    return new FakeElement(this, tag);
  }

  createTextNode(text: string): FakeText {
    return new FakeText(this, text);
  }

  importNode(node: FakeElement): FakeElement {
    const clone = new FakeElement(this, node.localName);
    clone.setAttribute('data-vme-plot', node.getAttribute('data-vme-plot') ?? 'function');
    const viewBox = node.getAttribute('viewBox');
    if (viewBox) clone.setAttribute('viewBox', viewBox);
    return clone;
  }

  getElementById(id: string): FakeElement | null {
    return this.body.querySelector(`#${id}`);
  }
}

class FakeDOMParser {
  parseFromString(markup: string): { documentElement: FakeElement } {
    const doc = new FakeDocument();
    const svg = new FakeElement(doc, 'svg');
    const modeMatch = /data-vme-plot="([^"]+)"/.exec(markup);
    if (modeMatch) svg.setAttribute('data-vme-plot', modeMatch[1]);
    const vbMatch = /viewBox="([^"]+)"/.exec(markup);
    if (vbMatch) svg.setAttribute('viewBox', vbMatch[1]);
    return { documentElement: svg };
  }
}

const asHtml = (el: FakeElement): HTMLElement => el as unknown as HTMLElement;

async function withFakeDom<T>(fn: (doc: FakeDocument) => Promise<T> | T, locale = 'zh-CN'): Promise<T> {
  const doc = new FakeDocument(locale);
  const g = globalThis as Record<string, unknown>;
  const prevWindow = g.window;
  const prevDocument = g.document;
  const prevObserver = g.MutationObserver;
  const prevParser = g.DOMParser;
  g.window = doc.defaultView;
  g.document = doc;
  g.MutationObserver = FakeMutationObserver;
  g.DOMParser = FakeDOMParser;
  try {
    return await fn(doc);
  } finally {
    activeObservers.clear();
    if (prevWindow === undefined) delete g.window; else g.window = prevWindow;
    if (prevDocument === undefined) delete g.document; else g.document = prevDocument;
    if (prevObserver === undefined) delete g.MutationObserver; else g.MutationObserver = prevObserver;
    if (prevParser === undefined) delete g.DOMParser; else g.DOMParser = prevParser;
  }
}

// --- Component & Integration Tests ---

test('Graph 2D mathfield syncs bidirectionally with raw expression, presets, modes, and placeholder guard', async () => {
  await withFakeDom(async (doc) => {
    const host = doc.createElement('div');
    doc.body.append(host);
    const inserted: Array<{ spec: PlotSpec; equationLatex?: string }> = [];

    const tools = mountPlotTools(asHtml(host), {
      initialDraft: {
        mode: 'surface',
        expression: '(x^2-y^2)/10',
        xMin: '-5',
        xMax: '5',
        yMin: '-5',
        yMax: '5',
        previewed: true,
      },
      onInsertGraph: async (spec, _svg, equationLatex) => {
        inserted.push({ spec, equationLatex });
      },
    });

    try {
      const plotField = host.querySelector('[data-testid="plot-mathfield"]') as FakeMathfieldElement;
      const prefix = host.querySelector('[data-testid="plot-prefix"]')!;
      const rawToggle = host.querySelector('[data-testid="plot-raw-toggle"]')!;
      const rawInput = host.querySelector('[data-testid="plot-expression"]')!;
      const status = host.querySelector('[data-testid="plot-status"]')!;
      const insertBtn = host.querySelector('[data-action="plot-insert"]')!;
      const kind = host.querySelector('[data-testid="plot-kind"]')!;

      // Existing 3D surface expression opens directly as a 2D fraction with `z =` prefix and collapsed raw toggle
      assert.equal(plotField.smartSuperscript, true, 'plotField enables smartSuperscript so x^2+1 returns to baseline');
      assert.equal(prefix.textContent, 'z =');
      assert.equal(rawToggle.open, false);
      assert.equal(plotField.getValue(), '\\frac{x^{2}-y^{2}}{10}');

      // Switching to polar updates prefix to `r =` and converts default `2*sin(3*theta)` to 2D LaTeX
      kind.value = 'polar';
      kind.dispatchEvent(new FakeEvent('change', { bubbles: true }));
      assert.equal(prefix.textContent, 'r =');
      assert.equal(plotField.getValue(), '2\\sin\\left(3\\theta\\right)');
      const presetSelect = host.querySelector('[data-testid="plot-preset-select"]')!;
      presetSelect.value = 'spiral';
      presetSelect.dispatchEvent(new FakeEvent('change', { bubbles: true }));
      assert.equal(plotField.getValue(), '\\frac{\\theta}{3}');
      assert.equal(rawInput.value, 'theta/3');

      // Switching back to function mode updates prefix to `y =`
      kind.value = 'function';
      kind.dispatchEvent(new FakeEvent('change', { bubbles: true }));
      assert.equal(prefix.textContent, 'y =');

      // Clicking 2D fraction button on empty plotField creates placeholders, marks incomplete, and disables insert
      plotField.setValue('', { silenceNotifications: true });
      plotField.dispatchEvent(new FakeEvent('input', { bubbles: true }));
      host.querySelector('[data-action="plot-symbol-fraction"]')!.click();
      assert.equal(plotField.getValue(), '\\frac{\\placeholder{}}{\\placeholder{}}');
      assert.equal(status.dataset.state, 'incomplete');
      assert.equal(insertBtn.disabled, true);

      // Filling the 2D fraction syncs `plot-expression` and Enter previews immediately
      plotField.setValue('\\frac{\\sin\\left(x\\right)}{2}');
      assert.equal(rawInput.value, '(sin(x))/2');
      plotField.dispatchEvent(new FakeEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      assert.equal(status.dataset.state, 'ready');
      assert.equal(insertBtn.disabled, false);

      // Complex & Geometry modes hide the 2D formula row cleanly
      kind.value = 'complex';
      kind.dispatchEvent(new FakeEvent('change', { bubbles: true }));
      assert.equal(host.querySelector('[data-testid="plot-formula-row"]')!.hidden, true);
    } finally {
      tools.destroy();
    }
  });
});

test('Standalone Graph "Also insert equation" persists in settings and writes 2D equation + vme-plot block', async () => {
  let savedData: Record<string, unknown> = { futureKey: 'keep-me' };
  const store = new PluginSettingsStore({
    loadData: async () => savedData,
    saveData: async (data) => { savedData = data; },
  });
  await store.load();
  assert.equal(store.alsoInsertGraphEquation, false);

  await withFakeDom(async (doc) => {
    const host = doc.createElement('div');
    doc.body.append(host);
    let captured: { spec: PlotSpec; latex: string; display: boolean } | undefined;

    const editor = mountEditor(asHtml(host), {
      latex: '',
      display: true,
      language: 'en',
      alsoInsertGraphEquation: store.alsoInsertGraphEquation,
      onAlsoInsertGraphEquationChange: (enabled) => store.setAlsoInsertGraphEquation(enabled),
      onSave: () => undefined,
      onSaveGraph: async (spec, currentLatex, display) => {
        captured = { spec, latex: currentLatex, display };
      },
      onCancel: () => undefined,
    });

    try {
      host.querySelector('[data-action="subject-graph"]')!.click();
      const alsoCheckbox = host.querySelector('[data-testid="plot-also-insert-equation"]')!;
      const plotField = host.querySelector('[data-testid="plot-mathfield"]') as FakeMathfieldElement;
      const insertBtn = host.querySelector('[data-action="plot-insert"]')!;

      assert.equal(alsoCheckbox.hidden, false);
      assert.equal(alsoCheckbox.checked, false);
      assert.equal(insertBtn.textContent, 'Insert graph');

      // Checking "Also insert equation" updates button label and persists to PluginSettingsStore
      alsoCheckbox.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.equal(alsoCheckbox.checked, true);
      assert.equal(store.alsoInsertGraphEquation, true);
      assert.equal(savedData.alsoInsertGraphEquation, true);
      assert.equal(savedData.futureKey, 'keep-me');
      assert.equal(insertBtn.textContent, 'Insert equation and graph');

      // Enter 2D equation `(x^2 - 1)/2` in plot-mathfield and click Insert
      plotField.setValue('\\frac{x^{2}-1}{2}');
      insertBtn.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      assert.ok(captured);
      assert.equal(captured.spec.expression, '(x^2-1)/2');
      assert.equal(captured.latex, 'y = \\frac{x^{2}-1}{2}');

      // Verify Markdown output contains both the display `$$y = ...$$` equation and the `vme-plot` block
      const note = '';
      const written = planGraphInsert(note, { snapshot: note, from: 0, to: 0 }, captured.spec, captured.latex, captured.display);
      const mathRanges = findMathRanges(written);
      const plotBlocks = findPlotBlocks(written);
      assert.equal(mathRanges.length, 1);
      assert.equal(mathRanges[0]!.display, true);
      assert.equal(mathRanges[0]!.latex.trim(), 'y = \\frac{x^{2}-1}{2}');
      assert.equal(plotBlocks.length, 1);
      assert.equal(plotBlocks[0]!.spec.expression, '(x^2-1)/2');
    } finally {
      editor.destroy();
    }
  });
});

test('Equation-linked Graph ("Graph this equation") below main workspace remains intact', async () => {
  await withFakeDom(async (doc) => {
    const host = doc.createElement('div');
    doc.body.append(host);
    let captured: { spec: PlotSpec; latex: string } | undefined;

    const editor = mountEditor(asHtml(host), {
      latex: 'y=\\frac{x^{2}}{4}',
      display: true,
      initialMode: 'hybrid',
      onSave: () => undefined,
      onSaveGraph: async (spec, latex) => {
        captured = { spec, latex };
      },
      onCancel: () => undefined,
    });

    try {
      host.querySelector('[data-action="graph-equation"]')!.click();
      const linkedGraph = host.querySelector('.vme-equation-graph [data-testid="plot-tools"]')!;
      assert.equal(linkedGraph.querySelector('[data-testid="plot-formula-row"]')!.hidden, true);
      assert.equal(linkedGraph.querySelector('[data-testid="plot-also-insert-equation"]')!.parentElement!.hidden, true);
      linkedGraph.querySelector('[data-action="plot-insert"]')!.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.ok(captured);
      assert.equal(captured.spec.expression, '(x^2)/4');
      assert.equal(captured.latex, 'y=\\frac{x^{2}}{4}');
    } finally {
      editor.destroy();
    }
  });
});

test('Chemistry & Units support one-step bottom Save when main equation is empty, and Periodic Table pins element actions', async () => {
  await withFakeDom(async (doc) => {
    // 1. Chemistry empty-main-equation one-step Save
    const chemHost = doc.createElement('div');
    doc.body.append(chemHost);
    const savedEquations: Array<{ latex: string; display: boolean }> = [];

    const chemEditor = mountEditor(asHtml(chemHost), {
      latex: '',
      display: false,
      onSave: async (latex, display) => {
        savedEquations.push({ latex, display });
      },
      onCancel: () => undefined,
    });

    try {
      chemHost.querySelector('[data-action="subject-chemistry"]')!.click();
      const chemInsertBtn = chemHost.querySelector('[data-action="chemistry-insert"]')!;
      assert.equal(chemInsertBtn.textContent, '加入公式草稿');

      const chemInput = chemHost.querySelector('[data-testid="chemistry-input"]')!;
      chemInput.value = '2 H2 + O2 -> 2 H2O';
      chemInput.dispatchEvent(new FakeEvent('input', { bubbles: true }));

      // Main equation is still empty, yet bottom Save commits prepared `\ce{...}` in one step!
      assert.equal(chemEditor.getDraft().latex, '');
      const saveBtn = chemHost.querySelector('[data-action="save"]')!;
      assert.equal(saveBtn.disabled, false);
      saveBtn.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.equal(savedEquations.length, 1);
      assert.match(savedEquations[0]!.latex, /^\\ce\{.*H2O.*\}$/);
      assert.equal(savedEquations[0]!.display, false);
    } finally {
      chemEditor.destroy();
    }

    // 2. Units empty-main-equation one-step Ctrl+Enter Save + Periodic Table pinned card actions
    const unitHost = doc.createElement('div');
    doc.body.append(unitHost);
    const unitEditor = mountEditor(asHtml(unitHost), {
      latex: '',
      display: true,
      onSave: async (latex, display) => {
        savedEquations.push({ latex, display });
      },
      onCancel: () => undefined,
    });

    try {
      unitHost.querySelector('[data-action="subject-elements"]')!.click();
      unitHost.querySelector('[data-action="element-26"]')!.click();
      const details = unitHost.querySelector('[data-testid="element-details"]')!;
      assert.equal(details.hidden, false);
      assert.equal(details.dataset.pinned, 'true');
      assert.equal(unitHost.querySelector('[data-action="subject-elements"]')!.getAttribute('aria-selected'), 'true');

      // Add Fe to chemistry input without leaving Elements tab
      unitHost.querySelector('[data-action="element-add-chemistry"]')!.click();
      assert.equal(unitHost.querySelector('[data-testid="chemistry-input"]')!.value, 'Fe');
      assert.equal(unitHost.querySelector('[data-action="subject-elements"]')!.getAttribute('aria-selected'), 'true');
      assert.equal(unitHost.querySelector('[data-testid="element-detail-feedback"]')!.textContent, '已加入化学式');

      // Insert `\mathrm{Fe}` symbol into main formula and verify feedback
      unitHost.querySelector('[data-action="element-insert-symbol"]')!.click();
      assert.equal(unitEditor.getDraft().latex, '\\mathrm{Fe}');
      assert.equal(unitHost.querySelector('[data-testid="element-detail-feedback"]')!.textContent, '已插入符号');

      // Escape dismisses pinned card without closing the editor
      const escEvent = new FakeEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      unitHost.querySelector('.vme-editor')!.dispatchEvent(escEvent);
      assert.equal(details.hidden, true);
      assert.equal(details.dataset.pinned, undefined);

      // Clear main formula, switch to Units, type `9.81 m/s^2`, and press Ctrl+Enter to save directly
      unitHost.querySelector('[data-action="clear"]')!.click();
      assert.equal(unitEditor.getDraft().latex, '');
      unitHost.querySelector('[data-action="subject-units"]')!.click();
      assert.equal(unitHost.querySelector('[data-action="units-insert"]')!.textContent, '加入公式草稿');
      const unitInput = unitHost.querySelector('[data-testid="units-input"]')!;
      unitInput.value = '9.81 m/s^2';
      unitInput.dispatchEvent(new FakeEvent('input', { bubbles: true }));
      unitInput.dispatchEvent(new FakeEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.equal(savedEquations.length, 2);
      assert.equal(savedEquations[1]!.latex, '\\pu{9.81 m/s^2}');
    } finally {
      unitEditor.destroy();
    }
  });
});

test('1.1.1 Graph preset deduplication & button hierarchy: compact preset select, single symbol bar, secondary preview', async () => {
  await withFakeDom(async (doc) => {
    const host = doc.createElement('div');
    doc.body.append(host);
    const tools = mountPlotTools(asHtml(host), {
      getCurrentExpression: () => 'cos(x)',
      onInsertGraph: async () => undefined,
    });
    try {
      const presetRow = host.querySelector('[data-testid="plot-preset-row"]')!;
      const presetSelect = host.querySelector('[data-testid="plot-preset-select"]')!;
      const useCurrent = host.querySelector('[data-action="plot-use-current"]')!;
      assert.equal(presetSelect.parentElement, presetRow);
      assert.equal(useCurrent.parentElement, presetRow);

      // Zero duplicate preset buttons (`plot-preset-*` buttons no longer exist; only `<option>` items exist inside select)
      assert.equal(host.querySelectorAll('button[data-action^="plot-preset-"]').length, 0);

      // Only one clean row of 2D symbol quick-insert buttons contains sin/cos/tan/sqrt
      const symbolButtons = host.querySelectorAll('.vme-plot-symbols button');
      assert.ok(symbolButtons.length >= 14);
      const nonSymbolTrigButtons = host.querySelectorAll('button').filter((btn) => {
        const action = btn.getAttribute('data-action') ?? '';
        return !action.startsWith('plot-symbol-') && /^(sin|cos|tan|√)/.test(btn.textContent.trim());
      });
      assert.equal(nonSymbolTrigButtons.length, 0);

      // Preview & Copy Image are secondary; Insert is the sole `.vme-science-primary` button in `.vme-plot-actions`
      const previewBtn = host.querySelector('[data-action="plot-preview"]')!;
      const copyBtn = host.querySelector('[data-action="plot-copy-image"]')!;
      const insertBtn = host.querySelector('[data-action="plot-insert"]')!;
      assert.equal(previewBtn.classList.contains('vme-subpanel-secondary'), true);
      assert.equal(copyBtn.classList.contains('vme-subpanel-secondary'), true);
      const primaryButtons = host.querySelectorAll('.vme-plot-actions .vme-science-primary');
      assert.equal(primaryButtons.length, 1);
      assert.equal(primaryButtons[0], insertBtn);

      // Selecting a preset populates 2D mathfield & previews; manual edit resets `presetSelect.value` to '' so same preset can be re-selected
      presetSelect.value = 'sine';
      presetSelect.dispatchEvent(new FakeEvent('change', { bubbles: true }));
      const plotField = host.querySelector('[data-testid="plot-mathfield"]') as FakeMathfieldElement;
      assert.equal(plotField.getValue(), '\\sin\\left(x\\right)');
      assert.equal(presetSelect.value, 'sine');

      plotField.setValue('x+1');
      assert.equal(presetSelect.value, '');

      presetSelect.value = 'sine';
      presetSelect.dispatchEvent(new FakeEvent('change', { bubbles: true }));
      assert.equal(plotField.getValue(), '\\sin\\left(x\\right)');
    } finally {
      tools.destroy();
    }
  });
});

test('1.1.1 Offline Copy Image (PNG 2x offscreen Canvas + standalone SVG fallback + error handling)', async () => {
  await withFakeDom(async (doc) => {
    const g = globalThis as Record<string, unknown>;
    const prevClipboardItem = g.ClipboardItem;
    const prevImage = g.Image;

    let canvasDims = { width: 0, height: 0 };
    let fillStyles: string[] = [];
    let drawCalls = 0;
    let writtenItems: unknown[] = [];
    let writtenText = '';

    class MockClipboardItem {
      constructor(public readonly items: Record<string, Blob>) {}
    }

    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private currentSrc = '';
      get src(): string { return this.currentSrc; }
      set src(value: string) {
        this.currentSrc = value;
        if (value.startsWith('data:image/svg+xml;charset=utf-8,')) {
          queueMicrotask(() => this.onload?.());
        } else {
          queueMicrotask(() => this.onerror?.());
        }
      }
    }

    const origCreateElement = doc.createElement.bind(doc);
    doc.createElement = ((tag: string): FakeElement => {
      const el = origCreateElement(tag);
      if (tag.toLowerCase() === 'canvas') {
        const canvasRec = el as unknown as Record<string, unknown>;
        let w = 0;
        let h = 0;
        Object.defineProperty(canvasRec, 'width', {
          get: () => w,
          set: (v: number) => { w = v; canvasDims.width = v; },
        });
        Object.defineProperty(canvasRec, 'height', {
          get: () => h,
          set: (v: number) => { h = v; canvasDims.height = v; },
        });
        canvasRec.getContext = (kind: string) => {
          if (kind !== '2d') return null;
          const ctx: {
            fillStyle: string;
            fillRect: () => void;
            drawImage: () => void;
          } = {
            fillStyle: '#000000',
            fillRect: () => { fillStyles.push(ctx.fillStyle); },
            drawImage: () => { drawCalls += 1; },
          };
          return ctx;
        };
        canvasRec.toBlob = (cb: (blob: Blob | null) => void, mime?: string) => {
          cb(new Blob(['PNG-BINARY'], { type: mime ?? 'image/png' }));
        };
      }
      return el;
    }) as typeof doc.createElement;

    const host = doc.createElement('div');
    doc.body.append(host);
    const tools = mountPlotTools(asHtml(host), {
      initialDraft: { expression: 'sin(x)', xMin: '-10', xMax: '10', yMin: '-6', yMax: '6', previewed: true },
      onInsertGraph: async () => undefined,
    });

    try {
      const copyBtn = host.querySelector('[data-action="plot-copy-image"]')!;
      const status = host.querySelector('[data-testid="plot-status"]')!;
      assert.equal(copyBtn.disabled, false);

      // Case 1: 2x PNG via ClipboardItem + offscreen Canvas
      doc.defaultView.navigator = {
        language: 'zh-CN',
        clipboard: {
          write: async (items: unknown[]) => { writtenItems = items; },
          writeText: async (text: string) => { writtenText = text; },
        },
      };
      doc.defaultView.ClipboardItem = MockClipboardItem;
      doc.defaultView.Image = MockImage;

      copyBtn.click();
      await new Promise(resolve => setTimeout(resolve, 15));

      assert.deepEqual(canvasDims, { width: 1600, height: 960 });
      assert.ok(fillStyles.includes('#ffffff'));
      assert.equal(drawCalls, 1);
      assert.equal(writtenItems.length, 1);
      const firstItem = writtenItems[0] as MockClipboardItem;
      assert.equal(firstItem.items['image/png']?.type, 'image/png');
      assert.equal(status.textContent, '图片已复制到剪贴板。');

      // Case 2: Environment without ClipboardItem -> graceful SVG source fallback with crisp white backdrop
      delete doc.defaultView.ClipboardItem;
      delete g.ClipboardItem;
      writtenText = '';
      copyBtn.click();
      await new Promise(resolve => setTimeout(resolve, 15));

      assert.match(writtenText, /^<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
      assert.match(writtenText, /data-vme-export-bg="true"[^>]*fill="#ffffff"/);
      assert.equal(status.textContent, '当前环境不支持复制图片，已复制 SVG 源码。');

      // Case 3: Direct unit check on preparePlotSvgForExport + error path when clipboard rejects
      const dummySvg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      dummySvg.setAttribute('viewBox', '0 0 800 480');
      const exported = preparePlotSvgForExport(
        dummySvg as unknown as SVGElement,
        2,
        '<svg viewBox="0 0 800 480" style="color: var(--text-normal)"><title>Test</title><path d="M0 0"/></svg>',
      );
      assert.equal(exported.width, 1600);
      assert.equal(exported.height, 960);
      assert.match(exported.markup, /width="1600" height="960"/);
      assert.doesNotMatch(exported.markup, /style="/);
      assert.match(exported.markup, /<title>Test<\/title><rect data-vme-export-bg="true" width="800" height="480" fill="#ffffff"\/>/);

      doc.defaultView.navigator = {
        language: 'zh-CN',
        clipboard: {
          writeText: async () => { throw new Error('Denied'); },
        },
      };
      await assert.rejects(() => copyPlotImage(dummySvg as unknown as SVGElement));
      copyBtn.click();
      await new Promise(resolve => setTimeout(resolve, 15));
      assert.equal(status.dataset.state, 'error');
      assert.equal(status.textContent, '未能复制图片，请重试。');
    } finally {
      tools.destroy();
      if (prevClipboardItem === undefined) delete g.ClipboardItem; else g.ClipboardItem = prevClipboardItem;
      if (prevImage === undefined) delete g.Image; else g.Image = prevImage;
    }
  });
});

test('1.1.1 Matrix multi-cell paste: TSV/Excel expansion, offset paste, sparse fill-zero, and atomic safety rejection', async () => {
  await withFakeDom(async (doc) => {
    const host = doc.createElement('div');
    doc.body.append(host);
    const applied: string[] = [];

    const matrix = mountMatrixTools(asHtml(host), {
      initialDraft: { open: true, rows: 2, columns: 2, kind: 'bmatrix', cells: [['9', '8'], ['7', '6']] },
      getLatex: () => '',
      onApply: (latex) => { applied.push(latex); },
      onOpenChange: () => undefined,
    });

    const pasteIntoCell = (row1Based: number, col1Based: number, text: string) => {
      const cell = host.querySelector(`[data-testid="matrix-cell-${row1Based}-${col1Based}"]`)!;
      const ev = new FakeEvent('paste', { bubbles: true, cancelable: true });
      ev.clipboardData = { getData: (mime: string) => (mime === 'text/plain' ? text : '') };
      cell.dispatchEvent(ev);
      assert.equal(ev.defaultPrevented, true);
    };

    // 1. Paste 2x3 TSV from Excel into (1, 1) on a 2x2 grid -> auto-expands columns to 3 & syncs dropdown
    pasteIntoCell(1, 1, '1\t2\t3\r\n4\t5\t6\r\n');
    const rowSelect = host.querySelector('[data-testid="matrix-rows"]')!;
    const colSelect = host.querySelector('[data-testid="matrix-columns"]')!;
    const applyBtn = host.querySelector('[data-action="matrix-apply"]')!;
    const status = host.querySelector('[data-testid="matrix-status"]')!;
    assert.equal(rowSelect.value, '2');
    assert.equal(colSelect.value, '3');
    assert.equal(status.dataset.state, 'ready');
    assert.equal(applyBtn.disabled, false);
    assert.deepEqual(matrix.getDraft().cells.slice(0, 2).map(r => r.slice(0, 3)), [
      ['1', '2', '3'],
      ['4', '5', '6'],
    ]);

    // 2. Paste 2x2 TSV starting at offset cell (2, 2) -> expands to 3x3 while preserving row 1 & col 1
    pasteIntoCell(2, 2, 'a\tb\nc\td');
    assert.equal(rowSelect.value, '3');
    assert.equal(colSelect.value, '3');
    assert.deepEqual(matrix.getDraft().cells.slice(0, 3).map(r => r.slice(0, 3)), [
      ['1', '2', '3'],
      ['4', 'a', 'b'],
      ['', 'c', 'd'],
    ]);

    // Fill blank cells with 0 -> ready to apply 3x3 matrix
    host.querySelector('[data-action="matrix-fill-zero"]')!.click();
    assert.equal(matrix.getDraft().cells[2]![0], '0');
    assert.equal(applyBtn.disabled, false);

    // 3. Paste multi-line column vector at (1, 1) -> populates (1,1)..(4,1) and expands rows to 4
    pasteIntoCell(1, 1, 'x\ny\nz\nw');
    assert.equal(rowSelect.value, '4');
    assert.equal(colSelect.value, '3');
    assert.deepEqual(matrix.getDraft().cells.slice(0, 4).map(r => r[0]), ['x', 'y', 'z', 'w']);
    // Fill remaining blanks on row 4 so snapshot is clean
    host.querySelector('[data-action="matrix-fill-zero"]')!.click();
    const snapshotBeforeReject = matrix.getDraft();

    // 4. Atomic rejection cases: >6x6 bound, document/file-inclusion command, macro definition, raw `&`, `%` comment, unknown macro
    for (const badPayload of [
      '1\t2\t3\t4\t5\t6\t7',
      '1\t\\href{https://evil.example}{x}\n3\t4',
      '1\t\\input{/etc/passwd}\n3\t4',
      '1\t\\newcommand{\\evil}{1}\n3\t4',
      '1\tx & y\n3\t4',
      'x % keep exact comment\r\n+y',
      '1\t\\unknownDangerousMacro\n3\t4',
    ]) {
      pasteIntoCell(1, 1, badPayload);
      const after = matrix.getDraft();
      assert.equal(after.rows, snapshotBeforeReject.rows);
      assert.equal(after.columns, snapshotBeforeReject.columns);
      assert.deepEqual(after.cells, snapshotBeforeReject.cells);
      assert.equal(status.dataset.state, 'error');
      const rejected = host.querySelector('[data-testid="matrix-rejected-original"]')!;
      assert.equal(rejected.value, badPayload);
    }

    // Offset overflow at (4, 3): pasting 4 rows at row 4 would need 7 rows (> 6) -> rejected atomically
    pasteIntoCell(4, 3, '1\n2\n3\n4');
    assert.equal(matrix.getDraft().rows, 4);
    assert.deepEqual(matrix.getDraft().cells, snapshotBeforeReject.cells);

    // Valid sparse ragged TSV paste recovers cleanly and applies
    pasteIntoCell(1, 1, '10\t20\n30');
    host.querySelector('[data-action="matrix-fill-zero"]')!.click();
    assert.equal(applyBtn.disabled, false);
    applyBtn.click();
    assert.equal(applied.length, 1);
    assert.match(applied[0]!, /^\\begin\{bmatrix\}10 & 20 & 3 \\\\ 30 & 0 & b/);
  });
});

test('1.1.1 Shortcut tooltips and 6-language UI translations cover all new controls cleanly', async () => {
  for (const lang of ['en', 'es', 'ja', 'de', 'fr'] as const) {
    for (const key of [
      '选择示例（替换输入）',
      '选择示例（替换输入）…',
      '复制图片',
      '复制高清 PNG 图片到剪贴板',
      '图片已复制到剪贴板。',
      '当前环境不支持复制图片，已复制 SVG 源码。',
      '未能复制图片，请重试。',
      '插入公式（Ctrl/Cmd+Enter）',
      '保存修改（Ctrl/Cmd+Enter）',
      '取消编辑（Esc）',
      '撤销（Ctrl/Cmd+Z）',
      '重做（Ctrl+Y / Cmd+Shift+Z）',
      '插入图像（Ctrl/Cmd+Enter）',
      '保存图像（Ctrl/Cmd+Enter）',
      '立即刷新图像预览（Enter）',
      '应用到当前公式（Ctrl/Cmd+Enter）',
    ]) {
      const translated = translateUiText(key, lang);
      assert.ok(translated.length > 0, `${lang}: ${key}`);
      assert.notEqual(translated, key, `${lang}: ${key}`);
      if (lang !== 'ja') {
        assert.doesNotMatch(translated, /[\u4e00-\u9fff]/, `${lang} leaked Han characters for: ${key} -> ${translated}`);
      }
    }
  }

  await withFakeDom(async (doc) => {
    const host = doc.createElement('div');
    doc.body.append(host);
    const editor = mountEditor(asHtml(host), {
      latex: 'x+1',
      display: true,
      language: 'en',
      onSave: async () => undefined,
      onCancel: () => undefined,
    });
    try {
      await new Promise(resolve => setTimeout(resolve, 10));
      assert.match(host.querySelector('[data-action="save"]')!.getAttribute('title') ?? '', /Ctrl\/Cmd\+Enter/);
      assert.match(host.querySelector('[data-action="operator-newline"]')!.getAttribute('title') ?? '', /Shift\+Enter/);
      assert.match(host.querySelector('[data-action="undo"]')!.getAttribute('title') ?? '', /Ctrl\/Cmd\+Z/);
      assert.match(host.querySelector('[data-action="redo"]')!.getAttribute('title') ?? '', /Ctrl\+Y/);
      assert.match(host.querySelector('[data-action="cancel"]')!.getAttribute('title') ?? '', /Esc/);

      host.querySelector('[data-action="subject-graph"]')!.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      assert.equal(host.querySelector('[data-action="plot-copy-image"]')!.textContent, 'Copy image');
      assert.match(host.querySelector('[data-action="plot-insert"]')!.getAttribute('title') ?? '', /Ctrl\/Cmd\+Enter/);
      assert.match(host.querySelector('[data-action="plot-preview"]')!.getAttribute('title') ?? '', /Enter/);
    } finally {
      editor.destroy();
    }
  }, 'en-US');
});

test('Graph panel top-to-bottom flow places preview and navigation above commit actions, and periodic table mounts 10 categories', async () => {
  await withFakeDom(async (doc) => {
    const host = doc.createElement('div');
    doc.body.append(host);
    const editor = mountEditor(asHtml(host), {
      latex: 'x^2',
      display: true,
      language: 'en',
      onSave: async () => undefined,
      onCancel: () => undefined,
    });
    try {
      await new Promise(resolve => setTimeout(resolve, 10));
      // Verify expanded Greek symbol buttons and inline Greek typing tip in Visual mode
      for (const greekId of ['gamma', 'lambda', 'mu', 'rho', 'sigma', 'varphi', 'varepsilon', 'omega']) {
        assert.ok(host.querySelector(`[data-action="${greekId}"]`), `missing Greek symbol button: ${greekId}`);
      }
      assert.match(host.querySelector('[data-testid="greek-typing-hint"]')!.textContent, /rho.*lambda.*omega/);

      // Verify periodic table DOM buttons emit all 10 chemical categories
      host.querySelector('[data-action="subject-elements"]')!.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      const elementCategories = new Set(
        host.querySelectorAll('.vme-element-button').map(btn => btn.dataset.category),
      );
      assert.equal(elementCategories.size, 10);
      assert.ok(elementCategories.has('halogen'));
      assert.ok(elementCategories.has('alkaline-earth'));
      assert.ok(elementCategories.has('metalloid'));
      assert.ok(!elementCategories.has('main'));

      // Switch to Graph panel and verify top-to-bottom DOM child order inside plot body
      host.querySelector('[data-action="subject-graph"]')!.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      const plotBody = host.querySelector('[data-testid="plot-preview"]')!.parentElement!;
      const directChildren = plotBody.children;
      const previewIdx = directChildren.findIndex(el => el.dataset.testid === 'plot-preview');
      const navIdx = directChildren.findIndex(el => el.dataset.testid === 'plot-navigation');
      const actionsIdx = directChildren.findIndex(el => el.dataset.testid === 'plot-actions');
      const statusIdx = directChildren.findIndex(el => el.dataset.testid === 'plot-status');
      const rangeIdx = directChildren.findIndex(el => el.classList.contains('vme-plot-range'));

      assert.ok(rangeIdx >= 0 && previewIdx > rangeIdx, 'preview sits below parameter inputs');
      assert.ok(navIdx > previewIdx, 'navigation toolbar sits directly below preview');
      assert.ok(actionsIdx > navIdx, 'commit actions sit below preview & navigation');
      assert.ok(statusIdx > actionsIdx, 'status sits at the bottom of the panel');
      assert.ok(
        plotBody.querySelector('[data-testid="plot-navigation"] [data-testid="plot-copy-image"]'),
        'Copy image button lives in the view/navigation toolbar next to Reset view',
      );
    } finally {
      editor.destroy();
    }
  }, 'en-US');
});

test('Hemisphere, Frustum, and Composite 3D Solids builder UI supports templates, 2..6 part cards, stack/center, persistence, and 6 languages', async () => {
  await withFakeDom(async (doc) => {
    const host = doc.createElement('div');
    host.className = 'vme-editor';
    doc.body.append(host);
    const savedSpecs: PlotSpec[] = [];

    const tools = mountPlotTools(asHtml(host), {
      onInsertGraph: async (spec) => {
        savedSpecs.push(spec);
      },
    });
    const i18n = localizeEditor(asHtml(host), 'zh');

    try {
      const kind = host.querySelector('[data-testid="plot-kind"]')!;
      kind.value = 'geometry';
      kind.dispatchEvent(new FakeEvent('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 10));

      const shapeSelect = host.querySelector('[data-testid="geometry-shape"]')!;

      // 1. Hemisphere UI
      shapeSelect.value = 'hemisphere';
      shapeSelect.dispatchEvent(new FakeEvent('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 10));
      assert.equal(host.querySelector('[data-testid="geometry-radius"]')!.closest('label')!.hidden, false);
      assert.equal(host.querySelector('[data-testid="geometry-topRadius"]')!.closest('label')!.hidden, true);
      assert.ok(host.querySelector('[data-testid="plot-preview"] svg'));

      // 2. Frustum UI (circular when sides blank, polygonal when sides = 6)
      shapeSelect.value = 'frustum';
      shapeSelect.dispatchEvent(new FakeEvent('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 10));
      const topRadiusInput = host.querySelector('[data-testid="geometry-topRadius"]')!;
      const sidesInput = host.querySelector('[data-testid="geometry-sides"]')!;
      assert.equal(topRadiusInput.closest('label')!.hidden, false);
      assert.equal(sidesInput.closest('label')!.hidden, false);
      assert.equal(sidesInput.value, '', 'frustum defaults to circular (blank sides)');
      await host.querySelector('[data-action="plot-insert"]')!.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      assert.equal(savedSpecs.at(-1)?.geometry?.shape, 'frustum');
      assert.equal(savedSpecs.at(-1)?.geometry?.sides, undefined);

      sidesInput.value = '6';
      sidesInput.dispatchEvent(new FakeEvent('input', { bubbles: true }));
      await host.querySelector('[data-action="plot-insert"]')!.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      assert.equal(savedSpecs.at(-1)?.geometry?.sides, 6);

      // 3. Composite 3D Solids builder UI + visible azimuth/elevation + preserved faces toggle
      shapeSelect.value = 'composite';
      shapeSelect.dispatchEvent(new FakeEvent('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 15));

      const compositePanel = host.querySelector('[data-testid="geometry-composite-controls"]')!;
      assert.equal(compositePanel.hidden, false);
      const facesSelect = host.querySelector('[data-testid="geometry-faces"]')!;
      assert.equal(facesSelect.closest('label')!.hidden, false, 'composite keeps global faces/wireframe toggle visible');
      assert.equal(host.querySelector('[data-testid="plot-azimuth"]')!.closest('label')!.hidden, false, 'geometry shows azimuth input');
      assert.equal(host.querySelector('[data-testid="plot-elevation"]')!.closest('label')!.hidden, false, 'geometry shows elevation input');
      assert.equal(host.querySelector('[data-testid="plot-zMin"]')!.closest('label')!.hidden, true, 'geometry keeps zMin hidden');
      assert.equal(host.querySelectorAll('[data-testid^="composite-part-"]').filter(el => /^composite-part-\d+$/.test(el.dataset.testid ?? '')).length, 2);

      // Test all 6 one-click math problem templates
      for (const tpl of COMPOSITE_TEMPLATES) {
        const tplBtn = host.querySelector(`[data-testid="composite-preset-${tpl.id}"]`)!;
        tplBtn.click();
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.ok(host.querySelector('[data-testid="plot-preview"] svg'), `template ${tpl.id} renders live 3D SVG`);
      }

      // Switch to sphere-in-cone, add parts up to maximum 6, verify add button disables at 6
      host.querySelector('[data-testid="composite-preset-sphere-in-cone"]')!.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      const addPartBtn = host.querySelector('[data-testid="composite-add-part"]')!;
      for (let count = 2; count < 6; count++) {
        assert.equal(addPartBtn.disabled, false);
        addPartBtn.click();
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      assert.equal(addPartBtn.disabled, true, 'cannot exceed 6 composite parts');

      // Remove parts down to 3, test stack-on-previous and center-origin buttons
      for (let idx = 5; idx >= 3; idx--) {
        host.querySelector(`[data-testid="composite-remove-${idx}"]`)!.click();
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      const part2Shape = host.querySelector('[data-testid="composite-part-2-shape"]')!;
      part2Shape.value = 'cone';
      part2Shape.dispatchEvent(new FakeEvent('change', { bubbles: true }));
      const part2RotX = host.querySelector('[data-testid="composite-part-2-rotX"]')!;
      part2RotX.value = '180';
      part2RotX.dispatchEvent(new FakeEvent('input', { bubbles: true }));
      host.querySelector('[data-testid="composite-stack-2"]')!.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      const stackedZ = Number(host.querySelector('[data-testid="composite-part-2-offsetZ"]')!.value);
      assert.ok(Number.isFinite(stackedZ) && stackedZ > 0, `stacked Z should be > 0, got ${stackedZ}`);

      host.querySelector('[data-testid="composite-center-2"]')!.click();
      assert.equal(host.querySelector('[data-testid="composite-part-2-offsetZ"]')!.value, '0');

      // Invalid input preserves raw user text and blocks insert without mutating saved specs
      const beforeInvalidCount = savedSpecs.length;
      const part0Radius = host.querySelector('[data-testid="composite-part-0-radius"]')!;
      part0Radius.value = 'bad-radius';
      part0Radius.dispatchEvent(new FakeEvent('input', { bubbles: true }));
      await host.querySelector('[data-action="plot-insert"]')!.click();
      assert.equal(savedSpecs.length, beforeInvalidCount);
      assert.equal(part0Radius.value, 'bad-radius');

      part0Radius.value = '3';
      part0Radius.dispatchEvent(new FakeEvent('input', { bubbles: true }));
      facesSelect.value = 'wireframe';
      facesSelect.dispatchEvent(new FakeEvent('change', { bubbles: true }));
      const azimuthInput = host.querySelector('[data-testid="plot-azimuth"]')!;
      azimuthInput.value = '125';
      azimuthInput.dispatchEvent(new FakeEvent('input', { bubbles: true }));
      await host.querySelector('[data-action="plot-insert"]')!.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      const savedComposite = savedSpecs.at(-1)!;
      assert.equal(savedComposite.geometry?.shape, 'composite');
      assert.equal(savedComposite.geometry?.faces, false, 'composite wireframe faces: false is preserved on save');
      assert.equal(savedComposite.azimuth, 125, 'manual azimuth input in geometry mode is saved');
      assert.equal(savedComposite.geometry?.parts?.length, 3);

      // Verify 6-language switching leaves zero Han characters in en, es, de, fr
      for (const lang of ['en', 'es', 'ja', 'de', 'fr'] as const) {
        i18n.setLanguage(lang);
        await new Promise(resolve => setTimeout(resolve, 10));
        if (lang !== 'ja') {
          assert.doesNotMatch(host.textContent, /[\p{Script=Han}]/u, `${lang} leaked Han in composite builder UI`);
        }
      }

      // Reopen saved composite spec via graphDraftFromSpec
      const reopenedHost = doc.createElement('div');
      doc.body.append(reopenedHost);
      const reopened = mountPlotTools(asHtml(reopenedHost), {
        editing: true,
        initialDraft: graphDraftFromSpec(savedComposite),
      });
      try {
        assert.equal(reopened.getDraft().geometry?.shape, 'composite');
        assert.equal(reopened.getDraft().geometry?.faces, false, 'reopened composite preserves faces: false');
        assert.equal(reopened.getDraft().azimuth, '125');
        assert.equal(reopened.getDraft().geometry?.parts?.length, 3);
        assert.ok(reopenedHost.querySelector('[data-testid="plot-preview"] svg'));
      } finally {
        reopened.destroy();
      }
    } finally {
      i18n.destroy();
      tools.destroy();
    }
  }, 'zh-CN');
});
