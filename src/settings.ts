import type { Language } from './i18n';

export type EditorMode = 'visual' | 'latex' | 'hybrid';
export type ModeDisplay = 'all' | 'visual' | 'hybrid' | 'latex';

export interface PluginSettings {
  modeDisplay: ModeDisplay;
  preferredMode: EditorMode;
  language: Language;
}

export const DEFAULT_PLUGIN_SETTINGS: Readonly<PluginSettings> = {
  modeDisplay: 'all',
  preferredMode: 'visual',
  language: 'system',
};

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isEditorMode(value: unknown): value is EditorMode {
  return value === 'visual' || value === 'latex' || value === 'hybrid';
}

export function isModeDisplay(value: unknown): value is ModeDisplay {
  return value === 'all' || value === 'visual' || value === 'hybrid' || value === 'latex';
}

export function isLanguage(value: unknown): value is Language {
  return value === 'system' || value === 'zh' || value === 'en' || value === 'es' || value === 'ja' || value === 'de' || value === 'fr';
}

/**
 * Parse stored `data.json` defensively: preserve unrelated keys verbatim while
 * falling back to safe defaults for missing or malformed fields.
 */
export function parsePluginSettings(raw: unknown): {
  settings: PluginSettings;
  rawRecord: Record<string, unknown>;
} {
  const rawRecord: Record<string, unknown> = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      if (!UNSAFE_KEYS.has(key)) rawRecord[key] = value;
    }
  }
  const settings: PluginSettings = {
    modeDisplay: isModeDisplay(rawRecord.modeDisplay) ? rawRecord.modeDisplay : DEFAULT_PLUGIN_SETTINGS.modeDisplay,
    preferredMode: isEditorMode(rawRecord.preferredMode) ? rawRecord.preferredMode : DEFAULT_PLUGIN_SETTINGS.preferredMode,
    language: isLanguage(rawRecord.language) ? rawRecord.language : DEFAULT_PLUGIN_SETTINGS.language,
  };
  return { settings, rawRecord };
}

export function resolveInitialEditorMode(
  settings: Pick<PluginSettings, 'modeDisplay' | 'preferredMode'>,
  draftMode?: EditorMode,
  temporarySourceFallback?: boolean,
): EditorMode {
  if (settings.modeDisplay !== 'all') {
    if (temporarySourceFallback && draftMode) return draftMode;
    return settings.modeDisplay;
  }
  return draftMode ?? settings.preferredMode;
}

export function shouldHideModeChrome(options: {
  modeDisplay: ModeDisplay;
  graphSelected: boolean;
  temporarySourceFallback: boolean;
}): boolean {
  return options.graphSelected || (options.modeDisplay !== 'all' && !options.temporarySourceFallback);
}

export interface SettingsPersistenceHost {
  loadData: () => Promise<unknown>;
  saveData: (data: Record<string, unknown>) => Promise<void>;
}

export type SettingsChangeKind = 'load' | 'language' | 'modeDisplay' | 'preferredMode' | 'alsoInsertGraphEquation';
export type SettingsListener = (settings: Readonly<PluginSettings>, kind: SettingsChangeKind) => void;

export class PluginSettingsStore {
  private current: PluginSettings = { ...DEFAULT_PLUGIN_SETTINGS };
  private rawRecord: Record<string, unknown> = {};
  private queue: Promise<void> = Promise.resolve();
  private listeners = new Set<SettingsListener>();

  constructor(private readonly host: SettingsPersistenceHost) {}

  get settings(): Readonly<PluginSettings> { return this.current; }
  get modeDisplay(): ModeDisplay { return this.current.modeDisplay; }
  get preferredMode(): EditorMode { return this.current.preferredMode; }
  get language(): Language { return this.current.language; }
  get alsoInsertGraphEquation(): boolean { return this.rawRecord.alsoInsertGraphEquation === true; }

  async load(): Promise<Readonly<PluginSettings>> {
    const raw = await this.host.loadData();
    const parsed = parsePluginSettings(raw);
    this.current = parsed.settings;
    this.rawRecord = parsed.rawRecord;
    this.emit('load');
    return this.current;
  }

  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  setLanguage(language: Language): Promise<void> {
    this.current = { ...this.current, language };
    this.rawRecord = { ...this.rawRecord, language };
    this.emit('language');
    return this.persist({ language });
  }

