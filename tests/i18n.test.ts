import assert from 'node:assert/strict';
import test from 'node:test';
import { getElementSearchNames, resolveLanguage, translatePlotUiText, translateUiText, UI_TRANSLATIONS, type Language } from '../src/i18n';
import { SPANISH_ELEMENT_NAMES, SPANISH_TRANSLATIONS } from '../src/i18n-es';
import { CHEMISTRY_TEMPLATES, PHYSICS_TEMPLATES, UNIT_PRESETS, PERIODIC_ELEMENTS } from '../src/science-data';
import { UNIT_CATEGORIES } from '../src/unit-conversion';

test('the host app language follows Chinese and Spanish locales with an English fallback', () => {
  for (const locale of ['zh', 'zh-CN', 'zh-TW', 'zh-Hans', 'ZH_hant_HK', ' zh ']) assert.equal(resolveLanguage('system', locale), 'zh', locale);
  for (const locale of ['es', 'es-ES', 'es-MX', 'es_MX', 'ES_ar', ' es-419 ']) assert.equal(resolveLanguage('system', locale), 'es', locale);
  for (const locale of ['en-US', 'en-GB', 'fr', 'ja-JP', 'de-DE', 'pt-BR', 'ko', 'ar', '', 'zhfake', 'esfake']) assert.equal(resolveLanguage('system', locale), 'en', locale);
  assert.equal(resolveLanguage('zh', 'en-US'), 'zh');
  assert.equal(resolveLanguage('en', 'zh-CN'), 'en');
  assert.equal(resolveLanguage('es', 'zh-CN'), 'es');
  assert.equal(resolveLanguage('en', 'es-ES'), 'en');
  assert.equal(resolveLanguage('outdated-preference' as Language, 'zh'), 'en');
});

test('mode names, arbitrary source and numeric content remain unchanged', () => {
  for (const text of ['Visual', 'LaTeX', 'Hybrid', String.raw`\ce{H2O}`, String.raw`\frac{1}{2}`, '273.15 K', 'English', '中文', 'F = ma', 'constructor', 'toString', '__proto__']) {
    assert.equal(translateUiText(text, 'en'), text);
    assert.equal(translateUiText(text, 'zh'), text);
    assert.equal(translateUiText(text, 'es'), text);
  }
});

test('Spanish covers every fixed English UI key, including action and error messages', () => {
  for (const key of Object.keys(UI_TRANSLATIONS)) {
    assert.ok(Object.hasOwn(SPANISH_TRANSLATIONS, key), key);
    const translated = translateUiText(key, 'es');
    assert.ok(translated.length > 0, key);
    assert.notEqual(translated, key, key);
    assert.doesNotMatch(translated, /[\p{Script=Han}]/u, key);
  }
  for (const key of Object.keys(SPANISH_TRANSLATIONS)) {
    assert.doesNotMatch(translateUiText(key, 'es'), /[\p{Script=Han}]/u, key);
    assert.equal(translateUiText(key, 'zh'), key, key);
  }
  assert.equal(translateUiText('保存修改', 'es'), 'Guardar cambios');
  assert.equal(translateUiText('绘制此公式', 'es'), 'Graficar esta ecuación');
  assert.equal(translateUiText('我的公式快捷词', 'es'), 'Mis atajos de fórmulas');
});

test('Spanish science presets and conversion choices translate labels without changing symbols', () => {
  for (const item of [...CHEMISTRY_TEMPLATES, ...PHYSICS_TEMPLATES, ...UNIT_PRESETS]) {
    assert.notEqual(translateUiText(item.label, 'es'), item.label, item.label);
    assert.doesNotMatch(translateUiText(item.label, 'es'), /[\p{Script=Han}]/u, item.label);
  }
  for (const category of UNIT_CATEGORIES) {
    assert.doesNotMatch(translateUiText(category.label, 'es'), /[\p{Script=Han}]/u, category.id);
    for (const unit of category.units) {
      const text = translateUiText(`${unit.label} (${unit.symbol})`, 'es');
      assert.doesNotMatch(text, /[\p{Script=Han}]/u, unit.id);
      assert.ok(text.endsWith(`(${unit.symbol})`), unit.id);
    }
  }
  assert.equal(translateUiText('英寸 (in)', 'es'), 'Pulgada (in)');
  assert.equal(translateUiText('盎司（常衡） (oz)', 'es'), 'Onza (avoirdupois) (oz)');
  assert.equal(translateUiText('牛顿第二定律', 'es'), 'Segunda ley de Newton');
});

