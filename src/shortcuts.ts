import { validateLatex } from 'mathlive/ssr';
import { hasIncompleteSlots } from './validation';
import { validateLatexSource } from './source-validation';

export type FormulaShortcuts = Record<string, string>;
export const MAX_SHORTCUTS = 50;

export function validShortcutName(name: string): boolean {
  return /^[A-Za-z][A-Za-z0-9]{2,23}$/.test(name)
    && !Object.hasOwn(Object.prototype, name) && name !== 'prototype';
}

export function validShortcutFormula(latex: string): boolean {
  if (!latex.trim() || latex.length > 2048) return false;
  for (let index = 0; index < latex.length; index++) {
    const code = latex.charCodeAt(index);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) return false;
    // MathLive 0.111.1 Tokenizer.next()/expand() interpolate # followed by a
    // digit, ? or @. Ordinary # (for example a mhchem triple bond) is literal.
    // Reject parameter-looking continuations too, even when its tokenizer's
    // trailing-character boundary would currently leave them unexpanded.
    if (latex[index] !== '#' || !/[0-9?@]/.test(latex[index + 1] ?? '')) continue;
    let escapes = 0;
    for (let before = index - 1; before >= 0 && latex[before] === '\\'; before--) escapes++;
    if (escapes % 2 === 0) return false;
  }
  try { return !validateLatexSource(latex) && !hasIncompleteSlots(latex) && validateLatex(latex).length === 0; }
  catch { return false; }
}

/** Settings are untrusted input; invalid entries never reach a mathfield. */
export function normalizeShortcuts(value: unknown): FormulaShortcuts {
  const result: FormulaShortcuts = Object.create(null) as FormulaShortcuts;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [name, formula] of Object.entries(value)) {
    if (Object.keys(result).length === MAX_SHORTCUTS) break;
    if (validShortcutName(name) && typeof formula === 'string' && validShortcutFormula(formula)) result[name] = formula.trim();
  }
  return result;
}

/** A prefix would expand before the longer keyword could be entered. */
export function shortcutConflict(name: string, names: readonly string[]): boolean {
  return names.some(existing => existing !== name && (existing.slice(0, -1).includes(name) || name.slice(0, -1).includes(existing)));
}

/** Apply only the user's changes, preserving unrelated commits from another editor. */
export function mergeShortcutChanges(current: FormulaShortcuts, baseline: FormulaShortcuts, next: FormulaShortcuts): FormulaShortcuts {
  const result = { ...current };
  for (const name of new Set([...Object.keys(baseline), ...Object.keys(next)])) {
    if (baseline[name] === next[name]) continue;
    if (current[name] !== baseline[name]) throw new Error('Shortcut changed in another editor.');
    if (Object.hasOwn(next, name)) result[name] = next[name];
    else delete result[name];
  }
  if (Object.keys(result).length > MAX_SHORTCUTS) throw new Error('Shortcut limit exceeded.');
  const names = Object.keys(result);
  if (names.some(name => shortcutConflict(name, names))) throw new Error('Shortcut names conflict.');
  return normalizeShortcuts(result);
}
