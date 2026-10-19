import { DEFAULT_PLOT_SPEC, type PlotSpec } from './plot-engine';
import { createGraph } from './graph-render';
import { DEFAULT_SURFACE_SPEC, mountSurfaceInteraction, zoomSurfaceBounds, rotateSurfaceCamera } from './surface-plot';
import { DEFAULT_COMPLEX_SPEC, fitComplexPoints, formatComplex, parseComplexNumbers } from './complex-plane';
import { mountPlotInteraction, validPlotBounds, zoomPlotBounds, type PlotBounds } from './plot-interaction';
import { controlIcon } from './ui-icons';
import { createHtml } from './dom';

export interface PlotViewDraft {
  expression: string;
  xMin: string;
  xMax: string;
  yMin: string;
  yMax: string;
  thetaMin?: string; thetaMax?: string; integralMin?: string; integralMax?: string;
  zMin?: string; zMax?: string; azimuth?: string; elevation?: string;
  calculus?: PlotSpec['calculus'];
  previewed?: boolean;
  rangeOpen?: boolean;
  home?: PlotBounds & Partial<PlotSpec>;
}
export interface PlotDraft extends PlotViewDraft {
  mode?: PlotSpec['mode'];
  functionDraft?: PlotViewDraft;
  complexDraft?: PlotViewDraft;
  polarDraft?: PlotViewDraft;
  surfaceDraft?: PlotViewDraft;
  /** The graph lives below, and derives its expression from, the equation editor. */
  equationLinked?: boolean;
}

interface PlotOptions {
  editing?: boolean;
  initialExpression?: string;
  initialDraft?: PlotDraft;
  onInsertGraph?: (spec: PlotSpec, svg: string) => Promise<void>;
  getCurrentExpression?: () => string;
  getCurrentGraph?: () => Pick<PlotSpec, 'mode' | 'expression'>;
}

