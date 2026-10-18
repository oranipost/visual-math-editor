import { mountEditor, type EditorMode, type EditorDraft } from "../src/editor-ui";
import { configureMathLive, createPreview } from "../src/math-runtime";
import { CHEMISTRY_TEMPLATES, UNIT_PRESETS, PHYSICS_TEMPLATES } from "../src/science-data";
import { UNIT_CATEGORIES } from "../src/unit-conversion";
import { mountPlotTools, type PlotDraft } from "../src/plot-ui";
import { localizeEditor } from "../src/i18n";
import type { PlotSpec } from "../src/plot-engine";
import { createComplexPlot, DEFAULT_COMPLEX_SPEC, fitComplexPoints, parseComplexNumbers } from "../src/complex-plane";
import { mountPlotInteraction, type PlotBounds } from "../src/plot-interaction";

configureMathLive();
const host = document.getElementById("editor")!;
const result = document.getElementById("result")!;
let mounted: ReturnType<typeof mountEditor> | undefined;
let saved = "";
function open(latex?: string, initialMode: EditorMode = "visual", display = true, compact = false, scienceDraft?: EditorDraft['science']) {
  mounted?.destroy();
  mounted = mountEditor(host, {
    latex, editing: latex !== undefined, display, initialMode, compact, scienceDraft, language: 'zh',
    onSave: value => { saved = value; result.textContent = "已保存到本次测试内存；点击“新建公式”可继续测试。\n保存、再打开测试成功。"; open(value); },
    onCancel: () => { mounted?.destroy(); result.textContent = "已取消，未保存。"; },
  });
}

