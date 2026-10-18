import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { DEFAULT_COMPLEX_SPEC } from '../src/complex-plane';
import { DEFAULT_PLOT_SPEC, type PlotSpec } from '../src/plot-engine';
import { findPlotBlocks, parsePlotSpec, planGraphInsert, planGraphUpdate, serializePlot } from '../src/plot-markdown';
import { DocumentChangedError, type WriteTarget } from '../src/write-plan';

const functionSpec: PlotSpec = { ...DEFAULT_PLOT_SPEC, expression: '3', xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
const complexSpec = { ...DEFAULT_COMPLEX_SPEC, expression: '3+2i\n-i\n4', xMin: -4, xMax: 6, yMin: -3, yMax: 7 };
const replace = (current: string, target: WriteTarget, replacement: string): string => current.slice(0, target.from) + replacement + current.slice(target.to);
const hash = (text: string): string => createHash('sha256').update(text).digest('hex');
const sourceOf = (fence: string): string => fence.slice(fence.indexOf('\n') + 1, fence.lastIndexOf('\n'));

test('old version 1 function graphs reopen and save without changing any Markdown bytes or SHA', () => {
  const old = '~~~~vme-plot \r\n{ "yMax":5, "xMin":-5, "version":1, "expression":" y = 3 ", "yMin":-5, "xMax":5 }\r\n~~~~~~\r';
  const current = '中文 🧮 header\r\n\r\n' + old + '\n\r\nUser footer 🚀\r\n';
  const before = hash(current);
  const blocks = findPlotBlocks(current);
  assert.equal(blocks.length, 1);
  assert.deepEqual(blocks[0].spec, functionSpec);
  const target = { snapshot: current, from: blocks[0].from, to: blocks[0].to };
  const after = replace(current, target, planGraphUpdate(current, target, { ...blocks[0].spec }));
  assert.equal(after, current);
  assert.equal(hash(after), before);
  assert.equal(after.slice(target.from, target.to), old);
});

test('explicit function mode normalizes semantically while untouched source remains byte-identical', () => {
  const explicit = '```vme-plot\n' + JSON.stringify({ version: 1, mode: 'function', ...functionSpec }) + '\n```';
  const parsed = parsePlotSpec(sourceOf(explicit));
  assert.deepEqual(parsed, functionSpec);
  assert.ok(!Object.hasOwn(parsed, 'mode'));
  const current = 'Before\n\n' + explicit + '\n\nAfter';
  const block = findPlotBlocks(current)[0];
  const target = { snapshot: current, from: block.from, to: block.to };
  assert.equal(planGraphUpdate(current, target, functionSpec), explicit);
  assert.equal(planGraphUpdate(current, target, { ...functionSpec, mode: 'function' }), explicit);
  assert.deepEqual(parsePlotSpec(sourceOf(serializePlot({ ...functionSpec, mode: 'function' }))), functionSpec);
  assert.ok(!Object.hasOwn(JSON.parse(sourceOf(serializePlot({ ...functionSpec, mode: 'function' }))), 'mode'));
  assert.equal(serializePlot(functionSpec), '```vme-plot\n' + JSON.stringify({ version: 1, ...functionSpec }) + '\n```');
});

test('complex plane persists its mode, literal lines, labels implied by line order, and exact axis bounds', () => {
  const fence = serializePlot(complexSpec);
  const source = sourceOf(fence);
  assert.equal(JSON.parse(source).version, 1);
  assert.equal(JSON.parse(source).mode, 'complex');
  assert.equal(JSON.parse(source).expression, '3+2i\n-i\n4');
  assert.deepEqual(parsePlotSpec(source), complexSpec);
  assert.equal(findPlotBlocks('Start\n\n' + fence + '\n\nEnd')[0].spec.mode, 'complex');
  assert.ok(source.includes('3+2i\\n-i\\n4'), 'Literal lines are safely escaped inside a single JSON line.');
  assert.equal(fence.split('\n').length, 3);
});

test('untouched complex graphs preserve source whitespace, unusual fences, and a whole-note SHA', () => {
  const expression = ' 3 + 2i \n\n -i ';
  const source = JSON.stringify({ yMax: 7, mode: 'complex', version: 1, expression, xMax: 6, xMin: -4, yMin: -3 });
  const fence = '~~~~vme-plot\n' + source + '\n~~~~~';
  const current = 'Before\n\n' + fence + '\n\nAfter';
  const block = findPlotBlocks(current)[0];
  assert.equal(block.spec.expression, '3 + 2i\n-i');
  const target = { snapshot: current, from: block.from, to: block.to };
  const result = replace(current, target, planGraphUpdate(current, target, { ...block.spec }));
  assert.equal(result, current);
  assert.equal(hash(result), hash(current));
});

test('unsupported modes and invalid complex input reject the whole saved graph without partial insertion', () => {
  for (const mode of ['complex-plane', 'polar', '', null, true, 2]) {
    const data = { version: 1, ...functionSpec, mode };
    assert.throws(() => parsePlotSpec(JSON.stringify(data)), JSON.stringify(mode));
  }
  for (const extra of [
    { expression: '3+2i\nnot-a-number\n-i' }, { expression: 'x^2' }, { expression: '1e999i' },
    { expression: 'i\n'.repeat(21) }, { xMin: 2, xMax: 1 }, { yMax: Infinity },
  ]) {
    const spec = { ...complexSpec, ...extra };
    assert.throws(() => serializePlot(spec));
    assert.throws(() => parsePlotSpec(JSON.stringify({ version: 1, ...spec })));
    const current = 'BeforeAfter', target = { snapshot: current, from: 6, to: 6 };
    assert.throws(() => planGraphInsert(current, target, spec, '', false));
    assert.equal(current, 'BeforeAfter');
  }
  const invalid = '```vme-plot\n' + JSON.stringify({ version: 1, ...complexSpec, expression: '3+2i\nbad' }) + '\n```';
  assert.deepEqual(findPlotBlocks(invalid), []);
  assert.equal(findPlotBlocks(invalid + '\n\n' + serializePlot(complexSpec)).length, 1);
});

test('switching function and complex modes changes the exact target even when expressions and bounds match', () => {
  const realLiteralAsComplex = { ...functionSpec, mode: 'complex' as const };
  const first = serializePlot(functionSpec), second = serializePlot(functionSpec);
  const original = 'Header\n\n' + first + '\n\n' + second + '\n\nFooter';
  const targetBlock = findPlotBlocks(original)[1];
  const target = { snapshot: original, from: targetBlock.from, to: targetBlock.to };
  const changed = replace(original, target, planGraphUpdate(original, target, realLiteralAsComplex));
  assert.equal(changed, 'Header\n\n' + first + '\n\n' + serializePlot(realLiteralAsComplex) + '\n\nFooter');
  const changedBlocks = findPlotBlocks(changed);
  assert.deepEqual(changedBlocks.map(block => block.spec.mode ?? 'function'), ['function', 'complex']);
  const backTarget = { snapshot: changed, from: changedBlocks[1].from, to: changedBlocks[1].to };
  const back = replace(changed, backTarget, planGraphUpdate(changed, backTarget, functionSpec));
  assert.equal(back, original);
});

test('editing one duplicate complex graph preserves every other graph and unrelated note content', () => {
  const fence = serializePlot(complexSpec);
  const current = 'Header 🧪\n\n' + fence + '\n\nMiddle\n\n' + fence + '\n\nFooter';
  const blocks = findPlotBlocks(current), target = { snapshot: current, from: blocks[1].from, to: blocks[1].to };
  const updatedSpec = { ...complexSpec, expression: '3-2i\n2+i', xMin: -8, xMax: 8 };
  assert.equal(planGraphUpdate(current, target, complexSpec), fence);
  const changed = replace(current, target, planGraphUpdate(current, target, updatedSpec));
  assert.equal(changed, current.slice(0, target.from) + serializePlot(updatedSpec) + current.slice(target.to));
  assert.deepEqual(findPlotBlocks(changed).map(block => block.spec.expression), [complexSpec.expression, updatedSpec.expression]);
  assert.throws(() => planGraphUpdate(current + ' user typing', target, updatedSpec), DocumentChangedError);
  assert.throws(() => planGraphUpdate(current, { ...target, from: target.from + 1 }, updatedSpec), /original graph/);
  assert.throws(() => planGraphUpdate(current, { ...target, to: target.to - 1 }, updatedSpec), /original graph/);
});

test('save validation rejects an unsupported mode before semantic no-op can bypass it', () => {
  const current = serializePlot(functionSpec), target = { snapshot: current, from: 0, to: current.length };
  for (const mode of [null, 'polar', false]) {
    assert.throws(() => planGraphUpdate(current, target, { ...functionSpec, mode } as unknown as PlotSpec));
  }
});
