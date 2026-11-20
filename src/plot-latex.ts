import { convertLatexToAsciiMath, validateLatex } from 'mathlive/ssr';
import { compileExpression, parsePlotAst, type PlotFunctionName, type PlotNode, type PlotSpec, type PlotVariable } from './plot-engine';
import { hasIncompleteSlots } from './validation';
import { validateLatexSource } from './source-validation';

const ALLOWED_LATEX_COMMANDS = new Set([
  'frac', 'dfrac', 'tfrac', 'sqrt', 'left', 'right', 'lvert', 'rvert', 'mid',
  'cdot', 'times', 'div',
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
  'arcsin', 'arccos', 'arctan', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh',
  'arsinh', 'arcosh', 'artanh', 'asinh', 'acosh', 'atanh', 'arcsinh', 'arccosh', 'arctanh',
  'ln', 'log', 'exp', 'pi', 'theta',
  'operatorname', 'exponentialE', 'differentialD', 'mathrm',
]);

const FUNCTION_MACROS = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
  'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh',
  'arsinh', 'arcosh', 'artanh',
  'ln', 'log', 'exp',
]);

const OPERATORNAME_INVERSE_HYPERBOLIC: Readonly<Record<string, string>> = {
  arsinh: '\\arsinh',
  asinh: '\\arsinh',
  arcsinh: '\\arsinh',
  arcosh: '\\arcosh',
  acosh: '\\arcosh',
  arccosh: '\\arcosh',
  artanh: '\\artanh',
  atanh: '\\artanh',
  arctanh: '\\artanh',
};

const FUNCTION_LATEX_NAMES: Readonly<Record<Exclude<PlotFunctionName, 'sqrt' | 'abs'>, string>> = {
  sin: '\\sin',
  cos: '\\cos',
  tan: '\\tan',
  sec: '\\sec',
  csc: '\\csc',
  cot: '\\cot',
  asin: '\\arcsin',
  acos: '\\arccos',
  atan: '\\arctan',
  sinh: '\\sinh',
  cosh: '\\cosh',
  tanh: '\\tanh',
  asinh: '\\arsinh',
  acosh: '\\arcosh',
  atanh: '\\artanh',
  ln: '\\ln',
  log: '\\log',
  exp: '\\exp',
};

function commandAt(source: string, start: number): { name: string; end: number } {
  let end = start + 1;
  if (/[A-Za-z]/.test(source[end] ?? '')) {
    while (/[A-Za-z]/.test(source[end] ?? '')) end++;
  } else if (end < source.length) {
    end++;
  }
  return { name: source.slice(start + 1, end), end };
}

function skipWhitespace(source: string, start: number): number {
  let pos = start;
  while (pos < source.length && /\s/.test(source[pos])) pos++;
  return pos;
}

function skipMathSpacing(source: string, start: number): number {
  let pos = start;
  while (pos < source.length) {
    if (/\s/.test(source[pos])) { pos++; continue; }
    if (source[pos] === '\\') {
      const cmd = commandAt(source, pos);
      if ([',', ';', '!', ' ', ':'].includes(cmd.name)) {
        pos = cmd.end;
        continue;
      }
    }
    break;
  }
  return pos;
}

function readBalancedGroup(source: string, start: number, open = '{', close = '}'): { body: string; end: number } {
  if (source[start] !== open) throw new Error('Complete the formula first.');
  let depth = 1;
  let braces = 0;
  for (let i = start + 1; i < source.length; i++) {
    if (source[i] === '\\') {
      i = commandAt(source, i).end - 1;
      continue;
    }
    if (open === '[') {
      if (source[i] === '{') braces++;
      else if (source[i] === '}') braces--;
      if (braces !== 0) continue;
    }
    if (source[i] === open) depth++;
    else if (source[i] === close) depth--;
    if (depth === 0) return { body: source.slice(start + 1, i), end: i + 1 };
  }
  throw new Error('Complete the formula first.');
}