async function checkPlotTools(check: (condition: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div');
  fixture.className = 'vme-editor';
  document.body.append(fixture);
  let graph: ReturnType<typeof mountPlotTools> | undefined;
  let localization: ReturnType<typeof localizeEditor> | undefined;
  let written: PlotSpec | undefined;
  let writes = 0;
  let rejectSave = false;
  let equation = 'x^2';
  const initialFormula = mounted!.getDraft().latex;
  const show = (draft?: PlotDraft) => {
    localization?.destroy(); graph?.destroy();
    graph = mountPlotTools(fixture, {
      initialDraft: draft,
      getCurrentExpression: () => { if (equation === 'unsupported') throw new Error('Unsupported current equation'); return equation; },
      onInsertGraph: async spec => { if (rejectSave) throw new Error('The note changed. Reopen it to save.'); written = spec; writes++; },
    });
    localization = localizeEditor(fixture, 'en');
  };
  const button = (action: string) => fixture.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
  const input = (id: string, value: string) => {
    const field = fixture.querySelector<HTMLInputElement>(`[data-testid="plot-${id}"]`)!;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    return field;
  };
  const status = () => fixture.querySelector<HTMLElement>('[data-testid="plot-status"]')!;
  const svg = () => fixture.querySelector<SVGElement>('[data-testid="plot-preview"] svg');
  const settle = async () => { await Promise.resolve(); await new Promise(resolve => setTimeout(resolve, 0)); };
  try {
    show();
    check(!button('plot-insert').disabled && writes === 0 && !svg(), '绘图初始不写笔记，用户可以直接插入并同步验证当前输入');
    button('plot-preset-square').click();
    await settle();
    check(svg() !== null && !button('plot-insert').disabled && graph!.getDraft().expression === 'x^2', '平方函数示例生成曲线并允许明确插入');
    check(writes === 0 && mounted!.getDraft().latex === initialFormula, '绘图预览与示例不改数学公式或笔记');
    input('expression', 'y = 2x + 1');
    check(!svg() && !button('plot-insert').disabled && graph!.getDraft().expression === 'y = 2x + 1', '修改函数立即移除过时曲线，插入操作可同步验证最新输入');
    const functionInput = fixture.querySelector<HTMLInputElement>('[data-testid="plot-expression"]')!;
    functionInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle();
    check(svg() !== null && !button('plot-insert').disabled, '函数输入框按 Enter 可预览普通 y=f(x) 写法');
    button('plot-insert').click();
    await settle();
    check(writes === 1 && written?.expression === '2x + 1' && written.xMin === -10 && written.xMax === 10, '明确插入才提交函数与坐标范围');
    input('xMin', '-3'); input('xMax', '3'); input('yMin', '-2'); input('yMax', '8');
    check(!svg() && graph!.getDraft().xMin === '-3' && graph!.getDraft().yMax === '8', '修改任一坐标范围立即移除旧预览，保留所有新范围草稿');
    button('plot-preview').click(); await settle();
    button('plot-insert').click(); await settle();
    check(writes === 2 && written?.xMin === -3 && written.xMax === 3 && written.yMin === -2 && written.yMax === 8, '重新预览后提交用户设置的四个坐标边界');
    input('expression', 'fetch("https://example.invalid")');
    button('plot-preview').click(); await settle();
    check(!svg() && button('plot-insert').disabled && status().dataset.state === 'error' && graph!.getDraft().expression.includes('fetch'), '不支持的表达式保留原输入，显示错误并阻止绘图插入');
    check(!/[\u4e00-\u9fff]/.test(status().textContent ?? '') && writes === 2, '英文绘图错误保持英文，不执行或保存输入');
    input('expression', 'sqrt(x)'); input('xMin', '');
    button('plot-preview').click(); await settle();
    check(!svg() && button('plot-insert').disabled, '空坐标边界不会被解释为零');
    input('xMin', '3'); input('xMax', '-3');
    button('plot-preview').click(); await settle();
    check(!svg() && button('plot-insert').disabled && graph!.getDraft().xMax === '-3', '反向坐标范围保留输入并阻止提交');
    input('xMin', '-3'); input('xMax', '3'); input('expression', '1/x');
    button('plot-preview').click(); await settle();
    check(svg() !== null && !button('plot-insert').disabled, '修正输入后可恢复有效预览和插入');
    fixture.querySelector<HTMLDetailsElement>('.vme-plot-range')!.open = true;
    const graphDraft = graph!.getDraft();
    show(graphDraft); await settle();
    check(svg() !== null && graph!.getDraft().expression === '1/x' && graph!.getDraft().xMin === '-3' && graph!.getDraft().previewed === true && fixture.querySelector<HTMLDetailsElement>('.vme-plot-range')!.open, '绘图重挂载保留函数、范围面板状态并重建已确认预览');
    const beforeRejected = graph!.getDraft();
    rejectSave = true; button('plot-insert').click(); await settle();
    check(writes === 2 && svg() !== null && !button('plot-insert').disabled && graph!.getDraft().expression === beforeRejected.expression && status().dataset.state === 'error', '笔记保存被拒绝时保留绘图草稿和预览，允许修复后重试');
    rejectSave = false;
    graph!.setDisabled(true);
    check(Array.from(fixture.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement>('input,textarea,select,button')).every(control => control.disabled), '提交期间绘图控件统一禁用，避免重复操作');
    graph!.setDisabled(false);
    check(!button('plot-preview').disabled && !button('plot-insert').disabled, '解除禁用后有效绘图仍可保存');
    equation = 'sin(x)'; button('plot-use-current').click(); await settle();
    check(graph!.getDraft().expression === 'sin(x)' && svg() !== null && writes === 2, '使用当前公式只生成绘图预览，不自动保存');
    equation = 'unsupported'; button('plot-use-current').click(); await settle();
    check(status().dataset.state === 'error' && button('plot-insert').disabled && !svg(), '无法转换当前公式时清除过时曲线，避免误插入旧结果');
    const restored: PlotDraft = { expression: 'x^2', xMin: '-5', xMax: '5', yMin: '-1', yMax: '10', previewed: false };
    show(restored); await settle();
    check(!svg() && !button('plot-insert').disabled && graph!.getDraft().xMin === '-5' && writes === 2, '尚未预览的恢复草稿保留范围，需明确插入才会验证并写入');
    check(mounted!.getDraft().latex === initialFormula && writes === 2, '所有独立绘图编辑、错误与恢复流程保持数学草稿原文');
  } finally {
    localization?.destroy(); graph?.destroy(); fixture.remove();
  }
}

async function checkComplexTools(check: (condition: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div');
  fixture.className = 'vme-editor'; document.body.append(fixture);
  let tools: ReturnType<typeof mountPlotTools> | undefined;
  let localization: ReturnType<typeof localizeEditor> | undefined;
  let writes = 0, rejectSave = false;
  let written: PlotSpec | undefined;
  const originalMath = mounted!.getDraft().latex;
  const show = (draft?: PlotDraft) => {
    localization?.destroy(); tools?.destroy();
    tools = mountPlotTools(fixture, { initialDraft: draft,
      onInsertGraph: async spec => { if (rejectSave) throw new Error('The note changed.'); written = spec; writes++; } });
    localization = localizeEditor(fixture, 'en');
  };
  const button = (action: string) => fixture.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
  const input = (id: string, value: string) => {
    const control = fixture.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-testid="${id}"]`)!;
    control.value = value; control.dispatchEvent(new Event('input', { bubbles: true })); return control;
  };
  const kind = () => fixture.querySelector<HTMLSelectElement>('[data-testid="plot-kind"]')!;
  const switchTo = (mode: 'function' | 'complex') => { kind().value = mode; kind().dispatchEvent(new Event('change', { bubbles: true })); };
  const svg = () => fixture.querySelector<SVGElement>('[data-testid="plot-preview"] svg');
  const status = () => fixture.querySelector<HTMLElement>('[data-testid="plot-status"]')!;
  const settle = async () => { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); await new Promise(resolve => setTimeout(resolve, 0)); };
  try {
    show({ expression: '2x+1', xMin: '-4', xMax: '4', yMin: '-6', yMax: '6', previewed: true }); await settle();
    check(kind().value === 'function' && svg() !== null, '旧版无 mode 的绘图草稿仍按函数图像恢复');
    switchTo('complex'); await settle();
    check(tools!.getDraft().mode === 'complex' && !fixture.querySelector<HTMLTextAreaElement>('[data-testid="complex-points"]')!.hidden && fixture.querySelector<HTMLInputElement>('[data-testid="plot-expression"]')!.hidden, '选择复平面后只显示复数输入，函数输入保留在草稿中');
    check(!svg() && !button('plot-insert').disabled && writes === 0, '首次切到复平面不写入默认点，明确插入可验证当前复数');
    const complex = input('complex-points', '3+2i\n-i\n4');
    complex.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    check(!svg() && writes === 0, '复数多行输入框的 Enter 不触发插入或偷改多行输入');
    button('plot-preview').click(); await settle();
    check(fixture.querySelectorAll('[data-complex-point]').length === 3 && fixture.querySelectorAll('[data-testid="complex-point-list"] li').length === 3, '复平面预览同时显示三个点与完整数值列表');
    check(svg()?.querySelector('[data-axis-label="Re"]')?.textContent === 'Re' && svg()?.querySelector('[data-axis-label="Im"]')?.textContent === 'Im', '复平面工具预览使用 Re 与 Im 轴名');
    check(writes === 0 && mounted!.getDraft().latex === originalMath, '复数输入、模式切换和预览不改数学公式或笔记');
    input('plot-xMin', '-1'); input('plot-xMax', '1'); input('plot-yMin', '-1'); input('plot-yMax', '1');
    button('plot-preview').click(); await settle();
    check(fixture.querySelectorAll('[data-complex-point]').length === 1 && status().textContent?.includes('1 / 3') === true && !button('complex-fit').disabled, '视野外的点计数明确，仍能使用适应所有点');
    button('complex-fit').click(); await settle();
    check(fixture.querySelectorAll('[data-complex-point]').length === 3 && tools!.getDraft().xMin !== '-1' && writes === 0, '适应所有点恢复全部复数，只更改视野草稿');
    const fitted = tools!.getDraft();
    const span = Number(fitted.xMax) - Number(fitted.xMin);
    button('plot-zoom-in').click(); await settle();
    check(Number(tools!.getDraft().xMax) - Number(tools!.getDraft().xMin) < span && writes === 0 && tools!.getDraft().expression === '3+2i\n-i\n4', '缩放按钮改变范围但保留复数原文，未保存前不写笔记');
    button('plot-zoom-out').click(); await settle();
    check(Math.abs(Number(tools!.getDraft().xMax) - Number(tools!.getDraft().xMin) - span) < 1e-8, '放大后缩小可返回同一跨度');
    button('plot-reset-view').click(); await settle();
    check(tools!.getDraft().xMin === '-5' && tools!.getDraft().xMax === '5' && tools!.getDraft().yMin === '-5' && tools!.getDraft().yMax === '5', '重置视图恢复复平面的起始范围');
    const frame = svg()!.querySelector<SVGGraphicsElement>('[data-plot-frame]')!.getBoundingClientRect();
    const wheel = new WheelEvent('wheel', { clientX: frame.left + frame.width / 2, clientY: frame.top + frame.height / 2, deltaY: -60, bubbles: true, cancelable: true });
    fixture.querySelector('[data-testid="plot-preview"]')!.dispatchEvent(wheel); await settle();
    check(wheel.defaultPrevented && Number(tools!.getDraft().xMax) - Number(tools!.getDraft().xMin) < 10 && writes === 0, '复平面内滚轮缩放更新范围草稿和 SVG，不自动保存');
    switchTo('function'); await settle();
    check(tools!.getDraft().expression === '2x+1' && tools!.getDraft().xMin === '-4' && tools!.getDraft().yMax === '6' && svg() !== null, '切回函数图像恢复其独立表达式、范围与已确认预览');
    input('plot-expression', 'x^3'); switchTo('complex'); await settle();
    check(tools!.getDraft().expression === '3+2i\n-i\n4' && svg() !== null && Number(tools!.getDraft().xMax) < 5, '再次切回复平面恢复复数、缩放后的范围与预览');
    const retained = tools!.getDraft(); show(retained); await settle();
    check(kind().value === 'complex' && tools!.getDraft().expression === retained.expression && tools!.getDraft().xMax === retained.xMax && svg() !== null, '组件重挂载保留复平面模式、复数和交互后的视野');
    switchTo('function'); await settle();
    check(tools!.getDraft().expression === 'x^3' && !svg() && !button('plot-insert').disabled, '重挂载后另一模式的最新修改仍保留，旧图不会复活且允许明确验证插入');
    switchTo('complex'); await settle();
    input('complex-points', '3+2j'); button('plot-preview').click(); await settle();
    check(!svg() && button('plot-insert').disabled && tools!.getDraft().expression === '3+2j' && status().dataset.state === 'error', '无效复数保留原输入并清除过时图像，阻止误插入');
    check(!/[\u4e00-\u9fff]/.test(status().textContent ?? ''), '英文复数错误保持英文');
    input('complex-points', '3+2i\n-i\n4'); button('complex-fit').click(); await settle();
    check(svg() !== null && !button('plot-insert').disabled, '无效输入修复后可用适应所有点直接恢复预览');
    localization!.setLanguage('zh'); await settle();
    check(kind().selectedOptions[0]?.textContent === '复平面' && tools!.getDraft().expression === '3+2i\n-i\n4', '复平面模式切中文时保留复数原文');
    rejectSave = true; button('plot-insert').click(); await settle();
    check(writes === 0 && svg() !== null && status().dataset.state === 'error' && !button('plot-insert').disabled, '复平面保存被拒绝时保留复数和预览并允许重试');
    rejectSave = false; button('plot-insert').click(); await settle();
    check(writes === 1 && written?.mode === 'complex' && written.expression === '3+2i\n-i\n4', '明确插入才提交复平面模式、复数和当前范围');
    tools!.setDisabled(true);
    check(Array.from(fixture.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement>('input,textarea,select,button')).every(node => node.disabled), '复平面保存期间输入、类型、示例与导航控件全部禁用');
    tools!.setDisabled(false);
    check(!button('plot-insert').disabled && writes === 1 && mounted!.getDraft().latex === originalMath, '保存后工具可继续操作，所有复平面流程不改数学草稿');
  } finally { localization?.destroy(); tools?.destroy(); fixture.remove(); }
}

async function checkAutomaticPlotPreview(check: (condition: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div');
  fixture.className = 'vme-editor'; document.body.append(fixture);
  let tools: ReturnType<typeof mountPlotTools> | undefined;
  let writes = 0;
  let written: PlotSpec | undefined;
  const show = (draft?: PlotDraft) => {
    tools?.destroy();
    tools = mountPlotTools(fixture, { initialDraft: draft, onInsertGraph: async spec => { written = spec; writes++; } });
  };
  const button = (action: string) => fixture.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
  const input = (id: string, value: string) => {
    const control = fixture.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-testid="${id}"]`)!;
    control.value = value; control.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const svg = () => fixture.querySelector<SVGElement>('[data-testid="plot-preview"] svg');
  const wait = (milliseconds = 330) => new Promise(resolve => setTimeout(resolve, milliseconds));
  const settle = async () => { await Promise.resolve(); await wait(0); };
  const defaults: PlotDraft = { expression: 'x^2', xMin: '-5', xMax: '5', yMin: '-5', yMax: '5' };
  try {
    show(defaults);
    button('plot-insert').click(); await settle();
    check(writes === 1 && written?.expression === 'x^2', '未点预览也能直接插入有效函数，只有一次明确写入');
    show(defaults); input('plot-expression', 'x^3');
    check(!svg() && writes === 1, '函数输入立即清除过时图像，自动预览计时阶段不写笔记');
    await wait();
    check(svg() !== null && tools!.getDraft().previewed === true && writes === 1, '短暂停顿后自动生成有效预览，仍不写笔记');
    input('plot-expression', 'x^2'); await wait(90); input('plot-expression', '2x+1'); await wait(90); input('plot-expression', 'sin(x)');
    await wait();
    check(svg() !== null && tools!.getDraft().expression === 'sin(x)' && svg()!.textContent!.includes('sin(x)') && !svg()!.textContent!.includes('2x+1') && writes === 1, '连续快速输入仅显示最后一次函数，不复活中间预览或自动写入');
    input('plot-expression', 'cos(x)'); button('plot-insert').click(); await settle();
    check(writes === 2 && written?.expression === 'cos(x)', '待自动预览期间点击插入，同步验证并只保存最新函数一次');
    await wait();
    check(writes === 2, '明确插入后的旧预览计时器不会再次写入');
    input('plot-expression', 'fetch("https://example.invalid")'); button('plot-insert').click(); await settle();
    check(writes === 2 && !svg() && button('plot-insert').disabled && tools!.getDraft().expression.includes('fetch'), '待预览的无效输入即使直接插入也不执行、不写入，保留原文并禁用旧结果');
    input('plot-expression', 'x+4'); input('plot-xMin', '-3'); input('plot-xMax', '7');
    button('plot-insert').click(); await settle();
    check(writes === 3 && written?.expression === 'x+4' && written.xMin === -3 && written.xMax === 7, '修复错误后可直接插入最新函数和范围，旧错误不会阻挡新输入');
    input('plot-expression', 'x+5'); tools!.setDisabled(true); await wait();
    check(!svg() && writes === 3 && tools!.getDraft().expression === 'x+5', '禁用期间取消待自动预览任务，保留最新草稿并阻止异步操作');
    tools!.setDisabled(false); button('plot-insert').click(); await settle();
    check(writes === 4 && written?.expression === 'x+5', '解除禁用后直接插入会使用保存期间保留的最新草稿');
    input('plot-expression', 'x+6'); show({ ...defaults, expression: 'x+7' }); await wait();
    check(!svg() && tools!.getDraft().expression === 'x+7' && writes === 4, '销毁组件会取消旧预览计时器，不污染新挂载的输入或显示');
    input('plot-expression', 'x+8');
    const kind = fixture.querySelector<HTMLSelectElement>('[data-testid="plot-kind"]')!;
    kind.value = 'complex'; kind.dispatchEvent(new Event('change', { bubbles: true }));
    input('complex-points', '3+2i'); await wait();
    check((svg()?.querySelector('[data-complex-point="z1"]') ?? null) !== null && tools!.getDraft().mode === 'complex' && writes === 4, '切换模式取消旧函数计时器，仅自动预览当前复平面且不保存');
    input('complex-points', '4-i'); button('plot-insert').click(); await settle();
    check(writes === 5 && written?.mode === 'complex' && written.expression === '4-i', '复数待自动预览时也可一步插入最新点，只有一次写入');
    input('complex-points', 'bad'); await wait();
    check(!svg() && button('plot-insert').disabled && writes === 5, '自动预览发现无效复数时清空图像并阻止写入，未覆盖已保存的点');
  } finally { tools?.destroy(); fixture.remove(); }
}

async function checkSavedPlotLocalization(check: (condition: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div'); fixture.className = 'vme-rendered-plot';
  document.body.append(fixture);
  const plotted = createComplexPlot({ ...DEFAULT_COMPLEX_SPEC, xMin: -3, xMax: 7, yMin: -4, yMax: 6, expression: '3+2i' });
  if (!plotted.ok) throw new Error('Saved graph localization fixture failed');
  const viewport = document.createElement('div'); viewport.innerHTML = plotted.svg; fixture.append(viewport);
  const svg = viewport.firstElementChild!;
  const exactSvg = svg.outerHTML;
  const save = document.createElement('button'); save.textContent = '保存视图'; save.setAttribute('aria-label', '保存视图'); save.disabled = false; fixture.append(save);
  const status = document.createElement('p'); status.textContent = '视图已调整，尚未保存。点击“保存视图”更新笔记。'; fixture.append(status);
  const viewDraft = JSON.stringify(plotted.spec);
  fixture.dataset.viewDraft = viewDraft;
  const localization = localizeEditor(fixture, 'en', 'de-DE');
  try {
    check(save.textContent === 'Save view' && status.textContent?.includes('not saved') === true, '已保存图样式的工具条和未保存提示支持英文');
    localization.setLanguage('zh');
    check(save.textContent === '保存视图' && save.getAttribute('aria-label') === '保存视图' && status.textContent?.includes('尚未保存') === true, '已保存图样式的工具条和动态状态可从英文切回中文');
    localization.setLanguage('en');
    check(save.textContent === 'Save view' && save.getAttribute('aria-label') === 'Save view' && status.textContent?.includes('not saved') === true, '重复切换语言后已保存图样式的控件仍正确回到英文');
    check(viewport.firstElementChild === svg && svg.outerHTML === exactSvg && fixture.dataset.viewDraft === viewDraft && !save.disabled, '语言切换不重绘 SVG、不改未保存位置和缩放草稿，也不清除保存按钮状态');
    status.textContent = '此范围暂时无法显示图像，请调整范围或重置视图。';
    await Promise.resolve();
    check(status.textContent?.includes('cannot be displayed') === true && viewport.firstElementChild === svg, '语言切换后的新动态提示仍翻译为英文，同时保留现有图像对象');
  } finally { localization.destroy(); fixture.remove(); }
}

async function checkComplexRenderer(check: (condition: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div');
  fixture.style.maxWidth = '800px';
  document.body.append(fixture);
  try {
    const plotted = createComplexPlot({ ...DEFAULT_COMPLEX_SPEC, expression: '3+2i\n-2-i\n4\n-3i' });
    check(plotted.ok, '复平面普通写法生成四个复数点，纯实数与纯虚数均可输入');
    if (!plotted.ok) return;
    fixture.innerHTML = plotted.svg;
    const svg = fixture.querySelector<SVGSVGElement>('svg')!;
    const frame = fixture.querySelector<SVGRectElement>('[data-plot-frame]')!;
    const first = fixture.querySelector<SVGCircleElement>('[data-complex-point="z1"]')!;
    const rect = frame.getBBox();
    const scaleX = rect.width / (plotted.spec.xMax - plotted.spec.xMin);
    const scaleY = rect.height / (plotted.spec.yMax - plotted.spec.yMin);
    check(Math.abs(scaleX - scaleY) < 1e-8, '复平面在浏览器中保持实轴与虚轴每单位等长');
    check(Math.abs((first.cx.baseVal.value - rect.x) / scaleX + plotted.spec.xMin - 3) < 1e-5 && Math.abs(plotted.spec.yMax - (first.cy.baseVal.value - rect.y) / scaleY - 2) < 1e-5, '3+2i 的实际 SVG 点位对应 Re=3、Im=2');
    check(fixture.querySelector('[data-axis-label="Re"]')?.textContent === 'Re' && fixture.querySelector('[data-axis-label="Im"]')?.textContent === 'Im', '复平面坐标轴明确使用 Re 与 Im');
    check(Array.from(fixture.querySelectorAll('[data-complex-point]')).length === 4 && svg.getAttribute('aria-label')?.includes('z1 = 3 + 2i') === true, '复数点保留编号、完整数值及可读取说明');
    const boxes = Array.from(fixture.querySelectorAll<SVGGraphicsElement>('[data-axis-label], [data-axis-tick]')).map(node => node.getBBox());
    const overlap = boxes.some((a, i) => boxes.slice(i + 1).some(b => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y));
    check(!overlap, '复平面的 Re、Im 轴名与默认数字刻度没有文字框重叠');
    const hidden = createComplexPlot({ ...DEFAULT_COMPLEX_SPEC, expression: '3+2i', xMin: -1, xMax: 1, yMin: -1, yMax: 1 });
    check(hidden.ok && hidden.visibleCount === 0 && hidden.points[0].re === 3 && hidden.points[0].im === 2, '点在视野外时仍保留复数定义，不将空视野误判为错误');
    const parsed = parseComplexNumbers('3+2i\n-2-i');
    if (parsed.ok) {
      const fitted = fitComplexPoints(parsed.points);
      const result = createComplexPlot({ ...DEFAULT_COMPLEX_SPEC, ...fitted, expression: '3+2i\n-2-i' });
      check(result.ok && result.visibleCount === 2 && fitted.xMin <= 0 && fitted.xMax >= 0 && fitted.yMin <= 0 && fitted.yMax >= 0, '复数适配视野同时包含所有点与原点');
    }
  } finally { fixture.remove(); }
}

async function checkPlotGestures(check: (condition: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div');
  fixture.style.maxWidth = '800px';
  document.body.append(fixture);
  let bounds: PlotBounds = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
  let changes = 0;
  const plotted = createComplexPlot({ ...DEFAULT_COMPLEX_SPEC, ...bounds, expression: '3+2i' });
  if (!plotted.ok) throw new Error('Complex gesture fixture failed to render');
  fixture.innerHTML = plotted.svg;
  const interaction = mountPlotInteraction(fixture, { getBounds: () => bounds, onChange: value => { bounds = value; changes++; } });
  const settle = async () => { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); };
  const frame = fixture.querySelector<SVGGraphicsElement>('[data-plot-frame]')!.getBoundingClientRect();
  const wheel = (clientX: number, clientY: number, deltaY: number) => {
    const event = new WheelEvent('wheel', { clientX, clientY, deltaY, bubbles: true, cancelable: true });
    fixture.dispatchEvent(event);
    return event;
  };
  try {
    const margin = wheel(frame.left - 2, frame.top + frame.height / 2, -60);
    await settle();
    check(!margin.defaultPrevented && changes === 0, '坐标图外的滚轮操作不截获正文滚动或更改视野');
    const event = wheel(frame.left + frame.width / 2, frame.top + frame.height / 2, -60);
    await settle();
    check(event.defaultPrevented && changes === 1 && bounds.xMax - bounds.xMin < 10 && bounds.yMax - bounds.yMin < 10, '图内滚轮缩放实际修改视野且阻止同一次页面滚动');
    const anchorX = (event.clientX - frame.left) / frame.width;
    const anchorY = 1 - (event.clientY - frame.top) / frame.height;
    check(Math.abs(bounds.xMin + (bounds.xMax - bounds.xMin) * anchorX - (-5 + 10 * anchorX)) < 1e-10 && Math.abs(bounds.yMin + (bounds.yMax - bounds.yMin) * anchorY - (-5 + 10 * anchorY)) < 1e-10, '滚轮缩放以实际鼠标位置为锚点，保留该坐标的屏幕比例');
    wheel(frame.left + frame.width / 2, frame.top + frame.height / 2, -60);
    interaction.setDisabled(true); await settle();
    check(changes === 1, '输入或模式失效时禁用交互会丢弃尚未执行的滚轮更新');
    const disabled = wheel(frame.left + frame.width / 2, frame.top + frame.height / 2, -60); await settle();
    check(!disabled.defaultPrevented && changes === 1, '保存期间禁用图中交互且不截获滚轮');
    interaction.setDisabled(false);
    wheel(frame.left + frame.width / 2, frame.top + frame.height / 2, -60); await settle();
    check(changes === 2, '重新启用图中交互后可继续缩放');
    wheel(frame.left + frame.width / 2, frame.top + frame.height / 2, -60); interaction.destroy(); await settle();
    check(changes === 2 && fixture.style.cursor === '', '图形销毁会取消待执行的视野更新并恢复原有光标');
  } finally { interaction.destroy(); fixture.remove(); }
}

async function checkIntegratedPlot(check: (condition: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div');
  document.body.append(fixture);
  let editor: ReturnType<typeof mountEditor> | undefined;
  let mathWrites = 0;
  let graphWrites = 0;
  let graphLatex = '';
  let graphSpec: PlotSpec | undefined;
  let cancellations = 0;
  const original = '\\frac{ x }{ 2 }';
  const create = (draft: EditorDraft, graphOnly = false) => {
    editor?.destroy();
    editor = mountEditor(fixture, {
      latex: draft.latex, display: draft.display, initialMode: draft.mode,
      scienceDraft: draft.science, plotDraft: draft.plot, graphOnly, language: 'en',
      onSave: () => { mathWrites++; },
      onSaveGraph: async (spec, latex) => { graphWrites++; graphLatex = latex; graphSpec = spec; },
      onCancel: () => { cancellations++; },
    });
  };
  const button = (action: string) => fixture.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
  const root = () => fixture.querySelector<HTMLElement>('[data-testid="visual-math-editor"]')!;
  const settle = async () => { await Promise.resolve(); await new Promise(resolve => setTimeout(resolve, 45)); };
  try {
    create({ latex: original, display: true, mode: 'hybrid' });
    button('subject-graph').click(); await settle();
    check(root().dataset.subject === 'graph' && fixture.querySelector<HTMLElement>('.vme-workspace')!.hidden && fixture.querySelector<HTMLElement>('.vme-mode-tabs')!.hidden, '图像学科隐藏数学工作区与模式开关，显示独立函数工具');
    check(button('save').hidden && !button('cancel').hidden && !fixture.querySelector<HTMLElement>('[data-testid="plot-tools"]')!.hidden, '图像工具保留取消入口，避免误用数学保存按钮');
    button('plot-use-current').click(); await settle();
    check(fixture.querySelector('[data-testid="plot-preview"] svg') !== null && editor!.getDraft().latex === original && graphWrites === 0 && mathWrites === 0, '当前分数可转换为曲线预览，数学源码与空格原样保留');
    button('plot-insert').click(); await settle();
    check(graphWrites === 1 && graphLatex === original && mathWrites === 0, '图像明确保存时携带原公式草稿，且只触发一次图像保存');
    const retained = editor!.getDraft();
    create(retained); await settle();
    check(root().dataset.subject === 'graph' && fixture.querySelector('[data-testid="plot-preview"] svg') !== null && editor!.getDraft().latex === original, '整套编辑器重挂载恢复图像学科、曲线和数学原文');
    button('subject-math').click(); button('mode-latex').click();
    const source = fixture.querySelector<HTMLTextAreaElement>('[data-testid="latex-source"]')!;
    source.value = 'x^'; source.dispatchEvent(new Event('input', { bubbles: true }));
    button('subject-graph').click(); button('plot-preset-square').click();
    button('plot-insert').click(); await settle();
    check(graphWrites === 1 && editor!.getDraft().latex === 'x^' && fixture.querySelector<HTMLElement>('[data-testid="plot-status"]')!.dataset.state === 'error', '未完成数学草稿阻止图像提交并完整保留，避免静默丢失公式');
    check(!/[\u4e00-\u9fff]/.test(fixture.querySelector<HTMLElement>('[data-testid="plot-status"]')!.textContent ?? ''), '图像保存被数学草稿拦截时，英文界面的动态提示仍为英文');
    const blockedLanguage = fixture.querySelector<HTMLSelectElement>('[data-testid="interface-language"]')!;
    blockedLanguage.value = 'zh'; blockedLanguage.dispatchEvent(new Event('change', { bubbles: true }));
    button('plot-insert').click(); await settle();
    check(/完成或清空当前公式/.test(fixture.querySelector<HTMLElement>('[data-testid="plot-status"]')!.textContent ?? '') && graphWrites === 1, '中文图像保存提示明确说明先完成或清空公式，而非反复重试');
    create({ latex: '', display: true, mode: 'visual' });
    button('subject-graph').click(); button('plot-preset-sine').click();
    button('plot-insert').click(); await settle();
    check(graphWrites === 2 && graphLatex === '' && mathWrites === 0, '空数学草稿允许单独插入图像，无需额外填写公式');
    const onlyGraph: EditorDraft = {
      latex: '', display: true, mode: 'visual',
      science: { subject: 'graph', chemistry: '', units: '' },
      plot: { expression: 'sqrt(x)', xMin: '-1', xMax: '9', yMin: '-1', yMax: '4', previewed: true },
    };
    create(onlyGraph, true); await settle();
    check(root().dataset.subject === 'graph' && button('subject-math').hidden && button('plot-use-current').hidden && button('save').hidden && !button('cancel').hidden, '重编已有图像仅显示图像操作，仍可取消');
    check(document.activeElement === fixture.querySelector('[data-testid="plot-expression"]'), '重开图像后键盘焦点进入函数框，隐藏公式区不抢焦点');
    const language = fixture.querySelector<HTMLSelectElement>('[data-testid="interface-language"]')!;
    language.value = 'zh'; language.dispatchEvent(new Event('change', { bubbles: true })); await settle();
    check(button('plot-insert').textContent === '保存图像' && editor!.getDraft().plot?.expression === 'sqrt(x)', '图像工具支持中英文切换，重编保存标签明确且函数范围不被翻译');
    button('cancel').click(); await settle();
    check(cancellations === 1 && graphWrites === 2 && mathWrites === 0, '取消图像编辑不会触发任何保存');
    const complexOnly: EditorDraft = {
      latex: '', display: true, mode: 'visual',
      science: { subject: 'graph', chemistry: '', units: '' },
      plot: { mode: 'complex', expression: '3+2i', xMin: '-5', xMax: '5', yMin: '-5', yMax: '5', previewed: true },
    };
    create(complexOnly, true); await settle();
    check(root().dataset.subject === 'graph' && fixture.querySelector<HTMLSelectElement>('[data-testid="plot-kind"]')!.value === 'complex' && fixture.querySelector('[data-complex-point="z1"]') !== null, '重编复平面恢复图像学科、复数类型和已保存的点');
    check(document.activeElement === fixture.querySelector('[data-testid="complex-points"]'), '重开复平面时焦点进入复数框，隐藏函数框不抢焦点');
    button('plot-zoom-in').click(); await settle();
    check(graphWrites === 2 && editor!.getDraft().plot?.expression === '3+2i' && Number(editor!.getDraft().plot?.xMax) < 5, '整套正文编辑器中的复平面缩放只改草稿');
    const complexRetained = editor!.getDraft(); create(complexRetained, true); await settle();
    check(fixture.querySelector('[data-complex-point="z1"]') !== null && editor!.getDraft().plot?.xMax === complexRetained.plot?.xMax, '复平面编辑面板重新挂载后仍保留交互后的范围');
    button('plot-insert').click(); await settle();
    check(graphWrites === 3 && graphSpec?.mode === 'complex' && graphSpec.expression === '3+2i' && graphLatex === '' && mathWrites === 0, '保存已有复平面只提交该图像与当前视野，未额外写入数学公式');

    create({ ...onlyGraph, plot: { ...onlyGraph.plot!, expression: 'x^2', previewed: false } }, true); await settle();
    const shortcutFunction = fixture.querySelector<HTMLInputElement>('[data-testid="plot-expression"]')!;
    shortcutFunction.value = 'cos(x)'; shortcutFunction.dispatchEvent(new Event('input', { bubbles: true }));
    shortcutFunction.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }));
    await settle();
    check(graphWrites === 4 && graphSpec?.expression === 'cos(x)' && mathWrites === 0, '函数框内 Ctrl+Enter 可在待预览时直接保存最新函数，不被普通 Enter 预览截获');
    const shortcutRange = fixture.querySelector<HTMLInputElement>('[data-testid="plot-xMin"]')!;
    shortcutRange.value = '-9'; shortcutRange.dispatchEvent(new Event('input', { bubbles: true }));
    shortcutRange.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true, cancelable: true }));
    await settle();
    check(graphWrites === 5 && graphSpec?.xMin === -9 && mathWrites === 0, '坐标范围框内 ⌘+Enter 也保存最新边界一次，避免只预览而未保存');
    create(complexOnly, true); await settle();
    const shortcutComplex = fixture.querySelector<HTMLTextAreaElement>('[data-testid="complex-points"]')!;
    shortcutComplex.value = '4-i'; shortcutComplex.dispatchEvent(new Event('input', { bubbles: true }));
    shortcutComplex.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true, cancelable: true }));
    await settle();
    check(graphWrites === 6 && graphSpec?.mode === 'complex' && graphSpec.expression === '4-i' && mathWrites === 0, '复数多行框内 ⌘+Enter 明确保存最新点，普通 Enter 仍可换行');
    shortcutComplex.value = 'bad'; shortcutComplex.dispatchEvent(new Event('input', { bubbles: true }));
    shortcutComplex.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }));
    await settle();
    check(graphWrites === 6 && shortcutComplex.value === 'bad' && fixture.querySelector<HTMLElement>('[data-testid="plot-status"]')!.dataset.state === 'error', '快捷保存同样验证无效复数，保留草稿且不写笔记');

  } finally {
    editor?.destroy(); fixture.remove();
  }
}
document.getElementById("theme")!.onclick = () => { document.body.classList.toggle("dark"); };
document.getElementById("reset")!.onclick = () => { result.textContent = ""; open(); };
document.getElementById("selftest")!.onclick = async () => {
  const reports: string[] = [];
  const check = (condition: boolean, message: string) => { if (!condition) throw new Error(message); reports.push("通过 · " + message); };
  try {
    open();
    const field = mounted!.field;
    const click = (id: string) => (host.querySelector(`[data-action="${id}"]`) as HTMLButtonElement).click();
    click("save");
    check(!host.querySelector<HTMLElement>(".vme-error")!.hidden, "空公式不能保存");
    click("fraction");
    check(field.getValue().includes("\\frac") && field.getValue().includes("\\placeholder"), "分数工具生成可填写方框");
    click("save");
    check(!host.querySelector<HTMLElement>(".vme-error")!.hidden, "未完成方框不能保存");
    field.setValue("\\frac{1}{}");
    click("save");
    check(!host.querySelector<HTMLElement>(".vme-error")!.hidden, "删空分母不能保存");
    for (const [id, command] of [["sqrt", "\\sqrt"], ["nth-root", "\\sqrt"], ["superscript", "^"], ["subscript", "_"], ["integral", "\\int"], ["sum", "\\sum"], ["parentheses", "\\left("]]) {
      field.setValue(""); click(id); check(field.getValue().includes(command), `${id} 结构可插入`);
    }
    field.setValue("x"); field.position = -1; click("superscript");
    check(field.getValue().startsWith("x^"), "上标附着在已有字符上");
    field.setValue("x"); field.position = -1; click("alpha");
    check(field.getValue().includes("\\alpha"), "希腊字母可插入");
    click("undo"); check(!field.getValue().includes("\\alpha"), "撤销恢复公式");
    click("redo"); check(field.getValue().includes("\\alpha"), "重做恢复符号");
    check(field.mode === "math" && field.menuItems.length === 0, "编辑区无源码菜单");
    check(!field.keybindings.some(b => (Array.isArray(b.command) ? b.command[0] : b.command) === "switchMode"), "切换源码快捷键已过滤");
    const formula = "\\int_{0}^{1}\\frac{x^{2}}{\\sqrt{x+1}}\\,\\mathrm{d}x+\\sum_{i=1}^{n}i";
    field.setValue(formula);
    const expected = field.getValue("latex-expanded");
    click("save"); await Promise.resolve();
    check(saved === expected && saved.includes("\\int") && saved.includes("\\sum"), "完整积分、求和及嵌套分数成功保存");
    check(mounted!.field.getValue().includes("\\int"), "保存后可再次打开");
    const once = mounted!.field.getValue("latex-expanded");
    mounted!.field.setValue(once);
    check(mounted!.field.getValue("latex-expanded") === once, "反复打开保存保持幂等");
    const previewHost = document.createElement("div"); document.body.append(previewHost);
    const readonlyField = createPreview("\\frac{1}{2}", previewHost);
    check(readonlyField.readOnly && readonlyField.menuItems.length === 0 && readonlyField.getValue().includes("\\frac"), "选择器的只读公式挂载成功");
    previewHost.remove();
    check(await document.fonts.load('24px KaTeX_Main').then(x => x.length > 0), "本地嵌入数学字体加载成功");
    open();
    const inputSource = (value: string) => {
      const source = host.querySelector<HTMLTextAreaElement>('[data-testid="latex-source"]')!;
      source.value = value;
      source.dispatchEvent(new Event("input", { bubbles: true }));
      return source;
    };
    const raw = "\\frac{ a }{ b }";
    click("mode-hybrid");
    inputSource(raw);
    check(mounted!.field.getValue().replace(/\s/g, "").includes("\\frac{a}{b}"), "Hybrid 源码输入同步到可视化公式");
    check(mounted!.getDraft().latex === raw, "源码输入保留用户原始写法");
    mounted!.field.position = -1;
    mounted!.field.insert("+x", { format: "latex", mode: "math" });
    await new Promise(resolve => setTimeout(resolve, 0));
    check(host.querySelector<HTMLTextAreaElement>('[data-testid="latex-source"]')!.value.includes("+x"), "Hybrid 可视化改动同步回源码");
    click("mode-latex");
    check(host.querySelector<HTMLElement>(".vme-visual-pane")!.hidden && !host.querySelector<HTMLElement>(".vme-source-pane")!.hidden, "LaTeX 模式只显示源码编辑器");
    inputSource("\\frac{1}{");
    const invalid = mounted!.getDraft().latex;
    check(host.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled && !host.querySelector<HTMLElement>(".vme-error")!.hidden, "未完成源码保留并阻止保存");
    click("mode-visual"); click("mode-hybrid");
    check(mounted!.getDraft().latex === invalid && host.querySelector<HTMLTextAreaElement>('[data-testid="latex-source"]')!.value === invalid, "切换模式不会丢失未完成源码");
    inputSource("\\frac{1}{}");
    check(host.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled, "源码模式拒绝空的必要参数");
    inputSource("$x$");
    check(host.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled, "源码模式拒绝外层 Markdown 数学分隔符");
    inputSource("x% comment");
    check(host.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled, "源码模式拒绝吞掉结束分隔符的注释");
    inputSource("\\customMacro{x}");
    check(mounted!.field.hidden && host.querySelector<HTMLButtonElement>('[data-action="save"]')!.textContent === "按源码保存", "未知宏保留源码并使用明确的源码保存动作");
    click("save"); await Promise.resolve();
    check(saved === "\\customMacro{x}", "未知宏通过源码模式按原文保存");
    open(raw, "hybrid");
    click("mode-latex"); click("mode-visual"); click("mode-hybrid");
    click("save"); await Promise.resolve();
    check(saved === raw, "只切换模式再保存不会规范化原始源码");
    click("mode-latex"); inputSource("\\sqrt[3]{x}+1"); click("inline");
    const draft = mounted!.getDraft();
    open(draft.latex, draft.mode, draft.display);
    check(mounted!.getDraft().latex === draft.latex && mounted!.getDraft().mode === "latex" && !mounted!.getDraft().display, "重挂载可恢复未保存草稿、模式和显示方式");

    open("\\frac{1}{2}", "hybrid");
    const clearField = mounted!.field;
    clearField.position = -1;
    clearField.insert("+x", { format: "latex", mode: "math" });
    await new Promise(resolve => setTimeout(resolve, 0));
    const beforeClear = clearField.getValue("latex-expanded");
    click("clear");
    check(clearField.getValue() === "" && mounted!.getDraft().latex === "", "清空按钮同时清空公式与同步源码");
    click("undo");
    check(clearField.getValue("latex-expanded") === beforeClear, "清空后撤销可恢复完整公式");
    await new Promise(resolve => setTimeout(resolve, 0));
    click("redo");
    check(clearField.getValue() === "", "清空操作可重做");
    clearField.insert("x", { format: "latex", mode: "math" });
    click("jump-end"); click("operator-plus");
    clearField.insert("1", { format: "latex", mode: "math" });
    await new Promise(resolve => setTimeout(resolve, 0));
    check(clearField.getValue().replace(/\s/g, "") === "x+1", "公式末尾与常用加号按钮可继续输入");
    const glyph = host.querySelector<HTMLElement>(".vme-glyph-fraction")!;
    check(glyph.children.length === 3 && getComputedStyle(glyph).letterSpacing !== "-3px", "分数按钮使用上下排列结构，移除负字距");
    const glyphParts = [...glyph.children].map(item => item.getBoundingClientRect());
    check(glyphParts[0].bottom <= glyphParts[1].top && glyphParts[1].bottom <= glyphParts[2].top, "分数图标的分子、横线与分母不相交");
    check([...host.querySelectorAll<HTMLElement>(".vme-structure-glyph")].every(item => item.children.length >= 2 && item.getBoundingClientRect().height > 0), "全部八种结构图标使用可见的独立排版");
    for (const id of ['sqrt', 'nth-root']) {
      const rootGlyph = host.querySelector<HTMLElement>(`.vme-glyph-${id}`)!;
      const svg = rootGlyph.querySelector<SVGSVGElement>('svg.vme-glyph-radical')!;
      const path = svg?.querySelector<SVGPathElement>('path');
      check(svg !== null && svg.querySelectorAll('path').length === 1 && (path?.getAttribute('d')?.match(/[Mm]/g)?.length ?? 0) === 1 && (path?.getTotalLength() ?? 0) > 50, `${id} 根号和上横线由单条连续 SVG 路径绘制`);
      const radicand = rootGlyph.querySelector<HTMLElement>('.vme-glyph-radicand')!;
      const rootBox = svg.getBoundingClientRect();
      const variableBox = radicand.getBoundingClientRect();
      check(!rootGlyph.textContent?.includes('√') && parseFloat(getComputedStyle(radicand).borderTopWidth) === 0 && variableBox.left > rootBox.left + rootBox.width / 2 && variableBox.right <= rootBox.right + 1 && variableBox.top > rootBox.top + rootBox.height * 4 / 29, `${id} 图标不拼接字体根号或额外横线，变量位于根号横线下方`);
    }

    open("x", "hybrid"); click("subject-chemistry");
    const chemInput = () => host.querySelector<HTMLInputElement>('[data-testid="chemistry-input"]')!;
    const setHelper = (kind: "chemistry" | "units", value: string) => {
      const input = host.querySelector<HTMLInputElement>(`[data-testid="${kind}-input"]`)!;
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setHelper("chemistry", "H2O");
    check(mounted!.getDraft().latex === "x", "化学输入和预览不会自动覆盖当前公式");
    check(host.querySelector<HTMLButtonElement>('[data-action="chemistry-replace"]')!.hidden, "普通或混合公式不显示整体化学更新按钮");
    mounted!.field.position = -1;
    click("chemistry-insert");
    check(mounted!.getDraft().latex.includes("x") && mounted!.getDraft().latex.includes("\\ce{H2O}"), "插入化学式保留现有内容并加入光标位置");
    open("\\ce{H2O}", "hybrid");
    check(chemInput().value === "H2O" && host.querySelector<HTMLElement>('[data-action="subject-chemistry"]')!.getAttribute("aria-selected") === "true", "重新打开整条化学式时自动回填化学工具");
    setHelper("chemistry", "CO2");
    check(mounted!.getDraft().latex === "\\ce{H2O}", "修改已回填的化学草稿仍需明确更新");
    click("chemistry-replace");
    check(mounted!.getDraft().latex === "\\ce{CO2}", "更新当前化学式仅替换整条化学式");
    check(mounted!.field.getValue("latex-expanded") === "\\ce{CO2}", "MathLive 展开序列化保留原生化学命令");
    click("undo");
    check(mounted!.getDraft().latex === "\\ce{H2O}", "化学式整体更新可撤销");
    click("chemistry-refill");
    check(chemInput().value === "H2O", "回填按钮恢复当前化学式内容");
    setHelper("chemistry", "H2O\\bond{bad}");
    check(host.querySelector<HTMLButtonElement>('[data-action="chemistry-insert"]')!.disabled && chemInput().value === "H2O\\bond{bad}", "无效化学输入保留原文并阻止插入");
    for (const item of CHEMISTRY_TEMPLATES) {
      click(`chemistry-sample-${item.id}`);
      check(!host.querySelector<HTMLButtonElement>('[data-action="chemistry-insert"]')!.disabled && chemInput().value === item.input, `化学模板 ${item.id} 可预览`);
    }

    // Conservation advice must never become a new gate on valid notation.
    const reactionStatus = () => host.querySelector<HTMLElement>('[data-testid="reaction-status"]')!;
    const reactionSuggestion = () => host.querySelector<HTMLElement>('[data-testid="reaction-suggestion"]')!;
    const reactionApply = () => host.querySelector<HTMLButtonElement>('[data-action="reaction-apply"]')!;
    const originalReaction = 'H2 + O2 -> H2O';
    const balancedReaction = '2H2 + O2 -> 2H2O';
    open('', 'hybrid'); click('subject-chemistry');
    setHelper('chemistry', originalReaction);
    check(reactionStatus().dataset.status === 'unchecked', '输入反应式后等待明确检查，不自动改写原式');
    click('reaction-check');
    check(reactionStatus().dataset.status === 'unbalanced' && chemInput().value === originalReaction, '检查发现未配平并完整保留化学输入');
    check(reactionSuggestion().textContent === balancedReaction && host.querySelector<HTMLElement>('[data-testid="reaction-differences"]')!.textContent!.includes('O'), '检查列出氧原子差异和精确整数系数建议');
    check(!host.querySelector<HTMLButtonElement>('[data-action="chemistry-insert"]')!.disabled && mounted!.getDraft().latex === '', '未配平提示不禁用插入，也不自动改变主公式');
    click('chemistry-insert');
    check(mounted!.getDraft().latex === `\\ce{${originalReaction}}`, '用户可明确插入原始未配平反应式');
    click('save'); await Promise.resolve();
    check(saved === `\\ce{${originalReaction}}`, '未配平反应式能够原样保存，不被配平检查拦截');

    const originalReactionSource = '\\ce{ H2 + O2 -> H2O }';
    open(originalReactionSource, 'hybrid'); click('reaction-check');
    check(mounted!.getDraft().latex === originalReactionSource && host.querySelector<HTMLTextAreaElement>('[data-testid="latex-source"]')!.value === originalReactionSource, '对已有化学式进行检查不规范化原始源码或空格');
    click('reaction-apply');
    check(mounted!.getDraft().latex === originalReactionSource && chemInput().value.trim() === balancedReaction, '应用建议仅改变辅助输入，已有化学式仍保留原始源码');
    click('save'); await Promise.resolve();
    check(saved === originalReactionSource, '只检查或应用辅助建议后保存，未明确更新的原公式逐字保留');

    open(`\\ce{${originalReaction}}`, 'hybrid');
    setHelper('chemistry', 'H2 + 2O2 -> H2O'); click('reaction-check');
    check(reactionStatus().dataset.status === 'unbalanced' && !host.querySelector<HTMLButtonElement>('[data-action="chemistry-replace"]')!.disabled, '已有整条化学式即使未配平也允许明确更新');
    click('chemistry-replace');
    check(mounted!.getDraft().latex === '\\ce{H2 + 2O2 -> H2O}', '更新保留用户选择的未配平系数');

    open('x', 'hybrid'); click('subject-chemistry');
    setHelper('chemistry', originalReaction); click('reaction-check'); click('reaction-apply');
    check(chemInput().value === balancedReaction && reactionStatus().dataset.status === 'balanced', '明确应用建议后只修改化学辅助输入并重新检查');
    check(mounted!.getDraft().latex === 'x', '应用配平建议不会自动替换或插入主公式');
    setHelper('chemistry', 'N2 + H2 -> NH3');
    check(reactionStatus().dataset.status === 'unchecked' && (reactionApply().hidden || reactionApply().disabled), '继续编辑后清除旧检查结论并停用过时建议');
    click('reaction-apply');
    check(chemInput().value === 'N2 + H2 -> NH3' && mounted!.getDraft().latex === 'x', '过时建议即使收到点击也不会覆盖新的化学输入');
    click('reaction-check'); click('chemistry-sample-water');
    check(reactionStatus().dataset.status === 'unchecked' && (reactionApply().hidden || reactionApply().disabled), '选择化学模板也清除旧检查及配平建议');
    click('reaction-check');
    check(reactionStatus().dataset.status === 'not-reaction' && !host.querySelector<HTMLButtonElement>('[data-action="chemistry-insert"]')!.disabled, '单一化学式没有反应配平结论，仍可插入');

    for (const [input, status, description] of [
      ['H2 -> H2O', 'impossible', '所列物质无正系数解'],
      ['H2 ->[heat] H2', 'unsupported', '带反应条件的可排版写法超出检查范围'],
      ['H2 + O2 -> H2O + H2O2', 'indeterminate', '多组独立系数没有唯一配平建议'],
    ]) {
      setHelper('chemistry', input!); click('reaction-check');
      check(reactionStatus().dataset.status === status && chemInput().value === input, `${description}时只给提示并保留原式`);
      check(!host.querySelector<HTMLButtonElement>('[data-action="chemistry-insert"]')!.disabled && (reactionApply().hidden || reactionApply().disabled), `${description}不阻止原式插入，也不提供误导建议`);
    }
    setHelper('chemistry', 'Fe^2+ -> Fe^3+ + e-'); click('reaction-check');
    check(reactionStatus().dataset.status === 'balanced', '受支持的离子反应同时检查元素和电荷守恒');
    const reactionLanguage = host.querySelector<HTMLSelectElement>('[data-testid="interface-language"]')!;
    reactionLanguage.value = 'en'; reactionLanguage.dispatchEvent(new Event('change', { bubbles: true }));
    setHelper('chemistry', originalReaction); click('reaction-check');
    await new Promise(resolve => setTimeout(resolve, 0));
    const advice = host.querySelector<HTMLElement>('.vme-reaction-check') ?? reactionStatus().parentElement!;
    check(!/[\u4e00-\u9fff]/.test(advice.textContent ?? '') && reactionStatus().dataset.status === 'unbalanced' && chemInput().value === originalReaction, '英文界面的动态反应式检查保持英文，化学原文不变');
    reactionLanguage.value = 'zh'; reactionLanguage.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));

    open(originalReactionSource, 'hybrid', false, true);
    setHelper('chemistry', 'N2 + H2 -> NH3'); click('reaction-check');
    click('subject-units'); setHelper('units', '12.5 kg');
    const restoreSelect = (id: string, value: string) => {
      const select = host.querySelector<HTMLSelectElement>(`[data-testid="conversion-${id}"]`)!;
      select.value = value; select.dispatchEvent(new Event('change', { bubbles: true }));
    };
    restoreSelect('category', 'temperature'); restoreSelect('from', 'celsius'); restoreSelect('to', 'fahrenheit');
    const restoredAmount = host.querySelector<HTMLInputElement>('[data-testid="conversion-value"]')!;
    restoredAmount.value = '25'; restoredAmount.dispatchEvent(new Event('input', { bubbles: true }));
    click('subject-chemistry');
    const scienceDraft = mounted!.getDraft();
    check(scienceDraft.science?.chemistry === 'N2 + H2 -> NH3' && scienceDraft.science.units === '12.5 kg' && scienceDraft.science.checkedInput === 'N2 + H2 -> NH3', '未插入的学科输入与已检查原文包含在编辑草稿中');
    open(scienceDraft.latex, scienceDraft.mode, scienceDraft.display, true, scienceDraft.science);
    check(mounted!.getDraft().latex === originalReactionSource && chemInput().value === 'N2 + H2 -> NH3' && host.querySelector<HTMLInputElement>('[data-testid="units-input"]')!.value === '12.5 kg', '正文面板重挂载后恢复两个辅助输入，主公式原文不变');
    check(host.querySelector<HTMLElement>('[data-action="subject-chemistry"]')!.getAttribute('aria-selected') === 'true' && reactionStatus().dataset.status === 'unbalanced' && reactionSuggestion().textContent === 'N2 + 3H2 -> 2NH3', '重挂载恢复当前学科并只对完全匹配的已检查输入重算建议');
    check(host.querySelector<HTMLSelectElement>('[data-testid="conversion-category"]')!.value === 'temperature' && host.querySelector<HTMLSelectElement>('[data-testid="conversion-from"]')!.value === 'celsius' && host.querySelector<HTMLSelectElement>('[data-testid="conversion-to"]')!.value === 'fahrenheit' && host.querySelector<HTMLInputElement>('[data-testid="conversion-value"]')!.value === '25', '重挂载保留换算类别、单位和数值');
    setHelper('chemistry', originalReaction);
    const uncheckedDraft = mounted!.getDraft();
    open(uncheckedDraft.latex, uncheckedDraft.mode, uncheckedDraft.display, true, uncheckedDraft.science);
    check(chemInput().value === originalReaction && reactionStatus().dataset.status === 'unchecked' && (reactionApply().hidden || reactionApply().disabled), '修改后的未检查输入在重挂载后仍未检查，不复活旧建议');

    open("\\pu{9.81 m/s2}", "hybrid");
    check(host.querySelector<HTMLInputElement>('[data-testid="units-input"]')!.value === "9.81 m/s2", "重新打开单位自动回填普通单位写法");
    for (const item of UNIT_PRESETS) {
      click(`unit-preset-${item.id}`);
      check(!host.querySelector<HTMLButtonElement>('[data-action="units-insert"]')!.disabled, `单位模板 ${item.id} 可预览`);
    }
    setHelper("units", "5 m/s2"); click("units-replace");
    check(mounted!.getDraft().latex === "\\pu{5 m/s2}" && mounted!.field.getValue("latex-expanded") === "\\pu{5 m/s2}", "单位整体更新与展开序列化保留 pu 命令");
    open("\\ce{H2O}+x", "hybrid"); click("subject-chemistry");
    check(host.querySelector<HTMLButtonElement>('[data-action="chemistry-replace"]')!.hidden, "含化学片段的混合表达式不会被整体更新");
    open("", "hybrid"); click("subject-physics");
    for (const item of PHYSICS_TEMPLATES) {
      click("clear"); click(`physics-${item.id}`);
      check(mounted!.field.errors.length === 0 && mounted!.getDraft().latex.length > 0, `物理模板 ${item.id} 可插入`);
    }
    click("subject-elements");
    check(host.querySelectorAll(".vme-element-button").length === 118, "元素周期表包含 118 个元素按钮");
    const details = host.querySelector<HTMLElement>('[data-testid="element-details"]')!;
    const detailValue = (id: string) => details.querySelector<HTMLElement>(`[data-testid="detail-${id}"]`)?.textContent ?? '';
    const elementCell = (number: number) => host.querySelector<HTMLButtonElement>(`[data-action="element-${number}"]`)!;
    const hoverCell = (number: number) => elementCell(number).dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    const leaveCell = (number: number) => elementCell(number).dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    const beforeElementHover = { latex: mounted!.getDraft().latex, chemistry: chemInput().value };
    // Earlier MathLive focus changes can queue document scroll events. Settle
    // those before simulating hover; real scrolling should dismiss the tooltip.
    const settleElementLayout = async () => {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    };
    await settleElementLayout();
    check(details.hidden && details.getAttribute('role') === 'tooltip', "元素详情初始隐藏，并声明辅助技术可识别的 tooltip");
    hoverCell(26);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    check(!details.hidden && detailValue('mass') === '55.845(2)' && ['3d6', '4s2'].every(orbital => detailValue('configuration').replace(/[\s^]/g, '').includes(orbital)) && detailValue('shells') === '2, 8, 14, 2', "悬停铁显示原子量、基态电子排布和各层电子数");
    const tooltipBox = details.getBoundingClientRect();
    const editorBox = host.querySelector<HTMLElement>('.vme-editor')!.getBoundingClientRect();
    check(tooltipBox.width > 180 && tooltipBox.left >= editorBox.left - 1 && tooltipBox.right <= editorBox.right + 1 && tooltipBox.top >= editorBox.top - 1 && tooltipBox.bottom <= editorBox.bottom + 1, "元素详情卡保持可读宽度并限制在完整编辑面板范围内");
    check(elementCell(26).getAttribute('aria-describedby') === details.id && details.dataset.massKind === 'standard', "可见详情关联当前元素按钮并保留质量类型");
    check(mounted!.getDraft().latex === beforeElementHover.latex && chemInput().value === beforeElementHover.chemistry, "悬停查看元素详情不修改主公式或化学草稿");
    leaveCell(26);
    check(details.hidden && !elementCell(26).hasAttribute('aria-describedby'), "鼠标离开后隐藏详情并移除过时的描述关联");
    const beforeViewportTest = { x: window.scrollX, y: window.scrollY };
    elementCell(1).scrollIntoView({ block: 'end', inline: 'nearest' });
    await settleElementLayout();
    hoverCell(1);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const lowElementBox = elementCell(1).getBoundingClientRect();
    const lowDetailsBox = details.getBoundingClientRect();
    check(!details.hidden && lowDetailsBox.height > 80 && lowDetailsBox.top >= 0 && lowDetailsBox.bottom <= window.innerHeight && lowDetailsBox.bottom <= lowElementBox.top, "元素位于屏幕底部时详情向上展开，完整保持在可见视口内");
    leaveCell(1);
    window.scrollTo(beforeViewportTest.x, beforeViewportTest.y);
    await settleElementLayout();
    elementCell(6).focus({ preventScroll: true });
    check(!details.hidden && detailValue('mass') === '[12.0096, 12.0116]' && detailValue('shells') === '2, 4', "键盘聚焦碳显示标准原子量区间和各层电子数");
    check(detailValue('mass-label') === '标准原子量' && detailValue('configuration-label') === '电子排布' && detailValue('shells-label') === '各电子层电子数', "中文元素详情使用中文字段标签");
    // Fe remains inside the horizontal scroller at our 520px regression width.
    // Real keyboard Tab scrolls clipped elements into view; preventScroll does not.
    elementCell(26).focus({ preventScroll: true });
    document.dispatchEvent(new Event('scroll'));
    await settleElementLayout();
    check(!details.hidden && elementCell(26).getAttribute('aria-describedby') === details.id && detailValue('shells') === '2, 8, 14, 2', "键盘聚焦引发滚动后仍显示当前元素详情");
    const dismissDetails = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    elementCell(26).dispatchEvent(dismissDetails);
    leaveCell(26);
    check(details.hidden && dismissDetails.defaultPrevented, "Escape 关闭详情并阻止外层关闭，随后鼠标移出不会重新弹出");
    document.dispatchEvent(new Event('scroll'));
    await settleElementLayout();
    check(details.hidden && !elementCell(26).hasAttribute('aria-describedby'), "Escape 关闭后滚动与焦点恢复不会重新打开详情");
    const elementSearch = host.querySelector<HTMLInputElement>('[data-testid="element-search"]')!;
    elementSearch.focus({ preventScroll: true });
    elementCell(118).focus({ preventScroll: true });
    check(!details.hidden && detailValue('mass') === '[294]' && details.dataset.massKind === 'isotope' && details.dataset.configurationStatus === 'predicted' && detailValue('shells') === '2, 8, 18, 32, 32, 18, 8', "Og 使用同位素质量数并标出预测排布，避免误称标准原子量");
    check(details.textContent!.includes('不是标准原子量') && details.textContent!.includes('理论预测'), "重元素详情明确解释质量数与预测状态");
    elementSearch.focus({ preventScroll: true });
    check(details.hidden, "焦点移离元素后隐藏详情");
    const allDetailsPresent = [...host.querySelectorAll<HTMLButtonElement>('.vme-element-button')].every(button => {
      button.focus({ preventScroll: true });
      return !details.hidden && detailValue('mass').length > 0 && detailValue('configuration').length > 0 && detailValue('shells').length > 0 && button.getAttribute('aria-describedby') === details.id;
    });
    elementSearch.focus({ preventScroll: true });
    check(allDetailsPresent && host.querySelectorAll('.vme-element-button').length === 118, "118 个元素均可聚焦读取完整详情，表格按钮保持齐全");
    const elementLanguage = host.querySelector<HTMLSelectElement>('[data-testid="interface-language"]')!;
    elementLanguage.value = 'en'; elementLanguage.dispatchEvent(new Event('change', { bubbles: true }));
    await settleElementLayout();
    hoverCell(26);
    await new Promise(resolve => setTimeout(resolve, 0));
    check(!/[\u4e00-\u9fff]/.test(details.textContent ?? '') && /standard atomic/i.test(detailValue('mass-label')) && /electron configuration/i.test(detailValue('configuration-label')) && /shell/i.test(detailValue('shells-label')), "英文界面的新生成元素详情字段与说明均为英文");
    check(detailValue('mass') === '55.845(2)' && detailValue('shells') === '2, 8, 14, 2', "切换语言保留原子量精度和电子层数据");
    leaveCell(26); hoverCell(118);
    await new Promise(resolve => setTimeout(resolve, 0));
    check(!/[\u4e00-\u9fff]/.test(details.textContent ?? '') && /isotope/i.test(detailValue('mass-label')) && /predict/i.test(details.textContent ?? ''), "英文重元素详情保留同位素与预测状态说明");
    leaveCell(118);
    elementLanguage.value = 'zh'; elementLanguage.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    check(details.hidden && mounted!.getDraft().latex === beforeElementHover.latex && chemInput().value === beforeElementHover.chemistry, "中英文详情切换不改变任何公式或化学输入");
    elementCell(26).focus({ preventScroll: true });
    click('subject-math');
    check(details.hidden && !elementCell(26).hasAttribute('aria-describedby'), "聚焦元素后切换学科会收起详情并清理描述关联");
    click('subject-elements');

    // Obsidian nests the noneditable formula widget inside CodeMirror's outer
    // editable document. Dynamic UI labels must still localize in that context.
    const codeMirrorFixture = document.createElement('div');
    codeMirrorFixture.className = 'cm-content';
    codeMirrorFixture.contentEditable = 'true';
    const noneditableWidget = document.createElement('div');
    noneditableWidget.contentEditable = 'false';
    codeMirrorFixture.append(noneditableWidget);
    document.body.append(codeMirrorFixture);
    const fixtureSource = '\\ce{H2O}';
    const inlineFixture = mountEditor(noneditableWidget, {
      latex: fixtureSource, editing: true, display: false, initialMode: 'hybrid', compact: true, language: 'en',
      onSave: () => undefined, onCancel: () => undefined,
    });
    try {
      noneditableWidget.querySelector<HTMLButtonElement>('[data-action="subject-elements"]')!.click();
      await settleElementLayout();
      noneditableWidget.querySelector<HTMLButtonElement>('[data-action="element-26"]')!.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
      await new Promise(resolve => setTimeout(resolve, 0));
      const inlineDetails = noneditableWidget.querySelector<HTMLElement>('[data-testid="element-details"]')!;
      const inlineSource = noneditableWidget.querySelector<HTMLTextAreaElement>('[data-testid="latex-source"]')!;
      const inlineChemistry = noneditableWidget.querySelector<HTMLInputElement>('[data-testid="chemistry-input"]')!;
      check(!/[\u4e00-\u9fff]/.test(inlineDetails.textContent ?? '') && /Standard atomic weight/.test(inlineDetails.textContent ?? '') && /Electron configuration/.test(inlineDetails.textContent ?? '') && /Electrons per shell/.test(inlineDetails.textContent ?? '') && inlineFixture.getDraft().latex === fixtureSource && inlineSource.value === fixtureSource && inlineChemistry.value === 'H2O', "正文外层可编辑容器中的动态元素详情保持英文，源码与化学草稿不变");
    } finally {
      inlineFixture.destroy();
      codeMirrorFixture.remove();
    }
    const search = host.querySelector<HTMLInputElement>('[data-testid="element-search"]')!;
    search.value = "26"; search.dispatchEvent(new Event("input", { bubbles: true }));
    check(host.querySelectorAll('.vme-element-button[data-dimmed="false"]').length === 1, "按原子序数检索只高亮匹配元素");
    click("element-26");
    check(chemInput().value === "Fe" && host.querySelector<HTMLElement>('[data-action="subject-chemistry"]')!.getAttribute("aria-selected") === "true", "点击元素后插入化学输入框并切回化学工具");
    chemInput().setSelectionRange(0, 0);
    chemInput().dispatchEvent(new Event("select"));
    click("subject-elements"); click("element-8");
    check(chemInput().value === "OFe", "元素按化学输入框保存的光标位置插入");
    const retained = "\\ce{H2O\\bond{bad}}";
    inputSource(retained);
    check(mounted!.getDraft().latex === retained, "主源码收到化学解析异常时仍保留用户输入");
    check(host.querySelector<HTMLButtonElement>('[data-action="clear"]')!.disabled, "解析受阻时禁用清空，避免丢失无法由可视化撤销恢复的源码");
    click("clear");
    check(mounted!.getDraft().latex === retained, "禁用清空不会改动无效原始源码");
    inputSource("\\ce{H2O}");
    check(mounted!.field.getValue("latex-expanded") === "\\ce{H2O}", "修复化学源码后可恢复双向同步");
    open(retained, "hybrid");
    check(mounted!.getDraft().latex === retained && host.querySelector<HTMLButtonElement>('[data-action="save"]')!.disabled, "打开无效化学式不会导致编辑器崩溃且阻止保存");
    open("\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}", "hybrid", true, true);
    check(host.querySelector('.vme-heading [data-action="save"]') !== null && host.querySelectorAll('[data-action="save"]').length === 1, "正文紧凑编辑器顶部显示唯一保存按钮");
    check(parseFloat(getComputedStyle(host.querySelector<HTMLElement>(".vme-field-box")!).minHeight) <= 125 && parseFloat(getComputedStyle(host.querySelector<HTMLElement>(".vme-source")!).minHeight) <= 125, "正文 Hybrid 编辑区域使用紧凑高度");

    open("x", "hybrid", true, true); click("subject-units");
    const conversionSelect = (id: string, value: string) => {
      const select = host.querySelector<HTMLSelectElement>(`[data-testid="conversion-${id}"]`)!;
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const conversionValue = (value: string) => {
      const input = host.querySelector<HTMLInputElement>('[data-testid="conversion-value"]')!;
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const conversionResult = () => host.querySelector<HTMLOutputElement>('[data-testid="conversion-result"]')!.textContent ?? '';
    const length = UNIT_CATEGORIES.find(item => item.id === 'length')!;
    const inch = length.units.find(item => item.symbol === 'in')!;
    const centimeter = length.units.find(item => item.symbol === 'cm')!;
    check(host.querySelector<HTMLSelectElement>('[data-testid="conversion-category"]')!.options.length === UNIT_CATEGORIES.length, "单位换算列出所有支持类别");
    conversionSelect('category', 'length'); conversionSelect('from', inch.id); conversionSelect('to', centimeter.id); conversionValue('1');
    check(conversionResult() === '1 in = 2.54 cm', "离线长度换算：1 英寸等于 2.54 厘米");
    click('conversion-swap');
    check(conversionResult().startsWith('1 cm = 0.3937'), "交换单位后重新计算结果");
    conversionSelect('from', inch.id); conversionSelect('to', centimeter.id);
    click('conversion-use');
    check(host.querySelector<HTMLInputElement>('[data-testid="units-input"]')!.value === '2.54 cm' && mounted!.getDraft().latex === 'x', "使用换算结果只填入单位草稿，不自动改动当前公式");
    mounted!.field.position = -1; click('units-insert');
    check(mounted!.getDraft().latex.includes('x') && mounted!.getDraft().latex.includes('\\pu{2.54 cm}'), "明确插入后才把换算结果加入当前公式");
    conversionSelect('category', 'temperature'); conversionSelect('from', 'celsius'); conversionSelect('to', 'fahrenheit'); conversionValue('0');
    check(conversionResult() === '0 °C = 32 °F', "温度换算正确处理摄氏与华氏偏移");
    click('conversion-use');
    check(host.querySelector<HTMLInputElement>('[data-testid="units-input"]')!.value.startsWith('32 '), "温度换算结果可填入单位预览");
    const preservedQuantity = mounted!.getDraft().latex;
    conversionValue('not-a-number');
    check(host.querySelector<HTMLButtonElement>('[data-action="conversion-use"]')!.disabled && host.querySelector<HTMLInputElement>('[data-testid="conversion-value"]')!.value === 'not-a-number', "无效换算数值保留输入并禁用使用结果");
    check(mounted!.getDraft().latex === preservedQuantity, "无效换算不会修改当前公式");
    conversionValue('1');

    const interfaceLanguage = host.querySelector<HTMLSelectElement>('[data-testid="interface-language"]')!;
    const beforeLanguage = mounted!.getDraft().latex;
    const beforeUnitInput = host.querySelector<HTMLInputElement>('[data-testid="units-input"]')!.value;
    interfaceLanguage.value = 'en'; interfaceLanguage.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    check(host.querySelector<HTMLButtonElement>('[data-action="save"]')!.textContent === 'Save changes', "语言选项切换到英文按钮与界面");
    check(mounted!.getDraft().latex === beforeLanguage && host.querySelector<HTMLInputElement>('[data-testid="units-input"]')!.value === beforeUnitInput, "切换语言不会翻译或改动公式与单位输入");
    check(host.querySelector<HTMLSelectElement>('[data-testid="conversion-category"]')!.options[0].textContent === UNIT_CATEGORIES[0].labelEn, "换算类别显示英文名称且保留稳定选项值");
    inputSource('\\frac{1}{');
    await new Promise(resolve => setTimeout(resolve, 0));
    check(!/[\u4e00-\u9fff]/.test(host.querySelector<HTMLElement>('.vme-error')!.textContent ?? ''), "英文界面的后续校验提示也保持英文");
    interfaceLanguage.value = 'zh'; interfaceLanguage.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    check(host.querySelector<HTMLButtonElement>('[data-action="save"]')!.textContent === '保存修改' && mounted!.getDraft().latex === '\\frac{1}{', "切回中文仍保留未完成源码");
    await checkPlotTools(check);
    await checkIntegratedPlot(check);
    await checkComplexTools(check);
    await checkComplexRenderer(check);
    await checkPlotGestures(check);
    await checkAutomaticPlotPreview(check);
    await checkSavedPlotLocalization(check);
    open("\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}", "hybrid", true, true);
    result.textContent = reports.join("\n") + `\n\n${reports.length} 项组件测试通过。`;
  } catch (error) { result.textContent = reports.join("\n") + "\n失败 · " + String(error); }
};
open();
