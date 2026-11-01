import { validateLatexSource } from './source-validation';

/** Provisional local import budgets, evaluated before invoking a notation engine. */
export const MAX_FORMULA_IMPORT_CHARS = 8192;
export const MAX_FORMULA_IMPORT_DEPTH = 32;
export const MAX_FORMULA_IMPORT_COMMANDS = 512;

/** A separate visual-rendering budget; larger valid input may still be saved as source. */
export const MAX_FORMULA_VISUAL_CHARS = 4096;
export const FORMULA_VISUAL_LIMIT_MESSAGE = '公式超过 4096 个 UTF-16 代码单元，暂用 LaTeX 或 Hybrid 源码编辑；原文完整保留，缩短后可恢复可视化。';

/** UTF-16 code units, as measured by String.length. Never truncates or rewrites source. */
export function formulaVisualBudgetIssue(source: string): string | null {
  return source.length > MAX_FORMULA_VISUAL_CHARS ? FORMULA_VISUAL_LIMIT_MESSAGE : null;
}

export interface FormulaImportAnalysis {
  /** Exact clipboard or textarea input, including its original line endings. */
  original: string;
  /** Only outside whitespace and one complete outer wrapper may be removed. */
  candidate: string;
  wrapper: 'bare' | 'inline' | 'display';
  /** An absent value means that bare source expressed no layout preference. */
  display?: boolean;
  /** Structure/format checks only; null does not assert visual engine support. */
  issue: string | null;
}

const SINGLE_FORMULA_ISSUE = '这里只导入单条公式；请移除正文、多条公式或额外的数学分隔符。';
const WRAPPER_ISSUE = '公式外层分隔符不匹配；请检查 $、$$、\\(…\\) 或 \\[...\\]。';
const DOCUMENT_ISSUE = '这里只导入单条 LaTeX 公式，暂不支持完整文档、文件引用或宏定义。';
const TEMPLATE_ISSUE = '输入包含 MathLive 模板参数（#0、#1、#? 或 #@）；原文已保留，请改用普通公式源码。';

function escaped(source: string, index: number): boolean {
  let backslashes = 0;
  for (let previous = index - 1; previous >= 0 && source[previous] === '\\'; previous--) backslashes++;
  return backslashes % 2 === 1;
}

function commandAt(source: string, start: number): { name: string; end: number } {
  let end = start + 1;
  if (/[A-Za-z]/.test(source[end] ?? '')) {
    while (/[A-Za-z]/.test(source[end] ?? '')) end++;
  } else if (end < source.length) end++;
  return { name: source.slice(start + 1, end), end };
}

const DOCUMENT_COMMANDS = new Set([
  'documentclass', 'usepackage', 'RequirePackage', 'input', 'include', 'includeonly',
  'newcommand', 'renewcommand', 'providecommand', 'def', 'edef', 'gdef', 'xdef',
  'newenvironment', 'renewenvironment', 'DeclareMathOperator',
]);

const ARGUMENT_COMMANDS = new Set(['sqrt', 'frac', 'dfrac', 'tfrac', 'binom', 'overset', 'underset']);

/**
 * A conservative resource preflight, not a second TeX parser. It measures
 * explicit groups, environments and left/right groups together, and caps
 * consecutive known argument commands. This is not a complete calculation of
 * TeX argument recursion: only whitespace may separate an unbraced command chain.
 */
