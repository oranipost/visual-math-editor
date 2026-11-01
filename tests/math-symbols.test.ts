import assert from 'node:assert/strict';
import test from 'node:test';
import { validateLatex, convertLatexToMarkup } from 'mathlive';
import { MATH_SYMBOL_TOOLS } from '../src/math-symbols';
import { hasIncompleteSlots } from '../src/validation';
import { translateUiText } from '../src/i18n';

test('fixed math palette uses eight distinct supported notation tools, with editable function slots', () => {
  assert.equal(MATH_SYMBOL_TOOLS.length, 8); assert.equal(new Set(MATH_SYMBOL_TOOLS.map(item => item.id)).size, 8);
  for (const tool of MATH_SYMBOL_TOOLS) {
    const plain = tool.template(false).replace(/#\?/g, String.raw`\placeholder{}`).replace(/#0/g, 'x');
    assert.deepEqual(validateLatex(plain), [], tool.id);
    assert.deepEqual(validateLatex(tool.example), [], tool.id);
    assert.ok(!convertLatexToMarkup(plain).includes('ML__error'), tool.id);
    assert.ok(!convertLatexToMarkup(tool.example).includes('ML__error'), tool.id);
    if (['sin', 'cos', 'tan'].includes(tool.id)) {
      assert.ok(hasIncompleteSlots(plain));
      assert.match(tool.template(true), /#0/); assert.doesNotMatch(tool.template(true), /#\?/);
    } else assert.ok(!hasIncompleteSlots(plain));
  }
});

test('similarity, congruence, angle, triangle, and right angle are not conflated', () => {
  const tool = (id: string) => MATH_SYMBOL_TOOLS.find(item => item.id === id)!;
  assert.equal(tool('similar').template(false).trim(), String.raw`\sim`);
  assert.equal(tool('congruent').template(false).trim(), String.raw`\cong`);
  assert.equal(tool('angle').template(false).trim(), String.raw`\angle`);
  assert.equal(tool('triangle').template(false).trim(), String.raw`\triangle`);
  assert.equal(tool('right-angle').template(false), String.raw`90^{\circ}`);
  assert.ok(MATH_SYMBOL_TOOLS.every(tool => !tool.template(false).includes('\\perp') && !tool.template(false).includes('\\rightangle')));
  for (const [id, glyph] of [['similar', '∼'], ['congruent', '≅'], ['angle', '∠'], ['triangle', '△']] as const) assert.ok(convertLatexToMarkup(tool(id).template(false)).includes(glyph));
});

test('new math palette labels have English and Spanish translations', () => {
  for (const tool of MATH_SYMBOL_TOOLS) for (const language of ['en', 'es'] as const) {
    const label = translateUiText(tool.label, language), insertLabel = translateUiText(tool.insertLabel, language);
    assert.ok(label !== tool.label && !/[\u4e00-\u9fff]/.test(label), `${tool.id} ${language} label`);
    assert.ok(insertLabel !== tool.insertLabel && !/[\u4e00-\u9fff]/.test(insertLabel), `${tool.id} ${language} aria label`);
  }
});
