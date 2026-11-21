import type { InlineShortcutDefinitions } from 'mathlive';
import { createHtml } from './dom';

export interface GreekToolItem {
  readonly id: string;
  readonly glyph: string;
  readonly label: string;
  readonly name: string;
  readonly latex: string;
  readonly insertLabel: string;
}

export interface GreekToolGroup {
  readonly id: 'lowercase' | 'variants' | 'uppercase';
  readonly heading: string;
  readonly items: readonly GreekToolItem[];
}

export const GREEK_HEADING = 'αβ 希腊字母';
export const GREEK_HINT = '点击插入希腊字母；空格或运算符后输入英文名也可直接转换。';

function makeGreekItem(
  id: string,
  glyph: string,
  label: string,
  name: string,
  latex: string,
): GreekToolItem {
  return {
    id,
    glyph,
    label,
    name,
    latex,
    insertLabel: `插入${name} ${glyph}`,
  };
}

export const GREEK_GROUPS: readonly GreekToolGroup[] = [
  {
    id: 'lowercase',
    heading: '小写字母（α–ω）',
    items: [
      makeGreekItem('alpha', 'α', 'alpha', '阿尔法', '\\alpha '),
      makeGreekItem('beta', 'β', 'beta', '贝塔', '\\beta '),
      makeGreekItem('gamma', 'γ', 'gamma', '伽马', '\\gamma '),
      makeGreekItem('delta', 'δ', 'delta', '德尔塔（小写）', '\\delta '),
      makeGreekItem('epsilon', 'ϵ', 'epsilon', '艾普西隆', '\\epsilon '),
      makeGreekItem('zeta', 'ζ', 'zeta', '泽塔', '\\zeta '),
      makeGreekItem('eta', 'η', 'eta', '伊塔', '\\eta '),
      makeGreekItem('theta', 'θ', 'theta', '西塔', '\\theta '),
      makeGreekItem('iota', 'ι', 'iota', '约塔', '\\iota '),
      makeGreekItem('kappa', 'κ', 'kappa', '卡帕', '\\kappa '),
      makeGreekItem('lambda', 'λ', 'lambda', '拉姆达', '\\lambda '),
      makeGreekItem('mu', 'μ', 'mu', '缪', '\\mu '),
      makeGreekItem('nu', 'ν', 'nu', '纽', '\\nu '),
      makeGreekItem('xi', 'ξ', 'xi', '克西', '\\xi '),
      makeGreekItem('omicron', 'ο', 'omicron', '奥密克戎', 'o'),
      makeGreekItem('pi', 'π', 'pi', '圆周率', '\\pi '),
      makeGreekItem('rho', 'ρ', 'rho', '柔', '\\rho '),
      makeGreekItem('sigma', 'σ', 'sigma', '西格玛', '\\sigma '),
      makeGreekItem('tau', 'τ', 'tau', '陶', '\\tau '),
      makeGreekItem('upsilon', 'υ', 'upsilon', '宇普西隆', '\\upsilon '),
      makeGreekItem('phi', 'ϕ', 'phi', '斐', '\\phi '),
      makeGreekItem('chi', 'χ', 'chi', '卡伊', '\\chi '),
      makeGreekItem('psi', 'ψ', 'psi', '普西', '\\psi '),
      makeGreekItem('omega', 'ω', 'omega', '欧米伽', '\\omega '),
    ],
  },
  {
    id: 'variants',
    heading: '常用变体',
    items: [
      makeGreekItem('varepsilon', 'ε', 'varepsilon', '变体艾普西隆', '\\varepsilon '),
      makeGreekItem('varphi', 'φ', 'varphi', '变体斐', '\\varphi '),
      makeGreekItem('vartheta', 'ϑ', 'vartheta', '变体西塔', '\\vartheta '),
      makeGreekItem('varrho', 'ϱ', 'varrho', '变体柔', '\\varrho '),
      makeGreekItem('varsigma', 'ς', 'varsigma', '词尾西格玛', '\\varsigma '),
      makeGreekItem('varkappa', 'ϰ', 'varkappa', '变体卡帕', '\\varkappa '),
    ],
  },
  {
    id: 'uppercase',
    heading: '大写字母',
    items: [
      makeGreekItem('Gamma', 'Γ', 'Gamma', '大写伽马', '\\Gamma '),
      makeGreekItem('Delta', 'Δ', 'Delta', '大写德尔塔', '\\Delta '),
      makeGreekItem('Theta', 'Θ', 'Theta', '大写西塔', '\\Theta '),
      makeGreekItem('Lambda', 'Λ', 'Lambda', '大写拉姆达', '\\Lambda '),
      makeGreekItem('Xi', 'Ξ', 'Xi', '大写克西', '\\Xi '),
      makeGreekItem('Pi', 'Π', 'Pi', '大写派', '\\Pi '),
      makeGreekItem('Sigma', 'Σ', 'Sigma', '大写西格玛', '\\Sigma '),
      makeGreekItem('Upsilon', 'Υ', 'Upsilon', '大写宇普西隆', '\\Upsilon '),
      makeGreekItem('Phi', 'Φ', 'Phi', '大写斐', '\\Phi '),
      makeGreekItem('Psi', 'Ψ', 'Psi', '大写普西', '\\Psi '),
      makeGreekItem('Omega', 'Ω', 'Omega', '大写欧米伽', '\\Omega '),
    ],
  },
];