function readTexArg(source: string, start: number): { body: string; end: number } {
  const pos = skipWhitespace(source, start);
  if (pos >= source.length || source[pos] === '}' || source[pos] === ']') {
    throw new Error('Complete the formula first.');
  }
  if (source[pos] === '{') return readBalancedGroup(source, pos, '{', '}');
  if (source[pos] === '\\') {
    const cmd = commandAt(source, pos);
    return { body: source.slice(pos, cmd.end), end: cmd.end };
  }
  return { body: source[pos], end: pos + 1 };
}

function readLeftRightParen(source: string, start: number): { body: string; end: number } | null {
  if (!source.startsWith('\\left', start)) return null;
  const afterLeft = commandAt(source, start);
  if (afterLeft.name !== 'left') return null;
  const openPos = skipWhitespace(source, afterLeft.end);
  if (source[openPos] !== '(') return null;
  let depth = 1;
  let braces = 0;
  for (let i = openPos + 1; i < source.length; i++) {
    if (source[i] === '{') { braces++; continue; }
    if (source[i] === '}') { braces = Math.max(0, braces - 1); continue; }
    if (source[i] === '\\') {
      const cmd = commandAt(source, i);
      if (braces === 0 && cmd.name === 'left') {
        const dPos = skipWhitespace(source, cmd.end);
        if (dPos < source.length) {
          depth++;
          i = (source[dPos] === '\\' ? commandAt(source, dPos).end : dPos + 1) - 1;
          continue;
        }
      }
      if (braces === 0 && cmd.name === 'right') {
        const dPos = skipWhitespace(source, cmd.end);
        if (dPos >= source.length) throw new Error('Complete the formula first.');
        depth--;
        const afterDelim = source[dPos] === '\\' ? commandAt(source, dPos).end : dPos + 1;
        if (depth === 0) {
          if (source[dPos] !== ')') throw new Error('Complete the formula first.');
          return { body: source.slice(openPos + 1, i), end: afterDelim };
        }
        i = afterDelim - 1;
        continue;
      }
      i = cmd.end - 1;
    }
  }
  throw new Error('Complete the formula first.');
}

function readLeftRightBar(source: string, start: number): { raw: string; body: string; end: number } | null {
  if (source[start] === '|') {
    let braces = 0;
    let parens = 0;
    for (let i = start + 1; i < source.length; i++) {
      if (source[i] === '\\') { i = commandAt(source, i).end - 1; continue; }
      if (source[i] === '{') braces++;
      else if (source[i] === '}') braces = Math.max(0, braces - 1);
      else if (source[i] === '(') parens++;
      else if (source[i] === ')') parens = Math.max(0, parens - 1);
      else if (source[i] === '|' && braces === 0 && parens === 0) {
        return { raw: source.slice(start, i + 1), body: source.slice(start + 1, i), end: i + 1 };
      }
    }
    throw new Error('Complete the formula first.');
  }
  if (source[start] !== '\\') return null;
  const first = commandAt(source, start);
  if (first.name === 'lvert') {
    let depth = 1;
    for (let i = first.end; i < source.length; i++) {
      if (source[i] === '\\') {
        const cmd = commandAt(source, i);
        if (cmd.name === 'lvert') depth++;
        else if (cmd.name === 'rvert') {
          depth--;
          if (depth === 0) return { raw: source.slice(start, cmd.end), body: source.slice(first.end, i), end: cmd.end };
        }
        i = cmd.end - 1;
      }
    }
    throw new Error('Complete the formula first.');
  }
  if (first.name === 'left') {
    const dPos = skipWhitespace(source, first.end);
    let bodyStart = -1;
    if (source[dPos] === '|') bodyStart = dPos + 1;
    else if (source[dPos] === '\\' && commandAt(source, dPos).name === 'lvert') bodyStart = commandAt(source, dPos).end;
    if (bodyStart === -1) return null;
    let depth = 1;
    for (let i = bodyStart; i < source.length; i++) {
      if (source[i] === '\\') {
        const cmd = commandAt(source, i);
        if (cmd.name === 'left') {
          const nextD = skipWhitespace(source, cmd.end);
          depth++;
          i = (source[nextD] === '\\' ? commandAt(source, nextD).end : nextD + 1) - 1;
          continue;
        }
        if (cmd.name === 'right') {
          const nextD = skipWhitespace(source, cmd.end);
          if (nextD >= source.length) throw new Error('Complete the formula first.');
          depth--;
          const afterDelim = source[nextD] === '\\' ? commandAt(source, nextD).end : nextD + 1;
          if (depth === 0) {
            return { raw: source.slice(start, afterDelim), body: source.slice(bodyStart, i), end: afterDelim };
          }
          i = afterDelim - 1;
          continue;
        }
        i = cmd.end - 1;
      }
    }
    throw new Error('Complete the formula first.');
  }
  return null;
}

