import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PLOT_SPEC, type PlotSpec } from '../src/plot-engine';
import { findMathRanges } from '../src/math-ranges';
import { findPlotBlocks, parsePlotSpec, planGraphInsert, planGraphUpdate, serializePlot } from '../src/plot-markdown';
import { DocumentChangedError, type WriteTarget } from '../src/write-plan';

const spec: PlotSpec = { ...DEFAULT_PLOT_SPEC, expression: 'x^2', xMin: -3, xMax: 3, yMin: -1, yMax: 10 };
const source = () => JSON.stringify({ version: 1, ...spec });
const replace = (current: string, target: WriteTarget, replacement: string) => current.slice(0, target.from) + replacement + current.slice(target.to);

test('versioned graph data round trips without accepting arbitrary settings', () => {
  assert.deepEqual(parsePlotSpec(source()), spec);
  assert.equal(serializePlot(spec), '```vme-plot\n' + source() + '\n```');
  for (const value of [null, [], 1, 'x', { ...spec }, { version: 2, ...spec }, { version: '1', ...spec }, { version: 1, ...spec, extra: true }]) {
    assert.throws(() => parsePlotSpec(JSON.stringify(value)));
  }
  for (const key of ['expression', 'xMin', 'xMax', 'yMin', 'yMax']) {
    const data = { version: 1, ...spec } as Record<string, unknown>;
    delete data[key];
    assert.throws(() => parsePlotSpec(JSON.stringify(data)), key);
  }
  assert.throws(() => parsePlotSpec('{"version":1,not json}'));
  assert.throws(() => parsePlotSpec(' '.repeat(4097)));
});

test('graph data rejects string bounds, nulls, invalid ranges and unsupported expressions', () => {
  for (const patch of [
    { xMin: '-3' }, { yMax: null }, { xMin: 3, xMax: 3 }, { yMin: 20 }, { xMin: -1000001 },
    { xMin: 0, xMax: 1e-10 }, { xMin: 999999.9999999, xMax: 1000000 }, { expression: 'window.alert(1)' }, { expression: 'z^2' }, { expression: 'x^' },
  ]) assert.throws(() => parsePlotSpec(JSON.stringify({ version: 1, ...spec, ...patch })), JSON.stringify(patch));
  assert.throws(() => parsePlotSpec('{"version":1,"expression":"x","xMin":-1,"xMax":1e999,"yMin":-1,"yMax":1}'));
});

test('locator preserves exact offsets, source bytes and distinct duplicate graphs', () => {
  const unusual = '~~~vme-plot  \r\n{ "version":1, "expression":"x^2", "xMin":-3, "xMax":3, "yMin":-1, "yMax":10 }\r\n~~~~';
  const markdown = '中文 🧮 before\n\n' + unusual + '\n\n' + serializePlot(spec) + '\n\nafter';
  const blocks = findPlotBlocks(markdown);
  assert.equal(blocks.length, 2);
  assert.equal(markdown.slice(blocks[0].from, blocks[0].to), unusual);
  assert.equal(blocks[0].source, '{ "version":1, "expression":"x^2", "xMin":-3, "xMax":3, "yMin":-1, "yMax":10 }');
  assert.deepEqual(blocks.map(block => block.spec), [spec, spec]);
  assert.equal(blocks[1].from, markdown.indexOf('```vme-plot'));
});

test('locator leaves graphs in YAML, comments, HTML and outer code examples untouched', () => {
  const graph = serializePlot(spec);
  const cases = [
    '---\nvalue:\n' + graph + '\n---\n',
    '<!--\n' + graph + '\n-->\n',
    '<div>\n' + graph + '\n</div>\n',
    '````markdown\n' + graph + '\n````\n',
    '~~~markdown\n' + graph + '\n~~~\n',
    graph.split('\n').map(line => '    ' + line).join('\n'),
    graph.split('\n').map(line => '> ' + line).join('\n'),
    '- A list paragraph\n' + graph,
    '> A quote paragraph\n' + graph,
  ];
  for (const markdown of cases) assert.deepEqual(findPlotBlocks(markdown), [], markdown);
  const ordinary = '- A list\n\n' + graph;
  assert.equal(findPlotBlocks(ordinary).length, 1);
});

test('locator rejects incomplete fences and invalid data while finding later valid graphs', () => {
  for (const markdown of ['```vme-plot\n' + source(), '````vme-plot\n' + source() + '\n```', '```vme-plot\nno json\n```']) {
    assert.deepEqual(findPlotBlocks(markdown), []);
  }
  const invalid = '```vme-plot\nno json\n```\n\n';
  const blocks = findPlotBlocks(invalid + serializePlot(spec));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].from, invalid.length);
});