export const GREEK_TOOLS: readonly GreekToolItem[] = GREEK_GROUPS.flatMap(group => group.items);

const NON_LETTER_CONTEXT = 'nothing+digit+function+frac+surd+binop+relop+punct+array+openfence+closefence+space+text';

/**
 * Purely local MathLive inline shortcuts for Greek letters, arrows, and relational operators.
 * Short 2-3 letter Greek names that could appear inside Latin words keep a non-letter boundary guard.
 */
export const EDITOR_INLINE_SHORTCUTS: Readonly<InlineShortcutDefinitions> = {
  alpha: '\\alpha',
  beta: '\\beta',
  gamma: '\\gamma',
  delta: '\\delta',
  epsilon: '\\epsilon',
  varepsilon: '\\varepsilon',
  zeta: '\\zeta',
  eta: { after: NON_LETTER_CONTEXT, value: '\\eta' },
  theta: '\\theta',
  vartheta: '\\vartheta',
  iota: '\\iota',
  kappa: '\\kappa',
  varkappa: '\\varkappa',
  lambda: '\\lambda',
  mu: { after: NON_LETTER_CONTEXT, value: '\\mu' },
  nu: { after: NON_LETTER_CONTEXT, value: '\\nu' },
  xi: { after: NON_LETTER_CONTEXT, value: '\\xi' },
  pi: '\\pi',
  rho: { after: NON_LETTER_CONTEXT, value: '\\rho' },
  varrho: '\\varrho',
  sigma: '\\sigma',
  varsigma: '\\varsigma',
  tau: { after: NON_LETTER_CONTEXT, value: '\\tau' },
  upsilon: '\\upsilon',
  phi: { after: NON_LETTER_CONTEXT, value: '\\phi' },
  varphi: '\\varphi',
  chi: '\\chi',
  psi: { after: NON_LETTER_CONTEXT, value: '\\psi' },
  omega: '\\omega',
  Gamma: '\\Gamma',
  Delta: '\\Delta',
  Theta: '\\Theta',
  Lambda: '\\Lambda',
  Xi: { after: NON_LETTER_CONTEXT, value: '\\Xi' },
  Pi: '\\Pi',
  Sigma: '\\Sigma',
  Upsilon: '\\Upsilon',
  Phi: { after: NON_LETTER_CONTEXT, value: '\\Phi' },
  Psi: { after: NON_LETTER_CONTEXT, value: '\\Psi' },
  Omega: '\\Omega',
  '->': '\\to',
  '-->': '\\longrightarrow',
  '<--': '\\longleftarrow',
  '<->': '\\leftrightarrow',
  '=>': '\\Rightarrow',
  '<=>': '\\iff',
  '<=': '\\le',
  '>=': '\\ge',
  '!=': '\\ne',
  '+-': '\\pm',
  '-+': '\\mp',
  '~~': '\\approx',
};

/** Mounts the collapsible full Greek alphabet & variants drawer inside `.vme-secondary-tools`. */
export function mountGreekTools(container: HTMLElement, options: {
  onInsert: (template: string) => void;
}): { destroy: () => void; setDisabled: (disabled: boolean) => void } {
  const doc = container.ownerDocument;
  const root = createHtml('details', doc);
  root.className = 'vme-advanced-math vme-greek-drawer';
  root.dataset.testid = 'greek-tools';

  const summary = createHtml('summary', doc);
  summary.textContent = GREEK_HEADING;

  const hint = createHtml('p', doc);
  hint.className = 'vme-hint';
  hint.textContent = GREEK_HINT;

  let disabled = false;
  let destroyed = false;
  const buttons: HTMLButtonElement[] = [];

  root.append(summary, hint);
  for (const group of GREEK_GROUPS) {
    const section = createHtml('section', doc);
    section.className = 'vme-greek-section';
    section.dataset.group = group.id;

    const heading = createHtml('h4', doc);
    heading.textContent = group.heading;

    const grid = createHtml('div', doc);
    grid.className = 'vme-advanced-math-grid vme-greek-grid';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', group.heading);

    for (const item of group.items) {
      const button = createHtml('button', doc);
      button.type = 'button';
      button.className = 'vme-advanced-math-button vme-greek-button';
      button.dataset.action = `greek-${item.id}`;
      button.title = item.insertLabel;
      button.setAttribute('aria-label', item.insertLabel);

      const glyph = createHtml('span', doc);
      glyph.className = 'vme-advanced-math-glyph';
      glyph.setAttribute('aria-hidden', 'true');
      glyph.dataset.i18nIgnore = '';
      glyph.textContent = item.glyph;

      const label = createHtml('span', doc);
      label.className = 'vme-advanced-math-label';
      label.dataset.i18nIgnore = '';
      label.textContent = item.label;

      button.append(glyph, label);
      button.addEventListener('pointerdown', event => event.preventDefault());
      button.addEventListener('click', () => {
        if (!disabled && !destroyed) options.onInsert(item.latex);
      });
      buttons.push(button);
      grid.append(button);
    }
    section.append(heading, grid);
    root.append(section);
  }

  container.append(root);
  return {
    setDisabled(value) {
      disabled = value;
      for (const button of buttons) button.disabled = value;
    },
    destroy() {
      destroyed = true;
      root.remove();
    },
  };
}
