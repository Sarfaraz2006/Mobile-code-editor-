export type ThemeName =
  | "dark"
  | "light"
  | "monokai"
  | "dracula"
  | "solarized-dark"
  | "solarized-light"
  | "nord"
  | "one-dark";

export interface Theme {
  name: ThemeName;
  label: string;
  isDark: boolean;
  bg: string;
  surface: string;
  surfaceActive: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentMuted: string;
  danger: string;
  success: string;
  warning: string;
  editorBg: string;
  terminalBg: string;
  tabBarBg: string;
  tabActiveBg: string;
  // Corresponding CodeMirror 5 theme name for the editor iframe/webview
  cmTheme: string;
}

export const themes: Record<ThemeName, Theme> = {
  dark: {
    name: "dark", label: "VS Code Dark+", isDark: true,
    bg: "#0A0A0A", surface: "#121212", surfaceActive: "#1E1E1E", border: "#222222",
    textPrimary: "#E6E6E6", textSecondary: "#8A8A8A",
    accent: "#007AFF", accentMuted: "#0A3A6E",
    danger: "#F87171", success: "#4ADE80", warning: "#FBBF24",
    editorBg: "#1E1E1E", terminalBg: "#0F0F0F",
    tabBarBg: "#121212", tabActiveBg: "#1E1E1E",
    cmTheme: "material-darker",
  },
  light: {
    name: "light", label: "VS Code Light", isDark: false,
    bg: "#FFFFFF", surface: "#F5F5F5", surfaceActive: "#EAEAEA", border: "#D4D4D4",
    textPrimary: "#111111", textSecondary: "#666666",
    accent: "#007AFF", accentMuted: "#CFE3FF",
    danger: "#DC2626", success: "#059669", warning: "#D97706",
    editorBg: "#FFFFFF", terminalBg: "#F5F5F5",
    tabBarBg: "#EDEDED", tabActiveBg: "#FFFFFF",
    cmTheme: "eclipse",
  },
  monokai: {
    name: "monokai", label: "Monokai", isDark: true,
    bg: "#1F1F1E", surface: "#272822", surfaceActive: "#33342B", border: "#3B3C36",
    textPrimary: "#F8F8F2", textSecondary: "#A6A398",
    accent: "#F92672", accentMuted: "#5D2440",
    danger: "#F92672", success: "#A6E22E", warning: "#FD971F",
    editorBg: "#272822", terminalBg: "#1D1E19",
    tabBarBg: "#1F1F1E", tabActiveBg: "#272822",
    cmTheme: "monokai",
  },
  dracula: {
    name: "dracula", label: "Dracula", isDark: true,
    bg: "#1B1B26", surface: "#282A36", surfaceActive: "#343746", border: "#3D3F4C",
    textPrimary: "#F8F8F2", textSecondary: "#9A9CB0",
    accent: "#BD93F9", accentMuted: "#3E2E60",
    danger: "#FF5555", success: "#50FA7B", warning: "#FFB86C",
    editorBg: "#282A36", terminalBg: "#1D1E29",
    tabBarBg: "#1B1B26", tabActiveBg: "#282A36",
    cmTheme: "dracula",
  },
  "solarized-dark": {
    name: "solarized-dark", label: "Solarized Dark", isDark: true,
    bg: "#00232E", surface: "#002B36", surfaceActive: "#073642", border: "#0A4657",
    textPrimary: "#EEE8D5", textSecondary: "#93A1A1",
    accent: "#268BD2", accentMuted: "#0E3F60",
    danger: "#DC322F", success: "#859900", warning: "#B58900",
    editorBg: "#002B36", terminalBg: "#00232E",
    tabBarBg: "#00232E", tabActiveBg: "#002B36",
    cmTheme: "solarized dark",
  },
  "solarized-light": {
    name: "solarized-light", label: "Solarized Light", isDark: false,
    bg: "#FDF6E3", surface: "#EEE8D5", surfaceActive: "#E4DAB8", border: "#CCC6B0",
    textPrimary: "#586E75", textSecondary: "#93A1A1",
    accent: "#268BD2", accentMuted: "#CCE5F5",
    danger: "#DC322F", success: "#859900", warning: "#B58900",
    editorBg: "#FDF6E3", terminalBg: "#EEE8D5",
    tabBarBg: "#EEE8D5", tabActiveBg: "#FDF6E3",
    cmTheme: "solarized light",
  },
  nord: {
    name: "nord", label: "Nord", isDark: true,
    bg: "#242933", surface: "#2E3440", surfaceActive: "#3B4252", border: "#434C5E",
    textPrimary: "#ECEFF4", textSecondary: "#A8B3C4",
    accent: "#88C0D0", accentMuted: "#3E5661",
    danger: "#BF616A", success: "#A3BE8C", warning: "#EBCB8B",
    editorBg: "#2E3440", terminalBg: "#242933",
    tabBarBg: "#242933", tabActiveBg: "#2E3440",
    cmTheme: "nord",
  },
  "one-dark": {
    name: "one-dark", label: "One Dark", isDark: true,
    bg: "#21252B", surface: "#282C34", surfaceActive: "#333842", border: "#3E4451",
    textPrimary: "#ABB2BF", textSecondary: "#7A8290",
    accent: "#61AFEF", accentMuted: "#274363",
    danger: "#E06C75", success: "#98C379", warning: "#E5C07B",
    editorBg: "#282C34", terminalBg: "#21252B",
    tabBarBg: "#21252B", tabActiveBg: "#282C34",
    cmTheme: "ayu-dark",
  },
};

