import assert from 'node:assert/strict';
import test from 'node:test';
import { convertLatexToMarkup, validateLatex } from 'mathlive';
import {
  buildChemicalLatex, buildUnitLatex, CHEMISTRY_TEMPLATES, extractSingleScience,
  PERIODIC_ELEMENTS, PHYSICS_TEMPLATES, UNIT_PRESETS,
} from '../src/science-data';

test('offline periodic table contains each atomic number and symbol once', () => {
  assert.equal(PERIODIC_ELEMENTS.length, 118);
  assert.deepEqual(PERIODIC_ELEMENTS.map((element) => element.number), Array.from({ length: 118 }, (_, index) => index + 1));
  assert.equal(new Set(PERIODIC_ELEMENTS.map((element) => element.symbol)).size, 118);
  for (const element of PERIODIC_ELEMENTS) {
    assert.match(element.symbol, /^[A-Z][a-z]?$/);
    assert.match(element.name, /^[a-z]+$/);
    assert.ok(element.group >= 1 && element.group <= 18, element.symbol);
    assert.ok(element.period >= 1 && element.period <= 7, element.symbol);
  }
});

test('periodic identity and coordinates cover sparse rows and f-block boundaries', () => {
  for (const [symbol, number, name, group, period] of [
    ['H', 1, 'hydrogen', 1, 1], ['He', 2, 'helium', 18, 1],
    ['B', 5, 'boron', 13, 2], ['Al', 13, 'aluminium', 13, 3],
    ['Sc', 21, 'scandium', 3, 4], ['Zn', 30, 'zinc', 12, 4],
    ['La', 57, 'lanthanum', 3, 6], ['Lu', 71, 'lutetium', 3, 6],
    ['Hf', 72, 'hafnium', 4, 6], ['Ac', 89, 'actinium', 3, 7],
    ['Lr', 103, 'lawrencium', 3, 7], ['Rf', 104, 'rutherfordium', 4, 7],
    ['Nh', 113, 'nihonium', 13, 7], ['Ts', 117, 'tennessine', 17, 7],
    ['Og', 118, 'oganesson', 18, 7],
  ] as const) {
    assert.deepEqual(PERIODIC_ELEMENTS[number - 1], { number, symbol, name, group, period });
  }
});

test('chemical helpers preserve formulas, charges, isotope numbers and reaction conditions', () => {
  for (const input of [
    'H2O', 'SO4^2-', '^{14}_{6}C', '2H2 + O2 -> 2H2O',
    'N2 + 3H2 <=> 2NH3', 'CH3-CH2-OH', String.raw`CaCO3 ->[\Delta] CaO + CO2 ^`,
  ]) {
    const latex = buildChemicalLatex(`  ${input}  `);
    assert.equal(latex, `\\ce{${input}}`);
    assert.deepEqual(extractSingleScience(latex), { kind: 'chemistry', input });
    assert.doesNotMatch(convertLatexToMarkup(latex), /ML__error/);
  }
  // Display support is deliberately independent of chemical correctness.
  assert.equal(buildChemicalLatex('H2 + O2 -> H2O'), String.raw`\ce{H2 + O2 -> H2O}`);
});

test('single, double, triple and supported explicit bonds render without dropping content', () => {
  for (const input of ['H-H', 'O=O', 'N#N', String.raw`C\bond{1}C\bond{2}C\bond{3}N`, String.raw`O\bond{~-}H`]) {
    const latex = buildChemicalLatex(input);
    const markup = convertLatexToMarkup(latex);
    assert.doesNotMatch(markup, /ML__error/);
    assert.match(markup, /ML__cmr/);
  }
  assert.match(convertLatexToMarkup(buildChemicalLatex('N#N')), /≡/);
});

test('quantities retain scientific notation, powers and upright unit rendering', () => {
  for (const input of ['9.81 m/s2', '1.2e3 kg*m/s2', '123 J s', '123 kJ//mol', String.raw`1 \Omega`]) {
    const latex = buildUnitLatex(input);
    assert.equal(latex, `\\pu{${input}}`);
    assert.deepEqual(extractSingleScience(latex), { kind: 'units', input });
    const markup = convertLatexToMarkup(latex);
    assert.doesNotMatch(markup, /ML__error/);
    assert.match(markup, /ML__cmr/);
  }
});

test('science helper rejects invalid boundaries, unknown commands and malformed explicit bonds', () => {
  for (const builder of [buildChemicalLatex, buildUnitLatex]) {
    for (const input of ['', '   ', '$H2O$', 'H2O}x{', '{H2O', 'H2O\\', 'H2O% comment', String.raw`\unknown{H2O}`, 'H2O\u0000']) {
      assert.throws(() => builder(input), Error, JSON.stringify(input));
    }
    assert.throws(() => builder('H'.repeat(4097)), /过长/);
  }
  for (const input of [String.raw`C\bond{x}C`, String.raw`C\bond{}C`, String.raw`C\bond{~~--}C`, String.raw`C\bond C`]) {
    assert.throws(() => buildChemicalLatex(input), /化学键格式无效/);
  }
  assert.throws(() => buildChemicalLatex('SO4^'), /上下标/);
  assert.throws(() => buildChemicalLatex('C_'), /上下标/);
  assert.throws(() => buildUnitLatex('m^'), /上下标/);
  // MathLive's outer validator reports no error when mhchem merges this into
  // an unknown nested command, but its actual render contains an error box.
  assert.throws(() => buildUnitLatex(String.raw`1 \mu m`), /无法排版/);
  assert.equal(buildChemicalLatex('CO2 ^'), String.raw`\ce{CO2 ^}`);
});

test('re-edit extraction accepts one complete balanced science atom only', () => {
  assert.deepEqual(extractSingleScience(String.raw` \ce {^{14}_{6}C} `), { kind: 'chemistry', input: '^{14}_{6}C' });
  assert.deepEqual(extractSingleScience(String.raw`\ce{A\{B\}}`), { kind: 'chemistry', input: String.raw`A\{B\}` });
  assert.deepEqual(extractSingleScience(String.raw`\pu{1 m}`), { kind: 'units', input: '1 m' });
  for (const latex of [String.raw`x+\ce{H2O}`, String.raw`\ce{H2O}+x`, String.raw`\ce{H2O}\pu{1 m}`, String.raw`\ce{^{14}C`, String.raw`\ce{H2O}}`, String.raw`\cement{H2O}`, String.raw`\frac{1}{2}`]) {
    assert.equal(extractSingleScience(latex), null, latex);
  }
});

test('every shipped chemistry, physics and unit preset parses and renders offline', () => {
  const latexSamples = [
    ...CHEMISTRY_TEMPLATES.map(({ input }) => buildChemicalLatex(input)),
    ...PHYSICS_TEMPLATES.map(({ latex }) => latex),
    ...UNIT_PRESETS.map(({ input }) => buildUnitLatex(input)),
  ];
  for (const latex of latexSamples) {
    assert.deepEqual(validateLatex(latex), [], latex);
    const markup = convertLatexToMarkup(latex);
    assert.ok(markup.length > 100, latex);
    assert.doesNotMatch(markup, /ML__error/, latex);
  }
  for (const presets of [CHEMISTRY_TEMPLATES, PHYSICS_TEMPLATES, UNIT_PRESETS]) {
    assert.equal(new Set(presets.map(({ id }) => id)).size, presets.length);
  }
});
