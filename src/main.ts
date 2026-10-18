import { EditorView } from "@codemirror/view";
import {
  editorInfoField, getLanguage, MarkdownRenderChild, MarkdownView, Modal, Notice, Plugin,
  type Editor, type MarkdownPostProcessorContext,
} from "obsidian";
import { mountEditor } from "./editor-ui";
import { configureMathLive, createPreview } from "./math-runtime";
import { findMathRanges, isMathInsertionAllowed, mathAtSelection, type MathRange } from "./math-ranges";
import { planWrite, type WriteTarget } from "./write-plan";
import { focusInlineEditor, hideInlineEditor, inlineEditorField, showInlineEditor, type InlineDraft, type InlineSession } from "./inline-editor";
import { localizeEditor, resolveLanguage, translateUiText, type Language } from "./i18n";
import type { PlotSpec } from "./plot-engine";
import { createGraph } from "./graph-render";
import { controlIcon, type ControlIcon } from "./ui-icons";
import { formatComplex, parseComplexNumbers } from "./complex-plane";
import { mountPlotInteraction, zoomPlotBounds, type PlotBounds } from "./plot-interaction";
import { canAppendAfterGraph, findPlotBlocks, parsePlotSpec, planGraphInsert, planGraphUpdate, type PlotBlock } from "./plot-markdown";
import type { PlotDraft } from "./plot-ui";

function graphDraft(spec: PlotSpec): PlotDraft {
  return { mode: spec.mode ?? 'function', expression: spec.expression, xMin: String(spec.xMin), xMax: String(spec.xMax), yMin: String(spec.yMin), yMax: String(spec.yMax), previewed: true };
}

class EquationModal extends Modal {
  private cleanup?: () => void;
  private pluginPath: string | undefined;
  constructor(private plugin: VisualMathEditor, private view: MarkdownView, private target: WriteTarget, private range?: MathRange) {
    super(plugin.app);
    this.pluginPath = view.file?.path;
  }
  onOpen(): void {
    this.modalEl.addClass("vme-modal");
    this.setTitle(this.plugin.text(this.range ? "编辑公式" : "插入公式"));
    this.cleanup = mountEditor(this.contentEl, {
      latex: this.range?.latex,
      display: this.range?.display ?? true,
      editing: !!this.range,
      language: this.plugin.language,
      systemLanguage: this.plugin.systemLanguage(),
      onLanguageChange: language => this.plugin.setLanguage(language),
      onCancel: () => this.close(),
      onSaveGraph: (spec, latex, display) => {
        if (!this.plugin.isLoaded || this.view.file?.path !== this.pluginPath || this.view.getMode() !== "source" || !this.view.containerEl.isConnected) throw new Error("原笔记已关闭或切换，请取消后重新打开公式。");
        const editor = this.view.editor;
        const replacement = planGraphInsert(editor.getValue(), this.target, spec, latex, display, this.range);
        editor.replaceRange(replacement, editor.offsetToPos(this.target.from), editor.offsetToPos(this.target.to));
        this.close(); editor.focus();
      },
      onSave: (latex, display) => {
        if (!this.plugin.isLoaded || this.view.file?.path !== this.pluginPath || this.view.getMode() !== "source" || !this.view.containerEl.isConnected) {
          throw new Error("原笔记已关闭或切换，请取消后重新打开公式。");
        }
        const editor = this.view.editor;
        if (editor.getValue() !== this.target.snapshot) {
          throw new Error("笔记已发生变化。为避免覆盖内容，请取消后重新打开公式。");
        }
        if (this.range && latex === this.range.latex && display === this.range.display) {
          this.close();
          return;
        }
        const replacement = planWrite(editor.getValue(), this.target, latex, display);
        if (this.range && replacement === this.target.snapshot.slice(this.target.from, this.target.to)) {
          this.close();
          return;
        }
        // One editor operation: native Obsidian Undo restores the previous text.
        editor.replaceRange(replacement, editor.offsetToPos(this.target.from), editor.offsetToPos(this.target.to));
        this.close();
        editor.focus();
      },
    }).destroy;
  }
  onClose(): void { this.cleanup?.(); this.contentEl.empty(); this.plugin.modals.delete(this); }
}

