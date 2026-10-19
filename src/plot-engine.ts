/** Bounded, dependency-free numerical graphs. This parser never evaluates JavaScript. */
export interface PlotSpec {
  mode?: 'function' | 'complex' | 'polar' | 'surface';
  thetaMin?: number;
  thetaMax?: number;
  calculus?: 'none' | 'derivative' | 'second-derivative' | 'integral';
  integralMin?: number;
  integralMax?: number;
  zMin?: number;
  zMax?: number;
  azimuth?: number;
  elevation?: number;
  expression: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface PlotPoint { x: number; y: number }
export type PlotFailure = { ok: false; error: string };
export type CompiledExpression = {
  ok: true;
  expression: string;
  /** Returns NaN outside the real, finite domain. Trigonometric arguments are radians. */
  evaluate: (x: number, y?: number) => number;
  /** Conservative guards for sampled denominator zeroes and tangent poles. */
  crossesDomainBoundary: (from: number, to: number, fromY?: number, toY?: number) => boolean;
  /** Conservative arithmetic work estimate used to bound synchronous sampling. */
  evaluationCost: number;
};
export type PlotResult = PlotFailure | {
  ok: true;
  svg: string;
  segments: PlotPoint[][];
  sampleCount: number;
  spec: PlotSpec;
};

export const DEFAULT_PLOT_SPEC: Readonly<PlotSpec> = Object.freeze({
  expression: 'sin(x)', xMin: -10, xMax: 10, yMin: -10, yMax: 10,
});

export const PLOT_LIMITS = Object.freeze({
  expressionLength: 500, tokens: 256, nodes: 192, depth: 32,
  absoluteBound: 1e6, minimumSpan: 1e-9, evaluations: 16385,
  arithmeticWork: 3000000,
});

const FUNCTION_NAMES = ['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'sqrt', 'abs', 'ln', 'log', 'exp'] as const;
export type PlotVariable = 'x' | 'y' | 'theta';
type FunctionName = typeof FUNCTION_NAMES[number];
interface RationalExponent { numerator: number; denominator: number }
type Node =
  | { type: 'number'; value: number }
  | { type: 'variable'; name: PlotVariable }
  | { type: 'unary'; negative: boolean; child: Node }
  | { type: 'binary'; op: string; left: Node; right: Node; rationalExponent?: RationalExponent }
  | { type: 'function'; name: FunctionName; child: Node };
type Token = { kind: 'number'; value: number } | { kind: 'name'; value: string } | { kind: 'symbol'; value: string };

class ExpressionError extends Error {}
function fail(message: string): never { throw new ExpressionError(message); }

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;
  while (position < expression.length) {
    const rest = expression.slice(position);
    const whitespace = /^\s+/.exec(rest);
    if (whitespace) { position += whitespace[0].length; continue; }
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest);
    if (number) {
      const value = Number(number[0]);
      if (!Number.isFinite(value)) fail('Numbers must be finite.');
      tokens.push({ kind: 'number', value });
      position += number[0].length;
    } else {
      const name = /^[A-Za-z]+/.exec(rest);
      if (name) {
        tokens.push({ kind: 'name', value: name[0] });
        position += name[0].length;
      } else {
        const char = expression[position++];
        if (!'+-*/^()'.includes(char)) fail('Unsupported notation. Use numbers, x, arithmetic, and supported functions.');
        tokens.push({ kind: 'symbol', value: char });
      }
    }
    if (tokens.length > PLOT_LIMITS.tokens) fail('The expression is too complex. Simplify it before plotting.');
  }
  return tokens;
}

class Parser {
  private index = 0;
  private nodeCount = 0;
  private depth = 0;
  constructor(private readonly tokens: Token[], private readonly variables: readonly PlotVariable[]) {}

  parse(): Node {
    if (!this.tokens.length) fail('Enter an expression such as x^2 or sin(x).');
    const node = this.sum();
    if (this.index !== this.tokens.length) fail('Unexpected input. Check operators and parentheses.');
    return node;
  }

