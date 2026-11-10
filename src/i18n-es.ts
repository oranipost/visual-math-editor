/** Spanish UI strings. Scientific symbols, user input and stored LaTeX are unchanged. */
export const SPANISH_TRANSLATIONS: Readonly<Record<string, string>> = {
  '公式超过 4096 个 UTF-16 代码单元，暂用 LaTeX 或 Hybrid 源码编辑；原文完整保留，缩短后可恢复可视化。': 'Esta fórmula supera las 4096 unidades de código UTF-16. Continúa en LaTeX o Hybrid con edición de código; se conserva el original completo. Acórtala para recuperar la edición visual.',
  '可视化预览已暂停，可继续编辑并保存源码。': 'La vista previa visual está en pausa. Puedes seguir editando y guardando el código.',
  // Local-only set, sequence and equation-system notation tools.
  "集合与数列": "Conjuntos y sucesiones",
  "选择结构后填写方框；这里只排版，不求解。集合的变量和条件由你填写。": "Elige una estructura y rellena sus casillas. Estas herramientas dan formato sin resolver. Escribe las variables y condiciones del conjunto.",
  "集合与常用数集": "Conjuntos y conjuntos numéricos",
  "集合关系符号": "Símbolos de conjuntos",
  "数列模板": "Plantillas de sucesiones",
  "数列默认用 a 表示，所有字符都能直接编辑。等差或等比通项依次填写首项与公差或公比。": "Las sucesiones usan a por defecto; todos los caracteres son editables. Para el término aritmético o geométrico, rellena el primer término y después la diferencia o razón común.",
  "列举集合": "Conjunto por extensión",
  "插入集合大括号，可包裹选中内容": "Insertar llaves de conjunto; envolver el contenido seleccionado",
  "集合描述": "Conjunto por comprensión",
  "插入集合描述，填写变量和条件": "Insertar conjunto por comprensión; rellenar la variable y la condición",
  "自然数集": "Números naturales",
  "插入自然数集符号": "Insertar símbolo de números naturales",
  "整数集": "Números enteros",
  "插入整数集符号": "Insertar símbolo de números enteros",
  "有理数集": "Números racionales",
  "插入有理数集符号": "Insertar símbolo de números racionales",
  "实数集": "Números reales",
  "插入实数集符号": "Insertar símbolo de números reales",
  "复数集": "Números complejos",
  "插入复数集符号": "Insertar símbolo de números complejos",
  "属于": "Pertenece a",
  "插入属于符号": "Insertar símbolo de pertenencia",
  "不属于": "No pertenece a",
  "插入不属于符号": "Insertar símbolo de no pertenencia",
  "子集符号 ⊂": "Símbolo de subconjunto ⊂",
  "插入子集符号 ⊂": "Insertar símbolo de subconjunto ⊂",
  "子集或相等": "Subconjunto o igual",
  "插入子集或相等符号": "Insertar símbolo de subconjunto o igual",
  "并集": "Unión",
  "插入并集符号": "Insertar símbolo de unión",
  "交集": "Intersección",
  "插入交集符号": "Insertar símbolo de intersección",
  "空集": "Conjunto vacío",
  "插入空集符号": "Insertar símbolo de conjunto vacío",
  "数列项": "Término de sucesión",
  "插入数列项，填写下标": "Insertar término de sucesión; rellenar el índice",
  "数列大括号": "Llaves de sucesión",
  "插入数列大括号，填写下标": "Insertar llaves de sucesión; rellenar el índice",
  "有限数列": "Sucesión finita",
  "插入有限数列，填写末项下标": "Insertar sucesión finita; rellenar el índice final",
  "等差通项": "Término aritmético",
  "插入等差通项，填写首项与公差": "Insertar término aritmético; rellenar el primer término y la diferencia común",
  "等比通项": "Término geométrico",
  "插入等比通项，填写首项与公比": "Insertar término geométrico; rellenar el primer término y la razón común",
  "方程组大括号": "Sistema de ecuaciones",
  "逐行填写方程或不等式，自动加左大括号；这里只编辑，不求解。": "Escribe una ecuación o desigualdad en cada fila; se añade una llave izquierda. Este editor no resuelve el sistema.",
  "方程组行数": "Filas del sistema",
  "载入当前方程组": "Cargar sistema actual",
  "减少行数会保留本次隐藏行；取消不会更改原公式。": "Al reducir las filas, las ocultas se conservan durante esta sesión. Cancelar mantiene la fórmula original.",
  "未应用的方程组行原文": "Texto original de fila sin aplicar",
  "方程组预览": "Vista previa del sistema",
  "预览方程组": "Previsualizar sistema",
  "插入方程组": "Insertar sistema",
  "替换当前方程组": "Reemplazar sistema actual",
  "取消方程组编辑": "Cancelar edición del sistema",
  "当前公式已更改，请重新载入方程组后再替换。": "La fórmula cambió. Vuelve a cargar el sistema antes de reemplazarlo.",
  "方程组已加入公式草稿；保存后才更新笔记。": "El sistema se añadió al borrador de la fórmula. Guarda para actualizar la nota.",
  "方程组未插入；请检查每行内容和当前公式。": "No se insertó el sistema. Revisa cada fila y la fórmula actual.",
  "输入已修改，请重新预览方程组。": "La entrada cambió. Vuelve a previsualizar el sistema.",
  "方程行": "Fila de ecuación",
  "这一行暂不支持这段内容；粘贴原文保留在下方，方程组未改动。": "Esta fila no admite esa entrada. El texto pegado se conserva debajo; el sistema no cambió.",
  "请填写每一行；空行不会自动补零或删除。": "Rellena todas las filas. Las vacías no se rellenan con cero ni se eliminan automáticamente.",
  "方程组包含暂不支持的内容；原公式未改动。": "El sistema contiene una entrada no admitida. La fórmula original no cambió.",
  "当前整条公式不是受支持的单列方程组，原公式未改动。": "La fórmula completa no es un sistema admitido de una sola columna. La fórmula original no cambió.",

  "请选择受支持的空间关系及对应参数。": "Elige una relación espacial admitida y sus parámetros correspondientes.",
  "偏移须为 −4 至 4 之间的有效数值。": "Usa un desplazamiento finito con signo entre −4 y 4.",
  "此场景的球体半径须为 0.1 至 4 之间的有效数值。": "Usa un radio de esfera finito entre 0.1 y 4.",
  "夹角须为 0 至 90 度之间的有效数值。": "Usa un ángulo finito entre 0 y 90 grados.",
  "暂时无法生成空间关系场景，请检查参数后重试。": "No se pudo generar la escena de relaciones espaciales. Revisa los parámetros e inténtalo de nuevo.",
  // Fixed local spatial-relation scenes.
  "两个平面": "Dos planos",
  "直线与平面": "Recta y plano",
  "球体与平面": "Esfera y plano",
  "夹角（度）": "Ángulo (grados)",
  "有符号偏移": "Desplazamiento con signo",
  "法向偏移": "Desplazamiento normal",
  "直线参考点高度 Z": "Altura Z del punto de la recta",
  "平面高度 Z": "Altura Z del plano",
  "参考平面为 z=0；调整第二个平面的夹角（0–90°）和法向偏移（−4 至 4）。关系针对无限平面，画面只显示有限平面片。": "El plano de referencia es z=0. Ajusta el ángulo del segundo plano (0–90°) y su desplazamiento normal (−4 a 4). Las relaciones usan planos infinitos; las regiones mostradas son finitas.",
  "平面固定为 z=0；调整直线夹角（0–90°）和参考点高度（−4 至 4）。关系针对无限直线和平面，画面只显示有限片段。": "El plano está fijo en z=0. Ajusta el ángulo de la recta (0–90°) y la altura de su punto de referencia (−4 a 4). Las relaciones usan una recta y un plano infinitos; solo se muestran segmentos y regiones finitos.",
  "球心固定在原点；平面为 z=偏移。半径范围 0.1–4，偏移范围 −4 至 4。关系针对无限平面，画面只显示有限平面片。": "El centro de la esfera está en el origen; el plano es z=desplazamiento. El radio va de 0.1 a 4 y el desplazamiento de −4 a 4. La relación usa un plano infinito; la región mostrada es finita.",
  "两个平面相交": "Los planos se intersectan",
  "两个平面平行": "Los planos son paralelos",
  "两个平面重合": "Los planos coinciden",
  "直线与平面相交": "La recta intersecta el plano",
  "直线与平面平行": "La recta es paralela al plano",
  "直线在平面内": "La recta está contenida en el plano",
  "球体与平面相交成圆": "La esfera y el plano se intersectan en una circunferencia",
  "球体与平面相切": "La esfera y el plano son tangentes",
  "球体与平面不相交": "La esfera y el plano no se intersectan",
  "接近临界情况：显示关系为数值近似；输入数值未被吸附或改写。": "Caso próximo a un límite: la relación mostrada es una aproximación numérica; los valores de entrada no se han ajustado.",
  "交点或交线位于当前画面之外。": "La intersección está fuera de la vista mostrada.",
  // Offline geometry controls.
  "几何模型": "Modelos geométricos",
  "形状": "Forma",
  "球体": "Esfera",
  "圆柱体": "Cilindro",
  "圆锥体": "Cono",
  "正棱锥": "Pirámide regular",
  "正棱柱": "Prisma regular",
  "长方体": "Ortoedro",
  "平面片": "Plano",
  "半径": "Radio",
  "宽度": "Anchura",
  "深度": "Profundidad",
  "高度": "Altura",
  "底面边数": "Lados de la base",
  "底面外接圆半径": "Circunradio de la base",
  "显示方式": "Aspecto",
  "面与边": "Caras y aristas",
  "线框": "Estructura de alambre",
  "所有长度采用相同单位；底面半径指中心到顶点的距离。平面为有限的 XY 平面片。": "Usa la misma unidad para todas las longitudes. El radio de la base va del centro a un vértice. El plano es una región finita de XY.",
  "拖动模型旋转，滚轮缩放；插入或保存后才保留尺寸与视图。": "Arrastra el modelo para girarlo y usa la rueda para acercar o alejar. Inserta o guarda para conservar las dimensiones y la vista.",
  "几何模型采用等比例正交视图；曲面为多边形近似，仅作几何示意。": "Los modelos geométricos usan una vista ortográfica con escala uniforme. Las superficies curvas son aproximaciones poligonales para ilustraciones geométricas.",
  "请选择受支持的几何体或平面。": "Elige un sólido geométrico o un plano admitido.",
  "请使用受支持的几何设置和尺寸。": "Usa únicamente ajustes y dimensiones geométricas admitidos.",
  "尺寸须为 0.001 至 1000 之间的有效数值。": "Las longitudes deben ser números finitos entre 0.001 y 1000.",
  "正棱锥或正棱柱的底面边数须为 3 至 12 的整数。": "Usa de 3 a 12 lados enteros para una pirámide o un prisma regular.",
  "请使用有效视角；俯仰角为 10 至 80 度，缩放为 0.25 至 4。": "Usa un ángulo de cámara finito, una elevación de 10 a 80 grados y un zoom de 0.25 a 4.",
  "几何模型不使用函数表达式；请重新选择模型。": "Usa una expresión geométrica vacía y límites X/Y válidos.",
  "暂不支持超过 1000:1 的尺寸比例。": "No se admiten proporciones dimensionales superiores a 1000:1.",
  // Fixed trigonometry and geometry notation tools.
  "三角函数与几何符号": "Trigonometría y geometría",
  "函数可填写方框或套用选中内容。相似 ∼、全等 ≅、角 ∠、三角形 △ 和直角 90° 含义不同。": "Rellena el cuadro de una función o aplícala al contenido seleccionado. La semejanza ∼, la congruencia ≅, el ángulo ∠, el triángulo △ y el ángulo recto 90° tienen significados distintos.",
  "正弦": "Seno",
  "余弦": "Coseno",
  "正切": "Tangente",
  "相似": "Semejanza",
  "全等": "Congruencia",
  "角": "Ángulo",
  "三角形": "Triángulo",
  "直角": "Ángulo recto",
  "插入正弦函数": "Insertar función seno",
  "插入余弦函数": "Insertar función coseno",
  "插入正切函数": "Insertar función tangente",
  "插入相似符号": "Insertar símbolo de semejanza",
  "插入全等符号": "Insertar símbolo de congruencia",
  "插入角符号": "Insertar símbolo de ángulo",
  "插入三角形符号": "Insertar símbolo de triángulo",
  "插入直角 90°": "Insertar ángulo recto de 90°",
  // Offline matrix structure editor.
  "矩阵编辑器": "Editor de matrices",
  "行数": "Filas",
  "列数": "Columnas",
  "矩阵括号": "Delimitadores de la matriz",
  "圆括号": "Paréntesis",
  "方括号": "Corchetes",
  "无括号": "Sin delimitadores",
  "花括号": "Llaves",
  "行列式竖线": "Barras de determinante",
  "双竖线": "Barras dobles",
  "单元格": "Celda",
  "矩阵预览": "Vista previa de la matriz",
  "载入当前矩阵": "Cargar la matriz actual",
  "预览矩阵": "Previsualizar la matriz",
  "插入矩阵": "Insertar matriz",
  "替换当前矩阵": "Sustituir la matriz actual",
  "空白单元格填0": "Rellenar las celdas vacías con 0",
  "取消矩阵编辑": "Cancelar la edición de la matriz",
  "选择行列数并填写每一格；这里只编辑矩阵，不计算矩阵运算。": "Elige el número de filas y columnas y rellena cada celda. Este editor crea la notación; no calcula operaciones matriciales.",
  "所有单元格都需要填写；也可明确选择填0。": "Rellena todas las celdas o elige expresamente rellenar las vacías con 0.",
  "当前整条公式不是受支持的单个矩阵，原公式未改动。": "La ecuación actual completa no es una sola matriz admitida. La ecuación original no ha cambiado.",
  "当前公式已更改，请重新载入矩阵后再替换。": "La ecuación actual ha cambiado. Vuelve a cargar la matriz antes de sustituirla.",
  "单元格暂不支持这段内容；原始粘贴内容保留在下方，当前矩阵未改动。": "Este contenido no se admite en una celda. El texto original pegado se conserva abajo; la matriz actual no ha cambiado.",
  "未应用的单元格原文": "Entrada original de celda sin aplicar",
  "请先完成或取消公式导入，再编辑矩阵。": "Completa o cancela la importación de la ecuación antes de editar una matriz.",
  "矩阵未插入；请检查单元格和当前公式。": "No se insertó la matriz. Revisa las celdas y la ecuación actual.",
  "预览不会更改公式；插入或替换后仍需保存笔记。": "La vista previa no cambia la ecuación. Después de insertarla o sustituirla, todavía debes guardar la nota.",
  "矩阵已加入公式草稿；保存后才更新笔记。": "La matriz está en el borrador de la ecuación. La nota solo cambia al guardar.",
  "矩阵尺寸改变会保留已有单元格；超出当前范围的内容仍保留到本次关闭。": "Al cambiar el tamaño se conservan las celdas existentes. El contenido fuera de las dimensiones actuales se conserva hasta cerrar esta sesión.",
  "当前矩阵包含暂不支持的单元格；原公式未改动。": "La matriz actual contiene celdas no admitidas. La ecuación original no ha cambiado.",
  "输入已修改，请重新预览矩阵。": "La entrada ha cambiado. Vuelve a previsualizar la matriz.",
  // Offline advanced-math structure insertion.
  "高等数学模板": "Matemáticas avanzadas",
  "点击插入数学结构，再填写方框。这里只编辑公式，不计算或求解。": "Inserta una estructura matemática y rellena los cuadros. Estas herramientas editan la notación; no calculan ni resuelven.",
  "极限": "Límite",
  "普通导数": "Derivada ordinaria",
  "二阶导数": "Segunda derivada",
  "二重积分": "Integral doble",
  "无穷级数": "Serie infinita",
  "连乘积": "Producto",
  "向量": "Vector",
  "梯度": "Gradiente",
  "插入极限模板": "Insertar plantilla de límite",
  "插入普通导数模板": "Insertar plantilla de derivada ordinaria",
  "插入二阶导数模板": "Insertar plantilla de segunda derivada",
  "插入偏导数模板": "Insertar plantilla de derivada parcial",
  "插入二重积分模板": "Insertar plantilla de integral doble",
  "插入无穷级数模板": "Insertar plantilla de serie infinita",
  "插入连乘积模板": "Insertar plantilla de producto",
  "插入向量模板": "Insertar plantilla de vector",
  "插入梯度模板": "Insertar plantilla de gradiente",
  '较长或多行公式使用上下布局：上方源码与下方公式双向同步。': 'Las ecuaciones largas o de varias líneas usan una disposición vertical: el código arriba y la edición visual abajo permanecen sincronizados.',
  // Single-equation import staging and source-preservation messages.
  '复制导入原文': 'Copiar la entrada original',
  '导入原文已复制。': 'Se ha copiado la entrada original.',
  '未能复制原文，请保留导入面板后重试。': 'No se pudo copiar la entrada original. Mantén abierto el panel de importación e inténtalo de nuevo.',
  '导入单条公式': 'Importar una ecuación',
  '先检查候选；应用会替换当前整条公式，保存后才更新笔记。': 'Revisa primero la propuesta. Al aplicarla se sustituye toda la ecuación actual; la nota solo cambia al guardar.',
  '载入当前源码': 'Cargar código actual',
  '导入原文': 'Entrada original',
  '检查并预览': 'Comprobar y previsualizar',
  '候选源码（不含外包装）': 'Código propuesto (sin delimitadores externos)',
  '应用并替换公式': 'Aplicar y sustituir la ecuación',
  '导入未应用；当前公式和导入原文仍保留，请检查后重试。': 'No se aplicó la importación. La ecuación actual y la entrada original se conservan. Revisa la entrada e inténtalo de nuevo.',
  '取消导入': 'Cancelar importación',
  '候选排版：独立公式': 'Formato propuesto: ecuación en bloque',
  '候选排版：行内公式（保存时换行会转换为空格）': 'Formato propuesto: ecuación en línea (los saltos de línea se convierten en espacios al guardar)',
  '仅源码可用：部分命令无法可视化。应用后请在源码模式检查；笔记环境也可能不支持这些命令。': 'Solo código: algunos comandos no se pueden editar visualmente. Revisa el código después de aplicarlo; es posible que tu entorno de notas tampoco admita estos comandos.',
  '可视化预览可用。请检查结构；应用前当前公式保持不变。': 'La vista previa visual está disponible. Revisa la estructura; la ecuación actual no cambia hasta que apliques la propuesta.',
  '仅按源码应用并替换': 'Aplicar solo el código y sustituir',
  '原文已修改，请重新检查并预览。': 'La entrada original ha cambiado. Vuelve a comprobarla y previsualizarla.',
  '这里只导入单条公式；请移除正文、多条公式或额外的数学分隔符。': 'Importa una sola ecuación. Quita el texto que la rodea, las ecuaciones adicionales o los delimitadores matemáticos sobrantes.',
  '公式外层分隔符不匹配；请检查 $、$$、\\(…\\) 或 \\[...\\]。': 'Los delimitadores externos no coinciden. Revisa $, $$, \\(…\\) o \\[...\\].',
  '这里只导入单条 LaTeX 公式，暂不支持完整文档、文件引用或宏定义。': 'Importa una sola ecuación LaTeX. No se admiten documentos completos, referencias a archivos ni definiciones de macros.',
  '输入包含 MathLive 模板参数（#0、#1、#? 或 #@）；原文已保留，请改用普通公式源码。': 'La entrada contiene parámetros de plantilla de MathLive (#0, #1, #? o #@). La entrada original se conserva. Usa código normal de ecuación.',
  '公式结构过深，单条导入暂限 32 层；原文已保留。': 'La ecuación tiene demasiados niveles de anidamiento. La importación admite actualmente hasta 32 niveles explícitos. La entrada original se conserva.',
  '公式命令过多，单条导入暂限 512 个命令；原文已保留。': 'La ecuación tiene demasiados comandos. La importación admite actualmente hasta 512 comandos. La entrada original se conserva.',
  '公式过长，单条导入暂限 8192 个字符；原文已保留。': 'La ecuación es demasiado larga. La importación admite actualmente hasta 8192 caracteres. La entrada original se conserva.',
  '请先粘贴或输入一条 LaTeX 公式。': 'Primero pega o escribe una ecuación LaTeX.',
  '输入包含不可见的控制字符；原文已保留，请检查后重试。': 'La entrada contiene caracteres de control invisibles. La entrada original se conserva. Revísala e inténtalo de nuevo.',
  '公式内容为空；请填写公式后再应用。': 'La ecuación está vacía. Introduce una ecuación antes de aplicarla.',
  '仅源码保存不会修复未知命令。行内保存会把换行转换为空格；需要保留多行请选独立公式。': 'Guardar el código no corrige los comandos desconocidos. Al guardar en línea, los saltos de línea se convierten en espacios; elige una ecuación en bloque para conservar varias líneas.',
  '行内保存会把换行转换为空格；需要保留多行请选独立公式。': 'Al guardar en línea, los saltos de línea se convierten en espacios; elige una ecuación en bloque para conservar varias líneas.',
  '只输入公式内容；带外包装的整式请用“导入单条公式”。': 'Introduce solo el contenido de la ecuación. Para una ecuación completa con delimitadores externos, usa Importar una ecuación.',
  '界面语言 / Interface language': 'Idioma de la interfaz',
  '示例：x^2, sin(x), 1/x': 'Ejemplos: x^2, sin(x), 1/x',
  '跟随 Obsidian': 'Usar el idioma de Obsidian',
  '跟随 Obsidian / Follow Obsidian': 'Usar el idioma de Obsidian',
  '系统 / System': 'Sistema',
  '无法保存语言偏好 / Unable to save language preference': 'No se pudo guardar la preferencia de idioma',
  '图像': 'Gráfica', '复平面': 'Plano complejo', '函数图像': 'Gráfica de función', '图像类型': 'Tipo de gráfica',
  '极坐标': 'Gráfica polar', '三维曲面': 'Superficie 3D', '微积分图像': 'Gráfica de cálculo',
  '公式位置无效，请重新打开编辑器。': 'La posición de la ecuación no es válida. Vuelve a abrir el editor.',
  '此位置位于表格、列表或引用块。第一版请使用行内公式，或到普通空白段落插入独立公式。': 'Esta posición está dentro de una tabla, lista o cita. Usa una ecuación en línea aquí o inserta una ecuación en bloque en un párrafo vacío normal.',
  '表格内暂不支持含竖线的复杂环境，请在表格外编辑这个公式。': 'Los entornos complejos con barras verticales aún no se admiten en tablas. Edita esta ecuación fuera de la tabla.',
  '修改只在保存图像后写入笔记。': 'Los cambios se escriben en la nota al guardar la gráfica.',
  '插入图像时，也会保存当前已完成的公式草稿。': 'Al insertar una gráfica también se guarda el borrador completo de la ecuación actual.',
  '函数 y = f(x)': 'Función y = f(x)', '复数（每行一个）': 'Números complejos (uno por línea)',
  '使用当前公式': 'Usar la ecuación actual', '坐标范围': 'Intervalos de los ejes',
  '预览图像': 'Previsualizar gráfica', '保存图像': 'Guardar gráfica', '插入图像': 'Insertar gráfica',
  '＋ 放大': '＋ Acercar', '− 缩小': '− Alejar', '适应所有点': 'Ajustar a todos los puntos',
  '填写函数后点击预览图像。': 'Introduce una función y selecciona Previsualizar gráfica.',
  '当前公式暂不能转换为单变量函数。请在此输入 y = f(x) 形式。': 'Esta ecuación aún no se puede convertir en una función de x. Introdúcela aquí como y = f(x).',
  '用普通写法输入，例如 x^2、2x + 1、sqrt(x)。': 'Usa notación habitual, por ejemplo x^2, 2x + 1 o sqrt(x).',
  '在图内拖动平移、滚轮或双指缩放；保存图像后才保留新视图。': 'Arrastra la gráfica para desplazarla y usa la rueda o el gesto de pellizco para ampliar. Guarda la gráfica para conservar la vista.',
  '离线绘制单变量函数；三角函数采用弧度，图线为数值近似。': 'Representa funciones de x sin conexión. Las funciones trigonométricas usan radianes; las curvas son aproximaciones numéricas.',
  '此预览页面可以画图；在 Obsidian 中可将图像插入笔记。': 'Puedes dibujar gráficas en esta vista previa. En Obsidian puedes insertarlas en una nota.',
  '输入已修改，请重新预览。': 'La entrada ha cambiado. Actualiza la vista previa.',
  '图像已就绪。点击保存图像更新笔记。': 'La gráfica está lista. Selecciona Guardar gráfica para actualizar la nota.',
  '图像已就绪。点击插入图像加入笔记。': 'La gráfica está lista. Selecciona Insertar gráfica para añadirla a la nota.',
  '输入 a+bi，例如 3+2i、−i、4；每行一个，最多 20 个点。': 'Introduce a+bi, por ejemplo 3+2i, −i o 4. Usa un número por línea, hasta 20 puntos.',
  'Re 为实轴、Im 为虚轴，两轴每单位长度相同；暂不计算复数表达式。': 'Re es el eje real e Im el imaginario; ambos tienen la misma escala. Aún no se evalúan expresiones complejas.',
  '正在插入图像…': 'Insertando gráfica…', '图像已插入笔记。': 'La gráfica se ha insertado en la nota.',
  '请先完成或清空当前公式，再插入图像。绘图输入和预览仍保留。': 'Completa o borra la ecuación actual antes de insertar una gráfica. La entrada y la vista previa se conservan.',
  '未能插入图像，输入和预览仍保留，请重试。': 'No se pudo insertar la gráfica. La entrada y la vista previa se conservan. Inténtalo de nuevo.',
  '未能保存或打开图像，视图草稿已暂存。可用“恢复公式草稿”命令在正文新位置继续；重启前请保存。': 'No se pudo guardar o abrir la gráfica. Su borrador se conserva temporalmente. Usa Recuperar borrador de ecuación en una nueva posición del texto normal; guárdalo antes de reiniciar.',
  '图像视图未能保存或打开。请重新打开图像再调整；已有恢复草稿已保留。': 'No se pudo guardar o abrir la vista de la gráfica. Vuelve a abrirla y ajústala. El borrador de recuperación existente se conserva.',
  '图像所在的视图已关闭或切换。请重新打开原笔记后重试。': 'Se cerró o cambió la vista que contiene la gráfica. Abre la nota original e inténtalo de nuevo.',
  '图像操作': 'Controles de la gráfica', '放大': 'Acercar', '缩小': 'Alejar', '重置视图': 'Restablecer vista', '保存视图': 'Guardar vista', '复数列表': 'Números complejos',
  '此范围暂时无法显示图像，请调整范围或重置视图。': 'La gráfica no se puede mostrar en este intervalo. Ajústalo o restablece la vista.',
  '视图已调整，尚未保存。点击“保存视图”更新笔记。': 'Esta vista aún no está guardada. Selecciona Guardar vista para actualizar la nota.',
  '拖动移动，滚动或双指缩放。调整后点击“保存视图”。': 'Arrastra para desplazar y usa la rueda o el gesto de pellizco para ampliar. Selecciona Guardar vista para conservar los cambios.',
  '请先完成或取消当前公式草稿，再保存或编辑图像。': 'Completa o cancela el borrador de ecuación actual antes de guardar o editar una gráfica.',
  '请先关闭当前公式窗口，再保存或编辑图像。': 'Cierra el diálogo de ecuación actual antes de guardar o editar una gráfica.',
  '视图已保存到笔记，可使用撤销恢复。': 'La vista se ha guardado en la nota. Puedes usar Deshacer para restaurarla.',
  '未能保存或打开图像。当前视图仍保留，请重新打开原笔记后重试。': 'No se pudo guardar o abrir la gráfica. La vista actual se conserva; abre la nota original e inténtalo de nuevo.',
  '编辑图像': 'Editar gráfica',
  '无法打开图像，请重新打开原笔记后重试。': 'No se pudo abrir la gráfica. Abre la nota original e inténtalo de nuevo.',
  '请先打开图像所在的原笔记。': 'Primero abre la nota original que contiene esta gráfica.',
  '图像位置暂时无法确认，请重新打开笔记。': 'No se pudo confirmar la posición de la gráfica. Vuelve a abrir la nota.',
  '图像配置无效或超出支持范围，原文已保留。': 'La configuración de la gráfica no es válida o no se admite. El texto original se conserva.',
  '请在主窗口的笔记编辑模式中重新打开图像。': 'Vuelve a abrir esta gráfica en el editor de notas de la ventana principal.',
  '＋ 在笔记末尾插入公式': '＋ Insertar una ecuación al final de esta nota',
  '这篇笔记还没有公式，点击上方按钮开始。': 'Esta nota aún no tiene ecuaciones. Usa el botón de arriba para empezar.',
  '悬停或聚焦元素查看质量与电子排布；点击加入化学输入框。': 'Pasa el cursor o enfoca un elemento para ver su masa y configuración electrónica; haz clic para añadirlo a la entrada química.',
  '标准原子量': 'Peso atómico estándar', '同位素质量数': 'Número másico del isótopo',
  '电子排布': 'Configuración electrónica', '各电子层电子数': 'Electrones por capa',
  '理论预测': 'Predicho', '计算值': 'Calculado', '数据来源': 'Fuentes',
  '方括号内为同位素质量数，不是标准原子量。': 'Los corchetes indican el número másico de un isótopo, no el peso atómico estándar.',
  '电子排布为理论预测。': 'La configuración electrónica es una predicción teórica.',
  '电子排布为计算值。': 'La configuración electrónica es un valor calculado.',
  '区间表示天然同位素组成造成的标准原子量变化。': 'El intervalo refleja la variación de la composición isotópica natural.',
  '编辑公式': 'Editar ecuación', '插入公式': 'Insertar ecuación',
  '选择熟悉的方式，写下你的公式。': 'Elige una forma familiar de escribir tu ecuación.',
  '本地离线': 'Sin conexión', '公式在本机编辑，无需账号或网络': 'Edita localmente, sin cuenta ni conexión a Internet.',
  '公式编辑模式': 'Modo de edición de ecuaciones', '直接编辑排版后的公式': 'Edita directamente la ecuación compuesta',
  '编辑公式源码': 'Edita el código de la ecuación', '源码与可视化双向同步': 'El código y la edición visual se mantienen sincronizados',
  '学科工具': 'Herramientas por materia', '数学': 'Matemáticas', '化学': 'Química', '物理': 'Física', '单位': 'Unidades', '元素表': 'Elementos',
  '公式结构': 'Estructuras de ecuaciones', '选择结构': 'Elige una estructura',
  '分数': 'fracción', '平方根': 'raíz cuadrada', 'n 次根': 'raíz enésima', '上标': 'superíndice', '下标': 'subíndice',
  '积分': 'integral', '求和': 'sumatoria', '括号': 'paréntesis',
  '可视化数学公式编辑区': 'Editor visual de ecuaciones', 'LaTeX 源码': 'Código LaTeX', 'LaTeX 公式源码': 'Código LaTeX de la ecuación',
  '只输入公式内容，不需要外层 $ 或 $$。': 'Introduce solo la ecuación, sin los delimitadores externos $ o $$.',
  '常用符号': 'Símbolos comunes', '希腊字母和运算符': 'Letras griegas y operadores',
  '阿尔法': 'alfa', '贝塔': 'beta', '西塔': 'theta', '圆周率': 'pi', '德尔塔': 'delta',
  '无穷大': 'infinito', '正负号': 'más o menos', '乘号': 'multiplicación', '除号': 'división',
  '不等于': 'distinto de', '小于或等于': 'menor o igual que', '大于或等于': 'mayor o igual que',
  '你的公式': 'Tu ecuación', '可视化编辑': 'Edición visual', '编辑历史': 'Historial de edición',
  '撤销': 'Deshacer', '重做': 'Rehacer', '清空': 'Borrar', '清空当前公式': 'Borrar ecuación',
  '清空当前公式；可用撤销恢复': 'Borrar ecuación; puedes restaurarla con Deshacer',
  '常用运算与间距': 'Operadores y espaciado', '加号': 'más', '减号': 'menos', '等号': 'igual', '薄空格': 'espacio fino', '间距': 'Espacio',
  '↵ 换行': '↵ Nueva línea', '换行': 'Nueva línea', '换行继续输入': 'Nueva línea', '换行继续输入（Shift+Enter）': 'Nueva línea (Shift+Enter)',
  '点击方框填写；用 Tab 或方向键移动。': 'Rellena las casillas; desplázate con Tab o las flechas.',
  '← 上一空格': '← Casilla anterior', '下一空格 →': 'Casilla siguiente →', '公式末尾 →': 'Final de la ecuación →',
  '跳到整条公式的末尾，继续输入': 'Ve al final de la ecuación para seguir escribiendo',
  '跳到上一个待填写的方框': 'Ve a la casilla vacía anterior', '跳到下一个待填写的方框': 'Ve a la casilla vacía siguiente',
  '在笔记中的显示方式': 'Presentación en la nota', '公式显示方式': 'Presentación de la ecuación', '行内公式': 'Ecuación en línea', '独立一行': 'Ecuación en bloque', '独立公式': 'Ecuación en bloque',
  '点击保存后，才会更新笔记。': 'Guarda para actualizar la nota.', '取消': 'Cancelar', '正在保存…': 'Guardando…', '按源码保存': 'Guardar código', '保存修改': 'Guardar cambios',
  '直接编辑公式，用工具栏添加数学结构。': 'Edita la ecuación directamente; usa la barra de herramientas para añadir estructuras.',
  '编辑 LaTeX 源码，保留你习惯的写法。': 'Edita el código LaTeX con tu notación habitual.',
  '左侧源码与右侧公式双向同步，两侧都可以编辑。': 'El código de la izquierda y la ecuación de la derecha están sincronizados. Puedes editar ambos.',
  '这段内容暂时无法插入，请检查化学式、单位或公式写法。原公式已保留。': 'No se pudo insertar esta notación. Comprueba la fórmula o las unidades. La ecuación original se conserva.',
  '这段内容暂时无法更新，请检查写法。原公式已保留。': 'No se pudo actualizar esta notación. La ecuación original se conserva.',
  '化学式、单位或公式暂时无法解析，请检查写法；输入内容已保留。': 'No se pudo interpretar esta fórmula o unidad. La entrada se conserva.',
  '源码尚未完整或存在语法问题，请检查后保存。': 'El código está incompleto o tiene un error de sintaxis. Revísalo antes de guardar.',
  '公式源码尚未完整。请切换 LaTeX 或 Hybrid 模式继续编辑。': 'El código está incompleto. Continúa en el modo LaTeX o Hybrid.',
  '完成源码后，公式会自动显示在这里。': 'La ecuación aparecerá aquí cuando el código esté completo.',
  '当前可视化引擎暂不支持这个公式。源码完整保留，可在 LaTeX 模式继续编辑。': 'La edición visual aún no admite esta ecuación. Su código se conserva; continúa en modo LaTeX.',
  '请切换 LaTeX 或 Hybrid 模式查看源码。': 'Cambia al modo LaTeX o Hybrid para ver el código.',
  '部分命令暂不支持可视化；“按源码保存”会原样保存当前源码，请确认命令由你的笔记环境支持。': 'Algunos comandos no admiten edición visual. Guardar código conserva el código actual sin cambios; comprueba que tu entorno de notas admite esos comandos.',
  '公式还有未填写的方框或参数，请补全后保存。': 'Completa las casillas o los argumentos pendientes antes de guardar.',
  '请先输入一个公式，或点击上方结构开始。': 'Introduce una ecuación o elige una estructura de arriba para empezar.',
  '还有方框没有填写，请补全后再保存。': 'Completa las casillas pendientes antes de guardar.', '保存失败，请重试。': 'No se pudo guardar. Inténtalo de nuevo.',
  '化学式或反应式': 'Fórmula o reacción química', '数值与单位': 'Valor y unidades',
  '例如 H2O 或 2 H2 + O2 -> 2 H2O': 'Por ejemplo, H2O o 2 H2 + O2 -> 2 H2O', '例如 9.81 m/s^2': 'Por ejemplo, 9.81 m/s^2',
  '化学键与反应符号': 'Enlaces y símbolos de reacción', '常用单位': 'Unidades comunes',
  '插入化学式': 'Insertar fórmula química', '插入单位': 'Insertar unidades', '回填当前化学式': 'Cargar fórmula química actual', '回填当前单位': 'Cargar unidades actuales',
  '更新当前化学式': 'Actualizar fórmula química actual', '更新当前单位': 'Actualizar unidades actuales',
  '用普通写法编辑，上方生成预览，点击插入后才加入公式。暂不支持二维分子绘图或自动配平。': 'Usa notación habitual y revisa la vista previa. Insertar la añade a la ecuación. No se admiten el dibujo molecular 2D ni el ajuste automático.',
  '用普通写法编辑，上方生成预览，点击插入后才加入公式。暂不支持二维分子绘图。': 'Usa notación habitual y revisa la vista previa. Se añade a la ecuación al insertarla. No se admite el dibujo molecular 2D.',
  '数值与单位保留在本机。支持复合单位和指数；不自动换算。': 'Los valores y las unidades permanecen en tu dispositivo. Se admiten unidades compuestas y potencias; insertarlas no las convierte.',
  '化学式预览': 'Vista previa de la fórmula química', '单位预览': 'Vista previa de unidades',
  '输入后显示化学式预览': 'Introduce notación para ver la fórmula química', '输入后显示单位预览': 'Introduce una cantidad para ver las unidades',
  '这段写法暂时无法预览，请检查后重试。': 'No se puede previsualizar esta notación. Revísala e inténtalo de nuevo.',
  '单键': 'enlace simple', '双键': 'enlace doble', '三键': 'enlace triple', '反应箭头': 'flecha de reacción', '可逆反应': 'reacción reversible',
  '正电荷': 'carga positiva', '负电荷': 'carga negativa', '固体': 'sólido', '液体': 'líquido', '气体': 'gas', '水溶液': 'estado acuoso',
  '气体生成标记': 'indicador de desprendimiento de gas', '沉淀标记': 'indicador de precipitado', '气体 ↑': 'Gas ↑', '沉淀 ↓': 'Precipitado ↓',
  '点击模板插入，随后直接修改公式中的数值和变量。': 'Inserta una plantilla y edita directamente sus números y variables.',
  '查找元素': 'Buscar un elemento', '原子序数、符号或英文名称': 'Número atómico, símbolo o nombre en inglés o español',
  '点击元素，加入化学输入框的光标位置。': 'Haz clic en un elemento para añadirlo en la posición del cursor de la entrada química.',
  '118 种元素周期表': 'Tabla periódica de 118 elementos', '镧系': 'Lantánidos', '锕系': 'Actínidos',
  '水 H₂O': 'Agua H₂O', '二氧化碳 CO₂': 'Dióxido de carbono CO₂', '硫酸根 SO₄²⁻': 'Sulfato SO₄²⁻', '碳-14 同位素': 'Isótopo carbono-14',
  '单键 H—H': 'Enlace simple H—H', '双键 O=O': 'Enlace doble O=O', '三键 N≡N': 'Enlace triple N≡N',
  '乙醇结构式': 'Estructura del etanol', '氢气与氧气反应': 'Reacción de hidrógeno y oxígeno', '合成氨可逆反应': 'Equilibrio del amoníaco', '加热反应': 'Reacción con calentamiento', '沉淀反应': 'Reacción de precipitación',
  '牛顿第二定律': 'Segunda ley de Newton', '速度向量': 'Vector velocidad', '梯度 ∇f': 'Gradiente ∇f', '散度 ∇·E': 'Divergencia ∇·E', '旋度 ∇×B': 'Rotacional ∇×B',
  '偏导数': 'Derivada parcial', '约化普朗克常量 ℏ': 'Constante de Planck reducida ℏ', '希腊字母': 'Letras griegas', '标准差 σ': 'Desviación estándar σ',
  '角度 θ': 'Ángulo θ', '30 度': '30 grados', '欧姆定律': 'Ley de Ohm',
  '加速度 m/s²': 'Aceleración m/s²', '米 m': 'Metro m', '秒 s': 'Segundo s', '千克 kg': 'Kilogramo kg', '牛顿 N': 'Newton N', '帕斯卡 Pa': 'Pascal Pa',
  '焦耳 J': 'Julio J', '瓦特 W': 'Vatio W', '库仑 C': 'Culombio C', '伏特 V': 'Voltio V', '欧姆 Ω': 'Ohmio Ω', '赫兹 Hz': 'Hercio Hz', '开尔文 K': 'Kelvin K', '摩尔 mol': 'Mol mol',
  '请先填写化学式或反应式。': 'Primero introduce una fórmula o reacción química.', '请先填写数值和单位。': 'Primero introduce un valor y sus unidades.',
  '内容过长，请缩短到 4096 个字符以内。': 'La entrada es demasiado larga. Usa como máximo 4096 caracteres.', '请移除不可见的控制字符。': 'Elimina los caracteres de control invisibles.',
  '上下标尚未填写完整，请补全后再插入。': 'Completa el superíndice o subíndice antes de insertar.',
  '反斜杠后的内容不受支持，请检查输入。': 'No se admite el contenido después de la barra invertida. Revisa la notación.',
  '化学键格式无效，请使用单键、双键、三键按钮，或 \\bond{1}、\\bond{2}、\\bond{3}。': 'La notación del enlace no es válida. Usa los botones de enlace simple, doble o triple, o \\bond{1}, \\bond{2}, \\bond{3}.',
  '暂时无法排版，请检查化学键、括号、上下标或单位格式。': 'No se puede componer esta notación. Revisa los enlaces, paréntesis, índices o unidades.',
  '暂时无法排版，请检查符号和命令是否完整。': 'No se puede componer esta notación. Comprueba que los símbolos y comandos estén completos.',
  '这里只填写公式内容，请移除 $ 或 $$ 分隔符；美元符号请写成 \\$。': 'Introduce solo la ecuación, sin delimitadores $ o $$. Escribe el símbolo de dólar como \\$.',
  '源码暂不支持 % 注释，请先移除注释；百分号请写成 \\%。': 'No se admiten comentarios con %. Elimínalos; escribe el signo de porcentaje como \\%.',
  '右花括号多于左花括号，请检查后保存。': 'Hay demasiadas llaves de cierre. Revisa el código antes de guardar.',
  '公式末尾的反斜杠尚未填写完整，请补全命令或删除后保存。': 'La barra invertida final está incompleta. Completa o elimina el comando antes de guardar.',
  '这里只填写公式内容，请移除外层 \\(…\\) 或 \\[…\\] 数学分隔符。': 'Introduce solo la ecuación, sin los delimitadores externos \\(…\\) o \\[…\\].',
  '环境名称尚未填写完整，请使用 \\begin{名称} 和 \\end{名称}。': 'Completa el nombre del entorno con \\begin{nombre} y \\end{nombre}.',
  '环境名称尚未填写完整，请补全后保存。': 'Completa el nombre del entorno antes de guardar.', '环境名称为空或格式无效，请检查后保存。': 'El nombre del entorno está vacío o no es válido. Revísalo antes de guardar.',
  '公式环境的开始与结束不匹配。': 'La apertura y el cierre del entorno no coinciden.',
  '公式环境两端的花括号层级不一致，请检查后保存。': 'Los límites del entorno tienen distinta anidación de llaves. Revisa el código antes de guardar.',
  '花括号尚未配对，请补全后保存。': 'Completa las llaves sin pareja antes de guardar.', '公式环境尚未结束，请补全后保存。': 'Cierra el entorno de la ecuación antes de guardar.',
  '原笔记已关闭或切换，请取消后重新打开公式。': 'Se cerró o cambió la nota original. Cancela y vuelve a abrir la ecuación.',
  '笔记已发生变化。为避免覆盖内容，请取消后重新打开公式。': 'La nota ha cambiado. Cancela y vuelve a abrir la ecuación para no sobrescribir contenido.',
  '笔记已变化，草稿仍保留。为避免覆盖，请复制草稿后取消并重新打开公式。': 'La nota ha cambiado y el borrador se conserva. Cópialo, cancela y vuelve a abrir la ecuación.',
  '笔记内公式编辑器': 'Editor de ecuaciones en la nota', '选择要编辑的公式': 'Elige una ecuación para editar',
  '点击公式重新编辑。公式按笔记中的位置排列。': 'Haz clic en una ecuación para editarla. Se muestran en el orden de la nota.',
  '这篇笔记中没有可编辑的公式。请先切到编辑模式，再点击左侧 ∑ 插入。': 'No se encontraron ecuaciones editables. Cambia al modo de edición y pulsa ∑ a la izquierda para insertar una.',
  '暂不支持的公式（原文保留）': 'Ecuación no admitida (código conservado)', '上一页': 'Página anterior', '下一页': 'Página siguiente',
  'Visual Math Editor：插入或编辑公式': 'Visual Math: Insertar o editar ecuación',
  'Visual Math：插入或编辑公式': 'Visual Math: Insertar o editar ecuación',
  '请先打开一篇 Markdown 笔记。': 'Primero abre una nota Markdown.',
  '插入或编辑公式 / Insert or edit equation': 'Insertar o editar ecuación',
  '请在普通 Markdown 笔记中使用公式编辑器。': 'Usa el editor de ecuaciones en una nota Markdown normal.',
  '在弹窗中插入或编辑公式 / Open equation dialog': 'Abrir diálogo de ecuación',
  '恢复公式草稿 / Recover equation draft': 'Recuperar borrador de ecuación',
  '没有暂存的公式草稿。': 'No hay ningún borrador de ecuación guardado.',
  '请先点击普通正文中的新插入位置。': 'Primero haz clic en una nueva posición de inserción del texto normal.',
  '公式草稿已暂存。可用“恢复公式草稿”命令在新位置继续编辑；重启前请保存。': 'El borrador de ecuación se conserva. Usa Recuperar borrador de ecuación para continuar en una nueva posición. Guárdalo antes de reiniciar.',
  '编辑本笔记公式 / Choose equation to edit': 'Elegir ecuación para editar',
  '可视化插入／编辑公式': 'Insertar o editar ecuación visualmente',
  '请选择一个已有公式，或先点击要插入公式的位置。': 'Selecciona una ecuación existente o haz clic en una posición de inserción.',
  '请在普通笔记正文中插入公式，代码、属性和链接地址内暂不支持。': 'Inserta ecuaciones en el texto normal de la nota. No se admiten dentro de código, propiedades ni destinos de enlaces.',
  '笔记已变化，请重新选择公式。': 'La nota ha cambiado. Selecciona la ecuación de nuevo.',
  '第一版请在 Obsidian 主窗口中编辑公式。': 'Usa la ventana principal de Obsidian para editar ecuaciones en esta versión.',
  '请先保存或取消当前笔记内的公式草稿。': 'Primero guarda o cancela el borrador de ecuación actual.',
  '双击以可视化编辑公式': 'Haz doble clic para editar visualmente la ecuación',
  '无法定位公式，请通过命令面板选择本笔记公式。': 'No se pudo localizar la ecuación. Elige una ecuación de esta nota desde la paleta de comandos.',
  '另一个插件已加载不同版本的 MathLive。请暂时关闭该插件并重启 Obsidian。': 'Otro complemento cargó una versión distinta de MathLive. Desactívalo temporalmente y reinicia Obsidian.',
  '单位换算': 'Conversión de unidades', '数值': 'Valor', '类别': 'Categoría', '从': 'De', '到': 'A', '交换单位': 'Intercambiar unidades',
  '换算结果': 'Resultado de conversión', '使用换算结果': 'Usar resultado convertido',
  '换算类别': 'Categoría de conversión', '换算数值': 'Valor que convertir', '原单位': 'Unidad de origen', '目标单位': 'Unidad de destino',
  '支持复合单位和指数；下方可离线换算常用单位。': 'Se admiten unidades compuestas y potencias. Convierte unidades comunes sin conexión aquí abajo.',
  '先填入单位输入框，再点击插入单位；不会自动修改公式。': 'Carga el resultado en la entrada de unidades y selecciona Insertar unidades. La ecuación no cambia automáticamente.',
  '请输入有效数值。': 'Introduce un número válido.', '界面语言': 'Idioma de la interfaz', '语言': 'Idioma', '语言 / Language': 'Idioma',
  '请选择相同类别的单位。': 'Elige unidades de la misma categoría.', '请选择有效的单位。': 'Elige unidades válidas.', '数值超出支持范围。': 'El valor está fuera del intervalo admitido.',
  '跟随系统': 'Sistema', '跟随系统 / System': 'Sistema', '跟随系统/System': 'Sistema',
  '绘制此公式': 'Graficar esta ecuación', '隐藏图像': 'Ocultar gráfica',
  '图像与上方公式同步；直接修改公式即可更新。': 'La gráfica sigue la ecuación de arriba. Edita la ecuación para actualizarla.',
  '插入公式与图像': 'Insertar ecuación y gráfica',
  '图像已就绪。点击插入公式与图像加入笔记。': 'La gráfica está lista. Selecciona Insertar ecuación y gráfica para añadir ambas a la nota.',
  '此公式暂不能绘图。支持 y=f(x)、仅含 x 的表达式和常数；不支持隐式方程或多变量。请在上方修改公式。': 'Esta ecuación aún no se puede representar. Usa y=f(x), una expresión en x o una constante. No se admiten ecuaciones implícitas ni varias variables. Edita la ecuación de arriba.',
  '图像尚未显示，请点击绘制此公式。': 'Selecciona Graficar esta ecuación para mostrar la gráfica.',
  '公式已修改，请重新预览后插入。': 'La ecuación ha cambiado. Actualiza la vista previa antes de insertar.',
  '关于与许可': 'Acerca de y licencia',
  '本插件采用 GNU GPLv3 许可，不提供任何担保。你可按许可使用、修改与再分发。笔记内容不受此许可约束。': 'Este complemento se distribuye bajo la licencia GNU GPLv3, sin garantía alguna. Puedes usarlo, modificarlo y redistribuirlo según esa licencia. El contenido de tus notas no está sujeto a esta licencia.',
  '查看许可与第三方声明': 'Ver licencia y avisos de terceros',
  '下载此版本源码': 'Descargar el código de esta versión',
  '微积分视图': 'Vista de cálculo', '原始函数': 'Función original',
  '一阶导数 d/dx': 'Primera derivada d/dx', '二阶导数 d²/dx²': 'Segunda derivada d²/dx²',
  '定积分与面积 ∫': 'Integral definida y área ∫',
  'θ 起点（弧度）': 'Inicio de θ (radianes)', 'θ 终点（弧度）': 'Fin de θ (radianes)',
  '积分下限 a': 'Límite inferior a', '积分上限 b': 'Límite superior b',
  '水平旋转（度）': 'Acimut (grados)', '俯仰角（度）': 'Elevación (grados)',
  '向左旋转': 'Girar a la izquierda', '向右旋转': 'Girar a la derecha',
  '极径 r = f(θ)': 'Radio r = f(θ)', '曲面 z = f(x,y)': 'Superficie z = f(x,y)',
  '输入极径，例如 2*sin(3*theta)。θ 使用弧度。': 'Introduce un radio, por ejemplo 2*sin(3*theta). θ usa radianes.',
  '极坐标采用等比例 X/Y 轴；负极径会反向绘制。图线为数值近似。': 'Las gráficas polares usan la misma escala en X/Y. Los radios negativos invierten la dirección. Las curvas son aproximaciones numéricas.',
  '输入 z=f(x,y)，例如 sin(sqrt(x^2+y^2))。': 'Introduce z=f(x,y), por ejemplo sin(sqrt(x^2+y^2)).',
  '在曲面内拖动旋转，滚轮缩放；插入或保存才写入笔记。': 'Arrastra la superficie para girarla y usa la rueda para ampliar. Pulsa Insertar o Guardar para actualizar la nota.',
  '三维曲面为有界网格数值近似；不支持隐式曲面或符号求解。': 'Las superficies 3D usan una malla numérica acotada. No se admiten superficies implícitas ni resolución simbólica.',
  '导数和定积分采用数值近似，不是符号计算；间断点附近可能省略曲线。': 'Las derivadas y las integrales definidas son aproximaciones numéricas, no cálculos simbólicos. Pueden omitirse curvas cerca de discontinuidades.',
  '此公式暂不能绘图。支持 y=f(x)、r=f(theta) 或 z=f(x,y)；不支持隐式方程。请在上方修改公式。': 'Esta ecuación aún no se puede representar. Usa y=f(x), r=f(theta) o z=f(x,y). No se admiten ecuaciones implícitas. Edita la ecuación de arriba.',
  '拖动旋转，滚轮缩放。调整后点击“保存视图”。': 'Arrastra para girar y usa la rueda para ampliar. Selecciona Guardar vista para conservar los cambios.',
  '示例（替换输入）': 'Ejemplos (reemplazan la entrada)', '在光标处插入符号': 'Insertar un símbolo en el cursor',
  '未知名称。请使用当前图像的变量（x、theta，或 x 和 y）、pi、e 及支持的函数。': 'Nombre desconocido. Usa las variables de esta gráfica (x, theta o x e y), pi, e y las funciones admitidas.',
  '极坐标设置无效，请重新打开编辑器。': 'La configuración de la gráfica polar no se admite. Vuelve a abrir el editor.',
  '微积分视图仅适用于单变量函数图像。': 'Las vistas de cálculo solo están disponibles para gráficas de una variable.',
  'θ 起点须小于终点，均为有效数值，且范围不超过 100π 弧度。': 'Los límites de θ deben ser finitos y crecientes, y abarcar como máximo 100π radianes.',
  '极坐标图线过于复杂，请简化公式或缩小 θ 范围。': 'La gráfica polar es demasiado compleja. Simplifica la fórmula o reduce el intervalo de θ.',
  '此范围内没有可显示的极坐标图线，请检查公式或调整坐标范围。': 'No hay ninguna curva polar visible en este intervalo. Comprueba la fórmula o ajusta los ejes.',
  '暂时无法生成极坐标图，请检查公式后重试。': 'No se pudo generar la gráfica polar. Comprueba la fórmula e inténtalo de nuevo.',
  '微积分视图设置无效，请重新选择。': 'La vista de cálculo no se admite. Elige otra opción.',
  '积分上下限须为支持范围内的有效数值，且下限小于上限。': 'Los límites de integración deben ser números finitos y crecientes dentro del intervalo admitido.',
  '积分在计算限制内未能收敛，请缩小区间或简化公式。': 'La integral no convergió dentro del límite de cálculo. Reduce el intervalo o simplifica la fórmula.',
  '积分区间包含无定义或反常区域，请使用有限且连续的区间。': 'La integral atraviesa una región no definida o impropia. Usa un intervalo finito y continuo.',
  '积分结果超出有限数值范围。': 'La integral está fuera del intervalo numérico finito.',
  '暂时无法生成微积分图像，请检查公式后重试。': 'No se pudo generar la gráfica de cálculo. Comprueba la fórmula e inténtalo de nuevo.',
  '请填写有效的 X、Y、Z 范围；三维俯仰角须为 10 至 80 度。': 'Usa intervalos válidos para X, Y y Z; la elevación 3D debe estar entre 10 y 80 grados.',
  '曲面过于复杂，请简化公式或缩小坐标范围。': 'La superficie es demasiado compleja. Simplifica la ecuación o reduce sus intervalos.',
  '曲面过于复杂，请简化公式后再绘图。': 'La superficie es demasiado compleja. Simplifica la ecuación antes de representarla.',
  '此范围内没有可显示的曲面，请检查公式或调整 X、Y、Z 范围。': 'No hay ninguna superficie visible. Comprueba la ecuación o ajusta los intervalos de X, Y y Z.',
  '暂时无法生成曲面，请检查公式后重试。': 'No se pudo generar la superficie. Comprueba la fórmula e inténtalo de nuevo.',
  // Chemical balancing messages use explicit English overrides in the English UI.
  '检查配平': 'Comprobar ajuste', '使用配平建议': 'Usar ajuste sugerido',
  '仅检查元素与电荷守恒，不判断反应能否发生；未配平也可按原式插入。': 'Solo comprueba la conservación de elementos y carga, no si una reacción puede ocurrir. Puedes insertar una ecuación sin ajustar tal como está.',
  '可检查配平；不会自动修改原式。': 'Comprueba el ajuste sin modificar la ecuación.',
  '已配平：元素与电荷守恒。': 'Ajustada: se conservan los elementos y la carga.',
  '未配平；仍可按原式插入。': 'Sin ajustar; puedes insertarla tal como está.',
  '按当前反应物和生成物无法配平；仍可插入原式。': 'No se pueden ajustar los reactivos y productos indicados; puedes insertar la ecuación original.',
  '暂时无法检查这种写法；仍可插入原式。': 'Aún no se puede comprobar esta notación; puedes insertar la ecuación original.',
  '未能确定唯一的配平建议；仍可插入原式。': 'No se pudo determinar un ajuste único; puedes insertar la ecuación original.',
  '这是化学式；加入反应箭头后可检查配平。': 'Es una fórmula química. Añade una flecha de reacción para comprobar el ajuste.',
  '按原式插入': 'Insertar tal como está', '按原式更新当前化学式': 'Actualizar fórmula tal como está',
  // Plot error text is also used for accessible status announcements.
  '数字超出支持范围，请缩小数值。': 'Los números están fuera del intervalo admitido. Reduce sus valores.',
  '暂不支持此写法。请使用数字、x、算术运算及支持的函数。': 'No se admite esta notación. Usa números, x, operaciones aritméticas y funciones admitidas.',
  '函数过于复杂，请简化后再绘图。': 'La expresión es demasiado compleja. Simplifícala antes de representarla.',
  '请输入函数，例如 x^2 或 sin(x)。': 'Introduce una expresión, como x^2 o sin(x).',
  '请检查运算符及括号。': 'Comprueba los operadores y los paréntesis.',
  '括号或函数嵌套过深，请简化后再绘图。': 'Hay demasiados niveles de anidación. Simplifica la expresión antes de representarla.',
  '函数尚未填写完整。': 'La expresión está incompleta.',
  '缺少右括号，请补全后再绘图。': 'Falta un paréntesis de cierre. Añádelo antes de representar la función.',
  '未知名称。支持 x、pi、e、sin、cos、tan、sqrt、abs、ln、log 和 exp。': 'Nombre desconocido. Se admiten x, pi, e, sin, cos, tan, sqrt, abs, ln, log y exp.',
  '函数的参数需要括号，例如 sin(x)。': 'Los argumentos de las funciones necesitan paréntesis, por ejemplo sin(x).',
  '函数内容过长，请缩短到 500 个字符以内。': 'La expresión es demasiado larga. Usa como máximo 500 caracteres.',
  '暂时无法识别函数，请检查写法。': 'No se pudo interpretar la expresión. Revisa su notación.',
  '缺少图像设置，请重新打开编辑器。': 'Falta la configuración de la gráfica. Vuelve a abrir el editor.',
  '坐标边界须为 −1000000 至 1000000 之间的有效数值。': 'Los límites de los ejes deben ser números válidos entre −1000000 y 1000000.',
  '每个坐标轴的最小值须小于最大值。': 'El mínimo de cada eje debe ser menor que su máximo.',
  '每个坐标轴的范围须至少为 0.000000001。': 'El intervalo de cada eje debe abarcar al menos 0.000000001.',
  '坐标范围相对边界数值过窄，请扩大范围。': 'Los intervalos son demasiado estrechos para la magnitud de sus límites. Amplíalos.',
  '图线过于复杂，请简化函数或缩小绘图范围。': 'La gráfica es demasiado compleja. Simplifica la expresión o reduce el intervalo.',
  '此范围内没有可显示的图线，请检查函数或调整坐标范围。': 'No hay ninguna curva visible en este intervalo. Comprueba la función o ajusta los ejes.',
  '暂时无法生成图像，请检查函数后重试。': 'No se pudo generar la gráfica. Comprueba la función e inténtalo de nuevo.',
  '请输入复数，例如 3+2i，每行一个。': 'Introduce números complejos, como 3+2i, uno por línea.',
  '复数内容过长，请缩短到 1000 个字符以内。': 'La entrada de números complejos es demasiado larga. Usa como máximo 1000 caracteres.',
  '最多支持 20 个复数，每行一个。': 'Usa como máximo 20 números complejos, uno por línea.',
  '缺少复平面设置，请重新打开编辑器。': 'Falta la configuración del plano complejo. Vuelve a abrir el editor.',
  '暂时无法绘图，请检查输入及坐标范围。': 'No se pudo dibujar la gráfica. Comprueba la entrada y los intervalos de los ejes.',
  '输入后自动预览；在图内拖动或滚轮缩放。点击插入或保存才写入笔记，也可按 Ctrl+Enter。': 'La vista previa se actualiza al escribir. Arrastra o usa la rueda en la gráfica. Pulsa Insertar o Guardar para actualizar la nota; también puedes usar Ctrl+Enter.',
  '正在更新预览…也可直接点击插入或保存。': 'Actualizando vista previa… También puedes insertar o guardar directamente.',
  // Unit labels remain separate from symbols and stored conversion identifiers.
  '长度': 'Longitud', '质量': 'Masa', '时间': 'Tiempo', '温度': 'Temperatura', '速度': 'Velocidad', '面积': 'Área', '体积': 'Volumen', '压力': 'Presión', '能量': 'Energía', '功率': 'Potencia', '角度': 'Ángulo',
  '纳米': 'Nanómetro', '微米': 'Micrómetro', '毫米': 'Milímetro', '厘米': 'Centímetro', '米': 'Metro', '千米': 'Kilómetro', '英寸': 'Pulgada', '英尺': 'Pie', '码': 'Yarda', '英里': 'Milla', '海里': 'Milla náutica',
  '毫克': 'Miligramo', '克': 'Gramo', '千克': 'Kilogramo', '公吨': 'Tonelada métrica', '盎司（常衡）': 'Onza (avoirdupois)', '磅（常衡）': 'Libra (avoirdupois)',
  '毫秒': 'Milisegundo', '秒': 'Segundo', '分钟': 'Minuto', '小时': 'Hora', '天': 'Día',
  '摄氏度': 'Grado Celsius', '华氏度': 'Grado Fahrenheit', '开尔文': 'Kelvin',
  '米/秒': 'Metros por segundo', '千米/小时': 'Kilómetros por hora', '英里/小时': 'Millas por hora', '英尺/秒': 'Pies por segundo', '节（海里/小时）': 'Nudo (milla náutica por hora)',
  '平方毫米': 'Milímetro cuadrado', '平方厘米': 'Centímetro cuadrado', '平方米': 'Metro cuadrado', '平方千米': 'Kilómetro cuadrado', '公顷': 'Hectárea', '英亩': 'Acre', '平方英尺': 'Pie cuadrado',
  '毫升': 'Mililitro', '升': 'Litro', '立方厘米': 'Centímetro cúbico', '立方米': 'Metro cúbico', '立方英尺': 'Pie cúbico', '美制液体加仑': 'Galón líquido estadounidense', '英制加仑': 'Galón imperial', '美制液体盎司': 'Onza líquida estadounidense',
  '帕斯卡': 'Pascal', '千帕': 'Kilopascal', '兆帕': 'Megapascal', '巴': 'Bar', '标准大气压': 'Atmósfera estándar', '磅力/平方英寸': 'Libra-fuerza por pulgada cuadrada',
  '焦耳': 'Julio', '千焦': 'Kilojulio', '兆焦': 'Megajulio', '瓦时': 'Vatio-hora', '千瓦时': 'Kilovatio-hora',
  '瓦特': 'Vatio', '千瓦': 'Kilovatio', '兆瓦': 'Megavatio', '机械马力': 'Caballo de potencia mecánico',
  '度': 'Grado', '弧度': 'Radián', '圈': 'Vuelta',
  '点击插入结构并填方框（仅排版，不计算或求解）。': 'Haz clic para insertar una estructura y completar los recuadros (solo composición, sin resolver).',
  '点击插入结构并填写方框。': 'Haz clic para insertar una estructura y completar los recuadros.',
  '公式超过 4096 字符，已切换为源码编辑（缩短后恢复可视化）。': 'La fórmula supera los 4096 caracteres; se cambió a edición de código (acórtala para recuperar la vista visual).',
  '点击插入集合或数列记号，填完方框后保存。': 'Haz clic para insertar notación de conjuntos o sucesiones; completa los recuadros antes de guardar.',
  '点击插入符号或函数；选中内容后点击可自动包裹。': 'Haz clic para insertar un símbolo o función; selecciona contenido primero para envolverlo automáticamente.',
  '选择行列数并填写每一格。': 'Elige filas y columnas y completa cada celda.',
  '取消不会修改当前公式': 'Cancelar no modifica la ecuación actual',
  '预览不会更改公式；插入或替换后仍需保存笔记': 'La vista previa no cambia la ecuación; guarda la nota después de insertar o reemplazar',
  '刷新矩阵预览': 'Actualizar vista previa de la matriz',
  '刷新方程组预览': 'Actualizar vista previa del sistema',
  '预览已就绪，可直接插入。': 'Vista previa lista para insertar.',
  '预览已就绪，可直接应用。': 'Vista previa lista para aplicar.',
  '矩阵': 'Matriz',
  '方程组': 'Sistema',
  '逐行填写方程或不等式，自动加左大括号。': 'Escribe una ecuación o desigualdad por línea con llave izquierda automática.',
  '取消不会更改原公式': 'Cancelar no modifica la ecuación original',
  '粘贴带 $、$$ 或环境的公式，确认后替换当前公式。': 'Pega una fórmula con $, $$ o entornos y confirma para reemplazar la ecuación actual.',
  '导入公式': 'Importar',
  '粘贴带 $、$$ 或环境的单条公式': 'Pega una sola fórmula con $, $$ o entornos',
  '扩展数学工具': 'Herramientas matemáticas ampliadas',
};