export const THEME_ORDER: ThemeName[] = [
  "dark",
  "light",
  "monokai",
  "dracula",
  "solarized-dark",
  "solarized-light",
  "nord",
  "one-dark",
];

export type FontFamilyKey =
  | "system"
  | "jetbrains"
  | "fira"
  | "source"
  | "ubuntu"
  | "menlo";

export const FONT_FAMILIES: Record<
  FontFamilyKey,
  { label: string; css: string }
> = {
  system: {
    label: "System Mono",
    css: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  jetbrains: {
    label: "JetBrains Mono",
    css: '"JetBrains Mono", ui-monospace, monospace',
  },
  fira: {
    label: "Fira Code",
    css: '"Fira Code", ui-monospace, monospace',
  },
  source: {
    label: "Source Code Pro",
    css: '"Source Code Pro", ui-monospace, monospace',
  },
  ubuntu: {
    label: "Ubuntu Mono",
    css: '"Ubuntu Mono", ui-monospace, monospace',
  },
  menlo: {
    label: "Menlo",
    css: "Menlo, Consolas, monospace",
  },
};

// Mapping of file extensions to CodeMirror mode names and display labels.
export const LANGUAGES: Record<
  string,
  { mode: string; label: string; runnable: "python" | "javascript" | null }
> = {
  js: { mode: "javascript", label: "JavaScript", runnable: "javascript" },
  jsx: { mode: "jsx", label: "JSX", runnable: "javascript" },
  ts: { mode: "text/typescript", label: "TypeScript", runnable: null },
  tsx: { mode: "text/typescript-jsx", label: "TSX", runnable: null },
  py: { mode: "python", label: "Python", runnable: "python" },
  html: { mode: "htmlmixed", label: "HTML", runnable: null },
  css: { mode: "css", label: "CSS", runnable: null },
  json: { mode: "application/json", label: "JSON", runnable: null },
  md: { mode: "markdown", label: "Markdown", runnable: null },
  markdown: { mode: "markdown", label: "Markdown", runnable: null },
  xml: { mode: "xml", label: "XML", runnable: null },
  yml: { mode: "yaml", label: "YAML", runnable: null },
  yaml: { mode: "yaml", label: "YAML", runnable: null },
  sh: { mode: "shell", label: "Shell", runnable: null },
  bash: { mode: "shell", label: "Bash", runnable: null },
  c: { mode: "text/x-csrc", label: "C", runnable: null },
  cpp: { mode: "text/x-c++src", label: "C++", runnable: null },
  java: { mode: "text/x-java", label: "Java", runnable: null },
  go: { mode: "go", label: "Go", runnable: null },
  rs: { mode: "rust", label: "Rust", runnable: null },
  rb: { mode: "ruby", label: "Ruby", runnable: null },
  php: { mode: "php", label: "PHP", runnable: null },
  sql: { mode: "sql", label: "SQL", runnable: null },
  txt: { mode: "null", label: "Text", runnable: null },
};

export function detectLanguage(filename: string) {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return LANGUAGES.txt;
  const ext = filename.slice(dot + 1).toLowerCase();
  return LANGUAGES[ext] || LANGUAGES.txt;
}