test('Spanish periodic names cover all elements and preserve identity and accentless search', () => {
  assert.equal(Object.keys(SPANISH_ELEMENT_NAMES).length, 118);
  for (const item of PERIODIC_ELEMENTS) {
    const name = SPANISH_ELEMENT_NAMES[item.name];
    assert.ok(name, item.name);
    assert.equal(translateUiText(item.name, 'es'), name);
    assert.equal(translateUiText(`${item.number} ${item.name} ${item.symbol}`, 'es'), `${item.number} ${name} ${item.symbol}`);
    assert.equal(translateUiText(`${item.number} · ${item.symbol} · ${item.name}`, 'es'), `${item.number} · ${item.symbol} · ${name}`);
    assert.equal(translateUiText(item.name, 'en'), item.name);
    assert.equal(translateUiText(item.name, 'zh'), item.name);
    assert.ok(getElementSearchNames(item.name).includes(item.name));
    assert.ok(getElementSearchNames(item.name).includes(name));
  }
  assert.match(getElementSearchNames('hydrogen'), /hidrógeno hidrogeno/);
  assert.equal(getElementSearchNames('constructor'), 'constructor');
  assert.equal(translateUiText('26 iron Fe', 'es'), '26 hierro Fe');
});

test('Spanish dynamic labels preserve counts, formulas, commands and axis identities', () => {
  for (const [source, expected] of [
    ['118 个元素', '118 elementos'],
    ['1 个元素', '1 elemento'],
    ['3 个匹配元素；点击元素可插入', '3 elementos coincidentes; haz clic en uno para insertarlo'],
    ['1 个匹配元素；点击元素可插入', '1 elemento coincidente; haz clic en uno para insertarlo'],
    ['编辑第 12 个公式', 'Editar ecuación 12'],
    ['第 21 行 · 行内公式', 'Línea 21 · Ecuación en línea'],
    ['插入分数；选中内容后可套用结构', 'Insertar fracción; selecciona contenido para aplicar la estructura'],
    ['插入阿尔法 α', 'Insertar alfa α'],
    ['添加三键', 'Añadir enlace triple'],
    ['左侧 / 右侧：H: 2 / 2 · 电荷: 1 / 0', 'Izquierda / derecha: H: 2 / 2 · carga: 1 / 0'],
    ['视图内 2 / 3 个点。点击保存才写入笔记。', '2 / 3 puntos visibles. Guarda para actualizar la nota.'],
    ['X 最小值', 'X mín.'], ['Im 最大值', 'Im máx.'],
    [String.raw`此输入框暂不支持命令 \custom，请使用常用化学符号或单位。`, String.raw`Esta entrada no admite \custom. Usa notación química o unidades comunes.`],
    ['第 4 行：请输入 3+2i、−i 或 4 这样的数值；暂不支持表达式或名称。', 'Línea 4: introduce un número como 3+2i, −i o 4; aún no se admiten expresiones ni nombres.'],
    ['第 2 行：实部和虚部须为 −1000000 至 1000000 之间的有效数值。', 'Línea 2: las partes real e imaginaria deben ser números válidos entre −1000000 y 1000000.'],
  ]) assert.equal(translateUiText(source, 'es'), expected, source);
  assert.equal(translateUiText('  保存修改\n', 'es'), '  Guardar cambios\n');
  assert.equal(translateUiText('私有笔记中的任意文本', 'es'), '私有笔记中的任意文本');
  assert.match(translateUiText(String.raw`化学键格式无效，请使用单键、双键、三键按钮，或 \bond{1}、\bond{2}、\bond{3}。`, 'es'), /\\bond\{1\}.*\\bond\{2\}.*\\bond\{3\}/);
});