  private node<T extends Node>(node: T): T {
    if (++this.nodeCount > PLOT_LIMITS.nodes) fail('The expression is too complex. Simplify it before plotting.');
    return node;
  }
  private nested<T>(action: () => T): T {
    if (++this.depth > PLOT_LIMITS.depth) fail('The expression is nested too deeply.');
    try { return action(); } finally { this.depth--; }
  }
  private is(value: string): boolean {
    const token = this.tokens[this.index];
    return token?.kind === 'symbol' && token.value === value;
  }
  private take(value: string): boolean {
    if (!this.is(value)) return false;
    this.index++;
    return true;
  }
  private sum(): Node {
    let left = this.product();
    while (this.is('+') || this.is('-')) {
      const op = this.tokens[this.index++].value as string;
      left = this.node({ type: 'binary', op, left, right: this.product() });
    }
    return left;
  }
  private product(): Node {
    let left = this.unary();
    while (true) {
      const token = this.tokens[this.index];
      const explicit = this.is('*') || this.is('/');
      // Adjacent operands denote multiplication; function calls consume their own parentheses.
      const implicit = token?.kind === 'number' || token?.kind === 'name' || this.is('(');
      if (!explicit && !implicit) return left;
      if (implicit && token?.kind === 'number' && this.tokens[this.index - 1]?.kind === 'number') {
        fail('Unexpected input. Check operators and parentheses.');
      }
      const op = explicit ? this.tokens[this.index++].value as string : '*';
      left = this.node({ type: 'binary', op, left, right: this.unary() });
    }
  }
  private unary(): Node {
    return this.nested(() => {
      if (this.take('+')) return this.node({ type: 'unary', negative: false, child: this.unary() });
      if (this.take('-')) return this.node({ type: 'unary', negative: true, child: this.unary() });
      return this.power();
    });
  }
  private power(): Node {
    const left = this.primary();
    // Unary on the right makes exponentiation right associative while allowing 2^-2.
    if (!this.take('^')) return left;
    const right = this.unary();
    return this.node({ type: 'binary', op: '^', left, right, rationalExponent: constantRationalExponent(right) });
  }
  private primary(): Node {
    const token = this.tokens[this.index++];
    if (!token) fail('The expression is incomplete.');
    if (token.kind === 'number') return this.node({ type: 'number', value: token.value });
    if (token.kind === 'symbol' && token.value === '(') {
      const child = this.nested(() => this.sum());
      if (!this.take(')')) fail('A closing parenthesis is missing.');
      return child;
    }
    if (token.kind === 'name') {
      if (this.variables.includes(token.value as PlotVariable)) return this.node({ type: 'variable', name: token.value as PlotVariable });
      if (token.value === 'pi' || token.value === 'e') {
        return this.node({ type: 'number', value: token.value === 'pi' ? Math.PI : Math.E });
      }
      if (!FUNCTION_NAMES.includes(token.value as FunctionName)) fail(`Unknown name. Use ${this.variables.join(', ')}, pi, e, or a supported function.`);
      if (!this.take('(')) fail('Function arguments need parentheses, for example sin(x).');
      const child = this.nested(() => this.sum());
      if (!this.take(')')) fail('A closing parenthesis is missing.');
      return this.node({ type: 'function', name: token.value as FunctionName, child });
    }
    return fail('Unexpected input. Check operators and parentheses.');
  }
}

function signedInteger(node: Node): number | undefined {
  if (node.type === 'number') return Number.isSafeInteger(node.value) ? node.value : undefined;
  if (node.type !== 'unary') return undefined;
  const child = signedInteger(node.child);
  return child === undefined ? undefined : (node.negative ? -child : child);
}

/** Only exact, simple integer fractions are recognized; decimal approximations are not guessed. */
function constantRationalExponent(node: Node): RationalExponent | undefined {
  const integer = signedInteger(node);
  if (integer !== undefined) return { numerator: integer, denominator: 1 };
  if (node.type === 'unary') {
    const child = constantRationalExponent(node.child);
    return child ? { numerator: node.negative ? -child.numerator : child.numerator, denominator: child.denominator } : undefined;
  }
  if (node.type !== 'binary' || node.op !== '/') return undefined;
  const numerator = signedInteger(node.left), denominator = signedInteger(node.right);
  if (numerator === undefined || denominator === undefined || denominator === 0) return undefined;
  let a = BigInt(Math.abs(numerator)), b = BigInt(Math.abs(denominator));
  // Euclid on safe integers needs fewer than 128 iterations, including adversarial inputs.
  for (let step = 0; b !== 0n && step < 128; step++) { const remainder = a % b; a = b; b = remainder; }
  if (b !== 0n || a === 0n) return undefined;
  const divisor = Number(a);
  return { numerator: (denominator < 0 ? -numerator : numerator) / divisor, denominator: Math.abs(denominator) / divisor };
}