class EquationPicker extends Modal {
  private page = 0;
  private localization?: ReturnType<typeof localizeEditor>;
  constructor(private plugin: VisualMathEditor, private view: MarkdownView, private snapshot: string, private ranges: MathRange[]) { super(plugin.app); }
  onOpen(): void {
    this.modalEl.addClass("vme-modal");
    this.setTitle(this.plugin.text("选择要编辑的公式"));
    this.render();
    this.localization = this.plugin.localize(this.contentEl);
  }
  private render(): void {
    this.contentEl.empty();
    const insert = this.contentEl.createEl("button", { text: "＋ 在笔记末尾插入公式", cls: "mod-cta" });
    insert.onclick = () => { this.close(); void this.plugin.insertAtEnd(this.view, this.snapshot); };
    const hint = this.contentEl.createEl("p", { text: "点击公式重新编辑。公式按笔记中的位置排列。", cls: "vme-muted" });
    const graphs = findPlotBlocks(this.snapshot);
    if (!this.ranges.length && !graphs.length) { hint.textContent = "这篇笔记还没有公式，点击上方按钮开始。"; return; }
    const list = this.contentEl.createDiv({ cls: "vme-picker" });
    const size = 12;
    this.ranges.slice(this.page * size, (this.page + 1) * size).forEach((range, index) => {
      const row = list.createEl("button", { cls: "vme-picker-row" });
      row.setAttribute("aria-label", `编辑第 ${this.page * size + index + 1} 个公式`);
      row.createSpan({ text: `${this.page * size + index + 1}`, cls: "vme-picker-number" });
      try {
        const preview = createPreview(range.latex, row);
        if (preview.errors.length) throw new Error("Unsupported formula");
      } catch {
        row.querySelector("math-field")?.remove();
        row.createSpan({ text: "暂不支持的公式（原文保留）" });
      }
      const line = this.snapshot.slice(0, range.from).split("\n").length;
      row.createSpan({ text: `第 ${line} 行 · ${range.display ? "独立公式" : "行内公式"}`, cls: "vme-picker-location" });
      row.addEventListener("click", () => { this.close(); void this.plugin.editRange(this.view, this.snapshot, range); });
    });
    if (this.page === 0) graphs.forEach((graph, index) => {
      const row = list.createEl('button', { cls: 'vme-picker-row' });
      const summary = graph.spec.mode === 'complex' ? graph.spec.expression.replace(/\n/g, '; ') : `y = ${graph.spec.expression}`;
      row.textContent = `${graph.spec.mode === 'complex' ? '复平面' : '图像'} ${index + 1} · ${summary}`;
      row.dataset.i18nEn = `${graph.spec.mode === 'complex' ? 'Complex plane' : 'Graph'} ${index + 1} · ${summary}`;
      row.addEventListener('click', () => { this.close(); void this.plugin.editPlot(this.view, this.snapshot, graph); });
    });
    if (this.ranges.length > size) {
      const footer = this.contentEl.createDiv({ cls: "vme-picker-pages" });
      const prev = footer.createEl("button", { text: "上一页" });
      prev.disabled = this.page === 0;
      prev.onclick = () => { this.page--; this.render(); };
      footer.createSpan({ text: `${this.page + 1} / ${Math.ceil(this.ranges.length / size)}` });
      const next = footer.createEl("button", { text: "下一页" });
      next.disabled = (this.page + 1) * size >= this.ranges.length;
      next.onclick = () => { this.page++; this.render(); };
    }
  }
  onClose(): void { this.localization?.destroy(); this.contentEl.empty(); this.plugin.modals.delete(this); }
}

export default class VisualMathEditor extends Plugin {
  modals = new Set<Modal>();
  isLoaded = false;
  language: Language = "system";
  private pluginSettings: Record<string, unknown> = {};
  private inline?: EditorView;
  private inlineView?: MarkdownView;
  private headerActions = new Map<MarkdownView, HTMLElement>();
  private inlinePath?: string;
  private inlineSession?: InlineSession;
  private recoveredDraft?: InlineDraft;
  private nextSessionId = 1;
  private localizations = new Set<ReturnType<typeof localizeEditor>>();
  private ribbonAction?: HTMLElement;

