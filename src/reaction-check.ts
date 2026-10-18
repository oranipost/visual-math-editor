import { PERIODIC_ELEMENTS } from './science-data';

export type ReactionStatus = 'balanced' | 'unbalanced' | 'impossible' | 'unsupported' | 'indeterminate' | 'not-reaction';

export interface ReactionCheck {
  status: ReactionStatus;
  /** Conservation only; this does not establish that a reaction can occur. */
  canBalance?: boolean;
  /** Plain mhchem input. Applying this suggestion is always an explicit user action. */
  suggestion?: string;
  differences?: Array<{ element: string; left: string; right: string }>;
  message: string;
  reason?: 'syntax' | 'limit' | 'multiple-solutions';
}

// The checker intentionally accepts a smaller grammar than the display engine.
// Never remove unfamiliar text and then declare the remaining equation balanced.
// Syntax reference: https://mhchem.github.io/MathJax-mhchem/
export const REACTION_LIMITS = Object.freeze({
  inputLength: 4096,
  species: 24,
  groupDepth: 8,
  integer: 1_000_000,
  distinctElements: 32,
  rationalBits: 1024,
  operations: 120_000,
});

const ELEMENTS = new Set(PERIODIC_ELEMENTS.map(({ symbol }) => symbol));
const MAX_INTEGER = BigInt(REACTION_LIMITS.integer);
const MAX_ATOMS = 1_000_000_000_000n;
const MAX_RATIONAL = (1n << BigInt(REACTION_LIMITS.rationalBits)) - 1n;
const ARROWS = /<<=>|<=>>|<-->|<=>|<->|->|<-|→|←|⇌/g;

class CheckFailure extends Error {
  constructor(readonly reason: 'syntax' | 'limit', message: string) { super(message); }
}

interface Species { formula: string; coefficient: bigint; atoms: Map<string, bigint>; charge: bigint }
interface SpeciesTerm { raw: string; start: number }
interface Fraction { n: bigint; d: bigint }

function fail(message = 'This notation is outside the supported checker syntax.'): never {
  throw new CheckFailure('syntax', message);
}

function limit(message = 'The equation exceeds the local checker limits.'): never {
  throw new CheckFailure('limit', message);
}

function integer(text: string): bigint {
  if (!/^[1-9][0-9]{0,6}$/.test(text)) fail('Use positive whole-number coefficients and subscripts.');
  const value = BigInt(text);
  if (value > MAX_INTEGER) limit();
  return value;
}

function addAtoms(target: Map<string, bigint>, source: Map<string, bigint>, factor = 1n): void {
  for (const [element, count] of source) {
    const total = (target.get(element) ?? 0n) + count * factor;
    if (total > MAX_ATOMS) limit();
    target.set(element, total);
  }
}

/** Plus signs inside explicit charges or immediately before a separator stay with the ion. */
function splitSpecies(side: string, offset: number): SpeciesTerm[] {
  const result: SpeciesTerm[] = [];
  const stack: string[] = [];
  let start = 0;
  const append = (end: number) => {
    const segment = side.slice(start, end);
    result.push({ raw: segment.trim(), start: offset + start + segment.length - segment.trimStart().length });
  };
  for (let index = 0; index < side.length; index++) {
    const char = side[index];
    if ('([{'.includes(char)) stack.push(char);
    else if (')]}'.includes(char)) {
      const opening = stack.pop();
      if (!opening || '([{'.indexOf(opening) !== ')]}'.indexOf(char)) fail('A group is not closed correctly.');
    } else if (char === '+' && stack.length === 0) {
      const prefix = side.slice(start, index).trimEnd();
      const rest = side.slice(index + 1).trimStart();
      const explicitCharge = /\^[0-9]*$/.test(prefix);
      const terminalCharge = rest === '' || rest.startsWith('+');
      if (!explicitCharge && !terminalCharge) {
        append(index);
        start = index + 1;
      }
    }
  }
  if (stack.length) fail('A group is not closed correctly.');
  append(side.length);
  if (result.some(({ raw }) => !raw)) fail('A reaction side contains an empty species.');
  return result;
}