function evaluate(node: Node, x: number, y = 0): number {
  switch (node.type) {
    case 'number': return node.value;
    case 'variable': return node.name === 'y' ? y : x;
    case 'unary': return (node.negative ? -1 : 1) * evaluate(node.child, x, y);
    case 'binary': {
      const left = evaluate(node.left, x, y);
      const right = evaluate(node.right, x, y);
      switch (node.op) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return right === 0 ? NaN : left / right;
        case '^': {
          const rational = node.rationalExponent;
          if (left < 0 && rational && rational.denominator % 2 === 1) {
            const magnitude = Math.pow(-left, rational.numerator / rational.denominator);
            return rational.numerator % 2 === 0 ? magnitude : -magnitude;
          }
          return Math.pow(left, right);
        }
        default: return NaN;
      }
    }
    case 'function': {
      const value = evaluate(node.child, x, y);
      switch (node.name) {
        case 'sin': return Math.sin(value);
        case 'cos': return Math.cos(value);
        case 'tan': return Math.abs(Math.cos(value)) < 1e-12 ? NaN : Math.tan(value);
        case 'sec': return Math.abs(Math.cos(value)) < 1e-12 ? NaN : 1 / Math.cos(value);
        case 'csc': return Math.abs(Math.sin(value)) < 1e-12 ? NaN : 1 / Math.sin(value);
        case 'cot': return Math.abs(Math.sin(value)) < 1e-12 ? NaN : Math.cos(value) / Math.sin(value);
        case 'asin': return Math.asin(value);
        case 'acos': return Math.acos(value);
        case 'atan': return Math.atan(value);
        case 'sinh': return Math.sinh(value);
        case 'cosh': return Math.cosh(value);
        case 'tanh': return Math.tanh(value);
        case 'asinh': return Math.asinh(value);
        case 'acosh': return Math.acosh(value);
        case 'atanh': return Math.atanh(value);
        case 'sqrt': return Math.sqrt(value);
        case 'abs': return Math.abs(value);
        case 'ln': return Math.log(value);
        case 'log': return Math.log10(value);
        case 'exp': return Math.exp(value);
      }
    }
  }
}

function containsVariable(node: Node): boolean {
  switch (node.type) {
    case 'variable': return true;
    case 'number': return false;
    case 'unary': case 'function': return containsVariable(node.child);
    case 'binary': return containsVariable(node.left) || containsVariable(node.right);
  }
}

function nodeCost(node: Node): number {
  if (node.type === 'number' || node.type === 'variable') return 1;
  if (node.type === 'binary') return 1 + nodeCost(node.left) + nodeCost(node.right);
  return 1 + nodeCost(node.child);
}

