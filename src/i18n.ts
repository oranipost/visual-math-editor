import { SPANISH_ELEMENT_NAMES, SPANISH_TRANSLATIONS } from './i18n-es';

export type Language = 'system' | 'zh' | 'en' | 'es';
export type ResolvedLanguage = 'zh' | 'en' | 'es';

export function resolveLanguage(language: Language, systemLanguage = 'en'): ResolvedLanguage {
  if (language === 'zh' || language === 'en' || language === 'es') return language;
  // The host passes Obsidian's configured language. Unknown saved preferences
  // and unsupported app locales use the same predictable English fallback.
  if (language !== 'system') return 'en';
  const locale = systemLanguage.trim();
  if (/^zh(?:[-_]|$)/i.test(locale)) return 'zh';
  return /^es(?:[-_]|$)/i.test(locale) ? 'es' : 'en';
}

/** UI messages only. Formula source, note content and input values are never translated. */
export const UI_TRANSLATIONS: Readonly<Record<string, string>> = {
  '界面语言 / Interface language': 'Interface language',
  '示例：x^2, sin(x), 1/x': 'Examples: x^2, sin(x), 1/x',
  '跟随 Obsidian': 'Follow Obsidian', '跟随 Obsidian / Follow Obsidian': 'Follow Obsidian',
  '系统 / System': 'System',
  '无法保存语言偏好 / Unable to save language preference': 'Unable to save language preference',
  '图像': 'Graph', '复平面': 'Complex plane', '函数图像': 'Function graph', '图像类型': 'Graph type',
  '公式位置无效，请重新打开编辑器。': 'The equation position is invalid. Reopen the editor.',
  '此位置位于表格、列表或引用块。第一版请使用行内公式，或到普通空白段落插入独立公式。': 'This position is inside a table, list or quote. Use an inline equation here, or insert a display equation in an ordinary blank paragraph.',
  '表格内暂不支持含竖线的复杂环境，请在表格外编辑这个公式。': 'Complex environments containing vertical bars are not supported in tables yet. Edit this equation outside the table.',
  '修改只在保存图像后写入笔记。': 'Changes reach the note only when you save the graph.',
  '插入图像时，也会保存当前已完成的公式草稿。': 'Inserting a graph also saves your current completed equation draft.',
  '函数 y = f(x)': 'Function y = f(x)', '复数（每行一个）': 'Complex numbers (one per line)',
  '使用当前公式': 'Use current equation', '坐标范围': 'Axis ranges',
  '预览图像': 'Preview graph', '保存图像': 'Save graph', '插入图像': 'Insert graph',
  '＋ 放大': '＋ Zoom in', '− 缩小': '− Zoom out', '适应所有点': 'Fit all points',
  '填写函数后点击预览图像。': 'Enter an expression, then choose Preview graph.',
  '当前公式暂不能转换为单变量函数。请在此输入 y = f(x) 形式。': 'This equation cannot be converted to a function of x yet. Enter it here as y = f(x).',
  '用普通写法输入，例如 x^2、2x + 1、sqrt(x)。': 'Use plain notation, for example x^2, 2x + 1 or sqrt(x).',
  '在图内拖动平移、滚轮或双指缩放；保存图像后才保留新视图。': 'Drag within the graph to pan; scroll or pinch to zoom. Save the graph to keep the new view.',
  '离线绘制单变量函数；三角函数采用弧度，图线为数值近似。': 'Plot functions of x offline. Trigonometric functions use radians; curves are numerical approximations.',
  '此预览页面可以画图；在 Obsidian 中可将图像插入笔记。': 'You can draw graphs in this preview. In Obsidian, you can insert them into a note.',
  '输入已修改，请重新预览。': 'The input changed. Preview it again.',
  '图像已就绪。点击保存图像更新笔记。': 'The graph is ready. Choose Save graph to update the note.',
  '图像已就绪。点击插入图像加入笔记。': 'The graph is ready. Choose Insert graph to add it to the note.',
  '输入 a+bi，例如 3+2i、−i、4；每行一个，最多 20 个点。': 'Enter a+bi, for example 3+2i, −i or 4. Use one number per line, up to 20 points.',
  'Re 为实轴、Im 为虚轴，两轴每单位长度相同；暂不计算复数表达式。': 'Re is the real axis and Im is the imaginary axis, with equal unit lengths. Complex expressions are not evaluated yet.',
  '正在插入图像…': 'Inserting graph…', '图像已插入笔记。': 'The graph was inserted into the note.',
  '请先完成或清空当前公式，再插入图像。绘图输入和预览仍保留。': 'Finish or clear the current equation before inserting a graph. Your graph input and preview are preserved.',
  '未能插入图像，输入和预览仍保留，请重试。': 'The graph could not be inserted. Your input and preview are preserved. Try again.',
  '未能保存或打开图像，视图草稿已暂存。可用“恢复公式草稿”命令在正文新位置继续；重启前请保存。': 'The graph could not be saved or opened. Its view draft is stored temporarily. Use Recover equation draft at a new position in ordinary note text; save before restarting.',
  '图像视图未能保存或打开。请重新打开图像再调整；已有恢复草稿已保留。': 'The graph view could not be saved or opened. Reopen the graph and adjust it again. Your existing recovery draft has been preserved.',
  '图像所在的视图已关闭或切换。请重新打开原笔记后重试。': 'The graph view was closed or switched. Reopen the original note and try again.',
  '图像操作': 'Graph controls', '放大': 'Zoom in', '缩小': 'Zoom out', '重置视图': 'Reset view', '保存视图': 'Save view', '复数列表': 'Complex numbers',
  '此范围暂时无法显示图像，请调整范围或重置视图。': 'The graph cannot be displayed in this range. Adjust the range or reset the view.',
  '视图已调整，尚未保存。点击“保存视图”更新笔记。': 'This view is not saved yet. Choose Save view to update the note.',
  '拖动移动，滚动或双指缩放。调整后点击“保存视图”。': 'Drag to pan; scroll or pinch to zoom. Choose Save view to keep changes.',
  '请先完成或取消当前公式草稿，再保存或编辑图像。': 'Finish or cancel the current equation draft before saving or editing a graph.',
  '请先关闭当前公式窗口，再保存或编辑图像。': 'Close the current equation dialog before saving or editing a graph.',
  '视图已保存到笔记，可使用撤销恢复。': 'The view was saved to the note. Undo can restore it.',
  '未能保存或打开图像。当前视图仍保留，请重新打开原笔记后重试。': 'The graph could not be saved or opened. The current view is preserved; reopen the original note and try again.',
  '编辑图像': 'Edit graph',
  '无法打开图像，请重新打开原笔记后重试。': 'Unable to open the graph. Reopen the original note and try again.',
  '请先打开图像所在的原笔记。': 'Open the original note containing this graph first.',
  '图像位置暂时无法确认，请重新打开笔记。': 'The graph location could not be confirmed. Reopen the note.',
  '图像配置无效或超出支持范围，原文已保留。': 'Graph settings are invalid or unsupported. The original text is preserved.',
  '请在主窗口的笔记编辑模式中重新打开图像。': 'Reopen this graph in the main window note editor.',
  '＋ 在笔记末尾插入公式': '＋ Insert an equation at the end of this note',
  '这篇笔记还没有公式，点击上方按钮开始。': 'This note has no equations yet. Use the button above to begin.',
  '悬停或聚焦元素查看质量与电子排布；点击加入化学输入框。': 'Hover or focus an element for its mass and electron configuration; click to add it to chemistry.',
  '标准原子量': 'Standard atomic weight', '同位素质量数': 'Isotope mass number',
  '电子排布': 'Electron configuration', '各电子层电子数': 'Electrons per shell',
  '理论预测': 'Predicted', '计算值': 'Calculated', '数据来源': 'Sources',
  '方括号内为同位素质量数，不是标准原子量。': 'Brackets indicate an isotope mass number, not a standard atomic weight.',
  '电子排布为理论预测。': 'Electron configuration is predicted.',
  '电子排布为计算值。': 'Electron configuration is calculated.',
  '区间表示天然同位素组成造成的标准原子量变化。': 'The interval reflects variation in natural isotopic composition.',
  '编辑公式': 'Edit equation', '插入公式': 'Insert equation',
  '选择熟悉的方式，写下你的公式。': 'Choose a familiar way to write your equation.',
  '本地离线': 'Offline', '公式在本机编辑，无需账号或网络': 'Edit locally. No account or network required.',
  '公式编辑模式': 'Equation editing mode', '直接编辑排版后的公式': 'Edit the typeset equation directly',
  '编辑公式源码': 'Edit equation source', '源码与可视化双向同步': 'Source and visual editing stay in sync',
  '学科工具': 'Subject tools', '数学': 'Math', '化学': 'Chemistry', '物理': 'Physics', '单位': 'Units', '元素表': 'Elements',
  '公式结构': 'Equation structures', '选择结构': 'Choose a structure',
  '分数': 'fraction', '平方根': 'square root', 'n 次根': 'nth root', '上标': 'superscript', '下标': 'subscript',
  '积分': 'integral', '求和': 'sum', '括号': 'parentheses',
  '可视化数学公式编辑区': 'Visual equation editor', 'LaTeX 源码': 'LaTeX source', 'LaTeX 公式源码': 'LaTeX equation source',
  '只输入公式内容，不需要外层 $ 或 $$。': 'Enter only the equation, without outer $ or $$ delimiters.',
  '常用符号': 'Common symbols', '希腊字母和运算符': 'Greek letters and operators',
  '阿尔法': 'alpha', '贝塔': 'beta', '西塔': 'theta', '圆周率': 'pi', '德尔塔': 'delta',
  '无穷大': 'infinity', '正负号': 'plus or minus', '乘号': 'multiplication', '除号': 'division',
  '不等于': 'not equal', '小于或等于': 'less than or equal', '大于或等于': 'greater than or equal',
  '你的公式': 'Your equation', '可视化编辑': 'Visual editing', '编辑历史': 'Edit history',
  '撤销': 'Undo', '重做': 'Redo', '清空': 'Clear', '清空当前公式': 'Clear equation',
  '清空当前公式；可用撤销恢复': 'Clear equation; Undo can restore it',
  '常用运算与间距': 'Operators and spacing', '加号': 'plus', '减号': 'minus', '等号': 'equals', '薄空格': 'thin space', '间距': 'Space',
  '点击方框填写；用 Tab 或方向键移动。': 'Fill the boxes; move with Tab or the arrow keys.',
  '← 上一空格': '← Previous slot', '下一空格 →': 'Next slot →', '公式末尾 →': 'Equation end →',
  '跳到整条公式的末尾，继续输入': 'Move to the end of the equation to continue typing',
  '跳到上一个待填写的方框': 'Go to the previous empty slot', '跳到下一个待填写的方框': 'Go to the next empty slot',
  '在笔记中的显示方式': 'Display in note', '公式显示方式': 'Equation display', '行内公式': 'Inline equation', '独立一行': 'Display equation', '独立公式': 'Display equation',
  '点击保存后，才会更新笔记。': 'Save to update the note.', '取消': 'Cancel', '正在保存…': 'Saving…', '按源码保存': 'Save source', '保存修改': 'Save changes',
  '直接编辑公式，用工具栏添加数学结构。': 'Edit the equation directly; use the toolbar to add structures.',
  '编辑 LaTeX 源码，保留你习惯的写法。': 'Edit LaTeX source in your preferred notation.',
  '左侧源码与右侧公式双向同步，两侧都可以编辑。': 'Source on the left and equation on the right stay in sync. Edit either side.',
  '这段内容暂时无法插入，请检查化学式、单位或公式写法。原公式已保留。': 'Unable to insert this notation. Check the formula or units. The original equation is preserved.',
  '这段内容暂时无法更新，请检查写法。原公式已保留。': 'Unable to update this notation. The original equation is preserved.',
  '化学式、单位或公式暂时无法解析，请检查写法；输入内容已保留。': 'Unable to parse this formula or unit notation. Your input is preserved.',
  '源码尚未完整或存在语法问题，请检查后保存。': 'The source is incomplete or has a syntax error. Check it before saving.',
  '公式源码尚未完整。请切换 LaTeX 或 Hybrid 模式继续编辑。': 'The source is incomplete. Continue in LaTeX or Hybrid mode.',
  '完成源码后，公式会自动显示在这里。': 'The equation will appear here when the source is complete.',
  '当前可视化引擎暂不支持这个公式。源码完整保留，可在 LaTeX 模式继续编辑。': 'Visual editing does not support this equation yet. Its source is preserved; continue in LaTeX mode.',
  '请切换 LaTeX 或 Hybrid 模式查看源码。': 'Switch to LaTeX or Hybrid mode to view the source.',
  '部分命令暂不支持可视化；“按源码保存”会原样保存当前源码，请确认命令由你的笔记环境支持。': 'Some commands do not support visual editing. Save source preserves the current source exactly; check that your note environment supports it.',
  '公式还有未填写的方框或参数，请补全后保存。': 'Fill the remaining slots or arguments before saving.',
  '请先输入一个公式，或点击上方结构开始。': 'Enter an equation or choose a structure above to begin.',
  '还有方框没有填写，请补全后再保存。': 'Fill the remaining slots before saving.', '保存失败，请重试。': 'Save failed. Please try again.',
  '化学式或反应式': 'Chemical formula or reaction', '数值与单位': 'Value and units',
  '例如 H2O 或 2 H2 + O2 -> 2 H2O': 'For example, H2O or 2 H2 + O2 -> 2 H2O', '例如 9.81 m/s^2': 'For example, 9.81 m/s^2',
  '化学键与反应符号': 'Bonds and reaction symbols', '常用单位': 'Common units',
  '插入化学式': 'Insert chemical formula', '插入单位': 'Insert units', '回填当前化学式': 'Load current chemical formula', '回填当前单位': 'Load current units',
  '更新当前化学式': 'Update current chemical formula', '更新当前单位': 'Update current units',
  '用普通写法编辑，上方生成预览，点击插入后才加入公式。暂不支持二维分子绘图或自动配平。': 'Use plain notation and check the preview above. Insert adds it to the equation. 2D molecular drawing and automatic balancing are not supported.',
  '数值与单位保留在本机。支持复合单位和指数；不自动换算。': 'Values and units stay on your device. Compound units and powers are supported; insertion does not convert them.',
  '化学式预览': 'Chemical formula preview', '单位预览': 'Unit preview',
  '输入后显示化学式预览': 'Enter notation to preview the chemical formula', '输入后显示单位预览': 'Enter a quantity to preview the units',
  '这段写法暂时无法预览，请检查后重试。': 'Unable to preview this notation. Check it and try again.',
  '单键': 'single bond', '双键': 'double bond', '三键': 'triple bond', '反应箭头': 'reaction arrow', '可逆反应': 'reversible reaction',
  '正电荷': 'positive charge', '负电荷': 'negative charge', '固体': 'solid', '液体': 'liquid', '气体': 'gas', '水溶液': 'aqueous state',
  '气体生成标记': 'gas evolution marker', '沉淀标记': 'precipitate marker', '气体 ↑': 'Gas ↑', '沉淀 ↓': 'Precipitate ↓',
  '点击模板插入，随后直接修改公式中的数值和变量。': 'Insert a template, then edit its numbers and variables directly.',
  '查找元素': 'Find an element', '原子序数、符号或英文名称': 'Atomic number, symbol or English name',
  '点击元素，加入化学输入框的光标位置。': 'Click an element to add it at the cursor in the chemistry input.',
  '118 种元素周期表': 'Periodic table of 118 elements', '镧系': 'Lanthanides', '锕系': 'Actinides',
  '水 H₂O': 'Water H₂O', '二氧化碳 CO₂': 'Carbon dioxide CO₂', '硫酸根 SO₄²⁻': 'Sulfate SO₄²⁻', '碳-14 同位素': 'Carbon-14 isotope',
  '单键 H—H': 'Single bond H—H', '双键 O=O': 'Double bond O=O', '三键 N≡N': 'Triple bond N≡N',
  '乙醇结构式': 'Ethanol structure', '氢气与氧气反应': 'Hydrogen and oxygen reaction', '合成氨可逆反应': 'Ammonia equilibrium', '加热反应': 'Heated reaction', '沉淀反应': 'Precipitation reaction',
  '牛顿第二定律': "Newton's second law", '速度向量': 'Velocity vector', '梯度 ∇f': 'Gradient ∇f', '散度 ∇·E': 'Divergence ∇·E', '旋度 ∇×B': 'Curl ∇×B',
  '偏导数': 'Partial derivative', '约化普朗克常量 ℏ': 'Reduced Planck constant ℏ', '希腊字母': 'Greek letters', '标准差 σ': 'Standard deviation σ',
  '角度 θ': 'Angle θ', '30 度': '30 degrees', '欧姆定律': "Ohm's law",
  '加速度 m/s²': 'Acceleration m/s²', '米 m': 'Metre m', '秒 s': 'Second s', '千克 kg': 'Kilogram kg', '牛顿 N': 'Newton N', '帕斯卡 Pa': 'Pascal Pa',
  '焦耳 J': 'Joule J', '瓦特 W': 'Watt W', '库仑 C': 'Coulomb C', '伏特 V': 'Volt V', '欧姆 Ω': 'Ohm Ω', '赫兹 Hz': 'Hertz Hz', '开尔文 K': 'Kelvin K', '摩尔 mol': 'Mole mol',
  '请先填写化学式或反应式。': 'Enter a chemical formula or reaction first.', '请先填写数值和单位。': 'Enter a value and its units first.',
  '内容过长，请缩短到 4096 个字符以内。': 'This entry is too long. Use at most 4096 characters.', '请移除不可见的控制字符。': 'Remove invisible control characters.',
  '上下标尚未填写完整，请补全后再插入。': 'Complete the superscript or subscript before inserting.',
  '反斜杠后的内容不受支持，请检查输入。': 'The content after the backslash is unsupported. Check the notation.',
  '化学键格式无效，请使用单键、双键、三键按钮，或 \\bond{1}、\\bond{2}、\\bond{3}。': 'Invalid bond notation. Use the single, double or triple bond buttons, or \\bond{1}, \\bond{2}, \\bond{3}.',
  '暂时无法排版，请检查化学键、括号、上下标或单位格式。': 'Unable to typeset this notation. Check bonds, brackets, scripts or units.',
  '暂时无法排版，请检查符号和命令是否完整。': 'Unable to typeset this notation. Check that symbols and commands are complete.',
  '这里只填写公式内容，请移除 $ 或 $$ 分隔符；美元符号请写成 \\$。': 'Enter only the equation, without $ or $$ delimiters. Write a literal dollar sign as \\$.',
  '源码暂不支持 % 注释，请先移除注释；百分号请写成 \\%。': 'Source comments using % are unsupported. Remove comments; write a percent sign as \\%.',
  '右花括号多于左花括号，请检查后保存。': 'There are too many closing braces. Check the source before saving.',
  '公式末尾的反斜杠尚未填写完整，请补全命令或删除后保存。': 'The final backslash is incomplete. Complete or remove the command before saving.',
  '这里只填写公式内容，请移除外层 \\(…\\) 或 \\[…\\] 数学分隔符。': 'Enter only the equation, without outer \\(…\\) or \\[…\\] delimiters.',
  '环境名称尚未填写完整，请使用 \\begin{名称} 和 \\end{名称}。': 'Complete the environment name using \\begin{name} and \\end{name}.',
  '环境名称尚未填写完整，请补全后保存。': 'Complete the environment name before saving.', '环境名称为空或格式无效，请检查后保存。': 'The environment name is empty or invalid. Check it before saving.',
  '公式环境的开始与结束不匹配。': 'The opening and closing environments do not match.',
  '公式环境两端的花括号层级不一致，请检查后保存。': 'The environment boundaries have different brace nesting. Check the source before saving.',
  '花括号尚未配对，请补全后保存。': 'Complete the unmatched braces before saving.', '公式环境尚未结束，请补全后保存。': 'Close the equation environment before saving.',
  '原笔记已关闭或切换，请取消后重新打开公式。': 'The original note was closed or changed. Cancel and reopen the equation.',
  '笔记已发生变化。为避免覆盖内容，请取消后重新打开公式。': 'The note has changed. Cancel and reopen the equation to avoid overwriting content.',
  '笔记已变化，草稿仍保留。为避免覆盖，请复制草稿后取消并重新打开公式。': 'The note has changed and your draft is preserved. Copy it, then cancel and reopen the equation.',
  '笔记内公式编辑器': 'Inline equation editor', '选择要编辑的公式': 'Choose an equation to edit',
  '点击公式重新编辑。公式按笔记中的位置排列。': 'Click an equation to edit it. Equations follow their order in the note.',
  '这篇笔记中没有可编辑的公式。请先切到编辑模式，再点击左侧 ∑ 插入。': 'No editable equations found. Switch to editing mode and click ∑ on the left to insert one.',
  '暂不支持的公式（原文保留）': 'Unsupported equation (source preserved)', '上一页': 'Previous page', '下一页': 'Next page',
  'Visual Math Editor：插入或编辑公式': 'Visual Math: Insert or edit equation',
  'Visual Math：插入或编辑公式': 'Visual Math: Insert or edit equation',
  '请先打开一篇 Markdown 笔记。': 'Open a Markdown note first.',
  '插入或编辑公式 / Insert or edit equation': 'Insert or edit equation',
  '请在普通 Markdown 笔记中使用公式编辑器。': 'Use the equation editor in a regular Markdown note.',
  '在弹窗中插入或编辑公式 / Open equation dialog': 'Open equation dialog',
  '恢复公式草稿 / Recover equation draft': 'Recover equation draft',
  '没有暂存的公式草稿。': 'There is no saved equation draft.',
  '请先点击普通正文中的新插入位置。': 'Click a new insertion point in regular note text first.',
  '公式草稿已暂存。可用“恢复公式草稿”命令在新位置继续编辑；重启前请保存。': 'The equation draft is preserved. Use Recover equation draft to continue at a new position. Save it before restarting.',
  '编辑本笔记公式 / Choose equation to edit': 'Choose equation to edit',
  '可视化插入／编辑公式': 'Insert or edit equation visually',
  '请选择一个已有公式，或先点击要插入公式的位置。': 'Select an existing equation or click an insertion point first.',
  '请在普通笔记正文中插入公式，代码、属性和链接地址内暂不支持。': 'Insert equations in regular note text. Code, properties and link destinations are not supported.',
  '笔记已变化，请重新选择公式。': 'The note has changed. Select the equation again.',
  '第一版请在 Obsidian 主窗口中编辑公式。': 'Use the main Obsidian window to edit equations in this version.',
  '请先保存或取消当前笔记内的公式草稿。': 'Save or cancel the current equation draft first.',
  '双击以可视化编辑公式': 'Double-click to edit the equation visually',
  '无法定位公式，请通过命令面板选择本笔记公式。': 'Unable to locate the equation. Choose an equation in this note from the command palette.',
  '另一个插件已加载不同版本的 MathLive。请暂时关闭该插件并重启 Obsidian。': 'Another plugin loaded a different MathLive version. Disable that plugin temporarily and restart Obsidian.',
  '单位换算': 'Unit conversion', '数值': 'Value', '类别': 'Category', '从': 'From', '到': 'To', '交换单位': 'Swap units',
  '换算结果': 'Conversion result', '使用换算结果': 'Use converted result',
  '换算类别': 'Conversion category', '换算数值': 'Value to convert', '原单位': 'From unit', '目标单位': 'To unit',
  '支持复合单位和指数；下方可离线换算常用单位。': 'Compound units and powers are supported. Convert common units offline below.',
  '先填入单位输入框，再点击插入单位；不会自动修改公式。': 'Load the result into the unit input, then choose Insert units. The equation is not changed automatically.',
  '请输入有效数值。': 'Enter a valid number.', '界面语言': 'Interface language', '语言': 'Language', '语言 / Language': 'Language',
  '请选择相同类别的单位。': 'Choose units from the same category.', '请选择有效的单位。': 'Choose valid units.', '数值超出支持范围。': 'Value is outside the supported range.',
  '跟随系统': 'System', '跟随系统 / System': 'System', '跟随系统/System': 'System',
  '绘制此公式': 'Graph this equation',
  '隐藏图像': 'Hide graph',
  '图像与上方公式同步；直接修改公式即可更新。': 'The graph follows the equation above. Edit the equation to update it.',
  '插入公式与图像': 'Insert equation and graph',
  '图像已就绪。点击插入公式与图像加入笔记。': 'The graph is ready. Choose Insert equation and graph to add both to the note.',
  '此公式暂不能绘图。支持 y=f(x)、仅含 x 的表达式和常数；不支持隐式方程或多变量。请在上方修改公式。': 'This equation cannot be graphed yet. Use y=f(x), an expression in x, or a constant. Implicit equations and multiple variables are not supported. Edit the equation above.',
  '图像尚未显示，请点击绘制此公式。': 'Choose Graph this equation to display a graph.',
  '公式已修改，请重新预览后插入。': 'The equation changed. Preview the graph again.',
  '我的公式快捷词': 'My formula shortcuts',
  '先可视化写好公式，再取一个 3–24 位英文字母或数字的快捷词（以字母开头）。可直接键入展开，或从列表插入；仅保存在当前库。': 'Compose an equation visually, then choose a shortcut of 3–24 English letters or digits starting with a letter. Type it to expand, or insert from the list. It is saved only in this vault.',
  '例如 myfrac': 'For example, myfrac', '公式快捷词': 'Formula shortcut',
  '保存当前公式为快捷词': 'Save current equation as shortcut', '删除快捷词': 'Delete shortcut', '快捷词已删除。': 'Shortcut deleted.',
  '未能保存快捷词，请重试。原快捷词已保留。': 'Unable to save shortcuts. Try again. Your previous shortcuts are preserved.',
  '快捷词需为 3–24 位英文字母或数字，并以字母开头。': 'Use 3–24 English letters or digits, starting with a letter.',
  '快捷词与内置或已保存的快捷词冲突，请换一个名称。': 'This shortcut conflicts with a built-in or saved shortcut. Choose another name.',
  '此快捷词已存在；请先删除，或使用新名称。': 'This shortcut already exists. Delete it first or choose another name.',
  '最多保存 50 个公式快捷词。': 'You can save at most 50 formula shortcuts.',
  '请先完成一个有效公式，再保存快捷词。': 'Complete a valid equation before saving a shortcut.',
  '快捷词已保存。可在可视化区域键入，或点击列表插入。': 'Shortcut saved. Type it in the visual editor or click its entry to insert it.',
  '关于与许可': 'About and license',
  '本插件采用 GNU GPLv3 许可，不提供任何担保。你可按许可使用、修改与再分发。笔记内容不受此许可约束。': 'This plugin is licensed under GNU GPLv3, without any warranty. You may use, modify and redistribute it under that license. Your note content is not covered by this license.',
  '查看许可与第三方声明': 'View license and third-party notices',
  '下载此版本源码': 'Download source for this version',
};

