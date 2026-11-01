import type { MathfieldElement } from 'mathlive';
import { createHtml } from './dom';
import { createPreview } from './math-runtime';
import { analyzeFormulaImport } from './formula-import';
import { buildSystem, parseSystem, validateSystemLine, MAX_SYSTEM_ROWS, type SystemData } from './equation-system';

export interface SystemDraft {
  open: boolean; rows: number; lines: string[]; loadedSource?: string; rejectedOriginal?: string;
}

/** Bounded visual row drafts. Preview and Cancel never update the main formula. */
export function mountEquationSystemTools(container: HTMLElement, options: {
  initialDraft?: SystemDraft;
  getLatex: () => string;
  onApply: (latex: string, replaceSource?: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const doc = container.ownerDocument;
  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
    const element = createHtml(tag, doc); if (text) element.textContent = text; return element;
  };
  let disabled = false; let destroyed = false;
  let open = options.initialDraft?.open ?? false;
  let rows = options.initialDraft?.rows ?? 2;
  let loadedSource = options.initialDraft?.loadedSource;
  let rejectedOriginal = options.initialDraft?.rejectedOriginal ?? '';
  // CodeMirror can snapshot and remount before this tool has ever opened.
  // That default, unused draft must not suppress the first automatic load.
  let autoLoadPending = !options.initialDraft || (!open && rows === 2
    && loadedSource === undefined && !rejectedOriginal
    && options.initialDraft.lines.every(line => !line.trim()));
  let candidate: string | undefined;
  let activeLine: MathfieldElement | undefined;
  const lines = Array.from({ length: MAX_SYSTEM_ROWS }, (_, row) => options.initialDraft?.lines[row] ?? '');
  const fields: { field: MathfieldElement; row: number; serialized: string }[] = [];
  const root = node('section'); root.className = 'vme-matrix-tools vme-system-tools'; root.dataset.testid = 'system-tools';
  const action = (text: string, id: string, run: () => void) => {
    const button = node('button', text); button.type = 'button'; button.dataset.action = id;
    button.addEventListener('click', () => { if (!disabled && !destroyed) run(); }); return button;
  };
  const toggle = action('方程组大括号', 'system-toggle', () => setOpen(!open));
  toggle.className = 'vme-matrix-toggle';
  const panel = node('div'); panel.className = 'vme-matrix-panel'; panel.hidden = !open; panel.dataset.testid = 'system-panel';
  const hint = node('p', '逐行填写方程或不等式，自动加左大括号；这里只编辑，不求解。'); hint.className = 'vme-hint';
  const controls = node('div'); controls.className = 'vme-matrix-controls';
  const rowsLabel = node('label', '方程组行数'); const rowInput = node('select'); rowInput.dataset.testid = 'system-rows'; rowInput.setAttribute('aria-label', '方程组行数');
  for (let value = 2; value <= MAX_SYSTEM_ROWS; value++) { const choice = node('option', String(value)); choice.value = String(value); rowInput.append(choice); }
  rowInput.value = String(rows); rowsLabel.append(rowInput);
  const load = action('载入当前方程组', 'system-load', () => loadCurrent(true)); controls.append(rowsLabel, load);
  const retained = node('p', '减少行数会保留本次隐藏行；取消不会更改原公式。'); retained.className = 'vme-hint';
  const lineTools = node('div'); lineTools.className = 'vme-matrix-cell-tools';
  for (const [label, id, template] of [['插入分数', 'system-line-fraction', '\\frac{#?}{#?}'], ['插入平方根', 'system-line-root', '\\sqrt{#?}']] as const) {
    const tool = action(label, id, () => {
      const target = activeLine ?? fields[0]?.field; if (!target) return;
      target.insert(template, { format: 'latex', mode: 'math', selectionMode: 'placeholder', focus: true, feedback: false });
      syncLines(); invalidate();
    });
    tool.addEventListener('pointerdown', event => event.preventDefault()); lineTools.append(tool);
  }
  const grid = node('div'); grid.className = 'vme-system-lines'; grid.dataset.testid = 'system-lines';
  const rejectedLabel = node('label', '未应用的方程组行原文'); rejectedLabel.hidden = !rejectedOriginal;
  const rejected = node('textarea'); rejected.readOnly = true; rejected.value = rejectedOriginal; rejected.className = 'vme-source'; rejected.dataset.testid = 'system-rejected-original'; rejected.setAttribute('aria-label', '未应用的方程组行原文'); rejectedLabel.append(rejected);
  const copy = action('复制导入原文', 'system-copy-original', () => {
    void navigator.clipboard.writeText(rejectedOriginal).then(() => { status.textContent = '导入原文已复制。'; }, () => { status.textContent = '未能复制原文，请保留导入面板后重试。'; });
  }); copy.hidden = !rejectedOriginal;
  const preview = node('div'); preview.className = 'vme-matrix-preview'; preview.dataset.testid = 'system-preview'; preview.setAttribute('aria-label', '方程组预览');
  const status = node('p'); status.dataset.testid = 'system-status'; status.setAttribute('role', 'status'); status.className = 'vme-hint';
  const review = action('预览方程组', 'system-preview', inspect);
  const apply = action('插入方程组', 'system-apply', () => {
    if (!candidate) return;
    try {
      syncLines(); const latest = buildSystem({ rows, lines: lines.slice(0, rows) });
      if (latest !== candidate) { invalidate(); return; }
      if (loadedSource !== undefined && options.getLatex() !== loadedSource) { status.textContent = '当前公式已更改，请重新载入方程组后再替换。'; status.dataset.state = 'error'; return; }
      options.onApply(candidate, loadedSource);
      loadedSource = loadedSource === undefined ? undefined : candidate;
      setOpen(false); status.textContent = '方程组已加入公式草稿；保存后才更新笔记。';
    } catch { status.textContent = '方程组未插入；请检查每行内容和当前公式。'; status.dataset.state = 'error'; }
  });
  const cancel = action('取消方程组编辑', 'system-cancel', () => setOpen(false));
  const actions = node('div'); actions.className = 'vme-import-actions'; actions.append(review, apply, cancel);
  const commitHint = node('p', '预览不会更改公式；插入或替换后仍需保存笔记。'); commitHint.className = 'vme-hint';
  panel.append(hint, controls, retained, lineTools, grid, rejectedLabel, copy, preview, status, actions, commitHint);
  root.append(toggle, panel); container.append(root);

  function syncLines(): void {
    for (const entry of fields) {
      const serialized = entry.field.getValue('latex');
      if (serialized !== entry.serialized) { lines[entry.row] = entry.field.getValue('latex-expanded'); entry.serialized = serialized; }
    }
  }
  function invalidate(): void {
    candidate = undefined; preview.replaceChildren(); apply.disabled = true;
    status.textContent = '输入已修改，请重新预览方程组。'; status.dataset.state = 'stale';
  }
  function renderLines(): void {
    grid.replaceChildren(); fields.length = 0; activeLine = undefined;
    for (let row = 0; row < rows; row++) {
      const wrapper = node('div'); wrapper.className = 'vme-system-line';
      const label = node('label'); label.id = `vme-system-line-${Math.random().toString(36).slice(2)}`;
      const labelWord = node('span', '方程行'); const number = node('span', ` ${row + 1}`); number.dataset.i18nIgnore = ''; label.append(labelWord, number);
      const field = createHtml('math-field', doc); field.className = 'vme-system-line-field'; field.dataset.testid = `system-line-${row + 1}`; field.setAttribute('aria-labelledby', label.id);
      field.setAttribute('math-virtual-keyboard-policy', 'manual'); field.setAttribute('smart-mode', 'false'); field.setAttribute('popover-policy', 'off'); field.setAttribute('default-mode', 'math');
      wrapper.append(label, field); grid.append(wrapper);
      field.mathVirtualKeyboardPolicy = 'manual'; field.smartMode = false; field.smartSuperscript = false; field.menuItems = []; field.readOnly = disabled;
      field.setValue(lines[row], { silenceNotifications: true });
      fields.push({ field, row, serialized: field.getValue('latex') });
      field.addEventListener('pointerdown', () => { activeLine = field; }); field.addEventListener('focusin', () => { activeLine = field; });
      field.addEventListener('input', () => { syncLines(); invalidate(); });
      field.addEventListener('paste', (event: ClipboardEvent) => {
        event.preventDefault(); event.stopImmediatePropagation(); if (disabled || destroyed) return;
        const original = event.clipboardData?.getData('text/plain'); if (!original) return;
        try {
          const checked = analyzeFormulaImport(original);
          if (checked.issue || checked.wrapper !== 'bare') throw new Error('Unsupported line');
          const validated = validateSystemLine(checked.candidate);
          lines[row] = validated; renderLines(); invalidate();
        } catch {
          invalidate(); rejectedOriginal = original; rejected.value = original; rejectedLabel.hidden = copy.hidden = false;
          status.textContent = '这一行暂不支持这段内容；粘贴原文保留在下方，方程组未改动。'; status.dataset.state = 'error';
        }
      }, true);
      field.addEventListener('keydown', event => { if (event.key === '\\') { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
      field.addEventListener('beforeinput', event => { if ((event as InputEvent).data === '\\') { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
    }
  }
  function inspect(): void {
    syncLines(); candidate = undefined; preview.replaceChildren(); apply.disabled = true;
    try {
      if (lines.slice(0, rows).some(line => !line.trim())) { status.textContent = '请填写每一行；空行不会自动补零或删除。'; status.dataset.state = 'error'; return; }
      const source = buildSystem({ rows, lines: lines.slice(0, rows) });
      createPreview(source, preview); candidate = source; apply.disabled = disabled;
      apply.textContent = loadedSource === undefined ? '插入方程组' : '替换当前方程组';
      status.textContent = '预览不会更改公式；插入或替换后仍需保存笔记。'; status.dataset.state = 'ready';
    } catch { status.textContent = '方程组包含暂不支持的内容；原公式未改动。'; status.dataset.state = 'error'; }
  }
  function useData(parsed: SystemData, original: string): void {
    rows = parsed.rows; loadedSource = original;
    for (let row = 0; row < MAX_SYSTEM_ROWS; row++) lines[row] = parsed.lines[row] ?? '';
    rowInput.value = String(rows); renderLines(); invalidate(); apply.textContent = '替换当前方程组';
  }
  function loadCurrent(showError: boolean): void {
    const original = options.getLatex(); const parsed = parseSystem(original);
    if (!parsed) { if (showError) { status.textContent = '当前整条公式不是受支持的单列方程组，原公式未改动。'; status.dataset.state = 'error'; } return; }
    useData(parsed, original);
  }
  function setOpen(value: boolean): void {
    if (!value) syncLines();
    open = value; panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      if (autoLoadPending) { autoLoadPending = false; loadCurrent(false); }
      renderLines(); invalidate();
    } else { fields.length = 0; grid.replaceChildren(); }
    options.onOpenChange(open);
  }
  rowInput.addEventListener('change', () => { syncLines(); rows = Number(rowInput.value); renderLines(); invalidate(); });
  toggle.setAttribute('aria-expanded', String(open));
  if (open) renderLines(); apply.disabled = true;
  return {
    isOpen: () => open,
    getDraft: (): SystemDraft => { syncLines(); return { open, rows, lines: [...lines], loadedSource, rejectedOriginal }; },
    setDisabled(value: boolean) {
      disabled = value;
      for (const item of [toggle, rowInput, load, review, cancel, copy, ...lineTools.querySelectorAll<HTMLButtonElement>('button')]) item.disabled = value;
      apply.disabled = value || !candidate; for (const entry of fields) entry.field.readOnly = value;
    },
    destroy() { destroyed = true; fields.length = 0; root.remove(); },
  };
}