function parseFormula(source: string): Map<string, bigint> {
  let cursor = 0;

  function subscript(): bigint {
    let text = '';
    if (source[cursor] === '_') {
      cursor++;
      if (source[cursor] === '{') {
        const end = source.indexOf('}', cursor + 1);
        if (end < 0) fail();
        text = source.slice(cursor + 1, end);
        if (!text) fail('A subscript cannot be empty.');
        cursor = end + 1;
      } else {
        const match = /^[0-9]+/.exec(source.slice(cursor));
        if (!match) fail();
        text = match[0];
        cursor += text.length;
      }
    } else {
      const match = /^[0-9]+/.exec(source.slice(cursor));
      if (match) { text = match[0]; cursor += text.length; }
    }
    return text ? integer(text) : 1n;
  }

  function group(depth: number, closing?: string): Map<string, bigint> {
    if (depth > REACTION_LIMITS.groupDepth) limit();
    const counts = new Map<string, bigint>();
    let units = 0;
    let afterBond = false;
    while (cursor < source.length && source[cursor] !== closing) {
      const char = source[cursor];
      if ('-=#'.includes(char)) {
        if (units === 0 || afterBond) fail('A bond must connect two supported formula groups.');
        cursor++;
        afterBond = true;
        continue;
      }
      let atoms: Map<string, bigint>;
      if (char === '(' || char === '[') {
        cursor++;
        atoms = group(depth + 1, char === '(' ? ')' : ']');
      } else {
        const match = /^[A-Z][a-z]?/.exec(source.slice(cursor));
        if (!match || !ELEMENTS.has(match[0])) fail('An element or formula token is not recognized.');
        cursor += match[0].length;
        atoms = new Map([[match[0], 1n]]);
      }
      addAtoms(counts, atoms, subscript());
      units++;
      afterBond = false;
    }
    if (units === 0 || afterBond) fail('A formula group is empty or incomplete.');
    if (closing) {
      if (source[cursor] !== closing) fail('A group is not closed correctly.');
      cursor++;
    }
    return counts;
  }

  const atoms = group(0);
  if (cursor !== source.length) fail();
  return atoms;
}

function parseSpecies(raw: string): Species {
  let formula = raw;
  let coefficient = 1n;
  const leading = /^([0-9]+)\s*/.exec(formula);
  if (leading) {
    coefficient = integer(leading[1]);
    formula = formula.slice(leading[0].length).trim();
  }
  if (!formula) fail();
  // Removing a space must not turn an invalid token such as "C l" into Cl,
  // or turn a separated number into a subscript. Rendering has a wider grammar.
  if (/[A-Za-z0-9]\s+[a-z0-9]/.test(formula) || /\s[+-](?:\}|$)/.test(formula)
    || /\s[-=#]|[-=#]\s/.test(formula)) fail();
  let notation = formula.replace(/\s+/g, '');
  // Terminal state labels carry no atoms or charge. All other labels remain and fail parsing.
  const state = /\((?:s|l|g|aq)\)$/;
  const hadTerminalState = state.test(notation);
  notation = notation.replace(state, '');
  let charge = 0n;
  const explicit = /\^(?:\{([0-9]*)([+-])\}|([0-9]*)([+-]))$/.exec(notation);
  if (explicit) {
    const magnitude = explicit[1] ?? explicit[3] ?? '';
    charge = (magnitude ? integer(magnitude) : 1n) * ((explicit[2] ?? explicit[4]) === '+' ? 1n : -1n);
    notation = notation.slice(0, explicit.index);
  } else if (/[+-]$/.test(notation)) {
    charge = notation.endsWith('+') ? 1n : -1n;
    notation = notation.slice(0, -1);
    // Fe3+ could mean Fe_3^+ or Fe^{3+}. Require a caret to avoid a wrong atom count.
    if (/^[A-Z][a-z]?[0-9]+$/.test(notation) || /[\])][0-9]+$/.test(notation)) {
      fail('Use an explicit charge such as Fe^3+ instead of an ambiguous bare charge.');
    }
  }
  if (!hadTerminalState && charge !== 0n) notation = notation.replace(state, '');
  if (notation === 'e') {
    if (charge !== -1n) fail('Only the electron e- is supported as an atom-free species.');
    return { formula, coefficient, atoms: new Map(), charge };
  }
  const fragments = notation.split(/[.*·]/);
  if (fragments.some((fragment) => !fragment)) fail('An addition compound has an empty fragment.');
  const atoms = new Map<string, bigint>();
  for (let index = 0; index < fragments.length; index++) {
    let fragment = fragments[index];
    let multiplier = 1n;
    if (index > 0) {
      const match = /^([0-9]+)/.exec(fragment);
      if (match) { multiplier = integer(match[1]); fragment = fragment.slice(match[0].length); }
    }
    addAtoms(atoms, parseFormula(fragment), multiplier);
  }
  return { formula, coefficient, atoms, charge };
}