/** Both names are searchable in every interface language; chemical symbols are unchanged. */
export function getElementSearchNames(englishName: string): string {
  const spanish = Object.hasOwn(SPANISH_ELEMENT_NAMES, englishName) ? SPANISH_ELEMENT_NAMES[englishName] : '';
  return `${englishName} ${spanish} ${spanish.normalize('NFD').replace(/\p{M}/gu, '')}`.trim();
}

function translateCore(text: string, language: Exclude<ResolvedLanguage, 'zh'>): string {
  const dictionary = language === 'es' ? SPANISH_TRANSLATIONS : UI_TRANSLATIONS;
  if (Object.hasOwn(dictionary, text)) return dictionary[text];
  const spanish = language === 'es';
  if (spanish && Object.hasOwn(SPANISH_ELEMENT_NAMES, text)) return SPANISH_ELEMENT_NAMES[text];
  let match: RegExpExecArray | null;
  match = /^(图像|复平面) (\d+) ·(?: ([\s\S]*))?$/.exec(text);
  if (match) return `${dictionary[match[1]]} ${match[2]} ·${match[3] === undefined ? '' : ` ${match[3]}`}`;
  if (spanish) {
    // Converter options combine a localized name and an invariant unit symbol.
    match = /^(.+?) (\([^()]+\))$/.exec(text);
    if (match && Object.hasOwn(dictionary, match[1])) return `${dictionary[match[1]]} ${match[2]}`;
    match = /^(\d+) ([a-z]+) ([A-Z][a-z]?)$/.exec(text);
    if (match && Object.hasOwn(SPANISH_ELEMENT_NAMES, match[2])) return `${match[1]} ${SPANISH_ELEMENT_NAMES[match[2]]} ${match[3]}`;
    match = /^(\d+) · ([A-Z][a-z]?) · ([a-z]+)$/.exec(text);
    if (match && Object.hasOwn(SPANISH_ELEMENT_NAMES, match[3])) return `${match[1]} · ${match[2]} · ${SPANISH_ELEMENT_NAMES[match[3]]}`;
    match = /^左侧 \/ 右侧：(.*)$/.exec(text);
    if (match) return `Izquierda / derecha: ${match[1].replace(/电荷/g, 'carga')}`;
    match = /^视图内 (\d+) \/ (\d+) 个点。点击保存才写入笔记。$/.exec(text);
    if (match) return `${match[1]} / ${match[2]} puntos visibles. Guarda para actualizar la nota.`;
    match = /^(X|Y|Re|Im) (最小值|最大值)$/.exec(text);
    if (match) return `${match[1]} ${match[2] === '最小值' ? 'mín.' : 'máx.'}`;
    match = /^第 (\d+) 行：请输入 3\+2i、−i 或 4 这样的数值；暂不支持表达式或名称。$/.exec(text);
    if (match) return `Línea ${match[1]}: introduce un número como 3+2i, −i o 4; aún no se admiten expresiones ni nombres.`;
    match = /^第 (\d+) 行：实部和虚部须为 −1000000 至 1000000 之间的有效数值。$/.exec(text);
    if (match) return `Línea ${match[1]}: las partes real e imaginaria deben ser números válidos entre −1000000 y 1000000.`;
  }
  match = /^(\d+) 个匹配元素；点击元素可插入$/.exec(text);
  if (match) return spanish ? `${match[1]} ${Number(match[1]) === 1 ? 'elemento coincidente' : 'elementos coincidentes'}; haz clic en uno para insertarlo` : `${match[1]} matching elements; click an element to insert`;
  match = /^(\d+) 个元素$/.exec(text);
  if (match) return spanish ? `${match[1]} ${Number(match[1]) === 1 ? 'elemento' : 'elementos'}` : `${match[1]} elements`;
  match = /^编辑第 (\d+) 个公式$/.exec(text);
  if (match) return spanish ? `Editar ecuación ${match[1]}` : `Edit equation ${match[1]}`;
  match = /^第 (\d+) 行 · (独立公式|行内公式)$/.exec(text);
  if (match) return `${spanish ? 'Línea' : 'Line'} ${match[1]} · ${dictionary[match[2]]}`;
  match = /^此输入框暂不支持命令 (\\[A-Za-z]+)，请使用常用化学符号或单位。$/.exec(text);
  if (match) return spanish ? `Esta entrada no admite ${match[1]}. Usa notación química o unidades comunes.` : `This input does not support ${match[1]}. Use common chemical notation or units.`;
  match = /^插入(.+?)；选中内容后可套用结构$/.exec(text);
  if (match && Object.hasOwn(dictionary, match[1])) return spanish ? `Insertar ${dictionary[match[1]]}; selecciona contenido para aplicar la estructura` : `Insert ${dictionary[match[1]]}; select content to wrap it`;
  match = /^(插入|添加)(.+)$/.exec(text);
  if (match) {
    const label = match[2];
    if (Object.hasOwn(dictionary, label)) return `${match[1] === '插入' ? (spanish ? 'Insertar' : 'Insert') : (spanish ? 'Añadir' : 'Add')} ${dictionary[label]}`;
    const words = /^(阿尔法|贝塔|西塔|圆周率|德尔塔|无穷大|正负号|乘号|除号|不等于|小于或等于|大于或等于) (.+)$/.exec(label);
    if (words) return `${spanish ? 'Insertar' : 'Insert'} ${dictionary[words[1]]} ${words[2]}`;
  }
  return text;
}

