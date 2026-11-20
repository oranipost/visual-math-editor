import { DEFAULT_PLOT_SPEC, type PlotSpec } from './plot-engine';
import { createGraph } from './graph-render';
import { graphFromLatex, latexFromPlotExpression, tryLatexFromPlotExpression } from './plot-latex';
import { DEFAULT_SURFACE_SPEC, zoomSurfaceBounds, rotateSurfaceCamera } from './surface-plot';
import {
  COMPOSITE_COLORS,
  COMPOSITE_STYLES,
  computeCompositeStackOffsetZ,
  DEFAULT_GEOMETRY_SPEC,
  GEOMETRY_LIMITS,
  SHAPE_DIMENSIONS,
  zoomGeometryView,
  rotateGeometryCamera,
} from './geometry-models';
import type {
  CompositeGeometryPart,
  CompositePartColor,
  CompositePartStyle,
  GeometryModel,
  GeometryShape,
  SolidGeometryShape,
} from './geometry-types';
import type { SpatialAnalysis } from './spatial-relations';
import { mountOrbitInteraction } from './orbit-interaction';
import { DEFAULT_COMPLEX_SPEC, fitComplexPoints, formatComplex, parseComplexNumbers } from './complex-plane';
import { mountPlotInteraction, validPlotBounds, zoomPlotBounds, type PlotBounds } from './plot-interaction';
import { hasIncompleteSlots } from './validation';
import { copyPlotImage } from './plot-clipboard';
import { translateUiText, type ResolvedLanguage } from './i18n';
import { controlIcon } from './ui-icons';
import { createHtml } from './dom';

export interface CompositePartDraft {
  shape: SolidGeometryShape;
  radius?: string;
  topRadius?: string;
  width?: string;
  depth?: string;
  height?: string;
  sides?: string;
  offsetX?: string;
  offsetY?: string;
  offsetZ?: string;
  rotX?: string;
  rotY?: string;
  rotZ?: string;
  style?: CompositePartStyle;
  color?: CompositePartColor;
}

export function compositePartDraftFromModel(part: CompositeGeometryPart, index = 0): CompositePartDraft {
  return {
    shape: part.shape,
    radius: part.radius !== undefined ? String(part.radius) : (part.shape === 'frustum' ? '1.4' : '1'),
    topRadius: part.topRadius !== undefined ? String(part.topRadius) : '0.8',
    width: part.width !== undefined ? String(part.width) : '2',
    depth: part.depth !== undefined ? String(part.depth) : '2',
    height: part.height !== undefined ? String(part.height) : '2',
    sides: part.sides !== undefined ? String(part.sides) : (part.shape === 'frustum' ? '' : '4'),
    offsetX: String(part.offset?.x ?? 0),
    offsetY: String(part.offset?.y ?? 0),
    offsetZ: String(part.offset?.z ?? 0),
    rotX: String(part.rotation?.x ?? 0),
    rotY: String(part.rotation?.y ?? 0),
    rotZ: String(part.rotation?.z ?? 0),
    style: part.style ?? 'solid',
    color: part.color ?? COMPOSITE_COLORS[index % COMPOSITE_COLORS.length],
  };
}

export const COMPOSITE_TEMPLATES: ReadonlyArray<{
  id: string;
  zh: string;
  en: string;
  parts: readonly CompositeGeometryPart[];
}> = [
  {
    id: 'tower',
    zh: '圆柱 + 圆锥',
    en: 'Cylinder + Cone',
    parts: [
      { shape: 'cylinder', radius: 1.4, height: 2.2, offset: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, style: 'solid', color: 'indigo' },
      { shape: 'cone', radius: 1.4, height: 1.8, offset: { x: 0, y: 0, z: 2 }, rotation: { x: 0, y: 0, z: 0 }, style: 'solid', color: 'teal' },
    ],
  },
  {
    id: 'silo',
    zh: '圆柱 + 半球',
    en: 'Cylinder + Hemisphere',
    parts: [
      { shape: 'cylinder', radius: 1.4, height: 2.2, offset: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, style: 'solid', color: 'indigo' },
      { shape: 'hemisphere', radius: 1.4, offset: { x: 0, y: 0, z: 1.8 }, rotation: { x: 0, y: 0, z: 0 }, style: 'solid', color: 'amber' },
    ],
  },
  {
    id: 'cube-in-sphere',
    zh: '球内接正方体',
    en: 'Cube in sphere',
    parts: [
      { shape: 'sphere', radius: 1.732, offset: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, style: 'translucent', color: 'indigo' },
      { shape: 'cuboid', width: 2, depth: 2, height: 2, offset: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, style: 'solid', color: 'amber' },
    ],
  },
  {
    id: 'sphere-in-cube',
    zh: '正方体内切球',
    en: 'Sphere in cube',
    parts: [
      { shape: 'cuboid', width: 2.4, depth: 2.4, height: 2.4, offset: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, style: 'translucent', color: 'slate' },
      { shape: 'sphere', radius: 1.2, offset: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, style: 'solid', color: 'teal' },
    ],
  },
  {
    id: 'sphere-in-cone',
    zh: '圆锥内切球',
    en: 'Sphere in cone',
    parts: [
      { shape: 'cone', radius: 3, height: 4, offset: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, style: 'translucent', color: 'indigo' },
      { shape: 'sphere', radius: 1.5, offset: { x: 0, y: 0, z: -0.5 }, rotation: { x: 0, y: 0, z: 0 }, style: 'solid', color: 'rose' },
    ],
  },
  {
    id: 'l-steps',
    zh: 'L 型双长方体台阶',
    en: 'L-shaped steps',
    parts: [
      { shape: 'cuboid', width: 3.2, depth: 2, height: 1, offset: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, style: 'solid', color: 'slate' },
      { shape: 'cuboid', width: 1.4, depth: 2, height: 1.4, offset: { x: -0.9, y: 0, z: 1.2 }, rotation: { x: 0, y: 0, z: 0 }, style: 'solid', color: 'amber' },
    ],
  },
];

/** Temporary form values only; no formula library or persistent history. */
export interface GeometryViewDraft {
  shape: GeometryShape;
  radius?: string; topRadius?: string; width?: string; depth?: string; height?: string; sides?: string; angle?: string; offset?: string;
  faces?: boolean;
  parts?: CompositePartDraft[];
}
export interface PlotViewDraft {
  expression: string;
  xMin: string;
  xMax: string;
  yMin: string;
  yMax: string;
  thetaMin?: string; thetaMax?: string; integralMin?: string; integralMax?: string;
  zMin?: string; zMax?: string; azimuth?: string; elevation?: string;
  calculus?: PlotSpec['calculus'];
  geometry?: GeometryViewDraft;
  geometryZoom?: string;
  previewed?: boolean;
  rangeOpen?: boolean;
  rawOpen?: boolean;
  home?: PlotBounds & Partial<PlotSpec>;
}
export interface PlotDraft extends PlotViewDraft {
  mode?: PlotSpec['mode'];
  functionDraft?: PlotViewDraft;
  complexDraft?: PlotViewDraft;
  polarDraft?: PlotViewDraft;
  surfaceDraft?: PlotViewDraft;
  geometryDraft?: PlotViewDraft;
  /** The graph lives below, and derives its expression from, the equation editor. */
  equationLinked?: boolean;
  /** Optional standalone setting: insert the 2D equation above the graph block. */
  alsoInsertEquation?: boolean;
}

const GEOMETRY_SHAPE_ZH: Readonly<Record<GeometryShape, string>> = {
  sphere: '球体',
  hemisphere: '半球体',
  cylinder: '圆柱体',
  cone: '圆锥体',
  frustum: '圆台 / 正棱台',
  pyramid: '正棱锥',
  prism: '正棱柱',
  cuboid: '长方体',
  plane: '平面片',
  composite: '组合几何体（多图形拼接）',
  planes: '两个平面',
  'line-plane': '直线与平面',
  'sphere-plane': '球体与平面',
};

const ALL_SEARCH_LANGUAGES: readonly ResolvedLanguage[] = ['zh', 'en', 'es', 'ja', 'de', 'fr'];

export function graphDraftFromSpec(spec: PlotSpec): PlotDraft {
  const draft: PlotDraft = {
    mode: spec.mode ?? 'function',
    expression: spec.expression,
    xMin: String(spec.xMin),
    xMax: String(spec.xMax),
    yMin: String(spec.yMin),
    yMax: String(spec.yMax),
    calculus: spec.calculus,
    previewed: true,
  };
  for (const key of ['thetaMin', 'thetaMax', 'integralMin', 'integralMax', 'zMin', 'zMax', 'azimuth', 'elevation', 'geometryZoom'] as const) {
    if (spec[key] !== undefined) draft[key] = String(spec[key]);
  }
  if (spec.geometry) {
    draft.geometry = { shape: spec.geometry.shape, faces: spec.geometry.faces };
    for (const key of ['radius', 'topRadius', 'width', 'depth', 'height', 'sides', 'angle', 'offset'] as const) {
      if (spec.geometry[key] !== undefined) draft.geometry[key] = String(spec.geometry[key]);
    }
    if (spec.geometry.parts?.length) {
      draft.geometry.parts = spec.geometry.parts.map((part, idx) => compositePartDraftFromModel(part, idx));
    }
  }
  return draft;
}

export function formatPickerGraphRow(spec: PlotSpec, index: number): string {
  if (spec.mode === 'geometry') {
    const model = spec.geometry;
    if (model?.shape === 'composite') {
      return `几何模型 ${index + 1} · 组合几何体（${model.parts?.length ?? 0} 个部件）`;
    }
    const shapeZh = model ? GEOMETRY_SHAPE_ZH[model.shape] : '球体';
    return `几何模型 ${index + 1} · ${shapeZh}`;
  }
  if (spec.mode === 'complex') {
    return `复平面 ${index + 1} · ${spec.expression.replace(/\n/g, '; ')}`;
  }
  const lhs = spec.mode === 'surface' ? 'z' : spec.mode === 'polar' ? 'r' : 'y';
  return `图像 ${index + 1} · ${lhs} = ${spec.expression}`;
}

export function matchesPickerGraphSearch(spec: PlotSpec, index: number, rawQuery: string): boolean {
  const stripAccents = (value: string): string => value.normalize('NFD').replace(/\p{M}/gu, '');
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  const normalizedQuery = stripAccents(query);
  if (String(index + 1).includes(query) || spec.expression.toLowerCase().includes(query)) return true;

  const baseRow = formatPickerGraphRow(spec, index);
  const tokens: string[] = [];
  for (const lang of ALL_SEARCH_LANGUAGES) {
    tokens.push(translateUiText(baseRow, lang));
  }
  if (spec.mode === 'geometry' && spec.geometry) {
    tokens.push(spec.geometry.shape);
    if (spec.geometry.shape === 'composite' && spec.geometry.parts) {
      for (const part of spec.geometry.parts) {
        tokens.push(part.shape);
        const partZh = GEOMETRY_SHAPE_ZH[part.shape];
        for (const lang of ALL_SEARCH_LANGUAGES) {
          tokens.push(translateUiText(partZh, lang));
        }
      }
    }
  }
  const haystack = tokens.join(' ').toLowerCase();
  return haystack.includes(query) || stripAccents(haystack).includes(normalizedQuery);
}

interface PlotOptions {
  editing?: boolean;
  initialExpression?: string;
  initialDraft?: PlotDraft;
  alsoInsertEquation?: boolean;
  onAlsoInsertEquationChange?: (enabled: boolean) => void | Promise<void>;
  onInsertGraph?: (spec: PlotSpec, svg: string, equationLatex?: string) => Promise<void>;
  getCurrentExpression?: () => string;
  getCurrentGraph?: () => Pick<PlotSpec, 'mode' | 'expression'>;
}

type PlotMode = NonNullable<PlotSpec['mode']>;
const GEOMETRY_VALUES = { radius: '1', topRadius: '0.8', width: '2', depth: '2', height: '2', sides: '4', angle: '45', offset: '0' } as const;
type GeometryInputKey = keyof typeof GEOMETRY_VALUES;
const EXTRA_KEYS = ['thetaMin', 'thetaMax', 'integralMin', 'integralMax', 'zMin', 'zMax', 'azimuth', 'elevation'] as const;
type ExtraKey = typeof EXTRA_KEYS[number];
const EXTRA_DEFAULTS: Record<ExtraKey, number> = { thetaMin: 0, thetaMax: 2 * Math.PI, integralMin: 0, integralMax: 1, zMin: -2, zMax: 2, azimuth: 45, elevation: 30 };
/** createGraph supplies analysis only for these validated teaching scenes. */
function hasSpatialAnalysis(result: { spec: PlotSpec }): result is { spec: PlotSpec; analysis: SpatialAnalysis } {
  return result.spec.mode === 'geometry' && ['planes', 'line-plane', 'sphere-plane'].includes(result.spec.geometry?.shape ?? '') && 'analysis' in result;
}
function modeDefaults(mode: PlotMode): PlotSpec {
  return mode === 'geometry' ? DEFAULT_GEOMETRY_SPEC : mode === 'complex' ? DEFAULT_COMPLEX_SPEC : mode === 'surface' ? DEFAULT_SURFACE_SPEC
    : mode === 'polar' ? { mode, expression: '2*sin(3*theta)', xMin: -3, xMax: 3, yMin: -3, yMax: 3, thetaMin: 0, thetaMax: 2*Math.PI } : DEFAULT_PLOT_SPEC;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = ''): HTMLElementTagNameMap[K] {
  const node = createHtml(tag);
  if (className) node.className = className;
  return node;
}
function text(node: HTMLElement, chinese: string, english: string): void {
  node.textContent = chinese;
  node.dataset.i18nEn = english;
}
function button(action: string, chinese: string, english: string, callback: () => void): HTMLButtonElement {
  const node = el('button', 'vme-science-button');
  node.type = 'button';
  node.dataset.action = action;
  const caption = el('span');
  text(caption, chinese, english);
  node.append(caption);
  node.addEventListener('click', () => callback());
  return node;
}

