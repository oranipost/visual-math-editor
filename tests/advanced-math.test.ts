import assert from 'node:assert/strict';
import test from 'node:test';
import { convertLatexToMarkup, validateLatex } from 'mathlive';
import { ADVANCED_MATH_HEADING, ADVANCED_MATH_HINT, ADVANCED_MATH_TEMPLATES } from '../src/advanced-math';
import { hasIncompleteSlots } from '../src/validation';
import { validateLatexSource } from '../src/source-validation';
import { translateUiText } from '../src/i18n';

// A MathLive insertion template is not saved source. Inspect its expanded slots
// and a complete example separately rather than declaring #? itself valid TeX.
const withSlots = (source: string) => source.replace(/#\?/g, String.raw`\placeholder{}`);

test('advanced templates cover the requested notation without a solver path', () => {
  assert.deepEqual(ADVANCED_MATH_TEMPLATES.map(item => item.id), [
    'limit', 'derivative', 'second-derivative', 'partial-derivative',
    'double-integral', 'infinite-series', 'product', 'vector', 'gradient',
  ]);
  assert.equal(new Set(ADVANCED_MATH_TEMPLATES.map(item => item.id)).size, ADVANCED_MATH_TEMPLATES.length);
  assert.match(ADVANCED_MATH_HINT, /不计算或求解/);
  for (const item of ADVANCED_MATH_TEMPLATES) {
    assert.match(item.latex, /#\?/, item.id);
    assert.doesNotMatch(item.latex, /#[0-9@]/, item.id);
  }
});

test('every insertable structure has editable slots and recognized MathLive notation', () => {
  for (const item of ADVANCED_MATH_TEMPLATES) {
    const source = withSlots(item.latex);
    assert.equal(validateLatexSource(source), null, item.id);
    assert.deepEqual(validateLatex(source), [], item.id);
    assert.doesNotMatch(convertLatexToMarkup(source), /ML__error/, item.id);
    assert.equal(hasIncompleteSlots(source), true, item.id + ' must remain unfinished until filled');
  }
});

test('filled examples retain intended operations and render with the bundled engine', () => {
  const commands: Record<string, RegExp> = {
    limit: /\\lim_\{x\\to0\}/,
    derivative: /\\frac\{\\mathrm\{d\}\}\{\\mathrm\{d\}x\}/,
    'second-derivative': /\\frac\{\\mathrm\{d\}\^2\}\{\\mathrm\{d\}x\^2\}/,
    'partial-derivative': /\\frac\{\\partial\}\{\\partial x\}/,
    'double-integral': /\\iint_\{D\}/,
    'infinite-series': /\\sum_\{n=1\}\^\{\\infty\}/,
    product: /\\prod_\{k=1\}\^\{n\}/,
    vector: /\\vec\{v\}/,
    gradient: /\\nabla f/,
  };
  for (const item of ADVANCED_MATH_TEMPLATES) {
    assert.match(item.example, commands[item.id], item.id);
    assert.equal(validateLatexSource(item.example), null, item.id);
    assert.deepEqual(validateLatex(item.example), [], item.id);
    assert.equal(hasIncompleteSlots(item.example), false, item.id);
    assert.doesNotMatch(convertLatexToMarkup(item.example), /ML__error/, item.id);
  }
});

test('all advanced labels and actions translate to English and Spanish without changing formulas', () => {
  const labels = [ADVANCED_MATH_HEADING, ADVANCED_MATH_HINT, ...ADVANCED_MATH_TEMPLATES.flatMap(item => [item.label, item.insertLabel])];
  for (const label of labels) {
    for (const language of ['en', 'es'] as const) {
      const translated = translateUiText(label, language);
      assert.notEqual(translated, label, `${language}: ${label}`);
      assert.doesNotMatch(translated, /[\p{Script=Han}]/u, `${language}: ${label}`);
    }
    assert.equal(translateUiText(label, 'zh'), label);
  }
  for (const item of ADVANCED_MATH_TEMPLATES) {
    for (const language of ['zh', 'en', 'es'] as const) {
      assert.equal(translateUiText(item.latex, language), item.latex, item.id);
      assert.equal(translateUiText(item.example, language), item.example, item.id);
    }
  }
});