test('graph insertion preserves text and creates a separate top-level paragraph', () => {
  const snapshot = '中文 🧮 BeforeAfter 🚀';
  const at = snapshot.indexOf('After');
  const target = { snapshot, from: at, to: at };
  const replacement = planGraphInsert(snapshot, target, spec, '', true);
  assert.equal(replace(snapshot, target, replacement), '中文 🧮 Before\n\n' + serializePlot(spec) + '\n\nAfter 🚀');
  assert.equal(planGraphInsert('', { snapshot: '', from: 0, to: 0 }, spec, '', false), serializePlot(spec) + '\n\n');
  assert.equal(planGraphInsert('Before\n\n', { snapshot: 'Before\n\n', from: 8, to: 8 }, spec, '', true), serializePlot(spec) + '\n\n');
  const eofGraph = serializePlot(spec);
  const append = planGraphInsert(eofGraph, { snapshot: eofGraph, from: eofGraph.length, to: eofGraph.length }, spec, '', false);
  assert.equal(findPlotBlocks(eofGraph + append).length, 2);
});

test('graph insertion commits a current equation and graph together without losing either', () => {
  const current = 'BeforeAfter';
  const target = { snapshot: current, from: 6, to: 6 };
  const result = replace(current, target, planGraphInsert(current, target, spec, String.raw`\frac{1}{x}`, false));
  assert.equal(result, 'Before\n\n$\\frac{1}{x}$\n\n' + serializePlot(spec) + '\n\nAfter');
  assert.equal(findMathRanges(result)[0].latex, String.raw`\frac{1}{x}`);
  assert.equal(findPlotBlocks(result).length, 1);
});

test('adding a graph to an unchanged equation preserves the original Markdown bytes', () => {
  const current = 'Before\n\n$$  x^2\n $$\n\nAfter';
  const original = findMathRanges(current)[0];
  const target = { snapshot: current, from: original.from, to: original.to };
  const replacement = planGraphInsert(current, target, spec, original.latex, original.display, original);
  const result = replace(current, target, replacement);
  assert.equal(result, 'Before\n\n' + current.slice(original.from, original.to) + '\n\n' + serializePlot(spec) + '\n\nAfter');
  const edited = replace(current, target, planGraphInsert(current, target, spec, 'x^3', true, original));
  assert.equal(findMathRanges(edited)[0].latex.trim(), 'x^3');
  assert.equal(findPlotBlocks(edited).length, 1);
});

test('insertion refuses stale notes, invalid ranges and protected Markdown locations', () => {
  const snapshot = 'BeforeAfter';
  const target = { snapshot, from: 6, to: 6 };
  assert.throws(() => planGraphInsert(snapshot + '!', target, spec, '', false), DocumentChangedError);
  for (const [from, to] of [[-1, 0], [2, 1], [0, 99], [0.5, 2], [0, NaN]]) {
    assert.throws(() => planGraphInsert(snapshot, { snapshot, from, to }, spec, '', false));
  }
  for (const current of [
    '- here', '> here', '  here', '| A | B |\n| --- | --- |\n| here | value |',
    '---\nkey: here\n---', '```text\nhere\n```', '<!-- here -->', '[link](../here.md)', '<div>\nhere\n</div>',
  ]) {
    const at = current.indexOf('here');
    assert.throws(() => planGraphInsert(current, { snapshot: current, from: at, to: at }, spec, '', false), current);
  }
});

test('updating a graph modifies only its exact target and no-op preserves fence formatting', () => {
  const first = '~~~~vme-plot\n' + source() + '\n~~~~~';
  const snapshot = 'Header\n\n' + first + '\n\n' + serializePlot(spec) + '\n\nFooter';
  const blocks = findPlotBlocks(snapshot);
  const target = { snapshot, from: blocks[0].from, to: blocks[0].to };
  assert.equal(planGraphUpdate(snapshot, target, spec), first);
  const updated = { ...spec, expression: 'sin(x)' };
  const result = replace(snapshot, target, planGraphUpdate(snapshot, target, updated));
  assert.equal(result, 'Header\n\n' + serializePlot(updated) + '\n\n' + serializePlot(spec) + '\n\nFooter');
  assert.deepEqual(findPlotBlocks(result).map(block => block.spec.expression), ['sin(x)', 'x^2']);
  assert.throws(() => planGraphUpdate(snapshot + '!', target, updated), DocumentChangedError);
  assert.throws(() => planGraphUpdate(snapshot, { snapshot, from: target.from + 1, to: target.to }, updated), /original graph/);
});
