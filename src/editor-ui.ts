import { validateLatex, type MathfieldElement } from 'mathlive';
import { hasIncompleteSlots } from './validation';
import { validateLatexSource } from './source-validation';
import { mountScienceTools, type ScienceDraft } from './science-ui';
import { localizeEditor, type Language } from './i18n';
import { mountPlotTools, type PlotDraft } from './plot-ui';
import { expressionFromLatex } from './plot-latex';
import type { PlotSpec } from './plot-engine';
import { createHtml, createSvgElement } from './dom';
import { mountShortcutTools } from './shortcuts-ui';

export type EditorMode = 'visual' | 'latex' | 'hybrid';

export interface EditorDraft { latex: string; display: boolean; mode: EditorMode; science?: ScienceDraft; plot?: PlotDraft }

export interface EditorOptions {
  latex?: string;
  display?: boolean;
  editing?: boolean;
  initialMode?: EditorMode;
  compact?: boolean;
  language?: Language;
  systemLanguage?: string;
  scienceDraft?: ScienceDraft;
  plotDraft?: PlotDraft;
  graphOnly?: boolean;
  shortcuts?: Record<string, string>;
  onShortcutsChange?: (shortcuts: Record<string, string>, baseline: Record<string, string>) => Record<string, string> | void | Promise<Record<string, string> | void>;
  onSaveGraph?: (spec: PlotSpec, latex: string, display: boolean) => void | Promise<void>;
  onLanguageChange?: (language: Language) => void | Promise<void>;
  onSave: (latex: string, display: boolean) => void | Promise<void>;
  onCancel: () => void;
}

type Structure = {
  id: string;
  label: string;
  symbol: string;
  template: (selected: boolean, hasPrevious: boolean) => string;
};

const structures: Structure[] = [
  { id: 'fraction', label: '分数', symbol: 'a⁄b', template: (selected) => `\\frac{${selected ? '#0' : '#?'}}{#?}` },
  { id: 'sqrt', label: '平方根', symbol: '√x', template: (selected) => `\\sqrt{${selected ? '#0' : '#?'}}` },
  { id: 'nth-root', label: 'n 次根', symbol: 'ⁿ√x', template: (selected) => `\\sqrt[#?]{${selected ? '#0' : '#?'}}` },
  { id: 'superscript', label: '上标', symbol: 'xⁿ', template: (selected, hasPrevious) => `${selected ? '#0' : hasPrevious ? '' : '#?'}^{#?}` },
  { id: 'subscript', label: '下标', symbol: 'xₙ', template: (selected, hasPrevious) => `${selected ? '#0' : hasPrevious ? '' : '#?'}_{#?}` },
  { id: 'integral', label: '积分', symbol: '∫', template: (selected) => `\\int_{#?}^{#?}${selected ? '#0' : '#?'}\\,\\mathrm{d}#?` },
  { id: 'sum', label: '求和', symbol: '∑', template: (selected) => `\\sum_{#?}^{#?}${selected ? '#0' : '#?'}` },
  { id: 'parentheses', label: '括号', symbol: '(x)', template: (selected) => `\\left(${selected ? '#0' : '#?'}\\right)` },
];

