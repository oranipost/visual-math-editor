import { mountEditor, type EditorMode, type EditorDraft } from '../src/editor-ui';
import { FORMULA_IMPORT_CASES, expandedTaylor } from '../tests/fixtures/formula-import-cases';

/** Component regressions. Native note transactions and save/reopen are verified separately. */
export async function checkFormulaImport(check: (condition: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div'); document.body.append(fixture);
  let mounted: ReturnType<typeof mountEditor> | undefined;
  const writes: { latex: string; display: boolean }[] = [];
  let rejectSave = false; let saveAttempts = 0;
  const baseline = String.raw`\frac{5}{8}`;
  const settle = async () => { await Promise.resolve(); await new Promise<void>(resolve => setTimeout(resolve, 0)); };
  const open = async (latex = baseline, mode: EditorMode = 'visual', formulaImportDraft?: EditorDraft['formulaImport']) => {
    mounted?.destroy(); fixture.replaceChildren();
    mounted = mountEditor(fixture, {
      latex, editing: true, display: true, initialMode: mode, language: 'en', compact: true, formulaImportDraft,
      onSave: (value, display) => { saveAttempts++; if (rejectSave) throw new Error('Simulated note conflict'); writes.push({ latex: value, display }); },
      onCancel: () => undefined,
    });
    await settle();
  };
  const button = (action: string): HTMLButtonElement => {
    const result = fixture.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
    if (!result) throw new Error(`Formula import regression: missing ${action} action`);
    return result;
  };
  const node = (testId: string): HTMLElement => {
    const result = fixture.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    if (!result) throw new Error(`Formula import regression: missing ${testId} field`);
    return result;
  };
  const read = (testId: string): string => {
    const result = node(testId);
    return result instanceof HTMLTextAreaElement || result instanceof HTMLInputElement ? result.value : result.textContent ?? '';
  };
  const original = (): string => mounted!.getImportOriginal();
  const source = (): HTMLTextAreaElement => node('latex-source') as HTMLTextAreaElement;
  const paste = async (text: string, target: HTMLElement = mounted!.field) => {
    if (target === mounted!.field) mounted!.field.executeCommand('selectAll');
    else if (target instanceof HTMLTextAreaElement) target.setSelectionRange(0, target.value.length);
    const data = new DataTransfer(); data.setData('text/plain', text);
    target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    await settle();
  };
  const sample = (id: string): string => {
    const result = FORMULA_IMPORT_CASES.find(item => item.id === id);
    if (!result) throw new Error(`Formula import regression: missing corpus case ${id}`);
    return result.source;
  };
  const act = async (action: string) => { button(action).click(); await settle(); };
  try {
    // The textarea display normalizes CRLF by HTML specification. Verify backing
    // clipboard text separately and require exact CRLF in the applied draft.
    for (const id of ['fraction', 'taylor-64', 'matrix', 'cases', 'aligned-lf', 'aligned-crlf', 'outer-whitespace', 'escaped-specials']) {
      await open(); const raw = sample(id); const count = writes.length;
      await paste(raw);
      check(mounted!.getDraft().latex === baseline && writes.length === count, `${id}: 粘贴预览保留已有公式，不写笔记`);
      check(original() === raw, `${id}: 原文模型精确保留换行、反斜杠与空白`);
      check(!button('import-apply').disabled && node('import-status').dataset.state === 'ready', `${id}: 可视化支持的单式允许明确应用`);
      await act('import-cancel');
      check(mounted!.getDraft().latex === baseline && writes.length === count, `${id}: 取消导入保留已有公式且不写笔记`);
      await act('import-open');
      check(original() === raw && !node('formula-import-panel').hidden, `${id}: 取消后重开仍能取回精确原文`);
      if (id === 'aligned-crlf') {
        check(read('import-original') === raw.replace(/\r\n/g, '\n'), 'CRLF: 输入框按HTML规范显示LF，与精确原文模型分开记录');
        await act('import-apply');
        check(mounted!.getDraft().latex === raw, 'CRLF: 明确应用后当前源码保留原始CRLF');
      } else await act('import-cancel');
    }

    for (const [id, display] of [
      ['inline-wrapper', false], ['display-wrapper', true], ['tex-inline-wrapper', false], ['tex-display-wrapper', true],
    ] as const) {
      await open(); const raw = sample(id); const count = writes.length;
      const expected = id === 'display-wrapper' ? '\n' + baseline + '\n' : baseline;
      await paste(raw);
      check(original() === raw && read('import-candidate') === expected, `${id}: 只移除匹配外包装，保留包装内部首尾换行`);
      await act('import-apply');
      check(mounted!.getDraft().latex === expected && mounted!.getDraft().display === display && writes.length === count, `${id}: 应用明确的包装排版意图，不写笔记`);
    }

    for (const id of ['comment-lf', 'comment-crlf', 'missing-brace', 'unclosed-environment', 'mismatched-wrapper', 'mixed-text', 'multiple-inline', 'multiple-display', 'tex-document', 'template-selection', 'template-placeholder', 'template-cursor', 'length-8193', 'depth-33']) {
      await open(); const raw = sample(id); const count = writes.length;
      await paste(raw);
      check(original() === raw && button('import-apply').disabled && node('import-status').dataset.state === 'error', `${id}: 错误/范围外输入精确保留原文、说明原因并阻止应用`);
      await act('import-cancel');
      check(mounted!.getDraft().latex === baseline && writes.length === count, `${id}: 取消后已有公式和笔记不受影响`);
    }

    // Editing a staged original invalidates its preview and requires explicit reinspection.
    await open(); await paste(String.raw`\frac{1}{2}`);
    const originalInput = node('import-original') as HTMLTextAreaElement;
    originalInput.value = String.raw`\sqrt{x}`;
    originalInput.dispatchEvent(new Event('input', { bubbles: true })); await settle();
    check(original() === String.raw`\sqrt{x}` && button('import-apply').disabled && node('import-status').dataset.state === 'stale', '修改导入原文使旧候选失效，不能直接应用旧预览');
    await act('import-preview-button');
    check(!button('import-apply').disabled && read('import-candidate') === String.raw`\sqrt{x}`, '重新检查后候选更新，才恢复明确应用');
    await act('import-cancel');

    // A bare candidate inherits the reviewed layout. The host layout must stay
    // locked during staging so the preview and Apply cannot disagree.
    await open(); const bareMultiline = 'x+\ny'; const layoutWriteCount = writes.length;
    await paste(bareMultiline);
    const reviewedDisplayLayout = read('import-layout');
    check(button('inline').disabled && button('display').disabled, '导入预览期间同时锁定行内和独立公式排版按钮');
    await act('inline'); await act('display');
    check(mounted!.getDraft().display && read('import-layout') === reviewedDisplayLayout && writes.length === layoutWriteCount,
      '导入预览期间点击外层排版不会改变原草稿、候选说明或笔记');
    await act('import-cancel');
    check(!button('inline').disabled && !button('display').disabled && mounted!.getDraft().display,
      '取消导入后恢复排版操作，原独立公式意图保留');
    await act('inline');
    check(!mounted!.getDraft().display, '取消导入后用户可以明确改为行内公式');
    await paste(bareMultiline);
    const reviewedInlineLayout = read('import-layout');
    check(button('inline').disabled && button('display').disabled, '重新预览行内候选时排版按钮仍锁定');
    await act('display');
    check(!mounted!.getDraft().display && read('import-layout') === reviewedInlineLayout,
      '行内候选不能在检查后被外层排版按钮静默改成独立公式');
    await act('import-apply');
    check(mounted!.getDraft().latex === bareMultiline && !mounted!.getDraft().display && writes.length === layoutWriteCount,
      '明确应用裸源码采用检查时的行内意图，原文未改且尚未写笔记');
    check(!button('inline').disabled && !button('display').disabled, '应用关闭预览后恢复两个排版按钮');

    const before = String.raw`\frac{ a }{ b }`;
    const replacement = String.raw`\sqrt{x_1^2+1}`;
    await open(before); const count = writes.length;
    await paste(replacement); await act('import-apply');
    check(mounted!.getDraft().latex === replacement && writes.length === count, '明确应用整式替换，应用本身不写笔记');
    await act('undo'); check(mounted!.getDraft().latex === before, '撤销导入恢复原始源码与内部空格');
    await act('redo'); check(mounted!.getDraft().latex === replacement, '重做导入恢复用户确认的候选源码');
    for (const mode of ['hybrid', 'latex', 'visual'] as const) await act(`mode-${mode}`);
    check(mounted!.getDraft().latex === replacement, '导入后仅切三模式不改变候选源码');
    await act('save');
    check(writes.length === count + 1 && writes.at(-1)?.latex === replacement, '最终明确保存才调用一次写入回调');
    await open(writes.at(-1)!.latex, 'hybrid');
    check(mounted!.getDraft().latex === replacement, '组件关闭重挂载恢复保存源码；不代替原生验收');

    for (const id of ['unknown-macro', 'literal-backslash-n', 'unknown-environment']) {
      await open(); const raw = sample(id); const count = writes.length;
      await paste(raw);
      check(original() === raw && read('import-candidate') === raw && node('import-status').dataset.state === 'source-only', `${id}: 未知命令原文保留，明确标为仅源码可用`);
      check(mounted!.getDraft().latex === baseline && writes.length === count, `${id}: 未应用前不替换已有公式`);
      await act('import-apply');
      check(mounted!.getDraft().latex === raw && mounted!.getDraft().mode !== 'visual' && Boolean(mounted!.field.hidden), `${id}: 应用保留源码并转向源码编辑，不宣称可视化支持`);
      await act('save');
      check(writes.length === count + 1 && writes.at(-1)?.latex === raw, `${id}: 明确按源码保存时原文精确回写`);
    }

    // A reviewed source-only candidate changes both mode and layout. Neither
    // transition may serialize it through the old, supported Visual state.
    await open(); const exactSourceOnly = ' \r\n' + String.raw`\customMacro{ a }{ b }+\frac{1}{2}` + '\r\n ';
    const sourceOnlyWrites = writes.length;
    await paste('$' + exactSourceOnly + '$'); await act('import-apply');
    check(mounted!.getDraft().latex === exactSourceOnly && !mounted!.getDraft().display
      && mounted!.getDraft().mode === 'hybrid' && mounted!.field.hidden && source().value === exactSourceOnly.replace(/\r\n/g, '\n'),
    '仅源码行内候选应用后保持精确CRLF与空白，切Hybrid不经过可视化回序列化');
    check(button('inline').getAttribute('aria-pressed') === 'true' && button('display').getAttribute('aria-pressed') === 'false'
      && writes.length === sourceOnlyWrites && !button('save').disabled,
    '仅源码候选布局控件和可保存状态一致，Apply本身不写笔记');
    source().value = String.raw`\frac{1}{2`;
    source().dispatchEvent(new Event('input', { bubbles: true })); await settle();
    check(button('save').disabled && mounted!.field.hidden && (fixture.querySelector<HTMLElement>('[data-testid="validation-message"]')?.textContent ?? '').length > 0,
      '应用后实际改成错误源码仍重新校验、显示错误并阻止保存');
    await act('display');
    check(button('save').disabled && mounted!.getDraft().latex === String.raw`\frac{1}{2` && writes.length === sourceOnlyWrites,
      '错误源码切排版不会吞掉错误或更改原文、不会写笔记');

    // A first source edit must already have a prior snapshot to Undo.
    await open(before, 'hybrid');
    source().value = replacement; source().dispatchEvent(new Event('input', { bubbles: true })); await settle();
    await act('undo'); check(mounted!.getDraft().latex === before, 'Hybrid首次源码输入可撤销回初始精确源码');
    await act('redo'); check(mounted!.getDraft().latex === replacement, 'Hybrid首次源码输入可重做');

    await open();
    mounted!.field.position = -1; mounted!.field.insert('+1', { format: 'latex', mode: 'math' }); await settle();
    const edited = mounted!.getDraft().latex;
    check(edited !== baseline && edited.includes('+1'), '可视化局部追加实际同步到源码');
    await act('undo'); check(mounted!.getDraft().latex === baseline, '可视化局部修改可撤销回原式');
    await act('redo'); check(mounted!.getDraft().latex === edited, '可视化局部修改可重做');

    for (const mode of ['hybrid', 'latex'] as const) {
      await open(before, mode); const raw = sample('aligned-crlf'); const previousWrites = writes.length;
      await paste(raw, source());
      check(mounted!.getDraft().latex === before && original() === raw && writes.length === previousWrites, `${mode}: 源码整栏真实paste先暂存精确原文，不立即替换`);
      await act('import-apply');
      check(mounted!.getDraft().latex === raw, `${mode}: 明确应用源码整栏粘贴后保留CRLF`);
    }

    await open(); await paste(replacement); await act('import-apply');
    rejectSave = true; const failedCount = writes.length; const attemptsBefore = saveAttempts;
    await act('save'); rejectSave = false;
    check(saveAttempts === attemptsBefore + 1 && writes.length === failedCount && mounted!.getDraft().latex === replacement && !button('save').disabled, '保存回调冲突时保留草稿、不写成功结果且允许重试');
    check((fixture.querySelector<HTMLElement>('[data-testid="validation-message"]')?.textContent ?? '').includes('Simulated note conflict'), '保存冲突显示实际失败原因');
    await act('save');
    check(writes.length === failedCount + 1 && writes.at(-1)?.latex === replacement, '冲突恢复后可明确重试保存同一草稿');

    // A source-only warning must not hide a real note-write failure when mode
    // changes or draft reads refresh the editor state.
    await open(); const sourceOnlyRaw = sample('unknown-macro');
    await paste(sourceOnlyRaw); await act('import-apply');
    const sourceOnlyFailedCount = writes.length;
    const sourceOnlyAttempts = saveAttempts;
    rejectSave = true; await act('save'); rejectSave = false;
    for (const mode of ['latex', 'visual', 'hybrid'] as const) await act(`mode-${mode}`);
    const sourceOnlyDraft = mounted!.getDraft();
    const sourceOnlyMessage = node('validation-message');
    check(saveAttempts === sourceOnlyAttempts + 1 && writes.length === sourceOnlyFailedCount
      && sourceOnlyDraft.latex === sourceOnlyRaw
      && sourceOnlyMessage.textContent?.includes('Simulated note conflict')
      && sourceOnlyMessage.dataset.severity === 'error',
      '仅源码保存冲突后切换三模式仍显示实际错误，原始草稿和笔记写入结果不变');

    // Narrow native Hybrid panels must not clip the left edge of wide structures.
    // Use direct source-input events; a full-source paste is intentionally staged.
    for (const id of ['matrix', 'taylor-64']) {
      await open(baseline, 'hybrid');
      const raw = sample(id);
      source().value = raw; source().dispatchEvent(new Event('input', { bubbles: true })); await settle();
      const root = node('visual-math-editor');
      const workspace = fixture.querySelector<HTMLElement>('.vme-workspace')!;
      check(root.dataset.wideEquation === 'true' && getComputedStyle(workspace).gridTemplateColumns.trim().split(/\s+/).length === 1,
        `${id}: Hybrid长式或矩阵实际CSS采用单列上下布局`);
      check(mounted!.getDraft().latex === raw && source().value === raw, `${id}: 布局改变保留完整源码`);
      for (const language of ['en', 'es'] as const) {
        const selector = node('interface-language') as HTMLSelectElement;
        selector.value = language; selector.dispatchEvent(new Event('change', { bubbles: true })); await settle();
        const hint = fixture.querySelector<HTMLElement>('.vme-mode-description')!.textContent ?? '';
        const phrase = language === 'en' ? 'stacked layout' : 'disposición vertical';
        check(!/[\u4e00-\u9fff]/.test(hint) && hint.includes(phrase), `${id}: ${language}长式上下布局提示已翻译且无中文`);
        for (const mode of ['latex', 'visual', 'hybrid'] as const) await act(`mode-${mode}`);
        check(root.dataset.wideEquation === 'true' && mounted!.getDraft().latex === raw && source().value === raw,
          `${id}: ${language}三模式切换保留原文和长式布局标记`);
        check(getComputedStyle(workspace).gridTemplateColumns.trim().split(/\s+/).length === 1,
          `${id}: ${language}切回Hybrid后实际CSS仍为单列`);
      }
      const short = String.raw`\frac{3}{4}`;
      source().value = short; source().dispatchEvent(new Event('input', { bubbles: true })); await settle();
      check(root.dataset.wideEquation === 'false' && mounted!.getDraft().latex === short && source().value === short,
        `${id}: 改为短分式后移除长式标记，源码保持不变`);
    }

    // Separate source capacity from the expensive visual renderer. These
    // boundary cases are constructed strings, not promises about every formula.
    for (const [length, sourceOnly] of [[4096, false], [4097, true]] as const) {
      const raw = String.raw`\text{` + 'x'.repeat(length - 7) + '}';
      await open(); const boundaryWrites = writes.length; await paste(raw);
      check(raw.length === length && original() === raw && read('import-candidate') === raw
        && node('import-status').dataset.state === (sourceOnly ? 'source-only' : 'ready') && !button('import-apply').disabled,
      `${length}: 独立可视化预算边界分类，不截断候选或丢原文`);
      check(Boolean(node('import-preview').querySelector('math-field')) === !sourceOnly
        && mounted!.getDraft().latex === baseline && writes.length === boundaryWrites,
      `${length}: 超视觉预算不创建MathLive预览，检查不更新主式或笔记`);
      await act('import-cancel');
      check(original() === raw && mounted!.getDraft().latex === baseline && writes.length === boundaryWrites,
        `${length}: 取消仍保留完整原文和旧式`);
    }
    const large = expandedTaylor(256);
    check(large.length === 5130, '预算样本：保留既有5130字符Taylor256作为回归，不继续升级压力');
    for (const mode of ['visual', 'hybrid', 'latex'] as const) {
      await open(before, mode); const budgetWrites = writes.length;
      if (mode === 'visual') {
        await paste(large);
        check(node('import-status').dataset.state === 'source-only' && read('import-status').includes('4096')
          && !node('import-preview').querySelector('math-field') && mounted!.getDraft().latex === before,
        '5130 Visual：预检说明长度限制、无渲染预览，保留旧式等待明确Apply');
        await act('import-apply');
      } else {
        source().value = large; source().dispatchEvent(new Event('input', { bubbles: true })); await settle();
      }
      check(mounted!.getDraft().latex === large && source().value === large && mounted!.field.hidden
        && mounted!.field.getValue('latex') !== large && writes.length === budgetWrites,
      `${mode}: 5130源码完整保留，不加载长MathLive值且未自动写入`);
      const budgetMessage = fixture.querySelector<HTMLElement>('[data-testid="validation-message"]')!;
      check(budgetMessage.textContent?.includes('4096') && !budgetMessage.textContent?.includes('unknown')
        && !button('save').disabled && button('save').textContent === 'Save source',
      `${mode}: 长度专用警告而非未知宏误报，可明确按源码保存`);
      await act('undo');
      check(mounted!.getDraft().latex === before && !mounted!.field.hidden, `${mode}: 源码预算分流可撤销恢复精确旧式与可视化`);
      await act('redo');
      check(mounted!.getDraft().latex === large && Boolean(mounted!.field.hidden), `${mode}: 重做恢复长式源码，不触发长可视化`);
      await act('save');
      check(writes.length === budgetWrites + 1 && writes.at(-1)?.latex === large && writes.at(-1)?.display === true,
        `${mode}: 仅明确Save回调写入完整5130源码与display意图一次`);
      await open(writes.at(-1)!.latex, 'visual');
      check(mounted!.getDraft().latex === large && mounted!.field.hidden && mounted!.field.getValue('latex') !== large,
        `${mode}: 保存回调后重挂载直接守可视化预算，不把源码误当空公式`);
      await act('mode-hybrid');
      check(mounted!.getDraft().latex === large && source().value === large && !button('save').disabled,
        `${mode}: 重开后切Hybrid保留长式并可继续按源码保存`);
      source().value = replacement; source().dispatchEvent(new Event('input', { bubbles: true })); await settle();
      // open() replaced the component above; inspect its current validation node,
      // rather than the detached warning from the pre-save editor instance.
      const reopenedMessage = fixture.querySelector<HTMLElement>('[data-testid="validation-message"]')!;
      check(mounted!.getDraft().latex === replacement && !mounted!.field.hidden && mounted!.field.errors.length === 0
        && !reopenedMessage.textContent?.includes('4096') && writes.length === budgetWrites + 1,
      `${mode}: 实际缩短后重新校验并恢复可视化，不自动写入缩短稿`);
    }
    await open(); await paste(large + '{');
    check(original() === large + '{' && node('import-status').dataset.state === 'error'
      && button('import-apply').disabled && mounted!.getDraft().latex === baseline,
    '超视觉预算仍检查破损结构，不能以仅源码入口绕过语法保护');
    await act('import-cancel');
    await open(baseline, 'hybrid');
    source().value = large; source().dispatchEvent(new Event('input', { bubbles: true })); await settle();
    for (const language of ['en', 'es', 'zh'] as const) {
      const selector = node('interface-language') as HTMLSelectElement;
      selector.value = language; selector.dispatchEvent(new Event('change', { bubbles: true })); await settle();
      const message = fixture.querySelector<HTMLElement>('[data-testid="validation-message"]')?.textContent ?? '';
      const hint = fixture.querySelector<HTMLElement>('.vme-mode-description')?.textContent ?? '';
      check(message.includes('4096') && (language === 'zh' ? message.includes('源码') : !/[一-鿿]/.test(message + hint))
        && mounted!.getDraft().latex === large && source().value === large,
      `预算提示：${language}专用长度说明本地化且语言切换不改完整源码`);
    }

    // Viewport unmount/remount must retain a staged original independently from the equation.
    await open(before, 'hybrid'); const stagedRaw = sample('aligned-crlf');
    await paste(stagedRaw, source()); const draft = mounted!.getDraft();
    check(draft.formulaImport?.original === stagedRaw && draft.formulaImport.open && draft.latex === before, '导入草稿单独保存原文与打开状态，不替换公式草稿');
    await open(draft.latex, draft.mode, draft.formulaImport);
    check(original() === stagedRaw && !node('formula-import-panel').hidden && mounted!.getDraft().latex === before, '重挂载恢复打开的导入面板、CRLF原文及原公式');
    await act('import-cancel'); const closedDraft = mounted!.getDraft();
    check(closedDraft.formulaImport?.original === stagedRaw && !closedDraft.formulaImport.open, '取消只关闭面板，仍保留可恢复的导入原文');
    await open(closedDraft.latex, closedDraft.mode, closedDraft.formulaImport); await act('import-open');
    check(original() === stagedRaw && mounted!.getDraft().latex === before, '关闭状态重挂载后普通导入入口仍可取回原文');
  } finally { mounted?.destroy(); fixture.remove(); }
}
