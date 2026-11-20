import * as mathliveModule from "mathlive";
import type { MathfieldElement } from "mathlive";
import { createHtml } from "./dom";

const REQUIRED_MATHFIELD_METHODS = ["getValue", "setValue", "insert", "executeCommand"] as const;

export function isCompatibleMathfieldConstructor(ctor: unknown): ctor is typeof MathfieldElement {
  if (typeof ctor !== "function") return false;
  const proto = (ctor as { prototype?: Record<string, unknown> }).prototype;
  if (!proto || typeof proto !== "object") return false;
  return REQUIRED_MATHFIELD_METHODS.every((name) => typeof proto[name] === "function");
}

function applyOfflineMathfieldConfig(runtime: typeof MathfieldElement): void {
  try { runtime.fontsDirectory = null; } catch { /* ignore read-only cross-plugin statics */ }
  try { runtime.soundsDirectory = null; } catch { /* ignore read-only cross-plugin statics */ }
  try { runtime.computeEngine = null; } catch { /* ignore read-only cross-plugin statics */ }
}

/** Use the registered constructor so disabling/re-enabling or coexisting with another MathLive plugin is safe. */
export function configureMathLive(registry: Pick<CustomElementRegistry, "get"> = customElements): void {
  const bundled = mathliveModule.MathfieldElement;
  const registered = registry.get("math-field");
  if (registered !== undefined && !isCompatibleMathfieldConstructor(registered)) {
    throw new Error("另一个插件已注册不兼容的 math-field 组件。请暂时关闭冲突插件并重启 Obsidian。");
  }
  const ctor = (registered ?? bundled) as typeof MathfieldElement;
  // All font faces are embedded in styles.css. No CDN, audio or compute service.
  for (const runtime of new Set([ctor, bundled])) {
    applyOfflineMathfieldConfig(runtime);
  }
}

export function createPreview(latex: string, container: HTMLElement): MathfieldElement {
  const field = createHtml("math-field", container.ownerDocument);
  field.className = "vme-picker-preview";
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
