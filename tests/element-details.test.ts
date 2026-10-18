import assert from 'node:assert/strict';
import test from 'node:test';
import { ELEMENT_DETAILS, ELEMENT_DETAIL_SOURCES, getElementDetails } from '../src/element-details';
import { PERIODIC_ELEMENTS } from '../src/science-data';

test('every offline periodic element has complete sourced mass and electron details', () => {
  assert.equal(Object.keys(ELEMENT_DETAILS).length, 118);
  assert.deepEqual(Object.keys(ELEMENT_DETAILS), PERIODIC_ELEMENTS.map(({ symbol }) => symbol));
  for (const { number, symbol } of PERIODIC_ELEMENTS) {
    const details = getElementDetails(symbol);
    assert.ok(details, symbol);
    assert.ok(details.atomicMass.length > 0, symbol);
    assert.ok(details.electronConfiguration.length > 0, symbol);
    assert.match(details.massSource, /^https:\/\/ciaaw\.org\//, symbol);
    assert.match(details.configurationSource, /^https:\/\/(?:pubchem\.ncbi\.nlm\.nih\.gov|physics\.nist\.gov)\//, symbol);
    assert.equal(details.electronShells.reduce((sum, count) => sum + count, 0), number, `${symbol}: neutral electron total`);
    for (const [index, population] of details.electronShells.entries()) {
      assert.ok(Number.isInteger(population) && population > 0, `${symbol}: shell ${index + 1}`);
      assert.ok(population <= 2 * (index + 1) ** 2, `${symbol}: shell capacity`);
    }
    assert.ok(Object.isFrozen(details));
    assert.ok(Object.isFrozen(details.electronShells));
  }
});

test('standard atomic-weight intervals and uncertainties retain CIAAW 2024 precision', () => {
  for (const [symbol, expected] of [
    ['H', '[1.00784, 1.00811]'],
    ['C', '[12.0096, 12.0116]'],
    ['O', '[15.99903, 15.99977]'],
    ['Fe', '55.845(2)'],
    ['Zr', '91.222(3)'],
    ['Gd', '157.249(2)'],
    ['Lu', '174.96669(5)'],
    ['U', '238.02891(3)'],
  ]) {
    const details = getElementDetails(symbol)!;
    assert.equal(details.atomicMass, expected, symbol);
    assert.equal(details.massKind, 'standard', symbol);
    assert.equal(details.massSource, ELEMENT_DETAIL_SOURCES.standard, symbol);
  }
});

test('radioactive mass numbers are bracketed integers and distinct from standard atomic weights', () => {
  const radioactive = Object.values(ELEMENT_DETAILS).filter(({ massKind }) => massKind === 'isotope');
  assert.equal(radioactive.length, 34);
  for (const details of radioactive) {
    assert.match(details.atomicMass, /^\[\d+\](?: \/ \[\d+\])*$/);
    assert.equal(details.massSource, ELEMENT_DETAIL_SOURCES.isotope);
  }
  assert.equal(getElementDetails('Tc')!.atomicMass, '[97] / [98]');
  assert.equal(getElementDetails('Lr')!.atomicMass, '[262] / [266]');
  assert.equal(getElementDetails('Og')!.atomicMass, '[294]');
  // Th/U have characteristic normal-terrestrial compositions despite radioactivity.
  assert.equal(getElementDetails('Th')!.massKind, 'standard');
  assert.equal(getElementDetails('U')!.massKind, 'standard');
});

test('shell populations expand noble-gas cores and preserve reference filling exceptions', () => {
  for (const [symbol, expected] of [
    ['H', [1]], ['C', [2, 4]], ['O', [2, 6]], ['Na', [2, 8, 1]],
    ['Cr', [2, 8, 13, 1]], ['Cu', [2, 8, 18, 1]],
    ['Pd', [2, 8, 18, 18]], ['Fe', [2, 8, 14, 2]],
    ['Au', [2, 8, 18, 32, 18, 1]],
    ['Og', [2, 8, 18, 32, 32, 18, 8]],
  ] as const) assert.deepEqual(getElementDetails(symbol)!.electronShells, expected, symbol);
});

test('lawrencium uses the current NIST 7p reference instead of older PubChem 6d', () => {
  const details = getElementDetails('Lr')!;
  assert.equal(details.electronConfiguration, '[Rn] 5f14 7s2 7p1');
  assert.deepEqual(details.electronShells, [2, 8, 18, 32, 32, 8, 3]);
  assert.equal(details.configurationSource, ELEMENT_DETAIL_SOURCES.lawrencium);
});

test('calculated and predicted configurations preserve their source qualification', () => {
  assert.equal(getElementDetails('Mt')!.configurationStatus, 'calculated');
  for (const symbol of ['Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og']) {
    assert.equal(getElementDetails(symbol)!.configurationStatus, 'predicted', symbol);
    assert.doesNotMatch(getElementDetails(symbol)!.electronConfiguration, /predicted|calculated/);
  }
  assert.equal(getElementDetails('C')!.configurationStatus, 'reference');
});

test('unknown symbols safely return unavailable details and do not expose object properties', () => {
  for (const symbol of ['', 'Xx', 'carbon', 'c', 'toString', 'constructor', '__proto__']) {
    assert.equal(getElementDetails(symbol), undefined, symbol);
  }
  assert.ok(Object.isFrozen(ELEMENT_DETAILS));
});
