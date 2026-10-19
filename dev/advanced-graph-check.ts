import { mountPlotTools, type PlotDraft } from '../src/plot-ui';
import { mountEditor } from '../src/editor-ui';
import { localizeEditor } from '../src/i18n';
import { parsePlotSpec, serializePlot } from '../src/plot-markdown';
import type { PlotSpec } from '../src/plot-engine';

export async function checkAdvancedGraphs(check: (value: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div'); fixture.className = 'vme-editor'; document.body.append(fixture);
  let tools: ReturnType<typeof mountPlotTools> | undefined;
  let locale: ReturnType<typeof localizeEditor> | undefined;
  let written: PlotSpec | undefined;
  const settle = async (ms=0) => { await Promise.resolve(); await new Promise(resolve => setTimeout(resolve, ms)); };
  const q = <T extends Element>(selector: string) => fixture.querySelector<T>(selector)!;
  const action = (name: string) => q<HTMLButtonElement>(`[data-action="${name}"]`).click();
  const input = (name: string, value: string) => { const node=q<HTMLInputElement>(`[data-testid="plot-${name}"]`); node.value=value; node.dispatchEvent(new Event('input',{bubbles:true})); };
  const select = (name: string, value: string) => { const node=q<HTMLSelectElement>(`[data-testid="plot-${name}"]`); node.value=value; node.dispatchEvent(new Event('change',{bubbles:true})); };
  const mount = (draft?: PlotDraft) => {
    locale?.destroy(); tools?.destroy(); fixture.replaceChildren();
    tools = mountPlotTools(fixture,{initialDraft:draft,onInsertGraph:async spec=>{ written=parsePlotSpec(serializePlot(spec).split('\n')[1]); }});
    locale=localizeEditor(fixture,'en');
  };
  try {
    mount(); input('expression','x^2'); select('calculus','derivative'); action('plot-insert'); await settle();
    check(written?.calculus==='derivative' && written.expression==='x^2', '一阶导数可直接插入，并保存原函数和计算选项');
    select('calculus','integral'); input('integralMin','0'); input('integralMax','2'); action('plot-insert'); await settle();
    check(written?.calculus==='integral' && written.integralMax===2, '定积分上下限经过序列化保存');
    select('kind','polar'); input('expression','2*sin(3*theta)'); input('thetaMax',String(4*Math.PI)); action('plot-insert'); await settle();
    check(written?.mode==='polar' && written.thetaMax===4*Math.PI && !!q<SVGElement>('svg[data-vme-plot="polar"]'), '极坐标曲线与θ范围可插入保存');
    const polarDraft=tools!.getDraft(); mount(polarDraft); await settle();
    check(tools!.getDraft().mode==='polar' && tools!.getDraft().thetaMax===String(4*Math.PI), '极坐标草稿重挂载保留θ范围');
    select('kind','surface'); input('expression','(x^2-y^2)/10'); action('plot-preview'); await settle();
    check(!!q<SVGElement>('svg[data-vme-plot="surface"]') && !q<HTMLButtonElement>('[data-action="plot-rotate-left"]').hidden, 'XYZ曲面提供专用旋转按钮');
    const azimuth=Number(tools!.getDraft().azimuth); action('plot-rotate-right'); action('plot-insert'); await settle();
    check(written?.mode==='surface' && written.azimuth!==azimuth && Number.isFinite(written.zMax), '三维旋转和Z范围经过序列化保存');
    const camera=written!.azimuth; mount(tools!.getDraft()); await settle();
    check(Number(tools!.getDraft().azimuth)===camera && !!q<SVGElement>('svg[data-vme-plot="surface"]'), '曲面草稿恢复保留相机视角和图像');
    const preview=q<HTMLElement>('[data-testid="plot-preview"]');
    check(preview.classList.contains('vme-plot-enabled'), '当前曲面的手势样式保持启用');
    const frame=q<SVGGraphicsElement>('svg [data-plot-frame]').getBoundingClientRect();
    preview.dispatchEvent(new WheelEvent('wheel',{clientX:frame.left+frame.width/2,clientY:frame.top+frame.height/2,deltaY:-60,bubbles:true,cancelable:true}));
    action('plot-reset-view'); await settle(80);
    check(tools!.getDraft().azimuth==='45' && tools!.getDraft().zMin==='-2' && tools!.getDraft().xMin==='-5', '重置完整XYZ视图并丢弃排队中的缩放');
    // A held gesture must survive replacement of the preview SVG on every frame.
    const pointer = (type: string, id: number, x: number, y: number) => preview.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y,bubbles:true,cancelable:true}));
    const capture = preview.setPointerCapture, release = preview.releasePointerCapture, hasCapture=preview.hasPointerCapture;
    const captures=new Set<number>();
    preview.setPointerCapture=(id)=>{captures.add(id);}; preview.releasePointerCapture=(id)=>{captures.delete(id);}; preview.hasPointerCapture=(id)=>captures.has(id);
    const rect=q<SVGGraphicsElement>('svg [data-plot-frame]').getBoundingClientRect(), px=rect.left+rect.width*.4, py=rect.top+rect.height*.5;
    try {
      pointer('pointerdown',101,px,py); pointer('pointermove',101,px+20,py+5); await settle(60);
      const firstAngle=Number(tools!.getDraft().azimuth);
      pointer('pointermove',101,px+60,py+15); await settle(60);
      check(Number(tools!.getDraft().azimuth)!==firstAngle && captures.has(101), '连续旋转跨越预览刷新仍保持同一次手势');
      pointer('pointerup',101,px+60,py+15);
      pointer('pointerdown',102,px-20,py); pointer('pointerdown',103,px+20,py);
      pointer('pointermove',103,px+40,py); await settle(60);
      const firstSpan=Number(tools!.getDraft().xMax)-Number(tools!.getDraft().xMin);
      pointer('pointermove',103,px+80,py); await settle(60);
      check(Number(tools!.getDraft().xMax)-Number(tools!.getDraft().xMin)<firstSpan && captures.has(102) && captures.has(103), '连续双指缩放跨越多次曲面刷新仍更新视野');
      pointer('pointerup',102,px-20,py); pointer('pointerup',103,px+80,py);
      action('plot-reset-view'); await settle();
    } finally { preview.setPointerCapture=capture; preview.releasePointerCapture=release; preview.hasPointerCapture=hasCapture; }
    locale!.setLanguage('es'); await settle();
    check(q<HTMLSelectElement>('[data-testid="plot-kind"]').textContent!.includes('polar') && !/[\p{Script=Han}]/u.test(fixture.textContent!), '西班牙语绘图界面没有固定中文残留');
    select('kind','function'); await settle();
    check(tools!.getDraft().expression==='x^2' && tools!.getDraft().calculus==='integral' && tools!.getDraft().integralMax==='2', '跨极坐标和三维切换后仍保留函数及积分草稿');
    action('plot-preview'); check(q<HTMLElement>('[data-testid="plot-preview"]').classList.contains('vme-plot-enabled'), '切回二维后仍启用图内触摸和平移样式');
    select('calculus','none'); input('expression','x+'); const field=q<HTMLInputElement>('[data-testid="plot-expression"]');
    field.setSelectionRange(0,1); action('plot-symbol-sin'); await settle();
    check(field.value==='sin(x)+' && document.activeElement===field, '常用符号按钮在选区包装函数并保留输入焦点');
    input('expression','1/x'); select('calculus','integral'); input('integralMin','-1'); input('integralMax','1'); written=undefined; action('plot-insert'); await settle();
    check(!written && q<HTMLElement>('[data-testid="plot-status"]').dataset.state==='error', '跨奇点积分禁止插入误导性的有限面积');
  } finally { locale?.destroy(); tools?.destroy(); fixture.remove(); }

  const editorHost=document.createElement('div'); document.body.append(editorHost);
  let editor: ReturnType<typeof mountEditor> | undefined; let saved: PlotSpec | undefined;
  try {
    editor=mountEditor(editorHost,{latex:'r=2\\sin(3\\theta)',initialMode:'hybrid',language:'en',onSave:()=>{},onCancel:()=>{},onSaveGraph:async spec=>{saved=spec;}});
    editorHost.querySelector<HTMLButtonElement>('[data-action="graph-equation"]')!.click(); await settle();
    check(editor.getDraft().plot?.mode==='polar' && !!editorHost.querySelector('svg[data-vme-plot="polar"]'), 'r(θ)公式下方直接识别为极坐标，无需重复输入');
    const source=editorHost.querySelector<HTMLTextAreaElement>('[data-testid="latex-source"]')!;
    source.value='z=x^2+y^2'; source.dispatchEvent(new Event('input',{bubbles:true})); await settle(350);
    check(editor.getDraft().plot?.mode==='surface' && !!editorHost.querySelector('svg[data-vme-plot="surface"]'), 'z(x,y)公式在同一绘图入口切换三维曲面');
    editorHost.querySelector<HTMLButtonElement>('[data-action="plot-insert"]')!.click(); await settle();
    check(saved?.mode==='surface' && saved.expression==='x^2+y^2', '三维公式与最新曲面一起通过同步校验插入');
    for (const [formula,mode] of [['y=2','function'],['r=2','polar'],['z=2','surface']] as const) {
      source.value=formula; source.dispatchEvent(new Event('input',{bubbles:true})); await settle(350);
      check(!!editorHost.querySelector(`svg[data-vme-plot="${mode}"]`), `同值公式${formula}切换坐标类型时重新生成正确图像`);
    }
    source.value='z=x+'; source.dispatchEvent(new Event('input',{bubbles:true})); await settle(); saved=undefined;
    editorHost.querySelector<HTMLButtonElement>('[data-action="plot-insert"]')!.click(); await settle();
    check(!saved && !editorHost.querySelector('[data-testid="plot-preview"] svg'), '未完成的三维公式清除旧曲面并禁止插入');
  } finally { editor?.destroy(); editorHost.remove(); }
}
