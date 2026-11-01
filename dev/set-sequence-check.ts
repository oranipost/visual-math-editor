import { convertLatexToMarkup } from 'mathlive';
import { mountEditor, type EditorMode } from '../src/editor-ui';
import { SET_SEQUENCE_TOOLS } from '../src/set-sequence-tools';
import { hasIncompleteSlots } from '../src/validation';
import type { Language } from '../src/i18n';

/** Exercises real MathLive component input. Callback/remount checks are not native vault acceptance. */
export async function checkSetSequenceTools(check: (condition: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div'); document.body.append(fixture);
  let mounted: ReturnType<typeof mountEditor> | undefined;
  const writes: string[] = []; let cancels = 0, failSave = false;
  let releaseSave: (() => void) | undefined, blockSave = false;
  const settle = async () => { await Promise.resolve(); await new Promise<void>(resolve => setTimeout(resolve, 0)); };
  const button = (action: string) => {
    const result = fixture.querySelector<HTMLButtonElement>('[data-action="' + action + '"]');
    if (!result) throw new Error('Set-sequence regression: missing ' + action);
    return result;
  };
  const source = () => fixture.querySelector<HTMLTextAreaElement>('[data-testid="latex-source"]')!;
  const panel = () => fixture.querySelector<HTMLDetailsElement>('[data-testid="set-sequence-tools"]')!;
  const open = async (latex = '', mode: EditorMode = 'hybrid', language: Language = 'en') => {
    mounted?.destroy(); fixture.replaceChildren();
    mounted = mountEditor(fixture, { latex, initialMode: mode, language, display: true, compact: true,
      onSave: async value => {
        if (blockSave) await new Promise<void>(resolve => { releaseSave = resolve; });
        if (failSave) throw new Error('Simulated set/sequence save failure');
        writes.push(value);
      }, onCancel: () => { cancels++; },
    });
    await settle();
  };
  const act = async (action: string) => { button(action).click(); await settle(); };
  const visualEdit = async (latex: string) => {
    mounted!.field.insert(latex, { format: 'latex', mode: 'math', selectionMode: 'after', feedback: false });
    mounted!.field.dispatchEvent(new Event('input', { bubbles: true })); await settle();
  };
  const sourceEdit = async (latex: string) => {
    source().value = latex; source().dispatchEvent(new Event('input', { bubbles: true })); await settle();
  };
  const allDisabled = () => SET_SEQUENCE_TOOLS.every(tool => button('set-sequence-' + tool.id).disabled);
  const fills: Record<string, string[]> = {
    set: ['3,1,3'], 'set-builder': ['x', 'x>0'], term: ['n'], sequence: ['n'], finite: ['n'],
    arithmetic: ['2', '3'], geometric: ['2', '3'],
  };
  try {
    await open();
    check(Boolean(panel()) && !panel().open, '集合数列：默认折叠，不增加主面板常驻按钮');
    panel().open = true;
    check(panel().querySelectorAll('[role="group"]').length === 3, '集合数列：按集合、关系符号、数列分成三组');
    for (const tool of SET_SEQUENCE_TOOLS) {
      await open(); panel().open = true;
      const count = writes.length; await act('set-sequence-' + tool.id);
      const unfinished = mounted!.getDraft().latex;
      check(mounted!.field.errors.length === 0 && !convertLatexToMarkup(unfinished).includes('ML__error'),
        '集合数列：' + tool.id + '插入真正支持的可视化记号，无未知命令');
      check(writes.length === count, '集合数列：' + tool.id + '点击模板不会写入笔记');
      if (fills[tool.id]) {
        check(hasIncompleteSlots(unfinished) && button('save').disabled, '集合数列：' + tool.id + '空槽保留并阻止未填公式保存');
        for (const [index, value] of fills[tool.id].entries()) {
          if (index > 0) await act('next-placeholder');
          await visualEdit(value);
        }
      }
      const complete = mounted!.getDraft().latex;
      check(!hasIncompleteSlots(complete) && mounted!.field.errors.length === 0 && !button('save').disabled,
        '集合数列：' + tool.id + '填写真实MathLive槽后允许明确保存');
      check(source().value === complete, '集合数列：' + tool.id + '可视化编辑同步到Hybrid源码');
      if (tool.id === 'set') check(complete.includes('3,1,3'), '集合：不排序、不去重、不改写用户列举顺序');
      if (tool.id === 'set-builder') check(complete.includes('x') && complete.includes('x>0') && /\\mid/.test(complete), '集合描述：变量与条件由用户分别填写');
      if (tool.id === 'arithmetic') check((/^a_(?:n|\{n\})=/.test(complete)) && complete.includes('2') && complete.includes('n-1') && complete.includes('3') && /\\cdot/.test(complete),
        '数列：等差通项保留n−1、首项与公差，不进行计算；actual=' + JSON.stringify(complete));
      if (tool.id === 'geometric') check((/^a_(?:n|\{n\})=/.test(complete)) && complete.includes('2') && complete.includes('n-1') && complete.includes('3') && /\^/.test(complete),
        '数列：等比通项保留n−1指数、首项与公比，不进行计算；actual=' + JSON.stringify(complete));
      for (const mode of ['visual', 'latex', 'hybrid'] as const) await act('mode-' + mode);
      check(mounted!.getDraft().latex === complete && writes.length === count, '集合数列：' + tool.id + '三模式切换不改写原式、不写笔记');
      await act('save'); check(writes.length === count + 1 && writes.at(-1) === complete, '集合数列：' + tool.id + '仅明确保存回调写入一次');
      await open(writes.at(-1)!);
      check(mounted!.getDraft().latex === complete && mounted!.field.errors.length === 0, '集合数列：' + tool.id + '保存后组件重挂载恢复，不替代原生验收');
    }
    await open('x+1'); panel().open = true; mounted!.field.executeCommand('selectAll');
    await act('set-sequence-set'); const wrapped = mounted!.getDraft().latex;
    check(wrapped.includes('x+1') && /\\left\\\{/.test(wrapped) && !hasIncompleteSlots(wrapped), '集合：仅大括号工具明确包裹既有选区，保留选中表达式');
    await act('undo'); check(mounted!.getDraft().latex === 'x+1', '集合：套用外括号可撤销恢复原式');
    await act('redo'); check(mounted!.getDraft().latex === wrapped, '集合：套用外括号可重做');
    const sourceChanged = wrapped.replace('x+1', 'x+2');
    await sourceEdit(sourceChanged);
    check(mounted!.getDraft().latex === sourceChanged && mounted!.field.getValue('latex-expanded').includes('x+2'), '集合：Hybrid源码局部改值同步可视化结构');
    mounted!.field.position = -1; await visualEdit('+3');
    check(source().value === mounted!.getDraft().latex && mounted!.getDraft().latex.includes('+3'), '集合：右侧继续编辑同步左侧源码');
    await open('x+1'); await act('matrix-toggle');
    check(allDisabled(), '集合数列：矩阵独立草稿期间全部禁用');
    const beforeLocked = mounted!.getDraft().latex, beforeWrites = writes.length;
    await act('set-sequence-set');
    check(mounted!.getDraft().latex === beforeLocked && writes.length === beforeWrites, '集合数列：禁用按钮不能绕过矩阵锁改写主式');
    await act('matrix-cancel'); check(!allDisabled(), '集合数列：取消矩阵草稿后恢复工具');
    await act('system-toggle'); check(allDisabled(), '集合数列：方程组独立草稿期间全部禁用');
    const beforeSystem = mounted!.getDraft().latex; await act('set-sequence-arithmetic');
    check(mounted!.getDraft().latex === beforeSystem && writes.length === beforeWrites, '集合数列：禁用按钮不能绕过方程组锁改写主式');
    await act('system-cancel'); check(!allDisabled(), '集合数列：取消方程组草稿后恢复工具');
    await act('import-open'); check(allDisabled(), '集合数列：导入确认期间锁定全部按钮');
    await act('import-cancel'); check(!allDisabled(), '集合数列：取消导入后恢复工具');
    await open('\\unknownSetMacro{x}', 'hybrid');
    const original = mounted!.getDraft().latex;
    check(allDisabled(), '集合数列：未知宏源码模式禁用可视化插入，防止覆盖原文');
    await act('set-sequence-set'); check(mounted!.getDraft().latex === original, '集合数列：未知宏原文逐字保持');
    await open('\\left\\{a_n\\right\\}'); failSave = true; const beforeFailedWrites = writes.length;
    await act('save'); failSave = false;
    check(writes.length === beforeFailedWrites && mounted!.getDraft().latex === '\\left\\{a_n\\right\\}' && !button('save').disabled,
      '集合数列：保存失败保留完整公式草稿，仍可重新保存');
    blockSave = true; await act('save');
    check(allDisabled(), '集合数列：异步保存中全部按钮禁用');
    releaseSave?.(); blockSave = false; await settle();
    check(writes.length === beforeFailedWrites + 1 && !allDisabled(), '集合数列：重试保存成功只写一次并恢复工具');
    const beforeCancelWrites = writes.length; await act('cancel');
    check(cancels > 0 && writes.length === beforeCancelWrites, '集合数列：主编辑器取消不写笔记');
    for (const language of ['en', 'zh', 'es'] as const) {
      await open('', 'hybrid', language); panel().open = true; const text = panel().textContent ?? '';
      check(text.includes(language === 'en' ? 'Sets and sequences' : language === 'es' ? 'Conjuntos y sucesiones' : '集合与数列'), '集合数列：' + language + '标题可用');
      if (language !== 'zh') check(!/[\u4e00-\u9fff]/.test(text) && SET_SEQUENCE_TOOLS.every(tool =>
        !/[\u4e00-\u9fff]/.test(button('set-sequence-' + tool.id).getAttribute('aria-label') ?? '')), '集合数列：' + language + '可见文案与无障碍名称无中文残留');
      check(SET_SEQUENCE_TOOLS.every(tool => fixture.querySelectorAll('[data-action="set-sequence-' + tool.id + '"]').length === 1),
        '集合数列：' + language + '各模板只有一个按钮，无新增收藏或历史列表');
    }
  } finally { failSave = false; blockSave = false; releaseSave?.(); mounted?.destroy(); fixture.remove(); }
}
