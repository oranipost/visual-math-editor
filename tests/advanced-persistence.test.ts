import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlotSpec, serializePlot, findPlotBlocks, planGraphUpdate } from '../src/plot-markdown';
import { DEFAULT_SURFACE_SPEC } from '../src/surface-plot';
import { graphFromLatex } from '../src/plot-latex';
import { compileExpression, DEFAULT_PLOT_SPEC, type PlotSpec } from '../src/plot-engine';

const cases: PlotSpec[] = [
  {...DEFAULT_PLOT_SPEC,mode:'polar',expression:'2*sin(3*theta)',thetaMin:0,thetaMax:4*Math.PI},
  {...DEFAULT_PLOT_SPEC,expression:'x^2',calculus:'derivative'},
  {...DEFAULT_PLOT_SPEC,expression:'sin(x)',calculus:'second-derivative'},
  {...DEFAULT_PLOT_SPEC,expression:'x^2',calculus:'integral',integralMin:0,integralMax:2},
  {...DEFAULT_SURFACE_SPEC,expression:'(x^2-y^2)/10',azimuth:120,elevation:45},
];

test('new graph types round-trip all saved parameters and update only the selected graph',()=>{
  for(const spec of cases){
    const serialized=serializePlot(spec), normalized=parsePlotSpec(serialized.split('\n')[1]);
    assert.equal(normalized.expression,spec.expression);
    for(const key of Object.keys(spec) as (keyof PlotSpec)[]) assert.equal(normalized[key],spec[key],key);
    const note=`# Existing note\n\n${serialized}\n\nUnchanged text\n\n${serialized}\n`;
    const blocks=findPlotBlocks(note); assert.equal(blocks.length,2);
    const target={snapshot:note,from:blocks[1].from,to:blocks[1].to};
    assert.equal(planGraphUpdate(note,target,normalized),serialized);
    const changed={...normalized,...(spec.mode==='polar'?{thetaMax:6*Math.PI}:spec.mode==='surface'?{azimuth:150}:spec.calculus==='integral'?{integralMax:3}:{calculus:'integral' as const,integralMin:0,integralMax:1})};
    const patch=planGraphUpdate(note,target,changed); assert.notEqual(patch,serialized);
    const next=note.slice(0,target.from)+patch+note.slice(target.to);
    assert.equal(findPlotBlocks(next)[0].source,blocks[0].source);
    assert.ok(next.includes('Unchanged text'));
  }
});

test('strict saved settings reject cross-mode and invalid parameters',()=>{
  const source=(spec:unknown)=>JSON.stringify({version:1,...spec as object});
  for(const spec of [
    {...DEFAULT_PLOT_SPEC,mode:'polar',thetaMax:0},
    {...DEFAULT_SURFACE_SPEC,zMin:3,zMax:2},
    {...DEFAULT_SURFACE_SPEC,elevation:0},
    {...DEFAULT_SURFACE_SPEC,calculus:'integral'},
    {...DEFAULT_PLOT_SPEC,calculus:'symbolic'},
    {...DEFAULT_PLOT_SPEC,calculus:'integral',integralMin:2,integralMax:1},
    {...DEFAULT_PLOT_SPEC,mode:'complex',thetaMax:1},
    {...DEFAULT_PLOT_SPEC,mode:'polar',thetaMax:'2*pi'},
    ...[null, ['integral'], {value:'integral'}, 1, true].map(calculus=>({...DEFAULT_PLOT_SPEC,calculus})),
    ...[['polar'], {value:'polar'}].map(mode=>({...DEFAULT_PLOT_SPEC,mode})),
  ]) assert.throws(()=>parsePlotSpec(source(spec)),source(spec));
});

test('current equation conversion identifies explicit polar and XYZ graphs without solving implicit equations',()=>{
  const polar=graphFromLatex(String.raw`r=2\sin(3\theta)`);
  assert.equal(polar.mode,'polar');
  const p=compileExpression(polar.expression,['theta']); assert.ok(p.ok);
  assert.ok(Math.abs(p.evaluate(Math.PI/6)-2)<1e-10);
  const surface=graphFromLatex('z=x^2+y^2'); assert.equal(surface.mode,'surface');
  const z=compileExpression(surface.expression,['x','y']); assert.ok(z.ok); assert.equal(z.evaluate(3,4),25);
  for(const value of ['x^2+y^2+z^2=1','r=x','z=x+t','y=x+y',String.raw`z=\unknown{x}`]) assert.throws(()=>graphFromLatex(value),value);
});
