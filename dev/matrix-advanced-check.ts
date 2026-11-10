import type { MathfieldElement } from 'mathlive';
import { mountEditor, type EditorDraft, type EditorMode } from '../src/editor-ui';
import { ADVANCED_MATH_TEMPLATES } from '../src/advanced-math';
import { parseMatrix } from '../src/matrix';
import { hasIncompleteSlots } from '../src/validation';
import type { Language } from '../src/i18n';

/** Browser-component checks only: native note persistence is a separate acceptance step. */
export async function checkMatrixAdvanced(check: (condition: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div'); document.body.append(fixture);
  let mounted: ReturnType<typeof mountEditor> | undefined;
  const writes: string[] = []; let outerCancels = 0;
  const settle = async () => { await Promise.resolve(); await new Promise<void>(resolve => setTimeout(resolve, 0)); };
  const open = async (latex = 'x+1', mode: EditorMode = 'hybrid', matrixDraft?: EditorDraft['matrix'], language: Language = 'en') => {
    mounted?.destroy(); fixture.replaceChildren();
    mounted = mountEditor(fixture, {
      latex, editing: true, display: true, initialMode: mode, language, compact: true, matrixDraft,
      onSave: value => { writes.push(value); }, onCancel: () => { outerCancels++; },
    });
    await settle();
  };
  const node = <T extends HTMLElement = HTMLElement>(id: string): T => {
    const item = fixture.querySelector<T>(`[data-testid="${id}"]`);
    if (!item) throw new Error(`Matrix regression: missing ${id}`);
    return item;
  };
  const button = (action: string): HTMLButtonElement => {
    const item = fixture.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
    if (!item) throw new Error(`Matrix regression: missing ${action} action`);
    return item;
  };
  const act = async (action: string) => { button(action).click(); await settle(); };
  const cell = (row: number, column: number) => node<MathfieldElement>(`matrix-cell-${row}-${column}`);
  const enterCell = async (row: number, column: number, value: string) => {
    const field = cell(row, column); field.setValue(value, { silenceNotifications: true });
    // Exercise the same input event used by a real visual edit, not a draft-only assignment.
    field.dispatchEvent(new Event('input', { bubbles: true })); await settle();
  };
  const select = async (id: string, value: string) => {
    const input = node<HTMLSelectElement>(id); input.value = value;
    input.dispatchEvent(new Event('change', { bubbles: true })); await settle();
  };
  const pasteCell = async (row: number, column: number, original: string) => {
    const data = new DataTransfer(); data.setData('text/plain', original);
    cell(row, column).dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    await settle();
  };
  const values = () => mounted!.getDraft().matrix?.cells;
  const focusCell = async (field: MathfieldElement) => {
    field.focus();
    // MathLive 0.111.1 defers keyboardDelegate.focus() by 60ms. Observe its
    // actual DOM focus, without dispatching a synthetic focus event or retrying
    // the production action. Failed focus still reaches the unchanged assertion.
    const deadline = performance.now() + 200;
    while ((document.activeElement !== field || !field.hasFocus()) && performance.now() < deadline) {
      await new Promise<void>(resolve => setTimeout(resolve, 5));
    }
  };
  try {
    await open(); const initialWrites = writes.length;
    await act('matrix-toggle');
    check(!node('matrix-panel').hidden && fixture.querySelectorAll('[data-testid^="matrix-cell-"]').length === 4, '矩阵：打开默认2×2可视化单元格');
    check(mounted!.field.readOnly && node<HTMLTextAreaElement>('latex-source').readOnly && button('save').disabled, '矩阵：独立草稿打开期间锁定主公式和保存');
    check(button('advanced-limit').disabled && button('import-open').disabled, '矩阵：独立草稿打开期间锁定其他结构插入和公式导入');
    await enterCell(1, 1, '1'); await enterCell(1, 2, '2'); await enterCell(2, 1, '3');
    const lockedGrid = JSON.stringify(values());
    const lockedSource = mounted!.getDraft().latex;
    for (const [label, target] of [
      ['可视化主公式', mounted!.field], ['全选主源码', node<HTMLTextAreaElement>('latex-source')],
    ] as const) {
      if (target instanceof HTMLTextAreaElement) target.setSelectionRange(0, target.value.length);
      const data = new DataTransfer(); data.setData('text/plain', String.raw`\unknownMatrixMacro{x}`);
      target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      await settle();
      check(node('formula-import-panel').hidden && mounted!.getDraft().latex === lockedSource
        && JSON.stringify(values()) === lockedGrid && writes.length === initialWrites,
        `矩阵：编辑期间${label}粘贴未知命令不会打开导入、改主式、改网格或写笔记`);
      check(!button('matrix-cancel').disabled && !node('matrix-panel').hidden,
        `矩阵：编辑期间${label}粘贴后仍可取消矩阵草稿，不陷入交叉面板锁定`);
    }
    await act('matrix-cancel');
    check(node('matrix-panel').hidden && !mounted!.field.readOnly && mounted!.getDraft().latex === lockedSource
      && writes.length === initialWrites, '矩阵：拦截两处主公式粘贴后实际取消仍可恢复主编辑器');
    await act('matrix-toggle');
    check(JSON.stringify(values()) === lockedGrid && cell(1, 1).getValue('latex') === '1'
      && cell(2, 1).getValue('latex') === '3', '矩阵：拦截主公式粘贴并取消后重开仍保留网格原值');
    await act('matrix-preview');
    check(button('matrix-apply').disabled && node('matrix-status').dataset.state === 'error', '矩阵：缺格显示问题并阻止应用，不默认补0');
    check(values()?.[1]?.[1] === '' && mounted!.getDraft().latex === 'x+1' && writes.length === initialWrites, '矩阵：缺格检查保留空白、原公式及未保存笔记');
    await act('matrix-fill-zero');
    check(values()?.[1]?.[1] === '0' && values()?.[0]?.[0] === '1', '矩阵：明确填0只填空格并保留已有值');
    await enterCell(2, 2, '4');
    await select('matrix-rows', '1'); await select('matrix-columns', '1');
    check(fixture.querySelectorAll('[data-testid^="matrix-cell-"]').length === 1 && values()?.[1]?.[1] === '4', '矩阵：缩小尺寸时保留隐藏单元格草稿');
    await select('matrix-rows', '2'); await select('matrix-columns', '2');
    check(cell(1, 2).getValue('latex') === '2' && cell(2, 1).getValue('latex') === '3' && cell(2, 2).getValue('latex') === '4', '矩阵：再次扩大尺寸恢复逐格原值');
    await act('matrix-preview');
    const matrixPreview = node('matrix-preview').querySelector<MathfieldElement>('math-field');
    const previewData = matrixPreview ? parseMatrix(matrixPreview.getValue('latex-expanded')) : null;
    check(!button('matrix-apply').disabled && node('matrix-status').dataset.state === 'ready'
      && Boolean(matrixPreview?.readOnly) && matrixPreview?.errors.length === 0
      && previewData?.cells[0][0] === '1' && previewData.cells[1][1] === '4', '矩阵：完整2×2提供真实只读MathLive预览并允许明确应用');
    check(mounted!.getDraft().latex === 'x+1' && writes.length === initialWrites && button('save').disabled, '矩阵：预览不改变主公式且不能绕过应用直接保存');
    await enterCell(2, 2, '5');
    check(!button('matrix-apply').disabled && node('matrix-status').dataset.state === 'ready', '矩阵：修改单元格实时更新预览并允许直接应用');
    await enterCell(2, 2, '');
    check(button('matrix-apply').disabled, '矩阵：清空单元格后阻止应用');
    await enterCell(2, 2, '4'); await act('matrix-preview');
    await act('matrix-cancel');
    check(node('matrix-panel').hidden && mounted!.getDraft().latex === 'x+1' && writes.length === initialWrites && outerCancels === 0, '矩阵：取消只关闭矩阵草稿，不关闭主编辑器或写笔记');
    check(!mounted!.field.readOnly && !button('save').disabled, '矩阵：取消后恢复主公式编辑和保存');
    await act('matrix-toggle');
    check(cell(2, 2).getValue('latex') === '4' && !button('matrix-apply').disabled, '矩阵：本次会话重开保留单元格并自动实时预览');
    await act('matrix-preview'); mounted!.field.position = -1;
    await act('matrix-apply'); const appended = mounted!.getDraft().latex;
    check(node('matrix-panel').hidden && appended.includes('x+1') && appended.includes('\\begin{bmatrix}') && writes.length === initialWrites, '矩阵：明确插入追加到当前公式草稿，仍未写笔记');
    check(!mounted!.field.readOnly && !button('save').disabled, '矩阵：插入成功后恢复主公式和保存');
    await act('undo'); check(mounted!.getDraft().latex === 'x+1', '矩阵：撤销插入恢复原公式');
    await act('redo'); check(mounted!.getDraft().latex === appended, '矩阵：重做插入恢复完整矩阵草稿');
    await act('save');
    check(writes.length === initialWrites + 1 && writes.at(-1) === appended, '矩阵：最终明确保存才调用一次笔记写入回调');

    const original = String.raw`\begin{pmatrix}1 & \frac{2}{3} \\ \sqrt{x} & 4\end{pmatrix}`;
    await open(original); const loadWrites = writes.length; await act('matrix-toggle'); await act('matrix-load');
    check(node<HTMLSelectElement>('matrix-kind').value === 'pmatrix' && cell(1, 1).getValue('latex') === '1' && cell(2, 2).getValue('latex') === '4', '矩阵：载入受支持的整条矩阵，恢复括号和单元格');
    check(cell(1, 2).getValue('latex').includes('frac') && cell(2, 1).getValue('latex').includes('sqrt'), '矩阵：分数和根号单元格可视化载入');
    await enterCell(1, 1, '9'); await act('matrix-preview');
    check(mounted!.getDraft().latex === original && writes.length === loadWrites, '矩阵：载入后预览局部修改仍保留主公式原文');
    await act('matrix-apply'); const replacement = mounted!.getDraft().latex; const parsed = parseMatrix(replacement);
    check(parsed?.kind === 'pmatrix' && parsed.cells[0][0] === '9' && parsed.cells[1][1] === '4' && replacement.indexOf('\\begin{pmatrix}') === replacement.lastIndexOf('\\begin{pmatrix}'), '矩阵：明确替换整条矩阵，保留其他单元格且不重复追加');
    await act('undo'); check(mounted!.getDraft().latex === original, '矩阵：撤销替换恢复包含空白的精确原始源码');
    await act('redo'); check(mounted!.getDraft().latex === replacement, '矩阵：重做整条替换');
    for (const mode of ['latex', 'visual', 'hybrid'] as const) await act(`mode-${mode}`);
    check(mounted!.getDraft().latex === replacement, '矩阵：仅切换三模式保留已应用矩阵源码');
    await act('save'); await open(writes.at(-1)!);
    check(parseMatrix(mounted!.getDraft().latex)?.cells[0][0] === '9', '矩阵：保存回调后的组件重挂载保留修改；不代替原生保存重开验收');

    await open(); await act('matrix-toggle'); await enterCell(1, 1, '7');
    const rejectedOriginal = 'x % keep this exact comment\r\n+y';
    await pasteCell(1, 1, rejectedOriginal);
    check(cell(1, 1).getValue('latex') === '7' && values()?.[0]?.[0] === '7' && node('matrix-status').dataset.state === 'error', '矩阵：无效单元格粘贴不会删除原单元格或猜测数学含义');
    check(mounted!.getDraft().matrix?.rejectedOriginal === rejectedOriginal && node<HTMLTextAreaElement>('matrix-rejected-original').value === rejectedOriginal.replace(/\r\n/g, '\n'), '矩阵：被拒绝粘贴的精确CRLF原文独立保留，显示层仅按HTML转换换行');
    check(mounted!.getDraft().latex === 'x+1' && button('save').disabled, '矩阵：拒绝粘贴后主公式未改且草稿仍受保护');
    const draft = mounted!.getDraft(); await open(draft.latex, draft.mode, draft.matrix);
    check(!node('matrix-panel').hidden && cell(1, 1).getValue('latex') === '7' && button('save').disabled, '矩阵：打开中的草稿重挂载恢复单元格和主公式锁定');
    check(mounted!.getDraft().matrix?.rejectedOriginal === rejectedOriginal && !node<HTMLTextAreaElement>('matrix-rejected-original').hidden, '矩阵：草稿重挂载保留被拒绝的精确原文');
    await act('matrix-cancel'); const closed = mounted!.getDraft();
    await open(closed.latex, closed.mode, closed.matrix); await act('matrix-toggle');
    check(cell(1, 1).getValue('latex') === '7' && mounted!.getDraft().matrix?.rejectedOriginal === rejectedOriginal, '矩阵：关闭状态重挂载后仍可恢复本次会话草稿及原文');
    await act('matrix-load');
    check(node('matrix-status').dataset.state === 'error' && cell(1, 1).getValue('latex') === '7' && mounted!.getDraft().latex === 'x+1', '矩阵：普通方程不假定为整条矩阵，载入失败保留当前草稿');
    await act('matrix-cancel');

    // A beginner can create cell fractions and radicals from shared buttons,
    // then fill their slots visually without typing a LaTeX command.
    await open(); const cellToolsWrites = writes.length; await act('matrix-toggle');
    const focusDiagnostic = () => ({
      activeLocalName: document.activeElement?.localName,
      activeTestId: (document.activeElement as HTMLElement | null)?.dataset.testid,
      activeId: document.activeElement?.id,
      cell22: cell(2, 2).getValue('latex'), cell11: cell(1, 1).getValue('latex'),
      hasFocus22: cell(2, 2).hasFocus(), hasFocus11: cell(1, 1).hasFocus(),
    });
    await focusCell(cell(2, 2)); const beforeFractionButton = focusDiagnostic();
    await act('matrix-cell-fraction');
    check(cell(2, 2).getValue('latex').includes('\\frac') && hasIncompleteSlots(cell(2, 2).getValue('latex-expanded'))
      && cell(1, 1).getValue('latex') === '', `矩阵：分数按钮只作用于当前单元格，保留可填写方框；诊断=${JSON.stringify({ beforeFractionButton, afterFractionButton: focusDiagnostic() })}`);
    cell(2, 2).insert('1', { format: 'latex', mode: 'math', selectionMode: 'after', feedback: false });
    cell(2, 2).executeCommand('moveToNextPlaceholder');
    cell(2, 2).insert('2', { format: 'latex', mode: 'math', selectionMode: 'after', feedback: false });
    cell(2, 2).dispatchEvent(new Event('input', { bubbles: true })); await settle();
    check(!hasIncompleteSlots(cell(2, 2).getValue('latex-expanded')) && cell(2, 2).getValue('latex').includes('frac'), '矩阵：分数单元格可逐个填写分子分母');
    await focusCell(cell(2, 1)); await act('matrix-cell-root');
    check(cell(2, 1).getValue('latex').includes('\\sqrt') && hasIncompleteSlots(cell(2, 1).getValue('latex-expanded'))
      && cell(2, 2).getValue('latex').includes('frac'), '矩阵：根号按钮跟随新焦点，不改相邻分数单元格');
    cell(2, 1).insert('x', { format: 'latex', mode: 'math', selectionMode: 'after', feedback: false });
    cell(2, 1).dispatchEvent(new Event('input', { bubbles: true })); await settle();
    check(!hasIncompleteSlots(cell(2, 1).getValue('latex-expanded')) && cell(2, 1).getValue('latex').includes('sqrt'), '矩阵：根号单元格的方框可直接填写');
    check(mounted!.getDraft().latex === 'x+1' && writes.length === cellToolsWrites && button('save').disabled, '矩阵：单元格结构工具仅修改独立矩阵草稿，不改变主公式或笔记');
    await act('matrix-cancel');

    for (const language of ['en', 'zh', 'es'] as const) {
      await open('x+1', 'hybrid', undefined, language); await act('matrix-toggle'); await act('matrix-preview');
      const matrixText = node('matrix-tools').textContent ?? '';
      const advancedText = node('advanced-math-tools').textContent ?? '';
      if (language === 'zh') {
        check(matrixText.includes('矩阵') && matrixText.includes('所有单元格都需要填写'), '语言：中文矩阵工具和错误提示可用');
        check(advancedText.includes('高等数学模板') && advancedText.includes('填写方框'), '语言：中文高等数学标签说明可用');
      } else {
        check(!/[\u4e00-\u9fff]/.test(matrixText) && matrixText.includes(language === 'en' ? 'Matrix' : 'Matriz'), `语言：${language}矩阵工具及动态错误提示无残留中文`);
        check(!/[\u4e00-\u9fff]/.test(advancedText) && advancedText.includes(language === 'en' ? 'Advanced math' : 'Matemáticas avanzadas'), `语言：${language}高等数学标签和说明完整翻译`);
      }
      await act('matrix-cancel');
    }

    for (const template of ADVANCED_MATH_TEMPLATES) {
      await open('', 'hybrid'); const count = writes.length;
      await act(`advanced-${template.id}`); const incomplete = mounted!.getDraft().latex;
      check(Boolean(incomplete) && hasIncompleteSlots(incomplete) && incomplete.includes('\\placeholder'), `高等数学：${template.id}插入真实可填写结构`);
      await act('save');
      check(writes.length === count && mounted!.getDraft().latex === incomplete, `高等数学：${template.id}未填方框时保存不写笔记且保留结构`);
      await act('undo'); check(mounted!.getDraft().latex === '', `高等数学：${template.id}结构插入可撤销`);
      await act('redo'); check(mounted!.getDraft().latex === incomplete, `高等数学：${template.id}结构插入可重做`);
      const source = node<HTMLTextAreaElement>('latex-source'); source.value = template.example;
      source.dispatchEvent(new Event('input', { bubbles: true })); await settle();
      check(!hasIncompleteSlots(mounted!.getDraft().latex) && !mounted!.field.hidden && !button('save').disabled, `高等数学：${template.id}完整示例支持可视化并允许保存`);
      for (const mode of ['latex', 'visual', 'hybrid'] as const) await act(`mode-${mode}`);
      check(mounted!.getDraft().latex === template.example, `高等数学：${template.id}完整示例切换三模式不改源码`);
      await act('save');
      check(writes.length === count + 1 && writes.at(-1) === template.example, `高等数学：${template.id}完成示例仅明确保存时写入`);
    }
  } finally { mounted?.destroy(); fixture.remove(); }
}
