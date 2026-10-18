import { convertLatexToMarkup, validateLatex } from 'mathlive';
import { validateLatexSource } from './source-validation';

export interface ElementInfo {
  number: number;
  symbol: string;
  name: string;
  group: number;
  period: number;
}

/** Identity fields checked against https://ciaaw.org/atomic-weights.htm on 2026-10-18.
 * This is our own data/layout, not a reproduction of the IUPAC table artwork.
 * f-block elements retain their actual period; group 3 is a layout anchor only.
 */
const ELEMENT_IDENTITIES = `
1|H|hydrogen
2|He|helium
3|Li|lithium
4|Be|beryllium
5|B|boron
6|C|carbon
7|N|nitrogen
8|O|oxygen
9|F|fluorine
10|Ne|neon
11|Na|sodium
12|Mg|magnesium
13|Al|aluminium
14|Si|silicon
15|P|phosphorus
16|S|sulfur
17|Cl|chlorine
18|Ar|argon
19|K|potassium
20|Ca|calcium
21|Sc|scandium
22|Ti|titanium
23|V|vanadium
24|Cr|chromium
25|Mn|manganese
26|Fe|iron
27|Co|cobalt
28|Ni|nickel
29|Cu|copper
30|Zn|zinc
31|Ga|gallium
32|Ge|germanium
33|As|arsenic
34|Se|selenium
35|Br|bromine
36|Kr|krypton
37|Rb|rubidium
38|Sr|strontium
39|Y|yttrium
40|Zr|zirconium
41|Nb|niobium
42|Mo|molybdenum
43|Tc|technetium
44|Ru|ruthenium
45|Rh|rhodium
46|Pd|palladium
47|Ag|silver
48|Cd|cadmium
49|In|indium
50|Sn|tin
51|Sb|antimony
52|Te|tellurium
53|I|iodine
54|Xe|xenon
55|Cs|caesium
56|Ba|barium
57|La|lanthanum
58|Ce|cerium
59|Pr|praseodymium
60|Nd|neodymium
61|Pm|promethium
62|Sm|samarium
63|Eu|europium
64|Gd|gadolinium
65|Tb|terbium
66|Dy|dysprosium
67|Ho|holmium
68|Er|erbium
69|Tm|thulium
70|Yb|ytterbium
71|Lu|lutetium
72|Hf|hafnium
73|Ta|tantalum
74|W|tungsten
75|Re|rhenium
76|Os|osmium
77|Ir|iridium
78|Pt|platinum
79|Au|gold
80|Hg|mercury
81|Tl|thallium
82|Pb|lead
83|Bi|bismuth
84|Po|polonium
85|At|astatine
86|Rn|radon
87|Fr|francium
88|Ra|radium
89|Ac|actinium
90|Th|thorium
91|Pa|protactinium
92|U|uranium
93|Np|neptunium
94|Pu|plutonium
95|Am|americium
96|Cm|curium
97|Bk|berkelium
98|Cf|californium
99|Es|einsteinium
100|Fm|fermium
101|Md|mendelevium
102|No|nobelium
103|Lr|lawrencium
104|Rf|rutherfordium
105|Db|dubnium
106|Sg|seaborgium
107|Bh|bohrium
108|Hs|hassium
109|Mt|meitnerium
110|Ds|darmstadtium
111|Rg|roentgenium
112|Cn|copernicium
113|Nh|nihonium
114|Fl|flerovium
115|Mc|moscovium
116|Lv|livermorium
117|Ts|tennessine
118|Og|oganesson
`.trim();

function elementPosition(number: number): { group: number; period: number } {
  if (number === 1) return { period: 1, group: 1 };
  if (number === 2) return { period: 1, group: 18 };
  if (number <= 10) return { period: 2, group: number <= 4 ? number - 2 : number + 8 };
  if (number <= 18) return { period: 3, group: number <= 12 ? number - 10 : number };
  if (number <= 36) return { period: 4, group: number - 18 };
  if (number <= 54) return { period: 5, group: number - 36 };
  if (number <= 56) return { period: 6, group: number - 54 };
  if (number <= 71) return { period: 6, group: 3 };
  if (number <= 86) return { period: 6, group: number - 68 };
  if (number <= 88) return { period: 7, group: number - 86 };
  if (number <= 103) return { period: 7, group: 3 };
  return { period: 7, group: number - 100 };
}