class Arithmetic {
  private remaining = REACTION_LIMITS.operations;
  tick(): void { if (--this.remaining < 0) limit('Exact arithmetic reached its bounded operation limit.'); }
  bound(value: bigint): bigint {
    if (value > MAX_RATIONAL || value < -MAX_RATIONAL) limit('Exact arithmetic reached its bounded integer size.');
    return value;
  }
  gcd(a: bigint, b: bigint): bigint {
    a = a < 0n ? -a : a; b = b < 0n ? -b : b;
    while (b) { this.tick(); [a, b] = [b, a % b]; }
    return a;
  }
  fraction(n: bigint, d = 1n): Fraction {
    this.tick(); this.bound(n); this.bound(d);
    if (d === 0n) fail();
    if (n === 0n) return { n: 0n, d: 1n };
    if (d < 0n) { n = -n; d = -d; }
    const divisor = this.gcd(n, d);
    return { n: n / divisor, d: d / divisor };
  }
  divide(a: Fraction, b: Fraction): Fraction {
    return this.fraction(this.bound(a.n * b.d), this.bound(a.d * b.n));
  }
  subtractProduct(a: Fraction, b: Fraction, c: Fraction): Fraction {
    // Reduce the product before subtraction; this keeps the work budget predictable.
    const product = this.fraction(this.bound(b.n * c.n), this.bound(b.d * c.d));
    return this.fraction(this.bound(a.n * product.d - product.n * a.d), this.bound(a.d * product.d));
  }
}

type Solution = { kind: 'none' } | { kind: 'multiple' } | { kind: 'positive'; values: bigint[] };

function solveConservation(rows: bigint[][], columns: number): Solution {
  const arithmetic = new Arithmetic();
  const matrix = rows.map((row) => row.map((value) => arithmetic.fraction(value)));
  const pivots: number[] = [];
  for (let column = 0; column < columns && pivots.length < matrix.length; column++) {
    const rowIndex = matrix.findIndex((row, index) => index >= pivots.length && row[column].n !== 0n);
    if (rowIndex < 0) continue;
    const pivotRow = pivots.length;
    [matrix[pivotRow], matrix[rowIndex]] = [matrix[rowIndex], matrix[pivotRow]];
    const row = matrix[pivotRow];
    const pivot = row[column];
    for (let j = column; j < columns; j++) row[j] = arithmetic.divide(row[j], pivot);
    for (let i = 0; i < matrix.length; i++) {
      if (i === pivotRow || matrix[i][column].n === 0n) continue;
      const factor = matrix[i][column];
      for (let j = column; j < columns; j++) {
        matrix[i][j] = arithmetic.subtractProduct(matrix[i][j], factor, row[j]);
      }
    }
    pivots.push(column);
  }
  const free = Array.from({ length: columns }, (_, index) => index).filter((index) => !pivots.includes(index));
  if (free.length === 0) return { kind: 'none' };
  if (free.length > 1) return { kind: 'multiple' };
  const values = Array.from({ length: columns }, () => ({ n: 0n, d: 1n }));
  values[free[0]] = { n: 1n, d: 1n };
  for (let row = 0; row < pivots.length; row++) {
    const value = matrix[row][free[0]];
    values[pivots[row]] = { n: -value.n, d: value.d };
  }
  if (values.some(({ n }) => n <= 0n)) return { kind: 'none' };
  let common = 1n;
  for (const { d } of values) common = arithmetic.bound((common / arithmetic.gcd(common, d)) * d);
  const integers = values.map(({ n, d }) => arithmetic.bound(n * (common / d)));
  const divisor = integers.reduce((result, value) => arithmetic.gcd(result, value), integers[0]);
  return { kind: 'positive', values: integers.map((value) => value / divisor) };
}

