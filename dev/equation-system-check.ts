import type { MathfieldElement } from 'mathlive';
import { mountEditor, type EditorDraft, type EditorMode } from '../src/editor-ui';
import { buildSystem, parseSystem } from '../src/equation-system';
import type { Language } from '../src/i18n';
import { hasIncompleteSlots } from '../src/validation';

/** Real MathLive component checks, not native vault persistence evidence. */
export async function checkEquationSystems(check: (condition: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div'); document.body.append(fixture);
  let mounted: ReturnType<typeof mountEditor> | undefined;
  const writes: string[] = []; let cancels = 0; let failSave = false;
  const settle = async () => { await Promise.resolve(); await new Promise<void>(resolve => setTimeout(resolve, 0)); };
  const open = async (latex = 'x+1', mode: EditorMode = 'hybrid', systemDraft?: EditorDraft['system'], language: Language = 'en') => {
    mounted?.destroy(); fixture.replaceChildren();
    mounted = mountEditor(fixture, { latex, editing: true, display: true, initialMode: mode, compact: true, systemDraft, language,
      onSave: value => { if (failSave) throw new Error('Note changed'); writes.push(value); }, onCancel: () => { cancels++; } });
    await settle();
  };
  const node = <T extends HTMLElement = HTMLElement>(id: string): T => {
    const element = fixture.querySelector<T>(`[data-testid="${id}"]`);
    if (!element) throw new Error(`System regression: missing ${id}`); return element;
  };
  const button = (action: string): HTMLButtonElement => {
    const element = fixture.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
    if (!element) throw new Error(`System regression: missing ${action}`); return element;
  };
  const act = async (action: string) => { button(action).click(); await settle(); };
  const line = (row: number) => node<MathfieldElement>(`system-line-${row}`);
  const enter = async (row: number, value: string) => { const field = line(row); field.setValue(value, { silenceNotifications: true }); field.dispatchEvent(new Event('input', { bubbles: true })); await settle(); };
  const resize = async (rows: number) => { const select = node<HTMLSelectElement>('system-rows'); select.value = String(rows); select.dispatchEvent(new Event('change', { bubbles: true })); await settle(); };
  const paste = async (target: HTMLElement, original: string) => {
    const data = new DataTransfer(); data.setData('text/plain', original);
    target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })); await settle();
  };
  const draft = () => mounted!.getDraft();
  const sinkName = (field: MathfieldElement): string | null | undefined => field.shadowRoot?.querySelector('[part="keyboard-sink"]')?.getAttribute('aria-label');
  const changeLanguage = async (value: 'en' | 'es' | 'zh') => {
    const select = node<HTMLSelectElement>('interface-language'); select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true })); await settle();
  };

  try {
    await open(); await act('system-toggle');
    const initialFocus = document.activeElement; const initialA11yDraft = JSON.stringify(draft().system?.lines);
    check(!line(1).hasFocus() && !line(2).hasFocus() && sinkName(line(1)) === 'Equation row 1' && sinkName(line(2)) === 'Equation row 2', '方程组无障碍：英文首次未聚焦时内层输入名称已本地化');
    for (const [language, expected] of [['es', 'Fila de ecuación'], ['zh', '方程行'], ['en', 'Equation row']] as const) {
      await changeLanguage(language);
      check(sinkName(line(1)) === `${expected} 1` && sinkName(line(2)) === `${expected} 2`
        && line(1).getAttribute('aria-label') === `${expected} 1`, `方程组无障碍：${language}切换同步外层与内层名称，无需聚焦`);
    }
    check(document.activeElement === initialFocus && JSON.stringify(draft().system?.lines) === initialA11yDraft && draft().latex === 'x+1', '方程组无障碍：语言同步不改变焦点、行草稿或主公式');
    await changeLanguage('es'); await resize(3);
    check(!line(3).hasFocus() && sinkName(line(3)) === 'Fila de ecuación 3', '方程组无障碍：西语动态增行未聚焦即有正确输入名称');
    await act('system-cancel'); await act('matrix-toggle');
    const matrixCell = node<MathfieldElement>('matrix-cell-1-1');
    check(!matrixCell.hasFocus() && sinkName(matrixCell) === 'Celda (1, 1)', '矩阵无障碍：西语首次未聚焦单元格名称同步');
    await changeLanguage('en'); check(sinkName(matrixCell) === 'Cell (1, 1)', '矩阵无障碍：英文切换同步内层单元格名称');
    await changeLanguage('zh'); check(sinkName(matrixCell) === '单元格 (1, 1)', '矩阵无障碍：中文切换同步内层单元格名称');
    await act('matrix-cancel');

    await open(); const startWrites = writes.length;
    await act('system-toggle');
    check(!node('system-panel').hidden && fixture.querySelectorAll('[data-testid^="system-line-"]').length === 2, '方程组：默认两行可视化输入，不需要LaTeX');
    check(mounted!.field.readOnly && node<HTMLTextAreaElement>('latex-source').readOnly && button('save').disabled, '方程组：独立草稿锁定主公式、源码与保存');
    check(button('matrix-toggle').disabled && button('import-open').disabled && button('advanced-limit').disabled && button('mode-latex').disabled, '方程组：矩阵、导入、模板和模式切换互斥');
    check(!button('system-cancel').disabled, '方程组：锁定期间自身取消可用');
    await act('system-line-fraction');
    check(line(1).getValue('latex').includes('\\frac') && line(1).errors.length === 0 && hasIncompleteSlots(line(1).getValue('latex')), '方程组：分数按钮插入真正可填写的分数结构，没有双反斜杠');
    await enter(1, ''); await act('system-line-root');
    check(line(1).getValue('latex').includes('\\sqrt') && line(1).errors.length === 0 && hasIncompleteSlots(line(1).getValue('latex')), '方程组：根号按钮插入真正可填写的平方根结构');
    const key = new KeyboardEvent('keydown', { key: '\\', bubbles: true, cancelable: true }); line(1).dispatchEvent(key);
    const beforeInput = new InputEvent('beforeinput', { data: '\\', inputType: 'insertText', bubbles: true, cancelable: true }); line(1).dispatchEvent(beforeInput);
    check(key.defaultPrevented && beforeInput.defaultPrevented, '方程组：可视化行拦截单反斜杠源码入口');

    await enter(1, 'x+y=3'); await act('system-preview');
    check(button('system-apply').disabled && node('system-status').dataset.state === 'error' && draft().system?.lines[1] === '', '方程组：未填行不补零、不删除且阻止应用');
    await enter(2, 'x-y=1'); await act('system-preview');
    const preview = node('system-preview').querySelector<MathfieldElement>('math-field');
    const previewData = preview ? parseSystem(preview.getValue('latex-expanded')) : null;
    check(Boolean(preview?.readOnly) && preview?.errors.length === 0 && previewData?.rows === 2 && previewData.lines[0] === 'x+y=3' && previewData.lines[1] === 'x-y=1', '方程组：真实MathLive预览是单列两行左括号，序列化不补第二列');
    check(!button('system-apply').disabled && draft().latex === 'x+1' && writes.length === startWrites, '方程组：预览保留主公式且不写笔记');
    await enter(2, 'x-y=2');
    check(!button('system-apply').disabled && node('system-status').dataset.state === 'ready', '方程组：修改行内容实时更新预览并允许直接应用');
    await enter(2, '');
    check(button('system-apply').disabled, '方程组：清空行后阻止应用');
    await enter(2, 'x-y=2');
    await act('system-preview'); await act('system-cancel');
    check(node('system-panel').hidden && draft().latex === 'x+1' && writes.length === startWrites && cancels === 0, '方程组：取消只关闭结构草稿，原公式及笔记未改');
    check(!mounted!.field.readOnly && !button('save').disabled && !button('matrix-toggle').disabled, '方程组：取消恢复主编辑器和其他结构工具');
    await act('system-toggle'); check(line(2).getValue('latex') === 'x-y=2' && !button('system-apply').disabled, '方程组：本次会话重开保留行草稿并自动实时预览');
    await act('system-preview'); mounted!.field.position = -1; await act('system-apply');
    const appended = draft().latex;
    check(node('system-panel').hidden && appended.includes('x+1') && appended.includes('\\begin{cases}') && writes.length === startWrites, '方程组：明确插入只追加公式草稿，不写笔记');
    await act('undo'); check(draft().latex === 'x+1', '方程组：撤销插入恢复原公式');
    await act('redo'); check(draft().latex === appended, '方程组：重做插入恢复方程组');
    await act('save'); check(writes.length === startWrites + 1 && writes.at(-1) === appended, '方程组：明确保存才调用一次写入');

    const original = '\\begin{cases} \\frac{ x }{ 2 }+y=3 \\\\ \\sqrt{x}-y=1 \\end{cases}';
    await open(original); const unused = draft();
    check(unused.system?.open === false && unused.system.rows === 2 && unused.system.lines.every(value => !value), '方程组：未使用工具getDraft生成默认关闭空草稿');
    await open(unused.latex, unused.mode, unused.system); const loadWrites = writes.length; await act('system-toggle');
    check(draft().system?.loadedSource === original && line(2).getValue('latex').includes('sqrt'), '方程组：未打开工具即getDraft重挂载后，首次打开仍自动载入系统');

    check(draft().system?.loadedSource === original && line(1).getValue('latex').includes('frac') && line(2).getValue('latex').includes('sqrt'), '方程组：首次打开整条单列系统自动载入，不额外点Load');
    check(!button('system-apply').disabled && draft().latex === original, '方程组：自动载入不改变精确原源码且实时预览可用');
    line(2).position = -1; line(2).insert('+1', { format: 'latex', mode: 'math', selectionMode: 'after', feedback: false });
    line(2).dispatchEvent(new Event('input', { bubbles: true })); await settle(); await act('system-preview');
    const expectedSecond = draft().system!.lines[1];
    check(expectedSecond.endsWith('+1') && draft().system!.lines[0] === String.raw`\frac{ x }{ 2 }+y=3`, '方程组：局部可视化插入仅改目标行，未改行保留内部空白');
    await act('system-apply'); const replacement = draft().latex; const replaced = parseSystem(replacement);
    check(replaced?.rows === 2 && replaced.lines[1] === expectedSecond && replacement.indexOf('\\begin{cases}') === replacement.lastIndexOf('\\begin{cases}') && writes.length === loadWrites, '方程组：明确整条替换不重复追加，未直接写笔记');
    await act('undo'); check(draft().latex === original, '方程组：撤销替换恢复逐字原文与空白');
    await act('redo'); check(draft().latex === replacement, '方程组：重做恢复完整替换');
    for (const mode of ['latex', 'visual', 'hybrid'] as const) await act(`mode-${mode}`);
    check(draft().latex === replacement && parseSystem(mounted!.field.getValue('latex-expanded'))?.rows === 2, '方程组：三模式切换保持系统源码与实际可视化结构');
    await act('save'); await open(writes.at(-1)!); await act('system-toggle');
    check(draft().system?.lines[1] === expectedSecond, '方程组：保存回调后组件销毁重挂载可再编辑；原生另行验收');
    await act('system-cancel');

    await open(); await act('system-toggle'); await resize(6);
    for (let row = 1; row <= 6; row++) await enter(row, `x_${row}=${row}`);
    await act('system-preview');
    const sixPreview = node('system-preview').querySelector<MathfieldElement>('math-field');
    check(sixPreview !== null && parseSystem(sixPreview.getValue('latex-expanded'))?.rows === 6 && !button('system-apply').disabled, '方程组：六行真实MathLive序列化与预览通过');
    await resize(2); check(draft().system?.lines[5] === 'x_6=6', '方程组：缩小行数保留隐藏行');
    await resize(6); check(line(6).getValue('latex') === 'x_6=6', '方程组：扩大行数恢复隐藏行');
    const beforePaste = JSON.stringify(draft().system?.lines);
    for (const bad of [String.raw`x&=1`, String.raw`x\\y`, String.raw`\unknown{x}`, 'x % exact comment\r\n+y', String.raw`\frac{x}{}`]) {
      await paste(line(1), bad);
      check(JSON.stringify(draft().system?.lines) === beforePaste && draft().system?.rejectedOriginal === bad && node('system-status').dataset.state === 'error' && button('system-apply').disabled, '方程组：不支持行粘贴保留原行、原文并阻止旧候选应用');
    }
    for (const target of [mounted!.field, node<HTMLTextAreaElement>('latex-source')]) {
      await paste(target, String.raw`\unknownMain{x}`);
      check(draft().latex === 'x+1' && JSON.stringify(draft().system?.lines) === beforePaste && node('formula-import-panel').hidden && !button('system-cancel').disabled, '方程组：锁定主式/源码粘贴不能绕过结构草稿或打开冲突面板');
    }
    const held = draft(); await open(held.latex, held.mode, held.system);
    check(!node('system-panel').hidden && line(6).getValue('latex') === 'x_6=6' && button('save').disabled && draft().system?.rejectedOriginal === held.system?.rejectedOriginal, '方程组：打开草稿重挂载保留行数、内容、原文和锁定');
    await act('system-cancel'); const closed = draft();
    const newSystem = buildSystem({ rows: 2, lines: ['a=1', 'b=2'] });
    await open(newSystem, closed.mode, closed.system); await act('system-toggle');
    check(line(1).getValue('latex') === 'x_1=1', '方程组：已有临时草稿不会被新主公式自动覆盖');
    await act('system-load'); await act('system-cancel'); const priorTarget = draft();
    const changedSystem = buildSystem({ rows: 2, lines: ['a=3', 'b=4'] });
    await open(changedSystem, priorTarget.mode, priorTarget.system); await act('system-toggle');
    await act('system-preview'); await act('system-apply');
    check(draft().latex === changedSystem && node('system-status').dataset.state === 'error' && !node('system-panel').hidden, '方程组：旧载入目标变化时拒绝覆盖且保留草稿');
    await act('system-load'); check(line(1).getValue('latex') === 'a=3' && draft().system?.rows === 2, '方程组：明确Load才载入新的系统');
    await act('system-cancel');

    await open(newSystem, 'hybrid', { open: false, rows: 6, lines: Array(6).fill('') }); await act('system-toggle');
    check(draft().system?.rows === 6 && draft().system?.loadedSource === undefined && line(1).getValue('latex') === '', '方程组：用户选过六行的空草稿也不被自动载入覆盖');
    await act('system-cancel');
    const piecewise = String.raw`\begin{cases}x^2&x\ge0\\-x&x<0\end{cases}`;
    await open(piecewise); await act('system-toggle'); await enter(1, 'z=7'); await act('system-load');
    check(line(1).getValue('latex') === 'z=7' && draft().latex === piecewise && node('system-status').dataset.state === 'error', '方程组：双列分段函数不误认成单列系统，失败载入保留双方原文');
    await act('system-cancel');
    await open(buildSystem({ rows: 2, lines: ['x=1', 'y=2'] })); await act('system-toggle'); await enter(1, 'x=9'); await act('system-preview'); await act('system-apply');
    const beforeFailedSave = draft().latex; const beforeFailWrites = writes.length; failSave = true; await act('save');
    check(draft().latex === beforeFailedSave && writes.length === beforeFailWrites && !button('save').disabled, '方程组：保存失败保留已应用草稿，不冒充成功或丢失重试能力');
    failSave = false; await act('save'); check(writes.at(-1) === beforeFailedSave && writes.length === beforeFailWrites + 1, '方程组：保存失败后可明确重试并仅写一次');

    for (const language of ['en', 'zh', 'es'] as const) {
      await open('', 'visual', undefined, language); await act('system-toggle'); await act('system-preview');
      const label = button('system-toggle').textContent ?? ''; const status = node('system-status').textContent ?? '';
      check(language === 'zh' ? label.includes('方程组') && status.includes('每一行') : !/[\u4e00-\u9fff]/.test(label+status), `方程组：${language}界面与动态错误文案本地化`);
      check(node<HTMLSelectElement>('system-rows').options.length === 5 && !fixture.querySelector('[data-action="system-fill-zero"]'), `方程组：${language}只给2至6行，不展示补零或求解`);
      await act('system-cancel');
    }
  } finally { mounted?.destroy(); fixture.remove(); }
}
