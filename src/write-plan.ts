import { formatMath } from "./math-ranges";

export class DocumentChangedError extends Error {
  constructor() { super("笔记已发生变化。为避免覆盖内容，请取消后重新打开公式。"); }
}

export interface WriteTarget {
  snapshot: string;
  from: number;
  to: number;
}

interface QuoteInfo {
  depth: number;
  rawPrefix: string;
  canonicalPrefix: string;
  blankQuote: string;
  rest: string;
}

function extractQuoteInfo(line: string): QuoteInfo {
  let depth = 0;
  let offset = 0;
  while (offset < line.length) {
    const match = /^ {0,3}>[ \t]?/.exec(line.slice(offset));
    if (!match) break;
    depth++;
    offset += match[0].length;
  }
  if (depth === 0) {
    return { depth: 0, rawPrefix: "", canonicalPrefix: "", blankQuote: "", rest: line };
  }
  const rawPrefix = line.slice(0, offset);
  const blankQuote = rawPrefix.replace(/[ \t]+$/, "");
  const canonicalPrefix = /[ \t]$/.test(rawPrefix) ? rawPrefix : `${rawPrefix} `;
  return {
    depth,
    rawPrefix,
    canonicalPrefix,
    blankQuote,
    rest: line.slice(offset),
  };
}

const TABLE_DIVIDER_RE = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const TOP_LEVEL_CONTAINER_RE = /^\s*>|^\s*(?:[-+*]|\d+[.)])\s|^(?: {2,}|\t)/;
const LIST_OR_INDENT_RE = /^\s*(?:[-+*]|\d+[.)])\s|^(?: {2,}|\t)/;

function analyzeContext(current: string, from: number, to: number) {
  const lineStart = from === 0 ? 0 : current.lastIndexOf("\n", from - 1) + 1;
  const lineBreak = current.indexOf("\n", from);
  const lineEnd = lineBreak < 0 ? current.length : lineBreak;
  const line = current.slice(lineStart, lineEnd);

  const endLineStart = to === 0 ? 0 : current.lastIndexOf("\n", to - 1) + 1;
  const endLineBreak = current.indexOf("\n", to);
  const endLineEnd = endLineBreak < 0 ? current.length : endLineBreak;
  const endLine = current.slice(endLineStart, endLineEnd);

  const beforeLines = current.slice(0, lineStart).split("\n");
  if (lineStart > 0 && beforeLines[beforeLines.length - 1] === "") {
    beforeLines.pop();
  }
  const afterLines = current.slice(lineStart).split("\n");

  const paragraph: string[] = [];
  for (let i = beforeLines.length - 1; i >= 0; i--) {
    if (!beforeLines[i].trim()) break;
    paragraph.push(beforeLines[i]);
  }

  const quote = extractQuoteInfo(line);
  const endQuote = extractQuoteInfo(endLine);
  const effectiveLine = quote.depth > 0 ? quote.rest : line;
  const nextEffectiveLine = quote.depth > 0
    ? (() => {
        const nextInfo = extractQuoteInfo(afterLines[1] ?? "");
        return nextInfo.depth === quote.depth ? nextInfo.rest : "";
      })()
    : (afterLines[1] ?? "");

  const quoteParagraph: string[] = [];
  if (quote.depth > 0) {
    for (let i = beforeLines.length - 1; i >= 0; i--) {
      const info = extractQuoteInfo(beforeLines[i]);
      if (info.depth !== quote.depth || !info.rest.trim()) break;
      quoteParagraph.push(info.rest);
    }
  }

  const inTable = effectiveLine.includes("|") && (
    effectiveLine.trimStart().startsWith("|")
    || TABLE_DIVIDER_RE.test(nextEffectiveLine)
    || (quote.depth > 0
      ? quoteParagraph.some(item => TABLE_DIVIDER_RE.test(item))
      : paragraph.some(item => TABLE_DIVIDER_RE.test(item)))
  );

  const topLevelNested = TOP_LEVEL_CONTAINER_RE.test(line)
    || paragraph.some(item => TOP_LEVEL_CONTAINER_RE.test(item));

  let pureQuoteDisplayAllowed = false;
  if (!inTable && quote.depth > 0 && endQuote.depth === quote.depth) {
    const spannedLines = current.slice(lineStart, endLineEnd).split("\n");
    const spannedOk = spannedLines.every(spanned => {
      const info = extractQuoteInfo(spanned);
      if (info.depth !== quote.depth) return false;
      if (info.rest.trim().length > 0 && LIST_OR_INDENT_RE.test(info.rest)) return false;
      return !(info.rest.includes("|") && (info.rest.trimStart().startsWith("|") || TABLE_DIVIDER_RE.test(info.rest)));
    });
    const paragraphListOrTable = quoteParagraph.some(rest => LIST_OR_INDENT_RE.test(rest) || TABLE_DIVIDER_RE.test(rest));
    pureQuoteDisplayAllowed = spannedOk && !paragraphListOrTable;
  }

  return {
    lineStart,
    lineEnd,
    line,
    endLineStart,
    endLineBreak,
    endLineEnd,
    endLine,
    beforeLines,
    inTable,
    topLevelNested,
    quote,
    endQuote,
    pureQuoteDisplayAllowed,
  };
}

/** Reject tables, lists, blockquotes, and indented blocks for top-level fenced blocks (e.g. vme-plot). */
export function assertTopLevelBlockContext(current: string, target: WriteTarget): void {
  if (current !== target.snapshot) throw new DocumentChangedError();
  if (target.from < 0 || target.to < target.from || target.to > current.length) {
    throw new Error("公式位置无效，请重新打开编辑器。");
  }
  const ctx = analyzeContext(current, target.from, target.to);
  if (ctx.inTable || ctx.topLevelNested) {
    throw new Error("此位置位于表格、列表或引用块。请在此使用行内公式，或到普通空白段落插入独立公式。");
  }
}

