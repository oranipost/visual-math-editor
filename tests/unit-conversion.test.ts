import assert from 'node:assert/strict';
import test from 'node:test';
import { convertLatexToMarkup } from 'mathlive';
import { buildUnitLatex } from '../src/science-data';
import {
  UNIT_CATEGORIES, ConversionError, convertQuantity, formatQuantity, formatConversion,
} from '../src/unit-conversion';

function near(actual: number, expected: number, relative = 1e-12): void {
  assert.ok(Math.abs(actual - expected) <= relative * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
}
function fails(code: ConversionError['code'], action: () => unknown): void {
  assert.throws(action, (error) => error instanceof ConversionError && error.code === code);
}

test('unit identities are unique with Chinese, English and insertable notation', () => {
  assert.equal(UNIT_CATEGORIES.length, 11);
  const ids = new Set<string>();
  for (const category of UNIT_CATEGORIES) {
    assert.ok(category.label && category.labelEn && category.units.length >= 2);
    for (const unit of category.units) {
      assert.ok(!ids.has(unit.id), unit.id);
      ids.add(unit.id);
      assert.ok(unit.label && unit.labelEn && unit.symbol && unit.input, unit.id);
      const latex = buildUnitLatex(`1 ${unit.input}`);
      const markup = convertLatexToMarkup(latex);
      assert.ok(markup.length > 50, unit.id);
      const visible = markup.replace(/<[^>]+>/g, '').replace(/[\s\u200b]/g, '');
      const special: Record<string, string> = {
        celsius: '∘C', fahrenheit: '∘F', 'us-gal': 'galUS',
        'imp-gal': 'galImp', 'us-fl-oz': 'flozUS', Wh: 'W⋅h', kWh: 'kW⋅h',
      };
      const expected = special[unit.id] ?? unit.symbol.replace(/²/g, '2').replace(/³/g, '3');
      assert.ok(visible.includes(expected), `${unit.id} dropped its unit: ${visible}`);
    }
  }
  assert.equal(ids.size, 63);
});

test('international length and avoirdupois mass reference values', () => {
  assert.equal(convertQuantity(1, 'in', 'cm'), 2.54);
  near(convertQuantity(1, 'ft', 'm'), 0.3048);
  near(convertQuantity(1, 'mi', 'km'), 1.609344);
  assert.equal(convertQuantity(1, 'nmi', 'm'), 1852);
  near(convertQuantity(1, 'lb', 'kg'), 0.45359237);
  near(convertQuantity(1, 'oz', 'g'), 28.349523125);
  assert.equal(convertQuantity(1, 't', 'kg'), 1000);
});

test('absolute temperatures include offsets and clean cancellation at zero', () => {
  assert.equal(convertQuantity(32, 'fahrenheit', 'celsius'), 0);
  near(convertQuantity(32, 'fahrenheit', 'kelvin'), 273.15);
  near(convertQuantity(0, 'celsius', 'fahrenheit'), 32);
  near(convertQuantity(100, 'celsius', 'fahrenheit'), 212);
  near(convertQuantity(-40, 'fahrenheit', 'celsius'), -40);
  assert.equal(convertQuantity(273.15, 'kelvin', 'celsius'), 0);
  near(convertQuantity(0, 'kelvin', 'fahrenheit'), -459.67);
  assert.equal(convertQuantity(1e-15, 'kelvin', 'kelvin'), 1e-15);
});

test('compound speed uses both length and time factors', () => {
  near(convertQuantity(1, 'm/s', 'km/h'), 3.6);
  near(convertQuantity(60, 'mph', 'km/h'), 96.56064);
  near(convertQuantity(1, 'kn', 'km/h'), 1.852);
  near(convertQuantity(1, 'ft/s', 'm/s'), 0.3048);
  near(convertQuantity(-10, 'm/s', 'mph'), -22.369362920544);
});

test('area scales by square and volume distinguishes US liquid and Imperial', () => {
  near(convertQuantity(1, 'm2', 'cm2'), 10000);
  near(convertQuantity(1, 'ha', 'm2'), 10000);
  near(convertQuantity(1, 'acre', 'm2'), 4046.8564224);
  near(convertQuantity(1, 'us-gal', 'L'), 3.785411784);
  near(convertQuantity(1, 'imp-gal', 'L'), 4.54609);
  near(convertQuantity(1, 'us-fl-oz', 'mL'), 29.5735295625);
  near(convertQuantity(1, 'L', 'cm3'), 1000);
});

test('time, pressure, energy, power and angles convert offline', () => {
  assert.equal(convertQuantity(2, 'd', 'h'), 48);
  assert.equal(convertQuantity(1, 'h', 'min'), 60);
  near(convertQuantity(1, 'atm', 'kPa'), 101.325);
  assert.equal(convertQuantity(1, 'bar', 'Pa'), 100000);
  near(convertQuantity(1, 'psi', 'kPa'), 6.894757, 1e-7);
  assert.equal(convertQuantity(1, 'kWh', 'J'), 3600000);
  assert.equal(convertQuantity(1000, 'W', 'kW'), 1);
  near(convertQuantity(1, 'hp', 'W'), 745.699872);
  near(convertQuantity(180, 'deg', 'rad'), Math.PI);
});

test('every unit pair within each category round-trips a representative quantity', () => {
  for (const category of UNIT_CATEGORIES) {
    for (const from of category.units) for (const to of category.units) {
      const value = category.id === 'temperature' ? 300 : 1.23456789;
      const converted = convertQuantity(value, from.id, to.id);
      assert.ok(Number.isFinite(converted), `${from.id} -> ${to.id}`);
      near(convertQuantity(converted, to.id, from.id), value, 1e-10);
    }
  }
});

test('invalid or cross-dimension requests fail before convenience aliases can act', () => {
  for (const value of [NaN, Infinity, -Infinity, '1', null, undefined]) {
    fails('invalid-value', () => convertQuantity(value as number, 'm', 'cm'));
  }
  fails('unknown-unit', () => convertQuantity(1, 'unknown', 'm'));
  fails('unknown-unit', () => convertQuantity(1, 'm', '__proto__'));
  fails('incompatible-units', () => convertQuantity(1, 'm', 'min'));
  fails('incompatible-units', () => convertQuantity(1, 'kg', 'L'));
  fails('out-of-range', () => convertQuantity(Number.MAX_VALUE, 'km', 'nm'));
  assert.equal(convertQuantity(1e-20, 'nm', 'm'), 1e-29);
  assert.ok(!Object.is(convertQuantity(-0, 'm', 'cm'), -0));
});

test('formatting is stable, rounds only display and retains meaningful small values', () => {
  assert.equal(formatConversion(1, 'in', 'cm'), '1 in = 2.54 cm');
  assert.equal(formatConversion(32, 'fahrenheit', 'celsius'), '32 °F = 0 °C');
  assert.equal(formatConversion(1, 'us-gal', 'L'), '1 US gal = 3.785411784 L');
  assert.equal(formatQuantity(1 / 3), '0.333333333333');
  assert.equal(formatQuantity(1e-20), '1e-20');
  assert.equal(formatQuantity(-0), '0');
  fails('invalid-value', () => formatQuantity(NaN));
});