const PLOT_ERROR_ZH: Readonly<Record<string, string>> = {
  'Use a supported spatial-relation scene and its applicable settings.': '请选择受支持的空间关系及对应参数。',
  'Use a finite signed offset between -4 and 4.': '偏移须为 −4 至 4 之间的有效数值。',
  'Use a finite sphere radius between 0.1 and 4.': '此场景的球体半径须为 0.1 至 4 之间的有效数值。',
  'Use a finite angle between 0 and 90 degrees.': '夹角须为 0 至 90 度之间的有效数值。',
  'The spatial-relation scene could not be generated.': '暂时无法生成空间关系场景，请检查参数后重试。',
  'Choose a supported geometric solid or plane.': '请选择受支持的几何体或平面。',
  'Use only supported geometry settings and dimensions.': '请使用受支持的几何设置和尺寸。',
  'Lengths must be finite numbers between 0.001 and 1000.': '尺寸须为 0.001 至 1000 之间的有效数值。',
  'Use 3 to 12 whole sides for a regular pyramid or prism.': '正棱锥或正棱柱的底面边数须为 3 至 12 的整数。',
  'Use 3 to 12 whole sides for a polygonal frustum.': '棱台边数须为 3 至 12 的整数；留空可绘制圆台。',
  'Composite solids require between 2 and 6 parts.': '组合几何体须包含 2 至 6 个部件。',
  'Each composite part must use a supported primitive solid or plane.': '组合几何体的每个部件都须选择受支持的基本几何体或平面。',
  'Part offsets must be finite numbers between -500 and 500.': '部件偏移须为 −500 至 500 之间的有效数值。',
  'Part rotation angles must be finite numbers between -180 and 180 degrees.': '部件旋转角度须为 −180 至 180 度之间的有效数值。',
  'Part style must be solid, translucent, or wireframe.': '部件样式须为实心、半透明或线框。',
  'Choose a supported part color.': '请选择受支持的部件颜色。',
  'Use a finite camera angle, elevation from 10 to 80 degrees, and zoom from 0.25 to 4.': '请使用有效视角；俯仰角为 10 至 80 度，缩放为 0.25 至 4。',
  'Use an empty geometry expression and valid X/Y bounds.': '几何模型不使用函数表达式；请重新选择模型。',
  'Dimension ratios above 1000:1 are not supported.': '暂不支持超过 1000:1 的尺寸比例。',
  'Numbers must be finite.': '数字超出支持范围，请缩小数值。',
  'Unsupported notation. Use numbers, x, arithmetic, and supported functions.': '暂不支持此写法。请使用数字、x、算术运算及支持的函数。',
  'The expression is too complex. Simplify it before plotting.': '函数过于复杂，请简化后再绘图。',
  'Enter an expression such as x^2 or sin(x).': '请输入函数，例如 x^2 或 sin(x)。',
  'Unexpected input. Check operators and parentheses.': '请检查运算符及括号。',
  'The expression is nested too deeply.': '括号或函数嵌套过深，请简化后再绘图。',
  'The expression is incomplete.': '函数尚未填写完整。',
  'A closing parenthesis is missing.': '缺少右括号，请补全后再绘图。',
  'Unknown name. Use x, pi, e, sin, cos, tan, sqrt, abs, ln, log, or exp.': '未知名称。支持 x、pi、e、sin、cos、tan、sqrt、abs、ln、log 和 exp。',
  'Function arguments need parentheses, for example sin(x).': '函数的参数需要括号，例如 sin(x)。',
  'The expression is too long (maximum 500 characters).': '函数内容过长，请缩短到 500 个字符以内。',
  'The expression could not be parsed.': '暂时无法识别函数，请检查写法。',
  'Graph settings are missing.': '缺少图像设置，请重新打开编辑器。',
  'Axis bounds must be finite numbers between -1000000 and 1000000.': '坐标边界须为 −1000000 至 1000000 之间的有效数值。',
  'Each axis minimum must be smaller than its maximum.': '每个坐标轴的最小值须小于最大值。',
  'Each axis range must span at least 0.000000001.': '每个坐标轴的范围须至少为 0.000000001。',
  'Axis ranges are too narrow for their magnitude.': '坐标范围相对边界数值过窄，请扩大范围。',
  'The graph is too complex to sample. Simplify the expression or narrow the range.': '图线过于复杂，请简化函数或缩小绘图范围。',
  'No finite curve is visible in this range. Check the formula or adjust the axes.': '此范围内没有可显示的图线，请检查函数或调整坐标范围。',
  'The graph could not be generated.': '暂时无法生成图像，请检查函数后重试。',
  'Enter a complex number such as 3+2i, one per line.': '请输入复数，例如 3+2i，每行一个。',
  'Complex-number input is too long (maximum 1000 characters).': '复数内容过长，请缩短到 1000 个字符以内。',
  'Use at most 20 complex numbers, one per line.': '最多支持 20 个复数，每行一个。',
  'Complex-plane settings are missing.': '缺少复平面设置，请重新打开编辑器。',
  'Unsupported polar graph settings.': '极坐标设置无效，请重新打开编辑器。',
  'Calculus overlays are available for function graphs only.': '微积分视图仅适用于单变量函数图像。',
  'Theta bounds must increase, be finite, and span no more than 100π radians.': 'θ 起点须小于终点，均为有效数值，且范围不超过 100π 弧度。',
  'The polar graph is too complex to sample. Simplify it or narrow the theta range.': '极坐标图线过于复杂，请简化公式或缩小 θ 范围。',
  'No finite polar curve is visible in this range. Check the formula or adjust the axes.': '此范围内没有可显示的极坐标图线，请检查公式或调整坐标范围。',
  'The polar graph could not be generated.': '暂时无法生成极坐标图，请检查公式后重试。',
  'Unsupported calculus graph mode.': '微积分视图设置无效，请重新选择。',
  'Integral bounds must be finite increasing numbers within the supported range.': '积分上下限须为支持范围内的有效数值，且下限小于上限。',
  'The integral did not converge within the work limit. Narrow the interval or simplify the formula.': '积分在计算限制内未能收敛，请缩小区间或简化公式。',
  'The integral crosses an undefined or improper domain. Use a finite continuous interval.': '积分区间包含无定义或反常区域，请使用有限且连续的区间。',
  'The integral is outside the finite numerical range.': '积分结果超出有限数值范围。',
  'The calculus graph could not be generated.': '暂时无法生成微积分图像，请检查公式后重试。',
  'Use valid X, Y and Z ranges; the 3D elevation must be between 10 and 80 degrees.': '请填写有效的 X、Y、Z 范围；三维俯仰角须为 10 至 80 度。',
  'The surface is too complex. Simplify the equation or narrow its ranges.': '曲面过于复杂，请简化公式或缩小坐标范围。',
  'The surface is too complex. Simplify the equation before plotting it.': '曲面过于复杂，请简化公式后再绘图。',
  'No finite surface is visible. Check the equation or adjust the X, Y and Z ranges.': '此范围内没有可显示的曲面，请检查公式或调整 X、Y、Z 范围。',
  'The surface could not be generated.': '暂时无法生成曲面，请检查公式后重试。',
};
function plotErrorZh(error: string): string {
  if (error.startsWith('Unknown name. Use ')) return '未知名称。请使用当前图像的变量（x、theta，或 x 和 y）、pi、e 及支持的函数。';
  const line = /^Line (\d+): (.*)$/.exec(error);
  if (line) return line[2].startsWith('enter a literal')
    ? `第 ${line[1]} 行：请输入 3+2i、−i 或 4 这样的数值；暂不支持表达式或名称。`
    : `第 ${line[1]} 行：实部和虚部须为 −1000000 至 1000000 之间的有效数值。`;
  return PLOT_ERROR_ZH[error] ?? '暂时无法绘图，请检查输入及坐标范围。';
}

