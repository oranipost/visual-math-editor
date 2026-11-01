import { createHtml } from './dom';
import { SET_SEQUENCE_GROUPS, SET_SEQUENCE_HEADING, SET_SEQUENCE_HINT, SET_SEQUENCE_TOOLS } from './set-sequence-tools';

/** Shares the editor's insertion, selection, draft Undo and explicit note-save path. */
export function mountSetSequenceTools(container: HTMLElement, options: {
  hasSelection: () => boolean;
  onInsert: (template: string) => void;
}): { destroy: () => void; setDisabled: (disabled: boolean) => void } {
  const doc = container.ownerDocument, root = createHtml('details', doc);
  root.className = 'vme-advanced-math'; root.dataset.testid = 'set-sequence-tools';
  const summary = createHtml('summary', doc); summary.textContent = SET_SEQUENCE_HEADING;
  const hint = createHtml('p', doc); hint.className = 'vme-hint'; hint.textContent = SET_SEQUENCE_HINT;
  root.append(summary, hint);
  let disabled = false, destroyed = false;
  const buttons: HTMLButtonElement[] = [];
  for (const group of SET_SEQUENCE_GROUPS) {
    const section = createHtml('section', doc);
    const heading = createHtml('h4', doc); heading.textContent = group.label;
    const grid = createHtml('div', doc); grid.className = 'vme-advanced-math-grid';
    grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', group.label);
    section.append(heading);
    if (group.hint) {
      const groupHint = createHtml('p', doc); groupHint.className = 'vme-hint'; groupHint.textContent = group.hint;
      section.append(groupHint);
    }
    for (const item of SET_SEQUENCE_TOOLS.filter(tool => tool.group === group.id)) {
      const button = createHtml('button', doc); button.type = 'button';
      button.className = 'vme-advanced-math-button'; button.dataset.action = 'set-sequence-' + item.id;
      button.title = item.insertLabel; button.setAttribute('aria-label', item.insertLabel);
      const glyph = createHtml('span', doc); glyph.className = 'vme-advanced-math-glyph';
      glyph.setAttribute('aria-hidden', 'true'); glyph.dataset.i18nIgnore = ''; glyph.textContent = item.glyph;
      const label = createHtml('span', doc); label.className = 'vme-advanced-math-label'; label.textContent = item.label;
      button.append(glyph, label);
      // Do not move the existing MathLive selection into this toolbar.
      button.addEventListener('pointerdown', event => event.preventDefault());
      button.addEventListener('click', () => { if (!disabled && !destroyed) options.onInsert(item.template(options.hasSelection())); });
      buttons.push(button); grid.append(button);
    }
    section.append(grid); root.append(section);
  }
  container.append(root);
  return {
    setDisabled(value) { disabled = value; for (const button of buttons) button.disabled = value; },
    destroy() { destroyed = true; root.remove(); },
  };
}
