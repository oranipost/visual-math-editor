import assert from 'node:assert/strict';
import test from 'node:test';
import { validateLatex } from 'mathlive';
import { mountEditor, type EditorMode } from '../src/editor-ui';
import { resolveLanguage, translateUiText } from '../src/i18n';
import {
  DEFAULT_PLUGIN_SETTINGS,
  PluginSettingsStore,
  parsePluginSettings,
  renderPluginSettings,
  resolveInitialEditorMode,
  shouldHideModeChrome,
} from '../src/settings';

// --- Lightweight Node DOM harness for testing real `mountEditor` UI state ---

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

  readonly bubbles: boolean;
  readonly cancelable: boolean;

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
  tabIndex = 0;
  rows = 2;
  spellcheck = false;
  wrap = '';
  type = '';
  htmlFor = '';
  selectionStart = 0;
  selectionEnd = 0;
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

  get value(): string {
    if (this.localName === 'select') {
      if (this.internalValue) return this.internalValue;
      const first = this.options[0];
      return first ? first.value : '';
    }
    return this.internalValue;
  }

  set value(v: string) {
    this.internalValue = String(v);
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
    if (this.localName === 'summary' && this.parentElement?.localName === 'details') {
      this.parentElement.open = !this.parentElement.open;
    }
    this.dispatchEvent(new FakeEvent('click', { bubbles: true, cancelable: true }));
  }

  focus(): void {
    if (this.disabled || this.hidden) return;
    this.ownerDocument.activeElement = this;
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
  readonly body: FakeElement;
  activeElement: FakeElement | null = null;

  constructor(locale = 'zh-CN') {
    this.defaultView = {
      navigator: { language: locale },
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
      requestAnimationFrame: (cb: () => void) => Number(globalThis.setTimeout(cb, 0)),
      cancelAnimationFrame: (id: number) => globalThis.clearTimeout(id),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
    this.body = new FakeElement(this, 'body');
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

  getElementById(id: string): FakeElement | null {
    return this.body.querySelector(`#${id}`);
  }
}

class FakeDOMParser {
  parseFromString(_markup: string): { documentElement: FakeElement } {
    const doc = new FakeDocument();
    return { documentElement: new FakeElement(doc, 'svg') };
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

// --- Unit & Component Tests ---

test('parsePluginSettings preserves unknown keys and falls back smoothly for missing or malformed fields', () => {
  assert.deepEqual(parsePluginSettings(null).settings, DEFAULT_PLUGIN_SETTINGS);
  assert.deepEqual(parsePluginSettings(undefined).settings, DEFAULT_PLUGIN_SETTINGS);
  assert.deepEqual(parsePluginSettings(['array']).settings, DEFAULT_PLUGIN_SETTINGS);

  const legacyRaw = {
    language: 'es',
    modeDisplay: 'invalid-mode',
    preferredMode: 42,
    futureFeatureFlag: { enabled: true, count: 3 },
  };
  const parsed = parsePluginSettings(legacyRaw);
  assert.deepEqual(parsed.settings, {
    modeDisplay: 'all',
    preferredMode: 'visual',
    language: 'es',
  });
  assert.deepEqual(parsed.rawRecord.futureFeatureFlag, { enabled: true, count: 3 });

  const withProto = JSON.parse('{"__proto__":{"polluted":true},"modeDisplay":"hybrid","preferredMode":"latex","language":"en"}') as unknown;
  const clean = parsePluginSettings(withProto);
  assert.deepEqual(clean.settings, { modeDisplay: 'hybrid', preferredMode: 'latex', language: 'en' });
  assert.equal(Object.hasOwn(clean.rawRecord, '__proto__'), false);
});

test('resolveInitialEditorMode and shouldHideModeChrome obey single-mode lock, preferredMode, and recovered drafts', () => {
  assert.equal(resolveInitialEditorMode({ modeDisplay: 'all', preferredMode: 'hybrid' }), 'hybrid');
  assert.equal(resolveInitialEditorMode({ modeDisplay: 'all', preferredMode: 'hybrid' }, 'latex'), 'latex');
  assert.equal(resolveInitialEditorMode({ modeDisplay: 'visual', preferredMode: 'latex' }), 'visual');
  assert.equal(resolveInitialEditorMode({ modeDisplay: 'visual', preferredMode: 'latex' }, 'latex', false), 'visual');
  assert.equal(resolveInitialEditorMode({ modeDisplay: 'visual', preferredMode: 'latex' }, 'hybrid', true), 'hybrid');
  assert.equal(resolveInitialEditorMode({ modeDisplay: 'hybrid', preferredMode: 'visual' }), 'hybrid');
  assert.equal(resolveInitialEditorMode({ modeDisplay: 'latex', preferredMode: 'visual' }), 'latex');

  assert.equal(shouldHideModeChrome({ modeDisplay: 'all', graphSelected: false, temporarySourceFallback: false }), false);
  assert.equal(shouldHideModeChrome({ modeDisplay: 'all', graphSelected: true, temporarySourceFallback: false }), true);
  assert.equal(shouldHideModeChrome({ modeDisplay: 'visual', graphSelected: false, temporarySourceFallback: false }), true);
  assert.equal(shouldHideModeChrome({ modeDisplay: 'visual', graphSelected: false, temporarySourceFallback: true }), false);
  assert.equal(shouldHideModeChrome({ modeDisplay: 'hybrid', graphSelected: false, temporarySourceFallback: false }), true);
  assert.equal(shouldHideModeChrome({ modeDisplay: 'latex', graphSelected: false, temporarySourceFallback: false }), true);
});

test('Scenario 1: single-mode display (visual / hybrid / latex) hides mode tabs & description even across subject switches', async () => {
  await withFakeDom(doc => {
    for (const singleMode of ['visual', 'hybrid', 'latex'] as const) {
      const host = doc.createElement('div');
      doc.body.append(host);
      const mounted = mountEditor(asHtml(host), {
        latex: 'x^2+1',
        editing: true,
        modeDisplay: singleMode,
        preferredMode: 'visual',
        language: 'zh',
        onSave: () => undefined,
        onCancel: () => undefined,
      });

      const root = host.querySelector('[data-testid="visual-math-editor"]')!;
      const modeTabs = host.querySelector('.vme-mode-tabs')!;
      const modeDesc = host.querySelector('.vme-mode-description')!;
      const sourcePane = host.querySelector('.vme-source-pane')!;
      const visualPane = host.querySelector('.vme-visual-pane')!;
      const modeSelect = host.querySelector('[data-testid="mode-display-select"]')!;

      assert.equal(root.dataset.mode, singleMode, `locked mode ${singleMode}`);
      assert.equal(root.dataset.modeDisplay, singleMode);
      assert.equal(modeSelect.value, singleMode);
      assert.equal(modeTabs.hidden, true, `${singleMode} hides modeTabs initially`);
      assert.equal(modeDesc.hidden, true, `${singleMode} hides modeDescription initially`);
      assert.equal(sourcePane.hidden, singleMode === 'visual');
      assert.equal(visualPane.hidden, singleMode === 'latex');

      for (const subject of ['chemistry', 'physics', 'units', 'elements', 'graph', 'math'] as const) {
        const subjectButton = host.querySelector(`[data-action="subject-${subject}"]`);
        assert.ok(subjectButton, `subject-${subject} button exists`);
        subjectButton.click();
        assert.equal(modeTabs.hidden, true, `${singleMode} keeps modeTabs hidden after selecting ${subject}`);
        assert.equal(modeDesc.hidden, true, `${singleMode} keeps modeDescription hidden after selecting ${subject}`);
        assert.equal(modeSelect.hidden, subject === 'graph');
      }

      mounted.destroy();
      host.remove();
    }
  });
});

test('Scenario 2: modeDisplay === all remembers last selected mode across reopens while preserving recovered draft mode', async () => {
  let diskData: Record<string, unknown> = {};
  const store = new PluginSettingsStore({
    loadData: async () => diskData,
    saveData: async next => { diskData = structuredClone(next); },
  });
  await store.load();
  assert.equal(store.modeDisplay, 'all');
  assert.equal(store.preferredMode, 'visual');

  await withFakeDom(async doc => {
    const openSession = (draftMode?: EditorMode) => {
      const host = doc.createElement('div');
      doc.body.append(host);
      const initialMode = resolveInitialEditorMode(store.settings, draftMode);
      const mounted = mountEditor(asHtml(host), {
        latex: 'a+b',
        editing: true,
        initialMode,
        modeDisplay: store.modeDisplay,
        preferredMode: store.preferredMode,
        onModeDisplayChange: next => store.setModeDisplay(next),
        onPreferredModeChange: next => store.setPreferredMode(next),
        onSave: () => undefined,
        onCancel: () => undefined,
      });
      return { host, mounted };
    };

    // First session opens in default 'visual'; user clicks Hybrid tab.
    const first = openSession();
    const firstRoot = first.host.querySelector('[data-testid="visual-math-editor"]')!;
    assert.equal(firstRoot.dataset.mode, 'visual');
    assert.equal(first.host.querySelector('.vme-mode-tabs')!.hidden, false);

    first.host.querySelector('[data-action="mode-hybrid"]')!.click();
    assert.equal(firstRoot.dataset.mode, 'hybrid');
    assert.equal(store.preferredMode, 'hybrid');
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(diskData.preferredMode, 'hybrid');

    // Keyboard arrow navigation on tabs also updates preferredMode ('hybrid' -> ArrowLeft -> 'latex').
    const hybridTab = first.host.querySelector('[data-action="mode-hybrid"]')!;
    hybridTab.dispatchEvent(new FakeEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    assert.equal(firstRoot.dataset.mode, 'latex');
    assert.equal(store.preferredMode, 'latex');
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(diskData.preferredMode, 'latex');

    first.mounted.destroy();
    first.host.remove();

    // Second session (no draft) opens directly in remembered 'latex' mode!
    const second = openSession();
    assert.equal(second.host.querySelector('[data-testid="visual-math-editor"]')!.dataset.mode, 'latex');
    second.mounted.destroy();
    second.host.remove();

    // Recovering an unsaved draft with draft.mode === 'hybrid' prioritizes draft.mode over preferredMode ('latex').
    const recovered = openSession('hybrid');
    assert.equal(recovered.host.querySelector('[data-testid="visual-math-editor"]')!.dataset.mode, 'hybrid');
    recovered.mounted.destroy();
    recovered.host.remove();

    // Locking modeDisplay to 'visual' preserves preferredMode ('latex') in data.json for later 'all' restore.
    await store.setModeDisplay('visual');
    assert.equal(diskData.modeDisplay, 'visual');
    assert.equal(diskData.preferredMode, 'latex');
    await store.setModeDisplay('all');
    assert.equal(resolveInitialEditorMode(store.settings), 'latex');
  });
});

test('Scenario 3: Settings tab & header controls persist language + modeDisplay, preserve unknown keys, and live-sync open editors', async () => {
  let diskData: Record<string, unknown> = {
    existingCustomField: 'keep-me-intact',
    nestedConfig: { version: 1 },
  };

  const store = new PluginSettingsStore({
    loadData: async () => structuredClone(diskData),
    saveData: async next => { diskData = structuredClone(next); },
  });
  await store.load();

  await withFakeDom(async doc => {
    const host = doc.createElement('div');
    doc.body.append(host);
    const mounted = mountEditor(asHtml(host), {
      latex: '\\frac{1}{2}',
      editing: true,
      initialMode: resolveInitialEditorMode(store.settings),
      modeDisplay: store.modeDisplay,
      preferredMode: store.preferredMode,
      language: store.language,
      systemLanguage: 'zh-CN',
      onLanguageChange: lang => store.setLanguage(lang),
      onModeDisplayChange: md => store.setModeDisplay(md),
      onPreferredModeChange: pm => store.setPreferredMode(pm),
      onSave: () => undefined,
      onCancel: () => undefined,
    });

    const unsubscribe = store.subscribe((snapshot, kind) => {
      if (kind === 'language') mounted.setLanguage(snapshot.language);
      if (kind === 'modeDisplay') mounted.setModeDisplay(snapshot.modeDisplay);
      if (kind === 'preferredMode') mounted.setPreferredMode(snapshot.preferredMode);
    });

    // Render native Settings view adapter and inspect rendered rows & handlers.
    type RenderedRow = {
      name: string;
      desc: string;
      testId?: string;
      value: string;
      options: [string, string][];
      triggerChange: (val: string) => void;
    };
    let rows: RenderedRow[] = [];
    const renderSettingsTab = () => {
      const lang = resolveLanguage(store.language, 'zh-CN');
      renderPluginSettings({
        clear: () => { rows = []; },
        addDropdownSetting: ({ name, desc, setup }) => {
          const row: RenderedRow = { name, desc, value: '', options: [], triggerChange: () => undefined };
          setup({
            setTestId: id => { row.testId = id; },
            addOption: (v, label) => { row.options.push([v, label]); },
            setValue: v => { row.value = v; },
            onChange: handler => { row.triggerChange = handler; },
          });
          rows.push(row);
        },
      }, {
        settings: store.settings,
        translate: msg => translateUiText(msg, lang),
        onModeDisplayChange: md => { void store.setModeDisplay(md); renderSettingsTab(); },
        onPreferredModeChange: pm => { void store.setPreferredMode(pm); renderSettingsTab(); },
        onLanguageChange: nextLang => { void store.setLanguage(nextLang); renderSettingsTab(); },
      });
    };

    renderSettingsTab();
    assert.deepEqual(rows.map(r => r.testId), ['setting-mode-display', 'setting-preferred-mode', 'setting-language']);

    // Edit draft in open editor first so we verify live settings sync never drops draft edits!
    const sourceInput = host.querySelector('[data-testid="latex-source"]')!;
    sourceInput.value = '\\frac{1}{2}+x';
    sourceInput.dispatchEvent(new FakeEvent('input', { bubbles: true }));
    assert.equal(mounted.getDraft().latex, '\\frac{1}{2}+x');

    // Change language in Settings to English ('en'): open editor + Settings tab translate live, draft preserved!
    rows.find(r => r.testId === 'setting-language')!.triggerChange('en');
    await Promise.resolve();
    assert.equal(rows[0].name, 'Editor mode display');
    assert.equal(host.querySelector('[data-testid="interface-language"]')!.value, 'en');
    assert.equal(host.querySelector('[data-action="save"]')!.textContent, 'Save changes');
    assert.equal(
      host.querySelector('[data-testid="mode-display-select"]')!.options.map(o => o.textContent).join(' | '),
      'All modes | Visual only | Hybrid only | LaTeX only',
    );
    assert.equal(mounted.getDraft().latex, '\\frac{1}{2}+x');

    // Change language in Settings to Spanish ('es'):
    rows.find(r => r.testId === 'setting-language')!.triggerChange('es');
    await Promise.resolve();
    assert.equal(rows[0].name, 'Visualización de modos del editor');
    assert.equal(host.querySelector('[data-action="save"]')!.textContent, 'Guardar cambios');
    assert.equal(mounted.getDraft().latex, '\\frac{1}{2}+x');

    // Change Default mode in Settings while 'all' is active -> open editor switches to 'hybrid' live!
    rows.find(r => r.testId === 'setting-preferred-mode')!.triggerChange('hybrid');
    await Promise.resolve();
    assert.equal(host.querySelector('[data-testid="visual-math-editor"]')!.dataset.mode, 'hybrid');
    assert.equal(mounted.getDraft().latex, '\\frac{1}{2}+x');

    // Change modeDisplay in Settings to 'visual' -> Default mode row hides in Settings AND open editor hides modeTabs!
    rows.find(r => r.testId === 'setting-mode-display')!.triggerChange('visual');
    await Promise.resolve();
    assert.deepEqual(rows.map(r => r.testId), ['setting-mode-display', 'setting-language']);
    assert.equal(host.querySelector('.vme-mode-tabs')!.hidden, true);
    assert.equal(host.querySelector('.vme-mode-description')!.hidden, true);
    assert.equal(host.querySelector('[data-testid="mode-display-select"]')!.value, 'visual');
    assert.equal(mounted.getDraft().latex, '\\frac{1}{2}+x');

    // Change modeDisplay from the compact header dropdown inside the editor -> Settings + disk update too!
    const headerModeSelect = host.querySelector('[data-testid="mode-display-select"]')!;
    headerModeSelect.value = 'latex';
    headerModeSelect.dispatchEvent(new FakeEvent('change', { bubbles: true }));
    renderSettingsTab();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(store.modeDisplay, 'latex');
    assert.equal(rows.find(r => r.testId === 'setting-mode-display')!.value, 'latex');

    // Simulate restarting Obsidian with a brand-new PluginSettingsStore reading persisted `diskData`:
    const reloadedStore = new PluginSettingsStore({
      loadData: async () => structuredClone(diskData),
      saveData: async next => { diskData = structuredClone(next); },
    });
    await reloadedStore.load();
    assert.equal(reloadedStore.language, 'es');
    assert.equal(reloadedStore.modeDisplay, 'latex');
    assert.equal(reloadedStore.preferredMode, 'hybrid');
    assert.equal(diskData.existingCustomField, 'keep-me-intact');
    assert.deepEqual(diskData.nestedConfig, { version: 1 });

    unsubscribe();
    mounted.destroy();
    host.remove();
  });
});

test('Scenario 4: Visual-only mode provides safe temporary source fallback for unsupported or >4096-char formulas without mutating modeDisplay', async () => {
  let diskData: Record<string, unknown> = { modeDisplay: 'visual', preferredMode: 'visual', language: 'en' };
  const store = new PluginSettingsStore({
    loadData: async () => structuredClone(diskData),
    saveData: async next => { diskData = structuredClone(next); },
  });
  await store.load();

  await withFakeDom(async doc => {
    const cases: { label: string; latex: string }[] = [
      { label: 'unknown macro', latex: String.raw`\customMacro{x+1}` },
      { label: 'over 4096 chars', latex: Array.from({ length: 1050 }, () => 'x+1+').join('') + 'x' },
    ];

    for (const item of cases) {
      assert.ok(item.label === 'unknown macro' || item.latex.length > 4096);
      const host = doc.createElement('div');
      doc.body.append(host);
      let savedLatex = '';
      const mounted = mountEditor(asHtml(host), {
        latex: item.latex,
        editing: true,
        initialMode: resolveInitialEditorMode(store.settings),
        modeDisplay: store.modeDisplay,
        preferredMode: store.preferredMode,
        language: store.language,
        onModeDisplayChange: md => store.setModeDisplay(md),
        onPreferredModeChange: pm => store.setPreferredMode(pm),
        onSave: value => { savedLatex = value; },
        onCancel: () => undefined,
      });

      await new Promise(resolve => setTimeout(resolve, 45));

      const modeTabs = host.querySelector('.vme-mode-tabs')!;
      const blockedMsg = host.querySelector('.vme-unsupported-message')!;
      const statusMsg = host.querySelector('[data-testid="validation-message"]')!;
      const fallbackBtn = host.querySelector('[data-testid="temporary-source-fallback"]')!;
      const saveBtn = host.querySelector('[data-action="save"]')!;

      // Tabs stay hidden; messages never instruct clicking hidden Hybrid / LaTeX tabs; focus lands on fallback button!
      assert.equal(modeTabs.hidden, true, `${item.label}: modeTabs stays hidden`);
      assert.equal(fallbackBtn.hidden, false, `${item.label}: fallback button visible`);
      assert.equal(doc.activeElement, fallbackBtn, `${item.label}: focus lands on visible fallback button, never hidden tab`);
      assert.doesNotMatch(blockedMsg.textContent, /Hybrid/, `${item.label}: blocked message does not reference hidden tabs`);
      assert.doesNotMatch(statusMsg.textContent, /Hybrid/, `${item.label}: status message does not reference hidden tabs`);
      assert.equal(saveBtn.disabled, true, `${item.label}: save disabled before reviewing source`);

      // Clicking "View in LaTeX source" opens temporary Hybrid mode ONLY for this session:
      fallbackBtn.click();
      const root = host.querySelector('[data-testid="visual-math-editor"]')!;
      const sourceInput = host.querySelector('[data-testid="latex-source"]')!;
      assert.equal(root.dataset.mode, 'hybrid', `${item.label}: enters temporary hybrid mode`);
      assert.equal(host.querySelector('.vme-source-pane')!.hidden, false);
      assert.equal(sourceInput.value, item.latex, `${item.label}: full formula source preserved`);
      assert.equal(saveBtn.disabled, false, `${item.label}: can now save source`);

      // Edit source slightly and save; verify persisted modeDisplay in store & diskData is STILL 'visual'!
      sourceInput.value = `${item.latex}+1`;
      sourceInput.dispatchEvent(new FakeEvent('input', { bubbles: true }));
      saveBtn.click();
      await Promise.resolve();
      assert.equal(savedLatex, `${item.latex}+1`);
      assert.equal(store.modeDisplay, 'visual', `${item.label}: store.modeDisplay remains 'visual'`);
      assert.equal(diskData.modeDisplay, 'visual', `${item.label}: persisted data.json modeDisplay remains 'visual'`);

      mounted.destroy();
      host.remove();

      // Next session still opens locked in 'visual' mode!
      const nextHost = doc.createElement('div');
      doc.body.append(nextHost);
      const nextMounted = mountEditor(asHtml(nextHost), {
        latex: 'x+1',
        editing: true,
        initialMode: resolveInitialEditorMode(store.settings),
        modeDisplay: store.modeDisplay,
        preferredMode: store.preferredMode,
        language: store.language,
        onSave: () => undefined,
        onCancel: () => undefined,
      });
      assert.equal(nextHost.querySelector('[data-testid="visual-math-editor"]')!.dataset.mode, 'visual');
      assert.equal(nextHost.querySelector('.vme-mode-tabs')!.hidden, true);
      nextMounted.destroy();
      nextHost.remove();
    }
  });
});

test('Scenario 5: UI decluttering, mutual-exclusion secondary pills, keyboard flow (Enter / Ctrl+Enter / layered Escape), and 6-language support', async () => {
  await withFakeDom(async doc => {
    const host = doc.createElement('div');
    doc.body.append(host);
    let cancelCount = 0;
    const mounted = mountEditor(asHtml(host), {
      latex: 'x^2+1',
      editing: true,
      language: 'ja',
      onLanguageChange: () => undefined,
      onSave: () => undefined,
      onCancel: () => { cancelCount++; },
    });

    await new Promise(resolve => setTimeout(resolve, 45));

    const root = host.querySelector('[data-testid="visual-math-editor"]')!;
    const heading = host.querySelector('.vme-heading')!;
    const workspace = host.querySelector('.vme-workspace')!;
    const equationGraph = host.querySelector('[data-testid="equation-graph"]')!;
    const prevHole = host.querySelector('[data-action="previous-placeholder"]')!;
    const nextHole = host.querySelector('[data-action="next-placeholder"]')!;
    const langSelect = host.querySelector('[data-testid="interface-language"]')!;

    // 1. No permanent .vme-local-badge in .vme-heading; .vme-equation-graph stays visible below workspace
    assert.equal(heading.querySelector('.vme-local-badge'), null);
    assert.equal(workspace.hidden, false);
    assert.equal(equationGraph.hidden, false);

    // 2. All 7 language choices (system + 6 languages) exist in the language selector
    const langOptionValues = langSelect.querySelectorAll('option').map(o => o.value);
    assert.deepEqual(langOptionValues, ['system', 'zh', 'en', 'es', 'ja', 'de', 'fr']);

    // 3. Placeholder navigation buttons auto-hide when formula has no incomplete slots, and show when slots exist
    assert.equal(prevHole.hidden, true);
    assert.equal(nextHole.hidden, true);
    host.querySelector('[data-action="fraction"]')!.click();
    assert.equal(prevHole.hidden, false);
    assert.equal(nextHole.hidden, false);
    host.querySelector('[data-action="clear"]')!.click();

    // 4. Secondary pill mutual exclusion + dead-zone collapse + keyboard flow (Enter, Ctrl+Enter, layered Escape)
    const matrixToggle = host.querySelector('[data-action="matrix-toggle"]')!;
    const systemToggle = host.querySelector('[data-action="system-toggle"]')!;
    const importOpen = host.querySelector('[data-action="import-open"]')!;
    const symbolsDrawer = host.querySelector('.vme-secondary-tools details.vme-advanced-math')!;

    // Open symbols drawer, then click Matrix -> symbols drawer closes, workspace & unexpanded equationGraph collapse
    symbolsDrawer.open = true;
    symbolsDrawer.dispatchEvent(new FakeEvent('toggle'));
    assert.equal(symbolsDrawer.open, true);

    matrixToggle.click();
    assert.equal(symbolsDrawer.open, false, 'opening Matrix closes open <details> drawer');
    assert.equal(host.querySelector('[data-testid="matrix-panel"]')!.hidden, false);
    assert.equal(workspace.hidden, true, 'workspace collapses while Matrix sub-panel is open');
    assert.equal(equationGraph.hidden, true, 'unexpanded equationGraph collapses while Matrix sub-panel is open');

    // Switch directly to System -> Matrix closes automatically
    systemToggle.click();
    assert.equal(host.querySelector('[data-testid="matrix-panel"]')!.hidden, true, 'opening System closes Matrix');
    assert.equal(host.querySelector('[data-testid="system-panel"]')!.hidden, false);
    assert.equal(workspace.hidden, true);

    // Switch directly to Import -> System closes automatically
    importOpen.click();
    assert.equal(host.querySelector('[data-testid="system-panel"]')!.hidden, true, 'opening Import closes System');
    assert.equal(host.querySelector('[data-testid="formula-import-panel"]')!.hidden, false);

    // Layered Escape: first Escape closes Import without cancelling the editor
    const esc1 = new FakeEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    root.dispatchEvent(esc1);
    assert.equal(host.querySelector('[data-testid="formula-import-panel"]')!.hidden, true, 'first Escape closes Import');
    assert.equal(workspace.hidden, false, 'workspace restores when sub-panel closes');
    assert.equal(equationGraph.hidden, false, 'equationGraph restores when sub-panel closes');
    assert.equal(cancelCount, 0, 'editor stays open after closing sub-panel with Escape');

    // Open Matrix, press Enter in cell (1,1) to jump to (1,2), fill cells, and press Ctrl+Enter to apply Matrix
    matrixToggle.click();
    const cell11 = host.querySelector('[data-testid="matrix-cell-1-1"]')!;
    const cell12 = host.querySelector('[data-testid="matrix-cell-1-2"]')!;
    cell11.focus();
    cell11.dispatchEvent(new FakeEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    assert.equal(doc.activeElement, cell12, 'Enter in Matrix cell jumps focus to next cell');

    host.querySelector('[data-action="matrix-fill-zero"]')!.click();
    const ctrlEnter = new FakeEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true });
    root.dispatchEvent(ctrlEnter);
    assert.equal(host.querySelector('[data-testid="matrix-panel"]')!.hidden, true, 'Ctrl+Enter applies and closes Matrix');
    assert.match(mounted.getDraft().latex, /\\begin\{bmatrix\}/);

    // Second Escape when all drawers/sub-panels are closed exits the editor
    const esc2 = new FakeEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    root.dispatchEvent(esc2);
    assert.equal(cancelCount, 1, 'Escape when no sub-panel is open exits the editor');

    mounted.destroy();
    host.remove();
  });
});