export const PERIODIC_ELEMENTS: ElementInfo[] = ELEMENT_IDENTITIES.split('\n').map((line) => {
  const [atomicNumber, symbol, name] = line.split('|');
  const number = Number(atomicNumber);
  return { number, symbol, name, ...elementPosition(number) };
});

export const CHEMISTRY_TEMPLATES: { id: string; label: string; input: string }[] = [
  { id: 'water', label: '水 H₂O', input: 'H2O' },
  { id: 'carbon-dioxide', label: '二氧化碳 CO₂', input: 'CO2' },
  { id: 'sulfate', label: '硫酸根 SO₄²⁻', input: 'SO4^2-' },
  { id: 'isotope', label: '碳-14 同位素', input: '^{14}_{6}C' },
  { id: 'single-bond', label: '单键 H—H', input: 'H-H' },
  { id: 'double-bond', label: '双键 O=O', input: 'O=O' },
  { id: 'triple-bond', label: '三键 N≡N', input: 'N#N' },
  { id: 'ethanol', label: '乙醇结构式', input: 'CH3-CH2-OH' },
  { id: 'water-reaction', label: '氢气与氧气反应', input: '2H2 + O2 -> 2H2O' },
  { id: 'equilibrium', label: '合成氨可逆反应', input: 'N2 + 3H2 <=> 2NH3' },
  { id: 'heated-reaction', label: '加热反应', input: String.raw`CaCO3 ->[\Delta] CaO + CO2 ^` },
  { id: 'precipitate', label: '沉淀反应', input: 'Ag+ + Cl- -> AgCl v' },
];

export const PHYSICS_TEMPLATES: { id: string; label: string; latex: string }[] = [
  { id: 'force', label: '牛顿第二定律', latex: String.raw`\vec{F}=m\vec{a}` },
  { id: 'vector', label: '速度向量', latex: String.raw`\vec{v}` },
  { id: 'gradient', label: '梯度 ∇f', latex: String.raw`\nabla f` },
  { id: 'divergence', label: '散度 ∇·E', latex: String.raw`\nabla\cdot\vec{E}` },
  { id: 'curl', label: '旋度 ∇×B', latex: String.raw`\nabla\times\vec{B}` },
  { id: 'partial', label: '偏导数', latex: String.raw`\frac{\partial f}{\partial t}` },
  { id: 'hbar', label: '约化普朗克常量 ℏ', latex: String.raw`\hbar` },
  { id: 'greek', label: '希腊字母', latex: String.raw`\alpha\quad\beta\quad\gamma\quad\omega` },
  { id: 'sigma', label: '标准差 σ', latex: String.raw`\sigma` },
  { id: 'angle', label: '角度 θ', latex: String.raw`\theta` },
  { id: 'degrees', label: '30 度', latex: String.raw`30^{\circ}` },
  { id: 'ohm-law', label: '欧姆定律', latex: 'V=IR' },
];

export const UNIT_PRESETS: { id: string; label: string; input: string }[] = [
  { id: 'acceleration', label: '加速度 m/s²', input: '9.81 m/s2' },
  { id: 'metre', label: '米 m', input: '1 m' },
  { id: 'second', label: '秒 s', input: '1 s' },
  { id: 'kilogram', label: '千克 kg', input: '1 kg' },
  { id: 'newton', label: '牛顿 N', input: '1 N' },
  { id: 'pascal', label: '帕斯卡 Pa', input: '1 Pa' },
  { id: 'joule', label: '焦耳 J', input: '1 J' },
  { id: 'watt', label: '瓦特 W', input: '1 W' },
  { id: 'coulomb', label: '库仑 C', input: '1 C' },
  { id: 'volt', label: '伏特 V', input: '1 V' },
  { id: 'ohm', label: '欧姆 Ω', input: String.raw`1 \Omega` },
  { id: 'hertz', label: '赫兹 Hz', input: '1 Hz' },
  { id: 'kelvin', label: '开尔文 K', input: '1 K' },
  { id: 'mole', label: '摩尔 mol', input: '1 mol' },
];

const SCIENCE_COMMANDS = new Set([
  'bond', 'ce', 'pu', 'mathrm', 'text', 'frac', 'overset', 'underset', 'underbrace',
  'pm', 'approx', 'times', 'cdot', 'infty', 'circ', 'ca',
  'rightarrow', 'leftarrow', 'leftrightarrow', 'rightleftharpoons', 'uparrow', 'downarrow', 'equiv',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa',
  'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma', 'tau', 'upsilon',
  'phi', 'chi', 'psi', 'omega', 'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi',
  'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega',
]);
const BOND_KINDS = new Set(['-', '1', '=', '2', '#', '3', '~', '~-', '~=', '~--', '-~-', '...', '....', '->', '<-', '<', '>']);

