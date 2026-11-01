import assert from 'node:assert/strict';
import test from 'node:test';
import { convertLatexToMarkup, validateLatex } from 'mathlive';
import { SET_SEQUENCE_GROUPS, SET_SEQUENCE_HEADING, SET_SEQUENCE_HINT, SET_SEQUENCE_TOOLS } from '../src/set-sequence-tools';
import { translateUiText } from '../src/i18n';
import { validateLatexSource } from '../src/source-validation';
import { hasIncompleteSlots } from '../src/validation';

const structureIds = ['set', 'set-builder', 'term', 'sequence', 'finite', 'arithmetic', 'geometric'];
const tool = (id: string) => {
  const result = SET_SEQUENCE_TOOLS.find(item => item.id === id);
  assert.ok(result, id); return result;
};
const expand = (source: string) => source.replace(/#\?/g, '\\placeholder{}').replace(/#0/g, 'x+1');

test('set and sequence tools use fixed supported notation and explicitly editable structure slots', () => {
  assert.equal(SET_SEQUENCE_TOOLS.length, 19);
  assert.equal(new Set(SET_SEQUENCE_TOOLS.map(item => item.id)).size, 19);
  assert.deepEqual(SET_SEQUENCE_GROUPS.map(group => group.id), ['sets', 'relations', 'sequences']);
  for (const item of SET_SEQUENCE_TOOLS) {
    for (const selected of [false, true]) {
      const latex = expand(item.template(selected));
      assert.equal(validateLatexSource(latex), null, item.id);
      assert.deepEqual(validateLatex(latex), [], item.id);
      assert.doesNotMatch(convertLatexToMarkup(latex), /ML__error/, item.id);
    }
    assert.equal(hasIncompleteSlots(expand(item.template(false))), structureIds.includes(item.id), item.id);
    assert.equal(validateLatexSource(item.example), null, item.id);
    assert.deepEqual(validateLatex(item.example), [], item.id);
    assert.doesNotMatch(convertLatexToMarkup(item.example), /ML__error/, item.id);
    assert.equal(hasIncompleteSlots(item.example), false, item.id);
  }
});

test('only literal set braces wrap selected input; no condition or sequence meaning is inferred', () => {
  assert.equal(tool('set').template(false), '\\left\\{#?\\right\\}');
  assert.equal(tool('set').template(true), '\\left\\{#0\\right\\}');
  for (const item of SET_SEQUENCE_TOOLS.filter(item => item.id !== 'set')) {
    assert.doesNotMatch(item.template(true), /#0/, item.id);
    assert.equal(item.template(true), item.template(false), item.id);
  }
  assert.equal(tool('set-builder').template(false), '\\left\\{#?\\mid #?\\right\\}');
  assert.equal(tool('finite').template(false), 'a_1,a_2,\\ldots,a_{#?}');
  // These are formatting tools. They do not assume whether N includes zero,
  // sort or deduplicate lists, or try to determine a sequence's type.
  assert.equal(tool('natural').template(false), '\\mathbb{N}');
  assert.equal(tool('arithmetic').template(false), 'a_n=#?+(n-1)\\cdot #?');
  assert.equal(tool('geometric').template(false), 'a_n=#?\\cdot #?^{n-1}');
});

test('set membership, subset, union and intersection retain their distinct mathematical glyphs', () => {
  for (const [id, command, glyph] of [
    ['in', '\\in ', '∈'], ['not-in', '\\notin ', '∉'],
    ['subset', '\\subset ', '⊂'], ['subset-equal', '\\subseteq ', '⊆'],
    ['union', '\\cup ', '∪'], ['intersection', '\\cap ', '∩'], ['empty', '\\varnothing ', '∅'],
  ]) {
    assert.equal(tool(id).template(false), command, id);
    assert.ok(convertLatexToMarkup(command).includes(glyph), id);
  }
  for (const [id, letter] of [['natural', 'N'], ['integers', 'Z'], ['rational', 'Q'], ['real', 'R'], ['complex', 'C']]) {
    assert.equal(tool(id).template(false), '\\mathbb{' + letter + '}', id);
  }
});

test('all set and sequence labels translate in three languages while mathematical source stays unchanged', () => {
  const labels = [SET_SEQUENCE_HEADING, SET_SEQUENCE_HINT,
    ...SET_SEQUENCE_GROUPS.flatMap(group => [group.label, ...(group.hint ? [group.hint] : [])]),
    ...SET_SEQUENCE_TOOLS.flatMap(item => [item.label, item.insertLabel])];
  for (const label of labels) {
    assert.equal(translateUiText(label, 'zh'), label);
    for (const language of ['en', 'es'] as const) {
      assert.notEqual(translateUiText(label, language), label, language + ': ' + label);
      assert.doesNotMatch(translateUiText(label, language), /[\p{Script=Han}]/u, language + ': ' + label);
    }
  }
  for (const item of SET_SEQUENCE_TOOLS) for (const language of ['zh', 'en', 'es'] as const) {
    assert.equal(translateUiText(item.example, language), item.example);
    assert.equal(translateUiText(item.template(false), language), item.template(false));
  }
});
