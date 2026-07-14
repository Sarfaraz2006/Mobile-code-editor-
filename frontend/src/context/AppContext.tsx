import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { storage } from "@/src/utils/storage";
import {
  FileNode,
  createFile,
  createFolder,
  deleteEntry,
  initWorkspace,
  listWorkspace,
  readFile,
  renameEntry,
  writeFile,
} from "@/src/lib/fs";
import { Theme, ThemeName, themes } from "@/src/lib/themes";

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  dirty: boolean;
}

export type PanelType = "explorer" | "search" | "settings" | null;
export type ModalType =
  | "commandPalette"
  | "snippets"
  | "githubImport"
  | "findReplace"
  | "preview"
  | null;

interface AppState {
  theme: Theme;
  themeName: ThemeName;
  toggleTheme: () => void;

  fontSize: number;
  setFontSize: (size: number) => void;

  sessionId: string;

  tree: FileNode[];
  refreshTree: () => Promise<void>;

  tabs: OpenTab[];
  activePath: string | null;
  openFile: (path: string) => Promise<void>;
  closeTab: (path: string) => void;
  setActive: (path: string) => void;
  updateActiveContent: (content: string) => void;
  saveActive: () => Promise<void>;
  saveAll: () => Promise<void>;

  createNewFile: (path: string, initial?: string) => Promise<void>;
  createNewFolder: (path: string) => Promise<void>;
  removeEntry: (path: string, isDir: boolean) => Promise<void>;
  renameFileOrFolder: (oldPath: string, newPath: string) => Promise<void>;

  terminalOutput: string;
  appendTerminal: (chunk: string) => void;
  clearTerminal: () => void;
  isTerminalOpen: boolean;
  setTerminalOpen: (v: boolean) => void;

  activePanel: PanelType;
  setActivePanel: (p: PanelType) => void;

  activeModal: ModalType;
  setActiveModal: (m: ModalType) => void;

  isRunning: boolean;
  setRunning: (v: boolean) => void;

  editorAction: { type: string; payload?: any } | null;
  triggerEditorAction: (type: string, payload?: any) => void;

  bulkImport: (
    files: { path: string; content: string }[],
    replace?: boolean,
  ) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

const THEME_KEY = "cc.theme";
const FONT_KEY = "cc.fontSize";
const SESSION_KEY = "cc.sessionId";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>("dark");
  const [fontSize, setFontSizeState] = useState<number>(14);
  const [sessionId, setSessionId] = useState<string>("");
  const [tree, setTree] = useState<FileNode[]>([]);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [isTerminalOpen, setTerminalOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isRunning, setRunning] = useState(false);
  const [editorAction, setEditorAction] = useState<AppState["editorAction"]>(null);

  const refreshTree = useCallback(async () => {
    const t = await listWorkspace();
    setTree(t);
  }, []);

  useEffect(() => {
    (async () => {
      const savedTheme = await storage.getItem<ThemeName>(THEME_KEY, "dark");
      if (savedTheme === "light" || savedTheme === "dark") {
        setThemeName(savedTheme);
      }
      const savedFont = await storage.getItem<number>(FONT_KEY, 14);
      if (typeof savedFont === "number" && savedFont >= 10 && savedFont <= 26) {
        setFontSizeState(savedFont);
      }
      let sid = await storage.getItem<string>(SESSION_KEY, "");
      if (!sid) {
        sid =
          "s_" +
          Math.random().toString(36).slice(2) +
          Date.now().toString(36);
        await storage.setItem(SESSION_KEY, sid);
      }
      setSessionId(sid);
      await initWorkspace();
      await refreshTree();
    })();
  }, [refreshTree]);

