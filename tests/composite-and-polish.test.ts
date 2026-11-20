import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { DEFAULT_GEOMETRY_SPEC } from '../src/geometry-models';
import { translateUiText } from '../src/i18n';
import { resolveReadingMathCandidate } from '../src/math-ranges';
import { configureMathLive, isCompatibleMathfieldConstructor } from '../src/math-runtime';
import type { PlotSpec } from '../src/plot-engine';
import {
  COMPOSITE_TEMPLATES,
  formatPickerGraphRow,
  graphDraftFromSpec,
  matchesPickerGraphSearch,
} from '../src/plot-ui';
import { PERIODIC_ELEMENTS } from '../src/science-data';
import { classifyPeriodicElement, type PeriodicElementCategory } from '../src/science-ui';

const ROOT = join(import.meta.dirname, '..');

test('periodic table classifies all 118 elements into 10 accurate chemical families with matching light/dark CSS', () => {
  assert.equal(PERIODIC_ELEMENTS.length, 118);

  const counts: Record<PeriodicElementCategory, number> = {
    nonmetal: 0,
    halogen: 0,
    noble: 0,
    alkali: 0,
    'alkaline-earth': 0,
    metalloid: 0,
    'post-transition': 0,
    transition: 0,
    lanthanide: 0,
    actinide: 0,
  };

  const bySymbol = new Map<string, PeriodicElementCategory>();
  for (const el of PERIODIC_ELEMENTS) {
    const cat = classifyPeriodicElement(el.number, el.group);
    counts[cat]++;
    bySymbol.set(el.symbol, cat);
  }

  assert.deepEqual(counts, {
    nonmetal: 7,
    halogen: 6,
    noble: 7,
    alkali: 6,
    'alkaline-earth': 6,
    metalloid: 7,
    'post-transition': 11,
    lanthanide: 15,
    actinide: 15,
    transition: 38,
  });

  // Key boundary checks that previously suffered from coarse group-only bucketing
  assert.equal(bySymbol.get('H'), 'nonmetal');
  assert.equal(bySymbol.get('Li'), 'alkali');
  assert.equal(bySymbol.get('Na'), 'alkali');
  assert.equal(bySymbol.get('Be'), 'alkaline-earth');
  assert.equal(bySymbol.get('Mg'), 'alkaline-earth');
  assert.equal(bySymbol.get('Ca'), 'alkaline-earth');
  assert.equal(bySymbol.get('B'), 'metalloid');
  assert.equal(bySymbol.get('Si'), 'metalloid');
  assert.equal(bySymbol.get('Ge'), 'metalloid');
  assert.equal(bySymbol.get('Al'), 'post-transition');
  assert.equal(bySymbol.get('Sn'), 'post-transition');
  assert.equal(bySymbol.get('Pb'), 'post-transition');
  assert.equal(bySymbol.get('Bi'), 'post-transition');
  assert.equal(bySymbol.get('C'), 'nonmetal');
  assert.equal(bySymbol.get('N'), 'nonmetal');
  assert.equal(bySymbol.get('O'), 'nonmetal');
  assert.equal(bySymbol.get('F'), 'halogen');
  assert.equal(bySymbol.get('Cl'), 'halogen');
  assert.equal(bySymbol.get('Br'), 'halogen');
  assert.equal(bySymbol.get('He'), 'noble');
  assert.equal(bySymbol.get('Ne'), 'noble');
  assert.equal(bySymbol.get('Og'), 'noble');
  assert.equal(bySymbol.get('Fe'), 'transition');
  assert.equal(bySymbol.get('Cu'), 'transition');
  assert.equal(bySymbol.get('Au'), 'transition');
  assert.equal(bySymbol.get('La'), 'lanthanide');
  assert.equal(bySymbol.get('Lu'), 'lanthanide');
  assert.equal(bySymbol.get('Ac'), 'actinide');
  assert.equal(bySymbol.get('Lr'), 'actinide');

  const css = readFileSync(join(ROOT, 'styles.css'), 'utf8');
  for (const cat of Object.keys(counts) as PeriodicElementCategory[]) {
    assert.ok(css.includes(`.vme-element-button[data-category="${cat}"]`), `styles.css light rule missing for ${cat}`);
    assert.ok(css.includes(`.theme-dark .vme-editor .vme-element-button[data-category="${cat}"]`), `styles.css dark rule missing for ${cat}`);
  }
  assert.ok(!css.includes('data-category="main"'), 'obsolete coarse main category should be removed');
});

