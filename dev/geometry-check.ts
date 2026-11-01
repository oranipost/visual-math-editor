import { mountPlotTools, type PlotDraft, type GeometryViewDraft } from '../src/plot-ui';
import { mountEditor } from '../src/editor-ui';
import { localizeEditor, type Language } from '../src/i18n';
import { DEFAULT_GEOMETRY_SPEC } from '../src/geometry-models';
import type { GeometryModel, GeometryShape } from '../src/geometry-types';
import type { PlotSpec } from '../src/plot-engine';
import { findPlotBlocks, parsePlotSpec, planGraphInsert, planGraphUpdate, serializePlot } from '../src/plot-markdown';

/** Browser components and test-memory writes only. Native gestures and vault persistence are separate acceptance checks. */
export async function checkGeometryTools(check: (condition: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div'); fixture.className = 'vme-editor'; document.body.append(fixture);
  let tools: ReturnType<typeof mountPlotTools> | undefined;
  let locale: ReturnType<typeof localizeEditor> | undefined;
  let written: PlotSpec | undefined;
  let writes = 0, attempts = 0, rejectSave = false;
  let note = 'Before α 😀\r\n\r\nAfter 中文\r\n';
  const settle = async (ms = 0): Promise<void> => { await Promise.resolve(); await new Promise<void>(resolve => setTimeout(resolve, ms)); };
  const q = <T extends Element>(selector: string): T => {
    const result = fixture.querySelector<T>(selector);
    if (!result) throw new Error(`Geometry check: missing ${selector}`);
    return result;
  };
  const button = (name: string) => q<HTMLButtonElement>(`[data-action="${name}"]`);
  const act = async (name: string): Promise<void> => { button(name).click(); await settle(); };
  const input = (name: string, value: string): void => { const node = q<HTMLInputElement>(`[data-testid="${name}"]`); node.value = value; node.dispatchEvent(new Event('input', { bubbles: true })); };
  const select = (name: string, value: string): void => { const node = q<HTMLSelectElement>(`[data-testid="${name}"]`); node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); };
  const svg = () => fixture.querySelector<SVGElement>('[data-testid="plot-preview"] svg');
  const status = () => q<HTMLElement>('[data-testid="plot-status"]');
  const mount = (draft?: PlotDraft, editing = false, language: Language = 'en'): void => {
    locale?.destroy(); tools?.destroy(); fixture.replaceChildren();
    tools = mountPlotTools(fixture, { initialDraft: draft, editing, onInsertGraph: async spec => {
      attempts++;
      if (rejectSave) throw new Error('Simulated note conflict');
      const normalized = parsePlotSpec(serializePlot(spec).split('\n')[1]);
      const block = editing ? findPlotBlocks(note)[0] : undefined;
      if (editing && !block) throw new Error('Missing test-memory graph');
      const at = note.indexOf('After');
      const target = { snapshot: note, from: block?.from ?? at, to: block?.to ?? at };
      const replacement = block ? planGraphUpdate(note, target, normalized) : planGraphInsert(note, target, normalized, '', true);
      note = note.slice(0, target.from) + replacement + note.slice(target.to);
      written = normalized; writes++;
    } });
    locale = localizeEditor(fixture, language);
  };
  const draftOf = (spec: PlotSpec): PlotDraft => ({
    mode: spec.mode, expression: spec.expression,
    xMin: String(spec.xMin), xMax: String(spec.xMax), yMin: String(spec.yMin), yMax: String(spec.yMax),
    azimuth: String(spec.azimuth ?? 45), elevation: String(spec.elevation ?? 30), geometryZoom: String(spec.geometryZoom ?? 1),
    geometry: spec.geometry ? Object.fromEntries(Object.entries(spec.geometry).map(([key, value]) => [key, typeof value === 'number' ? String(value) : value])) as unknown as GeometryViewDraft : undefined,
    previewed: true,
  });
  const shapes = ['sphere', 'cylinder', 'cone', 'pyramid', 'prism', 'cuboid', 'plane'] as const;
  const dimensions: Record<typeof shapes[number], Partial<Record<'radius' | 'height' | 'width' | 'depth' | 'sides', string>>> = {
    sphere: { radius: '2.5' }, cylinder: { radius: '1.5', height: '4' }, cone: { radius: '2', height: '5' },
    pyramid: { radius: '2', height: '4', sides: '5' }, prism: { radius: '2', height: '3', sides: '6' },
    cuboid: { width: '3', depth: '4', height: '5' }, plane: { width: '6', depth: '4' },
  };
  try {
    for (const shape of shapes) {
      mount(); const count = writes;
      select('plot-kind', 'geometry'); select('geometry-shape', shape); await settle();
      check(tools!.getDraft().mode === 'geometry' && svg()?.getAttribute('data-vme-plot') === 'geometry', `${shape}: 选择形状即显示真实SVG预览，不要求输入方程`);
      check(q<HTMLInputElement>('[data-testid="plot-expression"]').hidden === true && q<HTMLDetailsElement>('.vme-plot-range').hidden === true, `${shape}: 隐藏方程输入和无关XY范围`);
      check(writes === count && tools!.getDraft().expression === '', `${shape}: 模型预览不改测试笔记，模型不被当成方程解析`);
      for (const key of ['radius', 'height', 'width', 'depth', 'sides', 'angle', 'offset'] as const) {
        const control = q<HTMLInputElement>(`[data-testid="geometry-${key}"]`).closest('label')!;
        check(control.hidden === !(key in dimensions[shape]), `${shape}: ${key}仅在适用模型时显示`);
      }
      for (const [key, value] of Object.entries(dimensions[shape])) input(`geometry-${key}`, value);
      check(svg() === null && !button('plot-insert').disabled, `${shape}: 编辑尺寸立即清掉过时图像，可直接明确插入`);
      await act('plot-insert');
      check(writes === count + 1 && written?.mode === 'geometry' && written.geometry?.shape === shape, `${shape}: 未等待自动预览即可插入最新模型`);
      const savedModel = written?.geometry as GeometryModel;
      check(Object.entries(dimensions[shape]).every(([key, value]) => savedModel[key as keyof GeometryModel] === Number(value)), `${shape}: 所有适用尺寸经严格序列化保持原值`);
      check(savedModel.faces === true && written?.geometryZoom === 1, `${shape}: 默认面与边及缩放随模型保存`);
    }

    for (const [shape, expected] of [
      ['planes', { angle: '45', offset: '0' }], ['line-plane', { angle: '30', offset: '1' }], ['sphere-plane', { radius: '1', offset: '0.5' }],
    ] as const) {
      mount(); const count = writes; select('plot-kind', 'geometry'); select('geometry-shape', shape); await settle();
      check(!!svg() && Object.entries(expected).every(([key, value]) => (tools!.getDraft().geometry as unknown as Record<string, unknown>)[key] === value), `${shape}: 新关系使用明确默认值并直接预览`);
      check(writes === count, `${shape}: 默认关系预览不自动保存笔记`);
    }
    const relationCases: { shape: GeometryShape; parameters: Record<string, string>; relation: string }[] = [
      { shape: 'planes', parameters: { angle: '0', offset: '0' }, relation: 'planes-coincident' },
      { shape: 'planes', parameters: { angle: '0', offset: '-1' }, relation: 'planes-parallel' },
      { shape: 'planes', parameters: { angle: '45', offset: '1' }, relation: 'planes-intersecting' },
      { shape: 'planes', parameters: { angle: '90', offset: '-1' }, relation: 'planes-intersecting' },
      { shape: 'line-plane', parameters: { angle: '0', offset: '0' }, relation: 'line-contained' },
      { shape: 'line-plane', parameters: { angle: '0', offset: '1' }, relation: 'line-parallel' },
      { shape: 'line-plane', parameters: { angle: '30', offset: '-1' }, relation: 'line-intersecting' },
      { shape: 'line-plane', parameters: { angle: '90', offset: '0' }, relation: 'line-intersecting' },
      { shape: 'sphere-plane', parameters: { radius: '1', offset: '0' }, relation: 'sphere-circle' },
      { shape: 'sphere-plane', parameters: { radius: '1', offset: '1' }, relation: 'sphere-tangent' },
      { shape: 'sphere-plane', parameters: { radius: '1', offset: '-1' }, relation: 'sphere-tangent' },
      { shape: 'sphere-plane', parameters: { radius: '1', offset: '2' }, relation: 'sphere-disjoint' },
    ];
    for (const item of relationCases) {
      mount(); const count = writes;
      select('plot-kind', 'geometry'); select('geometry-shape', item.shape);
      for (const [key, value] of Object.entries(item.parameters)) input(`geometry-${key}`, value);
      await act('plot-insert');
      check(writes === count + 1 && written?.geometry?.shape === item.shape && svg()?.getAttribute('data-relation-state') === item.relation, `${item.shape}: ${item.relation}直接预览并插入正确关系状态`);
      check(Object.entries(item.parameters).every(([key, value]) => (written?.geometry as unknown as Record<string, unknown>)[key] === Number(value)), `${item.relation}: 角度、半径、正负位置保持输入值`);
      check(q<HTMLInputElement>('[data-testid="plot-expression"]').hidden === true && q<HTMLDetailsElement>('.vme-plot-range').hidden === true, `${item.relation}: 空间关系不要求方程或坐标范围`);
      for (const key of ['radius', 'angle', 'offset'] as const) check(q<HTMLInputElement>(`[data-testid="geometry-${key}"]`).closest('label')!.hidden === !(key in item.parameters), `${item.relation}: ${key}只在适用关系显示`);
      const restored = { ...written!, azimuth: 123, elevation: 61, geometryZoom: 1.75 };
      note = 'Before α 😀\r\n\r\n' + serializePlot(restored) + '\r\n\r\nAfter 中文\r\n';
      const unchanged = note;
      mount(draftOf(findPlotBlocks(note)[0].spec), true); await settle();
      check(svg()?.getAttribute('data-relation-state') === item.relation && tools!.getDraft().azimuth === '123' && tools!.getDraft().geometryZoom === '1.75', `${item.relation}: 数据重开保留关系、参数与相机缩放`);
      await act('plot-insert');
      check(note === unchanged, `${item.relation}: 无改动保存逐字保留笔记`);
    }
    // Alter the same controls in both directions; only explicit Save updates the note.
    const relationCount = writes, relationNote = note;
    input('geometry-offset', '-2'); await act('plot-preview');
    check(svg()?.getAttribute('data-relation-state') === 'sphere-disjoint' && tools!.getDraft().geometry?.offset === '-2', '球面关系位置改成负数，预览采用负位置且保留输入');
    input('geometry-offset', '0'); await act('plot-preview');
    check(svg()?.getAttribute('data-relation-state') === 'sphere-circle' && writes === relationCount && note === relationNote, '位置改回0生成截圆，预览不写笔记');
    input('geometry-radius', '2'); input('geometry-offset', '2'); await act('plot-insert');
    check(written?.geometry?.radius === 2 && written.geometry.offset === 2 && svg()?.getAttribute('data-relation-state') === 'sphere-tangent', '半径与位置共同修改后保存最新相切状态');
    const savedRelation = findPlotBlocks(note)[0].spec; mount(draftOf(savedRelation), true); await settle();
    check(tools!.getDraft().geometry?.radius === '2' && tools!.getDraft().geometry?.offset === '2' && tools!.getDraft().azimuth === '123' && tools!.getDraft().geometryZoom === '1.75', '关系参数保存再重挂载保留相机和缩放');
    const safeCount = writes, safeNote = note;
    for (const value of ['-4.001', '4.001', 'NaN', '1+1', '']) {
      input('geometry-offset', value); await act('plot-insert');
      check(writes === safeCount && note === safeNote && tools!.getDraft().geometry?.offset === value && !svg() && status().dataset.state === 'error', `关系无效位置“${value}”原文保留且拒绝保存`);
    }

    for (const language of ['en', 'zh', 'es'] as const) {
      mount(draftOf({ ...DEFAULT_GEOMETRY_SPEC, geometry: { shape: 'sphere-plane', radius: 1, offset: 1, faces: true } }), false, language); await settle();
      check(svg()?.getAttribute('data-relation-state') === 'sphere-tangent' && tools!.getDraft().geometry?.offset === '1', `${language}: 空间关系切语言保持关系和数值原文`);
      if (language !== 'zh') check(!/[\p{Script=Han}]/u.test(fixture.textContent ?? ''), `${language}: 空间关系及提示无固定中文残留`);
    }
    mount({ ...draftOf({ ...DEFAULT_GEOMETRY_SPEC, geometry: { shape: 'planes', angle: 45, offset: -1, faces: true } }), previewed: true });
    const angleCount = writes, angleNote = note;
    input('geometry-angle', '0'); await act('plot-preview');
    check(svg()?.getAttribute('data-relation-state') === 'planes-parallel', '同一角度控件从45改0，两个平面切为平行');
    input('geometry-angle', '90'); await act('plot-preview');
    check(svg()?.getAttribute('data-relation-state') === 'planes-intersecting', '角度从0改90，两个平面恢复相交');
    input('geometry-angle', '0'); input('geometry-offset', '0'); await act('plot-preview');
    check(svg()?.getAttribute('data-relation-state') === 'planes-coincident' && writes === angleCount && note === angleNote, '角度和位置改回0，两个平面重合；参数预览不自动写笔记');
    for (const value of ['-1', '90.1', 'Infinity', 'pi', '']) {
      input('geometry-angle', value); await act('plot-insert');
      check(writes === angleCount && note === angleNote && tools!.getDraft().geometry?.angle === value && !svg(), `无效角度“${value}”保留输入且拒绝写入`);
    }

    note = 'Before α 😀\r\n\r\n' + serializePlot({ ...DEFAULT_GEOMETRY_SPEC, geometry: { shape: 'cylinder', radius: 2, height: 5, faces: false }, azimuth: 130, elevation: 50, geometryZoom: 1.5 }) + '\r\n\r\nAfter 中文\r\n';
    const original = note;
    const saved = findPlotBlocks(note)[0].spec;
    mount(draftOf(saved), true); await settle();
    check(tools!.getDraft().geometry?.radius === '2' && tools!.getDraft().geometry?.height === '5' && tools!.getDraft().geometry?.faces === false && tools!.getDraft().geometryZoom === '1.5', '从已保存数据重开：圆柱尺寸、线框和缩放保持');
    check(tools!.getDraft().azimuth === '130' && tools!.getDraft().elevation === '50' && !!svg(), '从已保存数据重开：相机视角和模型预览恢复');
    const count = writes;
    await act('plot-insert');
    check(writes === count + 1 && note === original, '无改动明确保存，测试笔记含CRLF的原文逐字不变');
    input('geometry-height', '7'); await act('plot-insert');
    check(written?.geometry?.height === 7 && note.startsWith('Before α 😀\r\n\r\n') && note.endsWith('\r\n\r\nAfter 中文\r\n'), '编辑保存只更新选中模型块，前后正文和CRLF边界不变');
    mount(draftOf(findPlotBlocks(note)[0].spec), true); await settle();
    check(tools!.getDraft().geometry?.height === '7' && tools!.getDraft().geometryZoom === '1.5' && q<HTMLSelectElement>('[data-testid="geometry-faces"]').value === 'wireframe', '再次解析并重挂载，最新圆柱高度、缩放和线框恢复');
    const modelBefore = JSON.stringify(findPlotBlocks(note)[0].spec.geometry);
    const priorSvg = svg()?.outerHTML; const oldAngle = tools!.getDraft().azimuth;
    await act('plot-rotate-right');
    check(tools!.getDraft().azimuth !== oldAngle && svg()?.outerHTML !== priorSvg && writes === count + 2, '实际旋转按钮更新相机和SVG，仅改草稿');
    await act('plot-zoom-in');
    check(Number(tools!.getDraft().geometryZoom) > 1.5 && JSON.stringify(written?.geometry) === modelBefore, '实际放大按钮改变缩放，不改变模型尺寸');
    await act('plot-reset-view');
    check(tools!.getDraft().geometryZoom === '1.5' && tools!.getDraft().azimuth === '130' && tools!.getDraft().elevation === '50', '重置视图恢复本次打开时的相机与缩放');
    const preview = q<HTMLElement>('[data-testid="plot-preview"]');
    const frame = q<SVGGraphicsElement>('[data-testid="plot-preview"] svg [data-plot-frame]').getBoundingClientRect();
    const wheel = new WheelEvent('wheel', { deltaY: -60, clientX: frame.left + frame.width / 2, clientY: frame.top + frame.height / 2, bubbles: true, cancelable: true });
    const beforeWheelSvg = svg()?.outerHTML;
    preview.dispatchEvent(wheel); await settle(80);
    check(wheel.defaultPrevented && Number(tools!.getDraft().geometryZoom) > 1.5 && svg()?.outerHTML !== beforeWheelSvg, '真实DOM滚轮事件缩放模型并重新绘制SVG');
    check(tools!.getDraft().geometry?.radius === '2' && tools!.getDraft().geometry?.height === '7' && JSON.stringify(written?.geometry) === modelBefore, '滚轮缩放保持各尺寸与已保存笔记不变');
    select('geometry-faces', 'faces'); await settle();
    const latest = tools!.getDraft(); mount(latest, true); await settle();
    check(tools!.getDraft().geometry?.faces === true && tools!.getDraft().geometryZoom === latest.geometryZoom && tools!.getDraft().azimuth === latest.azimuth, '草稿重挂载保留面显示、交互缩放和相机');
    await act('plot-insert');
    const viewSaved = findPlotBlocks(note)[0].spec;
    mount(draftOf(viewSaved), true); await settle();
    check(viewSaved.geometry?.faces === true && tools!.getDraft().geometryZoom === String(viewSaved.geometryZoom) && tools!.getDraft().azimuth === String(viewSaved.azimuth), '显式保存后重新解析，视图与面显示持久化于测试数据');

    // Independent mode caches retain raw invalid text; shape changes never rewrite function input.
    mount({ expression: 'x+', xMin: '-4', xMax: '6', yMin: '-3', yMax: '7', previewed: false });
    select('plot-kind', 'geometry'); select('geometry-shape', 'cylinder'); input('geometry-radius', 'bad radius');
    const invalidDraft = tools!.getDraft();
    select('plot-kind', 'function'); await settle();
    check(tools!.getDraft().expression === 'x+' && tools!.getDraft().xMin === '-4' && tools!.getDraft().yMax === '7', '切回函数仍保留原始未完成表达式与范围，几何数据不注入函数');
    select('plot-kind', 'geometry'); await settle();
    check(tools!.getDraft().geometry?.radius === 'bad radius' && tools!.getDraft().geometry?.shape === 'cylinder', '切回几何保留未完成尺寸原文');
    mount(invalidDraft); await settle();
    check(tools!.getDraft().geometry?.radius === 'bad radius' && tools!.getDraft().functionDraft?.expression === 'x+', '重挂载保留两个模式各自原文，不使用长期存储');
    const invalidCount = writes, invalidNote = note;
    for (const value of ['', '-2', '0', '0x10', 'Infinity', '2+2', 'bad radius']) {
      input('geometry-radius', value); await act('plot-insert');
      check(writes === invalidCount && note === invalidNote && tools!.getDraft().geometry?.radius === value && !svg() && status().dataset.state === 'error', `无效尺寸“${value}”保留原输入、提示错误、不写笔记`);
    }
    input('geometry-radius', '2'); input('geometry-height', '4'); await act('plot-preview');
    rejectSave = true; const attemptsBefore = attempts; const rejectionDraft = tools!.getDraft();
    await act('plot-insert');
    check(attempts === attemptsBefore + 1 && writes === invalidCount && note === invalidNote && status().dataset.state === 'error' && !!svg(), '保存回调拒绝时，笔记保持不变，保留预览与可重试错误');
    check(tools!.getDraft().geometry?.radius === rejectionDraft.geometry?.radius && tools!.getDraft().geometry?.height === rejectionDraft.geometry?.height && !button('plot-insert').disabled, '保存被拒绝后保留全部尺寸草稿并允许明确重试');
    rejectSave = false; await act('plot-insert');
    check(writes === invalidCount + 1 && written?.geometry?.radius === 2, '失败后重试保存使用当前草稿，不复用过时模型');

    for (const [language, expected] of [['en', 'Sphere'], ['zh', '球体'], ['es', 'Esfera']] as const) {
      locale!.setLanguage(language); await settle();
      check(q<HTMLSelectElement>('[data-testid="geometry-shape"]').querySelector('option[value="sphere"]')?.textContent === expected, `${language}: 七形状面板采用所选语言`);
      check(q<HTMLInputElement>('[data-testid="plot-expression"]').hidden === true && q<HTMLDetailsElement>('.vme-plot-range').hidden === true && tools!.getDraft().geometry?.radius === '2', `${language}: 切语言保持简单界面和尺寸原值`);
      if (language !== 'zh') check(!/[\p{Script=Han}]/u.test(fixture.textContent ?? ''), `${language}: 图像工具无固定中文残留`);
    }
  } finally { locale?.destroy(); tools?.destroy(); fixture.remove(); }

  // The complete graph editor must expose no obsolete formula keyword controls.
  const editorHost = document.createElement('div'); document.body.append(editorHost);
  let editor: ReturnType<typeof mountEditor> | undefined;
  try {
    editor = mountEditor(editorHost, { latex: '', graphOnly: true, plotDraft: draftOf(DEFAULT_GEOMETRY_SPEC), language: 'en', onSave: () => undefined, onCancel: () => undefined, onSaveGraph: () => undefined });
    await settle();
    check(editor.getDraft().plot?.mode === 'geometry' && !editorHost.querySelector('[data-testid="geometry-controls"]')?.hasAttribute('hidden'), '完整图像编辑器直接恢复几何工具');
    check(!editorHost.querySelector('[data-testid*="keyword"], [data-action*="keyword"], [data-testid*="shortcut"]'), '完整编辑器没有自定义公式快捷词控件');
    check(editorHost.querySelector<HTMLInputElement>('[data-testid="plot-expression"]')?.hidden === true && editorHost.querySelector<HTMLDetailsElement>('.vme-plot-range')?.hidden === true, '完整几何编辑器仍隐藏方程和XY范围');
  } finally { editor?.destroy(); editorHost.remove(); }
}
