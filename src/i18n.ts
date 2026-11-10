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
  '公式超过 4096 个 UTF-16 代码单元，暂用 LaTeX 或 Hybrid 源码编辑；原文完整保留，缩短后可恢复可视化。': 'This formula exceeds 4096 UTF-16 code units. Continue in LaTeX or Hybrid source editing; the full source is preserved. Shorten it to restore visual editing.',
  '可视化预览已暂停，可继续编辑并保存源码。': 'Visual preview is paused. You can continue editing and saving the source.',
  // Local-only set, sequence and equation-system notation tools.
  "集合与数列": "Sets & sequences",
  "选择结构后填写方框；这里只排版，不求解。集合的变量和条件由你填写。": "Choose a structure and fill its boxes. These tools format notation without solving. Enter set variables and conditions yourself.",
  "集合与常用数集": "Sets and number sets",
  "集合关系符号": "Set relation symbols",
  "数列模板": "Sequence templates",
  "数列默认用 a 表示，所有字符都能直接编辑。等差或等比通项依次填写首项与公差或公比。": "Sequences use a by default; every character is editable. For arithmetic or geometric terms, fill the first term and then the common difference or ratio.",
  "列举集合": "Set by enumeration",
  "插入集合大括号，可包裹选中内容": "Insert set braces; wrap selected content if present",
  "集合描述": "Set-builder notation",
  "插入集合描述，填写变量和条件": "Insert set-builder notation; fill the variable and condition",
  "自然数集": "Natural numbers",
  "插入自然数集符号": "Insert natural-number set symbol",
  "整数集": "Integers",
  "插入整数集符号": "Insert integer set symbol",
  "有理数集": "Rational numbers",
  "插入有理数集符号": "Insert rational-number set symbol",
  "实数集": "Real numbers",
  "插入实数集符号": "Insert real-number set symbol",
  "复数集": "Complex numbers",
  "插入复数集符号": "Insert complex-number set symbol",
  "属于": "Member of",
  "插入属于符号": "Insert membership symbol",
  "不属于": "Not a member of",
  "插入不属于符号": "Insert non-membership symbol",
  "子集符号 ⊂": "Subset symbol ⊂",
  "插入子集符号 ⊂": "Insert subset symbol ⊂",
  "子集或相等": "Subset or equal",
  "插入子集或相等符号": "Insert subset-or-equal symbol",
  "并集": "Union",
  "插入并集符号": "Insert union symbol",
  "交集": "Intersection",
  "插入交集符号": "Insert intersection symbol",
  "空集": "Empty set",
  "插入空集符号": "Insert empty-set symbol",
  "数列项": "Sequence term",
  "插入数列项，填写下标": "Insert a sequence term; fill the index",
  "数列大括号": "Sequence braces",
  "插入数列大括号，填写下标": "Insert sequence braces; fill the index",
  "有限数列": "Finite sequence",
  "插入有限数列，填写末项下标": "Insert a finite sequence; fill the final index",
  "等差通项": "Arithmetic term",
  "插入等差通项，填写首项与公差": "Insert an arithmetic term; fill the first term and common difference",
  "等比通项": "Geometric term",
  "插入等比通项，填写首项与公比": "Insert a geometric term; fill the first term and common ratio",
  "方程组大括号": "System of equations",
  "逐行填写方程或不等式，自动加左大括号；这里只编辑，不求解。": "Enter an equation or inequality on each row; a left brace is added automatically. This editor does not solve the system.",
  "方程组行数": "System rows",
  "载入当前方程组": "Load current system",
  "减少行数会保留本次隐藏行；取消不会更改原公式。": "Reducing rows keeps hidden rows for this session. Cancel leaves the original equation unchanged.",
  "未应用的方程组行原文": "Unapplied original system-row input",
  "方程组预览": "System preview",
  "预览方程组": "Preview system",
  "插入方程组": "Insert system",
  "替换当前方程组": "Replace current system",
  "取消方程组编辑": "Cancel system editing",
  "当前公式已更改，请重新载入方程组后再替换。": "The equation changed. Reload the system before replacing it.",
  "方程组已加入公式草稿；保存后才更新笔记。": "The system was added to the equation draft. Save to update the note.",
  "方程组未插入；请检查每行内容和当前公式。": "The system was not inserted. Check each row and the current equation.",
  "输入已修改，请重新预览方程组。": "The input changed. Preview the system again.",
  "方程行": "Equation row",
  "这一行暂不支持这段内容；粘贴原文保留在下方，方程组未改动。": "This row does not support that input. The pasted original is preserved below; the system is unchanged.",
  "请填写每一行；空行不会自动补零或删除。": "Fill every row. Empty rows are neither filled with zero nor removed automatically.",
  "方程组包含暂不支持的内容；原公式未改动。": "The system contains unsupported input. The original equation is unchanged.",
  "当前整条公式不是受支持的单列方程组，原公式未改动。": "The whole equation is not a supported single-column system. The original equation is unchanged.",

  "请选择受支持的空间关系及对应参数。": "Use a supported spatial-relation scene and its applicable settings.",
  "偏移须为 −4 至 4 之间的有效数值。": "Use a finite signed offset between -4 and 4.",
  "此场景的球体半径须为 0.1 至 4 之间的有效数值。": "Use a finite sphere radius between 0.1 and 4.",
  "夹角须为 0 至 90 度之间的有效数值。": "Use a finite angle between 0 and 90 degrees.",
  "暂时无法生成空间关系场景，请检查参数后重试。": "The spatial-relation scene could not be generated.",
  // Fixed local spatial-relation scenes.
  "两个平面": "Two planes",
  "直线与平面": "Line and plane",
  "球体与平面": "Sphere and plane",
  "夹角（度）": "Angle (degrees)",
  "有符号偏移": "Signed offset",
  "法向偏移": "Normal offset",
  "直线参考点高度 Z": "Line anchor Z",
  "平面高度 Z": "Plane Z",
  "参考平面为 z=0；调整第二个平面的夹角（0–90°）和法向偏移（−4 至 4）。关系针对无限平面，画面只显示有限平面片。": "The reference plane is z=0. Adjust the second plane’s angle (0–90°) and normal offset (−4 to 4). Relations use infinite planes; displayed patches are finite.",
  "平面固定为 z=0；调整直线夹角（0–90°）和参考点高度（−4 至 4）。关系针对无限直线和平面，画面只显示有限片段。": "The plane is fixed at z=0. Adjust the line’s angle (0–90°) and anchor height (−4 to 4). Relations use an infinite line and plane; only finite segments and patches are shown.",
  "球心固定在原点；平面为 z=偏移。半径范围 0.1–4，偏移范围 −4 至 4。关系针对无限平面，画面只显示有限平面片。": "The sphere is centered at the origin; the plane is z=offset. Radius ranges from 0.1–4 and offset from −4 to 4. The relation uses an infinite plane; the displayed patch is finite.",
  "两个平面相交": "The planes intersect",
  "两个平面平行": "The planes are parallel",
  "两个平面重合": "The planes coincide",
  "直线与平面相交": "The line intersects the plane",
  "直线与平面平行": "The line is parallel to the plane",
  "直线在平面内": "The line lies in the plane",
  "球体与平面相交成圆": "The sphere and plane intersect in a circle",
  "球体与平面相切": "The sphere and plane are tangent",
  "球体与平面不相交": "The sphere and plane are disjoint",
  "接近临界情况：显示关系为数值近似；输入数值未被吸附或改写。": "Near a critical case: the displayed relation is a numerical approximation; inputs were not snapped.",
  "交点或交线位于当前画面之外。": "The intersection lies outside the shown view.",
  // Offline geometry controls.
  "几何模型": "Geometry models",
  "形状": "Shape",
  "球体": "Sphere",
  "圆柱体": "Cylinder",
  "圆锥体": "Cone",
  "正棱锥": "Regular pyramid",
  "正棱柱": "Regular prism",
  "长方体": "Cuboid",
  "平面片": "Plane",
  "半径": "Radius",
  "宽度": "Width",
  "深度": "Depth",
  "高度": "Height",
  "底面边数": "Base sides",
  "底面外接圆半径": "Base circumradius",
  "显示方式": "Appearance",
  "面与边": "Faces and edges",
  "线框": "Wireframe",
  "所有长度采用相同单位；底面半径指中心到顶点的距离。平面为有限的 XY 平面片。": "Use the same unit for all lengths. Base radius means center to vertex. A plane is a finite patch in XY.",
  "拖动模型旋转，滚轮缩放；插入或保存后才保留尺寸与视图。": "Drag the model to rotate; scroll to zoom. Insert or save to keep dimensions and view.",
  "几何模型采用等比例正交视图；曲面为多边形近似，仅作几何示意。": "Geometry models use an equal-scale orthographic view. Curved surfaces are polygonal approximations for geometric illustration.",
  "请选择受支持的几何体或平面。": "Choose a supported geometric solid or plane.",
  "请使用受支持的几何设置和尺寸。": "Use only supported geometry settings and dimensions.",
  "尺寸须为 0.001 至 1000 之间的有效数值。": "Lengths must be finite numbers between 0.001 and 1000.",
  "正棱锥或正棱柱的底面边数须为 3 至 12 的整数。": "Use 3 to 12 whole sides for a regular pyramid or prism.",
  "请使用有效视角；俯仰角为 10 至 80 度，缩放为 0.25 至 4。": "Use a finite camera angle, elevation from 10 to 80 degrees, and zoom from 0.25 to 4.",
  "几何模型不使用函数表达式；请重新选择模型。": "Use an empty geometry expression and valid X/Y bounds.",
  "暂不支持超过 1000:1 的尺寸比例。": "Dimension ratios above 1000:1 are not supported.",
  // Fixed trigonometry and geometry notation tools.
  "三角函数与几何符号": "Trig & geometry",
  "函数可填写方框或套用选中内容。相似 ∼、全等 ≅、角 ∠、三角形 △ 和直角 90° 含义不同。": "Fill a function box or wrap selected content. Similarity ∼, congruence ≅, angle ∠, triangle △ and right angle 90° have different meanings.",
  "正弦": "Sine",
  "余弦": "Cosine",
  "正切": "Tangent",
  "相似": "Similarity",
  "全等": "Congruence",
  "角": "Angle",
  "三角形": "Triangle",
  "直角": "Right angle",
  "插入正弦函数": "Insert sine function",
  "插入余弦函数": "Insert cosine function",
  "插入正切函数": "Insert tangent function",
  "插入相似符号": "Insert similarity symbol",
  "插入全等符号": "Insert congruence symbol",
  "插入角符号": "Insert angle symbol",
  "插入三角形符号": "Insert triangle symbol",
  "插入直角 90°": "Insert right angle 90°",
  // Offline matrix structure editor.
  "矩阵编辑器": "Matrix editor",
  "行数": "Rows",
  "列数": "Columns",
  "矩阵括号": "Matrix delimiters",
  "圆括号": "Parentheses",
  "方括号": "Square brackets",
  "无括号": "No delimiters",
  "花括号": "Braces",
  "行列式竖线": "Determinant bars",
  "双竖线": "Double bars",
  "单元格": "Cell",
  "矩阵预览": "Matrix preview",
  "载入当前矩阵": "Load current matrix",
  "预览矩阵": "Preview matrix",
  "插入矩阵": "Insert matrix",
  "替换当前矩阵": "Replace current matrix",
  "空白单元格填0": "Fill empty cells with 0",
  "取消矩阵编辑": "Cancel matrix editing",
  "选择行列数并填写每一格；这里只编辑矩阵，不计算矩阵运算。": "Choose the number of rows and columns, then fill each cell. This editor creates notation; it does not calculate matrix operations.",
  "所有单元格都需要填写；也可明确选择填0。": "Fill every cell, or explicitly choose to fill empty cells with 0.",
  "当前整条公式不是受支持的单个矩阵，原公式未改动。": "The entire current equation is not a supported single matrix. The original equation is unchanged.",
  "当前公式已更改，请重新载入矩阵后再替换。": "The current equation has changed. Load the matrix again before replacing it.",
  "单元格暂不支持这段内容；原始粘贴内容保留在下方，当前矩阵未改动。": "This content is not supported in a cell. The original pasted text is preserved below; the current matrix is unchanged.",
  "未应用的单元格原文": "Unapplied original cell input",
  "请先完成或取消公式导入，再编辑矩阵。": "Complete or cancel equation import before editing a matrix.",
  "矩阵未插入；请检查单元格和当前公式。": "The matrix was not inserted. Check the cells and the current equation.",
  "预览不会更改公式；插入或替换后仍需保存笔记。": "Previewing does not change the equation. After inserting or replacing it, you still need to save the note.",
  "矩阵已加入公式草稿；保存后才更新笔记。": "The matrix is in the equation draft. The note changes only when you save.",
  "矩阵尺寸改变会保留已有单元格；超出当前范围的内容仍保留到本次关闭。": "Resizing preserves existing cells. Content outside the current dimensions is retained until this session closes.",
  "当前矩阵包含暂不支持的单元格；原公式未改动。": "The current matrix contains unsupported cells. The original equation is unchanged.",
  "输入已修改，请重新预览矩阵。": "The input has changed. Preview the matrix again.",
  // Offline advanced-math structure insertion.
  "高等数学模板": "Advanced math",
  "点击插入数学结构，再填写方框。这里只编辑公式，不计算或求解。": "Insert a math structure, then fill the boxes. These tools edit notation; they do not calculate or solve.",
  "极限": "Limit",
  "普通导数": "Ordinary derivative",
  "二阶导数": "Second derivative",
  "二重积分": "Double integral",
  "无穷级数": "Infinite series",
  "连乘积": "Product",
  "向量": "Vector",
  "梯度": "Gradient",
  "插入极限模板": "Insert limit template",
  "插入普通导数模板": "Insert ordinary derivative template",
  "插入二阶导数模板": "Insert second derivative template",
  "插入偏导数模板": "Insert partial derivative template",
  "插入二重积分模板": "Insert double integral template",
  "插入无穷级数模板": "Insert infinite series template",
  "插入连乘积模板": "Insert product template",
  "插入向量模板": "Insert vector template",
  "插入梯度模板": "Insert gradient template",
  '较长或多行公式使用上下布局：上方源码与下方公式双向同步。': 'Long or multiline equations use a stacked layout: source above and visual editing below stay in sync.',
  // Single-equation import staging and source-preservation messages.
  '复制导入原文': 'Copy original input',
  '导入原文已复制。': 'The original input was copied.',
  '未能复制原文，请保留导入面板后重试。': 'Unable to copy the original input. Keep the import panel open and try again.',
  '导入单条公式': 'Import one equation',
  '先检查候选；应用会替换当前整条公式，保存后才更新笔记。': 'Review the candidate first. Applying replaces the entire current equation; the note changes only when you save.',
  '载入当前源码': 'Load current source',
  '导入原文': 'Original input',
  '检查并预览': 'Check and preview',
  '候选源码（不含外包装）': 'Candidate source (without outer delimiters)',
  '应用并替换公式': 'Apply and replace equation',
  '导入未应用；当前公式和导入原文仍保留，请检查后重试。': 'Import was not applied. The current equation and original input are preserved. Check the input and try again.',
  '取消导入': 'Cancel import',
  '候选排版：独立公式': 'Candidate layout: display equation',
  '候选排版：行内公式（保存时换行会转换为空格）': 'Candidate layout: inline equation (line breaks become spaces when saved)',
  '仅源码可用：部分命令无法可视化。应用后请在源码模式检查；笔记环境也可能不支持这些命令。': 'Source only: some commands cannot be edited visually. Review the source after applying; your note environment may not support these commands either.',
  '可视化预览可用。请检查结构；应用前当前公式保持不变。': 'Visual preview is available. Check the structure; the current equation stays unchanged until you apply.',
  '仅按源码应用并替换': 'Apply source only and replace',
  '原文已修改，请重新检查并预览。': 'The original input changed. Check and preview it again.',
  '这里只导入单条公式；请移除正文、多条公式或额外的数学分隔符。': 'Import one equation only. Remove surrounding prose, additional equations or extra math delimiters.',
  '公式外层分隔符不匹配；请检查 $、$$、\\(…\\) 或 \\[...\\]。': 'The outer delimiters do not match. Check $, $$, \\(…\\) or \\[...\\].',
  '这里只导入单条 LaTeX 公式，暂不支持完整文档、文件引用或宏定义。': 'Import one LaTeX equation only. Full documents, file references and macro definitions are not supported.',
  '输入包含 MathLive 模板参数（#0、#1、#? 或 #@）；原文已保留，请改用普通公式源码。': 'The input contains MathLive template parameters (#0, #1, #? or #@). The original input is preserved. Use ordinary equation source instead.',
  '公式结构过深，单条导入暂限 32 层；原文已保留。': 'The equation is nested too deeply. Imports currently allow up to 32 explicit levels. The original input is preserved.',
  '公式命令过多，单条导入暂限 512 个命令；原文已保留。': 'The equation has too many commands. Imports currently allow up to 512 commands. The original input is preserved.',
  '公式过长，单条导入暂限 8192 个字符；原文已保留。': 'The equation is too long. Imports currently allow up to 8192 characters. The original input is preserved.',
  '请先粘贴或输入一条 LaTeX 公式。': 'Paste or enter one LaTeX equation first.',
  '输入包含不可见的控制字符；原文已保留，请检查后重试。': 'The input contains invisible control characters. The original input is preserved. Check it and try again.',
  '公式内容为空；请填写公式后再应用。': 'The equation is empty. Enter an equation before applying.',
  '仅源码保存不会修复未知命令。行内保存会把换行转换为空格；需要保留多行请选独立公式。': 'Saving source does not repair unknown commands. Inline saving converts line breaks to spaces; choose a display equation to preserve multiple lines.',
  '行内保存会把换行转换为空格；需要保留多行请选独立公式。': 'Inline saving converts line breaks to spaces; choose a display equation to preserve multiple lines.',
  '只输入公式内容；带外包装的整式请用“导入单条公式”。': 'Enter only the equation contents. For an entire equation with outer delimiters, use Import one equation.',
  '界面语言 / Interface language': 'Interface language',
  '示例：x^2, sin(x), 1/x': 'Examples: x^2, sin(x), 1/x',
  '跟随 Obsidian': 'Follow Obsidian', '跟随 Obsidian / Follow Obsidian': 'Follow Obsidian',
  '系统 / System': 'System',
  '无法保存语言偏好 / Unable to save language preference': 'Unable to save language preference',
  '图像': 'Graph', '复平面': 'Complex plane', '函数图像': 'Function graph', '图像类型': 'Graph type',
  '极坐标': 'Polar graph', '三维曲面': '3D surface', '微积分图像': 'Calculus graph',
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
  '↵ 换行': '↵ New line', '换行': 'New line', '换行继续输入': 'New line', '换行继续输入（Shift+Enter）': 'New line (Shift+Enter)',
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
  '关于与许可': 'About and license',
  '本插件采用 GNU GPLv3 许可，不提供任何担保。你可按许可使用、修改与再分发。笔记内容不受此许可约束。': 'This plugin is licensed under GNU GPLv3, without any warranty. You may use, modify and redistribute it under that license. Your note content is not covered by this license.',
  '查看许可与第三方声明': 'View license and third-party notices',
  '下载此版本源码': 'Download source for this version',
  '微积分视图': 'Calculus view', '原始函数': 'Original function',
  '一阶导数 d/dx': 'First derivative d/dx', '二阶导数 d²/dx²': 'Second derivative d²/dx²',
  '定积分与面积 ∫': 'Definite integral and area ∫',
  'θ 起点（弧度）': 'θ start (radians)', 'θ 终点（弧度）': 'θ end (radians)',
  '积分下限 a': 'Lower limit a', '积分上限 b': 'Upper limit b',
  '水平旋转（度）': 'Azimuth (degrees)', '俯仰角（度）': 'Elevation (degrees)',
  '向左旋转': 'Rotate left', '向右旋转': 'Rotate right',
  '极径 r = f(θ)': 'Radius r = f(θ)', '曲面 z = f(x,y)': 'Surface z = f(x,y)',
  '输入极径，例如 2*sin(3*theta)。θ 使用弧度。': 'Enter a radius, for example 2*sin(3*theta). θ uses radians.',
  '极坐标采用等比例 X/Y 轴；负极径会反向绘制。图线为数值近似。': 'Polar graphs use equal X/Y units. Negative radii reverse direction. Curves are numerical approximations.',
  '输入 z=f(x,y)，例如 sin(sqrt(x^2+y^2))。': 'Enter z=f(x,y), for example sin(sqrt(x^2+y^2)).',
  '在曲面内拖动旋转，滚轮缩放；插入或保存才写入笔记。': 'Drag the surface to rotate; scroll to zoom. Insert or save to update the note.',
  '三维曲面为有界网格数值近似；不支持隐式曲面或符号求解。': '3D surfaces use a bounded numerical mesh. Implicit surfaces and symbolic solving are not supported.',
  '导数和定积分采用数值近似，不是符号计算；间断点附近可能省略曲线。': 'Derivatives and definite integrals are numerical approximations, not symbolic calculations. Curves may be omitted near discontinuities.',
  '此公式暂不能绘图。支持 y=f(x)、r=f(theta) 或 z=f(x,y)；不支持隐式方程。请在上方修改公式。': 'This equation cannot be graphed yet. Use y=f(x), r=f(theta), or z=f(x,y). Implicit equations are not supported. Edit the equation above.',
  '拖动旋转，滚轮缩放。调整后点击“保存视图”。': 'Drag to rotate; scroll to zoom. Choose Save view to keep changes.',
  '示例（替换输入）': 'Examples (replace input)', '在光标处插入符号': 'Insert a symbol at the cursor',
  '未知名称。请使用当前图像的变量（x、theta，或 x 和 y）、pi、e 及支持的函数。': 'Unknown name. Use the variables for this graph (x, theta, or x and y), pi, e, and supported functions.',
  '极坐标设置无效，请重新打开编辑器。': 'Unsupported polar graph settings. Reopen the editor.',
  '微积分视图仅适用于单变量函数图像。': 'Calculus views are available for function graphs only.',
  'θ 起点须小于终点，均为有效数值，且范围不超过 100π 弧度。': 'Theta bounds must increase, be finite, and span no more than 100π radians.',
  '极坐标图线过于复杂，请简化公式或缩小 θ 范围。': 'The polar graph is too complex. Simplify the formula or narrow the theta range.',
  '此范围内没有可显示的极坐标图线，请检查公式或调整坐标范围。': 'No finite polar curve is visible in this range. Check the formula or adjust the axes.',
  '暂时无法生成极坐标图，请检查公式后重试。': 'The polar graph could not be generated. Check the formula and try again.',
  '微积分视图设置无效，请重新选择。': 'Unsupported calculus view. Choose another option.',
  '积分上下限须为支持范围内的有效数值，且下限小于上限。': 'Integral bounds must be finite increasing numbers within the supported range.',
  '积分在计算限制内未能收敛，请缩小区间或简化公式。': 'The integral did not converge within the work limit. Narrow the interval or simplify the formula.',
  '积分区间包含无定义或反常区域，请使用有限且连续的区间。': 'The integral crosses an undefined or improper domain. Use a finite continuous interval.',
  '积分结果超出有限数值范围。': 'The integral is outside the finite numerical range.',
  '暂时无法生成微积分图像，请检查公式后重试。': 'The calculus graph could not be generated. Check the formula and try again.',
  '请填写有效的 X、Y、Z 范围；三维俯仰角须为 10 至 80 度。': 'Use valid X, Y and Z ranges; the 3D elevation must be between 10 and 80 degrees.',
  '曲面过于复杂，请简化公式或缩小坐标范围。': 'The surface is too complex. Simplify the equation or narrow its ranges.',
  '曲面过于复杂，请简化公式后再绘图。': 'The surface is too complex. Simplify the equation before plotting it.',
  '此范围内没有可显示的曲面，请检查公式或调整 X、Y、Z 范围。': 'No finite surface is visible. Check the equation or adjust the X, Y and Z ranges.',
  '暂时无法生成曲面，请检查公式后重试。': 'The surface could not be generated. Check the formula and try again.',
  '点击插入结构并填方框（仅排版，不计算或求解）。': 'Click to insert a structure and fill the boxes (typesetting only, no solving).',
  '点击插入结构并填写方框。': 'Click to insert a structure and fill the boxes.',
  '公式超过 4096 字符，已切换为源码编辑（缩短后恢复可视化）。': 'Formula exceeds 4096 characters; switched to source editing (shorten to restore visual editing).',
  '点击插入集合或数列记号，填完方框后保存。': 'Click to insert set or sequence notation; fill placeholders before saving.',
  '点击插入符号或函数；选中内容后点击可自动包裹。': 'Click to insert a symbol or function; select content first to wrap it automatically.',
  '选择行列数并填写每一格。': 'Choose rows and columns, then fill each cell.',
  '取消不会修改当前公式': 'Canceling leaves the current equation unchanged',
  '预览不会更改公式；插入或替换后仍需保存笔记': 'Previewing does not change the equation; save the note after inserting or replacing',
  '刷新矩阵预览': 'Refresh matrix preview',
  '刷新方程组预览': 'Refresh system preview',
  '预览已就绪，可直接插入。': 'Preview ready to insert.',
  '预览已就绪，可直接应用。': 'Preview ready to apply.',
  '矩阵': 'Matrix',
  '方程组': 'System',
  '逐行填写方程或不等式，自动加左大括号。': 'Enter one equation or inequality per line with an automatic left brace.',
  '取消不会更改原公式': 'Canceling leaves the original equation unchanged',
  '粘贴带 $、$$ 或环境的公式，确认后替换当前公式。': 'Paste a formula with $, $$, or environments, then confirm to replace the current equation.',
  '导入公式': 'Import',
  '粘贴带 $、$$ 或环境的单条公式': 'Paste a single formula with $, $$, or environments',
  '扩展数学工具': 'Extended math tools',
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
  match = /^(图像|复平面|极坐标|三维曲面|微积分图像) (\d+) ·(?: ([\s\S]*))?$/.exec(text);
  if (match) return `${dictionary[match[1]]} ${match[2]} ·${match[3] === undefined ? '' : ` ${match[3]}`}`;
  match = /^(X|Y|Z|Re|Im|θ) (最小值|最大值)$/.exec(text);
  if (match) return `${match[1]} ${spanish ? match[2] === '最小值' ? 'mín.' : 'máx.' : match[2] === '最小值' ? 'min' : 'max'}`;
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
  const spatialNames: Readonly<Record<string, [string, string]>> = {
    'Two planes': ['两个平面', 'Dos planos'], 'Line and plane': ['直线与平面', 'Recta y plano'], 'Sphere and plane': ['球体与平面', 'Esfera y plano'],
  };
  const spatialTitle = /^Spatial relations: (Two planes|Line and plane|Sphere and plane)$/.exec(text);
  if (spatialTitle) return `${spanish ? 'Relaciones espaciales: ' : '空间关系：'}${spatialNames[spatialTitle[1]][spanish ? 1 : 0]}`;
  const spatialFixed: Readonly<Record<string, [string, string]>> = {
    'Fixed spatial-relation teaching scene. Conclusions describe infinite planes and lines; the displayed patches and line segments are finite. Equal-scale orthographic view. Curved surfaces are polygonal approximations.': ['固定的空间关系教学场景。关系结论针对无限平面和直线；画面中的平面片和线段为有限大小。采用等比例正交视图，曲面为多边形近似。', 'Escena didáctica fija de relaciones espaciales. Las conclusiones describen planos y rectas infinitos; las regiones y los segmentos mostrados son finitos. Vista ortográfica con escala uniforme. Las superficies curvas son aproximaciones poligonales.'],
    'Planes intersect in a line.': ['两个平面相交于一条直线。', 'Los planos se intersectan en una recta.'],
    'Planes are parallel and distinct.': ['两个平面平行且不重合。', 'Los planos son paralelos y distintos.'],
    'Planes coincide.': ['两个平面重合。', 'Los planos coinciden.'],
    'The line intersects the plane at one point.': ['直线与平面相交于一点。', 'La recta intersecta el plano en un punto.'],
    'The line is parallel to and outside the plane.': ['直线与平面平行，且不在平面内。', 'La recta es paralela al plano y no está contenida en él.'],
    'The line lies in the plane.': ['直线在平面内。', 'La recta está contenida en el plano.'],
    'The plane cuts the sphere in a circle.': ['平面与球体相交成圆。', 'El plano corta la esfera en una circunferencia.'],
    'The plane is tangent to the sphere at one point.': ['平面与球体相切于一点。', 'El plano es tangente a la esfera en un punto.'],
    'The plane and sphere do not intersect.': ['平面与球体不相交。', 'El plano y la esfera no se intersectan.'],
    'Near a critical case: the displayed relation is a numerical approximation; inputs were not snapped.': ['接近临界情况：显示关系为数值近似；输入数值未被吸附或改写。', 'Caso próximo a un límite: la relación mostrada es una aproximación numérica; los valores de entrada no se han ajustado.'],
    'The intersection lies outside the shown view.': ['交点或交线位于当前画面之外。', 'La intersección está fuera de la vista mostrada.'],
    'Infinite planes and lines; finite displayed patches.': ['无限平面与直线；画面只显示有限片段。', 'Planos y rectas infinitos; regiones mostradas finitas.'],
  };
  if (Object.hasOwn(spatialFixed, text)) return spatialFixed[text][spanish ? 1 : 0];
  const geometryDescription = 'Orthographic view with equal scale on X, Y and Z. Regular bases use the center-to-vertex radius. Curved surfaces are polygonal approximations.';
  if (text === geometryDescription) return spanish
    ? 'Vista ortográfica con la misma escala en X, Y y Z. Las bases regulares usan el radio del centro al vértice. Las superficies curvas son aproximaciones poligonales.'
    : 'X、Y、Z 采用相同比例的正交视图。正多边形底面采用中心到顶点的半径。曲面为多边形近似。';
  const geometryNames: Readonly<Record<string, [string, string]>> = {
    Sphere: ['球体', 'Esfera'], Cylinder: ['圆柱体', 'Cilindro'], Cone: ['圆锥体', 'Cono'],
    'Regular pyramid': ['正棱锥', 'Pirámide regular'], 'Regular prism': ['正棱柱', 'Prisma regular'],
    Cuboid: ['长方体', 'Ortoedro'], Plane: ['平面片', 'Plano'],
  };
  const geometryTitle = /^Geometry: (Sphere|Cylinder|Cone|Regular pyramid|Regular prism|Cuboid|Plane)$/.exec(text);
  if (geometryTitle) return `${spanish ? 'Geometría: ' : '几何模型：'}${geometryNames[geometryTitle[1]][spanish ? 1 : 0]}`;
  const geometryDimensions = text.split(' · ');
  if (geometryDimensions.length && geometryDimensions.every(part => /^(Radius|Width|Depth|Height|Sides|Angle|Offset) = [+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?°?$/.test(part))) {
    const labels: Readonly<Record<string, [string, string]>> = {
      Radius: ['半径', 'Radio'], Width: ['宽度', 'Anchura'], Depth: ['深度', 'Profundidad'], Height: ['高度', 'Altura'], Sides: ['边数', 'Lados'], Angle: ['夹角', 'Ángulo'], Offset: ['偏移', 'Desplazamiento'],
    };
    return geometryDimensions.map(part => {
      const [label, value] = part.split(' = ');
      return `${labels[label][spanish ? 1 : 0]} = ${value}`;
    }).join(' · ');
  }
  const geometryView = /^View ([+\-\d.eE]+)° \/ ([+\-\d.eE]+)° · ([+\-\d.eE]+)×$/.exec(text);
  if (geometryView) return `${spanish ? 'Vista' : '视角'} ${geometryView[1]}° / ${geometryView[2]}° · ${geometryView[3]}×`;
  const description = 'Approximate numerical graph. The horizontal axis is X and the vertical axis is Y. Trigonometric arguments use radians. Domain gaps and unresolved discontinuities are omitted.';
  if (text === description) return spanish
    ? 'Gráfica numérica aproximada. El eje horizontal es X y el vertical es Y. Los argumentos trigonométricos usan radianes. Se omiten los huecos del dominio y las discontinuidades no resueltas.'
    : '数值近似图像。横轴为 X，纵轴为 Y。三角函数参数采用弧度。省略定义域空缺和未能解析的间断。';
  if (text === 'Complex plane') return spanish ? 'Plano complejo' : '复平面';
  const surfaceDescription = 'Approximate numerical wireframe of z = f(x,y). Each axis is scaled independently to its displayed range. Trigonometric arguments use radians. Missing real values and unresolved discontinuities are omitted.';
  if (text === surfaceDescription) return spanish
    ? 'Malla numérica aproximada de z = f(x,y). Cada eje se escala de forma independiente según su intervalo visible. Los argumentos trigonométricos usan radianes. Se omiten los valores no reales y las discontinuidades no resueltas.'
    : 'z = f(x,y) 的数值近似线框。各轴根据显示范围独立缩放。三角函数参数采用弧度。省略无实数值的区域和未能解析的间断。';
  const surfaceMatch = /^3D surface: z = ([\s\S]*); X, Y and Z axes$/.exec(text);
  if (surfaceMatch) return spanish
    ? `Superficie 3D: z = ${surfaceMatch[1]}; ejes X, Y y Z`
    : `三维曲面：z = ${surfaceMatch[1]}；X、Y 和 Z 轴`;
  const polarDescription = 'Approximate polar graph in radians. Equal distance has equal scale on X and Y. Domain gaps and unresolved discontinuities are omitted.';
  if (text === polarDescription) return spanish
    ? 'Gráfica polar aproximada en radianes. Las distancias tienen la misma escala en X e Y. Se omiten los huecos del dominio y las discontinuidades no resueltas.'
    : '采用弧度的数值近似极坐标图。X 与 Y 轴每单位长度相同。省略定义域空缺和未能解析的间断。';
  const derivativeDescription = 'Approximate numerical derivative from finite differences. Undefined points, detected cusps and unresolved discontinuities are omitted. This is not symbolic differentiation.';
  if (text === derivativeDescription) return spanish
    ? 'Derivada numérica aproximada mediante diferencias finitas. Se omiten los puntos no definidos, las cúspides detectadas y las discontinuidades no resueltas. No es una derivación simbólica.'
    : '采用有限差分的数值近似导数。省略无定义点、检测到的尖点和未能解析的间断。这不是符号求导。';
  const integralDescription = 'Approximate signed definite integral of a real continuous function. Shading marks the selected interval within the viewport. Numerical estimates are not symbolic results or convergence proofs.';
  if (text === integralDescription) return spanish
    ? 'Integral definida con signo aproximada de una función real continua. El sombreado indica el intervalo seleccionado dentro de la vista. Las estimaciones numéricas no son resultados simbólicos ni pruebas de convergencia.'
    : '实数连续函数的带符号定积分数值近似。阴影表示当前视图内的选定区间。数值估计不是符号结果或收敛证明。';
  const polarTitle = /^Polar graph: r = ([\s\S]*)$/.exec(text);
  if (polarTitle) return spanish ? `Gráfica polar: r = ${polarTitle[1]}` : `极坐标图：r = ${polarTitle[1]}`;
  const polarFooter = /^≈ · θ ([+\-\d.eE]+) to ([+\-\d.eE]+) rad · equal scale$/.exec(text);
  if (polarFooter) return spanish
    ? `≈ · θ ${polarFooter[1]} a ${polarFooter[2]} rad · misma escala`
    : `≈ · θ ${polarFooter[1]} 至 ${polarFooter[2]} rad · 等比例坐标`;
  const axisSuffix = '; horizontal axis X, vertical axis Y';
  const hasAxisSuffix = text.endsWith(axisSuffix);
  const calculusTitle = /^(Derivative|Second derivative|Definite integral): ([\s\S]*)$/.exec(hasAxisSuffix ? text.slice(0, -axisSuffix.length) : text);
  if (calculusTitle) {
    const labels: Readonly<Record<string, [string, string]>> = {
      Derivative: ['导数', 'Derivada'], 'Second derivative': ['二阶导数', 'Segunda derivada'], 'Definite integral': ['定积分', 'Integral definida'],
    };
    const title = `${labels[calculusTitle[1]][spanish ? 1 : 0]}${spanish ? ': ' : '：'}${calculusTitle[2]}`;
    return title + (hasAxisSuffix ? spanish ? '; eje horizontal X, eje vertical Y' : '；横轴 X，纵轴 Y' : '');
  }
  if (text === '≈ · finite differences · rad') return spanish ? '≈ · diferencias finitas · rad' : '≈ · 有限差分 · rad';
  const integralFooter = /^∫ (\[[+\-\d.eE]+, [+\-\d.eE]+\] ≈ [+\-\d.eE]+) · numerical estimate · rad$/.exec(text);
  if (integralFooter) return spanish ? `∫ ${integralFooter[1]} · estimación numérica · rad` : `∫ ${integralFooter[1]} · 数值估计 · rad`;
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
  const plotSelector = ['function', 'complex', 'polar', 'surface', 'geometry', 'calculus', 'derivative', 'second-derivative', 'integral']
    .map(mode => `svg[data-vme-plot="${mode}"]`).join(',');
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
      // This name is derived from translated label text below. Translating the
      // previous derived value would briefly announce the wrong language.
      if (name === 'aria-label' && element.localName === 'math-field' && element.hasAttribute('aria-labelledby')) {
        entries.delete(name); continue;
      }
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
    // MathLive copies the accessible name to its keyboard sink when mounted,
    // but does not observe later text changes in aria-labelledby targets.
    // Updating this public attribute asks it to reread the translated label;
    // no formula, focus or internal MathLive DOM is changed.
    for (const field of root.querySelectorAll<HTMLElement>('math-field[aria-labelledby]')) {
      const ids = (field.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
      const name = ids.map(id => {
        const label = field.ownerDocument.getElementById(id);
        // Only our local UI labels qualify. A wrapping label could contain
        // formula text, which must never become translated editor UI.
        return label && root.contains(label) && !label.contains(field) ? label.textContent ?? '' : '';
      }).join(' ').replace(/\s+/g, ' ').trim();
      if (name && field.getAttribute('aria-label') !== name) field.setAttribute('aria-label', name);
    }
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