  const toggleTheme = useCallback(() => {
    setThemeName((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      storage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  const setFontSize = useCallback((size: number) => {
    const clamped = Math.max(10, Math.min(26, size));
    setFontSizeState(clamped);
    storage.setItem(FONT_KEY, clamped);
  }, []);

  const openFile = useCallback(
    async (path: string) => {
      const existing = tabs.find((t) => t.path === path);
      if (existing) {
        setActivePath(path);
        return;
      }
      const content = await readFile(path);
      const name = path.split("/").pop() || path;
      setTabs((prev) => [...prev, { path, name, content, dirty: false }]);
      setActivePath(path);
    },
    [tabs],
  );

  const closeTab = useCallback(
    (path: string) => {
      setTabs((prev) => {
        const next = prev.filter((t) => t.path !== path);
        if (activePath === path) {
          setActivePath(next.length ? next[next.length - 1].path : null);
        }
        return next;
      });
    },
    [activePath],
  );

  const setActive = useCallback((path: string) => {
    setActivePath(path);
  }, []);

  const updateActiveContent = useCallback(
    (content: string) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.path === activePath ? { ...t, content, dirty: true } : t,
        ),
      );
    },
    [activePath],
  );

  const saveActive = useCallback(async () => {
    const tab = tabs.find((t) => t.path === activePath);
    if (!tab) return;
    await writeFile(tab.path, tab.content);
    setTabs((prev) =>
      prev.map((t) => (t.path === tab.path ? { ...t, dirty: false } : t)),
    );
  }, [tabs, activePath]);

  const saveAll = useCallback(async () => {
    for (const tab of tabs) {
      if (tab.dirty) {
        await writeFile(tab.path, tab.content);
      }
    }
    setTabs((prev) => prev.map((t) => ({ ...t, dirty: false })));
  }, [tabs]);

  const createNewFile = useCallback(
    async (path: string, initial = "") => {
      await createFile(path, initial);
      await refreshTree();
    },
    [refreshTree],
  );

  const createNewFolder = useCallback(
    async (path: string) => {
      await createFolder(path);
      await refreshTree();
    },
    [refreshTree],
  );

  const removeEntry = useCallback(
    async (path: string, _isDir: boolean) => {
      await deleteEntry(path);
      setTabs((prev) => {
        const filtered = prev.filter(
          (t) => t.path !== path && !t.path.startsWith(path + "/"),
        );
        if (
          activePath &&
          (activePath === path || activePath.startsWith(path + "/"))
        ) {
          setActivePath(filtered.length ? filtered[filtered.length - 1].path : null);
        }
        return filtered;
      });
      await refreshTree();
    },
    [refreshTree, activePath],
  );

  const renameFileOrFolder = useCallback(
    async (oldPath: string, newPath: string) => {
      await renameEntry(oldPath, newPath);
      setTabs((prev) =>
        prev.map((t) => {
          if (t.path === oldPath) {
            return { ...t, path: newPath, name: newPath.split("/").pop() || newPath };
          }
          if (t.path.startsWith(oldPath + "/")) {
            const np = newPath + t.path.slice(oldPath.length);
            return { ...t, path: np, name: np.split("/").pop() || np };
          }
          return t;
        }),
      );
      if (activePath === oldPath) setActivePath(newPath);
      await refreshTree();
    },
    [refreshTree, activePath],
  );

  const appendTerminal = useCallback((chunk: string) => {
    setTerminalOutput((prev) => prev + chunk);
  }, []);

  const clearTerminal = useCallback(() => setTerminalOutput(""), []);

  const triggerEditorAction = useCallback((type: string, payload?: any) => {
    setEditorAction({ type, payload });
    // Auto-clear after a tick so repeated triggers of the same action work.
    setTimeout(() => setEditorAction(null), 50);
  }, []);

  const bulkImport = useCallback(
    async (files: { path: string; content: string }[], replace = false) => {
      if (replace) {
        // Delete every root entry to give a fresh workspace.
        const t = await listWorkspace();
        for (const n of t) await deleteEntry(n.path);
        setTabs([]);
        setActivePath(null);
      }
      for (const f of files) {
        try {
          await writeFile(f.path, f.content);
        } catch (e) {
          console.warn("[bulkImport]", f.path, e);
        }
      }
      await refreshTree();
    },
    [refreshTree],
  );

  const theme = themes[themeName];

  const value = useMemo<AppState>(
    () => ({
      theme,
      themeName,
      toggleTheme,
      fontSize,
      setFontSize,
      sessionId,
      tree,
      refreshTree,
      tabs,
      activePath,
      openFile,
      closeTab,
      setActive,
      updateActiveContent,
      saveActive,
      saveAll,
      createNewFile,
      createNewFolder,
      removeEntry,
      renameFileOrFolder,
      terminalOutput,
      appendTerminal,
      clearTerminal,
      isTerminalOpen,
      setTerminalOpen,
      activePanel,
      setActivePanel,
      activeModal,
      setActiveModal,
      isRunning,
      setRunning,
      editorAction,
      triggerEditorAction,
      bulkImport,
    }),
    [
      theme,
      themeName,
      toggleTheme,
      fontSize,
      setFontSize,
      sessionId,
      tree,
      refreshTree,
      tabs,
      activePath,
      openFile,
      closeTab,
      setActive,
      updateActiveContent,
      saveActive,
      saveAll,
      createNewFile,
      createNewFolder,
      removeEntry,
      renameFileOrFolder,
      terminalOutput,
      appendTerminal,
      clearTerminal,
      isTerminalOpen,
      activePanel,
      activeModal,
      isRunning,
      editorAction,
      triggerEditorAction,
      bulkImport,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
