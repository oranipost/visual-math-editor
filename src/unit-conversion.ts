import convert, { type Length, type Time, type Unit } from 'convert';

/** UI identities are explicit: US and Imperial volumes never share an id. */
export interface ConversionUnit {
  id: string;
  label: string;
  labelEn: string;
  symbol: string;
  /** A unit string accepted by the bundled mhchem \pu composer. */
  input: string;
}
export interface UnitCategory {
  id: string;
  label: string;
  labelEn: string;
  units: ConversionUnit[];
}
interface UnitDefinition extends ConversionUnit {
  libraryUnit?: Unit;
  speed?: { length: Length; time: Time };
}
interface CategoryDefinition extends Omit<UnitCategory, 'units'> { units: UnitDefinition[] }

function unit(id: string, label: string, labelEn: string, symbol: string, libraryUnit: Unit, input = symbol): UnitDefinition {
  return { id, label, labelEn, symbol, libraryUnit, input };
}
function speed(id: string, label: string, labelEn: string, symbol: string, length: Length, time: Time): UnitDefinition {
  return { id, label, labelEn, symbol, input: symbol, speed: { length, time } };
}

// Conversion factors and temperature offsets come from pinned Convert 8.0.2.
// Speed combines that library's length and time conversions locally.
const definitions: CategoryDefinition[] = [
  { id: 'length', label: '长度', labelEn: 'Length', units: [
    unit('nm', '纳米', 'Nanometre', 'nm', 'nm'),
    unit('um', '微米', 'Micrometre', 'µm', 'µm'),
    unit('mm', '毫米', 'Millimetre', 'mm', 'mm'),
    unit('cm', '厘米', 'Centimetre', 'cm', 'cm'),
    unit('m', '米', 'Metre', 'm', 'm'),
    unit('km', '千米', 'Kilometre', 'km', 'km'),
    unit('in', '英寸', 'Inch', 'in', 'inch'),
    unit('ft', '英尺', 'Foot', 'ft', 'foot'),
    unit('yd', '码', 'Yard', 'yd', 'yard'),
    unit('mi', '英里', 'Mile', 'mi', 'mile'),
    unit('nmi', '海里', 'Nautical mile', 'nmi', 'nautical mile'),
  ] },
  { id: 'mass', label: '质量', labelEn: 'Mass', units: [
    unit('mg', '毫克', 'Milligram', 'mg', 'mg'),
    unit('g', '克', 'Gram', 'g', 'g'),
    unit('kg', '千克', 'Kilogram', 'kg', 'kg'),
    unit('t', '公吨', 'Metric tonne', 't', 'tonne'),
    unit('oz', '盎司（常衡）', 'Ounce (avoirdupois)', 'oz', 'ounce'),
    unit('lb', '磅（常衡）', 'Pound (avoirdupois)', 'lb', 'pound'),
  ] },
  { id: 'time', label: '时间', labelEn: 'Time', units: [
    unit('ms', '毫秒', 'Millisecond', 'ms', 'ms'),
    unit('s', '秒', 'Second', 's', 'second'),
    unit('min', '分钟', 'Minute', 'min', 'minute'),
    unit('h', '小时', 'Hour', 'h', 'hour'),
    unit('d', '天', 'Day', 'd', 'day'),
  ] },
  { id: 'temperature', label: '温度', labelEn: 'Temperature', units: [
    unit('celsius', '摄氏度', 'Degree Celsius', '°C', 'celsius'),
    unit('fahrenheit', '华氏度', 'Degree Fahrenheit', '°F', 'fahrenheit'),
    unit('kelvin', '开尔文', 'Kelvin', 'K', 'kelvin'),
  ] },
  { id: 'speed', label: '速度', labelEn: 'Speed', units: [
    speed('m/s', '米/秒', 'Metres per second', 'm/s', 'm', 's'),
    speed('km/h', '千米/小时', 'Kilometres per hour', 'km/h', 'km', 'h'),
    speed('mph', '英里/小时', 'Miles per hour', 'mph', 'mile', 'h'),
    speed('ft/s', '英尺/秒', 'Feet per second', 'ft/s', 'foot', 's'),
    speed('kn', '节（海里/小时）', 'Knot (nautical mile per hour)', 'kn', 'nautical mile', 'h'),
  ] },
  { id: 'area', label: '面积', labelEn: 'Area', units: [
    unit('mm2', '平方毫米', 'Square millimetre', 'mm²', 'mm2', 'mm2'),
    unit('cm2', '平方厘米', 'Square centimetre', 'cm²', 'cm2', 'cm2'),
    unit('m2', '平方米', 'Square metre', 'm²', 'm2', 'm2'),
    unit('km2', '平方千米', 'Square kilometre', 'km²', 'km2', 'km2'),
    unit('ha', '公顷', 'Hectare', 'ha', 'hectare'),
    unit('acre', '英亩', 'Acre', 'ac', 'acre'),
    unit('ft2', '平方英尺', 'Square foot', 'ft²', 'ft2', 'ft2'),
  ] },
  { id: 'volume', label: '体积', labelEn: 'Volume', units: [
    unit('mL', '毫升', 'Millilitre', 'mL', 'mL'),
    unit('L', '升', 'Litre', 'L', 'L'),
    unit('cm3', '立方厘米', 'Cubic centimetre', 'cm³', 'cm3', 'cm3'),
    unit('m3', '立方米', 'Cubic metre', 'm³', 'm3', 'm3'),
    unit('ft3', '立方英尺', 'Cubic foot', 'ft³', 'ft3', 'ft3'),
    unit('us-gal', '美制液体加仑', 'US liquid gallon', 'US gal', 'US liquid gallon', 'gal_{US}'),
    unit('imp-gal', '英制加仑', 'Imperial gallon', 'Imp gal', 'imperial gallon', 'gal_{Imp}'),
    unit('us-fl-oz', '美制液体盎司', 'US fluid ounce', 'US fl oz', 'US fluid ounce', 'fl~oz_{US}'),
  ] },
  { id: 'pressure', label: '压力', labelEn: 'Pressure', units: [
    unit('Pa', '帕斯卡', 'Pascal', 'Pa', 'Pa'),
    unit('kPa', '千帕', 'Kilopascal', 'kPa', 'kPa'),
    unit('MPa', '兆帕', 'Megapascal', 'MPa', 'MPa'),
    unit('bar', '巴', 'Bar', 'bar', 'bar'),
    unit('atm', '标准大气压', 'Standard atmosphere', 'atm', 'atm'),
    unit('psi', '磅力/平方英寸', 'Pound-force per square inch', 'psi', 'psi'),
  ] },
  { id: 'energy', label: '能量', labelEn: 'Energy', units: [
    unit('J', '焦耳', 'Joule', 'J', 'J'),
    unit('kJ', '千焦', 'Kilojoule', 'kJ', 'kJ'),
    unit('MJ', '兆焦', 'Megajoule', 'MJ', 'MJ'),
    unit('Wh', '瓦时', 'Watt-hour', 'Wh', 'Wh', 'W*h'),
    unit('kWh', '千瓦时', 'Kilowatt-hour', 'kWh', 'kWh', 'kW*h'),
  ] },
  { id: 'power', label: '功率', labelEn: 'Power', units: [
    unit('W', '瓦特', 'Watt', 'W', 'W'),
    unit('kW', '千瓦', 'Kilowatt', 'kW', 'kW'),
    unit('MW', '兆瓦', 'Megawatt', 'MW', 'MW'),
    unit('hp', '机械马力', 'Mechanical horsepower', 'hp', 'mechanical horsepower'),
  ] },
  { id: 'angle', label: '角度', labelEn: 'Angle', units: [
    unit('deg', '度', 'Degree', '°', 'degree'),
    unit('rad', '弧度', 'Radian', 'rad', 'radian'),
    unit('turn', '圈', 'Turn', 'turn', 'turn'),
  ] },
];