/** Canonical English identifiers are retained for chemistry data and English search.
 * Spanish scientific spellings follow RSEQ terminology guidance:
 * https://rseq.org/educacion/recursos/
 */
export const SPANISH_ELEMENT_NAMES: Readonly<Record<string, string>> = Object.fromEntries(`
hydrogen|hidrógeno
helium|helio
lithium|litio
beryllium|berilio
boron|boro
carbon|carbono
nitrogen|nitrógeno
oxygen|oxígeno
fluorine|flúor
neon|neón
sodium|sodio
magnesium|magnesio
aluminium|aluminio
silicon|silicio
phosphorus|fósforo
sulfur|azufre
chlorine|cloro
argon|argón
potassium|potasio
calcium|calcio
scandium|escandio
titanium|titanio
vanadium|vanadio
chromium|cromo
manganese|manganeso
iron|hierro
cobalt|cobalto
nickel|níquel
copper|cobre
zinc|zinc
gallium|galio
germanium|germanio
arsenic|arsénico
selenium|selenio
bromine|bromo
krypton|kriptón
rubidium|rubidio
strontium|estroncio
yttrium|itrio
zirconium|circonio
niobium|niobio
molybdenum|molibdeno
technetium|tecnecio
ruthenium|rutenio
rhodium|rodio
palladium|paladio
silver|plata
cadmium|cadmio
indium|indio
tin|estaño
antimony|antimonio
tellurium|teluro
iodine|yodo
xenon|xenón
caesium|cesio
barium|bario
lanthanum|lantano
cerium|cerio
praseodymium|praseodimio
neodymium|neodimio
promethium|prometio
samarium|samario
europium|europio
gadolinium|gadolinio
terbium|terbio
dysprosium|disprosio
holmium|holmio
erbium|erbio
thulium|tulio
ytterbium|iterbio
lutetium|lutecio
hafnium|hafnio
tantalum|tántalo
tungsten|wolframio
rhenium|renio
osmium|osmio
iridium|iridio
platinum|platino
gold|oro
mercury|mercurio
thallium|talio
lead|plomo
bismuth|bismuto
polonium|polonio
astatine|astato
radon|radón
francium|francio
radium|radio
actinium|actinio
thorium|torio
protactinium|protactinio
uranium|uranio
neptunium|neptunio
plutonium|plutonio
americium|americio
curium|curio
berkelium|berkelio
californium|californio
einsteinium|einstenio
fermium|fermio
mendelevium|mendelevio
nobelium|nobelio
lawrencium|lawrencio
rutherfordium|rutherfordio
dubnium|dubnio
seaborgium|seaborgio
bohrium|bohrio
hassium|hasio
meitnerium|meitnerio
darmstadtium|darmstatio
roentgenium|roentgenio
copernicium|copernicio
nihonium|nihonio
flerovium|flerovio
moscovium|moscovio
livermorium|livermorio
tennessine|teneso
oganesson|oganesón
`.trim().split('\n').map((line): [string, string] => {
  const separator = line.indexOf('|');
  return [line.slice(0, separator), line.slice(separator + 1)];
}));