test('generated graph descriptions translate prose while preserving mathematical payloads', () => {
  const expression = 'sqrt(x) + sin(x) / 1.25e-4';
  const aria = `Equation graph: y = ${expression}; horizontal axis X, vertical axis Y`;
  const title = `Equation graph: y = ${expression}`;
  assert.equal(translatePlotUiText(aria, 'es'), `Gráfica de ecuación: y = ${expression}; eje horizontal X, eje vertical Y`);
  assert.equal(translatePlotUiText(title, 'es'), `Gráfica de ecuación: y = ${expression}`);
  assert.equal(translatePlotUiText(aria, 'zh'), `函数图像：y = ${expression}；横轴 X，纵轴 Y`);
  assert.equal(translatePlotUiText(title, 'zh'), `函数图像：y = ${expression}`);
  assert.equal(translatePlotUiText(aria, 'en'), aria);
  const values = 'z1 = 3+2i; z2 = −4.5i';
  const complex = `Horizontal real axis Re; vertical imaginary axis Im. Equal unit lengths on both axes. 1 of 2 points visible. ${values}.`;
  assert.equal(translatePlotUiText(complex, 'es'), `Eje real horizontal Re; eje imaginario vertical Im. Ambos ejes tienen la misma escala. 1 de 2 puntos visibles. ${values}.`);
  assert.equal(translatePlotUiText(complex, 'zh'), `横向实轴 Re；纵向虚轴 Im。两轴每单位长度相同。当前显示 1 / 2 个点。${values}。`);
  assert.equal(translatePlotUiText('1/1 points · equal units', 'es'), '1/1 punto · misma escala');
  assert.equal(translatePlotUiText('Complex plane', 'es'), 'Plano complejo');
  assert.equal(translatePlotUiText('Complex plane', 'zh'), '复平面');
  for (const language of ['en', 'zh', 'es'] as const) {
    for (const payload of ['X', 'Y', 'Re', 'Im', '3.14159', expression, values, 'z1 = 3+2i', 'unrecognized user text']) {
      assert.equal(translatePlotUiText(payload, language), payload);
    }
  }
});

test('graph picker rows translate graph identity while preserving the complete formula suffix', () => {
  for (const suffix of ['y = x^2+1', 'z1 = 3 + 2i; z2 = -4.5i', String.raw`y = \frac{1}{x} · 1.25e-4`, '']) {
    assert.equal(translateUiText(`图像 1 · ${suffix}`, 'es'), `Gráfica 1 · ${suffix}`);
    assert.equal(translateUiText(`复平面 12 · ${suffix}`, 'es'), `Plano complejo 12 · ${suffix}`);
    assert.equal(translateUiText(`图像 1 · ${suffix}`, 'en'), `Graph 1 · ${suffix}`);
    assert.equal(translateUiText(`复平面 12 · ${suffix}`, 'en'), `Complex plane 12 · ${suffix}`);
    assert.equal(translateUiText(`图像 1 · ${suffix}`, 'zh'), `图像 1 · ${suffix}`);
  }
});

test('common labels and science presets have complete English translations', () => {
  assert.equal(translateUiText('保存修改', 'en'), 'Save changes');
  assert.equal(translateUiText('单位', 'en'), 'Units');
  assert.equal(translateUiText('撤销', 'en'), 'Undo');
  assert.equal(translateUiText('保存修改', 'zh'), '保存修改');
  for (const item of [...CHEMISTRY_TEMPLATES, ...PHYSICS_TEMPLATES, ...UNIT_PRESETS]) {
    const translated = translateUiText(item.label, 'en');
    assert.notEqual(translated, item.label, item.label);
    assert.doesNotMatch(translated, /[\p{Script=Han}]/u, item.label);
  }
});

