import { mountEditor, type EditorDraft } from '../src/editor-ui';
import type { PlotSpec } from '../src/plot-engine';

/** Real MathLive/browser regression checks for the equation-linked graph flow. */
export async function checkInlineEquationGraph(check: (condition: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div');
  document.body.append(fixture);
  let editor: ReturnType<typeof mountEditor> | undefined;
  const writes: { spec: PlotSpec; latex: string }[] = [];
  const settle = async (delay = 0) => {
    await Promise.resolve();
    await new Promise(resolve => setTimeout(resolve, delay));
  };
  const show = (draft?: EditorDraft) => {
    editor?.destroy();
    editor = mountEditor(fixture, {
      latex: draft?.latex ?? 'y=x^2', initialMode: draft?.mode ?? 'hybrid',
      display: draft?.display ?? true, scienceDraft: draft?.science, plotDraft: draft?.plot,
      compact: true, language: 'en',
      onSave: () => undefined, onCancel: () => undefined,
      onSaveGraph: async (spec, latex) => { writes.push({ spec, latex }); },
    });
  };
  const button = (action: string) => fixture.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
  const source = (latex: string) => {
    const input = fixture.querySelector<HTMLTextAreaElement>('[data-testid="latex-source"]')!;
    input.value = latex; input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const range = (id: string, value: string) => {
    const input = fixture.querySelector<HTMLInputElement>(`[data-testid="plot-${id}"]`)!;
    input.value = value; input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const svg = () => fixture.querySelector<SVGElement>('[data-testid="plot-preview"] svg');
  const status = () => fixture.querySelector<HTMLElement>('[data-testid="plot-status"]')!;
  const root = () => fixture.querySelector<HTMLElement>('[data-testid="visual-math-editor"]')!;
  try {
    show(); await settle();
    check(button('graph-equation').getAttribute('aria-expanded') === 'false' && !svg(), '公式下方提供单次绘图入口，初始不插入默认图像');
    button('graph-equation').click(); await settle();
    const graphSection = fixture.querySelector<HTMLElement>('[data-testid="equation-graph"]')!;
    check(root().dataset.subject === 'math' && graphSection.contains(svg()) && editor!.getDraft().plot?.expression === 'x^2', '直接在当前公式下面生成曲线，无需切换 Graph 学科或重复输入函数');
    check(fixture.querySelector<HTMLInputElement>('[data-testid="plot-expression"]')!.hidden
      && fixture.querySelector<HTMLSelectElement>('[data-testid="plot-kind"]')!.parentElement!.hidden,
    '公式关联绘图隐藏独立函数输入框与图像类型，防止两个公式来源分叉');
    check(button('plot-insert').textContent === 'Insert equation and graph' && writes.length === 0, '明确显示同时插入公式与图像，预览本身不写笔记');

    range('xMin', '-5'); range('xMax', '5'); button('plot-preview').click(); await settle();
    source(String.raw`y=\frac{1}{x}`);
    check(!svg(), '公式修改后立即移除过时曲线');
    await settle(350);
    check(Boolean(svg()) && editor!.getDraft().plot?.expression === '(1)/(x)'
      && editor!.getDraft().plot?.xMin === '-5' && editor!.getDraft().plot?.xMax === '5', '公式自动更新曲线，并保留用户调整的坐标范围');

    source('x^2+y^2=1'); await settle();
    check(!svg() && button('plot-insert').disabled && status().dataset.state === 'error'
      && status().textContent!.includes('Implicit equations'), '隐式或多变量方程显示支持范围，并禁止插入旧曲线');
    button('plot-insert').click(); await settle();
    check(writes.length === 0, '不支持的公式不会因为已有历史预览而被写入');

    source(String.raw`y=\sqrt{x}`);
    button('plot-insert').click(); await settle();
    check(writes.length === 1 && writes[0].spec.expression === 'sqrt(x)' && writes[0].latex === String.raw`y=\sqrt{x}`
      && writes[0].spec.xMin === -5 && writes[0].spec.xMax === 5, '自动预览尚未完成时直接插入也同步验证最新公式，公式与图像一致');

    editor!.field.setValue('x^3'); editor!.field.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(350);
    check(Boolean(svg()) && editor!.getDraft().plot?.expression === 'x^3'
      && fixture.querySelector<HTMLTextAreaElement>('[data-testid="latex-source"]')!.value === 'x^3', '右侧可视化修改同样同步源码和下方图像');
    const recovered = editor!.getDraft();
    show(recovered); await settle();
    check(button('graph-equation').getAttribute('aria-expanded') === 'true' && Boolean(svg())
      && editor!.getDraft().plot?.equationLinked === true && editor!.getDraft().plot?.xMin === '-5', '编辑器重新挂载恢复关联图像、公式及坐标视图草稿');

    editor!.field.setValue('x+2');
    button('plot-insert').click(); await settle();
    check(writes.length === 1 && !svg() && status().dataset.state === 'error', '尚未派发 input 的可视化修改也不会造成公式与图像不一致的写入');
    button('plot-preview').click(); button('plot-insert').click(); await settle();
    check(writes.length === 2 && writes[1].latex === 'x+2' && writes[1].spec.expression === 'x+2', '重新预览后可保存已刷新且一致的公式与图像');

    button('subject-graph').click(); await settle();
    check(root().dataset.subject === 'graph' && !fixture.querySelector<HTMLInputElement>('[data-testid="plot-expression"]')!.hidden
      && !fixture.querySelector<HTMLSelectElement>('[data-testid="plot-kind"]')!.parentElement!.hidden,
    '独立 Graph 工具继续提供手动函数及复平面入口');
    const kind = fixture.querySelector<HTMLSelectElement>('[data-testid="plot-kind"]')!;
    kind.value = 'complex'; kind.dispatchEvent(new Event('change', { bubbles: true }));
    const complex = fixture.querySelector<HTMLTextAreaElement>('[data-testid="complex-points"]')!;
    complex.value = '4-3i'; complex.dispatchEvent(new Event('input', { bubbles: true }));
    button('plot-preview').click(); await settle();
    button('subject-math').click(); button('graph-equation').click(); await settle();
    check(root().dataset.subject === 'math' && editor!.getDraft().plot?.mode === 'function' && Boolean(svg()), '从复平面返回公式绘图时自动使用当前公式，无需重新填写');
    button('subject-graph').click();
    kind.value = 'complex'; kind.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
    check(complex.value === '4-3i', '公式关联图像不会覆盖已有复数草稿');
  } finally {
    editor?.destroy(); fixture.remove();
  }
}