export function translateUiText(text: string, language: ResolvedLanguage): string {
  if (language === 'zh') return text;
  const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(text)!;
  return match[1] + translateCore(match[2], language) + match[3];
}

/** Only the renderer's fixed plot descriptions are translated; captured math stays verbatim. */
export function translatePlotUiText(text: string, language: ResolvedLanguage): string {
  if (language === 'en') return text;
  const spanish = language === 'es';
  const description = 'Approximate numerical graph. The horizontal axis is X and the vertical axis is Y. Trigonometric arguments use radians. Domain gaps and unresolved discontinuities are omitted.';
  if (text === description) return spanish
    ? 'Gráfica numérica aproximada. El eje horizontal es X y el vertical es Y. Los argumentos trigonométricos usan radianes. Se omiten los huecos del dominio y las discontinuidades no resueltas.'
    : '数值近似图像。横轴为 X，纵轴为 Y。三角函数参数采用弧度。省略定义域空缺和未能解析的间断。';
  if (text === 'Complex plane') return spanish ? 'Plano complejo' : '复平面';
  let match = /^Equation graph: y = ([\s\S]*); horizontal axis X, vertical axis Y$/.exec(text);
  if (match) return spanish ? `Gráfica de ecuación: y = ${match[1]}; eje horizontal X, eje vertical Y` : `函数图像：y = ${match[1]}；横轴 X，纵轴 Y`;
  match = /^Equation graph: y = ([\s\S]*)$/.exec(text);
  if (match) return spanish ? `Gráfica de ecuación: y = ${match[1]}` : `函数图像：y = ${match[1]}`;
  match = /^Horizontal real axis Re; vertical imaginary axis Im\. Equal unit lengths on both axes\. (\d+) of (\d+) points visible\. ([\s\S]*)\.$/.exec(text);
  if (match) return spanish
    ? `Eje real horizontal Re; eje imaginario vertical Im. Ambos ejes tienen la misma escala. ${match[1]} de ${match[2]} ${Number(match[2]) === 1 ? 'punto visible' : 'puntos visibles'}. ${match[3]}.`
    : `横向实轴 Re；纵向虚轴 Im。两轴每单位长度相同。当前显示 ${match[1]} / ${match[2]} 个点。${match[3]}。`;
  match = /^(\d+)\/(\d+) points · equal units$/.exec(text);
  if (match) return spanish ? `${match[1]}/${match[2]} ${Number(match[2]) === 1 ? 'punto' : 'puntos'} · misma escala` : `${match[1]}/${match[2]} 个点 · 等比例坐标`;
  return text;
}

