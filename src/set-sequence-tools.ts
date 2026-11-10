/** Fixed, offline notation only: no solver, condition inference, library or history. */
export type SetSequenceGroup = 'sets' | 'relations' | 'sequences';
export interface SetSequenceTool {
  readonly id: string;
  readonly group: SetSequenceGroup;
  readonly label: string;
  readonly insertLabel: string;
  readonly glyph: string;
  /** #? is a MathLive slot; #0 is used only for a literal set's existing selection. */
  readonly template: (selected: boolean) => string;
  readonly example: string;
}
export const SET_SEQUENCE_HEADING = '集合与数列';
export const SET_SEQUENCE_HINT = '点击插入集合或数列记号，填完方框后保存。';
export const SET_SEQUENCE_GROUPS: readonly { readonly id: SetSequenceGroup; readonly label: string; readonly hint?: string }[] = [
  { id: 'sets', label: '集合与常用数集' },
  { id: 'relations', label: '集合关系符号' },
  { id: 'sequences', label: '数列模板' },
];
export const SET_SEQUENCE_TOOLS: readonly SetSequenceTool[] = [
  { id: 'set', group: 'sets', label: '列举集合', insertLabel: '插入集合大括号，可包裹选中内容', glyph: '{…}', template: selected => '\\left\\{' + (selected ? '#0' : '#?') + '\\right\\}', example: '\\left\\{1,2,3\\right\\}' },
  { id: 'set-builder', group: 'sets', label: '集合描述', insertLabel: '插入集合描述，填写变量和条件', glyph: '{x | …}', template: () => '\\left\\{#?\\mid #?\\right\\}', example: '\\left\\{x\\mid x>0\\right\\}' },
  { id: 'natural', group: 'sets', label: '自然数集', insertLabel: '插入自然数集符号', glyph: 'ℕ', template: () => '\\mathbb{N}', example: 'n\\in\\mathbb{N}' },
  { id: 'integers', group: 'sets', label: '整数集', insertLabel: '插入整数集符号', glyph: 'ℤ', template: () => '\\mathbb{Z}', example: '-2\\in\\mathbb{Z}' },
  { id: 'rational', group: 'sets', label: '有理数集', insertLabel: '插入有理数集符号', glyph: 'ℚ', template: () => '\\mathbb{Q}', example: '\\frac{1}{2}\\in\\mathbb{Q}' },
  { id: 'real', group: 'sets', label: '实数集', insertLabel: '插入实数集符号', glyph: 'ℝ', template: () => '\\mathbb{R}', example: '\\sqrt{2}\\in\\mathbb{R}' },
  { id: 'complex', group: 'sets', label: '复数集', insertLabel: '插入复数集符号', glyph: 'ℂ', template: () => '\\mathbb{C}', example: '3+2i\\in\\mathbb{C}' },
  { id: 'in', group: 'relations', label: '属于', insertLabel: '插入属于符号', glyph: '∈', template: () => '\\in ', example: 'x\\in A' },
  { id: 'not-in', group: 'relations', label: '不属于', insertLabel: '插入不属于符号', glyph: '∉', template: () => '\\notin ', example: 'x\\notin A' },
  { id: 'subset', group: 'relations', label: '子集符号 ⊂', insertLabel: '插入子集符号 ⊂', glyph: '⊂', template: () => '\\subset ', example: 'A\\subset B' },
  { id: 'subset-equal', group: 'relations', label: '子集或相等', insertLabel: '插入子集或相等符号', glyph: '⊆', template: () => '\\subseteq ', example: 'A\\subseteq B' },
  { id: 'union', group: 'relations', label: '并集', insertLabel: '插入并集符号', glyph: '∪', template: () => '\\cup ', example: 'A\\cup B' },
  { id: 'intersection', group: 'relations', label: '交集', insertLabel: '插入交集符号', glyph: '∩', template: () => '\\cap ', example: 'A\\cap B' },
  { id: 'empty', group: 'relations', label: '空集', insertLabel: '插入空集符号', glyph: '∅', template: () => '\\varnothing ', example: 'A\\cap B=\\varnothing' },
  { id: 'term', group: 'sequences', label: '数列项', insertLabel: '插入数列项，填写下标', glyph: 'aₙ', template: () => 'a_{#?}', example: 'a_n' },
  { id: 'sequence', group: 'sequences', label: '数列大括号', insertLabel: '插入数列大括号，填写下标', glyph: '{aₙ}', template: () => '\\left\\{a_{#?}\\right\\}', example: '\\left\\{a_n\\right\\}' },
  { id: 'finite', group: 'sequences', label: '有限数列', insertLabel: '插入有限数列，填写末项下标', glyph: 'a₁, …, aₙ', template: () => 'a_1,a_2,\\ldots,a_{#?}', example: 'a_1,a_2,\\ldots,a_n' },
  { id: 'arithmetic', group: 'sequences', label: '等差通项', insertLabel: '插入等差通项，填写首项与公差', glyph: 'aₙ = … + …', template: () => 'a_n=#?+(n-1)\\cdot #?', example: 'a_n=2+(n-1)\\cdot3' },
  { id: 'geometric', group: 'sequences', label: '等比通项', insertLabel: '插入等比通项，填写首项与公比', glyph: 'aₙ = …ⁿ⁻¹', template: () => 'a_n=#?\\cdot #?^{n-1}', example: 'a_n=2\\cdot3^{n-1}' },
];
