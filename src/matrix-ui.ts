import { convertLatexToMarkup, validateLatex, type MathfieldElement } from 'mathlive';
import { createHtml } from './dom';
import { createPreview } from './math-runtime';
import { analyzeFormulaImport } from './formula-import';
import { hasIncompleteSlots } from './validation';
import { buildMatrix, parseMatrix, type MatrixKind } from './matrix';

export interface MatrixDraft {
  open: boolean; rows: number; columns: number; kind: MatrixKind;
  cells: string[][]; loadedSource?: string; rejectedOriginal?: string;
}

/** A bounded scratch grid. Nothing reaches the equation until an explicit apply. */
export function mountMatrixTools(container: HTMLElement, options: {
  initialDraft?: MatrixDraft;
  getLatex: () => string;
  onApply: (latex: string, replaceSource?: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const doc = container.ownerDocument;
  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
    const item = createHtml(tag, doc); if (text) item.textContent = text; return item;
  };
  let disabled = false; let open = options.initialDraft?.open ?? false;
  let rows = options.initialDraft?.rows ?? 2; let columns = options.initialDraft?.columns ?? 2;
  let kind: MatrixKind = options.initialDraft?.kind ?? 'bmatrix';
  let loadedSource = options.initialDraft?.loadedSource;
  let rejectedOriginal = options.initialDraft?.rejectedOriginal ?? '';
  // Keep values outside a temporarily smaller visible grid in the current draft.
  const cells = Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => options.initialDraft?.cells[r]?.[c] ?? ''));
  const fields: { field: MathfieldElement; row: number; column: number; serialized: string }[] = [];
  let candidate: string | undefined;
  let activeCell: MathfieldElement | undefined;
  const root = node('section'); root.className = 'vme-matrix-tools'; root.dataset.testid = 'matrix-tools';
  const action = (text: string, id: string, run: () => void) => {
    const item = node('button', text); item.type = 'button'; item.dataset.action = id;
    item.addEventListener('click', () => { if (!disabled) run(); }); return item;
  };
  const toggle = action('矩阵编辑器', 'matrix-toggle', () => setOpen(!open));
  toggle.className = 'vme-matrix-toggle';
  const panel = node('div'); panel.className = 'vme-matrix-panel'; panel.hidden = !open;
  panel.dataset.testid = 'matrix-panel';
  const hint = node('p', '选择行列数并填写每一格；这里只编辑矩阵，不计算矩阵运算。'); hint.className = 'vme-hint';
  const controls = node('div'); controls.className = 'vme-matrix-controls';
  function dimension(label: string, id: string, value: number): HTMLSelectElement {
    const wrapper = node('label', label); const input = node('select'); input.dataset.testid = id;
    input.setAttribute('aria-label', label);
    for (let n = 1; n <= 6; n++) { const choice = node('option', String(n)); choice.value = String(n); input.append(choice); }
    input.value = String(value); wrapper.append(input); controls.append(wrapper); return input;
  }
  const rowInput = dimension('行数', 'matrix-rows', rows);
  const columnInput = dimension('列数', 'matrix-columns', columns);
  const kindLabel = node('label', '矩阵括号'); const kindInput = node('select'); kindInput.dataset.testid = 'matrix-kind'; kindInput.setAttribute('aria-label', '矩阵括号');
  for (const [value, text] of [['bmatrix', '方括号'], ['pmatrix', '圆括号'], ['matrix', '无括号'], ['Bmatrix', '花括号'], ['vmatrix', '行列式竖线'], ['Vmatrix', '双竖线']] as const) {
    const choice = node('option', text); choice.value = value; kindInput.append(choice);
  }
  kindInput.value = kind; kindLabel.append(kindInput); controls.append(kindLabel);
  const load = action('载入当前矩阵', 'matrix-load', loadCurrent);
  const zero = action('空白单元格填0', 'matrix-fill-zero', () => {
    syncCells(); for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) if (!cells[r][c].trim()) cells[r][c] = '0';
    renderGrid(); invalidate();
  });
  controls.append(load, zero);
  const cellTools = node('div'); cellTools.className = 'vme-matrix-cell-tools';
  for (const [label, id, template] of [['插入分数', 'matrix-cell-fraction', '\\frac{#?}{#?}'], ['插入平方根', 'matrix-cell-root', '\\sqrt{#?}']] as const) {
    const tool = action(label, id, () => {
      const target = activeCell ?? fields[0]?.field; if (!target) return;
      target.insert(template, { format: 'latex', mode: 'math', selectionMode: 'placeholder', focus: true, feedback: false });
      syncCells(); invalidate();
    });
    tool.addEventListener('pointerdown', event => event.preventDefault()); cellTools.append(tool);
  }
  const retained = node('p', '矩阵尺寸改变会保留已有单元格；超出当前范围的内容仍保留到本次关闭。'); retained.className = 'vme-hint';
  const grid = node('div'); grid.className = 'vme-matrix-grid'; grid.dataset.testid = 'matrix-grid';
  const rejectedLabel = node('label', '未应用的单元格原文'); rejectedLabel.hidden = !rejectedOriginal;
  const rejected = node('textarea'); rejected.readOnly = true; rejected.value = rejectedOriginal; rejected.className = 'vme-source';
  rejected.setAttribute('aria-label', '未应用的单元格原文'); rejected.dataset.testid = 'matrix-rejected-original'; rejectedLabel.append(rejected);
  const copy = action('复制导入原文', 'matrix-copy-original', () => {
    void navigator.clipboard.writeText(rejectedOriginal).then(() => { status.textContent = '导入原文已复制。'; }, () => { status.textContent = '未能复制原文，请保留导入面板后重试。'; });
  }); copy.hidden = !rejectedOriginal;
  const preview = node('div'); preview.className = 'vme-matrix-preview'; preview.dataset.testid = 'matrix-preview'; preview.setAttribute('aria-label', '矩阵预览');
  const status = node('p'); status.dataset.testid = 'matrix-status'; status.setAttribute('role', 'status'); status.className = 'vme-hint';
  const review = action('预览矩阵', 'matrix-preview', inspect);
  const apply = action('插入矩阵', 'matrix-apply', () => {
    if (!candidate) return;
    try {
      syncCells(); const latest = buildMatrix({ kind, rows, columns, cells: visibleCells() });
      if (latest !== candidate) { invalidate(); return; }
      if (loadedSource !== undefined && options.getLatex() !== loadedSource) { status.textContent = '当前公式已更改，请重新载入矩阵后再替换。'; status.dataset.state = 'error'; return; }
      options.onApply(candidate, loadedSource);
      loadedSource = loadedSource === undefined ? undefined : candidate;
      setOpen(false); status.textContent = '矩阵已加入公式草稿；保存后才更新笔记。';
    } catch { status.textContent = '矩阵未插入；请检查单元格和当前公式。'; status.dataset.state = 'error'; }
  });
  const cancel = action('取消矩阵编辑', 'matrix-cancel', () => setOpen(false));
  const actions = node('div'); actions.className = 'vme-import-actions'; actions.append(review, apply, cancel);
  const commitHint = node('p', '预览不会更改公式；插入或替换后仍需保存笔记。'); commitHint.className = 'vme-hint';
  panel.append(hint, controls, retained, cellTools, grid, rejectedLabel, copy, preview, status, actions, commitHint);
  root.append(toggle, panel); container.append(root);

  function visibleCells(): string[][] { return Array.from({ length: rows }, (_, r) => cells[r].slice(0, columns)); }
  function syncCells(): void {
    for (const entry of fields) {
      const serialized = entry.field.getValue('latex');
      if (serialized !== entry.serialized) { cells[entry.row][entry.column] = entry.field.getValue('latex-expanded'); entry.serialized = serialized; }
    }
  }
  function invalidate(): void {
    candidate = undefined; preview.replaceChildren(); apply.disabled = true;
    status.textContent = '输入已修改，请重新预览矩阵。'; status.dataset.state = 'stale';
  }
  function validCell(text: string): boolean {
    const analysis = analyzeFormulaImport(text);
    return !analysis.issue && !hasIncompleteSlots(analysis.candidate) && validateLatex(analysis.candidate).length === 0
      && !convertLatexToMarkup(analysis.candidate).includes('ML__error');
  }
  function renderGrid(): void {
    grid.replaceChildren(); fields.length = 0; activeCell = undefined;
    for (let r = 0; r < rows; r++) {
      const row = node('div'); row.className = 'vme-matrix-grid-row'; grid.append(row);
      for (let c = 0; c < columns; c++) {
        const box = node('div'); box.className = 'vme-matrix-cell';
        const label = node('label'); label.id = `vme-cell-${Math.random().toString(36).slice(2)}`;
        const word = node('span', '单元格'); word.className = 'vme-visually-hidden';
        label.append(word, node('span', ` (${r + 1}, ${c + 1})`));
        const field = createHtml('math-field', doc); field.className = 'vme-matrix-cell-field';
        field.dataset.testid = `matrix-cell-${r + 1}-${c + 1}`; field.setAttribute('aria-labelledby', label.id);
        field.setAttribute('math-virtual-keyboard-policy', 'manual'); field.setAttribute('smart-mode', 'false');
        field.setAttribute('popover-policy', 'off'); field.setAttribute('default-mode', 'math');
        box.append(label, field); row.append(box);
        field.mathVirtualKeyboardPolicy = 'manual'; field.smartMode = false; field.smartSuperscript = false;
        field.menuItems = []; field.readOnly = disabled;
        field.setValue(cells[r][c], { silenceNotifications: true });
        fields.push({ field, row: r, column: c, serialized: field.getValue('latex') });
        // MathLive defers its keyboard focus by about 60ms. A fast pointer
        // selection must target this cell before the shared toolbar is pressed.
        field.addEventListener('pointerdown', () => { activeCell = field; });
        field.addEventListener('focusin', () => { activeCell = field; });
        field.addEventListener('input', () => { syncCells(); invalidate(); });
        field.addEventListener('paste', (event: ClipboardEvent) => {
          event.preventDefault(); event.stopImmediatePropagation(); if (disabled) return;
          const original = event.clipboardData?.getData('text/plain'); if (!original) return;
          try {
            const checked = analyzeFormulaImport(original);
            if (!validCell(original)) throw new Error('Unsupported cell');
            // Reuse full matrix validation to reject a top-level & or row separator.
            buildMatrix({ kind: 'matrix', rows: 1, columns: 1, cells: [[checked.candidate]] });
            cells[r][c] = checked.candidate; renderGrid(); invalidate();
          } catch {
            rejectedOriginal = original; rejected.value = original; rejectedLabel.hidden = copy.hidden = false;
            status.textContent = '单元格暂不支持这段内容；原始粘贴内容保留在下方，当前矩阵未改动。'; status.dataset.state = 'error';
          }
        }, true);
        field.addEventListener('keydown', event => { if (event.key === '\\') { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
        field.addEventListener('beforeinput', event => { if ((event as InputEvent).data === '\\') { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
      }
    }
  }
  function inspect(): void {
    syncCells(); candidate = undefined; preview.replaceChildren(); apply.disabled = true;
    try {
      const data = { kind, rows, columns, cells: visibleCells() };
      if (data.cells.some(row => row.some(cell => !cell.trim()))) { status.textContent = '所有单元格都需要填写；也可明确选择填0。'; status.dataset.state = 'error'; return; }
      const latex = buildMatrix(data);
      if (!validCell(latex)) throw new Error('Unsupported matrix');
      createPreview(latex, preview); candidate = latex; apply.disabled = disabled;
      apply.textContent = loadedSource === undefined ? '插入矩阵' : '替换当前矩阵';
      status.textContent = '预览不会更改公式；插入或替换后仍需保存笔记。'; status.dataset.state = 'ready';
    } catch { status.textContent = '当前矩阵包含暂不支持的单元格；原公式未改动。'; status.dataset.state = 'error'; }
  }
  function loadCurrent(): void {
    const original = options.getLatex(); const parsed = parseMatrix(original);
    if (!parsed) { status.textContent = '当前整条公式不是受支持的单个矩阵，原公式未改动。'; status.dataset.state = 'error'; return; }
    rows = parsed.rows; columns = parsed.columns; kind = parsed.kind; loadedSource = original;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) cells[r][c] = parsed.cells[r]?.[c] ?? '';
    rowInput.value = String(rows); columnInput.value = String(columns); kindInput.value = kind;
    renderGrid(); invalidate(); apply.textContent = '替换当前矩阵';
  }
  function setOpen(value: boolean): void {
    if (!value) syncCells();
    open = value; panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open));
    if (open) { renderGrid(); invalidate(); }
    else { fields.length = 0; grid.replaceChildren(); }
    options.onOpenChange(open);
  }
  rowInput.addEventListener('change', () => { syncCells(); rows = Number(rowInput.value); renderGrid(); invalidate(); });
  columnInput.addEventListener('change', () => { syncCells(); columns = Number(columnInput.value); renderGrid(); invalidate(); });
  kindInput.addEventListener('change', () => { kind = kindInput.value as MatrixKind; invalidate(); });
  toggle.setAttribute('aria-expanded', String(open));
  if (open) renderGrid(); apply.disabled = true;
  return {
    isOpen: () => open,
    getDraft: (): MatrixDraft => { syncCells(); return { open, rows, columns, kind, cells: cells.map(row => [...row]), loadedSource, rejectedOriginal }; },
    setDisabled(value: boolean) {
      disabled = value; for (const item of [toggle, rowInput, columnInput, kindInput, load, zero, review, cancel, copy, ...cellTools.querySelectorAll<HTMLButtonElement>('button')]) item.disabled = value;
      apply.disabled = value || !candidate; for (const item of fields) item.field.readOnly = value;
    },
    destroy() { fields.length = 0; root.remove(); },
  };
}
