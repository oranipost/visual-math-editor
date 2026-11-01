import { convertLatexToMarkup } from 'mathlive';
import { mountEditor, type EditorMode } from '../src/editor-ui';
import { MATH_SYMBOL_TOOLS } from '../src/math-symbols';
import { hasIncompleteSlots } from '../src/validation';
import type { Language } from '../src/i18n';

/** Real MathLive component checks; save callbacks/remounts do not replace native vault acceptance. */
export async function checkMathSymbols(check: (condition: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div'); document.body.append(fixture);
  let mounted: ReturnType<typeof mountEditor> | undefined;
  const writes: string[] = [];
  const settle = async () => { await Promise.resolve(); await new Promise<void>(resolve => setTimeout(resolve, 0)); };
  const button = (action: string) => {
    const result = fixture.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
    if (!result) throw new Error(`Math-symbol regression: missing ${action}`);
    return result;
  };
  const source = () => fixture.querySelector<HTMLTextAreaElement>('[data-testid="latex-source"]')!;
  const panel = () => fixture.querySelector<HTMLDetailsElement>('[data-testid="math-symbol-tools"]')!;
  const open = async (latex = '', mode: EditorMode = 'hybrid', language: Language = 'en') => {
    mounted?.destroy(); fixture.replaceChildren();
    mounted = mountEditor(fixture, { latex, initialMode: mode, language, display: true, compact: true, onSave: value => { writes.push(value); }, onCancel: () => undefined });
    await settle(); panel().open = true;
  };
  const act = async (action: string) => { button(action).click(); await settle(); };
  const visualEdit = async (latex: string) => {
    mounted!.field.insert(latex, { format: 'latex', mode: 'math', selectionMode: 'after', feedback: false });
    mounted!.field.dispatchEvent(new Event('input', { bubbles: true })); await settle();
  };
  const sourceEdit = async (latex: string) => {
    source().value = latex; source().dispatchEvent(new Event('input', { bubbles: true })); await settle();
  };
  try {
    for (const id of ['sin', 'cos', 'tan']) {
      await open(); const count = writes.length; await act(`math-${id}`);
      const incomplete = mounted!.getDraft().latex;
      check(incomplete.includes(`\\${id}`) && hasIncompleteSlots(incomplete) && mounted!.field.errors.length === 0, `三角函数：${id}按钮插入真实MathLive函数与可填参数`);
      check(button('save').disabled && writes.length === count, `三角函数：${id}参数为空时不允许保存，按钮不写笔记`);
      await visualEdit('x'); const filled = mounted!.getDraft().latex;
      check(filled.includes(`\\${id}`) && filled.includes('x') && !hasIncompleteSlots(filled) && !button('save').disabled, `三角函数：${id}直接填写选中的参数框即可完成函数`);
      check(source().value === filled, `三角函数：${id}右侧可视化填写同步到左侧源码`);
      const sourceChange = filled.replace('x', String.raw`\theta`);
      await sourceEdit(sourceChange);
      check(mounted!.getDraft().latex === sourceChange && mounted!.field.getValue('latex-expanded').includes('\\theta') && mounted!.field.errors.length === 0, `三角函数：${id}左侧局部改参数同步到右侧可编辑结构`);
      mounted!.field.position = -1; await visualEdit('+1'); const edited = mounted!.getDraft().latex;
      check(source().value === edited && edited.includes('+1') && edited.includes(`\\${id}`), `三角函数：${id}右侧继续局部编辑后源码保持同步`);
      for (const mode of ['visual', 'latex', 'hybrid'] as const) await act(`mode-${mode}`);
      check(mounted!.getDraft().latex === edited && writes.length === count, `三角函数：${id}三模式切换保持完整源码，不写笔记`);
      await act('save'); check(writes.length === count + 1 && writes.at(-1) === edited, `三角函数：${id}仅明确保存时写入一次`);
      await open(writes.at(-1)!);
      check(mounted!.getDraft().latex === edited && mounted!.field.errors.length === 0, `三角函数：${id}保存回调后组件重挂载恢复，不替代原生验收`);
      await open('x+1'); mounted!.field.executeCommand('selectAll'); await act(`math-${id}`);
      const wrapped = mounted!.getDraft().latex;
      check(wrapped.includes(`\\${id}`) && wrapped.includes('x+1') && !hasIncompleteSlots(wrapped), `三角函数：${id}套用已有选区，保留选中表达式`);
      await act('undo'); check(mounted!.getDraft().latex === 'x+1', `三角函数：${id}套用结构可撤销恢复原式`);
    }
    for (const [id, glyph] of [['similar', '∼'], ['congruent', '≅'], ['angle', '∠'], ['triangle', '△'], ['right-angle', '90']] as const) {
      await open(); const count = writes.length; await act(`math-${id}`); const draft = mounted!.getDraft().latex;
      check(!hasIncompleteSlots(draft) && mounted!.field.errors.length === 0 && !convertLatexToMarkup(draft).includes('ML__error'), `几何符号：${id}插入真实受支持符号，不保留未知命令`);
      check(convertLatexToMarkup(draft).includes(glyph) && !draft.includes('\\perp'), `几何符号：${id}显示预期含义且不混作垂直符号`);
      if (id === 'right-angle') check(/90/.test(draft) && /\\(?:circ|degree)/.test(draft), '几何符号：直角明确保存为90°，不使用不支持的rightangle命令');
      for (const mode of ['visual', 'latex', 'hybrid'] as const) await act(`mode-${mode}`);
      check(mounted!.getDraft().latex === draft && writes.length === count, `几何符号：${id}三模式切换保留语义，不写笔记`);
      await act('undo'); check(mounted!.getDraft().latex === '', `几何符号：${id}插入可撤销`);
      await act('redo'); check(mounted!.getDraft().latex === draft, `几何符号：${id}插入可重做`);
    }
    await open('x+1'); await act('matrix-toggle');
    check(MATH_SYMBOL_TOOLS.every(tool => button(`math-${tool.id}`).disabled), '矩阵独立草稿期间锁定全部新符号按钮，避免修改主公式');
    await act('matrix-cancel'); check(MATH_SYMBOL_TOOLS.every(tool => !button(`math-${tool.id}`).disabled), '取消矩阵草稿恢复全部新符号按钮');
    for (const language of ['en', 'zh', 'es'] as const) {
      await open('', 'hybrid', language); const text = panel().textContent ?? '';
      check(text.includes(language === 'en' ? 'Trigonometry and geometry symbols' : language === 'es' ? 'Trigonometría y símbolos geométricos' : '三角函数与几何符号'), `符号面板：${language}分组标题可用`);
      if (language !== 'zh') check(!/[\u4e00-\u9fff]/.test(text) && MATH_SYMBOL_TOOLS.every(tool => !/[\u4e00-\u9fff]/.test(button(`math-${tool.id}`).getAttribute('aria-label') ?? '')), `符号面板：${language}说明、可见标签与无障碍名称无残留中文`);
      check(MATH_SYMBOL_TOOLS.every(tool => fixture.querySelectorAll(`[data-action="math-${tool.id}"]`).length === 1), `符号面板：${language}每种函数与几何符号只有一个主Math按钮`);
    }
  } finally { mounted?.destroy(); fixture.remove(); }
}
