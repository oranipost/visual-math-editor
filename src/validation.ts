/** A small structural check, not a substitute for MathLive's TeX parser. */
type Argument = { body: string; end: number; grouped: boolean };

function skipTrivia(source: string, start: number): number {
  let index = start;
  while (index < source.length) {
    if (/\s/.test(source[index])) index++;
    else if (source[index] === '%') {
      const newline = source.indexOf('\n', index);
      index = newline === -1 ? source.length : newline + 1;
    } else break;
  }
  return index;
}

function commandAt(source: string, start: number): { name: string; end: number } {
  let end = start + 1;
  if (/[A-Za-z]/.test(source[end] ?? '')) {
    while (/[A-Za-z]/.test(source[end] ?? '')) end++;
  } else if (end < source.length) end++;
  return { name: source.slice(start + 1, end), end };
}

function readGroup(source: string, start: number, open = '{', close = '}'): Argument | undefined {
  if (source[start] !== open) return undefined;
  let depth = 1;
  let braces = 0;
  for (let index = start + 1; index < source.length; index++) {
    if (source[index] === '\\') { index = commandAt(source, index).end - 1; continue; }
    if (source[index] === '%') {
      index = skipTrivia(source, index) - 1;
      continue;
    }
    if (open === '[') {
      if (source[index] === '{') braces++;
      if (source[index] === '}') braces--;
      if (braces !== 0) continue;
    }
    if (source[index] === open) depth++;
    if (source[index] === close) depth--;
    if (depth === 0) return { body: source.slice(start + 1, index), end: index + 1, grouped: true };
  }
  return undefined;
}

function readArgument(source: string, start: number): Argument | undefined {
  const index = skipTrivia(source, start);
  if (index >= source.length || source[index] === '}' || source[index] === ']') return undefined;
  if (source[index] === '{') return readGroup(source, index);
  if (source[index] === '\\') {
    const command = commandAt(source, index);
    return { body: source.slice(index, command.end), end: command.end, grouped: false };
  }
  return { body: source[index], end: index + 1, grouped: false };
}

function isEmptyMathBody(body: string): boolean {
  for (let index = 0; index < body.length;) {
    const next = skipTrivia(body, index);
    if (next >= body.length) return true;
    index = next;
    if (body[index] === '{' || body[index] === '}') { index++; continue; }
    if (body[index] === '\\') {
      const command = commandAt(body, index);
      if ([',', ';', ':', '!', ' ', 'quad', 'qquad', 'enspace', 'thinspace', 'medspace', 'thickspace'].includes(command.name)) {
        index = command.end;
        continue;
      }
    }
    return false;
  }
  return true;
}

/** Detects unfilled editor slots, including empty structured arguments after deletion. */
export function hasIncompleteSlots(latex: string): boolean {
  for (let index = 0; index < latex.length;) {
    const next = skipTrivia(latex, index);
    if (next >= latex.length) break;
    index = next;
    if (latex[index] === '^' || latex[index] === '_') {
      const argument = readArgument(latex, index + 1);
      if (!argument || (argument.grouped && isEmptyMathBody(argument.body))) return true;
      index++;
      continue;
    }
    if (latex[index] !== '\\') { index++; continue; }
    const command = commandAt(latex, index);
    index = command.end;
    if (command.name === 'placeholder') return true;
    // mhchem has its own notation: a standalone ^ marks released gas. Do not
    // mistake that marker (or unit exponents) for incomplete math-field slots.
    if (command.name === 'ce' || command.name === 'pu') {
      const argument = readGroup(latex, skipTrivia(latex, index));
      if (!argument || !argument.body.trim()) return true;
      index = argument.end;
      continue;
    }
    // Characters in text labels are not mathematical structure tokens.
    if (['text', 'textrm', 'textbf', 'textit', 'textsf', 'texttt', 'operatorname'].includes(command.name)) {
      let argumentStart = skipTrivia(latex, index);
      if (latex[argumentStart] === '*') argumentStart = skipTrivia(latex, argumentStart + 1);
      const argument = readGroup(latex, argumentStart);
      if (argument) index = argument.end;
      continue;
    }
    if (!['frac', 'dfrac', 'tfrac', 'sqrt'].includes(command.name)) continue;
    let argumentStart = skipTrivia(latex, index);
    if (command.name === 'sqrt' && latex[argumentStart] === '[') {
      const degree = readGroup(latex, argumentStart, '[', ']');
      if (!degree || isEmptyMathBody(degree.body)) return true;
      argumentStart = degree.end;
    }
    const count = command.name === 'sqrt' ? 1 : 2;
    for (let argumentIndex = 0; argumentIndex < count; argumentIndex++) {
      const argument = readArgument(latex, argumentStart);
      if (!argument || (argument.grouped && isEmptyMathBody(argument.body))) return true;
      argumentStart = argument.end;
    }
    // Continue at the command end to also inspect every nested structure.
  }
  return false;
}

