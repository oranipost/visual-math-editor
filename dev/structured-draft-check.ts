import type { MathfieldElement } from 'mathlive';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { focusInlineEditor, hideInlineEditor, inlineEditorField, showInlineEditor, type InlineSession } from '../src/inline-editor';
import type { EditorDraft } from '../src/editor-ui';

/** Real CodeMirror widget lifecycle checks. These do not impersonate native vault persistence. */
export async function checkStructuredDrafts(check: (condition: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div');
  fixture.style.maxWidth = '960px';
  document.body.append(fixture);
  const note = Array.from({ length: 900 }, (_, index) => 'Unchanged integration note line ' + (index + 1)).join('\n');
  const view = new EditorView({
    state: EditorState.create({
      doc: note,
      extensions: [
        inlineEditorField,
        EditorView.theme({ '&': { height: '340px' }, '.cm-scroller': { overflow: 'auto' } }),
      ],
    }),
    parent: fixture,
  });
  let writes = 0, graphWrites = 0, outerCancels = 0, serial = 91000;
  const settle = async () => {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  };
  const waitFor = async (condition: () => boolean, timeout = 1500) => {
    const deadline = performance.now() + timeout;
    while (!condition() && performance.now() < deadline) await new Promise<void>(resolve => setTimeout(resolve, 10));
    return condition();
  };
  const panel = () => fixture.querySelector<HTMLElement>('[data-testid="inline-equation-editor"]');
  const node = <T extends HTMLElement = HTMLElement>(id: string): T => {
    const found = panel()?.querySelector<T>('[data-testid="' + id + '"]');
    if (!found) throw new Error('Structured inline regression: missing ' + id);
    return found;
  };
  const button = (action: string) => {
    const found = panel()?.querySelector<HTMLButtonElement>('[data-action="' + action + '"]');
    if (!found) throw new Error('Structured inline regression: missing action ' + action);
    return found;
  };
  const act = async (action: string) => { button(action).click(); await settle(); };
  const cleanNote = () => view.state.doc.toString() === note && writes === 0 && graphWrites === 0;
  const makeSession = (draft: EditorDraft): InlineSession => ({
    id: serial++, editing: false, language: 'en', systemLanguage: 'en-US', draft,
    onLanguageChange: () => undefined,
    onSave: () => { writes++; }, onSaveGraph: () => { graphWrites++; },
    onCancel: () => { outerCancels++; },
  });
  const mount = async (session: InlineSession) => {
    hideInlineEditor(view); await settle();
    showInlineEditor(view, note.length, session); await settle();
    if (!await waitFor(() => Boolean(panel()?.querySelector('[data-testid="visual-math-editor"]')))) {
      throw new Error('Structured inline regression: CodeMirror widget did not mount');
    }
  };
  const focusThroughProduction = async (field: MathfieldElement) => {
    // MathLive defers its keyboard focus; inspect actual focus instead of dispatching synthetic focus events.
    view.contentDOM.focus();
    focusInlineEditor(view);
    await settle();
    return waitFor(() => document.activeElement === field && field.hasFocus(), 500);
  };
  const matrixDraft = (): NonNullable<EditorDraft['matrix']> => ({
    open: true, rows: 2, columns: 2, kind: 'bmatrix', cells: [['1', '2'], ['3', '4']],
  });
  const systemDraft = (): NonNullable<EditorDraft['system']> => ({
    open: true, rows: 2, lines: ['x+y=3', 'x-y=1', 'hidden-row-preserved'],
  });
  try {
    const session = makeSession({ latex: '', display: true, mode: 'hybrid' });
    await mount(session);
    await act('system-toggle');
    check(!node('system-panel').hidden && node<MathfieldElement>('equation-field').readOnly
      && node<HTMLTextAreaElement>('latex-source').readOnly && button('save').disabled,
    '真实正文 Widget：主式为空时可打开方程组，并锁定主公式、源码和笔记保存');
    const first = node<MathfieldElement>('system-line-1');
    const second = node<MathfieldElement>('system-line-2');
    first.setValue('x+y=3', { silenceNotifications: true });
    first.dispatchEvent(new Event('input', { bubbles: true }));
    second.setValue('x-y=1', { silenceNotifications: true });
    second.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    check(await focusThroughProduction(first), '真实正文 Widget：Σ恢复操作实际聚焦可编辑方程行，而不是只读主公式');
    check(!first.readOnly && button('matrix-toggle').disabled && button('import-open').disabled,
      '真实正文 Widget：方程组行可编辑，同时矩阵与导入保持互锁');
    await act('matrix-toggle');
    check(node('matrix-panel').hidden && !node('system-panel').hidden && cleanNote(),
      '真实正文 Widget：方程组打开时不能旁路打开矩阵或写入原笔记');

    // A focused widget can be retained by CodeMirror. Blur it before genuinely scrolling its anchor out of view.
    view.contentDOM.focus();
    view.dispatch({ effects: EditorView.scrollIntoView(0, { y: 'start' }) });
    view.scrollDOM.scrollTop = 0; view.requestMeasure();
    await settle();
    const virtualized = await waitFor(() => !panel());
    check(virtualized && view.viewport.to < note.length,
      '真实正文 Widget：滚动到远处正文后，CodeMirror实际卸载视口外公式面板');
    if (!virtualized) throw new Error('Structured inline regression: viewport did not unmount the widget');
    check(session.draft.latex === '' && session.draft.system?.open === true
      && session.draft.system.lines[0] === 'x+y=3' && session.draft.system.lines[1] === 'x-y=1' && cleanNote(),
    '真实正文 Widget：视口卸载将已填方程行保留在临时草稿中，空主式及原笔记不变');

    focusInlineEditor(view); await settle();
    check(await waitFor(() => Boolean(panel()?.querySelector('[data-testid="system-line-1"]'))),
      '真实正文 Widget：恢复操作让CodeMirror重新挂载方程组面板');
    check(!node('system-panel').hidden && node<MathfieldElement>('system-line-1').getValue('latex') === 'x+y=3'
      && node<MathfieldElement>('system-line-2').getValue('latex') === 'x-y=1'
      && button('matrix-toggle').disabled && cleanNote(),
    '真实正文 Widget：视口重挂载恢复两行内容、打开状态和互锁，不会自动应用或保存');
    check(await focusThroughProduction(node<MathfieldElement>('system-line-1')),
      '真实正文 Widget：视口重挂载后的Σ操作仍能实际聚焦方程行');
    // No input event: destroy/getDraft must flush the latest actual MathLive value.
    node<MathfieldElement>('system-line-2').setValue('x-y=2', { silenceNotifications: true });
    hideInlineEditor(view); await settle();
    check(!panel() && session.draft.system?.lines[1] === 'x-y=2' && session.draft.latex === '' && cleanNote(),
      '真实正文 Widget：显式卸载会读取尚未派发input的最终方程行，不丢最后一次编辑');
    await mount(session);
    check(node<MathfieldElement>('system-line-2').getValue('latex') === 'x-y=2' && !node('system-panel').hidden,
      '真实正文 Widget：同一session重新挂载恢复尚未应用的最新方程行');
    await act('system-cancel');
    check(node('system-panel').hidden && !node<MathfieldElement>('equation-field').readOnly
      && !button('matrix-toggle').disabled && outerCancels === 0 && cleanNote(),
    '真实正文 Widget：取消方程组只解除结构锁定，不取消主编辑器或修改原笔记');
    await act('system-toggle');
    check(node<MathfieldElement>('system-line-2').getValue('latex') === 'x-y=2',
      '真实正文 Widget：取消后重开方程组仍保留本次临时编辑');
    await act('system-cancel');
    await act('matrix-toggle');
    check(!node('matrix-panel').hidden && button('system-toggle').disabled
      && !button('matrix-cancel').disabled && cleanNote(),
    '真实正文 Widget：矩阵打开时反向锁定方程组，矩阵取消仍可用');
    check(await focusThroughProduction(node<MathfieldElement>('matrix-cell-1-1')),
      '真实正文 Widget：Σ恢复打开的矩阵时实际聚焦可编辑单元格');
    await act('matrix-cancel');

    const both = makeSession({ latex: '', display: true, mode: 'hybrid', system: systemDraft(), matrix: matrixDraft() });
    await mount(both);
    check(!node('system-panel').hidden && node('matrix-panel').hidden && !button('system-cancel').disabled
      && button('matrix-toggle').disabled && cleanNote(),
    '真实正文 Widget：异常双open草稿仅恢复方程组，仍可取消，不产生交叉死锁');
    await act('system-cancel');
    await act('matrix-toggle');
    check(node<MathfieldElement>('matrix-cell-1-1').getValue('latex') === '1'
      && node<MathfieldElement>('matrix-cell-2-2').getValue('latex') === '4' && cleanNote(),
    '真实正文 Widget：异常双open恢复时仅收起矩阵，保留原矩阵单元格');
    await act('matrix-cancel');
    hideInlineEditor(view); await settle();
    check(both.draft.system?.lines[2] === 'hidden-row-preserved' && !both.draft.system.open
      && both.draft.matrix?.cells[1]?.[1] === '4' && cleanNote(),
    '真实正文 Widget：跨结构打开取消及卸载保留隐藏方程行与矩阵临时数据');

    const cross = makeSession({
      latex: '', display: true, mode: 'hybrid', system: systemDraft(),
      formulaImport: { open: true, original: 'z=4' },
    });
    await mount(cross);
    check(!node('formula-import-panel').hidden && !node('system-panel').hidden
      && button('system-cancel').disabled && !button('import-cancel').disabled && button('save').disabled && cleanNote(),
    '真实正文 Widget：异常导入加方程组双open优先导入，保留可用取消入口与笔记锁定');
    await act('import-cancel');
    check(node('formula-import-panel').hidden && !node('system-panel').hidden
      && !button('system-cancel').disabled && node<MathfieldElement>('system-line-1').getValue('latex') === 'x+y=3' && cleanNote(),
    '真实正文 Widget：取消导入后恢复方程组编辑，原行和空主式均未被替换');
    await act('system-cancel');
    check(node('system-panel').hidden && !node<MathfieldElement>('equation-field').readOnly
      && !button('matrix-toggle').disabled && cleanNote(),
    '真实正文 Widget：依次取消异常双open恢复正常主编辑器，不写原笔记');
    hideInlineEditor(view); await settle();
    check(cross.draft.latex === '' && cross.draft.system?.lines[0] === 'x+y=3'
      && cross.draft.formulaImport?.original === 'z=4' && cleanNote(),
    '真实正文 Widget：复杂恢复退出后临时原文仍可检查，测试全过程零笔记写入');
  } finally {
    hideInlineEditor(view);
    view.destroy(); fixture.remove();
  }
}
