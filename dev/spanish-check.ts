import { mountEditor } from '../src/editor-ui';
import { localizeEditor } from '../src/i18n';
import { createPlot, DEFAULT_PLOT_SPEC } from '../src/plot-engine';
import { createComplexPlot, DEFAULT_COMPLEX_SPEC } from '../src/complex-plane';

/** Spanish regressions use real browser DOM and MathLive; no network or vault writes. */
export async function checkSpanishLocalization(check: (condition: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div'); document.body.append(fixture);
  const latex = String.raw`y=\frac{x}{2}`;
  const mounted = mountEditor(fixture, {
    latex, editing: true, compact: true, initialMode: 'hybrid',
    language: 'system', systemLanguage: 'es-MX',
    onSave: () => undefined, onSaveGraph: () => undefined, onCancel: () => undefined,
  });
  const settle = async () => { await Promise.resolve(); await new Promise(resolve => setTimeout(resolve, 0)); };
  const button = (action: string) => fixture.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
  const language = fixture.querySelector<HTMLSelectElement>('[data-testid="interface-language"]')!;
  const root = fixture.querySelector<HTMLElement>('[data-testid="visual-math-editor"]')!;
  const switchTo = async (value: string) => { language.value = value; language.dispatchEvent(new Event('change', { bubbles: true })); await settle(); };
  try {
    await settle();
    check(root.lang === 'es' && button('save').textContent === 'Guardar cambios', '跟随 Obsidian es-MX 会显示西班牙语，而非回退英语');
    check([...language.options].map(option => option.value).join(',') === 'system,zh,en,es'
      && language.querySelector('option[value="es"]')?.textContent === 'Español', '语言选择包括 Español，所有选项值保持稳定');
    check(button('fraction').title === 'Insertar fracción; selecciona contenido para aplicar la estructura'
      && button('sqrt').getAttribute('aria-label') === 'Insertar raíz cuadrada', '西班牙语结构工具提示和可访问标签完整翻译');
    check(button('mode-hybrid').textContent === 'Hybrid'
      && fixture.querySelector<HTMLTextAreaElement>('[data-testid="latex-source"]')?.getAttribute('aria-label') === 'Código LaTeX de la ecuación'
      && fixture.querySelector<HTMLTextAreaElement>('[data-testid="latex-source"]')?.value === latex,
    'Hybrid 模式名及源码保持原值，仅翻译源码区域的可访问标签');
    check(button('graph-equation').textContent === 'Graficar esta ecuación'
      && fixture.querySelector('[data-testid="formula-shortcuts"] summary')?.textContent === 'Mis atajos de fórmulas', '新增公式绘图及自定义快捷词入口使用西班牙语');

    button('subject-units').click(); await settle();
    const category = fixture.querySelector<HTMLSelectElement>('[data-testid="conversion-category"]')!;
    const from = fixture.querySelector<HTMLSelectElement>('[data-testid="conversion-from"]')!;
    const to = fixture.querySelector<HTMLSelectElement>('[data-testid="conversion-to"]')!;
    const value = fixture.querySelector<HTMLInputElement>('[data-testid="conversion-value"]')!;
    check(category.options[0].textContent === 'Longitud' && from.querySelector('option[value="in"]')?.textContent === 'Pulgada (in)', '换算类别与单位名使用西班牙语，单位符号不变');
    from.value = 'in'; to.value = 'cm'; value.value = '1'; value.dispatchEvent(new Event('input', { bubbles: true })); await settle();
    check(fixture.querySelector('[data-testid="conversion-result"]')?.textContent === '1 in = 2.54 cm'
      && from.value === 'in' && to.value === 'cm', '西班牙语界面中 1 英寸换算为 2.54 厘米，稳定单位值不受翻译影响');
    const units = fixture.querySelector<HTMLInputElement>('[data-testid="units-input"]')!;
    units.value = '9.81 m/s^2'; units.dispatchEvent(new Event('input', { bubbles: true })); await settle();

    button('subject-chemistry').click();
    const chemistry = fixture.querySelector<HTMLInputElement>('[data-testid="chemistry-input"]')!;
    chemistry.value = 'H2 + O2 -> H2O'; chemistry.dispatchEvent(new Event('input', { bubbles: true }));
    button('reaction-check').click(); await settle();
    check(button('reaction-check').textContent === 'Comprobar ajuste'
      && fixture.querySelector('[data-testid="reaction-status"]')?.textContent === 'Sin ajustar; puedes insertarla tal como está.', '未配平化学方程的操作与动态状态使用西班牙语');
    check(button('chemistry-insert').textContent === 'Insertar tal como está'
      && fixture.querySelector('[data-testid="reaction-differences"]')?.textContent?.startsWith('Izquierda / derecha:'), '原式插入按钮与元素差异报告使用西班牙语');
    const suggestion = fixture.querySelector('[data-testid="reaction-suggestion"]')?.textContent;
    check(suggestion === '2H2 + O2 -> 2H2O', '化学配平建议保持科学原式，不受界面翻译影响');

    button('subject-elements').click(); await settle();
    const hydrogen = button('element-1');
    hydrogen.dispatchEvent(new Event('pointerenter')); await settle();
    check(hydrogen.getAttribute('aria-label') === '1 hidrógeno H'
      && fixture.querySelector('.vme-element-detail-title')?.textContent === '1 · H · hidrógeno', '元素名称与悬停详情标题使用西班牙语，原子序数及符号不变');
    check(fixture.querySelector('[data-testid="detail-configuration-label"]')?.textContent === 'Configuración electrónica'
      && fixture.querySelector('[data-testid="detail-configuration"]')?.textContent === '1s1', '元素电子排布标签翻译，排布科学数据保持原值');
    const search = fixture.querySelector<HTMLInputElement>('.vme-element-search')!;
    search.value = 'hidrogeno'; search.dispatchEvent(new Event('input', { bubbles: true })); await settle();
    check(hydrogen.dataset.dimmed === 'false' && button('element-2').dataset.dimmed === 'true'
      && fixture.querySelector('.vme-element-count')?.textContent?.startsWith('1 elemento coincidente'), '支持不带重音的西班牙语元素搜索，动态匹配数使用西班牙语');

    await switchTo('en');
    check(root.lang === 'en' && button('save').textContent === 'Save changes'
      && hydrogen.getAttribute('aria-label') === '1 hydrogen H', '西班牙语切换英语可还原按钮和元素标签');
    await switchTo('zh');
    check(root.lang === 'zh' && button('save').textContent === '保存修改'
      && fixture.querySelector('[data-testid="detail-configuration-label"]')?.textContent === '电子排布', '从英语切回中文可还原原始标签');
    await switchTo('es');
    check(root.lang === 'es' && button('save').textContent === 'Guardar cambios'
      && chemistry.value === 'H2 + O2 -> H2O' && units.value === '9.81 m/s^2'
      && mounted.getDraft().latex === latex && suggestion === fixture.querySelector('[data-testid="reaction-suggestion"]')?.textContent,
    '中英西多次切换保持公式、化学输入、单位及配平建议不变');

    button('subject-math').click(); button('graph-equation').click(); await settle();
    check(button('plot-insert').textContent === 'Insertar ecuación y gráfica'
      && fixture.querySelector('[data-testid="plot-status"]')?.textContent?.startsWith('La gráfica está lista.'), '关联图像生成后的操作与异步状态使用西班牙语');
    const min = fixture.querySelector<HTMLElement>('[data-range-caption="xMin"]');
    check(min?.textContent === 'X mín.', '图像坐标边界标签使用西班牙语且保留大写轴名');
  } finally { mounted.destroy(); fixture.remove(); }

  const isolated = document.createElement('div'); document.body.append(isolated);
  isolated.innerHTML = '<button title="笔记内公式编辑器">保存修改</button><input value="hydrogen"><code>保存修改</code><span data-i18n-en="Custom English" data-i18n-es="Español explícito">保存修改</span>';
  const localization = localizeEditor(isolated, 'es');
  try {
    check(isolated.querySelector('button')?.title === 'Editor de ecuaciones en la nota'
      && isolated.querySelector('span')?.textContent === 'Español explícito'
      && isolated.querySelector('input')?.value === 'hydrogen' && isolated.querySelector('code')?.textContent === '保存修改', '西班牙语支持显式覆盖与可访问提示，保留输入值及代码块');
    localization.setLanguage('en'); localization.setLanguage('zh'); localization.setLanguage('es');
    const notice = document.createElement('p'); notice.textContent = '请选择相同类别的单位。'; isolated.append(notice); await settle();
    check(notice.textContent === 'Elige unidades de la misma categoría.'
      && isolated.querySelector('span')?.textContent === 'Español explícito', '语言切换后新插入的错误消息仍会自动翻译');
  } finally { localization.destroy(); isolated.remove(); }

  const graphs = document.createElement('div'); graphs.dataset.noI18n = ''; document.body.append(graphs);
  const functionResult = createPlot({ ...DEFAULT_PLOT_SPEC, expression: 'sqrt(x) + sin(x)' });
  const complexResult = createComplexPlot({ ...DEFAULT_COMPLEX_SPEC, expression: '3+2i\n-4.5i' });
  if (!functionResult.ok || !complexResult.ok) throw new Error('Invalid graph localization fixture');
  const parse = (source: string) => document.importNode(new DOMParser().parseFromString(source, 'image/svg+xml').documentElement, true);
  const generated = parse(functionResult.svg);
  const generic = parse(functionResult.svg); generic.removeAttribute('data-vme-plot');
  const originalLabel = generated.getAttribute('aria-label');
  const originalScientificText = [...generated.querySelectorAll('text')].map(node => node.textContent).join('|');
  graphs.append(generated, generic);
  const plotLocalization = localizeEditor(graphs, 'es');
  try {
    check(generated.getAttribute('aria-label')?.startsWith('Gráfica de ecuación: y = sqrt(x) + sin(x);')
      && generated.querySelector('title')?.textContent === 'Gráfica de ecuación: y = sqrt(x) + sin(x)'
      && generated.querySelector('desc')?.textContent?.startsWith('Gráfica numérica aproximada.')
      && generic.getAttribute('aria-label') === originalLabel, '只翻译带插件标记图像的可访问说明，通用 SVG 保持原值');
    plotLocalization.setLanguage('zh');
    const chinese = generated.getAttribute('aria-label')?.startsWith('函数图像：y = sqrt(x) + sin(x)');
    plotLocalization.setLanguage('en');
    check(chinese && generated.getAttribute('aria-label') === originalLabel
      && [...generated.querySelectorAll('text')].map(node => node.textContent).join('|') === originalScientificText,
    '图像说明中西英切换可还原，函数表达式、轴名与数值全部保持原值');

    plotLocalization.setLanguage('es');
    const complex = parse(complexResult.svg); graphs.append(complex); await settle();
    check(complex.getAttribute('aria-label')?.startsWith('Eje real horizontal Re; eje imaginario vertical Im.')
      && complex.querySelector('title')?.textContent === 'Plano complejo'
      && complex.querySelector('[data-vme-plot-caption="title"]')?.textContent === 'Plano complejo'
      && complex.querySelector('[data-vme-plot-caption="footer"]')?.textContent === '2/2 puntos · misma escala',
    '忽略正文翻译的预览中新增复平面时，仅翻译专属说明、标题和页脚');
    const pointsBefore = [...complex.querySelectorAll('[data-complex-point] title,[data-complex-label],[data-axis-tick],[data-axis-label]')].map(node => node.textContent).join('|');
    plotLocalization.setLanguage('zh'); plotLocalization.setLanguage('es');
    check([...complex.querySelectorAll('[data-complex-point] title,[data-complex-label],[data-axis-tick],[data-axis-label]')].map(node => node.textContent).join('|') === pointsBefore
      && complex.getAttribute('aria-label')?.includes('z1 = 3 + 2i; z2 = -4.5i')
      && generic.getAttribute('aria-label') === originalLabel, '复平面切换语言保留复数、点标签、刻度和 Re/Im，且始终不改通用 SVG');
  } finally { plotLocalization.destroy(); graphs.remove(); }
}