function domainGuards(root: Node): Array<{ at: (x: number, y?: number) => number; cost: number }> {
  const guards: Array<{ at: (x: number, y?: number) => number; cost: number }> = [];
  const guarded = new Set<Node>();
  const zeroFactors = (node: Node): void => {
    if (guarded.has(node)) return;
    guarded.add(node);
    guards.push({ at: (x, y) => evaluate(node, x, y), cost: nodeCost(node) });
    // A squared denominator can touch zero without changing sign; guard its factors too.
    if (node.type === 'unary') zeroFactors(node.child);
    if (node.type === 'function' && (node.name === 'sqrt' || node.name === 'abs')) zeroFactors(node.child);
    if (node.type === 'binary') {
      if (node.op === '*') { zeroFactors(node.left); zeroFactors(node.right); }
      if (node.op === '/') zeroFactors(node.left);
      if (node.op === '^' && !containsVariable(node.right) && evaluate(node.right, 0) > 0) zeroFactors(node.left);
    }
  };
  const visit = (node: Node): void => {
    if (node.type === 'binary') {
      if (node.op === '/') zeroFactors(node.right);
      if (node.op === '^' && !containsVariable(node.right) && evaluate(node.right, 0) < 0) zeroFactors(node.left);
      visit(node.left);
      visit(node.right);
    } else if (node.type === 'function') {
      if (node.name === 'tan' || node.name === 'sec') guards.push({ at: (x, y) => Math.cos(evaluate(node.child, x, y)), cost: 1 + nodeCost(node.child) });
      if (node.name === 'csc' || node.name === 'cot') guards.push({ at: (x, y) => Math.sin(evaluate(node.child, x, y)), cost: 1 + nodeCost(node.child) });
      visit(node.child);
    } else if (node.type === 'unary') visit(node.child);
  };
  visit(root);
  return guards;
}

function mayCrossZero(at: (x: number) => number, from: number, to: number): boolean {
  const a = at(from), b = at(to), middle = at(from + (to - from) / 2);
  if (a === 0 || b === 0 || middle === 0) return true;
  if (![a, b, middle].every(Number.isFinite)) return false;
  if ((a < 0) !== (b < 0) || (a < 0) !== (middle < 0)) return true;
  // An expanded even pole need not change sign. A local quadratic fit that nearly
  // touches zero asks the sampler to refine; this is a conservative numerical hint.
  const scale = Math.max(Math.abs(a), Math.abs(b), Math.abs(middle));
  const aa = Math.abs(a) / scale, bb = Math.abs(b) / scale, mm = Math.abs(middle) / scale;
  const quadratic = 2 * (aa + bb - 2 * mm);
  const linear = 4 * mm - 3 * aa - bb;
  if (quadratic <= 0) return false;
  const vertex = -linear / (2 * quadratic);
  const minimum = aa - linear * linear / (4 * quadratic);
  return vertex > 0 && vertex < 1 && minimum < Math.min(aa, bb) * 0.05;
}

