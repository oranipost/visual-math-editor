import { formatMath } from "./math-ranges";

export class DocumentChangedError extends Error {
  constructor() { super("笔记已发生变化。为避免覆盖内容，请取消后重新打开公式。"); }
}

export interface WriteTarget {
  snapshot: string;
  from: number;
  to: number;
}

export function planWrite(current: string, target: WriteTarget, latex: string, display: boolean): string {
  if (current !== target.snapshot) throw new DocumentChangedError();
  if (target.from < 0 || target.to < target.from || target.to > current.length) {
    throw new Error("公式位置无效，请重新打开编辑器。");
  }
  const lineStart = current.lastIndexOf("\n", target.from - 1) + 1;
  const lineEnd = current.indexOf("\n", target.from);
  const line = current.slice(lineStart, lineEnd < 0 ? current.length : lineEnd);
  const beforeLines = current.slice(0, lineStart).split("\n");
  const afterLines = current.slice(lineStart).split("\n");
  const tableDivider = (s: string) => /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(s);
  const paragraph: string[] = [];
  for (let i = beforeLines.length - 1; i >= 0; i--) {
    if (i === beforeLines.length - 1 && beforeLines[i] === "") continue;
    if (!beforeLines[i].trim()) break;
    paragraph.push(beforeLines[i]);
  }
  const inTable = line.includes("|") && (line.trimStart().startsWith("|") || tableDivider(afterLines[1] ?? "") || paragraph.some(tableDivider));
  const containerLine = (s: string) => /^\s*>|^\s*(?:[-+*]|\d+[.)])\s|^(?: {2,}|\t)/.test(s);
  const nestedLine = containerLine(line) || paragraph.some(containerLine);
  if (display && (inTable || nestedLine)) {
    throw new Error("此位置位于表格、列表或引用块。第一版请使用行内公式，或到普通空白段落插入独立公式。");
  }
  if (inTable) {
    // Complex array column specifications can assign a non-symbol meaning to |.
    if (/\\begin\s*\{/.test(latex) && latex.includes("|")) {
      throw new Error("表格内暂不支持含竖线的复杂环境，请在表格外编辑这个公式。");
    }
    latex = latex.replace(/\\\||\|/g, token => token === "\\|" ? "\\Vert{}" : "\\vert{}");
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
