import { convertLatexToMarkup, validateLatex } from 'mathlive';
import { analyzeFormulaImport } from './formula-import';
import { hasIncompleteSlots } from './validation';

export type MatrixKind = 'pmatrix' | 'bmatrix' | 'matrix' | 'Bmatrix' | 'vmatrix' | 'Vmatrix';
export interface MatrixData {
  kind: MatrixKind;
  rows: number;
  columns: number;
  cells: string[][];
}

export const MAX_MATRIX_DIMENSION = 6;
export const MAX_MATRIX_CELL_CHARS = 512;
export const MAX_MATRIX_SOURCE_CHARS = 8192;
const MATRIX_KINDS = new Set<string>(['pmatrix', 'bmatrix', 'matrix', 'Bmatrix', 'vmatrix', 'Vmatrix']);
const NESTED_ENVIRONMENTS = new Set<string>([...MATRIX_KINDS, 'cases']);
const ROW_FORMAT_COMMANDS = new Set(['cr', 'crcr', 'tabularnewline', 'hline', 'cline', 'multicolumn', 'multirow', 'omit', 'span', 'noalign']);

function commandAt(source: string, start: number): { name: string; end: number } {
  let end = start + 1;
  if (/[A-Za-z]/.test(source[end] ?? '')) {
    while (/[A-Za-z]/.test(source[end] ?? '')) end++;
  } else if (end < source.length) end++;
  return { name: source.slice(start + 1, end), end };
}