/**
 * Choose a sensible default layout when opening a new equation:
 * blank ordinary lines and blank blockquote/Callout lines default to display (`$$...$$`);
 * lines that already contain prose, or positions inside lists/tables, default to inline (`$...$`).
 */
export function defaultDisplayForContext(snapshot: string, from: number, to = from): boolean {
  if (from < 0 || to < from || to > snapshot.length) return true;
  const ctx = analyzeContext(snapshot, from, to);
  if (ctx.inTable) return false;
  if (ctx.quote.depth > 0) {
    if (!ctx.pureQuoteDisplayAllowed) return false;
    return ctx.quote.rest.trim().length === 0 && ctx.endQuote.rest.trim().length === 0;
  }
  if (ctx.topLevelNested) return false;
  return ctx.line.trim().length === 0 && ctx.endLine.trim().length === 0;
}

function formatQuotedDisplayReplacement(
  current: string,
  target: WriteTarget,
  ctx: ReturnType<typeof analyzeContext>,
  latex: string,
): string {
  const { canonicalPrefix: prefix, blankQuote, depth } = ctx.quote;
  const formattedLines = formatMath(latex, true).split("\n");
  const quotedLines = formattedLines.map(item => (item.length > 0 ? prefix + item : blankQuote));
  const beforeOnStartLine = current.slice(ctx.lineStart, target.from);
  const afterOnEndLine = current.slice(target.to, ctx.endLineEnd);
  const beforeInfo = extractQuoteInfo(beforeOnStartLine);
  const prevLine = ctx.lineStart > 0 ? ctx.beforeLines[ctx.beforeLines.length - 1] : undefined;

  let leading = "";
  let bodyFirstLine = quotedLines[0];

  if (beforeOnStartLine === "") {
    if (prevLine !== undefined && prevLine.trim() !== "") {
      const prevInfo = extractQuoteInfo(prevLine);
      leading = prevInfo.depth === depth
        ? (prevInfo.rest.trim().length > 0 ? `${blankQuote}\n` : "")
        : "\n";
    }
  } else if (beforeInfo.depth === depth && beforeInfo.rest.trim() === "") {
    const prevInfo = prevLine !== undefined ? extractQuoteInfo(prevLine) : undefined;
    if (prevInfo && prevInfo.depth === depth && prevInfo.rest.trim().length > 0) {
      // Turn the current empty `> ` prefix into the quoted blank separator line.
      leading = "\n";
    } else {
      bodyFirstLine = /[ \t]$/.test(beforeOnStartLine) ? formattedLines[0] : ` ${formattedLines[0]}`;
    }
  } else {
    leading = `\n${blankQuote}\n`;
  }

  let trailing = "";
  const afterInfo = extractQuoteInfo(afterOnEndLine);
  if (afterOnEndLine.trim().length > 0) {
    if (afterInfo.depth === depth) {
      trailing = afterInfo.rest.trim().length > 0 ? `\n${blankQuote}\n` : "\n";
    } else {
      trailing = `\n${blankQuote}\n${/^[ \t]/.test(afterOnEndLine) ? blankQuote : prefix}`;
    }
  } else if (ctx.endLineBreak >= 0) {
    const afterRest = current.slice(ctx.endLineBreak + 1);
    const nextBreak = afterRest.indexOf("\n");
    const nextLine = nextBreak < 0 ? afterRest : afterRest.slice(0, nextBreak);
    if (nextLine.trim() !== "") {
      const nextInfo = extractQuoteInfo(nextLine);
      if (nextInfo.depth === depth) {
        if (nextInfo.rest.trim().length > 0) trailing = `\n${blankQuote}`;
      } else {
        trailing = "\n";
      }
    }
  }

  return leading + [bodyFirstLine, ...quotedLines.slice(1)].join("\n") + trailing;
}

export function planWrite(current: string, target: WriteTarget, latex: string, display: boolean): string {
  if (current !== target.snapshot) throw new DocumentChangedError();
  if (target.from < 0 || target.to < target.from || target.to > current.length) {
    throw new Error("公式位置无效，请重新打开编辑器。");
  }
  const ctx = analyzeContext(current, target.from, target.to);
  if (display && (ctx.inTable || (ctx.topLevelNested && !ctx.pureQuoteDisplayAllowed))) {
    throw new Error("此位置位于表格、列表或引用块。请在此使用行内公式，或到普通空白段落插入独立公式。");
  }
  if (ctx.inTable) {
    // Complex array column specifications can assign a non-symbol meaning to |.
    if (/\\begin\s*\{/.test(latex) && latex.includes("|")) {
      throw new Error("表格内暂不支持含竖线的复杂环境，请在表格外编辑这个公式。");
    }
    latex = latex.replace(/\\\||\|/g, token => token === "\\|" ? "\\Vert{}" : "\\vert{}");
  }
  if (display && ctx.quote.depth > 0 && ctx.pureQuoteDisplayAllowed) {
    return formatQuotedDisplayReplacement(current, target, ctx, latex);
  }
  let replacement = formatMath(latex, display);
  if (display) {
    // A display equation needs its own paragraph; preserve surrounding text.
    const before = current.slice(0, target.from);
    const after = current.slice(target.to);
    if (before && !before.endsWith("\n\n")) replacement = (before.endsWith("\n") ? "\n" : "\n\n") + replacement;
    if (after && !after.startsWith("\n\n")) replacement += after.startsWith("\n") ? "\n" : "\n\n";
  }
  return replacement;
}