export function compileExpression(input: string, variables: readonly PlotVariable[] = ['x']): CompiledExpression | PlotFailure {
  if (typeof input !== 'string') return { ok: false, error: 'Enter an expression such as x^2 or sin(x).' };
  if (input.length > PLOT_LIMITS.expressionLength) return { ok: false, error: 'The expression is too long (maximum 500 characters).' };
  if (!variables.length || variables.some(variable => !['x', 'y', 'theta'].includes(variable))
    || new Set(variables).size !== variables.length || (variables.includes('theta') && variables.length !== 1)) {
    return { ok: false, error: 'Unsupported graph variables.' };
  }
  const prefix = variables.includes('theta') ? /^r\s*=\s*/ : variables.includes('y') ? /^z\s*=\s*/ : /^y\s*=\s*/;
  const expression = input.trim().replace(prefix, '').replace(/π/g, 'pi').replace(/θ/g, 'theta')
    .replace(/arcsin\b/g, 'asin').replace(/arccos\b/g, 'acos').replace(/arctan\b/g, 'atan')
    .replace(/[−–]/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
  try {
    const root = new Parser(tokenize(expression), variables).parse();
    const guards = domainGuards(root);
    return {
      ok: true, expression,
      evaluate: (x, y = 0) => {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return NaN;
        const result = evaluate(root, x, y);
        return Number.isFinite(result) ? result : NaN;
      },
      crossesDomainBoundary: (from, to, fromY = 0, toY = fromY) => guards.some((guard) => mayCrossZero(
        t => guard.at(from + (to - from) * t, fromY + (toY - fromY) * t), 0, 1)),
      evaluationCost: nodeCost(root) + 8 * guards.reduce((sum, guard) => sum + guard.cost, 0),
    };
  } catch (error) {
    if (error instanceof ExpressionError) return { ok: false, error: error.message };
    return { ok: false, error: 'The expression could not be parsed.' };
  }
}

export function validatePlotSpec(spec: PlotSpec): { ok: true; spec: PlotSpec } | PlotFailure {
  if (spec?.mode !== undefined && spec.mode !== 'function') return { ok: false, error: 'Unsupported graph mode.' };
  if (!spec || typeof spec !== 'object') return { ok: false, error: 'Graph settings are missing.' };
  for (const key of ['xMin', 'xMax', 'yMin', 'yMax'] as const) {
    if (!Number.isFinite(spec[key]) || Math.abs(spec[key]) > PLOT_LIMITS.absoluteBound) {
      return { ok: false, error: 'Axis bounds must be finite numbers between -1000000 and 1000000.' };
    }
  }
  for (const [minimum, maximum] of [[spec.xMin, spec.xMax], [spec.yMin, spec.yMax]]) {
    if (!(maximum > minimum)) return { ok: false, error: 'Each axis minimum must be smaller than its maximum.' };
    if (maximum - minimum < PLOT_LIMITS.minimumSpan) return { ok: false, error: 'Each axis range must span at least 0.000000001.' };
    if (maximum - minimum < Math.max(Math.abs(minimum), Math.abs(maximum)) * Number.EPSILON * 4096) {
      return { ok: false, error: 'Axis ranges are too narrow for their magnitude.' };
    }
  }
  const compiled = compileExpression(spec.expression);
  return compiled.ok ? { ok: true, spec: { ...spec, expression: compiled.expression } } : compiled;
}

function samePoint(a: PlotPoint, b: PlotPoint): boolean { return a.x === b.x && a.y === b.y; }
function clipPair(a: PlotPoint, b: PlotPoint, spec: PlotSpec): [PlotPoint, PlotPoint] | undefined {
  if ((a.y < spec.yMin && b.y < spec.yMin) || (a.y > spec.yMax && b.y > spec.yMax)) return undefined;
  let start = a;
  let end = b;
  if (a.y < spec.yMin || a.y > spec.yMax) {
    const y = a.y < spec.yMin ? spec.yMin : spec.yMax;
    const t = (y - a.y) / (b.y - a.y);
    start = { x: a.x + t * (b.x - a.x), y };
  }
  if (b.y < spec.yMin || b.y > spec.yMax) {
    const y = b.y < spec.yMin ? spec.yMin : spec.yMax;
    const t = (y - a.y) / (b.y - a.y);
    end = { x: a.x + t * (b.x - a.x), y };
  }
  return samePoint(start, end) ? undefined : [start, end];
}

export function sampleCurve(compiled: CompiledExpression, spec: PlotSpec): { segments: PlotPoint[][]; sampleCount: number } {
  const cache = new Map<number, PlotPoint>();
  const segments: PlotPoint[][] = [];
  let current: PlotPoint[] | undefined;
  const evaluationLimit = Math.min(PLOT_LIMITS.evaluations, Math.floor(PLOT_LIMITS.arithmeticWork / compiled.evaluationCost));
  const tolerance = (spec.yMax - spec.yMin) / 400 * 0.65;
  const point = (x: number): PlotPoint => {
    const prior = cache.get(x);
    if (prior) return prior;
    if (cache.size >= evaluationLimit) fail('The graph is too complex to sample. Simplify the expression or narrow the range.');
    const value = { x, y: compiled.evaluate(x) };
    cache.set(x, value);
    return value;
  };
  const gap = (): void => { current = undefined; };
  const line = (a: PlotPoint, b: PlotPoint): void => {
    const pair = clipPair(a, b, spec);
    if (!pair) { gap(); return; }
    if (current && samePoint(current[current.length - 1], pair[0])) current.push(pair[1]);
    else { current = [pair[0], pair[1]]; segments.push(current); }
    if (!samePoint(pair[1], b)) gap();
  };
  const interval = (a: PlotPoint, b: PlotPoint, depth: number): void => {
    const midpoint = point(a.x + (b.x - a.x) / 2);
    const finite = Number.isFinite(a.y) && Number.isFinite(b.y) && Number.isFinite(midpoint.y);
    if (!finite && !Number.isFinite(a.y) && !Number.isFinite(b.y) && !Number.isFinite(midpoint.y)) { gap(); return; }
    // Entire sampled interval is outside one edge. Do not waste the work budget refining
    // enormous off-screen values (for example x^100); fine features may remain unsampled.
    if (finite && ((a.y > spec.yMax && b.y > spec.yMax && midpoint.y > spec.yMax)
      || (a.y < spec.yMin && b.y < spec.yMin && midpoint.y < spec.yMin))) { gap(); return; }
    const boundary = compiled.crossesDomainBoundary(a.x, midpoint.x) || compiled.crossesDomainBoundary(midpoint.x, b.x);
    const error = finite && !boundary ? Math.abs(midpoint.y - (a.y / 2 + b.y / 2)) : Infinity;
    // Refine curvature and poles. Unresolved jumps become gaps instead of fake vertical joins.
    if ((!finite || error > tolerance) && depth < 10) {
      interval(a, midpoint, depth + 1);
      interval(midpoint, b, depth + 1);
      return;
    }
    if (!finite || error > tolerance * 4) { gap(); return; }
    line(a, midpoint);
    line(midpoint, b);
  };
  const intervals = 256;
  let left = point(spec.xMin);
  for (let index = 1; index <= intervals; index++) {
    const right = point(index === intervals ? spec.xMax : spec.xMin + (spec.xMax - spec.xMin) * index / intervals);
    interval(left, right, 0);
    left = right;
  }
  return { segments, sampleCount: cache.size };
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function formatTick(value: number, span: number): string {
  if (value === 0 || Math.abs(value) < 1e-14) return '0';
  // Close axis bounds around a large offset need more digits to remain distinct.
  const precision = Math.max(6, Math.min(15, Math.ceil(Math.log10(Math.abs(value) / span)) + 3));
  return Number(value.toPrecision(precision)).toString();
}
function ticks(minimum: number, maximum: number): number[] {
  const raw = (maximum - minimum) / 8;
  const power = 10 ** Math.floor(Math.log10(raw));
  const scaled = raw / power;
  const step = (scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10) * power;
  const first = Math.ceil(minimum / step);
  const last = Math.floor(maximum / step);
  const values: number[] = [];
  for (let index = first; index <= last && values.length < 16; index++) values.push(index * step);
  return values;
}

export interface SvgRenderOptions {
  title?: string;
  description?: string;
  annotation?: string;
  mode?: string;
  filledSegments?: PlotPoint[][];
}

export function renderSvg(spec: PlotSpec, segments: PlotPoint[][], options: SvgRenderOptions = {}): string {
  const xTicks = ticks(spec.xMin, spec.xMax).map(value => ({ value, label: formatTick(value, spec.xMax - spec.xMin) }));
  const yTicks = ticks(spec.yMin, spec.yMax).map(value => ({ value, label: formatTick(value, spec.yMax - spec.yMin) }));
  // Keep long decimal/negative tick labels inside the image and give the axis
  // names their own space. Long X labels are thinned rather than shrunk.
  const labelWidth = (label: string): number => label.length * 9.7;
  const left = Math.max(110, 30 + Math.max(...yTicks.map(tick => labelWidth(tick.label)), 0));
  const top = 64, right = 724, width = right - left, height = 326;
  const sx = (x: number): number => left + (x - spec.xMin) / (spec.xMax - spec.xMin) * width;
  const sy = (y: number): number => top + (spec.yMax - y) / (spec.yMax - spec.yMin) * height;
  const decimal = (value: number): string => value.toFixed(3).replace(/\.?0+$/, '');
  const expression = spec.expression;
  const titleLength = Math.min(70, Math.floor((776 - left) / 9));
  const shortExpression = expression.length > titleLength ? `${expression.slice(0, titleLength - 3)}…` : expression;
  const grid: string[] = [];
  const labels: string[] = [];
  let previousLabelRight = -Infinity;
  for (const { value, label } of xTicks) {
    const position = sx(value);
    const x = decimal(position);
    grid.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${top + height}"/>`);
    const labelLeft = position - labelWidth(label) / 2;
    const labelRight = position + labelWidth(label) / 2;
    if (labelLeft >= 14 && labelRight <= 746 && labelLeft >= previousLabelRight + 16) {
      labels.push(`<text data-axis-tick="X" x="${x}" y="418" text-anchor="middle">${escapeXml(label)}</text>`);
      previousLabelRight = labelRight;
    }
  }
  for (const { value, label } of yTicks) {
    const y = decimal(sy(value));
    grid.push(`<line x1="${left}" y1="${y}" x2="${left + width}" y2="${y}"/>`);
    labels.push(`<text data-axis-tick="Y" x="${left - 16}" y="${y}" text-anchor="end" dominant-baseline="middle">${escapeXml(label)}</text>`);
  }
  const axes: string[] = [];
  if (spec.yMin <= 0 && spec.yMax >= 0) axes.push(`<line x1="${left}" y1="${decimal(sy(0))}" x2="${left + width}" y2="${decimal(sy(0))}"/>`);
  if (spec.xMin <= 0 && spec.xMax >= 0) axes.push(`<line x1="${decimal(sx(0))}" y1="${top}" x2="${decimal(sx(0))}" y2="${top + height}"/>`);
  const paths = segments.map((segment) => `<path d="${segment.map((point, index) => `${index ? 'L' : 'M'}${decimal(sx(point.x))},${decimal(sy(point.y))}`).join(' ')}"/>`).join('');
  const baseline = decimal(sy(Math.max(spec.yMin, Math.min(spec.yMax, 0))));
  const fills = (options.filledSegments ?? []).filter(segment => segment.length > 1).map(segment => `<path d="M${decimal(sx(segment[0].x))},${baseline} ${segment.map(point => `L${decimal(sx(point.x))},${decimal(sy(point.y))}`).join(' ')} L${decimal(sx(segment[segment.length - 1].x))},${baseline} Z"/>`).join('');
  const title = options.title ?? `Equation graph: y = ${expression}`;
  const description = options.description ?? 'Approximate numerical graph. The horizontal axis is X and the vertical axis is Y. Trigonometric arguments use radians. Domain gaps and unresolved discontinuities are omitted.';
  const display = options.title ?? `y = ${shortExpression}`;
  return `<svg data-vme-plot="${escapeXml(options.mode ?? 'function')}" xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480" style="max-width:100%;height:auto" role="img" aria-label="${escapeXml(`${title}; horizontal axis X, vertical axis Y`)}"><title>${escapeXml(title)}</title><desc>${escapeXml(description)}</desc><rect width="800" height="480" rx="12" fill="#fff"/><g font-family="system-ui, sans-serif" fill="#1f2937"><text data-vme-plot-caption="title" x="${left}" y="31" font-size="17">${escapeXml(display.length > titleLength ? `${display.slice(0, titleLength - 3)}…` : display)}</text><g stroke="#e5e7eb" stroke-width="1">${grid.join('')}</g><rect data-plot-frame="true" x="${left}" y="${top}" width="${width}" height="${height}" fill="none" stroke="#cbd5e1"/><g stroke="#64748b" stroke-width="1.3">${axes.join('')}</g><g font-size="16">${labels.join('')}</g><g font-size="22" font-weight="700"><text data-axis-label="X" x="774" y="418" text-anchor="middle">X</text><text data-axis-label="Y" x="38" y="35" text-anchor="middle">Y</text></g><g data-integral-shading="true" fill="#93c5fd" fill-opacity="0.5">${fills}</g><g fill="none" stroke="#2563eb" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${paths}</g><text data-vme-plot-caption="footer" x="${left}" y="455" font-size="12" fill="#64748b">${escapeXml(options.annotation ?? '≈ · rad')}</text></g></svg>`;
}

export function createPlot(input: PlotSpec): PlotResult {
  const validated = validatePlotSpec(input);
  if (!validated.ok) return validated;
  const compiled = compileExpression(validated.spec.expression);
  if (!compiled.ok) return compiled;
  try {
    const sampled = sampleCurve(compiled, validated.spec);
    if (!sampled.segments.length) return { ok: false, error: 'No finite curve is visible in this range. Check the formula or adjust the axes.' };
    return { ok: true, ...sampled, spec: validated.spec, svg: renderSvg(validated.spec, sampled.segments) };
  } catch (error) {
    return { ok: false, error: error instanceof ExpressionError ? error.message : 'The graph could not be generated.' };
  }
}
