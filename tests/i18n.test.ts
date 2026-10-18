import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveLanguage, translateUiText, type Language } from '../src/i18n';
import { CHEMISTRY_TEMPLATES, PHYSICS_TEMPLATES, UNIT_PRESETS } from '../src/science-data';

test('the host app language follows Chinese locales and otherwise uses English', () => {
  for (const locale of ['zh', 'zh-CN', 'zh-TW', 'zh-Hans', 'ZH_hant_HK', ' zh ']) assert.equal(resolveLanguage('system', locale), 'zh', locale);
  for (const locale of ['en-US', 'en-GB', 'fr', 'ja-JP', 'de-DE', 'es', 'pt-BR', 'ko', 'ar', '', 'zhfake']) assert.equal(resolveLanguage('system', locale), 'en', locale);
  assert.equal(resolveLanguage('zh', 'en-US'), 'zh');
  assert.equal(resolveLanguage('en', 'zh-CN'), 'en');
  assert.equal(resolveLanguage('outdated-preference' as Language, 'zh'), 'en');
});

test('mode names, arbitrary source and numeric content remain unchanged', () => {
  for (const text of ['Visual', 'LaTeX', 'Hybrid', String.raw`\ce{H2O}`, String.raw`\frac{1}{2}`, '273.15 K', 'English', '中文', 'F = ma', 'constructor', 'toString', '__proto__']) {
    assert.equal(translateUiText(text, 'en'), text);
    assert.equal(translateUiText(text, 'zh'), text);
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
    ['界面语言 / Interface language', 'Interface language'],
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