/** Normalize MathLive inline-shortcut macros (\operatorname{arsinh|arcosh|artanh}, \exponentialE, \differentialD). */
function preprocessMathLiveMacros(source: string): string {
  let out = '';
  for (let i = 0; i < source.length;) {
    if (source[i] === '{') {
      const grp = readBalancedGroup(source, i, '{', '}');
      out += `{${preprocessMathLiveMacros(grp.body)}}`;
      i = grp.end;
      continue;
    }
    if (source[i] !== '\\') {
      out += source[i++];
      continue;
    }
    const cmd = commandAt(source, i);
    if (cmd.name === 'operatorname') {
      let argPos = skipWhitespace(source, cmd.end);
      if (source[argPos] === '*') argPos = skipWhitespace(source, argPos + 1);
      const grp = readBalancedGroup(source, argPos, '{', '}');
      const mapped = OPERATORNAME_INVERSE_HYPERBOLIC[grp.body.trim()];
      if (!mapped) throw new Error('This formula contains unsupported notation.');
      out += mapped;
      i = grp.end;
      continue;
    }
    if (cmd.name === 'mathrm') {
      const argPos = skipWhitespace(source, cmd.end);
      const grp = readBalancedGroup(source, argPos, '{', '}');
      const inner = grp.body.trim();
      if (inner === 'e') out += (/[A-Za-z0-9]$/.test(out) ? ' e' : 'e');
      else if (inner === 'd') out += (/[A-Za-z0-9]$/.test(out) ? ' d' : 'd');
      else throw new Error('This formula contains unsupported notation.');
      i = grp.end;
      continue;
    }
    if (cmd.name === 'exponentialE') {
      out += /[A-Za-z0-9]$/.test(out) ? ' e' : 'e';
      i = cmd.end;
      continue;
    }
    if (cmd.name === 'differentialD') {
      out += /[A-Za-z0-9]$/.test(out) ? ' d' : 'd';
      i = cmd.end;
      continue;
    }
    out += source.slice(i, cmd.end);
    i = cmd.end;
  }
  return out;
}

/** Rewrite \sqrt[n]{x} into \left(\left(x\right)^{\frac{1}{n}}\right) so odd roots keep their negative real branch. */
function rewriteNthRoots(source: string): string {
  let out = '';
  for (let i = 0; i < source.length;) {
    if (source[i] === '{') {
      const grp = readBalancedGroup(source, i, '{', '}');
      out += `{${rewriteNthRoots(grp.body)}}`;
      i = grp.end;
      continue;
    }
    if (source[i] === '\\') {
      const cmd = commandAt(source, i);
      if (cmd.name === 'sqrt') {
        const afterSqrt = skipWhitespace(source, cmd.end);
        if (source[afterSqrt] === '[') {
          const degGrp = readBalancedGroup(source, afterSqrt, '[', ']');
          const degreeRaw = degGrp.body.trim();
          if (!degreeRaw) throw new Error('Complete the formula first.');
          if (/^[+-]?0+(?:\.0+)?$/.test(degreeRaw)) throw new Error('Use a supported y = f(x) expression.');
          const radArg = readTexArg(source, degGrp.end);
          const radRaw = radArg.body.trim();
          if (!radRaw) throw new Error('Complete the formula first.');
          const deg = rewriteNthRoots(degreeRaw);
          const rad = rewriteNthRoots(radRaw);
          out += `\\left(\\left(${rad}\\right)^{\\frac{1}{${deg}}}\\right)`;
          i = radArg.end;
          continue;
        }
      }
      out += source.slice(i, cmd.end);
      i = cmd.end;
      continue;
    }
    out += source[i++];
  }
  return out;
}