export const UNIT_CATEGORIES: UnitCategory[] = definitions.map(({ units, ...category }) => ({
  ...category,
  units: units.map(({ libraryUnit: _library, speed: _speed, ...option }) => option),
}));
const lookup = new Map<string, { category: string; unit: UnitDefinition }>();
for (const category of definitions) {
  for (const option of category.units) {
    if (lookup.has(option.id)) throw new Error(`Duplicate conversion unit: ${option.id}`);
    lookup.set(option.id, { category: category.id, unit: option });
  }
}

export type ConversionErrorCode = 'invalid-value' | 'unknown-unit' | 'incompatible-units' | 'out-of-range';
export class ConversionError extends Error {
  constructor(readonly code: ConversionErrorCode, message: string) {
    super(message);
    this.name = 'ConversionError';
  }
}
function find(id: string): { category: string; unit: UnitDefinition } {
  const entry = lookup.get(id);
  if (!entry) throw new ConversionError('unknown-unit', 'Choose a supported unit.');
  return entry;
}

/** Converts a numeric quantity. Temperatures are absolute readings, not intervals. */
export function convertQuantity(value: number, from: string, to: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ConversionError('invalid-value', 'Enter a finite number.');
  }
  const origin = find(from);
  const target = find(to);
  // Block before calling Convert: its convenience alias can treat length m as
  // time minutes. The UI must never silently convert metres to a time unit.
  if (origin.category !== target.category) {
    throw new ConversionError('incompatible-units', 'Choose two units of the same quantity.');
  }
  let result: number;
  if (from === to) result = value;
  else if (origin.unit.speed && target.unit.speed) {
    const a = origin.unit.speed;
    const b = target.unit.speed;
    // Form the ratio first to avoid unnecessary overflow in large quantities.
    const ratio = convert(1, a.length).to(b.length) / convert(1, a.time).to(b.time);
    result = value * ratio;
  } else {
    // Definition types ensure both are known library units in the same category.
    result = convert(value, origin.unit.libraryUnit!).to(target.unit.libraryUnit!);
  }
  // Offset subtraction can leave a few ulps at zero (32 °F -> ~5e-14 °C).
  // Clean only temperature cancellation noise, preserving tiny linear results
  // and unchanged input values. This is not a general rounding of calculations.
  if (origin.category === 'temperature' && from !== to && Math.abs(result) <
    Number.EPSILON * Math.max(Math.abs(value), Math.abs(result), 273.15) * 4) result = 0;
  if (!Number.isFinite(result)) {
    throw new ConversionError('out-of-range', 'The conversion exceeds the supported numeric range.');
  }
  return Object.is(result, -0) ? 0 : result;
}

/** Deterministic display, capped at 12 significant digits; raw results stay unrounded. */
export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) throw new ConversionError('invalid-value', 'Enter a finite number.');
  return Number(value.toPrecision(12)).toString();
}

export function formatConversion(value: number, from: string, to: string): string {
  const result = convertQuantity(value, from, to);
  return `${formatQuantity(value)} ${find(from).unit.symbol} = ${formatQuantity(result)} ${find(to).unit.symbol}`;
}
