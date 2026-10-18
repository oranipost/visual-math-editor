import assert from 'node:assert/strict';
import test from 'node:test';
import { checkReaction, REACTION_LIMITS } from '../src/reaction-check';

test('unbalanced water has exact atom differences and an opt-in integer suggestion', () => {
  const result = checkReaction('H2 + O2 -> H2O');
  assert.equal(result.status, 'unbalanced');
  assert.equal(result.canBalance, true);
  assert.equal(result.suggestion, '2H2 + O2 -> 2H2O');
  assert.deepEqual(result.differences, [{ element: 'O', left: '2', right: '1' }]);
  assert.equal(checkReaction(result.suggestion!).status, 'balanced');
});

test('balanced ratios need not be reduced and checking never rewrites input', () => {
  for (const input of ['2H2+O2->2H2O', '4H2 + 2O2 -> 4H2O', 'N2 + 3H2 <=> 2NH3']) {
    const result = checkReaction(input);
    assert.equal(result.status, 'balanced', input);
    assert.equal(result.canBalance, true, input);
    assert.equal(result.suggestion, undefined, input);
    assert.deepEqual(result.differences, [], input);
  }
});

test('fractional nullspace ratios reduce to smallest whole numbers', () => {
  for (const [input, suggestion] of [
    ['C2H6 + O2 -> CO2 + H2O', '2C2H6 + 7O2 -> 4CO2 + 6H2O'],
    ['KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2', '2KMnO4 + 16HCl -> 2KCl + 2MnCl2 + 8H2O + 5Cl2'],
    ['Al + O2 -> Al2O3', '4Al + 3O2 -> 2Al2O3'],
    ['NH3 <- N2 + H2', '2NH3 <- N2 + 3H2'],
    ['CO2 + H2O → C6H12O6 + O2', '6CO2 + 6H2O → C6H12O6 + 6O2'],
  ]) {
    const result = checkReaction(input!);
    assert.equal(result.status, 'unbalanced', input);
    assert.equal(result.suggestion, suggestion, input);
    assert.equal(checkReaction(suggestion!).status, 'balanced', suggestion);
  }
});

test('suggestions change only coefficient digits and preserve source spelling and spaces', () => {
  for (const [input, expected] of [
    ['H2+O2->H2O', '2H2+O2->2H2O'],
    ['  H2(g)  +\t O2(g) ⇌ H2O(l)  ', '  2H2(g)  +\t O2(g) ⇌ 2H2O(l)  '],
    ['2 H2+2 O2->2 H2O', '2 H2+1 O2->2 H2O'],
    ['Ag+ + 2Cl- -> 2[AgCl2]-', 'Ag+ + 2Cl- -> 1[AgCl2]-'],
    ['Fe^{2+}  ->  2Fe^{3+}+e^{-}', 'Fe^{2+}  ->  1Fe^{3+}+e^{-}'],
  ]) {
    const result = checkReaction(input!);
    assert.equal(result.suggestion, expected, input);
    assert.equal(checkReaction(result.suggestion!).status, 'balanced', expected);
  }
});

test('groups, chemical bonds, states and hydration are fully counted', () => {
  for (const input of [
    'Ca(OH)2 + 2HCl(aq) -> CaCl2(aq) + 2H2O(l)',
    'CuSO4*5H2O(s) -> CuSO4(s) + 5H2O(g)',
    'CuSO4.5H2O -> CuSO4 + 5H2O',
    'CuSO4·5H2O -> CuSO4 + 5H2O',
    'K4[Fe(CN)6] -> 4K + Fe + 6C + 6N',
    'CH3-CH2-OH + 3O2 -> 2CO2 + 3H2O',
    'N#N + 3H-H -> 2NH3',
    '2H_{2} + O_2 -> 2H_2O',
  ]) assert.equal(checkReaction(input).status, 'balanced', input);
  assert.equal(checkReaction('Ca(OH)2 + HCl -> CaCl2 + H2O').suggestion, 'Ca(OH)2 + 2HCl -> CaCl2 + 2H2O');
});

test('explicit ions and electrons conserve both atoms and charge', () => {
  for (const input of [
    'Fe^2+ -> Fe^3+ + e-',
    'Fe^{2+}->Fe^{3+}+e^{-}',
    'H+ + OH- -> H2O',
    'NH4+ + OH- -> NH3 + H2O',
    'Fe(aq)^2+ -> Fe^3+(aq) + e^-',
    '[AgCl2]- -> Ag+ + 2Cl-',
  ]) assert.equal(checkReaction(input).status, 'balanced', input);
  const redox = checkReaction('MnO4^- + H+ + e- -> Mn^2+ + H2O');
  assert.equal(redox.suggestion, 'MnO4^- + 8H+ + 5e- -> Mn^2+ + 4H2O');
  assert.equal(checkReaction(redox.suggestion!).status, 'balanced');
  const chargeMismatch = checkReaction('Fe^2+ -> Fe^3+');
  assert.equal(chargeMismatch.status, 'impossible');
  assert.deepEqual(chargeMismatch.differences, [{ element: 'charge', left: '2', right: '3' }]);
});

