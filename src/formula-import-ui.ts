import { convertLatexToMarkup, validateLatex } from 'mathlive';
import { analyzeFormulaImport, formulaVisualBudgetIssue, type FormulaImportAnalysis } from './formula-import';
import { hasIncompleteSlots } from './validation';
import { createHtml } from './dom';
import { createPreview } from './math-runtime';
import type { FormulaImportDraft } from './editor-ui';

/** Staging never mutates the live equation or the note. */
export function mountFormulaImport(container: HTMLElement, options: {
  initialDraft?: FormulaImportDraft;
  getDisplay: () => boolean;
  getLatex: () => string;
  onApply: (latex: string, display: boolean, sourceOnly: boolean) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
    const node = createHtml(tag, container.ownerDocument);
    if (text) node.textContent = text;
    return node;
  };
  const action = (label: string, name: string, run: () => void) => {
    const node = element('button', label); node.type = 'button'; node.dataset.action = name;
    node.addEventListener('click', run); return node;
  };
  const panel = element('section'); panel.className = 'vme-formula-import'; panel.hidden = true;
  panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', '导入单条公式');
  panel.dataset.testid = 'formula-import-panel';
  const title = element('h3', '导入单条公式');
  const help = element('p', '先检查候选；应用会替换当前整条公式，保存后才更新笔记。');
  const originalLabel = element('label', '导入原文');
  const original = element('textarea'); original.dataset.testid = 'import-original'; original.rows = 4;
  original.className = 'vme-source'; original.spellcheck = false; original.wrap = 'off';
  original.setAttribute('aria-label', '导入原文');
  const useCurrent = action('载入当前源码', 'import-use-current', () => { originalText = options.getLatex(); original.value = originalText; inspect(); });
  const copyStatus = element('p'); copyStatus.setAttribute('role', 'status');
  const copyOriginal = action('复制导入原文', 'import-copy-original', () => {
    void navigator.clipboard.writeText(originalText).then(
      () => { copyStatus.textContent = '导入原文已复制。'; },
      () => { copyStatus.textContent = '未能复制原文，请保留导入面板后重试。'; },
    );
  });
  const review = action('检查并预览', 'import-preview-button', inspect);
  const candidateLabel = element('label', '候选源码（不含外包装）');
  const candidate = element('textarea'); candidate.dataset.testid = 'import-candidate'; candidate.readOnly = true;
  candidate.className = 'vme-source'; candidate.rows = 3; candidate.wrap = 'off';
  candidate.setAttribute('aria-label', '候选源码（不含外包装）');
  const layout = element('p'); layout.dataset.testid = 'import-layout';
  const preview = element('div'); preview.dataset.testid = 'import-preview'; preview.className = 'vme-import-preview';
  const status = element('p'); status.dataset.testid = 'import-status'; status.setAttribute('role', 'status');
  const apply = action('应用并替换公式', 'import-apply', () => {
    if (disabled || !analysis || apply.disabled || inspectedOriginal !== original.value) return;
    try {
      options.onApply(analysis.candidate, analysis.display ?? options.getDisplay(), sourceOnly);
      close();
    } catch {
      status.textContent = '导入未应用；当前公式和导入原文仍保留，请检查后重试。';
      status.dataset.state = 'error'; apply.disabled = true;
    }
  });
  const cancel = action('取消导入', 'import-cancel', close);
  const actions = element('div'); actions.className = 'vme-import-actions'; actions.append(useCurrent, copyOriginal, review, apply, cancel);
  // Wrapping labels avoids duplicate ids across dialog and inline editor instances.
  originalLabel.append(original); candidateLabel.append(candidate);
  panel.append(title, help, originalLabel, candidateLabel, layout, preview, status, copyStatus, actions);
  container.append(panel);
  let analysis: FormulaImportAnalysis | undefined;
  let inspectedOriginal: string | undefined;
  let sourceOnly = false;
  let disabled = false;
  let openedOnce = Boolean(options.initialDraft);
  let originalText = options.initialDraft?.original ?? ''; // textarea.value normalizes CRLF; retain the actual clipboard separately.

  function inspect(): void {
    if (disabled) return;
    analysis = analyzeFormulaImport(originalText);
    inspectedOriginal = original.value;
    candidate.value = analysis.candidate;
    preview.replaceChildren(); sourceOnly = false; apply.disabled = true;
    apply.textContent = '应用并替换公式';
    layout.textContent = (analysis.display ?? options.getDisplay()) ? '候选排版：独立公式' : '候选排版：行内公式（保存时换行会转换为空格）';
    const issue = analysis.issue ?? (hasIncompleteSlots(analysis.candidate) ? '公式还有未填写的方框或参数，请补全后保存。' : null);
    if (issue) { status.dataset.state = 'error'; status.textContent = issue; return; }
    try {
      const errors = validateLatex(analysis.candidate);
      if (errors.some(error => error.code !== 'unknown-command' && error.code !== 'unknown-environment')) {
        status.dataset.state = 'error'; status.textContent = '源码尚未完整或存在语法问题，请检查后保存。'; return;
      }
      // Keep the original and structure/syntax checks, but do not render a
      // large candidate merely to offer an explicitly source-only import.
      const visualIssue = formulaVisualBudgetIssue(analysis.candidate);
      if (visualIssue) {
        sourceOnly = true; status.dataset.state = 'source-only';
        status.textContent = visualIssue; apply.textContent = '仅按源码应用并替换';
        apply.disabled = false; return;
      }
      // mhchem nested errors are not consistently included in validateLatex().
      const markup = convertLatexToMarkup(analysis.candidate);
      sourceOnly = errors.length > 0 || markup.includes('ML__error');
      if (!sourceOnly) {
        const field = createPreview(analysis.candidate, preview);
        sourceOnly = field.errors.length > 0;
        if (sourceOnly) preview.replaceChildren();
      }
      status.dataset.state = sourceOnly ? 'source-only' : 'ready';
      status.textContent = sourceOnly
        ? '仅源码可用：部分命令无法可视化。应用后请在源码模式检查；笔记环境也可能不支持这些命令。'
        : '可视化预览可用。请检查结构；应用前当前公式保持不变。';
      apply.textContent = sourceOnly ? '仅按源码应用并替换' : '应用并替换公式';
      apply.disabled = false;
    } catch {
      status.dataset.state = 'error';
      status.textContent = '化学式、单位或公式暂时无法解析，请检查写法；输入内容已保留。';
    }
  }
  function close(): void {
    panel.hidden = true; preview.replaceChildren(); options.onOpenChange(false);
  }
  original.addEventListener('input', () => {
    originalText = original.value;
    analysis = undefined; inspectedOriginal = undefined; apply.disabled = true; preview.replaceChildren();
    candidate.value = ''; layout.textContent = ''; status.dataset.state = 'stale';
    status.textContent = '原文已修改，请重新检查并预览。';
  });
  return {
    open: (text?: string) => {
      if (disabled) return;
      if (text !== undefined) originalText = text;
      else if (!openedOnce) originalText = options.getLatex();
      original.value = originalText; copyStatus.textContent = '';
      openedOnce = true; panel.hidden = false; options.onOpenChange(true); inspect(); original.focus();
    },
    close,
    isOpen: () => !panel.hidden,
    getOriginal: () => originalText,
    getDraft: (): FormulaImportDraft | undefined => openedOnce ? { original: originalText, open: !panel.hidden } : undefined,
    setDisabled: (value: boolean) => {
      disabled = value; original.readOnly = value; review.disabled = cancel.disabled = useCurrent.disabled = copyOriginal.disabled = value;
      apply.disabled = value || !analysis || status.dataset.state === 'error' || status.dataset.state === 'stale';
    },
    destroy: () => { preview.replaceChildren(); panel.remove(); },
  };
}