const symbols = [
  ['alpha', 'α', '阿尔法', '\\alpha'],
  ['beta', 'β', '贝塔', '\\beta'],
  ['theta', 'θ', '西塔', '\\theta'],
  ['pi', 'π', '圆周率', '\\pi'],
  ['delta', 'Δ', '德尔塔', '\\Delta'],
  ['infinity', '∞', '无穷大', '\\infty'],
  ['plus-minus', '±', '正负号', '\\pm'],
  ['times', '×', '乘号', '\\times'],
  ['divide', '÷', '除号', '\\div'],
  ['not-equal', '≠', '不等于', '\\ne'],
  ['less-equal', '≤', '小于或等于', '\\le'],
  ['greater-equal', '≥', '大于或等于', '\\ge'],
] as const;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const element = createHtml(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function button(label: string, className: string, testId: string, action: () => void): HTMLButtonElement {
  const element = el('button', className, label);
  element.type = 'button';
  element.dataset.action = testId;
  element.addEventListener('click', action);
  return element;
}

/** Small fixed-layout icons: ordinary Unicode fractions overlap in some host fonts. */
function structureGlyph(id: string): HTMLElement {
  const glyph = el('span', `vme-structure-glyph vme-glyph-${id}`);
  glyph.setAttribute('aria-hidden', 'true');
  const variable = (text: string) => el('span', 'vme-glyph-variable', text);
  if (id === 'fraction') {
    glyph.append(variable('a'), el('span', 'vme-glyph-fraction-bar'), variable('b'));
  } else if (id === 'sqrt' || id === 'nth-root') {
    // Draw the radical and its overbar as one path. A font √ beside a CSS
    // border creates a broken or doubled bar in some Obsidian themes/fonts.
    const radical = createSvgElement('svg');
    radical.setAttribute('viewBox', '0 0 38 29');
    radical.setAttribute('class', 'vme-glyph-radical');
    radical.setAttribute('focusable', 'false');
    const path = createSvgElement('path');
    path.setAttribute('d', 'M 2 16 L 6 14 L 12 25 L 18 4 H 36');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('stroke-linejoin', 'miter');
    path.setAttribute('stroke-linecap', 'square');
    radical.append(path);
    glyph.append(radical, el('span', 'vme-glyph-radicand', 'x'));
    if (id === 'nth-root') glyph.append(el('span', 'vme-glyph-root-index', 'n'));
  } else if (id === 'superscript' || id === 'subscript') {
    glyph.append(variable('x'), el('span', 'vme-glyph-script', 'n'));
  } else if (id === 'integral' || id === 'sum') {
    const limits = el('span', 'vme-glyph-limits');
    limits.append(el('span', '', 'n'), el('span', '', '1'));
    glyph.append(el('span', 'vme-glyph-large', id === 'integral' ? '∫' : '∑'), limits);
  } else glyph.append(el('span', '', '('), variable('x'), el('span', '', ')'));
  return glyph;
}

/** The caller owns the host dialog/inline panel, local assets, and the commit transaction. */
export function mountEditor(container: HTMLElement, options: EditorOptions): {
  destroy: () => void;
  field: MathfieldElement;
  getDraft: () => EditorDraft;
} {
  const root = el('div', options.compact ? 'vme-editor vme-compact' : 'vme-editor');
  root.dataset.testid = 'visual-math-editor';
  const instanceId = `vme-${Math.random().toString(36).slice(2)}`;
  let display = options.display ?? true;
  let mode: EditorMode = options.initialMode ?? 'visual';
  let rawSource = options.latex ?? '';
  let syncing = false;
  let destroyed = false;
  let saving = false;
  let visualBlocked = false;
  let sourceIssue: string | null = null;
  let unsupported = false;
  let incomplete = false;
  let parserIssue: string | null = null;
  let graphSelected = false;
  let equationGraphOpen = Boolean(!options.graphOnly && options.plotDraft?.equationLinked);

  const heading = el('div', 'vme-heading');
  const headingCopy = el('div', 'vme-heading-copy');
  const eyebrow = el('div', 'vme-eyebrow', options.editing ? '编辑公式' : '插入公式');
  const title = el('h2', 'vme-title', 'Visual Math');
  title.id = `${instanceId}-title`;
  const subtitle = el('p', 'vme-subtitle', '选择熟悉的方式，写下你的公式。');
  headingCopy.append(eyebrow, title, subtitle);
  const localBadge = el('span', 'vme-local-badge', '本地离线');
  localBadge.title = '公式在本机编辑，无需账号或网络';
  const language = el('select', 'vme-language-select');
  language.dataset.testid = 'interface-language';
  language.setAttribute('aria-label', '界面语言');
  for (const [value, label] of [['system', '跟随 Obsidian'], ['zh', '中文'], ['en', 'English'], ['es', 'Español']] as const) {
    const option = el('option', '', label);
    option.value = value;
    language.append(option);
  }
  language.value = options.language ?? 'system';
  heading.append(headingCopy, localBadge, language);

  const modeTabs = el('div', 'vme-mode-tabs');
  modeTabs.setAttribute('role', 'tablist');
  modeTabs.setAttribute('aria-label', '公式编辑模式');
  const modeButtons = new Map<EditorMode, HTMLButtonElement>();
  for (const [value, label, description] of [
    ['visual', 'Visual', '直接编辑排版后的公式'],
    ['latex', 'LaTeX', '编辑公式源码'],
    ['hybrid', 'Hybrid', '源码与可视化双向同步'],
  ] as const) {
    const tab = button(label, 'vme-mode-tab', `mode-${value}`, () => setMode(value, true));
    tab.id = `${instanceId}-tab-${value}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `${instanceId}-workspace`);
    tab.title = description;
    tab.addEventListener('keydown', (event) => {
      const ordered: EditorMode[] = ['visual', 'latex', 'hybrid'];
      const position = ordered.indexOf(value);
      let target: EditorMode | undefined;
      if (event.key === 'ArrowRight') target = ordered[(position + 1) % ordered.length];
      if (event.key === 'ArrowLeft') target = ordered[(position + ordered.length - 1) % ordered.length];
      if (event.key === 'Home') target = ordered[0];
      if (event.key === 'End') target = ordered[ordered.length - 1];
      if (target) {
        event.preventDefault();
        setMode(target);
        modeButtons.get(target)?.focus();
      }
    });
    modeButtons.set(value, tab);
    modeTabs.append(tab);
  }
  const modeDescription = el('p', 'vme-mode-description');

  const toolbar = el('div', 'vme-toolbar');
  toolbar.setAttribute('role', 'group');
  toolbar.setAttribute('aria-label', '公式结构');
  const toolbarLabel = el('div', 'vme-section-label', '选择结构');
  const structureGrid = el('div', 'vme-structure-grid');

  // Use the registered element so this plugin can coexist with another MathLive user.
  const field = createHtml('math-field', container.ownerDocument);
  field.className = 'vme-mathfield';
  field.id = `${instanceId}-field`;
  field.dataset.testid = 'equation-field';
  field.setAttribute('aria-label', '可视化数学公式编辑区');
  field.setAttribute('aria-describedby', `${instanceId}-hint ${instanceId}-error`);
  field.setAttribute('math-virtual-keyboard-policy', 'manual');
  field.setAttribute('default-mode', 'math');
  field.setAttribute('smart-mode', 'false');
  field.setAttribute('popover-policy', 'off');
  field.tabIndex = 0;
  const fieldBox = el('div', 'vme-field-box');
  const blockedMessage = el('p', 'vme-unsupported-message');
  blockedMessage.hidden = true;
  fieldBox.append(field, blockedMessage);

  const status = el('p', 'vme-error');
  status.id = `${instanceId}-error`;
  status.dataset.testid = 'validation-message';
  status.setAttribute('role', 'alert');
  status.hidden = true;

  const sourcePane = el('div', 'vme-source-pane');
  const sourceTop = el('div', 'vme-canvas-top');
  const sourceLabel = el('label', 'vme-section-label', 'LaTeX 源码');
  const source = el('textarea', 'vme-source');
  source.id = `${instanceId}-source`;
  source.dataset.testid = 'latex-source';
  source.setAttribute('aria-label', 'LaTeX 公式源码');
  source.setAttribute('aria-describedby', `${instanceId}-source-hint ${instanceId}-error`);
  source.setAttribute('autocapitalize', 'off');
  source.setAttribute('autocomplete', 'off');
  source.setAttribute('autocorrect', 'off');
  source.spellcheck = false;
  source.wrap = 'off';
  source.rows = options.compact ? 4 : 6;
  source.value = rawSource;
  sourceLabel.htmlFor = source.id;
  sourceTop.append(sourceLabel);
  const sourceHint = el('p', 'vme-hint vme-source-hint', '只输入公式内容，不需要外层 $ 或 $$。');
  sourceHint.id = `${instanceId}-source-hint`;
  sourcePane.append(sourceTop, source, sourceHint);

  function showError(message: string, warning = false): void {
    status.textContent = message;
    status.hidden = !message;
    status.dataset.severity = warning ? 'warning' : 'error';
    const invalid = message && !warning ? 'true' : 'false';
    source.setAttribute('aria-invalid', invalid);
    field.setAttribute('aria-invalid', invalid);
  }

  function insert(template: string): void {
    if (saving || visualBlocked) return;
    try {
      validateLatex(template.replace(/#\?/g, '\\placeholder{}').replace(/#0/g, 'x'));
      field.insert(template, { format: 'latex', mode: 'math', selectionMode: 'placeholder', focus: true, feedback: false });
      parserIssue = null;
      syncFromVisual();
    } catch {
      showError('这段内容暂时无法插入，请检查化学式、单位或公式写法。原公式已保留。');
    }
  }

  for (const structure of structures) {
    const tool = button('', 'vme-structure-button', structure.id, () => {
      insert(structure.template(!field.selectionIsCollapsed, field.position > 0));
    });
    tool.setAttribute('aria-label', `插入${structure.label}`);
    tool.title = `插入${structure.label}；选中内容后可套用结构`;
    const glyph = structureGlyph(structure.id);
    tool.append(glyph, el('span', 'vme-structure-name', structure.label));
    tool.addEventListener('pointerdown', (event) => event.preventDefault());
    structureGrid.append(tool);
  }
  toolbar.append(toolbarLabel, structureGrid);

  const symbolBar = el('div', 'vme-symbol-bar');
  symbolBar.append(el('span', 'vme-symbol-label', '常用符号'));
  const symbolGroup = el('div', 'vme-symbol-group');
  symbolGroup.setAttribute('role', 'group');
  symbolGroup.setAttribute('aria-label', '希腊字母和运算符');
  for (const [id, symbol, label, latex] of symbols) {
    const tool = button(symbol, 'vme-symbol-button', id, () => insert(`${latex} `));
    tool.title = label;
    tool.setAttribute('aria-label', `插入${label} ${symbol}`);
    tool.addEventListener('pointerdown', (event) => event.preventDefault());
    symbolGroup.append(tool);
  }
  symbolBar.append(symbolGroup);

  const canvasTop = el('div', 'vme-canvas-top');
  const canvasLabel = el('label', 'vme-section-label', '你的公式');
  canvasLabel.htmlFor = field.id;
  const history = el('div', 'vme-history');
  history.setAttribute('role', 'group');
  history.setAttribute('aria-label', '编辑历史');
  const undo = button('↶', 'vme-icon-button', 'undo', () => {
    field.executeCommand('undo');
    field.focus();
    syncFromVisual();
  });
  undo.setAttribute('aria-label', '撤销');
  undo.title = '撤销';
  const redo = button('↷', 'vme-icon-button', 'redo', () => {
    field.executeCommand('redo');
    field.focus();
    syncFromVisual();
  });
  redo.setAttribute('aria-label', '重做');
  redo.title = '重做';
  const clear = button('清空', 'vme-clear-button', 'clear', () => {
    if (saving || visualBlocked) return;
    // Replacing a selection records the empty result as well as the prior value;
    // MathLive's deleteAll command only snapshots before deletion (no Redo).
    field.executeCommand('selectAll');
    field.insert('', { format: 'latex', mode: 'math', selectionMode: 'after', feedback: false });
    parserIssue = null;
    visualBlocked = false;
    source.value = '';
    rawSource = '';
    lastVisualSerialized = field.getValue('latex');
    initialSourceUntouched = false;
    renderSourceState();
    if (mode === 'latex') source.focus();
    else field.focus();
  });
  clear.title = '清空当前公式；可用撤销恢复';
  clear.setAttribute('aria-label', '清空当前公式');
  undo.addEventListener('pointerdown', (event) => event.preventDefault());
  redo.addEventListener('pointerdown', (event) => event.preventDefault());
  clear.addEventListener('pointerdown', (event) => event.preventDefault());
  history.append(undo, redo, clear);
  canvasTop.append(canvasLabel, history);

  const quickOperators = el('div', 'vme-quick-operators');
  quickOperators.setAttribute('role', 'group');
  quickOperators.setAttribute('aria-label', '常用运算与间距');
  const operatorButtons: HTMLButtonElement[] = [];
  for (const [id, glyph, label, latex] of [
    ['operator-plus', '+', '加号', '+'], ['operator-minus', '−', '减号', '-'],
    ['operator-equals', '=', '等号', '='], ['operator-space', '间距', '薄空格', '\\,'],
  ]) {
    const tool = button(glyph, 'vme-operator-button', id, () => insert(latex));
    tool.title = `插入${label}`;
    tool.setAttribute('aria-label', `插入${label}`);
    tool.addEventListener('pointerdown', (event) => event.preventDefault());
    operatorButtons.push(tool);
    quickOperators.append(tool);
  }
  canvasTop.insertBefore(quickOperators, history);

  const navigation = el('div', 'vme-navigation');
  const hint = el('p', 'vme-hint', '点击方框填写；用 Tab 或方向键移动。');
  hint.id = `${instanceId}-hint`;
  const holeNavigation = el('div', 'vme-hole-navigation');
  const previous = button('← 上一空格', 'vme-text-button', 'previous-placeholder', () => {
    field.executeCommand('moveToPreviousPlaceholder');
    field.focus();
  });
  const next = button('下一空格 →', 'vme-text-button', 'next-placeholder', () => {
    field.executeCommand('moveToNextPlaceholder');
    field.focus();
  });
  const jumpEnd = button('公式末尾 →', 'vme-text-button', 'jump-end', () => {
    field.executeCommand('moveToMathfieldEnd');
    field.focus();
  });
  jumpEnd.title = '跳到整条公式的末尾，继续输入';
  previous.setAttribute('aria-label', '跳到上一个待填写的方框');
  next.setAttribute('aria-label', '跳到下一个待填写的方框');
  previous.addEventListener('pointerdown', (event) => event.preventDefault());
  next.addEventListener('pointerdown', (event) => event.preventDefault());
  jumpEnd.addEventListener('pointerdown', (event) => event.preventDefault());
  holeNavigation.append(previous, next, jumpEnd);
  navigation.append(hint, holeNavigation);
  const visualPane = el('div', 'vme-visual-pane');
  visualPane.append(canvasTop, fieldBox, navigation);
  const workspace = el('div', 'vme-workspace');
  workspace.id = `${instanceId}-workspace`;
  workspace.setAttribute('role', 'tabpanel');
  workspace.append(sourcePane, visualPane);

  const equationGraph = el('section', 'vme-equation-graph');
  const shortcutsHost = el('div', 'vme-shortcuts-host');
  shortcutsHost.hidden = Boolean(options.graphOnly);
  equationGraph.dataset.testid = 'equation-graph';
  const equationGraphToggle = button('', 'vme-science-button vme-equation-graph-toggle', 'graph-equation', () => {
    if (saving || options.graphOnly) return;
    equationGraphOpen = !equationGraphOpen;
    equationGraphHost.hidden = !equationGraphOpen;
    if (equationGraphOpen) equationGraphHost.append(plotHost);
    plotTools.setEquationLinked(equationGraphOpen);
    updateEquationGraphToggle();
  });
  const equationGraphCaption = el('span');
  equationGraphToggle.append(equationGraphCaption);
  const equationGraphHost = el('div', 'vme-equation-graph-content');
  equationGraphHost.id = `${instanceId}-equation-graph`;
  equationGraphHost.hidden = !equationGraphOpen;
  equationGraphToggle.setAttribute('aria-controls', equationGraphHost.id);
  equationGraph.append(equationGraphToggle, equationGraphHost);
  equationGraph.hidden = Boolean(options.graphOnly);

  function updateEquationGraphToggle(): void {
    equationGraphCaption.textContent = equationGraphOpen ? '隐藏图像' : '绘制此公式';
    equationGraphCaption.dataset.i18nEn = equationGraphOpen ? 'Hide graph' : 'Graph this equation';
    equationGraphToggle.setAttribute('aria-expanded', String(equationGraphOpen));
  }
  updateEquationGraphToggle();

  const layout = el('div', 'vme-layout-row');
  const layoutLabel = el('span', 'vme-section-label', '在笔记中的显示方式');
  const layoutOptions = el('div', 'vme-layout-options');
  layoutOptions.setAttribute('role', 'group');
  layoutOptions.setAttribute('aria-label', '公式显示方式');
  const inlineButton = button('行内公式', 'vme-layout-button', 'inline', () => setDisplay(false));
  const displayButton = button('独立一行', 'vme-layout-button', 'display', () => setDisplay(true));
  layoutOptions.append(inlineButton, displayButton);
  layout.append(layoutLabel, layoutOptions);

  function setDisplay(value: boolean): void {
    display = value;
    inlineButton.setAttribute('aria-pressed', String(!display));
    displayButton.setAttribute('aria-pressed', String(display));
    fieldBox.dataset.display = String(display);
  }

  const footer = el('div', 'vme-footer');
  const footerNote = el('p', 'vme-footer-note', '点击保存后，才会更新笔记。');
  const actions = el('div', 'vme-actions');
  const cancel = button('取消', 'vme-cancel-button', 'cancel', () => { if (!saving) options.onCancel(); });
  const save = button('', 'vme-save-button', 'save', () => void saveEquation());
  actions.append(cancel, save);
  footer.append(footerNote, actions);
  const subjectTools = el('div', 'vme-subject-tools');
  root.append(heading, modeTabs, modeDescription, subjectTools, workspace, shortcutsHost, equationGraph, status, layout);
  if (options.compact) heading.append(footer);
  else root.append(footer);
  container.append(root);

  const plotHost = el('div');
  const advancedPlotHost = el('div');
  advancedPlotHost.append(plotHost);
  const plotTools = mountPlotTools(plotHost, {
    initialDraft: options.plotDraft,
    editing: options.graphOnly,
    getCurrentExpression: options.graphOnly ? undefined : () => expressionFromLatex(rawSource),
    onInsertGraph: options.onSaveGraph ? async spec => {
      if (saving || destroyed) return;
      if (!options.graphOnly && mode !== 'latex' && !visualBlocked) syncFromVisual();
      if (!options.graphOnly && rawSource.trim() && (sourceIssue || incomplete || unsupported)) {
        throw new Error('Finish or clear the current equation before inserting a graph.');
      }
      if (equationGraphOpen && expressionFromLatex(rawSource) !== spec.expression) {
        throw new Error('The equation changed. Preview the graph again.');
      }
      saving = true;
      root.setAttribute('aria-busy', 'true');
      updateControls();
      try { await options.onSaveGraph!(spec, rawSource, display); }
      finally {
        saving = false;
        if (!destroyed) { root.removeAttribute('aria-busy'); updateControls(); }
      }
    } : undefined,
  });
  const combinedSaveNote = el('p', 'vme-plot-note', options.graphOnly ? '修改只在保存图像后写入笔记。' : '插入图像时，也会保存当前已完成的公式草稿。');
  combinedSaveNote.dataset.i18nEn = options.graphOnly ? 'Changes reach the note only when you save the graph.' : 'Inserting a graph also saves your current completed equation draft.';
  plotHost.querySelector('.vme-plot-actions')?.before(combinedSaveNote);
  const scienceTools = mountScienceTools(subjectTools, {
    initialDraft: options.scienceDraft,
    plotTools: [advancedPlotHost],
    graphOnly: options.graphOnly,
    onSubjectChange: subject => {
      graphSelected = subject === 'graph';
      root.dataset.subject = subject;
      workspace.hidden = layout.hidden = modeTabs.hidden = modeDescription.hidden = save.hidden = graphSelected;
      equationGraph.hidden = graphSelected || Boolean(options.graphOnly);
      shortcutsHost.hidden = graphSelected || Boolean(options.graphOnly);
      if (graphSelected) {
        equationGraphOpen = false;
        equationGraphHost.hidden = true;
        advancedPlotHost.append(plotHost);
        plotTools.setEquationLinked(false);
        updateEquationGraphToggle();
      }
      status.hidden = graphSelected || !status.textContent;
    },
    mathTools: [toolbar, symbolBar],
    initialLatex: rawSource,
    getCurrentLatex: () => rawSource,
    onInsertLatex: insert,
    onReplaceLatex: (latex) => {
      if (saving) return;
      try {
        validateLatex(latex);
        field.readOnly = false;
        field.executeCommand('selectAll');
        field.insert(latex, { format: 'latex', mode: 'math', selectionMode: 'after', focus: true, feedback: false });
        parserIssue = null;
        visualBlocked = false;
        initialSourceUntouched = false;
        syncFromVisual();
      } catch { showError('这段内容暂时无法更新，请检查写法。原公式已保留。'); }
    },
  });
  if (equationGraphOpen) {
    equationGraphHost.append(plotHost);
    plotTools.setEquationLinked(true);
  }

  field.defaultMode = 'math';
  field.smartMode = false;
  field.smartSuperscript = false;
  field.popoverPolicy = 'off';
  field.mathVirtualKeyboardPolicy = 'manual';
  field.environmentPopoverPolicy = 'off';
  field.menuItems = [];
  field.keybindings = field.keybindings.filter((binding) => {
    const command = Array.isArray(binding.command) ? binding.command[0] : binding.command;
    return command !== 'switchMode' && command !== 'switch-mode';
  });
  try {
    validateLatex(rawSource);
    field.setValue(rawSource, { silenceNotifications: true });
  } catch { parserIssue = '化学式、单位或公式暂时无法解析，请检查写法；输入内容已保留。'; }
  const initialSerialized = field.getValue('latex');
  let lastVisualSerialized = initialSerialized;
  let initialSourceUntouched = true;
  const shortcutTools = mountShortcutTools(shortcutsHost, {
    field,
    getLatex: () => {
      if (mode !== 'latex' && !visualBlocked) syncFromVisual();
      return rawSource;
    },
    shortcuts: options.shortcuts,
    onChange: options.onShortcutsChange,
    onInsert: insert,
  });

  function updateHistory(): void {
    undo.disabled = !field.canUndo() || saving || visualBlocked;
    redo.disabled = !field.canRedo() || saving || visualBlocked;
  }

  function updateControls(): void {
    for (const control of [...structureGrid.querySelectorAll('button'), ...symbolGroup.querySelectorAll('button'), ...operatorButtons, previous, next, jumpEnd]) {
      control.disabled = saving || visualBlocked;
    }
    source.readOnly = saving;
    clear.disabled = saving || visualBlocked;
    scienceTools.setDisabled(saving, visualBlocked);
    plotTools.setDisabled(saving);
    shortcutTools.setDisabled(saving);
    equationGraphToggle.disabled = saving;
    cancel.disabled = language.disabled = saving;
    for (const tab of modeButtons.values()) tab.disabled = saving;
    field.readOnly = saving || visualBlocked;
    field.hidden = visualBlocked;
    blockedMessage.hidden = !visualBlocked;
    fieldBox.dataset.blocked = String(visualBlocked);
    save.disabled = saving || Boolean(sourceIssue) || (mode === 'visual' && unsupported) || (mode !== 'visual' && incomplete);
    save.textContent = saving ? '正在保存…' : unsupported && mode !== 'visual' ? '按源码保存' : options.editing ? '保存修改' : '插入公式';
    updateHistory();
  }

  function renderSourceState(): void {
    sourceIssue = validateLatexSource(rawSource) ?? parserIssue;
    const errors = sourceIssue ? [] : field.errors;
    const syntaxErrors = errors.filter((error) => error.code !== 'unknown-command' && error.code !== 'unknown-environment');
    if (!sourceIssue && syntaxErrors.length > 0) sourceIssue = '源码尚未完整或存在语法问题，请检查后保存。';
    unsupported = !sourceIssue && errors.length > 0;
    incomplete = hasIncompleteSlots(rawSource);
    visualBlocked = Boolean(sourceIssue) || unsupported;
    if (sourceIssue) {
      blockedMessage.textContent = mode === 'visual' ? '公式源码尚未完整。请切换 LaTeX 或 Hybrid 模式继续编辑。' : '完成源码后，公式会自动显示在这里。';
      showError(sourceIssue);
    } else if (unsupported) {
      blockedMessage.textContent = '当前可视化引擎暂不支持这个公式。源码完整保留，可在 LaTeX 模式继续编辑。';
      showError(mode === 'visual' ? '请切换 LaTeX 或 Hybrid 模式查看源码。' : '部分命令暂不支持可视化；“按源码保存”会原样保存当前源码，请确认命令由你的笔记环境支持。', true);
    } else if (incomplete && mode !== 'visual') showError('公式还有未填写的方框或参数，请补全后保存。');
    else showError('');
    updateControls();
    scienceTools.refreshCurrent();
    if (equationGraphOpen) plotTools.refreshCurrentEquation();
  }

  function syncFromSource(): void {
    rawSource = source.value;
    initialSourceUntouched = false;
    const issue = validateLatexSource(rawSource);
    parserIssue = null;
    if (!issue) {
      syncing = true;
      try {
        // mhchem can throw before MathLive produces its usual error collection.
        validateLatex(rawSource);
        field.setValue(rawSource, { silenceNotifications: true });
        lastVisualSerialized = field.getValue('latex');
      } catch { parserIssue = '化学式、单位或公式暂时无法解析，请检查写法；输入内容已保留。'; }
      finally { syncing = false; }
    }
    renderSourceState();
  }

  function syncFromVisual(): void {
    if (syncing || visualBlocked || destroyed) return;
    const serialized = field.getValue('latex');
    parserIssue = null;
    // Some focus/mode events do not change content. They must not normalize source.
    if (serialized !== lastVisualSerialized) {
      rawSource = initialSourceUntouched && serialized === initialSerialized && options.latex !== undefined
        ? options.latex : field.getValue('latex-expanded');
      source.value = rawSource;
      lastVisualSerialized = serialized;
    }
    renderSourceState();
  }

  function setMode(value: EditorMode, focus = false): void {
    if (mode !== 'latex' && !visualBlocked && !parserIssue) syncFromVisual();
    mode = value;
    root.dataset.mode = mode;
    sourcePane.hidden = mode === 'visual';
    visualPane.hidden = mode === 'latex';
    subjectTools.hidden = mode === 'latex';
    workspace.setAttribute('aria-labelledby', `${instanceId}-tab-${mode}`);
    for (const [key, tab] of modeButtons) {
      tab.setAttribute('aria-selected', String(mode === key));
      tab.tabIndex = mode === key ? 0 : -1;
    }
    modeDescription.textContent = mode === 'visual' ? '直接编辑公式，用工具栏添加数学结构。' : mode === 'latex' ? '编辑 LaTeX 源码，保留你习惯的写法。' : '左侧源码与右侧公式双向同步，两侧都可以编辑。';
    canvasLabel.textContent = mode === 'hybrid' ? '可视化编辑' : '你的公式';
    renderSourceState();
    if (focus) {
      if (mode === 'latex' || (mode === 'hybrid' && visualBlocked)) source.focus();
      else if (!visualBlocked) field.focus();
    }
  }

  async function saveEquation(): Promise<void> {
    if (saving || destroyed) return;
    // Test callers may set the MathLive value directly, without its input event.
    if (mode === 'visual' && !visualBlocked) syncFromVisual();
    if (sourceIssue || (mode === 'visual' && unsupported)) {
      renderSourceState();
      return;
    }
    if (!rawSource.trim()) {
      showError('请先输入一个公式，或点击上方结构开始。');
      if (mode === 'latex') source.focus();
      else field.focus();
      return;
    }
    if (hasIncompleteSlots(rawSource)) {
      showError('还有方框没有填写，请补全后再保存。');
      if (mode === 'latex') source.focus();
      else if (!visualBlocked) {
        field.executeCommand('moveToMathfieldStart');
        field.executeCommand('moveToNextPlaceholder');
        field.focus();
      }
      return;
    }
    saving = true;
    root.setAttribute('aria-busy', 'true');
    updateControls();
    try {
      await options.onSave(rawSource, display);
    } catch (error) {
      if (!destroyed) showError(error instanceof Error ? error.message : '保存失败，请重试。');
    } finally {
      saving = false;
      if (!destroyed) {
        root.removeAttribute('aria-busy');
        updateControls();
      }
    }
  }

  const onInput = (): void => syncFromVisual();
  const onSourceInput = (): void => syncFromSource();
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === '\\') {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  const onRootKeydown = (event: KeyboardEvent): void => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      if (graphSelected || equationGraphOpen) root.querySelector<HTMLButtonElement>('[data-action="plot-insert"]')?.click();
      else void saveEquation();
    }
  };
  const onContextmenu = (event: Event): void => event.preventDefault();
  const onBeforeInput = (event: Event): void => {
    const input = event as InputEvent;
    if (input.data === '\\' && (input.inputType === 'insertText' || input.inputType === 'insertCompositionText')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  const onPaste = (event: ClipboardEvent): void => {
    const text = event.clipboardData?.getData('text/plain');
    if (text === undefined || text === '') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    insert(text.replace(/[\r\n]+/g, ' '));
  };
  const onModeChange = (): void => { if (field.mode === 'latex') field.mode = 'math'; };
  field.addEventListener('input', onInput);
  field.addEventListener('undo-state-change', updateHistory);
  field.addEventListener('keydown', onKeydown, true);
  field.addEventListener('contextmenu', onContextmenu, true);
  field.addEventListener('beforeinput', onBeforeInput, true);
  field.addEventListener('paste', onPaste, true);
  field.addEventListener('mode-change', onModeChange);
  source.addEventListener('input', onSourceInput);
  root.addEventListener('keydown', onRootKeydown);
  setDisplay(display);
  setMode(mode);
  const localization = localizeEditor(root, options.language ?? 'system', options.systemLanguage);
  language.addEventListener('change', () => {
    const selected = language.value as Language;
    localization.setLanguage(selected);
    void options.onLanguageChange?.(selected);
  });
  const focusTimer = window.setTimeout(() => {
    if (destroyed || options.compact) return;
    if (graphSelected) {
      const complex = root.querySelector<HTMLTextAreaElement>('[data-testid="complex-points"]');
      (complex && !complex.hidden ? complex : root.querySelector<HTMLInputElement>('[data-testid="plot-expression"]'))?.focus(); return;
    }
    if (mode === 'latex' || (mode === 'hybrid' && visualBlocked)) source.focus();
    else if (visualBlocked) modeButtons.get('latex')?.focus();
    else field.focus();
  }, 30);

  return {
    field,
    getDraft: () => {
      // MathLive dispatches input on the next task. Flush before a viewport
      // unmount so the final physical keystroke is included in the draft.
      if (mode !== 'latex' && !visualBlocked) syncFromVisual();
      return { latex: rawSource, display, mode, science: scienceTools.getDraft(), plot: plotTools.getDraft() };
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      localization.destroy();
      scienceTools.destroy();
      plotTools.destroy();
      shortcutTools.destroy();
      window.clearTimeout(focusTimer);
      field.removeEventListener('input', onInput);
      field.removeEventListener('undo-state-change', updateHistory);
      field.removeEventListener('keydown', onKeydown, true);
      field.removeEventListener('contextmenu', onContextmenu, true);
      field.removeEventListener('beforeinput', onBeforeInput, true);
      field.removeEventListener('paste', onPaste, true);
      field.removeEventListener('mode-change', onModeChange);
      source.removeEventListener('input', onSourceInput);
      root.removeEventListener('keydown', onRootKeydown);
      root.remove();
    },
  };
}