test('impossible means no positive coefficients for every listed species', () => {
  for (const input of [
    'H2 -> H2O', 'H2 -> H2 + O2', 'H2 + O2 -> H2', 'H2O -> H2O2',
    // All element rows contain both signs, but the unique null vector has a
    // negative coefficient in one case and a zero coefficient in the other.
    'H2O + H2 -> H2O2', 'H2 + H2O -> H2O',
  ]) {
    const result = checkReaction(input);
    assert.equal(result.status, 'impossible', input);
    assert.equal(result.canBalance, false, input);
    assert.equal(result.suggestion, undefined, input);
  }
  assert.equal(checkReaction('H2 + O2 -> H2 + O3').status, 'indeterminate');
});

test('multiple free coefficients remain indeterminate unless already balanced', () => {
  const result = checkReaction('H2 + O2 -> H2O + H2O2');
  assert.equal(result.status, 'indeterminate');
  assert.equal(result.reason, 'multiple-solutions');
  assert.equal(result.canBalance, undefined);
  assert.equal(result.suggestion, undefined);
  assert.equal(checkReaction('3H2 + 2O2 -> 2H2O + H2O2').status, 'balanced');
});

test('unfamiliar mhchem notation is advisory unsupported instead of silently ignored', () => {
  for (const input of [
    'Fe2+ -> Fe3+ + e-', 'O2- -> O2-',
    'H2 ->[heat] H2', 'H2 ->[H2] H2',
    '^{14}_{6}C -> ^{14}_{7}N + e-', 'D2 + O2 -> D2O',
    'H2 -> H2 -> H2', 'A + B -> AB', 'hello -> hello',
    'Na(x) -> Na(x)', 'H2O(aq)(g) -> H2O(aq)(g)',
    'H2 + O2 -> H2O extra', 'H2 + O2 -> H2O % comment',
    'C l + H -> HCl', 'H 2 -> H2', 'Fe ^{2 +} -> Fe^2+',
    'H - H -> H2', 'H = H -> H2', 'NaCl v -> NaCl', 'CO2 ^ -> CO2',
    String.raw`H2 + O2 -> \text{water}`, String.raw`H2 -> \ce{H2}`,
    'C_x -> C_x', 'Fe^{III} -> Fe^{III}', 'NO^* -> NO^*',
    '0H2 -> H2', '01H2 -> H2', '0.5O2 -> O', '1/2O2 -> O',
    'H0 -> H0', 'H_{} -> H', 'H{2} -> H2', 'H2 + -> H2',
    'H2( -> H2', 'H2] -> H2', 'H--H -> H2', 'H- -> H2',
  ]) {
    const result = checkReaction(input);
    // H- is a valid hydride ion; its reaction can be proved impossible by charge conservation.
    if (input === 'H- -> H2') assert.equal(result.status, 'impossible');
    else assert.equal(result.status, 'unsupported', input);
    assert.equal(result.suggestion, undefined, input);
  }
  assert.equal(checkReaction('V -> V').status, 'balanced');
});

test('single formulas do not receive a misleading reaction verdict', () => {
  for (const input of ['', 'H2O', 'CH3-CH2-OH', '1 m/s2', 'any prose']) {
    assert.equal(checkReaction(input).status, 'not-reaction', input);
  }
});

test('input and work bounds prevent unbounded parsing or arithmetic', () => {
  for (const input of [
    `H2 -> ${'H'.repeat(REACTION_LIMITS.inputLength)}`,
    `${Array.from({ length: REACTION_LIMITS.species }, () => 'H2').join(' + ')} -> H2`,
    `${'('.repeat(REACTION_LIMITS.groupDepth + 1)}H${')'.repeat(REACTION_LIMITS.groupDepth + 1)} -> H`,
    '1000001H2 -> H2', 'H1000001 -> H2',
    '((H1000000)1000000)1000000 -> H2',
  ]) {
    const result = checkReaction(input);
    assert.equal(result.status, 'unsupported', input.slice(0, 100));
    assert.equal(result.reason, 'limit', input.slice(0, 100));
  }
  // A large coprime ratio is known to exist, but is deliberately not offered as a huge edit.
  const large = checkReaction('H999983 + O999979 -> H2O');
  assert.equal(large.status, 'unbalanced');
  assert.equal(large.canBalance, true);
  assert.equal(large.reason, 'limit');
  assert.equal(large.suggestion, undefined);

  // Dense, large rational matrices exhaust a deterministic operation budget.
  // No wall-clock timeout or probabilistic classification is involved.
  const symbols = ['H', 'C', 'N', 'O', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'K'];
  let seed = 473;
  const terms = Array.from({ length: 24 }, () => symbols.map((symbol) => {
    seed = (seed * 48271) % 2147483647;
    return `${symbol}${100000 + seed % 899999}`;
  }).join(''));
  const dense = checkReaction(`${terms.slice(0, 12).join(' + ')} -> ${terms.slice(12).join(' + ')}`);
  assert.equal(dense.status, 'indeterminate');
  assert.equal(dense.reason, 'limit');
  assert.equal(dense.canBalance, undefined);
});

test('every generated conservation suggestion checks balanced after applying it', () => {
  // Different hydrocarbon counts exercise fractional reduction rather than mirrored constants.
  for (let carbon = 1; carbon <= 10; carbon++) {
    for (const hydrogen of [2, 4, 6, 8, 10]) {
      const input = `C${carbon === 1 ? '' : carbon}H${hydrogen} + O2 -> CO2 + H2O`;
      const result = checkReaction(input);
      assert.equal(result.status, 'unbalanced', input);
      assert.ok(result.suggestion, input);
      assert.equal(checkReaction(result.suggestion!).status, 'balanced', result.suggestion);
    }
  }
});