function scanCandidate(source: string): string | null {
  let braces = 0;
  let environments = 0;
  let leftRight = 0;
  let commands = 0;
  let argumentChain = 0;
  for (let index = 0; index < source.length;) {
    const character = source[index];
    if (character === '$') return SINGLE_FORMULA_ISSUE;
    if (character === '#' && /[0-9?@]/.test(source[index + 1] ?? '')) return TEMPLATE_ISSUE;
    if (character === '{') braces++;
    else if (character === '}') braces = Math.max(0, braces - 1);
    if (braces + environments + leftRight > MAX_FORMULA_IMPORT_DEPTH) {
      return '公式结构过深，单条导入暂限 32 层；原文已保留。';
    }
    if (character !== '\\') {
      if (!/\s/.test(character)) argumentChain = 0;
      index++; continue;
    }

    if (++commands > MAX_FORMULA_IMPORT_COMMANDS) {
      return '公式命令过多，单条导入暂限 512 个命令；原文已保留。';
    }
    const command = commandAt(source, index);
    index = command.end;
    if (ARGUMENT_COMMANDS.has(command.name)) argumentChain++;
    else argumentChain = 0;
    if (braces + environments + leftRight + argumentChain > MAX_FORMULA_IMPORT_DEPTH) {
      return '公式结构过深，单条导入暂限 32 层；原文已保留。';
    }
    if (['(', ')', '[', ']'].includes(command.name)) return SINGLE_FORMULA_ISSUE;
    if (DOCUMENT_COMMANDS.has(command.name)) return DOCUMENT_ISSUE;
    if (command.name === 'left') leftRight++;
    else if (command.name === 'right') leftRight = Math.max(0, leftRight - 1);
    if (command.name === 'begin' || command.name === 'end') {
      const name = /^\s*\{\s*([A-Za-z][A-Za-z0-9*_-]*)\s*\}/.exec(source.slice(index));
      if (name) {
        if (name[1] === 'document') return DOCUMENT_ISSUE;
        if (command.name === 'begin') environments++;
        else environments = Math.max(0, environments - 1);
        // The environment name is metadata, not an additional math group.
        index += name[0].length;
      }
    }
    if (braces + environments + leftRight > MAX_FORMULA_IMPORT_DEPTH) {
      return '公式结构过深，单条导入暂限 32 层；原文已保留。';
    }
  }
  return null;
}

/**
 * Analyze one pasted formula without parsing, repairing or reserializing it.
 * On rejection, original is always available verbatim. Bare text is not guessed
 * to be prose: its visual validity must be checked by the caller separately.
 */
export function analyzeFormulaImport(original: string): FormulaImportAnalysis {
  const source = original.trim();
  const result: FormulaImportAnalysis = { original, candidate: source, wrapper: 'bare', issue: null };
  if (original.length > MAX_FORMULA_IMPORT_CHARS) {
    result.issue = '公式过长，单条导入暂限 8192 个字符；原文已保留。';
    return result;
  }
  if (!source) {
    result.issue = '请先粘贴或输入一条 LaTeX 公式。';
    return result;
  }
  // Do not pass invisible controls into a parser that might silently discard them.
  // eslint-disable-next-line no-control-regex -- Reject unsafe nonprinting input.
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(source)) {
    result.issue = '输入包含不可见的控制字符；原文已保留，请检查后重试。';
    return result;
  }
  if (/^(?:`{3,}|~{3,})/.test(source)) {
    result.issue = SINGLE_FORMULA_ISSUE;
    return result;
  }

  if (source.startsWith('$$')) {
    result.wrapper = 'display'; result.display = true;
    const closing = source.length - 2;
    if (closing < 2 || !source.endsWith('$$') || escaped(source, closing) || (source[closing - 1] === '$' && !escaped(source, closing - 1))) {
      result.issue = WRAPPER_ISSUE;
      return result;
    }
    result.candidate = source.slice(2, -2);
  } else if (source.startsWith('$')) {
    result.wrapper = 'inline'; result.display = false;
    const closing = source.length - 1;
    if (closing < 1 || source[closing] !== '$' || escaped(source, closing) || (source[closing - 1] === '$' && !escaped(source, closing - 1))) {
      result.issue = WRAPPER_ISSUE;
      return result;
    }
    result.candidate = source.slice(1, -1);
  } else if (source.startsWith('\\(') || source.startsWith('\\[')) {
    const display = source[1] === '[';
    result.wrapper = display ? 'display' : 'inline'; result.display = display;
    const closing = source.length - 2;
    const expected = display ? '\\]' : '\\)';
    if (closing < 2 || !source.endsWith(expected) || escaped(source, closing)) {
      result.issue = WRAPPER_ISSUE;
      return result;
    }
    result.candidate = source.slice(2, -2);
  }

  if (!result.candidate.trim()) {
    result.issue = '公式内容为空；请填写公式后再应用。';
    return result;
  }
  result.issue = scanCandidate(result.candidate) ?? validateLatexSource(result.candidate);
  return result;
}