type PlotMode = NonNullable<PlotSpec['mode']>;
const EXTRA_KEYS = ['thetaMin', 'thetaMax', 'integralMin', 'integralMax', 'zMin', 'zMax', 'azimuth', 'elevation'] as const;
type ExtraKey = typeof EXTRA_KEYS[number];
const EXTRA_DEFAULTS: Record<ExtraKey, number> = { thetaMin: 0, thetaMax: 2 * Math.PI, integralMin: 0, integralMax: 1, zMin: -2, zMax: 2, azimuth: 45, elevation: 30 };
function modeDefaults(mode: PlotMode): PlotSpec {
  return mode === 'complex' ? DEFAULT_COMPLEX_SPEC : mode === 'surface' ? DEFAULT_SURFACE_SPEC
    : mode === 'polar' ? { mode, expression: '2*sin(3*theta)', xMin: -3, xMax: 3, yMin: -3, yMax: 3, thetaMin: 0, thetaMax: 2*Math.PI } : DEFAULT_PLOT_SPEC;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = ''): HTMLElementTagNameMap[K] {
  const node = createHtml(tag);
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
  'Unsupported polar graph settings.': '极坐标设置无效，请重新打开编辑器。',
  'Calculus overlays are available for function graphs only.': '微积分视图仅适用于单变量函数图像。',
  'Theta bounds must increase, be finite, and span no more than 100π radians.': 'θ 起点须小于终点，均为有效数值，且范围不超过 100π 弧度。',
  'The polar graph is too complex to sample. Simplify it or narrow the theta range.': '极坐标图线过于复杂，请简化公式或缩小 θ 范围。',
  'No finite polar curve is visible in this range. Check the formula or adjust the axes.': '此范围内没有可显示的极坐标图线，请检查公式或调整坐标范围。',
  'The polar graph could not be generated.': '暂时无法生成极坐标图，请检查公式后重试。',
  'Unsupported calculus graph mode.': '微积分视图设置无效，请重新选择。',
  'Integral bounds must be finite increasing numbers within the supported range.': '积分上下限须为支持范围内的有效数值，且下限小于上限。',
  'The integral did not converge within the work limit. Narrow the interval or simplify the formula.': '积分在计算限制内未能收敛，请缩小区间或简化公式。',
  'The integral crosses an undefined or improper domain. Use a finite continuous interval.': '积分区间包含无定义或反常区域，请使用有限且连续的区间。',
  'The integral is outside the finite numerical range.': '积分结果超出有限数值范围。',
  'The calculus graph could not be generated.': '暂时无法生成微积分图像，请检查公式后重试。',
  'Use valid X, Y and Z ranges; the 3D elevation must be between 10 and 80 degrees.': '请填写有效的 X、Y、Z 范围；三维俯仰角须为 10 至 80 度。',
  'The surface is too complex. Simplify the equation or narrow its ranges.': '曲面过于复杂，请简化公式或缩小坐标范围。',
  'The surface is too complex. Simplify the equation before plotting it.': '曲面过于复杂，请简化公式后再绘图。',
  'No finite surface is visible. Check the equation or adjust the X, Y and Z ranges.': '此范围内没有可显示的曲面，请检查公式或调整 X、Y、Z 范围。',
  'The surface could not be generated.': '暂时无法生成曲面，请检查公式后重试。',
};
function plotErrorZh(error: string): string {
  if (error.startsWith('Unknown name. Use ')) return '未知名称。请使用当前图像的变量（x、theta，或 x 和 y）、pi、e 及支持的函数。';
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
  setEquationLinked: (linked: boolean) => void;
  refreshCurrentEquation: () => void;
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
  let equationLinked = Boolean(draft?.equationLinked && (options.getCurrentExpression || options.getCurrentGraph));
  let linkedExpression: string | undefined;
  let mode: PlotMode = draft?.mode ?? 'function';
  const caches: Partial<Record<PlotMode, PlotViewDraft>> = { function: draft?.functionDraft, complex: draft?.complexDraft, polar: draft?.polarDraft, surface: draft?.surfaceDraft };
  const initial = draft ?? { ...DEFAULT_PLOT_SPEC, xMin: '-10', xMax: '10', yMin: '-10', yMax: '10' };
  let home: PlotBounds & Partial<PlotSpec> = draft?.home ?? { ...modeDefaults(mode), ...Object.fromEntries(EXTRA_KEYS.map(key => [key, draft?.[key] !== undefined ? Number(draft[key]) : EXTRA_DEFAULTS[key]])), xMin: Number(initial.xMin), xMax: Number(initial.xMax), yMin: Number(initial.yMin), yMax: Number(initial.yMax) };
  if (!validPlotBounds(home)) home = mode === 'complex' ? { ...DEFAULT_COMPLEX_SPEC } : { ...DEFAULT_PLOT_SPEC };
  let interaction: ReturnType<typeof mountPlotInteraction> | undefined;
  let surfaceInteraction: ReturnType<typeof mountSurfaceInteraction> | undefined;

  const kindLabel = el('label', 'vme-plot-kind-label');
  const kindCaption = el('span');
  text(kindCaption, '图像类型', 'Graph type');
  const kind = el('select', 'vme-conversion-select');
  kind.dataset.testid = 'plot-kind';
  for (const [value, zh, en] of [['function', '函数图像', 'Function graph'], ['complex', '复平面', 'Complex plane'], ['polar', '极坐标', 'Polar graph'], ['surface', '三维曲面', '3D surface']]) {
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
  // Only this UI placeholder is localized; input values remain untouched.
  expression.placeholder = '示例：x^2, sin(x), 1/x';
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
  const examplesLabel = el('p', 'vme-plot-note'); text(examplesLabel, '示例（替换输入）', 'Examples (replace input)');
  const symbolsLabel = el('p', 'vme-plot-note'); text(symbolsLabel, '在光标处插入符号', 'Insert a symbol at the cursor');
  const presets = el('div', 'vme-plot-presets');
  function addPreset(id: string, notation: string, values: Partial<Record<PlotMode, string>>): void {
    const preset = button(`plot-preset-${id}`, notation, notation, () => {
      if (externalDisabled || inserting) return;
      expression.value = values[mode] ?? values.function ?? 'x';
      invalidate(); previewGraph();
    });
    preset.dataset.modes = Object.keys(values).join(' ');
    preset.setAttribute('data-no-i18n', ''); presets.append(preset);
  }
  addPreset('square', 'x²', { function: 'x^2' });
  addPreset('sine', 'sin', { function: 'sin(x)', polar: '2*sin(3*theta)', surface: 'sin(sqrt(x^2+y^2))' });
  addPreset('cosine', 'cos', { function: 'cos(x)', polar: '1+cos(theta)', surface: 'cos(x)*cos(y)' });
  addPreset('tangent', 'tan', { function: 'tan(x)' });
  addPreset('reciprocal', '1/x', { function: '1/x' });
  addPreset('sqrt', '√', { function: 'sqrt(x)', surface: 'sqrt(16-x^2-y^2)' });
  addPreset('circle', 'r = 2', { polar: '2' });
  addPreset('spiral', 'r = θ/3', { polar: 'theta/3' });
  addPreset('bowl', 'z = (x²+y²)/10', { surface: '(x^2+y^2)/10' });
  addPreset('saddle', 'z = (x²−y²)/10', { surface: '(x^2-y^2)/10' });
  const symbols = el('div', 'vme-plot-presets vme-plot-symbols');
  symbols.setAttribute('role', 'group'); symbols.setAttribute('aria-label', '常用符号');
  for (const [id, caption, before, after] of [
    ['pi', 'π', 'pi', ''], ['theta', 'θ', 'theta', ''], ['x', 'x', 'x', ''], ['y', 'y', 'y', ''],
    ['power', '^', '^', ''], ['parentheses', '( )', '(', ')'], ['sin', 'sin( )', 'sin(', ')'],
    ['cos', 'cos( )', 'cos(', ')'], ['tan', 'tan( )', 'tan(', ')'], ['sqrt', '√( )', 'sqrt(', ')'],
    ['ln', 'ln( )', 'ln(', ')'], ['exp', 'e^( )', 'exp(', ')'], ['multiply', '×', '*', ''], ['divide', '÷', '/', ''],
  ]) {
    const item = button(`plot-symbol-${id}`, caption, caption, () => {
      if (externalDisabled || inserting || equationLinked) return;
      const start = expression.selectionStart ?? expression.value.length, end = expression.selectionEnd ?? start;
      const selected = expression.value.slice(start, end);
      expression.setRangeText(before + selected + after, start, end, 'end');
      expression.focus();
      if (after && !selected) expression.setSelectionRange(start + before.length, start + before.length);
      invalidate(); schedulePreview();
    });
    item.setAttribute('data-no-i18n', ''); symbols.append(item);
  }
  const useCurrent = button('plot-use-current', '使用当前公式', 'Use current equation', () => {
    if (destroyed || externalDisabled || inserting || !(options.getCurrentExpression || options.getCurrentGraph)) return;
    invalidate();
    try {
      const graph = options.getCurrentGraph?.();
      const value = graph?.expression ?? options.getCurrentExpression!();
      if (graph?.mode && graph.mode !== mode) { caches[mode] = viewDraft(); mode = graph.mode; kind.value = mode; restoreMode(); }
      expression.value = value;
      invalidate();
      previewGraph();
    } catch (error) {
      showError('当前公式暂不能转换为单变量函数。请在此输入 y = f(x) 形式。',
        `This equation cannot be converted to a single function. Enter y = f(x) here. ${error instanceof Error ? error.message : ''}`);
    }
  });
  useCurrent.hidden = !(options.getCurrentExpression || options.getCurrentGraph);
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
  const linkedHint = el('p', 'vme-plot-note vme-plot-linked-hint');
  text(linkedHint, '图像与上方公式同步；直接修改公式即可更新。', 'The graph follows the equation above. Edit the equation to update it.');
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
  const calculusLabel = el('label', 'vme-plot-kind-label');
  const calculusCaption = el('span'); text(calculusCaption, '微积分视图', 'Calculus view');
  const calculus = el('select', 'vme-conversion-select'); calculus.dataset.testid = 'plot-calculus';
  for (const [value, zh, en] of [['none', '原始函数', 'Original function'], ['derivative', '一阶导数 d/dx', 'First derivative d/dx'], ['second-derivative', '二阶导数 d²/dx²', 'Second derivative d²/dx²'], ['integral', '定积分与面积 ∫', 'Definite integral and area ∫']]) {
    const item = el('option'); item.value = value; text(item, zh, en); calculus.append(item);
  }
  calculus.value = draft?.calculus ?? 'none'; calculusLabel.append(calculusCaption, calculus);
  const extraGrid = el('div', 'vme-plot-range-grid');
  const extraInputs = {} as Record<ExtraKey, HTMLInputElement>;
  const extraWrappers = {} as Record<ExtraKey, HTMLElement>;
  for (const [key, zh, en] of [
    ['thetaMin', 'θ 起点（弧度）', 'θ start (radians)'], ['thetaMax', 'θ 终点（弧度）', 'θ end (radians)'],
    ['integralMin', '积分下限 a', 'Lower limit a'], ['integralMax', '积分上限 b', 'Upper limit b'],
    ['zMin', 'Z 最小值', 'Z min'], ['zMax', 'Z 最大值', 'Z max'],
    ['azimuth', '水平旋转（度）', 'Azimuth (degrees)'], ['elevation', '俯仰角（度）', 'Elevation (degrees)'],
  ] as const) {
    const control = el('label', 'vme-plot-range-control'); const caption = el('span'); text(caption, zh, en);
    const input = el('input', 'vme-plot-range-input'); input.type = 'text'; input.inputMode = 'decimal';
    input.spellcheck = false; input.dataset.testid = `plot-${key}`;
    input.value = draft?.[key] ?? String(EXTRA_DEFAULTS[key]);
    extraInputs[key] = input; extraWrappers[key] = control; control.append(caption, input); extraGrid.append(control);
  }
  calculus.addEventListener('change', () => { updateModeUi(); invalidate(); schedulePreview(); });
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
  const zoomIn = button('plot-zoom-in', '放大', 'Zoom in', () => { if (lastPlot) { interaction?.setDisabled(true); mode === 'surface' ? applySurface(zoomSurfaceBounds(lastPlot.spec, 0.8)) : applyBounds(zoomPlotBounds(lastPlot.spec, 0.8)); } });
  const zoomOut = button('plot-zoom-out', '缩小', 'Zoom out', () => { if (lastPlot) { interaction?.setDisabled(true); mode === 'surface' ? applySurface(zoomSurfaceBounds(lastPlot.spec, 1.25)) : applyBounds(zoomPlotBounds(lastPlot.spec, 1.25)); } });
  const reset = button('plot-reset-view', '重置视图', 'Reset view', () => { interaction?.setDisabled(true); surfaceInteraction?.setDisabled(true); if (mode === 'surface') { for (const key of ['zMin','zMax','azimuth','elevation'] as const) extraInputs[key].value = String(home[key] ?? EXTRA_DEFAULTS[key]); } applyBounds(home); });
  const fit = button('complex-fit', '适应所有点', 'Fit all points', () => {
    if (externalDisabled || inserting) return;
    interaction?.setDisabled(true);
    const parsed = parseComplexNumbers(complexInput.value);
    if (!parsed.ok) { showError(plotErrorZh(parsed.error), parsed.error); refreshDisabled(); return; }
    setBounds(fitComplexPoints(parsed.points)); previewGraph();
  });
  const rotateLeft = button('plot-rotate-left', '向左旋转', 'Rotate left', () => { if (lastPlot) applySurface(rotateSurfaceCamera(lastPlot.spec, -15, 0)); });
  const rotateRight = button('plot-rotate-right', '向右旋转', 'Rotate right', () => { if (lastPlot) applySurface(rotateSurfaceCamera(lastPlot.spec, 15, 0)); });
  navigation.append(zoomIn, zoomOut, reset, fit, rotateLeft, rotateRight);
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
  body.append(linkedHint, kindLabel, label, expression, complexLabel, complexInput, examplesLabel, presets, symbolsLabel, symbols, complexPresets, syntaxHint, calculusLabel, extraGrid, range, actions, status, navigation, gestureHint, preview, pointList, note, previewOnly);
  const inputs = [expression, complexInput, ...Object.values(rangeInputs), ...Object.values(extraInputs)];
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
    surfaceInteraction?.setDisabled(true);
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
    kind.disabled = calculus.disabled = busy;
    for (const input of inputs) input.disabled = busy;
    for (const preset of Array.from(root.querySelectorAll<HTMLButtonElement>('.vme-plot-presets button'))) preset.disabled = busy;
    for (const preset of Array.from(complexPresets.querySelectorAll<HTMLButtonElement>('button'))) preset.disabled = busy;
    previewButton.disabled = busy;
    insertButton.disabled = busy || !options.onInsertGraph || (!lastPlot && !pendingInput);
    zoomIn.disabled = zoomOut.disabled = busy || !lastPlot;
    reset.disabled = fit.disabled = busy;
    rotateLeft.disabled = rotateRight.disabled = busy || !lastPlot;
    interaction?.setDisabled(busy || !lastPlot || mode === 'surface');
    surfaceInteraction?.setDisabled(busy || !lastPlot || mode !== 'surface');
    preview.classList.toggle('vme-plot-enabled', !busy && Boolean(lastPlot));
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
  function buildSpec(bounds?: PlotBounds): PlotSpec {
    const numeric = (input: HTMLInputElement): number => input.value.trim() ? Number(input.value) : NaN;
    const xy = bounds ?? Object.fromEntries(Object.entries(rangeInputs).map(([key, input]) => [key, numeric(input)])) as unknown as PlotBounds;
    const spec: PlotSpec = { ...(mode === 'function' ? {} : { mode }), expression: mode === 'complex' ? complexInput.value : expression.value, ...xy };
    if (mode === 'polar') { spec.thetaMin = numeric(extraInputs.thetaMin); spec.thetaMax = numeric(extraInputs.thetaMax); }
    if (mode === 'surface') for (const key of ['zMin','zMax','azimuth','elevation'] as const) spec[key] = numeric(extraInputs[key]);
    if (mode === 'function' && calculus.value !== 'none') {
      spec.calculus = calculus.value as PlotSpec['calculus'];
      if (calculus.value === 'integral') { spec.integralMin = numeric(extraInputs.integralMin); spec.integralMax = numeric(extraInputs.integralMax); }
    }
    return spec;
  }
  function applySurface(spec: PlotSpec | undefined, preserveGesture = false): void {
    if (!spec || destroyed || externalDisabled || inserting) return;
    if (!preserveGesture) surfaceInteraction?.setDisabled(true);
    for (const key of ['zMin','zMax','azimuth','elevation'] as const) extraInputs[key].value = String(spec[key]);
    setBounds(spec); previewGraph(preserveGesture);
  }
  function previewGraph(preserveGesture = false): void {
    if (destroyed || externalDisabled || inserting) return;
    cancelPreview();
    pendingInput = false;
    if (!preserveGesture) { interaction?.setDisabled(true); surfaceInteraction?.setDisabled(true); }
    lastPlot = undefined;
    pointList.replaceChildren(); pointList.hidden = true;
    if (equationLinked && !readCurrentEquation()) return;
    const result = createGraph(buildSpec());
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
    if (equationLinked) text(status, '图像已就绪。点击插入公式与图像加入笔记。', 'The graph is ready. Choose Insert equation and graph to add both to the note.');
    if ('visibleCount' in result) text(status, `视图内 ${result.visibleCount} / ${result.points.length} 个点。点击保存才写入笔记。`, `${result.visibleCount} / ${result.points.length} points visible. Save to update the note.`);
    refreshDisabled();
  }

  function setBounds(bounds: PlotBounds): void {
    for (const key of ['xMin', 'xMax', 'yMin', 'yMax'] as const) rangeInputs[key].value = String(bounds[key]);
  }
  function applyBounds(bounds: PlotBounds | undefined): void {
    if (!bounds || destroyed || externalDisabled || inserting) { refreshDisabled(); return; }
    const result = createGraph(buildSpec(bounds));
    if (!result.ok) { showError(plotErrorZh(result.error), result.error); refreshDisabled(); return; }
    setBounds(bounds); previewGraph(true);
  }
  function viewDraft(): PlotViewDraft {
    return { expression: mode === 'complex' ? complexInput.value : expression.value,
      xMin: rangeInputs.xMin.value, xMax: rangeInputs.xMax.value, yMin: rangeInputs.yMin.value, yMax: rangeInputs.yMax.value,
      ...Object.fromEntries(EXTRA_KEYS.map(key => [key, extraInputs[key].value])), calculus: calculus.value as PlotSpec['calculus'],
      previewed: Boolean(lastPlot), rangeOpen: range.open, home: { ...home } };
  }
  function updateModeUi(): void {
    root.dataset.equationLinked = String(equationLinked);
    kindLabel.hidden = equationLinked;
    linkedHint.hidden = !equationLinked;
    label.hidden = expression.hidden = presets.hidden = equationLinked || mode === 'complex';
    complexLabel.hidden = complexInput.hidden = complexPresets.hidden = fit.hidden = mode !== 'complex';
    syntaxHint.hidden = equationLinked;
    examplesLabel.hidden = symbolsLabel.hidden = symbols.hidden = equationLinked || mode === 'complex';
    calculusLabel.hidden = mode !== 'function';
    rotateLeft.hidden = rotateRight.hidden = mode !== 'surface';
    for (const key of EXTRA_KEYS) extraWrappers[key].hidden = key.startsWith('theta') ? mode !== 'polar' : key.startsWith('integral') ? mode !== 'function' || calculus.value !== 'integral' : mode !== 'surface';
    for (const id of ['x','y','theta']) { const item = symbols.querySelector<HTMLButtonElement>(`[data-action="plot-symbol-${id}"]`)!; item.hidden = id === 'theta' ? mode !== 'polar' : id === 'y' ? mode !== 'surface' : mode === 'polar'; }
    for (const preset of Array.from(presets.querySelectorAll<HTMLButtonElement>('[data-modes]'))) preset.hidden = !preset.dataset.modes!.split(' ').includes(mode);
    text(label, mode === 'polar' ? '极径 r = f(θ)' : mode === 'surface' ? '曲面 z = f(x,y)' : '函数 y = f(x)', mode === 'polar' ? 'Radius r = f(θ)' : mode === 'surface' ? 'Surface z = f(x,y)' : 'Function y = f(x)');
    const insertCaption = insertButton.querySelector<HTMLElement>('span')!;
    text(insertCaption,
      equationLinked ? '插入公式与图像' : options.editing ? '保存图像' : '插入图像',
      equationLinked ? 'Insert equation and graph' : options.editing ? 'Save graph' : 'Insert graph');
    if (mode === 'complex') {
      text(syntaxHint, '输入 a+bi，例如 3+2i、−i、4；每行一个，最多 20 个点。', 'Enter a+bi, such as 3+2i, −i or 4; one per line, up to 20 points.');
      text(note, 'Re 为实轴、Im 为虚轴，两轴每单位长度相同；暂不计算复数表达式。', 'Re is the real axis and Im is the imaginary axis, with equal unit lengths. Complex expressions are not evaluated.');
    } else {
      text(syntaxHint, '用普通写法输入，例如 x^2、2x + 1、sqrt(x)。', 'Use ordinary notation, such as x^2, 2x + 1 or sqrt(x).');
      text(note, '离线绘制单变量函数；三角函数采用弧度，图线为数值近似。', 'Plot a single function offline. Trigonometric functions use radians; curves are numerical approximations.');
    }
    if (mode === 'polar') {
      text(syntaxHint, '输入极径，例如 2*sin(3*theta)。θ 使用弧度。', 'Enter a radius, for example 2*sin(3*theta). θ uses radians.');
      text(note, '极坐标采用等比例 X/Y 轴；负极径会反向绘制。图线为数值近似。', 'Polar graphs use equal X/Y units. Negative radii reverse direction. Curves are numerical approximations.');
    }
    if (mode === 'surface') {
      text(syntaxHint, '输入 z=f(x,y)，例如 sin(sqrt(x^2+y^2))。', 'Enter z=f(x,y), for example sin(sqrt(x^2+y^2)).');
      text(gestureHint, '在曲面内拖动旋转，滚轮缩放；插入或保存才写入笔记。', 'Drag the surface to rotate; scroll to zoom. Insert or save to update the note.');
      text(note, '三维曲面为有界网格数值近似；不支持隐式曲面或符号求解。', '3D surfaces use a bounded numerical mesh. Implicit surfaces and symbolic solving are not supported.');
    } else text(gestureHint, '输入后自动预览；在图内拖动或滚轮缩放。点击插入或保存才写入笔记，也可按 Ctrl+Enter。', 'Preview updates as you type. Drag or scroll inside the graph. Insert or save to update the note; Ctrl+Enter also works.');
    if (mode === 'function' && calculus.value !== 'none') text(note, '导数和定积分采用数值近似，不是符号计算；间断点附近可能省略曲线。', 'Derivatives and definite integrals are numerical approximations, not symbolic calculations. Curves may be omitted near discontinuities.');
    for (const [key, suffix] of [['xMin','min'],['xMax','max'],['yMin','min'],['yMax','max']] as const) {
      const axis = mode === 'complex' ? key.startsWith('x') ? 'Re' : 'Im' : key.startsWith('x') ? 'X' : 'Y';
      text(root.querySelector<HTMLElement>(`[data-range-caption="${key}"]`)!, `${axis} ${suffix === 'min' ? '最小值' : '最大值'}`, `${axis} ${suffix}`);
    }
  }
  function restoreMode(): void {
    const cached = caches[mode], defaults = modeDefaults(mode);
    if (mode === 'complex') complexInput.value = cached?.expression ?? defaults.expression; else expression.value = cached?.expression ?? defaults.expression;
    for (const key of ['xMin','xMax','yMin','yMax'] as const) rangeInputs[key].value = cached?.[key] ?? String(defaults[key]);
    for (const key of EXTRA_KEYS) extraInputs[key].value = cached?.[key] ?? String(defaults[key] ?? EXTRA_DEFAULTS[key]);
    calculus.value = cached?.calculus ?? 'none';
    home = cached?.home ?? { ...defaults }; range.open = cached?.rangeOpen ?? false;
    updateModeUi();
  }
  kind.addEventListener('change', () => {
    if (destroyed || externalDisabled || inserting || equationLinked) return;
    caches[mode] = viewDraft(); invalidate();
    mode = kind.value as PlotMode;
    const cached = caches[mode];
    restoreMode();
    updateModeUi(); refreshDisabled();
    if (cached?.previewed) previewGraph(); else schedulePreview();
  });
  interaction = mountPlotInteraction(preview, {
    getBounds: () => lastPlot?.spec ?? home,
    onChange: bounds => applyBounds(bounds),
  });
  surfaceInteraction = mountSurfaceInteraction(preview, { getSpec: () => lastPlot?.spec ?? buildSpec(), onChange: spec => applySurface(spec, true) });
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
        } else if (message === 'The equation changed. Preview the graph again.') {
          invalidate();
          showError('公式已修改，请重新预览后插入。', 'The equation changed. Preview the graph again.');
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

  function readCurrentEquation(): boolean {
    try {
      const graph = options.getCurrentGraph?.();
      if (graph && (graph.mode ?? 'function') !== mode) { caches[mode] = viewDraft(); mode = graph.mode ?? 'function'; kind.value = mode; restoreMode(); }
      expression.value = graph?.expression ?? options.getCurrentExpression!();
      linkedExpression = expression.value;
      return true;
    } catch {
      linkedExpression = undefined;
      lastPlot = undefined;
      preview.replaceChildren(); preview.hidden = true;
      interaction?.setDisabled(true);
      showError('此公式暂不能绘图。支持 y=f(x)、r=f(theta) 或 z=f(x,y)；不支持隐式方程。请在上方修改公式。',
        'This equation cannot be graphed yet. Use y=f(x), r=f(theta), or z=f(x,y). Implicit equations are not supported. Edit the equation above.');
      return false;
    }
  }

  function refreshCurrentEquation(): void {
    if (!equationLinked || destroyed || inserting) return;
    const previous = linkedExpression, previousMode = mode;
    if (!readCurrentEquation()) { cancelPreview(); return; }
    if (previousMode === mode && previous === linkedExpression && (lastPlot || pendingInput)) return;
    invalidate();
    if (!externalDisabled) schedulePreview();
  }

  function setEquationLinked(linked: boolean): void {
    if (destroyed || externalDisabled || inserting) return;
    const next = linked && Boolean(options.getCurrentExpression || options.getCurrentGraph);
    // Opening an existing standalone graph must keep its restored preview and
    // gesture state. Subject initialization also calls this with false.
    if (next === equationLinked) {
      if (next) refreshCurrentEquation();
      return;
    }
    equationLinked = next;
    if (equationLinked && mode !== 'function') {
      caches[mode] = viewDraft();
      mode = 'function'; kind.value = mode;
      const cached = caches.function;
      for (const key of ['xMin', 'xMax', 'yMin', 'yMax'] as const) rangeInputs[key].value = cached?.[key] ?? String(DEFAULT_PLOT_SPEC[key]);
      home = cached?.home ?? { ...DEFAULT_PLOT_SPEC };
      range.open = cached?.rangeOpen ?? false;
    }
    linkedExpression = undefined;
    updateModeUi(); invalidate();
    if (equationLinked) previewGraph();
    else schedulePreview();
  }

  updateModeUi(); refreshDisabled();
  if (draft?.previewed) previewGraph();
  return {
    getDraft: () => ({
      ...viewDraft(), mode, equationLinked,
      functionDraft: mode === 'function' ? viewDraft() : caches.function,
      complexDraft: mode === 'complex' ? viewDraft() : caches.complex,
      polarDraft: mode === 'polar' ? viewDraft() : caches.polar,
      surfaceDraft: mode === 'surface' ? viewDraft() : caches.surface,
    }),
    setDisabled(value) { externalDisabled = value; if (value) cancelPreview(); refreshDisabled(); },
    setEquationLinked,
    refreshCurrentEquation,
    destroy() { destroyed = true; cancelPreview(); interaction?.destroy(); surfaceInteraction?.destroy(); root.remove(); },
  };
}
