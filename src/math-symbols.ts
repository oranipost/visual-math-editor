/** Small, fixed notation helpers. They do not evaluate trigonometry or prove geometry. */
export interface MathSymbolTool {
  id: string;
  label: string;
  glyph: string;
  insertLabel: string;
  template: (selected: boolean) => string;
  example: string;
}
export const MATH_SYMBOLS_HEADING = '三角函数与几何符号';
export const MATH_SYMBOLS_HINT = '函数可填写方框或套用选中内容。相似 ∼、全等 ≅、角 ∠、三角形 △ 和直角 90° 含义不同。';
export const MATH_SYMBOL_TOOLS: readonly MathSymbolTool[] = [
  { id: 'sin', label: '正弦', glyph: 'sin( )', insertLabel: '插入正弦函数', template: selected => `\\sin\\left(${selected ? '#0' : '#?'}\\right)`, example: String.raw`\sin\left(x\right)` },
  { id: 'cos', label: '余弦', glyph: 'cos( )', insertLabel: '插入余弦函数', template: selected => `\\cos\\left(${selected ? '#0' : '#?'}\\right)`, example: String.raw`\cos\left(x\right)` },
  { id: 'tan', label: '正切', glyph: 'tan( )', insertLabel: '插入正切函数', template: selected => `\\tan\\left(${selected ? '#0' : '#?'}\\right)`, example: String.raw`\tan\left(x\right)` },
  { id: 'similar', label: '相似', glyph: '∼', insertLabel: '插入相似符号', template: () => String.raw`\sim `, example: String.raw`\triangle ABC\sim\triangle DEF` },
  { id: 'congruent', label: '全等', glyph: '≅', insertLabel: '插入全等符号', template: () => String.raw`\cong `, example: String.raw`\triangle ABC\cong\triangle DEF` },
  { id: 'angle', label: '角', glyph: '∠', insertLabel: '插入角符号', template: () => String.raw`\angle `, example: String.raw`\angle ABC` },
  { id: 'triangle', label: '三角形', glyph: '△', insertLabel: '插入三角形符号', template: () => String.raw`\triangle `, example: String.raw`\triangle ABC` },
  // MathLive 0.111.1 does not support \\rightangle. Use unambiguous, editable 90° notation.
  { id: 'right-angle', label: '直角', glyph: '90°', insertLabel: '插入直角 90°', template: () => String.raw`90^{\circ}`, example: String.raw`\angle ABC=90^{\circ}` },
];
