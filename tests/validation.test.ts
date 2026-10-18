import assert from 'node:assert/strict';
import test from 'node:test';
import { hasIncompleteSlots } from '../src/validation';

test('rejects unfinished fractions, including deleted nested numerators and denominators', () => {
  for (const latex of [
    String.raw`\frac{}{2}`, String.raw`\frac{1}{}`, String.raw`\dfrac{ }{2}`,
    String.raw`\tfrac{1}{ { } }`, String.raw`\frac{\frac{}{2}}{3}`,
    String.raw`\frac{1}{\frac{2}{}}`, String.raw`\frac{1}{\, }`, String.raw`\frac{1}`,
  ]) assert.equal(hasIncompleteSlots(latex), true, latex);
});

test('rejects empty square root, nth-root radicand, and nth-root degree', () => {
  for (const latex of [
    String.raw`\sqrt{}`, String.raw`\sqrt[3]{}`, String.raw`\sqrt[]{2}`,
    String.raw`\sqrt[ { } ]{2}`, String.raw`\sqrt[\frac{1}{}]{2}`,
    String.raw`\frac{1}{\sqrt{}}`, String.raw`\sqrt`,
  ]) assert.equal(hasIncompleteSlots(latex), true, latex);
});

test('rejects empty scripts and limits on sums and integrals', () => {
  for (const latex of [
    'x^{}', 'x_{ }', 'x^{ { } }', String.raw`\sum_{}^{n}x`,
    String.raw`\sum_{i=1}^{}x`, String.raw`\int_{}^1 x\,dx`,
    String.raw`\int_0^{ } x\,dx`, 'x^',
  ]) assert.equal(hasIncompleteSlots(latex), true, latex);
});

test('rejects MathLive placeholders wherever they appear', () => {
  for (const latex of [
    String.raw`\placeholder{}`, String.raw`\frac{1}{\placeholder{}}`,
    String.raw`\sqrt[\placeholder{}]{2}`, String.raw`\sum_{i=1}^{2}\placeholder{}`,
  ]) assert.equal(hasIncompleteSlots(latex), true, latex);
});

test('allows complete nested structures and normal unbraced TeX arguments', () => {
  for (const latex of [
    String.raw`\frac{\sqrt{x^2+1}}{\frac{2}{3}}`, String.raw`\sqrt[3]{x}`,
    String.raw`\sqrt[{a[b]}]{x}`, String.raw`\frac12`, String.raw`\sqrt2`,
    String.raw`\sum_{i=1}^{n}i`, String.raw`\int_0^1 x^2\,\mathrm{d}x`,
    String.raw`x_1+x^{n+1}`, String.raw`\int f(x)\,dx`,
  ]) assert.equal(hasIncompleteSlots(latex), false, latex);
});

test('allows harmless empty groups, spacing, escaped structural characters, and text', () => {
  for (const latex of [
    String.raw`a\,{}b`, String.raw`{}x`, String.raw`x{}^2`,
    String.raw`\text{literal _{} and ^{}}+1`, String.raw`\operatorname*{lim}_{x\to0}x`,
    String.raw`\_{}+\^{}`, String.raw`\frac{\{x\}}{2}`, String.raw`\frac{\%}{2}`,
  ]) assert.equal(hasIncompleteSlots(latex), false, latex);
});

test('handles TeX comments without counting braces or commands inside them', () => {
  assert.equal(hasIncompleteSlots('x % \\sqrt{}\n+1'), false);
  assert.equal(hasIncompleteSlots('\\frac{1}{% only comment\n}'), true);
  assert.equal(hasIncompleteSlots('\\frac{1}{% comment }\n2}'), false);
});

test('science notation uses mhchem rules while surrounding math slots remain checked', () => {
  for (const latex of [
    String.raw`\ce{CaCO3 ->[\Delta] CaO + CO2 ^}`,
    String.raw`\ce{Ag+ + Cl- -> AgCl v}`,
    String.raw`\pu{9.81 m/s^2}`, String.raw`\ce{^{14}_{6}C}`,
  ]) assert.equal(hasIncompleteSlots(latex), false, latex);
  for (const latex of [
    String.raw`\ce{}`, String.raw`\pu{ }`, String.raw`\ce{H2O}+x^{}`,
    String.raw`\frac{\ce{H2O}}{}`, String.raw`\pu{1 N}+\sqrt{}`,
  ]) assert.equal(hasIncompleteSlots(latex), true, latex);
});