function normalizeLatexForPlot(latex: string): {
  normalized: string;
  allowPlainAbs: boolean;
  allowPlainSqrt: boolean;
} {
  const allowPlainAbs = /(?:^|[^\\A-Za-z])abs\s*(?:\\left\s*)?\(/.test(latex);
  const allowPlainSqrt = /(?:^|[^\\A-Za-z])sqrt\s*(?:\\left\s*)?\(/.test(latex);
  const normalized = latex
    .replace(/\\(asin|acos|atan)\b/g, (_, fn: string) => `\\arc${fn.slice(1)}`)
    .replace(/\\(?:asinh|arcsinh)\b/g, '\\arsinh')
    .replace(/\\(?:acosh|arccosh)\b/g, '\\arcosh')
    .replace(/\\(?:atanh|arctanh)\b/g, '\\artanh')
    .replace(/\\(sin|cos|tan)\s*\^\s*(?:\{\s*-1\s*\}|\(\s*-1\s*\))/g, '\\arc$1')
    .replace(/\\(sinh|cosh|tanh)\s*\^\s*(?:\{\s*-1\s*\}|\(\s*-1\s*\))/g, '\\ar$1')
    .replace(/(^|[^\\A-Za-z])(arcsinh|arccosh|arctanh|arsinh|arcosh|artanh|asinh|acosh|atanh)(?=\s*(?:\\left\s*)?\()/g,
      (_, prefix: string, fn: string) => `${prefix}\\ar${fn.replace(/^(?:arc|ar|a)/, '')}`)
    .replace(/(^|[^\\A-Za-z])(arcsin|arccos|arctan|asin|acos|atan)(?=\s*(?:\\left\s*)?\()/g,
      (_, prefix: string, fn: string) => `${prefix}\\arc${fn.replace(/^(?:arc|a)/, '')}`)
    .replace(/(^|[^\\A-Za-z])(sinh|cosh|tanh|sec|csc|cot|sin|cos|tan|ln|log|exp)(?=\s*(?:\\left\s*)?\()/g, '$1\\$2')
    .replace(/(^|[^\\A-Za-z])(theta|pi)(?![A-Za-z])/g, '$1\\$2');
  return { normalized, allowPlainAbs, allowPlainSqrt };
}

function consumeTrailingPower(source: string, start: number): { tex: string; end: number } {
  let pos = skipWhitespace(source, start);
  if (source[pos] !== '^') return { tex: '', end: start };
  const expArg = readTexArg(source, pos + 1);
  if (!expArg.body.trim()) throw new Error('Complete the formula first.');
  const rewrittenExp = rewritePlotFunctions(expArg.body);
  const chained = consumeTrailingPower(source, expArg.end);
  return { tex: `^{${rewrittenExp}}${chained.tex}`, end: chained.end };
}

function parseFunctionCallAt(source: string, cmdStart: number): { tex: string; end: number } {
  const cmd = commandAt(source, cmdStart);
  const fn = cmd.name;
  let pos = cmd.end;
  let logBase: string | undefined;
  let fnPower: string | undefined;

  // Optional \log_{b} and/or ^{k} in either order (e.g. \log_{2}(x), \log_2^2 x, \sin^2 x)
  for (let step = 0; step < 2; step++) {
    const next = skipWhitespace(source, pos);
    if (fn === 'log' && logBase === undefined && source[next] === '_') {
      const baseArg = readTexArg(source, next + 1);
      if (!baseArg.body.trim()) throw new Error('Complete the formula first.');
      logBase = rewritePlotFunctions(baseArg.body);
      pos = baseArg.end;
      continue;
    }
    if (fnPower === undefined && source[next] === '^') {
      const expArg = readTexArg(source, next + 1);
      if (!expArg.body.trim()) throw new Error('Complete the formula first.');
      fnPower = rewritePlotFunctions(expArg.body);
      pos = expArg.end;
      continue;
    }
    break;
  }

  pos = skipMathSpacing(source, pos);
  let argLatex: string;

  const lrParen = readLeftRightParen(source, pos);
  if (lrParen) {
    if (!lrParen.body.trim()) throw new Error('Complete the formula first.');
    argLatex = rewritePlotFunctions(lrParen.body);
    pos = lrParen.end;
  } else if (source[pos] === '(') {
    const paren = readBalancedGroup(source, pos, '(', ')');
    if (!paren.body.trim()) throw new Error('Complete the formula first.');
    argLatex = rewritePlotFunctions(paren.body);
    pos = paren.end;
  } else {
    // Unparenthesized unary argument (e.g. \sin x, \sin 2x, \sin^2 x, \ln |x|, \ln \sin x)
    let argBuf = '';
    if (source[pos] === '+' || source[pos] === '-') {
      argBuf += source[pos++];
    }
    let factorCount = 0;
    while (pos < source.length) {
      const scan = skipMathSpacing(source, pos);
      if (scan >= source.length) break;
      const ch = source[scan];
      if ('+-*/=)}]'.includes(ch)) break;

      const barGroup = readLeftRightBar(source, scan);
      if (barGroup) {
        const openDelim = barGroup.raw.startsWith('\\left')
          ? '\\left|'
          : barGroup.raw.startsWith('\\lvert')
            ? '\\lvert '
            : '|';
        const closeDelim = barGroup.raw.startsWith('\\left')
          ? '\\right|'
          : barGroup.raw.startsWith('\\lvert')
            ? ' \\rvert'
            : '|';
        const inner = rewritePlotFunctions(barGroup.body);
        const pwr = consumeTrailingPower(source, barGroup.end);
        argBuf += `${openDelim}${inner}${closeDelim}${pwr.tex}`;
        pos = pwr.end;
        factorCount++;
        continue;
      }

      if (ch === '{') {
        const grp = readBalancedGroup(source, scan, '{', '}');
        const pwr = consumeTrailingPower(source, grp.end);
        argBuf += `{${rewritePlotFunctions(grp.body)}}${pwr.tex}`;
        pos = pwr.end;
        factorCount++;
        continue;
      }

      if (ch === '\\') {
        const subCmd = commandAt(source, scan);
        if (['cdot', 'times', 'div', 'right', 'rvert', 'mid', 'left'].includes(subCmd.name)) break;
        if (FUNCTION_MACROS.has(subCmd.name)) {
          if (factorCount > 0) break;
          const nested = parseFunctionCallAt(source, scan);
          argBuf += nested.tex;
          pos = nested.end;
          factorCount++;
          break;
        }
        if (subCmd.name === 'frac' || subCmd.name === 'dfrac' || subCmd.name === 'tfrac') {
          const num = readTexArg(source, subCmd.end);
          const den = readTexArg(source, num.end);
          const pwr = consumeTrailingPower(source, den.end);
          argBuf += `\\${subCmd.name}{${rewritePlotFunctions(num.body)}}{${rewritePlotFunctions(den.body)}}${pwr.tex}`;
          pos = pwr.end;
          factorCount++;
          continue;
        }
        if (subCmd.name === 'sqrt') {
          const rad = readTexArg(source, subCmd.end);
          const pwr = consumeTrailingPower(source, rad.end);
          argBuf += `\\sqrt{${rewritePlotFunctions(rad.body)}}${pwr.tex}`;
          pos = pwr.end;
          factorCount++;
          continue;
        }
        if (subCmd.name === 'pi' || subCmd.name === 'theta') {
          const pwr = consumeTrailingPower(source, subCmd.end);
          argBuf += `${ argBuf && /[A-Za-z]$/.test(argBuf) ? ' ' : '' }\\${subCmd.name}${pwr.tex}`;
          pos = pwr.end;
          factorCount++;
          continue;
        }
        break;
      }

      if (/[0-9.]/.test(ch)) {
        const numMatch = /^(?:\d+(?:\.\d*)?|\.\d+)/.exec(source.slice(scan));
        if (!numMatch) break;
        const afterNum = scan + numMatch[0].length;
        const pwr = consumeTrailingPower(source, afterNum);
        argBuf += `${argBuf && /[0-9.]$/.test(argBuf) ? ' ' : ''}${numMatch[0]}${pwr.tex}`;
        pos = pwr.end;
        factorCount++;
        continue;
      }

      if (/[A-Za-z]/.test(ch)) {
        const wordMatch = /^[A-Za-z]+/.exec(source.slice(scan))!;
        const afterWord = scan + wordMatch[0].length;
        const pwr = consumeTrailingPower(source, afterWord);
        argBuf += `${argBuf && /\\[A-Za-z]+$/.test(argBuf) ? ' ' : ''}${wordMatch[0]}${pwr.tex}`;
        pos = pwr.end;
        factorCount++;
        continue;
      }

      break;
    }

    if (factorCount === 0 || !argBuf.trim()) {
      throw new Error('Complete the formula first.');
    }
    argLatex = argBuf;
  }

  const baseCall = fn === 'log' && logBase !== undefined
    ? `\\left(\\frac{\\ln\\left(${argLatex}\\right)}{\\ln\\left(${logBase}\\right)}\\right)`
    : `\\${fn}\\left(${argLatex}\\right)`;
  const fullCall = fnPower !== undefined ? `\\left(${baseCall}\\right)^{${fnPower}}` : baseCall;
  return { tex: fullCall, end: pos };
}

function rewritePlotFunctions(source: string): string {
  let out = '';
  for (let i = 0; i < source.length;) {
    if (source[i] === '{') {
      const grp = readBalancedGroup(source, i, '{', '}');
      out += `{${rewritePlotFunctions(grp.body)}}`;
      i = grp.end;
      continue;
    }
    if (source[i] === '(') {
      const grp = readBalancedGroup(source, i, '(', ')');
      out += `(${rewritePlotFunctions(grp.body)})`;
      i = grp.end;
      continue;
    }
    if (source[i] === '\\') {
      const lrParen = readLeftRightParen(source, i);
      if (lrParen) {
        out += `\\left(${rewritePlotFunctions(lrParen.body)}\\right)`;
        i = lrParen.end;
        continue;
      }
      const cmd = commandAt(source, i);
      if (FUNCTION_MACROS.has(cmd.name)) {
        const parsedCall = parseFunctionCallAt(source, i);
        out += parsedCall.tex;
        i = parsedCall.end;
        continue;
      }
      out += source.slice(i, cmd.end);
      i = cmd.end;
      continue;
    }
    out += source[i++];
  }
  return out;
}

function convertBarsToAbs(ascii: string): string {
  if (!ascii.includes('|')) return ascii;
  const openAtDepth = [0];
  let expectingOperand = true;
  let result = '';
  for (let i = 0; i < ascii.length; i++) {
    const ch = ascii[i];
    if (/\s/.test(ch)) {
      result += ch;
      continue;
    }
    if (ch === '(') {
      result += '(';
      openAtDepth.push(0);
      expectingOperand = true;
    } else if (ch === ')') {
      const unclosed = openAtDepth.pop();
      if (unclosed !== 0 || openAtDepth.length === 0) throw new Error('Complete the formula first.');
      result += ')';
      expectingOperand = false;
    } else if (ch === '|') {
      const depth = openAtDepth.length - 1;
      if (expectingOperand || openAtDepth[depth] === 0) {
        result += 'abs(';
        openAtDepth[depth]++;
        expectingOperand = true;
      } else {
        result += ')';
        openAtDepth[depth]--;
        expectingOperand = false;
      }
    } else if ('+-*/^='.includes(ch)) {
      result += ch;
      expectingOperand = true;
    } else {
      result += ch;
      expectingOperand = false;
    }
  }
  if (openAtDepth.length !== 1 || openAtDepth[0] !== 0) {
    throw new Error('Complete the formula first.');
  }
  return result;
}

function tidyAsciiExpression(ascii: string): string {
  return ascii
    .replace(/(?<![A-Za-z])(sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|asin|acos|atan|sinh|cosh|tanh|arsinh|arcosh|artanh|asinh|acosh|atanh|sqrt|abs|ln|log|exp)\s+\(/g, '$1(')
    .replace(/(^|[+\-=(]\s*)\((\d+(?:\.\d+)?|x|y|theta|pi|e)\)\s*(?=\/)/g, '$1$2')
    .replace(/\/\s*\((\d+(?:\.\d+)?|x|y|theta|pi|e)\)(?=$|\s*[+\-*/)])/g, '/$1')
    .replace(/\^\s*\((\d+(?:\.\d+)?|x|y|theta|pi|e)\)(?=$|\s*[+\-*/)])/g, '^$1')
    .replace(/(^|[+\-*/=(]\s*)\(abs\(([^()]+)\)\)(?=$|\s*[+\-*/)])/g, '$1abs($2)');
}

/** Reject unfamiliar TeX before conversion: a converter may silently drop commands. */
export function graphFromLatex(
  latex: string,
  defaultMode?: 'function' | 'polar' | 'surface',
): Pick<PlotSpec, 'mode' | 'expression'> {
  if (!latex.trim() || latex.length > 1024 || /[%&#<>`]/.test(latex)) {
    throw new Error('Use a supported y = f(x) expression.');
  }
  if (validateLatexSource(latex) || hasIncompleteSlots(latex)) {
    throw new Error('Complete the formula first.');
  }
  for (const command of latex.matchAll(/\\([A-Za-z]+|.)/g)) {
    if (!ALLOWED_LATEX_COMMANDS.has(command[1]) && ![',', '!', ';', ' ', ':'].includes(command[1])) {
      throw new Error('This formula contains unsupported notation.');
    }
  }
  const macroNormalized = preprocessMathLiveMacros(latex);
  const rootExpanded = rewriteNthRoots(macroNormalized);
  const { normalized, allowPlainAbs, allowPlainSqrt } = normalizeLatexForPlot(rootExpanded);
  const structured = rewritePlotFunctions(normalized);
  if (/[[\]_]/.test(structured)) {
    throw new Error('Use a supported y = f(x) expression.');
  }
  if (validateLatex(structured).length) throw new Error('Complete the formula first.');
  const delimiterIsolated = structured
    .replace(/\\left\s*(?:\\lvert|\|)/g, '\\left(|')
    .replace(/\\right\s*(?:\\rvert|\|)/g, '|\\right)')
    .replace(/\\lvert\b/g, '(|')
    .replace(/\\rvert\b/g, '|)')
    .replace(/\\mid\b/g, '|');
  let expression = convertLatexToAsciiMath(delimiterIsolated).trim();
  if (allowPlainAbs) expression = expression.replace(/\ba\s+b\s+s(?=\s*\()/g, 'abs');
  if (allowPlainSqrt) expression = expression.replace(/\bs\s+q\s+r\s+t(?=\s*\()/g, 'sqrt');
  expression = tidyAsciiExpression(convertBarsToAbs(expression));

  let mode: 'function' | 'polar' | 'surface';
  if (defaultMode) {
    mode = defaultMode;
    if (mode === 'polar') expression = expression.replace(/^r\s*=\s*/, '');
    else if (mode === 'surface') expression = expression.replace(/^z\s*=\s*/, '');
  } else {
    mode = /^r\s*=/.test(expression) ? 'polar' : /^z\s*=/.test(expression) ? 'surface' : 'function';
    if (mode !== 'function') expression = expression.replace(/^[rz]\s*=\s*/, '');
  }
  const variables: readonly PlotVariable[] = mode === 'surface' ? ['x', 'y'] : mode === 'polar' ? ['theta'] : ['x'];
  const compiled = compileExpression(expression, variables);
  if (!compiled.ok) throw new Error(compiled.error);
  // Use the same normalized expression as the renderer (including removal of
  // an optional y= prefix), so equation/graph commit checks compare like values.
  return { mode, expression: compiled.expression };
}

/** Backward-compatible normalized expression accessor. */
export function expressionFromLatex(latex: string): string {
  return graphFromLatex(latex).expression;
}

function inferVariablesForExpression(expression: string, mode?: PlotSpec['mode']): readonly PlotVariable[] {
  if (mode === 'complex' || mode === 'geometry') throw new Error('Unsupported graph mode.');
  if (mode === 'surface') return ['x', 'y'];
  if (mode === 'polar') return ['theta'];
  if (mode === 'function') return ['x'];
  const trimmed = expression.trim();
  if (/^r\s*=/.test(trimmed) || /\btheta\b|θ/.test(trimmed)) return ['theta'];
  if (/^z\s*=/.test(trimmed) || /\by\b/.test(trimmed.replace(/^y\s*=\s*/, ''))) return ['x', 'y'];
  return ['x'];
}

function formatNumberNode(node: Extract<PlotNode, { type: 'number' }>, parentPrec: number): string {
  if (node.constant === 'pi') return '\\pi';
  if (node.constant === 'e') return 'e';
  const raw = String(node.value);
  if (/[eE]/.test(raw)) {
    const [mantissa, rawExp] = raw.split(/[eE]/);
    const cleanExp = rawExp.replace(/^\+/, '');
    const sci = mantissa === '1' ? `10^{${cleanExp}}` : `${mantissa}\\cdot 10^{${cleanExp}}`;
    return parentPrec >= 3 && mantissa !== '1' ? `\\left(${sci}\\right)` : sci;
  }
  return raw;
}

function formatPlotNode(node: PlotNode, parentPrec: number, rightOfSum = false): string {
  switch (node.type) {
    case 'number':
      return formatNumberNode(node, parentPrec);
    case 'variable':
      return node.name === 'theta' ? '\\theta' : node.name;
    case 'function': {
      let call: string;
      if (node.name === 'sqrt') {
        call = `\\sqrt{${formatPlotNode(node.child, 0)}}`;
      } else if (node.name === 'abs') {
        call = `\\left|${formatPlotNode(node.child, 0)}\\right|`;
      } else {
        call = `${FUNCTION_LATEX_NAMES[node.name]}\\left(${formatPlotNode(node.child, 0)}\\right)`;
      }
      return parentPrec >= 4 ? `\\left(${call}\\right)` : call;
    }
    case 'unary': {
      const sign = node.negative ? '-' : '+';
      const inner = formatPlotNode(node.child, 3);
      const rendered = `${sign}${inner}`;
      return parentPrec >= 2 || rightOfSum ? `\\left(${rendered}\\right)` : rendered;
    }
    case 'binary': {
      if (node.op === '+' || node.op === '-') {
        const left = formatPlotNode(node.left, 1);
        const right = formatPlotNode(node.right, node.op === '-' ? 2 : 1, true);
        const sum = `${left}${node.op}${right}`;
        return parentPrec > 1 ? `\\left(${sum}\\right)` : sum;
      }
      if (node.op === '/') {
        if (node.left.type === 'unary' && node.left.negative) {
          const negFrac = `-\\frac{${formatPlotNode(node.left.child, 0)}}{${formatPlotNode(node.right, 0)}}`;
          return parentPrec >= 2 || rightOfSum ? `\\left(${negFrac}\\right)` : negFrac;
        }
        const frac = `\\frac{${formatPlotNode(node.left, 0)}}{${formatPlotNode(node.right, 0)}}`;
        return parentPrec >= 4 ? `\\left(${frac}\\right)` : frac;
      }
      if (node.op === '*') {
        const left = formatPlotNode(node.left, 2);
        const right = formatPlotNode(node.right, 2);
        const separator = /^[0-9.]/.test(right)
          ? '\\cdot '
          : /\\[A-Za-z]+$/.test(left) && /^[A-Za-z]/.test(right)
            ? ' '
            : '';
        const product = `${left}${separator}${right}`;
        return parentPrec > 2 ? `\\left(${product}\\right)` : product;
      }
      if (node.op === '^') {
        const base = formatPlotNode(node.left, 4);
        const exp = formatPlotNode(node.right, 0);
        const power = `${base}^{${exp}}`;
        return parentPrec >= 4 ? `\\left(${power}\\right)` : power;
      }
      throw new Error('Unsupported operator.');
    }
  }
}

/** Convert a plot-engine expression into idiomatic 2D LaTeX using the parser AST. */
export function latexFromPlotExpression(expression: string, mode?: PlotSpec['mode']): string {
  const variables = inferVariablesForExpression(expression, mode);
  const parsed = parsePlotAst(expression, variables);
  if (!parsed.ok) throw new Error(parsed.error);
  return formatPlotNode(parsed.root, 0);
}

/** Non-throwing helper for syncing potentially incomplete raw expressions into a 2D field. */
export function tryLatexFromPlotExpression(expression: string, mode?: PlotSpec['mode']): string | undefined {
  if (!expression.trim()) return '';
  try {
    return latexFromPlotExpression(expression, mode);
  } catch {
    return undefined;
  }
}
