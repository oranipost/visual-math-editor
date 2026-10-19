import type { MathfieldElement } from 'mathlive';
import { createHtml } from './dom';
import { MAX_SHORTCUTS, normalizeShortcuts, shortcutConflict, validShortcutFormula, validShortcutName, type FormulaShortcuts } from './shortcuts';

interface ShortcutOptions {
  field: MathfieldElement;
  getLatex: () => string;
  shortcuts?: FormulaShortcuts;
  onChange?: (shortcuts: FormulaShortcuts, baseline: FormulaShortcuts) => FormulaShortcuts | void | Promise<FormulaShortcuts | void>;
  onInsert: (latex: string) => void;
}

/** Save a visually composed equation without exposing a LaTeX settings form. */
export function mountShortcutTools(host: HTMLElement, options: ShortcutOptions): { destroy: () => void; setDisabled: (disabled: boolean) => void } {
  const doc = host.ownerDocument;
  const root = createHtml('details', doc);
  root.className = 'vme-shortcuts';
  root.dataset.testid = 'formula-shortcuts';
  const summary = createHtml('summary', doc); summary.textContent = '我的公式快捷词';
  const hint = createHtml('p', doc); hint.className = 'vme-hint';
  hint.textContent = '先可视化写好公式，再取一个 3–24 位英文字母或数字的快捷词（以字母开头）。可直接键入展开，或从列表插入；仅保存在当前库。';
  const row = createHtml('div', doc); row.className = 'vme-shortcut-row';
  const name = createHtml('input', doc); name.type = 'text'; name.maxLength = 24;
  name.placeholder = '例如 myfrac'; name.setAttribute('aria-label', '公式快捷词'); name.dataset.testid = 'shortcut-name';
  name.autocomplete = 'off'; name.spellcheck = false;
  const save = createHtml('button', doc); save.type = 'button'; save.textContent = '保存当前公式为快捷词'; save.dataset.action = 'shortcut-save';
  const list = createHtml('div', doc); list.className = 'vme-shortcut-list'; list.dataset.testid = 'shortcut-list';
  const status = createHtml('p', doc); status.className = 'vme-hint'; status.setAttribute('role', 'status'); status.dataset.testid = 'shortcut-status';
  const base = { ...options.field.inlineShortcuts };
  let shortcuts = normalizeShortcuts(options.shortcuts);
  let disabled = false; let busy = false; let destroyed = false;
  const updateControls = () => root.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button,input').forEach(control => { control.disabled = disabled || busy; });
  const render = () => {
    options.field.inlineShortcuts = { ...base, ...shortcuts };
    list.replaceChildren();
    for (const [keyword, latex] of Object.entries(shortcuts)) {
      const item = createHtml('div', doc); item.className = 'vme-shortcut-row';
      const insert = createHtml('button', doc); insert.type = 'button'; insert.textContent = keyword; insert.dataset.i18nIgnore = '';
      insert.dataset.shortcut = keyword;
      insert.addEventListener('click', () => { if (!busy && !disabled) options.onInsert(latex); });
      const remove = createHtml('button', doc); remove.type = 'button'; remove.textContent = '删除快捷词'; remove.dataset.shortcutRemove = keyword;
      remove.addEventListener('click', () => { const next = { ...shortcuts }; delete next[keyword]; void commit(next, '快捷词已删除。'); });
      item.append(insert, remove); list.append(item);
    }
    updateControls();
  };
  const commit = async (next: FormulaShortcuts, message: string) => {
    if (disabled || busy || destroyed) return;
    busy = true; updateControls(); status.textContent = '';
    try {
      const committed = await options.onChange?.({ ...next }, { ...shortcuts });
      if (destroyed) return;
      shortcuts = normalizeShortcuts(committed ?? next); render(); status.textContent = message;
    } catch { if (!destroyed) status.textContent = '未能保存快捷词，请重试。原快捷词已保留。'; }
    finally { busy = false; if (!destroyed) updateControls(); }
  };
  save.addEventListener('click', () => {
    if (disabled || busy) return;
    const keyword = name.value.trim();
    if (!validShortcutName(keyword)) { status.textContent = '快捷词需为 3–24 位英文字母或数字，并以字母开头。'; return; }
    if (Object.hasOwn(base, keyword) || shortcutConflict(keyword, [...Object.keys(base), ...Object.keys(shortcuts)])) { status.textContent = '快捷词与内置或已保存的快捷词冲突，请换一个名称。'; return; }
    if (Object.hasOwn(shortcuts, keyword)) { status.textContent = '此快捷词已存在；请先删除，或使用新名称。'; return; }
    if (Object.keys(shortcuts).length >= MAX_SHORTCUTS) { status.textContent = '最多保存 50 个公式快捷词。'; return; }
    const latex = options.getLatex();
    if (!validShortcutFormula(latex)) { status.textContent = '请先完成一个有效公式，再保存快捷词。'; return; }
    void commit({ ...shortcuts, [keyword]: latex.trim() }, '快捷词已保存。可在可视化区域键入，或点击列表插入。');
  });
  name.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); save.click(); } });
  row.append(name, save); root.append(summary, hint, row, list, status); host.append(root); render();
  return {
    setDisabled(value) { disabled = value; updateControls(); },
    destroy() { destroyed = true; options.field.inlineShortcuts = base; root.remove(); },
  };
}