test('dynamic labels translate counts and preserve command spellings', () => {
  assert.equal(translateUiText('118 个元素', 'en'), '118 elements');
  assert.equal(translateUiText('3 个匹配元素；点击元素可插入', 'en'), '3 matching elements; click an element to insert');
  assert.equal(translateUiText('编辑第 12 个公式', 'en'), 'Edit equation 12');
  assert.equal(translateUiText('第 21 行 · 行内公式', 'en'), 'Line 21 · Inline equation');
  assert.equal(translateUiText('插入分数；选中内容后可套用结构', 'en'), 'Insert fraction; select content to wrap it');
  assert.equal(translateUiText('插入阿尔法 α', 'en'), 'Insert alpha α');
  assert.equal(translateUiText('添加三键', 'en'), 'Add triple bond');
  assert.equal(translateUiText(String.raw`此输入框暂不支持命令 \custom，请使用常用化学符号或单位。`, 'en'), String.raw`This input does not support \custom. Use common chemical notation or units.`);
});

test('errors and converter instructions translate without corrupting formulas or whitespace', () => {
  assert.equal(translateUiText('花括号尚未配对，请补全后保存。', 'en'), 'Complete the unmatched braces before saving.');
  assert.equal(translateUiText('请选择相同类别的单位。', 'en'), 'Choose units from the same category.');
  assert.equal(translateUiText('上下标尚未填写完整，请补全后再插入。', 'en'), 'Complete the superscript or subscript before inserting.');
  assert.equal(translateUiText('  保存修改\n', 'en'), '  Save changes\n');
  assert.equal(translateUiText('私有笔记中的任意文本', 'en'), '私有笔记中的任意文本');
  const bond = translateUiText(String.raw`化学键格式无效，请使用单键、双键、三键按钮，或 \bond{1}、\bond{2}、\bond{3}。`, 'en');
  assert.match(bond, /\\bond\{1\}.*\\bond\{2\}.*\\bond\{3\}/);
});

test('graph controls, summaries and host language labels have English fallbacks', () => {
  for (const [zh, en] of [
    ['图像', 'Graph'], ['复平面', 'Complex plane'], ['函数图像', 'Function graph'],
    ['保存视图', 'Save view'], ['编辑图像', 'Edit graph'], ['重置视图', 'Reset view'],
    ['插入图像', 'Insert graph'], ['预览图像', 'Preview graph'], ['适应所有点', 'Fit all points'],
    ['界面语言', 'Interface language'], ['界面语言 / Interface language', 'Interface language'],
    ['示例：x^2, sin(x), 1/x', 'Examples: x^2, sin(x), 1/x'],
    ['跟随 Obsidian', 'Follow Obsidian'],
    ['跟随 Obsidian / Follow Obsidian', 'Follow Obsidian'],
    ['无法保存语言偏好 / Unable to save language preference', 'Unable to save language preference'],
  ]) {
    assert.equal(translateUiText(zh, 'en'), en);
    assert.equal(translateUiText(zh, 'zh'), zh);
  }
});

test('insertion failures give actionable English messages instead of untranslated notices', () => {
  for (const zh of [
    '公式位置无效，请重新打开编辑器。',
    '此位置位于表格、列表或引用块。第一版请使用行内公式，或到普通空白段落插入独立公式。',
    '表格内暂不支持含竖线的复杂环境，请在表格外编辑这个公式。',
    '插入图像时，也会保存当前已完成的公式草稿。',
    '请先完成或清空当前公式，再插入图像。绘图输入和预览仍保留。',
    '未能插入图像，输入和预览仍保留，请重试。',
  ]) {
    const translated = translateUiText(zh, 'en');
    assert.notEqual(translated, zh, zh);
    assert.doesNotMatch(translated, /[\p{Script=Han}]/u, zh);
  }
});