  setModeDisplay(modeDisplay: ModeDisplay): Promise<void> {
    this.current = { ...this.current, modeDisplay };
    this.rawRecord = { ...this.rawRecord, modeDisplay };
    this.emit('modeDisplay');
    return this.persist({ modeDisplay });
  }

  setPreferredMode(preferredMode: EditorMode): Promise<void> {
    this.current = { ...this.current, preferredMode };
    this.rawRecord = { ...this.rawRecord, preferredMode };
    this.emit('preferredMode');
    return this.persist({ preferredMode });
  }

  setAlsoInsertGraphEquation(alsoInsertGraphEquation: boolean): Promise<void> {
    const enabled = Boolean(alsoInsertGraphEquation);
    this.rawRecord = { ...this.rawRecord, alsoInsertGraphEquation: enabled };
    this.emit('alsoInsertGraphEquation');
    return this.persist({ alsoInsertGraphEquation: enabled });
  }

  private emit(kind: SettingsChangeKind): void {
    const snapshot: Readonly<PluginSettings> = { ...this.current };
    for (const listener of [...this.listeners]) listener(snapshot, kind);
  }

  private persist(patch: Record<string, unknown>): Promise<void> {
    const operation = this.queue.catch(() => undefined).then(async () => {
      const next = { ...this.rawRecord, ...patch };
      await this.host.saveData(next);
      this.rawRecord = next;
    });
    this.queue = operation;
    return operation;
  }
}

export interface SettingDropdownAdapter {
  setTestId?: (testId: string) => void;
  addOption: (value: string, label: string) => void;
  setValue: (value: string) => void;
  onChange: (handler: (value: string) => void) => void;
}

export interface SettingsViewBuilder {
  clear: () => void;
  addDropdownSetting: (config: {
    name: string;
    desc: string;
    setup: (dropdown: SettingDropdownAdapter) => void;
  }) => void;
}

export function renderPluginSettings(
  view: SettingsViewBuilder,
  options: {
    settings: Readonly<PluginSettings>;
    translate: (text: string) => string;
    onModeDisplayChange: (modeDisplay: ModeDisplay) => void;
    onPreferredModeChange: (preferredMode: EditorMode) => void;
    onLanguageChange: (language: Language) => void;
  },
): void {
  const { settings, translate } = options;
  view.clear();
  view.addDropdownSetting({
    name: translate('编辑模式显示'),
    desc: translate('控制公式编辑器顶部显示的模式切换范围。'),
    setup: dropdown => {
      dropdown.setTestId?.('setting-mode-display');
      dropdown.addOption('all', translate('显示全部模式（记住上次选择）'));
      dropdown.addOption('visual', translate('只显示 Visual（纯可视化）'));
      dropdown.addOption('hybrid', translate('只显示 Hybrid（源码 + 可视化同步）'));
      dropdown.addOption('latex', translate('只显示 LaTeX（纯源码）'));
      dropdown.setValue(settings.modeDisplay);
      dropdown.onChange(value => {
        if (isModeDisplay(value)) options.onModeDisplayChange(value);
      });
    },
  });
  if (settings.modeDisplay === 'all') {
    view.addDropdownSetting({
      name: translate('默认编辑模式'),
      desc: translate('显示全部模式时，新打开公式编辑器默认进入的模式；在编辑器内切换模式也会自动更新此项。'),
      setup: dropdown => {
        dropdown.setTestId?.('setting-preferred-mode');
        dropdown.addOption('visual', 'Visual');
        dropdown.addOption('hybrid', 'Hybrid');
        dropdown.addOption('latex', 'LaTeX');
        dropdown.setValue(settings.preferredMode);
        dropdown.onChange(value => {
          if (isEditorMode(value)) options.onPreferredModeChange(value);
        });
      },
    });
  }
  view.addDropdownSetting({
    name: translate('界面语言'),
    desc: translate('设置插件界面、提示与菜单的显示语言。'),
    setup: dropdown => {
      dropdown.setTestId?.('setting-language');
      dropdown.addOption('system', translate('跟随 Obsidian'));
      dropdown.addOption('zh', '中文');
      dropdown.addOption('en', 'English');
      dropdown.addOption('es', 'Español');
      dropdown.addOption('ja', '日本語');
      dropdown.addOption('de', 'Deutsch');
      dropdown.addOption('fr', 'Français');
      dropdown.setValue(settings.language);
      dropdown.onChange(value => {
        if (isLanguage(value)) options.onLanguageChange(value);
      });
    },
  });
}
