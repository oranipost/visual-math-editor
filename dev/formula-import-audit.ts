import { mountEditor, type EditorMode } from '../src/editor-ui';
import { FORMULA_IMPORT_CASES, formulaImportStressCases, type FormulaImportCase } from '../tests/fixtures/formula-import-cases';

interface AuditObservation {
  caseId: string;
  group: FormulaImportCase['group'];
  origin: FormulaImportCase['origin'];
  mode: EditorMode;
  inputPath: 'clipboard-event' | 'source-input';
  original: string;
  chars: number;
  intent: string;
  draftBefore: string;
  /** Draft before any explicit import Apply. It is expected to remain the old formula. */
  draft: string;
  stagedOriginal: string | null;
  stagedCandidateDisplay: string | null;
  stagedState: string | null;
  stagedStatus: string | null;
  applyEnabled: boolean;
  applied: boolean;
  applyMs: number | null;
  draftAfterApply: string;
  sourceAfterApply: string;
  serializedAfterApply: string;
  expandedAfterApply: string;
  errorsAfterApply: readonly unknown[];
  source: string;
  serialized: string;
  expanded: string;
  errors: readonly unknown[];
  status: string;
  fieldHidden: boolean;
  saveDisabled: boolean;
  saveLabel: string;
  writes: string[];
  dispatchMs: number;
  settledMs: number;
  exception?: string;
}

const settle = async (): Promise<void> => {
  // Background browser tabs throttle animation frames. This yield observes the
  // synchronous component operation plus one task; it is not a paint benchmark.
  await Promise.resolve();
  await new Promise<void>(resolve => setTimeout(resolve, 0));
};

/** Browser component observations only; no Obsidian writes or native persistence claims. */
export async function runFormulaImportAudit(): Promise<string> {
  const observations: AuditObservation[] = [];
  const skipped: { caseId: string; mode: EditorMode; reason: string }[] = [];
  const modes: EditorMode[] = ['visual', 'hybrid', 'latex'];
  const stressCases = formulaImportStressCases();
  const stopStress = new Set<EditorMode>();
  const fixture = document.createElement('div');
  fixture.className = 'vme-import-audit-fixture';
  fixture.style.cssText = 'position:fixed;left:-20000px;top:0;width:1100px;';
  document.body.append(fixture);
  try {
    for (const item of [...FORMULA_IMPORT_CASES, ...stressCases]) {
      for (const mode of modes) {
        if (item.group === 'stress' && stopStress.has(mode)) {
          skipped.push({ caseId: item.id, mode, reason: 'Earlier stress input exceeded the 300ms synchronous/settled budget.' });
          continue;
        }
        const writes: string[] = [];
        const editor = mountEditor(fixture, {
          latex: String.raw`\frac{5}{8}`, editing: true, initialMode: mode, display: true,
          language: 'en', compact: true,
          onSave: value => { writes.push(value); }, onCancel: () => undefined,
        });
        try {
          await settle();
          const source = fixture.querySelector<HTMLTextAreaElement>('[data-testid="latex-source"]')!;
          const draftBefore = editor.getDraft().latex;
          let exception: string | undefined;
          const start = performance.now();
          try {
            if (mode === 'visual') {
              editor.field.executeCommand('selectAll');
              const data = new DataTransfer();
              data.setData('text/plain', item.source);
              editor.field.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
            } else {
              source.value = item.source;
              source.dispatchEvent(new Event('input', { bubbles: true }));
            }
          } catch (error) { exception = error instanceof Error ? error.message : String(error); }
          const dispatchMs = performance.now() - start;
          await settle();
          const settledMs = performance.now() - start;
          const save = fixture.querySelector<HTMLButtonElement>('[data-action="save"]')!;
          const observation: AuditObservation = {
            caseId: item.id, group: item.group, origin: item.origin, mode,
            inputPath: mode === 'visual' ? 'clipboard-event' : 'source-input',
            original: item.source, chars: item.source.length, intent: item.intent,
            draftBefore, draft: editor.getDraft().latex, source: source.value,
            stagedOriginal: fixture.querySelector<HTMLElement>('[data-testid="formula-import-panel"]')?.hidden === false ? editor.getImportOriginal() : null,
            stagedCandidateDisplay: fixture.querySelector<HTMLTextAreaElement>('[data-testid="import-candidate"]')?.value ?? null,
            stagedState: fixture.querySelector<HTMLElement>('[data-testid="import-status"]')?.dataset.state ?? null,
            stagedStatus: fixture.querySelector<HTMLElement>('[data-testid="import-status"]')?.textContent ?? null,
            applyEnabled: fixture.querySelector<HTMLElement>('[data-testid="formula-import-panel"]')?.hidden === false
              && fixture.querySelector<HTMLButtonElement>('[data-action="import-apply"]')?.disabled === false,
            applied: false, applyMs: null,
            draftAfterApply: editor.getDraft().latex, sourceAfterApply: source.value,
            serializedAfterApply: editor.field.getValue('latex'), expandedAfterApply: editor.field.getValue('latex-expanded'),
            errorsAfterApply: [...editor.field.errors],
            serialized: editor.field.getValue('latex'), expanded: editor.field.getValue('latex-expanded'),
            errors: [...editor.field.errors], status: fixture.querySelector<HTMLElement>('.vme-error')!.textContent ?? '',
            fieldHidden: Boolean(editor.field.hidden), saveDisabled: save.disabled, saveLabel: save.textContent ?? '',
            writes, dispatchMs, settledMs, ...(exception === undefined ? {} : { exception }),
          };
          if (observation.applyEnabled) {
            const applyStart = performance.now();
            fixture.querySelector<HTMLButtonElement>('[data-action="import-apply"]')!.click();
            observation.applyMs = performance.now() - applyStart;
            await settle();
            observation.applied = true;
            observation.draftAfterApply = editor.getDraft().latex;
            observation.sourceAfterApply = source.value;
            observation.serializedAfterApply = editor.field.getValue('latex');
            observation.expandedAfterApply = editor.field.getValue('latex-expanded');
            observation.errorsAfterApply = [...editor.field.errors];
          }
          observations.push(observation);
          if (item.group === 'stress' && (dispatchMs > 300 || settledMs > 300 || (observation.applyMs ?? 0) > 300)) stopStress.add(mode);
        } finally { editor.destroy(); fixture.replaceChildren(); }
      }
    }
  } finally { fixture.remove(); }
  const report = {
    kind: 'browser-component-formula-import-observations',
    generatedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    scope: 'Synthetic clipboard/input events against the real editor component. A staged draft intentionally retains the old equation; support is recorded from stagedState and explicit Apply separately. Textarea display normalizes CRLF; stagedOriginal uses the backing text. dispatchMs and applyMs measure synchronous component work; settledMs includes a zero-delay task yield, not paint/frame latency. No note writes, save/reopen or native integration assertion.',
    safety: { maxStressChars: 8192, maxNestedDepth: 32, stopEscalationOverMs: 300 },
    observations, skipped,
  };
  return JSON.stringify(report, null, 2);
}