  async onload(): Promise<void> {
    const data: unknown = await this.loadData();
    if (data && typeof data === "object" && !Array.isArray(data)) this.pluginSettings = data as Record<string, unknown>;
    if (["system", "zh", "en"].includes(String(this.pluginSettings.language))) this.language = this.pluginSettings.language as Language;
    try { configureMathLive(); } catch (error) { this.notify(String(error)); throw error; }
    this.isLoaded = true;
    this.ribbonAction = this.addRibbonIcon("sigma", this.text("Visual Math Editor：插入或编辑公式"), () => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view?.file) { this.notify("请先打开一篇 Markdown 笔记。"); return; }
      this.activate(view);
    });
    this.app.workspace.onLayoutReady(() => this.refreshHeaderActions());
    this.registerEvent(this.app.workspace.on("layout-change", () => this.refreshHeaderActions()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.refreshHeaderActions()));
    this.addCommand({
      id: "insert-or-edit-equation", name: "插入或编辑公式 / Insert or edit equation",
      editorCallback: (editor, context) => {
        if (context instanceof MarkdownView) this.openAtCursor(editor, context);
        else this.notify("请在普通 Markdown 笔记中使用公式编辑器。");
      },
    });
    this.addCommand({
      id: "open-equation-dialog", name: "在弹窗中插入或编辑公式 / Open equation dialog",
      editorCallback: (editor, context) => {
        if (context instanceof MarkdownView) this.openAtCursor(editor, context, true);
      },
    });
    this.addCommand({
      id: "recover-equation-draft", name: "恢复公式草稿 / Recover equation draft",
      editorCallback: (editor, context) => {
        if (!(context instanceof MarkdownView) || !this.recoveredDraft) { this.notify("没有暂存的公式草稿。"); return; }
        const snapshot = editor.getValue();
        const from = editor.posToOffset(editor.getCursor());
        if (!isMathInsertionAllowed(snapshot, from) || mathAtSelection(snapshot, from, from)) { this.notify("请先点击普通正文中的新插入位置。"); return; }
        this.openEditor(context, { snapshot, from, to: from }, undefined, false, this.recoveredDraft);
      },
    });
    this.registerEvent(this.app.workspace.on("file-open", file => {
      if (this.inline && this.inlinePath !== file?.path) {
        const session = this.inlineSession;
        hideInlineEditor(this.inline);
        if (session) this.recoveredDraft = { ...session.draft };
        this.inline = undefined;
        this.inlineView = undefined;
        this.inlineSession = undefined;
        this.notify("公式草稿已暂存。可用“恢复公式草稿”命令在新位置继续编辑；重启前请保存。");
      }
    }));
    this.addCommand({
      id: "choose-equation", name: "编辑本笔记公式 / Choose equation to edit",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view?.file) return false;
        if (!checking) void this.showPicker(view);
        return true;
      },
    });
    this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor, context) => {
      if (!(context instanceof MarkdownView)) return;
      menu.addItem(item => item.setTitle(this.text("可视化插入／编辑公式")).setIcon("sigma").onClick(() => this.openAtCursor(editor, context)));
    }));
    this.registerEditorExtension([inlineEditorField, EditorView.domEventHandlers({
      dblclick: (event, cm) => {
        const element = event.target instanceof Element ? event.target : null;
        if (!element?.closest(".math, mjx-container, .cm-math")) return false;
        const info = cm.state.field(editorInfoField, false);
        if (!(info instanceof MarkdownView) || !info.file) return false;
        const source = info.editor.getValue();
        const pos = cm.posAtCoords({ x: event.clientX, y: event.clientY });
        const range = pos === null ? null : mathAtSelection(source, pos, pos);
        event.preventDefault();
        if (range) void this.editRange(info, source, range);
        else void this.showPicker(info);
        return true;
      },
    })]);
    this.registerMarkdownPostProcessor((element, context) => this.attachReadingMath(element, context));
    this.registerMarkdownCodeBlockProcessor("vme-plot", (source, element, context) => this.renderPlot(source, element, context));
  }

  onunload(): void {
    this.isLoaded = false;
    if (this.inline) hideInlineEditor(this.inline);
    this.inline = undefined;
    this.inlineView = undefined;
    for (const action of this.headerActions.values()) action.remove();
    this.headerActions.clear();
    for (const modal of [...this.modals]) modal.close();
    this.modals.clear();
    for (const localization of this.localizations) localization.destroy();
    this.localizations.clear();
  }

  /** Follow Obsidian's chosen language; older supported hosts use the browser locale. */
  systemLanguage(): string {
    return (typeof getLanguage === 'function' && getLanguage()) || navigator.language;
  }

  text(message: string): string { return translateUiText(message, resolveLanguage(this.language, this.systemLanguage())); }

  /** Track plugin-owned UI only, so language changes never touch a note or reset a graph draft. */
  localize(root: HTMLElement): ReturnType<typeof localizeEditor> {
    const localization = localizeEditor(root, this.language, this.systemLanguage());
    this.localizations.add(localization);
    return {
      setLanguage: language => localization.setLanguage(language),
      destroy: () => { localization.destroy(); this.localizations.delete(localization); },
    };
  }

  private notify(message: string): void { new Notice(this.text(message)); }

  async setLanguage(language: Language): Promise<void> {
    this.language = language;
    this.pluginSettings.language = language;
    this.refreshHeaderActions();
    this.ribbonAction?.setAttribute('aria-label', this.text('Visual Math Editor：插入或编辑公式'));
    for (const localization of this.localizations) localization.setLanguage(language);
    try { await this.saveData(this.pluginSettings); }
    catch { this.notify("无法保存语言偏好 / Unable to save language preference"); }
  }

  private present(modal: Modal): void { this.modals.add(modal); modal.open(); }

  private activate(view: MarkdownView): void {
    if (this.resumeInline()) return;
    if (this.modals.size) return;
    if (view.getMode() === "preview") void this.showPicker(view);
    else this.openAtCursor(view.editor, view);
  }

  private resumeInline(): boolean {
    if (!this.inline) return false;
    if (!this.inline.dom.isConnected || this.inlineView?.getMode() !== "source") {
      // Removing the widget first flushes its latest visible and science drafts.
      hideInlineEditor(this.inline);
      if (this.inlineSession) this.recoveredDraft = { ...this.inlineSession.draft };
      this.inline = undefined;
      this.inlineView = undefined;
      this.inlineSession = undefined;
      if (this.recoveredDraft && (this.recoveredDraft.latex.trim() || this.recoveredDraft.science?.chemistry.trim() || this.recoveredDraft.science?.units.trim())) this.notify("公式草稿已暂存。可用“恢复公式草稿”命令在新位置继续编辑；重启前请保存。");
      return false;
    }
    if (this.inlineView) this.app.workspace.setActiveLeaf(this.inlineView.leaf, { focus: false });
    focusInlineEditor(this.inline);
    return true;
  }

  private refreshHeaderActions(): void {
    if (!this.isLoaded) return;
    const views = new Set(this.app.workspace.getLeavesOfType("markdown").map(leaf => leaf.view).filter((view): view is MarkdownView => view instanceof MarkdownView));
    for (const [view, action] of this.headerActions) {
      if (!views.has(view) || !action.isConnected) { action.remove(); this.headerActions.delete(view); }
    }
    const label = this.text("Visual Math Editor：插入或编辑公式");
    for (const view of views) {
      let action = this.headerActions.get(view);
      if (!action) {
        action = view.addAction("sigma", label, () => this.activate(view));
        action.dataset.testid = "vme-note-action";
        action.setAttribute("role", "button");
        action.tabIndex = 0;
        // A toolbar click must preserve CodeMirror's cursor and selection.
        this.registerDomEvent(action, "mousedown", event => { if (event.button === 0) event.preventDefault(); });
        this.registerDomEvent(action, "keydown", event => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); this.activate(view); }
        });
        this.headerActions.set(view, action);
      }
      action.setAttribute("aria-label", label);
    }
  }

  private openAtCursor(editor: Editor, view: MarkdownView, dialog = false): void {
    if (this.resumeInline()) return;
    if (this.modals.size) return;
    const snapshot = editor.getValue();
    const from = editor.posToOffset(editor.getCursor("from"));
    const to = editor.posToOffset(editor.getCursor("to"));
    const range = mathAtSelection(snapshot, from, to);
    const graph = findPlotBlocks(snapshot).find(block => from >= block.from && to <= block.to);
    if (graph) { void this.editPlot(view, snapshot, graph); return; }
    if (range) { void this.editRange(view, snapshot, range, dialog); return; }
    if (from !== to) { this.notify("请选择一个已有公式，或先点击要插入公式的位置。"); return; }
    if (!isMathInsertionAllowed(snapshot, from)) { this.notify("请在普通笔记正文中插入公式，代码、属性和链接地址内暂不支持。"); return; }
    this.openEditor(view, { snapshot, from, to }, undefined, dialog);
  }

  async showPicker(view: MarkdownView): Promise<void> {
    if (this.resumeInline()) return;
    if (!view.file || this.modals.size || !this.isLoaded) return;
    const path = view.file.path;
    const snapshot = view.getMode() === "source" ? view.editor.getValue() : await this.app.vault.read(view.file);
    if (!this.isLoaded || !view.containerEl.isConnected || view.file?.path !== path || this.modals.size) return;
    this.present(new EquationPicker(this, view, snapshot, findMathRanges(snapshot)));
  }

  async insertAtEnd(view: MarkdownView, snapshot: string): Promise<void> {
    if (!this.isLoaded || this.modals.size || !view.file || this.resumeInline()) return;
    const path = view.file.path;
    if (view.getMode() === "preview") {
      const state = view.leaf.getViewState();
      await view.leaf.setViewState({ ...state, state: { ...state.state, mode: "source", source: false } });
    }
    if (!this.isLoaded || this.modals.size || !view.containerEl.isConnected || view.getMode() !== "source") return;
    if (view.file?.path !== path || view.editor.getValue() !== snapshot) { this.notify("笔记已变化，请重新选择公式。"); return; }
    if (!isMathInsertionAllowed(snapshot, snapshot.length) && !canAppendAfterGraph(snapshot, snapshot.length)) { this.notify("请在普通笔记正文中插入公式，代码、属性和链接地址内暂不支持。"); return; }
    view.editor.setCursor(view.editor.offsetToPos(snapshot.length));
    this.openEditor(view, { snapshot, from: snapshot.length, to: snapshot.length });
  }

  async editRange(view: MarkdownView, snapshot: string, range: MathRange, dialog = false): Promise<void> {
    if (!this.isLoaded || this.modals.size || !view.file) return;
    const path = view.file.path;
    if (view.getMode() === "preview") {
      const state = view.leaf.getViewState();
      await view.leaf.setViewState({ ...state, state: { ...state.state, mode: "source", source: false } });
    }
    if (!this.isLoaded || this.modals.size || !view.containerEl.isConnected || view.getMode() !== "source") return;
    if (view.file?.path !== path || view.editor.getValue() !== snapshot) {
      this.notify("笔记已变化，请重新选择公式。"); return;
    }
    this.openEditor(view, { snapshot, from: range.from, to: range.to }, range, dialog);
  }

  private openEditor(view: MarkdownView, target: WriteTarget, range?: MathRange, dialog = false, draft?: InlineDraft, plot?: PlotBlock): void {
    const cm = (view.editor as Editor & { cm?: EditorView }).cm;
    if (cm && cm.dom.ownerDocument !== document) {
      this.notify("第一版请在 Obsidian 主窗口中编辑公式。"); return;
    }
    if (this.inline && this.resumeInline()) return;
    if (dialog || !cm || !cm.state.field(inlineEditorField, false)) {
      if (plot) { this.notify('请在主窗口的笔记编辑模式中重新打开图像。'); return; }
      this.present(new EquationModal(this, view, target, range)); return;
    }
    const path = view.file?.path;
    if (range) view.editor.setCursor(view.editor.offsetToPos(range.from > 0 ? range.from - 1 : range.to));
    this.inline = cm;
    this.inlineView = view;
    this.inlinePath = path;
    const session: InlineSession = {
      id: this.nextSessionId++, editing: !!range, graphOnly: Boolean(plot),
      language: this.language,
      systemLanguage: this.systemLanguage(),
      onLanguageChange: language => this.setLanguage(language),
      draft: draft ? { ...draft } : { latex: range?.latex ?? "", display: range?.display ?? true, mode: "visual" },
      onCancel: () => { hideInlineEditor(cm); this.inline = undefined; this.inlineView = undefined; this.inlineSession = undefined; cm.focus(); },
      onSave: (latex, display) => {
        if (plot) throw new Error('Use Save graph to update this graph.');
        if (!this.isLoaded || view.file?.path !== path || view.getMode() !== "source" || !view.containerEl.isConnected) {
          throw new Error("原笔记已关闭或切换，请取消后重新打开公式。");
        }
        const editor = view.editor;
        if (editor.getValue() !== target.snapshot) {
          throw new Error("笔记已变化，草稿仍保留。为避免覆盖，请复制草稿后取消并重新打开公式。");
        }
        if (range && latex === range.latex && display === range.display) {
          hideInlineEditor(cm); this.inline = undefined; this.inlineView = undefined; this.inlineSession = undefined; cm.focus(); return;
        }
        const replacement = planWrite(editor.getValue(), target, latex, display);
        editor.replaceRange(replacement, editor.offsetToPos(target.from), editor.offsetToPos(target.to));
        hideInlineEditor(cm); this.inline = undefined; this.inlineView = undefined; this.inlineSession = undefined; this.recoveredDraft = undefined; cm.focus();
      },
      onSaveGraph: (spec, latex, display) => {
        if (!this.isLoaded || view.file?.path !== path || view.getMode() !== "source" || !view.containerEl.isConnected) throw new Error("原笔记已关闭或切换，请取消后重新打开公式。");
        const editor = view.editor;
        const replacement = plot ? planGraphUpdate(editor.getValue(), target, spec) : planGraphInsert(editor.getValue(), target, spec, latex, display, range);
        if (replacement !== target.snapshot.slice(target.from, target.to)) editor.replaceRange(replacement, editor.offsetToPos(target.from), editor.offsetToPos(target.to));
        hideInlineEditor(cm); this.inline = undefined; this.inlineView = undefined; this.inlineSession = undefined; this.recoveredDraft = undefined; cm.focus();
      },
    };
    this.inlineSession = session;
    showInlineEditor(cm, target.to, session);
  }

  async editPlot(view: MarkdownView, snapshot: string, plot: PlotBlock): Promise<void> {
    if (!this.isLoaded || this.modals.size || this.resumeInline() || !view.file) return;
    const path = view.file.path;
    if (view.getMode() === "preview") {
      const state = view.leaf.getViewState();
      await view.leaf.setViewState({ ...state, state: { ...state.state, mode: "source", source: false } });
    }
    if (!this.isLoaded || this.modals.size || !view.containerEl.isConnected || view.getMode() !== "source" || view.file?.path !== path || view.editor.getValue() !== snapshot) { this.notify("笔记已变化，请重新选择公式。"); return; }
    const draft: InlineDraft = { latex: '', display: true, mode: 'visual', science: { subject: 'graph', chemistry: '', units: '' }, plot: graphDraft(plot.spec) };
    this.openEditor(view, { snapshot, from: plot.from, to: plot.to }, undefined, false, draft, plot);
  }

  private renderPlot(source: string, element: HTMLElement, context: MarkdownPostProcessorContext): void {
    const child = new MarkdownRenderChild(element);
    context.addChild(child);
    element.classList.add('vme-rendered-plot');
    let disposed = false;
    let busy = false;
    let committed = false;
    let interaction: ReturnType<typeof mountPlotInteraction> | undefined;
    let localization: ReturnType<typeof localizeEditor> | undefined;
    child.register(() => { disposed = true; interaction?.destroy(); localization?.destroy(); });
    try {
      const original = parsePlotSpec(source);
      let viewSpec: PlotSpec = { ...original };
      const viewport = element.createDiv({ cls: 'vme-saved-plot-viewport' });
      viewport.dataset.testid = 'saved-plot-viewport';
      const toolbar = element.createDiv({ cls: 'vme-plot-actions' });
      toolbar.setAttribute('role', 'group');
      toolbar.setAttribute('aria-label', '图像操作');
      const status = element.createEl('p', { cls: 'vme-plot-note' });
      status.dataset.testid = 'saved-plot-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      const boundsChanged = (): boolean => ['xMin', 'xMax', 'yMin', 'yMax'].some(key => viewSpec[key as keyof PlotSpec] !== original[key as keyof PlotSpec]);
      const controls: HTMLButtonElement[] = [];
      const makeButton = (label: string, testid: string, action: () => void): HTMLButtonElement => {
        const node = toolbar.createEl('button', { text: label, cls: 'vme-science-button' });
        node.type = 'button';
        node.dataset.testid = testid;
        node.setAttribute('aria-label', label);
        const iconNames: Record<string, ControlIcon> = {
          'saved-plot-zoom-in': 'zoom-in', 'saved-plot-zoom-out': 'zoom-out',
          'saved-plot-reset': 'reset', 'edit-saved-graph': 'edit', 'save-saved-plot-view': 'save',
        };
        if (iconNames[testid]) node.prepend(controlIcon(iconNames[testid], element.ownerDocument));
        child.registerDomEvent(node, 'mousedown', event => { event.preventDefault(); event.stopPropagation(); });
        child.registerDomEvent(node, 'click', event => {
          event.preventDefault(); event.stopPropagation();
          if (!disposed && !busy && !committed) action();
        });
        controls.push(node);
        return node;
      };
      const refresh = (): void => {
        if (disposed) return;
        for (const control of controls) control.disabled = busy || committed;
        save.disabled = busy || committed || !boundsChanged();
        reset.disabled = busy || committed || !boundsChanged();
        interaction?.setDisabled(busy || committed);
      };
      const render = (next: PlotSpec): boolean => {
        if (disposed) return false;
        const result = createGraph(next);
        if (!result.ok) {
          status.textContent = '此范围暂时无法显示图像，请调整范围或重置视图。';
          return false;
        }
        const svg = new DOMParser().parseFromString(result.svg, 'image/svg+xml').documentElement;
        if (svg.localName !== 'svg') throw new Error('Unable to render this graph.');
        viewport.replaceChildren(element.ownerDocument.importNode(svg, true));
        viewSpec = { ...result.spec };
        status.textContent = boundsChanged()
          ? '视图已调整，尚未保存。点击“保存视图”更新笔记。'
          : '拖动移动，滚动或双指缩放。调整后点击“保存视图”。';
        refresh();
        return true;
      };
      const changeView = (bounds: PlotBounds | undefined): void => {
        if (!bounds || disposed || busy || committed) return;
        let rendered = false;
        try { rendered = render({ ...viewSpec, ...bounds }); }
        catch { status.textContent = '此范围暂时无法显示图像，请调整范围或重置视图。'; }
        if (!rendered) {
          // A rejected callback must end its old pointer baseline and cancel any pending frame.
          // The next gesture starts from the last successfully rendered bounds.
          interaction?.setDisabled(true);
          refresh();
        }
      };
      makeButton('放大', 'saved-plot-zoom-in', () => { interaction?.setDisabled(true); changeView(zoomPlotBounds(viewSpec, 0.8)); refresh(); });
      makeButton('缩小', 'saved-plot-zoom-out', () => { interaction?.setDisabled(true); changeView(zoomPlotBounds(viewSpec, 1.25)); refresh(); });
      const reset = makeButton('重置视图', 'saved-plot-reset', () => {
        // Reset deliberately discards a queued gesture so it cannot undo the explicit button action.
        interaction?.setDisabled(true);
        changeView(original);
        refresh();
      });
      makeButton('编辑图像', 'edit-saved-graph', () => { void act('edit'); });
      const save = makeButton('保存视图', 'save-saved-plot-view', () => { void act('save'); });
      save.classList.add('vme-science-primary');
      if (!render(original)) throw new Error('Unable to render this graph.');
      if (original.mode === 'complex') {
        const parsed = parseComplexNumbers(original.expression);
        if (parsed.ok) {
          const legend = element.createEl('ul', { cls: 'vme-complex-point-list' });
          legend.dataset.testid = 'saved-complex-point-list';
          legend.setAttribute('aria-label', '复数列表');
          for (const point of parsed.points) legend.createEl('li', { text: `${point.label} = ${formatComplex(point)} · Re = ${point.re} · Im = ${point.im}` });
        }
      }
      interaction = mountPlotInteraction(viewport, { getBounds: () => viewSpec, onChange: changeView });
      refresh();

      const locate = async (): Promise<{ view: MarkdownView; snapshot: string; block: PlotBlock }> => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!this.isLoaded || disposed || !view?.file || view.file.path !== context.sourcePath || !view.containerEl.isConnected || !view.containerEl.contains(element)) {
          throw new Error('请先打开图像所在的原笔记。');
        }
        const file = view.file;
        const snapshot = view.getMode() === 'source' ? view.editor.getValue() : await this.app.vault.read(file);
        if (!this.isLoaded || disposed || view.file !== file || view.file.path !== context.sourcePath || this.app.workspace.getActiveViewOfType(MarkdownView) !== view || !view.containerEl.contains(element)) {
          throw new Error('笔记已变化，请重新选择公式。');
        }
        // Read this after the asynchronous read: section offsets from rendering may already be stale.
        const info = context.getSectionInfo(element);
        if (!info) throw new Error('图像位置暂时无法确认，请重新打开笔记。');
        const matches = findPlotBlocks(snapshot).filter(block => snapshot.slice(0, block.from).split('\n').length - 1 === info.lineStart && block.source.trim() === source.trim());
        if (matches.length !== 1) throw new Error('图像位置暂时无法确认，请重新打开笔记。');
        return { view, snapshot, block: matches[0] };
      };
      const finishDraftFirst = (): boolean => {
        if (this.inline && this.resumeInline()) {
          this.notify('请先完成或取消当前公式草稿，再保存或编辑图像。');
          return true;
        }
        if (this.modals.size) {
          this.notify('请先关闭当前公式窗口，再保存或编辑图像。');
          return true;
        }
        return false;
      };
      const act = async (action: 'edit' | 'save'): Promise<void> => {
        if (disposed || busy || committed || !this.isLoaded || (action === 'save' && !boundsChanged()) || finishDraftFirst()) return;
        busy = true;
        interaction?.setDisabled(true);
        refresh();
        const requested = { ...viewSpec };
        try {
          const { view, snapshot, block } = await locate();
          if (disposed) throw new Error('笔记已变化，请重新选择公式。');
          if (finishDraftFirst()) return;
          if (view.getMode() === 'preview') {
            const state = view.leaf.getViewState();
            await view.leaf.setViewState({ ...state, state: { ...state.state, mode: 'source', source: false } });
          }
          // A deliberate Reading -> Editing transition removes this renderer. Validate the original
          // view and its whole-note snapshot instead of requiring that old renderer to survive it.
          if (!this.isLoaded || view.getMode() !== 'source' || view.file?.path !== context.sourcePath || !view.containerEl.isConnected
            || this.app.workspace.getActiveViewOfType(MarkdownView) !== view || view.editor.getValue() !== snapshot) {
            throw new Error('笔记已变化，请重新选择公式。');
          }
          if (finishDraftFirst()) return;
          if (action === 'edit') {
            // Convert and recheck the active view above so editPlot has no asynchronous mode
            // transition in which a user could switch to another note before the draft opens.
            await this.editPlot(view, snapshot, { ...block, spec: requested });
            return;
          }
          const replacement = planGraphUpdate(snapshot, { snapshot, from: block.from, to: block.to }, requested);
          if (replacement === snapshot.slice(block.from, block.to)) return;
          // A single editor transaction gives the user native Obsidian Undo for this explicit save.
          view.editor.replaceRange(replacement, view.editor.offsetToPos(block.from), view.editor.offsetToPos(block.to));
          committed = true;
          // A focus failure cannot turn a completed editor transaction into a reported save failure.
          try { view.editor.focus(); } catch { /* The view can disappear after its transaction commits. */ }
          if (!disposed) status.textContent = '视图已保存到笔记，可使用撤销恢复。';
        } catch (error) {
          const known = error instanceof Error ? error.message : '';
          let message = [
            '请先打开图像所在的原笔记。', '笔记已变化，请重新选择公式。', '图像位置暂时无法确认，请重新打开笔记。',
          ].includes(known) ? known : '未能保存或打开图像。当前视图仍保留，请重新打开原笔记后重试。';
          if (disposed || !element.isConnected) {
            if (boundsChanged() && !this.recoveredDraft) {
              this.recoveredDraft = { latex: '', display: true, mode: 'visual',
                science: { subject: 'graph', chemistry: '', units: '' }, plot: graphDraft(requested) };
              message = '未能保存或打开图像，视图草稿已暂存。可用“恢复公式草稿”命令在正文新位置继续；重启前请保存。';
            } else if (boundsChanged()) {
              message = '图像视图未能保存或打开。请重新打开图像再调整；已有恢复草稿已保留。';
            } else {
              message = '图像所在的视图已关闭或切换。请重新打开原笔记后重试。';
            }
          }
          if (!disposed) status.textContent = message;
          this.notify(message);
        } finally {
          busy = false;
          refresh();
        }
      };
    } catch {
      interaction?.destroy();
      element.empty();
      element.createEl('p', { text: '图像配置无效或超出支持范围，原文已保留。' });
    }
    localization = this.localize(element);
  }
  private attachReadingMath(element: HTMLElement, context: MarkdownPostProcessorContext): void {
    const maths = [ ...(element.matches(".math") ? [element] : []), ...element.querySelectorAll<HTMLElement>(".math") ].filter(el => !el.parentElement?.closest(".math"));
    if (!maths.length) return;
    const child = new MarkdownRenderChild(element);
    context.addChild(child);
    maths.forEach((math, index) => {
      const title = math.getAttribute("title");
      math.classList.add("vme-clickable");
      math.setAttribute("title", "双击以可视化编辑公式");
      child.register(() => {
        math.classList.remove("vme-clickable");
        if (title === null) math.removeAttribute("title"); else math.setAttribute("title", title);
      });
      child.registerDomEvent(math, "dblclick", event => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        // Embeds/popovers may refer to another note. Never guess their source.
        if (!view?.file || view.file.path !== context.sourcePath || this.modals.size) return;
        event.preventDefault(); event.stopPropagation();
        const section = context.getSectionInfo(math);
        void (async () => {
          const file = view.file;
          if (!file) return;
          const snapshot = view.getMode() === "source" ? view.editor.getValue() : await this.app.vault.read(file);
          if (!section || section.text !== snapshot || view.file?.path !== context.sourcePath) { await this.showPicker(view); return; }
          const lines = snapshot.split("\n");
          const start = lines.slice(0, section.lineStart).join("\n").length + (section.lineStart ? 1 : 0);
          const end = lines.slice(0, section.lineEnd + 1).join("\n").length;
          const candidates = findMathRanges(snapshot).filter(r => r.from >= start && r.to <= end);
          if (candidates.length !== maths.length || !candidates[index]) { await this.showPicker(view); return; }
          // A rendered section can be stale or reordered by another plugin.
          // Without a matching TeX annotation the chooser is the safe fallback.
          const annotation = math.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim();
          if (!annotation || annotation !== candidates[index].latex.trim()) { await this.showPicker(view); return; }
          await this.editRange(view, snapshot, candidates[index]);
        })().catch(() => this.notify("无法定位公式，请通过命令面板选择本笔记公式。"));
      });
    });
  }
}