function validateScienceInput(input: string, kind: 'chemistry' | 'units'): string {
  const source = input.trim();
  if (!source) throw new Error(kind === 'chemistry' ? '请先填写化学式或反应式。' : '请先填写数值和单位。');
  if (source.length > 4096) throw new Error('内容过长，请缩短到 4096 个字符以内。');
  // Reject nonprinting input before it reaches the notation parser.
  // eslint-disable-next-line no-control-regex -- Deliberately recognize unsafe control characters.
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(source)) throw new Error('请移除不可见的控制字符。');
  const structuralError = validateLatexSource(source);
  if (structuralError) throw new Error(structuralError);
  if (/(?<!\\)_\s*$/.test(source) || (kind === 'units' ? /(?<!\\)\^\s*$/ : /[^\s\\]\^\s*$/).test(source)) {
    throw new Error('上下标尚未填写完整，请补全后再插入。');
  }
  // MathLive's inner mhchem parser can silently ignore unknown commands, so the
  // simple input helper accepts an explicit set instead of discarding a typo.
  for (const match of source.matchAll(/\\([A-Za-z]+|[\s\S])/g)) {
    const command = match[1];
    if (/^[A-Za-z]+$/.test(command) && !SCIENCE_COMMANDS.has(command)) {
      throw new Error(`此输入框暂不支持命令 \\${command}，请使用常用化学符号或单位。`);
    }
    if (!/^[A-Za-z]+$/.test(command) && !['{', '}', '%', '_', ',', ';', ':', '!', ' '].includes(command)) {
      throw new Error('反斜杠后的内容不受支持，请检查输入。');
    }
    if (command === 'bond') {
      const tail = source.slice(match.index + match[0].length);
      const bond = /^\{([^{}]*)\}/.exec(tail);
      if (!bond || !BOND_KINDS.has(bond[1])) {
        throw new Error('化学键格式无效，请使用单键、双键、三键按钮，或 \\bond{1}、\\bond{2}、\\bond{3}。');
      }
    }
  }
  return source;
}

function buildScienceLatex(input: string, kind: 'chemistry' | 'units'): string {
  const source = validateScienceInput(input, kind);
  const latex = `\\${kind === 'chemistry' ? 'ce' : 'pu'}{${source}}`;
  let errors;
  let markup: string;
  try {
    errors = validateLatex(latex);
    // The outer validator does not return syntax errors from mhchem's nested
    // parseLatex calls. Detect their error boxes before inserting the atom.
    markup = convertLatexToMarkup(latex);
  } catch {
    // mhchem throws arrays for some malformed input; never expose its internals
    // or let a live-preview keystroke crash the editor.
    throw new Error('暂时无法排版，请检查化学键、括号、上下标或单位格式。');
  }
  if (errors.length > 0 || /\bclass=["'][^"']*\bML__error\b/.test(markup)) {
    throw new Error('暂时无法排版，请检查符号和命令是否完整。');
  }
  return latex;
}

/** Checks safe, supported notation only; does not balance or validate chemistry. */
export function buildChemicalLatex(input: string): string {
  return buildScienceLatex(input, 'chemistry');
}

/** Formats a full quantity such as "9.81 m/s2"; does not convert or check units. */
export function buildUnitLatex(input: string): string {
  return buildScienceLatex(input, 'units');
}

/** Recognize one entire science atom, without accepting trailing formula content. */
export function extractSingleScience(latex: string): { kind: 'chemistry' | 'units'; input: string } | null {
  const source = latex.trim();
  const opening = /^\\(ce|pu)\s*\{/.exec(source);
  if (!opening) return null;
  const start = opening[0].length;
  let depth = 1;
  for (let index = start; index < source.length; index++) {
    if (source[index] === '\\') { index++; continue; }
    if (source[index] === '{') depth++;
    if (source[index] !== '}') continue;
    depth--;
    if (depth === 0) {
      if (index !== source.length - 1) return null;
      return { kind: opening[1] === 'ce' ? 'chemistry' : 'units', input: source.slice(start, index) };
    }
  }
  return null;
}