/** Offline, exact atom/charge conservation check. It never blocks formula insertion. */
export function checkReaction(input: string): ReactionCheck {
  let differences: ReactionCheck['differences'];
  try {
    if (input.length > REACTION_LIMITS.inputLength) limit();
    const source = input;
    const arrows = [...source.matchAll(ARROWS)];
    if (arrows.length === 0) return { status: 'not-reaction', message: 'Add a reaction arrow to check atom and charge conservation.' };
    if (arrows.length !== 1) fail('Check one reaction arrow at a time.');
    const arrow = arrows[0];
    // mhchem treats a bracket directly following an arrow as a condition. Even
    // [H2] is a label there, not a second product fragment to count as atoms.
    if (source.slice(arrow.index + arrow[0].length).trimStart().startsWith('[')) {
      fail('Arrow conditions are not checked. Use an explicit coefficient before a square-bracket product.');
    }
    const leftTerms = splitSpecies(source.slice(0, arrow.index), 0);
    const rightStart = arrow.index + arrow[0].length;
    const rightTerms = splitSpecies(source.slice(rightStart), rightStart);
    if (leftTerms.length + rightTerms.length > REACTION_LIMITS.species) limit();
    const left = leftTerms.map(({ raw }) => parseSpecies(raw));
    const right = rightTerms.map(({ raw }) => parseSpecies(raw));
    const species = [...left, ...right];
    const elements = [...new Set(species.flatMap(({ atoms }) => [...atoms.keys()]))];
    if (elements.length > REACTION_LIMITS.distinctElements) limit();
    const keys = species.some(({ charge }) => charge !== 0n) ? [...elements, 'charge'] : elements;
    const counts = (item: Species, key: string) => key === 'charge' ? item.charge : item.atoms.get(key) ?? 0n;
    differences = keys.flatMap((element) => {
      const leftTotal = left.reduce((sum, item) => sum + counts(item, element) * item.coefficient, 0n);
      const rightTotal = right.reduce((sum, item) => sum + counts(item, element) * item.coefficient, 0n);
      return leftTotal === rightTotal ? [] : [{ element, left: leftTotal.toString(), right: rightTotal.toString() }];
    });
    if (differences.length === 0) return {
      status: 'balanced', canBalance: true, differences,
      message: 'Atoms and charge are conserved. This does not establish that the reaction occurs.',
    };
    const rows = keys.map((key) => species.map((item, index) => counts(item, key) * (index < left.length ? 1n : -1n)));
    // A same-sign row cannot sum to zero with every listed species present.
    // A zero row is redundant, not an impossibility proof.
    if (rows.some((row) => row.some((value) => value !== 0n) && (row.every((value) => value >= 0n) || row.every((value) => value <= 0n)))) {
      return { status: 'impossible', canBalance: false, differences, message: 'No positive coefficients conserve atoms and charge with all the listed species.' };
    }
    const solution = solveConservation(rows, species.length);
    if (solution.kind === 'none') return {
      status: 'impossible', canBalance: false, differences,
      message: 'No positive coefficients conserve atoms and charge with all the listed species.',
    };
    if (solution.kind === 'multiple') return {
      status: 'indeterminate', reason: 'multiple-solutions', differences,
      message: 'This equation has more than one free coefficient; the bounded checker has not decided whether all coefficients can be positive.',
    };
    if (solution.values.some((value) => value > MAX_INTEGER)) return {
      status: 'unbalanced', canBalance: true, reason: 'limit', differences,
      message: 'Positive balancing coefficients exist, but exceed the suggestion size limit.',
    };
    // Replace only coefficient digits, right to left. Preserve the exact species,
    // phase/charge spelling, separators, arrow and whitespace the user entered.
    const edits = [...leftTerms, ...rightTerms].map((term, index) => {
      const oldDigits = /^[0-9]+/.exec(term.raw)?.[0] ?? '';
      const value = solution.values[index];
      // Retain an explicit 1 when a coefficient was present. In mhchem, that 1
      // can disambiguate a square-bracket product from an arrow condition.
      const replacement = value === 1n && !oldDigits ? '' : value.toString();
      return { start: term.start, end: term.start + oldDigits.length, replacement };
    });
    let suggestion = source;
    for (const edit of edits.reverse()) suggestion = suggestion.slice(0, edit.start) + edit.replacement + suggestion.slice(edit.end);
    return {
      status: 'unbalanced', canBalance: true, suggestion, differences,
      message: 'The current coefficients do not conserve atoms and charge. A smallest positive whole-number ratio is available.',
    };
  } catch (error) {
    if (!(error instanceof CheckFailure)) throw error;
    return {
      status: differences ? 'indeterminate' : 'unsupported', reason: error.reason, differences,
      message: error.message,
    };
  }
}