test('EquationPicker graph row formatter and multilingual search handle single & composite 3D geometry without y= artifacts', () => {
  const sphereSpec: PlotSpec = { ...DEFAULT_GEOMETRY_SPEC, geometry: { shape: 'sphere', radius: 2, faces: true } };
  const frustumSpec: PlotSpec = { ...DEFAULT_GEOMETRY_SPEC, geometry: { shape: 'frustum', radius: 2, topRadius: 1, height: 3, faces: true } };
  const towerSpec: PlotSpec = {
    ...DEFAULT_GEOMETRY_SPEC,
    geometry: {
      shape: 'composite',
      faces: true,
      parts: COMPOSITE_TEMPLATES.find(t => t.id === 'tower')!.parts.map(p => ({ ...p })),
    },
  };
  const fnSpec: PlotSpec = { mode: 'function', expression: 'sin(x)', xMin: -5, xMax: 5, yMin: -2, yMax: 2 };
  const surfaceSpec: PlotSpec = { mode: 'surface', expression: '(x^2-y^2)/10', xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
  const complexSpec: PlotSpec = { mode: 'complex', expression: '1+2i\n3-i', xMin: -5, xMax: 5, yMin: -5, yMax: 5 };

  assert.equal(formatPickerGraphRow(sphereSpec, 0), '几何模型 1 · 球体');
  assert.equal(formatPickerGraphRow(frustumSpec, 1), '几何模型 2 · 圆台 / 正棱台');
  assert.equal(formatPickerGraphRow(towerSpec, 2), '几何模型 3 · 组合几何体（2 个部件）');
  assert.equal(formatPickerGraphRow(fnSpec, 0), '图像 1 · y = sin(x)');
  assert.equal(formatPickerGraphRow(surfaceSpec, 1), '图像 2 · z = (x^2-y^2)/10');
  assert.equal(formatPickerGraphRow(complexSpec, 0), '复平面 1 · 1+2i; 3-i');

  for (const spec of [sphereSpec, frustumSpec, towerSpec]) {
    const row = formatPickerGraphRow(spec, 0);
    assert.ok(!row.includes('y ='), `geometry picker row must never show y =: ${row}`);
    for (const lang of ['zh', 'en', 'es', 'ja', 'de', 'fr'] as const) {
      const localized = translateUiText(row, lang);
      assert.ok(!localized.includes('y ='), `${lang}: ${localized}`);
    }
  }

  // Search matches across all 6 languages (including accent-insensitive French/Spanish) and composite child shapes
  for (const query of ['球体', 'sphere', 'esfera', 'sphère', 'sphere', 'kugel', 'geometry']) {
    assert.equal(matchesPickerGraphSearch(sphereSpec, 0, query), true, `sphere should match "${query}"`);
  }
  for (const query of ['圆台', 'frustum', 'tronco', '円錐台', 'kegelstumpf', 'tronc']) {
    assert.equal(matchesPickerGraphSearch(frustumSpec, 1, query), true, `frustum should match "${query}"`);
  }
  for (const query of ['组合', 'composite', 'compuesto', '複合', 'zusammengesetzt', 'cone', '圆锥', 'kegel', 'cylinder', '圆柱']) {
    assert.equal(matchesPickerGraphSearch(towerSpec, 2, query), true, `composite tower should match "${query}"`);
  }
  assert.equal(matchesPickerGraphSearch(towerSpec, 2, 'pyramid'), false);

  const mainSource = readFileSync(join(ROOT, 'src/main.ts'), 'utf8');
  assert.match(mainSource, /formatPickerGraphRow\(/);
  assert.match(mainSource, /matchesPickerGraphSearch\(/);
});

test('graphDraftFromSpec preserves hemisphere, circular/polygonal frustum, and composite parts cleanly', () => {
  const circularFrustumDraft = graphDraftFromSpec({
    ...DEFAULT_GEOMETRY_SPEC,
    azimuth: 60,
    elevation: 35,
    geometryZoom: 1.5,
    geometry: { shape: 'frustum', radius: 2.4, topRadius: 1.2, height: 3.5, faces: true },
  });
  assert.equal(circularFrustumDraft.geometry?.shape, 'frustum');
  assert.equal(circularFrustumDraft.geometry?.radius, '2.4');
  assert.equal(circularFrustumDraft.geometry?.topRadius, '1.2');
  assert.equal(circularFrustumDraft.geometry?.height, '3.5');
  assert.equal(circularFrustumDraft.geometry?.sides, undefined);

  const compositeDraft = graphDraftFromSpec({
    ...DEFAULT_GEOMETRY_SPEC,
    geometry: {
      shape: 'composite',
      faces: true,
      parts: [
        { shape: 'cone', radius: 3, height: 4, offset: { x: 0, y: 0, z: 0 }, rotation: { x: 180, y: 0, z: 0 }, style: 'translucent', color: 'indigo' },
        { shape: 'sphere', radius: 1.5, offset: { x: 0, y: 0, z: -0.5 }, rotation: { x: 0, y: 0, z: 0 }, style: 'solid', color: 'rose' },
      ],
    },
  });
  assert.equal(compositeDraft.geometry?.shape, 'composite');
  assert.equal(compositeDraft.geometry?.parts?.length, 2);
  assert.equal(compositeDraft.geometry?.parts?.[0]?.rotX, '180');
  assert.equal(compositeDraft.geometry?.parts?.[0]?.style, 'translucent');
  assert.equal(compositeDraft.geometry?.parts?.[1]?.offsetZ, '-0.5');
  assert.equal(compositeDraft.geometry?.parts?.[1]?.color, 'rose');
});

test('saved plot block toolbar groups view vs action buttons and hides Save view until dirty', () => {
  const mainSource = readFileSync(join(ROOT, 'src/main.ts'), 'utf8');
  assert.match(mainSource, /saved-plot-view-group/);
  assert.match(mainSource, /saved-plot-action-group/);
  assert.match(mainSource, /save\.hidden = !dirty/);

  const css = readFileSync(join(ROOT, 'styles.css'), 'utf8');
  assert.doesNotMatch(css, /display\s*:\s*contents/i, 'styles.css must not use display: contents (triggers Obsidian css-display-contents warning)');
  assert.doesNotMatch(css, /url\s*\(/i, 'styles.css must not use url(...) data URIs');
  assert.match(css, /\.vme-saved-plot-view-group/);
  assert.match(css, /\.vme-saved-plot-action-group/);
  assert.match(css, /\.vme-rendered-plot \[hidden\]\s*\{\s*display:\s*none;/);
  assert.match(css, /\.theme-dark svg\[data-vme-plot\] \[stroke="#b91c1c"\]/);
  assert.match(css, /\.theme-dark svg\[data-vme-plot\] \[fill="#b91c1c"\]/);
  assert.match(css, /\.theme-dark svg\[data-vme-plot\] g\[stroke="#64748b"\]/);
  assert.match(css, /\.theme-dark svg\[data-vme-plot\] g\[fill="#64748b"\]/);
  assert.match(css, /\.theme-dark svg\[data-vme-plot\] path\[stroke="#64748b"\]/);
  for (const color of ['indigo', 'teal', 'amber', 'rose', 'slate']) {
    assert.match(css, new RegExp(`\\.vme-composite-part-card\\[data-part-color="${color}"\\]`));
  }
});

test('MathJax 4.1.3 Reading View candidate resolution works without <annotation> and guards stale/mismatched sections', () => {
  const note = 'Intro\n\nInline $a+b$ and $c^2$ here.\n\n$$\n\\int_0^1 x\\,dx\n$$\n';
  const sectionInline = { text: note, lineStart: 2, lineEnd: 2 };
  const sectionDisplay = { text: note, lineStart: 4, lineEnd: 6 };

  // MathJax 4.1.3 CHTML default: annotationText === null -> resolves exact formula by verified section + count bijection
  const hit0 = resolveReadingMathCandidate(note, sectionInline, 2, 0, null);
  const hit1 = resolveReadingMathCandidate(note, sectionInline, 2, 1, null);
  const hitDisplay = resolveReadingMathCandidate(note, sectionDisplay, 1, 0, null);
  assert.equal(hit0?.latex, 'a+b');
  assert.equal(hit1?.latex, 'c^2');
  assert.equal(hitDisplay?.latex.trim(), '\\int_0^1 x\\,dx');

  // Legacy / annotation-present DOM: matching annotation succeeds, mismatched annotation falls back to null (EquationPicker)
  assert.equal(resolveReadingMathCandidate(note, sectionInline, 2, 1, ' c^2 ')?.latex, 'c^2');
  assert.equal(resolveReadingMathCandidate(note, sectionInline, 2, 1, 'wrong'), null);

  // Stale snapshot or DOM count mismatch safely falls back to null
  assert.equal(resolveReadingMathCandidate(note + 'edited', sectionInline, 2, 0, null), null);
  assert.equal(resolveReadingMathCandidate(note, sectionInline, 3, 0, null), null);
});

test('configureMathLive safely coexists with compatible cross-version math-field constructors and rejects broken ones', () => {
  class CompatibleOtherPluginMathfield {
    static version = '0.109.0-other-plugin';
    static fontsDirectory: string | null = 'https://cdn.example.invalid';
    static soundsDirectory: string | null = 'https://cdn.example.invalid';
    static computeEngine: unknown = {};
    getValue(): string { return ''; }
    setValue(): void {}
    insert(): boolean { return true; }
    executeCommand(): boolean { return true; }
  }

  assert.equal(isCompatibleMathfieldConstructor(CompatibleOtherPluginMathfield), true);
  assert.doesNotThrow(() => {
    configureMathLive({
      get: (name: string) => (name === 'math-field' ? (CompatibleOtherPluginMathfield as unknown as CustomElementConstructor) : undefined),
    });
  });
  assert.equal(CompatibleOtherPluginMathfield.fontsDirectory, null);
  assert.equal(CompatibleOtherPluginMathfield.soundsDirectory, null);
  assert.equal(CompatibleOtherPluginMathfield.computeEngine, null);

  class IncompatibleElement {}
  assert.equal(isCompatibleMathfieldConstructor(IncompatibleElement), false);
  assert.throws(() => {
    configureMathLive({
      get: (name: string) => (name === 'math-field' ? (IncompatibleElement as unknown as CustomElementConstructor) : undefined),
    });
  }, /math-field/);
});
