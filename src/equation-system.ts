import { convertLatexToMarkup, validateLatex } from 'mathlive';
import { analyzeFormulaImport } from './formula-import';
import { buildMatrix } from './matrix';

/** A single left-braced system. It is notation, not an equation solver. */
export interface SystemData { rows: number; lines: string[] }
export const MIN_SYSTEM_ROWS = 2;
export const MAX_SYSTEM_ROWS = 6;
export const MAX_SYSTEM_LINE_CHARS = 512;
export const MAX_SYSTEM_SOURCE_CHARS = 8192;
const NESTED = new Set(['matrix', 'pmatrix', 'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix', 'cases']);
const ROW_FORMAT = new Set(['cr', 'crcr', 'tabularnewline', 'hline', 'cline', 'multicolumn', 'multirow', 'omit', 'span', 'noalign']);

/** One visual row must never escape into an extra system row or column. */
export function validateSystemLine(input: string): string {
  if (typeof input !== 'string') throw new Error('方程组每行必须是公式源码。');
  if (input.length > MAX_SYSTEM_LINE_CHARS) throw new Error('方程组每行最多 512 个字符。');
  if (!input.trim()) throw new Error('请填写方程组每一行；空行不会自动补零。');
  // Reuse the audited single-cell structural/command validation. The wrapper
  // is only a validator; the returned line remains the user's own source.
  try { buildMatrix({ kind: 'matrix', rows: 1, columns: 1, cells: [[input]] }); }
  catch { throw new Error('这一行暂时无法可视化；请检查公式、分隔符或保留原文。'); }
  return input.trim();
}

export function buildSystem(data: SystemData): string {
  if (!data || !Number.isInteger(data.rows) || data.rows < MIN_SYSTEM_ROWS || data.rows > MAX_SYSTEM_ROWS) {
    throw new Error('方程组行数需为 2 至 6 的整数。');
  }
  if (!Array.isArray(data.lines) || data.lines.length !== data.rows) throw new Error('方程组行数与内容不一致。');
  if (data.lines.some(line => typeof line !== 'string')) throw new Error('方程组每行必须是公式源码。');
  if (data.lines.reduce((sum, line) => sum + line.length, 0) > MAX_SYSTEM_SOURCE_CHARS) throw new Error('方程组源码过长，暂限 8192 个字符。');
  const lines = data.lines.map(validateSystemLine);
  const source = String.raw`\begin{cases}` + lines.join(String.raw` \\ `) + String.raw`\end{cases}`;
  if (source.length > MAX_SYSTEM_SOURCE_CHARS) throw new Error('方程组源码过长，暂限 8192 个字符。');
  const issue = analyzeFormulaImport(source).issue;
  if (issue) throw new Error(issue);
  if (validateLatex(source).length || convertLatexToMarkup(source).includes('ML__error')) {
    throw new Error('方程组暂时无法可视化，请保留原公式。');
  }
  return source;
}

function splitLines(body: string): string[] | null {
  const lines: string[] = [];
  const environments: string[] = [];
  let braces = 0; let from = 0;
  const append = (end: number) => {
    const line = body.slice(from, end).trim();
    if (!line || line.length > MAX_SYSTEM_LINE_CHARS || lines.length >= MAX_SYSTEM_ROWS) return false;
    lines.push(line); return true;
  };
  for (let index = 0; index < body.length;) {
    const char = body[index];
    if (char === '{') { braces++; index++; continue; }
    if (char === '}') { if (--braces < 0) return null; index++; continue; }
    if (char === '&' && braces === 0 && environments.length === 0) return null;
    if (char !== '\\') { index++; continue; }
    const start = index++;
    const commandStart = index;
    if (/[A-Za-z]/.test(body[index] ?? '')) while (/[A-Za-z]/.test(body[index] ?? '')) index++;
    else if (index < body.length) index++;
    const command = body.slice(commandStart, index);
    if (ROW_FORMAT.has(command)) return null;
    if (command === '\\') {
      if (/^\s*\[/.test(body.slice(index))) return null;
      if (braces === 0 && environments.length === 0) {
        if (!append(start)) return null;
        from = index;
      }
      continue;
    }
    if (command !== 'begin' && command !== 'end') continue;
    const environment = /^\s*\{\s*([A-Za-z][A-Za-z0-9*_-]*)\s*\}/.exec(body.slice(index));
    if (!environment || !NESTED.has(environment[1])) return null;
    index += environment[0].length;
    if (command === 'begin') environments.push(environment[1]);
    else if (environments.pop() !== environment[1]) return null;
  }
  if (braces || environments.length || !append(body.length)) return null;
  return lines;
}

/** Only a whole, single-column cases system is loaded. Never reinterpret a
 * two-column piecewise function, aligned source, row gaps, or unknown macros. */
export function parseSystem(input: string): SystemData | null {
  if (typeof input !== 'string' || input.length > MAX_SYSTEM_SOURCE_CHARS) return null;
  const analysis = analyzeFormulaImport(input);
  if (analysis.issue || analysis.wrapper !== 'bare') return null;
  const source = input.trim();
  const opening = /^\\begin\s*\{\s*cases\s*\}/.exec(source);
  const closing = /\\end\s*\{\s*cases\s*\}$/.exec(source);
  if (!opening || !closing || closing.index < opening[0].length) return null;
  const lines = splitLines(source.slice(opening[0].length, closing.index));
  if (!lines) return null;
  const data: SystemData = { rows: lines.length, lines };
  try { buildSystem(data); return data; }
  catch { return null; }
}
