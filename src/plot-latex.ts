import { convertLatexToAsciiMath, validateLatex } from 'mathlive/ssr';
import { compileExpression, type PlotSpec } from './plot-engine';
import { hasIncompleteSlots } from './validation';
import { validateLatexSource } from './source-validation';

/** Reject unfamiliar TeX before conversion: a converter may silently drop commands. */
export function graphFromLatex(latex: string): Pick<PlotSpec, 'mode' | 'expression'> {
  if (!latex.trim() || latex.length > 1024 || /[[\]|_%&#<>`]/.test(latex)) throw new Error('Use a supported y = f(x) expression.');
  if (validateLatexSource(latex) || hasIncompleteSlots(latex)) throw new Error('Complete the formula first.');
  const allowed = new Set(['frac', 'dfrac', 'tfrac', 'sqrt', 'left', 'right', 'cdot', 'times', 'div', 'sin', 'cos', 'tan', 'ln', 'log', 'exp', 'pi', 'theta', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh']);
  for (const command of latex.matchAll(/\\([A-Za-z]+|.)/g)) {
    if (!allowed.has(command[1]) && ![',', '!', ';', ' '].includes(command[1])) throw new Error('This formula contains unsupported notation.');
  }
  if (validateLatex(latex).length) throw new Error('Complete the formula first.');
  let expression = convertLatexToAsciiMath(latex).trim();
  const mode = /^r\s*=/.test(expression) ? 'polar' : /^z\s*=/.test(expression) ? 'surface' : 'function';
  if (mode !== 'function') expression = expression.replace(/^[rz]\s*=\s*/, '');
  const compiled = compileExpression(expression, mode === 'surface' ? ['x', 'y'] : mode === 'polar' ? ['theta'] : ['x']);
  if (!compiled.ok) throw new Error(compiled.error);
  // Use the same normalized expression as the renderer (including removal of
  // an optional y= prefix), so equation/graph commit checks compare like values.
  return { mode, expression: compiled.expression };
}

/** Backward-compatible normalized expression accessor. */
export function expressionFromLatex(latex: string): string { return graphFromLatex(latex).expression; }
