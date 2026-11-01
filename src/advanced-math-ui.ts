import { ADVANCED_MATH_HEADING, ADVANCED_MATH_HINT, ADVANCED_MATH_TEMPLATES } from './advanced-math';
import { createHtml } from './dom';

/** The caller owns insertion validation, selection, Undo and the eventual note transaction. */
export function mountAdvancedMathTools(container: HTMLElement, options: {
  onInsert: (template: string) => void;
}): { destroy: () => void; setDisabled: (disabled: boolean) => void } {
  const doc = container.ownerDocument;
  const root = createHtml('details', doc);
  root.className = 'vme-advanced-math'; root.dataset.testid = 'advanced-math-tools';
  const summary = createHtml('summary', doc); summary.textContent = ADVANCED_MATH_HEADING;
  const hint = createHtml('p', doc); hint.className = 'vme-hint'; hint.textContent = ADVANCED_MATH_HINT;
  const grid = createHtml('div', doc); grid.className = 'vme-advanced-math-grid';
  grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', ADVANCED_MATH_HEADING);
  let disabled = false; let destroyed = false;
  const buttons: HTMLButtonElement[] = [];
  for (const item of ADVANCED_MATH_TEMPLATES) {
    const button = createHtml('button', doc); button.type = 'button';
    button.className = 'vme-advanced-math-button'; button.dataset.action = `advanced-${item.id}`;
    button.title = item.insertLabel; button.setAttribute('aria-label', item.insertLabel);
    const glyph = createHtml('span', doc); glyph.className = 'vme-advanced-math-glyph';
    glyph.setAttribute('aria-hidden', 'true'); glyph.dataset.i18nIgnore = ''; glyph.textContent = item.glyph;
    const label = createHtml('span', doc); label.className = 'vme-advanced-math-label'; label.textContent = item.label;
    button.append(glyph, label);
    // Preserve the caller's MathLive selection while selecting a toolbar structure.
    button.addEventListener('pointerdown', event => event.preventDefault());
    button.addEventListener('click', () => { if (!disabled && !destroyed) options.onInsert(item.latex); });
    buttons.push(button); grid.append(button);
  }
  root.append(summary, hint, grid); container.append(root);
  return {
    setDisabled(value) { disabled = value; for (const button of buttons) button.disabled = value; },
    destroy() { destroyed = true; root.remove(); },
  };
}