export interface EditorLocalization {
  setLanguage(language: Language): void;
  destroy(): void;
}

/** Localizes only the mounted editor. No global document or note state is changed. */
export function localizeEditor(root: HTMLElement, language: Language, systemLanguage?: string): EditorLocalization {
  type Remembered = { original: string; rendered: string };
  const textMemory = new WeakMap<Text, Remembered>();
  const attributeMemory = new WeakMap<Element, Map<string, Remembered>>();
  const plotTextMemory = new WeakMap<Element, Remembered>();
  const attributeNames = ['title', 'aria-label', 'placeholder'] as const;
  const plotSelector = 'svg[data-vme-plot="function"],svg[data-vme-plot="complex"]';
  let active = language;
  let destroyed = false;
  const blocked = 'script,style,code,pre,samp,kbd,svg,math,mjx-container,.ML__latex,[data-no-i18n],[data-i18n-ignore]';
  const editable = 'input,textarea,math-field,[contenteditable]:not([contenteditable="false"])';
  const observer = new MutationObserver((records) => {
    // MathLive can update hundreds of formula nodes per keystroke. Their
    // content is not UI text, so do not rescan the editor for those changes.
    const meaningful = records.some((record) => {
      const target = record.target.nodeType === 1 ? record.target as Element : record.target.parentElement;
      // Plot previews intentionally block scientific SVG content. Recognize
      // only generated plot insertion and its explicit accessibility nodes.
      if (record.type === 'childList' && Array.from(record.addedNodes).some(node =>
        node.nodeType === 1 && ((node as Element).matches(plotSelector) || (node as Element).querySelector(plotSelector)))) return true;
      const plot = target?.closest(plotSelector);
      if (plot && root.contains(plot) && (target === plot
        || (target?.parentElement === plot && ['title', 'desc'].includes(target.localName))
        || target?.matches('[data-vme-plot-caption="title"],[data-vme-plot-caption="footer"]'))) return true;
      if (!target || target.closest(blocked)) return false;
      const editableAncestor = target.closest(editable);
      // CodeMirror's outer contenteditable lives outside our noneditable
      // widget. Only formula/input descendants inside this editor are data.
      if (record.type !== 'attributes' && editableAncestor && root.contains(editableAncestor)) return false;
      return true;
    });
    if (meaningful) apply();
  });

  function resolved(): ResolvedLanguage {
    return resolveLanguage(active, systemLanguage ?? root.ownerDocument.defaultView?.navigator.language ?? 'en');
  }

  function remember(current: string, previous?: Remembered): Remembered {
    return previous && current === previous.rendered ? previous : { original: current, rendered: current };
  }

  function walk(node: Node, currentLanguage: ResolvedLanguage): void {
    if (node.nodeType === 3) {
      const text = node as Text;
      const parent = text.parentElement;
      if (!parent) return;
      // An option with no explicit value derives its value from its text.
      // Leave it untouched so translating the UI can never change a value.
      if (parent.tagName === 'OPTION' && !parent.hasAttribute('value')) return;
      const entry = remember(text.data, textMemory.get(text));
      const explicit = currentLanguage !== 'zh' && parent.childNodes.length === 1
        ? parent.getAttribute(`data-i18n-${currentLanguage}`) : null;
      const translated = explicit ?? translateUiText(entry.original, currentLanguage);
      if (text.data !== translated) text.data = translated;
      entry.rendered = translated;
      textMemory.set(text, entry);
      return;
    }
    if (node.nodeType !== 1) return;
    const element = node as HTMLElement;
    if (element.matches(blocked)) return;
    let entries = attributeMemory.get(element);
    if (!entries) { entries = new Map(); attributeMemory.set(element, entries); }
    for (const name of attributeNames) {
      const value = element.getAttribute(name);
      if (value === null) { entries.delete(name); continue; }
      const entry = remember(value, entries.get(name));
      const translated = translateUiText(entry.original, currentLanguage);
      if (value !== translated) element.setAttribute(name, translated);
      entry.rendered = translated;
      entries.set(name, entry);
    }
    // Never walk editable content or MathLive's light-DOM formula source.
    if (element.matches(editable)) return;
    for (const child of Array.from(element.childNodes)) walk(child, currentLanguage);
  }

  function apply(): void {
    if (destroyed) return;
    observer.disconnect();
    const currentLanguage = resolved();
    root.lang = currentLanguage;
    walk(root, currentLanguage);
    // A narrow exception for plugin-generated plots. Never walk generic SVGs,
    // axes, tick values, paths, point labels or formula text.
    for (const svg of Array.from(root.querySelectorAll(plotSelector))) {
      let attributes = attributeMemory.get(svg);
      if (!attributes) { attributes = new Map(); attributeMemory.set(svg, attributes); }
      const label = svg.getAttribute('aria-label');
      if (label !== null) {
        const entry = remember(label, attributes.get('aria-label'));
        const translated = translatePlotUiText(entry.original, currentLanguage);
        if (translated !== label) svg.setAttribute('aria-label', translated);
        entry.rendered = translated; attributes.set('aria-label', entry);
      } else attributes.delete('aria-label');
      const captions = Array.from(svg.children).filter(child => ['title', 'desc'].includes(child.localName));
      captions.push(...Array.from(svg.querySelectorAll('[data-vme-plot-caption="title"],[data-vme-plot-caption="footer"]')));
      for (const caption of captions) {
        const current = caption.textContent ?? '';
        const entry = remember(current, plotTextMemory.get(caption));
        const translated = translatePlotUiText(entry.original, currentLanguage);
        if (translated !== current) caption.textContent = translated;
        entry.rendered = translated; plotTextMemory.set(caption, entry);
      }
    }
    observer.observe(root, {
      childList: true, characterData: true, subtree: true, attributes: true,
      attributeFilter: [...attributeNames, 'data-i18n-en', 'data-i18n-es', 'data-vme-plot', 'data-vme-plot-caption'],
    });
  }

  apply();
  return {
    setLanguage(next) { active = next; apply(); },
    destroy() { destroyed = true; observer.disconnect(); },
  };
}