/** Split only this matrix level. Nested supported environments remain cell text. */
function splitCells(body: string): string[][] | null {
  const cells: string[][] = [[]];
  let from = 0;
  let braces = 0;
  const environments: string[] = [];
  const append = (end: number): boolean => {
    const cell = body.slice(from, end).trim();
    if (!cell || cell.length > MAX_MATRIX_CELL_CHARS) return false;
    cells[cells.length - 1].push(cell);
    return cells[cells.length - 1].length <= MAX_MATRIX_DIMENSION;
  };
  for (let index = 0; index < body.length;) {
    const character = body[index];
    if (character === '{') { braces++; index++; continue; }
    if (character === '}') { if (--braces < 0) return null; index++; continue; }
    if (character === '&' && braces === 0 && environments.length === 0) {
      if (!append(index)) return null;
      from = ++index;
      continue;
    }
    if (character !== '\\') { index++; continue; }
    const start = index;
    const command = commandAt(body, index);
    index = command.end;
    if (ROW_FORMAT_COMMANDS.has(command.name)) return null;
    if (command.name === '\\') {
      // A row-gap option has a dimension grammar of its own. Never interpret it
      // as the beginning of a new cell or silently discard it.
      if (/^\s*\[/.test(body.slice(index))) return null;
      if (braces === 0 && environments.length === 0) {
        if (!append(start) || cells.length >= MAX_MATRIX_DIMENSION) return null;
        cells.push([]); from = index;
      }
      continue;
    }
    if (command.name !== 'begin' && command.name !== 'end') continue;
    const environment = /^\s*\{\s*([A-Za-z][A-Za-z0-9*_-]*)\s*\}/.exec(body.slice(index));
    if (!environment || !NESTED_ENVIRONMENTS.has(environment[1])) return null;
    index += environment[0].length;
    if (command.name === 'begin') environments.push(environment[1]);
    else if (environments.pop() !== environment[1]) return null;
  }
  if (braces !== 0 || environments.length > 0 || !append(body.length)) return null;
  const columns = cells[0].length;
  return cells.every(row => row.length === columns) ? cells : null;
}

function validateCell(cell: string): string {
  if (typeof cell !== 'string') throw new Error('矩阵单元格必须是公式源码。');
  if (cell.length > MAX_MATRIX_CELL_CHARS) throw new Error('每个矩阵单元格最多 512 个字符。');
  const source = cell.trim();
  if (!source) throw new Error('请填写所有矩阵单元格；空单元格不会自动补零。');
  const analysis = analyzeFormulaImport(source);
  if (analysis.issue) throw new Error(analysis.issue);
  if (analysis.wrapper !== 'bare') throw new Error('单元格只接受不带外层分隔符的公式内容。');
  const cells = splitCells(source);
  if (!cells || cells.length !== 1 || cells[0].length !== 1) {
    throw new Error('单元格包含矩阵分隔符或不支持的行格式。');
  }
  if (hasIncompleteSlots(source)) throw new Error('公式还有未填写的方框或参数，请补全后保存。');
  try {
    if (validateLatex(source).length > 0 || convertLatexToMarkup(source).includes('ML__error')) {
      throw new Error('Unsupported matrix cell');
    }
  } catch {
    throw new Error('矩阵单元格暂时无法可视化，请检查命令或保留原公式。');
  }
  return source;
}

/** Build a complete matrix without evaluating or normalizing its cell contents. */
export function buildMatrix(data: MatrixData): string {
  if (!data || !MATRIX_KINDS.has(data.kind)) throw new Error('矩阵类型不受支持，请选择常用矩阵括号。');
  if (!Number.isInteger(data.rows) || !Number.isInteger(data.columns)
      || data.rows < 1 || data.rows > MAX_MATRIX_DIMENSION
      || data.columns < 1 || data.columns > MAX_MATRIX_DIMENSION) {
    throw new Error('矩阵行列数需为 1 至 6 的整数。');
  }
  if (!Array.isArray(data.cells) || data.cells.length !== data.rows
      || data.cells.some(row => !Array.isArray(row) || row.length !== data.columns)) {
    throw new Error('矩阵单元格数量与行列数不一致。');
  }
  let originalLength = 0;
  for (const row of data.cells) for (const cell of row) {
    if (typeof cell !== 'string') throw new Error('矩阵单元格必须是公式源码。');
    originalLength += cell.length;
  }
  if (originalLength > MAX_MATRIX_SOURCE_CHARS) throw new Error('矩阵源码过长，暂限 8192 个字符。');
  const cells = data.cells.map(row => row.map(validateCell));
  const source = `\\begin{${data.kind}}` + cells.map(row => row.join(' & ')).join(' \\\\ ') + `\\end{${data.kind}}`;
  if (source.length > MAX_MATRIX_SOURCE_CHARS) throw new Error('矩阵源码过长，暂限 8192 个字符。');
  const issue = analyzeFormulaImport(source).issue;
  if (issue) throw new Error(issue);
  try {
    if (validateLatex(source).length > 0 || convertLatexToMarkup(source).includes('ML__error')) {
      throw new Error('Unsupported matrix');
    }
  } catch {
    throw new Error('矩阵暂时无法可视化，请检查单元格或保留原公式。');
  }
  return source;
}

/**
 * Load only a whole supported matrix. Ambiguous formatting, custom commands,
 * row gaps, ragged/empty cells or source outside this environment return null.
 * Returning null never alters the source or attempts a best-effort conversion.
 */
export function parseMatrix(input: string): MatrixData | null {
  const source = input.trim();
  const analysis = analyzeFormulaImport(input);
  if (analysis.issue || analysis.wrapper !== 'bare') return null;
  const opening = /^\\begin\s*\{\s*(pmatrix|bmatrix|matrix|Bmatrix|vmatrix|Vmatrix)\s*\}/.exec(source);
  if (!opening) return null;
  const kind = opening[1] as MatrixKind;
  const closing = new RegExp(`\\\\end\\s*\\{\\s*${kind}\\s*\\}$`).exec(source);
  if (!closing || closing.index < opening[0].length) return null;
  const cells = splitCells(source.slice(opening[0].length, closing.index));
  if (!cells) return null;
  const result: MatrixData = { kind, rows: cells.length, columns: cells[0].length, cells };
  try { buildMatrix(result); }
  catch { return null; }
  return result;
}
