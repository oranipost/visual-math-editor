import { MATH_SYMBOLS_HEADING, MATH_SYMBOLS_HINT, MATH_SYMBOL_TOOLS } from './math-symbols';
import { createHtml } from './dom';

/** Reuses the editor's MathLive insertion path, selection, draft history, and save transaction. */
export function mountMathSymbolTools(container: HTMLElement, options: {
  hasSelection: () => boolean;
  onInsert: (latex: string) => void;
}): { destroy: () => void; setDisabled: (value: boolean) => void } {
  const doc = container.ownerDocument, root = createHtml('details', doc);
  root.className = 'vme-advanced-math'; root.dataset.testid = 'math-symbol-tools';
  const summary = createHtml('summary', doc); summary.textContent = MATH_SYMBOLS_HEADING;
  const hint = createHtml('p', doc); hint.className = 'vme-hint'; hint.textContent = MATH_SYMBOLS_HINT;
  const grid = createHtml('div', doc); grid.className = 'vme-advanced-math-grid';
  grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', MATH_SYMBOLS_HEADING);
  let disabled = false, destroyed = false;
  const buttons: HTMLButtonElement[] = [];
  for (const item of MATH_SYMBOL_TOOLS) {
    const button = createHtml('button', doc); button.type = 'button';
    button.className = 'vme-advanced-math-button'; button.dataset.action = `math-${item.id}`;
    button.title = item.insertLabel; button.setAttribute('aria-label', item.insertLabel);
    const glyph = createHtml('span', doc); glyph.className = 'vme-advanced-math-glyph';
    glyph.setAttribute('aria-hidden', 'true'); glyph.dataset.i18nIgnore = ''; glyph.textContent = item.glyph;
    const label = createHtml('span', doc); label.className = 'vme-advanced-math-label'; label.textContent = item.label;
    button.append(glyph, label);
    button.addEventListener('pointerdown', event => event.preventDefault());
    button.addEventListener('click', () => { if (!disabled && !destroyed) options.onInsert(item.template(options.hasSelection())); });
    buttons.push(button); grid.append(button);
  }
  root.append(summary, hint, grid); container.append(root);
  return { setDisabled(value) { disabled = value; for (const button of buttons) button.disabled = value; }, destroy() { destroyed = true; root.remove(); } };
}
