export type ThemeName = "dark" | "light";

export interface Theme {
  name: ThemeName;
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
}

export const themes: Record<ThemeName, Theme> = {
  dark: {
    name: "dark",
    bg: "#0A0A0A",
    surface: "#121212",
    surfaceActive: "#1E1E1E",
    border: "#222222",
    textPrimary: "#E6E6E6",
    textSecondary: "#8A8A8A",
    accent: "#007AFF",
    accentMuted: "#0A3A6E",
    danger: "#F87171",
    success: "#4ADE80",
    warning: "#FBBF24",
    editorBg: "#1E1E1E",
    terminalBg: "#0F0F0F",
    tabBarBg: "#121212",
    tabActiveBg: "#1E1E1E",
  },
  light: {
    name: "light",
    bg: "#FFFFFF",
    surface: "#F5F5F5",
    surfaceActive: "#EAEAEA",
    border: "#D4D4D4",
    textPrimary: "#111111",
    textSecondary: "#666666",
    accent: "#007AFF",
    accentMuted: "#CFE3FF",
    danger: "#DC2626",
    success: "#059669",
    warning: "#D97706",
    editorBg: "#FFFFFF",
    terminalBg: "#F5F5F5",
    tabBarBg: "#EDEDED",
    tabActiveBg: "#FFFFFF",
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
