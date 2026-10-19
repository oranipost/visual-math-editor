import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view";
import { mountEditor, type EditorDraft } from "./editor-ui";
import { resolveLanguage, translateUiText, type Language } from "./i18n";
import type { PlotSpec } from "./plot-engine";
import { createHtml } from "./dom";

export type InlineDraft = EditorDraft;
export interface InlineSession {
  id: number;
  draft: InlineDraft;
  editing: boolean;
  graphOnly?: boolean;
  language: Language;
  systemLanguage?: string;
  onLanguageChange: (language: Language) => void | Promise<void>;
  onSave: (latex: string, display: boolean) => void;
  onSaveGraph: (spec: PlotSpec, latex: string, display: boolean) => void;
  onCancel: () => void;
}
const openPanel = StateEffect.define<{ anchor: number; session: InlineSession }>();
const closePanel = StateEffect.define<null>();

class EquationWidget extends WidgetType {
  private mounted?: ReturnType<typeof mountEditor>;
  private frame?: number;
  private observer?: ResizeObserver;
  constructor(private session: InlineSession) { super(); }
  eq(other: EquationWidget): boolean { return other.session.id === this.session.id; }
  toDOM(view: EditorView): HTMLElement {
    const panel = createHtml("div", view.dom.ownerDocument);
    panel.className = "vme-inline-panel";
    panel.contentEditable = "false";
    panel.setAttribute("role", "region");
    const updateLabel = () => panel.setAttribute("aria-label", translateUiText(
      "笔记内公式编辑器",
      resolveLanguage(this.session.language, this.session.systemLanguage ?? panel.ownerDocument.defaultView?.navigator.language ?? 'en'),
    ));
    updateLabel();
    panel.dataset.testid = "inline-equation-editor";
    this.frame = window.requestAnimationFrame(() => {
      this.frame = undefined;
      if (!panel.isConnected) return;
      this.mounted = mountEditor(panel, {
        latex: this.session.draft.latex,
        display: this.session.draft.display,
        initialMode: this.session.draft.mode,
        scienceDraft: this.session.draft.science,
        plotDraft: this.session.draft.plot,
        graphOnly: this.session.graphOnly,
        compact: true,
        editing: this.session.editing,
        language: this.session.language,
        systemLanguage: this.session.systemLanguage,
        onLanguageChange: language => {
          this.session.language = language;
          updateLabel();
          return this.session.onLanguageChange(language);
        },
        onSave: this.session.onSave,
        onSaveGraph: this.session.onSaveGraph,
        onCancel: this.session.onCancel,
      });
      this.observer = new ResizeObserver(() => view.requestMeasure());
      this.observer.observe(panel);
      view.requestMeasure();
    });
    return panel;
  }
  ignoreEvent(): boolean { return true; }
  destroy(): void {
    if (this.frame !== undefined) window.cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    if (this.mounted) {
      this.session.draft = this.mounted.getDraft();
      this.mounted.destroy();
      this.mounted = undefined;
    }
  }
}

export const inlineEditorField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    let result = decorations.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (effect.is(closePanel)) result = Decoration.none;
      if (effect.is(openPanel)) {
        result = Decoration.set([Decoration.widget({ widget: new EquationWidget(effect.value.session), block: true, side: 1 }).range(effect.value.anchor)]);
      }
    }
    return result;
  },
  provide: field => EditorView.decorations.from(field),
});

export function showInlineEditor(view: EditorView, targetEnd: number, session: InlineSession): void {
  const anchor = view.state.doc.lineAt(targetEnd).to;
  view.dispatch({ effects: [openPanel.of({ anchor, session }), EditorView.scrollIntoView(anchor, { y: "center" })] });
}

export function hideInlineEditor(view: EditorView): void {
  if (view.state.field(inlineEditorField, false)) view.dispatch({ effects: closePanel.of(null) });
}

/** Bring an existing draft back without replacing its state or changing text. */
export function focusInlineEditor(view: EditorView): void {
  const decorations = view.state.field(inlineEditorField, false);
  if (!decorations?.size) return;
  const anchor = decorations.iter().from;
  view.dispatch({ effects: EditorView.scrollIntoView(anchor, { y: "center" }) });
  const focus = () => {
    const panel = view.dom.querySelector<HTMLElement>('[data-testid="inline-equation-editor"]');
    if (!panel?.isConnected) return;
    panel.scrollIntoView({ block: "center", inline: "nearest" });
    const source = panel.querySelector<HTMLTextAreaElement>('[data-testid="latex-source"]');
    const field = panel.querySelector<HTMLElement>('[data-testid="equation-field"]');
    const mode = panel.querySelector<HTMLElement>('[data-testid="visual-math-editor"]')?.dataset.mode;
    if (panel.querySelector<HTMLElement>('[data-testid="visual-math-editor"]')?.dataset.subject === 'graph') {
      const complex = panel.querySelector<HTMLTextAreaElement>('[data-testid="complex-points"]');
      (complex && !complex.hidden ? complex : panel.querySelector<HTMLInputElement>('[data-testid="plot-expression"]'))?.focus({ preventScroll: true }); return;
    }
    if (mode === "latex" || field?.hidden) source?.focus({ preventScroll: true });
    else field?.focus({ preventScroll: true });
  };
  // A virtualized widget mounts on its own frame after the scroll transaction.
  view.dom.ownerDocument.defaultView?.requestAnimationFrame(() => {
    view.dom.ownerDocument.defaultView?.requestAnimationFrame(focus);
  });
}
