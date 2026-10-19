import { mountEditor } from '../src/editor-ui';
import type { FormulaShortcuts } from '../src/shortcuts';

export async function checkFormulaShortcuts(check: (condition: boolean, message: string) => void): Promise<void> {
  const fixture = document.createElement('div'); document.body.append(fixture);
  let stored: FormulaShortcuts = {}; let reject = false; let writes = 0;
  let mounted: ReturnType<typeof mountEditor> | undefined;
  const settle = async () => { await Promise.resolve(); await new Promise(resolve => setTimeout(resolve, 0)); };
  const open = () => {
    mounted?.destroy();
    mounted = mountEditor(fixture, {
      language: 'en', latex: String.raw`\frac{3}{4}`, shortcuts: stored,
      onShortcutsChange: async value => { if (reject) throw new Error('Fixture storage error'); stored = value; writes++; },
      onSave: () => undefined, onCancel: () => undefined,
    });
  };
  const save = async (name: string) => {
    fixture.querySelector<HTMLInputElement>('[data-testid="shortcut-name"]')!.value = name;
    fixture.querySelector<HTMLButtonElement>('[data-action="shortcut-save"]')!.click(); await settle();
  };
  try {
    open();
    check(fixture.querySelector('[data-testid="formula-shortcuts"]') !== null, '自定义公式快捷词入口出现在公式编辑器中');
    await save('myfrac');
    check(stored.myfrac === String.raw`\frac{3}{4}` && writes === 1, '快捷词保存当前可视化公式，不需要输入 LaTeX');
    check(mounted!.field.inlineShortcuts.myfrac === stored.myfrac && mounted!.getDraft().latex === String.raw`\frac{3}{4}`, '保存快捷词配置 MathLive 展开且不改当前公式');
    const original = stored.myfrac;
    mounted!.field.value = 'x^2'; mounted!.field.dispatchEvent(new Event('input', { bubbles: true }));
    await save('myfrac');
    check(stored.myfrac === original && writes === 1, '重复快捷词不会静默覆盖旧公式');
    await save('sqrt');
    check(writes === 1 && !Object.hasOwn(stored, 'sqrt'), '内置快捷词受到保护');
    mounted!.field.value = String.raw`\frac{}{x}`; mounted!.field.dispatchEvent(new Event('input', { bubbles: true }));
    await save('myempty');
    check(writes === 1 && !Object.hasOwn(stored, 'myempty'), '未完成的公式不能保存为快捷词');
    mounted!.field.value = 'x^2'; mounted!.field.dispatchEvent(new Event('input', { bubbles: true }));
    reject = true; await save('mysquare');
    check(writes === 1 && !Object.hasOwn(stored, 'mysquare') && !Object.hasOwn(mounted!.field.inlineShortcuts, 'mysquare'), '设置写入失败时保留原快捷词，界面不声称保存成功');
    reject = false; open();
    check(mounted!.field.inlineShortcuts.myfrac === original && fixture.querySelector('[data-shortcut="myfrac"]') !== null, '重新打开编辑器后读取已保存快捷词');
    mounted!.field.value = ''; mounted!.field.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.querySelector<HTMLButtonElement>('[data-shortcut="myfrac"]')!.click(); await settle();
    check(mounted!.getDraft().latex === original, '点击快捷词列表可插入之前保存的公式');
    fixture.querySelector<HTMLButtonElement>('[data-shortcut-remove="myfrac"]')!.click(); await settle();
    check(writes === 2 && !Object.hasOwn(stored, 'myfrac') && !Object.hasOwn(mounted!.field.inlineShortcuts, 'myfrac'), '删除快捷词同时清理列表和展开规则');
  } finally { mounted?.destroy(); fixture.remove(); }
}
