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

interface AppState {
  theme: Theme;
  themeName: ThemeName;
  toggleTheme: () => void;

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

  isExplorerOpen: boolean;
  setExplorerOpen: (v: boolean) => void;

  isRunning: boolean;
  setRunning: (v: boolean) => void;
}

const AppContext = createContext<AppState | null>(null);

const THEME_KEY = "cc.theme";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>("dark");
  const [tree, setTree] = useState<FileNode[]>([]);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [isTerminalOpen, setTerminalOpen] = useState(false);
  const [isExplorerOpen, setExplorerOpen] = useState(false);
  const [isRunning, setRunning] = useState(false);

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
      // Close any tabs whose path is under the deleted entry.
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

  const theme = themes[themeName];

  const value = useMemo<AppState>(
    () => ({
      theme,
      themeName,
      toggleTheme,
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
      isExplorerOpen,
      setExplorerOpen,
      isRunning,
      setRunning,
    }),
    [
      theme,
      themeName,
      toggleTheme,
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
      isExplorerOpen,
      isRunning,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
