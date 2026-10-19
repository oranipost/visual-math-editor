import type { PlotSpec } from './plot-engine';
import { validateGraphSpec } from './graph-render';
import { formatMath, isMathInsertionAllowed, type MathRange } from './math-ranges';
import { DocumentChangedError, planWrite, type WriteTarget } from './write-plan';

export interface PlotBlock { from: number; to: number; source: string; spec: PlotSpec }
const FIELDS = ['expression', 'xMin', 'xMax', 'yMin', 'yMax'] as const;
const EXTRA_FIELDS = ['thetaMin', 'thetaMax', 'calculus', 'integralMin', 'integralMax', 'zMin', 'zMax', 'azimuth', 'elevation'] as const;

export function parsePlotSpec(source: string): PlotSpec {
  if (source.length > 4096) throw new Error('Graph settings are too long.');
  const data: unknown = JSON.parse(source);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid graph settings.');
  const record = data as Record<string, unknown>;
  if (record.version !== 1 || Object.keys(record).some(key => key !== 'version' && key !== 'mode' && ![...FIELDS, ...EXTRA_FIELDS].includes(key as typeof FIELDS[number]))) throw new Error('Unsupported graph settings version.');
  if (record.mode !== undefined && (typeof record.mode !== 'string' || !['function', 'complex', 'polar', 'surface'].includes(record.mode))) throw new Error('Unsupported graph mode.');
  if (typeof record.expression !== 'string' || !FIELDS.slice(1).every(key => typeof record[key] === 'number' && Number.isFinite(record[key]))) throw new Error('Invalid graph settings.');
  const spec = Object.fromEntries(FIELDS.map(key => [key, record[key]])) as unknown as PlotSpec;
  if (record.mode !== undefined) spec.mode = record.mode as PlotSpec['mode'];
  for (const key of EXTRA_FIELDS) {
    if (record[key] === undefined) continue;
    if (key === 'calculus') {
      if (typeof record[key] !== 'string' || !['none', 'derivative', 'second-derivative', 'integral'].includes(record[key])) throw new Error('Invalid calculus settings.');
      spec.calculus = record[key] as PlotSpec['calculus'];
    } else {
      if (typeof record[key] !== 'number' || !Number.isFinite(record[key])) throw new Error('Invalid graph settings.');
      spec[key] = record[key];
    }
  }
  const allowed = spec.mode === 'surface' ? ['zMin', 'zMax', 'azimuth', 'elevation']
    : spec.mode === 'polar' ? ['thetaMin', 'thetaMax'] : spec.mode === 'complex' ? [] : ['calculus', 'integralMin', 'integralMax'];
  if (EXTRA_FIELDS.some(key => record[key] !== undefined && !allowed.includes(key))) throw new Error('Graph settings do not match this graph type.');
  const validated = validateGraphSpec(spec);
  if (!validated.ok) throw new Error(validated.error);
  return validated.spec;
}

export function serializePlot(spec: PlotSpec): string {
  const normalized = parsePlotSpec(JSON.stringify({ version: 1, ...spec }));
  const source = JSON.stringify({ version: 1, ...normalized });
  return '```vme-plot\n' + source + '\n```';
}

export function findPlotBlocks(markdown: string): PlotBlock[] {
  const blocks: PlotBlock[] = [];
  const opening = /^(`{3,}|~{3,})vme-plot[ \t]*\r?$/gm;
  for (const match of markdown.matchAll(opening)) {
    if (blocks.some(block => match.index < block.to)) continue;
    const from = match.index;
    const contentFrom = from + match[0].length + 1;
    const closing = new RegExp('^' + match[1][0] + '{' + match[1].length + ',}[ \\t]*\\r?$', 'gm');
    closing.lastIndex = contentFrom;
    const end = closing.exec(markdown);
    if (!end) continue;
    const to = end.index + end[0].length;
    const source = markdown.slice(contentFrom, end.index).replace(/\r?\n$/, '');
    // Mask this candidate alone, retaining other fences, YAML and comments.
    const masked = markdown.slice(0, from) + markdown.slice(from, to).replace(/[^\r\n]/g, 'x') + markdown.slice(to);
    if (!isMathInsertionAllowed(masked, from)) continue;
    try {
      planWrite(masked, { snapshot: masked, from, to }, 'x', true);
      blocks.push({ from, to, source, spec: parsePlotSpec(source) });
    } catch { /* Unsupported/nested blocks are left unchanged. */ }
  }
  return blocks;
}

/** A complete graph at EOF is safe to append after, even without a final newline. */
export function canAppendAfterGraph(markdown: string, offset: number): boolean {
  return offset === markdown.length && findPlotBlocks(markdown).some(block => block.to === offset);
}

function checkTarget(current: string, target: WriteTarget): void {
  if (current !== target.snapshot) throw new DocumentChangedError();
  if (!Number.isInteger(target.from) || !Number.isInteger(target.to) || target.from < 0 || target.to < target.from || target.to > current.length) throw new Error('The graph location is invalid. Reopen it.');
}

/** Graphs are top-level Markdown blocks, never inserted into a list or table. */
export function planGraphInsert(current: string, target: WriteTarget, spec: PlotSpec, latex: string, display: boolean, original?: MathRange): string {
  checkTarget(current, target);
  if (!isMathInsertionAllowed(current, target.from) && !(target.from === target.to && canAppendAfterGraph(current, target.from))) throw new Error('Insert the graph in ordinary note text, outside code or properties.');
  planWrite(current, target, 'x', true); // Reuse the conservative container guard.
  const math = latex.trim() ? original && latex === original.latex && display === original.display
    ? current.slice(target.from, target.to) : formatMath(latex, display) : '';
  const core = (math ? math + '\n\n' : '') + serializePlot(spec);
  const before = current.slice(0, target.from);
  const after = current.slice(target.to);
  return (before && !before.endsWith('\n\n') ? before.endsWith('\n') ? '\n' : '\n\n' : '')
    + core + (!after ? '\n\n' : !after.startsWith('\n\n') ? after.startsWith('\n') ? '\n' : '\n\n' : '');
}

export function planGraphUpdate(current: string, target: WriteTarget, spec: PlotSpec): string {
  checkTarget(current, target);
  const serialized = serializePlot(spec);
  const next = parsePlotSpec(serialized.split('\n')[1]);
  const block = findPlotBlocks(current).find(value => value.from === target.from && value.to === target.to);
  if (!block) throw new Error('The original graph is no longer at this position. Reopen it.');
  if (JSON.stringify(block.spec) === JSON.stringify(next)) return current.slice(target.from, target.to);
  return serialized;
}
