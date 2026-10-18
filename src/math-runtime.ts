import { MathfieldElement } from "mathlive";

/** Use the registered constructor so disabling/re-enabling the plugin is safe. */
export function configureMathLive(): void {
  const ctor = (customElements.get("math-field") ?? MathfieldElement) as typeof MathfieldElement;
  if (ctor.version !== MathfieldElement.version) {
    throw new Error("另一个插件已加载不同版本的 MathLive。请暂时关闭该插件并重启 Obsidian。");
  }
  // All font faces are embedded in styles.css. No CDN, audio or compute service.
  for (const runtime of new Set([ctor, MathfieldElement])) {
    runtime.fontsDirectory = null;
    runtime.soundsDirectory = null;
    runtime.computeEngine = null;
  }
}

export function createPreview(latex: string, container: HTMLElement): MathfieldElement {
  const field = document.createElement("math-field") as MathfieldElement;
  field.setAttribute("read-only", "");
  field.setAttribute("math-virtual-keyboard-policy", "manual");
  field.tabIndex = -1;
  field.inert = true;
  field.setAttribute("aria-hidden", "true");
  container.append(field);
  field.menuItems = [];
  field.value = latex;
  return field;
}
