import { DEFAULT_PLOT_SPEC, type PlotSpec } from './plot-engine';
import { createGraph } from './graph-render';
import { DEFAULT_COMPLEX_SPEC, fitComplexPoints, formatComplex, parseComplexNumbers } from './complex-plane';
import { mountPlotInteraction, validPlotBounds, zoomPlotBounds, type PlotBounds } from './plot-interaction';
import { controlIcon } from './ui-icons';

export interface PlotViewDraft {
  expression: string;
  xMin: string;
  xMax: string;
  yMin: string;
  yMax: string;
  previewed?: boolean;
  rangeOpen?: boolean;
  home?: PlotBounds;
}
export interface PlotDraft extends PlotViewDraft {
  mode?: 'function' | 'complex';
  functionDraft?: PlotViewDraft;
  complexDraft?: PlotViewDraft;
}

interface PlotOptions {
  editing?: boolean;
  initialExpression?: string;
  initialDraft?: PlotDraft;
  onInsertGraph?: (spec: PlotSpec, svg: string) => Promise<void>;
  getCurrentExpression?: () => string;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
function text(node: HTMLElement, chinese: string, english: string): void {
  node.textContent = chinese;
  node.dataset.i18nEn = english;
}
function button(action: string, chinese: string, english: string, callback: () => void): HTMLButtonElement {
  const node = el('button', 'vme-science-button');
  node.type = 'button';
  node.dataset.action = action;
  const caption = el('span');
  text(caption, chinese, english);
  node.append(caption);
  node.addEventListener('click', () => callback());
  return node;
}

const PLOT_ERROR_ZH: Readonly<Record<string, string>> = {
  'Numbers must be finite.': '数字超出支持范围，请缩小数值。',
  'Unsupported notation. Use numbers, x, arithmetic, and supported functions.': '暂不支持此写法。请使用数字、x、算术运算及支持的函数。',
  'The expression is too complex. Simplify it before plotting.': '函数过于复杂，请简化后再绘图。',
  'Enter an expression such as x^2 or sin(x).': '请输入函数，例如 x^2 或 sin(x)。',
  'Unexpected input. Check operators and parentheses.': '请检查运算符及括号。',
  'The expression is nested too deeply.': '括号或函数嵌套过深，请简化后再绘图。',
  'The expression is incomplete.': '函数尚未填写完整。',
  'A closing parenthesis is missing.': '缺少右括号，请补全后再绘图。',
  'Unknown name. Use x, pi, e, sin, cos, tan, sqrt, abs, ln, log, or exp.': '未知名称。支持 x、pi、e、sin、cos、tan、sqrt、abs、ln、log 和 exp。',
  'Function arguments need parentheses, for example sin(x).': '函数的参数需要括号，例如 sin(x)。',
  'The expression is too long (maximum 500 characters).': '函数内容过长，请缩短到 500 个字符以内。',
  'The expression could not be parsed.': '暂时无法识别函数，请检查写法。',
  'Graph settings are missing.': '缺少图像设置，请重新打开编辑器。',
  'Axis bounds must be finite numbers between -1000000 and 1000000.': '坐标边界须为 −1000000 至 1000000 之间的有效数值。',
  'Each axis minimum must be smaller than its maximum.': '每个坐标轴的最小值须小于最大值。',
  'Each axis range must span at least 0.000000001.': '每个坐标轴的范围须至少为 0.000000001。',
  'Axis ranges are too narrow for their magnitude.': '坐标范围相对边界数值过窄，请扩大范围。',
  'The graph is too complex to sample. Simplify the expression or narrow the range.': '图线过于复杂，请简化函数或缩小绘图范围。',
  'No finite curve is visible in this range. Check the formula or adjust the axes.': '此范围内没有可显示的图线，请检查函数或调整坐标范围。',
  'The graph could not be generated.': '暂时无法生成图像，请检查函数后重试。',
  'Enter a complex number such as 3+2i, one per line.': '请输入复数，例如 3+2i，每行一个。',
  'Complex-number input is too long (maximum 1000 characters).': '复数内容过长，请缩短到 1000 个字符以内。',
  'Use at most 20 complex numbers, one per line.': '最多支持 20 个复数，每行一个。',
  'Complex-plane settings are missing.': '缺少复平面设置，请重新打开编辑器。',
};
function plotErrorZh(error: string): string {
  const line = /^Line (\d+): (.*)$/.exec(error);
  if (line) return line[2].startsWith('enter a literal')
    ? `第 ${line[1]} 行：请输入 3+2i、−i 或 4 这样的数值；暂不支持表达式或名称。`
    : `第 ${line[1]} 行：实部和虚部须为 −1000000 至 1000000 之间的有效数值。`;
  return PLOT_ERROR_ZH[error] ?? '暂时无法绘图，请检查输入及坐标范围。';
}

/** A graph is saved separately in the note; previewing never changes the equation draft. */
export function mountPlotTools(host: HTMLElement, options: PlotOptions = {}): {
  getDraft: () => PlotDraft;
  setDisabled: (disabled: boolean) => void;
  destroy: () => void;
} {
  const root = el('div', 'vme-plot-tools');
  root.dataset.testid = 'plot-tools';
  const body = el('div', 'vme-plot-body');
  root.append(body);
  host.append(root);
  const unique = `vme-plot-${Math.random().toString(36).slice(2)}`;
  let destroyed = false;
  let externalDisabled = false;
  let inserting = false;
  let previewTimer: number | undefined;
  let pendingInput = true;
  let lastPlot: { spec: PlotSpec; svg: string } | undefined;
  const draft = options.initialDraft;
  let mode: 'function' | 'complex' = draft?.mode ?? 'function';
  const caches: Partial<Record<'function' | 'complex', PlotViewDraft>> = { function: draft?.functionDraft, complex: draft?.complexDraft };
  const initial = draft ?? { ...DEFAULT_PLOT_SPEC, xMin: '-10', xMax: '10', yMin: '-10', yMax: '10' };
  let home: PlotBounds = initial.home ?? { xMin: Number(initial.xMin), xMax: Number(initial.xMax), yMin: Number(initial.yMin), yMax: Number(initial.yMax) };
  if (!validPlotBounds(home)) home = mode === 'complex' ? { ...DEFAULT_COMPLEX_SPEC } : { ...DEFAULT_PLOT_SPEC };
  let interaction: ReturnType<typeof mountPlotInteraction> | undefined;

  const kindLabel = el('label', 'vme-plot-kind-label');
  const kindCaption = el('span');
  text(kindCaption, '图像类型', 'Graph type');
  const kind = el('select', 'vme-conversion-select');
  kind.dataset.testid = 'plot-kind';
  for (const [value, zh, en] of [['function', '函数图像', 'Function graph'], ['complex', '复平面', 'Complex plane']]) {
    const option = el('option'); option.value = value; text(option, zh, en); kind.append(option);
  }
  kind.value = mode;
  kindLabel.append(kindCaption, kind);

  const label = el('label', 'vme-science-input-label');
  text(label, '函数 y = f(x)', 'Function y = f(x)');
  const expression = el('input', 'vme-science-input vme-plot-expression');
  expression.id = `${unique}-expression`;
  expression.type = 'text';
  expression.dataset.testid = 'plot-expression';
  expression.autocomplete = 'off';
  expression.spellcheck = false;
  expression.setAttribute('autocapitalize', 'off');
  expression.setAttribute('data-no-i18n', '');
  expression.placeholder = 'x^2, sin(x), 1/x';
  expression.value = draft?.expression ?? options.initialExpression ?? DEFAULT_PLOT_SPEC.expression;
  label.htmlFor = expression.id;
  const complexLabel = el('label', 'vme-science-input-label');
  text(complexLabel, '复数（每行一个）', 'Complex numbers (one per line)');
  const complexInput = el('textarea', 'vme-science-input vme-complex-input');
  complexInput.id = `${unique}-complex`;
  complexInput.rows = 3; complexInput.spellcheck = false; complexInput.autocomplete = 'off';
  complexInput.dataset.testid = 'complex-points';
  complexInput.setAttribute('data-no-i18n', '');
  complexInput.placeholder = '3+2i\n-i\n4';
  complexInput.value = mode === 'complex' ? draft?.expression ?? '3+2i' : draft?.complexDraft?.expression ?? '3+2i';
  complexLabel.htmlFor = complexInput.id;
  const presets = el('div', 'vme-plot-presets');
  for (const [id, notation, value] of [
    ['square', 'x²', 'x^2'], ['sine', 'sin(x)', 'sin(x)'], ['reciprocal', '1/x', '1/x'], ['sqrt', '√x', 'sqrt(x)'],
  ]) {
    const preset = button(`plot-preset-${id}`, notation, notation, () => {
      if (externalDisabled || inserting) return;
      expression.value = value;
      invalidate();
      previewGraph();
    });
    preset.setAttribute('data-no-i18n', '');
    presets.append(preset);
  }
  const useCurrent = button('plot-use-current', '使用当前公式', 'Use current equation', () => {
    if (destroyed || externalDisabled || inserting || !options.getCurrentExpression) return;
    invalidate();
    try {
      const value = options.getCurrentExpression();
      expression.value = value;
      invalidate();
      previewGraph();
    } catch (error) {
      showError('当前公式暂不能转换为单变量函数。请在此输入 y = f(x) 形式。',
        `This equation cannot be converted to a single function. Enter y = f(x) here. ${error instanceof Error ? error.message : ''}`);
    }
  });
  useCurrent.hidden = !options.getCurrentExpression;
  presets.append(useCurrent);
  const complexPresets = el('div', 'vme-plot-presets');
  for (const [id, caption, value] of [['single', '3+2i', '3+2i'], ['imaginary', '−i', '-i'], ['points', '3+2i, −2+i, −i', '3+2i\n-2+i\n-i']]) {
    const preset = button(`complex-preset-${id}`, caption, caption, () => {
      if (externalDisabled || inserting) return;
      complexInput.value = value; invalidate(); previewGraph();
    });
    preset.setAttribute('data-no-i18n', ''); complexPresets.append(preset);
  }
  const syntaxHint = el('p', 'vme-plot-note');
  text(syntaxHint, '用普通写法输入，例如 x^2、2x + 1、sqrt(x)。', 'Use ordinary notation, such as x^2, 2x + 1 or sqrt(x).');
  const range = el('details', 'vme-plot-range');
  range.open = draft?.rangeOpen ?? false;
  const rangeHeading = el('summary');
  text(rangeHeading, '坐标范围', 'Axis ranges');
  const rangeGrid = el('div', 'vme-plot-range-grid');
  const rangeInputs: Record<'xMin' | 'xMax' | 'yMin' | 'yMax', HTMLInputElement> = {} as Record<'xMin' | 'xMax' | 'yMin' | 'yMax', HTMLInputElement>;
  for (const [key, rangeLabel] of [
    ['xMin', 'x min'], ['xMax', 'x max'], ['yMin', 'y min'], ['yMax', 'y max'],
  ] as const) {
    const control = el('label', 'vme-plot-range-control');
    const caption = el('span');
    caption.textContent = rangeLabel;
    caption.dataset.rangeCaption = key;
    const input = el('input', 'vme-plot-range-input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.dataset.testid = `plot-${key}`;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = draft?.[key] ?? String(DEFAULT_PLOT_SPEC[key]);
    rangeInputs[key] = input;
    control.append(caption, input);
    rangeGrid.append(control);
  }
  range.append(rangeHeading, rangeGrid);
  const preview = el('div', 'vme-plot-preview');
  preview.dataset.testid = 'plot-preview';
  preview.setAttribute('data-no-i18n', '');
  preview.hidden = true;
  const status = el('p', 'vme-plot-status');
  status.dataset.testid = 'plot-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  text(status, '填写函数后点击预览图像。', 'Enter a function, then choose Preview graph.');
  const actions = el('div', 'vme-science-actions vme-plot-actions');
  const previewButton = button('plot-preview', '预览图像', 'Preview graph', previewGraph);
  const insertButton = button('plot-insert', options.editing ? '保存图像' : '插入图像', options.editing ? 'Save graph' : 'Insert graph', () => { void insertGraph(); });
  previewButton.prepend(controlIcon('preview'));
  insertButton.prepend(controlIcon(options.editing ? 'save' : 'insert'));
  insertButton.classList.add('vme-science-primary');
  actions.append(previewButton, insertButton);
  const navigation = el('div', 'vme-science-actions vme-plot-navigation');
  const zoomIn = button('plot-zoom-in', '放大', 'Zoom in', () => { if (lastPlot) { interaction?.setDisabled(true); applyBounds(zoomPlotBounds(lastPlot.spec, 0.8)); } });
  const zoomOut = button('plot-zoom-out', '缩小', 'Zoom out', () => { if (lastPlot) { interaction?.setDisabled(true); applyBounds(zoomPlotBounds(lastPlot.spec, 1.25)); } });
  const reset = button('plot-reset-view', '重置视图', 'Reset view', () => { interaction?.setDisabled(true); applyBounds(home); });
  const fit = button('complex-fit', '适应所有点', 'Fit all points', () => {
    if (externalDisabled || inserting) return;
    interaction?.setDisabled(true);
    const parsed = parseComplexNumbers(complexInput.value);
    if (!parsed.ok) { showError(plotErrorZh(parsed.error), parsed.error); refreshDisabled(); return; }
    setBounds(fitComplexPoints(parsed.points)); previewGraph();
  });
  navigation.append(zoomIn, zoomOut, reset, fit);
  zoomIn.prepend(controlIcon('zoom-in')); zoomOut.prepend(controlIcon('zoom-out'));
  reset.prepend(controlIcon('reset')); fit.prepend(controlIcon('fit'));
  const gestureHint = el('p', 'vme-plot-note');
  text(gestureHint, '输入后自动预览；在图内拖动或滚轮缩放。点击插入或保存才写入笔记，也可按 Ctrl+Enter。', 'Preview updates as you type. Drag or scroll inside the graph. Insert or save to update the note; Ctrl+Enter also works.');
  const pointList = el('ul', 'vme-complex-point-list');
  pointList.dataset.testid = 'complex-point-list'; pointList.setAttribute('data-no-i18n', '');
  const note = el('p', 'vme-plot-note');
  text(note, '离线绘制单变量函数；三角函数采用弧度，图线为数值近似。',
    'Plot a single function offline. Trigonometric functions use radians; curves are numerical approximations.');
  const previewOnly = el('p', 'vme-plot-note');
  previewOnly.dataset.testid = 'plot-preview-only';
  text(previewOnly, '此预览页面可以画图；在 Obsidian 中可将图像插入笔记。',
    'You can preview graphs here. Open the editor in Obsidian to insert a graph into a note.');
  previewOnly.hidden = Boolean(options.onInsertGraph);
  body.append(kindLabel, label, expression, complexLabel, complexInput, presets, complexPresets, syntaxHint, range, actions, status, navigation, gestureHint, preview, pointList, note, previewOnly);
  const inputs = [expression, complexInput, ...Object.values(rangeInputs)];
  for (const input of inputs) {
    input.addEventListener('input', () => { invalidate(); schedulePreview(); });
    input.addEventListener('keydown', (event) => {
      if ((event as KeyboardEvent).metaKey || (event as KeyboardEvent).ctrlKey) return;
      if ((event as KeyboardEvent).key !== 'Enter' || input === complexInput) return;
      event.preventDefault();
      event.stopPropagation();
      previewGraph();
    });
  }

  function invalidate(): void {
    cancelPreview();
    pendingInput = true;
    interaction?.setDisabled(true);
    lastPlot = undefined;
    preview.replaceChildren();
    preview.hidden = true;
    pointList.replaceChildren(); pointList.hidden = true;
    status.dataset.state = 'edited';
    text(status, '正在更新预览…也可直接点击插入或保存。', 'Updating preview… You can also insert or save directly.');
    refreshDisabled();
  }
  function refreshDisabled(): void {
    if (destroyed) return;
    const busy = externalDisabled || inserting;
    kind.disabled = busy;
    for (const input of inputs) input.disabled = busy;
    for (const preset of Array.from(presets.querySelectorAll<HTMLButtonElement>('button'))) preset.disabled = busy;
    for (const preset of Array.from(complexPresets.querySelectorAll<HTMLButtonElement>('button'))) preset.disabled = busy;
    previewButton.disabled = busy;
    insertButton.disabled = busy || !options.onInsertGraph || (!lastPlot && !pendingInput);
    zoomIn.disabled = zoomOut.disabled = busy || !lastPlot;
    reset.disabled = fit.disabled = busy;
    interaction?.setDisabled(busy || !lastPlot);
  }
  function showError(chinese: string, english: string): void {
    cancelPreview(); pendingInput = false;
    status.dataset.state = 'error';
    text(status, chinese, english);
    refreshDisabled();
  }
  function cancelPreview(): void {
    if (previewTimer !== undefined) window.clearTimeout(previewTimer);
    previewTimer = undefined;
  }
  function schedulePreview(): void {
    cancelPreview();
    previewTimer = window.setTimeout(() => {
      previewTimer = undefined;
      if (!root.closest('[hidden]')) previewGraph();
    }, 250);
  }
  function previewGraph(preserveGesture = false): void {
    if (destroyed || externalDisabled || inserting) return;
    cancelPreview();
    pendingInput = false;
    if (!preserveGesture) interaction?.setDisabled(true);
    lastPlot = undefined;
    pointList.replaceChildren(); pointList.hidden = true;
    const values = Object.fromEntries(Object.entries(rangeInputs).map(([key, input]) => [key, input.value.trim() === '' ? NaN : Number(input.value)])) as Record<keyof typeof rangeInputs, number>;
    const result = createGraph({ ...(mode === 'complex' ? { mode: 'complex' as const } : {}), expression: mode === 'complex' ? complexInput.value : expression.value, ...values });
    preview.replaceChildren();
    preview.hidden = true;
    if (!result.ok) {
      showError(plotErrorZh(result.error), result.error);
      refreshDisabled();
      return;
    }
    // The renderer generates a self-contained SVG and escapes all user text.
    const svg = new DOMParser().parseFromString(result.svg, 'image/svg+xml').documentElement;
    if (svg.localName !== 'svg') {
      showError('暂时无法生成图像，请检查函数后重试。', 'The graph could not be generated.');
      return;
    }
    preview.replaceChildren(preview.ownerDocument.importNode(svg, true));
    preview.hidden = false;
    lastPlot = { spec: result.spec, svg: result.svg };
    pointList.replaceChildren(); pointList.hidden = mode !== 'complex';
    if ('points' in result) {
      for (const point of result.points) {
        const item = el('li'); item.textContent = `${point.label} = ${formatComplex(point)} · Re = ${point.re}, Im = ${point.im}`; pointList.append(item);
      }
    }
    status.dataset.state = 'ready';
    text(status, options.editing ? '图像已就绪。点击保存图像更新笔记。' : '图像已就绪。点击插入图像加入笔记。', options.editing ? 'The graph is ready. Choose Save graph to update the note.' : 'The graph is ready. Choose Insert graph to add it to the note.');
    if ('visibleCount' in result) text(status, `视图内 ${result.visibleCount} / ${result.points.length} 个点。点击保存才写入笔记。`, `${result.visibleCount} / ${result.points.length} points visible. Save to update the note.`);
    refreshDisabled();
  }

  function setBounds(bounds: PlotBounds): void {
    for (const key of ['xMin', 'xMax', 'yMin', 'yMax'] as const) rangeInputs[key].value = String(bounds[key]);
  }
  function applyBounds(bounds: PlotBounds | undefined): void {
    if (!bounds || destroyed || externalDisabled || inserting) { refreshDisabled(); return; }
    const result = createGraph({ ...(mode === 'complex' ? { mode: 'complex' as const } : {}), expression: mode === 'complex' ? complexInput.value : expression.value, ...bounds });
    if (!result.ok) { showError(plotErrorZh(result.error), result.error); refreshDisabled(); return; }
    setBounds(bounds); previewGraph(true);
  }
  function viewDraft(): PlotViewDraft {
    return { expression: mode === 'complex' ? complexInput.value : expression.value,
      xMin: rangeInputs.xMin.value, xMax: rangeInputs.xMax.value, yMin: rangeInputs.yMin.value, yMax: rangeInputs.yMax.value,
      previewed: Boolean(lastPlot), rangeOpen: range.open, home: { ...home } };
  }
  function updateModeUi(): void {
    label.hidden = expression.hidden = presets.hidden = mode === 'complex';
    complexLabel.hidden = complexInput.hidden = complexPresets.hidden = fit.hidden = mode !== 'complex';
    if (mode === 'complex') {
      text(syntaxHint, '输入 a+bi，例如 3+2i、−i、4；每行一个，最多 20 个点。', 'Enter a+bi, such as 3+2i, −i or 4; one per line, up to 20 points.');
      text(note, 'Re 为实轴、Im 为虚轴，两轴每单位长度相同；暂不计算复数表达式。', 'Re is the real axis and Im is the imaginary axis, with equal unit lengths. Complex expressions are not evaluated.');
    } else {
      text(syntaxHint, '用普通写法输入，例如 x^2、2x + 1、sqrt(x)。', 'Use ordinary notation, such as x^2, 2x + 1 or sqrt(x).');
      text(note, '离线绘制单变量函数；三角函数采用弧度，图线为数值近似。', 'Plot a single function offline. Trigonometric functions use radians; curves are numerical approximations.');
    }
    for (const [key, suffix] of [['xMin','min'],['xMax','max'],['yMin','min'],['yMax','max']] as const) {
      const axis = mode === 'complex' ? key.startsWith('x') ? 'Re' : 'Im' : key.startsWith('x') ? 'X' : 'Y';
      text(root.querySelector<HTMLElement>(`[data-range-caption="${key}"]`)!, `${axis} ${suffix === 'min' ? '最小值' : '最大值'}`, `${axis} ${suffix}`);
    }
  }
  kind.addEventListener('change', () => {
    if (destroyed || externalDisabled || inserting) return;
    caches[mode] = viewDraft(); invalidate();
    mode = kind.value === 'complex' ? 'complex' : 'function';
    const cached = caches[mode];
    const defaults = mode === 'complex' ? DEFAULT_COMPLEX_SPEC : DEFAULT_PLOT_SPEC;
    if (mode === 'complex') complexInput.value = cached?.expression ?? '3+2i'; else expression.value = cached?.expression ?? defaults.expression;
    for (const key of ['xMin','xMax','yMin','yMax'] as const) rangeInputs[key].value = cached?.[key] ?? String(defaults[key]);
    home = cached?.home ?? { ...defaults };
    range.open = cached?.rangeOpen ?? false;
    updateModeUi(); refreshDisabled();
    if (cached?.previewed) previewGraph(); else schedulePreview();
  });
  interaction = mountPlotInteraction(preview, {
    getBounds: () => lastPlot?.spec ?? home,
    onChange: bounds => applyBounds(bounds),
  });
  async function insertGraph(): Promise<void> {
    if (destroyed || externalDisabled || inserting || !options.onInsertGraph) return;
    // Always validate the current fields. An explicit click may arrive before
    // the debounced preview, and must never insert an older expression.
    previewGraph();
    if (!lastPlot) return;
    const current = lastPlot;
    inserting = true;
    status.dataset.state = 'inserting';
    text(status, '正在插入图像…', 'Inserting graph…');
    refreshDisabled();
    try {
      await options.onInsertGraph(current.spec, current.svg);
      if (!destroyed) {
        status.dataset.state = 'inserted';
        text(status, '图像已插入笔记。', 'The graph was inserted into the note.');
      }
    } catch (error) {
      if (!destroyed) {
        const message = error instanceof Error ? error.message : '';
        if (message === 'Finish or clear the current equation before inserting a graph.') {
          showError('请先完成或清空当前公式，再插入图像。绘图输入和预览仍保留。',
            'Finish or clear the current equation before inserting a graph. Your graph input and preview are preserved.');
        } else {
          showError('未能插入图像，输入和预览仍保留，请重试。',
            `The graph could not be inserted. Your input and preview are preserved. ${message || 'Try again.'}`);
        }
      }
    } finally {
      inserting = false;
      refreshDisabled();
    }
  }

  updateModeUi(); refreshDisabled();
  if (draft?.previewed) previewGraph();
  return {
    getDraft: () => ({
      ...viewDraft(), mode,
      functionDraft: mode === 'function' ? viewDraft() : caches.function,
      complexDraft: mode === 'complex' ? viewDraft() : caches.complex,
    }),
    setDisabled(value) { externalDisabled = value; if (value) cancelPreview(); refreshDisabled(); },
    destroy() { destroyed = true; cancelPreview(); interaction?.destroy(); root.remove(); },
  };
}