/** A graph is saved separately in the note; previewing never changes the equation draft. */
export function mountPlotTools(host: HTMLElement, options: PlotOptions = {}): {
  getDraft: () => PlotDraft;
  setDisabled: (disabled: boolean) => void;
  setEquationLinked: (linked: boolean) => void;
  refreshCurrentEquation: () => void;
  destroy: () => void;
} {
  const root = el('div', 'vme-plot-tools');
  root.dataset.testid = 'plot-tools';
  const body = el('div', 'vme-plot-body');
  root.append(body);
  host.append(root);
  const unique = `vme-plot-${Math.random().toString(36).slice(2)}`;
  let destroyed = false;
  let externalDisabled = false;
  let inserting = false;
  let previewTimer: number | undefined;
  let pendingInput = true;
  let lastPlot: { spec: PlotSpec; svg: string } | undefined;
  const draft = options.initialDraft;
  let equationLinked = Boolean(draft?.equationLinked && (options.getCurrentExpression || options.getCurrentGraph));
  let linkedExpression: string | undefined;
  let mode: PlotMode = draft?.mode ?? 'function';
  const caches: Partial<Record<PlotMode, PlotViewDraft>> = { function: draft?.functionDraft, complex: draft?.complexDraft, polar: draft?.polarDraft, surface: draft?.surfaceDraft, geometry: draft?.geometryDraft };
  const initial = draft ?? { ...DEFAULT_PLOT_SPEC, xMin: '-10', xMax: '10', yMin: '-10', yMax: '10' };
  let home: PlotBounds & Partial<PlotSpec> = draft?.home ?? { ...modeDefaults(mode), ...Object.fromEntries(EXTRA_KEYS.map(key => [key, draft?.[key] !== undefined ? Number(draft[key]) : EXTRA_DEFAULTS[key]])), ...(mode === 'geometry' ? { geometryZoom: Number(draft?.geometryZoom ?? 1) } : {}), xMin: Number(initial.xMin), xMax: Number(initial.xMax), yMin: Number(initial.yMin), yMax: Number(initial.yMax) };
  if (!validPlotBounds(home)) home = mode === 'complex' ? { ...DEFAULT_COMPLEX_SPEC } : { ...DEFAULT_PLOT_SPEC };
  let interaction: ReturnType<typeof mountPlotInteraction> | undefined;
  let surfaceInteraction: ReturnType<typeof mountOrbitInteraction> | undefined;

  const kindLabel = el('label', 'vme-plot-kind-label');
  const kindCaption = el('span');
  text(kindCaption, '图像类型', 'Graph type');
  const kind = el('select', 'vme-conversion-select');
  kind.dataset.testid = 'plot-kind';
  for (const [value, zh, en] of [['function', '函数图像', 'Function graph'], ['complex', '复平面', 'Complex plane'], ['polar', '极坐标', 'Polar graph'], ['surface', '三维曲面', '3D surface'], ['geometry', '几何模型', 'Geometry models']]) {
    const option = el('option'); option.value = value; text(option, zh, en); kind.append(option);
  }
  kind.value = mode;
  kindLabel.append(kindCaption, kind);

  const PRIMITIVE_SHAPE_OPTIONS: ReadonlyArray< readonly [SolidGeometryShape, string, string] > = [
    ['sphere', '球体', 'Sphere'],
    ['hemisphere', '半球体', 'Hemisphere'],
    ['cylinder', '圆柱体', 'Cylinder'],
    ['cone', '圆锥体', 'Cone'],
    ['frustum', '圆台 / 正棱台', 'Frustum'],
    ['pyramid', '正棱锥', 'Regular pyramid'],
    ['prism', '正棱柱', 'Regular prism'],
    ['cuboid', '长方体', 'Cuboid'],
    ['plane', '平面片', 'Plane'],
  ];
  const STYLE_OPTIONS: ReadonlyArray< readonly [CompositePartStyle, string, string] > = [
    ['solid', '实心', 'Solid'],
    ['translucent', '半透明', 'Translucent'],
    ['wireframe', '线框', 'Wireframe'],
  ];
  const COLOR_OPTIONS: ReadonlyArray< readonly [CompositePartColor, string, string] > = [
    ['indigo', '靛蓝', 'Indigo'],
    ['teal', '青绿', 'Teal'],
    ['amber', '琥珀', 'Amber'],
    ['rose', '玫红', 'Rose'],
    ['slate', '岩灰', 'Slate'],
  ];

  const geometryControls = el('div', 'vme-geometry-controls');
  geometryControls.dataset.testid = 'geometry-controls';
  const shapeLabel = el('label', 'vme-plot-kind-label');
  const shapeCaption = el('span'); text(shapeCaption, '形状', 'Shape');
  const shape = el('select', 'vme-conversion-select'); shape.dataset.testid = 'geometry-shape';
  for (const [value, zh, en] of [
    ...PRIMITIVE_SHAPE_OPTIONS,
    ['composite', '组合几何体（多图形拼接）', 'Composite solid (multi-shape)'],
    ['planes', '两个平面', 'Two planes'],
    ['line-plane', '直线与平面', 'Line and plane'],
    ['sphere-plane', '球体与平面', 'Sphere and plane'],
  ] as const) {
    const option = el('option'); option.value = value; text(option, zh, en); shape.append(option);
  }
  const initialGeometry = (mode === 'geometry' ? draft?.geometry : draft?.geometryDraft?.geometry);
  shape.value = initialGeometry?.shape ?? 'sphere';
  shapeLabel.append(shapeCaption, shape);
  const geometryGrid = el('div', 'vme-plot-range-grid vme-geometry-dimensions');
  const geometryInputs = {} as Record<GeometryInputKey, HTMLInputElement>;
  const geometryWrappers = {} as Record<keyof typeof geometryInputs, HTMLLabelElement>;
  const geometryCaptions = {} as Record<keyof typeof geometryInputs, HTMLElement>;
  for (const [key, zh, en, fallback] of [
    ['radius', '半径', 'Radius', initialGeometry?.shape === 'frustum' ? '1.4' : '1'],
    ['topRadius', '上底半径', 'Top radius', '0.8'],
    ['width', '宽度', 'Width', '2'],
    ['depth', '深度', 'Depth', '2'],
    ['height', '高度', 'Height', '2'],
    ['sides', '底面边数', 'Base sides', initialGeometry?.shape === 'frustum' ? '' : '4'],
    ['angle', '夹角（度）', 'Angle (degrees)', '45'],
    ['offset', '有符号偏移', 'Signed offset', '0'],
  ] as const) {
    const control = el('label', 'vme-plot-range-control');
    const caption = el('span'); text(caption, zh, en);
    const input = el('input', 'vme-plot-range-input'); input.type = 'text';
    input.inputMode = key === 'sides' ? 'numeric' : 'decimal'; input.spellcheck = false; input.autocomplete = 'off';
    input.dataset.testid = `geometry-${key}`; input.value = initialGeometry?.[key] ?? fallback;
    geometryInputs[key] = input; geometryWrappers[key] = control; geometryCaptions[key] = caption;
    control.append(caption, input); geometryGrid.append(control);
  }

  let compositeParts: CompositePartDraft[] = initialGeometry?.parts?.length
    ? initialGeometry.parts.map(part => ({ ...part }))
    : COMPOSITE_TEMPLATES[0].parts.map((part, idx) => compositePartDraftFromModel(part, idx));

  const compositeControls = el('div', 'vme-composite-controls');
  compositeControls.dataset.testid = 'geometry-composite-controls';
  const compositePresetLabel = el('p', 'vme-composite-presets-label');
  text(compositePresetLabel, '组合题型模板', 'Problem templates');
  const compositePresets = el('div', 'vme-composite-presets');
  for (const tpl of COMPOSITE_TEMPLATES) {
    const btn = button(`composite-preset-${tpl.id}`, tpl.zh, tpl.en, () => {
      if (externalDisabled || inserting) return;
      compositeParts = tpl.parts.map((part, idx) => compositePartDraftFromModel(part, idx));
      renderCompositePartCards();
      invalidate();
      previewGraph();
    });
    btn.dataset.testid = `composite-preset-${tpl.id}`;
    btn.classList.add('vme-subpanel-secondary');
    compositePresets.append(btn);
  }
  const compositeHeader = el('div', 'vme-composite-parts-header');
  const compositeHeaderTitle = el('span');
  text(compositeHeaderTitle, '部件列表（2–6 个）', 'Parts (2–6)');
  const addPartButton = button('composite-add-part', '+ 添加部件', '+ Add part', () => {
    if (externalDisabled || inserting || compositeParts.length >= GEOMETRY_LIMITS.maximumParts) return;
    const nextIndex = compositeParts.length;
    const newDraft: CompositePartDraft = {
      shape: 'sphere',
      radius: '0.8',
      topRadius: '0.5',
      width: '1.6',
      depth: '1.6',
      height: '1.6',
      sides: '4',
      offsetX: '0',
      offsetY: '0',
      offsetZ: '0',
      rotX: '0',
      rotY: '0',
      rotZ: '0',
      style: 'solid',
      color: COMPOSITE_COLORS[nextIndex % COMPOSITE_COLORS.length],
    };
    const prevDraft = compositeParts[nextIndex - 1];
    if (prevDraft) {
      const prevModel = compositePartModelFromDraft(prevDraft, nextIndex - 1);
      const nextModel = compositePartModelFromDraft(newDraft, nextIndex);
      const stackedZ = computeCompositeStackOffsetZ(prevModel, nextModel);
      if (Number.isFinite(stackedZ)) {
        newDraft.offsetX = prevDraft.offsetX ?? '0';
        newDraft.offsetY = prevDraft.offsetY ?? '0';
        newDraft.offsetZ = String(stackedZ);
      }
    }
    compositeParts.push(newDraft);
    renderCompositePartCards();
    invalidate();
    previewGraph();
  });
  addPartButton.dataset.testid = 'composite-add-part';
  addPartButton.classList.add('vme-subpanel-secondary');
  compositeHeader.append(compositeHeaderTitle, addPartButton);
  const compositePartList = el('div', 'vme-composite-part-list');
  compositePartList.dataset.testid = 'composite-part-list';
  compositeControls.append(compositePresetLabel, compositePresets, compositeHeader, compositePartList);

  function parseDecimalString(raw: string | undefined): number {
    const trimmed = (raw ?? '').trim();
    return /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed) ? Number(trimmed) : NaN;
  }

  function compositePartModelFromDraft(draftPart: CompositePartDraft, index: number): CompositeGeometryPart {
    const shapeKey: SolidGeometryShape = Object.hasOwn(SHAPE_DIMENSIONS, draftPart.shape) ? draftPart.shape : 'sphere';
    const styleVal: CompositePartStyle = draftPart.style && COMPOSITE_STYLES.includes(draftPart.style) ? draftPart.style : 'solid';
    const colorVal: CompositePartColor = draftPart.color && COMPOSITE_COLORS.includes(draftPart.color) ? draftPart.color : COMPOSITE_COLORS[index % COMPOSITE_COLORS.length];
    const partModel: CompositeGeometryPart = {
      shape: shapeKey,
      style: styleVal,
      color: colorVal,
      offset: {
        x: parseDecimalString(draftPart.offsetX ?? '0'),
        y: parseDecimalString(draftPart.offsetY ?? '0'),
        z: parseDecimalString(draftPart.offsetZ ?? '0'),
      },
      rotation: {
        x: parseDecimalString(draftPart.rotX ?? '0'),
        y: parseDecimalString(draftPart.rotY ?? '0'),
        z: parseDecimalString(draftPart.rotZ ?? '0'),
      },
    };
    for (const dimKey of SHAPE_DIMENSIONS[shapeKey]) {
      if (dimKey === 'sides' && shapeKey === 'frustum' && (draftPart.sides ?? '').trim() === '') {
        continue;
      }
      partModel[dimKey] = parseDecimalString(draftPart[dimKey]);
    }
    return partModel;
  }

  function renderCompositePartCards(): void {
    compositePartList.replaceChildren();
    compositeParts.forEach((part, index) => {
      const card = el('div', 'vme-composite-part-card');
      card.dataset.testid = `composite-part-${index}`;
      card.dataset.partColor = part.color ?? COMPOSITE_COLORS[index % COMPOSITE_COLORS.length];
      const head = el('div', 'vme-composite-part-head');
      const title = el('span', 'vme-composite-part-title');
      text(title, `部件 ${index + 1}`, `Part ${index + 1}`);
      const partActions = el('div', 'vme-composite-part-actions');
      if (index > 0) {
        const stackBtn = button(`composite-stack-${index}`, '叠在上一部件上方', 'Stack on previous', () => {
          if (externalDisabled || inserting) return;
          const prevDraft = compositeParts[index - 1];
          const prevModel = compositePartModelFromDraft(prevDraft, index - 1);
          const currModel = compositePartModelFromDraft(part, index);
          const nextZ = computeCompositeStackOffsetZ(prevModel, currModel);
          if (Number.isFinite(nextZ)) {
            part.offsetX = prevDraft.offsetX ?? '0';
            part.offsetY = prevDraft.offsetY ?? '0';
            part.offsetZ = String(nextZ);
            renderCompositePartCards();
            invalidate();
            previewGraph();
          }
        });
        stackBtn.dataset.testid = `composite-stack-${index}`;
        stackBtn.classList.add('vme-subpanel-secondary');
        partActions.append(stackBtn);
      }
      const centerBtn = button(`composite-center-${index}`, '居中对齐 (0,0,0)', 'Center (0,0,0)', () => {
        if (externalDisabled || inserting) return;
        part.offsetX = '0';
        part.offsetY = '0';
        part.offsetZ = '0';
        renderCompositePartCards();
        invalidate();
        previewGraph();
      });
      centerBtn.dataset.testid = `composite-center-${index}`;
      centerBtn.classList.add('vme-subpanel-secondary');
      partActions.append(centerBtn);

      const removeBtn = button(`composite-remove-${index}`, '删除', 'Remove', () => {
        if (externalDisabled || inserting || compositeParts.length <= GEOMETRY_LIMITS.minimumParts) return;
        compositeParts.splice(index, 1);
        renderCompositePartCards();
        invalidate();
        previewGraph();
      });
      removeBtn.dataset.testid = `composite-remove-${index}`;
      removeBtn.classList.add('vme-subpanel-secondary');
      partActions.append(removeBtn);
      head.append(title, partActions);

      const selectsRow = el('div', 'vme-composite-part-selects');
      const makeSelect = <T extends string>(
        zhLabel: string,
        enLabel: string,
        testIdSuffix: string,
        opts: ReadonlyArray< readonly [T, string, string] >,
        currentVal: T,
        onChange: (val: T) => void,
      ): HTMLSelectElement => {
        const wrap = el('label');
        const cap = el('span');
        text(cap, zhLabel, enLabel);
        const sel = el('select', 'vme-conversion-select');
        sel.dataset.testid = `composite-part-${index}-${testIdSuffix}`;
        for (const [val, zh, en] of opts) {
          const opt = el('option');
          opt.value = val;
          text(opt, zh, en);
          sel.append(opt);
        }
        sel.value = currentVal;
        sel.addEventListener('change', () => {
          onChange(sel.value as T);
        });
        wrap.append(cap, sel);
        selectsRow.append(wrap);
        return sel;
      };

      const grid = el('div', 'vme-composite-part-grid');
      const dimWrappers = {} as Record<'radius' | 'topRadius' | 'width' | 'depth' | 'height' | 'sides', HTMLLabelElement>;
      const dimCaptions = {} as Record<'radius' | 'topRadius' | 'width' | 'depth' | 'height' | 'sides', HTMLElement>;
      const dimInputs = {} as Record<'radius' | 'topRadius' | 'width' | 'depth' | 'height' | 'sides', HTMLInputElement>;

      const updateCardDimensions = (): void => {
        const activeDims = SHAPE_DIMENSIONS[part.shape];
        for (const dimKey of ['radius', 'topRadius', 'width', 'depth', 'height', 'sides'] as const) {
          dimWrappers[dimKey].hidden = !activeDims.includes(dimKey);
        }
        text(
          dimCaptions.radius,
          part.shape === 'frustum' ? '下底半径' : (part.shape === 'pyramid' || part.shape === 'prism') ? '底面外接圆半径' : '半径',
          part.shape === 'frustum' ? 'Bottom radius' : (part.shape === 'pyramid' || part.shape === 'prism') ? 'Base circumradius' : 'Radius',
        );
        text(
          dimCaptions.sides,
          part.shape === 'frustum' ? '棱数（留空为圆台）' : '底面边数',
          part.shape === 'frustum' ? 'Sides (blank = circular)' : 'Base sides',
        );
        dimInputs.sides.placeholder = part.shape === 'frustum' ? '圆台' : '';
      };

      makeSelect('形状', 'Shape', 'shape', PRIMITIVE_SHAPE_OPTIONS, part.shape, (nextShape) => {
        const prevPartShape = part.shape;
        part.shape = nextShape;
        if (nextShape === 'frustum' && prevPartShape !== 'frustum') {
          if (part.radius === undefined || part.radius === '1') part.radius = '1.4';
          if (part.topRadius === undefined) part.topRadius = '0.8';
          if (part.sides === '4') part.sides = '';
          dimInputs.radius.value = part.radius;
          dimInputs.topRadius.value = part.topRadius;
          dimInputs.sides.value = part.sides ?? '';
        } else if (prevPartShape === 'frustum' && nextShape !== 'frustum' && (part.sides ?? '') === '') {
          part.sides = '4';
          dimInputs.sides.value = '4';
        }
        if (part.width === undefined) { part.width = '2'; dimInputs.width.value = '2'; }
        if (part.depth === undefined) { part.depth = '2'; dimInputs.depth.value = '2'; }
        if (part.height === undefined) { part.height = '2'; dimInputs.height.value = '2'; }
        if (part.radius === undefined) { part.radius = '1'; dimInputs.radius.value = '1'; }
        updateCardDimensions();
        invalidate();
        previewGraph();
      });
      makeSelect('样式', 'Style', 'style', STYLE_OPTIONS, part.style ?? 'solid', (nextStyle) => {
        part.style = nextStyle;
        invalidate();
        previewGraph();
      });
      makeSelect('颜色', 'Color', 'color', COLOR_OPTIONS, part.color ?? COMPOSITE_COLORS[index % COMPOSITE_COLORS.length], (nextColor) => {
        part.color = nextColor;
        card.dataset.partColor = nextColor;
        invalidate();
        previewGraph();
      });

      const makeField = (
        fieldKey: Exclude<keyof CompositePartDraft, 'shape' | 'style' | 'color'>,
        zhLabel: string,
        enLabel: string,
        fallback: string,
      ): { wrap: HTMLLabelElement; cap: HTMLElement; inp: HTMLInputElement } => {
        const wrap = el('label');
        const cap = el('span');
        text(cap, zhLabel, enLabel);
        const inp = el('input', 'vme-plot-range-input');
        inp.type = 'text';
        inp.inputMode = fieldKey === 'sides' ? 'numeric' : 'decimal';
        inp.spellcheck = false;
        inp.autocomplete = 'off';
        inp.dataset.testid = `composite-part-${index}-${fieldKey}`;
        const initialVal = part[fieldKey] !== undefined ? String(part[fieldKey]) : fallback;
        part[fieldKey] = initialVal;
        inp.value = initialVal;
        inp.addEventListener('input', () => {
          part[fieldKey] = inp.value;
          invalidate();
          schedulePreview();
        });
        inp.addEventListener('keydown', (event) => {
          if ((event as KeyboardEvent).metaKey || (event as KeyboardEvent).ctrlKey) return;
          if ((event as KeyboardEvent).key !== 'Enter') return;
          event.preventDefault();
          event.stopPropagation();
          previewGraph();
        });
        wrap.append(cap, inp);
        grid.append(wrap);
        return { wrap, cap, inp };
      };

      for (const [dimKey, zh, en, fallback] of [
        ['radius', '半径', 'Radius', part.shape === 'frustum' ? '1.4' : '1'],
        ['topRadius', '上底半径', 'Top radius', '0.8'],
        ['width', '宽度', 'Width', '2'],
        ['depth', '深度', 'Depth', '2'],
        ['height', '高度', 'Height', '2'],
        ['sides', '底面边数', 'Base sides', part.shape === 'frustum' ? '' : '4'],
      ] as const) {
        const created = makeField(dimKey, zh, en, fallback);
        dimWrappers[dimKey] = created.wrap;
        dimCaptions[dimKey] = created.cap;
        dimInputs[dimKey] = created.inp;
      }

      makeField('offsetX', '偏移 X', 'Offset X', '0');
      makeField('offsetY', '偏移 Y', 'Offset Y', '0');
      makeField('offsetZ', '偏移 Z', 'Offset Z', '0');
      makeField('rotX', '旋转 X°', 'Rotate X°', '0');
      makeField('rotY', '旋转 Y°', 'Rotate Y°', '0');
      makeField('rotZ', '旋转 Z°', 'Rotate Z°', '0');

      updateCardDimensions();
      card.append(head, selectsRow, grid);
      compositePartList.append(card);
    });
    refreshCompositeControlsDisabled();
  }

  function refreshCompositeControlsDisabled(): void {
    const busy = externalDisabled || inserting;
    addPartButton.disabled = busy || compositeParts.length >= GEOMETRY_LIMITS.maximumParts;
    for (const btn of Array.from(compositePresets.querySelectorAll<HTMLButtonElement>('button'))) {
      btn.disabled = busy;
    }
    for (const ctrl of Array.from(compositePartList.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input, select, button'))) {
      if (ctrl.tagName === 'BUTTON' && ctrl.dataset.action?.startsWith('composite-remove-')) {
        ctrl.disabled = busy || compositeParts.length <= GEOMETRY_LIMITS.minimumParts;
      } else {
        ctrl.disabled = busy;
      }
    }
  }
  renderCompositePartCards();

  const facesLabel = el('label', 'vme-plot-kind-label');
  const facesCaption = el('span'); text(facesCaption, '显示方式', 'Appearance');
  const faces = el('select', 'vme-conversion-select'); faces.dataset.testid = 'geometry-faces';
  for (const [value, zh, en] of [['faces', '面与边', 'Faces and edges'], ['wireframe', '线框', 'Wireframe']]) {
    const option = el('option'); option.value = value; text(option, zh, en); faces.append(option);
  }
  faces.value = initialGeometry?.faces === false ? 'wireframe' : 'faces';
  facesLabel.append(facesCaption, faces);
  const geometryHint = el('p', 'vme-plot-note');
  text(geometryHint, '所有长度采用相同单位；底面半径指中心到顶点的距离。平面为有限的 XY 平面片。',
    'Use the same unit for all lengths. Base radius means center to vertex. A plane is a finite patch in XY.');
  geometryControls.append(shapeLabel, geometryGrid, compositeControls, facesLabel, geometryHint);
  let geometryZoom = draft?.geometryZoom ?? '1';
  // Only session form values are cached; this is not a stored model library.
  const geometryShapeInputs = new Map<GeometryShape, Partial<Record<GeometryInputKey, string>>>();
  let previousShape = shape.value as GeometryShape;
  shape.addEventListener('change', () => {
    geometryShapeInputs.set(previousShape, Object.fromEntries(Object.entries(geometryInputs).map(([key, input]) => [key, input.value])));
    const selected = shape.value as GeometryShape, cached = geometryShapeInputs.get(selected);
    if (cached) for (const key of Object.keys(geometryInputs) as GeometryInputKey[]) geometryInputs[key].value = cached[key] ?? (key === 'sides' && selected === 'frustum' ? '' : GEOMETRY_VALUES[key]);
    else if (selected === 'frustum') {
      geometryInputs.radius.value = '1.4';
      geometryInputs.topRadius.value = '0.8';
      geometryInputs.height.value = '2';
      geometryInputs.sides.value = '';
    } else if (selected === 'planes' || selected === 'line-plane' || selected === 'sphere-plane') {
      geometryInputs.angle.value = selected === 'line-plane' ? '30' : '45';
      geometryInputs.offset.value = selected === 'sphere-plane' ? '0.5' : selected === 'line-plane' ? '1' : '0';
      if (selected === 'sphere-plane') geometryInputs.radius.value = '1';
    }
    previousShape = selected;
    updateGeometryUi(); invalidate(); previewGraph();
  });
  faces.addEventListener('change', () => { invalidate(); previewGraph(); });

  const label = el('label', 'vme-science-input-label');
  label.id = `${unique}-formula-label`;
  text(label, '函数 y = f(x)', 'Function y = f(x)');
  const formulaRow = el('div', 'vme-plot-formula-row');
  formulaRow.dataset.testid = 'plot-formula-row';
  const prefixBadge = el('span', 'vme-plot-prefix');
  prefixBadge.dataset.testid = 'plot-prefix';
  prefixBadge.setAttribute('data-no-i18n', '');
  prefixBadge.setAttribute('aria-hidden', 'true');
  prefixBadge.textContent = mode === 'polar' ? 'r =' : mode === 'surface' ? 'z =' : 'y =';
  const plotField = createHtml('math-field', host.ownerDocument);
  plotField.className = 'vme-plot-mathfield';
  plotField.id = `${unique}-mathfield`;
  plotField.dataset.testid = 'plot-mathfield';
  plotField.setAttribute('aria-labelledby', label.id);
  plotField.setAttribute('math-virtual-keyboard-policy', 'manual');
  plotField.setAttribute('default-mode', 'math');
  plotField.setAttribute('smart-mode', 'false');
  plotField.setAttribute('smart-superscript', 'true');
  plotField.setAttribute('popover-policy', 'off');
  plotField.tabIndex = 0;
  label.htmlFor = plotField.id;
  formulaRow.append(prefixBadge, plotField);

  const rawToggle = el('details', 'vme-plot-raw-toggle');
  rawToggle.dataset.testid = 'plot-raw-toggle';
  rawToggle.open = draft?.rawOpen ?? false;
  const rawSummary = el('summary');
  rawSummary.id = `${unique}-raw-summary`;
  text(rawSummary, '源码表达式', 'Raw expression');
  const expression = el('input', 'vme-science-input vme-plot-expression');
  expression.id = `${unique}-expression`;
  expression.type = 'text';
  expression.dataset.testid = 'plot-expression';
  expression.setAttribute('aria-labelledby', rawSummary.id);
  expression.autocomplete = 'off';
  expression.spellcheck = false;
  expression.setAttribute('autocapitalize', 'off');
  // Only this UI placeholder is localized; input values remain untouched.
  expression.placeholder = '示例：x^2, sin(x), 1/x';
  expression.value = draft?.expression ?? options.initialExpression ?? DEFAULT_PLOT_SPEC.expression;
  rawToggle.append(rawSummary, expression);

  let syncingPlotField = false;
  let plotInputCounter = 0;
  let mathfieldIncomplete = false;
  let mathfieldIssue: { zh: string; en: string } | null = null;
  let plotFieldConfigured = false;
  let lastSyncedExpression: string | undefined;
  let lastSyncedMode: PlotMode | undefined;
  function supports2dFormulaMode(targetMode: PlotMode = mode): targetMode is 'function' | 'polar' | 'surface' {
    return targetMode === 'function' || targetMode === 'polar' || targetMode === 'surface';
  }
  function ensurePlotFieldConfigured(): void {
    plotField.defaultMode = 'math';
    plotField.smartMode = false;
    plotField.smartSuperscript = true;
    plotField.popoverPolicy = 'off';
    plotField.mathVirtualKeyboardPolicy = 'manual';
    plotField.environmentPopoverPolicy = 'off';
    if (plotField.isConnected === false) return;
    try {
      plotField.menuItems = [];
      if (!plotFieldConfigured && Array.isArray(plotField.keybindings) && plotField.keybindings.length > 0) {
        plotField.keybindings = plotField.keybindings.filter(binding => {
          const command = Array.isArray(binding.command) ? binding.command[0] : binding.command;
          if (command === 'switchMode' || command === 'switch-mode') return false;
          return !/^(?:ctrl|cmd)\+\[(?:Enter|Return)\]$/i.test(binding.key);
        });
        plotFieldConfigured = true;
      }
    } catch {
      // MathLive throws if menuItems/keybindings are read before internal mount completes.
    }
  }
  function hasPreviousInPlotGroup(): boolean {
    if (!plotField.selectionIsCollapsed) return true;
    const current = plotField.position;
    if (current <= 0) return false;
    plotField.executeCommand('moveToGroupStart');
    const groupStart = plotField.position;
    plotField.position = current;
    return current > groupStart;
  }
  function syncMathfieldFromExpression(force = true): void {
    if (!force && lastSyncedExpression === expression.value && lastSyncedMode === mode) return;
    mathfieldIncomplete = false;
    mathfieldIssue = null;
    if (!supports2dFormulaMode(mode)) return;
    const trimmed = expression.value.trim();
    syncingPlotField = true;
    try {
      ensurePlotFieldConfigured();
      if (!trimmed) {
        plotField.setValue('', { silenceNotifications: true });
      } else {
        const convertedLatex = tryLatexFromPlotExpression(trimmed, mode);
        if (convertedLatex !== undefined) {
          plotField.setValue(convertedLatex, { silenceNotifications: true });
        }
      }
      lastSyncedExpression = expression.value;
      lastSyncedMode = mode;
    } finally {
      syncingPlotField = false;
    }
  }

  const complexLabel = el('label', 'vme-science-input-label');
  text(complexLabel, '复数（每行一个）', 'Complex numbers (one per line)');
  const complexInput = el('textarea', 'vme-science-input vme-complex-input');
  complexInput.id = `${unique}-complex`;
  complexInput.rows = 3; complexInput.spellcheck = false; complexInput.autocomplete = 'off';
  complexInput.dataset.testid = 'complex-points';
  complexInput.setAttribute('data-no-i18n', '');
  complexInput.placeholder = '3+2i\n-i\n4';
  complexInput.value = mode === 'complex' ? draft?.expression ?? '3+2i' : draft?.complexDraft?.expression ?? '3+2i';
  complexLabel.htmlFor = complexInput.id;
  const symbolsLabel = el('p', 'vme-plot-note'); text(symbolsLabel, '在光标处插入符号', 'Insert a symbol at the cursor');
  const presetRow = el('div', 'vme-plot-preset-row');
  presetRow.dataset.testid = 'plot-preset-row';
  const presetSelect = el('select', 'vme-conversion-select vme-plot-preset-select');
  presetSelect.dataset.testid = 'plot-preset-select';
  presetSelect.setAttribute('aria-label', '选择示例（替换输入）');
  const presetPlaceholder = el('option');
  presetPlaceholder.value = '';
  text(presetPlaceholder, '选择示例（替换输入）…', 'Choose an example (replaces input)…');
  presetSelect.append(presetPlaceholder);
  type PresetEntry = { expr: string; label: string };
  type PresetDefinition = { id: string; modes: Partial<Record<PlotMode, PresetEntry>> };
  const presetDefinitions: ReadonlyArray<PresetDefinition> = [
    { id: 'square', modes: { function: { expr: 'x^2', label: 'y = x²' } } },
    { id: 'sine', modes: { function: { expr: 'sin(x)', label: 'y = sin(x)' }, polar: { expr: '2*sin(3*theta)', label: 'r = 2 sin(3θ)' }, surface: { expr: 'sin(sqrt(x^2+y^2))', label: 'z = sin(√(x² + y²))' } } },
    { id: 'cosine', modes: { function: { expr: 'cos(x)', label: 'y = cos(x)' }, polar: { expr: '1+cos(theta)', label: 'r = 1 + cos(θ)' }, surface: { expr: 'cos(x)*cos(y)', label: 'z = cos(x) cos(y)' } } },
    { id: 'tangent', modes: { function: { expr: 'tan(x)', label: 'y = tan(x)' } } },
    { id: 'reciprocal', modes: { function: { expr: '1/x', label: 'y = 1/x' } } },
    { id: 'sqrt', modes: { function: { expr: 'sqrt(x)', label: 'y = √x' }, surface: { expr: 'sqrt(16-x^2-y^2)', label: 'z = √(16 − x² − y²)' } } },
    { id: 'circle', modes: { polar: { expr: '2', label: 'r = 2' } } },
    { id: 'spiral', modes: { polar: { expr: 'theta/3', label: 'r = θ/3' } } },
    { id: 'bowl', modes: { surface: { expr: '(x^2+y^2)/10', label: 'z = (x² + y²)/10' } } },
    { id: 'saddle', modes: { surface: { expr: '(x^2-y^2)/10', label: 'z = (x² − y²)/10' } } },
  ];
  const presetOptions = presetDefinitions.map((def) => {
    const option = el('option');
    option.value = def.id;
    option.dataset.testid = `plot-preset-${def.id}`;
    option.dataset.modes = Object.keys(def.modes).join(' ');
    option.setAttribute('data-no-i18n', '');
    const initial = def.modes[mode] ?? def.modes.function ?? def.modes.polar ?? def.modes.surface;
    option.textContent = initial?.label ?? def.id;
    presetSelect.append(option);
    return { option, def };
  });
  presetSelect.addEventListener('change', () => {
    if (externalDisabled || inserting) return;
    const chosenId = presetSelect.value;
    if (!chosenId) return;
    const def = presetDefinitions.find(item => item.id === chosenId);
    const entry = def?.modes[mode] ?? def?.modes.function;
    if (!entry) return;
    expression.value = entry.expr;
    syncMathfieldFromExpression();
    invalidate();
    previewGraph();
  });
  const symbols = el('div', 'vme-plot-presets vme-plot-symbols');
  symbols.setAttribute('role', 'group'); symbols.setAttribute('aria-label', '常用符号');
  const symbolDefinitions: ReadonlyArray<{
    id: string;
    caption: string;
    latex: (hasSelection: boolean, hasPrevious: boolean) => string;
    rawBefore: string;
    rawAfter: string;
  }> = [
    { id: 'fraction', caption: 'a/b', latex: sel => sel ? '\\frac{#0}{#?}' : '\\frac{#?}{#?}', rawBefore: '(', rawAfter: ')/()' },
    { id: 'sqrt', caption: '√', latex: sel => sel ? '\\sqrt{#0}' : '\\sqrt{#?}', rawBefore: 'sqrt(', rawAfter: ')' },
    { id: 'nth-root', caption: 'ⁿ√', latex: sel => sel ? '\\sqrt[3]{#0}' : '\\sqrt[#?]{#?}', rawBefore: '(', rawAfter: ')^(1/3)' },
    { id: 'power', caption: 'xⁿ', latex: (sel, prev) => sel ? '{#0}^{#?}' : prev ? '^{#?}' : '#?^{#?}', rawBefore: '^', rawAfter: '' },
    { id: 'parentheses', caption: '( )', latex: sel => sel ? '\\left(#0\\right)' : '\\left(#?\\right)', rawBefore: '(', rawAfter: ')' },
    { id: 'abs', caption: '|x|', latex: sel => sel ? '\\left|#0\\right|' : '\\left|#?\\right|', rawBefore: 'abs(', rawAfter: ')' },
    { id: 'sin', caption: 'sin', latex: sel => sel ? '\\sin\\left(#0\\right)' : '\\sin\\left(#?\\right)', rawBefore: 'sin(', rawAfter: ')' },
    { id: 'cos', caption: 'cos', latex: sel => sel ? '\\cos\\left(#0\\right)' : '\\cos\\left(#?\\right)', rawBefore: 'cos(', rawAfter: ')' },
    { id: 'tan', caption: 'tan', latex: sel => sel ? '\\tan\\left(#0\\right)' : '\\tan\\left(#?\\right)', rawBefore: 'tan(', rawAfter: ')' },
    { id: 'ln', caption: 'ln', latex: sel => sel ? '\\ln\\left(#0\\right)' : '\\ln\\left(#?\\right)', rawBefore: 'ln(', rawAfter: ')' },
    { id: 'log-base', caption: 'logₐ', latex: sel => sel ? '\\log_{#?}\\left(#0\\right)' : '\\log_{#?}\\left(#?\\right)', rawBefore: 'ln(', rawAfter: ')/ln(2)' },
    { id: 'exp', caption: 'eˣ', latex: sel => sel ? 'e^{#0}' : 'e^{#?}', rawBefore: 'exp(', rawAfter: ')' },
    { id: 'pi', caption: 'π', latex: () => '\\pi', rawBefore: 'pi', rawAfter: '' },
    { id: 'theta', caption: 'θ', latex: () => '\\theta', rawBefore: 'theta', rawAfter: '' },
    { id: 'x', caption: 'x', latex: () => 'x', rawBefore: 'x', rawAfter: '' },
    { id: 'y', caption: 'y', latex: () => 'y', rawBefore: 'y', rawAfter: '' },
    { id: 'multiply', caption: '×', latex: () => '\\cdot ', rawBefore: '*', rawAfter: '' },
    { id: 'divide', caption: '÷', latex: sel => sel ? '\\frac{#0}{#?}' : '\\frac{#?}{#?}', rawBefore: '/', rawAfter: '' },
  ];
  for (const def of symbolDefinitions) {
    const item = button(`plot-symbol-${def.id}`, def.caption, def.caption, () => {
      if (externalDisabled || inserting || equationLinked) return;
      presetSelect.value = '';
      if (rawToggle.open && host.ownerDocument.activeElement === expression) {
        const start = expression.selectionStart ?? expression.value.length, end = expression.selectionEnd ?? start;
        const selected = expression.value.slice(start, end);
        expression.setRangeText(def.rawBefore + selected + def.rawAfter, start, end, 'end');
        expression.focus();
        if (def.rawAfter && !selected) expression.setSelectionRange(start + def.rawBefore.length, start + def.rawBefore.length);
        syncMathfieldFromExpression();
        invalidate(); schedulePreview();
        return;
      }
      ensurePlotFieldConfigured();
      const template = def.latex(!plotField.selectionIsCollapsed, hasPreviousInPlotGroup());
      const beforeCount = plotInputCounter;
      plotField.insert(template, { format: 'latex', mode: 'math', selectionMode: 'placeholder', focus: true, feedback: false });
      plotField.focus();
      if (plotInputCounter === beforeCount) {
        syncFromMathfield();
      }
    });
    item.addEventListener('pointerdown', event => event.preventDefault());
    item.setAttribute('data-no-i18n', ''); symbols.append(item);
  }
  const useCurrent = button('plot-use-current', '使用当前公式', 'Use current equation', () => {
    if (destroyed || externalDisabled || inserting || !(options.getCurrentExpression || options.getCurrentGraph)) return;
    presetSelect.value = '';
    invalidate();
    try {
      const graph = options.getCurrentGraph?.();
      const value = graph?.expression ?? options.getCurrentExpression!();
      if (graph?.mode && graph.mode !== mode) { caches[mode] = viewDraft(); mode = graph.mode; kind.value = mode; restoreMode(); }
      expression.value = value;
      syncMathfieldFromExpression();
      invalidate();
      previewGraph();
    } catch (error) {
      showError('当前公式暂不能转换为单变量函数。请在此输入 y = f(x) 形式。',
        `This equation cannot be converted to a single function. Enter y = f(x) here. ${error instanceof Error ? error.message : ''}`);
    }
  });
  useCurrent.hidden = !(options.getCurrentExpression || options.getCurrentGraph);
  presetRow.append(presetSelect, useCurrent);
  const complexPresets = el('div', 'vme-plot-presets');
  for (const [id, caption, value] of [['single', '3+2i', '3+2i'], ['imaginary', '−i', '-i'], ['points', '3+2i, −2+i, −i', '3+2i\n-2+i\n-i']]) {
    const preset = button(`complex-preset-${id}`, caption, caption, () => {
      if (externalDisabled || inserting) return;
      complexInput.value = value; invalidate(); previewGraph();
    });
    preset.setAttribute('data-no-i18n', ''); complexPresets.append(preset);
  }
  const syntaxHint = el('p', 'vme-plot-note');
  text(syntaxHint, '用普通写法输入，例如 x^2、2x + 1、sqrt(x)。', 'Use ordinary notation, such as x^2, 2x + 1 or sqrt(x).');
  const linkedHint = el('p', 'vme-plot-note vme-plot-linked-hint');
  text(linkedHint, '图像与上方公式同步；直接修改公式即可更新。', 'The graph follows the equation above. Edit the equation to update it.');
  const range = el('details', 'vme-plot-range');
  range.open = draft?.rangeOpen ?? false;
  const rangeHeading = el('summary');
  text(rangeHeading, '坐标范围', 'Axis ranges');
  const rangeGrid = el('div', 'vme-plot-range-grid');
  const rangeInputs: Record<'xMin' | 'xMax' | 'yMin' | 'yMax', HTMLInputElement> = {} as Record<'xMin' | 'xMax' | 'yMin' | 'yMax', HTMLInputElement>;
  for (const [key, rangeLabel] of [
    ['xMin', 'x min'], ['xMax', 'x max'], ['yMin', 'y min'], ['yMax', 'y max'],
  ] as const) {
    const control = el('label', 'vme-plot-range-control');
    const caption = el('span');
    caption.textContent = rangeLabel;
    caption.dataset.rangeCaption = key;
    const input = el('input', 'vme-plot-range-input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.dataset.testid = `plot-${key}`;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = draft?.[key] ?? String(DEFAULT_PLOT_SPEC[key]);
    rangeInputs[key] = input;
    control.append(caption, input);
    rangeGrid.append(control);
  }
  range.append(rangeHeading, rangeGrid);
  const calculusLabel = el('label', 'vme-plot-kind-label');
  const calculusCaption = el('span'); text(calculusCaption, '微积分视图', 'Calculus view');
  const calculus = el('select', 'vme-conversion-select'); calculus.dataset.testid = 'plot-calculus';
  for (const [value, zh, en] of [['none', '原始函数', 'Original function'], ['derivative', '一阶导数 d/dx', 'First derivative d/dx'], ['second-derivative', '二阶导数 d²/dx²', 'Second derivative d²/dx²'], ['integral', '定积分与面积 ∫', 'Definite integral and area ∫']]) {
    const item = el('option'); item.value = value; text(item, zh, en); calculus.append(item);
  }
  calculus.value = draft?.calculus ?? 'none'; calculusLabel.append(calculusCaption, calculus);
  const extraGrid = el('div', 'vme-plot-range-grid');
  const extraInputs = {} as Record<ExtraKey, HTMLInputElement>;
  const extraWrappers = {} as Record<ExtraKey, HTMLElement>;
  for (const [key, zh, en] of [
    ['thetaMin', 'θ 起点（弧度）', 'θ start (radians)'], ['thetaMax', 'θ 终点（弧度）', 'θ end (radians)'],
    ['integralMin', '积分下限 a', 'Lower limit a'], ['integralMax', '积分上限 b', 'Upper limit b'],
    ['zMin', 'Z 最小值', 'Z min'], ['zMax', 'Z 最大值', 'Z max'],
    ['azimuth', '水平旋转（度）', 'Azimuth (degrees)'], ['elevation', '俯仰角（度）', 'Elevation (degrees)'],
  ] as const) {
    const control = el('label', 'vme-plot-range-control'); const caption = el('span'); text(caption, zh, en);
    const input = el('input', 'vme-plot-range-input'); input.type = 'text'; input.inputMode = 'decimal';
    input.spellcheck = false; input.dataset.testid = `plot-${key}`;
    input.value = draft?.[key] ?? String(EXTRA_DEFAULTS[key]);
    extraInputs[key] = input; extraWrappers[key] = control; control.append(caption, input); extraGrid.append(control);
  }
  calculus.addEventListener('change', () => { updateModeUi(); invalidate(); schedulePreview(); });
  const preview = el('div', 'vme-plot-preview');
  preview.dataset.testid = 'plot-preview';
  preview.setAttribute('data-no-i18n', '');
  preview.hidden = true;
  const status = el('p', 'vme-plot-status');
  status.dataset.testid = 'plot-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  text(status, '填写函数后点击预览图像。', 'Enter a function, then choose Preview graph.');
  const relationStatus = el('p', 'vme-plot-note');
  relationStatus.dataset.testid = 'geometry-relation-status'; relationStatus.hidden = true;
  const relationWarnings = el('div', 'vme-geometry-warnings');
  relationWarnings.dataset.testid = 'geometry-relation-warnings'; relationWarnings.hidden = true;
  const actions = el('div', 'vme-science-actions vme-plot-actions');
  actions.dataset.testid = 'plot-actions';
  const previewButton = button('plot-preview', '预览图像', 'Preview graph', previewGraph);
  previewButton.title = '立即刷新图像预览（Enter）';
  const copyButton = button('plot-copy-image', '复制图片', 'Copy image', () => { void copyCurrentGraph(); });
  copyButton.dataset.testid = 'plot-copy-image';
  copyButton.classList.add('vme-subpanel-secondary');
  copyButton.title = '复制高清 PNG 图片到剪贴板';
  const insertButton = button('plot-insert', options.editing ? '保存图像' : '插入图像', options.editing ? 'Save graph' : 'Insert graph', () => { void insertGraph(); });
  insertButton.title = options.editing ? '保存图像（Ctrl/Cmd+Enter）' : '插入图像（Ctrl/Cmd+Enter）';
  previewButton.prepend(controlIcon('preview'));
  previewButton.classList.add('vme-subpanel-secondary');
  copyButton.prepend(controlIcon('copy'));
  insertButton.prepend(controlIcon(options.editing ? 'save' : 'insert'));
  insertButton.classList.add('vme-science-primary');
  const alsoEquationLabel = el('label', 'vme-plot-also-equation');
  const alsoEquationCheckbox = el('input');
  alsoEquationCheckbox.type = 'checkbox';
  alsoEquationCheckbox.dataset.testid = 'plot-also-insert-equation';
  alsoEquationCheckbox.checked = draft?.alsoInsertEquation ?? options.alsoInsertEquation ?? false;
  const alsoEquationText = el('span');
  text(alsoEquationText, '同时插入公式', 'Also insert equation');
  alsoEquationLabel.append(alsoEquationCheckbox, alsoEquationText);
  actions.append(previewButton, insertButton, alsoEquationLabel);
  function shouldAlsoInsertEquation(): boolean {
    return !options.editing && !equationLinked && Boolean(options.onInsertGraph) && supports2dFormulaMode(mode) && alsoEquationCheckbox.checked;
  }
  alsoEquationCheckbox.addEventListener('change', () => {
    if (destroyed) return;
    updateModeUi();
    if (status.dataset.state === 'ready' && lastPlot && mode !== 'complex') {
      const willInsertBoth = equationLinked || shouldAlsoInsertEquation();
      text(
        status,
        willInsertBoth ? '图像已就绪。点击插入公式与图像加入笔记。' : options.editing ? '图像已就绪。点击保存图像更新笔记。' : '图像已就绪。点击插入图像加入笔记。',
        willInsertBoth ? 'The graph is ready. Choose Insert equation and graph to add both to the note.' : options.editing ? 'The graph is ready. Choose Save graph to update the note.' : 'The graph is ready. Choose Insert graph to add it to the note.',
      );
    }
    void options.onAlsoInsertEquationChange?.(alsoEquationCheckbox.checked);
  });
  const navigation = el('div', 'vme-science-actions vme-plot-navigation');
  navigation.dataset.testid = 'plot-navigation';
  const zoomIn = button('plot-zoom-in', '放大', 'Zoom in', () => { if (lastPlot) { interaction?.setDisabled(true); mode === 'geometry' ? applyGeometry(zoomGeometryView(lastPlot.spec, 0.8)) : mode === 'surface' ? applySurface(zoomSurfaceBounds(lastPlot.spec, 0.8)) : applyBounds(zoomPlotBounds(lastPlot.spec, 0.8)); } });
  const zoomOut = button('plot-zoom-out', '缩小', 'Zoom out', () => { if (lastPlot) { interaction?.setDisabled(true); mode === 'geometry' ? applyGeometry(zoomGeometryView(lastPlot.spec, 1.25)) : mode === 'surface' ? applySurface(zoomSurfaceBounds(lastPlot.spec, 1.25)) : applyBounds(zoomPlotBounds(lastPlot.spec, 1.25)); } });
  const reset = button('plot-reset-view', '重置视图', 'Reset view', () => { interaction?.setDisabled(true); surfaceInteraction?.setDisabled(true); if (mode === 'geometry') { applyGeometry({ ...buildSpec(), azimuth: home.azimuth ?? 45, elevation: home.elevation ?? 30, geometryZoom: home.geometryZoom ?? 1 }); return; } if (mode === 'surface') { for (const key of ['zMin','zMax','azimuth','elevation'] as const) extraInputs[key].value = String(home[key] ?? EXTRA_DEFAULTS[key]); } applyBounds(home); });
  const fit = button('complex-fit', '适应所有点', 'Fit all points', () => {
    if (externalDisabled || inserting) return;
    interaction?.setDisabled(true);
    const parsed = parseComplexNumbers(complexInput.value);
    if (!parsed.ok) { showError(plotErrorZh(parsed.error), parsed.error); refreshDisabled(); return; }
    setBounds(fitComplexPoints(parsed.points)); previewGraph();
  });
  const rotateLeft = button('plot-rotate-left', '向左旋转', 'Rotate left', () => { if (lastPlot) mode === 'geometry' ? applyGeometry(rotateGeometryCamera(lastPlot.spec, -15, 0)) : applySurface(rotateSurfaceCamera(lastPlot.spec, -15, 0)); });
  const rotateRight = button('plot-rotate-right', '向右旋转', 'Rotate right', () => { if (lastPlot) mode === 'geometry' ? applyGeometry(rotateGeometryCamera(lastPlot.spec, 15, 0)) : applySurface(rotateSurfaceCamera(lastPlot.spec, 15, 0)); });
  navigation.append(zoomIn, zoomOut, reset, fit, rotateLeft, rotateRight, copyButton);
  zoomIn.prepend(controlIcon('zoom-in')); zoomOut.prepend(controlIcon('zoom-out'));
  reset.prepend(controlIcon('reset')); fit.prepend(controlIcon('fit'));
  const gestureHint = el('p', 'vme-plot-note');
  text(gestureHint, '输入后自动预览；在图内拖动或滚轮缩放。点击插入或保存才写入笔记，也可按 Ctrl+Enter。', 'Preview updates as you type. Drag or scroll inside the graph. Insert or save to update the note; Ctrl+Enter also works.');
  const pointList = el('ul', 'vme-complex-point-list');
  pointList.dataset.testid = 'complex-point-list'; pointList.setAttribute('data-no-i18n', '');
  const note = el('p', 'vme-plot-note');
  text(note, '离线绘制单变量函数；三角函数采用弧度，图线为数值近似。',
    'Plot a single function offline. Trigonometric functions use radians; curves are numerical approximations.');
  const previewOnly = el('p', 'vme-plot-note');
  previewOnly.dataset.testid = 'plot-preview-only';
  text(previewOnly, '此预览页面可以画图；在 Obsidian 中可将图像插入笔记。',
    'You can preview graphs here. Open the editor in Obsidian to insert a graph into a note.');
  previewOnly.hidden = Boolean(options.onInsertGraph);
  body.append(linkedHint, kindLabel, geometryControls, label, formulaRow, rawToggle, complexLabel, complexInput, presetRow, symbolsLabel, symbols, complexPresets, syntaxHint, calculusLabel, extraGrid, range, preview, relationStatus, relationWarnings, pointList, navigation, gestureHint, actions, status, note, previewOnly);
  syncMathfieldFromExpression(true);
  const inputs = [expression, complexInput, ...Object.values(rangeInputs), ...Object.values(extraInputs), ...Object.values(geometryInputs)];
  for (const input of inputs) {
    input.addEventListener('input', () => {
      if (input === expression) {
        presetSelect.value = '';
        syncMathfieldFromExpression(true);
      }
      invalidate();
      schedulePreview();
    });
    input.addEventListener('keydown', (event) => {
      if ((event as KeyboardEvent).metaKey || (event as KeyboardEvent).ctrlKey) return;
      if ((event as KeyboardEvent).key !== 'Enter' || input === complexInput) return;
      event.preventDefault();
      event.stopPropagation();
      previewGraph();
    });
  }
  function showMathfieldIncomplete(): void {
    cancelPreview();
    pendingInput = false;
    interaction?.setDisabled(true);
    surfaceInteraction?.setDisabled(true);
    lastPlot = undefined;
    preview.replaceChildren();
    preview.hidden = true;
    pointList.replaceChildren();
    pointList.hidden = true;
    relationStatus.hidden = relationWarnings.hidden = true;
    status.dataset.state = 'incomplete';
    text(status, '还有方框尚未填完，补全后自动更新预览。', 'Fill in the remaining boxes to update the preview.');
    refreshDisabled();
  }
  function syncFromMathfield(): void {
    if (syncingPlotField || destroyed || equationLinked || !supports2dFormulaMode(mode)) return;
    ensurePlotFieldConfigured();
    const latex = plotField.getValue('latex-expanded').trim();
    if (!latex) {
      mathfieldIncomplete = false;
      mathfieldIssue = null;
      expression.value = '';
      lastSyncedExpression = '';
      lastSyncedMode = mode;
      invalidate();
      schedulePreview();
      return;
    }
    if (hasIncompleteSlots(latex)) {
      mathfieldIncomplete = true;
      mathfieldIssue = null;
      showMathfieldIncomplete();
      return;
    }
    try {
      const parsed = graphFromLatex(latex, mode);
      mathfieldIncomplete = false;
      mathfieldIssue = null;
      expression.value = parsed.expression;
      lastSyncedExpression = expression.value;
      lastSyncedMode = mode;
      invalidate();
      schedulePreview();
    } catch {
      mathfieldIncomplete = false;
      mathfieldIssue = {
        zh: '暂不支持此二维公式写法，请检查变量、函数名称或括号。',
        en: 'This 2D formula cannot be plotted yet. Check variables, function names, and parentheses.',
      };
      lastPlot = undefined;
      preview.replaceChildren();
      preview.hidden = true;
      showError(mathfieldIssue.zh, mathfieldIssue.en);
    }
  }
  plotField.addEventListener('mount', () => {
    plotFieldConfigured = false;
    ensurePlotFieldConfigured();
  });
  plotField.addEventListener('mode-change', () => {
    if (plotField.mode === 'latex') plotField.mode = 'math';
  });
  plotField.addEventListener('contextmenu', event => event.preventDefault(), true);
  plotField.addEventListener('focus', () => {
    ensurePlotFieldConfigured();
  });
  plotField.addEventListener('input', () => {
    plotInputCounter += 1;
    if (!syncingPlotField) presetSelect.value = '';
    syncFromMathfield();
  });
  plotField.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).metaKey || (event as KeyboardEvent).ctrlKey || (event as KeyboardEvent).altKey || (event as KeyboardEvent).shiftKey) return;
    if ((event as KeyboardEvent).key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
    previewGraph();
  }, true);

  function invalidate(): void {
    cancelPreview();
    pendingInput = true;
    interaction?.setDisabled(true);
    surfaceInteraction?.setDisabled(true);
    lastPlot = undefined;
    preview.replaceChildren();
    preview.hidden = true;
    pointList.replaceChildren(); pointList.hidden = true;
    relationStatus.hidden = relationWarnings.hidden = true;
    status.dataset.state = 'edited';
    text(status, '正在更新预览…也可直接点击插入或保存。', 'Updating preview… You can also insert or save directly.');
    refreshDisabled();
  }
  function refreshDisabled(): void {
    if (destroyed) return;
    const busy = externalDisabled || inserting;
    kind.disabled = calculus.disabled = shape.disabled = faces.disabled = presetSelect.disabled = busy;
    useCurrent.disabled = busy;
    alsoEquationCheckbox.disabled = busy;
    plotField.readOnly = busy;
    plotField.classList.toggle('is-disabled', busy);
    for (const input of inputs) input.disabled = busy;
    for (const preset of Array.from(root.querySelectorAll<HTMLButtonElement>('.vme-plot-presets button'))) preset.disabled = busy;
    for (const preset of Array.from(complexPresets.querySelectorAll<HTMLButtonElement>('button'))) preset.disabled = busy;
    refreshCompositeControlsDisabled();
    previewButton.disabled = busy;
    copyButton.disabled = busy || !lastPlot;
    insertButton.disabled = busy || !options.onInsertGraph || mathfieldIncomplete || Boolean(mathfieldIssue) || (!lastPlot && !pendingInput);
    zoomIn.disabled = zoomOut.disabled = busy || !lastPlot;
    reset.disabled = fit.disabled = busy;
    rotateLeft.disabled = rotateRight.disabled = busy || !lastPlot;
    interaction?.setDisabled(busy || !lastPlot || mode === 'surface' || mode === 'geometry');
    surfaceInteraction?.setDisabled(busy || !lastPlot || (mode !== 'surface' && mode !== 'geometry'));
    preview.classList.toggle('vme-plot-enabled', !busy && Boolean(lastPlot));
  }
  function showError(chinese: string, english: string): void {
    cancelPreview(); pendingInput = false;
    status.dataset.state = 'error';
    text(status, chinese, english);
    refreshDisabled();
  }
  function cancelPreview(): void {
    if (previewTimer !== undefined) window.clearTimeout(previewTimer);
    previewTimer = undefined;
  }
  function schedulePreview(): void {
    cancelPreview();
    previewTimer = window.setTimeout(() => {
      previewTimer = undefined;
      if (!root.closest('[hidden]')) previewGraph();
    }, 250);
  }
  function buildSpec(bounds?: PlotBounds): PlotSpec {
    const numeric = (input: HTMLInputElement): number => input.value.trim() ? Number(input.value) : NaN;
    if (mode === 'geometry') {
      const selectedShape = shape.value as GeometryShape;
      if (selectedShape === 'composite') {
        const model: GeometryModel = {
          shape: 'composite',
          faces: faces.value === 'faces',
          parts: compositeParts.map((part, idx) => compositePartModelFromDraft(part, idx)),
        };
        return {
          ...DEFAULT_GEOMETRY_SPEC,
          geometry: model,
          expression: '',
          azimuth: numeric(extraInputs.azimuth),
          elevation: numeric(extraInputs.elevation),
          geometryZoom: Number(geometryZoom),
        };
      }
      const decimal = (input: HTMLInputElement): number => parseDecimalString(input.value);
      const model: GeometryModel = { shape: selectedShape, faces: faces.value === 'faces' };
      for (const key of geometryKeys(model.shape)) {
        if (key === 'sides' && selectedShape === 'frustum' && geometryInputs.sides.value.trim() === '') {
          continue;
        }
        model[key] = decimal(geometryInputs[key]);
      }
      return { ...DEFAULT_GEOMETRY_SPEC, geometry: model, expression: '',
        azimuth: numeric(extraInputs.azimuth), elevation: numeric(extraInputs.elevation), geometryZoom: Number(geometryZoom) };
    }
    const xy = bounds ?? Object.fromEntries(Object.entries(rangeInputs).map(([key, input]) => [key, numeric(input)])) as unknown as PlotBounds;
    const spec: PlotSpec = { ...(mode === 'function' ? {} : { mode }), expression: mode === 'complex' ? complexInput.value : expression.value, ...xy };
    if (mode === 'polar') { spec.thetaMin = numeric(extraInputs.thetaMin); spec.thetaMax = numeric(extraInputs.thetaMax); }
    if (mode === 'surface') for (const key of ['zMin','zMax','azimuth','elevation'] as const) spec[key] = numeric(extraInputs[key]);
    if (mode === 'function' && calculus.value !== 'none') {
      spec.calculus = calculus.value as PlotSpec['calculus'];
      if (calculus.value === 'integral') { spec.integralMin = numeric(extraInputs.integralMin); spec.integralMax = numeric(extraInputs.integralMax); }
    }
    return spec;
  }
  function applyGeometry(spec: PlotSpec | undefined, preserveGesture = false): void {
    if (!spec || destroyed || externalDisabled || inserting) return;
    if (!preserveGesture) surfaceInteraction?.setDisabled(true);
    extraInputs.azimuth.value = String(spec.azimuth);
    extraInputs.elevation.value = String(spec.elevation);
    geometryZoom = String(spec.geometryZoom);
    previewGraph(preserveGesture);
  }
  function applySurface(spec: PlotSpec | undefined, preserveGesture = false): void {
    if (!spec || destroyed || externalDisabled || inserting) return;
    if (!preserveGesture) surfaceInteraction?.setDisabled(true);
    for (const key of ['zMin','zMax','azimuth','elevation'] as const) extraInputs[key].value = String(spec[key]);
    setBounds(spec); previewGraph(preserveGesture);
  }
  function previewGraph(preserveGesture = false): void {
    if (destroyed || externalDisabled || inserting) return;
    if (!equationLinked && supports2dFormulaMode(mode)) {
      if (mathfieldIncomplete) {
        showMathfieldIncomplete();
        return;
      }
      if (mathfieldIssue) {
        showError(mathfieldIssue.zh, mathfieldIssue.en);
        return;
      }
      syncMathfieldFromExpression(false);
    }
    cancelPreview();
    pendingInput = false;
    if (!preserveGesture) { interaction?.setDisabled(true); surfaceInteraction?.setDisabled(true); }
    lastPlot = undefined;
    pointList.replaceChildren(); pointList.hidden = true; relationStatus.hidden = relationWarnings.hidden = true; relationWarnings.replaceChildren();
    if (equationLinked && !readCurrentEquation()) return;
    const result = createGraph(buildSpec());
    preview.replaceChildren();
    preview.hidden = true;
    if (!result.ok) {
      showError(plotErrorZh(result.error), result.error);
      refreshDisabled();
      return;
    }
    // The renderer generates a self-contained SVG and escapes all user text.
    const svg = new DOMParser().parseFromString(result.svg, 'image/svg+xml').documentElement;
    if (svg.localName !== 'svg') {
      showError('暂时无法生成图像，请检查函数后重试。', 'The graph could not be generated.');
      return;
    }
    preview.replaceChildren(preview.ownerDocument.importNode(svg, true));
    preview.hidden = false;
    lastPlot = { spec: result.spec, svg: result.svg };
    pointList.replaceChildren(); pointList.hidden = mode !== 'complex';
    if ('points' in result) {
      for (const point of result.points) {
        const item = el('li'); item.textContent = `${point.label} = ${formatComplex(point)} · Re = ${point.re}, Im = ${point.im}`; pointList.append(item);
      }
    }
    if (hasSpatialAnalysis(result)) {
      const labels = {
        'planes-intersecting': ['两个平面相交', 'The planes intersect'],
        'planes-parallel': ['两个平面平行', 'The planes are parallel'],
        'planes-coincident': ['两个平面重合', 'The planes coincide'],
        'line-intersecting': ['直线与平面相交', 'The line intersects the plane'],
        'line-parallel': ['直线与平面平行', 'The line is parallel to the plane'],
        'line-contained': ['直线在平面内', 'The line lies in the plane'],
        'sphere-circle': ['球体与平面相交成圆', 'The sphere and plane intersect in a circle'],
        'sphere-tangent': ['球体与平面相切', 'The sphere and plane are tangent'],
        'sphere-disjoint': ['球体与平面不相交', 'The sphere and plane are disjoint'],
      } as const;
      const message = labels[result.analysis.relation];
      text(relationStatus, message[0], message[1]); relationStatus.hidden = false;
      if (result.analysis.approximate) {
        const warning = el('p', 'vme-plot-note');
        text(warning, '接近临界情况：显示关系为数值近似；输入数值未被吸附或改写。', 'Near a critical case: the displayed relation is a numerical approximation; inputs were not snapped.');
        relationWarnings.append(warning);
      }
      if (result.analysis.outsideView) {
        const warning = el('p', 'vme-plot-note');
        text(warning, '交点或交线位于当前画面之外。', 'The intersection lies outside the shown view.');
        relationWarnings.append(warning);
      }
      relationWarnings.hidden = !relationWarnings.childElementCount;
    }
    status.dataset.state = 'ready';
    text(status, options.editing ? '图像已就绪。点击保存图像更新笔记。' : '图像已就绪。点击插入图像加入笔记。', options.editing ? 'The graph is ready. Choose Save graph to update the note.' : 'The graph is ready. Choose Insert graph to add it to the note.');
    if (equationLinked || shouldAlsoInsertEquation()) {
      text(status, '图像已就绪。点击插入公式与图像加入笔记。', 'The graph is ready. Choose Insert equation and graph to add both to the note.');
    }
    if ('visibleCount' in result) text(status, `视图内 ${result.visibleCount} / ${result.points.length} 个点。点击保存才写入笔记。`, `${result.visibleCount} / ${result.points.length} points visible. Save to update the note.`);
    refreshDisabled();
  }

  function setBounds(bounds: PlotBounds): void {
    for (const key of ['xMin', 'xMax', 'yMin', 'yMax'] as const) rangeInputs[key].value = String(bounds[key]);
  }
  function applyBounds(bounds: PlotBounds | undefined): void {
    if (!bounds || destroyed || externalDisabled || inserting) { refreshDisabled(); return; }
    const result = createGraph(buildSpec(bounds));
    if (!result.ok) { showError(plotErrorZh(result.error), result.error); refreshDisabled(); return; }
    setBounds(bounds); previewGraph(true);
  }
  function viewDraft(): PlotViewDraft {
    return { expression: mode === 'geometry' ? '' : mode === 'complex' ? complexInput.value : expression.value,
      xMin: rangeInputs.xMin.value, xMax: rangeInputs.xMax.value, yMin: rangeInputs.yMin.value, yMax: rangeInputs.yMax.value,
      geometry: {
        shape: shape.value as GeometryShape,
        ...Object.fromEntries(Object.entries(geometryInputs).map(([key, input]) => [key, input.value])),
        faces: faces.value === 'faces',
        parts: compositeParts.map(part => ({ ...part })),
      }, geometryZoom,
      ...Object.fromEntries(EXTRA_KEYS.map(key => [key, extraInputs[key].value])), calculus: calculus.value as PlotSpec['calculus'],
      previewed: Boolean(lastPlot), rangeOpen: range.open, rawOpen: rawToggle.open, home: { ...home } };
  }
  function geometryKeys(selected: GeometryShape): (keyof typeof geometryInputs)[] {
    if (selected === 'composite') return [];
    if (selected === 'sphere-plane') return ['radius', 'offset'];
    if (selected === 'planes' || selected === 'line-plane') return ['angle', 'offset'];
    if (selected === 'sphere' || selected === 'hemisphere') return ['radius'];
    if (selected === 'cylinder' || selected === 'cone') return ['radius', 'height'];
    if (selected === 'frustum') return ['radius', 'topRadius', 'height', 'sides'];
    if (selected === 'pyramid' || selected === 'prism') return ['radius', 'height', 'sides'];
    if (selected === 'cuboid') return ['width', 'depth', 'height'];
    return ['width', 'depth'];
  }
  function updateGeometryUi(): void {
    const selected = shape.value as GeometryShape;
    const isComposite = selected === 'composite';
    geometryGrid.hidden = isComposite;
    compositeControls.hidden = !isComposite;
    facesLabel.hidden = false;
    const visible = geometryKeys(selected);
    for (const key of Object.keys(geometryInputs) as (keyof typeof geometryInputs)[]) geometryWrappers[key].hidden = !visible.includes(key);
    if (isComposite) {
      text(geometryHint, '选择组合题型模板，或逐个调整 2–6 个基本几何体的尺寸、偏移、旋转与半透明样式。',
        'Choose a problem template, or adjust dimensions, offsets, rotations, and translucency for 2–6 primitive solids.');
    } else if (selected === 'planes' || selected === 'line-plane' || selected === 'sphere-plane') {
      if (selected === 'planes') text(geometryHint, '参考平面为 z=0；调整第二个平面的夹角（0–90°）和法向偏移（−4 至 4）。关系针对无限平面，画面只显示有限平面片。',
        'The reference plane is z=0. Adjust the second plane’s angle (0–90°) and normal offset (−4 to 4). Relations use infinite planes; displayed patches are finite.');
      if (selected === 'line-plane') text(geometryHint, '平面固定为 z=0；调整直线夹角（0–90°）和参考点高度（−4 至 4）。关系针对无限直线和平面，画面只显示有限片段。',
        'The plane is fixed at z=0. Adjust the line’s angle (0–90°) and anchor height (−4 to 4). Relations use an infinite line and plane; only finite segments and patches are shown.');
      if (selected === 'sphere-plane') text(geometryHint, '球心固定在原点；平面为 z=偏移。半径范围 0.1–4，偏移范围 −4 至 4。关系针对无限平面，画面只显示有限平面片。',
        'The sphere is centered at the origin; the plane is z=offset. Radius ranges from 0.1–4 and offset from −4 to 4. The relation uses an infinite plane; the displayed patch is finite.');
    } else text(geometryHint, '所有长度采用相同单位；底面半径指中心到顶点的距离。平面为有限的 XY 平面片。',
      'Use the same unit for all lengths. Base radius means center to vertex. A plane is a finite patch in XY.');
    text(geometryCaptions.offset,
      selected === 'planes' ? '法向偏移' : selected === 'line-plane' ? '直线参考点高度 Z' : selected === 'sphere-plane' ? '平面高度 Z' : '有符号偏移',
      selected === 'planes' ? 'Normal offset' : selected === 'line-plane' ? 'Line anchor Z' : selected === 'sphere-plane' ? 'Plane Z' : 'Signed offset');
    text(geometryCaptions.radius,
      selected === 'frustum' ? '下底半径' : (selected === 'pyramid' || selected === 'prism') ? '底面外接圆半径' : '半径',
      selected === 'frustum' ? 'Bottom radius' : (selected === 'pyramid' || selected === 'prism') ? 'Base circumradius' : 'Radius');
    text(geometryCaptions.sides,
      selected === 'frustum' ? '棱数（留空为圆台）' : '底面边数',
      selected === 'frustum' ? 'Sides (blank = circular)' : 'Base sides');
    geometryInputs.sides.placeholder = selected === 'frustum' ? '圆台' : '';
  }
  function updateModeUi(): void {
    root.dataset.equationLinked = String(equationLinked);
    kindLabel.hidden = equationLinked;
    linkedHint.hidden = !equationLinked;
    const show2dFormula = !equationLinked && supports2dFormulaMode(mode);
    label.hidden = formulaRow.hidden = rawToggle.hidden = expression.hidden = presetRow.hidden = !show2dFormula;
    prefixBadge.textContent = mode === 'polar' ? 'r =' : mode === 'surface' ? 'z =' : 'y =';
    alsoEquationLabel.hidden = Boolean(options.editing) || equationLinked || !options.onInsertGraph || !supports2dFormulaMode(mode);
    geometryControls.hidden = mode !== 'geometry';
    range.hidden = mode === 'geometry';
    updateGeometryUi();
    complexLabel.hidden = complexInput.hidden = complexPresets.hidden = fit.hidden = mode !== 'complex';
    syntaxHint.hidden = equationLinked || mode === 'geometry';
    symbolsLabel.hidden = symbols.hidden = !show2dFormula;
    calculusLabel.hidden = mode !== 'function';
    rotateLeft.hidden = rotateRight.hidden = mode !== 'surface' && mode !== 'geometry';
    for (const key of EXTRA_KEYS) {
      extraWrappers[key].hidden = key.startsWith('theta')
        ? mode !== 'polar'
        : key.startsWith('integral')
          ? mode !== 'function' || calculus.value !== 'integral'
          : key === 'azimuth' || key === 'elevation'
            ? mode !== 'surface' && mode !== 'geometry'
            : mode !== 'surface';
    }
    for (const id of ['x','y','theta']) { const item = symbols.querySelector<HTMLButtonElement>(`[data-action="plot-symbol-${id}"]`)!; item.hidden = id === 'theta' ? mode !== 'polar' : id === 'y' ? mode !== 'surface' : mode === 'polar'; }
    for (const { option, def } of presetOptions) {
      const entry = def.modes[mode];
      option.hidden = !entry;
      option.disabled = !entry;
      if (entry) option.textContent = entry.label;
    }
    if (presetSelect.value && !presetDefinitions.find(item => item.id === presetSelect.value)?.modes[mode]) {
      presetSelect.value = '';
    }
    text(label, mode === 'polar' ? '极径 r = f(θ)' : mode === 'surface' ? '曲面 z = f(x,y)' : '函数 y = f(x)', mode === 'polar' ? 'Radius r = f(θ)' : mode === 'surface' ? 'Surface z = f(x,y)' : 'Function y = f(x)');
    const insertCaption = insertButton.querySelector<HTMLElement>('span')!;
    const willInsertBoth = equationLinked || shouldAlsoInsertEquation();
    text(insertCaption,
      willInsertBoth ? '插入公式与图像' : options.editing ? '保存图像' : '插入图像',
      willInsertBoth ? 'Insert equation and graph' : options.editing ? 'Save graph' : 'Insert graph');
    if (mode === 'complex') {
      text(syntaxHint, '输入 a+bi，例如 3+2i、−i、4；每行一个，最多 20 个点。', 'Enter a+bi, such as 3+2i, −i or 4; one per line, up to 20 points.');
      text(note, 'Re 为实轴、Im 为虚轴，两轴每单位长度相同；暂不计算复数表达式。', 'Re is the real axis and Im is the imaginary axis, with equal unit lengths. Complex expressions are not evaluated.');
    } else {
      text(syntaxHint, '用普通写法输入，例如 x^2、2x + 1、sqrt(x)。', 'Use ordinary notation, such as x^2, 2x + 1 or sqrt(x).');
      text(note, '离线绘制单变量函数；三角函数采用弧度，图线为数值近似。', 'Plot a single function offline. Trigonometric functions use radians; curves are numerical approximations.');
    }
    if (mode === 'polar') {
      text(syntaxHint, '输入极径，例如 2*sin(3*theta)。θ 使用弧度。', 'Enter a radius, for example 2*sin(3*theta). θ uses radians.');
      text(note, '极坐标采用等比例 X/Y 轴；负极径会反向绘制。图线为数值近似。', 'Polar graphs use equal X/Y units. Negative radii reverse direction. Curves are numerical approximations.');
    }
    if (mode === 'surface') {
      text(syntaxHint, '输入 z=f(x,y)，例如 sin(sqrt(x^2+y^2))。', 'Enter z=f(x,y), for example sin(sqrt(x^2+y^2)).');
      text(gestureHint, '在曲面内拖动旋转，滚轮缩放；插入或保存才写入笔记。', 'Drag the surface to rotate; scroll to zoom. Insert or save to update the note.');
      text(note, '三维曲面为有界网格数值近似；不支持隐式曲面或符号求解。', '3D surfaces use a bounded numerical mesh. Implicit surfaces and symbolic solving are not supported.');
    } else text(gestureHint, '输入后自动预览；在图内拖动或滚轮缩放。点击插入或保存才写入笔记，也可按 Ctrl+Enter。', 'Preview updates as you type. Drag or scroll inside the graph. Insert or save to update the note; Ctrl+Enter also works.');
    if (mode === 'geometry') {
      text(gestureHint, '拖动模型旋转，滚轮缩放；插入或保存后才保留尺寸与视图。', 'Drag the model to rotate; scroll to zoom. Insert or save to keep dimensions and view.');
      text(note, '几何模型采用等比例正交视图；曲面为多边形近似，仅作几何示意。', 'Geometry models use an equal-scale orthographic view. Curved surfaces are polygonal approximations for geometric illustration.');
    }
    if (mode === 'function' && calculus.value !== 'none') text(note, '导数和定积分采用数值近似，不是符号计算；间断点附近可能省略曲线。', 'Derivatives and definite integrals are numerical approximations, not symbolic calculations. Curves may be omitted near discontinuities.');
    for (const [key, suffix] of [['xMin','min'],['xMax','max'],['yMin','min'],['yMax','max']] as const) {
      const axis = mode === 'complex' ? key.startsWith('x') ? 'Re' : 'Im' : key.startsWith('x') ? 'X' : 'Y';
      text(root.querySelector<HTMLElement>(`[data-range-caption="${key}"]`)!, `${axis} ${suffix === 'min' ? '最小值' : '最大值'}`, `${axis} ${suffix}`);
    }
  }
  function restoreMode(): void {
    presetSelect.value = '';
    const cached = caches[mode], defaults = modeDefaults(mode);
    if (mode === 'complex') complexInput.value = cached?.expression ?? defaults.expression; else expression.value = cached?.expression ?? defaults.expression;
    for (const key of ['xMin','xMax','yMin','yMax'] as const) rangeInputs[key].value = cached?.[key] ?? String(defaults[key]);
    for (const key of EXTRA_KEYS) extraInputs[key].value = cached?.[key] ?? String(defaults[key] ?? EXTRA_DEFAULTS[key]);
    calculus.value = cached?.calculus ?? 'none';
    if (mode === 'geometry') {
      const saved = cached?.geometry;
      shape.value = saved?.shape ?? 'sphere'; faces.value = saved?.faces === false ? 'wireframe' : 'faces';
      for (const key of Object.keys(geometryInputs) as GeometryInputKey[]) {
        geometryInputs[key].value = saved?.[key] ?? (key === 'sides' && saved?.shape === 'frustum' ? '' : GEOMETRY_VALUES[key]);
      }
      if (saved?.parts?.length) {
        compositeParts = saved.parts.map(part => ({ ...part }));
        renderCompositePartCards();
      }
      previousShape = shape.value as GeometryShape;
      geometryZoom = cached?.geometryZoom ?? '1';
    }
    home = cached?.home ?? { ...defaults };
    range.open = cached?.rangeOpen ?? false;
    rawToggle.open = cached?.rawOpen ?? false;
    syncMathfieldFromExpression(true);
    updateModeUi();
  }
  kind.addEventListener('change', () => {
    if (destroyed || externalDisabled || inserting || equationLinked) return;
    caches[mode] = viewDraft(); invalidate();
    mode = kind.value as PlotMode;
    const cached = caches[mode];
    restoreMode();
    updateModeUi(); refreshDisabled();
    if (cached?.previewed) previewGraph(); else schedulePreview();
  });
  interaction = mountPlotInteraction(preview, {
    getBounds: () => lastPlot?.spec ?? home,
    onChange: bounds => applyBounds(bounds),
  });
  surfaceInteraction = mountOrbitInteraction(preview, { getSpec: () => lastPlot?.spec ?? buildSpec(), onChange: spec => { if (mode === 'geometry') applyGeometry(spec, true); else applySurface(spec, true); } });
  function buildStandaloneEquationLatex(spec: PlotSpec): string {
    const specMode = spec.mode ?? 'function';
    const lhs = specMode === 'polar' ? 'r' : specMode === 'surface' ? 'z' : 'y';
    return `${lhs} = ${latexFromPlotExpression(spec.expression, specMode)}`;
  }
  async function copyCurrentGraph(): Promise<void> {
    if (destroyed || externalDisabled || inserting) return;
    if (!lastPlot) previewGraph();
    const svgNode = preview.querySelector<SVGElement>('svg');
    if (!lastPlot || !svgNode) return;
    try {
      const format = await copyPlotImage(svgNode, { scale: 2, fallbackSvgMarkup: lastPlot.svg });
      if (destroyed) return;
      status.dataset.state = 'ready';
      if (format === 'png') {
        text(status, '图片已复制到剪贴板。', 'Image copied to clipboard.');
      } else {
        text(status, '当前环境不支持复制图片，已复制 SVG 源码。', 'Image copy is unavailable here; copied SVG source instead.');
      }
    } catch {
      if (!destroyed) {
        status.dataset.state = 'error';
        text(status, '未能复制图片，请重试。', 'Could not copy the image. Try again.');
      }
    }
  }
  async function insertGraph(): Promise<void> {
    if (destroyed || externalDisabled || inserting || !options.onInsertGraph) return;
    // Always validate the current fields. An explicit click may arrive before
    // the debounced preview, and must never insert an older expression.
    previewGraph();
    if (!lastPlot) return;
    const current = lastPlot;
    const equationLatex = shouldAlsoInsertEquation() ? buildStandaloneEquationLatex(current.spec) : undefined;
    inserting = true;
    status.dataset.state = 'inserting';
    text(status, '正在插入图像…', 'Inserting graph…');
    refreshDisabled();
    try {
      await options.onInsertGraph(current.spec, current.svg, equationLatex);
      if (!destroyed) {
        status.dataset.state = 'inserted';
        text(status, '图像已插入笔记。', 'The graph was inserted into the note.');
      }
    } catch (error) {
      if (!destroyed) {
        const message = error instanceof Error ? error.message : '';
        if (message === 'Finish or clear the current equation before inserting a graph.') {
          showError('请先完成或清空当前公式，再插入图像。绘图输入和预览仍保留。',
            'Finish or clear the current equation before inserting a graph. Your graph input and preview are preserved.');
        } else if (message === 'The equation changed. Preview the graph again.') {
          invalidate();
          showError('公式已修改，请重新预览后插入。', 'The equation changed. Preview the graph again.');
        } else {
          showError('未能插入图像，输入和预览仍保留，请重试。',
            `The graph could not be inserted. Your input and preview are preserved. ${message || 'Try again.'}`);
        }
      }
    } finally {
      inserting = false;
      refreshDisabled();
    }
  }

  function readCurrentEquation(): boolean {
    try {
      const graph = options.getCurrentGraph?.();
      if (graph && (graph.mode ?? 'function') !== mode) { caches[mode] = viewDraft(); mode = graph.mode ?? 'function'; kind.value = mode; restoreMode(); }
      expression.value = graph?.expression ?? options.getCurrentExpression!();
      linkedExpression = expression.value;
      syncMathfieldFromExpression(true);
      return true;
    } catch {
      linkedExpression = undefined;
      lastPlot = undefined;
      preview.replaceChildren(); preview.hidden = true;
      interaction?.setDisabled(true);
      showError('此公式暂不能绘图。支持 y=f(x)、r=f(theta) 或 z=f(x,y)；不支持隐式方程。请在上方修改公式。',
        'This equation cannot be graphed yet. Use y=f(x), r=f(theta), or z=f(x,y). Implicit equations are not supported. Edit the equation above.');
      return false;
    }
  }

  function refreshCurrentEquation(): void {
    if (!equationLinked || destroyed || inserting) return;
    const previous = linkedExpression, previousMode = mode;
    if (!readCurrentEquation()) { cancelPreview(); return; }
    if (previousMode === mode && previous === linkedExpression && (lastPlot || pendingInput)) return;
    invalidate();
    if (!externalDisabled) schedulePreview();
  }

  function setEquationLinked(linked: boolean): void {
    if (destroyed || externalDisabled || inserting) return;
    const next = linked && Boolean(options.getCurrentExpression || options.getCurrentGraph);
    // Opening an existing standalone graph must keep its restored preview and
    // gesture state. Subject initialization also calls this with false.
    if (next === equationLinked) {
      if (next) refreshCurrentEquation();
      return;
    }
    equationLinked = next;
    if (equationLinked && mode !== 'function') {
      caches[mode] = viewDraft();
      mode = 'function'; kind.value = mode;
      const cached = caches.function;
      for (const key of ['xMin', 'xMax', 'yMin', 'yMax'] as const) rangeInputs[key].value = cached?.[key] ?? String(DEFAULT_PLOT_SPEC[key]);
      home = cached?.home ?? { ...DEFAULT_PLOT_SPEC };
      range.open = cached?.rangeOpen ?? false;
      rawToggle.open = cached?.rawOpen ?? false;
    }
    linkedExpression = undefined;
    syncMathfieldFromExpression(true);
    updateModeUi(); invalidate();
    if (equationLinked) previewGraph();
    else schedulePreview();
  }

  updateModeUi(); refreshDisabled();
  if (draft?.previewed) previewGraph();
  return {
    getDraft: () => ({
      ...viewDraft(), mode, equationLinked, alsoInsertEquation: alsoEquationCheckbox.checked,
      functionDraft: mode === 'function' ? viewDraft() : caches.function,
      complexDraft: mode === 'complex' ? viewDraft() : caches.complex,
      polarDraft: mode === 'polar' ? viewDraft() : caches.polar,
      surfaceDraft: mode === 'surface' ? viewDraft() : caches.surface,
      geometryDraft: mode === 'geometry' ? viewDraft() : caches.geometry,
    }),
    setDisabled(value) { externalDisabled = value; if (value) cancelPreview(); refreshDisabled(); },
    setEquationLinked,
    refreshCurrentEquation,
    destroy() { destroyed = true; cancelPreview(); interaction?.destroy(); surfaceInteraction?.destroy(); plotField.remove(); root.remove(); },
  };
}
