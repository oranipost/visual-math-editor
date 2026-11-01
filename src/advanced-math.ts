/** Fixed offline notation templates. They insert structures; they never solve or evaluate. */
export interface AdvancedMathTemplate {
  readonly id: string;
  readonly label: string;
  readonly insertLabel: string;
  readonly glyph: string;
  /** MathLive insertion syntax: each #? becomes an editable placeholder. */
  readonly latex: string;
  /** A complete representative formula used for engine and round-trip checks. */
  readonly example: string;
}

export const ADVANCED_MATH_HEADING = '高等数学模板';
export const ADVANCED_MATH_HINT = '点击插入数学结构，再填写方框。这里只编辑公式，不计算或求解。';

export const ADVANCED_MATH_TEMPLATES: readonly AdvancedMathTemplate[] = [
  {
    id: 'limit', label: '极限', insertLabel: '插入极限模板', glyph: 'lim',
    latex: String.raw`\lim_{#?\to #?}#?`,
    example: String.raw`\lim_{x\to0}\frac{\sin x}{x}`,
  },
  {
    id: 'derivative', label: '普通导数', insertLabel: '插入普通导数模板', glyph: 'd/dx',
    latex: String.raw`\frac{\mathrm{d}}{\mathrm{d}#?}#?`,
    example: String.raw`\frac{\mathrm{d}}{\mathrm{d}x}(x^3+2x)`,
  },
  {
    id: 'second-derivative', label: '二阶导数', insertLabel: '插入二阶导数模板', glyph: 'd²/dx²',
    latex: String.raw`\frac{\mathrm{d}^2}{\mathrm{d}#?^2}#?`,
    example: String.raw`\frac{\mathrm{d}^2}{\mathrm{d}x^2}\sin x`,
  },
  {
    id: 'partial-derivative', label: '偏导数', insertLabel: '插入偏导数模板', glyph: '∂/∂x',
    latex: String.raw`\frac{\partial}{\partial #?}#?`,
    example: String.raw`\frac{\partial}{\partial x}(x^2y+y^2)`,
  },
  {
    id: 'double-integral', label: '二重积分', insertLabel: '插入二重积分模板', glyph: '∬',
    latex: String.raw`\iint_{#?}#?\,\mathrm{d}#?\,\mathrm{d}#?`,
    example: String.raw`\iint_{D}(x+y)\,\mathrm{d}x\,\mathrm{d}y`,
  },
  {
    id: 'infinite-series', label: '无穷级数', insertLabel: '插入无穷级数模板', glyph: '∑∞',
    latex: String.raw`\sum_{#?=#?}^{\infty}#?`,
    example: String.raw`\sum_{n=1}^{\infty}\frac{1}{n^2}`,
  },
  {
    id: 'product', label: '连乘积', insertLabel: '插入连乘积模板', glyph: '∏',
    latex: String.raw`\prod_{#?=#?}^{#?}#?`,
    example: String.raw`\prod_{k=1}^{n}(1+a_k)`,
  },
  {
    id: 'vector', label: '向量', insertLabel: '插入向量模板', glyph: 'v⃗',
    latex: String.raw`\vec{#?}`,
    example: String.raw`\vec{v}`,
  },
  {
    id: 'gradient', label: '梯度', insertLabel: '插入梯度模板', glyph: '∇',
    latex: String.raw`\nabla #?`,
    example: String.raw`\nabla f`,
  },
];
