import type { MathfieldElement } from 'mathlive';
import {
  PERIODIC_ELEMENTS, CHEMISTRY_TEMPLATES, PHYSICS_TEMPLATES, UNIT_PRESETS,
  buildChemicalLatex, buildUnitLatex, extractSingleScience,
} from './science-data';
import { UNIT_CATEGORIES, convertQuantity } from './unit-conversion';
import { getElementDetails } from './element-details';
import { checkReaction, type ReactionCheck } from './reaction-check';
import { createHtml } from './dom';
import { getElementSearchNames } from './i18n';

export type Subject = 'math' | 'chemistry' | 'physics' | 'units' | 'elements' | 'graph';
export interface ScienceDraft {
  subject: Subject;
  chemistry: string;
  units: string;
  conversion?: { category: string; value: string; from: string; to: string };
  /** Restore advice only when it still describes the exact helper input. */
  checkedInput?: string;
}
interface ScienceOptions {
  mathTools: HTMLElement[];
  initialLatex: string;
  getCurrentLatex: () => string;
  onInsertLatex: (latex: string) => void;
  onReplaceLatex: (latex: string) => void;
  initialDraft?: ScienceDraft;
  plotTools?: HTMLElement[];
  graphOnly?: boolean;
  onSubjectChange?: (subject: Subject) => void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const node = createHtml(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}
function tool(text: string, action: string, callback: () => void): HTMLButtonElement {
  const node = el('button', 'vme-science-button', text);
  node.type = 'button';
  node.dataset.action = action;
  node.addEventListener('click', callback);
  return node;
}
function localizedText(node: HTMLElement, chinese: string, english: string): void {
  node.textContent = chinese;
  node.dataset.i18nEn = english;
}

/** Subject helpers prepare a draft. They never rewrite the current formula while typing. */
export function mountScienceTools(host: HTMLElement, options: ScienceOptions): {
  destroy: () => void;
  refreshCurrent: () => void;
  setDisabled: (saving: boolean, insertBlocked?: boolean) => void;
  getDraft: () => ScienceDraft;
} {
  const root = el('div', 'vme-science');
  const tabs = el('div', 'vme-subject-tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', '学科工具');
  const unique = `vme-subject-${Math.random().toString(36).slice(2)}`;
  let subject: Subject = 'math';
  let saving = false;
  let insertBlocked = false;
  let destroyed = false;
  const initial = extractSingleScience(options.initialLatex);
  if (initial) subject = initial.kind;
  if (options.initialDraft && ['math', 'chemistry', 'physics', 'units', 'elements', 'graph'].includes(options.initialDraft.subject)) subject = options.initialDraft.subject;
  if (options.graphOnly) subject = 'graph';
  const tabMap = new Map<Subject, HTMLButtonElement>();
  const paneMap = new Map<Subject, HTMLElement>();
  const previews: MathfieldElement[] = [];
  for (const [id, label] of [
    ['math', '数学'], ['chemistry', '化学'], ['physics', '物理'], ['units', '单位'], ['elements', '元素表'], ['graph', '图像'],
  ] as const) {
    const tab = tool(label, `subject-${id}`, () => setSubject(id));
    if (id === 'graph') tab.dataset.i18nEn = 'Graph';
    tab.hidden = Boolean(options.graphOnly && id !== 'graph');
    tab.className = 'vme-subject-tab';
    tab.id = `${unique}-tab-${id}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `${unique}-pane-${id}`);
    tab.addEventListener('keydown', (event) => {
      const ordered: Subject[] = options.graphOnly ? ['graph'] : ['math', 'chemistry', 'physics', 'units', 'elements', 'graph'];
      const index = ordered.indexOf(id);
      const target = event.key === 'ArrowRight' ? ordered[(index + 1) % ordered.length]
        : event.key === 'ArrowLeft' ? ordered[(index + ordered.length - 1) % ordered.length]
        : event.key === 'Home' ? ordered[0] : event.key === 'End' ? ordered[ordered.length - 1] : undefined;
      if (target) { event.preventDefault(); setSubject(target); tabMap.get(target)?.focus(); }
    });
    tabMap.set(id, tab);
    tabs.append(tab);
    const pane = el('div', `vme-subject-pane vme-${id}-tools`);
    pane.id = `${unique}-pane-${id}`;
    pane.setAttribute('role', 'tabpanel');
    pane.setAttribute('aria-labelledby', tab.id);
    paneMap.set(id, pane);
  }
  root.append(tabs, ...paneMap.values());
  host.append(root);
  paneMap.get('math')!.append(...options.mathTools);
  paneMap.get('graph')!.append(...(options.plotTools ?? []));

  function setSubject(value: Subject): void {
    cancelFocusDetails();
    hoveredElement = null;
    focusedElement = null;
    dismissedElement = null;
    hideElementDetails();
    subject = value;
    root.dataset.subject = value;
    for (const [id, tab] of tabMap) {
      tab.setAttribute('aria-selected', String(id === subject));
      tab.tabIndex = id === subject ? 0 : -1;
      paneMap.get(id)!.hidden = id !== subject;
    }
    options.onSubjectChange?.(subject);
  }

  function preview(container: HTMLElement, label: string): MathfieldElement {
    const field = createHtml('math-field', container.ownerDocument);
    field.className = 'vme-science-preview';
    field.setAttribute('read-only', '');
    field.setAttribute('math-virtual-keyboard-policy', 'manual');
    field.setAttribute('aria-label', label);
    field.tabIndex = -1;
    container.append(field);
    field.menuItems = [];
    previews.push(field);
    return field;
  }

  function composer(kind: 'chemistry' | 'units') {
    const pane = paneMap.get(kind)!;
    const isChemistry = kind === 'chemistry';
    const label = el('label', 'vme-science-input-label', isChemistry ? '化学式或反应式' : '数值与单位');
    const input = el('input', 'vme-science-input');
    input.type = 'text';
    input.id = `${unique}-${kind}-input`;
    input.dataset.testid = `${kind}-input`;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('autocapitalize', 'off');
    input.placeholder = isChemistry ? '例如 H2O 或 2 H2 + O2 -> 2 H2O' : '例如 9.81 m/s^2';
    input.value = options.initialDraft?.[kind] ?? (initial?.kind === kind ? initial.input : '');
    label.htmlFor = input.id;
    const row = el('div', 'vme-science-input-row');
    row.append(input);
    const snippets = el('div', 'vme-science-snippets');
    snippets.setAttribute('role', 'group');
    snippets.setAttribute('aria-label', isChemistry ? '化学键与反应符号' : '常用单位');
    const samples = el('div', 'vme-science-samples');
    const previewBox = el('div', 'vme-science-preview-box');
    const error = el('p', 'vme-science-error');
    error.setAttribute('role', 'status');
    error.hidden = true;
    const actions = el('div', 'vme-science-actions');
    let prepared = '';
    let reactionResult: ReactionCheck | undefined;
    let checkedInput: string | undefined;
    const reactionBox = el('div', 'vme-reaction-check');
    const reactionTop = el('div', 'vme-reaction-top');
    const check = tool('检查配平', 'reaction-check', runReactionCheck);
    check.dataset.i18nEn = 'Check balance';
    const reactionStatus = el('p', 'vme-reaction-status');
    reactionStatus.dataset.testid = 'reaction-status';
    reactionStatus.dataset.status = 'unchecked';
    reactionStatus.setAttribute('role', 'status');
    reactionStatus.setAttribute('aria-live', 'polite');
    const differences = el('p', 'vme-reaction-differences');
    differences.dataset.testid = 'reaction-differences';
    const suggestion = el('code', 'vme-reaction-suggestion');
    suggestion.dataset.testid = 'reaction-suggestion';
    suggestion.setAttribute('data-no-i18n', '');
    const applySuggestion = tool('使用配平建议', 'reaction-apply', () => {
      // Advice must still match the exact input. It updates only this helper;
      // the current equation changes only through Insert/Update below.
      if (saving || checkedInput !== input.value || !reactionResult?.suggestion) return;
      setInput(reactionResult.suggestion);
      runReactionCheck();
    });
    applySuggestion.dataset.i18nEn = 'Use balanced suggestion';
    const reactionNote = el('p', 'vme-science-note');
    localizedText(reactionNote, '仅检查元素与电荷守恒，不判断反应能否发生；未配平也可按原式插入。',
      'Checks element and charge conservation, not whether a reaction can occur. You can insert an unbalanced equation as written.');
    reactionTop.append(check, reactionStatus);
    reactionBox.append(reactionTop, differences, suggestion, applySuggestion, reactionNote);
    const builder = isChemistry ? buildChemicalLatex : buildUnitLatex;
    const insert = tool(isChemistry ? '插入化学式' : '插入单位', `${kind}-insert`, () => {
      if (saving || insertBlocked || !prepared) return;
      options.onInsertLatex(prepared);
      refreshCurrent();
    });
    insert.classList.add('vme-science-primary');
    const refill = tool(isChemistry ? '回填当前化学式' : '回填当前单位', `${kind}-refill`, () => {
      const current = extractSingleScience(options.getCurrentLatex());
      if (current?.kind !== kind || saving) return;
      input.value = current.input;
      update();
      input.focus();
    });
    const replace = tool(isChemistry ? '更新当前化学式' : '更新当前单位', `${kind}-replace`, () => {
      // Recheck at click time: helper drafts must never replace a mixed expression.
      const current = extractSingleScience(options.getCurrentLatex());
      if (current?.kind !== kind || saving || !prepared) return;
      options.onReplaceLatex(prepared);
      refreshCurrent();
    });
    actions.append(insert, refill, replace);
    const note = el('p', 'vme-science-note', isChemistry
      ? '用普通写法编辑，上方生成预览，点击插入后才加入公式。暂不支持二维分子绘图。'
      : '支持复合单位和指数；下方可离线换算常用单位。');
    if (isChemistry) note.dataset.i18nEn = 'Use ordinary notation and preview it above. It joins the equation only when you insert it. 2D molecular drawing is not supported.';
    pane.append(label, row, snippets, samples, previewBox, error);
    if (isChemistry) pane.append(reactionBox);
    pane.append(actions, note);
    const field = preview(previewBox, isChemistry ? '化学式预览' : '单位预览');
    const empty = el('span', 'vme-science-empty', isChemistry ? '输入后显示化学式预览' : '输入后显示单位预览');
    previewBox.append(empty);
    let caretStart = input.value.length;
    let caretEnd = caretStart;
    const rememberCaret = () => { caretStart = input.selectionStart ?? input.value.length; caretEnd = input.selectionEnd ?? caretStart; };
    for (const event of ['keyup', 'click', 'select', 'blur']) input.addEventListener(event, rememberCaret);
    input.addEventListener('input', () => { rememberCaret(); update(); });

    function addText(text: string): void {
      if (saving) return;
      const start = Math.min(caretStart, input.value.length);
      const end = Math.min(caretEnd, input.value.length);
      input.value = input.value.slice(0, start) + text + input.value.slice(end);
      caretStart = caretEnd = start + text.length;
      input.focus();
      input.setSelectionRange(caretStart, caretEnd);
      update();
    }
    function setInput(text: string): void {
      if (saving) return;
      input.value = text;
      caretStart = caretEnd = text.length;
      update();
      input.focus();
      input.setSelectionRange(caretStart, caretEnd);
    }
    function update(): void {
      if (checkedInput !== input.value) { checkedInput = undefined; reactionResult = undefined; }
      prepared = '';
      error.hidden = true;
      empty.hidden = Boolean(input.value.trim());
      field.hidden = !input.value.trim();
      if (input.value.trim()) {
        try {
          const latex = builder(input.value);
          field.setValue(latex, { silenceNotifications: true });
          if (field.errors.length) throw new Error('这段写法暂时无法预览，请检查后重试。');
          prepared = latex;
        } catch (problem) {
          field.hidden = true;
          error.textContent = problem instanceof Error ? problem.message : '这段写法暂时无法预览，请检查后重试。';
          error.hidden = false;
        }
      }
      refresh();
    }
    function refresh(): void {
      const current = extractSingleScience(options.getCurrentLatex());
      const matches = current?.kind === kind;
      refill.hidden = replace.hidden = !matches;
      insert.disabled = saving || insertBlocked || !prepared;
      refill.disabled = saving;
      replace.disabled = saving || !prepared;
      input.disabled = saving;
      if (isChemistry) refreshReaction();
      for (const button of pane.querySelectorAll<HTMLButtonElement>('.vme-science-snippets button, .vme-science-samples button')) button.disabled = saving;
    }
    function runReactionCheck(): void {
      if (!isChemistry || saving || !input.value.trim()) return;
      checkedInput = input.value;
      try { reactionResult = checkReaction(input.value); }
      catch { reactionResult = { status: 'unsupported', message: 'Cannot check this notation.' }; }
      refreshReaction();
    }
    function refreshReaction(): void {
      check.disabled = saving || !input.value.trim();
      const current = checkedInput === input.value ? reactionResult : undefined;
      reactionStatus.dataset.status = current?.status ?? 'unchecked';
      const statusText: Record<string, [string, string]> = {
        unchecked: ['可检查配平；不会自动修改原式。', 'Check balance without changing your equation.'],
        balanced: ['已配平：元素与电荷守恒。', 'Balanced: elements and charge are conserved.'],
        unbalanced: ['未配平；仍可按原式插入。', 'Unbalanced; you can still insert it as written.'],
        impossible: ['按当前反应物和生成物无法配平；仍可插入原式。', 'Cannot balance the listed reactants and products; you can still insert the original.'],
        unsupported: ['暂时无法检查这种写法；仍可插入原式。', 'This notation cannot be checked yet; you can still insert the original.'],
        indeterminate: ['未能确定唯一的配平建议；仍可插入原式。', 'A unique balancing suggestion could not be determined; you can still insert the original.'],
        'not-reaction': ['这是化学式；加入反应箭头后可检查配平。', 'This is a formula. Add a reaction arrow to check balance.'],
      };
      const text = statusText[current?.status ?? 'unchecked'] ?? statusText.unsupported;
      localizedText(reactionStatus, ...text);
      const rows = current?.differences ?? [];
      differences.hidden = rows.length === 0;
      const counts = rows.map(item => `${item.element === 'charge' ? '电荷' : item.element}: ${item.left} / ${item.right}`).join(' · ');
      const countsEn = rows.map(item => `${item.element === 'charge' ? 'charge' : item.element}: ${item.left} / ${item.right}`).join(' · ');
      localizedText(differences, `左侧 / 右侧：${counts}`, `Left / right: ${countsEn}`);
      suggestion.hidden = applySuggestion.hidden = !current?.suggestion;
      suggestion.textContent = current?.suggestion ?? '';
      applySuggestion.disabled = saving || !current?.suggestion;
      const originalChoice = current && ['unbalanced', 'impossible', 'unsupported', 'indeterminate'].includes(current.status);
      localizedText(insert, originalChoice ? '按原式插入' : '插入化学式', originalChoice ? 'Insert as written' : 'Insert formula');
      localizedText(replace, originalChoice ? '按原式更新当前化学式' : '更新当前化学式', originalChoice ? 'Update formula as written' : 'Update current formula');
    }
    update();
    if (isChemistry && options.initialDraft?.checkedInput === input.value && input.value.trim()) runReactionCheck();
    return { input, snippets, samples, addText, setInput, refresh, getCheckedInput: () => checkedInput };
  }

  const chemistry = composer('chemistry');
  const units = composer('units');

  const conversion = el('section', 'vme-unit-conversion');
  conversion.setAttribute('aria-label', '单位换算');
  const conversionTop = el('div', 'vme-conversion-top');
  conversionTop.append(el('strong', 'vme-science-input-label', '单位换算'));
  const category = el('select', 'vme-conversion-select');
  category.dataset.testid = 'conversion-category';
  category.setAttribute('aria-label', '换算类别');
  for (const item of UNIT_CATEGORIES) {
    const option = el('option', '', item.label);
    option.value = item.id;
    option.dataset.i18nEn = item.labelEn;
    category.append(option);
  }
  conversionTop.append(category);
  const conversionGrid = el('div', 'vme-conversion-grid');
  const amount = el('input', 'vme-conversion-amount');
  amount.type = 'text';
  amount.inputMode = 'decimal';
  amount.value = '1';
  amount.dataset.testid = 'conversion-value';
  amount.setAttribute('aria-label', '换算数值');
  const from = el('select', 'vme-conversion-select');
  from.dataset.testid = 'conversion-from';
  from.setAttribute('aria-label', '原单位');
  const to = el('select', 'vme-conversion-select');
  to.dataset.testid = 'conversion-to';
  to.setAttribute('aria-label', '目标单位');
  function conversionLabeled(label: string, input: HTMLElement): HTMLElement {
    const wrapper = el('label', 'vme-conversion-control');
    wrapper.append(el('span', 'vme-science-input-label', label), input);
    return wrapper;
  }
  const swap = tool('⇄', 'conversion-swap', () => {
    const previous = from.value;
    from.value = to.value;
    to.value = previous;
    updateConversion();
  });
  swap.title = '交换单位';
  swap.setAttribute('aria-label', '交换单位');
  swap.classList.add('vme-conversion-swap');
  conversionGrid.append(conversionLabeled('数值', amount), conversionLabeled('从', from), swap, conversionLabeled('到', to));
  const conversionBottom = el('div', 'vme-conversion-bottom');
  const output = el('output', 'vme-conversion-result');
  output.dataset.testid = 'conversion-result';
  output.setAttribute('aria-label', '换算结果');
  output.setAttribute('data-no-i18n', '');
  output.setAttribute('aria-live', 'polite');
  const conversionError = el('p', 'vme-science-error');
  conversionError.setAttribute('role', 'status');
  let convertedInput = '';
  const useResult = tool('使用换算结果', 'conversion-use', () => {
    if (saving || !convertedInput) return;
    units.setInput(convertedInput);
  });
  conversionBottom.append(output, useResult);
  conversion.append(conversionTop, conversionGrid, conversionBottom, conversionError,
    el('p', 'vme-science-note', '先填入单位输入框，再点击插入单位；不会自动修改公式。'));
  paneMap.get('units')!.append(conversion);

  function fillConversionUnits(): void {
    const selected = UNIT_CATEGORIES.find(item => item.id === category.value) ?? UNIT_CATEGORIES[0];
    from.replaceChildren();
    to.replaceChildren();
    for (const unit of selected.units) {
      for (const select of [from, to]) {
        const option = el('option', '', `${unit.label} (${unit.symbol})`);
        option.dataset.i18nEn = `${unit.labelEn} (${unit.symbol})`;
        option.value = unit.id;
        select.append(option);
      }
    }
    to.selectedIndex = Math.min(1, selected.units.length - 1);
    if (selected.id === 'length') { from.value = 'm'; to.value = 'cm'; }
    updateConversion();
  }
  function refreshConversion(): void {
    for (const control of [category, amount, from, to, swap]) control.disabled = saving;
    useResult.disabled = saving || !convertedInput;
  }
  function updateConversion(): void {
    convertedInput = '';
    output.textContent = '';
    conversionError.hidden = true;
    try {
      if (!amount.value.trim() || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(amount.value.trim())) throw new Error('请输入有效数值。');
      const value = Number(amount.value);
      const result = convertQuantity(value, from.value, to.value);
      const selected = UNIT_CATEGORIES.find(item => item.id === category.value)!;
      const fromUnit = selected.units.find(item => item.id === from.value)!;
      const toUnit = selected.units.find(item => item.id === to.value)!;
      // Twelve significant digits keep the display readable without introducing
      // binary floating-point noise into the quantity composer.
      const formatted = Object.is(result, -0) ? '0' : Number(result.toPrecision(12)).toString();
      convertedInput = `${formatted} ${toUnit.input}`;
      buildUnitLatex(convertedInput);
      output.textContent = `${amount.value.trim()} ${fromUnit.symbol} = ${formatted} ${toUnit.symbol}`;
    } catch (problem) {
      const code = problem && typeof problem === 'object' && 'code' in problem ? problem.code : '';
      conversionError.textContent = code === 'incompatible-units' ? '请选择相同类别的单位。'
        : code === 'unknown-unit' ? '请选择有效的单位。'
        : code === 'out-of-range' ? '数值超出支持范围。'
        : '请输入有效数值。';
      conversionError.hidden = false;
    }
    refreshConversion();
  }
  category.addEventListener('change', fillConversionUnits);
  amount.addEventListener('input', updateConversion);
  from.addEventListener('change', updateConversion);
  to.addEventListener('change', updateConversion);
  fillConversionUnits();
  const conversionDraft = options.initialDraft?.conversion;
  if (conversionDraft) {
    if (UNIT_CATEGORIES.some(item => item.id === conversionDraft.category)) {
      category.value = conversionDraft.category;
      fillConversionUnits();
    }
    amount.value = conversionDraft.value;
    if (Array.from(from.options).some(option => option.value === conversionDraft.from)) from.value = conversionDraft.from;
    if (Array.from(to.options).some(option => option.value === conversionDraft.to)) to.value = conversionDraft.to;
    updateConversion();
  }
  for (const [id, label, text, title] of [
    ['single-bond', 'C—C', '-', '单键'], ['double-bond', 'C=C', '=', '双键'], ['triple-bond', 'C≡C', '#', '三键'],
    ['reaction-arrow', '→', ' -> ', '反应箭头'], ['equilibrium', '⇌', ' <=> ', '可逆反应'], ['plus', '+', ' + ', '加号'],
    ['charge-positive', '⁺', '^+', '正电荷'], ['charge-negative', '⁻', '^-', '负电荷'],
    ['state-solid', '(s)', '(s)', '固体'], ['state-liquid', '(l)', '(l)', '液体'],
    ['state-gas', '(g)', '(g)', '气体'], ['state-aqueous', '(aq)', '(aq)', '水溶液'],
    ['gas-release', '气体 ↑', ' ^', '气体生成标记'], ['precipitate', '沉淀 ↓', ' v', '沉淀标记'],
  ]) {
    const button = tool(label, `chemistry-${id}`, () => chemistry.addText(text));
    button.title = title;
    button.setAttribute('aria-label', `添加${title}`);
    button.addEventListener('pointerdown', (event) => event.preventDefault());
    chemistry.snippets.append(button);
  }
  for (const item of CHEMISTRY_TEMPLATES) {
    const button = tool(item.label, `chemistry-sample-${item.id}`, () => chemistry.setInput(item.input));
    button.title = item.input;
    chemistry.samples.append(button);
  }
  for (const item of UNIT_PRESETS) {
    const button = tool(item.label, `unit-preset-${item.id}`, () => units.setInput(item.input));
    button.title = item.input;
    units.snippets.append(button);
  }

  const physics = paneMap.get('physics')!;
  physics.append(el('p', 'vme-science-note', '点击模板插入，随后直接修改公式中的数值和变量。'));
  const physicsGrid = el('div', 'vme-physics-grid');
  physics.append(physicsGrid);
  const physicsButtons: HTMLButtonElement[] = [];
  for (const item of PHYSICS_TEMPLATES) {
    const button = tool(item.label, `physics-${item.id}`, () => {
      if (saving || insertBlocked) return;
      options.onInsertLatex(item.latex);
    });
    button.classList.add('vme-physics-template');
    physicsGrid.append(button);
    const field = preview(button, item.label);
    field.setAttribute('aria-hidden', 'true');
    field.inert = true;
    try { field.setValue(item.latex, { silenceNotifications: true }); }
    catch { field.hidden = true; }
    button.addEventListener('pointerdown', (event) => event.preventDefault());
    physicsButtons.push(button);
  }

  const elements = paneMap.get('elements')!;
  const searchLabel = el('label', 'vme-science-input-label', '查找元素');
  const search = el('input', 'vme-element-search');
  search.type = 'search';
  search.id = `${unique}-element-search`;
  search.dataset.testid = 'element-search';
  search.placeholder = '原子序数、符号或英文名称';
  searchLabel.htmlFor = search.id;
  const elementHint = el('p', 'vme-science-note', '悬停或聚焦元素查看质量与电子排布；点击加入化学输入框。');
  const tableScroll = el('div', 'vme-periodic-scroll');
  const table = el('div', 'vme-periodic-table');
  table.setAttribute('role', 'group');
  table.setAttribute('aria-label', '118 种元素周期表');
  const count = el('p', 'vme-element-count', '118 个元素');
  count.setAttribute('role', 'status');
  const elementButtons: { button: HTMLButtonElement; search: string; number: number; symbol: string }[] = [];
  // Keep a single details card outside the scrolling grid. Hovering never
  // changes cell dimensions, so the pointer cannot make the table jump.
  const detailsCard = el('div', 'vme-element-details');
  detailsCard.id = `${unique}-element-details`;
  detailsCard.dataset.testid = 'element-details';
  detailsCard.setAttribute('role', 'tooltip');
  detailsCard.hidden = true;
  root.append(detailsCard);
  type ElementCell = { button: HTMLButtonElement; item: typeof PERIODIC_ELEMENTS[number] };
  let hoveredElement: ElementCell | null = null;
  let focusedElement: ElementCell | null = null;
  let visibleElement: ElementCell | null = null;
  let detailsFrame = 0;
  let focusFrame = 0;
  let dismissedElement: HTMLButtonElement | null = null;
  const cellsByButton = new Map<HTMLButtonElement, ElementCell>();

  function cancelFocusDetails(): void {
    if (focusFrame) { window.cancelAnimationFrame(focusFrame); focusFrame = 0; }
  }

  function restoreFocusedDetails(): void {
    cancelFocusDetails();
    focusFrame = window.requestAnimationFrame(() => {
      focusFrame = 0;
      if (destroyed || saving || subject !== 'elements') return;
      const button = root.ownerDocument.activeElement as HTMLButtonElement | null;
      const cell = button && cellsByButton.get(button);
      if (!cell || button === dismissedElement || button.disabled) return;
      const rect = button.getBoundingClientRect();
      const clip = tableScroll.getBoundingClientRect();
      const viewport = root.ownerDocument.documentElement;
      if (rect.bottom <= Math.max(0, clip.top) || rect.top >= Math.min(viewport.clientHeight, clip.bottom)
        || rect.right <= Math.max(0, clip.left) || rect.left >= Math.min(viewport.clientWidth, clip.right)) {
        hideElementDetails();
        return;
      }
      focusedElement = cell;
      showElementDetails(cell);
    });
  }

  function hideElementDetails(): void {
    visibleElement?.button.removeAttribute('aria-describedby');
    visibleElement = null;
    detailsCard.hidden = true;
    if (detailsFrame) { window.cancelAnimationFrame(detailsFrame); detailsFrame = 0; }
  }

  function positionElementDetails(): void {
    if (!visibleElement || destroyed || detailsCard.hidden) return;
    const parent = root.getBoundingClientRect();
    const cell = visibleElement.button.getBoundingClientRect();
    const card = detailsCard.getBoundingClientRect();
    const width = parent.width;
    const left = Math.max(0, Math.min(cell.left - parent.left + cell.width / 2 - card.width / 2, width - card.width));
    const editor = root.closest('.vme-editor')?.getBoundingClientRect() ?? parent;
    const scroller = root.closest('.cm-scroller')?.getBoundingClientRect();
    const viewportHeight = root.ownerDocument.defaultView?.innerHeight ?? root.ownerDocument.documentElement.clientHeight;
    const top = Math.max(0, editor.top, scroller?.top ?? 0) + 8;
    const bottom = Math.min(viewportHeight, editor.bottom, scroller?.bottom ?? viewportHeight) - 8;
    const above = cell.top - card.height - 8;
    const below = cell.bottom + 8;
    const preferred = above >= top ? above : below;
    detailsCard.style.left = `${left}px`;
    // A negative offset can cover the editor header, keeping low-screen cards
    // visible without moving the element or scrolling the user's note.
    detailsCard.style.top = `${Math.max(top, Math.min(preferred, bottom - card.height)) - parent.top}px`;
  }

  function showElementDetails(cell: ElementCell | null): void {
    hideElementDetails();
    if (!cell || subject !== 'elements' || saving || destroyed) return;
    const detail = getElementDetails(cell.item.symbol);
    if (!detail) return;
    visibleElement = cell;
    const title = el('div', 'vme-element-detail-title', `${cell.item.number} · ${cell.item.symbol} · ${cell.item.name}`);
    const values = el('dl', 'vme-element-detail-values');
    const appendValue = (label: string, value: string, testId: string): HTMLElement => {
      const term = el('dt', '', label);
      term.dataset.testid = `${testId}-label`;
      const description = el('dd', '', value);
      description.dataset.testid = testId;
      description.setAttribute('data-i18n-ignore', '');
      values.append(term, description);
      return description;
    };
    appendValue(detail.massKind === 'standard' ? '标准原子量' : '同位素质量数', detail.atomicMass, 'detail-mass');
    const configuration = appendValue('电子排布', '', 'detail-configuration');
    configuration.className = 'vme-element-configuration';
    const expression = detail.electronConfiguration;
    let previous = 0;
    for (const match of expression.matchAll(/(\d[spdfg])\^?(\d+)/g)) {
      configuration.append(document.createTextNode(expression.slice(previous, match.index) + match[1]), el('sup', '', match[2]));
      previous = match.index + match[0].length;
    }
    configuration.append(document.createTextNode(expression.slice(previous)));
    appendValue('各电子层电子数', detail.electronShells.join(', '), 'detail-shells');
    const provenance = el('p', 'vme-element-detail-source');
    provenance.append(el('span', '', '数据来源'), document.createTextNode(` · CIAAW / ${detail.configurationSource.includes('nist.gov') ? 'NIST' : 'PubChem'}`));
    detailsCard.replaceChildren(title, values);
    if (detail.massKind === 'isotope') detailsCard.append(el('p', 'vme-element-detail-note', '方括号内为同位素质量数，不是标准原子量。'));
    else if (detail.atomicMass.startsWith('[')) detailsCard.append(el('p', 'vme-element-detail-note', '区间表示天然同位素组成造成的标准原子量变化。'));
    if (detail.configurationStatus !== 'reference') {
      const status = el('p', 'vme-element-detail-note', detail.configurationStatus === 'predicted' ? '电子排布为理论预测。' : '电子排布为计算值。');
      detailsCard.append(status);
    }
    detailsCard.append(provenance);
    detailsCard.dataset.massKind = detail.massKind;
    detailsCard.dataset.configurationStatus = detail.configurationStatus;
    detailsCard.hidden = false;
    cell.button.setAttribute('aria-describedby', detailsCard.id);
    positionElementDetails();
    // Localization can change line wrapping in the next microtask.
    detailsFrame = window.requestAnimationFrame(() => { detailsFrame = 0; positionElementDetails(); });
  }

  // Native keyboard focus may scroll the cell into view after its focus event.
  // Reconcile once per frame so that scrolling cannot silently dismiss it.
  const hideOnScroll = () => { hoveredElement = null; hideElementDetails(); restoreFocusedDetails(); };
  root.ownerDocument.addEventListener('scroll', hideOnScroll, true);
  root.ownerDocument.defaultView?.addEventListener('resize', hideOnScroll);
  for (let group = 1; group <= 18; group++) {
    const heading = el('span', 'vme-periodic-group', String(group));
    heading.style.gridColumn = String(group);
    table.append(heading);
  }
  for (const item of PERIODIC_ELEMENTS) {
    const button = tool('', `element-${item.number}`, () => {
      if (saving) return;
      chemistry.addText(item.symbol);
      setSubject('chemistry');
      chemistry.input.focus();
    });
    button.className = 'vme-element-button';
    button.setAttribute('aria-label', `${item.number} ${item.name} ${item.symbol}`);
    const cell: ElementCell = { button, item };
    cellsByButton.set(button, cell);
    button.addEventListener('pointerenter', () => { dismissedElement = null; hoveredElement = cell; showElementDetails(cell); });
    button.addEventListener('pointerleave', () => { hoveredElement = null; showElementDetails(focusedElement); });
    button.addEventListener('focus', () => { dismissedElement = null; focusedElement = cell; showElementDetails(cell); restoreFocusedDetails(); });
    button.addEventListener('blur', () => { cancelFocusDetails(); focusedElement = null; dismissedElement = null; showElementDetails(hoveredElement); });
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      cancelFocusDetails();
      dismissedElement = button;
      hoveredElement = null;
      focusedElement = null;
      hideElementDetails();
    });
    const isLanthanide = item.number >= 57 && item.number <= 71;
    const isActinide = item.number >= 89 && item.number <= 103;
    const column = isLanthanide ? item.number - 54 : isActinide ? item.number - 86 : item.group;
    const row = isLanthanide ? 10 : isActinide ? 11 : item.period + 1;
    button.style.gridColumn = String(column);
    button.style.gridRow = String(row);
    button.dataset.category = isLanthanide ? 'lanthanide' : isActinide ? 'actinide' : item.group === 18 ? 'noble' : item.group === 1 ? 'alkali' : item.group >= 13 ? 'main' : 'transition';
    button.append(el('span', 'vme-element-number', String(item.number)), el('strong', 'vme-element-symbol', item.symbol), el('span', 'vme-element-name', item.name));
    table.append(button);
    elementButtons.push({ button, search: `${item.number} ${item.symbol} ${getElementSearchNames(item.name)}`.toLowerCase(), number: item.number, symbol: item.symbol.toLowerCase() });
  }
  for (const [row, label] of [[10, '镧系'], [11, '锕系']] as const) {
    const legend = el('span', 'vme-periodic-series', label);
    legend.style.gridRow = String(row);
    table.append(legend);
  }
  tableScroll.append(table);
  elements.append(searchLabel, search, elementHint, tableScroll, count);
  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    let matches = 0;
    for (const item of elementButtons) {
      const match = !query || (/^\d+$/.test(query) ? item.number === Number(query) : item.search.includes(query));
      item.button.dataset.dimmed = String(!match);
      if (match) matches++;
    }
    count.textContent = query ? `${matches} 个匹配元素；点击元素可插入` : '118 个元素';
  });

  function refreshCurrent(): void {
    if (destroyed) return;
    chemistry.refresh();
    units.refresh();
    refreshConversion();
  }
  setSubject(subject);
  refreshCurrent();
  return {
    refreshCurrent,
    getDraft: () => ({
      subject,
      chemistry: chemistry.input.value,
      units: units.input.value,
      conversion: { category: category.value, value: amount.value, from: from.value, to: to.value },
      checkedInput: chemistry.getCheckedInput(),
    }),
    setDisabled: (value, blocked = false) => {
      saving = value;
      insertBlocked = blocked;
      for (const tab of tabMap.values()) tab.disabled = saving;
      if (saving) hideElementDetails();
      refreshCurrent();
      for (const button of physicsButtons) button.disabled = saving || insertBlocked;
      for (const item of elementButtons) item.button.disabled = saving;
      search.disabled = saving;
    },
    destroy: () => {
      destroyed = true;
      cancelFocusDetails();
      hideElementDetails();
      root.ownerDocument.removeEventListener('scroll', hideOnScroll, true);
      root.ownerDocument.defaultView?.removeEventListener('resize', hideOnScroll);
      // Removing fields lets MathLive disconnect its observers and event handlers.
      for (const field of previews) field.remove();
      root.remove();
    },
  };
}
